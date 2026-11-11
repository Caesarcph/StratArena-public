import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MACRO-03",
    "name": "Flight to Quality",
    "mode": "portfolio",
    "tags": ["Macro", "Risk Management", "Safe Haven"],
    "summary": "Switch to safe havens during equity stress.",
    "description": "Monitors equity market stress via drawdown and volatility. During normal times, holds risk assets. When stress indicators trigger, shifts allocation to safe haven assets like gold. Dynamic equity-to-safe-haven allocation.",
    "bestOn": "Mixed risk/safe-haven asset pool",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["DD_Trigger = 0.05", "Vol_Trigger = 0.25", "Recovery_Days = 10"],
        "Indicators": [
            "Equity drawdown",
            "Realized volatility",
            "Stress indicator",
        ],
        "Entry": ["Normal: risk assets", "Stress: safe haven"],
        "Exit": ["Stress subsides after recovery period"],
        "Position sizing": ["100% allocation to chosen regime"],
        "Risk controls": ["Gradual transition back to risk"],
    },
    "notes": [
        "Fast exit from risk during stress",
        "Slow re-entry to avoid whipsaws",
        "Gold typically rallies in crises",
    ],
    "updated": "2026-01-12",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_portfolio(prices, config=None):
    """Generate portfolio weights based on flight to quality signals."""
    config = config or {}

    dd_trigger = float(config.get("dd_trigger", 0.05))
    vol_trigger = float(config.get("vol_trigger", 0.25))
    vol_lookback = int(config.get("vol_lookback", 20))
    recovery_days = int(config.get("recovery_days", 10))

    assets = list(prices.columns)
    n = len(prices)

    weights = pd.DataFrame(0.0, index=prices.index, columns=assets)

    if len(assets) < 2:
        if len(assets) == 1:
            weights[assets[0]] = 1.0
        return weights

    # Identify risk and safe haven assets
    risk_asset = "SPY" if "SPY" in assets else assets[0]
    safe_asset = "GLD" if "GLD" in assets else assets[1]

    risk_prices = prices[risk_asset]

    # Calculate stress indicators
    returns = risk_prices.pct_change()
    volatility = returns.rolling(vol_lookback).std() * np.sqrt(252)

    # Drawdown
    rolling_max = risk_prices.expanding().max()
    drawdown = (risk_prices - rolling_max) / rolling_max

    warmup = vol_lookback + 10
    in_stress = False
    stress_exit_day = None

    for i in range(warmup, n):
        curr_dd = drawdown.iloc[i]
        curr_vol = volatility.iloc[i]

        if pd.isna(curr_dd) or pd.isna(curr_vol):
            weights.iloc[i] = weights.iloc[i-1]
            continue

        # Check for stress trigger
        stress_signal = (curr_dd < -dd_trigger) or (curr_vol > vol_trigger)

        if not in_stress:
            if stress_signal:
                # Enter stress mode - flight to quality
                in_stress = True
                stress_exit_day = None
        else:
            # In stress mode - check for recovery
            if not stress_signal:
                if stress_exit_day is None:
                    stress_exit_day = i
                elif i - stress_exit_day >= recovery_days:
                    # Recovery period complete
                    in_stress = False
                    stress_exit_day = None
            else:
                # Still stressed
                stress_exit_day = None

        # Allocate based on regime
        if in_stress:
            # Flight to quality - safe haven
            weights.loc[weights.index[i], safe_asset] = 1.0
            weights.loc[weights.index[i], risk_asset] = 0.0
        else:
            # Normal - risk assets
            # Distribute among risk assets
            risk_assets = [a for a in assets if a not in [safe_asset]]
            if risk_assets:
                per_asset = 1.0 / len(risk_assets)
                for a in risk_assets:
                    weights.loc[weights.index[i], a] = per_asset
            else:
                weights.loc[weights.index[i], risk_asset] = 1.0

    return weights.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MACRO-03.py                      # uses the default basket below
#   python MACRO-03.py SPY GLD USO          # or your own symbols
#   python MACRO-03.py closes.csv           # or a CSV: Date column plus one close column per asset
#
# Convention, same as the site: weights decided at the close of day t earn the
# returns of day t+1. Results are before trading costs. Not investment advice.
# ---------------------------------------------------------------------------
def _load_closes(sources):
    if len(sources) == 1 and sources[0].lower().endswith(".csv"):
        return pd.read_csv(sources[0], index_col=0, parse_dates=True).sort_index().dropna(how="all")
    import yfinance as yf
    frame = yf.download(list(sources), start="2010-01-01", auto_adjust=True, progress=False)["Close"]
    return frame.sort_index().dropna(how="all").ffill().dropna()


if __name__ == "__main__":
    import sys

    closes = _load_closes(sys.argv[1:] or list(STRATEGY.get("instruments") or ["SPY", "GLD", "USO", "DBC"]))
    weights = generate_portfolio(closes).reindex(closes.index).ffill().fillna(0.0)
    daily = (closes.pct_change().fillna(0.0) * weights.shift(1)).sum(axis=1)
    equity = (1 + daily).cumprod()
    years = (closes.index[-1] - closes.index[0]).days / 365.25
    print(STRATEGY["id"], STRATEGY["name"], "|", closes.index[0].date(), "to", closes.index[-1].date())
    print("Assets         " + ", ".join(map(str, closes.columns)))
    print("Total return   {:+.1%}".format(equity.iloc[-1] - 1))
    print("CAGR           {:+.1%}".format(equity.iloc[-1] ** (1 / years) - 1))
    print("Sharpe         {:.2f}".format(daily.mean() / daily.std() * 252 ** 0.5 if daily.std() else 0.0))
    print("Max drawdown   {:.1%}".format((equity / equity.cummax() - 1).min()))

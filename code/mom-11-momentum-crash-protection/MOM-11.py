import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MOM-11",
    "name": "Momentum Crash Protection",
    "mode": "single",
    "tags": ["Momentum", "Risk Management", "Crash Protection"],
    "summary": "Momentum with drawdown-based position scaling.",
    "description": "Follows momentum but monitors the momentum factor's own drawdown. When momentum is experiencing a crash (reversal), reduces position size to protect against momentum crashes that historically cause severe losses.",
    "bestOn": "Trending markets prone to reversals",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Weeks to months",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Mom_Lookback = 252", "DD_Threshold = 0.10", "Scale_Factor = 0.5"],
        "Indicators": [
            "12-month momentum",
            "Momentum factor drawdown",
            "Rolling high of momentum signal",
        ],
        "Entry": ["Momentum positive", "Scale by momentum drawdown"],
        "Exit": ["Momentum negative or severe drawdown"],
        "Position sizing": ["Full position if no drawdown", "Scaled if momentum crashing"],
        "Risk controls": ["Exit completely if drawdown > 20%"],
    },
    "notes": [
        "Momentum crashes are rare but severe",
        "Protection during reversals",
        "Re-enter after crash subsides",
    ],
    "updated": "2026-01-12",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}

    mom_lookback = int(config.get("mom_lookback", 252))
    dd_threshold = float(config.get("dd_threshold", 0.10))
    severe_dd = float(config.get("severe_dd", 0.20))
    scale_factor = float(config.get("scale_factor", 0.5))
    recovery_pct = float(config.get("recovery_pct", 0.5))

    close = prices.copy()
    n = len(close)

    # Calculate momentum
    momentum = close.pct_change(mom_lookback)

    # Create a "momentum equity" - cumulative performance of momentum strategy
    # This tracks how momentum itself is doing
    mom_signal = (momentum > 0).astype(float)
    returns = close.pct_change()
    mom_returns = mom_signal.shift(1) * returns

    mom_equity = (1 + mom_returns.fillna(0)).cumprod()

    # Calculate momentum drawdown
    mom_peak = mom_equity.expanding().max()
    mom_drawdown = (mom_equity - mom_peak) / mom_peak

    signal = pd.Series(0.0, index=close.index)

    warmup = mom_lookback + 20

    for i in range(warmup, n):
        curr_mom = momentum.iloc[i]
        curr_dd = mom_drawdown.iloc[i]

        if pd.isna(curr_mom) or pd.isna(curr_dd):
            signal.iloc[i] = signal.iloc[i - 1]
            continue

        # Base signal from momentum
        if curr_mom <= 0:
            # Negative momentum - no position
            signal.iloc[i] = 0.0
            continue

        # Positive momentum - apply crash protection
        if curr_dd < -severe_dd:
            # Severe drawdown - exit completely
            signal.iloc[i] = 0.0
        elif curr_dd < -dd_threshold:
            # Moderate drawdown - scale down
            # Linear scaling from 1.0 at threshold to scale_factor at severe
            dd_range = severe_dd - dd_threshold
            dd_excess = abs(curr_dd) - dd_threshold
            scale = 1.0 - (1.0 - scale_factor) * (dd_excess / dd_range)
            signal.iloc[i] = max(scale_factor, min(1.0, scale))
        else:
            # No significant drawdown - full position
            signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MOM-11.py SPY              # downloads daily prices with yfinance
#   python MOM-11.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
#
# Convention, same as the site: the position decided at the close of day t earns
# the return of day t+1. Results are before trading costs. Not investment advice.
# ---------------------------------------------------------------------------
def _load_prices(source):
    if source.lower().endswith(".csv"):
        frame = pd.read_csv(source, index_col=0, parse_dates=True)
    else:
        import yfinance as yf
        frame = yf.download(source, start="2010-01-01", auto_adjust=True, progress=False)
        if isinstance(frame.columns, pd.MultiIndex):
            frame.columns = frame.columns.get_level_values(0)
    return frame.sort_index().dropna(subset=["Close"])


if __name__ == "__main__":
    import sys

    prices = _load_prices(sys.argv[1] if len(sys.argv) > 1 else "SPY")
    close = prices["Close"]
    signal_input = prices if STRATEGY.get("input") == "ohlc" else close
    position = generate_signals(signal_input).reindex(close.index).ffill().fillna(0.0)
    daily = close.pct_change().fillna(0.0) * position.shift(1).fillna(0.0)
    equity = (1 + daily).cumprod()
    years = (close.index[-1] - close.index[0]).days / 365.25
    print(STRATEGY["id"], STRATEGY["name"], "|", close.index[0].date(), "to", close.index[-1].date())
    print("Total return   {:+.1%}".format(equity.iloc[-1] - 1))
    print("CAGR           {:+.1%}".format(equity.iloc[-1] ** (1 / years) - 1))
    print("Sharpe         {:.2f}".format(daily.mean() / daily.std() * 252 ** 0.5 if daily.std() else 0.0))
    print("Max drawdown   {:.1%}".format((equity / equity.cummax() - 1).min()))
    print("Days in market {:.0%}".format((position != 0).mean()))
    print("Buy and hold   {:+.1%}".format(close.iloc[-1] / close.iloc[0] - 1))

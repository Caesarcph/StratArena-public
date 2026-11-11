import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MACRO-01",
    "name": "Cross-Asset Momentum",
    "mode": "portfolio",
    "tags": ["Macro", "Cross-Asset", "Leading Indicator"],
    "summary": "Use one asset's momentum to trade another.",
    "description": "Exploits lead-lag relationships between asset classes. Equity momentum can predict commodities; safe haven momentum signals risk appetite. Allocates based on cross-asset signals rather than own-asset momentum.",
    "bestOn": "Diverse asset pool with economic linkages",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Lookback = 21", "Lag = 5", "Threshold = 0"],
        "Indicators": [
            "SPY momentum -> predicts risk assets",
            "GLD momentum -> signals risk aversion",
            "Cross-correlations with lag",
        ],
        "Entry": ["SPY momentum positive -> long risk assets", "GLD momentum positive -> defensive"],
        "Exit": ["Signals reverse"],
        "Position sizing": ["Based on signal strength"],
        "Risk controls": ["Volatility adjustment"],
    },
    "notes": [
        "Equity often leads commodities",
        "Gold leads risk-off moves",
        "Lag captures predictive relationship",
    ],
    "updated": "2026-01-11",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_portfolio(prices, config=None):
    """Generate portfolio weights based on cross-asset momentum."""
    config = config or {}

    lookback = int(config.get("lookback", 21))
    lag = int(config.get("lag", 5))  # Use lagged signals
    vol_lookback = int(config.get("vol_lookback", 20))

    assets = list(prices.columns)
    n = len(prices)

    weights = pd.DataFrame(0.0, index=prices.index, columns=assets)

    if len(assets) < 2:
        return weights

    # Calculate returns and momentum for each asset
    returns = prices.pct_change()
    momentum = {}
    volatility = {}
    for asset in assets:
        momentum[asset] = returns[asset].rolling(lookback).mean()
        volatility[asset] = returns[asset].rolling(vol_lookback).std() * np.sqrt(252)

    # Identify asset types (simplified mapping)
    # SPY = equity (risk indicator)
    # GLD = safe haven (risk-off indicator)
    # USO = commodity (follows risk)
    # EURUSD = FX (risk sentiment)

    warmup = max(lookback, vol_lookback) + lag + 10

    for i in range(warmup, n):
        # Get lagged signals (what happened 'lag' days ago)
        lag_idx = i - lag

        # SPY momentum as risk appetite indicator
        spy_idx = 0 if "SPY" in assets else -1
        gld_idx = assets.index("GLD") if "GLD" in assets else -1

        spy_mom = momentum[assets[spy_idx]].iloc[lag_idx] if spy_idx >= 0 else 0
        gld_mom = momentum[assets[gld_idx]].iloc[lag_idx] if gld_idx >= 0 else 0

        # Composite risk signal
        # Positive SPY momentum + negative GLD momentum = risk-on
        # Negative SPY momentum + positive GLD momentum = risk-off
        risk_signal = 0
        if not pd.isna(spy_mom):
            risk_signal += spy_mom * 100  # Scale for visibility
        if not pd.isna(gld_mom):
            risk_signal -= gld_mom * 50  # GLD inverse contributes less

        # Allocate based on risk signal
        total_weight = 0
        raw_weights = {}

        for j, asset in enumerate(assets):
            vol = volatility[asset].iloc[i]
            if pd.isna(vol) or vol < 0.01:
                vol = 0.15  # Default volatility

            # Inverse volatility base weight
            inv_vol = 1.0 / vol

            if asset in ["SPY", "USO"]:
                # Risk assets - allocate more when risk-on
                if risk_signal > 0:
                    raw_weights[asset] = inv_vol * 1.5
                else:
                    raw_weights[asset] = inv_vol * 0.3
            elif asset == "GLD":
                # Safe haven - allocate more when risk-off
                if risk_signal < 0:
                    raw_weights[asset] = inv_vol * 1.5
                else:
                    raw_weights[asset] = inv_vol * 0.5
            else:
                # Neutral assets (FX)
                raw_weights[asset] = inv_vol * 0.5

            total_weight += raw_weights[asset]

        # Normalize weights
        if total_weight > 0:
            for asset in assets:
                weights.loc[weights.index[i], asset] = raw_weights.get(asset, 0) / total_weight

    return weights.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MACRO-01.py                      # uses the default basket below
#   python MACRO-01.py SPY GLD USO          # or your own symbols
#   python MACRO-01.py closes.csv           # or a CSV: Date column plus one close column per asset
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

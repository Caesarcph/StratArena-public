import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MOM-05",
    "name": "Faber TAA",
    "mode": "portfolio",
    "ruleVersion": "monthly-prior-observation-v2",
    "corrections": ["causal-monthly-decision", "preserve-zero-targets"],
    "targetTiming": "First observed session of a new month, using the prior observation; engine applies one-row lag.",
    "tags": ["Momentum", "Tactical", "Trend"],
    "summary": "Hold assets above 10-month moving average, cash otherwise.",
    "description": "Meb Faber's Tactical Asset Allocation from 2007 paper. Simple rule: hold an asset only when price is above its 10-month (200-day) moving average. Equal weight across all assets in uptrend.",
    "bestOn": "Multi-asset portfolios",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Months",
    "instruments": ["FABER-TAA"],
    "universe": ["SPY", "GLD", "USO", "EURUSD=X"],
    "portfolioSymbol": "FABER-TAA",
    "portfolioName": "Faber TAA",
    "pseudocode": {
        "Inputs": ["MA_Period = 200 (10 months)"],
        "Indicators": ["200-day SMA for each asset"],
        "Entry": ["Hold asset if Price > SMA(200)"],
        "Exit": ["Exit asset if Price <= SMA(200)"],
        "Position sizing": ["Equal weight across assets in uptrend"],
        "Risk controls": ["Full cash position when all assets below MA"],
    },
    "notes": [
        "From Meb Faber's 2007 SSRN paper",
        "Extremely simple trend-following rule",
        "Monthly rebalancing for practical implementation",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_portfolio(prices, config=None):
    config = config or {}
    ma_period = int(config.get("ma_period", 200))

    assets = prices.columns.tolist()
    n_assets = len(assets)

    # Calculate moving averages
    sma = prices.rolling(ma_period).mean()

    # Trend signal: price > SMA
    trend_signal = prices > sma

    weights = pd.DataFrame(np.nan, index=prices.index, columns=assets)

    # Detect an observed month transition without guessing future trading dates.
    # The engine applies its existing execution lag to these published targets.
    months = prices.index.to_period("M")
    monthly_idx = np.flatnonzero(months[1:] != months[:-1]) + 1

    for idx in monthly_idx:
        if idx - 1 < ma_period:
            continue
        date = prices.index[idx]
        weights.loc[date] = 0.0

        # Which assets are in uptrend
        in_uptrend = trend_signal.iloc[idx - 1]
        selected = in_uptrend[in_uptrend == True].index.tolist()

        if len(selected) > 0:
            # Equal weight across all assets (fixed allocation)
            # Assets in uptrend get their share, others go to cash
            base_weight = 1.0 / n_assets
            for asset in selected:
                weights.loc[date, asset] = base_weight

    # Zero allocations are cash, not missing decisions.
    weights = weights.ffill().fillna(0)

    return weights


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MOM-05.py                      # uses the default basket below
#   python MOM-05.py SPY GLD USO          # or your own symbols
#   python MOM-05.py closes.csv           # or a CSV: Date column plus one close column per asset
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

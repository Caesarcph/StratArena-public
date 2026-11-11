import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MOM-04",
    "name": "Asset Class Rotation",
    "mode": "portfolio",
    "ruleVersion": "monthly-prior-observation-v2",
    "corrections": ["causal-monthly-decision", "preserve-zero-targets"],
    "targetTiming": "First observed session of a new month, using the prior observation; engine applies one-row lag.",
    "tags": ["Momentum", "Tactical", "Rotation"],
    "summary": "Rotate into top-performing asset classes based on momentum.",
    "description": "Classic momentum rotation strategy. Ranks assets by recent returns and allocates to the strongest performers. Uses multi-timeframe momentum and absolute momentum filter.",
    "bestOn": "Diversified asset classes",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Months",
    "instruments": ["ROTATION"],
    "universe": ["SPY", "GLD", "USO", "EURUSD=X"],
    "portfolioSymbol": "ROTATION",
    "portfolioName": "Asset Rotation",
    "pseudocode": {
        "Inputs": ["Lookback = 126 (6 months)", "Top_N = 2", "Absolute_Filter = True"],
        "Indicators": ["N-month return for each asset"],
        "Entry": [
            "1. Rank assets by momentum",
            "2. Select Top N with positive momentum",
            "3. Equal weight allocation",
        ],
        "Exit": ["Monthly rebalance, drop assets with negative momentum"],
        "Risk": ["Absolute momentum filter reduces drawdowns"],
    },
    "notes": [
        "Adapts sector rotation concept to asset classes",
        "Monthly target decisions; synthetic daily-target accounting is applied by the engine",
        "Can go to cash if no positive momentum assets",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_portfolio(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 126))
    top_n = int(config.get("top_n", 2))
    use_absolute_filter = config.get("absolute_filter", True)

    assets = prices.columns.tolist()

    # Calculate momentum
    momentum = pd.DataFrame(index=prices.index, columns=assets)
    for asset in assets:
        momentum[asset] = prices[asset] / prices[asset].shift(lookback) - 1

    weights = pd.DataFrame(np.nan, index=prices.index, columns=assets)

    # Observe a month transition before deciding; never infer the last session
    # from future rows or calendar month-end labels. The engine owns execution lag.
    months = prices.index.to_period("M")
    monthly_idx = np.flatnonzero(months[1:] != months[:-1]) + 1

    for idx in monthly_idx:
        if idx - 1 < lookback:
            continue
        date = prices.index[idx]
        weights.loc[date] = 0.0

        # Rank by momentum
        mom_values = momentum.iloc[idx - 1].dropna()
        ranked = mom_values.sort_values(ascending=False)

        # Select Top N
        selected = ranked.head(top_n)

        if use_absolute_filter:
            # Only keep positive momentum
            selected = selected[selected > 0]

        if len(selected) > 0:
            # Equal weight
            weight_per_asset = 1.0 / len(selected)
            for asset in selected.index:
                weights.loc[date, asset] = weight_per_asset

    # Only absent decisions are filled; zero is an explicit exit/cash target.
    weights = weights.ffill().fillna(0)

    return weights


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MOM-04.py                      # uses the default basket below
#   python MOM-04.py SPY GLD USO          # or your own symbols
#   python MOM-04.py closes.csv           # or a CSV: Date column plus one close column per asset
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

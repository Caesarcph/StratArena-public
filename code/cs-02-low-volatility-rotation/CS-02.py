import pandas as pd

STRATEGY = {
    "id": "CS-02",
    "name": "Low Volatility Rotation",
    "mode": "portfolio",
    "ruleVersion": "monthly-prior-observation-v2",
    "corrections": ["causal-monthly-decision", "carry-monthly-targets"],
    "targetTiming": "First observed session of a new month, using the prior observation; engine applies one-row lag.",
    "tags": ["Volatility", "Cross-Section"],
    "summary": "Defensive rotation into the lowest vol assets.",
    "description": "Ranks assets by realized volatility and holds the lowest-risk names monthly.",
    "bestOn": "Cross-Section 1Y MaxDD Top3",
    "frequency": "Monthly",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "1 Month",
    "instruments": ["CS-UNIV"],
    "universe": ["SPY", "GLD", "USO", "EURUSD=X"],
    "portfolioSymbol": "CS-UNIV",
    "portfolioName": "Cross-Section Basket",
    "pseudocode": {
        "Inputs": ["VolLookback = 60", "TopN = 2"],
        "Indicators": ["Realized Volatility"],
        "Entry": ["Rank assets by lowest volatility", "Long lowest N assets"],
        "Rebalance": ["Monthly"],
        "Risk": ["Equal risk contribution"],
    },
    "notes": ["Universe: SPY/GLD/USO/EURUSD=X"],
    "updated": "2025-03-02",
    "recommendedCompare": ["CS-UNIV"],
}


def generate_portfolio(prices, config=None):
    config = config or {}
    vol_lookback = int(config.get("vol_lookback", 60))
    top_n = int(config.get("top_n", 2))

    returns = prices.pct_change().fillna(0.0)
    realized = returns.rolling(vol_lookback).std()
    months = prices.index.to_period("M")
    rebalance_rows = [i for i in range(1, len(prices)) if months[i] != months[i - 1]]
    weights = pd.DataFrame(float("nan"), index=prices.index, columns=prices.columns)

    # Observe the new month before using the prior completed volatility row.
    # Every decision includes zero exits; the engine owns execution lag.
    for idx in rebalance_rows:
        date = prices.index[idx]
        weights.loc[date] = 0.0
        vol = realized.iloc[idx - 1].dropna()
        if vol.empty:
            continue
        winners = vol.nsmallest(top_n).index
        raw = (1 / vol[winners].replace(0, pd.NA)).fillna(0.0)
        if raw.sum() == 0:
            continue
        weights.loc[date, winners] = raw / raw.sum()

    return weights.ffill().fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python CS-02.py                      # uses the default basket below
#   python CS-02.py SPY GLD USO          # or your own symbols
#   python CS-02.py closes.csv           # or a CSV: Date column plus one close column per asset
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

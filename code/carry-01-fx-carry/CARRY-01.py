import pandas as pd

STRATEGY = {
    "id": "CARRY-01",
    "name": "FX Carry",
    "mode": "portfolio",
    "ruleVersion": "monthly-prior-observation-v2",
    "corrections": ["causal-monthly-decision", "carry-monthly-targets"],
    "targetTiming": "First observed session of a new month, using the prior observation; engine applies one-row lag.",
    "tags": ["Carry", "FX"],
    "summary": "Long high carry and rotate monthly.",
    "description": "Carry proxy ranking with monthly rebalance and volatility filter.",
    "bestOn": "FX 3Y CAGR Top5",
    "frequency": "Monthly",
    "assetClasses": ["FX"],
    "holdingPeriod": "1 Month",
    "instruments": ["FX-CARRY"],
    "universe": ["SPY", "GLD", "USO", "EURUSD=X"],
    "portfolioSymbol": "FX-CARRY",
    "portfolioName": "FX Carry Basket",
    "pseudocode": {
        "Inputs": ["Lookback = 20"],
        "Indicators": ["Interest rate differential"],
        "Entry": ["Long high yield currencies", "Short low yield currencies (or cash)"],
        "Exit": ["Monthly rebalance"],
        "Risk": ["Disable when vol spikes"],
    },
    "notes": ["Carry proxy uses 20d return ranking across the arena universe."],
    "updated": "2025-03-02",
    "recommendedCompare": ["FX-CARRY"],
}


def generate_portfolio(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 20))
    top_n = int(config.get("top_n", 2))
    vol_lookback = int(config.get("vol_lookback", 60))
    vol_threshold = float(config.get("vol_threshold", 0.2))

    returns = prices.pct_change().fillna(0.0)
    carry_proxy = prices.pct_change(lookback)
    realized = returns.rolling(vol_lookback).std() * (252**0.5)
    months = prices.index.to_period("M")
    rebalance_rows = [i for i in range(1, len(prices)) if months[i] != months[i - 1]]
    weights = pd.DataFrame(float("nan"), index=prices.index, columns=prices.columns)

    # Missing decision rows retain targets; a rejected volatility filter must
    # instead publish an explicit all-cash vector. The engine owns execution lag.
    for idx in rebalance_rows:
        date = prices.index[idx]
        weights.loc[date] = 0.0
        avg_vol = realized.iloc[idx - 1].mean()
        if pd.notna(avg_vol) and avg_vol > vol_threshold:
            continue
        scores = carry_proxy.iloc[idx - 1].dropna()
        if scores.empty:
            continue
        winners = scores.nlargest(top_n).index
        weights.loc[date, winners] = 1.0 / len(winners)

    return weights.ffill().fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python CARRY-01.py                      # uses the default basket below
#   python CARRY-01.py SPY GLD USO          # or your own symbols
#   python CARRY-01.py closes.csv           # or a CSV: Date column plus one close column per asset
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

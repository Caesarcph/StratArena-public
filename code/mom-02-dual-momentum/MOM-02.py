import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MOM-02",
    "name": "Dual Momentum",
    "mode": "portfolio",
    "ruleVersion": "monthly-prior-observation-v2",
    "corrections": ["causal-monthly-decision", "preserve-zero-targets", "require-safe-asset"],
    "targetTiming": "First observed session of a new month, using the prior observation; engine applies one-row lag.",
    "tags": ["Momentum", "Tactical"],
    "summary": "Combine relative and absolute momentum for asset selection.",
    "description": "Gary Antonacci's Dual Momentum: select the asset with highest relative momentum, then apply absolute momentum filter. If selected asset has negative momentum, switch to safe asset.",
    "bestOn": "Multi-asset tactical allocation",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Months",
    "instruments": ["DUAL-MOM"],
    "universe": ["SPY", "GLD", "USO", "EURUSD=X"],
    "portfolioSymbol": "DUAL-MOM",
    "portfolioName": "Dual Momentum",
    "pseudocode": {
        "Inputs": ["Lookback = 252 (12 months)", "Safe_Asset = GLD"],
        "Indicators": ["12-month return for each asset"],
        "Entry": [
            "1. Relative Momentum: Select asset with highest 12M return",
            "2. Absolute Momentum: If selected return > 0, hold it",
            "3. If selected return <= 0, hold safe asset (GLD)",
        ],
        "Exit": ["Monthly rebalance"],
        "Risk": ["Absolute momentum filter avoids drawdowns"],
    },
    "notes": [
        "Based on Gary Antonacci's 2014 book",
        "Monthly decisions use prior-month data at the first observed new-month session",
        "Uses GLD as safe asset proxy",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_portfolio(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 252))
    safe_asset = config.get("safe_asset", "GLD")

    assets = prices.columns.tolist()
    if safe_asset not in assets:
        raise ValueError(f"Missing configured safe asset: {safe_asset}")
    risk_assets = [a for a in assets if a != safe_asset]
    if not risk_assets:
        raise ValueError("Dual momentum requires at least one risk asset")

    # Calculate momentum for all assets
    momentum = pd.DataFrame(index=prices.index, columns=assets)
    for asset in assets:
        momentum[asset] = prices[asset] / prices[asset].shift(lookback) - 1

    weights = pd.DataFrame(np.nan, index=prices.index, columns=assets)

    # The prior observation is complete only once a new-month session is seen.
    # The engine applies the execution lag separately.
    months = prices.index.to_period("M")
    monthly_idx = np.flatnonzero(months[1:] != months[:-1]) + 1

    for idx in monthly_idx:
        if idx - 1 < lookback:
            continue
        date = prices.index[idx]

        # Relative momentum: select best performing risk asset
        risk_mom = momentum.iloc[idx - 1][risk_assets].dropna()
        if len(risk_mom) == 0:
            continue
        weights.loc[date] = 0.0

        best_asset = risk_mom.idxmax()
        best_return = risk_mom.max()

        # Absolute momentum: check if positive
        if best_return > 0:
            weights.loc[date, best_asset] = 1.0
        else:
            weights.loc[date, safe_asset] = 1.0

    # Keep complete target vectors, including exits from previously held assets.
    weights = weights.ffill().fillna(0)

    return weights


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MOM-02.py                      # uses the default basket below
#   python MOM-02.py SPY GLD USO          # or your own symbols
#   python MOM-02.py closes.csv           # or a CSV: Date column plus one close column per asset
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

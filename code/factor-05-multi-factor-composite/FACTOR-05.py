import pandas as pd
import numpy as np

STRATEGY = {
    "id": "FACTOR-05",
    "name": "Multi-Factor Composite",
    "mode": "portfolio",
    "ruleVersion": "monthly-prior-observation-v2",
    "corrections": ["causal-monthly-decision", "remove-terminal-row-rebalance", "shift-trading-month-end-decision"],
    "targetTiming": "First observed session of a new month, using the prior observation; engine applies one-row lag.",
    "tags": ["Factor", "Multi-Factor", "Quantitative"],
    "summary": "Combine value, momentum, and quality factors.",
    "description": "Ranks assets across multiple factors: Value (price relative to long-term average), Momentum (recent returns), and Quality (low volatility, low drawdown). Combines factor scores with configurable weights to select top-ranked assets.",
    "bestOn": "Diverse asset pool for factor diversification",
    "frequency": "Monthly rebalance",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Months",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Value_Lookback = 252", "Mom_Lookback = 126", "Vol_Lookback = 60", "Weights = [0.3, 0.4, 0.3]"],
        "Indicators": [
            "Value: Price / 252-day MA (lower = better value)",
            "Momentum: 6-month return",
            "Quality: Inverse volatility + low drawdown",
            "Composite z-score",
        ],
        "Entry": ["Allocate to assets with highest composite score"],
        "Exit": ["Monthly rebalance based on updated scores"],
        "Position sizing": ["Proportional to factor scores"],
        "Risk controls": ["Volatility adjustment"],
    },
    "notes": [
        "Monthly decisions use the preceding completed observation at the first observed new-month session; this changes trading month-end timing too.",
        "Partial-month terminal rows do not trigger rebalancing; targets carry unchanged between monthly decisions.",
        "Factor diversification reduces single-factor risk",
        "Momentum tends to be strongest factor",
        "Quality provides downside protection",
    ],
    "updated": "2026-11-06",
    "recommendedCompare": ["SPY", "GLD"],
}


def calculate_value_score(prices, lookback=252):
    """Value factor: How cheap is the asset relative to history."""
    ma = prices.rolling(lookback).mean()
    # Lower ratio = better value
    ratio = prices / ma
    # Invert so higher score = better value
    return -ratio


def calculate_momentum_score(prices, lookback=126):
    """Momentum factor: Recent performance."""
    returns = prices.pct_change(lookback)
    return returns


def calculate_quality_score(prices, vol_lookback=60, dd_lookback=252):
    """Quality factor: Low volatility and low drawdown."""
    returns = prices.pct_change()

    # Volatility component (lower is better)
    volatility = returns.rolling(vol_lookback).std() * np.sqrt(252)
    vol_score = -volatility

    # Drawdown component (lower is better)
    rolling_max = prices.rolling(dd_lookback).max()
    drawdown = (prices - rolling_max) / rolling_max
    max_dd = drawdown.rolling(dd_lookback).min()
    dd_score = -max_dd.abs()  # Less negative = better

    # Combine
    quality = (vol_score + dd_score) / 2

    return quality


def cross_sectional_zscore(df):
    """Calculate z-score across assets for each date."""
    mean = df.mean(axis=1)
    std = df.std(axis=1).replace(0, 1)
    return df.sub(mean, axis=0).div(std, axis=0)


def generate_portfolio(prices, config=None):
    """Generate portfolio weights based on multi-factor scores."""
    config = config or {}

    value_lookback = int(config.get("value_lookback", 252))
    mom_lookback = int(config.get("mom_lookback", 126))
    vol_lookback = int(config.get("vol_lookback", 60))

    # Factor weights
    value_weight = float(config.get("value_weight", 0.3))
    mom_weight = float(config.get("mom_weight", 0.4))
    quality_weight = float(config.get("quality_weight", 0.3))

    assets = list(prices.columns)
    n = len(prices)

    weights = pd.DataFrame(0.0, index=prices.index, columns=assets)

    if len(assets) < 2:
        # Single asset - just hold it
        weights[assets[0]] = 1.0
        return weights

    # Calculate factor scores for each asset
    value_scores = pd.DataFrame(index=prices.index, columns=assets)
    mom_scores = pd.DataFrame(index=prices.index, columns=assets)
    quality_scores = pd.DataFrame(index=prices.index, columns=assets)

    for asset in assets:
        value_scores[asset] = calculate_value_score(prices[asset], value_lookback)
        mom_scores[asset] = calculate_momentum_score(prices[asset], mom_lookback)
        quality_scores[asset] = calculate_quality_score(prices[asset], vol_lookback, value_lookback)

    # Cross-sectional z-scores (rank relative to peers)
    value_z = cross_sectional_zscore(value_scores)
    mom_z = cross_sectional_zscore(mom_scores)
    quality_z = cross_sectional_zscore(quality_scores)

    # Composite score
    composite = (value_weight * value_z +
                 mom_weight * mom_z +
                 quality_weight * quality_z)

    warmup = max(value_lookback, mom_lookback, vol_lookback) + 10

    # Decide only after observing a month transition. The preceding score row
    # must clear the existing warmup; the engine still owns execution lag.
    months = prices.index.to_period("M")
    for i in range(warmup + 1, n):
        date = prices.index[i]
        weights.iloc[i] = weights.iloc[i - 1]
        if months[i] == months[i - 1]:
            continue

        # Use only the preceding completed observation, never today's scores.
        scores = composite.iloc[i - 1]

        if scores.isna().all():
            continue

        # Convert scores to weights
        # Option 1: Simple rank-based
        # Option 2: Score-proportional with floor
        # Using proportional approach

        # Shift scores to positive
        min_score = scores.min()
        shifted = scores - min_score + 0.1  # Small floor

        # Handle NaN
        shifted = shifted.fillna(0)

        # Normalize
        total = shifted.sum()
        if total > 0:
            for asset in assets:
                weights.loc[date, asset] = shifted[asset] / total
        else:
            # Equal weight fallback
            for asset in assets:
                weights.loc[date, asset] = 1.0 / len(assets)

    return weights.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python FACTOR-05.py                      # uses the default basket below
#   python FACTOR-05.py SPY GLD USO          # or your own symbols
#   python FACTOR-05.py closes.csv           # or a CSV: Date column plus one close column per asset
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

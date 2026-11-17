import pandas as pd
import numpy as np

STRATEGY = {'id': 'FACTOR-05',
 'name': 'Multi-Factor Composite',
 'mode': 'portfolio',
 'ruleVersion': 'monthly-prior-observation-v2',
 'corrections': ['causal-monthly-decision',
                 'remove-terminal-row-rebalance',
                 'shift-trading-month-end-decision'],
 'targetTiming': 'First observed session of a new month, using the prior observation; engine '
                 'applies one-row lag.',
 'tags': ['Factor', 'Multi-Factor', 'Quantitative'],
 'summary': 'Weights the basket with a blend of price-to-average, momentum and quality '
            'scores.',
 'description': 'The strategy standardizes each factor across assets, combines the scores and '
                'gives every scored asset a positive target weight. Higher composite scores '
                'get more weight.',
 'bestOn': 'Baskets with a range of momentum and risk profiles',
 'frequency': 'Monthly rebalance',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Months',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['At an eligible monthly decision, allocate to every asset with a '
                          'composite score.'],
                'Exit': ['Recalculate targets at each eligible rebalance. Carry the previous '
                         'target while no composite scores are available.'],
                'Indicators': ['Value is negative price divided by its SMA. Momentum is the '
                               'trailing return.',
                               'Quality averages negative annualized volatility and negative '
                               'absolute maximum drawdown. Compute drawdowns from rolling '
                               'price peaks and take the rolling worst drawdown.',
                               'Compute cross-sectional sample z-scores before combining the '
                               'factors.'],
                'Inputs': ['Default value and drawdown lookbacks 252 sessions, momentum '
                           'lookback 126 sessions, volatility lookback 60 returns, factor '
                           'weights 30% / 40% / 30%.'],
                'Position sizing': ['Subtract the smallest composite score, add 0.1 to each '
                                    'scored asset and normalize. Assets without a score '
                                    'receive zero weight.']},
 'notes': ['The site backtest aligns SPY, GLD, USO, EURUSD=X, DBC, SLV, DBA, UNG, BTC-USD and '
           'ETH-USD on their common completed sessions. Its SPY display label identifies the '
           'basket.',
           'Set targets on the first common session observed in a new month using the '
           'preceding completed session. The target takes effect on the next available return '
           'interval.',
           'The default drawdown calculation uses two rolling 252-session windows. It '
           'provides its first value after 503 observations, including the first price '
           'observation.'],
 'updated': '2026-11-06',
 'recommendedCompare': ['SPY', 'GLD']}


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
#   python FACTOR-05.py                      # uses STRATEGY.universe, or the site's configured markets
#   python FACTOR-05.py SPY GLD USO          # or your own symbols
#   python FACTOR-05.py closes.csv           # or a CSV: Date column plus one close column per asset
#
# This default-parameter example does not replay the site's walk-forward fits
# or archived data. Evidence downloads replay the published run's recorded
# arithmetic and include archived source. Recomputing strategy decisions needs
# the exact original inputs, which may not be public.
# Convention, same as the site: weights decided at the close of day t earn the
# returns of day t+1. Results are before trading costs. Not investment advice.
# ---------------------------------------------------------------------------
DEFAULT_UNIVERSE = ['SPY', 'GLD', 'USO', 'EURUSD=X', 'DBC', 'SLV', 'DBA', 'UNG', 'BTC-USD', 'ETH-USD']


def _load_closes(sources):
    if len(sources) == 1 and sources[0].lower().endswith(".csv"):
        frame = pd.read_csv(sources[0], index_col=0, parse_dates=True)
    else:
        if len(sources) < 2 or len(set(sources)) != len(sources):
            raise ValueError("A basket needs at least two distinct symbols (or one CSV file).")
        import yfinance as yf
        try:
            downloaded = yf.download(list(sources), start="2010-01-01", auto_adjust=True, progress=False)
        except Exception as error:
            raise ValueError("Could not download daily closes: " + str(error)) from error
        if not isinstance(downloaded, pd.DataFrame) or not isinstance(downloaded.columns, pd.MultiIndex):
            raise ValueError("Expected daily Close columns for each requested symbol.")
        levels = [level for level in range(downloaded.columns.nlevels)
                  if "Close" in downloaded.columns.get_level_values(level)]
        if len(levels) != 1:
            raise ValueError("Expected daily Close columns for each requested symbol.")
        frame = downloaded.xs("Close", axis=1, level=levels[0])
        missing = [symbol for symbol in sources if symbol not in frame.columns or frame[symbol].dropna().empty]
        if missing:
            raise ValueError("Missing close data: " + ", ".join(missing))
        # Pair strategies use column positions. Providers may sort ticker names.
        frame = frame.loc[:, list(sources)]
    if isinstance(frame.columns, pd.MultiIndex) or frame.columns.has_duplicates or len(frame.columns) < 2:
        raise ValueError("A basket needs at least two distinct asset columns.")
    if not isinstance(frame.index, pd.DatetimeIndex) or frame.index.hasnans or frame.index.has_duplicates:
        raise ValueError("Prices need unique, valid dates in the first column.")
    try:
        frame = frame.apply(pd.to_numeric, errors="raise")
    except (TypeError, ValueError) as error:
        raise ValueError("Close prices must be numeric.") from error
    import numpy as np
    present = frame.notna()
    if ((~np.isfinite(frame) | (frame <= 0)) & present).any().any():
        raise ValueError("Close prices must be finite and positive.")
    # Keep common observations; do not invent prices for closed or missing markets.
    frame = frame.sort_index().dropna()
    if len(frame) < 2:
        raise ValueError("Need at least two common dated observations for every asset.")
    return frame


if __name__ == "__main__":
    import sys

    try:
        closes = _load_closes(sys.argv[1:] or list(STRATEGY.get("universe", DEFAULT_UNIVERSE)))
    except (ValueError, OSError) as error:
        sys.exit("Cannot run example: " + str(error))
    weights = generate_portfolio(closes).reindex(closes.index).ffill().fillna(0.0)
    daily = (closes.pct_change().fillna(0.0) * weights.shift(1)).sum(axis=1)
    equity = (1 + daily).cumprod()
    years = (closes.index[-1] - closes.index[0]).days / 365.25
    print(STRATEGY["id"], STRATEGY["name"], "|", closes.index[0].date(), "to", closes.index[-1].date())
    print("Assets         " + ", ".join(map(str, closes.columns)))
    if not weights.ne(0).any().any():
        print("No positions generated. The sample may be shorter than the strategy's lookback/warmup, or no rule triggered.")
    print("Total return   {:+.1%}".format(equity.iloc[-1] - 1))
    print("CAGR           {:+.1%}".format(equity.iloc[-1] ** (1 / years) - 1))
    print("Sharpe         {:.2f}".format(daily.mean() / daily.std() * 252 ** 0.5 if daily.std() else 0.0))
    print("Max drawdown   {:.1%}".format((equity / equity.cummax() - 1).min()))

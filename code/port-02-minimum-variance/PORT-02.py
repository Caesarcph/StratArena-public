import pandas as pd
import numpy as np

STRATEGY = {'id': 'PORT-02',
 'name': 'Minimum Variance',
 'mode': 'portfolio',
 'ruleVersion': 'monthly-prior-observation-v2',
 'corrections': ['causal-monthly-decision', 'preserve-zero-targets'],
 'targetTiming': 'First observed session of a new month, using the prior observation; engine '
                 'applies one-row lag.',
 'tags': ['Portfolio', 'Optimization', 'Low Volatility'],
 'summary': 'Uses a covariance-based approximation to long-only minimum variance.',
 'description': 'First calculate the fully invested minimum-variance solution that permits '
                'negative weights. The default then clips negative weights and rescales the '
                'remaining positions, so the long-only result can differ from the constrained '
                'optimum.',
 'bestOn': 'Comparisons of covariance-based low-variance allocations',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Months',
 'instruments': ['MIN-VAR'],
 'universe': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'portfolioSymbol': 'MIN-VAR',
 'portfolioName': 'Minimum Variance',
 'pseudocode': {'Entry': ['Multiply its inverse by the all-ones vector and scale the result '
                          'to sum to one.'],
                'Exit': ['Recompute at the next eligible monthly decision. Zero weights clear '
                         'former positions.'],
                'Indicators': ['Annualize the sample covariance matrix and add 0.000001 to '
                               'each diagonal entry.'],
                'Inputs': ['Default lookback 60 daily returns, allow_short disabled and '
                           'diagonal regularization 0.000001.'],
                'Position sizing': ['By default, clip negative weights to zero and normalize '
                                    'again.']},
 'notes': ['The basket uses the common completed sessions of SPY, GLD, USO and EURUSD=X.',
           'Set targets on the first common session observed in a new month using the '
           'preceding completed session. The target takes effect on the next available return '
           'interval.',
           'The optional allow_short setting keeps negative weights. The rule uses equal '
           'weights if covariance is unusable or inversion fails.'],
 'updated': '2025-06-01',
 'recommendedCompare': ['SPY', 'GLD']}


def min_variance_weights(cov_matrix, allow_short=False):
    """
    Calculate minimum variance portfolio weights.
    Uses analytical solution for long-only constraint approximation.
    """
    n = cov_matrix.shape[0]

    try:
        # Analytical solution: w = Σ^(-1) * 1 / (1' * Σ^(-1) * 1)
        inv_cov = np.linalg.inv(cov_matrix)
        ones = np.ones(n)
        weights = inv_cov @ ones
        weights = weights / weights.sum()

        if not allow_short:
            # Simple long-only adjustment: clip negative weights
            weights = np.maximum(weights, 0)
            if weights.sum() > 0:
                weights = weights / weights.sum()
            else:
                # Fallback to equal weight
                weights = np.ones(n) / n

        return weights

    except np.linalg.LinAlgError:
        # Singular matrix, fallback to equal weight
        return np.ones(n) / n


def generate_portfolio(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 60))
    allow_short = config.get("allow_short", False)

    assets = prices.columns.tolist()
    n_assets = len(assets)

    # Calculate returns
    returns = prices.pct_change()

    weights = pd.DataFrame(np.nan, index=prices.index, columns=assets)

    # Observe a new month before deciding from prior completed returns.
    # The engine applies the existing one-row execution lag separately.
    months = prices.index.to_period("M")
    monthly_idx = np.flatnonzero(months[1:] != months[:-1]) + 1

    for idx in monthly_idx:
        if idx - 1 < lookback:
            continue
        date = prices.index[idx]

        # Include the prior observation's return and exclude the decision row.
        window_returns = returns.iloc[idx - lookback : idx]

        # Calculate covariance matrix (annualized)
        cov_matrix = window_returns.cov().values * 252

        # Check for valid covariance matrix
        if np.any(np.isnan(cov_matrix)) or np.any(np.isinf(cov_matrix)):
            # Fallback to equal weight
            w = np.ones(n_assets) / n_assets
        else:
            # Add small regularization for numerical stability
            cov_matrix += np.eye(n_assets) * 1e-6
            w = min_variance_weights(cov_matrix, allow_short)

        for i, asset in enumerate(assets):
            weights.loc[date, asset] = w[i]

    # Preserve clipped zero exits and permitted shorts in complete target vectors.
    weights = weights.ffill().fillna(0)

    return weights


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python PORT-02.py                      # uses STRATEGY.universe, or the site's configured markets
#   python PORT-02.py SPY GLD USO          # or your own symbols
#   python PORT-02.py closes.csv           # or a CSV: Date column plus one close column per asset
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

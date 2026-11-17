import pandas as pd
import numpy as np
from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.spatial.distance import squareform

STRATEGY = {'id': 'PORT-05',
 'name': 'Hierarchical Risk Parity',
 'mode': 'portfolio',
 'ruleVersion': 'hrp-asset-alignment-v3',
 'corrections': ['causal-monthly-decision',
                 'preserve-asset-weight-alignment',
                 'finite-weight-fallback'],
 'targetTiming': 'First observed session of a new month, using the prior observation; engine '
                 'applies one-row lag.',
 'tags': ['Portfolio', 'Risk Parity', 'Machine Learning'],
 'summary': 'Clusters assets by return correlation and distributes weight by cluster '
            'variance.',
 'description': 'Hierarchical Risk Parity sorts assets by the clustering tree and divides the '
                'sorted list recursively. Each split gives more weight to the lower-variance '
                'subcluster.',
 'bestOn': 'Multi-asset allocation based on hierarchical clustering',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Months',
 'instruments': ['HRP'],
 'universe': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'portfolioSymbol': 'HRP',
 'portfolioName': 'Hierarchical Risk Parity',
 'pseudocode': {'Entry': ['Split the ordered asset list in half recursively and allocate each '
                          'split inversely to the estimated subcluster variances.'],
                'Exit': ['Recompute targets at the next eligible monthly decision.'],
                'Indicators': ['Convert return correlations into distances and cluster '
                               'assets. Estimate subcluster variance using its internal '
                               'inverse-variance weights.'],
                'Inputs': ['Default lookback 60 daily returns and single linkage.'],
                'Position sizing': ['Return a fully invested allocation with each result '
                                    'assigned to its original asset.']},
 'notes': ['The basket uses the common completed sessions of SPY, GLD, USO and EURUSD=X.',
           'Set targets on the first common session observed in a new month using the '
           'preceding completed session. The target takes effect on the next available return '
           'interval.',
           'The backtest uses equal weights when covariance is unusable, any asset variance '
           'is zero, or clustering or weight calculation fails.'],
 'updated': '2025-06-01',
 'recommendedCompare': ['SPY', 'GLD']}


def get_cluster_var(cov, cluster_items):
    """Calculate variance of a cluster."""
    cov_slice = cov[np.ix_(cluster_items, cluster_items)]
    # Inverse variance weights within cluster
    ivp = 1.0 / np.diag(cov_slice)
    ivp /= ivp.sum()
    return np.dot(ivp, np.dot(cov_slice, ivp))


def get_quasi_diag(link):
    """Sort clustered items by distance."""
    return leaves_list(link)


def get_rec_bipart(cov, sorted_ix):
    """Recursive bisection for HRP weights."""
    n = len(sorted_ix)
    weights = np.ones(n)

    # List of clusters to process
    clusters = [sorted_ix]

    while clusters:
        new_clusters = []
        for cluster in clusters:
            if len(cluster) > 1:
                # Split cluster in half
                mid = len(cluster) // 2
                left = cluster[:mid]
                right = cluster[mid:]

                # Calculate variance of each half
                left_var = get_cluster_var(cov, left)
                right_var = get_cluster_var(cov, right)

                # Allocate inversely proportional to variance
                alpha = 1 - left_var / (left_var + right_var)

                # Update weights
                weights[left] *= alpha
                weights[right] *= (1 - alpha)

                new_clusters.append(left)
                new_clusters.append(right)

        clusters = new_clusters

    return weights


def hrp_weights(returns, linkage_method='single'):
    """
    Calculate HRP weights.
    """
    n = returns.shape[1]

    if n == 1:
        return np.array([1.0])

    # Correlation and covariance
    corr = returns.corr().values
    cov = returns.cov().values
    if not np.isfinite(cov).all() or (np.diag(cov) <= 0).any():
        return np.ones(n) / n

    # Handle NaN/Inf
    corr = np.nan_to_num(corr, nan=0.0, posinf=1.0, neginf=-1.0)

    # Distance matrix from correlation
    dist = np.sqrt((1 - corr) / 2)
    np.fill_diagonal(dist, 0)

    # Ensure symmetry
    dist = (dist + dist.T) / 2

    # Hierarchical clustering
    try:
        dist_condensed = squareform(dist)
        link = linkage(dist_condensed, method=linkage_method)
    except:
        # Fallback to equal weight
        return np.ones(n) / n

    # Sort assets by cluster
    sorted_ix = get_quasi_diag(link)

    # Recursive bisection
    weights = get_rec_bipart(cov, sorted_ix)
    total = weights.sum()
    if not np.isfinite(weights).all() or total <= 0:
        return np.ones(n) / n
    # Bisection writes weights using the original asset indices.
    return weights / total


def generate_portfolio(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 60))
    linkage_method = config.get("linkage", "single")

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

        try:
            w = hrp_weights(window_returns, linkage_method)
        except:
            # Fallback to equal weight
            w = np.ones(n_assets) / n_assets

        for i, asset in enumerate(assets):
            weights.loc[date, asset] = w[i]

    # Only missing decisions are filled; preserve complete target vectors.
    weights = weights.ffill().fillna(0)

    return weights


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance scipy
#   python PORT-05.py                      # uses STRATEGY.universe, or the site's configured markets
#   python PORT-05.py SPY GLD USO          # or your own symbols
#   python PORT-05.py closes.csv           # or a CSV: Date column plus one close column per asset
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

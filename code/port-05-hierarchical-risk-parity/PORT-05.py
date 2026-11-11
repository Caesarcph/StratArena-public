import pandas as pd
import numpy as np
from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.spatial.distance import squareform

STRATEGY = {
    "id": "PORT-05",
    "name": "Hierarchical Risk Parity",
    "mode": "portfolio",
    "ruleVersion": "monthly-prior-observation-v2",
    "corrections": ["causal-monthly-decision"],
    "targetTiming": "First observed session of a new month, using the prior observation; engine applies one-row lag.",
    "tags": ["Portfolio", "Risk Parity", "Machine Learning"],
    "summary": "Risk parity using hierarchical clustering.",
    "description": "HRP by Marcos Lopez de Prado. Uses hierarchical clustering on correlation matrix to build a tree structure, then allocates weights recursively. Avoids covariance matrix inversion.",
    "bestOn": "Robust portfolio allocation",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Months",
    "instruments": ["HRP"],
    "universe": ["SPY", "GLD", "USO", "EURUSD=X"],
    "portfolioSymbol": "HRP",
    "portfolioName": "Hierarchical Risk Parity",
    "pseudocode": {
        "Inputs": ["Lookback = 60", "Linkage = single"],
        "Indicators": ["Correlation matrix", "Hierarchical clustering"],
        "Entry": [
            "1. Cluster assets by correlation distance",
            "2. Quasi-diagonalize covariance matrix",
            "3. Recursive bisection for weights",
        ],
        "Exit": ["Monthly rebalance"],
        "Risk": ["No matrix inversion needed"],
    },
    "notes": [
        "Marcos Lopez de Prado (2016)",
        "More stable than mean-variance optimization",
        "Uses inverse variance at leaf level",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


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

    # Handle NaN/Inf
    corr = np.nan_to_num(corr, nan=0.0, posinf=1.0, neginf=-1.0)
    cov = np.nan_to_num(cov, nan=0.0)

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

    # Reorder to original order
    final_weights = np.zeros(n)
    for i, ix in enumerate(sorted_ix):
        final_weights[ix] = weights[i]

    # Normalize
    final_weights = final_weights / final_weights.sum()

    return final_weights


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
#   python PORT-05.py                      # uses the default basket below
#   python PORT-05.py SPY GLD USO          # or your own symbols
#   python PORT-05.py closes.csv           # or a CSV: Date column plus one close column per asset
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

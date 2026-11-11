import pandas as pd
import numpy as np

STRATEGY = {
    "id": "PORT-02",
    "name": "Minimum Variance",
    "mode": "portfolio",
    "ruleVersion": "monthly-prior-observation-v2",
    "corrections": ["causal-monthly-decision", "preserve-zero-targets"],
    "targetTiming": "First observed session of a new month, using the prior observation; engine applies one-row lag.",
    "tags": ["Portfolio", "Optimization", "Low Volatility"],
    "summary": "Minimize portfolio variance without return forecasts.",
    "description": "Minimum Variance portfolio minimizes total portfolio risk (variance) without requiring return predictions. Only uses the covariance matrix for optimization.",
    "bestOn": "Risk-averse allocation",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Months",
    "instruments": ["MIN-VAR"],
    "universe": ["SPY", "GLD", "USO", "EURUSD=X"],
    "portfolioSymbol": "MIN-VAR",
    "portfolioName": "Minimum Variance",
    "pseudocode": {
        "Inputs": ["Lookback = 60"],
        "Indicators": ["Covariance matrix"],
        "Entry": ["Solve min w'Σw s.t. sum(w)=1, w>=0"],
        "Exit": ["Monthly rebalance"],
        "Risk": ["Minimum achievable portfolio variance"],
    },
    "notes": [
        "No return forecasts needed",
        "Often outperforms due to low volatility anomaly",
        "Tends to concentrate in low-vol assets",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


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
#   python PORT-02.py                      # uses the default basket below
#   python PORT-02.py SPY GLD USO          # or your own symbols
#   python PORT-02.py closes.csv           # or a CSV: Date column plus one close column per asset
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

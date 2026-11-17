import pandas as pd
import numpy as np

STRATEGY = {
    "id": "PORT-01",
    "name": "Risk Parity",
    "mode": "portfolio",
    "ruleVersion": "monthly-prior-observation-v2",
    "corrections": ["causal-monthly-decision"],
    "targetTiming": "First observed session of a new month, using the prior observation; engine applies one-row lag.",
    "tags": ["Portfolio", "Risk Parity", "Optimization"],
    "summary": "Equal risk contribution from each asset.",
    "description": "Risk Parity allocates weights so each asset contributes equally to total portfolio risk. Uses inverse volatility as a simple approximation, with optional covariance adjustment.",
    "bestOn": "Multi-asset diversification",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Months",
    "instruments": ["RISK-PARITY"],
    "universe": ["SPY", "GLD", "USO", "EURUSD=X"],
    "portfolioSymbol": "RISK-PARITY",
    "portfolioName": "Risk Parity",
    "pseudocode": {
        "Inputs": ["Lookback = 60", "Rebalance = Monthly"],
        "Indicators": ["Rolling volatility", "Correlation matrix"],
        "Entry": ["Weight proportional to 1/volatility", "Normalize to sum to 1"],
        "Exit": ["Monthly rebalance"],
        "Risk": ["Equal risk contribution target"],
    },
    "notes": [
        "Classic risk parity uses inverse volatility",
        "More sophisticated versions use covariance matrix",
        "Popularized by Bridgewater's All Weather",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def calculate_risk_contribution(weights, cov_matrix):
    """Calculate risk contribution of each asset."""
    portfolio_vol = np.sqrt(weights @ cov_matrix @ weights)
    marginal_contrib = cov_matrix @ weights
    risk_contrib = weights * marginal_contrib / portfolio_vol
    return risk_contrib


def risk_parity_weights(cov_matrix, max_iter=100, tol=1e-8):
    """
    Calculate risk parity weights using iterative optimization.
    Each asset should contribute equally to portfolio risk.
    """
    n = cov_matrix.shape[0]

    # Start with inverse volatility weights
    vols = np.sqrt(np.diag(cov_matrix))
    weights = 1 / vols
    weights = weights / weights.sum()

    # Iterative optimization for true risk parity
    for _ in range(max_iter):
        risk_contrib = calculate_risk_contribution(weights, cov_matrix)
        target_risk = 1.0 / n

        # Adjust weights based on risk contribution deviation
        adjustment = target_risk / (risk_contrib + 1e-10)
        new_weights = weights * adjustment
        new_weights = new_weights / new_weights.sum()

        if np.max(np.abs(new_weights - weights)) < tol:
            break

        weights = new_weights

    return weights


def generate_portfolio(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 60))
    use_full_optimization = config.get("full_optimization", False)

    assets = prices.columns.tolist()
    n_assets = len(assets)

    # Calculate returns
    returns = prices.pct_change()

    weights = pd.DataFrame(np.nan, index=prices.index, columns=assets)

    # Decide after observing a new month, using only completed prior returns.
    # Effective exposure still uses the engine's separate one-row lag.
    months = prices.index.to_period("M")
    monthly_idx = np.flatnonzero(months[1:] != months[:-1]) + 1

    for idx in monthly_idx:
        if idx - 1 < lookback:
            continue
        date = prices.index[idx]

        # Include the prior observation's return, excluding the decision row.
        window_returns = returns.iloc[idx - lookback : idx]

        if use_full_optimization:
            # Full risk parity with covariance
            cov_matrix = window_returns.cov().values * 252  # Annualized

            # Check for valid covariance matrix
            if np.any(np.isnan(cov_matrix)) or np.any(np.isinf(cov_matrix)):
                # Fallback to inverse volatility
                vols = window_returns.std() * np.sqrt(252)
                w = 1 / vols
                w = w / w.sum()
            else:
                try:
                    w = risk_parity_weights(cov_matrix)
                except:
                    vols = window_returns.std() * np.sqrt(252)
                    w = 1 / vols
                    w = w / w.sum()
        else:
            # Simple inverse volatility (approximate risk parity)
            vols = window_returns.std() * np.sqrt(252)
            vols = vols.replace(0, np.nan).fillna(vols.mean())
            w = 1 / vols
            w = w / w.sum()

        for i, asset in enumerate(assets):
            weights.loc[date, asset] = w.iloc[i] if hasattr(w, 'iloc') else w[i]

    # Fill non-decision rows without discarding explicit zero targets.
    weights = weights.ffill().fillna(0)

    return weights


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python PORT-01.py                      # uses STRATEGY.universe, or the site's configured markets
#   python PORT-01.py SPY GLD USO          # or your own symbols
#   python PORT-01.py closes.csv           # or a CSV: Date column plus one close column per asset
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

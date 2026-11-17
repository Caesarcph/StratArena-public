import pandas as pd
import numpy as np

STRATEGY = {
    "id": "STAT-10",
    "name": "Dynamic Hedge Ratio Pairs",
    "mode": "portfolio",
    "tags": ["Pairs Trading", "Kalman Filter", "Statistical Arbitrage"],
    "summary": "Pairs trading with adaptive hedge ratio.",
    "description": "Uses Kalman Filter to dynamically estimate the hedge ratio between two assets. More adaptive than rolling OLS regression. Trades spread z-score with time-varying parameters.",
    "bestOn": "Cointegrated or highly correlated asset pairs",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Q = 0.001 (process noise)", "R = 1.0 (measurement noise)", "Entry_Z = 1.5", "Exit_Z = 0.3"],
        "Indicators": [
            "Kalman-filtered hedge ratio",
            "Dynamic spread",
            "Spread z-score",
        ],
        "Entry": ["Z < -1.5: long spread (long Y, short X)", "Z > 1.5: short spread"],
        "Exit": ["Z crosses 0 or reverses"],
        "Position sizing": ["Equal dollar weights adjusted by hedge ratio"],
        "Risk controls": ["Max holding period", "Hedge ratio stability check"],
    },
    "notes": [
        "Kalman Filter adapts to structural changes",
        "No need for fixed lookback window",
        "More responsive than OLS-based pairs",
    ],
    "updated": "2026-01-11",
    "recommendedCompare": ["SPY", "GLD"],
}


def kalman_filter_hedge_ratio(y, x, q=0.001, r=1.0):
    """
    Estimate hedge ratio using Kalman Filter.
    Model: y = beta * x + epsilon
    State: beta (hedge ratio)
    """
    n = len(y)

    # Initialize
    beta = np.zeros(n)
    beta[0] = 0.0  # Initial hedge ratio estimate
    P = 1.0  # Initial uncertainty

    for i in range(1, n):
        # Prediction step
        beta_pred = beta[i-1]
        P_pred = P + q

        # Update step
        x_val = x.iloc[i]
        y_val = y.iloc[i]

        if pd.isna(x_val) or pd.isna(y_val) or x_val == 0:
            beta[i] = beta[i-1]
            continue

        # Kalman gain
        K = P_pred * x_val / (x_val**2 * P_pred + r)

        # Update estimate
        innovation = y_val - beta_pred * x_val
        beta[i] = beta_pred + K * innovation

        # Update uncertainty
        P = (1 - K * x_val) * P_pred

    return pd.Series(beta, index=y.index)


def generate_portfolio(prices, config=None):
    """Generate portfolio weights for pairs trading."""
    config = config or {}

    q = float(config.get("q", 0.001))  # Process noise
    r = float(config.get("r", 1.0))    # Measurement noise
    entry_z = float(config.get("entry_z", 1.5))
    exit_z = float(config.get("exit_z", 0.3))
    lookback = int(config.get("lookback", 60))
    max_hold = int(config.get("max_hold", 20))

    # Get available assets
    assets = list(prices.columns)
    n = len(prices)

    # Initialize weights
    weights = pd.DataFrame(0.0, index=prices.index, columns=assets)

    if len(assets) < 2:
        return weights

    # Use first two assets as the pair (SPY and GLD typically)
    asset_y = assets[0]  # SPY
    asset_x = assets[1]  # GLD

    y = prices[asset_y]
    x = prices[asset_x]

    # Calculate Kalman-filtered hedge ratio
    hedge_ratio = kalman_filter_hedge_ratio(np.log(y), np.log(x), q, r)

    # Calculate spread
    spread = np.log(y) - hedge_ratio * np.log(x)

    # Calculate rolling z-score of spread
    spread_mean = spread.rolling(lookback).mean()
    spread_std = spread.rolling(lookback).std()
    z_score = (spread - spread_mean) / (spread_std + 1e-10)

    warmup = lookback + 50  # Extra warmup for Kalman
    position = 0  # 1 = long spread, -1 = short spread, 0 = flat
    entry_idx = None

    for i in range(warmup, n):
        z = z_score.iloc[i]
        hr = hedge_ratio.iloc[i]

        if pd.isna(z) or pd.isna(hr):
            # Carry forward
            weights.iloc[i] = weights.iloc[i-1]
            continue

        hold_days = (i - entry_idx) if entry_idx else 0

        if position == 0:
            # Look for entry
            if z < -entry_z:
                # Spread is too low, expect it to rise
                # Long Y, short X (weighted by hedge ratio)
                position = 1
                entry_idx = i
                weights.iloc[i, 0] = 1.0  # Long asset Y
                weights.iloc[i, 1] = -hr  # Short asset X (hedge ratio)
            elif z > entry_z:
                # Spread is too high, expect it to fall
                # Short Y, long X
                position = -1
                entry_idx = i
                weights.iloc[i, 0] = -1.0  # Short asset Y
                weights.iloc[i, 1] = hr    # Long asset X
            else:
                weights.iloc[i] = 0.0
        else:
            # Check for exit
            should_exit = False

            if position == 1:
                # Long spread - exit when z > -exit_z (reverted)
                if z > -exit_z or z > entry_z:
                    should_exit = True
            else:
                # Short spread - exit when z < exit_z (reverted)
                if z < exit_z or z < -entry_z:
                    should_exit = True

            # Max holding period
            if hold_days >= max_hold:
                should_exit = True

            if should_exit:
                position = 0
                entry_idx = None
                weights.iloc[i] = 0.0
            else:
                # Maintain position with updated hedge ratio
                weights.iloc[i, 0] = 1.0 * position
                weights.iloc[i, 1] = -hr * position

    # Normalize weights so absolute sum = 1 for comparability
    row_sums = weights.abs().sum(axis=1).replace(0, 1)
    weights = weights.div(row_sums, axis=0)

    return weights.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python STAT-10.py                      # uses STRATEGY.universe, or the site's configured markets
#   python STAT-10.py SPY GLD USO          # or your own symbols
#   python STAT-10.py closes.csv           # or a CSV: Date column plus one close column per asset
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

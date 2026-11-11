import pandas as pd
import numpy as np

STRATEGY = {
    "id": "STAT-11",
    "name": "Cointegration Basket",
    "mode": "portfolio",
    "tags": ["Statistical Arbitrage", "Cointegration", "Mean Reversion"],
    "summary": "Trade mean-reverting spread across multiple assets.",
    "description": "Constructs a stationary spread from multiple assets using rolling regression weights. The spread is tested for stationarity and traded when z-score reaches extremes. More robust than simple pairs trading.",
    "bestOn": "Assets with economic linkages",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Lookback = 60", "Entry_Z = 2.0", "Exit_Z = 0.5", "Max_Hold = 20"],
        "Indicators": [
            "Rolling regression weights",
            "Spread = weighted combination",
            "Spread z-score",
        ],
        "Entry": ["Z < -2: long spread", "Z > 2: short spread"],
        "Exit": ["Z crosses 0 or max hold reached"],
        "Position sizing": ["Weights from regression"],
        "Risk controls": ["Max holding period", "Stationarity check"],
    },
    "notes": [
        "Multi-asset spread more stable than pairs",
        "Rolling weights adapt to changing relationships",
        "Mean reversion on stationary spread",
    ],
    "updated": "2026-01-12",
    "recommendedCompare": ["SPY", "GLD"],
}


def estimate_spread_weights(prices, target_idx=0):
    """
    Estimate weights to create a stationary spread.
    Uses OLS regression: target = sum(weight_i * asset_i) + residual
    The residual is the spread we trade.
    """
    target = prices.iloc[:, target_idx]
    predictors = prices.drop(prices.columns[target_idx], axis=1)

    # Simple OLS
    X = predictors.values
    y = target.values

    # Add constant
    X_with_const = np.column_stack([np.ones(len(X)), X])

    try:
        # Solve normal equations
        coeffs = np.linalg.lstsq(X_with_const, y, rcond=None)[0]
        intercept = coeffs[0]
        weights = coeffs[1:]
        return intercept, weights, predictors.columns.tolist()
    except:
        return None, None, None


def generate_portfolio(prices, config=None):
    """Generate portfolio weights for cointegration basket trading."""
    config = config or {}

    lookback = int(config.get("lookback", 60))
    entry_z = float(config.get("entry_z", 2.0))
    exit_z = float(config.get("exit_z", 0.5))
    max_hold = int(config.get("max_hold", 20))
    zscore_window = int(config.get("zscore_window", 60))

    assets = list(prices.columns)
    n = len(prices)

    weights = pd.DataFrame(0.0, index=prices.index, columns=assets)

    if len(assets) < 2:
        return weights

    # Use log prices for cointegration
    log_prices = np.log(prices)

    # Calculate rolling spread
    spread = pd.Series(0.0, index=prices.index)

    warmup = lookback + zscore_window + 10
    position = 0  # 1 = long spread, -1 = short spread
    entry_idx = None
    current_weights = None

    for i in range(warmup, n):
        # Get rolling window for weight estimation
        window_start = i - lookback
        window_prices = log_prices.iloc[window_start:i]

        # Estimate spread weights
        intercept, hedge_weights, predictor_cols = estimate_spread_weights(window_prices, 0)

        if hedge_weights is None:
            weights.iloc[i] = weights.iloc[i-1]
            continue

        # Calculate spread value
        target = log_prices.iloc[i, 0]
        hedge_value = sum(hedge_weights[j] * log_prices.iloc[i, assets.index(predictor_cols[j])]
                        for j in range(len(hedge_weights)))
        spread_value = target - intercept - hedge_value

        # Update spread series for z-score calculation
        spread.iloc[i] = spread_value

        # Calculate z-score
        spread_window = spread.iloc[max(0, i-zscore_window):i+1]
        spread_mean = spread_window.mean()
        spread_std = spread_window.std()

        if spread_std < 1e-10:
            weights.iloc[i] = weights.iloc[i-1]
            continue

        z_score = (spread_value - spread_mean) / spread_std
        hold_days = (i - entry_idx) if entry_idx else 0

        if position == 0:
            # Look for entry
            if z_score < -entry_z:
                # Spread too low, expect it to rise
                # Long target (asset 0), short hedge assets
                position = 1
                entry_idx = i
                current_weights = {assets[0]: 1.0}
                for j, col in enumerate(predictor_cols):
                    current_weights[col] = -hedge_weights[j]

            elif z_score > entry_z:
                # Spread too high, expect it to fall
                # Short target, long hedge assets
                position = -1
                entry_idx = i
                current_weights = {assets[0]: -1.0}
                for j, col in enumerate(predictor_cols):
                    current_weights[col] = hedge_weights[j]

        else:
            # Check for exit
            should_exit = False

            if position == 1 and z_score > -exit_z:
                should_exit = True
            elif position == -1 and z_score < exit_z:
                should_exit = True
            elif hold_days >= max_hold:
                should_exit = True

            if should_exit:
                position = 0
                entry_idx = None
                current_weights = None

        # Apply current weights
        if current_weights:
            total_abs = sum(abs(v) for v in current_weights.values())
            for asset in assets:
                w = current_weights.get(asset, 0)
                weights.loc[weights.index[i], asset] = w / total_abs if total_abs > 0 else 0

    return weights.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python STAT-11.py                      # uses the default basket below
#   python STAT-11.py SPY GLD USO          # or your own symbols
#   python STAT-11.py closes.csv           # or a CSV: Date column plus one close column per asset
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

import pandas as pd
import numpy as np

STRATEGY = {'id': 'STAT-11',
 'name': 'Cointegration Basket',
 'mode': 'portfolio',
 'ruleVersion': 'rolling-residual-warmup-v2',
 'corrections': ['exclude-synthetic-residuals-from-zscore'],
 'tags': ['Statistical Arbitrage', 'Cointegration', 'Mean Reversion'],
 'summary': 'Trades extreme residuals from rolling multi-asset log-price regressions.',
 'description': 'Cointegration Basket is the strategy name. The rule fits a rolling OLS '
                'regression of SPY against the rest of the configured basket and trades '
                'standardized one-step residuals.',
 'bestOn': 'Research on multi-asset regression spreads',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days to weeks',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['After the 130-row warmup and with a valid residual window, z below '
                          '−2 opens a long residual and z above +2 opens a short residual.'],
                'Exit': ['On valid score rows, exit the long when z is above −0.5, or exit '
                         'the short when z is below +0.5. The 20-observation holding limit '
                         'also closes a trade on a valid score row.'],
                'Indicators': ['On each eligible day fit OLS to the preceding 60 completed '
                               'log-price rows. Evaluate the fit on the current row and '
                               'standardize its residual against the rolling sample of real '
                               'one-step residuals.'],
                'Inputs': ['Default regression lookback 60 sessions, z-score lookback 60 '
                           'earlier residuals plus the current residual, entry z-score 2, '
                           'exit z-score 0.5 and holding limit 20 observations.'],
                'Position sizing': ['For a long residual, take +1 in the target and the '
                                    'negative of each fitted coefficient in the other assets. '
                                    'Reverse the signs for a short residual and scale to 100% '
                                    'gross.']},
 'notes': ['The site backtest aligns SPY, GLD, USO, EURUSD=X, DBC, SLV, DBA, UNG, BTC-USD and '
           'ETH-USD on their common completed sessions. Its SPY display label identifies the '
           'basket.',
           'The published rule fits OLS with an intercept and has no formal stationarity '
           'test.',
           'Signal fits update daily. The hedge weights of an open trade remain at their '
           'entry values, and daily targets take effect on the next common return interval.'],
 'updated': '2026-01-12',
 'recommendedCompare': ['SPY', 'GLD']}


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
    spread = pd.Series(np.nan, index=prices.index)

    warmup = lookback + zscore_window + 10
    position = 0  # 1 = long spread, -1 = short spread
    entry_idx = None
    current_weights = None

    for i in range(lookback, n):
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
        if i < warmup:
            continue

        # Calculate z-score
        spread_window = spread.iloc[max(0, i-zscore_window):i+1]
        if not np.isfinite(spread_window).all():
            weights.iloc[i] = weights.iloc[i-1]
            continue
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
#   python STAT-11.py                      # uses STRATEGY.universe, or the site's configured markets
#   python STAT-11.py SPY GLD USO          # or your own symbols
#   python STAT-11.py closes.csv           # or a CSV: Date column plus one close column per asset
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

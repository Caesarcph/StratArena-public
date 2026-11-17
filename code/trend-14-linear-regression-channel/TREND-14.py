import numpy as np
import pandas as pd

STRATEGY = {'id': 'TREND-14',
 'name': 'Linear Regression Channel',
 'mode': 'single',
 'tags': ['Trend', 'Breakout'],
 'summary': 'Trades both directions against the previous rolling regression channel.',
 'description': 'The channel uses the fitted endpoint of a rolling linear regression and the '
                'dispersion of its price residuals. Each close is evaluated against the '
                "previous bar's channel.",
 'bestOn': 'Smooth trending markets',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['Close strictly above the previous upper band sets long. Close '
                          'strictly below the previous lower band sets short.'],
                'Exit': ['Inside the outer bands, an existing long exits strictly below the '
                         'previous fitted endpoint, and an existing short exits strictly '
                         'above it. Otherwise hold.'],
                'Indicators': ['Fit ordinary least squares to the last period closes. Channel '
                               'bands are the fitted endpoint ± std_dev × population standard '
                               'deviation of residuals.'],
                'Inputs': ['period = 50, std_dev = 2.'],
                'Position sizing': ['100% long, 100% short or cash.']},
 'notes': ['Outer-band breakouts take precedence and can reverse a position directly.',
           'The Pine download defaults to both directions as in the Python targets. Disable '
           'Allow short to test a long-only variant.'],
 'updated': '2026-01-13',
 'recommendedCompare': ['SPY', 'GLD', 'USO']}


def rolling_slope(values):
    y = np.asarray(values)
    n = len(y)
    if n < 2:
        return 0.0
    x = np.arange(n)
    x_mean = (n - 1) / 2.0
    y_mean = y.mean()
    denom = ((x - x_mean) ** 2).sum()
    if denom == 0:
        return 0.0
    return ((x - x_mean) * (y - y_mean)).sum() / denom


def rolling_residual_std(values):
    y = np.asarray(values)
    n = len(y)
    if n < 2:
        return 0.0
    x = np.arange(n)
    x_mean = (n - 1) / 2.0
    y_mean = y.mean()
    denom = ((x - x_mean) ** 2).sum()
    slope = 0.0 if denom == 0 else ((x - x_mean) * (y - y_mean)).sum() / denom
    intercept = y_mean - slope * x_mean
    fitted = intercept + slope * x
    return float(np.std(y - fitted))


def generate_signals(prices, config=None):
    config = config or {}
    period = int(config.get("period", 50))
    std_dev = float(config.get("std_dev", 2.0))

    close = prices.copy()
    slope = close.rolling(period).apply(rolling_slope, raw=True)
    mean = close.rolling(period).mean()
    x_mean = (period - 1) / 2.0
    intercept = mean - slope * x_mean
    mid = intercept + slope * (period - 1)
    residual_std = close.rolling(period).apply(rolling_residual_std, raw=True)

    upper = mid + std_dev * residual_std
    lower = mid - std_dev * residual_std

    upper_shift = upper.shift(1)
    lower_shift = lower.shift(1)
    mid_shift = mid.shift(1)

    signal = pd.Series(0.0, index=close.index)
    for idx in range(1, len(close)):
        if not np.isfinite(upper_shift.iloc[idx]) or not np.isfinite(
            lower_shift.iloc[idx]
        ):
            signal.iloc[idx] = signal.iloc[idx - 1]
            continue

        if close.iloc[idx] > upper_shift.iloc[idx]:
            signal.iloc[idx] = 1.0
        elif close.iloc[idx] < lower_shift.iloc[idx]:
            signal.iloc[idx] = -1.0
        else:
            prev = signal.iloc[idx - 1]
            if prev > 0 and close.iloc[idx] < mid_shift.iloc[idx]:
                signal.iloc[idx] = 0.0
            elif prev < 0 and close.iloc[idx] > mid_shift.iloc[idx]:
                signal.iloc[idx] = 0.0
            else:
                signal.iloc[idx] = prev

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-14.py SPY              # downloads daily prices with yfinance
#   python TREND-14.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
#
# This default-parameter example does not replay the site's walk-forward fits
# or archived data. Evidence downloads replay the published run's recorded
# arithmetic and include archived source. Recomputing strategy decisions needs
# the exact original inputs, which may not be public.
# Convention, same as the site: the position decided at the close of day t earns
# the return of day t+1. Results are before trading costs. Not investment advice.
# ---------------------------------------------------------------------------
def _load_prices(source):
    import numpy as np

    if source.lower().endswith(".csv"):
        frame = pd.read_csv(source, index_col=0, parse_dates=True)
    else:
        import yfinance as yf
        try:
            frame = yf.download(source, start="2010-01-01", auto_adjust=True, progress=False)
        except Exception as error:
            raise ValueError("Could not download daily prices: " + str(error)) from error
        if not isinstance(frame, pd.DataFrame):
            raise ValueError("Expected a table of daily prices for one ticker.")
        if isinstance(frame.columns, pd.MultiIndex):
            levels = [level for level in range(frame.columns.nlevels)
                      if "Close" in frame.columns.get_level_values(level)]
            if len(levels) != 1:
                raise ValueError("Expected daily prices for one ticker.")
            frame.columns = frame.columns.get_level_values(levels[0])
    required = ["Open", "High", "Low", "Close"] if STRATEGY.get("input") == "ohlc" else ["Close"]
    if frame.columns.has_duplicates:
        raise ValueError("Expected one column per price field for one ticker.")
    missing = [name for name in required if name not in frame.columns]
    if missing:
        raise ValueError("Missing price columns: " + ", ".join(missing))
    if not isinstance(frame.index, pd.DatetimeIndex) or frame.index.hasnans or frame.index.normalize().has_duplicates:
        raise ValueError("Prices need one row per valid calendar date.")
    frame = frame.copy()
    frame[required] = frame[required].apply(pd.to_numeric, errors="raise")
    frame = frame.sort_index().dropna(subset=required)
    prices = frame[required].to_numpy(dtype=float)
    if len(frame) < 2:
        raise ValueError("Need at least two complete daily observations.")
    if not np.isfinite(prices).all() or (prices <= 0).any():
        raise ValueError("Prices must be finite and positive.")
    return frame


if __name__ == "__main__":
    import sys

    try:
        prices = _load_prices(sys.argv[1] if len(sys.argv) > 1 else "SPY")
    except (OSError, TypeError, ValueError) as error:
        raise SystemExit("Input error: " + str(error)) from error
    close = prices["Close"]
    signal_input = prices if STRATEGY.get("input") == "ohlc" else close
    position = generate_signals(signal_input).reindex(close.index).ffill().fillna(0.0)
    daily = close.pct_change().fillna(0.0) * position.shift(1).fillna(0.0)
    equity = (1 + daily).cumprod()
    years = (close.index[-1].date() - close.index[0].date()).days / 365.25
    print(STRATEGY["id"], STRATEGY["name"], "|", close.index[0].date(), "to", close.index[-1].date())
    print("Total return   {:+.1%}".format(equity.iloc[-1] - 1))
    print("CAGR           {:+.1%}".format(equity.iloc[-1] ** (1 / years) - 1))
    print("Sharpe         {:.2f}".format(daily.mean() / daily.std() * 252 ** 0.5 if daily.std() else 0.0))
    print("Max drawdown   {:.1%}".format((equity / equity.cummax() - 1).min()))
    print("Days in market {:.0%}".format((position != 0).mean()))
    print("Buy and hold   {:+.1%}".format(close.iloc[-1] / close.iloc[0] - 1))

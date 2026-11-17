import pandas as pd
import numpy as np

STRATEGY = {'id': 'TREND-17',
 'name': 'Chandelier Exit',
 'mode': 'single',
 'tags': ['Trend', 'Volatility'],
 'summary': 'Uses closing-price Chandelier thresholds for long exits and re-entries.',
 'description': 'The thresholds start from a rolling highest and lowest close. Their '
                'distances use an ATR approximation based on absolute changes between '
                'successive closes.',
 'bestOn': 'Trending markets with clear swings',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['When flat after an exit, re-enter if the close is strictly above '
                          'the re-entry threshold.'],
                'Exit': ['In the uptrend state, go to cash when the close is strictly below '
                         'the exit threshold. Otherwise target long.'],
                'Indicators': ['Range proxy: the 22-bar simple average of absolute '
                               'close-to-close changes.',
                               'Exit threshold: 22-bar highest close minus 3 times the range '
                               'proxy. Re-entry threshold: 22-bar lowest close plus 3 times '
                               'the range proxy. The windows include the current close.'],
                'Inputs': ['Default: atr_period = 22, multiplier = 3.'],
                'Position sizing': ['100% long or cash.']},
 'notes': ['After a warm-up of atr_period + 1 bars, the rule starts by checking the exit '
           'threshold from an uptrend state.'],
 'updated': '2025-06-01',
 'recommendedCompare': ['SPY', 'GLD']}


def calculate_atr(prices, period=22):
    """Calculate ATR using close-to-close approximation."""
    close = prices
    tr = close.diff().abs()
    atr = tr.rolling(period).mean()
    return atr


def generate_signals(prices, config=None):
    config = config or {}
    atr_period = int(config.get("atr_period", 22))
    multiplier = float(config.get("multiplier", 3.0))

    close = prices.copy()
    n = len(close)

    # Calculate ATR
    atr = calculate_atr(close, atr_period)

    # Calculate highest high and lowest low
    highest_high = close.rolling(atr_period).max()
    lowest_low = close.rolling(atr_period).min()

    # Chandelier stops
    long_stop = highest_high - multiplier * atr
    short_stop = lowest_low + multiplier * atr

    signal = pd.Series(0.0, index=close.index)
    warmup = atr_period + 1

    # Start with trend determination
    in_uptrend = True

    for i in range(warmup, n):
        prev_signal = signal.iloc[i - 1]

        if in_uptrend:
            # Check if price falls below long stop
            if close.iloc[i] < long_stop.iloc[i]:
                in_uptrend = False
                signal.iloc[i] = 0.0
            else:
                signal.iloc[i] = 1.0
        else:
            # Check if price rises above short stop
            if close.iloc[i] > short_stop.iloc[i]:
                in_uptrend = True
                signal.iloc[i] = 1.0
            else:
                signal.iloc[i] = 0.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-17.py SPY              # downloads daily prices with yfinance
#   python TREND-17.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

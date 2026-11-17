import pandas as pd

STRATEGY = {'id': 'TREND-19',
 'name': 'Elder Triple Screen',
 'mode': 'single',
 'tags': ['Trend', 'Momentum'],
 'summary': 'A daily long-only rule requiring trend, pullback and breakout filters on the '
            'same close.',
 'description': 'This daily adaptation of Elder Triple Screen goes long only when a positive '
                'MACD histogram, a close above the long EMA, a negative smoothed price-change '
                'proxy and a breakout above prior closes all hold on the same bar.',
 'bestOn': 'Markets with orderly pullbacks',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['Enter long when trend is up, the pullback proxy is negative and '
                          'the current close exceeds the breakout threshold on the same bar.'],
                'Exit': ['Exit to cash when the trend filter fails. Otherwise hold the '
                         'previous target unless a new entry triggers.'],
                'Indicators': ['Trend is up when the MACD histogram is positive and the close '
                               'is above its 50-bar EMA.',
                               'The pullback proxy is the 13-bar EMA of close changes. The '
                               'breakout threshold is the maximum close over the preceding 20 '
                               'bars.'],
                'Inputs': ['Default: MACD 12/26/9, long EMA 50, price-change EMA 13, breakout '
                           'lookback 20.'],
                'Position sizing': ['Target 100% long or cash.']},
 'notes': ['The pullback filter uses smoothed close changes without volume. The simultaneous '
           'filters can leave the strategy in cash for long periods.'],
 'updated': '2026-01-13',
 'recommendedCompare': ['SPY', 'GLD']}


def ema(series, span):
    return series.ewm(span=span, adjust=False).mean()


def generate_signals(prices, config=None):
    config = config or {}
    macd_fast = int(config.get("macd_fast", 12))
    macd_slow = int(config.get("macd_slow", 26))
    macd_signal = int(config.get("macd_signal", 9))
    ema_long = int(config.get("ema_long", 50))
    force_ema = int(config.get("force_ema", 13))
    entry_lookback = int(config.get("entry_lookback", 20))

    close = prices.copy()
    macd_line = ema(close, macd_fast) - ema(close, macd_slow)
    signal_line = ema(macd_line, macd_signal)
    macd_hist = macd_line - signal_line
    trend_up = (macd_hist > 0) & (close > ema(close, ema_long))

    force = close.diff()
    force_smoothed = ema(force, force_ema)
    pullback = force_smoothed < 0

    breakout = close > close.rolling(entry_lookback).max().shift(1)

    signal = pd.Series(0.0, index=close.index)
    for idx in range(1, len(close)):
        if trend_up.iloc[idx] and pullback.iloc[idx] and breakout.iloc[idx]:
            signal.iloc[idx] = 1.0
        elif not trend_up.iloc[idx]:
            signal.iloc[idx] = 0.0
        else:
            signal.iloc[idx] = signal.iloc[idx - 1]

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-19.py SPY              # downloads daily prices with yfinance
#   python TREND-19.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

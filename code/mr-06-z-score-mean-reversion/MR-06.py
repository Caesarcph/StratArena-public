import pandas as pd
import numpy as np

STRATEGY = {'id': 'MR-06',
 'name': 'Z-Score Mean Reversion',
 'mode': 'single',
 'tags': ['Mean Reversion', 'Statistical'],
 'summary': 'Buy low price z-scores when entry volatility and trend filters allow.',
 'description': 'Both filters gate new entries only. Existing holdings persist until the '
                'one-sided z-score recovery exit.',
 'bestOn': 'Range-bound markets with moderate volatility',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['After 200 observations: z<−2, enabled volatility filter '
                          'strictly.10<vol<.50, and enabled trend filter distance<.10.'],
                'Exit': ['Exit when z>−.5; otherwise hold.'],
                'Indicators': ['Price z uses sample standard deviation. Annualized return '
                               'volatility uses sqrt252; trend distance is '
                               'abs(close/SMA200−1).'],
                'Inputs': ['lookback=20, entry_z=2, exit_z=.5; vol_filter=true, '
                           'trend_filter=true, min_vol=.10, max_vol=.50, '
                           'trend_threshold=.10.'],
                'Position sizing': ['100% long or cash.']},
 'notes': ['The200-row warmup remains even with filters disabled. There is no time stop, and '
           'the filters do not guarantee improved returns.'],
 'updated': '2025-06-01',
 'recommendedCompare': ['SPY', 'GLD']}


def generate_signals(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 20))
    entry_z = float(config.get("entry_z", 2.0))
    exit_z = float(config.get("exit_z", 0.5))
    vol_filter = config.get("vol_filter", True)
    trend_filter = config.get("trend_filter", True)
    min_vol = float(config.get("min_vol", 0.10))
    max_vol = float(config.get("max_vol", 0.50))
    trend_threshold = float(config.get("trend_threshold", 0.10))

    close = prices.copy()
    n = len(close)

    # Z-Score calculation
    ma = close.rolling(lookback).mean()
    std = close.rolling(lookback).std()
    z_score = (close - ma) / std

    # Volatility filter: annualized volatility in reasonable range
    if vol_filter:
        daily_vol = close.pct_change().rolling(lookback).std()
        annualized_vol = daily_vol * np.sqrt(252)
        vol_ok = (annualized_vol > min_vol) & (annualized_vol < max_vol)
    else:
        vol_ok = pd.Series(True, index=close.index)

    # Trend filter: price within threshold of 200-day MA
    if trend_filter:
        ma_200 = close.rolling(200).mean()
        trend_neutral = (close / ma_200 - 1).abs() < trend_threshold
    else:
        trend_neutral = pd.Series(True, index=close.index)

    signal = pd.Series(0.0, index=close.index)

    for i in range(200, n):
        can_trade = vol_ok.iloc[i] and trend_neutral.iloc[i]
        prev_signal = signal.iloc[i - 1]

        if prev_signal == 0:
            # Only enter if filters allow
            if can_trade and z_score.iloc[i] < -entry_z:
                signal.iloc[i] = 1.0
            else:
                signal.iloc[i] = 0.0
        else:
            # Exit when z-score reverts
            if z_score.iloc[i] > -exit_z:
                signal.iloc[i] = 0.0
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-06.py SPY              # downloads daily prices with yfinance
#   python MR-06.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

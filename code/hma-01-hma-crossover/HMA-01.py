import pandas as pd
import numpy as np

STRATEGY = {'id': 'HMA-01',
 'name': 'HMA Crossover',
 'mode': 'single',
 'tags': ['Trend', 'Momentum', 'MA'],
 'summary': 'Sets direction from the relative values of two Hull moving averages.',
 'description': 'The fast and slow Hull moving averages are calculated from closing prices '
                'with integer-floor subwindows. The target is reassessed on every bar.',
 'bestOn': 'SPY 3Y Trend Score Top5',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days to weeks',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['Go long when the fast HMA is above the slow HMA. Go short when the '
                          'fast HMA is below the slow HMA if allow_short is enabled.'],
                'Exit': ['Go flat when the averages are equal or unavailable. With default '
                         'settings, a fast HMA below the slow HMA also means cash.'],
                'Indicators': ['HMA(n) is WMA(2 × WMA(close, floor(n/2)) − WMA(close, n), '
                               'floor(√n)).'],
                'Inputs': ['fast_period = 9, slow_period = 21, allow_short = false.'],
                'Position sizing': ['100% long or cash by default. Optional short target '
                                    '−100%.']},
 'notes': ['Use periods of at least 2 so the half-period has a valid length.'],
 'updated': '2026-01-09',
 'recommendedCompare': ['SPY', 'GLD', 'USO']}


def wma(series, period):
    weights = np.arange(1, period + 1)
    return series.rolling(period).apply(
        lambda values: np.dot(values, weights) / weights.sum(), raw=True
    )


def hma(series, period):
    half_period = int(period / 2)
    sqrt_period = int(np.sqrt(period))
    wma_half = wma(series, half_period)
    wma_full = wma(series, period)
    raw = 2 * wma_half - wma_full
    return wma(raw, sqrt_period)


def generate_signals(prices, config=None):
    config = config or {}
    fast_period = int(config.get("fast_period", 9))
    slow_period = int(config.get("slow_period", 21))
    allow_short = bool(config.get("allow_short", False))

    close = prices if isinstance(prices, pd.Series) else prices["Close"]
    hma_fast = hma(close, fast_period)
    hma_slow = hma(close, slow_period)

    position = pd.Series(0.0, index=close.index)
    position[hma_fast > hma_slow] = 1.0
    if allow_short:
        position[hma_fast < hma_slow] = -1.0
    return position.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python HMA-01.py SPY              # downloads daily prices with yfinance
#   python HMA-01.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

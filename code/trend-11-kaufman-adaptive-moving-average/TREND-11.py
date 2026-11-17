import pandas as pd
import numpy as np

STRATEGY = {'id': 'TREND-11',
 'name': 'Kaufman Adaptive Moving Average',
 'mode': 'single',
 'tags': ['Trend', 'Adaptive', 'MA'],
 'summary': 'Uses a rising Kaufman adaptive average to confirm long entries.',
 'description': 'The smoothing rate adapts to the ratio of absolute net price change to the '
                "total absolute change. Price relative to KAMA and the average's five-bar "
                'slope drive the target.',
 'bestOn': 'Markets with varying trend strength',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Weeks',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['After er_period + slope_period bars, set long when the close '
                          'exceeds KAMA and KAMA is higher than slope_period bars before.'],
                'Exit': ['Set cash when price is at or below KAMA. Otherwise, if price is '
                         'above but the slope is nonpositive, carry the prior target.'],
                'Indicators': ['ER is absolute price change over er_period divided by the sum '
                               'of absolute changes. A zero denominator gives ER = 0.',
                               'Let f = 2/(fast + 1), s = 2/(slow + 1). Add [ER × (f − s) + '
                               's]² times (current close − previous KAMA) to the previous '
                               'KAMA.'],
                'Inputs': ['er_period = 10, fast = 2, slow = 30, slope_period = 5.'],
                'Position sizing': ['100% long or cash.']},
 'notes': ['Seed KAMA with the close at the end of the first er_period-bar window.'],
 'updated': '2025-06-01',
 'recommendedCompare': ['SPY', 'GLD']}


def calculate_kama(prices, er_period=10, fast_period=2, slow_period=30):
    """Calculate Kaufman Adaptive Moving Average."""
    close = prices.copy()
    n = len(close)

    # Smoothing constants
    fast_sc = 2 / (fast_period + 1)
    slow_sc = 2 / (slow_period + 1)

    # Initialize
    kama = pd.Series(np.nan, index=close.index)
    if n < er_period:
        return kama
    kama.iloc[er_period - 1] = close.iloc[er_period - 1]

    for i in range(er_period, n):
        # Price change over period
        change = abs(close.iloc[i] - close.iloc[i - er_period])

        # Sum of absolute daily changes
        volatility = close.diff().abs().iloc[i - er_period + 1 : i + 1].sum()

        # Efficiency Ratio
        if volatility != 0:
            er = change / volatility
        else:
            er = 0

        # Smoothing constant
        sc = (er * (fast_sc - slow_sc) + slow_sc) ** 2

        # KAMA
        kama.iloc[i] = kama.iloc[i - 1] + sc * (close.iloc[i] - kama.iloc[i - 1])

    return kama


def generate_signals(prices, config=None):
    config = config or {}
    er_period = int(config.get("er_period", 10))
    fast_period = int(config.get("fast", 2))
    slow_period = int(config.get("slow", 30))
    slope_period = int(config.get("slope_period", 5))

    close = prices.copy()

    # Calculate KAMA
    kama = calculate_kama(close, er_period, fast_period, slow_period)

    # KAMA slope (is it rising?)
    kama_slope = kama.diff(slope_period)

    signal = pd.Series(0.0, index=close.index)

    warmup = er_period + slope_period

    for i in range(warmup, len(close)):
        price_above_kama = close.iloc[i] > kama.iloc[i]
        kama_rising = kama_slope.iloc[i] > 0

        # Bullish: price above KAMA and KAMA rising
        if price_above_kama and kama_rising:
            signal.iloc[i] = 1.0
        # Exit when price below KAMA
        elif not price_above_kama:
            signal.iloc[i] = 0.0
        else:
            # Price above but KAMA flat/falling - hold previous
            signal.iloc[i] = signal.iloc[i - 1]

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-11.py SPY              # downloads daily prices with yfinance
#   python TREND-11.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

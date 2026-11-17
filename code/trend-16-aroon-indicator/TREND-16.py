import pandas as pd
import numpy as np

STRATEGY = {'id': 'TREND-16',
 'name': 'Aroon Indicator',
 'mode': 'single',
 'tags': ['Trend', 'Technical'],
 'summary': 'Measures trend from the recency of closing-price extremes.',
 'description': 'The rule tracks Aroon Up and Down over a window of closing prices. Separate '
                'entry and exit thresholds let an established long position persist until the '
                'indicators weaken.',
 'bestOn': 'Trending markets',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['From cash, set long when Aroon Up is above 70 and Aroon Down is '
                          'below 30.'],
                'Exit': ['While long, go flat if Aroon Up is below 50 or Aroon Down is above '
                         '50. Otherwise hold.'],
                'Indicators': ['Use the current close plus period prior closes. For each '
                               'extreme, compute 100 × (period − bars since extreme)/period.',
                               'Use the oldest occurrence when equal closes tie for an '
                               'extreme.'],
                'Inputs': ['period = 25, up_threshold = 70, down_threshold = 30.'],
                'Position sizing': ['100% long or cash.']},
 'notes': ['At the defaults the calculation uses 26 closes.'],
 'updated': '2025-06-01',
 'recommendedCompare': ['SPY', 'GLD']}


def generate_signals(prices, config=None):
    config = config or {}
    period = int(config.get("period", 25))
    up_threshold = float(config.get("up_threshold", 70))
    down_threshold = float(config.get("down_threshold", 30))

    close = prices.copy()

    # Calculate Aroon Up and Down
    aroon_up = pd.Series(0.0, index=close.index)
    aroon_down = pd.Series(0.0, index=close.index)

    for i in range(period, len(close)):
        window = close.iloc[i - period : i + 1]
        days_since_high = period - window.argmax()
        days_since_low = period - window.argmin()

        aroon_up.iloc[i] = ((period - days_since_high) / period) * 100
        aroon_down.iloc[i] = ((period - days_since_low) / period) * 100

    # Generate signals
    signal = pd.Series(0.0, index=close.index)
    in_position = False

    for i in range(period, len(close)):
        if not in_position:
            # Entry: strong uptrend
            if aroon_up.iloc[i] > up_threshold and aroon_down.iloc[i] < down_threshold:
                signal.iloc[i] = 1.0
                in_position = True
            else:
                signal.iloc[i] = 0.0
        else:
            # Exit: trend weakening
            if aroon_up.iloc[i] < 50 or aroon_down.iloc[i] > 50:
                signal.iloc[i] = 0.0
                in_position = False
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-16.py SPY              # downloads daily prices with yfinance
#   python TREND-16.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

import pandas as pd
import numpy as np

STRATEGY = {'id': 'RISK-03',
 'name': 'Stop Loss Overlay',
 'mode': 'single',
 'tags': ['Risk Management', 'Stop Loss'],
 'summary': 'Runs a closing-price trend rule with an entry-relative stop and stop-only '
            'cooldown.',
 'description': 'The base signal is the close above a simple moving average. A separate stop '
                'compares the current close with the entry close, and a stop-triggered exit '
                'starts the cooldown.',
 'bestOn': 'Any trending market',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days to weeks',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['After ma_period bars, enter from cash when the close exceeds the '
                          'SMA and the cooldown has expired.'],
                'Exit': ['Exit first if the close-to-entry return is strictly below '
                         '−stop_pct. This starts cooldown. Otherwise exit when close is at or '
                         'below SMA without cooldown.'],
                'Indicators': ['Compute SMA(ma_period) from closes. Keep the close that '
                               'established the long target as the stop reference.'],
                'Inputs': ['ma_period = 50, stop_pct = 0.05, cooldown = 5.'],
                'Position sizing': ['100% long or cash.']},
 'notes': ['After a stop on bar t, entry can resume on bar t + cooldown if the trend '
           'condition passes.',
           'The stop is evaluated at the close. The threshold is a signal level and losses '
           'can exceed it.'],
 'updated': '2026-01-11',
 'recommendedCompare': ['SPY', 'GLD']}


def generate_signals(prices, config=None):
    config = config or {}
    ma_period = int(config.get("ma_period", 50))
    stop_pct = float(config.get("stop_pct", 0.05))
    cooldown = int(config.get("cooldown", 5))

    close = prices.copy()
    n = len(close)

    # Base trend signal
    ma = close.rolling(ma_period).mean()
    base_signal = (close > ma).astype(float)

    signal = pd.Series(0.0, index=close.index)

    entry_price = None
    cooldown_remaining = 0

    for i in range(ma_period, n):
        prev_signal = signal.iloc[i - 1]

        # Decrease cooldown
        if cooldown_remaining > 0:
            cooldown_remaining -= 1

        if prev_signal == 0:
            # Not in position - check for entry
            if base_signal.iloc[i] == 1 and cooldown_remaining == 0:
                signal.iloc[i] = 1.0
                entry_price = close.iloc[i]
            else:
                signal.iloc[i] = 0.0
        else:
            # In position - check for stop loss or base exit
            if entry_price is not None:
                drawdown = (close.iloc[i] - entry_price) / entry_price

                if drawdown < -stop_pct:
                    # Stop loss triggered
                    signal.iloc[i] = 0.0
                    entry_price = None
                    cooldown_remaining = cooldown
                elif base_signal.iloc[i] == 0:
                    # Base signal exit
                    signal.iloc[i] = 0.0
                    entry_price = None
                else:
                    signal.iloc[i] = 1.0
            else:
                signal.iloc[i] = base_signal.iloc[i]

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python RISK-03.py SPY              # downloads daily prices with yfinance
#   python RISK-03.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

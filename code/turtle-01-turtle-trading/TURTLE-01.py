import pandas as pd

STRATEGY = {'id': 'TURTLE-01',
 'name': 'Turtle Trading',
 'tags': ['Trend', 'Breakout'],
 'summary': 'Uses a 20-bar closing-price breakout entry and a 10-bar closing-price exit.',
 'description': 'This Turtle-style variant runs one long-or-cash rule with separate entry and '
                'exit lookbacks. It uses the prior windows of closes.',
 'bestOn': 'Multi-Asset 3Y Arena Score Top5',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Weeks',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ["Go long if today's close is strictly above the upper boundary."],
                'Exit': ["Go to cash if today's close is strictly below the lower boundary. "
                         'Otherwise keep the prior target.'],
                'Indicators': ['Upper boundary = prior entry_window highest close. Lower '
                               'boundary = prior exit_window lowest close.'],
                'Inputs': ['entry_window = 20, exit_window = 10.'],
                'Position sizing': ['100% long or cash.']},
 'notes': ['Targets are full long or cash. The rule calculates its signals at the close.'],
 'updated': '2025-03-01',
 'recommendedCompare': ['SPY', 'GLD', 'USO']}


def generate_signals(prices, config=None):
    config = config or {}
    entry_window = int(config.get("entry_window", 20))
    exit_window = int(config.get("exit_window", 10))

    close = prices.copy()
    breakout_high = close.rolling(entry_window).max().shift(1)
    exit_low = close.rolling(exit_window).min().shift(1)

    position = pd.Series(0.0, index=close.index)
    for idx in range(len(close)):
        if idx == 0:
            continue
        if close.iloc[idx] > breakout_high.iloc[idx]:
            position.iloc[idx] = 1.0
        elif close.iloc[idx] < exit_low.iloc[idx]:
            position.iloc[idx] = 0.0
        else:
            position.iloc[idx] = position.iloc[idx - 1]
    return position.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TURTLE-01.py SPY              # downloads daily prices with yfinance
#   python TURTLE-01.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

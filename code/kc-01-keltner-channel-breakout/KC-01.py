import pandas as pd
import numpy as np

STRATEGY = {
    "id": "KC-01",
    "name": "Keltner Channel Breakout",
    "mode": "single",
    "input": "ohlc",
    "tags": ["Trend", "Breakout", "Channel"],
    "summary": "Breakouts from an ATR-based channel.",
    "description": "EMA midline with ATR bands; trades trigger on channel breaks.",
    "bestOn": "SPY 3Y Trend Score Top5",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["EMA_Period = 20", "ATR_Period = 20", "Multiplier = 2.0"],
        "Indicators": ["EMA(Close)", "ATR"],
        "Entry": ["Close > UpperBand: long", "Close < LowerBand: short (optional)"],
        "Exit": ["Close back to middle band", "Or reverse signal"],
    },
    "notes": ["Long-only by default; set allow_short to enable shorts."],
    "updated": "2026-01-09",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


def generate_signals(prices, config=None):
    config = config or {}
    ema_period = int(config.get("ema_period", 20))
    atr_period = int(config.get("atr_period", 20))
    multiplier = float(config.get("multiplier", 2.0))
    allow_short = bool(config.get("allow_short", False))

    close = prices["Close"]
    high = prices["High"]
    low = prices["Low"]

    middle = close.ewm(span=ema_period, adjust=False).mean()
    tr = pd.concat(
        [(high - low), (high - close.shift(1)).abs(), (low - close.shift(1)).abs()],
        axis=1,
    ).max(axis=1)
    atr = tr.rolling(atr_period).mean()
    upper = middle + multiplier * atr
    lower = middle - multiplier * atr

    position = pd.Series(0.0, index=close.index)
    for idx in range(1, len(close)):
        if close.iloc[idx] > upper.iloc[idx]:
            position.iloc[idx] = 1.0
        elif close.iloc[idx] < lower.iloc[idx]:
            position.iloc[idx] = -1.0 if allow_short else 0.0
        elif position.iloc[idx - 1] == 1.0 and close.iloc[idx] < middle.iloc[idx]:
            position.iloc[idx] = 0.0
        elif (
            allow_short
            and position.iloc[idx - 1] == -1.0
            and close.iloc[idx] > middle.iloc[idx]
        ):
            position.iloc[idx] = 0.0
        else:
            position.iloc[idx] = position.iloc[idx - 1]

    return position.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python KC-01.py SPY              # downloads daily prices with yfinance
#   python KC-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
#
# Convention, same as the site: the position decided at the close of day t earns
# the return of day t+1. Results are before trading costs. Not investment advice.
# ---------------------------------------------------------------------------
def _load_prices(source):
    if source.lower().endswith(".csv"):
        frame = pd.read_csv(source, index_col=0, parse_dates=True)
    else:
        import yfinance as yf
        frame = yf.download(source, start="2010-01-01", auto_adjust=True, progress=False)
        if isinstance(frame.columns, pd.MultiIndex):
            frame.columns = frame.columns.get_level_values(0)
    return frame.sort_index().dropna(subset=["Close"])


if __name__ == "__main__":
    import sys

    prices = _load_prices(sys.argv[1] if len(sys.argv) > 1 else "SPY")
    close = prices["Close"]
    signal_input = prices if STRATEGY.get("input") == "ohlc" else close
    position = generate_signals(signal_input).reindex(close.index).ffill().fillna(0.0)
    daily = close.pct_change().fillna(0.0) * position.shift(1).fillna(0.0)
    equity = (1 + daily).cumprod()
    years = (close.index[-1] - close.index[0]).days / 365.25
    print(STRATEGY["id"], STRATEGY["name"], "|", close.index[0].date(), "to", close.index[-1].date())
    print("Total return   {:+.1%}".format(equity.iloc[-1] - 1))
    print("CAGR           {:+.1%}".format(equity.iloc[-1] ** (1 / years) - 1))
    print("Sharpe         {:.2f}".format(daily.mean() / daily.std() * 252 ** 0.5 if daily.std() else 0.0))
    print("Max drawdown   {:.1%}".format((equity / equity.cummax() - 1).min()))
    print("Days in market {:.0%}".format((position != 0).mean()))
    print("Buy and hold   {:+.1%}".format(close.iloc[-1] / close.iloc[0] - 1))

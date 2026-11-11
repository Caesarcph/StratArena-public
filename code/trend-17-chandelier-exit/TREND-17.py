import pandas as pd
import numpy as np

STRATEGY = {
    "id": "TREND-17",
    "name": "Chandelier Exit",
    "mode": "single",
    "tags": ["Trend", "Volatility"],
    "summary": "ATR-based trailing stop trend system.",
    "description": "Uses ATR-based trailing stops from recent highs. Long stop = Highest High - 3*ATR. Stays in trend until volatility-adjusted stop is hit. Designed to ride trends and protect gains.",
    "bestOn": "Trending markets with clear swings",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["ATR_Period = 22", "Multiplier = 3.0"],
        "Indicators": [
            "ATR = Average True Range over N periods",
            "Long Stop = Highest High(22) - 3 * ATR",
            "Short Stop = Lowest Low(22) + 3 * ATR",
        ],
        "Entry": ["Buy when price breaks above short stop (reversal)"],
        "Exit": ["Sell when price falls below long stop"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["ATR-based dynamic stop loss"],
    },
    "notes": [
        "Developed by Charles Le Beau",
        "Named after chandelier hanging from ceiling (highest point)",
        "Adapts to volatility - wider stops in volatile markets",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


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
#   python TREND-17.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

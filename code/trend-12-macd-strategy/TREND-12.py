import pandas as pd
import numpy as np

STRATEGY = {
    "id": "TREND-12",
    "name": "MACD Strategy",
    "mode": "single",
    "tags": ["Trend", "Momentum"],
    "summary": "Classic MACD crossover trend following.",
    "description": "Uses MACD (Moving Average Convergence Divergence) line crossing the Signal line to identify trend changes. MACD above Signal indicates bullish momentum.",
    "bestOn": "Trending markets",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Fast = 12", "Slow = 26", "Signal = 9"],
        "Indicators": [
            "MACD = EMA(12) - EMA(26)",
            "Signal Line = EMA(MACD, 9)",
            "Histogram = MACD - Signal",
        ],
        "Entry": ["Buy when MACD crosses above Signal line"],
        "Exit": ["Sell when MACD crosses below Signal line"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["None - pure trend following"],
    },
    "notes": [
        "Developed by Gerald Appel in the 1970s",
        "Combines trend-following and momentum",
        "Works best in trending markets, whipsaws in ranges",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    fast = int(config.get("fast", 12))
    slow = int(config.get("slow", 26))
    signal_period = int(config.get("signal", 9))

    close = prices.copy()

    # Calculate MACD
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    macd = ema_fast - ema_slow

    # Signal line
    signal_line = macd.ewm(span=signal_period, adjust=False).mean()

    # Generate signals
    signal = pd.Series(0.0, index=close.index)
    warmup = slow + signal_period

    for i in range(warmup, len(close)):
        # MACD above signal line = bullish
        if macd.iloc[i] > signal_line.iloc[i]:
            signal.iloc[i] = 1.0
        else:
            signal.iloc[i] = 0.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-12.py SPY              # downloads daily prices with yfinance
#   python TREND-12.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

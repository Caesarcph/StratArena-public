import pandas as pd
import numpy as np

STRATEGY = {
    "id": "COMBO-02",
    "name": "MACD + RSI Filter",
    "mode": "single",
    "tags": ["Technical", "Combo", "Momentum"],
    "summary": "MACD crossover with RSI confirmation.",
    "description": "Combines MACD momentum signal with RSI filter. Only takes MACD buy signals when RSI is not overbought, and MACD sell signals when RSI is not oversold. Double confirmation reduces false signals.",
    "bestOn": "Trending markets with pullbacks",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["MACD_Fast = 12", "MACD_Slow = 26", "MACD_Signal = 9", "RSI_Period = 14", "RSI_OB = 70", "RSI_OS = 30"],
        "Indicators": [
            "MACD line and signal line",
            "MACD histogram",
            "RSI",
        ],
        "Entry": ["MACD crosses above signal", "AND RSI < 70 (not overbought)"],
        "Exit": ["MACD crosses below signal", "OR RSI > 80 (extreme overbought)"],
        "Position sizing": ["Full position on confirmed signals"],
        "Risk controls": ["RSI filter prevents buying tops"],
    },
    "notes": [
        "MACD for trend direction",
        "RSI for overbought/oversold filter",
        "Reduces whipsaws in choppy markets",
    ],
    "updated": "2026-01-12",
    "recommendedCompare": ["SPY", "GLD"],
}


def calculate_macd(prices, fast=12, slow=26, signal=9):
    """Calculate MACD indicator."""
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def calculate_rsi(prices, period=14):
    """Calculate RSI indicator."""
    delta = prices.diff()
    gain = delta.where(delta > 0, 0)
    loss = (-delta).where(delta < 0, 0)
    avg_gain = gain.ewm(span=period, adjust=False).mean()
    avg_loss = loss.ewm(span=period, adjust=False).mean()
    rs = avg_gain / (avg_loss + 1e-10)
    return 100 - (100 / (1 + rs))


def generate_signals(prices, config=None):
    config = config or {}

    macd_fast = int(config.get("macd_fast", 12))
    macd_slow = int(config.get("macd_slow", 26))
    macd_signal = int(config.get("macd_signal", 9))
    rsi_period = int(config.get("rsi_period", 14))
    rsi_overbought = float(config.get("rsi_overbought", 70))
    rsi_oversold = float(config.get("rsi_oversold", 30))
    rsi_extreme = float(config.get("rsi_extreme", 80))

    close = prices.copy()
    n = len(close)

    # Calculate indicators
    macd_line, signal_line, histogram = calculate_macd(close, macd_fast, macd_slow, macd_signal)
    rsi = calculate_rsi(close, rsi_period)

    # MACD crossover signals
    macd_cross_up = (macd_line > signal_line) & (macd_line.shift(1) <= signal_line.shift(1))
    macd_cross_down = (macd_line < signal_line) & (macd_line.shift(1) >= signal_line.shift(1))
    macd_bullish = macd_line > signal_line

    signal = pd.Series(0.0, index=close.index)

    warmup = max(macd_slow, rsi_period) + macd_signal + 5

    for i in range(warmup, n):
        prev_signal = signal.iloc[i - 1]
        curr_rsi = rsi.iloc[i]
        curr_macd_bullish = macd_bullish.iloc[i]
        curr_cross_up = macd_cross_up.iloc[i]
        curr_cross_down = macd_cross_down.iloc[i]

        if pd.isna(curr_rsi) or pd.isna(curr_macd_bullish):
            signal.iloc[i] = prev_signal
            continue

        if prev_signal == 0:
            # Not in position - look for entry
            # Entry: MACD bullish crossover AND RSI not overbought
            if curr_cross_up and curr_rsi < rsi_overbought:
                signal.iloc[i] = 1.0
            elif curr_macd_bullish and curr_rsi < rsi_oversold:
                # Alternative entry: MACD already bullish + RSI oversold
                signal.iloc[i] = 1.0
            else:
                signal.iloc[i] = 0.0
        else:
            # In position - look for exit
            # Exit: MACD bearish crossover OR extreme RSI
            if curr_cross_down:
                signal.iloc[i] = 0.0
            elif curr_rsi > rsi_extreme:
                signal.iloc[i] = 0.0
            elif not curr_macd_bullish and curr_rsi > rsi_overbought:
                # MACD bearish + overbought
                signal.iloc[i] = 0.0
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python COMBO-02.py SPY              # downloads daily prices with yfinance
#   python COMBO-02.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

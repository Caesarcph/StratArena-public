import pandas as pd

STRATEGY = {
    "id": "TREND-19",
    "name": "Elder Triple Screen",
    "mode": "single",
    "tags": ["Trend", "Momentum"],
    "summary": "Multi-filter trend system using MACD, pullbacks, and breakouts.",
    "description": "Combines a trend filter (MACD + long EMA), a pullback filter (Force Index proxy), and a breakout trigger. Long-only implementation aligned with daily data.",
    "bestOn": "Markets with orderly pullbacks",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": [
            "MACD_Fast = 12",
            "MACD_Slow = 26",
            "MACD_Signal = 9",
            "EMA_Long = 50",
            "Force_EMA = 13",
            "Entry_Lookback = 20",
        ],
        "Indicators": [
            "MACD histogram for trend filter",
            "Force Index proxy = close.diff()",
            "Entry breakout = recent high",
        ],
        "Entry": ["Trend up AND Force Index < 0 AND close > recent high"],
        "Exit": ["Trend filter turns down"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Requires pullback before breakout entry"],
    },
    "notes": ["Force Index uses price-change proxy (no volume)", "Simplified long-only version"],
    "updated": "2026-01-13",
    "recommendedCompare": ["SPY", "GLD"],
}


def ema(series, span):
    return series.ewm(span=span, adjust=False).mean()


def generate_signals(prices, config=None):
    config = config or {}
    macd_fast = int(config.get("macd_fast", 12))
    macd_slow = int(config.get("macd_slow", 26))
    macd_signal = int(config.get("macd_signal", 9))
    ema_long = int(config.get("ema_long", 50))
    force_ema = int(config.get("force_ema", 13))
    entry_lookback = int(config.get("entry_lookback", 20))

    close = prices.copy()
    macd_line = ema(close, macd_fast) - ema(close, macd_slow)
    signal_line = ema(macd_line, macd_signal)
    macd_hist = macd_line - signal_line
    trend_up = (macd_hist > 0) & (close > ema(close, ema_long))

    force = close.diff()
    force_smoothed = ema(force, force_ema)
    pullback = force_smoothed < 0

    breakout = close > close.rolling(entry_lookback).max().shift(1)

    signal = pd.Series(0.0, index=close.index)
    for idx in range(1, len(close)):
        if trend_up.iloc[idx] and pullback.iloc[idx] and breakout.iloc[idx]:
            signal.iloc[idx] = 1.0
        elif not trend_up.iloc[idx]:
            signal.iloc[idx] = 0.0
        else:
            signal.iloc[idx] = signal.iloc[idx - 1]

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-19.py SPY              # downloads daily prices with yfinance
#   python TREND-19.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

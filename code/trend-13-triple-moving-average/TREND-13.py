import pandas as pd

STRATEGY = {
    "id": "TREND-13",
    "name": "Triple Moving Average",
    "mode": "single",
    "tags": ["Trend", "Momentum"],
    "summary": "Confirm trend direction with three moving averages.",
    "description": "Uses short, medium, and long SMAs to confirm trend alignment. Long when the fast SMA is above the medium SMA and the medium SMA is above the slow SMA. Exit when the stack reverses.",
    "bestOn": "Sustained trends with clean regimes",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Short = 50", "Medium = 100", "Long = 200"],
        "Indicators": ["SMA(Short)", "SMA(Medium)", "SMA(Long)"],
        "Entry": ["Go long when SMA(Short) > SMA(Medium) > SMA(Long)"],
        "Exit": ["Exit when SMA(Short) < SMA(Medium) < SMA(Long)"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Hold prior position when signals are mixed"],
    },
    "notes": ["Reduces whipsaws versus dual MA", "Late entry in sharp reversals"],
    "updated": "2026-01-13",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


def generate_signals(prices, config=None):
    config = config or {}
    short_window = int(config.get("short_window", 50))
    medium_window = int(config.get("medium_window", 100))
    long_window = int(config.get("long_window", 200))

    close = prices.copy()
    short_ma = close.rolling(short_window).mean()
    medium_ma = close.rolling(medium_window).mean()
    long_ma = close.rolling(long_window).mean()

    signal = pd.Series(0.0, index=close.index)
    for idx in range(1, len(close)):
        if (
            short_ma.iloc[idx] > medium_ma.iloc[idx]
            and medium_ma.iloc[idx] > long_ma.iloc[idx]
        ):
            signal.iloc[idx] = 1.0
        elif (
            short_ma.iloc[idx] < medium_ma.iloc[idx]
            and medium_ma.iloc[idx] < long_ma.iloc[idx]
        ):
            signal.iloc[idx] = 0.0
        else:
            signal.iloc[idx] = signal.iloc[idx - 1]
    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-13.py SPY              # downloads daily prices with yfinance
#   python TREND-13.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

import pandas as pd

STRATEGY = {
    "id": "TURTLE-01",
    "name": "Turtle Trading",
    "tags": ["Trend", "Breakout"],
    "summary": "Classic breakout system with trailing exit.",
    "description": "A long-only Turtle Trading system using a 20-day breakout entry and 10-day low exit.",
    "bestOn": "Multi-Asset 3Y Arena Score Top5",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["EntryLookback = 20", "ExitLookback = 10", "Risk = 1%"],
        "Indicators": ["DonchianHigh(20)", "DonchianLow(10)", "ATR(20)"],
        "Entry": ["Go long when close > prior 20-day high"],
        "Exit": ["Exit when close < prior 10-day low"],
        "Position sizing": ["Position = Risk / ATR (tracked externally)"],
        "Risk controls": ["Trade only after breakout confirmation"],
    },
    "notes": ["Captures persistent trends", "Susceptible to whipsaws in ranges"],
    "updated": "2025-03-01",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


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
#   python TURTLE-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

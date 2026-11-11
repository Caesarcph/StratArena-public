import pandas as pd

STRATEGY = {
    "id": "TREND-02",
    "name": "Donchian Breakout",
    "tags": ["Trend", "Breakout"],
    "summary": "Ride multi-month highs and exit on fast lows.",
    "description": "A classic trend system that enters on 55-day highs and exits on 20-day lows with ATR sizing.",
    "bestOn": "Gold 3Y Calmar Top3",
    "frequency": "Daily",
    "assetClasses": ["Commodity", "Index", "FX"],
    "holdingPeriod": "Weeks",
    "instruments": ["GLD", "SPY", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["BreakoutLookback = 55", "ExitLookback = 20", "Risk = 1%"],
        "Indicators": ["DonchianHigh", "DonchianLow", "ATR(20)"],
        "Entry": ["If close > DonchianHigh then enter long"],
        "Exit": ["If close < DonchianLow then exit"],
        "Position sizing": ["Position = Risk / ATR"],
        "Risk controls": ["Max 3 concurrent trades", "Trailing stop at 2x ATR"],
    },
    "notes": ["Strong in persistent trends", "Choppy ranges can whipsaw signals"],
    "updated": "2025-02-28",
    "recommendedCompare": ["GLD", "USO", "SPY"],
}


def generate_signals(prices, config=None):
    close = prices.copy()
    high = close.rolling(55).max()
    low = close.rolling(20).min()

    position = pd.Series(0.0, index=close.index)
    for idx in range(len(close)):
        if idx == 0:
            continue
        if close.iloc[idx] > high.iloc[idx - 1]:
            position.iloc[idx] = 1.0
        elif close.iloc[idx] < low.iloc[idx - 1]:
            position.iloc[idx] = 0.0
        else:
            position.iloc[idx] = position.iloc[idx - 1]
    return position.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-02.py SPY              # downloads daily prices with yfinance
#   python TREND-02.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

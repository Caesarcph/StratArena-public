import pandas as pd

STRATEGY = {
    "id": "SEAS-01",
    "name": "Monthly Seasonality",
    "mode": "single",
    "tags": ["Seasonality", "Calendar"],
    "summary": "Sell in May? Long Nov-Apr, cash May-Oct.",
    "description": "Seasonal timing strategy based on the Nov-Apr effect.",
    "bestOn": "SPY 5Y Calmar Top5",
    "frequency": "Monthly",
    "assetClasses": ["Index"],
    "holdingPeriod": "6 Months",
    "instruments": ["SPY"],
    "pseudocode": {
        "Logic": ["Only long SPY in Nov-Apr", "Stay in cash May-Oct"],
    },
    "notes": ["Seasonality pattern applied to SPY only."],
    "updated": "2025-03-02",
    "recommendedCompare": ["SPY"],
}


def generate_signals(prices, config=None):
    months = prices.index.month
    signal = pd.Series(0.0, index=prices.index)
    signal[months.isin([11, 12, 1, 2, 3, 4])] = 1.0
    return signal


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python SEAS-01.py SPY              # downloads daily prices with yfinance
#   python SEAS-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

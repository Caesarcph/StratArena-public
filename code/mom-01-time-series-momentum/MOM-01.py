import pandas as pd

STRATEGY = {
    "id": "MOM-01",
    "name": "Time-Series Momentum",
    "tags": ["Momentum", "Trend"],
    "summary": "Stay long when 12-month momentum is positive.",
    "description": "A simple time-series momentum model with monthly rebalancing.",
    "bestOn": "EURUSD 5Y Sharpe Top5",
    "frequency": "Daily",
    "assetClasses": ["FX", "Index"],
    "holdingPeriod": "Months",
    "instruments": ["EURUSD=X", "SPY", "GLD", "USO"],
    "pseudocode": {
        "Inputs": ["Lookback = 252", "Rebalance = 21"],
        "Indicators": ["12M momentum"],
        "Entry": ["Go long when momentum > 0"],
        "Exit": ["Exit when momentum < 0"],
        "Position sizing": ["Equal weight"],
        "Risk controls": ["Skip signals around major events"],
    },
    "notes": ["Robust in long trends", "Slow in turning points"],
    "updated": "2025-01-05",
    "recommendedCompare": ["EURUSD=X", "SPY", "GLD"],
}


def generate_signals(prices, config=None):
    close = prices.copy()
    momentum = close.pct_change(252)
    signal = (momentum > 0).astype(float)
    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MOM-01.py SPY              # downloads daily prices with yfinance
#   python MOM-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

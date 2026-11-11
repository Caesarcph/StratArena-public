import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MOM-03",
    "name": "52-Week High Momentum",
    "mode": "single",
    "tags": ["Momentum", "Technical"],
    "summary": "Buy when price approaches 52-week high, exit on weakness.",
    "description": "Based on George & Hwang (2004) research. Stocks near their 52-week highs tend to outperform due to investor underreaction (anchoring bias). Enter when price reaches 95% of 52-week high, exit when falling below 85%.",
    "bestOn": "Trending markets",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Lookback = 252 (52 weeks)", "Entry_Threshold = 0.95", "Exit_Threshold = 0.85"],
        "Indicators": ["52-week high", "High ratio = Price / 52W High"],
        "Entry": ["Buy when high ratio >= 0.95 (near 52W high)"],
        "Exit": ["Exit when high ratio < 0.85"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Exit on significant pullback from high"],
    },
    "notes": [
        "Anchoring bias: investors underreact to prices near historical highs",
        "George & Hwang (2004) academic research",
        "Works best in uptrending markets",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 252))
    entry_threshold = float(config.get("entry_threshold", 0.95))
    exit_threshold = float(config.get("exit_threshold", 0.85))

    close = prices.copy()

    # 52-week high
    high_52w = close.rolling(lookback).max()

    # High ratio
    ratio = close / high_52w

    signal = pd.Series(0.0, index=close.index)

    for i in range(lookback, len(close)):
        prev_signal = signal.iloc[i - 1]

        if prev_signal == 0:
            # Enter when price near 52-week high
            if ratio.iloc[i] >= entry_threshold:
                signal.iloc[i] = 1.0
            else:
                signal.iloc[i] = 0.0
        else:
            # Exit when falling significantly from high
            if ratio.iloc[i] < exit_threshold:
                signal.iloc[i] = 0.0
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MOM-03.py SPY              # downloads daily prices with yfinance
#   python MOM-03.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

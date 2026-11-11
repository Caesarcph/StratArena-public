import pandas as pd
import numpy as np

STRATEGY = {
    "id": "TREND-16",
    "name": "Aroon Indicator",
    "mode": "single",
    "tags": ["Trend", "Technical"],
    "summary": "Trend strength using time since highs/lows.",
    "description": "Aroon indicator measures how long since the highest high and lowest low. Aroon Up > 70 with Aroon Down < 30 indicates strong uptrend. Captures trend emergence and strength.",
    "bestOn": "Trending markets",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Period = 25", "Up_Threshold = 70", "Down_Threshold = 30"],
        "Indicators": [
            "Aroon Up = ((Period - Days since highest high) / Period) * 100",
            "Aroon Down = ((Period - Days since lowest low) / Period) * 100",
        ],
        "Entry": ["Buy when Aroon Up > 70 and Aroon Down < 30"],
        "Exit": ["Sell when Aroon Up < 50 or Aroon Down > 50"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Exit on trend weakness"],
    },
    "notes": [
        "Developed by Tushar Chande in 1995",
        "Name means 'dawn's early light' in Sanskrit",
        "Measures trend strength and potential reversals",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    period = int(config.get("period", 25))
    up_threshold = float(config.get("up_threshold", 70))
    down_threshold = float(config.get("down_threshold", 30))

    close = prices.copy()

    # Calculate Aroon Up and Down
    aroon_up = pd.Series(0.0, index=close.index)
    aroon_down = pd.Series(0.0, index=close.index)

    for i in range(period, len(close)):
        window = close.iloc[i - period : i + 1]
        days_since_high = period - window.argmax()
        days_since_low = period - window.argmin()

        aroon_up.iloc[i] = ((period - days_since_high) / period) * 100
        aroon_down.iloc[i] = ((period - days_since_low) / period) * 100

    # Generate signals
    signal = pd.Series(0.0, index=close.index)
    in_position = False

    for i in range(period, len(close)):
        if not in_position:
            # Entry: strong uptrend
            if aroon_up.iloc[i] > up_threshold and aroon_down.iloc[i] < down_threshold:
                signal.iloc[i] = 1.0
                in_position = True
            else:
                signal.iloc[i] = 0.0
        else:
            # Exit: trend weakening
            if aroon_up.iloc[i] < 50 or aroon_down.iloc[i] > 50:
                signal.iloc[i] = 0.0
                in_position = False
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-16.py SPY              # downloads daily prices with yfinance
#   python TREND-16.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

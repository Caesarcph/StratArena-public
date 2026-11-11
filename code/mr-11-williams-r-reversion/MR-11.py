import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MR-11",
    "name": "Williams %R Reversion",
    "mode": "single",
    "tags": ["Mean Reversion", "Oscillator"],
    "summary": "Buy oversold Williams %R, exit at neutral.",
    "description": "Uses Williams %R oscillator to identify oversold conditions. %R ranges from -100 to 0. Enter long when %R < -80 (oversold), exit when %R > -20 (overbought). Classic momentum oscillator reversion.",
    "bestOn": "Range-bound markets",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Period = 14", "Oversold = -80", "Overbought = -20"],
        "Indicators": [
            "%R = (Highest High - Close) / (Highest High - Lowest Low) * -100",
        ],
        "Entry": ["Buy when %R < -80 (oversold)"],
        "Exit": ["Exit when %R > -20 (overbought)"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Max hold period of 20 days"],
    },
    "notes": [
        "Developed by Larry Williams",
        "Similar to Stochastic but inverted scale",
        "Ranges from -100 (oversold) to 0 (overbought)",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    period = int(config.get("period", 14))
    oversold = float(config.get("oversold", -80))
    overbought = float(config.get("overbought", -20))
    max_hold = int(config.get("max_hold", 20))

    close = prices.copy()

    # Calculate Williams %R
    highest_high = close.rolling(period).max()
    lowest_low = close.rolling(period).min()

    williams_r = (highest_high - close) / (highest_high - lowest_low + 1e-10) * -100

    signal = pd.Series(0.0, index=close.index)
    entry_idx = None

    for i in range(period, len(close)):
        prev_signal = signal.iloc[i - 1]

        if prev_signal == 0:
            # Check for oversold entry
            if williams_r.iloc[i] < oversold:
                signal.iloc[i] = 1.0
                entry_idx = i
            else:
                signal.iloc[i] = 0.0
        else:
            # In position - check for exit
            hold_days = i - entry_idx if entry_idx else 0

            # Exit on overbought or max hold
            if williams_r.iloc[i] > overbought:
                signal.iloc[i] = 0.0
            elif hold_days >= max_hold:
                signal.iloc[i] = 0.0
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-11.py SPY              # downloads daily prices with yfinance
#   python MR-11.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

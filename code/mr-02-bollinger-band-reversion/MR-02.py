import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MR-02",
    "name": "Bollinger Band Reversion",
    "mode": "single",
    "tags": ["Mean Reversion", "Volatility"],
    "summary": "Buy at lower band, exit at middle band with bandwidth filter.",
    "description": "Classic mean reversion using Bollinger Bands. Enters long when price touches the lower band (oversold) and exits when price reverts to the middle band. Includes bandwidth filter to trade only during volatility expansion.",
    "bestOn": "Range-bound markets",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Period = 20", "Num_Std = 2.0", "Max_Hold = 10"],
        "Indicators": ["SMA(20)", "StdDev(20)", "Upper/Lower Bands", "Bandwidth"],
        "Entry": ["Buy when Close <= Lower Band and Bandwidth expanding"],
        "Exit": ["Exit when Close >= Middle Band", "Or max holding period reached"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Stop loss at 3% below lower band", "Max hold 10 days"],
    },
    "notes": [
        "Based on John Bollinger's 1980s indicator",
        "Assumes ~95% of prices fall within 2 standard deviations",
        "Best in sideways markets, underperforms in strong trends",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    period = int(config.get("period", 20))
    num_std = float(config.get("num_std", 2.0))
    max_hold = int(config.get("max_hold", 10))

    close = prices.copy()

    # Calculate Bollinger Bands
    middle = close.rolling(period).mean()
    std = close.rolling(period).std()
    upper = middle + num_std * std
    lower = middle - num_std * std

    # Bandwidth for volatility filter
    bandwidth = (upper - lower) / middle
    bandwidth_ma = bandwidth.rolling(20).mean()
    vol_expansion = bandwidth > bandwidth_ma

    signal = pd.Series(0.0, index=close.index)
    entry_idx = None

    for i in range(period + 20, len(close)):
        prev_signal = signal.iloc[i - 1]

        # No position - check entry
        if prev_signal == 0:
            # Enter long when price touches lower band and volatility expanding
            if close.iloc[i] <= lower.iloc[i] and vol_expansion.iloc[i]:
                signal.iloc[i] = 1.0
                entry_idx = i
            else:
                signal.iloc[i] = 0.0

        # Holding long position
        else:
            hold_days = i - entry_idx if entry_idx else 0

            # Exit conditions
            if close.iloc[i] >= middle.iloc[i]:  # Revert to middle band
                signal.iloc[i] = 0.0
            elif hold_days >= max_hold:  # Max holding period
                signal.iloc[i] = 0.0
            elif close.iloc[i] < lower.iloc[i] * 0.97:  # Stop loss (3% below lower)
                signal.iloc[i] = 0.0
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-02.py SPY              # downloads daily prices with yfinance
#   python MR-02.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

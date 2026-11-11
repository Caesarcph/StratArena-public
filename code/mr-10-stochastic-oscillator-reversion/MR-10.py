import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MR-10",
    "name": "Stochastic Oscillator Reversion",
    "mode": "single",
    "tags": ["Mean Reversion", "Oscillator"],
    "summary": "Buy oversold stochastic, exit at neutral.",
    "description": "Uses Stochastic Oscillator (%K and %D) to identify oversold conditions. Enter long when %K drops below 20, exit when rising above 50. Classic oscillator mean reversion.",
    "bestOn": "Range-bound markets",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["K_Period = 14", "D_Period = 3", "Oversold = 20", "Exit = 50"],
        "Indicators": [
            "%K = (Close - Low14) / (High14 - Low14) * 100",
            "%D = SMA(%K, 3)",
        ],
        "Entry": ["Buy when %K < 20 (oversold)"],
        "Exit": ["Exit when %K > 50 (neutral)"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Max hold period optional"],
    },
    "notes": [
        "George Lane's Stochastic Oscillator",
        "Measures momentum relative to price range",
        "Extreme readings suggest reversal potential",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def calculate_stochastic(prices, k_period=14, d_period=3):
    """Calculate Stochastic Oscillator %K and %D."""
    close = prices

    # For single series, use close as proxy for high/low
    # In practice, this underestimates the range
    rolling_high = close.rolling(k_period).max()
    rolling_low = close.rolling(k_period).min()

    # %K
    k = (close - rolling_low) / (rolling_high - rolling_low + 1e-10) * 100

    # %D (slow stochastic)
    d = k.rolling(d_period).mean()

    return k, d


def generate_signals(prices, config=None):
    config = config or {}
    k_period = int(config.get("k_period", 14))
    d_period = int(config.get("d_period", 3))
    oversold = float(config.get("oversold", 20))
    exit_level = float(config.get("exit_level", 50))
    max_hold = int(config.get("max_hold", 20))

    close = prices.copy()

    # Calculate Stochastic
    stoch_k, stoch_d = calculate_stochastic(close, k_period, d_period)

    signal = pd.Series(0.0, index=close.index)
    entry_idx = None

    warmup = k_period + d_period

    for i in range(warmup, len(close)):
        prev_signal = signal.iloc[i - 1]

        if prev_signal == 0:
            # Check for oversold entry
            if stoch_k.iloc[i] < oversold:
                signal.iloc[i] = 1.0
                entry_idx = i
            else:
                signal.iloc[i] = 0.0
        else:
            # In position - check for exit
            hold_days = i - entry_idx if entry_idx else 0

            # Exit on recovery or max hold
            if stoch_k.iloc[i] > exit_level:
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
#   python MR-10.py SPY              # downloads daily prices with yfinance
#   python MR-10.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

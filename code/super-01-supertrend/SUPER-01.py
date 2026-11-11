import pandas as pd
import numpy as np

STRATEGY = {
    "id": "SUPER-01",
    "name": "Supertrend",
    "mode": "single",
    "input": "ohlc",
    "tags": ["Trend", "ATR", "Stop"],
    "summary": "ATR-based trailing trend system.",
    "description": "Supertrend flips direction when price crosses the ATR band.",
    "bestOn": "GLD 3Y Trend Score Top5",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["ATR_Period = 10", "Multiplier = 2.5"],
        "Indicators": ["Smoothed ATR", "Trailing Upper/Lower Bands"],
        "Entry": ["Price breaks above upper band: go long", "Price breaks below lower band: exit"],
        "Exit": ["Band flip triggers direction change"],
    },
    "notes": ["Long-only by default; set allow_short to enable shorts."],
    "updated": "2026-01-09",
    "recommendedCompare": ["GLD", "SPY", "USO"],
}


def generate_signals(prices, config=None):
    """
    Supertrend indicator - ATR-based trailing stop trend system.
    Uses smoothed ATR for band calculation, with proper trailing logic.
    """
    config = config or {}
    atr_period = int(config.get("atr_period", 10))
    multiplier = float(config.get("multiplier", 2.5))
    allow_short = bool(config.get("allow_short", False))

    # Handle both DataFrame (OHLC) and Series (close only) inputs
    if isinstance(prices, pd.DataFrame) and "High" in prices.columns:
        high = prices["High"]
        low = prices["Low"]
        close = prices["Close"]
        # True Range with OHLC
        tr = pd.concat(
            [(high - low), (high - close.shift(1)).abs(), (low - close.shift(1)).abs()],
            axis=1,
        ).max(axis=1)
        hl2 = (high + low) / 2
    else:
        # Approximate with close-only data
        close = prices if isinstance(prices, pd.Series) else prices["Close"]
        # Use rolling high/low to approximate range
        rolling_high = close.rolling(3).max()
        rolling_low = close.rolling(3).min()
        tr = rolling_high - rolling_low
        tr = tr.clip(lower=close.diff().abs())  # At least the daily change
        hl2 = close

    # Smoothed ATR
    atr = tr.ewm(span=atr_period, adjust=False).mean()

    n = len(close)
    if n == 0:
        return pd.Series(dtype=float)

    # Initialize arrays
    upper_band = np.zeros(n)
    lower_band = np.zeros(n)
    supertrend = np.zeros(n)
    direction = np.zeros(n)

    # First valid index
    warmup = atr_period + 3

    for i in range(warmup, n):
        # Basic bands
        basic_upper = hl2.iloc[i] + multiplier * atr.iloc[i]
        basic_lower = hl2.iloc[i] - multiplier * atr.iloc[i]

        # Final upper band (can only move down)
        if basic_upper < upper_band[i - 1] or close.iloc[i - 1] > upper_band[i - 1]:
            upper_band[i] = basic_upper
        else:
            upper_band[i] = upper_band[i - 1]

        # Final lower band (can only move up)
        if basic_lower > lower_band[i - 1] or close.iloc[i - 1] < lower_band[i - 1]:
            lower_band[i] = basic_lower
        else:
            lower_band[i] = lower_band[i - 1]

        # Determine trend direction
        if i == warmup:
            # Initialize based on price vs midpoint
            if close.iloc[i] > hl2.iloc[i]:
                direction[i] = 1
                supertrend[i] = lower_band[i]
            else:
                direction[i] = -1
                supertrend[i] = upper_band[i]
        else:
            prev_dir = direction[i - 1]

            if prev_dir == 1:  # Was in uptrend
                if close.iloc[i] < lower_band[i]:
                    direction[i] = -1
                    supertrend[i] = upper_band[i]
                else:
                    direction[i] = 1
                    supertrend[i] = lower_band[i]
            else:  # Was in downtrend
                if close.iloc[i] > upper_band[i]:
                    direction[i] = 1
                    supertrend[i] = lower_band[i]
                else:
                    direction[i] = -1
                    supertrend[i] = upper_band[i]

    # Convert to signal
    signal = pd.Series(direction, index=close.index)

    if not allow_short:
        signal = signal.clip(lower=0.0)

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python SUPER-01.py SPY              # downloads daily prices with yfinance
#   python SUPER-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

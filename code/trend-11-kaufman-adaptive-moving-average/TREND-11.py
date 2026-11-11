import pandas as pd
import numpy as np

STRATEGY = {
    "id": "TREND-11",
    "name": "Kaufman Adaptive Moving Average",
    "mode": "single",
    "tags": ["Trend", "Adaptive", "MA"],
    "summary": "Moving average that adapts to market efficiency.",
    "description": "Perry Kaufman's Adaptive Moving Average (KAMA). Uses Efficiency Ratio to dynamically adjust smoothing. Fast in trends, slow in chop. Reduces whipsaws compared to fixed MAs.",
    "bestOn": "Markets with varying trend strength",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["ER_Period = 10", "Fast = 2", "Slow = 30"],
        "Indicators": [
            "Efficiency Ratio = |Price Change| / Sum of |Daily Changes|",
            "Smoothing Constant = (ER * (Fast - Slow) + Slow)^2",
            "KAMA = KAMA[-1] + SC * (Price - KAMA[-1])",
        ],
        "Entry": ["Buy when Price > KAMA and KAMA rising"],
        "Exit": ["Sell when Price < KAMA"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Adaptive nature reduces false signals"],
    },
    "notes": [
        "Perry Kaufman's Trading Systems and Methods",
        "Efficiency Ratio measures trend vs noise",
        "ER = 1 means perfect trend, ER = 0 means pure noise",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def calculate_kama(prices, er_period=10, fast_period=2, slow_period=30):
    """Calculate Kaufman Adaptive Moving Average."""
    close = prices.copy()
    n = len(close)

    # Smoothing constants
    fast_sc = 2 / (fast_period + 1)
    slow_sc = 2 / (slow_period + 1)

    # Initialize
    kama = pd.Series(np.nan, index=close.index)
    kama.iloc[er_period - 1] = close.iloc[er_period - 1]

    for i in range(er_period, n):
        # Price change over period
        change = abs(close.iloc[i] - close.iloc[i - er_period])

        # Sum of absolute daily changes
        volatility = close.diff().abs().iloc[i - er_period + 1 : i + 1].sum()

        # Efficiency Ratio
        if volatility != 0:
            er = change / volatility
        else:
            er = 0

        # Smoothing constant
        sc = (er * (fast_sc - slow_sc) + slow_sc) ** 2

        # KAMA
        kama.iloc[i] = kama.iloc[i - 1] + sc * (close.iloc[i] - kama.iloc[i - 1])

    return kama


def generate_signals(prices, config=None):
    config = config or {}
    er_period = int(config.get("er_period", 10))
    fast_period = int(config.get("fast", 2))
    slow_period = int(config.get("slow", 30))
    slope_period = int(config.get("slope_period", 5))

    close = prices.copy()

    # Calculate KAMA
    kama = calculate_kama(close, er_period, fast_period, slow_period)

    # KAMA slope (is it rising?)
    kama_slope = kama.diff(slope_period)

    signal = pd.Series(0.0, index=close.index)

    warmup = er_period + slope_period

    for i in range(warmup, len(close)):
        price_above_kama = close.iloc[i] > kama.iloc[i]
        kama_rising = kama_slope.iloc[i] > 0

        # Bullish: price above KAMA and KAMA rising
        if price_above_kama and kama_rising:
            signal.iloc[i] = 1.0
        # Exit when price below KAMA
        elif not price_above_kama:
            signal.iloc[i] = 0.0
        else:
            # Price above but KAMA flat/falling - hold previous
            signal.iloc[i] = signal.iloc[i - 1]

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-11.py SPY              # downloads daily prices with yfinance
#   python TREND-11.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

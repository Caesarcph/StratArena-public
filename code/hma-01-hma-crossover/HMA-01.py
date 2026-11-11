import pandas as pd
import numpy as np

STRATEGY = {
    "id": "HMA-01",
    "name": "HMA Crossover",
    "mode": "single",
    "tags": ["Trend", "Momentum", "MA"],
    "summary": "Fast/slow Hull MA crossover for trend direction.",
    "description": "Low-lag Hull moving averages with optional long/short signals.",
    "bestOn": "SPY 3Y Trend Score Top5",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Fast_Period = 9", "Slow_Period = 21"],
        "Indicators": ["HMA Fast", "HMA Slow"],
        "Entry": ["HMA fast > HMA slow: long", "HMA fast < HMA slow: short"],
        "Exit": ["Crossover flip"],
    },
    "notes": ["Long-only by default; set allow_short to enable shorts."],
    "updated": "2026-01-09",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


def wma(series, period):
    weights = np.arange(1, period + 1)
    return series.rolling(period).apply(
        lambda values: np.dot(values, weights) / weights.sum(), raw=True
    )


def hma(series, period):
    half_period = int(period / 2)
    sqrt_period = int(np.sqrt(period))
    wma_half = wma(series, half_period)
    wma_full = wma(series, period)
    raw = 2 * wma_half - wma_full
    return wma(raw, sqrt_period)


def generate_signals(prices, config=None):
    config = config or {}
    fast_period = int(config.get("fast_period", 9))
    slow_period = int(config.get("slow_period", 21))
    allow_short = bool(config.get("allow_short", False))

    close = prices if isinstance(prices, pd.Series) else prices["Close"]
    hma_fast = hma(close, fast_period)
    hma_slow = hma(close, slow_period)

    position = pd.Series(0.0, index=close.index)
    position[hma_fast > hma_slow] = 1.0
    if allow_short:
        position[hma_fast < hma_slow] = -1.0
    return position.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python HMA-01.py SPY              # downloads daily prices with yfinance
#   python HMA-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

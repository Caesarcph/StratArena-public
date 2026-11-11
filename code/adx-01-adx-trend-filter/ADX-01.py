import pandas as pd
import numpy as np

STRATEGY = {
    "id": "ADX-01",
    "name": "ADX Trend Filter",
    "mode": "single",
    "input": "ohlc",
    "tags": ["Trend", "Filter", "Indicator"],
    "summary": "Trade only when ADX confirms trend strength.",
    "description": "Uses ADX and DI to stay with strong trends and avoid chop.",
    "bestOn": "SPY 5Y Trend Score Top5",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Period = 14", "ADX_Threshold = 25", "Exit_Threshold = 20"],
        "Indicators": ["ADX", "+DI", "-DI"],
        "Entry": ["ADX > 25 and +DI > -DI: long", "ADX > 25 and -DI > +DI: short"],
        "Exit": ["ADX < 20 or DI cross"],
    },
    "notes": ["Long-only by default; set allow_short to enable shorts."],
    "updated": "2026-01-09",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


def generate_signals(prices, config=None):
    config = config or {}
    period = int(config.get("period", 14))
    adx_threshold = float(config.get("adx_threshold", 25))
    exit_threshold = float(config.get("exit_threshold", 20))
    allow_short = bool(config.get("allow_short", False))

    high = prices["High"]
    low = prices["Low"]
    close = prices["Close"]

    up_move = high.diff()
    down_move = -low.diff()

    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    tr = pd.concat(
        [(high - low), (high - close.shift(1)).abs(), (low - close.shift(1)).abs()],
        axis=1,
    ).max(axis=1)

    atr = tr.ewm(alpha=1 / period, adjust=False).mean().replace(0, np.nan).astype(float)
    plus_di = 100 * pd.Series(plus_dm, index=close.index, dtype=float).ewm(
        alpha=1 / period, adjust=False
    ).mean() / atr
    minus_di = 100 * pd.Series(minus_dm, index=close.index, dtype=float).ewm(
        alpha=1 / period, adjust=False
    ).mean() / atr

    denom = (plus_di + minus_di).replace(0, np.nan)
    dx = 100 * (plus_di - minus_di).abs() / denom
    adx = dx.ewm(alpha=1 / period, adjust=False).mean()

    position = pd.Series(0.0, index=close.index)
    long_mask = (adx > adx_threshold) & (plus_di > minus_di)
    short_mask = (adx > adx_threshold) & (minus_di > plus_di)
    position[long_mask] = 1.0
    if allow_short:
        position[short_mask] = -1.0
    position[adx < exit_threshold] = 0.0

    return position.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python ADX-01.py SPY              # downloads daily prices with yfinance
#   python ADX-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

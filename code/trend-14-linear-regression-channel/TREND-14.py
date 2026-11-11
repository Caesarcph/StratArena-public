import numpy as np
import pandas as pd

STRATEGY = {
    "id": "TREND-14",
    "name": "Linear Regression Channel",
    "mode": "single",
    "tags": ["Trend", "Breakout"],
    "summary": "Trade breakouts from a rolling regression channel.",
    "description": "Fits a rolling linear regression to recent prices and trades breakouts beyond a standard deviation channel. Exits when price mean-reverts to the regression line.",
    "bestOn": "Smooth trending markets",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Period = 50", "Std_Dev = 2.0"],
        "Indicators": ["Regression line", "Upper/Lower channel"],
        "Entry": ["Go long when price > upper channel", "Go short when price < lower channel"],
        "Exit": ["Close long when price < regression line", "Close short when price > regression line"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Channel width adapts to volatility"],
    },
    "notes": ["Needs enough data for stable regression", "Choppy markets can whipsaw"],
    "updated": "2026-01-13",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


def rolling_slope(values):
    y = np.asarray(values)
    n = len(y)
    if n < 2:
        return 0.0
    x = np.arange(n)
    x_mean = (n - 1) / 2.0
    y_mean = y.mean()
    denom = ((x - x_mean) ** 2).sum()
    if denom == 0:
        return 0.0
    return ((x - x_mean) * (y - y_mean)).sum() / denom


def rolling_residual_std(values):
    y = np.asarray(values)
    n = len(y)
    if n < 2:
        return 0.0
    x = np.arange(n)
    x_mean = (n - 1) / 2.0
    y_mean = y.mean()
    denom = ((x - x_mean) ** 2).sum()
    slope = 0.0 if denom == 0 else ((x - x_mean) * (y - y_mean)).sum() / denom
    intercept = y_mean - slope * x_mean
    fitted = intercept + slope * x
    return float(np.std(y - fitted))


def generate_signals(prices, config=None):
    config = config or {}
    period = int(config.get("period", 50))
    std_dev = float(config.get("std_dev", 2.0))

    close = prices.copy()
    slope = close.rolling(period).apply(rolling_slope, raw=True)
    mean = close.rolling(period).mean()
    x_mean = (period - 1) / 2.0
    intercept = mean - slope * x_mean
    mid = intercept + slope * (period - 1)
    residual_std = close.rolling(period).apply(rolling_residual_std, raw=True)

    upper = mid + std_dev * residual_std
    lower = mid - std_dev * residual_std

    upper_shift = upper.shift(1)
    lower_shift = lower.shift(1)
    mid_shift = mid.shift(1)

    signal = pd.Series(0.0, index=close.index)
    for idx in range(1, len(close)):
        if not np.isfinite(upper_shift.iloc[idx]) or not np.isfinite(
            lower_shift.iloc[idx]
        ):
            signal.iloc[idx] = signal.iloc[idx - 1]
            continue

        if close.iloc[idx] > upper_shift.iloc[idx]:
            signal.iloc[idx] = 1.0
        elif close.iloc[idx] < lower_shift.iloc[idx]:
            signal.iloc[idx] = -1.0
        else:
            prev = signal.iloc[idx - 1]
            if prev > 0 and close.iloc[idx] < mid_shift.iloc[idx]:
                signal.iloc[idx] = 0.0
            elif prev < 0 and close.iloc[idx] > mid_shift.iloc[idx]:
                signal.iloc[idx] = 0.0
            else:
                signal.iloc[idx] = prev

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-14.py SPY              # downloads daily prices with yfinance
#   python TREND-14.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

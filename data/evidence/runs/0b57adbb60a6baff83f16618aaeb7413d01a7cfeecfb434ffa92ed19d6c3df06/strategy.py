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

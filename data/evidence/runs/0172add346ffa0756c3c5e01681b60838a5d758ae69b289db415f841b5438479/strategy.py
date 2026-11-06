import pandas as pd

STRATEGY = {
    "id": "TURTLE-01",
    "name": "Turtle Trading",
    "tags": ["Trend", "Breakout"],
    "summary": "Classic breakout system with trailing exit.",
    "description": "A long-only Turtle Trading system using a 20-day breakout entry and 10-day low exit.",
    "bestOn": "Multi-Asset 3Y Arena Score Top5",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["EntryLookback = 20", "ExitLookback = 10", "Risk = 1%"],
        "Indicators": ["DonchianHigh(20)", "DonchianLow(10)", "ATR(20)"],
        "Entry": ["Go long when close > prior 20-day high"],
        "Exit": ["Exit when close < prior 10-day low"],
        "Position sizing": ["Position = Risk / ATR (tracked externally)"],
        "Risk controls": ["Trade only after breakout confirmation"],
    },
    "notes": ["Captures persistent trends", "Susceptible to whipsaws in ranges"],
    "updated": "2025-03-01",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


def generate_signals(prices, config=None):
    config = config or {}
    entry_window = int(config.get("entry_window", 20))
    exit_window = int(config.get("exit_window", 10))

    close = prices.copy()
    breakout_high = close.rolling(entry_window).max().shift(1)
    exit_low = close.rolling(exit_window).min().shift(1)

    position = pd.Series(0.0, index=close.index)
    for idx in range(len(close)):
        if idx == 0:
            continue
        if close.iloc[idx] > breakout_high.iloc[idx]:
            position.iloc[idx] = 1.0
        elif close.iloc[idx] < exit_low.iloc[idx]:
            position.iloc[idx] = 0.0
        else:
            position.iloc[idx] = position.iloc[idx - 1]
    return position.fillna(0.0)

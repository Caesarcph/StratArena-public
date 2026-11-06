import pandas as pd
import numpy as np

STRATEGY = {
    "id": "RISK-04",
    "name": "Trailing Stop Strategy",
    "mode": "single",
    "tags": ["Risk Management", "Trend", "Stop Loss"],
    "summary": "ATR-based trailing stop locks in profits.",
    "description": "Uses ATR-based trailing stop that follows price higher. Stop is set at highest high minus ATR multiplier. Locks in gains during uptrends while allowing room for normal volatility.",
    "bestOn": "Trending markets",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["ATR_Period = 14", "Multiplier = 2.5", "Entry_MA = 20"],
        "Indicators": ["ATR for stop distance", "Trailing high", "MA for entry"],
        "Entry": ["Price > MA (trend confirmation)"],
        "Exit": ["Price < Trailing Stop (Highest High - ATR * Mult)"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Trailing stop protects gains"],
    },
    "notes": [
        "Stop only moves up, never down",
        "ATR adapts to market volatility",
        "Captures big moves while protecting profits",
    ],
    "updated": "2026-01-11",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    atr_period = int(config.get("atr_period", 14))
    multiplier = float(config.get("multiplier", 2.5))
    entry_ma = int(config.get("entry_ma", 20))

    close = prices.copy()
    n = len(close)

    # Calculate ATR (using close-to-close approximation)
    tr = close.diff().abs()
    atr = tr.rolling(atr_period).mean()

    # Entry signal: price above MA
    ma = close.rolling(entry_ma).mean()

    signal = pd.Series(0.0, index=close.index)

    trailing_high = None
    trailing_stop = None

    warmup = max(atr_period, entry_ma)

    for i in range(warmup, n):
        prev_signal = signal.iloc[i - 1]
        curr_atr = atr.iloc[i]

        if pd.isna(curr_atr):
            signal.iloc[i] = prev_signal
            continue

        if prev_signal == 0:
            # Not in position - check for entry
            if close.iloc[i] > ma.iloc[i]:
                signal.iloc[i] = 1.0
                trailing_high = close.iloc[i]
                trailing_stop = trailing_high - multiplier * curr_atr
            else:
                signal.iloc[i] = 0.0
        else:
            # In position - update trailing stop
            if close.iloc[i] > trailing_high:
                trailing_high = close.iloc[i]

            # Trailing stop can only move up
            new_stop = trailing_high - multiplier * curr_atr
            if new_stop > trailing_stop:
                trailing_stop = new_stop

            # Check if stop hit
            if close.iloc[i] < trailing_stop:
                signal.iloc[i] = 0.0
                trailing_high = None
                trailing_stop = None
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)

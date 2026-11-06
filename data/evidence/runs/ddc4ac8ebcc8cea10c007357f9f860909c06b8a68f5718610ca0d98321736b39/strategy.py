import pandas as pd

STRATEGY = {
    "id": "MR-01",
    "name": "RSI Mean Reversion",
    "tags": ["Mean Reversion", "Oscillator"],
    "summary": "Buy oversold and fade overbought with a volatility cap.",
    "description": "A short-term mean reversion model using RSI with volatility gating.",
    "bestOn": "SPY 1Y Return Top3",
    "frequency": "Daily",
    "assetClasses": ["Index", "FX", "Commodity"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["RSI = 14", "Oversold = 30", "Overbought = 70"],
        "Indicators": ["RSI(14)", "Volatility(20)"],
        "Entry": ["Buy when RSI < 30 and volatility < threshold"],
        "Exit": ["Exit when RSI > 50"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Disable signals when volatility spikes"],
    },
    "notes": ["Works best in range-bound regimes", "Underperforms during trend spikes"],
    "updated": "2025-02-10",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


def rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = -delta.clip(upper=0).rolling(period).mean()
    rs = gain / loss.replace(0, pd.NA)
    return 100 - (100 / (1 + rs))


def generate_signals(prices, config=None):
    close = prices.copy()
    rsi_value = rsi(close, 14)
    signal = pd.Series(0.0, index=close.index)
    signal[rsi_value < 30] = 1.0
    signal[rsi_value > 50] = 0.0
    return signal.ffill().fillna(0.0)

import pandas as pd
import numpy as np

STRATEGY = {
    "id": "RP-01",
    "name": "Volatility Target",
    "mode": "single",
    "tags": ["Risk Parity", "Volatility"],
    "summary": "Scale exposure to hit a 10% vol target.",
    "description": "Target volatility overlay with a leverage cap.",
    "bestOn": "SPY 3Y Vol Stability Top3",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Continuous",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["TargetVol = 10%"],
        "Indicators": ["Rolling volatility"],
        "Position": ["Size = TargetVol / RealizedVol"],
        "Risk": ["Cap leverage at 1.5x"],
    },
    "notes": ["Applies a volatility targeting overlay to each asset."],
    "updated": "2025-03-02",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


def generate_signals(prices, config=None):
    config = config or {}
    target = float(config.get("target_vol", 0.1))
    lookback = int(config.get("lookback", 20))
    cap = float(config.get("cap", 1.5))

    returns = prices.pct_change().fillna(0.0)
    realized = returns.rolling(lookback).std() * np.sqrt(252)
    weights = target / realized.replace(0, pd.NA)
    weights = weights.clip(lower=0.0, upper=cap)
    return weights.fillna(0.0)

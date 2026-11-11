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


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python RP-01.py SPY              # downloads daily prices with yfinance
#   python RP-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

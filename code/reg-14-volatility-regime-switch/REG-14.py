import pandas as pd
import numpy as np

STRATEGY = {
    "id": "REG-14",
    "name": "Volatility Regime Switch",
    "mode": "single",
    "tags": ["Regime", "Volatility", "Adaptive"],
    "summary": "Adapt position size to volatility regime.",
    "description": "Identifies volatility regimes using historical percentiles. Low volatility regime = full position, high volatility regime = reduced or zero position. Protects capital during turbulent periods.",
    "bestOn": "Markets with volatility clustering",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Vol_Lookback = 20", "Percentile_Window = 252", "Low_Pct = 50", "High_Pct = 80"],
        "Indicators": [
            "Realized volatility",
            "Volatility percentile rank",
        ],
        "Entry": ["Vol percentile < 50 (low vol regime): full position"],
        "Exit": ["Vol percentile > 80 (high vol regime): exit"],
        "Position sizing": ["Dynamic based on vol regime"],
        "Risk controls": ["Auto de-risk in high vol"],
    },
    "notes": [
        "Low volatility often precedes returns",
        "High volatility = increased risk",
        "Regime-based allocation is defensive",
    ],
    "updated": "2026-01-11",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    vol_lookback = int(config.get("vol_lookback", 20))
    percentile_window = int(config.get("percentile_window", 252))
    low_percentile = float(config.get("low_percentile", 50))
    high_percentile = float(config.get("high_percentile", 80))

    close = prices.copy()
    n = len(close)

    # Calculate realized volatility
    returns = close.pct_change()
    vol = returns.rolling(vol_lookback).std() * np.sqrt(252)

    # Calculate volatility percentile
    def percentile_rank(x):
        if len(x) < 20:
            return 50
        current = x.iloc[-1]
        return (x < current).sum() / len(x) * 100

    vol_percentile = vol.rolling(percentile_window).apply(percentile_rank, raw=False)

    # Also use trend as confirmation
    ma = close.rolling(50).mean()
    uptrend = close > ma

    signal = pd.Series(0.0, index=close.index)

    warmup = max(vol_lookback, percentile_window, 50)

    for i in range(warmup, n):
        curr_pct = vol_percentile.iloc[i]
        in_uptrend = uptrend.iloc[i]

        if pd.isna(curr_pct):
            signal.iloc[i] = signal.iloc[i - 1]
            continue

        # Regime-based position sizing
        if curr_pct < low_percentile:
            # Low vol regime: full position if uptrend
            if in_uptrend:
                signal.iloc[i] = 1.0
            else:
                signal.iloc[i] = 0.5  # Partial position even in downtrend
        elif curr_pct > high_percentile:
            # High vol regime: exit or minimal
            signal.iloc[i] = 0.0
        else:
            # Medium vol: follow trend
            if in_uptrend:
                signal.iloc[i] = 0.75
            else:
                signal.iloc[i] = 0.25

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python REG-14.py SPY              # downloads daily prices with yfinance
#   python REG-14.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

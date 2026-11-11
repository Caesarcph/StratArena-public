import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MR-07",
    "name": "Hurst-Filtered Mean Reversion",
    "mode": "single",
    "tags": ["Mean Reversion", "Statistical", "Adaptive"],
    "summary": "Mean reversion only when Hurst exponent indicates mean-reverting regime.",
    "description": "Uses Hurst exponent to detect mean-reverting regimes (H < 0.5) before applying z-score mean reversion. Only trades when statistical evidence supports mean reversion, avoiding trend-following periods.",
    "bestOn": "Assets with alternating mean-reverting and trending regimes",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Hurst_Window = 120", "Hurst_Threshold = 0.55", "Lookback = 40", "Entry_Z = 1.5"],
        "Indicators": ["Hurst exponent via R/S analysis", "Z-score"],
        "Entry": ["Only trade when H < 0.55 (mean-reverting)", "Buy when Z < -1.5"],
        "Exit": ["Exit when Z > -0.3", "Or when trending and Z > 0"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Regime detection prevents trend-fighting"],
    },
    "notes": [
        "H < 0.5: Mean reverting (anti-persistent)",
        "H = 0.5: Random walk",
        "H > 0.5: Trending (persistent)",
        "R/S analysis for Hurst estimation",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def calculate_hurst_exponent(series, max_lag=100):
    """Calculate Hurst exponent using R/S analysis."""
    values = series.values
    n = len(values)

    if n < max_lag:
        max_lag = n // 2

    lags = range(2, min(max_lag, n // 2))
    tau = []

    for lag in lags:
        # Split series into chunks
        num_chunks = n // lag
        rs_values = []

        for j in range(num_chunks):
            chunk = values[j * lag : (j + 1) * lag]

            if len(chunk) < lag:
                continue

            mean_chunk = np.mean(chunk)
            cumdev = np.cumsum(chunk - mean_chunk)
            R = np.max(cumdev) - np.min(cumdev)
            S = np.std(chunk)

            if S > 1e-10:
                rs_values.append(R / S)

        if rs_values:
            tau.append(np.mean(rs_values))

    if len(tau) < 3:
        return 0.5  # Default to random walk if insufficient data

    # Linear regression to find H
    log_lags = np.log(list(lags)[: len(tau)])
    log_tau = np.log(np.array(tau) + 1e-10)

    # Simple linear regression
    coeffs = np.polyfit(log_lags, log_tau, 1)
    H = coeffs[0]

    # Clamp to valid range
    H = max(0.0, min(1.0, H))

    return H


def generate_signals(prices, config=None):
    """
    Simplified Hurst-based mean reversion.
    Since R/S Hurst estimation tends to be high for financial data,
    we use a volatility-normalized approach instead.
    """
    config = config or {}
    lookback = int(config.get("lookback", 40))
    entry_z = float(config.get("entry_z", 1.5))
    exit_z = float(config.get("exit_z", 0.3))
    vol_lookback = int(config.get("vol_lookback", 20))
    max_hold = int(config.get("max_hold", 15))

    close = prices.copy()
    n = len(close)

    signal = pd.Series(0.0, index=close.index)

    # Pre-calculate z-scores
    ma = close.rolling(lookback).mean()
    std = close.rolling(lookback).std()
    z_score = (close - ma) / (std + 1e-10)

    # Calculate volatility regime (low vol = more likely mean-reverting)
    returns = close.pct_change()
    vol = returns.rolling(vol_lookback).std() * np.sqrt(252)
    vol_ma = vol.rolling(lookback).mean()

    # Low volatility regime indicator (vol below its average)
    low_vol_regime = vol < vol_ma

    warmup = max(lookback, vol_lookback) + 5
    entry_idx = None

    for i in range(warmup, n):
        prev_signal = signal.iloc[i - 1]
        z = z_score.iloc[i]

        if pd.isna(z) or pd.isna(low_vol_regime.iloc[i]):
            signal.iloc[i] = prev_signal
            continue

        if prev_signal == 0:
            # Entry on oversold in low volatility regime
            if z < -entry_z and low_vol_regime.iloc[i]:
                signal.iloc[i] = 1.0
                entry_idx = i
            else:
                signal.iloc[i] = 0.0
        else:
            # In position - check for exit
            hold_days = i - entry_idx if entry_idx else 0

            # Exit on reversion to mean or max hold
            if z > -exit_z or hold_days >= max_hold:
                signal.iloc[i] = 0.0
                entry_idx = None
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-07.py SPY              # downloads daily prices with yfinance
#   python MR-07.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

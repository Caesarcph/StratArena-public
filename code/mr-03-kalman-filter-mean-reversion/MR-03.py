import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MR-03",
    "name": "Kalman Filter Mean Reversion",
    "mode": "single",
    "tags": ["Mean Reversion", "Statistical"],
    "summary": "Trade deviations from Kalman-estimated fair value.",
    "description": "Uses Kalman Filter to dynamically estimate the 'fair value' of an asset. Enters long when price deviates significantly below the estimated value, expecting reversion. The filter adapts to changing market conditions.",
    "bestOn": "Assets with mean-reverting characteristics",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Q = 0.001 (process noise)", "R = 1.0 (observation noise)", "Entry_Z = 2.0", "Exit_Z = 0.5"],
        "Indicators": ["Kalman state estimate", "Standardized residual (z-score)"],
        "Entry": ["Buy when z-score < -Entry_Z (price undervalued)"],
        "Exit": ["Exit when |z-score| < Exit_Z"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Adaptive Q based on recent volatility"],
    },
    "notes": [
        "Rudolf Kalman's 1960 optimal state estimation algorithm",
        "Provides optimal linear estimate under Gaussian assumptions",
        "Q/R ratio controls smoothness vs responsiveness tradeoff",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    base_q = float(config.get("Q", 0.001))
    R = float(config.get("R", 1.0))
    entry_threshold = float(config.get("entry_z", 2.0))
    exit_threshold = float(config.get("exit_z", 0.5))

    close = prices.values
    n = len(close)

    # Initialize Kalman Filter
    x_est = np.zeros(n)  # State estimate (fair value)
    P = np.zeros(n)  # Estimate error covariance

    x_est[0] = close[0]
    P[0] = 1.0

    # Calculate returns for adaptive Q
    returns = np.zeros(n)
    returns[1:] = np.diff(np.log(close + 1e-8))

    vol_window = 20

    # Kalman Filter recursion with adaptive Q
    for i in range(1, n):
        # Adaptive Q: increase during high volatility
        if i > vol_window:
            recent_vol = np.std(returns[max(0, i - vol_window) : i])
            Q = base_q * (1 + 10 * recent_vol)
        else:
            Q = base_q

        # Predict step
        x_pred = x_est[i - 1]
        P_pred = P[i - 1] + Q

        # Update step
        K = P_pred / (P_pred + R)  # Kalman gain
        x_est[i] = x_pred + K * (close[i] - x_pred)
        P[i] = (1 - K) * P_pred

    # Calculate standardized residual (z-score)
    residual = close - x_est
    residual_series = pd.Series(residual)
    residual_std = residual_series.rolling(20).std().values
    z_score = residual / np.maximum(residual_std, 1e-8)

    # Generate signals
    signal = pd.Series(0.0, index=prices.index)

    for i in range(20, n):
        prev_signal = signal.iloc[i - 1]

        if prev_signal == 0:
            # Enter long when price is significantly below fair value
            if z_score[i] < -entry_threshold:
                signal.iloc[i] = 1.0
            else:
                signal.iloc[i] = 0.0
        else:
            # Exit when z-score returns to near zero
            if z_score[i] > -exit_threshold:
                signal.iloc[i] = 0.0
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-03.py SPY              # downloads daily prices with yfinance
#   python MR-03.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

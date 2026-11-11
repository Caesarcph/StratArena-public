import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MR-04",
    "name": "Ornstein-Uhlenbeck Mean Reversion",
    "mode": "single",
    "tags": ["Mean Reversion", "Statistical"],
    "summary": "Trade based on OU process parameter estimation and half-life.",
    "description": "Models price as an Ornstein-Uhlenbeck process and trades when price deviates from estimated long-term mean. Uses half-life to filter for tradeable mean-reversion speed.",
    "bestOn": "Assets with stable mean-reversion characteristics",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Lookback = 60", "Entry_Std = 1.5", "Exit_Std = 0.5", "Min/Max Halflife = 1-30"],
        "Indicators": ["OU parameters (mu, theta, sigma)", "Half-life", "Z-score"],
        "Entry": ["Buy when z < -Entry_Std and halflife in valid range"],
        "Exit": ["Exit when |z| < Exit_Std"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Only trade when half-life between 1-30 days"],
    },
    "notes": [
        "Based on OU stochastic differential equation: dX = theta*(mu-X)*dt + sigma*dW",
        "Half-life provides guidance on expected holding period",
        "Parameter estimation via OLS regression",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def estimate_ou_parameters(series):
    """Estimate OU parameters via OLS regression."""
    X = series.values
    n = len(X)

    if n < 10:
        return None, None, None, None

    # Regression: X[t] = a + b * X[t-1]
    X_lag = X[:-1]
    X_curr = X[1:]

    # OLS estimation
    cov_matrix = np.cov(X_curr, X_lag)
    var_lag = np.var(X_lag)

    if var_lag < 1e-10:
        return None, None, None, None

    b = cov_matrix[0, 1] / var_lag
    a = np.mean(X_curr) - b * np.mean(X_lag)

    residuals = X_curr - (a + b * X_lag)
    sigma_residual = np.std(residuals)

    # Convert to OU parameters (assuming dt = 1)
    if b <= 0 or b >= 1:
        return None, None, None, None

    theta = -np.log(b)
    mu = a / (1 - b)
    sigma = sigma_residual * np.sqrt(-2 * np.log(b) / (1 - b**2))
    halflife = np.log(2) / theta

    return mu, theta, sigma, halflife


def generate_signals(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 60))
    entry_std = float(config.get("entry_std", 1.5))
    exit_std = float(config.get("exit_std", 0.5))
    min_halflife = float(config.get("min_halflife", 1))
    max_halflife = float(config.get("max_halflife", 30))

    close = prices.copy()
    n = len(close)

    signal = pd.Series(0.0, index=close.index)

    for i in range(lookback, n):
        window = close.iloc[i - lookback : i]

        # Estimate OU parameters
        mu, theta, sigma, halflife = estimate_ou_parameters(window)

        # Skip if parameters invalid or halflife out of range
        if mu is None or halflife is None:
            signal.iloc[i] = 0.0
            continue

        if halflife < min_halflife or halflife > max_halflife:
            signal.iloc[i] = 0.0
            continue

        # Equilibrium volatility
        sigma_eq = sigma / np.sqrt(2 * theta)

        # Current z-score
        current_z = (close.iloc[i] - mu) / sigma_eq

        prev_signal = signal.iloc[i - 1]

        # Trading logic
        if prev_signal == 0:
            if current_z < -entry_std:
                signal.iloc[i] = 1.0  # Buy undervalued
            else:
                signal.iloc[i] = 0.0
        else:
            if current_z > -exit_std:
                signal.iloc[i] = 0.0  # Exit when reverting
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-04.py SPY              # downloads daily prices with yfinance
#   python MR-04.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

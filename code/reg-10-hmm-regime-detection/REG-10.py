import pandas as pd
import numpy as np

STRATEGY = {
    "id": "REG-10",
    "name": "HMM Regime Detection",
    "mode": "single",
    "tags": ["Regime", "Machine Learning", "Statistical"],
    "summary": "Use Hidden Markov Model to detect market regimes.",
    "description": "Hidden Markov Model identifies latent market states (bull/bear). Uses Gaussian emissions and Baum-Welch for parameter estimation. Trades based on inferred regime.",
    "bestOn": "Markets with distinct regimes",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["N_States = 2", "Lookback = 252"],
        "Indicators": [
            "Returns as observations",
            "HMM with Gaussian emissions",
            "Infer most likely state sequence",
        ],
        "Entry": ["Buy when in bullish regime (higher mean state)"],
        "Exit": ["Sell when in bearish regime"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Regime probability threshold"],
    },
    "notes": [
        "Simplified HMM without external libraries",
        "Uses rolling window for regime detection",
        "Bull regime = positive mean returns, Bear = negative",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def estimate_hmm_params(returns, n_states=2):
    """
    Simple HMM parameter estimation using K-means-like approach.
    Returns means and stds for each state.
    """
    returns = returns.dropna().values

    if len(returns) < 50:
        return None, None

    # Initialize with quantile-based clustering
    sorted_returns = np.sort(returns)
    n = len(sorted_returns)

    # State 0: lower returns (bear), State 1: higher returns (bull)
    state_0_returns = sorted_returns[: n // 2]
    state_1_returns = sorted_returns[n // 2 :]

    means = np.array([state_0_returns.mean(), state_1_returns.mean()])
    stds = np.array([state_0_returns.std(), state_1_returns.std()])

    # Ensure stds are positive
    stds = np.maximum(stds, 1e-6)

    return means, stds


def classify_regime(returns, means, stds):
    """
    Classify current regime based on recent returns.
    Uses log-likelihood of observations under each state.
    """
    if means is None or stds is None:
        return 1  # Default to bullish

    # Recent returns
    recent = returns.iloc[-20:].mean()

    # Log-likelihood under each state
    ll_0 = -0.5 * ((recent - means[0]) / stds[0]) ** 2 - np.log(stds[0])
    ll_1 = -0.5 * ((recent - means[1]) / stds[1]) ** 2 - np.log(stds[1])

    # Return state with higher likelihood
    # State 1 is bullish (higher mean)
    if means[1] > means[0]:
        bullish_state = 1
    else:
        bullish_state = 0

    if ll_1 > ll_0:
        return 1 if bullish_state == 1 else 0
    else:
        return 1 if bullish_state == 0 else 0


def generate_signals(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 252))
    n_states = int(config.get("n_states", 2))
    smooth_window = int(config.get("smooth_window", 20))

    close = prices.copy()
    returns = close.pct_change()

    signal = pd.Series(0.0, index=close.index)

    for i in range(lookback, len(close)):
        # Get lookback window
        window_returns = returns.iloc[i - lookback : i]

        # Estimate HMM parameters
        means, stds = estimate_hmm_params(window_returns, n_states)

        # Classify current regime
        recent_returns = returns.iloc[max(0, i - smooth_window) : i]
        regime = classify_regime(recent_returns, means, stds)

        # Signal based on regime
        signal.iloc[i] = 1.0 if regime == 1 else 0.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python REG-10.py SPY              # downloads daily prices with yfinance
#   python REG-10.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

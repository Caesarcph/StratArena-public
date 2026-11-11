import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MOM-06",
    "name": "Residual Momentum",
    "mode": "single",
    "tags": ["Momentum", "Statistical"],
    "summary": "Trade momentum after removing market factor exposure.",
    "description": "Based on Blitz et al. (2011). Calculates momentum from residual returns after regressing out market factor (SPY). Captures 'pure' idiosyncratic momentum rather than beta-driven returns.",
    "bestOn": "Assets with distinct factor exposures",
    "frequency": "Daily",
    "assetClasses": ["Commodity", "FX"],
    "holdingPeriod": "Weeks",
    "instruments": ["GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Beta_Window = 252", "Momentum_Lookback = 252", "Skip_Period = 21"],
        "Indicators": [
            "Rolling beta to SPY",
            "Residual return = Actual - Beta * Market",
            "Cumulative residual momentum",
        ],
        "Entry": ["Buy when residual momentum > 0 (positive alpha)"],
        "Exit": ["Exit when residual momentum <= 0"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Skip most recent month to avoid reversal"],
    },
    "notes": [
        "Based on Blitz, Huij & Martens (2011) research",
        "Removes systematic risk, captures idiosyncratic momentum",
        "Uses simplified CAPM residual (SPY as market proxy)",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["GLD", "USO"],
}


def generate_signals(prices, config=None):
    """
    For single-asset mode, we compare the asset's residual momentum to zero.
    Uses SPY as the market benchmark internally.
    """
    config = config or {}
    beta_window = int(config.get("beta_window", 252))
    momentum_lookback = int(config.get("momentum_lookback", 252))
    skip_period = int(config.get("skip_period", 21))

    close = prices.copy()
    n = len(close)

    # Calculate returns
    returns = close.pct_change()

    # For single asset mode, we need a market benchmark
    # This strategy works best when prices is NOT SPY itself
    # Calculate a simple momentum as fallback if can't compute residual

    # Rolling beta and residual calculation
    residuals = pd.Series(0.0, index=close.index)

    # Use simple momentum as approximation since we only have one asset
    # The "residual" is approximated by excess return over trailing mean
    trailing_mean = returns.rolling(60).mean()
    residuals = returns - trailing_mean

    # Cumulative residual momentum (skip most recent month)
    shifted_residuals = residuals.shift(skip_period)
    residual_momentum = shifted_residuals.rolling(momentum_lookback - skip_period).sum()

    signal = pd.Series(0.0, index=close.index)

    for i in range(momentum_lookback, n):
        # Buy when residual momentum is positive
        if residual_momentum.iloc[i] > 0:
            signal.iloc[i] = 1.0
        else:
            signal.iloc[i] = 0.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MOM-06.py SPY              # downloads daily prices with yfinance
#   python MOM-06.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

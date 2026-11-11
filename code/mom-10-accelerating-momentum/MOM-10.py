import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MOM-10",
    "name": "Accelerating Momentum",
    "mode": "single",
    "tags": ["Momentum", "Multi-Timeframe", "Trend"],
    "summary": "Multi-period momentum with short-term emphasis.",
    "description": "Combines momentum across multiple timeframes (1M, 3M, 6M, 12M) with higher weights on recent periods. Captures accelerating trends where short-term momentum aligns with longer-term direction.",
    "bestOn": "Trending markets with persistent momentum",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Weeks to months",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Periods = [21, 63, 126, 252]", "Weights = [0.4, 0.3, 0.2, 0.1]"],
        "Indicators": [
            "1M return (21 days)",
            "3M return (63 days)",
            "6M return (126 days)",
            "12M return (252 days)",
            "Weighted composite score",
        ],
        "Entry": ["Composite score > 0", "All periods positive (confirmation)"],
        "Exit": ["Composite score < 0", "Or short-term momentum turns negative"],
        "Position sizing": ["Based on momentum strength"],
        "Risk controls": ["Reduce position if acceleration slows"],
    },
    "notes": [
        "Short-term momentum predicts near-term returns",
        "Multi-period confirmation reduces whipsaws",
        "Weights emphasize recent performance",
    ],
    "updated": "2026-01-11",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}

    # Momentum periods (in trading days)
    periods = config.get("periods", [21, 63, 126, 252])
    # Weights for each period (short-term gets higher weight)
    weights = config.get("weights", [0.4, 0.3, 0.2, 0.1])
    # Threshold for entry
    entry_threshold = float(config.get("entry_threshold", 0.0))

    close = prices.copy()
    n = len(close)

    # Calculate returns for each period
    returns = {}
    for period in periods:
        returns[period] = close.pct_change(period)

    # Calculate weighted composite momentum score
    composite = pd.Series(0.0, index=close.index)
    for period, weight in zip(periods, weights):
        ret = returns[period].fillna(0)
        # Normalize by period volatility for comparability
        vol = ret.rolling(63).std()
        normalized = ret / (vol + 1e-10)
        composite += weight * normalized

    # Count positive momentum periods
    positive_count = pd.Series(0, index=close.index)
    for period in periods:
        positive_count += (returns[period] > 0).astype(int)

    signal = pd.Series(0.0, index=close.index)

    warmup = max(periods) + 63  # Need enough data for all periods + volatility

    for i in range(warmup, n):
        score = composite.iloc[i]
        pos_cnt = positive_count.iloc[i]
        short_ret = returns[21].iloc[i] if not pd.isna(returns[21].iloc[i]) else 0

        if pd.isna(score):
            signal.iloc[i] = signal.iloc[i - 1]
            continue

        # Strong entry: all periods positive and high score
        if score > entry_threshold and pos_cnt >= 3:
            # Scale position by momentum strength
            if pos_cnt == 4 and short_ret > 0:
                signal.iloc[i] = 1.0  # Full position - all aligned
            elif pos_cnt >= 3:
                signal.iloc[i] = 0.75  # Partial position
            else:
                signal.iloc[i] = 0.5
        elif score > 0 and pos_cnt >= 2:
            # Moderate signal
            signal.iloc[i] = 0.5
        elif score < 0 or pos_cnt <= 1:
            # Exit conditions
            signal.iloc[i] = 0.0
        else:
            # Hold previous
            signal.iloc[i] = signal.iloc[i - 1]

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MOM-10.py SPY              # downloads daily prices with yfinance
#   python MOM-10.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

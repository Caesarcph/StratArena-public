import pandas as pd
import numpy as np

STRATEGY = {
    "id": "RISK-01",
    "name": "Drawdown Control",
    "mode": "single",
    "tags": ["Risk Management", "Defensive", "Overlay"],
    "summary": "Reduce exposure when drawdown exceeds threshold.",
    "description": "Monitors portfolio drawdown in real-time. When drawdown exceeds threshold, reduces position proportionally. Similar to CPPI dynamic insurance. Can be used as overlay on any strategy.",
    "bestOn": "Any underlying strategy",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Max_Drawdown = 0.10", "Scale = 0.5", "Recovery_Threshold = 0.5"],
        "Indicators": ["Rolling maximum price", "Current drawdown"],
        "Entry": [
            "Full position when drawdown < threshold",
            "Reduce by scale factor when drawdown exceeds",
        ],
        "Exit": ["Gradually restore as drawdown recovers"],
        "Position sizing": ["Dynamic based on drawdown"],
        "Risk controls": ["Hard drawdown limit"],
    },
    "notes": [
        "Protects against tail risk",
        "May reduce returns in V-shaped recoveries",
        "Similar to constant proportion portfolio insurance",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    max_drawdown = float(config.get("max_drawdown", 0.10))
    scale_factor = float(config.get("scale", 0.5))
    lookback = int(config.get("lookback", 252))
    min_position = float(config.get("min_position", 0.1))

    close = prices.copy()
    n = len(close)

    # Calculate rolling maximum and drawdown
    rolling_max = close.rolling(lookback, min_periods=1).max()
    drawdown = (close - rolling_max) / rolling_max

    signal = pd.Series(1.0, index=close.index)  # Start fully invested

    for i in range(1, n):
        current_dd = abs(drawdown.iloc[i])

        if current_dd <= max_drawdown:
            # No significant drawdown - full position
            signal.iloc[i] = 1.0
        else:
            # Drawdown exceeds threshold - reduce position
            excess_dd = current_dd - max_drawdown

            # Linear reduction based on excess drawdown
            reduction = min(excess_dd / max_drawdown * scale_factor, 1 - min_position)
            signal.iloc[i] = max(1.0 - reduction, min_position)

    return signal.fillna(1.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python RISK-01.py SPY              # downloads daily prices with yfinance
#   python RISK-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

import pandas as pd
import numpy as np

STRATEGY = {
    "id": "VOL-10",
    "name": "Volatility Risk Premium",
    "mode": "single",
    "tags": ["Volatility", "Risk Premium", "Statistical"],
    "summary": "Harvest volatility risk premium when VRP is high.",
    "description": "Volatility Risk Premium (VRP) is the difference between implied and realized volatility. When VRP is high (implied > realized), sell volatility by holding the underlying. When VRP is negative, stay out as markets may be turbulent.",
    "bestOn": "Equity markets with VRP",
    "frequency": "Daily",
    "assetClasses": ["Index"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Realized_Lookback = 20", "VRP_Threshold = 0.02"],
        "Indicators": [
            "Realized Vol = Std(returns) * sqrt(252)",
            "Implied Vol proxy = Recent vol range",
            "VRP = Implied - Realized",
        ],
        "Entry": ["VRP > threshold (implied > realized)"],
        "Exit": ["VRP < 0 (realized catching up)"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Exit when VRP turns negative"],
    },
    "notes": [
        "VRP is typically positive (variance risk premium)",
        "High VRP = market calm, good to hold",
        "Negative VRP = turbulence ahead",
    ],
    "updated": "2026-01-11",
    "recommendedCompare": ["SPY"],
}


def generate_signals(prices, config=None):
    config = config or {}
    realized_lookback = int(config.get("realized_lookback", 20))
    implied_lookback = int(config.get("implied_lookback", 5))
    vrp_threshold = float(config.get("vrp_threshold", 0.02))

    close = prices.copy()
    n = len(close)

    # Calculate returns
    returns = close.pct_change()

    # Realized volatility (longer term)
    realized_vol = returns.rolling(realized_lookback).std() * np.sqrt(252)

    # Implied volatility proxy (short-term vol as proxy)
    # In reality, would use VIX or options implied vol
    # Here we use recent short-term vol as a proxy for "expected" vol
    short_vol = returns.rolling(implied_lookback).std() * np.sqrt(252)

    # Another proxy: use absolute returns as implied vol indicator
    abs_returns = returns.abs()
    implied_proxy = abs_returns.rolling(implied_lookback).mean() * np.sqrt(252) * 16  # Scale factor

    # VRP proxy: when short-term vol spike is smaller than long-term vol
    # This indicates calm conditions (positive VRP environment)
    vrp = realized_vol - short_vol

    signal = pd.Series(0.0, index=close.index)

    warmup = realized_lookback + 5

    for i in range(warmup, n):
        curr_vrp = vrp.iloc[i]
        curr_realized = realized_vol.iloc[i]

        if pd.isna(curr_vrp) or pd.isna(curr_realized):
            signal.iloc[i] = signal.iloc[i - 1]
            continue

        # Positive VRP environment: realized > short-term (calm)
        # Also check absolute vol level isn't too high
        if curr_vrp > vrp_threshold and curr_realized < 0.25:
            signal.iloc[i] = 1.0
        elif curr_vrp < -vrp_threshold:
            # Negative VRP: short-term spiking, get out
            signal.iloc[i] = 0.0
        else:
            # In between: hold previous position
            signal.iloc[i] = signal.iloc[i - 1]

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python VOL-10.py SPY              # downloads daily prices with yfinance
#   python VOL-10.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

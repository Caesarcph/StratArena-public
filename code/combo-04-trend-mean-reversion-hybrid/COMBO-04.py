import pandas as pd
import numpy as np

STRATEGY = {
    "id": "COMBO-04",
    "name": "Trend + Mean Reversion Hybrid",
    "mode": "single",
    "tags": ["Hybrid", "Trend", "Mean Reversion"],
    "summary": "Follow trend, buy pullbacks.",
    "description": "Combines trend following with mean reversion. First confirms long-term trend direction, then enters on short-term oversold pullbacks within that trend. Captures trend moves at better entry points.",
    "bestOn": "Trending markets with pullbacks",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Trend_MA = 200", "Short_MA = 20", "RSI_Period = 14", "RSI_Oversold = 35"],
        "Indicators": [
            "Long-term MA for trend",
            "RSI for mean reversion",
        ],
        "Entry": ["Price > 200 MA (uptrend)", "AND RSI < 35 (pullback)"],
        "Exit": ["RSI > 50 (recovered)", "OR Price < 200 MA (trend break)"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Only trade in direction of trend"],
    },
    "notes": [
        "Buy the dip in an uptrend",
        "Trend filter prevents fighting the market",
        "Better entries than pure trend following",
    ],
    "updated": "2026-01-11",
    "recommendedCompare": ["SPY", "GLD"],
}


def calculate_rsi(prices, period=14):
    """Calculate RSI indicator."""
    delta = prices.diff()
    gain = delta.where(delta > 0, 0)
    loss = (-delta).where(delta < 0, 0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / (avg_loss + 1e-10)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def generate_signals(prices, config=None):
    config = config or {}
    trend_ma = int(config.get("trend_ma", 200))
    rsi_period = int(config.get("rsi_period", 14))
    rsi_oversold = float(config.get("rsi_oversold", 35))
    rsi_exit = float(config.get("rsi_exit", 50))
    max_hold = int(config.get("max_hold", 20))

    close = prices.copy()
    n = len(close)

    # Trend indicator
    ma_long = close.rolling(trend_ma).mean()
    uptrend = close > ma_long

    # Mean reversion indicator
    rsi = calculate_rsi(close, rsi_period)

    signal = pd.Series(0.0, index=close.index)

    warmup = max(trend_ma, rsi_period)
    entry_idx = None

    for i in range(warmup, n):
        prev_signal = signal.iloc[i - 1]
        curr_rsi = rsi.iloc[i]
        in_uptrend = uptrend.iloc[i]

        if pd.isna(curr_rsi):
            signal.iloc[i] = prev_signal
            continue

        if prev_signal == 0:
            # Not in position - check for entry
            # Entry: uptrend + oversold RSI (pullback in uptrend)
            if in_uptrend and curr_rsi < rsi_oversold:
                signal.iloc[i] = 1.0
                entry_idx = i
            else:
                signal.iloc[i] = 0.0
        else:
            # In position - check for exit
            hold_days = i - entry_idx if entry_idx else 0

            # Exit conditions:
            # 1. RSI recovered above exit level
            # 2. Trend broke (price below long MA)
            # 3. Max hold period
            if curr_rsi > rsi_exit:
                signal.iloc[i] = 0.0
                entry_idx = None
            elif not in_uptrend:
                signal.iloc[i] = 0.0
                entry_idx = None
            elif hold_days >= max_hold:
                signal.iloc[i] = 0.0
                entry_idx = None
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python COMBO-04.py SPY              # downloads daily prices with yfinance
#   python COMBO-04.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

import pandas as pd
import numpy as np

STRATEGY = {
    "id": "VOL-13",
    "name": "Volatility Regime Strategy",
    "mode": "single",
    "tags": ["Volatility", "Regime", "Adaptive"],
    "summary": "Switch strategy style based on volatility regime.",
    "description": "Dynamically switches between trend following in low volatility regimes and mean reversion in high volatility regimes. Low vol environments favor trends; high vol environments favor mean reversion as prices overshoot.",
    "bestOn": "Markets with distinct volatility regimes",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Vol_Lookback = 20", "Vol_Percentile_Window = 252", "Low_Vol_Pct = 40", "High_Vol_Pct = 70"],
        "Indicators": [
            "Realized volatility",
            "Volatility percentile",
            "Trend MA for low vol",
            "RSI for high vol",
        ],
        "Entry": ["Low vol: trend following (price > MA)", "High vol: mean reversion (RSI oversold)"],
        "Exit": ["Regime change or signal reversal"],
        "Position sizing": ["Full position in clear regimes"],
        "Risk controls": ["Reduce size in transition zones"],
    },
    "notes": [
        "Low vol = trending markets",
        "High vol = mean reverting markets",
        "Adaptive approach captures both",
    ],
    "updated": "2026-01-12",
    "recommendedCompare": ["SPY", "GLD"],
}


def calculate_rsi(prices, period=14):
    delta = prices.diff()
    gain = delta.where(delta > 0, 0)
    loss = (-delta).where(delta < 0, 0)
    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()
    rs = avg_gain / (avg_loss + 1e-10)
    return 100 - (100 / (1 + rs))


def generate_signals(prices, config=None):
    config = config or {}

    vol_lookback = int(config.get("vol_lookback", 20))
    pct_window = int(config.get("pct_window", 252))
    low_vol_pct = float(config.get("low_vol_pct", 40))
    high_vol_pct = float(config.get("high_vol_pct", 70))
    trend_ma = int(config.get("trend_ma", 50))
    rsi_period = int(config.get("rsi_period", 14))
    rsi_oversold = float(config.get("rsi_oversold", 30))
    rsi_exit = float(config.get("rsi_exit", 50))

    close = prices.copy()
    n = len(close)

    # Calculate volatility
    returns = close.pct_change()
    vol = returns.rolling(vol_lookback).std() * np.sqrt(252)

    # Volatility percentile
    def vol_percentile(x):
        if len(x) < 20:
            return 50
        return (x < x.iloc[-1]).sum() / len(x) * 100

    vol_pct = vol.rolling(pct_window).apply(vol_percentile, raw=False)

    # Trend indicator for low vol regime
    ma = close.rolling(trend_ma).mean()
    uptrend = close > ma

    # Mean reversion indicator for high vol regime
    rsi = calculate_rsi(close, rsi_period)

    signal = pd.Series(0.0, index=close.index)

    warmup = max(vol_lookback, pct_window, trend_ma, rsi_period) + 10
    in_mr_trade = False

    for i in range(warmup, n):
        curr_vol_pct = vol_pct.iloc[i]
        curr_uptrend = uptrend.iloc[i]
        curr_rsi = rsi.iloc[i]

        if pd.isna(curr_vol_pct) or pd.isna(curr_rsi):
            signal.iloc[i] = signal.iloc[i - 1]
            continue

        # Determine regime
        if curr_vol_pct < low_vol_pct:
            # Low vol regime: trend following
            in_mr_trade = False
            if curr_uptrend:
                signal.iloc[i] = 1.0
            else:
                signal.iloc[i] = 0.0

        elif curr_vol_pct > high_vol_pct:
            # High vol regime: mean reversion
            if not in_mr_trade:
                # Look for entry
                if curr_rsi < rsi_oversold:
                    signal.iloc[i] = 1.0
                    in_mr_trade = True
                else:
                    signal.iloc[i] = 0.0
            else:
                # In MR trade, look for exit
                if curr_rsi > rsi_exit:
                    signal.iloc[i] = 0.0
                    in_mr_trade = False
                else:
                    signal.iloc[i] = 1.0
        else:
            # Transition zone: reduced exposure
            in_mr_trade = False
            if curr_uptrend:
                signal.iloc[i] = 0.5
            else:
                signal.iloc[i] = 0.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python VOL-13.py SPY              # downloads daily prices with yfinance
#   python VOL-13.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

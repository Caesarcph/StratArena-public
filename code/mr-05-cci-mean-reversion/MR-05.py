import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MR-05",
    "name": "CCI Mean Reversion",
    "mode": "single",
    "tags": ["Mean Reversion", "Oscillator"],
    "summary": "Buy oversold CCI readings, exit at neutral.",
    "description": "Uses Commodity Channel Index to identify oversold conditions. Enters long when CCI falls below -100 (oversold) and exits when CCI returns to neutral (0). Includes max holding period and extreme stop.",
    "bestOn": "Range-bound commodities and indices",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Period = 20", "Oversold = -100", "Exit_Level = 0", "Max_Hold = 15"],
        "Indicators": ["Typical Price = (H+L+C)/3", "CCI = (TP - SMA) / (0.015 * Mean Deviation)"],
        "Entry": ["Buy when CCI < -100 (oversold)"],
        "Exit": ["Exit when CCI >= 0", "Or max holding period reached", "Or CCI < -200 (extreme stop)"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Stop at CCI < -200", "Max hold 15 days"],
    },
    "notes": [
        "Donald Lambert's 1980 indicator",
        "Constant 0.015 ensures ~70-80% of CCI values fall within [-100, +100]",
        "Works best in sideways markets",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


def calculate_cci(prices_df, period=20):
    """Calculate Commodity Channel Index."""
    # Need OHLC data, but we only have Close
    # Approximate typical price using Close only
    close = prices_df

    # Typical Price (simplified - using close only)
    tp = close

    # Moving average of typical price
    ma = tp.rolling(period).mean()

    # Mean deviation
    md = tp.rolling(period).apply(lambda x: np.mean(np.abs(x - x.mean())), raw=True)

    # CCI calculation
    cci = (tp - ma) / (0.015 * md)

    return cci


def generate_signals(prices, config=None):
    config = config or {}
    period = int(config.get("period", 20))
    oversold = float(config.get("oversold", -100))
    exit_level = float(config.get("exit_level", 0))
    max_hold = int(config.get("max_hold", 15))
    extreme_stop = float(config.get("extreme_stop", -200))

    close = prices.copy()
    cci = calculate_cci(close, period)

    signal = pd.Series(0.0, index=close.index)
    entry_idx = None

    for i in range(period, len(close)):
        prev_signal = signal.iloc[i - 1]

        # No position - check entry
        if prev_signal == 0:
            if cci.iloc[i] < oversold:
                signal.iloc[i] = 1.0  # Oversold - go long
                entry_idx = i
            else:
                signal.iloc[i] = 0.0

        # Holding long position
        else:
            hold_days = i - entry_idx if entry_idx else 0

            # Exit conditions
            if cci.iloc[i] >= exit_level:  # Revert to neutral
                signal.iloc[i] = 0.0
            elif hold_days >= max_hold:  # Max holding period
                signal.iloc[i] = 0.0
            elif cci.iloc[i] < extreme_stop:  # Extreme oversold stop
                signal.iloc[i] = 0.0
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-05.py SPY              # downloads daily prices with yfinance
#   python MR-05.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

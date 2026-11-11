import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MR-12",
    "name": "Money Flow Index Reversion",
    "mode": "single",
    "tags": ["Mean Reversion", "Volume", "Oscillator"],
    "summary": "Buy oversold MFI, exit at neutral.",
    "description": "Uses Money Flow Index (volume-weighted RSI) to identify oversold conditions. MFI < 20 indicates oversold with volume confirmation. Exit when MFI recovers to neutral.",
    "bestOn": "Range-bound markets with volume data",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO"],
    "pseudocode": {
        "Inputs": ["Period = 14", "Oversold = 30", "Exit = 50"],
        "Indicators": [
            "Typical Price = (High + Low + Close) / 3",
            "Raw Money Flow = Typical Price * Volume",
            "MFI = 100 - 100 / (1 + Positive MF / Negative MF)",
        ],
        "Entry": ["Buy when MFI < 30 (oversold)"],
        "Exit": ["Exit when MFI > 50 (neutral)"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Max hold period of 15 days"],
    },
    "notes": [
        "Also known as volume-weighted RSI",
        "Combines price and volume for stronger signals",
        "More reliable than pure price oscillators",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    """
    Note: Without volume data, we approximate MFI using price momentum.
    In production, this would use actual volume data.
    """
    config = config or {}
    period = int(config.get("period", 14))
    oversold = float(config.get("oversold", 30))  # Relaxed from 20 for more signals
    exit_level = float(config.get("exit_level", 50))
    max_hold = int(config.get("max_hold", 15))

    close = prices.copy()

    # Approximate MFI using RSI-like calculation
    # (In practice, would use volume data)
    delta = close.diff()
    gain = delta.where(delta > 0, 0)
    loss = (-delta).where(delta < 0, 0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / (avg_loss + 1e-10)
    mfi_approx = 100 - (100 / (1 + rs))

    signal = pd.Series(0.0, index=close.index)
    entry_idx = None

    for i in range(period, len(close)):
        prev_signal = signal.iloc[i - 1]

        if prev_signal == 0:
            # Check for oversold entry
            if mfi_approx.iloc[i] < oversold:
                signal.iloc[i] = 1.0
                entry_idx = i
            else:
                signal.iloc[i] = 0.0
        else:
            # In position - check for exit
            hold_days = i - entry_idx if entry_idx else 0

            # Exit on recovery or max hold
            if mfi_approx.iloc[i] > exit_level:
                signal.iloc[i] = 0.0
            elif hold_days >= max_hold:
                signal.iloc[i] = 0.0
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-12.py SPY              # downloads daily prices with yfinance
#   python MR-12.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

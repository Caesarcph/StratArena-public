import pandas as pd

STRATEGY = {
    "id": "MR-14",
    "name": "Detrended Price Oscillator",
    "mode": "single",
    "tags": ["Mean Reversion", "Oscillator"],
    "summary": "Mean reversion using a detrended price oscillator.",
    "description": "Detrended Price Oscillator (DPO) removes longer-term trend by comparing a shifted price to its moving average. This strategy buys when DPO is deeply negative and exits near the zero line.",
    "bestOn": "Range-bound markets",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Period = 20", "Entry_Level = -2.0", "Exit_Level = 0.0"],
        "Indicators": ["SMA(Period)", "DPO = Close.shift(Period/2 + 1) - SMA"],
        "Entry": ["Go long when DPO% < Entry_Level"],
        "Exit": ["Exit when DPO% > Exit_Level"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Detrending reduces long-cycle bias"],
    },
    "notes": ["DPO is a cycle indicator, not a trend indicator"],
    "updated": "2026-01-13",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    period = int(config.get("period", 20))
    entry_level = float(config.get("entry_level", -2.0))
    exit_level = float(config.get("exit_level", 0.0))

    close = prices.copy()
    shift = int(period / 2) + 1
    sma = close.rolling(period).mean()
    dpo = close.shift(shift) - sma
    dpo_pct = (dpo / sma) * 100

    signal = pd.Series(0.0, index=close.index)
    for idx in range(1, len(close)):
        prev = signal.iloc[idx - 1]
        if prev == 0:
            if dpo_pct.iloc[idx] < entry_level:
                signal.iloc[idx] = 1.0
            else:
                signal.iloc[idx] = 0.0
        else:
            if dpo_pct.iloc[idx] > exit_level:
                signal.iloc[idx] = 0.0
            else:
                signal.iloc[idx] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-14.py SPY              # downloads daily prices with yfinance
#   python MR-14.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

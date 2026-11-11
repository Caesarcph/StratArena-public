import pandas as pd

STRATEGY = {
    "id": "TREND-20",
    "name": "Vortex Indicator",
    "mode": "single",
    "tags": ["Trend", "Volatility"],
    "summary": "Trend signals from vortex indicator crossovers.",
    "description": "Calculates Vortex Indicator components based on true range. Go long when VI+ crosses above VI- and exit on the opposite crossover.",
    "bestOn": "Markets with persistent directional moves",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "input": "ohlc",
    "pseudocode": {
        "Inputs": ["Period = 14"],
        "Indicators": [
            "VM+ = sum(abs(high - prev_low))",
            "VM- = sum(abs(low - prev_high))",
            "TR = sum(True Range)",
            "VI+ = VM+ / TR",
            "VI- = VM- / TR",
        ],
        "Entry": ["Go long when VI+ > VI-"],
        "Exit": ["Exit when VI+ < VI-"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Uses true range normalization"],
    },
    "notes": ["Sensitive to volatility spikes", "Short version can be added later"],
    "updated": "2026-01-13",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    period = int(config.get("period", 14))

    if isinstance(prices, pd.DataFrame):
        high = prices["High"] if "High" in prices.columns else prices.iloc[:, 0]
        low = prices["Low"] if "Low" in prices.columns else prices.iloc[:, 0]
        close = prices["Close"] if "Close" in prices.columns else prices.iloc[:, 0]
    else:
        close = prices.copy()
        high = close
        low = close

    prev_high = high.shift(1)
    prev_low = low.shift(1)
    prev_close = close.shift(1)

    vm_plus = (high - prev_low).abs()
    vm_minus = (low - prev_high).abs()

    tr = pd.concat(
        [(high - low).abs(), (high - prev_close).abs(), (low - prev_close).abs()],
        axis=1,
    ).max(axis=1)

    vm_plus_sum = vm_plus.rolling(period).sum()
    vm_minus_sum = vm_minus.rolling(period).sum()
    tr_sum = tr.rolling(period).sum()

    vi_plus = vm_plus_sum / tr_sum
    vi_minus = vm_minus_sum / tr_sum

    signal = pd.Series(0.0, index=close.index)
    for idx in range(1, len(close)):
        if vi_plus.iloc[idx] > vi_minus.iloc[idx]:
            signal.iloc[idx] = 1.0
        elif vi_plus.iloc[idx] < vi_minus.iloc[idx]:
            signal.iloc[idx] = 0.0
        else:
            signal.iloc[idx] = signal.iloc[idx - 1]

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-20.py SPY              # downloads daily prices with yfinance
#   python TREND-20.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

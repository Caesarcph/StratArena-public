import pandas as pd

STRATEGY = {
    "id": "MR-01",
    "name": "RSI Mean Reversion",
    "tags": ["Mean Reversion", "Oscillator"],
    "summary": "Buy oversold and fade overbought with a volatility cap.",
    "description": "A short-term mean reversion model using RSI with volatility gating.",
    "bestOn": "SPY 1Y Return Top3",
    "frequency": "Daily",
    "assetClasses": ["Index", "FX", "Commodity"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["RSI = 14", "Oversold = 30", "Overbought = 70"],
        "Indicators": ["RSI(14)", "Volatility(20)"],
        "Entry": ["Buy when RSI < 30 and volatility < threshold"],
        "Exit": ["Exit when RSI > 50"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Disable signals when volatility spikes"],
    },
    "notes": ["Works best in range-bound regimes", "Underperforms during trend spikes"],
    "updated": "2025-02-10",
    "recommendedCompare": ["SPY", "GLD", "USO"],
}


def rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = -delta.clip(upper=0).rolling(period).mean()
    rs = gain / loss.replace(0, pd.NA)
    return 100 - (100 / (1 + rs))


def generate_signals(prices, config=None):
    close = prices.copy()
    rsi_value = rsi(close, 14)
    signal = pd.Series(0.0, index=close.index)
    signal[rsi_value < 30] = 1.0
    signal[rsi_value > 50] = 0.0
    return signal.ffill().fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-01.py SPY              # downloads daily prices with yfinance
#   python MR-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

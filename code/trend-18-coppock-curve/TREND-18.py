import pandas as pd

STRATEGY = {
    "id": "TREND-18",
    "name": "Coppock Curve",
    "mode": "single",
    "tags": ["Trend", "Momentum"],
    "summary": "Long-term trend timing with a smoothed momentum curve.",
    "description": "Coppock Curve is a weighted moving average of two rate-of-change series. It is designed as a long-term trend indicator that turns positive near major bottoms.",
    "bestOn": "Long-duration trend regimes",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Months",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["ROC1 = 14", "ROC2 = 11", "WMA = 10"],
        "Indicators": ["ROC1 = (P / P[-ROC1]) - 1", "ROC2 = (P / P[-ROC2]) - 1", "Coppock = WMA(ROC1 + ROC2, WMA)"],
        "Entry": ["Go long when Coppock > 0"],
        "Exit": ["Exit when Coppock < 0"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Trend filter keeps exposure binary"],
    },
    "notes": ["Originally designed for monthly data", "Signals can be slow on daily bars"],
    "updated": "2026-01-13",
    "recommendedCompare": ["SPY", "GLD"],
}


def weighted_moving_average(series, window):
    weights = pd.Series(range(1, window + 1), index=series.index[-window:])
    return series.rolling(window).apply(
        lambda values: (values * weights.values).sum() / weights.values.sum(),
        raw=True,
    )


def generate_signals(prices, config=None):
    config = config or {}
    roc_fast = int(config.get("roc_fast", 14))
    roc_slow = int(config.get("roc_slow", 11))
    wma_window = int(config.get("wma_window", 10))

    close = prices.copy()
    roc1 = close / close.shift(roc_fast) - 1
    roc2 = close / close.shift(roc_slow) - 1
    coppock = weighted_moving_average(roc1 + roc2, wma_window)

    signal = (coppock > 0).astype(float)
    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-18.py SPY              # downloads daily prices with yfinance
#   python TREND-18.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

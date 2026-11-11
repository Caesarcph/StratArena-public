import pandas as pd
import numpy as np

STRATEGY = {
    "id": "SAR-01",
    "name": "Parabolic SAR",
    "mode": "single",
    "input": "ohlc",
    "tags": ["Trend", "Stop", "Reversal"],
    "summary": "Stop-and-reverse trend system with acceleration.",
    "description": "Tracks a parabolic stop that flips direction on cross.",
    "bestOn": "USO 3Y Trend Score Top5",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["AF_Start = 0.02", "AF_Step = 0.02", "AF_Max = 0.20"],
        "Entry": ["Price > SAR: long", "Price < SAR: short"],
        "Exit": ["Flip on SAR cross"],
    },
    "notes": ["Long-only by default; set allow_short to enable shorts."],
    "updated": "2026-01-09",
    "recommendedCompare": ["USO", "SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    af_start = float(config.get("af_start", 0.02))
    af_step = float(config.get("af_step", 0.02))
    af_max = float(config.get("af_max", 0.2))
    allow_short = bool(config.get("allow_short", False))

    high = prices["High"].values
    low = prices["Low"].values
    close = prices["Close"].values
    n = len(close)

    if n == 0:
        return pd.Series(dtype=float)

    sar = np.zeros(n)
    ep = np.zeros(n)
    af = np.zeros(n)
    trend = np.ones(n)

    trend[0] = 1.0
    sar[0] = low[0]
    ep[0] = high[0]
    af[0] = af_start

    for i in range(1, n):
        sar[i] = sar[i - 1] + af[i - 1] * (ep[i - 1] - sar[i - 1])

        if trend[i - 1] == 1:
            prior_low = low[i - 1]
            sar[i] = min(sar[i], prior_low, low[i - 2] if i >= 2 else prior_low)
            if low[i] < sar[i]:
                trend[i] = -1
                sar[i] = ep[i - 1]
                ep[i] = low[i]
                af[i] = af_start
            else:
                trend[i] = 1
                if high[i] > ep[i - 1]:
                    ep[i] = high[i]
                    af[i] = min(af[i - 1] + af_step, af_max)
                else:
                    ep[i] = ep[i - 1]
                    af[i] = af[i - 1]
        else:
            prior_high = high[i - 1]
            sar[i] = max(sar[i], prior_high, high[i - 2] if i >= 2 else prior_high)
            if high[i] > sar[i]:
                trend[i] = 1
                sar[i] = ep[i - 1]
                ep[i] = high[i]
                af[i] = af_start
            else:
                trend[i] = -1
                if low[i] < ep[i - 1]:
                    ep[i] = low[i]
                    af[i] = min(af[i - 1] + af_step, af_max)
                else:
                    ep[i] = ep[i - 1]
                    af[i] = af[i - 1]

    position = pd.Series(trend, index=prices.index)
    if not allow_short:
        position = position.clip(lower=0.0)
    return position.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python SAR-01.py SPY              # downloads daily prices with yfinance
#   python SAR-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MR-06",
    "name": "Z-Score Mean Reversion",
    "mode": "single",
    "tags": ["Mean Reversion", "Statistical"],
    "summary": "Simple z-score reversion with volatility and trend filters.",
    "description": "Basic mean reversion using price z-score with dual filters: volatility must be in reasonable range and price must be near 200-day MA (no strong trend). Trades only when conditions favor mean reversion.",
    "bestOn": "Range-bound markets with moderate volatility",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Lookback = 20", "Entry_Z = 2.0", "Exit_Z = 0.5"],
        "Indicators": ["Z-Score = (Close - SMA) / StdDev", "Annualized Volatility", "200-day MA distance"],
        "Entry": ["Buy when Z < -Entry_Z", "Volatility between 10%-50% annualized", "Price within 10% of 200-day MA"],
        "Exit": ["Exit when |Z| < Exit_Z"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Volatility filter", "Trend filter"],
    },
    "notes": [
        "Most basic mean reversion approach",
        "Filters significantly improve risk-adjusted returns",
        "Works best when market lacks strong directional bias",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 20))
    entry_z = float(config.get("entry_z", 2.0))
    exit_z = float(config.get("exit_z", 0.5))
    vol_filter = config.get("vol_filter", True)
    trend_filter = config.get("trend_filter", True)
    min_vol = float(config.get("min_vol", 0.10))
    max_vol = float(config.get("max_vol", 0.50))
    trend_threshold = float(config.get("trend_threshold", 0.10))

    close = prices.copy()
    n = len(close)

    # Z-Score calculation
    ma = close.rolling(lookback).mean()
    std = close.rolling(lookback).std()
    z_score = (close - ma) / std

    # Volatility filter: annualized volatility in reasonable range
    if vol_filter:
        daily_vol = close.pct_change().rolling(lookback).std()
        annualized_vol = daily_vol * np.sqrt(252)
        vol_ok = (annualized_vol > min_vol) & (annualized_vol < max_vol)
    else:
        vol_ok = pd.Series(True, index=close.index)

    # Trend filter: price within threshold of 200-day MA
    if trend_filter:
        ma_200 = close.rolling(200).mean()
        trend_neutral = (close / ma_200 - 1).abs() < trend_threshold
    else:
        trend_neutral = pd.Series(True, index=close.index)

    signal = pd.Series(0.0, index=close.index)

    for i in range(200, n):
        can_trade = vol_ok.iloc[i] and trend_neutral.iloc[i]
        prev_signal = signal.iloc[i - 1]

        if prev_signal == 0:
            # Only enter if filters allow
            if can_trade and z_score.iloc[i] < -entry_z:
                signal.iloc[i] = 1.0
            else:
                signal.iloc[i] = 0.0
        else:
            # Exit when z-score reverts
            if z_score.iloc[i] > -exit_z:
                signal.iloc[i] = 0.0
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-06.py SPY              # downloads daily prices with yfinance
#   python MR-06.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

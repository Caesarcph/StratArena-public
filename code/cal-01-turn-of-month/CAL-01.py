import pandas as pd
import numpy as np

STRATEGY = {
    "id": "CAL-01",
    "name": "Turn of Month",
    "mode": "single",
    "tags": ["Seasonality", "Calendar", "Anomaly"],
    "summary": "Capture month-turn windows using a fixed weekday calendar.",
    "description": "Long in the first/last configured weekday-count windows of each calendar month. The Monday-Friday calendar is known without future price rows; it is an approximation, not an exchange holiday calendar.",
    "ruleVersion": "weekday-calendar-month-turn-v2",
    "corrections": ["remove-future-index-month-length"],
    "bestOn": "Equity indices",
    "frequency": "Daily",
    "assetClasses": ["Index"],
    "holdingPeriod": "Days",
    "instruments": ["SPY"],
    "pseudocode": {
        "Inputs": ["End_Days = 3", "Start_Days = 3"],
        "Indicators": ["Elapsed/remaining Monday-Friday calendar weekdays"],
        "Entry": ["Hold when at most Start_Days calendar weekdays have elapsed", "Hold when fewer than End_Days calendar weekdays remain"],
        "Exit": ["Exit outside turn-of-month window"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Simple calendar-based rule"],
    },
    "notes": [
        "Version 2 uses a fixed Monday-Friday calendar and ignores exchange holidays; weekend observations can stay inside a contiguous month-turn window.",
        "The earlier version counted future rows in the downloaded month and could revise earlier targets as new observations arrived.",
        "Institutional rebalancing at month-end",
        "Payroll and pension fund flows",
        "Well-documented calendar anomaly",
    ],
    "updated": "2026-11-06",
    "recommendedCompare": ["SPY"],
}


def get_trading_days_info(dates):
    """Known weekday counts, independent of future downloaded observations.

    The function name is retained for compatibility. These are calendar
    approximations, not actual exchange-session or retrospective closure counts.
    """
    days = np.asarray(pd.DatetimeIndex(dates).date, dtype="datetime64[D]")
    months = days.astype("datetime64[M]")
    first = months.astype("datetime64[D]")
    following = (months + 1).astype("datetime64[D]")
    next_day = days + np.timedelta64(1, "D")
    return np.busday_count(first, next_day), np.busday_count(next_day, following)


def generate_signals(prices, config=None):
    config = config or {}
    end_days = int(config.get("end_days", 3))
    start_days = int(config.get("start_days", 3))

    close = prices.copy()

    # Get trading day info
    day_of_month, days_until_end = get_trading_days_info(close.index)

    signal = pd.Series(0.0, index=close.index)

    for i in range(len(close)):
        # First N days of month
        is_month_start = start_days > 0 and day_of_month[i] <= start_days

        # Last M days of month
        is_month_end = end_days > 0 and days_until_end[i] < end_days

        if is_month_start or is_month_end:
            signal.iloc[i] = 1.0
        else:
            signal.iloc[i] = 0.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python CAL-01.py SPY              # downloads daily prices with yfinance
#   python CAL-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

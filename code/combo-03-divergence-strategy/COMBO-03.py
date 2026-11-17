"""COMBO-03: confirmed hidden divergence, with long/flat targets.

Preserve the original implemented inequalities: a higher price low paired with
a lower indicator low enters long; a lower price high paired with a higher
indicator high exits. These are hidden divergences, not the regular reversal
divergences described by the old prose. A pivot needs ``order`` observations
on either side and can change the target only at its confirmation close.
The shared engine applies its separate one-observation execution lag.
"""

import numpy as np
import pandas as pd
from scipy.signal import argrelextrema


def calculate_rsi(prices, window=14):
    """Calculate the existing simple-mean RSI, retaining its smoothing rule."""
    delta = prices.diff()
    gain = delta.where(delta > 0, 0).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def calculate_macd(prices, fast=12, slow=26, signal=9):
    """Return the MACD line; the legacy ``signal`` argument is not used."""
    exp1 = prices.ewm(span=fast, adjust=False).mean()
    exp2 = prices.ewm(span=slow, adjust=False).mean()
    return exp1 - exp2


def find_extrema(data, order=5):
    """Strict pivots with complete neighbors; pivot p is known only at p+order."""
    local_max_idx = argrelextrema(data.values, np.greater, order=order)[0]
    local_min_idx = argrelextrema(data.values, np.less, order=order)[0]
    # scipy clips boundaries by default. Reject edge candidates whose full
    # left/right confirmation window is not actually present.
    local_max_idx = local_max_idx[(local_max_idx >= order) & (local_max_idx + order < len(data))]
    local_min_idx = local_min_idx[(local_min_idx >= order) & (local_min_idx + order < len(data))]
    extrema = pd.Series(index=data.index, dtype=float)
    extrema.iloc[local_max_idx] = data.iloc[local_max_idx]
    extrema.iloc[local_min_idx] = data.iloc[local_min_idx]
    return extrema, local_max_idx, local_min_idx


def generate_signals(prices, config=None):
    """Return causal, held long/flat targets on the supplied observations.

    ``lookback`` keeps the old recent-pair bounds, now relative to each
    confirmation close: the newer pivot must be within the last lookback
    observations, and the preceding same-side pivot within twice that span.
    Thus lookback <= order cannot produce a signal. ``indicator_type`` is RSI
    or MACD; ``indicator_period`` is the RSI window or MACD fast EMA (slow=26).
    The nearby indicator extrema retain the old [pivot-order, pivot+order)
    window. Every value in it is known by the confirmation close.
    """
    config = config or {}
    lookback = config.get("lookback", 10)
    indicator_type = config.get("indicator_type", "RSI")
    indicator_period = config.get("indicator_period", 14)
    order = config.get("order", 5)
    for name, value in (("lookback", lookback), ("indicator_period", indicator_period), ("order", order)):
        if isinstance(value, (bool, np.bool_)) or not isinstance(value, (int, np.integer)) or value < 1:
            raise ValueError(f"{name} must be a positive integer")

    if indicator_type == "RSI":
        indicator = calculate_rsi(prices, window=indicator_period)
    elif indicator_type == "MACD":
        indicator = calculate_macd(prices, fast=indicator_period, slow=26, signal=9)
    else:
        raise ValueError("Indicator type must be 'RSI' or 'MACD'")
    indicator = indicator.ffill()
    _, highs, lows = find_extrema(prices, order=order)
    # NaN means no new event, so a target persists until the next confirmed
    # opposite event. The old all-zero initialization defeated forward filling.
    signals = pd.Series(np.nan, index=prices.index, dtype=float)
    for pivots, target in ((lows, 1.0), (highs, 0.0)):
        for previous, pivot in zip(pivots[:-1], pivots[1:]):
            confirmed = pivot + order
            observed = confirmed + 1
            if previous < observed - 2 * lookback or pivot < observed - lookback:
                continue
            prior_window = indicator.iloc[previous - order:previous + order]
            current_window = indicator.iloc[pivot - order:pivot + order]
            if target == 1.0:
                divergence = (prices.iloc[pivot] > prices.iloc[previous]
                              and current_window.min() < prior_window.min())
            else:
                divergence = (prices.iloc[pivot] < prices.iloc[previous]
                              and current_window.max() > prior_window.max())
            if divergence:
                signals.iloc[confirmed] = target
    return signals.ffill().fillna(0.0)


STRATEGY = {
    "name": "Divergence Strategy",
    "category": "Combo",
    "subcategory": "Technical Combos",
    "id": "COMBO-03",
    "ruleVersion": "confirmed-hidden-divergence-v2",
    "corrections": ["causal-pivot-confirmation", "remove-end-of-history-filter", "preserve-held-targets"],
    "targetTiming": "Target changes at pivot confirmation close after order right-hand observations; engine applies one-row lag.",
    "summary": "Hold long between confirmed bullish and bearish hidden divergences.",
    "description": "A higher price low with a lower nearby RSI/MACD low enters long; a lower price high with a higher nearby indicator high exits. Pivots require order observations on each side; targets change only at confirmation and persist between events.",
    "parameters": {
        "lookback": 10,
        "indicator_type": "RSI",
        "indicator_period": 14,
        "order": 5,
    },
    "notes": [
        "Version 2 preserves the implemented hidden-divergence direction, rather than the old regular-divergence description.",
        "At confirmation, the latest pivot must be within lookback observations and the preceding pivot within 2 * lookback; lookback must exceed order for events.",
        "RSI uses simple rolling means; MACD uses indicator_period for its fast EMA and 26 for its slow EMA.",
        "Version 1 revised historical signals and did not hold between events; its results are not comparable to version 2.",
    ],
    "tags": ["divergence", "hidden-divergence", "rsi", "macd", "technical"],
}


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python COMBO-03.py SPY              # downloads daily prices with yfinance
#   python COMBO-03.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
#
# This default-parameter example does not replay the site's walk-forward fits
# or archived data. Evidence downloads replay the published run's recorded
# arithmetic and include archived source. Recomputing strategy decisions needs
# the exact original inputs, which may not be public.
# Convention, same as the site: the position decided at the close of day t earns
# the return of day t+1. Results are before trading costs. Not investment advice.
# ---------------------------------------------------------------------------
def _load_prices(source):
    import numpy as np

    if source.lower().endswith(".csv"):
        frame = pd.read_csv(source, index_col=0, parse_dates=True)
    else:
        import yfinance as yf
        try:
            frame = yf.download(source, start="2010-01-01", auto_adjust=True, progress=False)
        except Exception as error:
            raise ValueError("Could not download daily prices: " + str(error)) from error
        if not isinstance(frame, pd.DataFrame):
            raise ValueError("Expected a table of daily prices for one ticker.")
        if isinstance(frame.columns, pd.MultiIndex):
            levels = [level for level in range(frame.columns.nlevels)
                      if "Close" in frame.columns.get_level_values(level)]
            if len(levels) != 1:
                raise ValueError("Expected daily prices for one ticker.")
            frame.columns = frame.columns.get_level_values(levels[0])
    required = ["Open", "High", "Low", "Close"] if STRATEGY.get("input") == "ohlc" else ["Close"]
    if frame.columns.has_duplicates:
        raise ValueError("Expected one column per price field for one ticker.")
    missing = [name for name in required if name not in frame.columns]
    if missing:
        raise ValueError("Missing price columns: " + ", ".join(missing))
    if not isinstance(frame.index, pd.DatetimeIndex) or frame.index.hasnans or frame.index.normalize().has_duplicates:
        raise ValueError("Prices need one row per valid calendar date.")
    frame = frame.copy()
    frame[required] = frame[required].apply(pd.to_numeric, errors="raise")
    frame = frame.sort_index().dropna(subset=required)
    prices = frame[required].to_numpy(dtype=float)
    if len(frame) < 2:
        raise ValueError("Need at least two complete daily observations.")
    if not np.isfinite(prices).all() or (prices <= 0).any():
        raise ValueError("Prices must be finite and positive.")
    return frame


if __name__ == "__main__":
    import sys

    try:
        prices = _load_prices(sys.argv[1] if len(sys.argv) > 1 else "SPY")
    except (OSError, TypeError, ValueError) as error:
        raise SystemExit("Input error: " + str(error)) from error
    close = prices["Close"]
    signal_input = prices if STRATEGY.get("input") == "ohlc" else close
    position = generate_signals(signal_input).reindex(close.index).ffill().fillna(0.0)
    daily = close.pct_change().fillna(0.0) * position.shift(1).fillna(0.0)
    equity = (1 + daily).cumprod()
    years = (close.index[-1].date() - close.index[0].date()).days / 365.25
    print(STRATEGY["id"], STRATEGY["name"], "|", close.index[0].date(), "to", close.index[-1].date())
    print("Total return   {:+.1%}".format(equity.iloc[-1] - 1))
    print("CAGR           {:+.1%}".format(equity.iloc[-1] ** (1 / years) - 1))
    print("Sharpe         {:.2f}".format(daily.mean() / daily.std() * 252 ** 0.5 if daily.std() else 0.0))
    print("Max drawdown   {:.1%}".format((equity / equity.cummax() - 1).min()))
    print("Days in market {:.0%}".format((position != 0).mean()))
    print("Buy and hold   {:+.1%}".format(close.iloc[-1] / close.iloc[0] - 1))

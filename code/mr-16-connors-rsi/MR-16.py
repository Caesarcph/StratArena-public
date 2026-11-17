import pandas as pd
import numpy as np

STRATEGY = {'id': 'MR-16',
 'name': 'Connors RSI',
 'mode': 'single',
 'ruleVersion': 'connors-rsi-boundaries-v2',
 'corrections': ['positive-gains-without-losses-rsi-100'],
 'tags': ['Mean Reversion', 'Oscillator', 'Connors RSI'],
 'summary': 'Combine SMA-based price/streak RSI with an inclusive return rank.',
 'description': 'This Connors-style variant averages price RSI, signed-streak RSI and return '
                'rank. Corrected RSI maps positive gains without losses to100, losses without '
                'gains to0, and flat or unavailable windows to50.',
 'bestOn': 'Mean reverting ETFs and FX',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['After 100 observations, enter when CRSI<10.'],
                'Exit': ['Exit when CRSI>50 or holding age≥10 observations.'],
                'Indicators': ['Both RSIs use simple rolling mean gains/losses. Rank is the '
                               'current one-row return within 100 returns including itself, '
                               'with average ranks for ties. CRSI averages the three '
                               'components.'],
                'Inputs': ['price_rsi_period=3, streak_rsi_period=2, rank_period=100, '
                           'entry_threshold=10, exit_threshold=50, max_hold=10.'],
                'Position sizing': ['100% long or cash.']},
 'notes': ['This is not Wilder-smoothed RSI. Boundary correction can change recovery exits; '
           'evidence must identify the rule version.'],
 'updated': '2026-02-04',
 'recommendedCompare': ['SPY', 'GLD', 'USO']}


def rsi(series, period):
    if len(series) < period + 1:
        return pd.Series(50.0, index=series.index)
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    
    rs = avg_gain / avg_loss.replace(0, np.nan)
    res = 100 - (100 / (1 + rs))
    # Positive gains with no losses are fully overbought; flat/warmup stays neutral.
    res = res.mask((avg_loss == 0) & (avg_gain > 0), 100.0)
    return res.fillna(50.0)


def get_streak_series(close):
    # Calculate consecutive up/down streaks
    # Up day: close > prev_close -> +1 (or increment)
    # Down day: close < prev_close -> -1 (or decrement)
    # Unchanged: 0
    
    # We'll use a loop for clarity and correctness as vectorizing streaks is tricky
    streaks = np.zeros(len(close))
    
    if len(close) < 2:
        return pd.Series(streaks, index=close.index)
        
    prev_val = 0
    close_vals = close.values
    
    # Start from index 1
    for i in range(1, len(close)):
        diff = close_vals[i] - close_vals[i-1]
        if diff > 0:
            current = prev_val + 1 if prev_val >= 0 else 1
        elif diff < 0:
            current = prev_val - 1 if prev_val <= 0 else -1
        else:
            current = 0
        streaks[i] = current
        prev_val = current
        
    return pd.Series(streaks, index=close.index)


def percentile_rank(series, window):
    # Percent rank of the last value within the rolling window
    # Scipy percentileofscore is slow in loop, pandas rolling rank is easier
    # pct=True gives 0.0 to 1.0, we want 0-100
    return series.pct_change().rolling(window).rank(pct=True) * 100


def generate_signals(prices, config=None):
    cfg = config or {}
    price_rsi_period = cfg.get("price_rsi_period", 3)
    streak_rsi_period = cfg.get("streak_rsi_period", 2)
    rank_period = cfg.get("rank_period", 100)
    entry_threshold = cfg.get("entry_threshold", 10)
    exit_threshold = cfg.get("exit_threshold", 50)
    max_hold = cfg.get("max_hold", 10)
    
    close = prices.copy()
    
    # 1. Price RSI
    price_rsi_val = rsi(close, price_rsi_period)
    
    # 2. Streak RSI
    streak_val = get_streak_series(close)
    streak_rsi_val = rsi(streak_val, streak_rsi_period)
    
    # 3. Percent Rank
    # Rank of the *current 1-day return* over the last 100 days
    # Note: original Connors RSI often uses rank of *today's return* vs history
    ret = close.pct_change().fillna(0.0)
    rank_val = ret.rolling(rank_period).rank(pct=True) * 100
    
    # CRSI
    crsi = (price_rsi_val + streak_rsi_val + rank_val) / 3.0
    crsi = crsi.fillna(50.0)
    
    # Generate positions
    positions = pd.Series(0.0, index=close.index)
    hold_days = 0
    in_position = False
    
    # Loop for state management (max_hold)
    # Using simple loop over numpy array for speed
    crsi_arr = crsi.values
    pos_arr = np.zeros(len(close))
    
    for i in range(rank_period, len(close)):
        if in_position:
            hold_days += 1
            # Exit conditions
            if crsi_arr[i] > exit_threshold or hold_days >= max_hold:
                in_position = False
                hold_days = 0
                pos_arr[i] = 0.0
            else:
                pos_arr[i] = 1.0
        else:
            # Entry condition
            if crsi_arr[i] < entry_threshold:
                in_position = True
                hold_days = 0 # Will be 1 on next day effectively if we fill forward? 
                # Actually standard practice: signal generated at Close[i], enters at Open[i+1].
                # Our backtester assumes signal[i] uses Close[i] and trade happens next day.
                # So we mark pos_arr[i] = 1.0
                pos_arr[i] = 1.0
                
    return pd.Series(pos_arr, index=close.index)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MR-16.py SPY              # downloads daily prices with yfinance
#   python MR-16.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

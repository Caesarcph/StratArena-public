import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MR-16",
    "name": "Connors RSI",
    "mode": "single",
    "tags": ["Mean Reversion", "Oscillator", "Connors RSI"],
    "summary": "Composite RSI using price, streak, and rank.",
    "description": "Connors RSI combines three components: RSI of price, RSI of streak duration, and Percentile Rank of returns. It is designed to be more robust and responsive than standard RSI. Enters long when CRSI is extremely low and exits when it recovers.",
    "bestOn": "Mean reverting ETFs and FX",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": [
            "Price_RSI_Period = 3",
            "Streak_RSI_Period = 2",
            "Rank_Period = 100",
            "Entry_Threshold = 10",
            "Exit_Threshold = 50",
            "Max_Hold = 10"
        ],
        "Indicators": [
            "Price RSI(3)",
            "Streak RSI(2)",
            "Percent Rank(100)",
            "CRSI = (Price RSI + Streak RSI + Rank) / 3"
        ],
        "Entry": ["Buy when CRSI < 10"],
        "Exit": ["Exit when CRSI > 50 or holding days >= 10"],
        "Risk controls": ["None (time-based exit)"]
    },
    "notes": ["Short periods make it highly reactive.", "Streak RSI handles consecutive up/down days."],
    "updated": "2026-02-04",
    "recommendedCompare": ["SPY", "GLD", "USO"]
}


def rsi(series, period):
    if len(series) < period + 1:
        return pd.Series(0.0, index=series.index)
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    
    rs = avg_gain / avg_loss.replace(0, np.nan)
    res = 100 - (100 / (1 + rs))
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
#   python MR-16.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

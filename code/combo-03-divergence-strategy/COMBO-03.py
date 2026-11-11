"""
Divergence Strategy - COMBO-03
Detects price-indicator divergences where price makes new highs/lows 
but the indicator (like RSI or MACD) does not confirm with corresponding 
new highs/lows. This is a reversal signal.

Logic:
- Price makes new low but indicator does not make new low = bullish divergence (buy signal)
- Price makes new high but indicator does not make new high = bearish divergence (sell signal)
"""

import numpy as np
import pandas as pd
from scipy.signal import argrelextrema


def calculate_rsi(prices, window=14):
    """Calculate RSI indicator"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def calculate_macd(prices, fast=12, slow=26, signal=9):
    """Calculate MACD indicator"""
    exp1 = prices.ewm(span=fast, adjust=False).mean()
    exp2 = prices.ewm(span=slow, adjust=False).mean()
    macd = exp1 - exp2
    return macd


def find_extrema(data, order=5):
    """Find local extrema in data"""
    # Find local maxima
    local_max_idx = argrelextrema(data.values, np.greater, order=order)[0]
    # Find local minima
    local_min_idx = argrelextrema(data.values, np.less, order=order)[0]
    
    # Create series with extremum values, NaN elsewhere
    extrema = pd.Series(index=data.index, dtype=float)
    extrema.iloc[local_max_idx] = data.iloc[local_max_idx]
    extrema.iloc[local_min_idx] = data.iloc[local_min_idx]
    
    return extrema, local_max_idx, local_min_idx


def generate_signals(prices, config=None):
    """
    Generate signals based on price-indicator divergence

    Parameters:
    - prices: price series
    - config: dict with optional keys: lookback, indicator_type, indicator_period, order
    """
    if config is None:
        config = {}
    lookback        = config.get("lookback",         10)
    indicator_type  = config.get("indicator_type",  "RSI")
    indicator_period = config.get("indicator_period", 14)
    order           = config.get("order",             5)

    # Calculate the selected indicator
    if indicator_type == 'RSI':
        indicator = calculate_rsi(prices, window=indicator_period)
    elif indicator_type == 'MACD':
        indicator = calculate_macd(prices, fast=indicator_period, slow=26, signal=9)
    else:
        raise ValueError("Indicator type must be 'RSI' or 'MACD'")
    
    # Forward fill to handle NaN values
    indicator = indicator.ffill()
    
    # Find extrema in both price and indicator
    price_extrema, price_max_idx, price_min_idx = find_extrema(prices, order=order)
    ind_extrema, ind_max_idx, ind_min_idx = find_extrema(indicator, order=order)
    
    # Initialize signals
    signals = pd.Series(0.0, index=prices.index)
    
    # Detect bullish divergences (higher low in price, lower low in indicator)
    for i in range(len(price_min_idx)):
        if i > 0:  # Need at least two lows to compare
            price_low_1_idx = price_min_idx[i-1]
            price_low_2_idx = price_min_idx[i]
            
            # Ensure we're looking at recent lows within lookback period
            if (price_low_1_idx >= len(prices) - lookback*2 and 
                price_low_2_idx >= len(prices) - lookback):
                
                price_low_1_val = prices.iloc[price_low_1_idx]
                price_low_2_val = prices.iloc[price_low_2_idx]
                
                # Find corresponding indicator lows
                closest_ind_low_1_idx = min(ind_max_idx, key=lambda x: abs(x - price_low_1_idx)) if len(ind_max_idx) > 0 else price_low_1_idx
                closest_ind_low_2_idx = min(ind_max_idx, key=lambda x: abs(x - price_low_2_idx)) if len(ind_max_idx) > 0 else price_low_2_idx
                
                # Adjust to find actual nearby minimums for indicator
                ind_low_1_range_start = max(0, price_low_1_idx - order)
                ind_low_1_range_end = min(len(indicator), price_low_1_idx + order)
                ind_low_2_range_start = max(0, price_low_2_idx - order)
                ind_low_2_range_end = min(len(indicator), price_low_2_idx + order)
                
                if ind_low_1_range_end > ind_low_1_range_start and ind_low_2_range_end > ind_low_2_range_start:
                    ind_low_1_val = indicator.iloc[ind_low_1_range_start:ind_low_1_range_end].min()
                    ind_low_2_val = indicator.iloc[ind_low_2_range_start:ind_low_2_range_end].min()
                    
                    # Check for bullish divergence: lower low in indicator, higher low in price
                    if price_low_2_val > price_low_1_val and ind_low_2_val < ind_low_1_val:
                        signals.iloc[price_low_2_idx] = 1.0  # Buy signal
    
    # Detect bearish divergences (lower high in price, higher high in indicator)
    for i in range(len(price_max_idx)):
        if i > 0:  # Need at least two highs to compare
            price_high_1_idx = price_max_idx[i-1]
            price_high_2_idx = price_max_idx[i]
            
            # Ensure we're looking at recent highs within lookback period
            if (price_high_1_idx >= len(prices) - lookback*2 and 
                price_high_2_idx >= len(prices) - lookback):
                
                price_high_1_val = prices.iloc[price_high_1_idx]
                price_high_2_val = prices.iloc[price_high_2_idx]
                
                # Find corresponding indicator highs
                ind_high_1_range_start = max(0, price_high_1_idx - order)
                ind_high_1_range_end = min(len(indicator), price_high_1_idx + order)
                ind_high_2_range_start = max(0, price_high_2_idx - order)
                ind_high_2_range_end = min(len(indicator), price_high_2_idx + order)
                
                if ind_high_1_range_end > ind_high_1_range_start and ind_high_2_range_end > ind_high_2_range_start:
                    ind_high_1_val = indicator.iloc[ind_high_1_range_start:ind_high_1_range_end].max()
                    ind_high_2_val = indicator.iloc[ind_high_2_range_start:ind_high_2_range_end].max()
                    
                    # Check for bearish divergence: higher high in indicator, lower high in price
                    if price_high_2_val < price_high_1_val and ind_high_2_val > ind_high_1_val:
                        signals.iloc[price_high_2_idx] = 0.0  # Sell signal (exit long)
    
    # Forward fill to maintain positions between signals
    signals = signals.ffill()
    
    # Return the signal series
    return signals.fillna(0.0)


# Define strategy metadata
STRATEGY = {
    "name": "Divergence Strategy",
    "category": "Combo",
    "subcategory": "Technical Combos",
    "id": "COMBO-03",
    "description": "Detects price-indicator divergences where price makes new highs/lows but the indicator does not confirm with corresponding new highs/lows.",
    "parameters": {
        "lookback": 10,
        "indicator_type": "RSI",
        "indicator_period": 14,
        "order": 5
    },
    "tags": ["divergence", "rsi", "macd", "reversal", "technical"]
}


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python COMBO-03.py SPY              # downloads daily prices with yfinance
#   python COMBO-03.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

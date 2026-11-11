import pandas as pd
import numpy as np

STRATEGY = {
    "id": "COMBO-01",
    "name": "Bollinger-Keltner Squeeze",
    "mode": "single",
    "tags": ["Volatility", "Breakout", "Technical"],
    "summary": "Trade volatility expansion after squeeze.",
    "description": "When Bollinger Bands contract inside Keltner Channel, volatility is compressed (squeeze). When squeeze releases, trade in direction of momentum. Captures explosive moves.",
    "bestOn": "Markets with volatility clustering",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["BB_Period = 20", "BB_Std = 2.0", "KC_Period = 20", "KC_Mult = 1.5"],
        "Indicators": [
            "Bollinger Bands = SMA ± 2*StdDev",
            "Keltner Channel = EMA ± 1.5*ATR",
            "Squeeze = BB inside KC",
            "Momentum = Price - Average(High+Low+Close)/3",
        ],
        "Entry": [
            "Squeeze releases (BB outside KC)",
            "Buy if momentum positive, sell if negative",
        ],
        "Exit": ["Opposite signal or momentum fades"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Wait for confirmed squeeze release"],
    },
    "notes": [
        "John Carter's TTM Squeeze concept",
        "Low volatility precedes high volatility",
        "Squeeze duration indicates potential move size",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def calculate_atr(prices, period=20):
    """Calculate Average True Range for single series."""
    close = prices
    # Approximate TR using close-to-close
    tr = close.diff().abs()
    atr = tr.rolling(period).mean()
    return atr


def generate_signals(prices, config=None):
    """
    Volatility squeeze strategy.
    Detects when BB width is low relative to recent history (squeeze),
    then enters on positive momentum when squeeze releases.
    """
    config = config or {}
    bb_period = int(config.get("bb_period", 20))
    bb_std = float(config.get("bb_std", 2.0))
    momentum_period = int(config.get("momentum_period", 12))
    squeeze_lookback = int(config.get("squeeze_lookback", 50))  # For percentile calc
    squeeze_percentile = float(config.get("squeeze_percentile", 25))  # Low vol threshold
    max_hold = int(config.get("max_hold", 20))

    close = prices.copy()

    # Bollinger Bands
    bb_ma = close.rolling(bb_period).mean()
    bb_std_val = close.rolling(bb_period).std()
    bb_upper = bb_ma + bb_std * bb_std_val
    bb_lower = bb_ma - bb_std * bb_std_val

    # BB width as % of price (volatility measure)
    bb_width = (bb_upper - bb_lower) / (bb_ma + 1e-10)

    # Squeeze: BB width in bottom percentile of recent history
    bb_width_percentile = bb_width.rolling(squeeze_lookback).apply(
        lambda x: (x.iloc[-1] <= np.percentile(x, squeeze_percentile)) if len(x) >= 10 else False,
        raw=False
    )
    squeeze_on = bb_width_percentile > 0

    # Momentum (price vs short-term average)
    momentum = close - close.rolling(momentum_period).mean()

    # Momentum turning positive (crossover)
    momentum_cross_up = (momentum > 0) & (momentum.shift(1) <= 0)

    signal = pd.Series(0.0, index=close.index)

    warmup = max(bb_period, momentum_period, squeeze_lookback)

    in_position = False
    entry_price = 0
    bars_in_position = 0
    was_in_squeeze = False

    for i in range(warmup, len(close)):
        curr_squeeze = squeeze_on.iloc[i] if pd.notna(squeeze_on.iloc[i]) else False
        curr_momentum = momentum.iloc[i] if pd.notna(momentum.iloc[i]) else 0

        # Track squeeze state
        if curr_squeeze:
            was_in_squeeze = True

        # Squeeze release: was in squeeze recently, now out with momentum
        squeeze_releasing = was_in_squeeze and not curr_squeeze and curr_momentum > 0

        if not in_position:
            # Entry: squeeze releases with positive momentum
            if squeeze_releasing:
                signal.iloc[i] = 1.0
                in_position = True
                entry_price = close.iloc[i]
                bars_in_position = 0
                was_in_squeeze = False
            else:
                signal.iloc[i] = 0.0
        else:
            bars_in_position += 1

            # Exit conditions
            price_return = (close.iloc[i] - entry_price) / entry_price

            if curr_momentum < 0 or price_return < -0.05 or bars_in_position > max_hold:
                signal.iloc[i] = 0.0
                in_position = False
            else:
                signal.iloc[i] = 1.0

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python COMBO-01.py SPY              # downloads daily prices with yfinance
#   python COMBO-01.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

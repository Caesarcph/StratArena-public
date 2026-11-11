import pandas as pd
import numpy as np

STRATEGY = {
    "id": "TREND-10",
    "name": "Ichimoku Cloud",
    "mode": "single",
    "tags": ["Trend", "Technical", "Japanese"],
    "summary": "Trade based on Ichimoku Cloud signals.",
    "description": "Ichimoku Kinko Hyo (One Glance Equilibrium Chart). Uses multiple lines to identify trend, momentum, and support/resistance. Price above cloud is bullish, below is bearish.",
    "bestOn": "Trending markets",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["Tenkan = 9", "Kijun = 26", "Senkou = 52"],
        "Indicators": [
            "Tenkan-sen = (9-day high + 9-day low) / 2",
            "Kijun-sen = (26-day high + 26-day low) / 2",
            "Senkou Span A = (Tenkan + Kijun) / 2, shifted 26 days forward",
            "Senkou Span B = (52-day high + 52-day low) / 2, shifted 26 days forward",
        ],
        "Entry": [
            "Buy when price > Cloud AND Tenkan > Kijun",
            "Strong signal if Chikou (lagging) also confirms",
        ],
        "Exit": ["Price falls below Cloud OR Tenkan < Kijun"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Cloud acts as support/resistance"],
    },
    "notes": [
        "Developed by Goichi Hosoda in 1930s Japan",
        "Cloud (Kumo) provides visual support/resistance",
        "Multiple confirmation signals reduce false entries",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def calculate_ichimoku(prices_df, tenkan_period=9, kijun_period=26, senkou_period=52):
    """Calculate Ichimoku Cloud components."""
    # For single series input, simulate high/low
    if isinstance(prices_df, pd.Series):
        close = prices_df
        high = close
        low = close
    else:
        high = prices_df['High'] if 'High' in prices_df.columns else prices_df
        low = prices_df['Low'] if 'Low' in prices_df.columns else prices_df
        close = prices_df['Close'] if 'Close' in prices_df.columns else prices_df

    # Tenkan-sen (Conversion Line)
    tenkan_high = high.rolling(tenkan_period).max()
    tenkan_low = low.rolling(tenkan_period).min()
    tenkan_sen = (tenkan_high + tenkan_low) / 2

    # Kijun-sen (Base Line)
    kijun_high = high.rolling(kijun_period).max()
    kijun_low = low.rolling(kijun_period).min()
    kijun_sen = (kijun_high + kijun_low) / 2

    # Senkou Span A (Leading Span A) - shifted forward 26 periods
    senkou_span_a = ((tenkan_sen + kijun_sen) / 2).shift(kijun_period)

    # Senkou Span B (Leading Span B) - shifted forward 26 periods
    senkou_high = high.rolling(senkou_period).max()
    senkou_low = low.rolling(senkou_period).min()
    senkou_span_b = ((senkou_high + senkou_low) / 2).shift(kijun_period)

    # Chikou Span (Lagging Span) - close shifted back 26 periods
    chikou_span = close.shift(-kijun_period)

    return tenkan_sen, kijun_sen, senkou_span_a, senkou_span_b, chikou_span


def generate_signals(prices, config=None):
    config = config or {}
    tenkan_period = int(config.get("tenkan", 9))
    kijun_period = int(config.get("kijun", 26))
    senkou_period = int(config.get("senkou", 52))

    close = prices.copy()

    # Calculate Ichimoku components
    tenkan, kijun, span_a, span_b, chikou = calculate_ichimoku(
        close, tenkan_period, kijun_period, senkou_period
    )

    # Cloud top and bottom
    cloud_top = pd.concat([span_a, span_b], axis=1).max(axis=1)
    cloud_bottom = pd.concat([span_a, span_b], axis=1).min(axis=1)

    signal = pd.Series(0.0, index=close.index)

    warmup = senkou_period + kijun_period

    for i in range(warmup, len(close)):
        # Price position relative to cloud
        price_above_cloud = close.iloc[i] > cloud_top.iloc[i]
        price_below_cloud = close.iloc[i] < cloud_bottom.iloc[i]

        # Tenkan/Kijun cross
        tenkan_above_kijun = tenkan.iloc[i] > kijun.iloc[i]

        # Bullish conditions
        if price_above_cloud and tenkan_above_kijun:
            signal.iloc[i] = 1.0
        # Bearish or neutral
        elif price_below_cloud or not tenkan_above_kijun:
            signal.iloc[i] = 0.0
        else:
            # In the cloud - maintain previous position
            signal.iloc[i] = signal.iloc[i - 1]

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python TREND-10.py SPY              # downloads daily prices with yfinance
#   python TREND-10.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

import pandas as pd
import numpy as np

STRATEGY = {'id': 'TREND-10',
 'name': 'Ichimoku Cloud',
 'mode': 'single',
 'tags': ['Trend', 'Technical', 'Japanese'],
 'summary': 'Uses a close-based Ichimoku cloud and Tenkan–Kijun confirmation.',
 'description': 'The backtest builds the Ichimoku lines from rolling closing-price extremes. '
                'It goes long above the cloud when Tenkan is above Kijun and uses the lower '
                'cloud boundary and line relationship to exit.',
 'bestOn': 'Trending markets',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Weeks',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['Go long when the close is above the cloud top and Tenkan is above '
                          'Kijun.'],
                'Exit': ['Go to cash when the close is below the cloud bottom or Tenkan is at '
                         'or below Kijun. Otherwise keep the previous target if the long '
                         'condition does not trigger.'],
                'Indicators': ['Tenkan and Kijun are midpoints between the highest and lowest '
                               'closes in their windows.',
                               'Span A is the midpoint of Tenkan and Kijun. Span B is the '
                               'midpoint of highest and lowest closes over 52 bars. Both use '
                               'values from kijun bars earlier to form the current cloud.'],
                'Inputs': ['Default: tenkan = 9, kijun = 26, senkou = 52.'],
                'Position sizing': ['100% long or cash.']},
 'notes': ['The Chikou lagging line is calculated by the source helper. The trading rule uses '
           'Tenkan, Kijun and the two cloud spans.',
           'The first 78 bars are flat at the default settings.'],
 'updated': '2025-06-01',
 'recommendedCompare': ['SPY', 'GLD']}


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
#   python TREND-10.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

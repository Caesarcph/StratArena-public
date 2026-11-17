import pandas as pd
import numpy as np

STRATEGY = {'id': 'RISK-01',
 'name': 'Drawdown Control',
 'mode': 'single',
 'tags': ['Risk Management', 'Defensive', 'Overlay'],
 'summary': 'Reduces long exposure as the tested market falls from its rolling closing high.',
 'description': "The rule measures the tested instrument's drawdown from its rolling peak. "
                'The daily long target decreases linearly above the drawdown threshold, '
                'subject to a minimum allocation.',
 'bestOn': 'Single instruments with recurring price drawdowns',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['At d ≤ max_drawdown set the long target to 100%. Start the first '
                          'bar fully long.'],
                'Exit': ['At d > max_drawdown use max(min_position, 1 − (d − max_drawdown) × '
                         'scale / max_drawdown). Recompute as the close or rolling high '
                         'changes.'],
                'Indicators': ["Drawdown d is the magnitude of the close's relative shortfall "
                               'from the rolling maximum close. Early windows use the '
                               'available closes.'],
                'Inputs': ['max_drawdown = 0.10, scale = 0.5, lookback = 252, min_position = '
                           '0.10.'],
                'Position sizing': ['Long allocation ranges from 10% to 100% with the '
                                    'defaults.']},
 'notes': ['The threshold governs allocation and is not a realized loss limit.',
           'The Pine download attempts to rebalance each confirmed close. Symbol lot sizes '
           'and simulated fills can affect the realized weight.'],
 'updated': '2025-06-01',
 'recommendedCompare': ['SPY', 'GLD']}


def generate_signals(prices, config=None):
    config = config or {}
    max_drawdown = float(config.get("max_drawdown", 0.10))
    scale_factor = float(config.get("scale", 0.5))
    lookback = int(config.get("lookback", 252))
    min_position = float(config.get("min_position", 0.1))

    close = prices.copy()
    n = len(close)

    # Calculate rolling maximum and drawdown
    rolling_max = close.rolling(lookback, min_periods=1).max()
    drawdown = (close - rolling_max) / rolling_max

    signal = pd.Series(1.0, index=close.index)  # Start fully invested

    for i in range(1, n):
        current_dd = abs(drawdown.iloc[i])

        if current_dd <= max_drawdown:
            # No significant drawdown - full position
            signal.iloc[i] = 1.0
        else:
            # Drawdown exceeds threshold - reduce position
            excess_dd = current_dd - max_drawdown

            # Linear reduction based on excess drawdown
            reduction = min(excess_dd / max_drawdown * scale_factor, 1 - min_position)
            signal.iloc[i] = max(1.0 - reduction, min_position)

    return signal.fillna(1.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python RISK-01.py SPY              # downloads daily prices with yfinance
#   python RISK-01.py prices.csv       # daily Date and Close; include Open, High, Low for OHLC rules
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

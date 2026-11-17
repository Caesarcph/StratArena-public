import pandas as pd
import numpy as np

STRATEGY = {'id': 'MACRO-03',
 'name': 'Flight to Quality',
 'mode': 'portfolio',
 'tags': ['Macro', 'Risk Management', 'Safe Haven'],
 'summary': 'Switches fully into gold when SPY drawdown or volatility signals stress.',
 'description': 'The daily rule holds an equal-weight basket outside stress and switches to '
                'GLD when either SPY stress measure triggers. It waits for a sustained clear '
                'period before restoring the risk basket.',
 'bestOn': 'Equity stress rules with a dedicated gold allocation',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days to weeks',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['After the 30-row warmup, set the target to 100% GLD when either '
                          'threshold is exceeded.'],
                'Exit': ['Start the recovery timer on the first clear observation and return '
                         'to the risk basket 10 observations later if stress stays clear. A '
                         'new trigger resets the timer.'],
                'Indicators': ["Measure drawdown from SPY's highest closing price observed so "
                               'far. Use the sample standard deviation of 20 daily returns '
                               'multiplied by √252 for annualized volatility.'],
                'Inputs': ['Default drawdown threshold 5%, annualized volatility threshold '
                           '25%, volatility lookback 20 daily returns, recovery timer 10 row '
                           'intervals.'],
                'Position sizing': ['Use 100% GLD under stress and equal weights across the '
                                    'nine other assets outside stress.']},
 'notes': ['The site backtest aligns SPY, GLD, USO, EURUSD=X, DBC, SLV, DBA, UNG, BTC-USD and '
           'ETH-USD on their common completed sessions. Its SPY display label identifies the '
           'basket.',
           'The risk basket includes all nine non-GLD assets. The site applies the daily '
           'target to the next common return interval.'],
 'updated': '2026-01-12',
 'recommendedCompare': ['SPY', 'GLD']}


def generate_portfolio(prices, config=None):
    """Generate portfolio weights based on flight to quality signals."""
    config = config or {}

    dd_trigger = float(config.get("dd_trigger", 0.05))
    vol_trigger = float(config.get("vol_trigger", 0.25))
    vol_lookback = int(config.get("vol_lookback", 20))
    recovery_days = int(config.get("recovery_days", 10))

    assets = list(prices.columns)
    n = len(prices)

    weights = pd.DataFrame(0.0, index=prices.index, columns=assets)

    if len(assets) < 2:
        if len(assets) == 1:
            weights[assets[0]] = 1.0
        return weights

    # Identify risk and safe haven assets
    risk_asset = "SPY" if "SPY" in assets else assets[0]
    safe_asset = "GLD" if "GLD" in assets else assets[1]

    risk_prices = prices[risk_asset]

    # Calculate stress indicators
    returns = risk_prices.pct_change()
    volatility = returns.rolling(vol_lookback).std() * np.sqrt(252)

    # Drawdown
    rolling_max = risk_prices.expanding().max()
    drawdown = (risk_prices - rolling_max) / rolling_max

    warmup = vol_lookback + 10
    in_stress = False
    stress_exit_day = None

    for i in range(warmup, n):
        curr_dd = drawdown.iloc[i]
        curr_vol = volatility.iloc[i]

        if pd.isna(curr_dd) or pd.isna(curr_vol):
            weights.iloc[i] = weights.iloc[i-1]
            continue

        # Check for stress trigger
        stress_signal = (curr_dd < -dd_trigger) or (curr_vol > vol_trigger)

        if not in_stress:
            if stress_signal:
                # Enter stress mode - flight to quality
                in_stress = True
                stress_exit_day = None
        else:
            # In stress mode - check for recovery
            if not stress_signal:
                if stress_exit_day is None:
                    stress_exit_day = i
                elif i - stress_exit_day >= recovery_days:
                    # Recovery period complete
                    in_stress = False
                    stress_exit_day = None
            else:
                # Still stressed
                stress_exit_day = None

        # Allocate based on regime
        if in_stress:
            # Flight to quality - safe haven
            weights.loc[weights.index[i], safe_asset] = 1.0
            weights.loc[weights.index[i], risk_asset] = 0.0
        else:
            # Normal - risk assets
            # Distribute among risk assets
            risk_assets = [a for a in assets if a not in [safe_asset]]
            if risk_assets:
                per_asset = 1.0 / len(risk_assets)
                for a in risk_assets:
                    weights.loc[weights.index[i], a] = per_asset
            else:
                weights.loc[weights.index[i], risk_asset] = 1.0

    return weights.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MACRO-03.py                      # uses STRATEGY.universe, or the site's configured markets
#   python MACRO-03.py SPY GLD USO          # or your own symbols
#   python MACRO-03.py closes.csv           # or a CSV: Date column plus one close column per asset
#
# This default-parameter example does not replay the site's walk-forward fits
# or archived data. Evidence downloads replay the published run's recorded
# arithmetic and include archived source. Recomputing strategy decisions needs
# the exact original inputs, which may not be public.
# Convention, same as the site: weights decided at the close of day t earn the
# returns of day t+1. Results are before trading costs. Not investment advice.
# ---------------------------------------------------------------------------
DEFAULT_UNIVERSE = ['SPY', 'GLD', 'USO', 'EURUSD=X', 'DBC', 'SLV', 'DBA', 'UNG', 'BTC-USD', 'ETH-USD']


def _load_closes(sources):
    if len(sources) == 1 and sources[0].lower().endswith(".csv"):
        frame = pd.read_csv(sources[0], index_col=0, parse_dates=True)
    else:
        if len(sources) < 2 or len(set(sources)) != len(sources):
            raise ValueError("A basket needs at least two distinct symbols (or one CSV file).")
        import yfinance as yf
        try:
            downloaded = yf.download(list(sources), start="2010-01-01", auto_adjust=True, progress=False)
        except Exception as error:
            raise ValueError("Could not download daily closes: " + str(error)) from error
        if not isinstance(downloaded, pd.DataFrame) or not isinstance(downloaded.columns, pd.MultiIndex):
            raise ValueError("Expected daily Close columns for each requested symbol.")
        levels = [level for level in range(downloaded.columns.nlevels)
                  if "Close" in downloaded.columns.get_level_values(level)]
        if len(levels) != 1:
            raise ValueError("Expected daily Close columns for each requested symbol.")
        frame = downloaded.xs("Close", axis=1, level=levels[0])
        missing = [symbol for symbol in sources if symbol not in frame.columns or frame[symbol].dropna().empty]
        if missing:
            raise ValueError("Missing close data: " + ", ".join(missing))
        # Pair strategies use column positions. Providers may sort ticker names.
        frame = frame.loc[:, list(sources)]
    if isinstance(frame.columns, pd.MultiIndex) or frame.columns.has_duplicates or len(frame.columns) < 2:
        raise ValueError("A basket needs at least two distinct asset columns.")
    if not isinstance(frame.index, pd.DatetimeIndex) or frame.index.hasnans or frame.index.has_duplicates:
        raise ValueError("Prices need unique, valid dates in the first column.")
    try:
        frame = frame.apply(pd.to_numeric, errors="raise")
    except (TypeError, ValueError) as error:
        raise ValueError("Close prices must be numeric.") from error
    import numpy as np
    present = frame.notna()
    if ((~np.isfinite(frame) | (frame <= 0)) & present).any().any():
        raise ValueError("Close prices must be finite and positive.")
    # Keep common observations; do not invent prices for closed or missing markets.
    frame = frame.sort_index().dropna()
    if len(frame) < 2:
        raise ValueError("Need at least two common dated observations for every asset.")
    return frame


if __name__ == "__main__":
    import sys

    try:
        closes = _load_closes(sys.argv[1:] or list(STRATEGY.get("universe", DEFAULT_UNIVERSE)))
    except (ValueError, OSError) as error:
        sys.exit("Cannot run example: " + str(error))
    weights = generate_portfolio(closes).reindex(closes.index).ffill().fillna(0.0)
    daily = (closes.pct_change().fillna(0.0) * weights.shift(1)).sum(axis=1)
    equity = (1 + daily).cumprod()
    years = (closes.index[-1] - closes.index[0]).days / 365.25
    print(STRATEGY["id"], STRATEGY["name"], "|", closes.index[0].date(), "to", closes.index[-1].date())
    print("Assets         " + ", ".join(map(str, closes.columns)))
    if not weights.ne(0).any().any():
        print("No positions generated. The sample may be shorter than the strategy's lookback/warmup, or no rule triggered.")
    print("Total return   {:+.1%}".format(equity.iloc[-1] - 1))
    print("CAGR           {:+.1%}".format(equity.iloc[-1] ** (1 / years) - 1))
    print("Sharpe         {:.2f}".format(daily.mean() / daily.std() * 252 ** 0.5 if daily.std() else 0.0))
    print("Max drawdown   {:.1%}".format((equity / equity.cummax() - 1).min()))

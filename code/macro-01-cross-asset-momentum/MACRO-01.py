import pandas as pd
import numpy as np

STRATEGY = {'id': 'MACRO-01',
 'name': 'Cross-Asset Momentum',
 'mode': 'portfolio',
 'ruleVersion': 'named-risk-indicators-v2',
 'corrections': ['select-spy-signal-by-symbol'],
 'tags': ['Macro', 'Cross-Asset', 'Leading Indicator'],
 'summary': 'Tilts basket weights according to lagged SPY and GLD momentum.',
 'description': 'A daily score combines the recent mean returns of SPY and GLD with opposite '
                'signs. Its sign changes the relative weights of SPY, USO and GLD.',
 'bestOn': 'Cross-asset allocation with directional risk tilts',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Weeks',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['Multiply inverse volatility for SPY and USO by 1.5 for a positive '
                          'score and 0.3 otherwise. Multiply GLD by 1.5 for a negative score '
                          'and 0.5 otherwise.'],
                'Exit': ['Recompute targets daily after 36 observed rows of warmup.'],
                'Indicators': ['Compute 100 × mean SPY return minus 50 × mean GLD return from '
                               'the lagged history. Use current 20-return annualized sample '
                               'volatility and substitute 15% if the estimate is unavailable '
                               'or below 1%.'],
                'Inputs': ['Default momentum lookback 21 daily returns, signal lag 5 '
                           'sessions, volatility lookback 20 returns.'],
                'Position sizing': ['All other assets use 0.5 times inverse volatility. '
                                    'Normalize the whole basket to 100% long.']},
 'notes': ['The site backtest aligns SPY, GLD, USO, EURUSD=X, DBC, SLV, DBA, UNG, BTC-USD and '
           'ETH-USD on their common completed sessions. Its SPY display label identifies the '
           'basket.',
           'The sign of the score determines the tilt. The site applies the daily target to '
           'the next common return interval.'],
 'updated': '2026-01-11',
 'recommendedCompare': ['SPY', 'GLD']}


def generate_portfolio(prices, config=None):
    """Generate portfolio weights based on cross-asset momentum."""
    config = config or {}

    lookback = int(config.get("lookback", 21))
    lag = int(config.get("lag", 5))  # Use lagged signals
    vol_lookback = int(config.get("vol_lookback", 20))

    assets = list(prices.columns)
    n = len(prices)

    weights = pd.DataFrame(0.0, index=prices.index, columns=assets)

    if len(assets) < 2:
        return weights

    # Calculate returns and momentum for each asset
    returns = prices.pct_change()
    momentum = {}
    volatility = {}
    for asset in assets:
        momentum[asset] = returns[asset].rolling(lookback).mean()
        volatility[asset] = returns[asset].rolling(vol_lookback).std() * np.sqrt(252)

    # Identify asset types (simplified mapping)
    # SPY = equity (risk indicator)
    # GLD = safe haven (risk-off indicator)
    # USO = commodity (follows risk)
    # EURUSD = FX (risk sentiment)

    warmup = max(lookback, vol_lookback) + lag + 10

    for i in range(warmup, n):
        # Get lagged signals (what happened 'lag' days ago)
        lag_idx = i - lag

        # SPY momentum as risk appetite indicator
        spy_mom = momentum["SPY"].iloc[lag_idx] if "SPY" in momentum else 0
        gld_mom = momentum["GLD"].iloc[lag_idx] if "GLD" in momentum else 0

        # Composite risk signal
        # Positive SPY momentum + negative GLD momentum = risk-on
        # Negative SPY momentum + positive GLD momentum = risk-off
        risk_signal = 0
        if not pd.isna(spy_mom):
            risk_signal += spy_mom * 100  # Scale for visibility
        if not pd.isna(gld_mom):
            risk_signal -= gld_mom * 50  # GLD inverse contributes less

        # Allocate based on risk signal
        total_weight = 0
        raw_weights = {}

        for j, asset in enumerate(assets):
            vol = volatility[asset].iloc[i]
            if pd.isna(vol) or vol < 0.01:
                vol = 0.15  # Default volatility

            # Inverse volatility base weight
            inv_vol = 1.0 / vol

            if asset in ["SPY", "USO"]:
                # Risk assets - allocate more when risk-on
                if risk_signal > 0:
                    raw_weights[asset] = inv_vol * 1.5
                else:
                    raw_weights[asset] = inv_vol * 0.3
            elif asset == "GLD":
                # Safe haven - allocate more when risk-off
                if risk_signal < 0:
                    raw_weights[asset] = inv_vol * 1.5
                else:
                    raw_weights[asset] = inv_vol * 0.5
            else:
                # Neutral assets (FX)
                raw_weights[asset] = inv_vol * 0.5

            total_weight += raw_weights[asset]

        # Normalize weights
        if total_weight > 0:
            for asset in assets:
                weights.loc[weights.index[i], asset] = raw_weights.get(asset, 0) / total_weight

    return weights.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MACRO-01.py                      # uses STRATEGY.universe, or the site's configured markets
#   python MACRO-01.py SPY GLD USO          # or your own symbols
#   python MACRO-01.py closes.csv           # or a CSV: Date column plus one close column per asset
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

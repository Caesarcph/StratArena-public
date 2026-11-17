import pandas as pd
import numpy as np

STRATEGY = {'id': 'MACRO-02',
 'name': 'Risk-On/Risk-Off Switch',
 'mode': 'portfolio',
 'tags': ['Macro', 'Regime', 'Risk Sentiment'],
 'summary': 'Switches among risk-on, balanced and gold allocations using three SPY signals.',
 'description': 'The rule averages scores from volatility percentile, the moving-average '
                'trend and trailing momentum. It selects one of three daily allocations.',
 'bestOn': 'Multi-asset allocations with an explicit gold sleeve',
 'frequency': 'Daily',
 'assetClasses': ['Index', 'Commodity', 'FX'],
 'holdingPeriod': 'Days to weeks',
 'instruments': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'pseudocode': {'Entry': ['After the 262-row warmup, an average above 0.3 sets 100% to the '
                          'risk group. An average below −0.3 sets 100% to GLD.'],
                'Exit': ['Recalculate daily. Scores between those thresholds, including '
                         'equality, split 50% risk and 50% GLD.'],
                'Indicators': ['Volatility percentile below 30 adds 1 and above 70 subtracts '
                               '1. A close above the SMA adds 1 and otherwise subtracts 1.',
                               'Momentum above 0 adds 1 and below −5% subtracts 1. Average '
                               'the available component scores.'],
                'Inputs': ['Default volatility lookback 20 daily returns, volatility '
                           'percentile lookback 252 estimates, trend SMA 50 sessions and '
                           'momentum lookback 63 sessions.'],
                'Position sizing': ['Divide the risk allocation equally among its nine '
                                    'members.']},
 'notes': ['The site backtest aligns SPY, GLD, USO, EURUSD=X, DBC, SLV, DBA, UNG, BTC-USD and '
           'ETH-USD on their common completed sessions. Its SPY display label identifies the '
           'basket.',
           'The risk group consists of every configured asset except GLD. The published '
           'results apply targets to the next common return interval.',
           'The legacy vol_threshold parameter has no effect. Volatility enters the score '
           'through its percentile.'],
 'updated': '2026-01-11',
 'recommendedCompare': ['SPY', 'GLD']}


def generate_portfolio(prices, config=None):
    """Generate portfolio weights based on risk-on/risk-off regime."""
    config = config or {}

    vol_lookback = int(config.get("vol_lookback", 20))
    mom_lookback = int(config.get("mom_lookback", 63))
    trend_lookback = int(config.get("trend_lookback", 50))
    vol_threshold = float(config.get("vol_threshold", 0.20))

    assets = list(prices.columns)
    n = len(prices)

    weights = pd.DataFrame(0.0, index=prices.index, columns=assets)

    if len(assets) < 2:
        return weights

    # Calculate indicators for the main risk asset (SPY or first asset)
    main_asset = "SPY" if "SPY" in assets else assets[0]
    safe_asset = "GLD" if "GLD" in assets else assets[1] if len(assets) > 1 else assets[0]

    main_prices = prices[main_asset]
    returns = main_prices.pct_change()

    # Volatility (annualized)
    volatility = returns.rolling(vol_lookback).std() * np.sqrt(252)

    # Volatility percentile (rolling)
    def vol_percentile(x):
        if len(x) < 20:
            return 50
        return (x < x.iloc[-1]).sum() / len(x) * 100

    vol_pct = volatility.rolling(252).apply(vol_percentile, raw=False)

    # Trend (price above MA)
    ma = main_prices.rolling(trend_lookback).mean()
    trend = main_prices > ma

    # Momentum
    momentum = main_prices.pct_change(mom_lookback)

    # Calculate risk score (0 = risk-off, 1 = risk-on)
    warmup = max(vol_lookback, mom_lookback, trend_lookback, 252) + 10

    # Classify assets
    risk_assets = []
    safe_assets = []
    for asset in assets:
        if asset in ["SPY", "USO"]:
            risk_assets.append(asset)
        elif asset in ["GLD"]:
            safe_assets.append(asset)
        else:
            # EURUSD is neutral, slight risk tilt
            risk_assets.append(asset)

    for i in range(warmup, n):
        curr_vol = volatility.iloc[i]
        curr_vol_pct = vol_pct.iloc[i]
        curr_trend = trend.iloc[i]
        curr_mom = momentum.iloc[i]

        # Calculate risk score components
        score = 0.0
        count = 0

        # Volatility component (low vol = risk-on)
        if not pd.isna(curr_vol_pct):
            if curr_vol_pct < 30:
                score += 1.0  # Low vol = risk-on
            elif curr_vol_pct > 70:
                score -= 1.0  # High vol = risk-off
            count += 1

        # Trend component
        if not pd.isna(curr_trend):
            score += 1.0 if curr_trend else -1.0
            count += 1

        # Momentum component
        if not pd.isna(curr_mom):
            if curr_mom > 0:
                score += 1.0
            elif curr_mom < -0.05:
                score -= 1.0
            count += 1

        if count == 0:
            weights.iloc[i] = weights.iloc[i-1]
            continue

        # Normalize score to [-1, 1]
        avg_score = score / count

        # Determine allocation
        if avg_score > 0.3:
            # Risk-On: allocate to risk assets
            risk_weight = 1.0
            safe_weight = 0.0
        elif avg_score < -0.3:
            # Risk-Off: allocate to safe assets
            risk_weight = 0.0
            safe_weight = 1.0
        else:
            # Neutral: balanced allocation
            risk_weight = 0.5
            safe_weight = 0.5

        # Distribute weights
        if risk_assets:
            per_risk = risk_weight / len(risk_assets)
            for asset in risk_assets:
                weights.loc[weights.index[i], asset] = per_risk

        if safe_assets:
            per_safe = safe_weight / len(safe_assets)
            for asset in safe_assets:
                weights.loc[weights.index[i], asset] = per_safe

    return weights.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MACRO-02.py                      # uses STRATEGY.universe, or the site's configured markets
#   python MACRO-02.py SPY GLD USO          # or your own symbols
#   python MACRO-02.py closes.csv           # or a CSV: Date column plus one close column per asset
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

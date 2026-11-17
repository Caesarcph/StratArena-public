import pandas as pd

STRATEGY = {'id': 'CARRY-01',
 'name': 'FX Carry',
 'mode': 'portfolio',
 'ruleVersion': 'monthly-prior-observation-v2',
 'corrections': ['causal-monthly-decision', 'carry-monthly-targets'],
 'targetTiming': 'First observed session of a new month, using the prior observation; engine '
                 'applies one-row lag.',
 'tags': ['Carry', 'FX'],
 'summary': 'Ranks recent price returns and holds the top two when basket volatility permits.',
 'description': 'FX Carry is the historical name. The basket uses trailing price returns as a '
                'carry proxy across several asset classes. The rule uses closing prices and '
                'long positions only.',
 'bestOn': 'Cross-asset rotation with a volatility filter',
 'frequency': 'Monthly',
 'assetClasses': ['FX'],
 'holdingPeriod': '1 Month',
 'instruments': ['FX-CARRY'],
 'universe': ['SPY', 'GLD', 'USO', 'EURUSD=X'],
 'portfolioSymbol': 'FX-CARRY',
 'portfolioName': 'FX Carry Basket',
 'pseudocode': {'Entry': ['At rebalance, select the two highest available returns. Returns '
                          'can be negative.'],
                'Exit': ['At a monthly decision, go to cash if average annualized volatility '
                         'exceeds 20% or there are no available ranking scores. Carry targets '
                         'between monthly decisions.'],
                'Indicators': ['Rank trailing 20-session closing-price returns. Average the '
                               "assets' 60-return sample standard deviations annualized by "
                               '√252.'],
                'Inputs': ['Default lookback 20 sessions, top 2 assets, volatility lookback '
                           '60 sessions, volatility threshold 20%.'],
                'Position sizing': ['Equal long weights among selected assets.']},
 'notes': ['The basket uses the common completed sessions of SPY, GLD, USO and EURUSD=X.',
           'Set targets on the first common session observed in a new month using the '
           'preceding completed session. The target takes effect on the next available return '
           'interval.',
           'Ranking can start before the volatility history is available. The filter applies '
           'when a basket-average estimate exists.'],
 'updated': '2025-03-02',
 'recommendedCompare': ['FX-CARRY']}


def generate_portfolio(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 20))
    top_n = int(config.get("top_n", 2))
    vol_lookback = int(config.get("vol_lookback", 60))
    vol_threshold = float(config.get("vol_threshold", 0.2))

    returns = prices.pct_change().fillna(0.0)
    carry_proxy = prices.pct_change(lookback)
    realized = returns.rolling(vol_lookback).std() * (252**0.5)
    months = prices.index.to_period("M")
    rebalance_rows = [i for i in range(1, len(prices)) if months[i] != months[i - 1]]
    weights = pd.DataFrame(float("nan"), index=prices.index, columns=prices.columns)

    # Missing decision rows retain targets; a rejected volatility filter must
    # instead publish an explicit all-cash vector. The engine owns execution lag.
    for idx in rebalance_rows:
        date = prices.index[idx]
        weights.loc[date] = 0.0
        avg_vol = realized.iloc[idx - 1].mean()
        if pd.notna(avg_vol) and avg_vol > vol_threshold:
            continue
        scores = carry_proxy.iloc[idx - 1].dropna()
        if scores.empty:
            continue
        winners = scores.nlargest(top_n).index
        weights.loc[date, winners] = 1.0 / len(winners)

    return weights.ffill().fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python CARRY-01.py                      # uses STRATEGY.universe, or the site's configured markets
#   python CARRY-01.py SPY GLD USO          # or your own symbols
#   python CARRY-01.py closes.csv           # or a CSV: Date column plus one close column per asset
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

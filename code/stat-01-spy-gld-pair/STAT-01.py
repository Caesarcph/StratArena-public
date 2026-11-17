import pandas as pd
import numpy as np

STRATEGY = {
    "id": "STAT-01",
    "name": "SPY-GLD Pair",
    "mode": "portfolio",
    "tags": ["Stat Arb", "Pairs"],
    "summary": "Mean-revert the SPY/GLD spread using z-score.",
    "description": "Pairs trading on SPY and GLD with a 60-day spread z-score.",
    "bestOn": "SPY-GLD 1Y Sharpe Top5",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity"],
    "holdingPeriod": "Days",
    "instruments": ["SPY-GLD"],
    "universe": ["SPY", "GLD"],
    "portfolioSymbol": "SPY-GLD",
    "portfolioName": "SPY-GLD Pair",
    "pseudocode": {
        "Inputs": ["Lookback = 60", "EntryZ = 2", "ExitZ = 0"],
        "Indicators": ["Price spread Z-score"],
        "Entry": ["If Z > 2: short spread", "If Z < -2: long spread"],
        "Exit": ["Z returns to 0"],
        "Risk": ["Max holding 20 days"],
    },
    "notes": ["Dollar-neutral spread positions."],
    "updated": "2025-03-02",
    "recommendedCompare": ["SPY-GLD"],
}


def generate_portfolio(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 60))
    entry_z = float(config.get("entry_z", 2))
    exit_z = float(config.get("exit_z", 0))
    max_hold = int(config.get("max_hold", 20))

    spy = prices.iloc[:, 0]
    gld = prices.iloc[:, 1]
    spread = np.log(spy) - np.log(gld)
    mean = spread.rolling(lookback).mean()
    std = spread.rolling(lookback).std()
    zscore = (spread - mean) / std.replace(0, np.nan)

    weights = pd.DataFrame(0.0, index=prices.index, columns=prices.columns)
    position = 0
    hold = 0
    for date in prices.index:
        z = zscore.loc[date]
        if position == 0:
            if z > entry_z:
                position = -1
                hold = 0
            elif z < -entry_z:
                position = 1
                hold = 0
        else:
            hold += 1
            if abs(z) <= exit_z or hold >= max_hold:
                position = 0
        if position == 1:
            weights.loc[date, spy.name] = 0.5
            weights.loc[date, gld.name] = -0.5
        elif position == -1:
            weights.loc[date, spy.name] = -0.5
            weights.loc[date, gld.name] = 0.5

    return weights.ffill().fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python STAT-01.py                      # uses STRATEGY.universe, or the site's configured markets
#   python STAT-01.py SPY GLD USO          # or your own symbols
#   python STAT-01.py closes.csv           # or a CSV: Date column plus one close column per asset
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

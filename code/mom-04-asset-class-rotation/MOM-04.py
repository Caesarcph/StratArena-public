import pandas as pd
import numpy as np

STRATEGY = {
    "id": "MOM-04",
    "name": "Asset Class Rotation",
    "mode": "portfolio",
    "ruleVersion": "monthly-prior-observation-v2",
    "corrections": ["causal-monthly-decision", "preserve-zero-targets"],
    "targetTiming": "First observed session of a new month, using the prior observation; engine applies one-row lag.",
    "tags": ["Momentum", "Tactical", "Rotation"],
    "summary": "Rotate into top-performing asset classes based on momentum.",
    "description": "Classic momentum rotation strategy. Ranks assets by recent returns and allocates to the strongest performers. Uses multi-timeframe momentum and absolute momentum filter.",
    "bestOn": "Diversified asset classes",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Months",
    "instruments": ["ROTATION"],
    "universe": ["SPY", "GLD", "USO", "EURUSD=X"],
    "portfolioSymbol": "ROTATION",
    "portfolioName": "Asset Rotation",
    "pseudocode": {
        "Inputs": ["Lookback = 126 (6 months)", "Top_N = 2", "Absolute_Filter = True"],
        "Indicators": ["N-month return for each asset"],
        "Entry": [
            "1. Rank assets by momentum",
            "2. Select Top N with positive momentum",
            "3. Equal weight allocation",
        ],
        "Exit": ["Monthly rebalance, drop assets with negative momentum"],
        "Risk": ["Absolute momentum filter reduces drawdowns"],
    },
    "notes": [
        "Adapts sector rotation concept to asset classes",
        "Monthly target decisions; synthetic daily-target accounting is applied by the engine",
        "Can go to cash if no positive momentum assets",
    ],
    "updated": "2025-06-01",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_portfolio(prices, config=None):
    config = config or {}
    lookback = int(config.get("lookback", 126))
    top_n = int(config.get("top_n", 2))
    use_absolute_filter = config.get("absolute_filter", True)

    assets = prices.columns.tolist()

    # Calculate momentum
    momentum = pd.DataFrame(index=prices.index, columns=assets)
    for asset in assets:
        momentum[asset] = prices[asset] / prices[asset].shift(lookback) - 1

    weights = pd.DataFrame(np.nan, index=prices.index, columns=assets)

    # Observe a month transition before deciding; never infer the last session
    # from future rows or calendar month-end labels. The engine owns execution lag.
    months = prices.index.to_period("M")
    monthly_idx = np.flatnonzero(months[1:] != months[:-1]) + 1

    for idx in monthly_idx:
        if idx - 1 < lookback:
            continue
        date = prices.index[idx]
        weights.loc[date] = 0.0

        # Rank by momentum
        mom_values = momentum.iloc[idx - 1].dropna()
        ranked = mom_values.sort_values(ascending=False)

        # Select Top N
        selected = ranked.head(top_n)

        if use_absolute_filter:
            # Only keep positive momentum
            selected = selected[selected > 0]

        if len(selected) > 0:
            # Equal weight
            weight_per_asset = 1.0 / len(selected)
            for asset in selected.index:
                weights.loc[date, asset] = weight_per_asset

    # Only absent decisions are filled; zero is an explicit exit/cash target.
    weights = weights.ffill().fillna(0)

    return weights


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python MOM-04.py                      # uses STRATEGY.universe, or the site's configured markets
#   python MOM-04.py SPY GLD USO          # or your own symbols
#   python MOM-04.py closes.csv           # or a CSV: Date column plus one close column per asset
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

import pandas as pd
import numpy as np

STRATEGY = {
    "id": "RISK-03",
    "name": "Stop Loss Overlay",
    "mode": "single",
    "tags": ["Risk Management", "Stop Loss"],
    "summary": "Universal stop loss with cooldown period.",
    "description": "Overlays a stop loss on a base trend strategy. When price drops below entry by stop percentage, exit and wait for cooldown period before re-entering. Protects gains and limits losses.",
    "bestOn": "Any trending market",
    "frequency": "Daily",
    "assetClasses": ["Index", "Commodity", "FX"],
    "holdingPeriod": "Days to weeks",
    "instruments": ["SPY", "GLD", "USO", "EURUSD=X"],
    "pseudocode": {
        "Inputs": ["MA_Period = 50", "Stop_Pct = 5%", "Cooldown = 5 days"],
        "Indicators": ["SMA for trend", "Entry price tracking"],
        "Entry": ["Base signal: Price > SMA", "Only if not in cooldown"],
        "Exit": ["Price drops Stop_Pct from entry", "Or base signal exits"],
        "Position sizing": ["Fixed 100% allocation"],
        "Risk controls": ["Hard stop loss", "Cooldown prevents whipsaws"],
    },
    "notes": [
        "Stop loss is essential risk management",
        "Cooldown period prevents re-entry whipsaws",
        "Can be overlaid on any strategy",
    ],
    "updated": "2026-01-11",
    "recommendedCompare": ["SPY", "GLD"],
}


def generate_signals(prices, config=None):
    config = config or {}
    ma_period = int(config.get("ma_period", 50))
    stop_pct = float(config.get("stop_pct", 0.05))
    cooldown = int(config.get("cooldown", 5))

    close = prices.copy()
    n = len(close)

    # Base trend signal
    ma = close.rolling(ma_period).mean()
    base_signal = (close > ma).astype(float)

    signal = pd.Series(0.0, index=close.index)

    entry_price = None
    cooldown_remaining = 0

    for i in range(ma_period, n):
        prev_signal = signal.iloc[i - 1]

        # Decrease cooldown
        if cooldown_remaining > 0:
            cooldown_remaining -= 1

        if prev_signal == 0:
            # Not in position - check for entry
            if base_signal.iloc[i] == 1 and cooldown_remaining == 0:
                signal.iloc[i] = 1.0
                entry_price = close.iloc[i]
            else:
                signal.iloc[i] = 0.0
        else:
            # In position - check for stop loss or base exit
            if entry_price is not None:
                drawdown = (close.iloc[i] - entry_price) / entry_price

                if drawdown < -stop_pct:
                    # Stop loss triggered
                    signal.iloc[i] = 0.0
                    entry_price = None
                    cooldown_remaining = cooldown
                elif base_signal.iloc[i] == 0:
                    # Base signal exit
                    signal.iloc[i] = 0.0
                    entry_price = None
                else:
                    signal.iloc[i] = 1.0
            else:
                signal.iloc[i] = base_signal.iloc[i]

    return signal.fillna(0.0)


# ---------------------------------------------------------------------------
# Runner added by Quant Arena (https://quantarenas.com/code/) so this file works on its own.
#
#   pip install pandas numpy yfinance
#   python RISK-03.py SPY              # downloads daily prices with yfinance
#   python RISK-03.py prices.csv       # or a CSV with Date, Open, High, Low, Close columns
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

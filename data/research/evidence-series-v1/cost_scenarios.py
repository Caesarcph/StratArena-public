"""Pure full-precision v2 exposure-cost scenarios; no files or provider access.

This is a synthetic target-exposure fee model, not broker-notional accounting.
It excludes financing, borrow, funding, taxes, market impact and forced terminal
liquidation. Fees do not feed back into the recorded target/drift calculation.
"""
from datetime import date
import hashlib
import json
import math
import statistics


DEFAULT_BPS = (0, 5, 10, 25)
MODEL_ID = "synthetic-exposure-cost-v1"
MODEL = {
    "id": MODEL_ID,
    "formula": "(1 + grossReturn) * (1 - rebalanceTurnover * bps / 10000)",
    "feeTiming": "After gross close return, on pre-fee drift-adjusted risky turnover.",
    "feesPaid": "Actual synthetic charges in initial-capital units, distinct from counterfactual terminal wealth drag.",
    "turnover": "One-way risky exposure; includes initial entry and target drift; no terminal liquidation.",
    "limitations": "Synthetic exposure costs, not broker notional; no fee feedback into targets/drift, financing, borrow, funding, taxes or market impact.",
    "benchmark": "Same asset returns and dates; single long buy-and-hold or daily equal-weight long basket.",
    "annualObservations": 252,
    "riskFreeRate": 0,
}


def _hash(value):
    raw = json.dumps(value, sort_keys=True, separators=(",", ":"),
                     allow_nan=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _digest(value):
    if not isinstance(value, str) or len(value) != 64 or any(
            ch not in "0123456789abcdef" for ch in value):
        raise ValueError("Invalid evidence digest")
    return value


def _number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError("Expected a finite number")
    return float(value)


def _day(value):
    if not isinstance(value, str) or date.fromisoformat(value).isoformat() != value:
        raise ValueError("Expected an exact ISO calendar date")
    return value


def _equal(actual, expected, label):
    if not math.isclose(_number(actual), expected, rel_tol=1e-10, abs_tol=1e-10):
        raise ValueError("Recorded arithmetic mismatch: " + label)


def _validate(manifest, records):
    if manifest["schemaVersion"] != 2 or manifest["executionModel"]["id"] != "synthetic-daily-target-v3":
        raise ValueError("Expected v2 synthetic daily target evidence")
    if manifest["executionModel"]["feesBasisPoints"] != 0:
        raise ValueError("Evidence must contain gross, fee-free returns")
    assets = manifest["assets"]
    if (not isinstance(assets, list) or not assets
            or any(not isinstance(asset, str) or not asset for asset in assets)
            or len(set(assets)) != len(assets)):
        raise ValueError("Invalid ordered asset universe")
    kind = manifest["kind"]
    if kind not in ("single", "basket") or (kind == "single" and len(assets) != 1):
        raise ValueError("Evidence kind and asset universe disagree")
    for key in ("strategyId", "symbol"):
        if not isinstance(manifest[key], str) or not manifest[key]:
            raise ValueError("Missing evidence identity field: " + key)
    objects = manifest["objects"]
    identity = {"schemaVersion": 2, "strategyId": manifest["strategyId"],
                "symbol": manifest["symbol"], "inputHash": _digest(manifest["inputHash"]),
                "configHash": _digest(objects["config"]["sha256"]),
                "sourceHash": _digest(objects["source"]["sha256"]),
                "recordHashes": [_digest(ref["sha256"]) for ref in objects["records"]]}
    if identity != manifest["identity"] or _hash(identity) != _digest(manifest["runId"]):
        raise ValueError("Manifest identity mismatch")
    if not isinstance(records, list) or len(records) < 2:
        raise ValueError("Complete history requires at least two observations")
    dates, markets, gross, turnover, groups = [], [], [], [], {}
    previous, wealth = [0.0] * len(assets), 1.0
    for row in records:
        day = _day(row["date"])
        if dates and day <= dates[-1]:
            raise ValueError("Dates must be strictly increasing and unique")
        if set(row["assets"]) != set(assets):
            raise ValueError("Missing or extra asset observation")
        target = [_number(row["assets"][a]["targetWeight"]) for a in assets]
        market = [_number(row["assets"][a]["assetReturn"]) for a in assets]
        if min(market) <= -1 or (not dates and any(market)):
            raise ValueError("Invalid asset return or initial observation")
        gross_now = sum(w * r for w, r in zip(previous, market))
        if gross_now <= -1:
            raise ValueError("Gross equity is nonpositive")
        drift = [w * (1 + r) / (1 + gross_now) for w, r in zip(previous, market)]
        traded = [abs(w - d) for w, d in zip(target, drift)]
        for i, asset in enumerate(assets):
            observation = row["assets"][asset]
            _equal(observation["effectiveWeight"], previous[i], "effective weight")
            _equal(observation["driftedWeight"], drift[i], "drifted weight")
            _equal(observation["rebalanceTurnover"], traded[i], "asset turnover")
        _equal(row["grossReturn"], gross_now, "gross return")
        _equal(row["rebalanceTurnover"], sum(traded), "total turnover")
        if row["rebalanceTurnover"] < 0:
            raise ValueError("Turnover cannot be negative")
        wealth *= 1 + gross_now
        _equal(row["equity"], wealth, "equity")
        dates.append(day)
        markets.append(market)
        gross.append(_number(row["grossReturn"]))
        turnover.append(_number(row["rebalanceTurnover"]))
        groups.setdefault(day[:7], []).append(row)
        previous = target
    hashes = [_hash({"month": month, "assets": assets, "rows": rows})
              for month, rows in groups.items()]
    if hashes != identity["recordHashes"]:
        raise ValueError("Record content does not match manifest monthly hashes")
    if dates[0] != manifest["observedFrom"] or dates[-1] != manifest["observedThrough"]:
        raise ValueError("History endpoints do not match manifest")
    if manifest["summary"]["observations"] != len(records):
        raise ValueError("History length does not match manifest")
    _equal(manifest["summary"]["terminalEquity"], wealth, "terminal equity")
    return assets, dates, markets, gross, turnover


def _benchmark(markets):
    count = len(markets[0])
    target = [1.0 / count] * count
    previous = [0.0] * count
    gross, turnover = [], []
    for market in markets:
        value = sum(w * r for w, r in zip(previous, market))
        if value <= -1:
            raise ValueError("Benchmark gross equity is nonpositive")
        drift = [w * (1 + r) / (1 + value) for w, r in zip(previous, market)]
        gross.append(value)
        turnover.append(sum(abs(w - d) for w, d in zip(target, drift)))
        previous = target
    return gross, turnover


def _path(gross, turnover, bps):
    equity, returns, fees_paid, wealth = [], [], [], 1.0
    for value, traded in zip(gross, turnover):
        fee_fraction = traded * bps / 10000
        factor = (1 + value) * (1 - fee_fraction)
        if not math.isfinite(factor) or factor <= 0:
            raise ValueError("Scenario has a nonpositive or nonfinite net factor")
        pre_fee_wealth = _number(wealth * (1 + value))
        fees_paid.append(_number(pre_fee_wealth * fee_fraction))
        wealth *= factor
        if not math.isfinite(wealth) or wealth <= 0:
            raise ValueError("Scenario equity is nonpositive or nonfinite")
        equity.append(wealth)
        returns.append(factor - 1)
    return {"equity": equity, "netReturns": returns,
            "feesPaid": fees_paid, "feesPaidUnit": "initial-capital-units",
            "grossReturns": list(gross), "turnover": list(turnover)}


def build_cost_scenarios(manifest, records, costs_bps=DEFAULT_BPS):
    """Validate complete v2 records and return gross/net paths without mutation."""
    try:
        assets, dates, markets, gross, turnover = _validate(manifest, records)
    except (KeyError, TypeError, IndexError) as error:
        raise ValueError("Incomplete or malformed v2 evidence") from error
    costs = [_number(value) for value in costs_bps]
    if not costs or min(costs) < 0 or len(set(costs)) != len(costs):
        raise ValueError("Costs must be distinct, nonnegative basis points")
    benchmark_gross, benchmark_turnover = _benchmark(markets)
    return {"model": dict(MODEL), "runId": manifest["runId"],
            "strategyId": manifest["strategyId"], "symbol": manifest["symbol"],
            "kind": manifest["kind"], "assets": list(assets), "dates": dates,
            "assetReturns": markets,
            "scenarios": [{"bps": bps, "strategy": _path(gross, turnover, bps),
                           "benchmark": _path(benchmark_gross, benchmark_turnover, bps)}
                          for bps in sorted(costs)]}


def _metrics(path, first, last, full_history, elapsed_days):
    anchor = 1.0 if full_history else path["equity"][first]
    begin = first if full_history else first + 1
    returns = path["netReturns"][begin:last + 1]
    terminal = _number(path["equity"][last] / anchor)
    peak, drawdown = 1.0, 0.0
    for value in path["equity"][begin:last + 1]:
        normalized = value / anchor
        peak = max(peak, normalized)
        drawdown = min(drawdown, normalized / peak - 1)
    deviation = statistics.stdev(returns) if len(returns) >= 2 else None
    cagr = None
    if elapsed_days > 0:
        try:
            cagr = math.expm1(math.log(terminal) * 365.25 / elapsed_days)
        except OverflowError:
            pass  # An unrepresentable annualized statistic is not infinity.
    return {"totalReturn": terminal - 1, "terminalWealth": terminal,
            "cagr": cagr, "maxDrawdown": drawdown,
            "volatility": deviation * math.sqrt(252) if deviation is not None else None,
            "sharpe": statistics.mean(returns) / deviation * math.sqrt(252)
            if deviation else None,
            "chargedTurnover": _number(sum(path["turnover"][begin:last + 1])),
            "totalFeesPaid": _number(sum(path["feesPaid"][begin:last + 1]) / anchor),
            "feesPaidUnit": "initial-capital-units" if full_history else "start-close-capital-units",
            "returnObservations": len(returns)}


def window_metrics(result, bps, start=None, end=None):
    """Exact endpoints; start=None retains initial entry, explicit start anchors close."""
    if result["model"]["id"] != MODEL_ID:
        raise ValueError("Unknown cost model")
    costs = [item for item in result["scenarios"] if item["bps"] == _number(bps)]
    if len(costs) != 1:
        raise ValueError("Cost scenario was not computed")
    dates = result["dates"]
    try:
        first = 0 if start is None else dates.index(_day(start))
        last = len(dates) - 1 if end is None else dates.index(_day(end))
    except ValueError as error:
        raise ValueError("Window endpoints must be exact observed dates") from error
    if first > last:
        raise ValueError("Window start follows end")
    full = start is None
    days = (date.fromisoformat(dates[last]) - date.fromisoformat(dates[first])).days
    market_begin = first if full else first + 1
    context = {"model": MODEL_ID, "kind": result["kind"], "assets": list(result["assets"]),
               "dates": dates[first:last + 1], "anchor": "initial-capital" if full else "start-close",
               "marketHash": _hash(result["assetReturns"][market_begin:last + 1])}
    item = costs[0]
    strategy = _metrics(item["strategy"], first, last, full, days)
    benchmark = _metrics(item["benchmark"], first, last, full, days)
    return {"runId": result["runId"], "strategyId": result["strategyId"],
            "symbol": result["symbol"], "context": context, "bps": item["bps"],
            "strategy": strategy, "benchmark": benchmark,
            "excessReturn": strategy["totalReturn"] - benchmark["totalReturn"]}


def rank_same_window(windows, metric="totalReturn"):
    """Descending competition ranks; reject unlike universes, dates or costs."""
    if not windows:
        return []
    if metric not in ("totalReturn", "cagr", "sharpe", "maxDrawdown"):
        raise ValueError("Unsupported rank metric")
    context, bps = windows[0]["context"], windows[0]["bps"]
    if any(item["context"] != context or item["bps"] != bps for item in windows):
        raise ValueError("Rank cohort must have identical market, window, anchor and cost")
    if len({item["runId"] for item in windows}) != len(windows):
        raise ValueError("Duplicate run in rank cohort")
    ordered = sorted(windows, key=lambda item: (-_number(item["strategy"][metric]), item["runId"]))
    ranked, previous, rank = [], None, 0
    for number, item in enumerate(ordered, 1):
        value = item["strategy"][metric]
        if previous is None or value != previous:
            rank = number
        ranked.append({"runId": item["runId"], "strategyId": item["strategyId"],
                       "rank": rank, "metric": metric, "value": value})
        previous = value
    return ranked


def break_even_bracket(windows):
    """First sampled crossing of net matched-benchmark excess; no extrapolation.

    The supplied cost grid is the declared bounded search domain. A zero without
    opposite observed signs on either side is not evidence of a crossing. Other
    crossings may exist, including between grid points; uniqueness is not claimed.
    """
    if len(windows) < 2:
        return None
    context, run_id = windows[0]["context"], windows[0]["runId"]
    if any(item["context"] != context or item["runId"] != run_id for item in windows):
        raise ValueError("Break-even requires one run and identical window/market")
    ordered = sorted(windows, key=lambda item: _number(item["bps"]))
    costs = [_number(item["bps"]) for item in ordered]
    if min(costs) < 0 or len(set(costs)) != len(costs):
        raise ValueError("Break-even costs must be distinct and nonnegative")
    previous, zero = None, None
    for item in ordered:
        excess = _number(item["excessReturn"])
        if excess == 0:
            zero = item if previous is not None else None
            continue
        if previous is not None and (excess > 0) != (previous["excessReturn"] > 0):
            low, high = (zero, zero) if zero is not None else (previous, item)
            return {"lowerBps": low["bps"], "upperBps": high["bps"],
                    "lowerExcessReturn": low["excessReturn"],
                    "upperExcessReturn": high["excessReturn"],
                    "objective": "net matched-benchmark excess return",
                    "uniqueness": "Not established; first observed crossing only"}
        previous, zero = item, None
    return None

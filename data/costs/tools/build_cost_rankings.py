"""Stage current cost rankings in a new isolated root; never publish in place."""
import argparse
import ast
from bisect import bisect_left
import calendar
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
import json
from pathlib import Path

from cost_scenarios import (DEFAULT_BPS, MODEL, build_cost_scenarios, window_metrics,
                            rank_same_window, break_even_bracket)
from evidence_v2 import encode, load_object, load_v2_records, safe_path, sha, verify_v2


ROOT = Path(__file__).resolve().parents[1]
WINDOWS = {"1M": 1, "3M": 3, "6M": 6, "1Y": 12, "3Y": 36, "5Y": 60, "Max": None}
TOOL_NAMES = ("cost_scenarios.py", "build_cost_rankings.py", "evidence_v2.py", "replay_evidence.py")
SOURCE_STATUSES = {"complete", "unavailable", "failed", "unsupported"}


def canonical_source(path):
    """Publish and hash exactly these UTF-8/LF bytes, independently of checkout OS."""
    return Path(path).read_text(encoding="utf-8").encode("utf-8")


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def registry_snapshot(root):
    """Declare the denominator from metadata without importing/executing rules."""
    root = Path(root)
    config_path = root / "scripts/config.json"
    config = read_json(config_path)
    instruments = config["instruments"]
    if not instruments or len(set(instruments)) != len(instruments):
        raise ValueError("Invalid configured market universe")
    paths = sorted(path for path in (root / "scripts/strategies").glob("*.py")
                   if not path.name.startswith("_") and path.name != "strategy_template.py")
    pins = {"scripts/config.json": sha(canonical_source(config_path))}
    cohort, ids, requires_ohlc = [], set(), False
    for path in paths:
        content = canonical_source(path)
        pins[path.relative_to(root).as_posix()] = sha(content)
        tree = ast.parse(content.decode("utf-8"))
        declarations = [node.value for node in tree.body if isinstance(node, ast.Assign)
                        and any(isinstance(target, ast.Name) and target.id == "STRATEGY"
                                for target in node.targets)]
        if len(declarations) != 1:
            raise ValueError("Expected one literal STRATEGY declaration: " + path.name)
        spec = ast.literal_eval(declarations[0])
        sid = spec["id"]
        if not isinstance(sid, str) or not sid or sid in ids:
            raise ValueError("Invalid or duplicate strategy identity")
        ids.add(sid)
        requires_ohlc |= spec.get("input") == "ohlc"
        basket = spec.get("mode") == "portfolio"
        if basket:
            symbols = [spec.get("portfolioSymbol") or (spec.get("instruments") or [sid])[0]]
            universe = list(spec.get("universe", instruments))
        else:
            symbols = list(spec.get("instruments") or instruments)
            if any(symbol in instruments for symbol in symbols):
                symbols.extend(symbol for symbol in instruments if symbol not in symbols)
        for symbol in symbols:
            assets = universe if basket else [symbol]
            if not assets or len(set(assets)) != len(assets):
                raise ValueError("Invalid declared strategy universe")
            cohort.append({"strategyId": sid, "symbol": symbol,
                           "kind": "basket" if basket else "single", "universe": assets})
    pipeline = {**config, "evidence_input_preparation": "ohlc-complete-bars" if requires_ohlc else "close-only"}
    return sorted(cohort, key=lambda row: (row["strategyId"], row["symbol"])), pipeline, pins


def _validate_index(index, declared, expected_pairs):
    if index.get("schemaVersion") != 2 or index.get("executionModel") != "synthetic-daily-target-v3":
        raise ValueError("Expected a v2 source evidence index")
    expected = {(row["strategyId"], row["symbol"]): row for row in declared}
    if len(declared) != expected_pairs or len(expected) != expected_pairs:
        raise ValueError("Independent registry does not match expected pair denominator")
    cohort = index["cohort"]
    pairs = [(row["strategyId"], row["symbol"]) for row in cohort]
    listed = [tuple(pair) for pair in index["expectedPairs"]]
    if (len(pairs) != len(set(pairs)) or set(pairs) != set(expected)
            or len(listed) != len(set(listed)) or set(listed) != set(expected)):
        raise ValueError("Source cohort differs from independent declaration")
    complete = set()
    for row in cohort:
        pair = (row["strategyId"], row["symbol"])
        if any(row[key] != expected[pair][key] for key in ("kind", "universe")):
            raise ValueError("Source kind/universe differs from independent declaration")
        if row["status"] not in SOURCE_STATUSES:
            raise ValueError("Unresolved source cohort status")
        if row["status"] == "complete":
            complete.add(pair)
            ref = index["runs"][pair[0]][pair[1]]
            if (ref["runId"] != row["runId"] or ref["manifest"] != row["manifest"]
                    or ref["manifest"] != f"data/evidence/runs/{ref['runId']}/manifest.json"):
                raise ValueError("Source run reference differs from cohort identity")
        elif not row.get("reason"):
            raise ValueError("Unavailable source pair needs an explicit reason")
    actual = {(sid, symbol) for sid, markets in index["runs"].items() for symbol in markets}
    if actual != complete:
        raise ValueError("Successful source run coverage differs from declared statuses")
    counts = Counter(row["status"] for row in cohort)
    coverage = index["coverage"]
    if (coverage.get("kind") != "full-declared-cohort"
            or coverage["expectedPairs"] != expected_pairs or coverage["pairs"] != len(complete)
            or any(coverage.get(status, 0) != counts[status] for status in SOURCE_STATUSES)
            or coverage["allStrategiesComplete"] != (len(complete) == expected_pairs)):
        raise ValueError("Source coverage counts disagree with independent cohort")
    return sorted(cohort, key=lambda row: (row["strategyId"], row["symbol"]))


def window_bounds(dates, name):
    """Calendar-month cutoff, explicit actual start-close, no shortened lookback."""
    if name == "Max":
        return {"status": "complete", "requestedStart": None, "start": dates[0],
                "end": dates[-1], "first": 0, "anchor": "initial-capital"}
    end = date.fromisoformat(dates[-1])
    month_index = end.year * 12 + end.month - 1 - WINDOWS[name]
    year, month = divmod(month_index, 12)
    cutoff = date(year, month + 1, min(end.day, calendar.monthrange(year, month + 1)[1])).isoformat()
    result = {"requestedStart": cutoff, "end": dates[-1], "anchor": "start-close"}
    if dates[0] > cutoff:
        return {**result, "status": "unavailable", "reason": "insufficient-history"}
    first = bisect_left(dates, cutoff)
    if len(dates) - first < 2:
        return {**result, "status": "unavailable", "reason": "fewer-than-two-observations"}
    return {**result, "status": "complete", "start": dates[first], "first": first}


def _compact_context(context):
    dates = context["dates"]
    return {**{key: value for key, value in context.items() if key != "dates"},
            "datesSha256": sha(dates), "observations": len(dates),
            "start": dates[0], "end": dates[-1]}


def _iso_day(value):
    if not isinstance(value, str) or date.fromisoformat(value).isoformat() != value:
        raise ValueError("Acquisition boundaries must be exact ISO dates")
    return date.fromisoformat(value)


def _utc_timestamp(value):
    timestamp = datetime.fromisoformat(value)
    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        raise ValueError("Acquisition provenance needs timezone-aware timestamps")
    return timestamp.astimezone(timezone.utc)


def validate_pipeline_config(archived, pinned, manifest, performance, source_generated_at):
    """Allow only a publication-verified acquisition cap; no parameter drift."""
    if archived == pinned:
        return {"kind": "exact-configuration"}
    if ({key: value for key, value in archived.items() if key != "end"}
            != {key: value for key, value in pinned.items() if key != "end"}):
        raise ValueError("Archived pipeline differs outside acquisition end")
    end = _iso_day(archived.get("end"))
    registry_end = _iso_day(pinned["end"]) if pinned.get("end") is not None else None
    if not performance or performance.get("generatedAt") != source_generated_at:
        raise ValueError("Frozen acquisition end needs matching source performance provenance")
    sid, symbol = manifest["strategyId"], manifest["symbol"]
    if performance.get("evidenceRunIds", {}).get(sid, {}).get(symbol) != manifest["runId"]:
        raise ValueError("Frozen acquisition end has mismatched source performance run identity")
    manifest_time = _utc_timestamp(manifest["generatedAt"])
    source_time = _utc_timestamp(source_generated_at)
    if manifest_time > source_time:
        raise ValueError("Manifest timestamp is after source publication")
    observed_from = _iso_day(manifest["observedFrom"])
    observed_through = _iso_day(manifest["observedThrough"])
    if observed_from > observed_through or observed_through >= end:
        raise ValueError("Frozen acquisition end must follow the complete observation window")
    if pinned.get("start") is not None and observed_from < _iso_day(pinned["start"]):
        raise ValueError("Observation window begins before configured acquisition start")
    metadata, cutoffs = {}, set()
    for asset in manifest["assets"]:
        meta = performance.get("marketData", {}).get(asset)
        if not isinstance(meta, dict):
            raise ValueError("Frozen acquisition end needs metadata for every asset")
        cutoff, as_of = _iso_day(meta.get("cutoffDate")), _iso_day(meta.get("asOf"))
        observations = meta.get("observations")
        if (type(observations) is not int or observations < manifest["summary"]["observations"]
                or as_of < observed_through or as_of >= cutoff):
            raise ValueError("Source market metadata does not cover verified observations")
        if manifest["kind"] == "single" and (
                as_of != observed_through or observations != manifest["summary"]["observations"]):
            raise ValueError("Single-asset observation window differs from source market metadata")
        if cutoff > manifest_time.date() or cutoff > source_time.date():
            raise ValueError("Acquisition cutoff is after manifest/source timestamp")
        cutoffs.add(cutoff)
        metadata[asset] = {key: meta[key] for key in ("cutoffDate", "asOf", "observations")}
    if len(cutoffs) != 1:
        raise ValueError("Frozen acquisition end requires unanimous asset cutoffs")
    cutoff = next(iter(cutoffs))
    expected_end = min(registry_end, cutoff) if registry_end else cutoff
    if end != expected_end:
        raise ValueError("Archived acquisition end is not the validated narrowing of registry end")
    return {"kind": "validated-acquisition-end-cap", "registryEnd": pinned.get("end"),
            "archivedEnd": end.isoformat(), "cutoffDate": cutoff.isoformat(), "marketData": metadata}


def _chart(result, bounds, max_points):
    first, count = bounds["first"], len(result["dates"]) - bounds["first"]
    selected = (list(range(count)) if count <= max_points else
                [round(i * (count - 1) / (max_points - 1)) for i in range(max_points)])
    indices = [first + index for index in selected]
    curves = []
    for item in result["scenarios"]:
        curve = {"bps": item["bps"]}
        for key in ("strategy", "benchmark"):
            equity = item[key]["equity"]
            anchor = 1.0 if bounds["anchor"] == "initial-capital" else equity[first]
            curve[key] = [equity[index] / anchor for index in indices]
        curves.append(curve)
    return {"dates": [result["dates"][index] for index in indices], "scenarios": curves,
            "anchor": bounds["anchor"], "initialCapital": 1,
            "sampling": {"method": "uniform-observation-index-with-endpoints",
                         "sampled": len(indices) < count, "sourceObservations": count,
                         "points": len(indices), "maxPoints": max_points,
                         "warning": "Display sample only; all metrics use every original daily record."}}


def _write(root, relative, payload):
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = encode(payload)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_bytes(raw)
    temporary.replace(path)
    return {"path": relative, "sha256": sha(raw), "bytes": len(raw)}


def universe_id(kind, assets):
    """Preserve the existing browser URL key, including its kind prefix."""
    if (kind not in ("single", "basket") or not isinstance(assets, list) or not assets
            or any(not isinstance(asset, str) or not asset for asset in assets)
            or len(set(assets)) != len(assets) or (kind == "single" and len(assets) != 1)):
        raise ValueError("Invalid cost summary universe")
    # Array order is economic identity. UTF-8, unescaped Unicode and compact
    # separators match JSON.stringify([kind, assets]) used by existing links.
    raw = json.dumps([kind, assets], ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
    return f"{kind}-{sha(raw)}"


def write_summary_catalog(output, pairs, cohorts):
    """Partition full pair objects without changing calculations or provenance."""
    output = Path(output)
    groups, seen = {}, set()
    for pair in pairs:
        identity = (pair["strategyId"], pair["symbol"])
        if any(not isinstance(value, str) or not value for value in identity) or identity in seen:
            raise ValueError("Duplicate or invalid cost summary pair")
        seen.add(identity)
        kind, assets = pair["kind"], pair["assets"]
        key = universe_id(kind, assets)
        group = groups.setdefault(key, {"schemaVersion": 1, "universeId": key,
                                        "kind": kind, "assets": list(assets), "pairs": []})
        if group["kind"] != kind or group["assets"] != assets:
            raise ValueError("Cost universe identity collision")
        group["pairs"].append(pair)
    shards = []
    for key, group in sorted(groups.items()):
        ref = _write(output, f"data/costs/universes/{key}.json", group)
        shards.append({"universeId": key, "kind": group["kind"], "assets": group["assets"],
                       "pairCount": len(group["pairs"]), "ref": ref})
    return _write(output, "data/costs/summary.json",
                  {"schemaVersion": 2, "metricSource": "all original full-precision daily records",
                   "cohorts": cohorts, "shards": shards})


def build(source_root, output_root, expected_index_sha256, *, registry_root=ROOT,
          expected_pairs=576, max_chart_points=192, progress=None):
    """Build a separate candidate; writing the final index marks completion only."""
    source, output, registry = [Path(path).resolve() for path in (source_root, output_root, registry_root)]
    if output.exists() or any(output.is_relative_to(path) or path.is_relative_to(output)
                              for path in (source, registry)):
        raise ValueError("Output must be a NEW isolated root disjoint from source and registry")
    if type(max_chart_points) is not int or not 2 <= max_chart_points <= 512:
        raise ValueError("Chart bound must be between 2 and 512 points per window")
    notify = progress or (lambda message: None)
    index_path = source / "data/evidence/index.json"
    index_bytes = index_path.read_bytes()
    if sha(index_bytes) != expected_index_sha256:
        raise ValueError("Source evidence index differs from caller pin")
    index = json.loads(index_bytes)
    performance_path = source / "data/performance.json"
    performance_bytes = performance_path.read_bytes() if performance_path.exists() else None
    performance = json.loads(performance_bytes) if performance_bytes is not None else None
    declared, pipeline, registry_pin = registry_snapshot(registry)
    cohort = _validate_index(index, declared, expected_pairs)
    scripts = Path(__file__).resolve().parent
    tool_bytes = {name: canonical_source(scripts / name) for name in TOOL_NAMES}
    tool_hashes = {name: sha(content) for name, content in tool_bytes.items()}
    manifest_pins, pairs, rank_groups = {}, [], defaultdict(list)
    output.mkdir(parents=True)
    for ordinal, source_pair in enumerate(cohort, 1):
        pair = {key: source_pair[key] for key in ("strategyId", "symbol", "kind")}
        pair.update(assets=list(source_pair["universe"]), sourceStatus=source_pair["status"])
        if source_pair["status"] != "complete":
            pairs.append({**pair, "status": "unavailable", "reason": source_pair["reason"]})
            continue
        try:
            path = safe_path(source, source_pair["manifest"])
            raw = path.read_bytes()
            manifest_pins[source_pair["manifest"]] = sha(raw)
            manifest = json.loads(raw)
            if (manifest["runId"] != source_pair["runId"]
                    or any(manifest[key] != pair[key] for key in ("strategyId", "symbol", "kind", "assets"))):
                raise ValueError("Manifest differs from declared pair/universe")
            verify_v2(path, root=source)
            config = load_object(source, manifest["objects"]["config"])
            compatibility = validate_pipeline_config(config["pipeline"], pipeline, manifest,
                                                     performance, index["generatedAt"])
            rows = load_v2_records(path, root=source)
            result = build_cost_scenarios(manifest, rows)
            windows, charts, pending_ranks = {}, {}, []
            for name in WINDOWS:
                bounds = window_bounds(result["dates"], name)
                boundary = {key: value for key, value in bounds.items() if key != "first"}
                if bounds["status"] != "complete":
                    windows[name] = boundary
                    continue
                metrics = [window_metrics(result, bps,
                           start=None if name == "Max" else bounds["start"]) for bps in DEFAULT_BPS]
                for item in metrics:
                    item["context"] = {**_compact_context(item["context"]), "window": name}
                context = metrics[0]["context"]
                group_id = sha({"window": name, "context": context})
                bracket = break_even_bracket(metrics)
                scenarios = []
                for item in metrics:
                    summary = {key: item[key] for key in ("bps", "strategy", "benchmark", "excessReturn")}
                    summary["rank"] = {"status": "incomparable", "reason": "single-member-exact-cohort",
                                       "value": None, "deltaFromZeroCost": None}
                    scenarios.append(summary)
                    pending_ranks.append((group_id, item["bps"], item, summary))
                windows[name] = {**boundary, "context": context, "cohortId": group_id,
                                 "gross": {key: metrics[0][key] for key in ("strategy", "benchmark", "excessReturn")},
                                 "scenarios": scenarios,
                                 "breakEven": {"status": "bracketed" if bracket else "no-observed-crossing",
                                               "sampledBps": list(DEFAULT_BPS), "bracket": bracket,
                                               "note": "First sampled crossing only; no uniqueness or unsampled-root claim."}}
                charts[name] = _chart(result, bounds, max_chart_points)
            provenance = {"runId": manifest["runId"], "inputHash": manifest["inputHash"],
                          "manifest": source_pair["manifest"], "manifestSha256": sha(raw),
                          "configHash": manifest["objects"]["config"]["sha256"],
                          "sourceHash": manifest["objects"]["source"]["sha256"],
                          "recordHashes": manifest["identity"]["recordHashes"],
                          "pipelineCompatibility": compatibility,
                          "sourcePerformanceSha256": sha(performance_bytes) if performance_bytes is not None else None,
                          "costModelSourceSha256": tool_hashes["cost_scenarios.py"]}
            chart_ref = _write(output, f"data/costs/charts/{manifest['runId']}.json",
                               {"schemaVersion": 1, "modelId": MODEL["id"], **pair,
                                "provenance": provenance, "windows": charts})
            pairs.append({**pair, "status": "complete", "runId": manifest["runId"],
                          "provenance": provenance, "chart": chart_ref, "windows": windows})
            for group_id, bps, item, summary in pending_ranks:
                rank_groups[(group_id, bps)].append((item, summary))
        except (ValueError, OSError, KeyError, TypeError) as error:
            pairs.append({**pair, "status": "failed", "runId": source_pair["runId"],
                          "reason": f"{type(error).__name__}: {error}"})
        notify(f"Cost pair {ordinal}/{expected_pairs}: {pair['strategyId']} / {pair['symbol']}")
    zero_ranks, group_info = {}, {}
    for (group_id, bps), members in sorted(rank_groups.items()):
        context = members[0][0]["context"]
        group_info[group_id] = {"cohortId": group_id, "context": context, "members": len(members)}
        if len(members) < 2:
            continue
        ranks = {item["runId"]: item["rank"] for item in rank_same_window([m[0] for m in members])}
        for item, summary in members:
            rank = ranks[item["runId"]]
            if bps == 0:
                zero_ranks[(group_id, item["runId"])] = rank
            summary["rank"] = {"status": "ranked", "metric": "net-total-return", "value": rank,
                               "cohortSize": len(members),
                               "deltaFromZeroCost": zero_ranks[(group_id, item["runId"])] - rank,
                               "deltaConvention": "Positive means improved rank versus zero cost."}
    tools = {}
    for name, content in tool_bytes.items():
        relative = f"data/costs/tools/{name}"
        destination = output / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        tools[name] = {"path": relative, "sha256": sha(content), "bytes": len(content), "encoding": "UTF-8/LF"}
    summary_ref = write_summary_catalog(output, pairs, list(group_info.values()))
    # Recheck mutable identity surfaces only after every pair has been processed.
    if (index_path.read_bytes() != index_bytes
            or (performance_path.read_bytes() if performance_path.exists() else None) != performance_bytes
            or registry_snapshot(registry) != (declared, pipeline, registry_pin)
            or {name: sha(canonical_source(scripts / name)) for name in TOOL_NAMES} != tool_hashes
            or any(sha(safe_path(source, relative).read_bytes()) != digest
                   for relative, digest in manifest_pins.items())):
        raise ValueError("Evidence, registry, configuration or producer changed during cost build")
    counts = Counter(pair["status"] for pair in pairs)
    final = {"schemaVersion": 1, "generatedAt": datetime.now(timezone.utc).isoformat(),
             "model": dict(MODEL), "costsBps": list(DEFAULT_BPS), "windows": list(WINDOWS),
             "source": {"index": "data/evidence/index.json", "indexSha256": expected_index_sha256,
                        "performanceSha256": sha(performance_bytes) if performance_bytes is not None else None,
                        "generatedAt": index["generatedAt"], "coverage": index["coverage"],
                        "registrySourceHashes": registry_pin, "pipelineConfigSha256": sha(pipeline)},
             "coverage": {"expectedPairs": expected_pairs, "independentlyDeclaredPairs": len(declared),
                          **{status: counts[status] for status in ("complete", "unavailable", "failed")},
                          "allComplete": counts["complete"] == expected_pairs},
             "storage": {"mode": "current-snapshot", "maxChartPointsPerWindow": max_chart_points,
                         "publication": "Replace current costs subtree; do not accumulate historical run charts.",
                         "fullHistory": "Referenced shared v2 evidence objects; not copied."},
             "tools": tools, "summary": summary_ref,
             "pairs": [{key: value for key, value in pair.items() if key not in ("windows", "provenance")}
                       for pair in pairs]}
    _write(output, "data/costs/index.json", final)
    return final


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--expected-source-index-sha256", required=True)
    parser.add_argument("--registry-root", default=str(ROOT))
    parser.add_argument("--max-chart-points", type=int, default=192)
    args = parser.parse_args()
    build(args.source_root, args.output_root, args.expected_source_index_sha256,
          registry_root=args.registry_root, max_chart_points=args.max_chart_points, progress=print)


if __name__ == "__main__":
    main()

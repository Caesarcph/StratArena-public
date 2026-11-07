"""Content-addressed monthly evidence, with standard-library arithmetic replay.

Monthly chunks are independent: no parent chain, recursive resolution or history
copies. An append rewrites at most the current month; completed months are shared.
Raw provider observations stay in the private research-input cache.
"""
import gzip
import base64
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path, PurePosixPath
import platform
import shutil
import tempfile


MODEL = {
    "id": "synthetic-daily-target-v3",
    "decision": "Target weights use bars through close t; previous targets earn (t-1,t].",
    "return": "Sum of previous target weight times each asset close-to-close return; cash return is zero.",
    "targetChange": "Sum(abs(target[t] - target[t-1])); changes in rule targets only.",
    "rebalanceTurnover": "Sum(abs(target[t] - target[t-1]*(1+assetReturn[t])/(1+grossReturn[t]))); one-way risky notional at close t after returns, divided by pre-trade equity.",
    "cash": "1 - sum(weights); residual may exceed one or be negative for shorts/leverage.",
    "feesBasisPoints": 0,
    "fills": "Synthetic daily target allocations, not broker orders or fills; financing/borrow costs omitted.",
    "wfo": "Candidate retains its own hypothetical state; first test return uses previous published target.",
}
MAX_OBJECT_BYTES = 128 * 1024 * 1024


def encode(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else encode(value)).hexdigest()


def safe_path(root, relative):
    path = PurePosixPath(relative)
    if path.is_absolute() or ".." in path.parts or "\\" in relative or ":" in relative:
        raise ValueError("Unsafe evidence path")
    resolved = (Path(root) / path).resolve()
    if not resolved.is_relative_to(Path(root).resolve()):
        raise ValueError("Evidence path escapes root")
    return resolved


def object_ref(root, value):
    raw = encode(value)
    identity = sha(raw)
    relative = f"data/evidence/objects/{identity}.json.gz"
    compressed = gzip.compress(raw, mtime=0)
    path = safe_path(root, relative)
    path.parent.mkdir(parents=True, exist_ok=True)
    ref = {"path": relative, "sha256": identity, "compressedBytes": len(compressed),
           "uncompressedBytes": len(raw)}
    if path.exists():
        # Never overwrite existing content, even if corrupt.
        # Gzip encoders may differ across Python versions; the immutable identity
        # is canonical uncompressed content, and references describe stored bytes.
        ref["compressedBytes"] = path.stat().st_size
        load_object(root, ref)
    else:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
            stream.write(compressed)
            temporary = Path(stream.name)
        try:
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)
    return ref


def load_object(root, ref):
    identity = ref.get("sha256", "")
    if len(identity) != 64 or any(ch not in "0123456789abcdef" for ch in identity):
        raise ValueError("Invalid object hash")
    if ref.get("path") != f"data/evidence/objects/{identity}.json.gz":
        raise ValueError("Object path does not match its content identity")
    path = safe_path(root, ref["path"])
    if path.stat().st_size != ref.get("compressedBytes"):
        raise ValueError("Compressed object size mismatch")
    with gzip.open(path, "rb") as stream:
        raw = stream.read(MAX_OBJECT_BYTES + 1)
    if len(raw) > MAX_OBJECT_BYTES or len(raw) != ref.get("uncompressedBytes") or sha(raw) != identity:
        raise ValueError("Object checksum or uncompressed size mismatch")
    value = json.loads(raw)
    if encode(value) != raw:
        raise ValueError("Object is not canonical JSON")
    return value


def artifact_root(manifest_path):
    path = Path(manifest_path).resolve()
    for parent in path.parents:
        if (parent / "data/evidence/objects").is_dir():
            return parent
    raise ValueError("Shared evidence objects not found; materialize the bundle first")


def make_records(dates, assets, prices, targets):
    """Pure numerical contract; signed weights and cash remain distinct."""
    if len(dates) < 2 or len(dates) != len(prices) or len(dates) != len(targets):
        raise ValueError("Evidence requires at least two aligned observations")
    if not assets or len(set(assets)) != len(assets) or dates != sorted(set(dates)):
        raise ValueError("Assets and ordered dates must be unique")
    rows, previous, old_prices, equity = [], [0.] * len(assets), None, 1.
    for day, prices_now, target in zip(dates, prices, targets):
        if len(prices_now) != len(assets) or len(target) != len(assets):
            raise ValueError("Missing asset in evidence observation")
        if not all(math.isfinite(float(v)) for v in prices_now + target) or min(prices_now) <= 0:
            raise ValueError("Prices must be positive and targets finite")
        market = [p / old - 1 for p, old in zip(prices_now, old_prices)] if old_prices else [0.] * len(assets)
        contribution = [weight * ret for weight, ret in zip(previous, market)]
        gross = sum(contribution)
        if gross <= -1:
            raise ValueError("Synthetic equity became nonpositive")
        equity *= 1 + gross
        if not math.isfinite(equity) or equity <= 0:
            raise ValueError("Synthetic equity became nonpositive or nonfinite")
        drift = [weight * (1 + ret) / (1 + gross) for weight, ret in zip(previous, market)]
        changes = [abs(new - old) for new, old in zip(target, previous)]
        traded = [abs(new - old) for new, old in zip(target, drift)]
        rows.append({"date": day, "assets": {asset: {
            "targetWeight": float(target[i]), "effectiveWeight": previous[i],
            "assetReturn": market[i], "contribution": contribution[i],
            "driftedWeight": drift[i], "targetChange": changes[i], "rebalanceTurnover": traded[i]
        } for i, asset in enumerate(assets)}, "grossReturn": gross, "equity": equity,
            "targetGrossExposure": sum(abs(v) for v in target), "targetNetExposure": sum(target),
            "targetCashWeight": 1 - sum(target), "effectiveGrossExposure": sum(abs(v) for v in previous),
            "effectiveNetExposure": sum(previous), "effectiveCashWeight": 1 - sum(previous),
            "driftedCashWeight": (1 - sum(previous)) / (1 + gross),
            "targetChange": sum(changes), "rebalanceTurnover": sum(traded)})
        previous, old_prices = list(map(float, target)), prices_now
    return rows


def records_from_frames(price_input, positions, symbol, kind):
    import pandas as pd
    if kind == "single":
        close = price_input["Close"] if isinstance(price_input, pd.DataFrame) else price_input
        prices, weights, assets = close.to_frame(symbol), positions.to_frame(symbol), [symbol]
    else:
        prices, weights, assets = price_input, positions, list(price_input.columns)
    if not prices.index.equals(weights.index) or set(weights.columns) != set(assets):
        raise ValueError("Evidence weights must cover the complete input universe")
    return make_records(prices.index.strftime("%Y-%m-%d").tolist(), assets,
                        prices.to_numpy(dtype=float).tolist(), weights[assets].to_numpy(dtype=float).tolist())


def summarize(rows):
    last = rows[-1]
    result = {"observations": len(rows), "terminalEquity": last["equity"], "totalReturn": last["equity"] - 1,
              "transitionCount": sum(row["targetChange"] > 0 for row in rows),
              "totalTargetChange": sum(row["targetChange"] for row in rows),
              "totalRebalanceTurnover": sum(row["rebalanceTurnover"] for row in rows)}
    for key in ("targetGrossExposure", "targetNetExposure", "targetCashWeight",
                "effectiveGrossExposure", "effectiveNetExposure", "effectiveCashWeight"):
        result[key] = last[key]
    if len(last["assets"]) == 1:
        asset = next(iter(last["assets"].values()))
        result.update(targetPosition=asset["targetWeight"], effectivePosition=asset["effectiveWeight"])
    return result


def load_v2_records(manifest_path, root=None):
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    root = root or artifact_root(manifest_path)
    rows, months = [], []
    for ref in manifest["objects"]["records"]:
        chunk = load_object(root, ref)
        month = chunk["month"]
        if chunk["assets"] != manifest["assets"] or not chunk["rows"]:
            raise ValueError("Record chunk has different assets or is empty")
        if any(row["date"][:7] != month for row in chunk["rows"]):
            raise ValueError("Record crosses its declared month")
        months.append(month)
        rows.extend(chunk["rows"])
    if months != sorted(set(months)):
        raise ValueError("Duplicate or out-of-order monthly chunks")
    return rows


def assert_equal(actual, expected, path="value"):
    if isinstance(expected, dict):
        if not isinstance(actual, dict) or set(actual) != set(expected):
            raise ValueError(f"Mismatch: {path} keys")
        for key in expected:
            assert_equal(actual[key], expected[key], f"{path}.{key}")
    elif isinstance(expected, list):
        if not isinstance(actual, list) or len(actual) != len(expected):
            raise ValueError(f"Mismatch: {path} length")
        for i, value in enumerate(expected):
            assert_equal(actual[i], value, f"{path}[{i}]")
    elif isinstance(expected, (int, float)) and not isinstance(expected, bool):
        if not isinstance(actual, (int, float)) or not math.isfinite(actual) or not math.isclose(actual, expected, rel_tol=1e-10, abs_tol=1e-10):
            raise ValueError(f"Arithmetic mismatch: {path}")
    elif actual != expected:
        raise ValueError(f"Mismatch: {path}")


def verify_v2(manifest_path, input_path=None, root=None):
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    root = root or artifact_root(manifest_path)
    identity = manifest["identity"]
    if manifest.get("schemaVersion") != 2 or sha(identity) != manifest["runId"]:
        raise ValueError("Manifest identity mismatch")
    if "parent" in manifest or "parent" in identity:
        raise ValueError("Monthly evidence must not contain parent chains")
    objects = manifest["objects"]
    config = load_object(root, objects["config"])
    from replay_evidence import validate_display_precision
    validate_display_precision(manifest, config)
    sources = load_object(root, objects["source"])
    if identity != {"schemaVersion": 2, "strategyId": manifest["strategyId"], "symbol": manifest["symbol"],
                   "inputHash": manifest["inputHash"], "configHash": objects["config"]["sha256"],
                   "sourceHash": objects["source"]["sha256"], "recordHashes": [r["sha256"] for r in objects["records"]]}:
        raise ValueError("Manifest object identity mismatch")
    if manifest["executionModel"] != MODEL or config["executionModel"] != MODEL:
        raise ValueError("Unknown execution model")
    for key in ("strategyId", "symbol", "kind", "assets", "folds", "selection", "ruleVersion", "ruleCorrections"):
        if config[key] != manifest[key]:
            raise ValueError(f"Configuration mismatch: {key}")
    if manifest["sourceHashes"] != sources["fileHashes"] or set(sources["fileHashes"]) != set(sources["files"]):
        raise ValueError("Source identity mismatch")
    for name, ref in sources["files"].items():
        safe_path(root, name)
        if sha(load_object(root, ref)["text"].encode("utf-8")) != sources["fileHashes"][name]:
            raise ValueError("Archived source byte hash mismatch")
    if objects["replay"] != sources["files"]["scripts/replay_evidence.py"]:
        raise ValueError("Replay source mismatch")
    launcher = manifest["downloads"]["launcher"]
    if launcher["path"] != f"data/evidence/tools/{launcher['sha256']}.py":
        raise ValueError("Invalid launcher path")
    content = safe_path(root, launcher["path"]).read_bytes()
    if len(content) != launcher["bytes"] or sha(content) != launcher["sha256"]:
        raise ValueError("Downloader checksum mismatch")
    if sources["launcher"] != launcher:
        raise ValueError("Downloader differs from archived source identity")
    if input_path is not None and sha(json.loads(Path(input_path).read_text(encoding="utf-8"))) != manifest["inputHash"]:
        raise ValueError("Original input hash mismatch; provider data may have been revised")
    rows = load_v2_records(manifest_path, root)
    if len(rows) < 2 or rows[0]["date"] != manifest["observedFrom"] or rows[-1]["date"] != manifest["observedThrough"]:
        raise ValueError("Observation endpoints mismatch")
    assets = manifest["assets"]
    # Replay from returns, with synthetic price paths; no market prices are public.
    previous, wealth, previous_date = [0.] * len(assets), 1., ""
    for row in rows:
        if row["date"] <= previous_date or set(row["assets"]) != set(assets):
            raise ValueError("Dates or asset coverage invalid")
        target = [row["assets"][a]["targetWeight"] for a in assets]
        market = [row["assets"][a]["assetReturn"] for a in assets]
        if not all(math.isfinite(v) for v in target + market) or min(market) <= -1:
            raise ValueError("Invalid target or asset return")
        if not previous_date and any(market):
            raise ValueError("Initial asset returns must be zero")
        gross = sum(w * r for w, r in zip(previous, market))
        if gross <= -1:
            raise ValueError("Nonpositive synthetic equity")
        wealth *= 1 + gross
        expected = make_records(["0", row["date"]], assets, [[1.] * len(assets), [1 + r for r in market]],
                                [previous, target])[-1]
        # make_records's first row enters previous weights at unit equity.
        expected["equity"] = wealth
        assert_equal(row, expected, row["date"])
        previous, previous_date = target, row["date"]
    assert_equal(manifest["summary"], summarize(rows), "summary")
    active = dict(config["defaults"])
    for fold in config["folds"]:
        if fold["testStart"][:10] <= rows[-1]["date"] <= fold["testEnd"][:10]:
            active.update(fold["config"])
    assert_equal(manifest["parameters"], {"defaults": config["defaults"], "active": active}, "parameters")
    return {"runId": manifest["runId"], **manifest["summary"],
            "verification": "Recorded arithmetic; archived original-input recomputation is separate"}


def declare_cohort(strategies, instruments):
    """Declare the denominator before downloads/evaluation; never derive it from successes."""
    from build_data import expand_strategy_instruments
    cohort, seen = [], set()
    for strategy in strategies:
        spec = strategy.STRATEGY
        basket = spec.get("mode") == "portfolio"
        symbols = ([spec.get("portfolioSymbol") or (spec.get("instruments") or [spec["id"]])[0]]
                   if basket else expand_strategy_instruments(spec, instruments)["instruments"])
        for symbol in symbols:
            pair = (spec["id"], symbol)
            if pair in seen:
                raise ValueError(f"Duplicate declared strategy/market: {pair}")
            seen.add(pair)
            cohort.append({"strategyId": pair[0], "symbol": symbol, "kind": "basket" if basket else "single",
                           "universe": list(spec.get("universe", instruments)) if basket else [symbol]})
    return cohort


def dependency_versions():
    versions = {}
    for name in ("numpy", "pandas", "scipy", "yfinance"):
        try:
            versions[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            versions[name] = None
    return {"python": platform.python_version(), "packages": versions}


def storage_report(data_dir):
    """Measure all immutable public files, including metadata and old snapshots."""
    evidence = Path(data_dir) / "evidence"
    groups = {"objects": list((evidence / "objects").glob("*.json.gz")),
              "manifests": list((evidence / "runs").glob("*/manifest.json")),
              "launchers": list((evidence / "tools").glob("*.py"))}
    return {"groups": {name: {"files": len(paths), "bytes": sum(p.stat().st_size for p in paths)}
                       for name, paths in groups.items()},
            "totalImmutableBytes": sum(p.stat().st_size for p in evidence.rglob("*")
                                       if p.is_file() and p.name not in {"index.json", "index.json.tmp"}),
            "note": "Includes retained prior immutable files; monthly object savings do not exclude manifest/config overhead."}


def archive_sources(root, strategy, launcher):
    directory = Path(__file__).parent
    names = ("build_data.py", "strategy_evidence.py", "evidence_v2.py", "replay_evidence.py",
             "recompute_evidence.py", "enrich_metrics.py", "performance_io.py", "requirements.txt")
    contents = {f"scripts/{name}": (directory / name).read_bytes() for name in names}
    strategy_path = f"scripts/strategies/{Path(strategy.__file__).name}"
    contents[strategy_path] = Path(strategy.__file__).read_bytes()
    # Shared local strategy helpers are archived too; ordinary rules currently
    # import only installed dependencies. Do not substitute current helper code.
    for path in (directory / "strategies").glob("_*.py"):
        contents[f"scripts/strategies/{path.name}"] = path.read_bytes()
    files = {name: object_ref(root, {"text": content.decode("utf-8")}) for name, content in contents.items()}
    hashes = {name: sha(content) for name, content in contents.items()}
    return object_ref(root, {"files": files, "fileHashes": hashes, "strategyPath": strategy_path, "launcher": launcher}), files, hashes


def downloader_bytes():
    """A single public stdlib launcher; no private repository clone required."""
    directory = Path(__file__).parent
    embedded = {name: base64.b64encode((directory / name).read_bytes()).decode("ascii")
                for name in ("evidence_v2.py", "recompute_evidence.py", "replay_evidence.py")}
    return ("# QuantArena evidence downloader. Standard library only for --bundle.\n"
            "import base64, pathlib, runpy, sys, tempfile\n"
            f"FILES = {embedded!r}\n"
            "with tempfile.TemporaryDirectory(prefix='quantarena-tools-') as folder:\n"
            "    for name, content in FILES.items():\n"
            "        pathlib.Path(folder, name).write_bytes(base64.b64decode(content))\n"
            "    sys.path.insert(0, folder)\n"
            "    runpy.run_path(str(pathlib.Path(folder, 'recompute_evidence.py')), run_name='__main__')\n").encode("utf-8")


class EvidenceBuildV2:
    def __init__(self, data_dir, private_dir, generated_at, cohort):
        from strategy_evidence import git_provenance
        self.data, self.private = Path(data_dir), Path(private_dir)
        if self.private.resolve().is_relative_to(self.data.resolve()):
            raise ValueError("Private original inputs must remain outside published data")
        self.root, self.generated_at = self.data.parent, str(generated_at)
        self.private.mkdir(parents=True, exist_ok=True)
        self.stage = Path(tempfile.mkdtemp(prefix="evidence-v2-", dir=self.private))
        self.declared = {(entry["strategyId"], entry["symbol"]): dict(entry) for entry in cohort}
        if len(self.declared) != len(cohort) or not cohort:
            raise ValueError("Cohort must be nonempty and unique")
        self.statuses, self.runs = {}, {}
        self.git = git_provenance(self.root)
        launcher = downloader_bytes()
        launcher_hash = sha(launcher)
        relative = f"data/evidence/tools/{launcher_hash}.py"
        launcher_path = safe_path(self.root, relative)
        launcher_path.parent.mkdir(parents=True, exist_ok=True)
        if launcher_path.exists():
            if sha(launcher_path.read_bytes()) != launcher_hash:
                raise ValueError("Corrupt immutable downloader")
        else:
            launcher_path.write_bytes(launcher)
        self.downloader = {"path": relative, "sha256": launcher_hash, "bytes": len(launcher)}

    def mark(self, strategy_id, symbol, status, reason):
        pair = (strategy_id, symbol)
        if pair not in self.declared or status not in {"unavailable", "failed", "unsupported"} or not reason:
            raise ValueError("Invalid cohort status")
        if pair in self.statuses:
            raise ValueError("Cohort pair already resolved")
        self.statuses[pair] = {**self.declared[pair], "status": status, "reason": str(reason)}

    def add_run(self, strategy, symbol, price_input, positions, defaults, folds, choice,
                pipeline_config, reason=None, accounting_correction=None, evaluation_folds=None):
        from strategy_evidence import input_snapshot, json_value, active_parameters
        pair = (strategy.STRATEGY["id"], symbol)
        if pair not in self.declared or pair in self.statuses:
            raise ValueError("Run is undeclared or already resolved")
        declaration = self.declared[pair]
        kind, assets = declaration["kind"], declaration["universe"]
        if kind == "basket" and list(price_input.columns) != assets:
            raise ValueError("Missing or reordered declared universe members")
        rows = records_from_frames(price_input, positions, symbol, kind)
        inputs = json_value(input_snapshot(price_input))
        input_hash = sha(inputs)
        private = self.private / f"{input_hash}.json"
        if private.exists() and sha(json.loads(private.read_text(encoding="utf-8"))) != input_hash:
            raise ValueError("Corrupt private original input snapshot")
        if not private.exists():
            private.write_bytes(encode(inputs))
        source, source_files, source_hashes = archive_sources(self.root, strategy, self.downloader)
        config = json_value({"strategyId": pair[0], "symbol": symbol, "kind": kind, "assets": assets,
                            "defaults": defaults, "folds": folds, "evaluationFolds": evaluation_folds if evaluation_folds is not None else folds,
                            "selection": choice, "pipeline": pipeline_config, "executionModel": MODEL,
                            "ruleVersion": strategy.STRATEGY.get("ruleVersion"),
                            "ruleCorrections": strategy.STRATEGY.get("corrections", []),
                            "dependencies": dependency_versions(), "inputKind": "frame" if hasattr(price_input, "columns") else "series"})
        configuration = object_ref(self.root, config)
        grouped = {}
        for row in rows:
            grouped.setdefault(row["date"][:7], []).append(row)
        records = [object_ref(self.root, {"month": month, "assets": assets, "rows": group}) for month, group in grouped.items()]
        identity = {"schemaVersion": 2, "strategyId": pair[0], "symbol": symbol, "inputHash": input_hash,
                    "configHash": configuration["sha256"], "sourceHash": source["sha256"],
                    "recordHashes": [ref["sha256"] for ref in records]}
        run_id = sha(identity)
        prefix = f"data/evidence/runs/{run_id}"
        manifest = {"schemaVersion": 2, "strategyId": pair[0], "symbol": symbol, "kind": kind, "assets": assets,
                    "runId": run_id, "identity": identity, "generatedAt": self.generated_at,
                    "observedFrom": rows[0]["date"], "observedThrough": rows[-1]["date"], "inputHash": input_hash,
                    "executionModel": MODEL, "parameters": {"defaults": defaults, "active": active_parameters(defaults, folds, price_input.index[-1])},
                    "folds": folds, "selection": choice, "reason": reason, "git": self.git,
                    "sourceHashes": source_hashes,
                    "downloads": {"launcher": self.downloader},
                    "objects": {"config": configuration, "source": source, "records": records, "replay": source_files["scripts/replay_evidence.py"]},
                    "summary": summarize(rows), "sameInputAccountingCorrection": accounting_correction,
                    "ruleVersion": strategy.STRATEGY.get("ruleVersion"),
                    "ruleCorrections": strategy.STRATEGY.get("corrections", []),
                    "reproduction": {"guarantee": "Standard-library arithmetic replay to 1e-10; archived-source recomputation requires matching private inputs and dependencies.",
                                     "command": "python scripts/replay_evidence.py data/evidence/runs/<run-id>/manifest.json",
                                     "recomputeCommand": "python scripts/recompute_evidence.py <manifest> --input <private-input.json>",
                                     "bundleCommand": "python <downloaded-launcher.py> https://quantarenas.com/" + prefix + "/manifest.json --bundle replay.zip",
                                     "acquisitionCommand": "python <downloaded-launcher.py> https://quantarenas.com/" + prefix + "/manifest.json --fetch-input private-input.json",
                                     "inputVerification": f"Private original snapshot: {input_hash}.json",
                                     "warning": "Original provider inputs are not public. Revised input hashes cannot claim exact recomputation. Execute archived source only if you trust its author.",
                                     "displayEquityDecimals": pipeline_config.get("equity_round", 4)},
                    "storage": {"kind": "independent-month-chunks", "recordChunks": len(records),
                                "recordCompressedBytes": sum(ref["compressedBytes"] for ref in records),
                                "recordUncompressedBytes": sum(ref["uncompressedBytes"] for ref in records)}}
        directory = self.stage / run_id
        directory.mkdir(exist_ok=True)
        manifest_path = directory / "manifest.json"
        manifest_path.write_bytes(encode(json_value(manifest)))
        verify_v2(manifest_path, private, root=self.root)
        ref = {"runId": run_id, "manifest": f"{prefix}/manifest.json", "schemaVersion": 2}
        self.runs.setdefault(pair[0], {})[symbol] = ref
        self.statuses[pair] = {**declaration, "status": "complete", **ref}
        return ref

    def activate(self, performance, wfo_choices, write_performance, fail_at=None, strategy_metadata=None):
        from strategy_evidence import active_snapshot, restore_active_snapshot, archive_snapshot, compare_previous_snapshot
        if set(self.statuses) != set(self.declared) or not self.runs:
            raise ValueError("Every declared pair needs a resolved status and at least one verified run")
        evidence = self.data / "evidence"
        evidence.mkdir(exist_ok=True)
        index_path = evidence / "index.json"
        previous = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {}
        backup = active_snapshot(self.data)
        comparisons = compare_previous_snapshot(self.data, performance)
        archive = archive_snapshot(self.data, backup) if backup and (comparisons["changedPairs"] or previous.get("executionModel") != MODEL["id"]) else None
        corrections, lineage = list(previous.get("corrections", [])), list(previous.get("lineage", []))
        for sid, markets in self.runs.items():
            for symbol, ref in markets.items():
                old = previous.get("runs", {}).get(sid, {}).get(symbol)
                if not old or old["runId"] == ref["runId"]:
                    continue
                item = {"strategyId": sid, "symbol": symbol, "previousRunId": old["runId"],
                        "replacementRunId": ref["runId"], "generatedAt": self.generated_at}
                lineage.append(item)
                old_path = safe_path(self.root, old["manifest"])
                old_manifest = json.loads(old_path.read_text(encoding="utf-8"))
                current_path = self.stage / ref["runId"] / "manifest.json"
                current = json.loads(current_path.read_text(encoding="utf-8"))
                changed = old_manifest.get("schemaVersion") != 2 or old_manifest.get("executionModel") != MODEL
                if not changed:
                    before, after = load_v2_records(old_path), load_v2_records(current_path, self.root)
                    changed = after[:len(before)] != before or old_manifest["sourceHashes"] != current["sourceHashes"]
                if changed:
                    corrections.append({**item, "archive": archive,
                        "reason": "Recorded common-history values, archived source, or the declared execution model changed; prior immutable run remains available."})
        counts = {status: sum(item["status"] == status for item in self.statuses.values())
                  for status in ("complete", "unavailable", "failed", "unsupported")}
        index = {"schemaVersion": 2, "generatedAt": self.generated_at, "runs": self.runs,
                 "expectedPairs": [list(pair) for pair in sorted(self.declared)],
                 "cohort": [self.statuses[pair] for pair in sorted(self.statuses)],
                 "coverage": {"kind": "full-declared-cohort", "expectedPairs": len(self.declared),
                              "pairs": counts["complete"], **counts,
                              "allStrategiesComplete": counts["complete"] == len(self.declared)},
                 "executionModel": MODEL["id"], "corrections": corrections, "lineage": lineage,
                 "historicalComparison": comparisons, "sameInputAccountingCorrections": performance.get("accountingCorrections", {})}
        successful_ids = {ref["runId"] for markets in self.runs.values() for ref in markets.values()}
        for run_id in sorted(successful_ids):
            directory = self.stage / run_id
            destination = evidence / "runs" / directory.name
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.exists():
                verify_v2(destination / "manifest.json")
            else:
                verify_v2(directory / "manifest.json", root=self.root)
                os.replace(directory, destination)
        index["storage"] = storage_report(self.data)
        performance["evidenceIndexFile"] = "data/evidence/index.json"
        performance["evidenceRunIds"] = {sid: {symbol: ref["runId"] for symbol, ref in markets.items()} for sid, markets in self.runs.items()}
        try:
            if strategy_metadata is not None:
                (self.data / "strategies.json").write_bytes(encode({"strategies": strategy_metadata}))
            write_performance(performance, self.data)
            (self.data / "wfo_choice.json").write_bytes(encode(wfo_choices))
            if fail_at == "after_summary":
                raise RuntimeError("Injected failure between summary write and active-index replacement")
            temporary = evidence / "index.json.tmp"
            temporary.write_bytes(encode(index))
            os.replace(temporary, index_path)
            validate_v2_index(self.root, performance, list(self.declared.values()))
        except BaseException:
            restore_active_snapshot(self.data, backup)
            raise
        finally:
            shutil.rmtree(self.stage, ignore_errors=True)
            (evidence / "index.json.tmp").unlink(missing_ok=True)
        return index


def validate_v2_index(root, performance, expected_cohort=None):
    root = Path(root)
    index = json.loads((root / "data/evidence/index.json").read_text(encoding="utf-8"))
    if index.get("schemaVersion") != 2 or index.get("executionModel") != MODEL["id"]:
        raise ValueError("Invalid active index schema or execution model")
    cohort = index["cohort"]
    pairs = [(item["strategyId"], item["symbol"]) for item in cohort]
    if expected_cohort is None:
        from build_data import load_strategies, load_config
        expected_cohort = declare_cohort(load_strategies(), load_config()["instruments"])
    expected = {(item["strategyId"], item["symbol"]): item for item in expected_cohort}
    if len(pairs) != len(set(pairs)) or set(pairs) != set(expected) or set(pairs) != {tuple(p) for p in index["expectedPairs"]}:
        raise ValueError("Evidence cohort differs from independent declaration")
    actual = {(sid, symbol) for sid, markets in index["runs"].items() for symbol in markets}
    summary_pairs = {(sid, symbol) for sid, markets in performance.get("evidenceRunIds", {}).items() for symbol in markets}
    complete = {(item["strategyId"], item["symbol"]) for item in cohort if item["status"] == "complete"}
    if not actual or actual != complete or actual != summary_pairs or index["generatedAt"] != performance.get("generatedAt"):
        raise ValueError("Active evidence index and summary disagree")
    for item in cohort:
        pair = (item["strategyId"], item["symbol"])
        if any(item[key] != expected[pair][key] for key in ("kind", "universe")):
            raise ValueError("Evidence universe differs from declaration")
        if item["status"] != "complete":
            if item["status"] not in {"unavailable", "failed", "unsupported"} or not item.get("reason"):
                raise ValueError("Unresolved cohort status")
            continue
        sid, symbol = pair
        ref = index["runs"][sid][symbol]
        if ref["runId"] != item["runId"] or ref["manifest"] != item["manifest"] or performance["evidenceRunIds"][sid][symbol] != ref["runId"]:
            raise ValueError("Cohort/run/summary identity mismatch")
        if ref["manifest"] != f"data/evidence/runs/{ref['runId']}/manifest.json":
            raise ValueError("Invalid immutable run path")
        path = safe_path(root, ref["manifest"])
        manifest = json.loads(path.read_text(encoding="utf-8"))
        if (manifest["strategyId"], manifest["symbol"]) != pair or manifest["runId"] != ref["runId"] or manifest["assets"] != item["universe"] or manifest["kind"] != item["kind"]:
            raise ValueError("Manifest differs from declared strategy/market/universe")
        verify_v2(path)
        rows = load_v2_records(path)
        series = performance["strategies"][sid].get("equity", {}).get(symbol)
        if series is None:
            relative = performance.get("equityFiles", {}).get(symbol)
            payload = json.loads(safe_path(root, relative).read_text(encoding="utf-8")) if relative else {}
            series = dict(payload.get("strategies", {}).get(sid, {}))
            series.setdefault("dates", payload.get("dates", []))
        if series.get("dates") != [row["date"] for row in rows] or len(series.get("strategy", [])) != len(rows):
            raise ValueError("Published dates differ from evidence")
        tolerance = .500001 * 10 ** -manifest["reproduction"]["displayEquityDecimals"]
        if any(not math.isclose(value, row["equity"], rel_tol=1e-10, abs_tol=tolerance) for value, row in zip(series["strategy"], rows)):
            raise ValueError("Published equity differs from evidence")
    counts = {status: sum(item["status"] == status for item in cohort) for status in ("complete", "unavailable", "failed", "unsupported")}
    coverage = {"kind": "full-declared-cohort", "expectedPairs": len(pairs), "pairs": len(actual), **counts,
                "allStrategiesComplete": len(actual) == len(pairs)}
    if index["coverage"] != coverage:
        raise ValueError("Coverage counts do not reconcile")
    return {"pairs": len(actual), "generatedAt": index["generatedAt"], "coverage": coverage}

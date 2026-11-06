"""Replay a downloaded evidence bundle using Python's standard library only.

Place manifest.json, daily.csv, trades.csv, config.json, strategy.py and this
script in one folder. Run: python replay.py manifest.json
This proves the recorded arithmetic, not regeneration of signals from prices.
An optional --input original-input.json checks the private original input hash.
"""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path


def verify(manifest_path, input_path=None):
    path = Path(manifest_path)
    manifest = json.loads(path.read_text(encoding="utf-8"))
    required = {"daily", "trades", "config", "source", "replay"}
    if manifest.get("schemaVersion") != 1 or not required.issubset(manifest.get("files", {})):
        raise ValueError("Unsupported or incomplete evidence manifest")
    if set(manifest.get("files", {})) != set(manifest.get("fileHashes", {})):
        raise ValueError("Every downloadable file requires a checksum")
    for key, expected in manifest["fileHashes"].items():
        local = path.parent / Path(manifest["files"][key]).name
        if hashlib.sha256(local.read_bytes()).hexdigest() != expected:
            raise ValueError(f"Checksum mismatch: {key}")
    config = json.loads((path.parent / "config.json").read_text(encoding="utf-8"))
    identity = manifest["identity"]
    encode = lambda value: json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    if hashlib.sha256(encode(identity)).hexdigest() != manifest["runId"]:
        raise ValueError("Manifest run identity mismatch")
    config_hash = hashlib.sha256(encode(config)).hexdigest()
    if config_hash != manifest["configHash"] or config_hash != identity["configHash"]:
        raise ValueError("Configuration identity mismatch")
    if manifest["inputHash"] != identity["inputHash"] or manifest["sourceHashes"] != identity["sourceHashes"]:
        raise ValueError("Input/source identity mismatch")
    if manifest["sourceHashes"]["strategy"] != manifest["fileHashes"]["source"]:
        raise ValueError("Strategy source identity mismatch")
    if manifest["sourceHashes"]["engine"]["replay_evidence.py"] != manifest["fileHashes"]["replay"]:
        raise ValueError("Replay source identity mismatch")
    if identity["dailyHash"] != manifest["fileHashes"]["daily"]:
        raise ValueError("Daily arithmetic file differs from the immutable identity")
    if manifest["executionModel"] != config["executionModel"] or identity["executionModel"] != manifest["executionModel"]["id"]:
        raise ValueError("Execution model differs from configuration")
    if any(manifest[key] != config[key] for key in ("strategyId", "symbol", "folds", "selection")):
        raise ValueError("Manifest metadata differs from its configuration")
    if input_path is not None:
        original = json.loads(Path(input_path).read_text(encoding="utf-8"))
        packed = json.dumps(original, sort_keys=True, separators=(",", ":"), allow_nan=False)
        if hashlib.sha256(packed.encode()).hexdigest() != manifest["inputHash"]:
            raise ValueError("Original input hash mismatch; provider data may have been revised")
    with (path.parent / "daily.csv").open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    if len(rows) < 2:
        raise ValueError("Evidence requires at least two observations")
    if manifest["observedFrom"] != rows[0]["date"] or manifest["observedThrough"] != rows[-1]["date"]:
        raise ValueError("Manifest observation endpoints differ from the daily records")
    targets = [float(row["targetPosition"]) for row in rows]
    if hashlib.sha256(encode(targets)).hexdigest() != identity["targetsHash"]:
        raise ValueError("Target identity mismatch")
    wealth, previous, turnover, previous_date = 1.0, 0.0, 0.0, ""
    transitions = []
    for row in rows:
        values = {key: float(value) for key, value in row.items() if key != "date"}
        if not all(math.isfinite(value) for value in values.values()):
            raise ValueError("Nonfinite daily observation")
        if row["date"] <= previous_date:
            raise ValueError("Observation dates must be strictly increasing")
        target, market = values["targetPosition"], values["marketReturn"]
        gross = previous * market
        wealth *= 1 + gross
        traded = abs(target - previous)
        for key, expected in (("effectivePosition", previous), ("grossReturn", gross),
                              ("equity", wealth), ("turnover", traded)):
            if not math.isclose(values[key], expected, rel_tol=1e-10, abs_tol=1e-10):
                raise ValueError(f"Arithmetic mismatch on {row['date']}: {key}")
        if traded > 0:
            transitions.append((row["date"], previous, target, traded))
        turnover += traded
        previous, previous_date = target, row["date"]
    with (path.parent / "trades.csv").open(encoding="utf-8", newline="") as stream:
        actual = [(row["date"], float(row["previousTarget"]), float(row["targetPosition"]),
                   float(row["turnover"])) for row in csv.DictReader(stream)]
    if actual != transitions:
        raise ValueError("Transition ledger does not match daily targets")
    expected_summary = {"observations": len(rows), "terminalEquity": wealth, "totalReturn": wealth - 1,
                        "transitionCount": len(transitions), "totalTurnover": turnover,
                        "targetPosition": float(rows[-1]["targetPosition"]),
                        "effectivePosition": float(rows[-1]["effectivePosition"])}
    for key, value in expected_summary.items():
        if not math.isclose(value, manifest["summary"][key], rel_tol=1e-10, abs_tol=1e-10):
            raise ValueError(f"Summary does not reconcile: {key}")
    active = dict(config["defaults"])
    for fold in config["folds"]:
        if fold["testStart"][:10] <= rows[-1]["date"] <= fold["testEnd"][:10]:
            active.update(fold["config"])
    if manifest["parameters"] != {"defaults": config["defaults"], "active": active}:
        raise ValueError("Parameter provenance differs from configuration")
    return {"runId": manifest["runId"], "observations": len(rows), "terminalEquity": wealth,
            "transitionCount": len(transitions), "turnover": turnover,
            "verification": "recorded arithmetic; signal recomputation is a separate check"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", nargs="?", default="manifest.json")
    parser.add_argument("--input", help="Optional privately retained original input snapshot")
    args = parser.parse_args()
    print(json.dumps(verify(args.manifest, args.input), indent=2))

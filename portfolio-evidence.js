/* R5 same-origin evidence boundary. No DOM, storage, analytics or code execution.
 * loadSnapshot({indexSha256}) is archive-only, even if that pin is also latest.
 * loadSnapshot({expectedCurrentIndexSha256?, expectedPerformanceSha256?}) loads
 * one coherent current publication. Historical requests never read latest data.
 * loadSelection(snapshot, qualifiedSelections) returns refs + original bytes for
 * PortfolioMarginal. Historical performance is explicitly not archived/borrowed.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(root);
  else root.PortfolioEvidence = factory(root);
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";
  const MODEL = "synthetic-daily-target-v3";
  const LIMITS = Object.freeze({ indexBytes: 16 * 1024 * 1024, performanceBytes: 64 * 1024 * 1024,
    manifestBytes: 8 * 1024 * 1024, objectBytes: 128 * 1024 * 1024,
    compressedBytes: 128 * 1024 * 1024, totalRecordBytes: 256 * 1024 * 1024, recordChunks: 4096 });
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const clone = value => JSON.parse(JSON.stringify(value));
  const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
  const ensure = (condition, code, message) => { if (!condition) fail(code, message); };
  const digestPattern = /^[a-f0-9]{64}$/;
  function digest(value) { ensure(typeof value === "string" && digestPattern.test(value), "invalid-pin", "Expected a lowercase SHA-256 pin"); return value; }
  function json(bytes) {
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch (_) { fail("invalid-json", "Evidence is not valid UTF-8 JSON"); }
  }
  function canonical(value) {
    if (value === null) return "null";
    if (typeof value === "string") return JSON.stringify(value).replace(/[\u007f-\uffff]/g, char => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
    if (typeof value === "boolean") return String(value);
    if (typeof value === "number") { ensure(Number.isFinite(value), "invalid-number", "Nonfinite evidence value"); return JSON.stringify(value); }
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    ensure(value && typeof value === "object", "invalid-json", "Malformed evidence value");
    return "{" + Object.keys(value).sort().map(key => canonical(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  const same = (left, right) => canonical(left) === canonical(right);
  function validDay(value) {
    ensure(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && value.slice(0, 4) !== "0000", "invalid-date", "Expected an ISO observation date");
    const stamp = Date.parse(value + "T00:00:00Z");
    ensure(Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value, "invalid-date", "Invalid calendar observation date");
    return stamp / 86400000;
  }
  function timestamp(value) {
    const match = typeof value === "string" && /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    ensure(match, "invalid-timestamp", "Publication timestamp must include a timezone");
    const [, date, hh, mm, ss, fraction, zone] = match;
    ensure(+hh < 24 && +mm < 60 && +ss < 60, "invalid-timestamp", "Invalid timestamp time");
    let offset = 0;
    if (zone !== "Z") {
      const hours = +zone.slice(1, 3), minutes = +zone.slice(4, 6);
      ensure(hours < 24 && minutes < 60, "invalid-timestamp", "Invalid timestamp offset");
      offset = (zone[0] === "-" ? -1 : 1) * (hours * 60 + minutes);
    }
    return BigInt(validDay(date)) * 86400000000n + BigInt(+hh * 3600 + +mm * 60 + +ss - offset * 60) * 1000000n + BigInt((fraction || "").padEnd(6, "0"));
  }
  function universe(kind, assets) {
    ensure(["single", "basket"].includes(kind) && Array.isArray(assets) && assets.length && assets.every(asset => typeof asset === "string" && asset) && new Set(assets).size === assets.length && (kind !== "single" || assets.length === 1), "invalid-universe", "Invalid ordered evidence universe");
  }
  function validIndex(index) {
    canonical(index); // Reject overflowing JSON numeric literals anywhere.
    ensure(index && index.schemaVersion === 2 && index.executionModel === MODEL, "unsupported-index", "Expected v2 evidence index");
    timestamp(index.generatedAt);
    ensure(Array.isArray(index.cohort) && index.cohort.length && index.runs && typeof index.runs === "object" && !Array.isArray(index.runs)
      && Object.values(index.runs).every(markets => markets && typeof markets === "object" && !Array.isArray(markets)), "invalid-index", "Missing declared evidence cohort/run mappings");
    const seen = new Set(), complete = new Set(), counts = { complete: 0, unavailable: 0, failed: 0, unsupported: 0 }, runIds = {};
    index.cohort.forEach(row => {
      ensure(typeof row.strategyId === "string" && row.strategyId && typeof row.symbol === "string" && row.symbol, "invalid-index", "Invalid strategy/market identity");
      const key = JSON.stringify([row.strategyId, row.symbol]);
      ensure(!seen.has(key), "invalid-index", "Duplicate declared evidence pair"); seen.add(key);
      universe(row.kind, row.universe);
      ensure(own(counts, row.status), "invalid-index", "Unresolved evidence status"); counts[row.status]++;
      if (row.status === "complete") {
        const id = digest(row.runId), path = `data/evidence/runs/${id}/manifest.json`;
        const ref = index.runs[row.strategyId] && index.runs[row.strategyId][row.symbol];
        ensure(row.manifest === path && ref && ref.runId === id && ref.manifest === path, "invalid-path", "Immutable manifest path/identity mismatch");
        complete.add(key);
        if (!own(runIds, row.strategyId)) Object.defineProperty(runIds, row.strategyId, { value: {}, enumerable: true });
        Object.defineProperty(runIds[row.strategyId], row.symbol, { value: id, enumerable: true });
      } else ensure(typeof row.reason === "string" && row.reason, "invalid-index", "Unavailable pair lacks explanation");
    });
    ensure(Array.isArray(index.expectedPairs) && index.expectedPairs.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(value => typeof value === "string" && value)), "invalid-index", "Missing independent pair declaration");
    const expected = index.expectedPairs.map(pair => JSON.stringify(pair));
    const actual = Object.entries(index.runs).flatMap(([sid, markets]) => Object.keys(markets).map(symbol => JSON.stringify([sid, symbol])));
    const equalSets = (values, target) => values.length === target.size && new Set(values).size === values.length && values.every(value => target.has(value));
    const coverage = index.coverage || {};
    const countMatches = status => { const value = own(coverage, status) ? coverage[status] : 0; return Number.isSafeInteger(value) && value === counts[status]; };
    ensure(equalSets(expected, seen) && equalSets(actual, complete) && coverage.kind === "full-declared-cohort" && coverage.expectedPairs === seen.size && coverage.pairs === complete.size && Object.keys(counts).every(countMatches) && coverage.allStrategiesComplete === (seen.size === complete.size), "invalid-index", "Evidence coverage/identity mismatch");
    return runIds;
  }
  function resultError(error) {
    return { status: "unavailable", reason: error.name === "AbortError" ? "aborted" : error.code || "evidence-unavailable", detail: error.message || String(error) };
  }

  function createLoader(options = {}) {
    const fetcher = own(options, "fetch") ? options.fetch : root.fetch && root.fetch.bind(root);
    const crypto = own(options, "crypto") ? options.crypto : root.crypto;
    const Decompress = own(options, "DecompressionStream") ? options.DecompressionStream : root.DecompressionStream;
    const limits = { ...LIMITS, ...(options.limits || {}) }, snapshots = new WeakMap();
    Object.keys(limits).forEach(key => ensure(own(LIMITS, key) && Number.isSafeInteger(limits[key]) && limits[key] > 0 && limits[key] <= LIMITS[key], "invalid-limit", "Evidence limits may only be reduced"));
    const supplied = options.origin || (root.location && root.location.origin);
    const origin = new URL(supplied);
    ensure(["https:", "http:"].includes(origin.protocol) && !origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === "/", "invalid-origin", "Evidence origin must be an HTTP(S) origin");
    if (root.location && root.location.origin) ensure(origin.origin === root.location.origin, "cross-origin", "Evidence must remain on this page's origin");

    function capabilities() {
      ensure(crypto && crypto.subtle && typeof crypto.subtle.digest === "function" && typeof Decompress === "function" && typeof root.Blob === "function" && typeof root.ReadableStream === "function" && typeof root.AbortController === "function" && typeof fetcher === "function", "unsupported-browser", "This browser cannot verify compressed evidence. Use a modern browser or the Python evidence tools.");
    }
    function checkAbort(signal) { ensure(!signal || !signal.aborted, "aborted", "Evidence request was aborted"); }
    async function hash(raw) {
      const copy = new Uint8Array(raw).slice();
      const value = await crypto.subtle.digest("SHA-256", copy);
      return Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, "0")).join("");
    }
    function allowedPath(relative) {
      return relative === "data/evidence/index.json" || relative === "data/performance.json"
        || /^data\/evidence\/runs\/[a-f0-9]{64}\/manifest\.json$/.test(relative)
        || /^data\/evidence\/(?:objects|indexes)\/[a-f0-9]{64}\.json\.gz$/.test(relative);
    }
    async function readStream(stream, maximum, expected = null) {
      ensure(stream && typeof stream.getReader === "function", "unsupported-browser", "Bounded streaming downloads are unavailable");
      const reader = stream.getReader(), chunks = []; let length = 0;
      try {
        while (true) {
          const item = await reader.read();
          if (item.done) break;
          const chunk = new Uint8Array(item.value).slice(); length += chunk.byteLength;
          if (length > maximum || (expected !== null && length > expected)) {
            await reader.cancel(); fail("size-bound", "Evidence exceeds declared or allowed size");
          }
          chunks.push(chunk);
        }
      } finally { reader.releaseLock(); }
      ensure(expected === null || length === expected, "size-mismatch", "Evidence size differs from declared bytes");
      const raw = new Uint8Array(length); let offset = 0;
      chunks.forEach(chunk => { raw.set(chunk, offset); offset += chunk.byteLength; });
      return raw;
    }
    async function getBytes(relative, maximum, signal, expected = null) {
      checkAbort(signal);
      ensure(typeof relative === "string" && allowedPath(relative), "invalid-path", "Unsafe evidence path");
      const url = new URL("/" + relative, origin.origin).href;
      const response = await fetcher(url, { credentials: "same-origin", redirect: "error", cache: "no-store", signal });
      ensure(response && response.ok, "http-" + (response && response.status), "Evidence HTTP " + (response && response.status));
      ensure(!response.redirected && response.url === url, "redirect-rejected", "Evidence response redirected or changed origin/path");
      const header = response.headers && response.headers.get("content-length");
      if (header !== null && header !== undefined) ensure(/^\d+$/.test(header) && Number(header) <= maximum, "size-bound", "Evidence Content-Length exceeds its bound");
      const raw = await readStream(response.body, maximum, expected);
      checkAbort(signal);
      return raw;
    }
    async function inflate(compressed, maximum, expected = null) {
      const stream = new root.Blob([compressed.slice()]).stream().pipeThrough(new Decompress("gzip"));
      return readStream(stream, maximum, expected);
    }
    function objectRef(ref) {
      ensure(ref && typeof ref === "object", "invalid-object", "Missing evidence object reference");
      digest(ref.sha256);
      ensure(ref.path === `data/evidence/objects/${ref.sha256}.json.gz`, "invalid-path", "Object path does not match its content hash");
      ensure(Number.isSafeInteger(ref.compressedBytes) && ref.compressedBytes > 0 && ref.compressedBytes <= limits.compressedBytes && Number.isSafeInteger(ref.uncompressedBytes) && ref.uncompressedBytes > 0 && ref.uncompressedBytes <= limits.objectBytes, "size-bound", "Invalid compressed/uncompressed object bounds");
    }
    function publicSnapshot(state) {
      const result = Object.freeze({ status: "complete", mode: state.mode, indexSha256: state.indexSha256,
        currentIndexSha256: state.currentIndexSha256, sourceIndexBytes: state.bytes.slice(), index: clone(state.index),
        performance: state.performance === null ? null : clone(state.performance), performanceSha256: state.performanceSha256,
        performanceStatus: state.mode === "historical" ? "not-archived" : "current-verified",
        selections: state.index.cohort.map(row => ({ strategyId: row.strategyId, symbol: row.symbol, kind: row.kind,
          assets: row.universe.slice(), status: row.status, ...(row.status === "complete" ? { runId: row.runId } : { reason: row.reason }) })) });
      snapshots.set(result, state);
      return result;
    }

    async function loadSnapshot(request = {}) {
      try {
        capabilities();
        const requested = request.indexSha256 === undefined || request.indexSha256 === null ? null : digest(request.indexSha256);
        const expectedCurrent = request.expectedCurrentIndexSha256 === undefined ? null : digest(request.expectedCurrentIndexSha256);
        const expectedPerformance = request.expectedPerformanceSha256 === undefined ? null : digest(request.expectedPerformanceSha256);
        const signal = request.signal;
        if (requested !== null) {
          ensure(expectedCurrent === null && expectedPerformance === null, "conflicting-pins", "Historical archive requests cannot also pin current metadata");
          let compressed;
          try { compressed = await getBytes(`data/evidence/indexes/${requested}.json.gz`, Math.min(limits.compressedBytes, limits.indexBytes + 1024 * 1024), signal); }
          catch (error) { if (error.code === "http-404") fail("historical-index-unavailable", "The exact pinned historical index is absent; latest data was not substituted"); throw error; }
          const raw = await inflate(compressed, limits.indexBytes);
          ensure(await hash(raw) === requested, "historical-index-pin-mismatch", "Historical index checksum differs from requested pin");
          const index = json(raw); validIndex(index);
          checkAbort(signal);
          return publicSnapshot({ mode: "historical", bytes: raw, index, indexSha256: requested, currentIndexSha256: null, performance: null, performanceSha256: null });
        }
        const currentBytes = await getBytes("data/evidence/index.json", limits.indexBytes, signal);
        const currentHash = await hash(currentBytes), current = json(currentBytes), runIds = validIndex(current);
        ensure(expectedCurrent === null || expectedCurrent === currentHash, "current-index-pin-mismatch", "Current evidence index differs from expected pin");
        const performanceBytes = await getBytes("data/performance.json", limits.performanceBytes, signal);
        const performanceHash = await hash(performanceBytes), performance = json(performanceBytes);
        canonical(performance);
        ensure(expectedPerformance === null || expectedPerformance === performanceHash, "performance-pin-mismatch", "Current performance differs from expected pin");
        ensure(performance.generatedAt === current.generatedAt && performance.evidenceIndexFile === "data/evidence/index.json" && same(performance.evidenceRunIds, runIds), "publication-mismatch", "Current index and performance do not describe one publication");
        const again = await getBytes("data/evidence/index.json", limits.indexBytes, signal);
        ensure(await hash(again) === currentHash, "publication-changed", "Current index changed while loading publication metadata");
        checkAbort(signal);
        return publicSnapshot({ mode: "current", bytes: currentBytes, index: current, indexSha256: currentHash,
          currentIndexSha256: currentHash, performance, performanceBytes, performanceSha256: performanceHash });
      } catch (error) { return resultError(error); }
    }

    async function loadSelection(snapshot, selections, request = {}) {
      let controller, external, abort;
      try {
        capabilities();
        const state = snapshots.get(snapshot);
        ensure(state, "unknown-snapshot", "Use a snapshot created by this evidence loader");
        ensure(Array.isArray(selections) && selections.length > 0, "empty-selection", "Select at least one qualified run");
        const selected = clone(selections), requested = new Map();
        selected.forEach(selection => {
          universe(selection.kind, selection.assets); digest(selection.runId);
          const entries = state.index.cohort.filter(row => row.strategyId === selection.strategyId && row.symbol === selection.symbol);
          ensure(entries.length === 1 && entries[0].status === "complete" && entries[0].runId === selection.runId && entries[0].kind === selection.kind && same(entries[0].universe, selection.assets), "requested-run-unavailable", "Pinned index has no complete exact requested run/universe");
          const path = `data/evidence/runs/${selection.runId}/manifest.json`;
          ensure(!own(selection, "manifest") || selection.manifest === path, "invalid-path", "Selection manifest path differs from its run identity");
          if (own(selection, "manifestSha256")) digest(selection.manifestSha256);
          if (requested.has(selection.runId)) {
            const prior = requested.get(selection.runId);
            ensure(!prior.manifestSha256 || !selection.manifestSha256 || prior.manifestSha256 === selection.manifestSha256, "conflicting-manifest-pins", "Duplicate run has conflicting manifest pins");
            if (selection.manifestSha256) prior.manifestSha256 = selection.manifestSha256;
          } else requested.set(selection.runId, { ...selection, path });
        });
        controller = new root.AbortController(); external = request.signal;
        abort = () => controller.abort();
        if (external) { if (external.aborted) { controller.abort(); } else external.addEventListener("abort", abort, { once: true }); }
        const signal = controller.signal, bundles = {}, refs = new Map(), cache = new Map(); let totalBytes = 0;
        for (const selection of requested.values()) {
          const raw = await getBytes(selection.path, limits.manifestBytes, signal), manifestHash = await hash(raw), manifest = json(raw);
          ensure(!selection.manifestSha256 || selection.manifestSha256 === manifestHash, "manifest-pin-mismatch", "Manifest bytes differ from requested pin");
          ensure(manifest.schemaVersion === 2 && manifest.executionModel && manifest.executionModel.id === MODEL && manifest.executionModel.feesBasisPoints === 0, "unsupported-manifest", "Expected v2 gross synthetic evidence");
          ensure(["strategyId", "symbol", "kind", "runId", "assets"].every(key => same(manifest[key], selection[key])), "manifest-identity-mismatch", "Manifest differs from qualified selection");
          ensure(timestamp(manifest.generatedAt) <= timestamp(state.index.generatedAt), "manifest-identity-mismatch", "Manifest is newer than pinned publication");
          const objects = manifest.objects;
          ensure(objects && Array.isArray(objects.records) && objects.records.length > 0 && objects.records.length <= limits.recordChunks, "invalid-object", "Invalid monthly evidence object count");
          objectRef(objects.config); objectRef(objects.source); objects.records.forEach(objectRef);
          const identity = { schemaVersion: 2, strategyId: manifest.strategyId, symbol: manifest.symbol, inputHash: digest(manifest.inputHash),
            configHash: objects.config.sha256, sourceHash: objects.source.sha256, recordHashes: objects.records.map(ref => ref.sha256) };
          ensure(same(identity, manifest.identity) && await hash(new TextEncoder().encode(canonical(identity))) === manifest.runId, "manifest-identity-mismatch", "Manifest run/object hashes do not match identity");
          totalBytes += objects.records.reduce((sum, ref) => sum + ref.uncompressedBytes, 0);
          ensure(Number.isSafeInteger(totalBytes) && totalBytes <= limits.totalRecordBytes, "size-bound", "Selected record payload exceeds aggregate bound");
          const chunks = new Array(objects.records.length); let next = 0;
          async function worker() {
            while (next < objects.records.length) {
              const ordinal = next++, ref = objects.records[ordinal], key = `${ref.sha256}:${ref.compressedBytes}:${ref.uncompressedBytes}`;
              if (!cache.has(key)) cache.set(key, (async () => {
                const compressed = await getBytes(ref.path, limits.compressedBytes, signal, ref.compressedBytes);
                const bytes = await inflate(compressed, limits.objectBytes, ref.uncompressedBytes);
                ensure(await hash(bytes) === ref.sha256, "object-pin-mismatch", "Monthly evidence object checksum mismatch");
                return bytes;
              })());
              chunks[ordinal] = (await cache.get(key)).slice();
            }
          }
          await Promise.all(Array.from({ length: Math.min(4, chunks.length) }, worker));
          const rows = []; let priorDate = "", priorMonth = "";
          chunks.forEach(bytes => {
            const chunk = json(bytes); canonical(chunk);
            ensure(same(chunk.assets, manifest.assets) && typeof chunk.month === "string" && chunk.month > priorMonth && Array.isArray(chunk.rows) && chunk.rows.length, "invalid-records", "Invalid monthly record universe/order");
            priorMonth = chunk.month;
            chunk.rows.forEach(row => {
              validDay(row.date);
              ensure(row.date > priorDate && row.date.slice(0, 7) === chunk.month && same(Object.keys(row.assets).sort(), manifest.assets.slice().sort()), "invalid-records", "Record dates or asset coverage differ");
              const totals = ["grossReturn", "equity", "targetGrossExposure", "targetNetExposure", "targetCashWeight", "effectiveGrossExposure", "effectiveNetExposure", "effectiveCashWeight", "driftedCashWeight", "targetChange", "rebalanceTurnover"];
              const assetFields = ["targetWeight", "effectiveWeight", "assetReturn", "contribution", "driftedWeight", "targetChange", "rebalanceTurnover"];
              ensure(totals.every(key => typeof row[key] === "number" && Number.isFinite(row[key])) && manifest.assets.every(asset => assetFields.every(key => typeof row.assets[asset][key] === "number" && Number.isFinite(row.assets[asset][key]))), "invalid-records", "Missing/nonfinite full-precision record values");
              priorDate = row.date; rows.push(row);
            });
          });
          ensure(rows.length >= 2 && rows.length === manifest.summary.observations && rows[0].date === manifest.observedFrom && rows.at(-1).date === manifest.observedThrough, "invalid-records", "Complete record history differs from manifest endpoints/count");
          const ref = Object.fromEntries(["strategyId", "symbol", "kind", "assets", "runId"].map(key => [key, clone(manifest[key])]));
          ref.manifestSha256 = manifestHash; refs.set(selection.runId, ref);
          bundles[selection.runId] = { manifest: raw.slice(), recordChunks: chunks, records: rows };
        }
        if (state.mode === "current") {
          const [indexBytes, performanceBytes] = await Promise.all([
            getBytes("data/evidence/index.json", limits.indexBytes, signal), getBytes("data/performance.json", limits.performanceBytes, signal)]);
          ensure(await hash(indexBytes) === state.indexSha256 && await hash(performanceBytes) === state.performanceSha256, "publication-changed", "Current publication changed while loading selected records");
        }
        checkAbort(signal);
        return { status: "complete", mode: state.mode, references: selected.map(selection => clone(refs.get(selection.runId))), bundles,
          sourceIndexBytes: state.bytes.slice(), expectedIndexSha256: state.indexSha256,
          publication: { generatedAt: state.index.generatedAt, performanceStatus: state.mode === "historical" ? "not-archived" : "current-verified" },
          verification: "Exact hashes, qualified identities and full record shape verified; the pure portfolio engine checks recorded arithmetic." };
      } catch (error) { if (controller) controller.abort(); return resultError(error); }
      finally { if (external && abort) external.removeEventListener("abort", abort); }
    }
    return { loadSnapshot, loadSelection };
  }
  return { createLoader, limits: LIMITS, executionModelId: MODEL };
});

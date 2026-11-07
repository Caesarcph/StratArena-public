/* Pure R5 reference port. No fetch, DOM, storage, or Node dependencies.
 * Async comparison methods verify exact index/manifest/monthly UTF-8 bytes.
 * bundle.recordChunks contains original uncompressed monthly JSON bytes/text,
 * in manifest order; optional bundle.records must equal their parsed rows.
 * Never JSON.stringify floats to reconstruct Python's evidence byte hashes.
 * createEngine({ sha256 }) may inject a trusted async byte-to-hex SHA-256;
 * otherwise browser WebCrypto is required. Helpers are synchronous.
 * await PortfolioMarginal.compareAddition(base, candidate, alpha, bundles,
 *   { sourceIndexBytes, expectedIndexSha256, bps, cadence, window, start, end });
 * compareRemoval(base, removeRunId, bundles, settings) uses the same contract.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(root);
  else root.PortfolioMarginal = factory(root);
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const MODEL_ID = "independent-sleeves-shared-close-v1";
  const COST_MODEL_ID = "synthetic-exposure-cost-v1";
  const EXECUTION_MODEL_ID = "synthetic-daily-target-v3";
  const MODEL = {
    id: MODEL_ID, costModelId: COST_MODEL_ID, executionModelId: EXECUTION_MODEL_ID,
    label: "Independent sleeves; allocation changes do not net across strategies",
    initialCapital: 1,
    anchor: "Existing base books at the shared start close; one initial allocation settlement.",
    sequence: "Native strategy returns/internal fees first, then shared-close allocation settlement.",
    feeUnits: "portfolio-initial-capital-units",
    volatility: "Calendar-time log-return volatility over positive-duration shared intervals.",
    identity: "Exact ordered raw inputs and pins; numeric settings use normalized IEEE-754 binary64 hex. Proportional raw weights can have different experiment IDs.",
    limitations: "Synthetic exposures, not broker holdings or common-currency valuation; no financing/borrow/funding/taxes/impact. Shared closes can hide interim drawdowns and do not certify exchange-calendar completeness or simultaneous closes."
  };
  const WINDOWS = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "3Y": 36, "5Y": 60, Max: null };
  const REF_KEYS = ["strategyId", "symbol", "kind", "assets", "runId", "manifestSha256"];
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const clone = value => JSON.parse(JSON.stringify(value));
  const unavailable = (reason, details) => Object.assign({ status: "unavailable", reason }, details || {});

  function number(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Expected a finite number");
    return value;
  }
  function digest(value) {
    if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) throw new Error("Expected a lowercase SHA-256 digest");
    return value;
  }
  function close(a, b, rel = 1e-9, abs = 0) {
    return a === b || Math.abs(a - b) <= Math.max(abs, rel * Math.max(Math.abs(a), Math.abs(b)));
  }
  function equalNumber(actual, expected, label) {
    if (!close(number(actual), expected, 1e-10, 1e-10)) throw new Error("Recorded arithmetic mismatch: " + label);
  }
  // Error-free partial summation, including CPython fsum's final rounding fix.
  function fsum(values) {
    const partials = [];
    for (let x of values) {
      number(x);
      let index = 0;
      for (let y of partials) {
        if (Math.abs(x) < Math.abs(y)) [x, y] = [y, x];
        const hi = x + y, lo = y - (hi - x);
        if (!Number.isFinite(hi)) throw new Error("Sum overflows");
        if (lo) partials[index++] = lo;
        x = hi;
      }
      partials.length = index;
      partials.push(x);
    }
    let count = partials.length, hi = 0, lo = 0;
    if (count) {
      hi = partials[--count];
      while (count) {
        const x = hi, y = partials[--count];
        hi = x + y;
        lo = y - (hi - x);
        if (lo) break;
      }
      if (count && ((lo < 0 && partials[count - 1] < 0) || (lo > 0 && partials[count - 1] > 0))) {
        const y = lo * 2, x = hi + y;
        if (y === x - hi) hi = x;
      }
    }
    return hi;
  }
  function asciiString(value) {
    return JSON.stringify(value).replace(/[\u007f-\uffff]/g, char => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
  }
  function codePointOrder(left, right) {
    const a = Array.from(left, value => value.codePointAt(0)), b = Array.from(right, value => value.codePointAt(0));
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
  }
  function canonical(value) {
    if (value === null) return "null";
    if (typeof value === "string") return asciiString(value);
    if (typeof value === "boolean") return String(value);
    if (typeof value === "number") return JSON.stringify(number(value));
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (!value || typeof value !== "object") throw new Error("Invalid JSON value");
    return "{" + Object.keys(value).sort(codePointOrder).map(key => asciiString(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  const equal = (left, right) => canonical(left) === canonical(right);
  function bytes(value) {
    if (typeof value === "string") return new TextEncoder().encode(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
    if (Object.prototype.toString.call(value) === "[object ArrayBuffer]") return new Uint8Array(value).slice();
    throw new Error("Expected original UTF-8 bytes or text");
  }
  const parseBytes = value => JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes(value)));
  function binary64(value) {
    value = number(value);
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setFloat64(0, value === 0 ? 0 : value, false);
    return Array.from(new Uint8Array(buffer), item => item.toString(16).padStart(2, "0")).join("");
  }
  function day(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Expected an exact ISO calendar date");
    const [year, month, date] = value.split("-").map(Number);
    if (year < 1 || month < 1 || month > 12 || date < 1 || date > monthDays(year, month)) throw new Error("Expected an exact ISO calendar date");
    return { year, month, date, ordinal: Date.parse(value + "T00:00:00Z") / 86400000 };
  }
  function monthDays(year, month) {
    return month === 2 ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28) : ([4, 6, 9, 11].includes(month) ? 30 : 31);
  }
  const iso = (year, month, date) => String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0") + "-" + String(date).padStart(2, "0");
  function timestamp(value) {
    const match = typeof value === "string" && /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match) throw new Error("Invalid manifest/publication timestamp ordering");
    const [, date, hh, mm, ss, fraction, zone] = match;
    if (+hh > 23 || +mm > 59 || +ss > 59) throw new Error("Invalid timestamp");
    let offset = 0;
    if (zone !== "Z") {
      const hours = +zone.slice(1, 3), minutes = +zone.slice(4, 6);
      if (hours > 23 || minutes > 59) throw new Error("Invalid timezone offset");
      offset = (zone[0] === "-" ? -1 : 1) * (hours * 60 + minutes);
    }
    return BigInt(day(date).ordinal) * 86400000000n + BigInt(+hh * 3600 + +mm * 60 + +ss - offset * 60) * 1000000n + BigInt((fraction || "").padEnd(6, "0"));
  }
  function reference(value) {
    if (!value || typeof value !== "object") throw new Error("Malformed qualified reference");
    const ref = {};
    REF_KEYS.forEach(key => { if (!own(value, key)) throw new Error("Malformed qualified reference"); ref[key] = clone(value[key]); });
    digest(ref.runId); digest(ref.manifestSha256);
    if (["strategyId", "symbol"].some(key => typeof ref[key] !== "string" || !ref[key])) throw new Error("Invalid qualified strategy identity");
    if (!Array.isArray(ref.assets) || !ref.assets.length || ref.assets.some(asset => typeof asset !== "string" || !asset) || new Set(ref.assets).size !== ref.assets.length || !["single", "basket"].includes(ref.kind) || (ref.kind === "single" && ref.assets.length !== 1)) throw new Error("Invalid kind or ordered asset universe");
    return ref;
  }

  function normalizeAllocations(raw) {
    const values = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, number(value)]));
    if (Object.values(values).some(value => value < 0)) throw new Error("Outer allocations cannot be negative");
    if (!Object.keys(values).length) return [{}, false];
    const total = fsum(Object.values(values)), fallback = total === 0;
    const result = Object.fromEntries(Object.entries(values).filter(([, value]) => fallback || value > 0).map(([key, value]) => [key, fallback ? 1 / Object.keys(values).length : value / total]));
    let largest = Object.keys(result)[0];
    for (const key of Object.keys(result)) if (result[key] > result[largest]) largest = key;
    result[largest] += 1 - fsum(Object.values(result));
    return [result, fallback];
  }
  function removeAllocation(raw, runId) {
    if (!own(raw, runId)) throw new Error("Removal target is not a portfolio component");
    return normalizeAllocations(Object.fromEntries(Object.entries(raw).filter(([key]) => key !== runId)))[0];
  }
  function settleAllocation(capitals, targets, exposures, bps) {
    if (!capitals.length || capitals.length !== targets.length || capitals.length !== exposures.length) throw new Error("Settlement vectors must have equal nonzero length");
    [capitals, targets, exposures] = [capitals, targets, exposures].map(values => values.map(number));
    const rate = number(bps) / 10000, capital = number(fsum(capitals));
    if (rate < 0 || [capitals, targets, exposures].some(values => values.some(value => value < 0))) throw new Error("Settlement inputs cannot be negative");
    if (capital <= 0 || !close(fsum(targets), 1, 0, 1e-12)) throw new Error("Settlement requires positive capital and unit target allocations");
    if (rate * Math.max(...exposures) >= 1) throw new Error("Infeasible allocation fee/exposure bound");
    if (targets.every((target, index) => target * capital === capitals[index])) return { wealth: capital, capitals: capitals.slice(), turnoverNotional: 0, feesPaid: 0, residual: 0 };
    const incoming = capitals.map(value => value / capital);
    let fraction = 1;
    if (rate !== 0) {
      let low = 0, high = 1;
      for (let step = 0; step < 64; step++) {
        fraction = (low + high) / 2;
        const paid = rate * fsum(exposures.map((exposure, index) => exposure * Math.abs(targets[index] * fraction - incoming[index])));
        if (fraction + paid > 1) high = fraction; else low = fraction;
        if (high - low <= 1e-14) break;
      }
      fraction = (low + high) / 2;
    }
    const wealth = capital * fraction, final = targets.map(value => value * wealth);
    const turnover = number(fsum(exposures.map((value, index) => value * Math.abs(final[index] - capitals[index]))));
    const fee = number(rate * turnover), residual = fsum(final) + fee - capital;
    if (wealth <= 0 || Math.abs(residual) > 1e-12 * Math.max(1, capital)) throw new Error("Allocation settlement does not reconcile");
    return { wealth: fsum(final), capitals: final, turnoverNotional: turnover, feesPaid: fee, residual };
  }

  function recoveryEpisode(dates, wealth) {
    if (!dates.length || dates.length !== wealth.length) throw new Error("Recovery needs aligned nonempty dates and wealth");
    const parsed = dates.map(day), values = wealth.map(number);
    if (parsed.some((value, i) => i && value.ordinal <= parsed[i - 1].ordinal)) throw new Error("Recovery dates must be strictly increasing");
    if (values.some(value => value <= 0)) throw new Error("Recovery wealth must be positive");
    let peak = 1, peakIndex = 0, peakPhase = "pre-settlement", deepest = 0, episode = null;
    values.forEach((value, index) => {
      if (value >= peak) { peak = value; peakIndex = index; peakPhase = "post-close"; }
      const drawdown = value / peak - 1;
      if (drawdown < deepest && !close(drawdown, deepest, 1e-12, 0)) { deepest = drawdown; episode = [peak, peakIndex, peakPhase, index]; }
    });
    if (!episode) return { status: "no-drawdown", maxDrawdown: 0, peakDate: null, troughDate: null, recoveryDate: null, peakToRecoveryDays: 0, ongoingDays: 0 };
    const [maximum, start, phase, trough] = episode;
    let recovered = null;
    for (let index = trough + 1; index < values.length; index++) if (values[index] >= maximum || close(values[index], maximum, 1e-12, 0)) { recovered = index; break; }
    return { status: recovered === null ? "ongoing" : "recovered", maxDrawdown: deepest, peakDate: dates[start], peakPhase: phase,
      troughDate: dates[trough], troughPhase: trough === 0 ? "post-settlement" : "post-close", recoveryDate: recovered === null ? null : dates[recovered],
      peakToRecoveryDays: recovered === null ? null : parsed[recovered].ordinal - parsed[start].ordinal, ongoingDays: recovered === null ? parsed.at(-1).ordinal - parsed[start].ordinal : 0 };
  }
  function metrics(dates, wealth) {
    const factors = wealth.slice(1).map((value, i) => number(value / wealth[i]));
    if (factors.some(value => value <= 0)) throw new Error("Shared-interval factor underflow");
    const elapsed = day(dates.at(-1)).ordinal - day(dates[0]).ordinal;
    const intervals = dates.slice(1).map((value, i) => (day(value).ordinal - day(dates[i]).ordinal) / 365.25);
    const logs = wealth.slice(1).map((value, i) => Math.log(value) - Math.log(wealth[i]));
    let cagr = null, cagrReason = "zero-elapsed-time", volatility = null, reason = "too-few-intervals";
    if (elapsed > 0) { cagr = Math.expm1(Math.log(wealth.at(-1)) * 365.25 / elapsed); cagrReason = Number.isFinite(cagr) ? null : "annualization-overflow"; if (cagrReason) cagr = null; }
    if (logs.length >= 2) { const mean = fsum(logs) / fsum(intervals); volatility = Math.sqrt(fsum(logs.map((value, i) => (value - mean * intervals[i]) ** 2 / intervals[i])) / (logs.length - 1)); reason = null; }
    const episode = recoveryEpisode(dates, wealth);
    return { initialCapital: 1, totalReturn: wealth.at(-1) - 1, cagr, cagrUnavailableReason: cagrReason, calendarLogVolatility: volatility, volatilityUnavailableReason: reason, returnIntervals: logs.length, maxDrawdown: episode.maxDrawdown, recovery: episode };
  }
  function downsideCorrelation(beforeReturns, candidateReturns) {
    if (beforeReturns.length !== candidateReturns.length) throw new Error("Downside samples must cover the same intervals");
    const pairs = beforeReturns.map((value, index) => [number(value), number(candidateReturns[index])]), downside = pairs.filter(([value]) => value < 0);
    const result = { downsideCount: downside.length, totalIntervals: pairs.length, jointNegativeCount: downside.filter(([, value]) => value < 0).length, correlation: null };
    if (downside.length < 3) return { ...result, status: "unavailable", reason: downside.length ? "too-few-pairs" : "no-downside" };
    const left = downside.map(pair => pair[0]), right = downside.map(pair => pair[1]);
    if ([left, right].some(values => Math.max(...values) - Math.min(...values) <= 1e-12 * Math.max(1, ...values.map(Math.abs)))) return { ...result, status: "unavailable", reason: "constant-return" };
    const lm = fsum(left) / left.length, rm = fsum(right) / right.length;
    const covariance = fsum(downside.map(([a, b]) => (a - lm) * (b - rm)));
    const scale = Math.sqrt(fsum(left.map(a => (a - lm) ** 2)) * fsum(right.map(b => (b - rm) ** 2)));
    return { ...result, status: "complete", reason: null, correlation: Math.max(-1, Math.min(1, covariance / scale)) };
  }
  function jointLosingMonths(dates, before, candidate) {
    if (dates.length !== before.length || dates.length !== candidate.length) throw new Error("Monthly samples must cover the same closes");
    if ([before, candidate].some(values => values.some(value => number(value) <= 0))) throw new Error("Monthly endpoint wealth must be positive");
    if (dates.some((value, i) => i && day(value).ordinal <= day(dates[i - 1]).ordinal)) throw new Error("Monthly dates must be strictly increasing");
    const endpoints = new Map(), periods = [], excluded = [];
    dates.forEach((value, i) => { const parsed = day(value); endpoints.set(parsed.year * 12 + parsed.month - 1, i); });
    const months = [...endpoints.keys()].sort((a, b) => a - b);
    months.forEach((month, position) => {
      const end = endpoints.get(month), parsed = day(dates[end]);
      let reason = null;
      if (!endpoints.has(month - 1)) reason = "missing-preceding-month-endpoint";
      else if (months[position + 1] !== month + 1 && parsed.date !== monthDays(parsed.year, parsed.month)) reason = "partial-trailing-month";
      if (reason) { excluded.push({ month: dates[end].slice(0, 7), end: dates[end], reason }); return; }
      const start = endpoints.get(month - 1), a = number(before[end] / before[start] - 1), b = number(candidate[end] / candidate[start] - 1);
      periods.push({ start: dates[start], end: dates[end], beforeReturn: a, candidateReturn: b, jointLoss: a < 0 && b < 0 });
    });
    return { status: periods.length ? "complete" : "unavailable", label: "shared-close monthly periods", reason: periods.length ? null : "no-complete-monthly-periods", periods, completeCount: periods.length, excludedCount: excluded.length, excluded, jointLosingCount: periods.filter(row => row.jointLoss).length };
  }
  function signedOverlap(baseHoldings, candidateTargets) {
    const long = Object.create(null), short = Object.create(null), allocations = baseHoldings.map(row => number(row.allocation));
    if (allocations.some(value => value < 0) || !close(fsum(allocations), 1, 1e-9, 1e-12)) throw new Error("Overlap requires unit nonnegative sleeve fractions");
    baseHoldings.forEach((holding, i) => Object.entries(holding.targets).forEach(([asset, raw]) => {
      const value = number(raw); long[asset] = (long[asset] || 0) + allocations[i] * Math.max(value, 0); short[asset] = (short[asset] || 0) + allocations[i] * Math.max(-value, 0);
    }));
    const candidate = Object.fromEntries(Object.entries(candidateTargets).map(([asset, value]) => [asset, number(value)]));
    const table = []; let intersection = 0, union = 0, opposed = 0;
    [...new Set([...Object.keys(long), ...Object.keys(candidate)])].sort(codePointOrder).forEach(asset => {
      const candidateValue = own(candidate, asset) ? candidate[asset] : 0;
      const bl = long[asset] || 0, bs = short[asset] || 0, cl = Math.max(candidateValue, 0), cs = Math.max(-candidateValue, 0);
      intersection += Math.min(bl, cl) + Math.min(bs, cs); union += Math.max(bl, cl) + Math.max(bs, cs); opposed += Math.min(bl, cs) + Math.min(bs, cl);
      table.push({ asset, baseLong: bl, baseShort: bs, baseNet: bl - bs, candidateLong: cl, candidateShort: cs, candidateNet: cl - cs });
    });
    const baseRisky = fsum(Object.values(long)) + fsum(Object.values(short)), candidateRisky = fsum(Object.values(candidate).map(Math.abs));
    const reason = baseRisky === 0 ? "cash-only-base" : candidateRisky === 0 ? "cash-only-candidate" : null;
    return { status: reason ? "unavailable" : "complete", reason, signedJaccard: reason ? null : intersection / union, opposingNotional: opposed, assets: table,
      baseResidualCash: 1 - fsum(table.map(row => row.baseNet)), candidateResidualCash: 1 - fsum(Object.values(candidate)), label: "Recorded synthetic target exposure; not broker holdings or a netting credit." };
  }

  function nativePath(gross, turnover, bps) {
    const equity = [], netReturns = [], feesPaid = []; let wealth = 1;
    gross.forEach((value, i) => {
      const feeFraction = turnover[i] * bps / 10000, factor = (1 + value) * (1 - feeFraction);
      if (!Number.isFinite(factor) || factor <= 0) throw new Error("Scenario has a nonpositive or nonfinite net factor");
      feesPaid.push(number(number(wealth * (1 + value)) * feeFraction));
      wealth *= factor;
      if (!Number.isFinite(wealth) || wealth <= 0) throw new Error("Scenario equity is nonpositive or nonfinite");
      equity.push(wealth); netReturns.push(factor - 1);
    });
    return { equity, netReturns, feesPaid, feesPaidUnit: "initial-capital-units", grossReturns: gross.slice(), turnover: turnover.slice() };
  }
  function validateArithmetic(manifest, rows, bps) {
    const assets = manifest.assets;
    if (manifest.schemaVersion !== 2 || manifest.executionModel.id !== EXECUTION_MODEL_ID || manifest.executionModel.feesBasisPoints !== 0) throw new Error("Expected v2 gross synthetic daily target evidence");
    if (!Array.isArray(rows) || rows.length < 2) throw new Error("Complete history requires at least two observations");
    const dates = [], markets = [], gross = [], turnover = []; let previous = assets.map(() => 0), wealth = 1;
    rows.forEach(row => {
      day(row.date);
      if (dates.length && row.date <= dates.at(-1)) throw new Error("Dates must be strictly increasing and unique");
      if (!equal(Object.keys(row.assets).sort(), assets.slice().sort())) throw new Error("Missing or extra asset observation");
      const target = assets.map(asset => number(row.assets[asset].targetWeight)), market = assets.map(asset => number(row.assets[asset].assetReturn));
      if (market.some(value => value <= -1) || (!dates.length && market.some(value => value !== 0))) throw new Error("Invalid asset return or initial observation");
      const value = fsum(previous.map((weight, i) => weight * market[i]));
      if (value <= -1) throw new Error("Gross equity is nonpositive");
      const drift = previous.map((weight, i) => weight * (1 + market[i]) / (1 + value));
      const traded = target.map((weight, i) => Math.abs(weight - drift[i]));
      assets.forEach((asset, i) => {
        equalNumber(row.assets[asset].effectiveWeight, previous[i], "effective weight");
        equalNumber(row.assets[asset].driftedWeight, drift[i], "drifted weight");
        equalNumber(row.assets[asset].rebalanceTurnover, traded[i], "asset turnover");
      });
      equalNumber(row.grossReturn, value, "gross return"); equalNumber(row.rebalanceTurnover, fsum(traded), "total turnover");
      if (row.rebalanceTurnover < 0) throw new Error("Turnover cannot be negative");
      wealth *= 1 + value; equalNumber(row.equity, wealth, "equity");
      dates.push(row.date); markets.push(market); gross.push(number(row.grossReturn)); turnover.push(number(row.rebalanceTurnover)); previous = target;
    });
    if (dates[0] !== manifest.observedFrom || dates.at(-1) !== manifest.observedThrough || manifest.summary.observations !== rows.length) throw new Error("History endpoints or length do not match manifest");
    equalNumber(manifest.summary.terminalEquity, wealth, "terminal equity");
    // The R3 reference also validates feasibility of its matched benchmark.
    const bg = [], bt = [], target = assets.map(() => 1 / assets.length); previous = assets.map(() => 0);
    markets.forEach(market => {
      const value = fsum(previous.map((weight, i) => weight * market[i]));
      if (value <= -1) throw new Error("Benchmark gross equity is nonpositive");
      const drift = previous.map((weight, i) => weight * (1 + market[i]) / (1 + value));
      bg.push(value); bt.push(fsum(target.map((weight, i) => Math.abs(weight - drift[i])))); previous = target;
    });
    nativePath(bg, bt, 0); if (bps !== 0) nativePath(bg, bt, bps);
    return { dates, gross: nativePath(gross, turnover, 0), net: nativePath(gross, turnover, bps) };
  }
  function sharedWindow(legs, window, start, end) {
    const values = Object.values(legs), others = values.slice(1).map(leg => new Set(leg.dates));
    const shared = values[0].dates.filter(value => others.every(set => set.has(value))).sort();
    if (!shared.length) return [[], { requestedStart: start, requestedEnd: end, availableSharedCloses: 0 }];
    const eligible = end === null ? shared : shared.filter(value => value <= end);
    if (!eligible.length) return [[], { requestedStart: start, requestedEnd: end, availableSharedCloses: shared.length }];
    const commonEnd = eligible.at(-1); let requestedStart = start;
    if (window !== "Max") {
      const last = day(commonEnd), monthIndex = last.year * 12 + last.month - 1 - WINDOWS[window];
      const year = Math.floor(monthIndex / 12), month = monthIndex - year * 12 + 1;
      requestedStart = iso(year, month, Math.min(last.date, monthDays(year, month)));
      day(requestedStart);
    }
    const dates = eligible.filter(value => requestedStart === null || value >= requestedStart), set = new Set(dates);
    const context = { requestedStart, requestedEnd: end, effectiveStart: dates[0] || null, effectiveEnd: commonEnd,
      availableSharedCloses: shared.length, sharedCloses: dates.length, returnIntervals: Math.max(0, dates.length - 1), window,
      historyCoverage: requestedStart && shared[0] > requestedStart ? "partial-requested-history" : "available-requested-history",
      anchor: "shared-start-close-existing-base", nativeSources: {} };
    Object.entries(legs).forEach(([key, leg]) => {
      const first = dates.length ? leg.lookup.get(dates[0]) : leg.dates.length;
      let last = leg.dates.findIndex(value => value > commonEnd); if (last < 0) last = leg.dates.length;
      context.nativeSources[key] = { sourceObservations: leg.dates.length, windowNativeObservations: Math.max(0, last - first),
        excludedBeforeStartCount: first, excludedTailDates: leg.dates.slice(last), skippedInteriorNativeDates: leg.dates.slice(first, last).filter(value => !set.has(value)) };
    });
    return [dates, context];
  }
  function checkSharedMarks(legs, dates) {
    const counts = new Map(), values = Object.values(legs);
    values.forEach(leg => leg.ref.assets.forEach(asset => counts.set(asset, (counts.get(asset) || 0) + 1)));
    for (let interval = 1; interval < dates.length; interval++) {
      const left = dates[interval - 1], right = dates[interval], marks = new Map();
      values.forEach(leg => {
        const start = leg.lookup.get(left), end = leg.lookup.get(right);
        leg.ref.assets.filter(asset => counts.get(asset) > 1).forEach(asset => {
          const change = fsum(leg.rows.slice(start + 1, end + 1).map(row => Math.log1p(row.assets[asset].assetReturn)));
          if (marks.has(asset) && !close(change, marks.get(asset), 1e-10, 1e-10)) throw new Error(`Conflicting ${asset} marks over (${left}, ${right}]`);
          marks.set(asset, change);
        });
      });
    }
  }
  function period(value, cadence) {
    const parsed = day(value);
    return parsed.year + ":" + (cadence === "monthly" ? parsed.month : Math.floor((parsed.month - 1) / 3));
  }
  function simulate(legs, dates, base, target, basis, bps, cadence, initialPhase) {
    const keys = Object.keys(legs), paths = Object.fromEntries(keys.map(key => [key, legs[key][basis]]));
    let capitals = keys.map(key => base[key] || 0);
    const units = Object.fromEntries(keys.map((key, i) => [key, number(capitals[i] / paths[key].equity[legs[key].lookup.get(dates[0])])]));
    const wealth = [], weights = [], internalFees = [], outerFees = [], internalEvents = [], outerEvents = [], resetDates = [];
    const rate = basis === "gross" ? 0 : bps;
    function settle(date, current, phase) {
      const exposures = keys.map(key => fsum(Object.values(legs[key].rows[legs[key].lookup.get(date)].assets).map(row => Math.abs(row.targetWeight))));
      const result = settleAllocation(current, keys.map(key => target[key] || 0), exposures, rate);
      keys.forEach((key, i) => { units[key] = number(result.capitals[i] / paths[key].equity[legs[key].lookup.get(date)]); });
      outerEvents.push({ date, phase, preFeeWealth: fsum(current), postFeeWealth: result.wealth, turnoverNotional: result.turnoverNotional, feesPaid: result.feesPaid, residual: result.residual });
      return [result.capitals, result.feesPaid];
    }
    let initialFee = 0;
    if (!equal(target, base)) [capitals, initialFee] = settle(dates[0], capitals, initialPhase);
    let value = number(fsum(capitals));
    wealth.push(value); weights.push(Object.fromEntries(keys.map((key, i) => [key, capitals[i] / value]))); internalFees.push(0); outerFees.push(initialFee);
    for (let interval = 1; interval < dates.length; interval++) {
      const left = dates[interval - 1], right = dates[interval], events = [];
      keys.forEach(key => {
        if (units[key] === 0) return;
        const leg = legs[key], path = paths[key], start = leg.lookup.get(left), end = leg.lookup.get(right);
        const paid = number(units[key] * fsum(path.feesPaid.slice(start + 1, end + 1))), notionals = [];
        for (let i = start + 1; i <= end; i++) notionals.push(path.equity[i - 1] * (1 + path.grossReturns[i]) * path.turnover[i]);
        events.push({ runId: key, nativeDates: leg.dates.slice(start + 1, end + 1), feesPaid: paid, turnoverNotional: number(units[key] * fsum(notionals)) });
      });
      const fee = number(fsum(events.map(event => event.feesPaid)));
      internalEvents.push({ start: left, end: right, sleeves: events, feesPaid: fee, turnoverNotional: fsum(events.map(event => event.turnoverNotional)) });
      capitals = keys.map(key => number(units[key] * paths[key].equity[legs[key].lookup.get(right)]));
      let outer = 0;
      if (cadence !== "never" && period(left, cadence) !== period(right, cadence)) { [capitals, outer] = settle(right, capitals, "scheduled-reset"); resetDates.push(right); }
      value = number(fsum(capitals)); if (value <= 0) throw new Error("Portfolio wealth is nonpositive");
      wealth.push(value); weights.push(Object.fromEntries(keys.map((key, i) => [key, capitals[i] / value]))); internalFees.push(fee); outerFees.push(outer);
    }
    const internalTotal = fsum(internalFees), outerTotal = fsum(outerFees);
    return { wealth, postCloseWeights: weights, initialCapital: 1, internalFeesPaid: internalFees, outerFeesPaid: outerFees,
      totalInternalFeesPaid: internalTotal, totalOuterFeesPaid: outerTotal, totalFeesPaid: internalTotal + outerTotal,
      feeUnits: "portfolio-initial-capital-units", internalEvents, outerEvents, scheduledResetDates: resetDates, metrics: metrics(dates, wealth) };
  }

  function createEngine(options = {}) {
    async function hash(value) {
      const raw = bytes(value);
      if (options.sha256) return digest(await options.sha256(raw));
      if (!root.crypto || !root.crypto.subtle) {
        const error = new Error("WebCrypto SHA-256 is unavailable");
        error.code = "CRYPTO_UNAVAILABLE";
        throw error;
      }
      const result = await root.crypto.subtle.digest("SHA-256", raw);
      return Array.from(new Uint8Array(result), item => item.toString(16).padStart(2, "0")).join("");
    }
    async function prepare(ref, bundle, index, bps) {
      // Snapshot before the first await: authenticate and parse the same bytes
      // even if the caller replaces/mutates its buffers during async hashing.
      const manifestBytes = bytes(bundle.manifest);
      const chunks = Array.isArray(bundle.recordChunks) ? bundle.recordChunks.map(bytes) : null;
      const hasRecords = own(bundle, "records"), suppliedRows = hasRecords ? clone(bundle.records) : null;
      if (await hash(manifestBytes) !== ref.manifestSha256) throw new Error("Manifest bytes differ from exact caller pin");
      const manifest = parseBytes(manifestBytes);
      if (REF_KEYS.filter(key => key !== "manifestSha256").some(key => !equal(manifest[key], ref[key]))) throw new Error("Qualified sleeve identity differs from manifest");
      const published = index.runs[ref.strategyId][ref.symbol];
      if (published.runId !== ref.runId || published.manifest !== `data/evidence/runs/${ref.runId}/manifest.json`) throw new Error("Pinned publication does not resolve to requested run");
      const entries = index.cohort.filter(row => row.strategyId === ref.strategyId && row.symbol === ref.symbol);
      if (entries.length !== 1 || entries[0].status !== "complete" || entries[0].runId !== ref.runId || entries[0].kind !== ref.kind || !equal(entries[0].universe, ref.assets)) throw new Error("Pinned publication has no complete matching sleeve");
      if (timestamp(manifest.generatedAt) > timestamp(index.generatedAt)) throw new Error("Invalid manifest/publication timestamp ordering");
      const identity = { schemaVersion: 2, strategyId: manifest.strategyId, symbol: manifest.symbol, inputHash: digest(manifest.inputHash),
        configHash: digest(manifest.objects.config.sha256), sourceHash: digest(manifest.objects.source.sha256), recordHashes: manifest.objects.records.map(item => digest(item.sha256)) };
      if (!equal(identity, manifest.identity) || await hash(canonical(identity)) !== digest(manifest.runId)) throw new Error("Manifest identity mismatch");
      if (!chunks || chunks.length !== identity.recordHashes.length) throw new Error("Complete original monthly record bytes are required");
      const rows = []; let previousMonth = "";
      for (let i = 0; i < chunks.length; i++) {
        if (await hash(chunks[i]) !== identity.recordHashes[i]) throw new Error("Record content does not match manifest monthly hashes");
        const chunk = parseBytes(chunks[i]);
        // Walking all values also rejects overflowing JSON numeric literals.
        canonical(chunk);
        if (!equal(chunk.assets, manifest.assets) || !Array.isArray(chunk.rows) || !chunk.rows.length || typeof chunk.month !== "string" || chunk.month <= previousMonth || chunk.rows.some(row => typeof row.date !== "string" || row.date.slice(0, 7) !== chunk.month)) throw new Error("Invalid ordered monthly record chunk");
        rows.push(...chunk.rows); previousMonth = chunk.month;
      }
      if (hasRecords && !equal(suppliedRows, rows)) throw new Error("Supplied records differ from verified monthly bytes");
      const originalRows = hasRecords ? suppliedRows : rows;
      const native = validateArithmetic(manifest, originalRows, bps);
      return { ref, rows: originalRows, ...native, lookup: new Map(native.dates.map((value, i) => [value, i])), recordHashes: identity.recordHashes };
    }

    async function compareAllocations(base, bundles, operation, candidate, alpha, removeRunId, settings) {
      const { sourceIndexBytes, expectedIndexSha256, bps: rawBps = 10, cadence = "monthly", window = "Max", start = null, end = null, modelId = MODEL_ID } = settings;
      const bps = number(rawBps);
      if (bps < 0) throw new Error("Basis points must be nonnegative");
      if (operation === "addition") { alpha = number(alpha); if (alpha < 0 || alpha > 1) throw new Error("Alpha must be in [0,1]"); }
      if (!["monthly", "quarterly", "never"].includes(cadence) || !own(WINDOWS, window)) throw new Error("Unknown cadence or window");
      if (start !== null) { day(start); if (window !== "Max") throw new Error("Choose either an explicit start or a calendar lookback"); }
      if (end !== null) day(end);
      if (start && end && start > end) throw new Error("Requested start follows end");
      if (modelId !== MODEL_ID) return unavailable("unsupported-model-version");
      const refs = {}, raw = {}, inputLegs = [];
      base.forEach(item => {
        const ref = reference(item), weight = number(item.weight), key = ref.runId;
        if (weight < 0) throw new Error("Outer allocations cannot be negative");
        if (own(refs, key) && !equal(refs[key], ref)) throw new Error("Duplicate run has conflicting qualified identity");
        refs[key] = ref; raw[key] = number((raw[key] || 0) + weight); inputLegs.push({ ...ref, weight: binary64(weight) });
      });
      const [before, fallback] = normalizeAllocations(raw);
      if (!Object.keys(before).length) return unavailable("empty-base-portfolio");
      let after = { ...before }, subjectKey = null;
      if (operation === "removal") {
        digest(removeRunId);
        if (!own(refs, removeRunId)) throw new Error("Removal target is not a portfolio component");
        if (own(before, removeRunId)) {
          after = removeAllocation(before, removeRunId);
          if (!Object.keys(after).length) return unavailable("empty-after-portfolio", { operation, removedRunId: removeRunId });
          subjectKey = removeRunId;
        }
      } else if (alpha > 0) {
        if (candidate === null || candidate === undefined) return unavailable("missing-active-candidate");
        const ref = reference(candidate); subjectKey = ref.runId;
        if (own(refs, subjectKey) && !equal(refs[subjectKey], ref)) throw new Error("Duplicate candidate has conflicting qualified identity");
        refs[subjectKey] = ref;
        after = Object.fromEntries(Object.entries(before).map(([key, value]) => [key, (1 - alpha) * value]));
        after[subjectKey] = (after[subjectKey] || 0) + alpha; after = normalizeAllocations(after)[0];
      }
      const active = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
      digest(expectedIndexSha256);
      let index, indexBytes, legs = {};
      try { indexBytes = bytes(sourceIndexBytes); if (await hash(indexBytes) !== expectedIndexSha256) return unavailable("source-index-pin-mismatch"); }
      catch (error) { return unavailable(error.code === "CRYPTO_UNAVAILABLE" ? "cryptography-unavailable" : "source-index-pin-mismatch", { detail: error.message }); }
      try {
        index = parseBytes(indexBytes);
        if (index.schemaVersion !== 2 || index.executionModel !== EXECUTION_MODEL_ID) return unavailable("unsupported-source-execution-model");
        for (const key of active) {
          if (!own(bundles, key)) return unavailable("missing-active-sleeve", { runId: key });
          legs[key] = await prepare(refs[key], bundles[key], index, bps);
        }
      } catch (error) { return unavailable("invalid-or-infeasible-pinned-evidence", { detail: error.message }); }
      const [dates, bounds] = sharedWindow(legs, window, start, end);
      if (dates.length < 2) return unavailable("fewer-than-two-shared-closes", { context: bounds });
      try { checkSharedMarks(legs, dates); }
      catch (error) { return unavailable("conflicting-shared-asset-marks", { detail: error.message, context: bounds }); }
      const paths = {}, deltas = {};
      try {
        for (const basis of ["gross", "net"]) {
          const old = simulate(legs, dates, before, before, basis, bps, cadence, "initial-addition");
          const newer = equal(after, before) ? clone(old) : simulate(legs, dates, before, after, basis, bps, cadence, "initial-" + operation);
          paths[basis + "Before"] = old; paths[basis + "After"] = newer;
          deltas[basis] = Object.fromEntries(["totalReturn", "cagr", "calendarLogVolatility", "maxDrawdown"].map(key => [key, old.metrics[key] !== null && newer.metrics[key] !== null ? newer.metrics[key] - old.metrics[key] : null]));
          const oldDays = old.metrics.recovery.peakToRecoveryDays, newDays = newer.metrics.recovery.peakToRecoveryDays;
          deltas[basis].peakToRecoveryDays = oldDays !== null && newDays !== null ? newDays - oldDays : null;
          deltas[basis].recoveryDeltaUnavailableReason = oldDays !== null && newDays !== null ? null : "ongoing-or-unavailable-recovery";
        }
      } catch (error) { return unavailable("infeasible-portfolio-accounting", { detail: error.message, context: bounds }); }
      const stats = {};
      for (const basis of ["gross", "net"]) {
        if (subjectKey === null) { stats[basis] = unavailable(operation === "addition" ? "unused-zero-weight-candidate" : "unused-zero-weight-component", { operation }); continue; }
        const leg = legs[subjectKey], nav = leg[basis].equity, old = paths[basis + "Before"];
        const standalone = dates.map(value => nav[leg.lookup.get(value)] / nav[leg.lookup.get(dates[0])]);
        const beforeReturns = old.wealth.slice(1).map((value, i) => value / old.wealth[i] - 1), candidateReturns = standalone.slice(1).map((value, i) => value / standalone[i] - 1);
        const targetAt = value => Object.fromEntries(Object.entries(value.rows[value.lookup.get(dates.at(-1))].assets).map(([asset, row]) => [asset, row.targetWeight]));
        const holdings = Object.entries(legs).map(([key, value]) => ({ allocation: old.postCloseWeights.at(-1)[key], targets: targetAt(value) }));
        stats[basis] = { status: "complete", operation, subjectRunId: subjectKey, subjectRole: operation === "addition" ? "added-candidate" : "removed-component",
          [operation === "addition" ? "candidateStandaloneWealth" : "removedStandaloneWealth"]: standalone,
          downsideCorrelation: downsideCorrelation(beforeReturns, candidateReturns), jointLosingMonths: jointLosingMonths(dates, old.wealth, standalone),
          latestOverlap: { date: dates.at(-1), ...signedOverlap(holdings, targetAt(leg)) } };
      }
      const context = { ...bounds, operation, bps, cadence, beforeAllocations: before, afterAllocations: after,
        allZeroEqualWeightFallback: fallback, exactAllocationNoOp: equal(after, before), sourceIndexSha256: expectedIndexSha256,
        sourceGeneratedAt: index.generatedAt, sleeves: active.map(key => ({ ...refs[key], recordHashes: legs[key].recordHashes })) };
      Object.assign(context, operation === "addition" ? { alpha } : { removedRunId: removeRunId });
      const identity = { schema: "portfolio-marginal-input-v1", modelId: MODEL_ID, costModelId: COST_MODEL_ID, executionModelId: EXECUTION_MODEL_ID,
        sourceIndexSha256: expectedIndexSha256, operation, base: inputLegs, settings: { bps: binary64(bps), cadence, window, start, end } };
      Object.assign(identity, operation === "addition" ? { alpha: binary64(alpha), candidate: subjectKey ? refs[subjectKey] : null } : { removedRunId: removeRunId });
      return { status: "complete", model: clone(MODEL), experimentId: await hash(canonical(identity)), context, dates, paths, deltas,
        [operation === "addition" ? "candidateAnalysis" : "removedAnalysis"]: stats };
    }
    return {
      compareAddition: (base, candidate, alpha, bundles, settings) => compareAllocations(base, bundles, "addition", candidate, alpha, null, settings || {}),
      compareRemoval: (base, removeRunId, bundles, settings) => compareAllocations(base, bundles, "removal", null, null, removeRunId, settings || {}),
      normalizeAllocations, removeAllocation, settleAllocation, recoveryEpisode, downsideCorrelation, jointLosingMonths, signedOverlap,
      binary64, model: clone(MODEL), modelId: MODEL_ID
    };
  }
  return { ...createEngine(), createEngine };
});

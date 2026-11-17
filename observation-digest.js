(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ObservationDigest = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA = 1;
  const STORAGE_KEY = "quantarena.observationDigest.v1";
  const BACKUP_KEY = STORAGE_KEY + ".migrationBackup";
  const MAX_EVENTS = 50;
  const MAX_SUBJECTS = 100;
  const MAX_BYTES = 256 * 1024;
  const DAY = 86400000;
  const KINDS = ["signal", "rank", "portfolio", "season"];
  const EVENT_KINDS = ["state-changed", "source-revised", "source-update-unknown", "context-changed",
    "availability-lost", "availability-restored", "rank-changed", "rank-recalculated", "rank-availability-changed",
    "portfolio-definition-changed", "portfolio-sources-updated", "season-milestone", "season-milestone-revised",
    "data-stale", "data-recovered", "freshness-policy-changed"];

  function requireValue(condition, message) {
    if (!condition) throw new TypeError(message);
  }
  function object(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
      && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  }
  function keys(value, required, optional = []) {
    requireValue(object(value), "Expected a plain DTO object");
    requireValue(required.every(key => Object.hasOwn(value, key)), "Missing required DTO field");
    requireValue(Object.keys(value).every(key => required.includes(key) || optional.includes(key)), "Unexpected DTO field");
  }
  function token(value, max = 180) {
    requireValue(typeof value === "string" && value.length > 0 && value.length <= max
      && /^[A-Za-z0-9_.:/|=^+-]+$/.test(value)
      && !["__proto__", "constructor", "prototype"].includes(value), "Invalid identifier");
    return value;
  }
  function digest(value, nullable = false) {
    if (nullable && value === null) return null;
    requireValue(typeof value === "string" && /^[a-f0-9]{64}$/.test(value), "Invalid evidence digest");
    return value;
  }
  function finite(value) {
    requireValue(typeof value === "number" && Number.isFinite(value), "Expected finite numeric data");
    return value;
  }
  function integer(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    requireValue(Number.isSafeInteger(value) && value >= min && value <= max, "Invalid integer");
    return value;
  }
  function date(value, nullable = false) {
    if (nullable && value === null) return null;
    requireValue(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value), "Invalid ISO day");
    const ms = Date.parse(value + "T00:00:00Z");
    requireValue(Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value, "Invalid calendar day");
    return value;
  }
  function time(value) {
    requireValue(typeof value === "string" && value.length <= 40
      && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)), "Expected timezone-aware timestamp");
    date(value.slice(0, 10));
    return new Date(value).toISOString();
  }
  function storedTime(value) { requireValue(time(value) === value, "Noncanonical stored timestamp"); }
  function utcDay(value) { return Math.floor(Date.parse(time(value)) / DAY); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function canonical(value) {
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (object(value)) return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
    return JSON.stringify(value);
  }
  function same(a, b) { return canonical(a) === canonical(b); }
  function bytes(text) {
    return typeof TextEncoder !== "undefined" ? new TextEncoder().encode(text).length : text.length * 2;
  }
  function assets(value, kind) {
    requireValue(Array.isArray(value) && value.length > 0 && value.length <= 64, "Invalid asset universe");
    value.forEach(item => token(item, 64));
    requireValue(new Set(value).size === value.length && (kind !== "single" || value.length === 1), "Invalid ordered universe");
    return value.slice();
  }
  function freshnessPolicy(value) {
    if (value === undefined || value === null) return null;
    keys(value, ["policyId", "staleAfterDays"]);
    return { policyId: token(value.policyId), staleAfterDays: integer(value.staleAfterDays, 0, 365) };
  }
  function normalizeContext(kind, value) {
    if (kind === "signal" || kind === "rank") {
      const fields = ["strategyId", "symbol", "kind", "assets"];
      keys(value, fields.concat(kind === "signal" ? ["executionModel", "ruleVersion"]
        : ["window", "bps", "metric", "direction", "modelVersion", "anchor", "methodVersion"]));
      requireValue(["single", "basket"].includes(value.kind), "Invalid market kind");
      const result = { strategyId: token(value.strategyId), symbol: token(value.symbol), kind: value.kind,
        assets: assets(value.assets, value.kind) };
      if (kind === "signal") return { ...result, executionModel: token(value.executionModel),
        ruleVersion: value.ruleVersion === null ? null : token(value.ruleVersion) };
      keys(value.window, ["mode", "value"], ["start", "end"]);
      requireValue(["rolling", "fixed", "full"].includes(value.window.mode), "Invalid window mode");
      const window = { mode: value.window.mode, value: token(value.window.value) };
      if (window.mode === "fixed") {
        window.start = date(value.window.start); window.end = date(value.window.end);
        requireValue(window.start <= window.end, "Reversed fixed window");
      } else requireValue(value.window.start === undefined && value.window.end === undefined, "Unexpected fixed bounds");
      requireValue([0, 5, 10, 25].includes(value.bps), "Unsupported cost scenario");
      requireValue(["asc", "desc"].includes(value.direction), "Invalid rank direction");
      requireValue(["start-close", "initial-capital"].includes(value.anchor), "Invalid anchor");
      return { ...result, window, bps: value.bps, metric: token(value.metric), direction: value.direction,
        modelVersion: token(value.modelVersion), anchor: value.anchor, methodVersion: token(value.methodVersion) };
    }
    const fields = kind === "portfolio" ? ["portfolioId", "modelVersion"] : ["seasonId", "freezeId"];
    keys(value, fields);
    return Object.fromEntries(fields.map(key => [key, token(value[key])]));
  }
  function normalizeData(kind, value, context) {
    if (kind === "signal") {
      keys(value, ["runId", "revisionEpoch", "count", "target", "effective"]);
      [value.target, value.effective].forEach(vector => {
        requireValue(Array.isArray(vector) && vector.length === context.assets.length, "Exposure/universe mismatch");
        vector.forEach(finite);
        finite(vector.reduce((sum, n) => sum + Math.abs(n), 0));
      });
      return { runId: digest(value.runId), revisionEpoch: digest(value.revisionEpoch, true),
        count: integer(value.count, 1), target: value.target.slice(), effective: value.effective.slice() };
    }
    if (kind === "rank") {
      keys(value, ["rank", "cohortSize", "membershipHash", "revisionEpoch", "start", "end", "datesHash"]);
      const size = integer(value.cohortSize);
      const rank = value.rank === null ? null : integer(value.rank, 1, size);
      requireValue(rank === null || size >= 2, "Single-member rank is unavailable");
      const start = date(value.start), end = date(value.end);
      requireValue(start <= end, "Reversed rank bounds");
      if (context.window.mode === "fixed") requireValue(start === context.window.start && end === context.window.end, "Fixed rank bounds mismatch");
      return { rank, cohortSize: size, membershipHash: digest(value.membershipHash), revisionEpoch: digest(value.revisionEpoch, true),
        start, end, datesHash: digest(value.datesHash) };
    }
    if (kind === "portfolio") {
      keys(value, ["definitionHash", "sourcesHash", "revisionEpoch"], ["definitionRevision"]);
      return { definitionHash: digest(value.definitionHash), sourcesHash: digest(value.sourcesHash),
        revisionEpoch: digest(value.revisionEpoch, true),
        ...(value.definitionRevision === undefined ? {} : { definitionRevision: integer(value.definitionRevision) }) };
    }
    keys(value, ["revisionEpoch", "forwardObservations", "milestones"]);
    const count = integer(value.forwardObservations);
    requireValue(Array.isArray(value.milestones) && value.milestones.length <= 20, "Invalid milestone list");
    const milestones = value.milestones.map(item => {
      keys(item, ["id", "met", "threshold", "proofId"]);
      const threshold = integer(item.threshold, 1);
      requireValue(typeof item.met === "boolean", "Invalid milestone status");
      const proofId = digest(item.proofId, true);
      requireValue(!item.met || (count >= threshold && proofId !== null), "Milestone lacks observed evidence");
      return { id: token(item.id), met: item.met, threshold, proofId };
    });
    requireValue(new Set(milestones.map(item => item.id)).size === milestones.length, "Duplicate milestone");
    return { revisionEpoch: digest(value.revisionEpoch, true), forwardObservations: count, milestones };
  }
  function normalizeProof(value) {
    if (value === undefined) return { edges: [], revision: null };
    keys(value, [], ["edges", "revision", "revisionChain", "revisionWitnesses"]);
    const raw = value.edges || [];
    requireValue(Array.isArray(raw) && raw.length <= 64, "Invalid lineage path");
    const edges = raw.map(edge => {
      keys(edge, ["from", "to", "kind"]);
      requireValue(["append", "revision"].includes(edge.kind), "Invalid lineage kind");
      return { from: digest(edge.from), to: digest(edge.to), kind: edge.kind };
    });
    let revision = null;
    if (value.revision) {
      keys(value.revision, ["fromEpoch", "toEpoch"]);
      revision = { fromEpoch: digest(value.revision.fromEpoch), toEpoch: digest(value.revision.toEpoch) };
    }
    const chain = value.revisionChain || [], witnesses = value.revisionWitnesses || [];
    requireValue(Array.isArray(chain) && chain.length <= 64, "Invalid revision chain");
    const revisionChain = chain.map(part => {
      keys(part, ["fromEpoch", "toEpoch"]);
      return { fromEpoch: digest(part.fromEpoch), toEpoch: digest(part.toEpoch) };
    });
    const visited = new Set();
    revisionChain.forEach((part, i) => {
      requireValue(part.fromEpoch !== part.toEpoch && !visited.has(part.toEpoch)
        && (i === 0 || revisionChain[i - 1].toEpoch === part.fromEpoch), "Broken revision chain");
      if (i === 0) visited.add(part.fromEpoch);
      requireValue(!visited.has(part.toEpoch), "Repeated revision epoch");
      visited.add(part.toEpoch);
    });
    requireValue(Array.isArray(witnesses) && witnesses.length <= 8, "Invalid revision witnesses");
    const revisionWitnesses = witnesses.map(part => {
      keys(part, ["fromEpoch", "toEpoch", "fromSourcesHash", "toSourcesHash"]);
      return Object.fromEntries(Object.entries(part).map(([key, val]) => [key, digest(val)]));
    });
    return { edges, revision, revisionChain, revisionWitnesses };
  }
  function normalizeObservation(value, capabilities) {
    keys(value, ["id", "kind", "availability", "observationId"], ["reason", "context", "asOf", "data", "freshness", "proof"]);
    token(value.id); requireValue(KINDS.includes(value.kind), "Unsupported subject kind");
    requireValue(["available", "unavailable", "unsupported"].includes(value.availability), "Invalid availability");
    digest(value.observationId);
    if (!capabilities.includes(value.kind)) requireValue(value.availability === "unsupported", "Adapter capability absent");
    if (value.availability !== "available") {
      requireValue(value.context === undefined && value.data === undefined && value.asOf === undefined
        && value.proof === undefined && value.freshness === undefined, "Unavailable adapters cannot supply state");
      return { id: value.id, kind: value.kind, availability: value.availability,
        observationId: value.observationId, reason: value.reason === undefined ? value.availability : token(value.reason) };
    }
    requireValue(value.reason === undefined, "Available observations do not carry arbitrary reasons");
    const context = normalizeContext(value.kind, value.context);
    const asOf = date(value.asOf, true);
    if (value.kind === "signal" || value.kind === "rank") requireValue(asOf !== null, "Missing observation date");
    return { id: value.id, kind: value.kind, availability: "available", proof: normalizeProof(value.proof),
      head: { observationId: value.observationId, context, asOf,
        data: normalizeData(value.kind, value.data, context), freshness: freshnessPolicy(value.freshness) } };
  }
  function normalizeSnapshot(value) {
    keys(value, ["schemaVersion", "verified", "id", "publishedAt", "confirmedCurrent", "capabilities", "observations"]);
    requireValue(value.schemaVersion === SCHEMA && value.verified === true, "Only validated snapshot DTOs are accepted");
    requireValue(typeof value.confirmedCurrent === "boolean", "Missing revalidation status");
    requireValue(Array.isArray(value.capabilities) && value.capabilities.every(kind => KINDS.includes(kind))
      && new Set(value.capabilities).size === value.capabilities.length, "Invalid capabilities");
    requireValue(Array.isArray(value.observations) && value.observations.length <= MAX_SUBJECTS, "Invalid observation count");
    const observations = value.observations.map(item => normalizeObservation(item, value.capabilities));
    requireValue(new Set(observations.map(item => item.id)).size === observations.length, "Duplicate observation subject");
    return { id: digest(value.id), publishedAt: time(value.publishedAt), confirmedCurrent: value.confirmedCurrent, observations };
  }

  function createState(epoch, now) {
    return { schemaVersion: SCHEMA, epoch: token(epoch), revision: 0, lastSnapshot: null,
      lastCheckedAt: time(now), lastReviewedAt: null, checkStatus: "baseline-needed", subjects: {}, events: [],
      overflow: { dropped: 0, unread: 0, firstDetectedAt: null } };
  }
  function emptySubject(kind) {
    return { kind, initialized: false, status: "pending", observed: null, reviewed: null, material: null,
      reviewedRevision: 0, availabilityId: null, availabilityEpisode: 0, confirmedSnapshotId: null, freshness: null };
  }
  function validateHead(kind, head) {
    if (head === null) return;
    keys(head, ["observationId", "context", "asOf", "data", "freshness"]);
    const parsed = normalizeObservation({ id: "stored", kind, availability: "available", ...head }, KINDS).head;
    requireValue(same(parsed, head), "Noncanonical stored head");
  }
  function validateState(state) {
    keys(state, ["schemaVersion", "epoch", "revision", "lastSnapshot", "lastCheckedAt", "lastReviewedAt", "checkStatus", "subjects", "events", "overflow"]);
    requireValue(state.schemaVersion === SCHEMA, "Unsupported stored schema");
    token(state.epoch); integer(state.revision); storedTime(state.lastCheckedAt);
    if (state.lastReviewedAt !== null) storedTime(state.lastReviewedAt);
    token(state.checkStatus);
    if (state.lastSnapshot !== null) { keys(state.lastSnapshot, ["id", "publishedAt"]); digest(state.lastSnapshot.id); storedTime(state.lastSnapshot.publishedAt); }
    requireValue(object(state.subjects) && Object.keys(state.subjects).length <= MAX_SUBJECTS, "Invalid stored subjects");
    for (const [id, subject] of Object.entries(state.subjects)) {
      token(id); keys(subject, ["kind", "initialized", "status", "observed", "reviewed", "material", "reviewedRevision", "availabilityId", "confirmedSnapshotId", "freshness"], ["availabilityEpisode"]);
      requireValue(KINDS.includes(subject.kind) && typeof subject.initialized === "boolean", "Invalid stored subject");
      requireValue(["pending", "ready", "unavailable", "unsupported", "clock-discrepancy"].includes(subject.status), "Invalid subject status");
      [subject.observed, subject.reviewed, subject.material].forEach(head => validateHead(subject.kind, head));
      integer(subject.reviewedRevision, 0, state.revision); digest(subject.availabilityId, true);
      if (Object.hasOwn(subject, "availabilityEpisode")) integer(subject.availabilityEpisode);
      digest(subject.confirmedSnapshotId, true);
      if (subject.freshness !== null) {
        keys(subject.freshness, ["status", "policy", "lastAsOf", "lastDay", "episode"]);
        requireValue(["current", "stale", "unknown"].includes(subject.freshness.status), "Invalid freshness state");
        freshnessPolicy(subject.freshness.policy); date(subject.freshness.lastAsOf, true); integer(subject.freshness.lastDay, -719528);
        requireValue(subject.freshness.episode === null || (typeof subject.freshness.episode === "string" && subject.freshness.episode.length <= 1000), "Invalid freshness episode");
      }
    }
    requireValue(Array.isArray(state.events) && state.events.length <= MAX_EVENTS, "Unbounded stored events");
    for (const event of state.events) {
      keys(event, ["id", "subjectId", "kind", "from", "to", "asOf", "detectedAt", "acknowledgedAt", "details"]);
      requireValue(typeof event.id === "string" && event.id.length <= 3000, "Invalid event identity");
      token(event.subjectId); requireValue(Object.hasOwn(state.subjects, event.subjectId) && EVENT_KINDS.includes(event.kind), "Invalid event subject/kind");
      digest(event.from, true); digest(event.to, true); date(event.asOf, true); storedTime(event.detectedAt);
      if (event.acknowledgedAt !== null) storedTime(event.acknowledgedAt);
      requireValue(object(event.details) && bytes(JSON.stringify(event.details)) <= 4096, "Invalid event detail size");
      // Details are produced by this core; use a closed field vocabulary on reload.
      const allowed = ["reason", "classification", "changes", "totalChangedAssets", "oldRank", "newRank", "cohortSize",
        "oldBounds", "newBounds", "milestoneId", "met", "observations", "threshold", "recomputeRequired", "episode"];
      requireValue(Object.keys(event.details).every(key => allowed.includes(key)), "Unexpected persisted event detail");
      for (const [key, value] of Object.entries(event.details)) {
        if (key === "changes") {
          requireValue(Array.isArray(value) && value.length <= 16, "Invalid change details");
          value.forEach(change => {
            keys(change, ["field", "from", "to"], ["asset"]);
            token(change.field); if (change.asset !== undefined) token(change.asset, 64);
            finite(change.from); finite(change.to);
          });
        } else if (key === "oldBounds" || key === "newBounds") {
          requireValue(Array.isArray(value) && value.length === 2, "Invalid rank boundary details"); value.forEach(item => date(item));
        } else if (["oldRank", "newRank"].includes(key)) { if (value !== null) integer(value, 1); }
        else if (["totalChangedAssets", "cohortSize", "observations", "threshold"].includes(key)) integer(value);
        else if (["met", "recomputeRequired"].includes(key)) requireValue(typeof value === "boolean", "Invalid event boolean");
        else if (key === "episode") requireValue(value === null || (typeof value === "string" && value.length <= 1000), "Invalid event episode");
        else token(value);
      }
    }
    requireValue(new Set(state.events.map(event => event.id)).size === state.events.length, "Duplicate persisted events");
    keys(state.overflow, ["dropped", "unread", "firstDetectedAt"]);
    integer(state.overflow.dropped); integer(state.overflow.unread, 0, state.overflow.dropped);
    if (state.overflow.firstDetectedAt !== null) storedTime(state.overflow.firstDetectedAt);
    return state;
  }
  function nextState(state, now) {
    validateState(state);
    time(now);
    const next = clone(state); next.revision++;
    return next;
  }
  function prune(state, limit = MAX_EVENTS) {
    while (state.events.length > limit) {
      let index = state.events.findIndex(event => event.acknowledgedAt !== null);
      if (index < 0) index = 0;
      const removed = state.events.splice(index, 1)[0];
      state.overflow.dropped++;
      if (removed.acknowledgedAt === null) state.overflow.unread++;
      state.overflow.firstDetectedAt = state.overflow.firstDetectedAt || removed.detectedAt;
    }
    return state;
  }
  function emit(state, id, kind, old, head, details, now, discriminator = null) {
    const from = old?.observationId || null, to = head?.observationId || null;
    const eventId = canonical([state.epoch, id, kind, from, to, head?.data?.revisionEpoch || null, discriminator]);
    if (!state.events.some(event => event.id === eventId)) state.events.push({ id: eventId, subjectId: id, kind, from, to,
      asOf: head?.asOf || old?.asOf || null, detectedAt: time(now), acknowledgedAt: null, details: clone(details) });
  }
  function reconcile(state, descriptors, now) {
    requireValue(Array.isArray(descriptors) && descriptors.length <= MAX_SUBJECTS, "Too many watch subjects");
    const next = nextState(state, now), ids = new Set();
    descriptors.forEach(item => {
      keys(item, ["id", "kind"]); token(item.id);
      requireValue(KINDS.includes(item.kind) && !ids.has(item.id), "Invalid/duplicate subscription");
      ids.add(item.id);
      if (next.subjects[item.id]) requireValue(next.subjects[item.id].kind === item.kind, "A subscription cannot change type");
      else next.subjects[item.id] = emptySubject(item.kind);
    });
    for (const id of Object.keys(next.subjects)) if (!ids.has(id)) delete next.subjects[id];
    next.events = next.events.filter(event => ids.has(event.subjectId));
    return next;
  }
  function provedRevision(old, head, proof) {
    const previous = old.data.revisionEpoch, current = head.data.revisionEpoch;
    if (previous === null || current === null || previous === current) return false;
    if (proof.revision?.fromEpoch === previous && proof.revision?.toEpoch === current) return true;
    const chain = proof.revisionChain || [];
    if (chain.at(-1)?.toEpoch === current && chain.some(part => part.fromEpoch === previous)) return true;
    return (proof.revisionWitnesses || []).some(part => part.fromEpoch === previous && part.toEpoch === current
      && part.fromSourcesHash === old.data.sourcesHash && part.toSourcesHash === head.data.sourcesHash);
  }
  function classify(old, head, proof, sourceField = "runId") {
    const from = old.data[sourceField], to = head.data[sourceField];
    if (provedRevision(old, head, proof)) return "revision";
    if (from === to && old.data.revisionEpoch === head.data.revisionEpoch) return "unchanged";
    if (!proof.edges.length) return "unknown";
    if (proof.edges.some((edge, i) => i > 0 && edge.from !== proof.edges[i - 1].to)
      || proof.edges[proof.edges.length - 1].to !== to) return "unknown";
    // A concurrent writer may already have consumed a prefix of this proof.
    // Repeated run IDs after a reversion are disambiguated only by known epochs.
    const possible = new Set();
    proof.edges.forEach((edge, i) => {
      if (edge.from === from) possible.add(proof.edges.slice(i).some(part => part.kind === "revision") ? "revision" : "append");
    });
    if (!possible.size) return "unknown";
    if (old.data.revisionEpoch !== null && head.data.revisionEpoch !== null) {
      const expected = old.data.revisionEpoch === head.data.revisionEpoch ? "append" : "revision";
      if (!possible.has(expected)) return "unknown";
      if (expected === "revision") return "revision";
    } else {
      if (possible.size !== 1) return "unknown";
      if (possible.has("revision")) return "revision";
    }
    if (old.data.revisionEpoch !== head.data.revisionEpoch) return "unknown";
    if (sourceField === "runId" && !(head.asOf > old.asOf && head.data.count > old.data.count)) return "unknown";
    return "append";
  }
  function sign(value) { return Math.abs(value) <= 1e-6 ? 0 : Math.sign(value); }
  function exposures(vector) {
    const net = vector.reduce((sum, value) => sum + value, 0);
    return { gross: vector.reduce((sum, value) => sum + Math.abs(value), 0), net, cash: 1 - net };
  }
  function signalChanges(old, head) {
    const changes = [], assets = head.context.assets;
    let totalChangedAssets = 0;
    for (const field of ["target", "effective"]) {
      const a = old.data[field], b = head.data[field];
      const scalar = assets.length === 1;
      const l1 = a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0);
      const changed = [];
      assets.forEach((asset, i) => {
        const direction = sign(a[i]) !== sign(b[i]);
        if (Math.abs(a[i] - b[i]) >= 0.05 - 1e-12 || (direction && (scalar || Math.max(Math.abs(a[i]), Math.abs(b[i])) >= 0.01)))
          changed.push({ field, asset, from: a[i], to: b[i] });
      });
      totalChangedAssets += changed.length;
      changes.push(...changed.slice(0, Math.max(0, 8 - changes.length)));
      const ea = exposures(a), eb = exposures(b);
      for (const key of ["gross", "net", "cash"]) if (Math.abs(ea[key] - eb[key]) >= 0.05 - 1e-12)
        changes.push({ field: field + "." + key, from: ea[key], to: eb[key] });
      if (l1 >= 0.10 - 1e-12 && !changed.length) changes.push({ field: field + ".vectorL1", from: 0, to: l1 });
    }
    return { changes, totalChangedAssets };
  }
  function compareRank(state, id, old, head, proof, now) {
    const a = old.data, b = head.data, window = head.context.window;
    const bounds = { oldBounds: [a.start, a.end], newBounds: [b.start, b.end] };
    if (a.membershipHash !== b.membershipHash || a.cohortSize !== b.cohortSize
      || b.end < a.end || (window.mode === "rolling" && b.start < a.start)
      || (window.mode === "fixed" && (a.start !== b.start || a.end !== b.end || a.datesHash !== b.datesHash))
      || (window.mode === "full" && a.start !== b.start)) {
      emit(state, id, "context-changed", old, head, { reason: "rank-cohort-or-window", ...bounds }, now); return;
    }
    if (a.rank === b.rank && a.revisionEpoch === b.revisionEpoch) return;
    const values = { oldRank: a.rank, newRank: b.rank, cohortSize: b.cohortSize, ...bounds };
    if (a.revisionEpoch !== b.revisionEpoch) {
      emit(state, id, provedRevision(old, head, proof) ? "rank-recalculated" : "source-update-unknown", old, head,
        { ...values, classification: provedRevision(old, head, proof) ? "revision" : "unknown" }, now); return;
    }
    if (a.rank === null || b.rank === null) { emit(state, id, "rank-availability-changed", old, head, values, now); return; }
    const advancing = window.mode !== "fixed" && b.end > a.end && b.start >= a.start;
    emit(state, id, advancing && b.revisionEpoch !== null ? "rank-changed" : "source-update-unknown", old, head, values, now);
  }
  function compareSeason(state, id, old, head, proof, now) {
    const a = old.data, b = head.data;
    const definitions = items => items.map(item => [item.id, item.threshold]).sort((x, y) => x[0].localeCompare(y[0]));
    if (!same(definitions(a.milestones), definitions(b.milestones))) {
      emit(state, id, "context-changed", old, head, { reason: "milestone-definition" }, now); return;
    }
    const revision = provedRevision(old, head, proof);
    if ((a.revisionEpoch !== b.revisionEpoch || b.forwardObservations < a.forwardObservations) && !revision) {
      emit(state, id, "source-update-unknown", old, head, { reason: "season-transition-unproved" }, now); return;
    }
    const previous = new Map(a.milestones.map(item => [item.id, item]));
    for (const item of b.milestones) {
      const before = previous.get(item.id);
      // A newly introduced milestone is a context baseline, not backfilled success.
      if (!before || before.threshold !== item.threshold || before.met === item.met) continue;
      if (!item.met && !revision) { emit(state, id, "source-update-unknown", old, head, { reason: "milestone-revocation-unproved" }, now); continue; }
      emit(state, id, revision ? "season-milestone-revised" : "season-milestone", old, head,
        { milestoneId: item.id, met: item.met, threshold: item.threshold, observations: b.forwardObservations }, now, item.id);
    }
  }
  function observe(next, item, now) {
    const subject = next.subjects[item.id];
    if (!subject) return;
    requireValue(subject.kind === item.kind, "Observation kind differs from subscription");
    if (item.availability !== "available") {
      // Keep a persisted episode counter: source/absence hashes can recur after recovery.
      // Pre-extension schema-one subjects start at zero without inventing prior events.
      if (item.availability === "unavailable" && subject.status !== "unavailable")
        subject.availabilityEpisode = integer((subject.availabilityEpisode ?? 0) + 1);
      if (item.availability === "unavailable" && subject.initialized && subject.status === "ready")
        emit(next, item.id, "availability-lost", subject.observed, null, { reason: item.reason }, now,
          [subject.availabilityEpisode, item.observationId]);
      subject.initialized = item.availability === "unavailable" || subject.initialized;
      subject.status = item.availability; subject.availabilityId = item.observationId; subject.confirmedSnapshotId = null;
      return;
    }
    const head = item.head, old = subject.observed, priorStatus = subject.status;
    if (item.kind === "portfolio" && old?.data.definitionRevision !== undefined
      && (head.data.definitionRevision === undefined || head.data.definitionRevision < old.data.definitionRevision
        || (head.data.definitionRevision === old.data.definitionRevision && head.data.definitionHash !== old.data.definitionHash))) return false;
    if (head.asOf && Date.parse(head.asOf + "T00:00:00Z") / DAY > utcDay(now)) {
      subject.status = "clock-discrepancy"; return;
    }
    const first = !subject.initialized || old === null;
    if (old && old.observationId === head.observationId)
      requireValue(same({ ...old, freshness: null }, { ...head, freshness: null }), "Conflicting immutable observation");
    if (old && item.kind === "signal" && old.data.runId === head.data.runId)
      requireValue(same([old.context, old.asOf, old.data.count, old.data.target, old.data.effective],
        [head.context, head.asOf, head.data.count, head.data.target, head.data.effective]), "Conflicting immutable run");
    if (priorStatus === "unavailable" && subject.initialized)
      emit(next, item.id, "availability-restored", old, head, { reason: "verified-source-available" }, now,
        [subject.availabilityEpisode ?? 0, subject.availabilityId]);
    if (!first && priorStatus !== "unavailable") {
      if (!same(old.context, head.context)) {
        const samePair = item.kind === "signal" && same(
          [old.context.strategyId, old.context.symbol, old.context.kind, old.context.assets],
          [head.context.strategyId, head.context.symbol, head.context.kind, head.context.assets]);
        const revised = samePair && classify(old, head, item.proof) === "revision";
        emit(next, item.id, revised ? "source-revised" : "context-changed", old, head, { reason: "definition-or-method" }, now);
      }
      else if (item.kind === "signal") {
        const classification = classify(old, head, item.proof);
        if (classification === "revision" || classification === "unknown")
          emit(next, item.id, classification === "revision" ? "source-revised" : "source-update-unknown", old, head, { classification }, now);
        else if (classification === "append") {
          const change = signalChanges(subject.material || old, head);
          if (change.changes.length) { emit(next, item.id, "state-changed", subject.material || old, head, change, now); subject.material = clone(head); }
        }
        if (classification === "revision" || classification === "unknown") subject.material = clone(head);
      } else if (item.kind === "rank") compareRank(next, item.id, old, head, item.proof, now);
      else if (item.kind === "portfolio") {
        if (old.data.definitionHash !== head.data.definitionHash)
          emit(next, item.id, "portfolio-definition-changed", old, head, { reason: "saved-local-definition" }, now);
        else if (old.data.sourcesHash !== head.data.sourcesHash || old.data.revisionEpoch !== head.data.revisionEpoch)
          emit(next, item.id, "portfolio-sources-updated", old, head,
            { classification: classify(old, head, item.proof, "sourcesHash"), recomputeRequired: true }, now);
      } else compareSeason(next, item.id, old, head, item.proof, now);
    }
    if (first || priorStatus === "unavailable" || (old && !same(old.context, head.context))) subject.material = clone(head);
    if (first) { subject.reviewed = clone(head); subject.reviewedRevision = next.revision; }
    subject.observed = clone(head); subject.initialized = true; subject.status = "ready"; subject.availabilityId = null;
  }
  function currentFreshness(subject, now) {
    const head = subject.observed;
    if (!head || !head.asOf || !head.freshness) return { status: "unknown", ageDays: null, reason: "missing-freshness-input" };
    const today = utcDay(now), ageDays = today - Date.parse(head.asOf + "T00:00:00Z") / DAY;
    if (ageDays < 0 || (subject.freshness && today < subject.freshness.lastDay))
      return { status: "unknown", ageDays, reason: "clock-discrepancy" };
    if (subject.status !== "ready") return { status: subject.status, ageDays, reason: "source-not-ready" };
    return { status: ageDays > head.freshness.staleAfterDays ? "stale" : "current", ageDays, reason: null };
  }
  function applyFreshness(next, now, snapshotId) {
    for (const [id, subject] of Object.entries(next.subjects)) {
      if (subject.status !== "ready" || subject.confirmedSnapshotId !== snapshotId) continue;
      const head = subject.observed, derived = currentFreshness(subject, now), old = subject.freshness;
      if (derived.status === "unknown") continue;
      const policy = head.freshness, day = utcDay(now);
      const changedPolicy = old && !same(old.policy, policy);
      let episode = old?.episode || null;
      if (!old || changedPolicy) {
        episode = derived.status === "stale" ? canonical([next.epoch, id, head.asOf, policy]) : null;
        if (changedPolicy) emit(next, id, "freshness-policy-changed", head, head, { reason: "policy-change" }, now, canonical(policy));
      } else if (old.status !== "stale" && derived.status === "stale") {
        episode = canonical([next.epoch, id, head.asOf, policy]);
        emit(next, id, "data-stale", head, head, { episode }, now, episode);
      } else if (old.status === "stale" && derived.status === "current") {
        if (!(head.asOf > old.lastAsOf)) continue;
        emit(next, id, "data-recovered", head, head, { episode }, now, episode);
        episode = null;
      }
      subject.freshness = { status: derived.status, policy: clone(policy), lastAsOf: head.asOf, lastDay: day, episode };
    }
  }
  function ingest(state, snapshot, now) {
    const input = normalizeSnapshot(snapshot), next = nextState(state, now);
    next.lastCheckedAt = time(now);
    const previous = next.lastSnapshot;
    if (Date.parse(input.publishedAt) > Date.parse(time(now)) + 5 * 60000) { next.checkStatus = "clock-discrepancy"; return next; }
    if (previous && (input.publishedAt < previous.publishedAt
      || (input.publishedAt === previous.publishedAt && input.id !== previous.id))) {
      next.checkStatus = "older-or-ambiguous-snapshot"; return next;
    }
    let ignoredLocal = false;
    input.observations.forEach(item => {
      if (observe(next, item, now) === false) { ignoredLocal = true; return; }
      const subject = next.subjects[item.id];
      if (subject && item.availability === "available" && subject.status === "ready")
        subject.confirmedSnapshotId = input.confirmedCurrent ? input.id : null;
    });
    next.lastSnapshot = { id: input.id, publishedAt: input.publishedAt };
    next.checkStatus = ignoredLocal ? "local-definition-not-current" : input.confirmedCurrent ? "verified-current" : "verified-cached";
    if (input.confirmedCurrent) applyFreshness(next, now, input.id);
    return prune(next);
  }
  function evaluateFreshness(state, now, confirmation = {}) {
    const next = nextState(state, now);
    keys(confirmation, [], ["confirmedCurrent", "snapshotId"]);
    if (confirmation.confirmedCurrent !== undefined) requireValue(typeof confirmation.confirmedCurrent === "boolean", "Invalid confirmation flag");
    if (confirmation.snapshotId !== undefined) digest(confirmation.snapshotId);
    if (confirmation.confirmedCurrent === true && confirmation.snapshotId === next.lastSnapshot?.id) {
      next.checkStatus = "verified-current";
      applyFreshness(next, now, confirmation.snapshotId);
    }
    else next.checkStatus = "cached-age-only";
    return prune(next);
  }
  function captureReview(state) {
    validateState(state);
    return { epoch: state.epoch, revision: state.revision, eventIds: state.events.filter(event => !event.acknowledgedAt).map(event => event.id),
      heads: Object.fromEntries(Object.entries(state.subjects).filter(([, subject]) => subject.observed).map(([id, subject]) => [id, clone(subject.observed)])) };
  }
  function acknowledge(state, review, now) {
    const next = nextState(state, now);
    keys(review, ["epoch", "revision", "eventIds", "heads"]);
    if (review.epoch !== state.epoch) { next.checkStatus = "epoch-mismatch"; return next; }
    integer(review.revision, 0, state.revision);
    requireValue(Array.isArray(review.eventIds) && review.eventIds.length <= MAX_EVENTS && object(review.heads), "Invalid review token");
    requireValue(review.eventIds.every(id => typeof id === "string" && id.length <= 3000)
      && Object.keys(review.heads).length <= MAX_SUBJECTS, "Invalid review references");
    const ids = new Set(review.eventIds);
    next.events.forEach(event => { if (ids.has(event.id) && event.acknowledgedAt === null) event.acknowledgedAt = time(now); });
    for (const [id, head] of Object.entries(review.heads)) {
      const subject = next.subjects[id];
      if (!subject || subject.reviewedRevision > review.revision) continue;
      validateHead(subject.kind, head);
      subject.reviewed = clone(head); subject.reviewedRevision = review.revision;
      if (same(head, subject.observed)) subject.material = clone(head);
    }
    next.lastReviewedAt = time(now);
    return next;
  }
  function clearHistory(state, newEpoch, now) {
    requireValue(token(newEpoch) !== state.epoch, "Reset needs a new epoch");
    const next = nextState(state, now);
    next.epoch = newEpoch; next.events = []; next.overflow = { dropped: 0, unread: 0, firstDetectedAt: null };
    for (const subject of Object.values(next.subjects)) {
      subject.reviewed = clone(subject.observed); subject.material = clone(subject.observed); subject.reviewedRevision = next.revision;
    }
    next.lastReviewedAt = time(now);
    return next;
  }
  function reset(state, newEpoch, now) {
    validateState(state); requireValue(token(newEpoch) !== state.epoch, "Reset needs a new epoch");
    return createState(newEpoch, now);
  }
  function view(state, now, limit = 20) {
    validateState(state); requireValue(limit === 20 || limit === 50, "Display limit must be 20 or 50");
    return { events: clone(state.events.slice(-limit).reverse()), unread: state.events.filter(event => !event.acknowledgedAt).length,
      retained: state.events.length, overflow: clone(state.overflow), lastCheckedAt: state.lastCheckedAt,
      lastReviewedAt: state.lastReviewedAt, checkStatus: state.checkStatus,
      freshness: Object.fromEntries(Object.entries(state.subjects).map(([id, subject]) => [id, {
        ...currentFreshness(subject, now), asOf: subject.observed?.asOf || null,
        policy: clone(subject.observed?.freshness || null),
        confirmedCurrent: subject.confirmedSnapshotId !== null && subject.confirmedSnapshotId === state.lastSnapshot?.id
          && state.checkStatus === "verified-current"
      }])) };
  }
  function reduce(state, action, now) {
    requireValue(object(action) && typeof action.type === "string", "Invalid action");
    if (action.epoch !== undefined && action.epoch !== state.epoch) return state;
    switch (action.type) {
      case "reconcile":
        if (action.expectedRevision !== undefined && integer(action.expectedRevision) !== state.revision) return state;
        return reconcile(state, action.subjects, now);
      case "ingest": return ingest(state, action.snapshot, now);
      case "freshness": return evaluateFreshness(state, now, action.confirmation);
      case "acknowledge": return acknowledge(state, action.review, now);
      case "clear": return clearHistory(state, action.newEpoch, now);
      case "reset": return reset(state, action.newEpoch, now);
      default: throw new TypeError("Unknown digest action");
    }
  }

  function createStore(storage, options) {
    requireValue(options && typeof options.now === "function", "Store requires an injected clock");
    const maxBytes = options.maxBytes === undefined ? MAX_BYTES : integer(options.maxBytes, 256, MAX_BYTES);
    let memory = createState(options.epoch, options.now());
    let status = { persistent: false, reason: "coordination-unavailable" };
    let disabled = typeof options.withLock !== "function";
    let pendingMigration = null;

    function decode(raw) {
      if (raw === null) return createState(options.epoch, options.now());
      requireValue(typeof raw === "string" && bytes(raw) <= maxBytes, "Stored document exceeds budget");
      let parsed = JSON.parse(raw);
      if (parsed.schemaVersion !== SCHEMA) {
        const migration = options.migrations?.[parsed.schemaVersion];
        requireValue(typeof migration === "function", "Unsupported stored schema");
        parsed = migration(clone(parsed));
        validateState(parsed); pendingMigration = raw;
      }
      return clone(validateState(parsed));
    }
    try {
      memory = decode(storage.getItem(STORAGE_KEY));
      if (!disabled) status = { persistent: true, reason: pendingMigration === null ? "ready" : "migration-pending" };
    } catch (_) {
      disabled = true; status = { persistent: false, reason: "unreadable-or-unsupported-state" };
    }

    async function dispatch(action) {
      const capturedEpoch = action.epoch === undefined ? memory.epoch : action.epoch;
      const run = () => {
        if (disabled) { memory = reduce(memory, { ...action, epoch: capturedEpoch }, options.now()); return clone(memory); }
        let raw, latest;
        try { raw = storage.getItem(STORAGE_KEY); latest = decode(raw); }
        catch (_) { disabled = true; status = { persistent: false, reason: "read-failed" }; memory = reduce(memory, { ...action, epoch: capturedEpoch }, options.now()); return clone(memory); }
        if (latest.epoch !== capturedEpoch) { memory = latest; status = { persistent: true, reason: "epoch-mismatch" }; return clone(memory); }
        const full = reduce(latest, action, options.now());
        validateState(full);
        const next = clone(full);
        let serialized = JSON.stringify(next);
        try {
          if (bytes(serialized) > maxBytes) { prune(next, 20); serialized = JSON.stringify(next); }
          requireValue(bytes(serialized) <= maxBytes, "Digest exceeds owned state budget");
          if (pendingMigration !== null) storage.setItem(BACKUP_KEY, pendingMigration);
          try { storage.setItem(STORAGE_KEY, serialized); }
          catch (_) {
            prune(next, 20); serialized = JSON.stringify(next);
            storage.setItem(STORAGE_KEY, serialized);
          }
          requireValue(storage.getItem(STORAGE_KEY) === serialized, "Persistence verification failed");
          pendingMigration = null; memory = next; status = { persistent: true, reason: "ready" };
        } catch (_) {
          disabled = true; memory = full; status = { persistent: false, reason: "write-failed-memory-only" };
        }
        return clone(memory);
      };
      if (disabled) return run();
      let actionError = null, ran = false;
      try {
        const result = await options.withLock(() => {
          requireValue(!ran, "Exclusive callback must execute once"); ran = true;
          try { return run(); } catch (error) { actionError = error; throw error; }
        });
        requireValue(ran, "Exclusive callback was not executed");
        return result;
      }
      catch (error) {
        if (actionError) throw actionError;
        disabled = true; status = { persistent: false, reason: "coordination-failed" };
        return ran ? clone(memory) : run();
      }
    }
    async function resetPersistent(newEpoch) {
      requireValue(token(newEpoch) !== memory.epoch, "Reset needs a new epoch");
      const fresh = createState(newEpoch, options.now());
      if (typeof options.withLock !== "function") {
        memory = fresh; disabled = true; status = { persistent: false, reason: "coordination-unavailable" }; return clone(memory);
      }
      let ran = false;
      try {
        await options.withLock(() => {
          requireValue(!ran, "Exclusive callback must execute once"); ran = true;
          const serialized = JSON.stringify(fresh);
          requireValue(bytes(serialized) <= maxBytes, "Reset exceeds owned state budget");
          storage.setItem(STORAGE_KEY, serialized);
          requireValue(storage.getItem(STORAGE_KEY) === serialized, "Reset verification failed");
          pendingMigration = null; memory = fresh; disabled = false; status = { persistent: true, reason: "ready" };
        });
        requireValue(ran, "Exclusive callback was not executed");
      } catch (_) { memory = fresh; disabled = true; status = { persistent: false, reason: "reset-not-saved" }; }
      return clone(memory);
    }
    return Object.freeze({ getState: () => clone(memory), getStatus: () => ({ ...status }), dispatch, resetPersistent });
  }

  return Object.freeze({ SCHEMA, STORAGE_KEY, BACKUP_KEY, MAX_EVENTS, MAX_SUBJECTS, MAX_BYTES,
    createState, reconcile, ingest, evaluateFreshness, captureReview, acknowledge, clearHistory, reset,
    view, createStore });
});

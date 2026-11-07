// Current cost snapshot: verify metadata first; fetch one selected chart on demand.
(() => {
  "use strict";
  const app = document.getElementById("cost-app");
  if (!app) return;
  const T = JSON.parse(document.getElementById("cost-labels").textContent);
  const BPS = [0, 5, 10, 25];
  const WINDOWS = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "Max"];
  const MODEL = "synthetic-exposure-cost-v1";
  const byId = id => document.getElementById(`cost-${id}`);
  const controls = Object.fromEntries(["universe", "cost", "window", "strategy"].map(key => [key, byId(key)]));
  const status = byId("status");
  let index, pairs = [], universes, state, selected, chartCache, plotted, request = 0, controller;
  let activeUniverse, universeRequest = 0;
  const shardCache = new Map(); // Bounded by this pinned catalog's declared universes.
  const ensure = (condition, message) => { if (!condition) throw new Error(message); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const percent = value => finite(value) ? `${value !== 0 && Math.abs(value) < .00005 ? (100 * value).toPrecision(3) : (100 * value).toFixed(2)}%` : T.notAvailable;
  const number = value => finite(value) ? (value !== 0 && (Math.abs(value) < .001 || Math.abs(value) >= 1e6) ? value.toExponential(3) : value.toFixed(3)) : T.notAvailable;
  const unit = value => value === "initial-capital-units" ? T.initialUnits : T.windowUnits;
  function node(tag, text, attributes = {}) {
    const result = document.createElement(tag);
    if (text !== undefined) result.textContent = text;
    for (const [key, value] of Object.entries(attributes)) result.setAttribute(key, value);
    return result;
  }
  async function sha(bytes) {
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("");
  }
  function safePath(value) {
    ensure(typeof value === "string" && /^data\/costs\/[A-Za-z0-9_./-]+$/.test(value) && !value.split("/").includes(".."), "Unsafe cost path");
    return `/${value}`;
  }
  function reference(ref, path) {
    ensure(ref && ref.path === path && /^[a-f0-9]{64}$/.test(ref.sha256) && Number.isSafeInteger(ref.bytes) && ref.bytes > 0 && ref.bytes <= 64 * 1024 * 1024, "Invalid cost reference");
    safePath(ref.path);
  }
  async function fetchJSON(ref, signal) {
    const response = await fetch(safePath(ref.path), { credentials: "same-origin", redirect: "error", cache: "no-cache", signal });
    ensure(response.ok, `HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    ensure(bytes.byteLength <= 64 * 1024 * 1024 && (ref.bytes === undefined || bytes.byteLength === ref.bytes), "Cost size mismatch");
    ensure(await sha(bytes) === ref.sha256, "Cost checksum mismatch");
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  }
  function validateIndex() {
    ensure(index.schemaVersion === 1 && index.model?.id === MODEL && same(index.costsBps, BPS) && same(index.windows, WINDOWS), "Unknown cost snapshot");
    const coverage = index.coverage;
    ensure(coverage && Number.isSafeInteger(coverage.expectedPairs) && coverage.expectedPairs > 0 && coverage.allComplete === true &&
      coverage.complete === coverage.expectedPairs && coverage.independentlyDeclaredPairs === coverage.expectedPairs && coverage.failed === 0 && coverage.unavailable === 0, "Incomplete cost candidate");
    ensure(Array.isArray(index.pairs) && index.pairs.length === coverage.expectedPairs, "Cost coverage mismatch");
    const keys = index.pairs.map(row => JSON.stringify([row.strategyId, row.symbol]));
    ensure(new Set(keys).size === keys.length, "Duplicate indexed cost pairs");
    for (const pair of index.pairs) {
      ensure(pair.status === "complete" && pair.sourceStatus === "complete" && /^[a-f0-9]{64}$/.test(pair.runId), "Incomplete indexed cost pair");
      ensure(["single", "basket"].includes(pair.kind) && Array.isArray(pair.assets) && pair.assets.length &&
        pair.assets.every(asset => typeof asset === "string" && asset) && new Set(pair.assets).size === pair.assets.length, "Invalid indexed universe");
      ensure(pair.kind !== "single" || pair.assets.length === 1, "Single market has multiple assets");
      reference(pair.chart, `data/costs/charts/${pair.runId}.json`);
    }
  }
  function validatePairs(rows, indexedRows) {
    ensure(Array.isArray(rows) && rows.length === indexedRows.length, "Cost shard coverage mismatch");
    const identity = row => JSON.stringify([row.strategyId, row.symbol]);
    const publicPairs = new Map(indexedRows.map(row => [identity(row), row]));
    ensure(new Set(rows.map(identity)).size === rows.length, "Duplicate cost pairs");
    for (const pair of rows) {
      const published = publicPairs.get(identity(pair));
      ensure(published && pair.status === "complete" && published.status === "complete" && pair.sourceStatus === published.sourceStatus && pair.runId === published.runId && /^[a-f0-9]{64}$/.test(pair.runId), "Cost run identity mismatch");
      ensure(["single", "basket"].includes(pair.kind) && pair.kind === published.kind && Array.isArray(pair.assets) && pair.assets.length && new Set(pair.assets).size === pair.assets.length && same(pair.assets, published.assets), "Universe mismatch");
      ensure(pair.kind !== "single" || pair.assets.length === 1, "Single market has multiple assets");
      reference(pair.chart, `data/costs/charts/${pair.runId}.json`);
      ensure(same(pair.chart, published.chart) && pair.provenance.runId === pair.runId, "Chart reference mismatch");
      ensure(same(Object.keys(pair.windows).sort(), [...WINDOWS].sort()), "Window coverage mismatch");
      for (const window of Object.values(pair.windows)) {
        ensure(["complete", "unavailable"].includes(window.status), "Unresolved cost window");
        if (window.status !== "complete") continue;
        ensure(window.context.kind === pair.kind && same(window.context.assets, pair.assets) && window.context.model === MODEL, "Mixed universe comparison");
        ensure(same(window.scenarios.map(row => row.bps), BPS), "Missing cost scenarios");
        for (const scenario of window.scenarios) {
          for (const key of ["strategy", "benchmark"]) {
            const metrics = scenario[key];
            ensure(["totalReturn", "terminalWealth", "maxDrawdown", "chargedTurnover", "totalFeesPaid"].every(field => finite(metrics[field])), "Invalid cost metrics");
            ensure(["initial-capital-units", "start-close-capital-units"].includes(metrics.feesPaidUnit), "Unknown fee units");
          }
          ensure(finite(scenario.excessReturn) && ["ranked", "incomparable"].includes(scenario.rank.status), "Invalid cost comparison");
          if (scenario.rank.status === "ranked") ensure(Number.isSafeInteger(scenario.rank.value) && scenario.rank.value > 0 && Number.isSafeInteger(scenario.rank.deltaFromZeroCost), "Invalid rank");
        }
      }
    }
  }
  async function buildCatalog(catalog) {
    validateIndex();
    ensure([1, 2].includes(catalog.schemaVersion), "Unsupported cost catalog");
    universes = new Map();
    const keys = new Map();
    for (const pair of index.pairs) {
      const identity = JSON.stringify([pair.kind, pair.assets]);
      if (!keys.has(identity)) keys.set(identity, `${pair.kind}-${await sha(new TextEncoder().encode(identity))}`);
      const key = keys.get(identity);
      if (!universes.has(key)) universes.set(key, { key, kind: pair.kind, assets: pair.assets,
        label: `${T[pair.kind]} · ${pair.assets.join(" / ")}`, indexedPairs: [] });
      universes.get(key).indexedPairs.push(pair);
    }
    if (catalog.schemaVersion === 1) {
      validatePairs(catalog.pairs, index.pairs);
      for (const pair of catalog.pairs) {
        pair.universeKey = keys.get(JSON.stringify([pair.kind, pair.assets]));
        const group = universes.get(pair.universeKey);
        (group.legacyPairs ||= []).push(pair);
      }
      return;
    }
    ensure(Array.isArray(catalog.shards) && catalog.shards.length === universes.size, "Cost catalog universe coverage mismatch");
    const seen = new Set();
    for (const descriptor of catalog.shards) {
      const group = universes.get(descriptor.universeId);
      ensure(group && !seen.has(descriptor.universeId) && descriptor.kind === group.kind && same(descriptor.assets, group.assets), "Incorrect or duplicate catalog universe");
      ensure(Number.isSafeInteger(descriptor.pairCount) && descriptor.pairCount === group.indexedPairs.length, "Catalog pair count mismatch");
      reference(descriptor.ref, `data/costs/universes/${group.key}.json`);
      group.ref = descriptor.ref;
      seen.add(group.key);
    }
  }
  function loadUniverse(group) {
    if (group.legacyPairs) return Promise.resolve(group.legacyPairs);
    const key = `${app.dataset.indexSha256}:${group.key}:${group.ref.sha256}`;
    if (!shardCache.has(key)) {
      const pending = fetchJSON(group.ref).then(shard => {
        ensure(shard.schemaVersion === 1 && shard.universeId === group.key && shard.kind === group.kind && same(shard.assets, group.assets), "Cost shard identity mismatch");
        validatePairs(shard.pairs, group.indexedPairs);
        for (const pair of shard.pairs) pair.universeKey = group.key;
        return shard.pairs;
      }).catch(error => { shardCache.delete(key); throw error; });
      shardCache.set(key, pending);
    }
    return shardCache.get(key);
  }
  function clearComparison() {
    request++; controller?.abort(); plotted = null; selected = null;
    byId("chart").hidden = true; byId("load").disabled = true;
    byId("chart-status").textContent = "";
    byId("results").replaceChildren(); byId("metrics").replaceChildren();
    byId("universe-download").hidden = true;
  }
  async function activateState(message = "") {
    const token = ++universeRequest, group = universes.get(state.universe);
    if (activeUniverse === state.universe) {
      render(); status.textContent = message;
      Object.values(controls).forEach(select => { select.disabled = false; });
      byId("copy").disabled = false;
      return;
    }
    clearComparison();
    app.setAttribute("aria-busy", "true"); status.textContent = T.loading;
    setOptions(controls.strategy, [["", T.all], ...group.indexedPairs.map(pair => [pair.strategyId, pair.strategyId])]);
    for (const [key, select] of Object.entries(controls)) select.value = state[key];
    try {
      const loaded = await loadUniverse(group);
      if (token !== universeRequest) return;
      pairs = loaded; activeUniverse = group.key;
      render(); status.textContent = message;
      Object.values(controls).forEach(select => { select.disabled = false; });
      byId("copy").disabled = false;
    } catch (error) {
      if (token !== universeRequest) return;
      console.warn("Cost universe rejected:", error.message);
      clearComparison(); status.textContent = T.error;
      Object.values(controls).forEach(select => { select.disabled = true; });
      byId("copy").disabled = true;
    } finally {
      if (token === universeRequest) app.setAttribute("aria-busy", "false");
    }
  }
  function setOptions(select, options) {
    select.replaceChildren(...options.map(([value, text]) => node("option", text, { value })));
  }
  function table(headers, rows, caption) {
    const wrapper = node("div", undefined, { class: "table-card cost-table", tabindex: "0", "aria-label": caption });
    const result = node("table");
    result.append(node("caption", caption));
    const head = node("thead"), row = node("tr");
    headers.forEach(text => row.append(node("th", text, { scope: "col" })));
    head.append(row); result.append(head);
    const body = node("tbody");
    for (const cells of rows) {
      const tr = node("tr");
      cells.forEach((value, i) => {
        const td = node(i === 0 ? "th" : "td", undefined, i === 0 ? { scope: "row" } : {});
        if (value instanceof Node) td.append(value); else td.textContent = value ?? T.notAvailable;
        tr.append(td);
      });
      body.append(tr);
    }
    result.append(body); wrapper.append(result); return wrapper;
  }
  function defaultUniverse() {
    return [...universes.values()].find(item => item.kind === "single" && same(item.assets, ["SPY"]))?.key || universes.keys().next().value;
  }
  function fromURL() {
    const query = new URLSearchParams(location.search);
    const defaults = { cost: "5", window: "1Y", universe: defaultUniverse(), strategy: "" };
    const next = { ...defaults };
    let reset = false;
    for (const key of ["cost", "window", "universe"]) {
      const value = query.get(key === "cost" ? "bps" : key);
      if (value === null) continue;
      const valid = key === "cost" ? BPS.map(String).includes(value) : key === "window" ? WINDOWS.includes(value) : universes.has(value);
      if (valid) next[key] = value; else reset = true;
    }
    const strategy = query.get("strategy");
    if (strategy) {
      if (universes.get(next.universe).indexedPairs.some(pair => pair.strategyId === strategy)) next.strategy = strategy;
      else reset = true;
    }
    state = next;
    updateURL("replace");
    return activateState(reset ? T.queryReset : "");
  }
  function updateURL(mode) {
    const query = new URLSearchParams({ bps: state.cost, window: state.window, universe: state.universe });
    if (state.strategy) query.set("strategy", state.strategy);
    const url = `${location.pathname}?${query}`;
    if (url !== location.pathname + location.search) history[mode === "push" ? "pushState" : "replaceState"]({}, "", url);
    byId("share-url").value = location.href;
    document.querySelectorAll('.lang-switch, .lang-toggle, a[hreflang]').forEach(link => {
      if (link.tagName === "A") {
        const target = new URL(link.href, location.href);
        if (/\/(?:zh\/)?costs\/$/.test(target.pathname)) { target.search = query.toString(); link.href = target.pathname + target.search; }
      }
    });
  }
  function change(key, value) {
    state[key] = value;
    if (key === "universe") state.strategy = "";
    updateURL("push");
    activateState();
  }
  function render() {
    request++; controller?.abort(); plotted = null;
    byId("chart").hidden = true; byId("chart-status").textContent = "";
    app.setAttribute("aria-busy", "false");
    const download = byId("universe-download");
    download.href = safePath(universes.get(state.universe).ref?.path || index.summary.path);
    download.hidden = false;
    const universePairs = pairs.filter(pair => pair.universeKey === state.universe);
    setOptions(controls.strategy, [["", T.all], ...universePairs.map(pair => [pair.strategyId, pair.strategyId])]);
    for (const [key, select] of Object.entries(controls)) select.value = state[key];
    const visible = universePairs.filter(pair => !state.strategy || pair.strategyId === state.strategy);
    const groups = new Map(), unavailable = [];
    for (const pair of visible) {
      const window = pair.windows[state.window];
      if (window.status !== "complete") { unavailable.push(pair); continue; }
      if (!groups.has(window.cohortId)) groups.set(window.cohortId, []);
      groups.get(window.cohortId).push(pair);
    }
    const results = byId("results"); results.replaceChildren();
    if (groups.size > 1) results.append(node("p", T.differentDates, { class: "data-notice warn" }));
    for (const [groupId, members] of groups) {
      const first = members[0].windows[state.window];
      const scenario = pair => pair.windows[state.window].scenarios.find(item => item.bps === Number(state.cost));
      members.sort((a, b) => (scenario(a).rank.value ?? Infinity) - (scenario(b).rank.value ?? Infinity) || a.strategyId.localeCompare(b.strategyId));
      const caption = `${T.cohort} · ${first.start} → ${first.end} · ${first.context.observations} ${T.observations}`;
      const rows = members.map(pair => {
        const value = scenario(pair), window = pair.windows[state.window];
        const button = node("button", pair.strategyId, { type: "button", class: "cost-strategy-button", "data-strategy": pair.strategyId });
        button.addEventListener("click", () => change("strategy", pair.strategyId));
        return [button, percent(value.strategy.totalReturn), percent(window.gross.strategy.totalReturn),
          value.rank.status === "ranked" ? `${value.rank.value} / ${value.rank.cohortSize}` : T.incomparable,
          value.rank.status === "ranked" ? `${value.rank.deltaFromZeroCost > 0 ? "+" : ""}${value.rank.deltaFromZeroCost}` : "—",
          `${number(value.strategy.totalFeesPaid)} ${unit(value.strategy.feesPaidUnit)}`, percent(value.excessReturn)];
      });
      const group = table([T.strategy, T.net, T.gross, T.rank, T.delta, T.fees, T.excess], rows, caption);
      group.dataset.cohort = groupId; results.append(group);
    }
    for (const pair of unavailable) {
      const reason = pair.windows[state.window].reason === "fewer-than-two-observations" ? T.fewObservations : T.missingWindow;
      results.append(node("p", `${pair.strategyId} · ${state.window}: ${reason}`, { class: "cost-unavailable" }));
    }
    selected = universePairs.find(pair => pair.strategyId === state.strategy);
    const metrics = byId("metrics"); metrics.replaceChildren();
    const window = selected?.windows[state.window];
    byId("load").disabled = !window || window.status !== "complete";
    if (!selected) { metrics.append(node("p", T.select)); return; }
    metrics.append(node("h3", `${selected.strategyId} · ${universes.get(state.universe).label}`));
    if (window.status !== "complete") { metrics.append(node("p", T.missingWindow)); return; }
    const value = window.scenarios.find(item => item.bps === Number(state.cost));
    const fields = [["totalReturn", T.return, percent], ["cagr", T.cagr, percent], ["maxDrawdown", T.drawdown, percent],
      ["volatility", T.volatility, percent], ["sharpe", T.sharpe, number], ["chargedTurnover", T.turnover, n => `${number(n)}×`],
      ["totalFeesPaid", T.fees, n => `${number(n)} ${unit(value.strategy.feesPaidUnit)}`]];
    metrics.append(table([T.metric, T.gross, `${T.net} · ${state.cost} bp`, T.benchmark], fields.map(([key, text, format]) =>
      [text, format(window.gross.strategy[key]), format(value.strategy[key]), format(value.benchmark[key])]), `${selected.strategyId} · ${window.start} → ${window.end}`));
    metrics.append(node("p", `${T.excess}: ${percent(value.excessReturn)}`));
    const crossing = window.breakEven;
    metrics.append(node("p", crossing.status === "bracketed" ? `${T.crossing}: ${crossing.bracket.lowerBps}–${crossing.bracket.upperBps} bp` : T.noCrossing));
    metrics.append(node("p", T.crossingNote, { class: "muted small-note" }));
  }
  function validateChart(chart, pair) {
    ensure(chart.schemaVersion === 1 && chart.modelId === MODEL && chart.strategyId === pair.strategyId && chart.symbol === pair.symbol && chart.kind === pair.kind && same(chart.assets, pair.assets) && same(chart.provenance, pair.provenance), "Chart identity mismatch");
    for (const [name, window] of Object.entries(chart.windows)) {
      const metrics = pair.windows[name];
      ensure(metrics?.status === "complete" && Array.isArray(window.dates) && window.dates.length >= 2 && same(window.scenarios.map(item => item.bps), BPS), "Chart window mismatch");
      ensure(window.dates[0] === metrics.start && window.dates.at(-1) === metrics.end && window.dates.every((date, i) => /^\d{4}-\d{2}-\d{2}$/.test(date) && (!i || date > window.dates[i - 1])), "Chart dates mismatch");
      const sampling = window.sampling;
      ensure(sampling.points === window.dates.length && sampling.sourceObservations === metrics.context.observations && sampling.maxPoints === index.storage.maxChartPointsPerWindow && sampling.points <= sampling.maxPoints && sampling.sampled === (sampling.points < sampling.sourceObservations), "Chart sampling mismatch");
      ensure(window.anchor === metrics.anchor && window.initialCapital === 1, "Chart anchor mismatch");
      for (const scenario of window.scenarios) {
        const summary = metrics.scenarios.find(item => item.bps === scenario.bps);
        for (const key of ["strategy", "benchmark"]) {
          ensure(scenario[key].length === window.dates.length && scenario[key].every(value => finite(value) && value > 0), "Invalid chart values");
          ensure(Math.abs(scenario[key].at(-1) - summary[key].terminalWealth) <= 1e-9 * Math.max(1, summary[key].terminalWealth), "Chart endpoint differs from full metrics");
        }
      }
    }
  }
  function draw() {
    if (!plotted) return;
    const canvas = byId("canvas"), width = canvas.getBoundingClientRect().width, height = 300, ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio);
    const { curve, dates } = plotted, values = [...curve.strategy, ...curve.benchmark];
    const minimum = Math.min(1, ...values), maximum = Math.max(1, ...values), range = maximum - minimum || .1;
    const digits = Math.min(8, Math.max(2, Math.ceil(-Math.log10(range)) + 1));
    const left = digits > 4 ? 88 : 62, right = width - 18, top = 18, bottom = height - 42;
    const x = i => left + (right - left) * i / (dates.length - 1);
    const y = value => bottom - (bottom - top) * (value - minimum + range * .05) / (range * 1.1);
    const theme = getComputedStyle(canvas);
    const ink = theme.getPropertyValue("--ink").trim() || "#242422";
    ctx.font = "12px sans-serif"; ctx.fillStyle = ink; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const value = minimum + range * i / 4;
      ctx.strokeStyle = "rgba(120,120,120,.25)"; ctx.beginPath(); ctx.moveTo(left, y(value)); ctx.lineTo(right, y(value)); ctx.stroke();
      ctx.fillText(value.toFixed(digits), 8, y(value) + 4);
    }
    for (const [key, color, dash] of [["strategy", theme.getPropertyValue("--cost-strategy").trim(), []], ["benchmark", theme.getPropertyValue("--cost-benchmark").trim(), [6, 4]]]) {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dash); ctx.beginPath();
      curve[key].forEach((value, i) => i ? ctx.lineTo(x(i), y(value)) : ctx.moveTo(x(i), y(value))); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.fillStyle = ink; ctx.fillText(dates[0], left, height - 12);
    ctx.textAlign = "right"; ctx.fillText(dates.at(-1), right, height - 12);
  }
  async function loadCurve() {
    if (!selected || selected.windows[state.window].status !== "complete") return;
    const pair = selected, windowName = state.window, bps = Number(state.cost), token = ++request;
    controller?.abort(); controller = new AbortController();
    byId("load").disabled = true; byId("chart-status").textContent = T.curveLoading;
    try {
      let chart = chartCache?.runId === pair.runId ? chartCache.chart : await fetchJSON(pair.chart, controller.signal);
      validateChart(chart, pair);
      if (token !== request) return;
      chartCache = { runId: pair.runId, chart };
      const window = chart.windows[windowName]; ensure(window, "Selected chart window missing");
      const curve = window.scenarios.find(item => item.bps === bps);
      plotted = { curve, dates: window.dates };
      byId("chart").hidden = false;
      const sampling = `${T.sampled}: ${window.sampling.points} ${T.points} ${window.sampling.sourceObservations} ${T.observations}. ${T.fullMetrics}`;
      byId("sampling").textContent = sampling;
      byId("canvas").setAttribute("aria-label", `${pair.strategyId}, ${bps} bp. ${sampling}`);
      byId("samples").replaceChildren(table([T.date, T.net, T.benchmark], window.dates.map((date, i) =>
        [date, curve.strategy[i].toFixed(6), curve.benchmark[i].toFixed(6)]), T.equity));
      byId("chart-status").textContent = ""; draw();
    } catch (error) {
      if (token === request && error.name !== "AbortError") { byId("chart").hidden = true; byId("chart-status").textContent = T.curveError; }
    } finally { if (token === request) byId("load").disabled = false; }
  }
  async function start() {
    try {
      ensure(globalThis.crypto?.subtle, "Checksum verification unavailable");
      index = await fetchJSON({ path: "data/costs/index.json", sha256: app.dataset.indexSha256 });
      reference(index.summary, "data/costs/summary.json");
      await buildCatalog(await fetchJSON(index.summary));
      setOptions(controls.universe, [...universes.values()].map(item => [item.key, item.label]));
      setOptions(controls.cost, BPS.map(value => [String(value), `${value} bp`]));
      setOptions(controls.window, WINDOWS.map(value => [value, value === "Max" ? T.windowMax : value]));
      Object.entries(controls).forEach(([key, select]) => { select.addEventListener("change", () => change(key, select.value)); });
      byId("filters").addEventListener("submit", event => event.preventDefault());
      byId("copy").addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(location.href); status.textContent = T.copied; }
        catch (_) { byId("share-url").select(); status.textContent = T.copyFallback; }
      });
      byId("load").addEventListener("click", loadCurve);
      window.addEventListener("popstate", fromURL);
      window.addEventListener("resize", draw);
      new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      await fromURL();
    } catch (error) {
      console.warn("Cost snapshot rejected:", error.message);
      status.textContent = T.error;
      byId("results").replaceChildren(); byId("metrics").replaceChildren();
      byId("chart").hidden = true;
      Object.values(controls).forEach(select => { select.disabled = true; });
    }
  }
  start();
})();

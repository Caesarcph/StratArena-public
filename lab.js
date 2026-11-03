// Strategy Lab: compare your own equity curve (CSV or MT5 tester report)
// with every arena strategy on the same market and period. Everything runs
// in the browser; the file is never uploaded.

const LAB_MAX_BYTES = 20 * 1024 * 1024;
const LAB_TIME_HEADERS = ["time", "date", "datetime", "时间", "日期", "время", "дата", "zeit", "datum"];
const LAB_BALANCE_HEADERS = ["balance", "equity", "余额", "净值", "баланс", "средства", "kontostand"];
let labData = null; // { name, dates: [...], values: [...], kind }
let labError = "";

function labState(params) {
  return { instrument: params.get("instrument") || "SPY" };
}

/* ---------- Parsing ---------- */

function labDecode(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  let zeros = 0;
  for (let i = 1; i < Math.min(bytes.length, 400); i += 2) if (bytes[i] === 0) zeros += 1;
  if (zeros > 100) return new TextDecoder("utf-16le").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

// order: "dmy" or "mdy" for dates like 02/01/2024; decided per column by labDateOrder().
function labParseDate(raw, order = "mdy") {
  const text = String(raw || "").trim().replace(/^"|"$/g, "");
  let m = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) return labIso(+m[1], +m[2], +m[3]);
  m = text.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    if (a > 12) return labIso(+m[3], b, a);
    if (b > 12) return labIso(+m[3], a, b);
    return order === "dmy" ? labIso(+m[3], b, a) : labIso(+m[3], a, b);
  }
  m = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return labIso(+m[1], +m[2], +m[3]);
  return null;
}

function labDateOrder(values) {
  // If any value has a first number above 12 the column is day-first; if any
  // has a second number above 12 it is month-first. US order otherwise.
  for (const raw of values) {
    const m = String(raw || "").trim().match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
    if (!m) continue;
    if (+m[1] > 12) return "dmy";
    if (+m[2] > 12) return "mdy";
  }
  return "mdy";
}

function labIso(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function labNumber(raw) {
  const text = String(raw ?? "").replace(/[\s  "]/g, "").replace(/%$/, "");
  if (!text) return NaN;
  // "1,234.56" or "1234,56"
  const normalized = /,\d{1,2}$/.test(text) && !text.includes(".") ? text.replace(",", ".") : text.replace(/,/g, "");
  return Number(normalized);
}

function labLastPerDay(points) {
  const byDay = new Map();
  points.forEach(([date, value]) => {
    if (date && Number.isFinite(value)) byDay.set(date, value);
  });
  const dates = [...byDay.keys()].sort();
  return { dates, values: dates.map((d) => byDay.get(d)) };
}

function labParseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 3) throw new Error("too_short");
  const sample = lines.slice(0, 5).join("\n");
  const delimiter = ["\t", ";", ","].reduce((best, d) => (sample.split(d).length > sample.split(best).length ? d : best), ",");
  const rows = lines.map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, "")));
  const header = labParseDate(rows[0][0]) ? null : rows[0].map((h) => h.toLowerCase());
  const body = header ? rows.slice(1) : rows;
  const dateCol = header ? Math.max(0, header.findIndex((h) => LAB_TIME_HEADERS.some((k) => h.includes(k)))) : 0;
  let valueCol = -1;
  let isReturn = false;
  if (header) {
    valueCol = header.findIndex((h) => /equity|balance|value|nav|close|净值|余额/.test(h));
    const retCol = header.findIndex((h) => /return|ret|pnl|收益/.test(h));
    if (valueCol < 0 && retCol >= 0) {
      valueCol = retCol;
      isReturn = true;
    }
  }
  if (valueCol < 0) {
    // Last column that is numeric on most rows.
    for (let c = body[0].length - 1; c >= 0; c -= 1) {
      if (c === dateCol) continue;
      const numeric = body.slice(0, 50).filter((r) => Number.isFinite(labNumber(r[c]))).length;
      if (numeric >= Math.min(10, body.length) * 0.8) {
        valueCol = c;
        break;
      }
    }
  }
  if (valueCol < 0) throw new Error("no_values");
  const order = labDateOrder(body.map((r) => r[dateCol]));
  const points = body.map((r) => [labParseDate(r[dateCol], order), labNumber(r[valueCol])]);
  const values = points.map((p) => p[1]).filter(Number.isFinite);
  if (!isReturn && values.length && values.every((v) => Math.abs(v) < 1) && values.some((v) => v < 0)) isReturn = true;
  let series = labLastPerDay(points);
  if (isReturn) {
    let equity = 1;
    series = { dates: series.dates, values: series.values.map((r) => (equity *= 1 + r)) };
  }
  return { ...series, kind: isReturn ? "returns" : "equity" };
}

function labParseReport(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const rows = [...doc.querySelectorAll("tr")];
  let timeCol = -1;
  let balanceCol = -1;
  const points = [];
  rows.forEach((row) => {
    const cells = [...row.children].map((cell) => cell.textContent.trim());
    const lower = cells.map((c) => c.toLowerCase());
    const t = lower.findIndex((c) => LAB_TIME_HEADERS.includes(c));
    const b = lower.findIndex((c) => LAB_BALANCE_HEADERS.includes(c));
    if (t >= 0 && b >= 0) {
      timeCol = t;
      balanceCol = b;
      return;
    }
    if (timeCol < 0 || cells.length <= Math.max(timeCol, balanceCol)) return;
    const value = labNumber(cells[balanceCol]);
    if (Number.isFinite(value) && value > 0) points.push([cells[timeCol], value]);
  });
  const order = labDateOrder(points.map((p) => p[0]));
  points.forEach((p) => {
    p[0] = labParseDate(p[0], order);
  });
  if (points.filter((p) => p[0]).length < 3) throw new Error("no_report_table");
  return { ...labLastPerDay(points), kind: "report" };
}

async function labReadFile(file) {
  if (file.size > LAB_MAX_BYTES) throw new Error("too_large");
  const text = labDecode(await file.arrayBuffer());
  const parsed = /<table|<html/i.test(text.slice(0, 5000)) ? labParseReport(text) : labParseCsv(text);
  if (parsed.dates.length < 20) throw new Error("too_short");
  if (parsed.values.some((v) => !(v > 0))) throw new Error("non_positive");
  return { ...parsed, name: file.name };
}

/* ---------- Analysis ---------- */

function labMarketDates(instrument) {
  const strategies = store.performance.strategies || {};
  for (const entry of Object.values(strategies)) {
    const eq = entry.equity?.[instrument];
    if (eq?.dates?.length) return eq;
  }
  return null;
}

function labAlign(data, market) {
  // Forward-fill the user's curve onto the market's trading days.
  const first = data.dates[0];
  const last = data.dates[data.dates.length - 1];
  const dates = [];
  const user = [];
  const bench = [];
  let j = 0;
  let current = null;
  market.dates.forEach((date, i) => {
    if (date < first || date > last) return;
    while (j < data.dates.length && data.dates[j] <= date) {
      current = data.values[j];
      j += 1;
    }
    if (current === null) return;
    dates.push(date);
    user.push(current);
    bench.push(market.benchmark[i]);
  });
  return { dates, user, bench };
}

function labAnalyze(instrument) {
  const market = labMarketDates(instrument);
  if (!market) return { error: "no_market" };
  const aligned = labAlign(labData, market);
  if (aligned.dates.length < 20) return { error: "no_overlap" };
  const dateSet = new Map(aligned.dates.map((d, i) => [d, i]));
  const userMetrics = calcMetrics({ dates: aligned.dates, strategy: aligned.user, benchmark: aligned.bench });
  const benchMetrics = calcMetrics({ dates: aligned.dates, strategy: aligned.bench, benchmark: aligned.bench });
  const arena = [];
  store.strategies.forEach((strategy) => {
    const eq = store.performance.strategies?.[strategy.id]?.equity?.[instrument];
    if (!eq) return;
    const values = [];
    const dates = [];
    eq.dates.forEach((d, i) => {
      if (dateSet.has(d)) {
        dates.push(d);
        values.push(eq.strategy[i]);
      }
    });
    if (values.length < aligned.dates.length * 0.9) return;
    arena.push({ strategy, dates, values, metrics: calcMetrics({ dates, strategy: values, benchmark: values }) });
  });
  const beaten = arena.filter((row) => row.metrics.sharpe < userMetrics.sharpe).length;
  const percentile = arena.length ? Math.round((beaten / arena.length) * 100) : null;
  arena.sort((a, b) => b.metrics.sharpe - a.metrics.sharpe);
  return { aligned, userMetrics, benchMetrics, arena, percentile };
}

/* ---------- Rendering ---------- */

function labMetricRow(label, user, bench, kind) {
  return `<tr><td>${label}</td><td><strong>${formatMetric(user, kind)}</strong></td><td>${formatMetric(bench, kind)}</td></tr>`;
}

function renderLab(route) {
  const state = labState(route.params);
  // Every market with equity data; the selected one is loaded before rendering.
  const files = store.performance.equityFiles || {};
  const instruments = (store.performance.instruments || []).filter((item) => files[item.symbol] || labMarketDates(item.symbol));
  const options = instruments
    .map((item) => `<option value="${item.symbol}" ${item.symbol === state.instrument ? "selected" : ""}>${item.symbol} · ${escapeHtml(item.name)}</option>`)
    .join("");
  let results = "";
  if (labError) {
    results = `<div class="data-notice warn" role="alert"><span class="data-notice-dot" aria-hidden="true"></span><div><strong>${t("lab.error_title")}</strong> <span>${t(`lab.error_${labError}`)}</span></div></div>`;
  } else if (labData) {
    const analysis = labAnalyze(state.instrument);
    if (analysis.error) {
      results = `<div class="data-notice warn" role="alert"><span class="data-notice-dot" aria-hidden="true"></span><div><span>${t(`lab.error_${analysis.error}`)}</span></div></div>`;
    } else {
      const { aligned, userMetrics: u, benchMetrics: b, arena, percentile } = analysis;
      const top = arena.slice(0, 5);
      results = `
        <div class="lab-summary card">
          <div class="eyebrow">${escapeHtml(labData.name)} · ${aligned.dates[0]} → ${aligned.dates[aligned.dates.length - 1]}</div>
          <h2>${percentile === null ? "" : t("lab.percentile", { pct: percentile, n: arena.length, instrument: state.instrument })}</h2>
          <p class="muted">${t("lab.percentile_note")}</p>
        </div>
        <div class="chart-card lab-chart"><div class="chart-body"><canvas id="lab-chart"></canvas></div></div>
        <div class="card-grid two-col">
          <div class="table-card"><table>
            <thead><tr><th></th><th>${t("lab.yours")}</th><th>${t("lab.buy_hold", { instrument: state.instrument })}</th></tr></thead>
            <tbody>
              ${labMetricRow(t("metric.total_return"), u.totalReturn, b.totalReturn, "totalReturn")}
              ${labMetricRow(t("metric.cagr"), u.cagr, b.cagr, "cagr")}
              ${labMetricRow(t("metric.sharpe"), u.sharpe, b.sharpe, "ratio")}
              ${labMetricRow(t("metric.sortino"), u.sortino, b.sortino, "ratio")}
              ${labMetricRow(t("metric.max_drawdown"), u.maxDrawdown, b.maxDrawdown, "maxDrawdown")}
              ${labMetricRow(t("metric.volatility"), u.volatility, b.volatility, "totalReturn")}
              ${labMetricRow(t("metric.ulcer_index"), u.ulcer, b.ulcer, "totalReturn")}
            </tbody>
          </table></div>
          <div class="table-card"><table>
            <thead><tr><th>${t("lab.best_same_period", { instrument: state.instrument })}</th><th>${t("metric.sharpe")}</th><th>${t("metric.cagr")}</th></tr></thead>
            <tbody>${top
              .map((row) => `<tr><td><a class="link" href="?page=strategy&id=${row.strategy.id}&instrument=${encodeURIComponent(state.instrument)}">${row.strategy.id} ${escapeHtml(row.strategy.name)}</a></td><td>${formatMetric(row.metrics.sharpe, "ratio")}</td><td>${formatMetric(row.metrics.cagr, "cagr")}</td></tr>`)
              .join("")}</tbody>
          </table></div>
        </div>`;
    }
  }
  return `
    <section class="section lab-page">
      <div class="section-header">
        <div>
          <div class="eyebrow">${t("lab.eyebrow")}</div>
          <h2>${t("lab.title")}</h2>
          <p>${t("lab.desc")}</p>
        </div>
      </div>
      <div class="lab-input card">
        <label class="lab-drop" for="lab-file" data-lab-drop>
          <strong>${t("lab.drop")}</strong>
          <span class="muted">${t("lab.formats")}</span>
          <input id="lab-file" type="file" accept=".csv,.txt,.htm,.html" />
        </label>
        <div class="lab-controls">
          <div class="filter-group">
            <label for="lab-instrument">${t("lab.compare_on")}</label>
            <select id="lab-instrument">${options}</select>
          </div>
          <button class="button ghost small" type="button" data-lab-example>${t("lab.example")}</button>
          ${labData ? `<button class="button ghost small" type="button" data-lab-clear>${t("lab.clear")}</button>` : ""}
        </div>
        <p class="muted small-note">🔒 ${t("lab.privacy")}</p>
      </div>
      ${results}
      <details class="lab-help">
        <summary>${t("lab.help_title")}</summary>
        <p>${t("lab.help_csv")}</p>
        <pre class="rules">date,equity\n2024-01-02,10000\n2024-01-03,10042.5\n2024-01-04,9987.1</pre>
        <p>${t("lab.help_mt5")}</p>
      </details>
    </section>`;
}

function bindLab(route) {
  const state = labState(route.params);
  const input = document.getElementById("lab-file");
  const handleFile = async (file) => {
    if (!file) return;
    try {
      labData = await labReadFile(file);
      labError = "";
      if (typeof trackEvent === "function") trackEvent("lab_upload", { kind: labData.kind });
    } catch (err) {
      labData = null;
      labError = ["too_large", "too_short", "no_values", "no_report_table", "non_positive"].includes(err.message) ? err.message : "parse";
    }
    render();
  };
  if (input) input.addEventListener("change", () => handleFile(input.files[0]));
  const drop = document.querySelector("[data-lab-drop]");
  if (drop) {
    ["dragenter", "dragover"].forEach((type) => drop.addEventListener(type, (event) => {
      event.preventDefault();
      drop.classList.add("dragging");
    }));
    ["dragleave", "drop"].forEach((type) => drop.addEventListener(type, () => drop.classList.remove("dragging")));
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      handleFile(event.dataTransfer.files[0]);
    });
  }
  const select = document.getElementById("lab-instrument");
  if (select) select.addEventListener("change", () => updateQuery({ page: "lab", instrument: select.value }));
  const example = document.querySelector("[data-lab-example]");
  if (example) {
    example.addEventListener("click", () => {
      // A plain 60/40-style mix of the market and cash, so the comparison has something to show.
      const market = labMarketDates(state.instrument);
      if (!market) return;
      const start = Math.max(0, market.dates.length - 252 * 3);
      let equity = 10000;
      const dates = market.dates.slice(start);
      const values = dates.map((d, i) => {
        if (i > 0) equity *= 1 + 0.6 * (market.benchmark[start + i] / market.benchmark[start + i - 1] - 1);
        return equity;
      });
      labData = { name: t("lab.example_name"), dates, values, kind: "example" };
      labError = "";
      render();
    });
  }
  const clear = document.querySelector("[data-lab-clear]");
  if (clear) {
    clear.addEventListener("click", () => {
      labData = null;
      labError = "";
      render();
    });
  }
  const canvas = document.getElementById("lab-chart");
  if (canvas && labData) {
    const analysis = labAnalyze(state.instrument);
    if (analysis.error) return;
    const { aligned, arena } = analysis;
    const norm = (values) => values.map((v) => v / values[0]);
    const datasets = [
      { label: t("lab.yours"), data: norm(aligned.user), borderColor: palette(0), borderWidth: 2.5, pointRadius: 0, tension: 0.2 },
      { label: t("lab.buy_hold", { instrument: state.instrument }), data: norm(aligned.bench), borderColor: "#9a948c", borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0 }
    ];
    if (arena[0]) {
      const best = arena[0];
      const lookup = new Map(best.dates.map((d, i) => [d, best.values[i]]));
      const values = aligned.dates.map((d) => lookup.get(d) ?? null);
      const base = values.find((v) => v !== null) || 1;
      datasets.push({ label: `${best.strategy.id} ${best.strategy.name}`, data: values.map((v) => (v === null ? null : v / base)), borderColor: palette(1), borderWidth: 1.5, pointRadius: 0, spanGaps: true });
    }
    registerChart(
      new Chart(canvas, {
        type: "line",
        data: { labels: aligned.dates, datasets: datasets.map((d) => ({ backgroundColor: "transparent", ...d })) },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { position: "bottom" } },
          scales: { x: { ticks: { maxTicksLimit: 8 } } }
        }
      })
    );
  }
}

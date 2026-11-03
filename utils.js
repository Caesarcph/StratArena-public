// Series math, metrics, formatting and export helpers shared by every page.
// Split out of app.js; loaded before it as a classic script, so these stay
// global functions. Only function declarations live here: shared state and
// constants (store, TRADING_DAYS, ...) stay in app.js and are read at call time.

function generateSeries(seed, points, trend, vol) {
  const rng = mulberry32(seed);
  const dates = [];
  const strategy = [];
  const benchmark = [];
  let value = 1;
  let bench = 1;
  const start = new Date();
  start.setDate(start.getDate() - points);
  const dailyTrend = trend / 252;
  const dailyVol = vol / Math.sqrt(252);

  for (let i = 0; i < points; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const shock = randomNormal(rng) * dailyVol;
    let ret = dailyTrend + shock;
    if (rng() < 0.02) {
      ret -= dailyVol * (1 + rng());
    }
    value = Math.max(0.2, value * (1 + ret));
    bench = Math.max(0.2, bench * (1 + dailyTrend * 0.6 + shock * 0.7));

    dates.push(date.toISOString().slice(0, 10));
    strategy.push(round(value, 4));
    benchmark.push(round(bench, 4));
  }

  return { dates, strategy, benchmark };
}

function sliceSeries(series, window) {
  if (window === "Max") {
    return series;
  }
  const end = new Date(series.dates[series.dates.length - 1]);
  const start = new Date(end);
  switch (window) {
    case "1M":
      start.setMonth(start.getMonth() - 1);
      break;
    case "3M":
      start.setMonth(start.getMonth() - 3);
      break;
    case "6M":
      start.setMonth(start.getMonth() - 6);
      break;
    case "1Y":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "3Y":
      start.setFullYear(start.getFullYear() - 3);
      break;
    case "5Y":
      start.setFullYear(start.getFullYear() - 5);
      break;
    default:
      return series;
  }
  const startTime = start.getTime();
  const startIndex = series.dates.findIndex(
    (item) => new Date(item).getTime() >= startTime
  );
  const index = startIndex < 0 ? 0 : startIndex;
  return {
    dates: series.dates.slice(index),
    strategy: series.strategy.slice(index),
    benchmark: series.benchmark.slice(index)
  };
}

function normalizeSeries(series) {
  const base = series.strategy[0] || 1;
  const normalized = series.strategy.map((value) => value / base);
  return { ...series, strategy: normalized };
}

function calcRollingMetrics(series, windowSize) {
  const returns = pctChange(series.strategy);
  const benchReturns = pctChange(series.benchmark);
  const labels = series.dates.slice(1);
  const sharpe = [];
  const volatility = [];
  const beta = [];

  for (let i = 0; i < returns.length; i += 1) {
    if (i < windowSize - 1) {
      sharpe.push(null);
      volatility.push(null);
      beta.push(null);
      continue;
    }
    const start = i - windowSize + 1;
    const windowReturns = returns.slice(start, i + 1);
    const windowBench = benchReturns.slice(start, i + 1);
    const avg = mean(windowReturns);
    const stdDev = std(windowReturns);
    const annualVol = stdDev * Math.sqrt(TRADING_DAYS);
    const sharpeValue =
      stdDev === 0 ? 0 : (avg / stdDev) * Math.sqrt(TRADING_DAYS);
    const benchStd = std(windowBench);
    const betaValue =
      benchStd === 0
        ? 0
        : covariance(windowReturns, windowBench) / (benchStd * benchStd);

    sharpe.push(round(sharpeValue, 3));
    volatility.push(round(annualVol, 4));
    beta.push(round(betaValue, 3));
  }

  return { labels, sharpe, volatility, beta };
}

function calcLatestSnapshot(series) {
  if (!series?.dates?.length || series.strategy.length < 2) return null;
  const index = series.strategy.length - 1;
  const prev = index - 1;
  const strategyMove = series.strategy[index] / series.strategy[prev] - 1;
  const benchSeries = series.benchmark || [];
  const benchmarkMove =
    benchSeries.length > index ? benchSeries[index] / benchSeries[prev] - 1 : NaN;
  return {
    date: series.dates[index],
    strategyMove,
    benchmarkMove
  };
}

function buildCumulativeSeries(returns) {
  let value = 1;
  return returns.map((ret) => {
    value *= 1 + ret;
    return round(value, 4);
  });
}

function calcAttribution(series) {
  if (!series?.strategy?.length || !series?.benchmark?.length) return null;
  const returns = pctChange(series.strategy);
  const benchReturns = pctChange(series.benchmark);
  const length = Math.min(returns.length, benchReturns.length);
  if (length < 30) return null;

  const strategyReturns = returns.slice(-length);
  const benchmarkReturns = benchReturns.slice(-length);
  const benchStd = std(benchmarkReturns);
  const benchVar = benchStd * benchStd;
  const beta = benchVar === 0 ? 0 : covariance(strategyReturns, benchmarkReturns) / benchVar;
  const alphaSeries = strategyReturns.map(
    (value, index) => value - beta * benchmarkReturns[index]
  );
  const strategyAnnual = mean(strategyReturns) * TRADING_DAYS;
  const benchmarkAnnual = mean(benchmarkReturns) * TRADING_DAYS;
  const betaContribution = beta * benchmarkAnnual;
  const alphaAnnual = mean(alphaSeries) * TRADING_DAYS;
  const corr = correlation(strategyReturns, benchmarkReturns);
  const rSquared = corr * corr;
  const offset = series.dates.length - length;
  const labels = series.dates.slice(offset);

  return {
    beta,
    alphaAnnual,
    betaContribution,
    strategyAnnual,
    benchmarkAnnual,
    rSquared,
    labels,
    strategyCurve: buildCumulativeSeries(strategyReturns),
    betaCurve: buildCumulativeSeries(benchmarkReturns.map((value) => beta * value)),
    alphaCurve: buildCumulativeSeries(alphaSeries)
  };
}

function calcMetrics(series) {
  const returns = pctChange(series.strategy);
  const totalReturn =
    series.strategy.length > 1
      ? series.strategy[series.strategy.length - 1] / series.strategy[0] - 1
      : 0;
  const years =
    (new Date(series.dates[series.dates.length - 1]) -
      new Date(series.dates[0])) /
    (1000 * 60 * 60 * 24 * 365.25);
  const cagr = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;
  const volatility = std(returns) * Math.sqrt(252);
  const sharpe =
    std(returns) > 0 ? (mean(returns) / std(returns)) * Math.sqrt(252) : 0;
  const downside = returns.filter((value) => value < 0);
  const sortino =
    downside.length && std(downside) > 0
      ? (mean(returns) / std(downside)) * Math.sqrt(252)
      : 0;
  const maxDrawdown = calcMaxDrawdown(series.strategy);
  const calmar = maxDrawdown !== 0 ? cagr / Math.abs(maxDrawdown) : 0;
  const monthReturns = monthlyReturns(series.dates, series.strategy);
  const bestMonth = monthReturns.length ? Math.max(...monthReturns) : 0;
  const worstMonth = monthReturns.length ? Math.min(...monthReturns) : 0;
  const ulcer = calcUlcer(series.strategy);
  const winRate = returns.length
    ? returns.filter((value) => value > 0).length / returns.length
    : 0;
  const profitFactor = profitFactorFromReturns(returns);
  const trades = Math.max(6, Math.round(returns.length / 8));
  const turnover = returns.length ? trades / returns.length : 0;

  return {
    totalReturn,
    cagr,
    sharpe,
    sortino,
    calmar,
    maxDrawdown,
    volatility,
    bestMonth,
    worstMonth,
    ulcer,
    winRate,
    profitFactor,
    trades,
    turnover
  };
}

function calcArenaScore(metrics) {
  const raw =
    40 * metrics.sharpe +
    20 * metrics.sortino +
    10 * metrics.calmar +
    100 * metrics.cagr -
    50 * Math.abs(metrics.maxDrawdown);
  return clamp(raw, 0, 100);
}

function pctChange(values) {
  const result = [];
  for (let i = 1; i < values.length; i += 1) {
    result.push(values[i] / values[i - 1] - 1);
  }
  return result;
}

function calcMaxDrawdown(values) {
  let peak = values[0] || 1;
  let maxDd = 0;
  values.forEach((value) => {
    if (value > peak) peak = value;
    const dd = value / peak - 1;
    if (dd < maxDd) maxDd = dd;
  });
  return maxDd;
}

function calcUlcer(values) {
  let peak = values[0] || 1;
  const squares = values.map((value) => {
    if (value > peak) peak = value;
    const dd = value / peak - 1;
    return dd * dd;
  });
  return Math.sqrt(mean(squares));
}

function monthlyReturns(dates, values) {
  const buckets = {};
  for (let i = 1; i < dates.length; i += 1) {
    const ym = dates[i].slice(0, 7);
    if (!buckets[ym]) {
      buckets[ym] = { start: values[i - 1], end: values[i] };
    } else {
      buckets[ym].end = values[i];
    }
  }
  return Object.values(buckets).map((bucket) => bucket.end / bucket.start - 1);
}

function profitFactorFromReturns(returns) {
  const gains = returns.filter((value) => value > 0).reduce((a, b) => a + b, 0);
  const losses = returns.filter((value) => value < 0).reduce((a, b) => a + b, 0);
  if (losses === 0) return 0;
  return gains / Math.abs(losses);
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values) {
  if (!values.length) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

function covariance(valuesA, valuesB) {
  if (!valuesA.length || valuesA.length !== valuesB.length) return 0;
  const avgA = mean(valuesA);
  const avgB = mean(valuesB);
  let sum = 0;
  for (let i = 0; i < valuesA.length; i += 1) {
    sum += (valuesA[i] - avgA) * (valuesB[i] - avgB);
  }
  return sum / valuesA.length;
}

function correlation(valuesA, valuesB) {
  if (!valuesA.length || valuesA.length !== valuesB.length) return 0;
  const stdA = std(valuesA);
  const stdB = std(valuesB);
  if (stdA === 0 || stdB === 0) return 0;
  return covariance(valuesA, valuesB) / (stdA * stdB);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatMetric(value, key) {
  if (!Number.isFinite(value)) return "--";
  if (key === "score") {
    return value.toFixed(1);
  }
  if (key === "ratio") {
    return value.toFixed(2);
  }
  if (
    key === "totalReturn" ||
    key === "cagr" ||
    key === "maxDrawdown" ||
    key === "winRate" ||
    key === "turnover"
  ) {
    return `${(value * 100).toFixed(2)}%`;
  }
  return value.toFixed(2);
}

function formatPercent(value, digits = 2) {
  if (!Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(0);
}

function formatCompareValue(value, format) {
  if (!Number.isFinite(value)) return "--";
  if (format === "percent") {
    return `${(value * 100).toFixed(2)}%`;
  }
  if (format === "ratio") {
    return value.toFixed(2);
  }
  return Math.round(value).toString();
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function buildCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function downloadFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCanvasAsPng(canvasId, filename) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function copyToClipboard(text) {
  if (!text) return Promise.resolve();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => {});
  }
  return new Promise((resolve) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    resolve();
  });
}

function buildStrategyCsv(strategyId, instrument, window) {
  const series = getSeries(strategyId, instrument);
  const windowed = sliceSeries(series, window);
  const rows = [[t("common.date"), t("common.strategy"), t("common.benchmark")]];
  for (let i = 0; i < windowed.dates.length; i += 1) {
    const strategyValue = Number.isFinite(windowed.strategy[i])
      ? windowed.strategy[i].toFixed(6)
      : "";
    const benchmarkValue = Number.isFinite(windowed.benchmark[i])
      ? windowed.benchmark[i].toFixed(6)
      : "";
    rows.push([windowed.dates[i], strategyValue, benchmarkValue]);
  }
  return buildCsv(rows);
}

function downloadStrategyCsv(strategyId, instrument, window) {
  const csv = buildStrategyCsv(strategyId, instrument, window);
  const filename = `${strategyId}-${instrument}-${window}-equity.csv`;
  downloadFile(filename, csv, "text/csv;charset=utf-8");
}

function buildCompareMetricsCsv(strategies, instrument, window) {
  const metricsData = strategies.map((s) => getMetricsFor(s.id, instrument, window));
  const rows = [[t("common.metric"), ...strategies.map((s) => s.id)]];
  COMPARE_METRICS.forEach((config) => {
    const values = metricsData.map((metrics) =>
      formatCompareValue(metrics[config.key], config.format)
    );
    rows.push([t(config.labelKey), ...values]);
  });
  return buildCsv(rows);
}

function downloadCompareCsv(strategies, instrument, window) {
  if (!strategies.length) return;
  const csv = buildCompareMetricsCsv(strategies, instrument, window);
  const filename = `compare-${instrument}-${window}.csv`;
  downloadFile(filename, csv, "text/csv;charset=utf-8");
}

function buildCompareReportHtml(strategies, instrument, window) {
  const metricsData = strategies.map((s) => getMetricsFor(s.id, instrument, window));
  const headerCells = strategies
    .map((strategy) => `<th>${escapeHtml(strategy.id)}</th>`)
    .join("");
  const rows = COMPARE_METRICS.map((config) => {
    const values = metricsData
      .map((metrics) => formatCompareValue(metrics[config.key], config.format))
      .map((value) => `<td>${escapeHtml(value)}</td>`)
      .join("");
    return `<tr><th>${escapeHtml(t(config.labelKey))}</th>${values}</tr>`;
  }).join("");
  const strategyList = strategies
    .map((strategy) => `${strategy.id} - ${strategy.name}`)
    .join(", ");
  const generated = new Date().toISOString().slice(0, 19).replace("T", " ");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${t("compare.report_title")}</title>
    <style>
      body {
        font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
        margin: 40px;
        color: #1f1f1f;
      }
      h1 {
        margin: 0 0 0.5rem;
      }
      .meta {
        color: #555;
        margin: 0.2rem 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1.5rem;
        font-size: 0.95rem;
      }
      th,
      td {
        border: 1px solid #d9d9d9;
        padding: 0.5rem 0.75rem;
        text-align: left;
      }
      thead th {
        background: #f5f5f5;
      }
      tbody tr:nth-child(odd) {
        background: #fafafa;
      }
    </style>
  </head>
  <body>
    <h1>${t("compare.report_title")}</h1>
    <p class="meta">${t("common.instrument")}: ${escapeHtml(instrument)} | ${t("common.window")}: ${escapeHtml(window)}</p>
    <p class="meta">${t("compare.report_strategies")}: ${escapeHtml(strategyList)}</p>
    <p class="meta">${t("common.generated")}: ${escapeHtml(generated)}</p>
    <table>
      <thead>
        <tr>
          <th>${t("common.metric")}</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </body>
</html>`;
}

function downloadCompareReport(strategies, instrument, window) {
  if (!strategies.length) return;
  const html = buildCompareReportHtml(strategies, instrument, window);
  const filename = `compare-${instrument}-${window}-report.html`;
  downloadFile(filename, html, "text/html;charset=utf-8");
}

function parseList(value) {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (match) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return map[match];
  });
}

function buildPseudocode(strategy) {
  const sections = strategy.pseudocode || {};
  return Object.keys(sections)
    .map((title) => {
      const lines = sections[title]
        .map((line) => `- ${line}`)
        .join("\n");
      return `${title}\n${lines}`;
    })
    .join("\n\n");
}

function uniqueTags(strategies) {
  const tags = new Set();
  strategies.forEach((strategy) => {
    strategy.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

function instrumentHash(symbol) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash << 5) - hash + symbol.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000);
}

function mulberry32(seed) {
  let t = seed;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomNormal(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function round(value, digits) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function palette(index) {
  const colors = [
    "#1f6f78",
    "#e16b3a",
    "#3d6e4e",
    "#4b4e6d",
    "#c94c4c",
    "#6b4c9a",
    "#d4a72c",
    "#2f7bbf",
    "#a66f2b",
    "#2f9d6e"
  ];
  if (index < colors.length) {
    return colors[index];
  }
  const hue = (index * 37) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

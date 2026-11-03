// Charts and tables on the strategy detail page (drawdown, monthly heatmap, parameter sensitivity, attribution, rolling metrics).
// Split out of app.js; loaded before it as a classic script, so these stay
// global functions. Only function declarations live here: shared state and
// constants (store, TRADING_DAYS, ...) stay in app.js and are read at call time.

function calcDrawdownSeries(values) {
  let peak = values[0] || 1;
  return values.map((value) => {
    if (value > peak) peak = value;
    return value / peak - 1;
  });
}

function renderMonthlyHeatmap(container, series) {
  const monthlyData = calcMonthlyReturnsMatrix(series.dates, series.strategy);  

  if (!monthlyData.years.length) {
    container.innerHTML = `<div class='muted'>${t("common.no_data")}</div>`;
    return;
  }

  const months = [
    t("heatmap.jan"),
    t("heatmap.feb"),
    t("heatmap.mar"),
    t("heatmap.apr"),
    t("heatmap.may"),
    t("heatmap.jun"),
    t("heatmap.jul"),
    t("heatmap.aug"),
    t("heatmap.sep"),
    t("heatmap.oct"),
    t("heatmap.nov"),
    t("heatmap.dec")
  ];

  let html = `<table class='heatmap-table'><thead><tr><th>${t("common.year")}</th>`;
  months.forEach((m) => {
    html += `<th>${m}</th>`;
  });
  html += `<th>${t("common.annual")}</th></tr></thead><tbody>`;

  monthlyData.years.forEach((year) => {
    html += `<tr><td class="year-cell">${year}</td>`;
    let yearTotal = 1;
    months.forEach((_, monthIndex) => {
      const value = monthlyData.matrix[year]?.[monthIndex];
      if (value !== undefined) {
        yearTotal *= (1 + value);
        const color = getHeatmapColor(value);
        const displayValue = (value * 100).toFixed(1);
        html += `<td class="heatmap-cell" style="background:${color}">${displayValue}%</td>`;
      } else {
        html += `<td class="heatmap-cell empty">-</td>`;
      }
    });
    const annualReturn = yearTotal - 1;
    const annualColor = getHeatmapColor(annualReturn);
    html += `<td class="heatmap-cell annual" style="background:${annualColor}">${(annualReturn * 100).toFixed(1)}%</td>`;
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

function renderParamSensitivity(strategyId, instrument) {
  const container = document.getElementById("param-sensitivity");
  if (!container) return;

  const sensitivity =
    store.performance.strategies?.[strategyId]?.sensitivity?.[instrument];
  if (!sensitivity || !sensitivity.scores) {
    container.innerHTML = `<div class='muted'>${t("strategy.no_sensitivity")}</div>`;
    return;
  }

  const xKey = sensitivity.xKey;
  const yKey = sensitivity.yKey;
  const xValues = sensitivity.xValues || [];
  const yValues = sensitivity.yValues || [];
  const scores = sensitivity.scores || [];
  const hasY = Boolean(yKey);
  const xLabel = formatParamLabel(xKey);
  const yLabel = hasY ? formatParamLabel(yKey) : xLabel;

  let html = "<table class='sensitivity-table'><thead><tr>";
  html += `<th>${yLabel}</th>`;
  xValues.forEach((value) => {
    html += `<th>${value}</th>`;
  });
  html += "</tr></thead><tbody>";

  yValues.forEach((yValue, rowIndex) => {
    html += "<tr>";
    html += `<td class="param-label">${hasY ? yValue : xLabel}</td>`;
    xValues.forEach((_, colIndex) => {
      const value = scores[rowIndex]?.[colIndex];
      const display = Number.isFinite(value) ? value.toFixed(1) : "-";
      const color = Number.isFinite(value) ? getScoreColor(value) : "transparent";
      html += `<td class="sensitivity-cell" style="background:${color}">${display}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

function drawAttribution(series) {
  const attributionCtx = document.getElementById("attribution-chart");
  const attributionSummary = document.getElementById("attribution-summary");
  if (!attributionCtx && !attributionSummary) return;

  const attribution = calcAttribution(series);
  if (!attribution) {
    if (attributionSummary) {
      attributionSummary.innerHTML =
        `<div class="muted">${t("strategy.not_enough_attribution")}</div>`;
    }
    return;
  }

  if (attributionSummary) {
    attributionSummary.innerHTML = `
      <div class="metric-tile">
        <span>${t("metric.beta")}</span>
        <strong>${attribution.beta.toFixed(2)}</strong>
      </div>
      <div class="metric-tile">
        <span>${t("metric.alpha_ann")}</span>
        <strong>${formatPercent(attribution.alphaAnnual, 2)}</strong>
      </div>
      <div class="metric-tile">
        <span>${t("metric.beta_contrib_ann")}</span>
        <strong>${formatPercent(attribution.betaContribution, 2)}</strong>
      </div>
      <div class="metric-tile">
        <span>${t("metric.r_squared")}</span>
        <strong>${attribution.rSquared.toFixed(2)}</strong>
      </div>
    `;
  }

  if (attributionCtx) {
    registerChart(
      new Chart(attributionCtx, {
        type: "line",
        data: {
          labels: attribution.labels,
          datasets: [
            {
              label: t("common.strategy"),
              data: attribution.strategyCurve,
              borderColor: "#1f6f78",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25
            },
            {
              label: t("strategy.beta_contribution_curve"),
              data: attribution.betaCurve,
              borderColor: "#e16b3a",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25
            },
            {
              label: t("strategy.alpha_contribution_curve"),
              data: attribution.alphaCurve,
              borderColor: "#2f6fa5",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25,
              borderDash: [6, 4]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { position: "bottom" } },
          scales: { y: { type: "linear" } }
        }
      })
    );
  }
}

function drawRollingMetrics(series) {
  const sharpeCtx = document.getElementById("rolling-sharpe");
  const volCtx = document.getElementById("rolling-vol");
  const betaCtx = document.getElementById("rolling-beta");
  if (!sharpeCtx && !volCtx && !betaCtx) return;

  const rolling = calcRollingMetrics(series, ROLLING_WINDOW);
  const labels = rolling.labels;
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: false } },
    scales: { y: { type: "linear" } }
  };

  if (sharpeCtx) {
    registerChart(
      new Chart(sharpeCtx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: t("strategy.rolling_sharpe"),
              data: rolling.sharpe,
              borderColor: palette(0),
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25,
              spanGaps: true
            }
          ]
        },
        options: baseOptions
      })
    );
  }

  if (volCtx) {
    registerChart(
      new Chart(volCtx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: t("strategy.rolling_volatility"),
              data: rolling.volatility,
              borderColor: palette(1),
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25,
              spanGaps: true
            }
          ]
        },
        options: {
          ...baseOptions,
          scales: {
            y: {
              type: "linear",
              ticks: {
                callback: (value) => `${(value * 100).toFixed(0)}%`
              }
            }
          }
        }
      })
    );
  }

  if (betaCtx) {
    registerChart(
      new Chart(betaCtx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: t("strategy.rolling_beta"),
              data: rolling.beta,
              borderColor: palette(2),
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25,
              spanGaps: true
            }
          ]
        },
        options: baseOptions
      })
    );
  }
}

function calcMonthlyReturnsMatrix(dates, values) {
  const matrix = {};
  const yearsSet = new Set();

  for (let i = 1; i < dates.length; i++) {
    const prevDate = dates[i - 1];
    const currDate = dates[i];
    const prevYM = prevDate.slice(0, 7);
    const currYM = currDate.slice(0, 7);

    if (prevYM !== currYM) {
      const year = parseInt(currDate.slice(0, 4));
      const month = parseInt(currDate.slice(5, 7)) - 1;

      // Find last value of previous month and first value of current month
      let prevMonthEnd = values[i - 1];
      let currMonthStart = values[i - 1];

      // Calculate return for the ending month
      const prevYear = parseInt(prevDate.slice(0, 4));
      const prevMonth = parseInt(prevDate.slice(5, 7)) - 1;

      if (!matrix[prevYear]) matrix[prevYear] = {};
      yearsSet.add(prevYear);
    }
  }

  // Recalculate using bucket approach
  const buckets = {};
  for (let i = 0; i < dates.length; i++) {
    const ym = dates[i].slice(0, 7);
    if (!buckets[ym]) {
      buckets[ym] = { start: values[i], end: values[i] };
    } else {
      buckets[ym].end = values[i];
    }
  }

  Object.keys(buckets).forEach((ym) => {
    const year = parseInt(ym.slice(0, 4));
    const month = parseInt(ym.slice(5, 7)) - 1;
    const ret = buckets[ym].end / buckets[ym].start - 1;

    if (!matrix[year]) matrix[year] = {};
    matrix[year][month] = ret;
    yearsSet.add(year);
  });

  const years = Array.from(yearsSet).sort((a, b) => b - a);
  return { years, matrix };
}

function getHeatmapColor(value) {
  if (value === undefined || value === null) return "transparent";

  const intensity = Math.min(Math.abs(value) * 5, 1);

  if (value >= 0) {
    // Green for positive
    const r = Math.round(255 - intensity * 100);
    const g = Math.round(255 - intensity * 30);
    const b = Math.round(255 - intensity * 100);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Red for negative
    const r = Math.round(255 - intensity * 30);
    const g = Math.round(255 - intensity * 100);
    const b = Math.round(255 - intensity * 100);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getScoreColor(value) {
  if (!Number.isFinite(value)) return "transparent";
  const normalized = clamp((value - 50) / 50, -1, 1);
  return getHeatmapColor(normalized);
}

function formatParamLabel(key) {
  if (!key) return "";
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

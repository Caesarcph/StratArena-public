// Portfolio builder on the compare page: weights, share links, risk contribution, risk parity.
// Split out of app.js; loaded before it as a classic script, so these stay
// global functions. Only function declarations live here: shared state and
// constants (store, TRADING_DAYS, ...) stay in app.js and are read at call time.

// Weights travel in the URL as w=ID:weight,ID:weight so a portfolio can be shared.
function weightsFromUrl() {
  const raw = new URLSearchParams(window.location.search).get("w") || "";
  const map = new Map();
  raw.split(",").forEach((pair) => {
    const [id, value] = pair.split(":");
    const number = parseFloat(value);
    if (id && Number.isFinite(number)) map.set(id, Math.max(0, Math.min(100, number)));
  });
  return map;
}

function portfolioShareUrl(strategyIds, weights) {
  const url = new URL(window.location.href);
  url.searchParams.set("w", strategyIds.map((id, i) => `${id}:${Math.round(weights[i] * 10) / 10}`).join(","));
  return url.toString();
}

function getPortfolioWeights(strategyIds) {
  const fromUrl = weightsFromUrl();
  strategyIds.forEach((id) => {
    if (!portfolioWeights.has(id) && fromUrl.has(id)) portfolioWeights.set(id, fromUrl.get(id));
  });
  if (!strategyIds.length) return [];
  const fallback = 100 / strategyIds.length;
  return strategyIds.map((id) => {
    const stored = portfolioWeights.get(id);
    return Number.isFinite(stored) ? stored : fallback;
  });
}

function setPortfolioWeights(strategyIds, weights) {
  strategyIds.forEach((id, index) => {
    portfolioWeights.set(id, weights[index]);
  });
}

function normalizeWeights(weights) {
  const cleaned = weights.map((value) =>
    Number.isFinite(value) ? Math.max(0, value) : 0
  );
  const total = cleaned.reduce((sum, value) => sum + value, 0);
  if (!total) {
    const equal = cleaned.length ? 1 / cleaned.length : 0;
    return { weights: cleaned.map(() => equal), total };
  }
  return { weights: cleaned.map((value) => value / total), total };
}

function alignPortfolioSeries(strategyIds, instrument, window) {
  const seriesList = strategyIds.map((id) =>
    sliceSeries(getSeries(id, instrument), window)
  );
  const minLen = Math.min(...seriesList.map((series) => series.strategy.length));
  if (!minLen || minLen < 2) return null;
  return {
    dates: seriesList[0].dates.slice(-minLen),
    series: seriesList.map((series) => series.strategy.slice(-minLen))
  };
}

function buildPortfolio(strategyIds, weights, instrument, window) {
  const normalized = normalizeWeights(weights);
  const aligned = alignPortfolioSeries(strategyIds, instrument, window);        
  if (!aligned) {
    return { series: null, metrics: null, total: normalized.total };
  }
  const returnsList = aligned.series.map((values) => pctChange(values));
  const minReturns = Math.min(...returnsList.map((returns) => returns.length));
  const trimmedReturns = returnsList.map((returns) => returns.slice(-minReturns));
  const portfolioReturns = trimmedReturns[0].map((_, index) =>
    trimmedReturns.reduce(
      (sum, returns, idx) => sum + normalized.weights[idx] * returns[index],
      0
    )
  );
  const values = [1];
  portfolioReturns.forEach((ret) => {
    values.push(round(values[values.length - 1] * (1 + ret), 4));
  });
  const dates = aligned.dates.slice(aligned.dates.length - values.length);
  const series = { dates, strategy: values };
  const metrics = calcMetrics(series);
  return { series, metrics, total: normalized.total };
}

function calcRiskContribution(strategyIds, weights, instrument, window) {
  const normalized = normalizeWeights(weights);
  const aligned = alignPortfolioSeries(strategyIds, instrument, window);
  if (!aligned) return null;
  const returnsList = aligned.series.map((values) => pctChange(values));
  const minReturns = Math.min(...returnsList.map((returns) => returns.length));
  if (!minReturns || minReturns < 2) return null;
  const trimmed = returnsList.map((returns) => returns.slice(-minReturns));
  const covMatrix = trimmed.map((row) =>
    trimmed.map((col) => covariance(row, col))
  );
  const weightsNorm = normalized.weights;
  const portfolioVar = weightsNorm.reduce((sum, weight, i) => {
    const covRow = covMatrix[i].reduce(
      (rowSum, cov, j) => rowSum + cov * weightsNorm[j],
      0
    );
    return sum + weight * covRow;
  }, 0);
  const portfolioVol = portfolioVar > 0 ? Math.sqrt(portfolioVar) : 0;
  const contributions = weightsNorm.map((weight, i) => {
    const covWithPortfolio = covMatrix[i].reduce(
      (rowSum, cov, j) => rowSum + cov * weightsNorm[j],
      0
    );
    const marginal = portfolioVol > 0 ? covWithPortfolio / portfolioVol : 0;
    const component = weight * marginal;
    const percent = portfolioVol > 0 ? component / portfolioVol : 0;
    return { weight, marginal, component, percent };
  });
  return {
    contributions,
    portfolioVol,
    annualizedVol: portfolioVol * Math.sqrt(TRADING_DAYS)
  };
}

function renderPortfolioMetrics(metrics) {
  if (!metrics) {
    return `<div class="muted">${t("common.not_enough_data")}</div>`;
  }
  return `
    <div class="metric-grid">
      <div class="metric-tile">
        <span>${t("metric.total_return")}</span>
        <strong>${formatMetric(metrics.totalReturn, "totalReturn")}</strong>
      </div>
      <div class="metric-tile">
        <span>${t("metric.cagr")}</span>
        <strong>${formatMetric(metrics.cagr, "cagr")}</strong>
      </div>
      <div class="metric-tile">
        <span>${t("metric.sharpe_ratio")}</span>
        <strong>${formatMetric(metrics.sharpe, "ratio")}</strong>
      </div>
      <div class="metric-tile">
        <span>${t("metric.max_drawdown")}</span>
        <strong>${formatMetric(metrics.maxDrawdown, "maxDrawdown")}</strong>
      </div>
      <div class="metric-tile">
        <span>${t("metric.volatility")}</span>
        <strong>${formatMetric(metrics.volatility, "volatility")}</strong>
      </div>
    </div>
  `;
}

function renderRiskContributionTable(strategies, risk) {
  if (!risk) {
    return `<div class="muted">${t("common.not_enough_risk_data")}</div>`;
  }
  const rows = strategies
    .map((strategy, index) => {
      const entry = risk.contributions[index] || {};
      const weightLabel = formatPercent(entry.weight, 1);
      const marginalLabel = formatPercent(
        (entry.marginal || 0) * Math.sqrt(TRADING_DAYS),
        2
      );
      const contributionLabel = formatPercent(entry.percent, 1);
      const contributionClass =
        entry.percent < 0 ? "negative" : entry.percent > 0 ? "positive" : "";
      return `
        <tr>
          <td class="risk-label">${strategy.id}</td>
          <td>${weightLabel}</td>
          <td>${marginalLabel}</td>
          <td class="${contributionClass}">${contributionLabel}</td>
        </tr>
      `;
    })
    .join("");
  return `
    <div class="table-scroll">
      <table class="risk-table">
        <thead>
          <tr>
            <th>${t("common.strategy")}</th>
            <th>${t("common.weight")}</th>
            <th>${t("portfolio.marginal_ann")}</th>
            <th>${t("common.contribution")}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function calcRiskParityWeights(strategyIds, instrument, window) {
  const raw = strategyIds.map((id) => {
    const metrics = getMetricsFor(id, instrument, window);
    const vol = metrics.volatility || 0;
    return vol > 0 ? 1 / vol : 0;
  });
  const normalized = normalizeWeights(raw);
  return normalized.weights.map((weight) => round(weight * 100, 1));
}

function renderPortfolioSection(strategies, instrument, window) {
  const evidencePanel = globalThis.PortfolioMarginalUI?.render() || '';
  const strategyIds = strategies.map((strategy) => strategy.id);
  if (!strategyIds.length) {
    return `
      <section class="section">
        <div class="section-header">
          <div>
            <h2>${t("portfolio.title")}</h2>
            <p>${t("portfolio.desc")}</p>
          </div>
        </div>
        <div class="card">
          <h3>${t("portfolio.none_selected_title")}</h3>
          <p>${t("portfolio.none_selected_desc")}</p>
        </div>
      </section>${evidencePanel}
    `;
  }

  const weights = getPortfolioWeights(strategyIds);
  const portfolio = buildPortfolio(strategyIds, weights, instrument, window);   
  const risk = calcRiskContribution(strategyIds, weights, instrument, window);
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>${t("portfolio.title")}</h2>
          <p>${t("portfolio.desc")}</p>
        </div>
        <div class="chip-group">
          <button class="chip" data-portfolio-preset="equal">${t("portfolio.equal_weight")}</button>
          <button class="chip" data-portfolio-preset="risk">${t("portfolio.risk_parity")}</button>
          <button class="chip" data-portfolio-share>${t("portfolio.copy_link")}</button>
        </div>
      </div>
      <div class="portfolio-grid">
        <div class="card portfolio-weights-card">
          <div class="portfolio-weights">
            ${strategies
              .map((strategy, index) => {
                const value = Number.isFinite(weights[index])
                  ? weights[index].toFixed(1)
                  : "0";
                return `
              <div class="portfolio-row">
                <div>
                  <strong>${strategy.id}</strong>
                  <div class="muted">${strategy.name}</div>
                </div>
                <input class="portfolio-input" type="number" min="0" max="100" step="0.5" value="${value}" data-portfolio-weight="${strategy.id}" />
              </div>
            `;
              })
              .join("")}
          </div>
          <div class="portfolio-total">
            <span>${t("portfolio.total_weight")}</span>
            <strong id="portfolio-total">${portfolio.total.toFixed(1)}%</strong>
          </div>
          <div class="muted" id="portfolio-note">
            ${t("portfolio.weights_normalize")}
          </div>
        </div>
        <div class="chart-card portfolio-chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("portfolio.equity_curve")}</strong>
              <div class="muted">${instrument} - ${window}</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="portfolio-chart"></canvas>
          </div>
        </div>
        <div class="card portfolio-metrics-card" id="portfolio-metrics">        
          <h3>${t("portfolio.metrics")}</h3>
          ${renderPortfolioMetrics(portfolio.metrics)}
        </div>
        <div class="chart-card portfolio-risk-card">
          <div class="chart-header">
            <div>
              <strong>${t("portfolio.risk_contribution")}</strong>
              <div class="muted" id="portfolio-risk-note">
                ${risk ? t("portfolio.vol_ann", { value: formatPercent(risk.annualizedVol, 2) }) : t("common.not_enough_risk_data")}
              </div>
            </div>
          </div>
          <div class="chart-body portfolio-risk-body">
            <canvas id="portfolio-risk-chart"></canvas>
          </div>
          <div class="risk-table-wrap" id="portfolio-risk-list">
            ${renderRiskContributionTable(strategies, risk)}
          </div>
        </div>
      </div>
    </section>${evidencePanel}
  `;
}

function bindPortfolioBuilder(route) {
  globalThis.PortfolioMarginalUI?.mount(() => ({
    instrument: route.params.get('instrument') || defaultInstrument(),
    entries: Array.from(document.querySelectorAll('[data-portfolio-weight]')).map(input => ({
      strategyId: input.dataset.portfolioWeight,
      weight: input.value === '' ? NaN : Number(input.value)
    }))
  }));
  const selectedParam = route.params.get("strategies") || "";
  const selected = selectedParam ? selectedParam.split(",").filter(Boolean) : [];
  if (!selected.length) return;

  const instrument = route.params.get("instrument") || defaultInstrument();
  const window = route.params.get("window") || defaultWindow();
  const weightInputs = Array.from(
    document.querySelectorAll("[data-portfolio-weight]")
  );
  if (!weightInputs.length) return;

  const strategyIds = weightInputs.map((input) => input.dataset.portfolioWeight);

  const applyWeights = (weights) => {
    const cleaned = weights.map((value) =>
      Number.isFinite(value) ? Math.max(0, value) : 0
    );
    setPortfolioWeights(strategyIds, cleaned);
    weightInputs.forEach((input, index) => {
      input.value = cleaned[index].toFixed(1);
    });
    updatePortfolioDisplay(strategyIds, cleaned, instrument, window);
  };

  const updateFromInputs = () => {
    const weights = weightInputs.map((input) => {
      const value = parseFloat(input.value);
      return Number.isFinite(value) ? value : 0;
    });
    setPortfolioWeights(strategyIds, weights);
    updatePortfolioDisplay(strategyIds, weights, instrument, window);
  };

  document.querySelectorAll("[data-portfolio-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.portfolioPreset === "risk") {
        applyWeights(calcRiskParityWeights(strategyIds, instrument, window));
        return;
      }
      applyWeights(strategyIds.map(() => 100 / strategyIds.length));
    });
  });

  weightInputs.forEach((input) => {
    input.addEventListener("input", updateFromInputs);
  });

  const shareButton = document.querySelector("[data-portfolio-share]");
  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      const weights = weightInputs.map((input) => parseFloat(input.value) || 0);
      const link = portfolioShareUrl(strategyIds, weights);
      history.replaceState(history.state, "", link);
      try {
        await navigator.clipboard.writeText(link);
        shareButton.textContent = t("portfolio.link_copied");
      } catch (err) {
        window.prompt(t("portfolio.copy_link"), link);
      }
      if (typeof trackEvent === "function") trackEvent("share_portfolio", { n: strategyIds.length });
      setTimeout(() => {
        shareButton.textContent = t("portfolio.copy_link");
      }, 2000);
    });
  }

  updateFromInputs();
}

function updatePortfolioDisplay(strategyIds, weights, instrument, window) {     
  const portfolio = buildPortfolio(strategyIds, weights, instrument, window);   
  updatePortfolioTotals(portfolio.total);
  updatePortfolioMetrics(portfolio.metrics);
  updatePortfolioChart(portfolio.series);
  updatePortfolioRisk(strategyIds, weights, instrument, window);
}

function updatePortfolioTotals(total) {
  const totalEl = document.getElementById("portfolio-total");
  if (totalEl) {
    totalEl.textContent = `${total.toFixed(1)}%`;
  }
  const note = document.getElementById("portfolio-note");
  if (note) {
    const normalized = Math.abs(total - 100) < 0.1;
    note.textContent = normalized
      ? t("portfolio.weights_sum")
      : t("portfolio.weights_normalize");
  }
}

function updatePortfolioMetrics(metrics) {
  const container = document.getElementById("portfolio-metrics");
  if (!container) return;
  container.innerHTML = `
    <h3>${t("portfolio.metrics")}</h3>
    ${renderPortfolioMetrics(metrics)}
  `;
}

function updatePortfolioChart(series) {
  const ctx = document.getElementById("portfolio-chart");
  if (!ctx) return;
  if (!series) {
    if (portfolioChart) {
      portfolioChart.destroy();
      portfolioChart = null;
    }
    return;
  }

  const data = {
    labels: series.dates,
    datasets: [
      {
        label: t("portfolio.portfolio_label"),
        data: series.strategy,
        borderColor: palette(0),
        backgroundColor: "rgba(31, 111, 120, 0.2)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.25
      }
    ]
  };

  if (portfolioChart) {
    portfolioChart.data = data;
    portfolioChart.update();
    return;
  }

  portfolioChart = new Chart(ctx, {
    type: "line",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "bottom" } },
      scales: { y: { type: "linear" } }
    }
  });
  registerChart(portfolioChart);
}

function updatePortfolioRisk(strategyIds, weights, instrument, window) {
  const chartEl = document.getElementById("portfolio-risk-chart");
  const listEl = document.getElementById("portfolio-risk-list");
  const noteEl = document.getElementById("portfolio-risk-note");
  if (!chartEl || !listEl || !noteEl) return;

  const strategies = strategyIds
    .map((id) => store.strategies.find((strategy) => strategy.id === id))
    .filter(Boolean);
  const risk = calcRiskContribution(strategyIds, weights, instrument, window);

  if (!risk || !risk.contributions.length) {
    noteEl.textContent = t("common.not_enough_risk_data");
    listEl.innerHTML =
      `<div class="muted">${t("common.not_enough_risk_data")}</div>`;
    if (portfolioRiskChart) {
      portfolioRiskChart.destroy();
      portfolioRiskChart = null;
    }
    return;
  }

  noteEl.textContent = t("portfolio.vol_ann", {
    value: formatPercent(risk.annualizedVol, 2)
  });
  listEl.innerHTML = renderRiskContributionTable(strategies, risk);

  const labels = strategies.map((strategy) => strategy.id);
  const data = risk.contributions.map((entry) =>
    round((entry.percent || 0) * 100, 2)
  );
  if (portfolioRiskChart) {
    portfolioRiskChart.data.labels = labels;
    portfolioRiskChart.data.datasets[0].data = data;
    portfolioRiskChart.data.datasets[0].backgroundColor = labels.map(
      (_, index) => palette(index)
    );
    portfolioRiskChart.update();
    return;
  }

  portfolioRiskChart = new Chart(chartEl, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: t("portfolio.risk_contribution_pct"),
          data,
          backgroundColor: labels.map((_, index) => palette(index))
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.x.toFixed(2)}%`
          }
        }
      },
      scales: {
        x: {
          ticks: { callback: (value) => `${value}%` }
        }
      }
    }
  });
  registerChart(portfolioRiskChart);
}

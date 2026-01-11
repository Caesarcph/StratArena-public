const DATA_FILES = {
  strategies: "data/strategies.json",
  performance: "data/performance.json",
  changelog: "data/changelog.json"
};
const FAVORITES_KEY = "favorites";
const CATEGORY_TOP_COUNT = 5;
const TRADING_DAYS = 252;
const ROLLING_WINDOW = 252;
const CATEGORY_GROUPS = [
  { id: "trend", label: "Trend Following", tag: "Trend" },
  { id: "momentum", label: "Momentum", tag: "Momentum" },
  { id: "mean-reversion", label: "Mean Reversion", tag: "Mean Reversion" },
  { id: "volatility", label: "Volatility", tag: "Volatility" },
  { id: "portfolio", label: "Portfolio", tag: "Portfolio" },
  { id: "regime", label: "Regime", tag: "Regime" }
];

const charts = [];
const seriesCache = new Map();

const store = {
  strategies: [],
  performance: null,
  changelog: []
};
let favorites = new Set();
let portfolioWeights = new Map();
let portfolioChart = null;

document.addEventListener("DOMContentLoaded", () => {
  init().catch((err) => {
    console.error(err);
    const app = document.getElementById("app");
    app.innerHTML =
      "<section class=\"section\"><h2>Failed to load data.</h2><p>Check data files and reload.</p></section>";
  });
});

async function init() {
  await loadData();
  initFavorites();
  bindGlobal();
  render();
  window.addEventListener("popstate", render);
}

async function loadData() {
  const [strategies, performance, changelog] = await Promise.all([
    fetchJson(DATA_FILES.strategies),
    fetchJson(DATA_FILES.performance),
    fetchJson(DATA_FILES.changelog)
  ]);

  store.strategies = strategies.strategies || [];
  store.performance = performance || { instruments: [], windows: [] };
  store.changelog = changelog.entries || [];
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return res.json();
}

function bindGlobal() {
  // Mobile nav toggle
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("nav-open");
    });
  }
  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
    });
  });

  // Theme toggle
  initTheme();
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");
  setTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
  localStorage.setItem("theme", next);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("theme-icon");
  const label = document.getElementById("theme-label");
  if (icon && label) {
    if (theme === "dark") {
      icon.textContent = "☀️";
      label.textContent = "Light";
    } else {
      icon.textContent = "🌙";
      label.textContent = "Dark";
    }
  }
}

function initFavorites() {
  favorites = new Set(loadFavorites());
  updateFavoriteCount();
}

function loadFavorites() {
  const raw = localStorage.getItem(FAVORITES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === "string");
    }
  } catch (error) {
    return [];
  }
  return [];
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
}

function isFavorite(strategyId) {
  return favorites.has(strategyId);
}

function toggleFavorite(strategyId) {
  if (favorites.has(strategyId)) {
    favorites.delete(strategyId);
  } else {
    favorites.add(strategyId);
  }
  saveFavorites();
}

function updateFavoriteCount() {
  const count = favorites.size;
  document.querySelectorAll("[data-favorite-count]").forEach((badge) => {
    badge.textContent = count ? String(count) : "";
    badge.classList.toggle("hidden", count === 0);
  });
}

function refreshFavoriteButtons() {
  document.querySelectorAll("[data-favorite]").forEach((button) => {
    const id = button.dataset.favorite;
    const active = isFavorite(id);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.setAttribute(
      "title",
      active ? "Remove from favorites" : "Add to favorites"
    );
    const label = button.querySelector("[data-favorite-label]");
    if (label) {
      label.textContent = active ? "Saved" : "Save";
    }
    const icon = button.querySelector("[data-favorite-icon]");
    if (icon) {
      icon.innerHTML = active ? "&#9733;" : "&#9734;";
    }
  });
}

function handleFavoriteToggle(strategyId) {
  toggleFavorite(strategyId);
  updateFavoriteCount();
  if (getRoute().page === "favorites") {
    render();
    return;
  }
  refreshFavoriteButtons();
}

function bindFavoriteButtons() {
  document.querySelectorAll("[data-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      handleFavoriteToggle(button.dataset.favorite);
    });
  });
}

function destroyCharts() {
  while (charts.length) {
    charts.pop().destroy();
  }
  portfolioChart = null;
}

function registerChart(chart) {
  charts.push(chart);
}

function render() {
  destroyCharts();
  const route = getRoute();
  highlightNav(route.page);

  const app = document.getElementById("app");
  if (!store.strategies.length) {
    app.innerHTML = "<section class=\"section\"><h2>Loading...</h2></section>";
    return;
  }

  switch (route.page) {
    case "home":
      app.innerHTML = renderHome();
      bindHome();
      break;
    case "arena":
      app.innerHTML = renderArena(route);
      bindArena(route);
      break;
    case "strategies":
      app.innerHTML = renderStrategies(route);
      bindStrategies(route);
      break;
    case "favorites":
      app.innerHTML = renderFavorites(route);
      bindFavorites(route);
      break;
    case "strategy":
      app.innerHTML = renderStrategyDetail(route);
      bindStrategyDetail(route);
      break;
    case "compare":
      app.innerHTML = renderCompare(route);
      bindCompare(route);
      break;
    case "methodology":
      app.innerHTML = renderMethodology();
      break;
    case "changelog":
      app.innerHTML = renderChangelog();
      break;
    case "about":
      app.innerHTML = renderAbout();
      break;
    default:
      app.innerHTML = renderHome();
      bindHome();
  }
}

function getRoute() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page") || "home";
  return { page, params };
}

function updateQuery(updates) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  if (!params.get("page")) {
    params.set("page", "home");
  }
  const next = `${window.location.pathname}?${params.toString()}`;
  history.pushState({}, "", next);
  render();
}

function highlightNav(page) {
  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === page);
  });
}

function defaultInstrument() {
  const instruments = store.performance.instruments || [];
  return instruments.length ? instruments[0].symbol : "SPY";
}

function defaultWindow() {
  return "1Y";
}

function renderHome() {
  const instrument = defaultInstrument();
  const window = defaultWindow();
  const topRows = buildLeaderboard(instrument, window)
    .sort((a, b) => b.metrics.arenaScore - a.metrics.arenaScore)
    .slice(0, 5);
  const updates = store.changelog.slice(0, 5);

  return `
    <section class="hero">
      <div>
        <div class="eyebrow">Strategy Arena</div>
        <h1>Quant Arena</h1>
        <p>Unified rules for strategy rankings, daily refreshes, and clean side-by-side comparisons.</p>
        <div class="hero-actions">
          <a class="button primary" href="?page=arena">Explore Arena</a>
          <a class="button ghost" href="?page=strategies">Browse Strategies</a>
        </div>
      </div>
      <div class="hero-panel">
        <h3>Daily refresh workflow</h3>
        <div class="stat-grid">
          <div class="stat"><span>Data source</span><span>yfinance</span></div>
          <div class="stat"><span>Refresh cadence</span><span>Daily backtest</span></div>
          <div class="stat"><span>Coverage</span><span>${store.strategies.length} strategies</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2>Core features</h2>
          <p>Browse, compare, and document strategies under one rulebook.</p>
        </div>
      </div>
      <div class="card-grid">
        <div class="card">
          <div class="eyebrow">Leaderboard</div>
          <h3>Leaderboard by Asset and Window</h3>
          <p>Filter the Arena by instrument, window, and scoring metric.</p>
        </div>
        <div class="card">
          <div class="eyebrow">Details</div>
          <h3>Strategy Pages with Pseudocode</h3>
          <p>Equity curves, benchmark overlays, and copyable pseudocode.</p>
        </div>
        <div class="card">
          <div class="eyebrow">Methodology</div>
          <h3>Transparent Ranking Logic</h3>
          <p>Explainable metrics and a stable Arena Score model.</p>
        </div>
      </div>
    </section>

    <section class="section split">
      <div class="card">
        <h3>Top Strategies (${window}, ${instrument})</h3>
        <div class="list">
          ${topRows
            .map(
              (row, index) => `
            <div>
              <span class="tag">#${index + 1}</span>
              <a class="link" href="?page=strategy&id=${row.strategy.id}&instrument=${instrument}&window=${window}">
                ${row.strategy.id} ${row.strategy.name}
              </a>
            </div>`
            )
            .join("")}
        </div>
      </div>
      <div class="card">
        <h3>Latest Updates</h3>
        <div class="list">
          ${updates
            .map(
              (entry) => `
            <div>
              <strong>${entry.date}</strong>
              <div>${entry.title}</div>
            </div>`
            )
            .join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2>Top Strategy Leaderboards</h2>
          <p>Top 5 strategies by Arena Score across different instruments and time windows.</p>
        </div>
      </div>
      <div class="home-chart-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>SPY - 1 Year</strong>
              <div class="muted">S&P 500 ETF</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="home-chart-spy-1y"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>SPY - 5 Year</strong>
              <div class="muted">Long-term performance</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="home-chart-spy-5y"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>GLD - 1 Year</strong>
              <div class="muted">Gold ETF</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="home-chart-gld-1y"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>EURUSD - 1 Year</strong>
              <div class="muted">Euro/US Dollar</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="home-chart-eurusd-1y"></canvas>
          </div>
        </div>
      </div>
    </section>
  `;
}

function bindHome() {
  drawHomeCharts();
}

function drawHomeCharts() {
  const chartConfigs = [
    { id: "home-chart-spy-1y", instrument: "SPY", window: "1Y" },
    { id: "home-chart-spy-5y", instrument: "SPY", window: "5Y" },
    { id: "home-chart-gld-1y", instrument: "GLD", window: "1Y" },
    { id: "home-chart-eurusd-1y", instrument: "EURUSD=X", window: "1Y" }
  ];

  chartConfigs.forEach((config) => {
    drawHomeChart(config.id, config.instrument, config.window);
  });
}

function drawHomeChart(canvasId, instrument, window) {
  const leaderboard = buildLeaderboard(instrument, window)
    .sort((a, b) => b.metrics.arenaScore - a.metrics.arenaScore)
    .slice(0, 5);
  const ctx = document.getElementById(canvasId);
  if (!ctx || !leaderboard.length) return;

  const baseSeries = sliceSeries(
    getSeries(leaderboard[0].strategy.id, instrument),
    window
  );
  const labels = baseSeries.dates;
  const datasets = leaderboard.map((row, index) => {
    const series = sliceSeries(getSeries(row.strategy.id, instrument), window);
    const normalized = normalizeSeries(series).strategy;
    return {
      label: row.strategy.id,
      data: normalized,
      borderColor: palette(index),
      backgroundColor: "transparent",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.25
    };
  });

  registerChart(
    new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 10,
              font: { size: 10 },
              padding: 8
            }
          }
        },
        scales: {
          y: { type: "linear" },
          x: {
            ticks: {
              maxTicksLimit: 6,
              font: { size: 9 }
            }
          }
        }
      }
    })
  );
}

function renderArena(route) {
  const state = arenaState(route.params);
  const instruments = store.performance.instruments || [];
  const windows = store.performance.windows || [];
  const metrics = [
    { value: "score", label: "Arena Score" },
    { value: "totalReturn", label: "Total Return" },
    { value: "cagr", label: "CAGR" },
    { value: "sharpe", label: "Sharpe" },
    { value: "sortino", label: "Sortino" },
    { value: "calmar", label: "Calmar" },
    { value: "maxDrawdown", label: "Max Drawdown" }
  ];

  const leaderboard = buildLeaderboard(state.instrument, state.window);
  const filtered = state.threshold
    ? leaderboard.filter((row) => row.metrics.trades >= 20)
    : leaderboard;
  const sorted = sortRows(filtered, state.sort, state.dir, state.metric);
  const rows = sorted.slice(0, state.top);

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>Strategy Arena</h2>
          <p>Rank strategies under a single rule set and compare the score drivers.</p>
        </div>
        <details class="score-note">
          <summary>Arena Score is a composite rating</summary>
          <p>We weight Sharpe, Sortino, Calmar, CAGR, and drawdown control to keep rankings stable across assets.</p>
        </details>
      </div>

      <div class="filter-bar">
        <div class="filter-group">
          <label>Instrument</label>
          <input id="arena-instrument" list="arena-instrument-list" value="${state.instrument}" />
          <datalist id="arena-instrument-list">
            ${instruments
              .map(
                (item) => `
              <option value="${item.symbol}">${item.symbol} - ${item.name}</option>`
              )
              .join("")}
          </datalist>
        </div>
        <div class="filter-group">
          <label>Window</label>
          <div class="chip-group">
            ${windows
              .map(
                (item) => `
              <button class="chip ${
                item === state.window ? "active" : ""
              }" data-window="${item}">${item}</button>`
              )
              .join("")}
          </div>
        </div>
        <div class="filter-group">
          <label>Ranking Metric</label>
          <select id="arena-metric">
            ${metrics
              .map(
                (item) => `
              <option value="${item.value}" ${
                  item.value === state.metric ? "selected" : ""
                }>${item.label}</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="filter-group">
          <label>Top N</label>
          <select id="arena-top">
            ${[10, 25, 50]
              .map(
                (value) => `
              <option value="${value}" ${
                  value === state.top ? "selected" : ""
                }>${value}</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="filter-group">
          <label>Threshold</label>
          <div class="toggle">
            <input id="arena-threshold" type="checkbox" ${
              state.threshold ? "checked" : ""
            } />
            <span>Trades >= 20</span>
          </div>
        </div>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Strategy</th>
              <th>
                <button data-sort="metric">Metric</button>
              </th>
              <th>
                <button data-sort="totalReturn">Return</button>
              </th>
              <th>
                <button data-sort="maxDrawdown">Max Drawdown</button>
              </th>
              <th>Trades</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((row, index) => {
                const metricValue =
                  state.metric === "score"
                    ? row.metrics.arenaScore
                    : row.metrics[state.metric];
                const returnTo = encodeURIComponent(
                  new URLSearchParams(window.location.search).toString()
                );
                return `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <div>
                      <a class="link" href="?page=strategy&id=${
                        row.strategy.id
                      }&instrument=${state.instrument}&window=${
                  state.window
                }&return=${returnTo}">
                        ${row.strategy.id} ${row.strategy.name}
                      </a>
                      <div class="tag-row">
                        ${row.strategy.tags
                          .map((tag) => `<span class="tag">${tag}</span>`)
                          .join("")}
                      </div>
                    </div>
                  </td>
                  <td>${formatMetric(metricValue, state.metric)}</td>
                  <td>${formatMetric(row.metrics.totalReturn, "totalReturn")}</td>
                  <td>${formatMetric(row.metrics.maxDrawdown, "maxDrawdown")}</td>
                  <td>${formatNumber(row.metrics.trades)}</td>
                  <td>
                    <a class="button ghost" href="?page=strategy&id=${
                      row.strategy.id
                    }&instrument=${state.instrument}&window=${
                  state.window
                }&return=${returnTo}">View</a>
                  </td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderFavoriteButton(strategyId, variant = "card") {
  const active = isFavorite(strategyId);
  const label = active ? "Saved" : "Save";
  const icon = active ? "&#9733;" : "&#9734;";
  const classes =
    variant === "action"
      ? "button ghost favorite-action"
      : variant === "inline"
      ? "favorite-inline"
      : "favorite-toggle";
  return `
    <button class="${classes} ${active ? "active" : ""}" data-favorite="${strategyId}" type="button" aria-pressed="${active ? "true" : "false"}" title="${active ? "Remove from favorites" : "Add to favorites"}">
      <span class="favorite-icon" data-favorite-icon>${icon}</span>
      <span class="favorite-label" data-favorite-label>${label}</span>
    </button>
  `;
}

function renderCategoryControls(state) {
  const instruments = store.performance.instruments || [];
  const windows = store.performance.windows || [];
  return `
    <div class="category-controls">
      <div class="filter-group">
        <label>Instrument</label>
        <select id="category-instrument">
          ${instruments
            .map(
              (item) => `
            <option value="${item.symbol}" ${
                item.symbol === state.instrument ? "selected" : ""
              }>${item.symbol}</option>`
            )
            .join("")}
        </select>
      </div>
      <div class="filter-group">
        <label>Window</label>
        <div class="chip-group">
          ${windows
            .map(
              (item) => `
            <button class="chip ${
              item === state.window ? "active" : ""
            }" data-category-window="${item}">${item}</button>`
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function matchesCategory(strategy, group) {
  if (group.id === "portfolio") {
    return strategy.mode === "portfolio" || strategy.tags.includes(group.tag);
  }
  return strategy.tags.includes(group.tag);
}

function getScoredMetrics(strategyId, instrument, window) {
  const metrics = getMetricsFor(strategyId, instrument, window);
  const arenaScore =
    metrics.arenaScore !== undefined && metrics.arenaScore !== null
      ? metrics.arenaScore
      : calcArenaScore(metrics);
  return { ...metrics, arenaScore };
}

function renderCategoryRow(entry, index, instrument, window) {
  const { strategy, metrics } = entry;
  return `
    <div class="category-row">
      <div class="category-rank">${index + 1}</div>
      <div class="category-name">
        <a class="link" href="?page=strategy&id=${strategy.id}&instrument=${instrument}&window=${window}">
          ${strategy.id} ${strategy.name}
        </a>
        <div class="tag-row">
          ${strategy.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>
      </div>
      <div class="category-score">
        <span class="muted">Arena Score</span>
        <strong>${formatMetric(metrics.arenaScore, "score")}</strong>
      </div>
      ${renderFavoriteButton(strategy.id, "inline")}
    </div>
  `;
}

function renderCategoryView(strategies, state) {
  const instrument = state.instrument;
  const window = state.window;
  const metricsById = new Map();
  const getMetrics = (strategyId) => {
    if (!metricsById.has(strategyId)) {
      metricsById.set(strategyId, getScoredMetrics(strategyId, instrument, window));
    }
    return metricsById.get(strategyId);
  };

  const cards = CATEGORY_GROUPS.map((group) => {
    const groupStrategies = strategies.filter(
      (strategy) =>
        matchesCategory(strategy, group) &&
        strategy.instruments.includes(instrument)
    );
    if (!groupStrategies.length) return "";
    const scored = groupStrategies
      .map((strategy) => ({
        strategy,
        metrics: getMetrics(strategy.id)
      }))
      .sort((a, b) => b.metrics.arenaScore - a.metrics.arenaScore);
    const top = scored.slice(0, CATEGORY_TOP_COUNT);
    return `
      <div class="card category-card">
        <div class="category-header">
          <div>
            <h3>${group.label}</h3>
            <p class="muted">${scored.length} strategies • ${instrument} ${window} ranking</p>
          </div>
          <a class="link" href="?page=strategies&tags=${encodeURIComponent(
            group.tag
          )}&view=list">View all</a>
        </div>
        <div class="category-list">
          ${top
            .map((entry, index) => renderCategoryRow(entry, index, instrument, window))
            .join("")}
        </div>
      </div>
    `;
  }).join("");

  if (!cards) {
    return `
      <div class="card">
        <h3>No matching categories</h3>
        <p>Try adjusting tags or search filters.</p>
      </div>
    `;
  }

  return `<div class="category-grid">${cards}</div>`;
}

function topStrategiesForInstrument(instrument, window, count) {
  return buildLeaderboard(instrument, window)
    .sort((a, b) => b.metrics.arenaScore - a.metrics.arenaScore)
    .slice(0, count)
    .map((entry) => entry.strategy);
}

function buildCorrelationMatrix(strategies, instrument, window) {
  const ids = strategies.map((strategy) => strategy.id);
  if (ids.length < 2) {
    return { ids, matrix: [] };
  }
  const seriesList = strategies.map((strategy) =>
    sliceSeries(getSeries(strategy.id, instrument), window)
  );
  const returnsList = seriesList.map((series) => pctChange(series.strategy));
  const minLen = Math.min(...returnsList.map((returns) => returns.length));
  if (!minLen || minLen < 2) {
    return { ids, matrix: ids.map(() => ids.map(() => null)) };
  }
  const trimmed = returnsList.map((returns) => returns.slice(-minLen));
  const matrix = trimmed.map((row) =>
    trimmed.map((col) => correlation(row, col))
  );
  return { ids, matrix };
}

function getCorrelationColor(value) {
  if (!Number.isFinite(value)) return "transparent";
  const intensity = Math.min(Math.abs(value), 1);
  if (value >= 0) {
    const r = Math.round(255 - intensity * 140);
    const g = Math.round(255 - intensity * 70);
    const b = Math.round(255 - intensity * 140);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const r = Math.round(255 - intensity * 70);
  const g = Math.round(255 - intensity * 140);
  const b = Math.round(255 - intensity * 140);
  return `rgb(${r}, ${g}, ${b})`;
}

function renderCorrelationMatrix(strategies, instrument, window) {
  if (strategies.length < 2) {
    return `
      <div class="card">
        <h3>Not enough strategies selected</h3>
        <p>Select at least two strategies to view correlations.</p>
      </div>
    `;
  }

  const data = buildCorrelationMatrix(strategies, instrument, window);
  return `
    <div class="card correlation-card">
      <div class="table-scroll">
        <table class="correlation-table">
          <thead>
            <tr>
              <th></th>
              ${data.ids.map((id) => `<th>${id}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${data.ids
              .map(
                (rowId, rowIndex) => `
              <tr>
                <th class="row-header">${rowId}</th>
                ${data.matrix[rowIndex]
                  .map((value) => {
                    const label = Number.isFinite(value)
                      ? value.toFixed(2)
                      : "--";
                    const color = getCorrelationColor(value);
                    return `<td class="correlation-cell" style="background:${color}">${label}</td>`;
                  })
                  .join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function getPortfolioWeights(strategyIds) {
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

function renderPortfolioMetrics(metrics) {
  if (!metrics) {
    return `<div class="muted">Not enough data to calculate metrics.</div>`;
  }
  return `
    <div class="metric-grid">
      <div class="metric-tile">
        <span>Total Return</span>
        <strong>${formatMetric(metrics.totalReturn, "totalReturn")}</strong>
      </div>
      <div class="metric-tile">
        <span>CAGR</span>
        <strong>${formatMetric(metrics.cagr, "cagr")}</strong>
      </div>
      <div class="metric-tile">
        <span>Sharpe Ratio</span>
        <strong>${formatMetric(metrics.sharpe, "ratio")}</strong>
      </div>
      <div class="metric-tile">
        <span>Max Drawdown</span>
        <strong>${formatMetric(metrics.maxDrawdown, "maxDrawdown")}</strong>
      </div>
      <div class="metric-tile">
        <span>Volatility</span>
        <strong>${formatMetric(metrics.volatility, "volatility")}</strong>
      </div>
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
  const strategyIds = strategies.map((strategy) => strategy.id);
  if (!strategyIds.length) {
    return `
      <section class="section">
        <div class="section-header">
          <div>
            <h2>Portfolio Builder</h2>
            <p>Blend selected strategies into a weighted portfolio.</p>
          </div>
        </div>
        <div class="card">
          <h3>No strategies selected</h3>
          <p>Select strategies in the comparator above to build a portfolio.</p>
        </div>
      </section>
    `;
  }

  const weights = getPortfolioWeights(strategyIds);
  const portfolio = buildPortfolio(strategyIds, weights, instrument, window);
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>Portfolio Builder</h2>
          <p>Blend selected strategies into a weighted portfolio.</p>
        </div>
        <div class="chip-group">
          <button class="chip" data-portfolio-preset="equal">Equal Weight</button>
          <button class="chip" data-portfolio-preset="risk">Risk Parity</button>
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
            <span>Total Weight</span>
            <strong id="portfolio-total">${portfolio.total.toFixed(1)}%</strong>
          </div>
          <div class="muted" id="portfolio-note">
            Weights normalize to 100% for calculations.
          </div>
        </div>
        <div class="chart-card portfolio-chart-card">
          <div class="chart-header">
            <div>
              <strong>Portfolio Equity Curve</strong>
              <div class="muted">${instrument} - ${window}</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="portfolio-chart"></canvas>
          </div>
        </div>
        <div class="card portfolio-metrics-card" id="portfolio-metrics">
          <h3>Portfolio Metrics</h3>
          ${renderPortfolioMetrics(portfolio.metrics)}
        </div>
      </div>
    </section>
  `;
}

function renderStrategies(route) {
  const state = strategiesState(route.params);
  const tags = uniqueTags(store.strategies);
  const filtered = store.strategies.filter((strategy) => {
    const matchesSearch =
      !state.query ||
      strategy.name.toLowerCase().includes(state.query) ||
      strategy.id.toLowerCase().includes(state.query);
    const matchesTags =
      !state.tags.length ||
      state.tags.every((tag) => strategy.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>Strategy Library</h2>
          <p>Filter by tags, search by name, and open the full detail pages.</p>
        </div>
        <div class="chip-group">
          <button class="chip ${state.view === "grid" ? "active" : ""}" data-view="grid">Grid</button>
          <button class="chip ${state.view === "list" ? "active" : ""}" data-view="list">List</button>
          <button class="chip ${state.view === "category" ? "active" : ""}" data-view="category">Category</button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="filter-group">
          <label>Search</label>
          <input id="strategy-search" type="text" placeholder="Search by name or ID" value="${escapeHtml(
            state.query || ""
          )}" />
        </div>
        <div class="filter-group">
          <label>Tags</label>
          <div class="chip-group">
            ${tags
              .map(
                (tag) => `
              <button class="chip ${
                state.tags.includes(tag) ? "active" : ""
              }" data-tag="${tag}">${tag}</button>`
              )
              .join("")}
          </div>
        </div>
      </div>

      ${state.view === "category" ? renderCategoryControls(state) : ""}

      ${
        state.view === "category"
          ? renderCategoryView(filtered, state)
          : `
      <div class="strategy-grid ${state.view}">
        ${filtered
          .map(
            (strategy) => `
          <div class="strategy-card">
            ${renderFavoriteButton(strategy.id, "card")}
            <div class="eyebrow">${strategy.id}</div>
            <h3>${strategy.name}</h3>
            <p>${strategy.summary}</p>
            <div class="tag-row">
              ${strategy.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
            </div>
            <div class="strategy-meta">
              <span class="badge">${strategy.bestOn}</span>
            </div>
            <div class="hero-actions">
              <a class="button ghost" href="?page=strategy&id=${strategy.id}">View Strategy</a>
            </div>
          </div>`
          )
          .join("")}
      </div>
      `
      }
    </section>
  `;
}

function renderFavorites(route) {
  const state = favoritesState(route.params);
  const saved = store.strategies.filter((strategy) => favorites.has(strategy.id));

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>Favorites</h2>
          <p>${saved.length} strategies saved for quick access.</p>
        </div>
        <div class="chip-group">
          <button class="chip ${state.view === "grid" ? "active" : ""}" data-view="grid">Grid</button>
          <button class="chip ${state.view === "list" ? "active" : ""}" data-view="list">List</button>
        </div>
      </div>

      ${
        saved.length
          ? `
        <div class="strategy-grid ${state.view}">
          ${saved
            .map(
              (strategy) => `
            <div class="strategy-card">
              ${renderFavoriteButton(strategy.id, "card")}
              <div class="eyebrow">${strategy.id}</div>
              <h3>${strategy.name}</h3>
              <p>${strategy.summary}</p>
              <div class="tag-row">
                ${strategy.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
              </div>
              <div class="strategy-meta">
                <span class="badge">${strategy.bestOn}</span>
              </div>
              <div class="hero-actions">
                <a class="button ghost" href="?page=strategy&id=${strategy.id}">View Strategy</a>
              </div>
            </div>`
            )
            .join("")}
        </div>
      `
          : `
        <div class="card">
          <h3>No favorites yet</h3>
          <p>Save strategies from the library to build your watchlist.</p>
          <div class="hero-actions">
            <a class="button ghost" href="?page=strategies">Browse Strategies</a>
          </div>
        </div>
      `
      }
    </section>
  `;
}

function renderStrategyDetail(route) {
  const strategyId = route.params.get("id") || store.strategies[0].id;
  const strategy = store.strategies.find((item) => item.id === strategyId);     
  if (!strategy) {
    return "<section class=\"section\"><h2>Strategy not found.</h2></section>";
  }

  const instrument =
    route.params.get("instrument") || strategy.instruments[0] || defaultInstrument();
  const window = route.params.get("window") || defaultWindow();
  const compareParam = route.params.get("compare");
  const compare = compareParam ? compareParam.split(",").filter(Boolean) : [];
  const compareList = compare.length ? compare : strategy.recommendedCompare;
  const scale = route.params.get("scale") || "linear";
  const metrics = getMetricsFor(strategy.id, instrument, window);
  const returnTo = route.params.get("return");

  return `
    <section class="section">
      <div class="strategy-header">
        <div>
          <div class="eyebrow">${strategy.id}</div>
          <h2>${strategy.name}</h2>
          <p>${strategy.description}</p>
          <div class="tag-row">
            ${strategy.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
          <div class="hero-actions">
            ${
              returnTo
                ? `<a class="button ghost" href="?${decodeURIComponent(
                    returnTo
                  )}">Back to Arena</a>`
                : ""
            }
            ${renderFavoriteButton(strategy.id, "action")}
          </div>
        </div>
        <div class="info-grid">
          <div class="info-card">
            <span>Asset fit</span>
            <strong>${strategy.assetClasses.join(", ")}</strong>
          </div>
          <div class="info-card">
            <span>Holding period</span>
            <strong>${strategy.holdingPeriod}</strong>
          </div>
          <div class="info-card">
            <span>Frequency</span>
            <strong>${strategy.frequency}</strong>
          </div>
        </div>
      </div>

      <div class="control-bar">
        <div class="control-row">
          <div class="control-group">
            <label>Instrument</label>
            <select id="detail-instrument">
              ${strategy.instruments
                .map(
                  (item) => `
                <option value="${item}" ${
                    item === instrument ? "selected" : ""
                  }>${item}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="control-group">
            <label>Window</label>
            <div class="chip-group">
              ${(store.performance.windows || [])
                .map(
                  (item) => `
                <button class="chip ${
                  item === window ? "active" : ""
                }" data-window="${item}">${item}</button>`
                )
                .join("")}
            </div>
          </div>
          <div class="control-group">
            <label>Benchmark</label>
            <select id="detail-benchmark">
              <option>Buy & Hold</option>
            </select>
          </div>
          <div class="control-group">
            <label>Scale</label>
            <div class="chip-group">
              <button class="chip ${scale === "linear" ? "active" : ""}" data-scale="linear">Linear</button>
              <button class="chip ${scale === "logarithmic" ? "active" : ""}" data-scale="logarithmic">Log</button>
            </div>
          </div>
        </div>
        <div class="compare-panel">
          <strong>Cross-asset compare (max 5)</strong>
          <div class="compare-options">
            ${strategy.instruments
              .map(
                (item) => `
              <label>
                <input type="checkbox" data-compare="${item}" ${
                  compareList.includes(item) ? "checked" : ""
                } />
                ${item}
              </label>`
              )
              .join("")}
          </div>
        </div>
      </div>

      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>Equity vs Benchmark</strong>
              <div class="muted">${instrument} - ${window}</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="equity-chart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>Cross-asset comparison</strong>
              <div class="muted">Normalized to 1.0</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="compare-chart"></canvas>
          </div>
        </div>
      </div>

      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>Drawdown</strong>
              <div class="muted">Peak-to-trough decline over time</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="drawdown-chart"></canvas>
          </div>
        </div>
        <div class="chart-card heatmap-card">
          <div class="chart-header">
            <div>
              <strong>Monthly Returns Heatmap</strong>
              <div class="muted">Green = positive, Red = negative</div>
            </div>
          </div>
          <div class="heatmap-body" id="monthly-heatmap"></div>
        </div>
      </div>

      <div class="chart-grid rolling-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>Rolling Sharpe Ratio</strong>
              <div class="muted">${ROLLING_WINDOW}-day window</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="rolling-sharpe"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>Rolling Volatility</strong>
              <div class="muted">${ROLLING_WINDOW}-day annualized</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="rolling-vol"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>Rolling Beta</strong>
              <div class="muted">vs Buy & Hold</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="rolling-beta"></canvas>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-button active" data-tab="performance">Performance</button>
        <button class="tab-button" data-tab="risk">Risk</button>
        <button class="tab-button" data-tab="efficiency">Efficiency</button>
        <button class="tab-button" data-tab="trades">Trades</button>
      </div>
      ${renderMetricTabs(metrics)}

      <div class="section pseudocode">
        <details open>
          <summary>Pseudocode</summary>
          <pre><code>${buildPseudocode(strategy)}</code></pre>
          <button class="copy-button" data-copy>Copy</button>
        </details>
      </div>

      <div class="section note">
        <strong>Notes</strong>
        <div>${strategy.notes.join(" ")}</div>
        <div>Last updated: ${strategy.updated}</div>
      </div>
    </section>
  `;
}

function renderMetricTabs(metrics) {
  return `
    <div class="tab-content active" data-panel="performance">
      <div class="metric-grid">
        ${metricTile("Total Return", formatMetric(metrics.totalReturn, "totalReturn"))}
        ${metricTile("CAGR", formatMetric(metrics.cagr, "cagr"))}
        ${metricTile("Best Month", formatMetric(metrics.bestMonth, "totalReturn"))}
        ${metricTile("Worst Month", formatMetric(metrics.worstMonth, "totalReturn"))}
      </div>
    </div>
    <div class="tab-content" data-panel="risk">
      <div class="metric-grid">
        ${metricTile("Max Drawdown", formatMetric(metrics.maxDrawdown, "maxDrawdown"))}
        ${metricTile("Volatility", formatMetric(metrics.volatility, "cagr"))}
        ${metricTile("Ulcer Index", formatMetric(metrics.ulcer, "ratio"))}
      </div>
    </div>
    <div class="tab-content" data-panel="efficiency">
      <div class="metric-grid">
        ${metricTile("Sharpe", formatMetric(metrics.sharpe, "ratio"))}
        ${metricTile("Sortino", formatMetric(metrics.sortino, "ratio"))}
        ${metricTile("Calmar", formatMetric(metrics.calmar, "ratio"))}
      </div>
    </div>
    <div class="tab-content" data-panel="trades">
      <div class="metric-grid">
        ${metricTile("Trades", formatNumber(metrics.trades))}
        ${metricTile("Turnover (avg daily)", formatMetric(metrics.turnover, "turnover"))}
        ${metricTile("Win Rate", formatMetric(metrics.winRate, "totalReturn"))}
        ${metricTile("Profit Factor", formatMetric(metrics.profitFactor, "ratio"))}
      </div>
    </div>
  `;
}

function metricTile(label, value) {
  return `<div class="metric-tile"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderMethodology() {
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>Methodology</h2>
          <p>Why the Arena score is comparable across strategies.</p>
        </div>
      </div>
      <div class="card-grid">
        <div class="card">
          <h3>Backtest assumptions</h3>
          <ul>
            <li>Signals are generated on close and executed next session.</li>
            <li>Positions are fully invested when active, cash otherwise.</li>
            <li>Corporate actions are handled via adjusted closes.</li>
          </ul>
        </div>
        <div class="card">
          <h3>Trading costs</h3>
          <ul>
            <li>Commissions and slippage are applied per trade.</li>
            <li>Turnover heavy models are penalized via drawdown.</li>
          </ul>
        </div>
        <div class="card">
          <h3>Metric glossary</h3>
          <ul>
            <li>Sharpe: return per unit volatility.</li>
            <li>Calmar: CAGR divided by max drawdown.</li>
            <li>Max DD: worst peak-to-trough loss.</li>
          </ul>
        </div>
        <div class="card">
          <h3>Ranking logic</h3>
          <ul>
            <li>Arena Score blends Sharpe, Sortino, Calmar, and CAGR.</li>
            <li>Drawdown control prevents high risk outliers.</li>
          </ul>
        </div>
      </div>
    </section>
  `;
}

function renderChangelog() {
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>Changelog</h2>
          <p>Every change to strategies and methodology is tracked here.</p>
        </div>
      </div>
      <div class="list">
        ${store.changelog
          .map(
            (entry) => `
          <div class="card">
            <strong>${entry.date}</strong>
            <h3>${entry.title}</h3>
            <p>${entry.details}</p>
            ${
              entry.strategyId
                ? `<a class="link" href="?page=strategy&id=${entry.strategyId}">View strategy</a>`
                : ""
            }
          </div>`
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderAbout() {
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>About Quant Arena</h2>
          <p>A personal research space for consistent, comparable strategy evaluation.</p>
        </div>
      </div>
      <div class="card">
        <p>Purpose: a public, read-only arena to benchmark strategies under a unified rulebook and daily refreshes.</p>
        <p>Quant Arena exists to keep strategy research transparent and repeatable. Every model is measured under the same rules so the leaderboard remains fair across assets and time windows.</p>
        <ul>
          <li>Unified data source and backtest assumptions.</li>
          <li>Clear methodology for scores and rankings.</li>
          <li>Readable pseudocode for every strategy.</li>
        </ul>
        <p>Have a strategy to add? Contact <a class="link" href="mailto:chenpeihao1997@gmail.com">chenpeihao1997@gmail.com</a>.</p>
        <p>Disclaimer: this site is for research and education only, not investment advice.</p>
      </div>
    </section>
  `;
}

function renderCompare(route) {
  const selectedParam = route.params.get("strategies") || "";
  const selected = selectedParam ? selectedParam.split(",").filter(Boolean) : [];
  const instrument = route.params.get("instrument") || defaultInstrument();
  const window = route.params.get("window") || defaultWindow();
  const instruments = store.performance.instruments || [];
  const windows = store.performance.windows || [];

  const selectedStrategies = selected
    .map((id) => store.strategies.find((s) => s.id === id))
    .filter(Boolean);
  const correlationStrategies = selectedStrategies.length >= 2
    ? selectedStrategies
    : topStrategiesForInstrument(instrument, window, 8);
  const correlationNote = selectedStrategies.length >= 2
    ? "Using selected strategies."
    : "Using top strategies by Arena Score.";

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>Strategy Comparator</h2>
          <p>Select up to 5 strategies to compare side-by-side.</p>
        </div>
      </div>

      <div class="compare-controls">
        <div class="filter-bar">
          <div class="filter-group">
            <label>Instrument</label>
            <select id="compare-instrument">
              ${instruments
                .map(
                  (item) => `
                <option value="${item.symbol}" ${
                    item.symbol === instrument ? "selected" : ""
                  }>${item.symbol}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="filter-group">
            <label>Window</label>
            <div class="chip-group">
              ${windows
                .map(
                  (item) => `
                <button class="chip ${
                  item === window ? "active" : ""
                }" data-window="${item}">${item}</button>`
                )
                .join("")}
            </div>
          </div>
        </div>

        <div class="strategy-selector">
          <label>Select Strategies (max 5)</label>
          <div class="strategy-selector-grid">
            ${store.strategies
              .filter((s) => s.instruments.includes(instrument))
              .map(
                (strategy) => `
              <label class="strategy-checkbox ${
                selected.includes(strategy.id) ? "selected" : ""
              }">
                <input type="checkbox" data-strategy="${strategy.id}" ${
                  selected.includes(strategy.id) ? "checked" : ""
                } />
                <span class="strategy-checkbox-label">
                  <strong>${strategy.id}</strong>
                  <span>${strategy.name}</span>
                </span>
              </label>`
              )
              .join("")}
          </div>
        </div>
      </div>

      ${
        selectedStrategies.length > 0
          ? `
        <div class="chart-card compare-chart-card">
          <div class="chart-header">
            <div>
              <strong>Equity Curves Comparison</strong>
              <div class="muted">${instrument} - ${window} (Normalized to 1.0)</div>
            </div>
          </div>
          <div class="chart-body compare-chart-body">
            <canvas id="compare-main-chart"></canvas>
          </div>
        </div>

        <div class="compare-table-card">
          <h3>Performance Metrics</h3>
          <div class="table-scroll">
            <table class="compare-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  ${selectedStrategies.map((s) => `<th>${s.id}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${renderCompareMetricRows(selectedStrategies, instrument, window)}
              </tbody>
            </table>
          </div>
        </div>
      `
          : `
        <div class="compare-empty">
          <p>Select strategies above to compare their performance.</p>
        </div>
      `
      }
    </section>
    <section class="section">
      <div class="section-header">
        <div>
          <h2>Correlation Matrix</h2>
          <p>Daily return correlation for ${instrument} - ${window}. ${correlationNote}</p>
        </div>
      </div>
      ${renderCorrelationMatrix(correlationStrategies, instrument, window)}
    </section>
    ${renderPortfolioSection(selectedStrategies, instrument, window)}
  `;
}

function renderCompareMetricRows(strategies, instrument, window) {
  const metricsConfig = [
    { key: "totalReturn", label: "Total Return", format: "percent" },
    { key: "cagr", label: "CAGR", format: "percent" },
    { key: "sharpe", label: "Sharpe Ratio", format: "ratio" },
    { key: "sortino", label: "Sortino Ratio", format: "ratio" },
    { key: "calmar", label: "Calmar Ratio", format: "ratio" },
    { key: "maxDrawdown", label: "Max Drawdown", format: "percent" },
    { key: "volatility", label: "Volatility", format: "percent" },
    { key: "winRate", label: "Win Rate", format: "percent" },
    { key: "trades", label: "Trades", format: "number" }
  ];

  const metricsData = strategies.map((s) => getMetricsFor(s.id, instrument, window));

  return metricsConfig
    .map((config) => {
      const values = metricsData.map((m) => m[config.key]);
      const best =
        config.key === "maxDrawdown"
          ? Math.max(...values)
          : Math.max(...values);
      const worst =
        config.key === "maxDrawdown"
          ? Math.min(...values)
          : Math.min(...values);

      return `
        <tr>
          <td>${config.label}</td>
          ${values
            .map((value) => {
              let formatted;
              if (config.format === "percent") {
                formatted = `${(value * 100).toFixed(2)}%`;
              } else if (config.format === "ratio") {
                formatted = value.toFixed(2);
              } else {
                formatted = Math.round(value);
              }

              const isBest =
                config.key === "maxDrawdown" ? value === best : value === best;
              const isWorst =
                config.key === "maxDrawdown" ? value === worst : value === worst;

              let className = "";
              if (strategies.length > 1) {
                if (isBest && value !== worst) className = "best";
                else if (isWorst && value !== best) className = "worst";
              }

              return `<td class="${className}">${formatted}</td>`;
            })
            .join("")}
        </tr>
      `;
    })
    .join("");
}

function bindCompare(route) {
  const selectedParam = route.params.get("strategies") || "";
  const selected = selectedParam ? selectedParam.split(",").filter(Boolean) : [];
  const instrument = route.params.get("instrument") || defaultInstrument();
  const window = route.params.get("window") || defaultWindow();

  // Instrument select
  const instrumentSelect = document.getElementById("compare-instrument");
  if (instrumentSelect) {
    instrumentSelect.addEventListener("change", (event) => {
      updateQuery({ page: "compare", instrument: event.target.value, strategies: "" });
    });
  }

  // Window buttons
  document.querySelectorAll("[data-window]").forEach((button) => {
    button.addEventListener("click", () => {
      updateQuery({ page: "compare", window: button.dataset.window });
    });
  });

  // Strategy checkboxes
  document.querySelectorAll("[data-strategy]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const currentSelected = Array.from(
        document.querySelectorAll("[data-strategy]:checked")
      ).map((el) => el.dataset.strategy);

      if (currentSelected.length > 5) {
        checkbox.checked = false;
        return;
      }

      updateQuery({ page: "compare", strategies: currentSelected.join(",") });
    });
  });

  // Draw chart if strategies selected
  if (selected.length > 0) {
    drawCompareChart(selected, instrument, window);
  }

  bindPortfolioBuilder(route);
}

function drawCompareChart(strategyIds, instrument, window) {
  const ctx = document.getElementById("compare-main-chart");
  if (!ctx) return;

  const strategies = strategyIds
    .map((id) => store.strategies.find((s) => s.id === id))
    .filter(Boolean);

  if (!strategies.length) return;

  const baseSeries = sliceSeries(getSeries(strategies[0].id, instrument), window);
  const labels = baseSeries.dates;

  const datasets = strategies.map((strategy, index) => {
    const series = sliceSeries(getSeries(strategy.id, instrument), window);
    const normalized = normalizeSeries(series).strategy;
    return {
      label: `${strategy.id} - ${strategy.name}`,
      data: normalized,
      borderColor: palette(index),
      backgroundColor: "transparent",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.25
    };
  });

  registerChart(
    new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, padding: 15 }
          }
        },
        scales: { y: { type: "linear" } }
      }
    })
  );
}

function bindPortfolioBuilder(route) {
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

  updateFromInputs();
}

function updatePortfolioDisplay(strategyIds, weights, instrument, window) {
  const portfolio = buildPortfolio(strategyIds, weights, instrument, window);
  updatePortfolioTotals(portfolio.total);
  updatePortfolioMetrics(portfolio.metrics);
  updatePortfolioChart(portfolio.series);
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
      ? "Weights sum to 100%."
      : "Weights normalize to 100% for calculations.";
  }
}

function updatePortfolioMetrics(metrics) {
  const container = document.getElementById("portfolio-metrics");
  if (!container) return;
  container.innerHTML = `
    <h3>Portfolio Metrics</h3>
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
        label: "Portfolio",
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

function bindArena(route) {
  const state = arenaState(route.params);
  const instrumentSelect = document.getElementById("arena-instrument");
  const metricSelect = document.getElementById("arena-metric");
  const topSelect = document.getElementById("arena-top");
  const thresholdToggle = document.getElementById("arena-threshold");

  if (instrumentSelect) {
    instrumentSelect.addEventListener("change", (event) => {
      updateQuery({ page: "arena", instrument: event.target.value });
    });
  }

  if (metricSelect) {
    metricSelect.addEventListener("change", (event) => {
      updateQuery({ page: "arena", metric: event.target.value, sort: event.target.value });
    });
  }

  if (topSelect) {
    topSelect.addEventListener("change", (event) => {
      updateQuery({ page: "arena", top: event.target.value });
    });
  }

  if (thresholdToggle) {
    thresholdToggle.addEventListener("change", (event) => {
      updateQuery({ page: "arena", threshold: event.target.checked ? "1" : "" });
    });
  }

  document.querySelectorAll("[data-window]").forEach((button) => {
    button.addEventListener("click", () => {
      updateQuery({ page: "arena", window: button.dataset.window });
    });
  });

  document.querySelectorAll("th button[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const sort = button.dataset.sort;
      const nextDir =
        state.sort === sort && state.dir === "desc" ? "asc" : "desc";
      updateQuery({ page: "arena", sort, dir: nextDir });
    });
  });
}

function bindStrategies(route) {
  const search = document.getElementById("strategy-search");
  if (search) {
    search.addEventListener("input", (event) => {
      updateQuery({ page: "strategies", q: event.target.value });
    });
  }

  document.querySelectorAll("[data-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      const tags = parseList(route.params.get("tags"));
      const tag = button.dataset.tag;
      const next = tags.includes(tag)
        ? tags.filter((item) => item !== tag)
        : [...tags, tag];
      updateQuery({ page: "strategies", tags: next.join(",") });
    });
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      updateQuery({ page: "strategies", view: button.dataset.view });
    });
  });

  const categoryInstrument = document.getElementById("category-instrument");
  if (categoryInstrument) {
    categoryInstrument.addEventListener("change", (event) => {
      updateQuery({ page: "strategies", instrument: event.target.value });
    });
  }

  document.querySelectorAll("[data-category-window]").forEach((button) => {
    button.addEventListener("click", () => {
      updateQuery({ page: "strategies", window: button.dataset.categoryWindow });
    });
  });

  bindFavoriteButtons();
}

function bindFavorites(route) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      updateQuery({ page: "favorites", view: button.dataset.view });
    });
  });

  bindFavoriteButtons();
}

function bindStrategyDetail(route) {
  const strategyId = route.params.get("id") || store.strategies[0].id;
  const instrumentSelect = document.getElementById("detail-instrument");

  if (instrumentSelect) {
    instrumentSelect.addEventListener("change", (event) => {
      updateQuery({ page: "strategy", id: strategyId, instrument: event.target.value });
    });
  }

  document.querySelectorAll("[data-window]").forEach((button) => {
    button.addEventListener("click", () => {
      updateQuery({ page: "strategy", id: strategyId, window: button.dataset.window });
    });
  });

  document.querySelectorAll("[data-scale]").forEach((button) => {
    button.addEventListener("click", () => {
      updateQuery({ page: "strategy", id: strategyId, scale: button.dataset.scale });
    });
  });

  document.querySelectorAll("[data-compare]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = Array.from(
        document.querySelectorAll("[data-compare]:checked")
      ).map((item) => item.dataset.compare);
      if (selected.length > 5) {
        input.checked = false;
        return;
      }
      updateQuery({ page: "strategy", id: strategyId, compare: selected.join(",") });
    });
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;
      document.querySelectorAll(".tab-button").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.tab === target);
      });
      document.querySelectorAll(".tab-content").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.panel === target);
      });
    });
  });

  const copy = document.querySelector("[data-copy]");
  if (copy) {
    copy.addEventListener("click", () => {
      const code = document.querySelector(".pseudocode code");
      if (!code) return;
      const text = code.textContent || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      copy.textContent = "Copied";
      setTimeout(() => {
        copy.textContent = "Copy";
      }, 1500);
    });
  }

  bindFavoriteButtons();

  drawStrategyCharts(route);
}

function drawStrategyCharts(route) {
  const strategyId = route.params.get("id") || store.strategies[0].id;
  const strategy = store.strategies.find((item) => item.id === strategyId);
  if (!strategy) return;

  const instrument =
    route.params.get("instrument") || strategy.instruments[0] || defaultInstrument();
  const window = route.params.get("window") || defaultWindow();
  const compareParam = route.params.get("compare");
  const compare = compareParam ? compareParam.split(",").filter(Boolean) : [];
  const compareList = compare.length ? compare : strategy.recommendedCompare;
  const scale = route.params.get("scale") || "linear";

  const series = getSeries(strategy.id, instrument);
  const windowed = sliceSeries(series, window);

  const equityCtx = document.getElementById("equity-chart");
  if (equityCtx) {
    registerChart(
      new Chart(equityCtx, {
        type: "line",
        data: {
          labels: windowed.dates,
          datasets: [
            {
              label: "Strategy",
              data: windowed.strategy,
              borderColor: "#1f6f78",
              backgroundColor: "rgba(31, 111, 120, 0.2)",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25
            },
            {
              label: "Buy & Hold",
              data: windowed.benchmark,
              borderColor: "#e16b3a",
              backgroundColor: "rgba(225, 107, 58, 0.2)",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { position: "bottom" },
            tooltip: { enabled: true }
          },
          scales: {
            y: { type: scale }
          }
        }
      })
    );
  }

  const compareCtx = document.getElementById("compare-chart");
  if (compareCtx) {
    const datasets = compareList.map((item, index) => {
      const line = normalizeSeries(sliceSeries(getSeries(strategy.id, item), window));
      return {
        label: item,
        data: line.strategy,
        borderColor: palette(index),
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.25
      };
    });
    registerChart(
      new Chart(compareCtx, {
        type: "line",
        data: { labels: windowed.dates, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { position: "bottom" } },
          scales: { y: { type: scale } }
        }
      })
    );
  }

  // Drawdown Chart
  const drawdownCtx = document.getElementById("drawdown-chart");
  if (drawdownCtx) {
    const drawdownSeries = calcDrawdownSeries(windowed.strategy);
    registerChart(
      new Chart(drawdownCtx, {
        type: "line",
        data: {
          labels: windowed.dates,
          datasets: [
            {
              label: "Drawdown",
              data: drawdownSeries,
              borderColor: "#c94c4c",
              backgroundColor: "rgba(201, 76, 76, 0.3)",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `Drawdown: ${(context.raw * 100).toFixed(2)}%`
              }
            }
          },
          scales: {
            y: {
              type: "linear",
              max: 0,
              ticks: {
                callback: (value) => `${(value * 100).toFixed(0)}%`
              }
            }
          }
        }
      })
    );
  }

  // Monthly Returns Heatmap
  const heatmapContainer = document.getElementById("monthly-heatmap");
  if (heatmapContainer) {
    const fullSeries = getSeries(strategy.id, instrument);
    renderMonthlyHeatmap(heatmapContainer, fullSeries);
  }

  drawRollingMetrics(windowed);
}

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
    container.innerHTML = "<div class='muted'>No data available</div>";
    return;
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let html = "<table class='heatmap-table'><thead><tr><th>Year</th>";
  months.forEach((m) => {
    html += `<th>${m}</th>`;
  });
  html += "<th>Annual</th></tr></thead><tbody>";

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
              label: "Rolling Sharpe",
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
              label: "Rolling Volatility",
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
              label: "Rolling Beta",
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

function arenaState(params) {
  return {
    instrument: params.get("instrument") || defaultInstrument(),
    window: params.get("window") || defaultWindow(),
    metric: params.get("metric") || "score",
    top: parseInt(params.get("top") || "10", 10),
    sort: params.get("sort") || "score",
    dir: params.get("dir") || "desc",
    threshold: params.get("threshold") === "1"
  };
}

function strategiesState(params) {
  return {
    query: params.get("q") ? params.get("q").toLowerCase() : "",
    tags: parseList(params.get("tags")),
    view: params.get("view") || "grid",
    instrument: params.get("instrument") || defaultInstrument(),
    window: params.get("window") || defaultWindow()
  };
}

function favoritesState(params) {
  return {
    view: params.get("view") || "grid"
  };
}

function buildLeaderboard(instrument, window) {
  return store.strategies
    .filter((strategy) => strategy.instruments.includes(instrument))
    .map((strategy) => {
      const metrics = getMetricsFor(strategy.id, instrument, window);
      metrics.arenaScore = metrics.arenaScore || calcArenaScore(metrics);
      return { strategy, metrics };
    });
}

function sortRows(rows, sort, dir, metric) {
  const direction = dir === "asc" ? 1 : -1;
  const key = sort === "metric" ? metric : sort;
  return [...rows].sort((a, b) => {
    const valueA = valueForSort(a.metrics, key);
    const valueB = valueForSort(b.metrics, key);
    return (valueA - valueB) * direction;
  });
}

function valueForSort(metrics, key) {
  if (key === "maxDrawdown") {
    return metrics.maxDrawdown;
  }
  if (key === "score") {
    return metrics.arenaScore;
  }
  return metrics[key] ?? 0;
}

function getMetricsFor(strategyId, instrument, window) {
  const perf = store.performance.strategies?.[strategyId] || {};
  const metrics = perf.metrics?.[instrument]?.[window];
  if (metrics) {
    return metrics;
  }
  const series = getSeries(strategyId, instrument);
  const windowed = sliceSeries(series, window);
  const calculated = calcMetrics(windowed);
  calculated.arenaScore = calcArenaScore(calculated);
  return calculated;
}

function getSeries(strategyId, instrument) {
  const key = `${strategyId}-${instrument}`;
  if (seriesCache.has(key)) {
    return seriesCache.get(key);
  }

  const perf = store.performance.strategies?.[strategyId] || {};
  if (perf.equity?.[instrument]) {
    const entry = perf.equity[instrument];
    const result = {
      dates: entry.dates,
      strategy: entry.strategy,
      benchmark: entry.benchmark
    };
    seriesCache.set(key, result);
    return result;
  }

  const seed = perf.seed || 1000;
  const trend = perf.trend || 0.12;
  const vol = perf.vol || 0.16;
  const points = 1260;
  const offset = instrumentHash(instrument);
  const generated = generateSeries(seed + offset, points, trend, vol);
  seriesCache.set(key, generated);
  return generated;
}

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

function formatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(0);
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

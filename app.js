const DATA_FILES = {
  strategies: "data/strategies.json",
  performance: "data/performance.json",
  changelog: "data/changelog.json"
};

const charts = [];
const seriesCache = new Map();

const store = {
  strategies: [],
  performance: null,
  changelog: []
};

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
  const toggle = document.querySelector(".nav-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
  });
  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
    });
  });
}

function destroyCharts() {
  while (charts.length) {
    charts.pop().destroy();
  }
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
    case "strategy":
      app.innerHTML = renderStrategyDetail(route);
      bindStrategyDetail(route);
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
          <h2>Top Strategy Overlay</h2>
          <p>Top 10 by Arena Score (${window}, ${instrument}). Normalized to 1.0.</p>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <strong>Top 10 Strategy Curves</strong>
            <div class="muted">Legend shows strategy ID.</div>
          </div>
        </div>
        <div class="chart-body">
          <canvas id="home-top-chart"></canvas>
        </div>
      </div>
    </section>
  `;
}

function bindHome() {
  drawHomeTopChart();
}

function drawHomeTopChart() {
  const instrument = defaultInstrument();
  const window = defaultWindow();
  const leaderboard = buildLeaderboard(instrument, window)
    .sort((a, b) => b.metrics.arenaScore - a.metrics.arenaScore)
    .slice(0, 10);
  const ctx = document.getElementById("home-top-chart");
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
          legend: { position: "bottom", labels: { boxWidth: 12 } }
        },
        scales: { y: { type: "linear" } }
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

      <div class="strategy-grid ${state.view}">
        ${filtered
          .map(
            (strategy) => `
          <div class="strategy-card">
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
          ${
            returnTo
              ? `<div class="hero-actions"><a class="button ghost" href="?${decodeURIComponent(
                  returnTo
                )}">Back to Arena</a></div>`
              : ""
          }
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
        <p>Quant Arena exists to keep strategy research transparent and repeatable. Every model is measured under the same rules so the leaderboard remains fair across assets and time windows.</p>
        <ul>
          <li>Unified data source and backtest assumptions.</li>
          <li>Clear methodology for scores and rankings.</li>
          <li>Readable pseudocode for every strategy.</li>
        </ul>
        <p>Disclaimer: this site is for research and education only, not investment advice.</p>
      </div>
    </section>
  `;
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
    trades
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
    key === "winRate"
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

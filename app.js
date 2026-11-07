const LANG = window.getLang ? getLang() : "en";

const DATA_FILES = {
  strategies: "data/strategies.json",
  performance: "data/performance.json",
  changelog: "data/changelog.json",
  eaIndex: "data/ea_index.json",
  eaCatalog: "data/ea_catalog.json",
  eaAnalysis: "data/ea_analysis.json",
  eaAnalysisDir: "data/ea-analysis",
  eaBacktestIndex: "data/backtest_results_index.json",
  home: "data/home.json",
  metricsExt: "data/metrics_ext.json"
};
const FAVORITES_KEY = "favorites";
const CATEGORY_TOP_COUNT = 5;
const TRADING_DAYS = 252;
const ROLLING_WINDOW = 252;
const CATEGORY_GROUPS = [
  { id: "trend", labelKey: "category.trend_following", tag: "Trend" },
  { id: "momentum", labelKey: "category.momentum", tag: "Momentum" },
  { id: "mean-reversion", labelKey: "category.mean_reversion", tag: "Mean Reversion" },
  { id: "volatility", labelKey: "category.volatility", tag: "Volatility" },
  { id: "portfolio", labelKey: "category.portfolio", tag: "Portfolio" },
  { id: "regime", labelKey: "category.regime", tag: "Regime" }
];
const COMPARE_METRICS = [
  { key: "totalReturn", labelKey: "metric.total_return", format: "percent" },
  { key: "cagr", labelKey: "metric.cagr", format: "percent" },
  { key: "sharpe", labelKey: "metric.sharpe_ratio", format: "ratio" },
  { key: "sortino", labelKey: "metric.sortino_ratio", format: "ratio" },
  { key: "calmar", labelKey: "metric.calmar_ratio", format: "ratio" },
  { key: "maxDrawdown", labelKey: "metric.max_drawdown", format: "percent" },
  { key: "volatility", labelKey: "metric.volatility", format: "percent" },
  { key: "winRate", labelKey: "metric.win_rate", format: "percent" },
  { key: "trades", labelKey: "metric.trades", format: "number" }
];
const BENCHMARK_OPTIONS = [
  { value: "buy-hold", labelKey: "benchmark.buy_hold" },
  { value: "spy", labelKey: "benchmark.spy" },
  { value: "60-40", labelKey: "benchmark.60_40" },
  { value: "risk-parity", labelKey: "benchmark.risk_parity" }
];
const AD_CLIENT_ID = "ca-pub-7668092478424830";
const ADSENSE_SCRIPT_ID = "adsense-script";
const CONTENT_ROUTES = new Set([
  "research",
  "about",
  "methodology",
  "faq",
  "privacy-policy",
  "terms"
]);
const PAGE_META = {
  home: {
    titleKey: "meta.home_title",
    descriptionKey: "meta.home_desc"
  },
  arena: {
    titleKey: "meta.arena_title",
    descriptionKey: "meta.arena_desc"
  },
  strategies: {
    titleKey: "meta.strategies_title",
    descriptionKey: "meta.strategies_desc"
  },
  favorites: {
    titleKey: "meta.favorites_title",
    descriptionKey: "meta.favorites_desc"
  },
  compare: {
    titleKey: "meta.compare_title",
    descriptionKey: "meta.compare_desc"
  },
  research: {
    titleKey: "meta.research_title",
    descriptionKey: "meta.research_desc"
  },
  about: {
    titleKey: "meta.about_title",
    descriptionKey: "meta.about_desc"
  },
  methodology: {
    titleKey: "meta.methodology_title",
    descriptionKey: "meta.methodology_desc"
  },
  faq: {
    titleKey: "meta.faq_title",
    descriptionKey: "meta.faq_desc"
  },
  "privacy-policy": {
    titleKey: "meta.privacy_title",
    descriptionKey: "meta.privacy_desc"
  },
  terms: {
    titleKey: "meta.terms_title",
    descriptionKey: "meta.terms_desc"
  },
  changelog: {
    titleKey: "meta.changelog_title",
    descriptionKey: "meta.changelog_desc"
  },
  strategy: {
    titleKey: "meta.strategy_title",
    descriptionKey: "meta.strategy_desc"
  },
  "ea-arena": {
    titleKey: "meta.ea_arena_title",
    descriptionKey: "meta.ea_arena_desc"
  },
  "ea-detail": {
    titleKey: "meta.ea_detail_title",
    descriptionKey: "meta.ea_detail_desc"
  },
  "ea-ranking": {
    titleKey: "meta.ea_ranking_title",
    descriptionKey: "meta.ea_ranking_desc"
  },
  lab: {
    titleKey: "meta.lab_title",
    descriptionKey: "meta.lab_desc"
  }
};

const charts = [];
const seriesCache = new Map();

const store = {
  strategies: [],
  performance: null,
  changelog: [],
  eaCatalog: [],
  eaAnalysis: {},
  eaBacktestIndex: {}
};
let favorites = new Set();
let portfolioWeights = new Map();
let portfolioChart = null;
let portfolioRiskChart = null;

document.addEventListener("DOMContentLoaded", () => {
  init().catch((err) => {
    console.error(err);
    const app = document.getElementById("app");
    app.innerHTML = `<section class="section"><h2>${t("common.failed_load_title")}</h2><p>${t("common.failed_load_desc")}</p></section>`;
  });
});

function ensureChartLib() {
  if (typeof window.Chart !== "undefined") return;
  // CDN blocked or offline: keep the page usable without charts.
  console.warn("Chart.js failed to load; charts are disabled.");
  window.Chart = class ChartUnavailable {
    constructor(ctx, config) {
      this.data = config?.data || { labels: [], datasets: [] };
      this.options = config?.options || {};
      const canvas = ctx && ctx.canvas ? ctx.canvas : ctx;
      if (canvas && canvas.parentElement && !canvas.parentElement.querySelector(".chart-unavailable")) {
        canvas.insertAdjacentHTML("afterend", `<div class="chart-unavailable">${t("common.chart_unavailable")}</div>`);
      }
    }
    destroy() {}
    update() {}
    resize() {}
    toBase64Image() {
      return "";
    }
  };
}

// Chart.js loads async so it never blocks the app scripts; wait for it (or
// give up after a few seconds) before the first render.
function waitForChartLib(timeoutMs = 8000) {
  if (typeof window.Chart !== "undefined") return Promise.resolve();
  const tag = document.getElementById("chartjs");
  if (!tag || window.__chartFailed) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    tag.addEventListener("load", done, { once: true });
    tag.addEventListener("error", done, { once: true });
    setTimeout(done, timeoutMs);
  });
}

async function init() {
  await Promise.all([loadData(), waitForChartLib()]);
  ensureChartLib();
  initFavorites();
  bindGlobal();
  render();
  window.addEventListener("popstate", render);
}

async function loadData() {
  const [strategies, performance, changelog, eaIndex] = await Promise.all([
    fetchJson(DATA_FILES.strategies),
    fetchJson(DATA_FILES.performance),
    fetchJson(DATA_FILES.changelog),
    // Slim EA list (ids, names, categories, ratings); the full catalog with
    // descriptions is only fetched on EA detail pages.
    fetchJson(DATA_FILES.eaIndex).catch(() => fetchJson(DATA_FILES.eaCatalog).catch(() => []))
  ]);

  store.strategies = strategies.strategies || [];
  store.performance = performance || { instruments: [], windows: [] };
  store.changelog = changelog.entries || [];
  if (Array.isArray(eaIndex)) store.eaCatalog = eaIndex;
}

// EA pages load only what they need:
//   ea-arena   nothing extra (the slim index carries the "analyzed" flag)
//   ea-ranking backtest index (~120 KB gzip)
//   ea-detail  full catalog + backtest index + that one EA's analysis file
const EA_DATA_PAGES = new Set(["ea-arena", "ea-detail", "ea-ranking"]);
const eaLoads = new Map();
const eaLoaded = new Set();

function loadOnce(key, loader) {
  if (eaLoaded.has(key)) return Promise.resolve();
  if (!eaLoads.has(key)) {
    eaLoads.set(
      key,
      loader()
        .catch((err) => console.warn(`EA data unavailable: ${key}`, err))
        .then(() => {
          eaLoaded.add(key);
        })
    );
  }
  return eaLoads.get(key);
}

function eaDataKeys(route) {
  if (route.page === "ea-ranking") return ["backtests"];
  if (route.page === "ea-detail") {
    const id = route.params.get("id") || "";
    return ["catalog", "backtests", `analysis:${id}`];
  }
  return [];
}

function loadEAKey(key) {
  if (key === "backtests") {
    return loadOnce(key, () =>
      fetchJson(DATA_FILES.eaBacktestIndex).then((index) => {
        if (index && typeof index === "object" && !Array.isArray(index)) store.eaBacktestIndex = index;
      })
    );
  }
  if (key === "catalog") {
    return loadOnce(key, () =>
      fetchJson(DATA_FILES.eaCatalog).then((catalog) => {
        if (!Array.isArray(catalog)) return;
        // Keep the fields the slim index decides: analysed flag, category (from the
        // code analysis, as on the static pages) and blow-up risk.
        const slim = new Map(store.eaCatalog.map((ea) => [ea.id, ea]));
        const indexOnly = ["analyzed", "category", "blowup", "bf", "bm", "bp"];
        store.eaCatalog = catalog.map((ea) => {
          const extra = slim.get(ea.id);
          if (!extra) return ea;
          const merged = { ...ea };
          indexOnly.forEach((key) => {
            if (extra[key] !== undefined) merged[key] = extra[key];
          });
          return merged;
        });
      })
    );
  }
  if (key.startsWith("analysis:")) {
    const id = key.slice("analysis:".length);
    if (!/^EA-\d+$/.test(id)) return Promise.resolve();
    return loadOnce(key, () =>
      fetchJson(`${DATA_FILES.eaAnalysisDir}/${id}.json`).then((analysis) => {
        if (analysis && typeof analysis === "object") store.eaAnalysis[id] = analysis;
      })
    );
  }
  return Promise.resolve();
}

function missingEAData(route) {
  return eaDataKeys(route).filter((key) => !eaLoaded.has(key));
}

function ensureEAData(route) {
  return Promise.all(missingEAData(route).map(loadEAKey));
}

// Extended metrics (curve statistics, score components) live in a separate
// file that only detail and compare pages need.
const EXT_METRIC_PAGES = new Set(["strategy", "compare"]);
let metricsExtState = "idle";

function needsMetricsExt(route) {
  return EXT_METRIC_PAGES.has(route.page) && Boolean(store.performance?.extendedMetricsFile) && metricsExtState !== "done";
}

function ensureMetricsExt() {
  if (metricsExtState !== "idle") return Promise.resolve();
  metricsExtState = "loading";
  return fetchJson(store.performance.extendedMetricsFile || DATA_FILES.metricsExt)
    .then((ext) => {
      store.metricsExt = ext && typeof ext === "object" ? ext : {};
    })
    .catch(() => {
      store.metricsExt = {};
    })
    .then(() => {
      metricsExtState = "done";
    });
}

// Home charts use a small pre-computed file (scripts/build_light_data.py)
// instead of three full equity files.
let homeChartsState = "idle";

function ensureHomeCharts() {
  if (homeChartsState !== "idle") return Promise.resolve();
  homeChartsState = "loading";
  return fetchJson(DATA_FILES.home)
    .then((payload) => {
      store.homeCharts = Array.isArray(payload?.charts) ? payload.charts : null;
    })
    .catch(() => {
      store.homeCharts = null;
    })
    .then(() => {
      homeChartsState = "done";
    });
}

function hasLivePerformanceData() {
  const strategies = store.performance?.strategies || {};
  return Object.values(strategies).some(
    (entry) => entry && entry.metrics && Object.keys(entry.metrics).length
  );
}

// Equity curves live in per-instrument files (data/equity/*.json) so a page
// only downloads the series it actually draws.
const equityLoaded = new Set();
const equityPending = new Map();

function equityFileFor(symbol) {
  const files = store.performance?.equityFiles;
  return files && symbol ? files[symbol] || null : null;
}

function isEquityPending(symbol) {
  return Boolean(equityFileFor(symbol)) && !equityLoaded.has(symbol);
}

function loadEquity(symbol) {
  if (equityPending.has(symbol)) return equityPending.get(symbol);
  const promise = fetchJson(equityFileFor(symbol))
    .then((file) => {
      const sharedDates = file.dates || [];
      const strategies = store.performance.strategies || (store.performance.strategies = {});
      Object.entries(file.strategies || {}).forEach(([strategyId, entry]) => {
        const perf = strategies[strategyId] || (strategies[strategyId] = {});
        if (!perf.equity) perf.equity = {};
        perf.equity[symbol] = {
          dates: entry.dates || sharedDates,
          strategy: entry.strategy,
          benchmark: entry.benchmark
        };
      });
    })
    .catch((err) => {
      console.warn(`Equity data unavailable for ${symbol}`, err);
    })
    .then(() => {
      equityLoaded.add(symbol);
      seriesCache.clear();
    });
  equityPending.set(symbol, promise);
  return promise;
}

function requiredEquitySymbols(route) {
  const params = route.params;
  const instrument = params.get("instrument");
  switch (route.page) {
    case "home":
      // Pre-computed home charts make the full equity files unnecessary.
      return store.homeCharts && store.homeCharts.length ? [] : [defaultInstrument(), "SPY", "GLD", "EURUSD=X"];
    case "arena":
    case "favorites":
      // Leaderboards only need the pre-computed metrics.
      return hasLivePerformanceData() ? [] : [instrument || defaultInstrument()];
    case "compare":
      return [instrument || defaultInstrument()];
    case "lab":
      return [instrument || "SPY"];
    case "strategy": {
      const strategyId = params.get("id") || store.strategies[0]?.id;
      const strategy = store.strategies.find((item) => item.id === strategyId);
      const symbols = [
        instrument || (strategy ? dataInstruments(strategy)[0] : null) || defaultInstrument(),
        "SPY",
        "GLD"
      ];
      const compare = (params.get("compare") || "").split(",").filter(Boolean);
      symbols.push(...(compare.length ? compare : strategy?.recommendedCompare || []));
      if (params.get("benchmark") === "risk-parity") symbols.push("RISK-PARITY");
      return symbols;
    }
    default:
      return [];
  }
}

let equityRerenderQueued = false;

function queueRenderAfterEquity(symbol) {
  loadEquity(symbol).then(() => {
    if (equityRerenderQueued) return;
    equityRerenderQueued = true;
    requestAnimationFrame(() => {
      equityRerenderQueued = false;
      render();
    });
  });
}

async function fetchJson(path) {
  // "no-cache" revalidates with the server (ETag) instead of re-downloading
  // unchanged files on every visit.
  const res = await fetch(path, { cache: "no-cache" });
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

function getBasePath() {
  const host = window.location.hostname;
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (host.endsWith("github.io") && segments.length) {
    return `/${segments[0]}/`;
  }
  return "/";
}

// Keep in sync with strategy_slug() in scripts/static_site.py.
function strategySlug(strategy) {
  return `${strategy.id}-${strategy.name || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Pages whose content depends on the visitor (local storage / ad-hoc
// selections) and should not be indexed.
// Tool views whose content only exists after JavaScript runs; search engines
// saw them as empty ("soft 404"), so keep them out of the index.
const NOINDEX_PAGES = new Set(["favorites", "compare", "ea-ranking", "lab"]);
// App views with a static, fully rendered version (scripts/generate_static_pages.py).
const STATIC_TWINS = {
  arena: "arena/",
  strategies: "strategies/",
  about: "about/",
  methodology: "methodology/",
  faq: "faq/",
  changelog: "changelog/",
  "privacy-policy": "privacy-policy/",
  terms: "terms/",
  "ea-arena": (zhPrefix) => (zhPrefix ? "ea-pages/zh/category/" : "ea-pages/category/")
};
// Query params that identify a page; everything else (filters, windows,
// sort orders) is a view of the same page and is dropped from the canonical.
const CANONICAL_PARAMS = {
  research: ["slug"],
  strategy: ["id"]
};

// index.html ships a pre-rendered summary of the home page (crawlers, first
// paint). Keep it on screen while the home page loads; drop it as soon as
// anything else is shown.
function showLoading(app, route, html) {
  if (app.dataset.prerender) {
    if (app.dataset.prerender === route.page) return;
    delete app.dataset.prerender;
  }
  app.innerHTML = html;
}

function buildCanonicalUrl(route) {
  if (window.location.origin === "null") {
    return null;
  }
  const base = new URL(getBasePath(), window.location.origin);
  if (route.page === "home") {
    return base.toString();
  }
  // Pre-rendered pages carry the full content in their raw HTML, so they are
  // the versions search engines should index (see scripts/generate_static_pages.py).
  const zhPrefix = getLang() === "zh" ? "zh/" : "";
  if (route.page === "strategy") {
    const strategy = store.strategies.find((item) => item.id === route.params.get("id"));
    if (strategy) {
      return new URL(`${zhPrefix}strategy/${strategySlug(strategy)}/`, base).toString();
    }
  }
  if (route.page === "research") {
    const slug = route.params.get("slug");
    const known = !slug || (typeof getResearchArticle === "function" && getResearchArticle(slug));
    if (known) {
      return new URL(`${zhPrefix}research/${slug ? `${encodeURIComponent(slug)}/` : ""}`, base).toString();
    }
  }
  // App views that have a pre-rendered twin with the same content.
  const staticPath = STATIC_TWINS[route.page];
  if (staticPath) {
    const path = typeof staticPath === "function" ? staticPath(zhPrefix) : `${zhPrefix}${staticPath}`;
    return new URL(path, base).toString();
  }
  if (route.page === "ea-detail") {
    const id = route.params.get("id") || "";
    if (/^EA-\d+$/.test(id)) {
      return new URL(`ea-pages/${id}.html`, base).toString();
    }
  }
  base.searchParams.set("page", route.page);
  (CANONICAL_PARAMS[route.page] || []).forEach((key) => {
    const value = route.params.get(key);
    if (value) {
      base.searchParams.set(key, value);
    }
  });
  return base.toString();
}

function normalizeRoute(route) {
  const canonicalUrl = buildCanonicalUrl(route);
  const shouldRedirect = (route.fromPath || route.alias) && canonicalUrl;
  if (shouldRedirect && canonicalUrl !== window.location.href) {
    window.location.replace(canonicalUrl);
    return { redirected: true, canonicalUrl };
  }
  return { redirected: false, canonicalUrl };
}

function ensureMetaTag(name) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  return tag;
}

function ensureCanonicalLink() {
  let link = document.querySelector("link[rel=\"canonical\"]");
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  return link;
}

function getPageMeta(route) {
  if (route.page === "research") {
    const slug = route.params.get("slug");
    if (slug) {
      const article = getResearchArticle(slug);
      if (article) {
        return {
          title: `${tc(article.title)} | ${t("meta.site_name")}`,
          description: tc(article.summary) || t(PAGE_META.research.descriptionKey)
        };
      }
    }
  }
  if (route.page === "strategy") {
    const id = route.params.get("id");
    const strategy = store.strategies.find((item) => item.id === id);
    if (strategy) {
      return {
        title: `${strategy.id} ${strategy.name} | ${t("meta.site_name")}`,
        description: t("meta.strategy_dynamic_desc", { name: strategy.name })
      };
    }
  }
  const meta = PAGE_META[route.page] || PAGE_META.home;
  return {
    title: t(meta.titleKey),
    description: t(meta.descriptionKey)
  };
}

function updatePageMeta(route, canonicalUrl) {
  const meta = getPageMeta(route);
  if (meta?.title) {
    document.title = meta.title;
  }
  const descriptionTag = ensureMetaTag("description");
  descriptionTag.setAttribute("content", meta.description);
  const canonicalTag = ensureCanonicalLink();
  canonicalTag.setAttribute("href", canonicalUrl || window.location.href);
  const robotsTag = ensureMetaTag("robots");
  robotsTag.setAttribute("content", NOINDEX_PAGES.has(route.page) ? "noindex, follow" : "index, follow");
}

function ensureAdSense(route) {
  if (!CONTENT_ROUTES.has(route.page)) return;
  if (document.getElementById(ADSENSE_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT_ID}`;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

function forceAdFreeReload(route) {
  if (CONTENT_ROUTES.has(route.page)) return false;
  if (!document.getElementById(ADSENSE_SCRIPT_ID)) return false;
  window.location.replace(window.location.href);
  return true;
}

function initTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem("theme");
  } catch (err) {
    savedTheme = null;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");
  setTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
  try {
    localStorage.setItem("theme", next);
  } catch (err) {
    // Ignore storage failures (private mode).
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("theme-icon");
  const label = document.getElementById("theme-label");
  if (icon && label) {
    if (typeof window.themeIconSvg === "function") {
      icon.innerHTML = window.themeIconSvg(theme);
    } else {
      icon.textContent = theme === "dark" ? "☀️" : "🌙";
    }
    label.textContent = theme === "dark" ? t("nav.theme_light") : t("nav.theme_dark");
    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      const hint = theme === "dark" ? t("nav.switch_to_light") : t("nav.switch_to_dark");
      toggle.setAttribute("aria-label", hint);
      toggle.setAttribute("title", hint);
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
      active ? t("common.remove_from_favorites") : t("common.add_to_favorites")
    );
    const label = button.querySelector("[data-favorite-label]");
    if (label) {
      label.textContent = active ? t("common.saved") : t("common.save");
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
  portfolioRiskChart = null;
}

function registerChart(chart) {
  charts.push(chart);
}

function render() {
  destroyCharts();
  const route = getRoute();
  const normalized = normalizeRoute(route);
  if (normalized.redirected) {
    return;
  }
  if (forceAdFreeReload(route)) {
    return;
  }
  highlightNav(route.page);
  updatePageMeta(route, normalized.canonicalUrl);
  ensureAdSense(route);

  const app = document.getElementById("app");
  if (!store.strategies.length) {
    showLoading(app, route, `<section class="section"><h2>${t("common.loading")}</h2></section>`);
    return;
  }

  if (route.page === "home" && homeChartsState !== "done") {
    const pendingHref = window.location.href;
    showLoading(app, route, `<section class="section page-loading"><div class="loading-spinner" aria-hidden="true"></div><p>${t("common.loading")}</p></section>`);
    ensureHomeCharts().then(() => {
      if (window.location.href === pendingHref) render();
    });
    return;
  }

  if (needsMetricsExt(route)) {
    const pendingHref = window.location.href;
    showLoading(app, route, `<section class="section page-loading"><div class="loading-spinner" aria-hidden="true"></div><p>${t("common.loading")}</p></section>`);
    ensureMetricsExt().then(() => {
      if (window.location.href === pendingHref) render();
    });
    return;
  }

  const missingEquity = [...new Set(requiredEquitySymbols(route))].filter(isEquityPending);
  if (missingEquity.length) {
    const pendingHref = window.location.href;
    showLoading(app, route, `<section class="section page-loading"><div class="loading-spinner" aria-hidden="true"></div><p>${t("common.loading")}</p></section>`);
    Promise.all(missingEquity.map(loadEquity)).then(() => {
      if (window.location.href === pendingHref) render();
    });
    return;
  }

  if (EA_DATA_PAGES.has(route.page) && missingEAData(route).length) {
    const pendingHref = window.location.href;
    showLoading(app, route, `<section class="section page-loading"><div class="loading-spinner" aria-hidden="true"></div><p>${t("common.loading")}</p></section>`);
    ensureEAData(route).then(() => {
      if (window.location.href === pendingHref) render();
    });
    return;
  }

  delete app.dataset.prerender;
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
      bindCostSlider();
      break;
    case "compare":
      app.innerHTML = renderCompare(route);
      bindCompare(route);
      break;
    case "research":
      app.innerHTML = route.params.get("slug")
        ? renderResearchArticle(route)
        : renderResearchIndex();
      break;
    case "methodology":
      app.innerHTML = renderMethodology();
      break;
    case "changelog":
      app.innerHTML = renderChangelog();
      break;
    case "ea-arena":
      app.innerHTML = renderEAArena(route);
      bindEAArena(route);
      break;
  case "ea-detail":
    app.innerHTML = renderEADetail(route);
    bindEADetail(route);
    break;
  case "ea-ranking":
    app.innerHTML = renderEARanking(route);
    bindEARanking(route);
    break;
  case "lab":
    app.innerHTML = renderLab(route);
    bindLab(route);
    break;
  case "about":
      app.innerHTML = renderAbout();
      break;
    case "privacy-policy":
      app.innerHTML = renderPolicyPage("privacy");
      break;
    case "terms":
      app.innerHTML = renderPolicyPage("terms");
      break;
    case "faq":
      app.innerHTML = renderFaq();
      break;
    default:
      app.innerHTML = renderHome();
      bindHome();
  }
  if (typeof window.afterRender === "function") {
    window.afterRender(route);
  }
}

function getRoute() {
  const params = new URLSearchParams(window.location.search);
  const hasPageParam = params.has("page");
  let page = params.get("page");
  let fromPath = false;
  let alias = false;
  if (!page) {
    const rawPath = window.location.pathname.replace(/\/+$/, "");
    const path = rawPath.replace(/^\/+/, "");
    if (path && path !== "index.html" && path !== "404.html") {
      const segments = path.split("/");
      const root = segments[0];
      if (root === "research") {
        page = "research";
        if (segments[1]) {
          params.set("slug", segments[1]);
        }
        fromPath = true;
      } else if (root === "blog") {
        page = "research";
        alias = true;
        if (segments[1]) {
          params.set("slug", segments[1]);
        }
        fromPath = true;
      } else if (root === "about") {
        page = "about";
        fromPath = true;
      } else if (root === "methodology") {
        page = "methodology";
        fromPath = true;
      } else if (root === "privacy-policy") {
        page = "privacy-policy";
        fromPath = true;
      } else if (root === "terms") {
        page = "terms";
        fromPath = true;
    } else if (root === "faq") {
      page = "faq";
      fromPath = true;
    } else if (root === "ea-arena") {
      page = "ea-arena";
      fromPath = true;
    }
    }
  }
  if (page === "blog") {
    page = "research";
    alias = true;
  }
  return { page: page || "home", params, fromPath: fromPath && !hasPageParam, alias };
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

function buildCompareShareUrl(instrument, windowLabel, strategies) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("page", "compare");
  if (instrument) url.searchParams.set("instrument", instrument);
  if (windowLabel) url.searchParams.set("window", windowLabel);
  if (strategies && strategies.length) {
    url.searchParams.set("strategies", strategies.join(","));
  }
  return url.toString();
}

function highlightNav(page) {
  const activePage = page;
  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === activePage);
  });
}

function defaultInstrument() {
  const instruments = store.performance.instruments || [];
  return instruments.length ? instruments[0].symbol : "SPY";
}

function defaultWindow() {
  return "1Y";
}

const HOME_ICONS = {
  arena: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V10M10 19V5M16 19v-7M22 19H2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  ea: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v4M9 13h.01M15 13h.01M9 16.5h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  ranking: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  compare: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l5-6 4 3 4-6 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};

const HOME_ROADMAP = [
  { key: "home.roadmap_item_heatmaps", done: true },
  { key: "home.roadmap_item_attribution", done: true },
  { key: "home.roadmap_item_search", done: true },
  { key: "home.roadmap_item_uploads", done: false },
  { key: "home.roadmap_item_intraday", done: false },
  { key: "home.roadmap_item_regime", done: false }
];

function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function renderHome() {
  const instrument = defaultInstrument();
  const window = defaultWindow();
  const topRows = buildLeaderboard(instrument, window)
    .sort((a, b) => b.metrics.arenaScore - a.metrics.arenaScore)
    .slice(0, 5);
  const updates = store.changelog.slice(0, 5);
  const researchArticles = sortResearchArticles(getResearchArticles());
  const featuredArticles = researchArticles.filter((article) => article.featured);
  const homeArticles = [
    ...featuredArticles.slice(0, 1),
    ...researchArticles.filter((article) => !featuredArticles.slice(0, 1).includes(article))
  ].slice(0, 3);
  const marketCount = (store.performance.instruments || []).filter(
    (item) => !store.strategies.some((s) => s.portfolioSymbol === item.symbol)
  ).length;
  const observedDates = Object.values(store.performance.marketData || {})
    .map((market) => market.asOf).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "")).sort();
  const updated = observedDates.length ? (observedDates[0] === observedDates[observedDates.length - 1]
    ? observedDates[0] : `${observedDates[0]} – ${observedDates[observedDates.length - 1]}`) : null;
  const recentHtml = typeof renderRecentlyViewed === "function" ? renderRecentlyViewed() : "";
  const explore = [
    { href: "?page=arena", icon: HOME_ICONS.arena, title: t("nav.arena"), desc: t("home.explore_arena_desc") },
    { href: "?page=ea-arena", icon: HOME_ICONS.ea, title: t("nav.ea_arena"), desc: t("home.ea_promo_desc", { count: store.eaCatalog.length }) },
    { href: "?page=ea-ranking", icon: HOME_ICONS.ranking, title: t("nav.ea_ranking"), desc: t("home.explore_ranking_desc") },
    { href: "?page=compare", icon: HOME_ICONS.compare, title: t("nav.compare"), desc: t("home.explore_compare_desc") }
  ];

  return `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">${t("home.hero_eyebrow")}</div>
        <h1>${t("meta.site_name")}</h1>
        <p>${t("home.hero_desc")}</p>
        <div class="hero-actions">
          <a class="button primary" href="?page=arena">${t("home.explore_arena")}</a>
          <a class="button ghost" href="?page=strategies">${t("home.browse_strategies")}</a>
        </div>
        <button class="hero-search" type="button" onclick="openSearch()">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13.2 13.2 L17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <span>${t("search.hero_placeholder")}</span>
          <kbd>/</kbd>
        </button>
      </div>
      <div class="hero-panel">
        <h3>${t("home.at_a_glance")}</h3>
        <div class="hero-stats">
          <a class="hero-stat" href="?page=strategies"><strong>${store.strategies.length}</strong><span>${t("home.stat_strategies")}</span></a>
          <a class="hero-stat" href="?page=ea-arena"><strong>${store.eaCatalog.length.toLocaleString()}</strong><span>${t("home.stat_eas")}</span></a>
          <a class="hero-stat" href="?page=arena"><strong>${marketCount}</strong><span>${t("home.stat_markets")}</span></a>
          <a class="hero-stat" href="?page=research"><strong>${researchArticles.length}</strong><span>${t("home.stat_articles")}</span></a>
        </div>
        <div class="hero-panel-foot">
          <span class="status-dot ${!hasLivePerformanceData() ? "warn" : typeof isPerformanceStale === "function" && isPerformanceStale() ? "stale" : "ok"}" aria-hidden="true"></span>
          ${updated ? t("home.data_as_of", { date: updated }) : t("home.daily_backtest")}
          <span class="muted">· ${t("home.data_source")}: yfinance</span>
        </div>
      </div>
    </section>

    ${recentHtml}

    <section class="section">
      <div class="explore-grid">
        ${explore
          .map(
            (item) => `
          <a class="explore-card" href="${item.href}">
            <span class="explore-icon">${item.icon}</span>
            <span class="explore-title">${item.title}<span class="explore-arrow" aria-hidden="true">→</span></span>
            <span class="explore-desc">${item.desc}</span>
          </a>`
          )
          .join("")}
      </div>
    </section>

    <section class="section">
      <div class="quick-links">
        <span class="quick-links-label">${t("home.new_tools")}</span>
        <a class="quick-link" href="?page=lab">${t("nav.lab")}</a>
        <a class="quick-link" href="/${getLang() === "zh" ? "zh/" : ""}signals/">${t("nav.signals")}</a>
        <a class="quick-link" href="/${getLang() === "zh" ? "zh/" : ""}heatmap/">${t("nav.heatmap")}</a>
        <a class="quick-link" href="/${getLang() === "zh" ? "zh/" : ""}reports/">${t("nav.reports")}</a>
        <a class="quick-link" href="/${getLang() === "zh" ? "zh/" : ""}glossary/">${t("nav.glossary")}</a>
        <a class="quick-link" href="/${getLang() === "zh" ? "zh/" : ""}ai-arena/">${t("nav.ai_arena")}</a>
        <a class="quick-link" href="/${getLang() === "zh" ? "zh/" : ""}frameworks/">${t("nav.frameworks")}</a>
      </div>
    </section>

    <section class="section split">
      <div class="card">
        <div class="card-head">
          <h3>${t("home.top_strategies_title", { window, instrument })}</h3>
          <a class="link small-link" href="?page=arena&instrument=${encodeURIComponent(instrument)}&window=${window}">${t("common.view_all")} →</a>
        </div>
        <ol class="rank-list">
          ${topRows
            .map(
              (row, index) => `
            <li>
              <span class="rank-badge rank-${index + 1}">${index + 1}</span>
              <a class="rank-name" href="?page=strategy&id=${row.strategy.id}&instrument=${encodeURIComponent(instrument)}&window=${window}">
                <strong>${row.strategy.id}</strong> ${row.strategy.name}
              </a>
              <span class="rank-score" title="${t("arena.score")}">${formatScore(row.metrics.arenaScore)}</span>
              <span class="rank-return ${row.metrics.totalReturn >= 0 ? "pos" : "neg"}">${formatPercent(row.metrics.totalReturn)}</span>
            </li>`
            )
            .join("")}
        </ol>
      </div>
      <div class="card">
        <div class="card-head">
          <h3>${t("home.latest_updates_title")}</h3>
          <a class="link small-link" href="?page=changelog">${t("common.view_all")} →</a>
        </div>
        <ul class="update-list">
          ${updates
            .map(
              (entry) => `
            <li>
              <time>${entry.date}</time>
              <span>${tc(entry.title)}</span>
            </li>`
            )
            .join("")}
        </ul>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2>${t("home.top_leaderboards_title")}</h2>
          <p>${t("home.top_leaderboards_desc")}</p>
        </div>
      </div>
      <div class="home-chart-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("home.chart_spy_1y_title")}</strong>
              <div class="muted">${t("home.chart_spy_1y_desc")}</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="home-chart-spy-1y"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("home.chart_spy_5y_title")}</strong>
              <div class="muted">${t("home.chart_spy_5y_desc")}</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="home-chart-spy-5y"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("home.chart_gld_1y_title")}</strong>
              <div class="muted">${t("home.chart_gld_1y_desc")}</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="home-chart-gld-1y"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("home.chart_eurusd_1y_title")}</strong>
              <div class="muted">${t("home.chart_eurusd_1y_desc")}</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="home-chart-eurusd-1y"></canvas>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2>${t("home.latest_research_title")}</h2>
          <p>${t("home.latest_research_desc")}</p>
        </div>
        <a class="button ghost small" href="?page=research">${t("common.view_all")}</a>
      </div>
      <div class="card-grid article-grid">
        ${homeArticles.map(renderArticleCard).join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2>${t("home.learn_method_title")}</h2>
          <p>${t("home.learn_method_desc")}</p>
        </div>
      </div>
      <div class="card-grid">
        <a class="card link-card" href="?page=methodology">
          <div class="eyebrow">${t("nav.methodology")}</div>
          <h3>${t("home.methodology_card_title")}</h3>
          <p>${t("home.methodology_card_desc")}</p>
        </a>
        <a class="card link-card" href="?page=about">
          <div class="eyebrow">${t("nav.about")}</div>
          <h3>${t("home.about_card_title")}</h3>
          <p>${t("home.about_card_desc")}</p>
        </a>
        <a class="card link-card" href="?page=faq">
          <div class="eyebrow">${t("nav.faq")}</div>
          <h3>${t("home.faq_card_title")}</h3>
          <p>${t("home.faq_card_desc")}</p>
        </a>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2>${t("home.future_updates_title")}</h2>
          <p>${t("home.future_updates_desc")}</p>
        </div>
      </div>
      <div class="card-grid two-col">
        <div class="card">
          <div class="eyebrow">${t("home.roadmap_eyebrow")}</div>
          <h3>${t("home.priority_upgrades_title")}</h3>
          <p>${t("home.priority_upgrades_desc")}</p>
          <ul class="roadmap-list">
            ${HOME_ROADMAP.map(
              (item) => `<li class="${item.done ? "done" : ""}"><span class="roadmap-status">${item.done ? t("home.roadmap_shipped") : t("home.roadmap_planned")}</span>${t(item.key)}</li>`
            ).join("")}
          </ul>
        </div>
        <div class="card">
          <div class="eyebrow">${t("home.membership_planned")}</div>
          <h3>${t("home.research_membership_title")}</h3>
          <p>${t("home.research_membership_desc")}</p>
          <ul class="roadmap-list">
            <li><span class="roadmap-status">${t("home.roadmap_planned")}</span>${t("home.membership_item_exports")}</li>
            <li><span class="roadmap-status">${t("home.roadmap_planned")}</span>${t("home.membership_item_downloads")}</li>
            <li><span class="roadmap-status">${t("home.roadmap_planned")}</span>${t("home.membership_item_watchlists")}</li>
            <li><span class="roadmap-status">${t("home.roadmap_planned")}</span>${t("home.membership_item_early_access")}</li>
          </ul>
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

function homeChartData(canvasId, instrument, window) {
  const precomputed = (store.homeCharts || []).find((chart) => chart.id === canvasId);
  if (precomputed) {
    return {
      labels: precomputed.dates,
      series: precomputed.series.map((item) => ({ id: item.id, values: item.values }))
    };
  }
  const leaderboard = buildLeaderboard(instrument, window)
    .sort((a, b) => b.metrics.arenaScore - a.metrics.arenaScore)
    .slice(0, 5);
  if (!leaderboard.length) return null;
  const baseSeries = sliceSeries(getSeries(leaderboard[0].strategy.id, instrument), window);
  return {
    labels: baseSeries.dates,
    series: leaderboard.map((row) => ({
      id: row.strategy.id,
      values: normalizeSeries(sliceSeries(getSeries(row.strategy.id, instrument), window)).strategy
    }))
  };
}

function drawHomeChart(canvasId, instrument, window) {
  const ctx = document.getElementById(canvasId);
  const chartData = ctx ? homeChartData(canvasId, instrument, window) : null;
  if (!chartData || !chartData.series.length) return;

  const labels = chartData.labels;
  const datasets = chartData.series.map((item, index) => {
    return {
      label: item.id,
      data: item.values,
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
    { value: "score", label: t("arena.score") },
    { value: "totalReturn", label: t("metric.total_return") },
    { value: "cagr", label: t("metric.cagr") },
    { value: "sharpe", label: t("metric.sharpe") },
    { value: "sortino", label: t("metric.sortino") },
    { value: "calmar", label: t("metric.calmar") },
    { value: "maxDrawdown", label: t("metric.max_drawdown") }
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
          <h2>${t("arena.title")}</h2>
          <p>${t("arena.desc")}</p>
          <a class="button ghost arena-cost-link" href="/${getLang() === "zh" ? "zh/" : ""}costs/">${t("arena.costs_link")}</a>
        </div>
        <details class="score-note">
          <summary>${t("arena.score_note_title")}</summary>
          <p>${t("arena.score_note_desc")}</p>
        </details>
      </div>

      <div class="filter-bar">
        <div class="filter-group">
          <label>${t("common.instrument")}</label>
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
          <label>${t("common.window")}</label>
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
          <label>${t("arena.ranking_metric")}</label>
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
          <label>${t("common.top_n")}</label>
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
          <label>${t("common.threshold")}</label>
          <div class="toggle">
            <input id="arena-threshold" type="checkbox" ${
              state.threshold ? "checked" : ""
            } />
            <span>${t("arena.trades_threshold")}</span>
          </div>
        </div>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>${t("common.rank")}</th>
              <th>${t("common.strategy")}</th>
              <th>
                <button data-sort="metric">${t("common.metric")}</button>
              </th>
              <th>
                <button data-sort="totalReturn">${t("common.return")}</button>
              </th>
              <th>
                <button data-sort="maxDrawdown">${t("metric.max_drawdown")}</button>
              </th>
              <th>${t("common.trades")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((row, index) => {
                const metricValue =
                  state.metric === "score"
                    ? row.metrics.scoreEligible === false
                      ? null
                      : row.metrics.arenaScore
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
                }&return=${returnTo}">${t("common.view_item")}</a>
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
  const label = active ? t("common.saved") : t("common.save");
  const icon = active ? "&#9733;" : "&#9734;";
  const classes =
    variant === "action"
      ? "button ghost favorite-action"
      : variant === "inline"
      ? "favorite-inline"
      : "favorite-toggle";
  return `
    <button class="${classes} ${active ? "active" : ""}" data-favorite="${strategyId}" type="button" aria-pressed="${active ? "true" : "false"}" title="${active ? t("common.remove_from_favorites") : t("common.add_to_favorites")}">
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
        <label>${t("common.instrument")}</label>
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
        <label>${t("common.window")}</label>
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
        <span class="muted">${t("arena.score")}</span>
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
        dataInstruments(strategy).includes(instrument)
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
            <h3>${t(group.labelKey)}</h3>
            <p class="muted">${t("strategy.category_ranking", { count: scored.length, instrument, window })}</p>
          </div>
          <a class="link" href="?page=strategies&tags=${encodeURIComponent(
            group.tag
          )}&view=list">${t("common.view_all")}</a>
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
        <h3>${t("strategy.no_matching_categories")}</h3>
        <p>${t("strategy.adjust_filters")}</p>
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
        <h3>${t("compare.not_enough_selected")}</h3>
        <p>${t("compare.select_two_for_correlation")}</p>
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
          <h2>${t("strategy.library_title")}</h2>
          <p>${t("strategy.library_desc")}</p>
        </div>
        <div class="chip-group">
          <button class="chip ${state.view === "grid" ? "active" : ""}" data-view="grid">${t("common.grid")}</button>
          <button class="chip ${state.view === "list" ? "active" : ""}" data-view="list">${t("common.list")}</button>
          <button class="chip ${state.view === "category" ? "active" : ""}" data-view="category">${t("common.category")}</button>
        </div>
      </div>

      <div class="filter-bar strategy-filter-bar">
        <div class="filter-group">
          <label for="strategy-search">${t("common.search")}</label>
          <input id="strategy-search" type="search" placeholder="${t("strategy.search_placeholder")}" value="${escapeHtml(
            state.query || ""
          )}" />
        </div>
        <div class="filter-group">
          <label>${t("common.tags")}</label>
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
              <a class="button ghost" href="?page=strategy&id=${strategy.id}">${t("common.view_strategy")}</a>
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
          <h2>${t("nav.favorites")}</h2>
          <p>${t("strategy.favorites_saved", { count: saved.length })}</p>
        </div>
        <div class="chip-group">
          <button class="chip ${state.view === "grid" ? "active" : ""}" data-view="grid">${t("common.grid")}</button>
          <button class="chip ${state.view === "list" ? "active" : ""}" data-view="list">${t("common.list")}</button>
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
                <a class="button ghost" href="?page=strategy&id=${strategy.id}">${t("common.view_strategy")}</a>
              </div>
            </div>`
            )
            .join("")}
        </div>
      `
          : `
        <div class="card">
          <h3>${t("strategy.no_favorites_title")}</h3>
          <p>${t("strategy.no_favorites_desc")}</p>
          <div class="hero-actions">
            <a class="button ghost" href="?page=strategies">${t("home.browse_strategies")}</a>
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
    return `<section class="section"><h2>${t("strategy.not_found")}</h2></section>`;
  }

  const instrument =
    route.params.get("instrument") || dataInstruments(strategy)[0] || defaultInstrument();
  const window = route.params.get("window") || defaultWindow();
  const benchmarkKey = route.params.get("benchmark") || "buy-hold";
  const benchmarkLabel = getBenchmarkLabel(benchmarkKey);
  const compareParam = route.params.get("compare");
  const compare = compareParam ? compareParam.split(",").filter(Boolean) : [];
  const compareList = (compare.length ? compare : strategy.recommendedCompare || []).filter((item) => dataInstruments(strategy).includes(item));
  const scale = route.params.get("scale") || "linear";
  const metrics = getMetricsFor(strategy.id, instrument, window);
  const returnTo = route.params.get("return");
  const snapshot = calcLatestSnapshot(getSeries(strategy.id, instrument));

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
                  )}">${t("common.back_to_arena")}</a>`
                : ""
            }
            ${renderFavoriteButton(strategy.id, "action")}
          </div>
        </div>
        <div class="info-grid">
          <div class="info-card">
            <span>${t("strategy.asset_fit")}</span>
            <strong>${strategy.assetClasses.join(", ")}</strong>
          </div>
          <div class="info-card">
            <span>${t("strategy.holding_period")}</span>
            <strong>${strategy.holdingPeriod}</strong>
          </div>
          <div class="info-card">
            <span>${t("strategy.frequency")}</span>
            <strong>${strategy.frequency}</strong>
          </div>
          <div class="info-card">
            <span>${t("strategy.latest_snapshot")}</span>
            <strong>${snapshot ? snapshot.date : "--"}</strong>
            <div class="muted">${t("strategy.snapshot_summary", { benchmark: snapshot ? formatPercent(snapshot.benchmarkMove, 2) : "--", strategy: snapshot ? formatPercent(snapshot.strategyMove, 2) : "--" })}</div>
          </div>
        </div>
      </div>

      <div class="control-bar">
        <div class="control-row">
          <div class="control-group">
            <label>${t("common.instrument")}</label>
            <select id="detail-instrument">
              ${dataInstruments(strategy)
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
            <label>${t("common.window")}</label>
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
            <label>${t("common.benchmark")}</label>
            <select id="detail-benchmark">
              ${BENCHMARK_OPTIONS.map(
                (option) => `
                <option value="${option.value}" ${
                  option.value === benchmarkKey ? "selected" : ""
                }>${t(option.labelKey)}</option>`
              ).join("")}
            </select>
          </div>
          <div class="control-group">
            <label>${t("common.scale")}</label>
            <div class="chip-group">
              <button class="chip ${scale === "linear" ? "active" : ""}" data-scale="linear">${t("common.linear")}</button>
              <button class="chip ${scale === "logarithmic" ? "active" : ""}" data-scale="logarithmic">${t("common.log")}</button>
            </div>
          </div>
        </div>
        <div class="compare-panel">
          <strong>${t("strategy.cross_asset_compare")}</strong>
          <div class="compare-options">
            ${dataInstruments(strategy)
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
              <strong>${t("strategy.equity_vs_benchmark")}</strong>
              <div class="muted">${t("strategy.benchmark_line", { instrument, window, benchmark: benchmarkLabel })}</div>
            </div>
            <div class="chart-actions">
              <button class="button ghost small" data-export-csv="strategy">${t("common.export_csv")}</button>
              <button class="button ghost small" data-export-chart="equity-chart" data-export-name="equity">${t("common.export_png")}</button>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="equity-chart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("strategy.cross_asset_comparison")}</strong>
              <div class="muted">${t("strategy.normalized_to_one")}</div>
            </div>
            <div class="chart-actions">
              <button class="button ghost small" data-export-chart="compare-chart" data-export-name="cross-asset">${t("common.export_png")}</button>
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
              <strong>${t("strategy.drawdown")}</strong>
              <div class="muted">${t("strategy.drawdown_desc")}</div>
            </div>
            <div class="chart-actions">
              <button class="button ghost small" data-export-chart="drawdown-chart" data-export-name="drawdown">${t("common.export_png")}</button>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="drawdown-chart"></canvas>
          </div>
        </div>
        <div class="chart-card heatmap-card">
          <div class="chart-header">
            <div>
              <strong>${t("strategy.monthly_heatmap")}</strong>
              <div class="muted">${t("strategy.heatmap_desc")}</div>
            </div>
          </div>
          <div class="heatmap-body" id="monthly-heatmap"></div>
        </div>
      </div>

      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("strategy.performance_attribution")}</strong>
              <div class="muted">${t("strategy.attribution_desc")}</div>
            </div>
            <div class="chart-actions">
              <button class="button ghost small" data-export-chart="attribution-chart" data-export-name="attribution">${t("common.export_png")}</button>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="attribution-chart"></canvas>
          </div>
          <div class="metric-grid attribution-metrics" id="attribution-summary"></div>
        </div>
      </div>

      <div class="chart-grid">
        <div class="chart-card heatmap-card">
          <div class="chart-header">
            <div>
              <strong>${t("strategy.parameter_sensitivity")}</strong>
              <div class="muted">${t("strategy.parameter_sensitivity_desc")}</div>
            </div>
          </div>
          <div class="heatmap-body" id="param-sensitivity"></div>
          <div id="param-robustness"></div>
        </div>
      </div>

      <div class="chart-grid rolling-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("strategy.rolling_sharpe")}</strong>
              <div class="muted">${t("strategy.rolling_window_desc", { days: ROLLING_WINDOW })}</div>
            </div>
            <div class="chart-actions">
              <button class="button ghost small" data-export-chart="rolling-sharpe" data-export-name="rolling-sharpe">${t("common.export_png")}</button>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="rolling-sharpe"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("strategy.rolling_volatility")}</strong>
              <div class="muted">${t("strategy.rolling_volatility_desc", { days: ROLLING_WINDOW })}</div>
            </div>
            <div class="chart-actions">
              <button class="button ghost small" data-export-chart="rolling-vol" data-export-name="rolling-volatility">${t("common.export_png")}</button>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="rolling-vol"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("strategy.rolling_beta")}</strong>
              <div class="muted">${t("strategy.rolling_beta_desc")}</div>
            </div>
            <div class="chart-actions">
              <button class="button ghost small" data-export-chart="rolling-beta" data-export-name="rolling-beta">${t("common.export_png")}</button>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="rolling-beta"></canvas>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-button active" data-tab="performance">${t("common.performance")}</button>
        <button class="tab-button" data-tab="risk">${t("common.risk")}</button>
        <button class="tab-button" data-tab="efficiency">${t("common.efficiency")}</button>
        <button class="tab-button" data-tab="trades">${t("common.trades")}</button>
        <button class="tab-button" data-tab="benchmark">${t("metric.vs_benchmark")}</button>
      </div>
      ${renderMetricTabs(metrics)}
      ${renderCostSlider(metrics)}
      ${renderScoreBreakdown(metrics)}

      <div class="section pseudocode">
        <details open>
          <summary>${t("strategy.pseudocode")}</summary>
          <pre><code>${buildPseudocode(strategy)}</code></pre>
          <button class="copy-button" data-copy>${t("common.copy")}</button>
        </details>
      </div>

      ${renderSimilarStrategies(strategy, instrument, window, benchmarkKey)}

      <div class="section note">
        <strong>${t("common.notes")}</strong>
        <div>${strategy.notes.join(" ")}</div>
        <div>${t("common.last_updated", { date: strategy.updated })}</div>
      </div>
    </section>
  `;
}

function renderMetricTabs(metrics) {
  return `
    <div class="tab-content active" data-panel="performance">
      <div class="metric-grid">
        ${metricTile(t("metric.total_return"), formatMetric(metrics.totalReturn, "totalReturn"))}
        ${metricTile(t("metric.cagr"), formatMetric(metrics.cagr, "cagr"))}
        ${metricTile(t("metric.best_month"), formatMetric(metrics.bestMonth, "totalReturn"))}
        ${metricTile(t("metric.worst_month"), formatMetric(metrics.worstMonth, "totalReturn"))}
        ${optionalTile(t("metric.positive_months"), metrics.posMonths, "totalReturn")}
        ${rangeTile(t("metric.cagr_range"), metrics.cagrLo, metrics.cagrHi)}
        ${optionalTile(t("metric.prob_loss"), metrics.probLoss, "totalReturn")}
      </div>
    </div>
    <div class="tab-content" data-panel="risk">
      <div class="metric-grid">
        ${metricTile(t("metric.max_drawdown"), formatMetric(metrics.maxDrawdown, "maxDrawdown"))}
        ${metricTile(t("metric.volatility"), formatMetric(metrics.volatility, "cagr"))}
        ${optionalTile(t("metric.ulcer_index"), metrics.ulcer, "totalReturn")}
        ${optionalTile(t("metric.max_dd_days"), metrics.maxDDDays, "days")}
        ${optionalTile(t("metric.underwater"), metrics.underwater, "totalReturn")}
        ${optionalTile(t("metric.var95"), metrics.var95, "totalReturn")}
        ${optionalTile(t("metric.cvar95"), metrics.cvar95, "totalReturn")}
        ${rangeTile(t("metric.max_dd_range"), metrics.maxDDLo, metrics.maxDDHi)}
      </div>
    </div>
    <div class="tab-content" data-panel="efficiency">
      <div class="metric-grid">
        ${metricTile(t("metric.sharpe"), formatMetric(metrics.sharpe, "ratio"))}
        ${metricTile(t("metric.sortino"), formatMetric(metrics.sortino, "ratio"))}
        ${metricTile(t("metric.calmar"), formatMetric(metrics.calmar, "ratio"))}
        ${optionalTile(t("metric.martin"), metrics.martin, "ratio")}
        ${optionalTile(t("metric.psr"), metrics.psr, "totalReturn")}
      </div>
    </div>
    <div class="tab-content" data-panel="trades">
      <div class="metric-grid">
        ${metricTile(t("metric.trades"), formatNumber(metrics.trades))}
        ${metricTile(t("metric.turnover_avg_daily"), formatMetric(metrics.turnover, "turnover"))}
        ${metricTile(t("metric.win_rate"), formatMetric(metrics.winRate, "totalReturn"))}
        ${metricTile(t("metric.profit_factor"), formatMetric(metrics.profitFactor, "ratio"))}
        ${optionalTile(t("metric.exposure"), metrics.exposure, "totalReturn")}
      </div>
    </div>
    <div class="tab-content" data-panel="benchmark">
      <div class="metric-grid">
        ${optionalTile(t("metric.bench_cagr"), metrics.benchCagr, "totalReturn")}
        ${optionalTile(t("metric.bench_max_dd"), metrics.benchMaxDrawdown, "totalReturn")}
        ${optionalTile(t("metric.alpha"), metrics.alpha, "totalReturn")}
        ${optionalTile(t("metric.beta"), metrics.beta, "ratio")}
        ${optionalTile(t("metric.correlation"), metrics.correlation, "ratio")}
        ${optionalTile(t("metric.info_ratio"), metrics.infoRatio, "ratio")}
        ${optionalTile(t("metric.up_capture"), metrics.upCapture, "totalReturn")}
        ${optionalTile(t("metric.down_capture"), metrics.downCapture, "totalReturn")}
        ${optionalTile(t("metric.cagr_after_costs"), metrics.costDrag === undefined || metrics.costDrag === null ? null : (metrics.cagr || 0) - metrics.costDrag, "totalReturn")}
        ${optionalTile(t("metric.dsr"), metrics.dsr, "totalReturn")}
      </div>
    </div>
  `;
}

// Bootstrap interval, e.g. "-3.10% to 12.40%".
function rangeTile(label, lo, hi) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return metricTile(label, "—");
  return metricTile(label, t("metric.range_value", { lo: formatPercent(lo, 1), hi: formatPercent(hi, 1) }));
}

function optionalTile(label, value, kind) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return metricTile(label, "—");
  }
  if (kind === "days") {
    return metricTile(label, t("metric.days_value", { days: Math.round(value) }));
  }
  return metricTile(label, formatMetric(value, kind));
}

// Rough cost model: every unit of turnover pays `bp` basis points.
function cagrAfterCost(metrics, bp) {
  if (!Number.isFinite(metrics.cagr) || !Number.isFinite(metrics.turnover)) return NaN;
  return metrics.cagr - metrics.turnover * 252 * (bp / 10000);
}

function renderCostSlider(metrics) {
  if (!Number.isFinite(metrics.turnover)) return "";
  const bp = 10;
  return `
    <div class="cost-slider card" data-cagr="${metrics.cagr}" data-turnover="${metrics.turnover}">
      <label for="cost-bp"><strong>${t("cost.title")}</strong> <span class="muted">${t("cost.desc")}</span></label>
      <div class="cost-row">
        <input id="cost-bp" type="range" min="0" max="50" step="1" value="${bp}" />
        <span class="cost-bp" data-cost-bp>${t("cost.bp", { bp })}</span>
        <span>${t("metric.cagr")}: <strong>${formatMetric(metrics.cagr, "cagr")}</strong> → <strong data-cost-cagr>${formatMetric(cagrAfterCost(metrics, bp), "cagr")}</strong></span>
      </div>
      <p class="muted small-note">${t("cost.note", { turnover: formatMetric(metrics.turnover * 252, "ratio") })}</p>
    </div>`;
}

function bindCostSlider() {
  const box = document.querySelector(".cost-slider");
  const input = document.getElementById("cost-bp");
  if (!box || !input) return;
  const metrics = { cagr: parseFloat(box.dataset.cagr), turnover: parseFloat(box.dataset.turnover) };
  input.addEventListener("input", () => {
    const bp = Number(input.value);
    box.querySelector("[data-cost-bp]").textContent = t("cost.bp", { bp });
    box.querySelector("[data-cost-cagr]").textContent = formatMetric(cagrAfterCost(metrics, bp), "cagr");
  });
}

const SCORE_PART_KEYS = ["quality", "drawdown", "consistency", "robustness", "significance"];

function renderScoreBreakdown(metrics) {
  if (metrics.scoreEligible === false) {
    return `<div class="score-breakdown card"><strong>${t("score.title")}: —</strong><p class="muted">${t("score.ineligible")}</p></div>`;
  }
  const parts = metrics.scoreParts;
  if (!parts) return "";
  return `
    <div class="score-breakdown card">
      <div class="score-breakdown-head">
        <strong>${t("score.title")}: ${formatMetric(metrics.arenaScore, "score")}</strong>
        <a class="link small-link" href="/${getLang() === "zh" ? "zh/" : ""}glossary/arena-score/">${t("score.how")}</a>
      </div>
      ${SCORE_PART_KEYS.map((key) => {
        const value = parts[key];
        const width = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value));
        return `<div class="score-line" title="${t(`score.${key}_desc`)}"><span>${t(`score.${key}`)}</span><span class="score-track"><span style="width:${width}%"></span></span><strong>${value === null || value === undefined ? "—" : Math.round(value)}</strong></div>`;
      }).join("")}
      <p class="muted small-note">${t("score.note")}</p>
    </div>`;
}

function metricTile(label, value) {
  return `<div class="metric-tile"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderSimilarStrategies(strategy, instrument, window, benchmarkKey) {
  const similar = getSimilarStrategies(strategy, instrument, window, 4);
  const benchmarkParam = benchmarkKey ? `&benchmark=${benchmarkKey}` : "";
  if (!similar.length) {
    return `
      <div class="section">
        <div class="section-header">
          <div>
            <h2>${t("strategy.similar_title")}</h2>
            <p>${t("strategy.similar_desc")}</p>
          </div>
        </div>
        <div class="card">
          <p class="muted">${t("strategy.no_similar")}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="section">
      <div class="section-header">
        <div>
          <h2>${t("strategy.similar_title")}</h2>
          <p>${t("strategy.similar_desc_window", { instrument, window })}</p>
        </div>
      </div>
      <div class="card-grid">
        ${similar
          .map((entry) => {
            const sharedTags = entry.sharedTags.length
              ? entry.sharedTags.map((tag) => `<span class="tag">${tag}</span>`).join("")
              : `<span class="muted">${t("strategy.no_shared_tags")}</span>`;
            const tagPercent = Math.round(entry.tagScore * 100);
            const corrLabel =
              entry.corr === null || entry.corr === undefined
                ? "N/A"
                : entry.corr.toFixed(2);
            return `
              <div class="card">
                <div class="eyebrow">${entry.strategy.id}</div>
                <h3>${entry.strategy.name}</h3>
                <p>${entry.strategy.summary}</p>
                <div class="tag-row">${sharedTags}</div>
                <div class="stat-grid similar-meta">
                  <div class="stat"><span>${t("strategy.tag_match")}</span><span>${tagPercent}%</span></div>
                  <div class="stat"><span>${t("strategy.return_corr")}</span><span>${corrLabel}</span></div>
                </div>
                <div class="hero-actions">
                  <a class="button ghost small" href="?page=strategy&id=${entry.strategy.id}&instrument=${instrument}&window=${window}${benchmarkParam}">${t("common.view_strategy")}</a>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function getSimilarStrategies(baseStrategy, instrument, window, limit) {
  const baseTags = baseStrategy.tags || [];
  const candidates = store.strategies.filter(
    (strategy) =>
      strategy.id !== baseStrategy.id && dataInstruments(strategy).includes(instrument)
  );
  const scored = candidates.map((candidate) => {
    const tagScore = getTagSimilarity(baseTags, candidate.tags || []);
    const sharedTags = baseTags.filter((tag) => candidate.tags?.includes(tag));
    const corr = getCorrelationScore(baseStrategy.id, candidate.id, instrument, window);
    const corrScore = corr === null ? 0 : Math.max(0, corr);
    const score = tagScore * 0.6 + corrScore * 0.4;
    return {
      strategy: candidate,
      score,
      tagScore,
      corr,
      sharedTags
    };
  });
  return scored
    .filter((entry) => entry.tagScore > 0 || (entry.corr !== null && entry.corr > 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function getTagSimilarity(tagsA, tagsB) {
  if (!tagsA.length || !tagsB.length) return 0;
  const setA = new Set(tagsA);
  const setB = new Set(tagsB);
  let intersection = 0;
  setA.forEach((tag) => {
    if (setB.has(tag)) intersection += 1;
  });
  const union = new Set([...setA, ...setB]).size;
  return union ? intersection / union : 0;
}

function getCorrelationScore(baseId, candidateId, instrument, window) {
  const baseSeries = sliceSeries(getSeries(baseId, instrument), window);
  const candidateSeries = sliceSeries(getSeries(candidateId, instrument), window);
  const minLen = Math.min(
    baseSeries.strategy.length,
    candidateSeries.strategy.length
  );
  if (!minLen || minLen < 30) return null;
  const baseReturns = pctChange(baseSeries.strategy.slice(-minLen));
  const candidateReturns = pctChange(candidateSeries.strategy.slice(-minLen));
  const minReturns = Math.min(baseReturns.length, candidateReturns.length);
  if (!minReturns || minReturns < 20) return null;
  const value = correlation(
    baseReturns.slice(-minReturns),
    candidateReturns.slice(-minReturns)
  );
  return Number.isFinite(value) ? value : null;
}

function getResearchArticles() {
  if (typeof RESEARCH_ARTICLES === "undefined" || !Array.isArray(RESEARCH_ARTICLES)) return [];
  // Articles dated after the latest data build are scheduled. They appear with
  // the build that also generates their static page (scripts/static_site.py).
  const cutoff = (store.performance && store.performance.updated) || new Date().toISOString().slice(0, 10);
  return RESEARCH_ARTICLES.filter((article) => !article.date || article.date <= cutoff);
}

function sortResearchArticles(articles) {
  return [...articles].sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );
}

function getResearchArticle(slug) {
  return getResearchArticles().find((article) => article.slug === slug);
}

function buildResearchUrl(slug) {
  return `?page=research&slug=${encodeURIComponent(slug)}`;
}

function renderArticleMeta(article) {
  const asOf = article.dataAsOf ? (getLang() === "zh" ? `数据截至 ${article.dataAsOf}` : `Data as of ${article.dataAsOf}`) : "";
  const parts = [article.date, article.readTime, article.category, asOf].filter(
    Boolean
  );
  return parts.length ? `<div class="article-meta">${parts.join(" • ")}</div>` : "";
}

function renderTagRow(tags) {
  if (!tags || !tags.length) return "";
  return `
    <div class="tag-row">
      ${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
    </div>
  `;
}

function renderArticleCard(article) {
  if (!article) return "";
  const featuredBadge = article.featured
    ? `<span class="badge">${t("common.featured")}</span>`
    : "";
  return `
    <a class="card article-card" href="${buildResearchUrl(article.slug)}">
      <div class="article-card-header">
        ${featuredBadge}
        ${renderArticleMeta(article)}
      </div>
      <h3>${tc(article.title)}</h3>
      <p>${tc(article.summary)}</p>
      ${renderTagRow(article.tags)}
      <span class="read-more">${t("common.read_article")} <span aria-hidden="true">→</span></span>
    </a>
  `;
}

// A paragraph is a string; a bullet list is an array of strings. **bold** is supported.
function contentInline(text) {
  return escapeHtml(String(text ?? "")).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderContentBlock(block) {
  if (Array.isArray(block)) return `<ul>${block.map((item) => `<li>${contentInline(item)}</li>`).join("")}</ul>`;
  return `<p>${contentInline(block)}</p>`;
}

function renderContentSections(sections) {
  return (sections || [])
    .map(
      (section) => `
    <section class="content-section">
      <h3>${tc(section.heading)}</h3>
      ${(tc(section.paragraphs) || []).map(renderContentBlock).join("")}
    </section>
  `
    )
    .join("");
}

function renderContentPage(key) {
  const pages = typeof CONTENT_PAGES === "undefined" ? null : CONTENT_PAGES;
  const page = pages ? pages[key] : null;
  if (!page) {
    return `<section class="section"><h2>${t("common.not_found")}</h2></section>`;
  }
  const meta = page.updated ? t("common.updated", { date: page.updated }) : "";
  return `
  <section class="section content-page">
    <div class="content-hero">
      <div>
        <h2>${tc(page.title)}</h2>
        <p>${tc(page.subtitle)}</p>
          ${meta ? `<div class="content-meta">${meta}</div>` : ""}
        </div>
      </div>
      <article class="content-article">
        ${renderContentSections(page.sections)}
      </article>
    </section>
  `;
}

function renderPolicyPage(key) {
  return renderContentPage(key);
}

function renderResearchIndex() {
  const articles = sortResearchArticles(getResearchArticles());
  const featured = articles.filter((article) => article.featured).slice(0, 3);
  const allArticles = articles;
  const featuredList = featured.length ? featured : allArticles.slice(0, 3);
  const researchMeta =
    typeof RESEARCH_INDEX === "undefined" ? null : RESEARCH_INDEX;
  const intro = researchMeta ? tc(researchMeta.intro) : "";
  const note = researchMeta ? tc(researchMeta.note) : "";
  return `
  <section class="section content-page">
    <div class="content-hero">
      <div>
        <h2>${researchMeta ? tc(researchMeta.title) : t("nav.research")}</h2>
        <p>${intro}</p>
        <div class="content-meta">${note}</div>
        </div>
      </div>
      <div class="content-body">
        <div class="section-header">
          <div>
            <h2>${t("research.featured_title")}</h2>
            <p>${t("research.featured_desc")}</p>
          </div>
        </div>
        <div class="card-grid article-grid">
          ${featuredList.map(renderArticleCard).join("")}
        </div>

        <div class="section-header">
          <div>
            <h2>${t("research.all_title")}</h2>
            <p>${t("research.all_desc")}</p>
          </div>
        </div>
        <div class="card-grid article-grid">
          ${allArticles.map(renderArticleCard).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderResearchArticle(route) {
  const slug = route.params.get("slug");
  const article = slug ? getResearchArticle(slug) : null;
  if (!article) {
    return `
      <section class="section">
        <h2>${t("research.article_not_found")}</h2>
        <p>${t("research.return_to_index_prefix")} <a class="link" href="?page=research">${t("research.index_label")}</a>.</p>
      </section>
    `;
  }
  const figure = article.figure
    ? `
      <figure class="article-figure">
        ${article.figure.svg}
        <figcaption>${tc(article.figure.caption)}</figcaption>
      </figure>
    `
    : "";
  return `
    <section class="section content-page">
      <div class="content-hero">
        <div>
      <div class="eyebrow">${article.category}</div>
      <h2>${tc(article.title)}</h2>
      <p>${tc(article.summary)}</p>
          ${renderArticleMeta(article)}
          ${renderTagRow(article.tags)}
        </div>
      </div>
      <article class="content-article">
        ${figure}
        ${renderContentSections(article.sections)}
        <div class="content-disclaimer">
          ${t("common.research_only")}
        </div>
      </article>
      <div class="content-footer">
        <a class="link" href="?page=research">${t("common.back_to_research")}</a>
      </div>
    </section>
  `;
}

function renderFaq() {
  const items =
    typeof FAQ_ITEMS === "undefined" ? [] : Array.isArray(FAQ_ITEMS) ? FAQ_ITEMS : [];
  return `
    <section class="section content-page">
      <div class="content-hero">
        <div>
          <h2>${t("faq.title")}</h2>
          <p>${t("faq.desc")}</p>
        </div>
      </div>
      <div class="faq-grid">
        ${items
          .map(
            (item) => `
      <div class="card faq-card">
        <h3>${tc(item.question)}</h3>
        <p>${tc(item.answer)}</p>
      </div>
        `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderMethodology() {
  return renderContentPage("methodology");
}

function renderChangelog() {
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>${t("changelog.title")}</h2>
          <p>${t("changelog.desc")}</p>
        </div>
      </div>
      <div class="timeline">
        ${store.changelog
          .map(
            (entry) => `
          <div class="card timeline-item">
            <time class="timeline-date">${entry.date}</time>
            <h3>${tc(entry.title)}</h3>
            <p>${tc(entry.details)}</p>
            ${
              entry.strategyId
                ? `<a class="link" href="?page=strategy&id=${entry.strategyId}">${t("common.view_strategy")}</a>`
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
  return renderContentPage("about");
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
    ? t("compare.using_selected")
    : t("compare.using_top");
  const selectionCount = selectedStrategies.length;
  const hasSelection = selectionCount >= 2;
  const selectionNote = t("compare.selection_count", { count: selectionCount });
  const emptyMessage =
    selectionCount === 1
      ? t("compare.select_at_least_two")
      : t("compare.select_above");

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>${t("compare.title")}</h2>
          <p>${t("compare.desc")}</p>
        </div>
      </div>

      <div class="compare-controls">
        <div class="filter-bar">
          <div class="filter-group">
            <label>${t("common.instrument")}</label>
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
            <label>${t("common.window")}</label>
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
          <div class="strategy-selector-header">
            <label>${t("compare.select_strategies")}</label>
            <span class="muted">${selectionNote}</span>
          </div>
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
        hasSelection
          ? `
        <div class="chart-card compare-chart-card">
          <div class="chart-header">
            <div>
              <strong>${t("compare.equity_curves")}</strong>
              <div class="muted">${instrument} - ${window} (${t("compare.normalized_to_one")})</div>
            </div>
            <div class="chart-actions">
              <button class="button ghost small" data-compare-share>${t("common.copy_share_link")}</button>
              <button class="button ghost small" data-export-chart="compare-main-chart" data-export-name="comparison">${t("common.export_png")}</button>
            </div>
          </div>
          <div class="chart-body compare-chart-body">
            <canvas id="compare-main-chart"></canvas>
          </div>
        </div>

        <div class="compare-table-card">
          <div class="compare-table-header">
            <h3>${t("compare.performance_metrics")}</h3>
            <div class="chart-actions">
              <button class="button ghost small" data-export-compare="csv">${t("common.export_csv")}</button>
              <button class="button ghost small" data-export-compare="report">${t("common.export_report")}</button>
            </div>
          </div>
          <div class="table-scroll">
            <table class="compare-table">
              <thead>
                <tr>
                  <th>${t("common.metric")}</th>
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
          <p>${emptyMessage}</p>
        </div>
      `
      }
    </section>
    <section class="section">
      <div class="section-header">
        <div>
          <h2>${t("compare.correlation_matrix")}</h2>
          <p>${t("compare.correlation_desc", { instrument, window, note: correlationNote })}</p>
        </div>
      </div>
      ${renderCorrelationMatrix(correlationStrategies, instrument, window)}
    </section>
    ${renderPortfolioSection(selectedStrategies, instrument, window)}
  `;
}

function renderCompareMetricRows(strategies, instrument, window) {
  const metricsData = strategies.map((s) => getMetricsFor(s.id, instrument, window));

  return COMPARE_METRICS
    .map((config) => {
      const values = metricsData.map((m) => m[config.key]);
      const numericValues = values.filter((value) => Number.isFinite(value));
      const best = numericValues.length ? Math.max(...numericValues) : null;
      const worst = numericValues.length ? Math.min(...numericValues) : null;

      return `
        <tr>
          <td>${t(config.labelKey)}</td>
          ${values
            .map((value) => {
              const formatted = formatCompareValue(value, config.format);
              const isBest = best !== null && value === best;
              const isWorst = worst !== null && value === worst;

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
  const selectedStrategies = selected
    .map((id) => store.strategies.find((strategy) => strategy.id === id))
    .filter(Boolean);

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
  if (selected.length >= 2) {
    drawCompareChart(selected, instrument, window);
  }

  document.querySelectorAll("[data-export-chart]").forEach((button) => {
    button.addEventListener("click", () => {
      const chartId = button.dataset.exportChart;
      if (!chartId) return;
      const exportName = button.dataset.exportName || chartId;
      const filename = `compare-${instrument}-${window}-${exportName}.png`;
      downloadCanvasAsPng(chartId, filename);
    });
  });

  document.querySelectorAll("[data-export-compare]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!selectedStrategies.length) return;
      const action = button.dataset.exportCompare;
      if (action === "csv") {
        downloadCompareCsv(selectedStrategies, instrument, window);
      } else if (action === "report") {
        downloadCompareReport(selectedStrategies, instrument, window);
      }
    });
  });

  const shareButton = document.querySelector("[data-compare-share]");
  if (shareButton) {
    if (selected.length < 2) {
      shareButton.setAttribute("disabled", "disabled");
    } else {
      shareButton.removeAttribute("disabled");
    }
    shareButton.addEventListener("click", () => {
      if (selected.length < 2) return;
      const url = buildCompareShareUrl(instrument, window, selected);
      copyToClipboard(url);
      shareButton.textContent = t("common.copied");
      setTimeout(() => {
        shareButton.textContent = t("common.copy_share_link");
      }, 1500);
    });
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

  const benchmarkSelect = document.getElementById("detail-benchmark");
  if (benchmarkSelect) {
    benchmarkSelect.addEventListener("change", (event) => {
      updateQuery({ page: "strategy", id: strategyId, benchmark: event.target.value });
    });
  }

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
      copyToClipboard(text);
      copy.textContent = t("common.copied");
      setTimeout(() => {
        copy.textContent = t("common.copy");
      }, 1500);
    });
  }

  const strategy = store.strategies.find((item) => item.id === strategyId);
  const exportInstrument =
    route.params.get("instrument") ||
    strategy?.instruments?.[0] ||
    defaultInstrument();
  const exportWindow = route.params.get("window") || defaultWindow();

  const exportCsvButton = document.querySelector("[data-export-csv='strategy']");
  if (exportCsvButton && strategy) {
    exportCsvButton.addEventListener("click", () => {
      downloadStrategyCsv(strategyId, exportInstrument, exportWindow);
    });
  }

  document.querySelectorAll("[data-export-chart]").forEach((button) => {
    button.addEventListener("click", () => {
      const chartId = button.dataset.exportChart;
      if (!chartId) return;
      const exportName = button.dataset.exportName || chartId;
      const filename = `${strategyId}-${exportInstrument}-${exportWindow}-${exportName}.png`;
      downloadCanvasAsPng(chartId, filename);
    });
  });

  bindFavoriteButtons();

  drawStrategyCharts(route);
}

function drawStrategyCharts(route) {
  const strategyId = route.params.get("id") || store.strategies[0].id;
  const strategy = store.strategies.find((item) => item.id === strategyId);
  if (!strategy) return;

  const instrument =
    route.params.get("instrument") || dataInstruments(strategy)[0] || defaultInstrument();
  const window = route.params.get("window") || defaultWindow();
  const compareParam = route.params.get("compare");
  const compare = compareParam ? compareParam.split(",").filter(Boolean) : [];
  const compareList = (compare.length ? compare : strategy.recommendedCompare || []).filter((item) => dataInstruments(strategy).includes(item));
  const scale = route.params.get("scale") || "linear";
  const benchmarkKey = route.params.get("benchmark") || "buy-hold";

  const series = getSeries(strategy.id, instrument);
  const windowed = sliceSeries(series, window);
  const benchmarkSeries = buildBenchmarkSeries(benchmarkKey, instrument, window);
  const aligned = alignBenchmarkToStrategy(windowed, benchmarkSeries.series);

  const equityCtx = document.getElementById("equity-chart");
  if (equityCtx) {
    registerChart(
      new Chart(equityCtx, {
        type: "line",
        data: {
          labels: aligned.dates,
          datasets: [
            {
              label: t("common.strategy"),
              data: aligned.strategy,
              borderColor: "#1f6f78",
              backgroundColor: "rgba(31, 111, 120, 0.2)",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25
            },
            {
              label: benchmarkSeries.label,
              data: aligned.benchmark,
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
              label: t("strategy.drawdown"),
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
                label: (context) => `${t("strategy.drawdown")}: ${(context.raw * 100).toFixed(2)}%`
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

  drawAttribution(aligned);
  renderParamSensitivity(strategy.id, instrument);
  renderParamRobustness(strategy.id, instrument);
  drawRollingMetrics(windowed);
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
    .filter((strategy) => dataInstruments(strategy).includes(instrument))
    .map((strategy) => ({ strategy, metrics: getMetricsFor(strategy.id, instrument, window) }))
    .filter((row) => !row.metrics.missing)
    .map(({ strategy, metrics }) => {
      // Only fall back to the local formula when the data has no score at all;
      // 0 is a real score (unranked strategies get 0 and scoreEligible=false).
      const arenaScore = metrics.arenaScore ?? calcArenaScore(metrics);
      return { strategy, metrics: arenaScore === metrics.arenaScore ? metrics : { ...metrics, arenaScore } };
    });
}

function sortRows(rows, sort, dir, metric) {
  const direction = dir === "asc" ? 1 : -1;
  const key = sort === "metric" ? metric : sort;
  return [...rows].sort((a, b) => {
    const valueA = valueForSort(a.metrics, key);
    const valueB = valueForSort(b.metrics, key);
    if (valueA !== valueB) return (valueA - valueB) * direction;
    // Equal scores: higher Sharpe first, then id, so the order never depends on data order.
    const sharpeDiff = (b.metrics.sharpe ?? -Infinity) - (a.metrics.sharpe ?? -Infinity);
    if (sharpeDiff) return sharpeDiff;
    return String(a.strategy?.id || "").localeCompare(String(b.strategy?.id || ""));
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

// Markets a strategy actually has backtest results for. With live data we
// never fall back to generated placeholder series.
function dataInstruments(strategy) {
  const metrics = store.performance.strategies?.[strategy.id]?.metrics;
  if (!hasLivePerformanceData() || !metrics) return strategy.instruments;
  const withData = strategy.instruments.filter((item) => metrics[item]);
  const extra = Object.keys(metrics).filter((item) => !withData.includes(item));
  return [...withData, ...extra];
}

const MISSING_METRICS = Object.freeze({
  missing: true,
  totalReturn: NaN,
  cagr: NaN,
  sharpe: NaN,
  sortino: NaN,
  calmar: NaN,
  maxDrawdown: NaN,
  volatility: NaN,
  winRate: NaN,
  profitFactor: NaN,
  trades: NaN,
  turnover: NaN,
  arenaScore: 0,
  scoreEligible: false
});

function getMetricsFor(strategyId, instrument, window) {
  const perf = store.performance.strategies?.[strategyId] || {};
  const metrics = perf.metrics?.[instrument]?.[window];
  if (metrics) {
    const ext = store.metricsExt?.[strategyId]?.[instrument]?.[window];
    return ext ? { ...metrics, ...ext } : metrics;
  }
  if (hasLivePerformanceData()) {
    return MISSING_METRICS;
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
  if (!perf.equity?.[instrument] && isEquityPending(instrument)) {
    // Safety net for pages that did not preload this instrument.
    queueRenderAfterEquity(instrument);
  }
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

function getBenchmarkLabel(value) {
  const option = BENCHMARK_OPTIONS.find((item) => item.value === value);
  return option ? t(option.labelKey) : t("benchmark.buy_hold");
}

function getBenchmarkSeries(symbol) {
  const strategies = store.performance.strategies || {};
  for (const strategyId of Object.keys(strategies)) {
    const entry = strategies[strategyId];
    const equity = entry.equity?.[symbol];
    if (equity && equity.dates && equity.benchmark) {
      return { dates: equity.dates, values: equity.benchmark };
    }
  }
  return null;
}

function getStrategySeriesForSymbol(symbol) {
  const strategies = store.performance.strategies || {};
  for (const strategyId of Object.keys(strategies)) {
    const entry = strategies[strategyId];
    const equity = entry.equity?.[symbol];
    if (equity && equity.dates && equity.strategy) {
      return { dates: equity.dates, values: equity.strategy };
    }
  }
  return null;
}

function sliceBenchmarkSeries(series, window) {
  if (!series) return null;
  const wrapped = {
    dates: series.dates,
    strategy: series.values,
    benchmark: series.values
  };
  const sliced = sliceSeries(wrapped, window);
  return { dates: sliced.dates, values: sliced.strategy };
}

function alignBenchmarkToStrategy(strategySeries, benchmarkSeries) {
  if (!benchmarkSeries) {
    return {
      dates: strategySeries.dates,
      strategy: strategySeries.strategy,
      benchmark: strategySeries.benchmark
    };
  }
  const lookup = new Map(
    benchmarkSeries.dates.map((date, index) => [date, benchmarkSeries.values[index]])
  );
  const dates = [];
  const strategyValues = [];
  const benchmarkValues = [];
  strategySeries.dates.forEach((date, index) => {
    const value = lookup.get(date);
    if (value === undefined) return;
    dates.push(date);
    strategyValues.push(strategySeries.strategy[index]);
    benchmarkValues.push(value);
  });
  if (!dates.length) {
    return {
      dates: strategySeries.dates,
      strategy: strategySeries.strategy,
      benchmark: strategySeries.benchmark
    };
  }
  return { dates, strategy: strategyValues, benchmark: benchmarkValues };
}

function buildBlendBenchmark(symbolA, symbolB, weightA, window) {
  const seriesA = sliceBenchmarkSeries(getBenchmarkSeries(symbolA), window);
  const seriesB = sliceBenchmarkSeries(getBenchmarkSeries(symbolB), window);
  if (!seriesA || !seriesB) return null;
  const minLen = Math.min(seriesA.values.length, seriesB.values.length);
  if (!minLen || minLen < 2) return null;
  const valuesA = seriesA.values.slice(-minLen);
  const valuesB = seriesB.values.slice(-minLen);
  const returnsA = pctChange(valuesA);
  const returnsB = pctChange(valuesB);
  const blendReturns = returnsA.map(
    (value, index) => weightA * value + (1 - weightA) * returnsB[index]
  );
  const values = [1];
  blendReturns.forEach((ret) => {
    values.push(round(values[values.length - 1] * (1 + ret), 4));
  });
  const dates = seriesA.dates.slice(seriesA.dates.length - values.length);
  return { dates, values };
}

function buildBenchmarkSeries(benchmarkKey, instrument, window) {
  let label = getBenchmarkLabel(benchmarkKey);
  let series = null;
  switch (benchmarkKey) {
    case "spy":
      series = sliceBenchmarkSeries(getBenchmarkSeries("SPY"), window);
      break;
    case "60-40":
      series = buildBlendBenchmark("SPY", "GLD", 0.6, window);
      break;
    case "risk-parity":
      series = sliceBenchmarkSeries(getStrategySeriesForSymbol("RISK-PARITY"), window);
      break;
    case "buy-hold":
    default:
      series = sliceBenchmarkSeries(getBenchmarkSeries(instrument), window);
      label = getBenchmarkLabel("buy-hold");
      break;
  }
  if (!series) {
    return {
      label: getBenchmarkLabel("buy-hold"),
      series: null
    };
  }
  return { label, series };
}

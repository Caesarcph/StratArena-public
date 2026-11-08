// Site-wide UI helpers: search palette, nav dropdown, back-to-top,
// reading progress, recently viewed, and data-status notices.

const RECENT_KEY = "recentlyViewed";
const RECENT_LIMIT = 8;
const SEARCH_GROUP_LIMIT = 6;
const PERFORMANCE_PAGES = new Set(["home", "arena", "strategy", "compare", "favorites"]);

const SEARCH_PAGES = [
  { page: "home", key: "nav.home" },
  { page: "arena", key: "nav.arena" },
  { page: "ea-arena", key: "nav.ea_arena" },
  { page: "ea-ranking", key: "nav.ea_ranking" },
  { page: "strategies", key: "nav.strategies" },
  { page: "compare", key: "nav.compare" },
  { page: "research", key: "nav.research" },
  { page: "favorites", key: "nav.favorites" },
  { page: "methodology", key: "nav.methodology" },
  { page: "changelog", key: "nav.changelog" },
  { page: "faq", key: "nav.faq" },
  { page: "about", key: "nav.about" }
];

const ICONS = {
  sun: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 1.8v2.2M10 16v2.2M1.8 10H4M16 10h2.2M4.2 4.2l1.6 1.6M14.2 14.2l1.6 1.6M4.2 15.8l1.6-1.6M14.2 5.8l1.6-1.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  moon: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  page: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h6.5L15 6v11.5H5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M11.5 2.5V6H15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  strategy: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 14.5 7.5 9.5l3.5 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ea: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="5.5" width="13" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 2.5v3M7.5 10h.01M12.5 10h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  article: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3.5h12v13H4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 7.5h6M7 10.5h6M7 13.5h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
};

function uiEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // Storage can be unavailable (private mode); features degrade quietly.
  }
}

/* ---------- Theme icons ---------- */

function themeIconSvg(theme) {
  // Show the icon for the theme you would switch to.
  return theme === "dark" ? ICONS.sun : ICONS.moon;
}

/* ---------- Recently viewed ---------- */

function loadRecentVisits() {
  try {
    const parsed = JSON.parse(safeStorageGet(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.type && item.id) : [];
  } catch (err) {
    return [];
  }
}

function recordRecentVisit(route) {
  if (!route) return;
  const id = route.params?.get("id") || route.params?.get("slug");
  let entry = null;
  if (route.page === "strategy" && id) {
    if (!store.strategies.some((item) => item.id === id)) return;
    entry = { type: "strategy", id };
  } else if (route.page === "ea-detail" && id) {
    entry = { type: "ea", id };
  } else if (route.page === "research" && route.params?.get("slug")) {
    if (typeof getResearchArticle === "function" && !getResearchArticle(id)) return;
    entry = { type: "article", id };
  }
  if (!entry) return;
  const next = [entry, ...loadRecentVisits().filter((item) => !(item.type === entry.type && item.id === entry.id))];
  safeStorageSet(RECENT_KEY, JSON.stringify(next.slice(0, RECENT_LIMIT)));
}

function describeRecent(item) {
  if (item.type === "strategy") {
    const strategy = store.strategies.find((s) => s.id === item.id);
    if (!strategy) return null;
    return {
      icon: ICONS.strategy,
      kind: t("recent.kind_strategy"),
      title: `${strategy.id} ${strategy.name}`,
      href: `?page=strategy&id=${encodeURIComponent(strategy.id)}`
    };
  }
  if (item.type === "ea") {
    const ea = (store.eaCatalog || []).find((e) => e.id === item.id);
    return {
      icon: ICONS.ea,
      kind: "EA",
      title: ea ? `${ea.id} · ${ea.name || t("common.unknown")}` : item.id,
      href: `?page=ea-detail&id=${encodeURIComponent(item.id)}`
    };
  }
  if (item.type === "article" && typeof getResearchArticle === "function") {
    const article = getResearchArticle(item.id);
    if (!article) return null;
    return {
      icon: ICONS.article,
      kind: t("recent.kind_article"),
      title: tc(article.title),
      href: buildResearchUrl(article.slug)
    };
  }
  return null;
}

function renderRecentlyViewed() {
  const items = loadRecentVisits().map(describeRecent).filter(Boolean).slice(0, 6);
  if (!items.length) return "";
  return `
    <section class="section recent-section">
      <div class="section-header">
        <div>
          <h2>${t("recent.title")}</h2>
          <p>${t("recent.desc")}</p>
        </div>
        <button class="button ghost small" type="button" data-clear-recent>${t("recent.clear")}</button>
      </div>
      <div class="recent-list">
        ${items
          .map(
            (item) => `
          <a class="recent-item" href="${item.href}">
            <span class="recent-icon">${item.icon}</span>
            <span class="recent-text">
              <span class="recent-kind">${uiEscape(item.kind)}</span>
              <span class="recent-title">${uiEscape(item.title)}</span>
            </span>
          </a>`
          )
          .join("")}
      </div>
    </section>`;
}

function bindRecentlyViewed() {
  const button = document.querySelector("[data-clear-recent]");
  if (!button) return;
  button.addEventListener("click", () => {
    safeStorageSet(RECENT_KEY, "[]");
    const section = button.closest(".recent-section");
    if (section) section.remove();
  });
}

/* ---------- Data status ---------- */

const STALE_DATA_DAYS = 7;

function daysSince(dateText) {
  if (!dateText) return null;
  const parsed = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor((Date.now() - parsed.getTime()) / 86400000);
}

function isPerformanceStale() {
  const age = daysSince(store.performance?.updated);
  return age !== null && age > STALE_DATA_DAYS;
}

function renderDataNotice(page) {
  if (!PERFORMANCE_PAGES.has(page)) return "";
  if (typeof hasLivePerformanceData !== "function") return "";
  if (!hasLivePerformanceData()) {
    return `
    <div class="data-notice warn" role="status">
      <span class="data-notice-dot" aria-hidden="true"></span>
      <div>
        <strong>${t("notice.sample_title")}</strong>
        <span>${t("notice.sample_desc")}</span>
      </div>
    </div>`;
  }
  // Home already shows the data date in the hero panel.
  if (page === "home" || !isPerformanceStale()) return "";
  const updated = store.performance?.updated;
  return `
    <div class="data-notice stale" role="status">
      <span class="data-notice-dot" aria-hidden="true"></span>
      <div>
        <strong>${t("notice.stale_title", { date: updated })}</strong>
        <span>${t("notice.stale_desc")}</span>
      </div>
    </div>`;
}

function updateFooterMeta() {
  const meta = document.getElementById("footer-meta");
  if (!meta) return;
  const updated = store.performance?.updated;
  const parts = [];
  if (updated) parts.push(t("footer.data_updated", { date: updated }));
  parts.push(t("footer.counts", { strategies: store.strategies.length, eas: (store.eaCatalog || []).length }));
  meta.textContent = parts.join(" · ");
}

/* ---------- Search palette ---------- */

let searchOpen = false;
let searchResults = [];
let searchActive = 0;
let searchReturnFocus = null;

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function scoreMatch(query, fields) {
  let best = 0;
  fields.forEach((field, index) => {
    const text = normalizeText(field);
    if (!text) return;
    const weight = index === 0 ? 1 : 0.6;
    let score = 0;
    if (text === query) score = 100;
    else if (text.startsWith(query)) score = 70;
    else if (text.includes(` ${query}`)) score = 50;
    else if (text.includes(query)) score = 35;
    best = Math.max(best, score * weight);
  });
  return best;
}

function rankMatches(items, query, getFields) {
  return items
    .map((item) => ({ item, score: scoreMatch(query, getFields(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, SEARCH_GROUP_LIMIT)
    .map((entry) => entry.item);
}

function buildSearchResults(rawQuery) {
  const query = normalizeText(rawQuery).trim();
  const groups = [];

  const pages = SEARCH_PAGES.map((entry) => ({
    title: t(entry.key),
    meta: "",
    href: `?page=${entry.page}`,
    icon: ICONS.page
  }));

  if (!query) {
    const recent = loadRecentVisits().map(describeRecent).filter(Boolean).slice(0, 5);
    if (recent.length) {
      groups.push({
        label: t("recent.title"),
        items: recent.map((item) => ({ title: item.title, meta: item.kind, href: item.href, icon: item.icon }))
      });
    }
    groups.push({ label: t("search.group_pages"), items: pages });
    return groups;
  }

  const pageMatches = rankMatches(pages, query, (item) => [item.title]);
  if (pageMatches.length) groups.push({ label: t("search.group_pages"), items: pageMatches });

  const strategies = rankMatches(store.strategies || [], query, (s) => [
    s.id,
    s.name,
    `${s.id} ${s.name}`,
    (s.tags || []).join(" "),
    tc(s.summary)
  ]).map((s) => ({
    title: `${s.id} ${s.name}`,
    meta: (s.tags || []).slice(0, 3).join(" · "),
    href: `?page=strategy&id=${encodeURIComponent(s.id)}`,
    icon: ICONS.strategy
  }));
  if (strategies.length) groups.push({ label: t("search.group_strategies"), items: strategies });

  const articles = typeof getResearchArticles === "function" ? getResearchArticles() : [];
  const articleMatches = rankMatches(articles, query, (a) => [
    tc(a.title),
    (a.tags || []).join(" "),
    tc(a.summary),
    a.category
  ]).map((a) => ({
    title: tc(a.title),
    meta: [a.date, a.readTime].filter(Boolean).join(" · "),
    href: buildResearchUrl(a.slug),
    icon: ICONS.article
  }));
  if (articleMatches.length) groups.push({ label: t("search.group_research"), items: articleMatches });

  const eas = rankMatches(store.eaCatalog || [], query, (ea) => [
    ea.id,
    ea.name,
    ea.author,
    ea.category
  ]).map((ea) => ({
    title: `${ea.name || t("common.unknown")}`,
    meta: [ea.id, ea.category].filter(Boolean).join(" · "),
    href: `?page=ea-detail&id=${encodeURIComponent(ea.id)}`,
    icon: ICONS.ea
  }));
  if (eas.length) groups.push({ label: t("search.group_eas"), items: eas });

  return groups;
}

function ensureSearchDialog() {
  let overlay = document.getElementById("search-overlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "search-overlay";
  overlay.className = "search-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-dialog-label">
      <label class="search-input-row" id="search-dialog-label">
        <span class="search-input-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13.2 13.2 L17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>
        <input id="search-input" type="search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list" />
        <kbd class="search-esc">Esc</kbd>
      </label>
      <div class="search-results" id="search-results" role="listbox"></div>
      <div class="search-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> <span data-search-hint="navigate"></span></span>
        <span><kbd>Enter</kbd> <span data-search-hint="open"></span></span>
        <span><kbd>Esc</kbd> <span data-search-hint="close"></span></span>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("mousedown", (event) => {
    if (event.target === overlay) closeSearch();
  });
  const input = overlay.querySelector("#search-input");
  input.addEventListener("input", () => {
    searchActive = 0;
    renderSearchResults(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSearchActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSearchActive(-1);
    } else if (event.key === "Enter") {
      const target = searchResults[searchActive];
      if (target) {
        event.preventDefault();
        window.location.href = target.href;
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    } else if (event.key === "Tab") {
      event.preventDefault();
    }
  });
  overlay.querySelector("#search-results").addEventListener("mousemove", (event) => {
    const option = event.target.closest("[data-search-index]");
    if (!option) return;
    const index = Number(option.dataset.searchIndex);
    if (index !== searchActive) {
      searchActive = index;
      syncSearchActive(false);
    }
  });
  return overlay;
}

function renderSearchResults(query) {
  const container = document.getElementById("search-results");
  if (!container) return;
  const groups = buildSearchResults(query);
  searchResults = [];
  if (!groups.length) {
    container.innerHTML = `<div class="search-empty">${t("search.no_results", { query: uiEscape(query) })}</div>`;
    return;
  }
  container.innerHTML = groups
    .map((group) => {
      const options = group.items
        .map((item) => {
          const index = searchResults.length;
          searchResults.push(item);
          return `
          <a class="search-option" id="search-option-${index}" role="option" href="${item.href}" data-search-index="${index}">
            <span class="search-option-icon">${item.icon}</span>
            <span class="search-option-text">
              <span class="search-option-title">${uiEscape(item.title)}</span>
              ${item.meta ? `<span class="search-option-meta">${uiEscape(item.meta)}</span>` : ""}
            </span>
            <span class="search-option-enter" aria-hidden="true">↵</span>
          </a>`;
        })
        .join("");
      return `<div class="search-group"><div class="search-group-label">${uiEscape(group.label)}</div>${options}</div>`;
    })
    .join("");
  syncSearchActive(false);
}

function moveSearchActive(delta) {
  if (!searchResults.length) return;
  searchActive = (searchActive + delta + searchResults.length) % searchResults.length;
  syncSearchActive(true);
}

function syncSearchActive(scroll) {
  const input = document.getElementById("search-input");
  document.querySelectorAll(".search-option").forEach((option) => {
    const active = Number(option.dataset.searchIndex) === searchActive;
    option.classList.toggle("active", active);
    option.setAttribute("aria-selected", active ? "true" : "false");
    if (active && scroll) option.scrollIntoView({ block: "nearest" });
  });
  if (input) input.setAttribute("aria-activedescendant", `search-option-${searchActive}`);
}

function openSearch(initialQuery = "") {
  trackEvent("search_open", { page: document.body.dataset.page || "" });
  const overlay = ensureSearchDialog();
  const input = overlay.querySelector("#search-input");
  input.placeholder = t("search.placeholder");
  overlay.querySelector(".search-esc").setAttribute("aria-label", t("search.hint_close"));
  overlay.querySelectorAll("[data-search-hint]").forEach((el) => {
    el.textContent = t(`search.hint_${el.dataset.searchHint}`);
  });
  searchReturnFocus = document.activeElement;
  overlay.hidden = false;
  document.body.classList.add("search-open");
  searchOpen = true;
  searchActive = 0;
  input.value = initialQuery;
  renderSearchResults(initialQuery);
  requestAnimationFrame(() => input.focus());
}

function closeSearch() {
  const overlay = document.getElementById("search-overlay");
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  document.body.classList.remove("search-open");
  searchOpen = false;
  if (searchReturnFocus && typeof searchReturnFocus.focus === "function") {
    searchReturnFocus.focus();
  }
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/* ---------- Header: nav dropdown + mobile menu ---------- */

function bindHeader() {
  const more = document.querySelector(".nav-more");
  const moreToggle = document.querySelector(".nav-more-toggle");
  if (more && moreToggle) {
    moreToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = !more.classList.contains("open");
      more.classList.toggle("open", open);
      moreToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", (event) => {
      if (!more.contains(event.target)) {
        more.classList.remove("open");
        moreToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  const navToggle = document.querySelector(".nav-toggle");
  if (navToggle) {
    const sync = () => navToggle.setAttribute("aria-expanded", document.body.classList.contains("nav-open") ? "true" : "false");
    navToggle.addEventListener("click", () => requestAnimationFrame(sync));
  }

  const trigger = document.getElementById("search-trigger");
  if (trigger) trigger.addEventListener("click", () => openSearch());

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (searchOpen) closeSearch();
      else openSearch();
      return;
    }
    if (event.key === "/" && !searchOpen && !isTypingTarget(event.target)) {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.key === "Escape") {
      if (more) {
        more.classList.remove("open");
        if (moreToggle) moreToggle.setAttribute("aria-expanded", "false");
      }
      document.body.classList.remove("nav-open");
    }
  });
}

function highlightNavMore(page) {
  const more = document.querySelector(".nav-more");
  if (!more) return;
  const active = Array.from(more.querySelectorAll("a[data-route]")).some((link) => link.dataset.route === page);
  more.classList.toggle("has-active", active);
}

/* ---------- Scroll: back-to-top + reading progress ---------- */

function bindScrollUi() {
  const backToTop = document.getElementById("back-to-top");
  const progress = document.getElementById("scroll-progress");
  let ticking = false;
  const update = () => {
    ticking = false;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    if (backToTop) backToTop.classList.toggle("visible", scrollY > 700);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, scrollY / max) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    }
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  if (backToTop) {
    backToTop.addEventListener("click", () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }
  update();
}

/* ---------- Analytics hook ---------- */

// Only the configured, before-send-sanitized Umami provider receives events.
// Other SDKs must not inherit private URL defaults through generic fan-out.
function trackEvent(name, props = {}) {
  try {
    const event = qaAnalyticsEvent(name, props);
    if (!event) return;
    // The inline hook denies by default when its external implementation is
    // absent or throws. Apply that gate before the local buffer as well.
    const allowed = qaAnalyticsBeforeSend("event", { name: event.name, data: event.props, url: location.href });
    if (!allowed || allowed.name !== event.name) return;
    window.__qaEvents = window.__qaEvents || [];
    window.__qaEvents.push({ name: event.name, props: event.props, at: Date.now() });
    if (window.__qaEvents.length > 100) window.__qaEvents.shift();
    if (window.umami && typeof window.umami.track === "function"
        && document.querySelector('script[data-before-send="qaAnalyticsBeforeSend"]')) {
      const pending = window.umami.track(event.name, event.props);
      if (pending && typeof pending.catch === "function") pending.catch(() => {});
    }
  } catch (err) {
    // Analytics must never break the page.
  }
}

function bindAnalytics() {
  document.addEventListener("click", (event) => {
    if (typeof qaPrivateAnalyticsTarget !== "function") return;
    const target = event.target.closest("a, button");
    if (!target || qaPrivateAnalyticsTarget(target)) return;
    const page = document.body.dataset.page || "";
    if (target.matches("[data-export-csv], [data-export-compare]")) trackEvent("export_csv", { page });
    else if (target.matches("[data-export-chart]")) trackEvent("export_png", { page, chart: target.dataset.exportName || "" });
    else if (target.matches("[data-compare-share]")) trackEvent("share_compare", { page });
    else if (target.matches("[data-favorite], .favorite-action, .favorite-inline")) trackEvent("favorite_toggle", { page });
    else if (target.id === "lang-toggle") trackEvent("language_switch", { to: getLang() === "en" ? "zh" : "en" });
    else if (target.matches(".search-option")) {
      const destination = qaPublicAnalyticsDestination(target.getAttribute("href") || "");
      if (destination) trackEvent("search_select", { destination });
    }
    else if (target.tagName === "A" && /mql5\.com/.test(target.getAttribute("href") || "")) trackEvent("outbound_mql5", { page });
  });
  document.addEventListener("submit", (event) => {
    if (typeof qaPrivateAnalyticsTarget !== "function") return;
    if (!qaPrivateAnalyticsTarget(event.target) && event.target.matches(".newsletter-form")) {
      trackEvent("newsletter_subscribe", { page: qaAnalyticsContext(location.href).page });
    }
  });
}

/* ---------- Hooks called by app.js render() ---------- */

function afterRender(route) {
  const page = route?.page || "home";
  document.body.dataset.page = page;
  document.body.classList.toggle(
    "is-reading",
    page === "research" && Boolean(route.params?.get("slug"))
  );
  highlightNavMore(page);
  updateFooterMeta();
  if (typeof window.qaRenderSupport === "function") window.qaRenderSupport(route);

  const app = document.getElementById("app");
  const notice = renderDataNotice(page);
  if (app && notice && !app.querySelector(".data-notice")) {
    app.insertAdjacentHTML("afterbegin", notice);
  }
  if (page === "home") bindRecentlyViewed();
  recordRecentVisit(route);
  window.dispatchEvent(new Event("scroll"));
}

function initSiteUi() {
  bindHeader();
  bindScrollUi();
  bindAnalytics();
}

document.addEventListener("DOMContentLoaded", initSiteUi);

window.afterRender = afterRender;
window.themeIconSvg = themeIconSvg;
window.renderRecentlyViewed = renderRecentlyViewed;
window.openSearch = openSearch;
window.trackEvent = trackEvent;
window.isPerformanceStale = isPerformanceStale;

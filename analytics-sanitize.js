// Early classic script: privacy guards and DOM-ready public handlers; no app storage access.
// Umami's documented data-before-send hook must exist before its tracker loads:
// https://docs.umami.is/docs/tracker-configuration#data-before-send
function qaAnalyticsPage(value) {
  const pages = ["home", "arena", "strategies", "strategy", "compare", "portfolio", "favorites",
    "research", "methodology", "changelog", "ea-arena", "ea-ranking", "ea-detail", "ea-pages",
    "lab", "about", "privacy-policy", "terms", "faq", "glossary", "frameworks", "ai-arena",
    "signals", "evidence", "heatmap", "reports", "costs", "backtest-strategies",
    "code", "tools", "market", "claims", "events", "famous", "versus", "github"];
  return typeof value === "string" && pages.includes(value) ? value : "other";
}

function qaAnalyticsContext(value) {
  try {
    const url = new URL(value || location.href, location.origin);
    if (url.origin !== location.origin) return { page: "other", lang: "en", url: "/?page=other&lang=en" };
    const parts = url.pathname.split("/").filter(Boolean);
    const pathLang = parts[0] === "zh" ? parts.shift() : "en";
    const page = qaAnalyticsPage(url.searchParams.get("page") || parts[0] || "home");
    const lang = url.searchParams.get("lang") === "zh" || pathLang === "zh"
      || (parts[0] === "ea-pages" && parts[1] === "zh") ? "zh" : "en";
    return { page, lang, url: `/?page=${page}&lang=${lang}` };
  } catch (_) {
    return { page: "other", lang: "en", url: "/?page=other&lang=en" };
  }
}

function qaAnalyticsEvent(name, props) {
  const publicNames = ["public_content_view", "code_download_intent", "partner_click", "support_click", "newsletter_submit_intent"];
  if (publicNames.includes(name)) {
    const context = qaPublicMetricContext();
    if (!context) return null;
    const source = props && typeof props === "object" ? props : {};
    const clean = { page: context.page, content: context.content, lang: context.lang };
    if (context.pilot) {
      clean.pilot = context.pilot;
      clean.channel = context.channel;
    }
    if (name === "code_download_intent") {
      if (!["python", "pine"].includes(source.format)) return null;
      clean.format = source.format;
      // Target IDs must be declared by generated download links, never supplied by a URL or SDK payload.
      if (typeof source.target === "string" && /^code\/[a-z0-9][a-z0-9-]{0,159}$/.test(source.target)
          && [...document.querySelectorAll("[data-qa-code-content]")].some(link => !qaPrivateAnalyticsTarget(link)
            && link.dataset.qaCodeContent === source.target)) {
        clean.target = source.target;
      }
    }
    if (name === "partner_click") {
      if (!["charting", "vps", "broker", "tax"].includes(source.partner)
          || !["context", "tools", "pine"].includes(source.placement)) return null;
      clean.partner = source.partner;
      clean.placement = source.placement;
    }
    if (name === "support_click") {
      if (!["footer", "article", "download"].includes(source.placement)) return null;
      clean.placement = source.placement;
    }
    return { name, props: clean };
  }
  const names = ["search_open", "search_select", "export_csv", "export_png", "share_compare",
    "share_portfolio", "favorite_toggle", "language_switch", "outbound_mql5"];
  if (!names.includes(name)) return null;
  const clean = {};
  const source = props && typeof props === "object" ? props : {};
  if (Object.prototype.hasOwnProperty.call(source, "page")) clean.page = qaAnalyticsPage(source.page);
  if (name === "language_switch" && ["en", "zh"].includes(source.to)) clean.to = source.to;
  if (name === "share_portfolio" && Number.isInteger(source.n) && source.n >= 0 && source.n <= 1000) clean.n = source.n;
  if (name === "search_select") clean.destination = qaAnalyticsPage(source.destination);
  return { name, props: clean };
}

function qaSanitizeAnalyticsPayload(type, payload) {
  try {
    // No error/session/identify payloads: they can contain raw local state.
    if (type !== "event" || !payload || typeof payload !== "object") return false;
    const tag = document.querySelector('script[data-before-send="qaAnalyticsBeforeSend"][data-website-id]');
    const website = tag && tag.getAttribute("data-website-id");
    if (!website || !/^[a-f0-9-]{36}$/i.test(website)) return false;
    const context = qaAnalyticsContext(payload.url || location.href);
    const clean = { website, hostname: location.hostname, url: context.url,
      title: `Quant Arena | ${context.page}`, language: context.lang, referrer: "" };
    if (payload.name !== undefined) {
      const event = qaAnalyticsEvent(payload.name, payload.data);
      if (!event) return false;
      clean.name = event.name;
      clean.data = event.props;
    }
    // Reconstruct the payload; never spread unknown provider or private fields.
    return clean;
  } catch (_) { return false; }
}

function qaPrivateAnalyticsTarget(target) {
  return Boolean(target && target.closest && target.closest(
    "[data-private-local], [data-analytics-private], [data-watch-id], [data-saved-portfolio-id]"));
}

function qaIsPublicMetricPage(page) {
  return qaAnalyticsPage(page) !== "other" && !["portfolio", "favorites", "compare", "lab"].includes(page);
}

function qaPilotAttribution(url, context) {
  // Six shared public links, not visitor identifiers. No storage or referrer fallback.
  const tokens = {
    "p1-r-200": { slug: "200-day-moving-average-rule-tested", channel: "reddit", lang: "en" },
    "p1-r-dip": { slug: "buy-the-dip-tested", channel: "reddit", lang: "en" },
    "p1-r-covid": { slug: "covid-crash-2020-strategies-replayed", channel: "reddit", lang: "en" },
    "p1-z-200": { slug: "200-day-moving-average-rule-tested", channel: "zhihu", lang: "zh" },
    "p1-z-dip": { slug: "buy-the-dip-tested", channel: "zhihu", lang: "zh" },
    "p1-z-covid": { slug: "covid-crash-2020-strategies-replayed", channel: "zhihu", lang: "zh" }
  };
  const token = url.searchParams.get("qa_pilot");
  if (!Object.prototype.hasOwnProperty.call(tokens, token)) return null;
  const approved = tokens[token];
  const path = `${approved.lang === "zh" ? "/zh" : ""}/research/${approved.slug}/`;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (context.page !== "research" || context.content !== `research/${approved.slug}` || context.lang !== approved.lang
      || !canonical || canonical.href !== location.origin + path
      || url.href.includes("#") || url.username || url.password
      || document.querySelector("[data-private-local], [data-analytics-private], [data-watch-id], [data-saved-portfolio-id]")) return null;
  // A static landing has only the token. SPA aliases must explicitly match the
  // article and language; both the rendered metadata and canonical must be fresh.
  const expected = url.pathname === path ? { qa_pilot: token }
    : url.pathname === "/" ? { page: "research", slug: approved.slug, lang: approved.lang, qa_pilot: token } : null;
  if (!expected || [...url.searchParams].length !== Object.keys(expected).length
      || ![...url.searchParams].every(([key, value]) => Object.prototype.hasOwnProperty.call(expected, key) && expected[key] === value)
      || Object.keys(expected).some(key => url.searchParams.getAll(key).length !== 1)) return null;
  return { pilot: "articles-v1", channel: approved.channel };
}

function qaPublicMetricContext() {
  try {
    const route = qaAnalyticsContext(location.href);
    const url = new URL(location.href);
    // Share definitions, arbitrary query fields and fragments never enter conversion metrics.
    if (!qaIsPublicMetricPage(route.page) || url.hash
        || [...url.searchParams.keys()].some(key => !["page", "lang", "id", "slug", "category", "qa_pilot"].includes(key))) return null;
    const tag = document.querySelector('meta[name="qa-public-content"]');
    let content = tag && tag.getAttribute("content");
    let lang = tag && tag.getAttribute("data-lang");
    let page = tag && tag.getAttribute("data-page");
    if (!tag && document.querySelector('meta[name="qa-analytics-surface"][content="static"]')) {
      // Archived HTML already declares a canonical. Its bytes need not be rewritten.
      const canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) return null;
      const fixed = new URL(canonical.href);
      if (fixed.origin !== location.origin || fixed.pathname !== url.pathname || fixed.search || fixed.hash) return null;
      const parts = fixed.pathname.toLowerCase().split("/").filter(Boolean);
      if (parts[0] === "zh") parts.shift();
      if (parts[0] === "ea-pages" && parts[1] === "zh") parts.splice(1, 1);
      page = parts[0] || "home";
      content = parts.join("/") || "home";
      lang = document.documentElement.lang.startsWith("zh") ? "zh" : "en";
    }
    if (page !== route.page || !["en", "zh"].includes(lang)
        || typeof content !== "string" || !/^[a-z0-9][a-z0-9_./-]{0,239}$/.test(content)
        || content.split("/").some(part => ["", ".", ".."].includes(part))
        || !(content === route.page || content.startsWith(route.page + "/"))) return null;
    const context = { page: route.page, content, lang };
    if (url.searchParams.has("qa_pilot")) {
      const pilot = qaPilotAttribution(url, context);
      if (!pilot) return null;
      return { ...context, ...pilot };
    }
    return context;
  } catch (_) { return null; }
}

// Callers supply generated static identifiers or entries resolved from the public SPA catalog.
// Do not call this with raw query parameters, saved names, portfolio IDs or arbitrary URLs.
function qaSetPublicMetricContext(page, content, lang) {
  let tag = document.querySelector('meta[name="qa-public-content"]');
  if (!qaIsPublicMetricPage(page) || !content) {
    if (tag) tag.remove();
    window.__qaPublicViewKey = "";
    return;
  }
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = "qa-public-content";
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
  tag.setAttribute("data-page", page);
  tag.setAttribute("data-lang", lang);
}

function qaTrackAnalyticsEvent(name, props = {}) {
  try {
    const event = qaAnalyticsEvent(name, props);
    if (!event || typeof qaAnalyticsBeforeSend !== "function") return false;
    const allowed = qaAnalyticsBeforeSend("event", { name: event.name, data: event.props, url: location.href });
    if (!allowed || allowed.name !== event.name) return false;
    window.__qaEvents = window.__qaEvents || [];
    window.__qaEvents.push({ name: allowed.name, props: allowed.data, at: Date.now() });
    if (window.__qaEvents.length > 100) window.__qaEvents.shift();
    if (window.umami && typeof window.umami.track === "function"
        && document.querySelector('script[data-before-send="qaAnalyticsBeforeSend"]')) {
      const pending = window.umami.track(allowed.name, allowed.data);
      if (pending && typeof pending.catch === "function") pending.catch(() => {});
      return true;
    }
  } catch (_) { /* Analytics must never change the user's action. */ }
  return false;
}

function qaPublicContentViewed() {
  if (!window.umami || typeof window.umami.track !== "function") return;
  const context = qaPublicMetricContext();
  if (!context) return;
  const key = `${context.page}|${context.content}|${context.lang}|${context.pilot || ""}|${context.channel || ""}`;
  if (window.__qaPublicViewKey !== key && qaTrackAnalyticsEvent("public_content_view")) window.__qaPublicViewKey = key;
}

function qaBindPublicAnalytics() {
  if (document.__qaPublicAnalyticsBound) return;
  document.__qaPublicAnalyticsBound = true;
  document.addEventListener("click", event => {
    const target = event.target.closest && event.target.closest("a");
    if (!target || qaPrivateAnalyticsTarget(target) || !qaPublicMetricContext()) return;
    if (target.matches("[data-qa-code-format][download]")) {
      qaTrackAnalyticsEvent("code_download_intent", { format: target.dataset.qaCodeFormat, target: target.dataset.qaCodeContent });
    } else if (target.matches("[data-partner]")) {
      const placement = target.closest("[data-partner-card]") ? "tools" : target.closest(".code-partner") ? "pine" : "context";
      qaTrackAnalyticsEvent("partner_click", { partner: target.dataset.partner, placement });
    } else if (target.matches(".qa-support-link")) {
      qaTrackAnalyticsEvent("support_click", { placement: target.closest("[data-support-card]")?.dataset.supportCard });
    }
  });
  document.addEventListener("submit", event => {
    if (!qaPrivateAnalyticsTarget(event.target) && event.target.matches(".newsletter-form") && event.target.checkValidity()) {
      qaTrackAnalyticsEvent("newsletter_submit_intent");
    }
  });
}

function qaCanBootstrapPublicAnalytics() {
  try {
    const context = qaPublicMetricContext();
    if (!context || typeof qaAnalyticsBeforeSend !== "function"
        || !document.querySelector('meta[name="qa-analytics-surface"][content="static"]')
        || document.querySelector("[data-private-local], [data-analytics-private], [data-watch-id], [data-saved-portfolio-id]")) return false;
    const current = new URL(location.href);
    const canonical = document.querySelector('link[rel="canonical"]');
    const fixed = canonical && new URL(canonical.href);
    return fixed && fixed.origin === current.origin && fixed.pathname === current.pathname && !fixed.search && !fixed.hash
      && !current.hash && (context.pilot === "articles-v1"
        || [...current.searchParams].every(([key, value]) => key === "lang" && ["en", "zh"].includes(value)));
  } catch (_) { return false; }
}

async function qaLoadPublicAnalytics() {
  if (!qaCanBootstrapPublicAnalytics() || document.__qaPublicAnalyticsLoading
      || document.querySelector('script[src="https://cloud.umami.is/script.js"]')) return;
  document.__qaPublicAnalyticsLoading = true;
  try {
    // Older frozen pages predate analytics configuration. Reuse the public site
    // configuration without rewriting their HTML or forwarding cookies/referrers.
    const response = await fetch("/data/site_config.json", { credentials: "omit", referrerPolicy: "no-referrer" });
    if (!response.ok) return;
    const config = (await response.json()).analytics;
    const website = config?.attributes?.["data-website-id"];
    if (config?.script_src !== "https://cloud.umami.is/script.js"
        || typeof website !== "string" || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(website)
        || !qaCanBootstrapPublicAnalytics() || document.querySelector('script[src="https://cloud.umami.is/script.js"]')) return;
    const script = document.createElement("script");
    script.src = config.script_src;
    script.setAttribute("data-website-id", website);
    script.setAttribute("data-before-send", "qaAnalyticsBeforeSend");
    script.setAttribute("data-exclude-hash", "true");
    script.referrerPolicy = "no-referrer";
    script.onload = qaPublicContentViewed;
    document.head.appendChild(script);
  } catch (_) { /* Missing/invalid public configuration leaves archived analytics off. */ }
}

// Works for historical static templates too; their canonical remains the public-ID source.
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector('meta[name="qa-analytics-surface"][content="static"]')) {
    qaBindPublicAnalytics();
    qaPublicContentViewed();
    qaLoadPublicAnalytics();
  }
});

function qaPublicAnalyticsDestination(href) {
  try {
    const url = new URL(href, location.origin);
    const context = qaAnalyticsContext(url.href);
    if (url.origin !== location.origin || ["other", "favorites", "portfolio", "compare", "lab"].includes(context.page)) return null;
    if ([...url.searchParams.keys()].some(key => !["page", "lang", "id", "slug", "category"].includes(key))) return null;
    return context.page;
  } catch (_) { return null; }
}

function qaLoadPublicBeacon() {
  // Cloudflare has no configured before-send sanitizer. Keep it off SPA shells,
  // where a later share/route can introduce private context, and off dirty static
  // URLs/referrers. Umami still supplies sanitized generic analytics there.
  function cleanStatic(value) {
    const url = new URL(value, location.origin);
    const context = qaAnalyticsContext(url.href);
    return url.origin === location.origin && url.pathname !== "/" && url.pathname !== "/404.html"
      && !["other", "favorites", "portfolio", "compare", "lab"].includes(context.page)
      // Adding Umami section names must not expand this unsanitized beacon's scope.
      && !["code", "tools", "market", "claims", "events", "famous", "versus", "github"].includes(context.page)
      && !url.hash && [...url.searchParams].every(([key, val]) => key === "lang" && ["en", "zh"].includes(val));
  }
  try {
    if (!document.querySelector('meta[name="qa-analytics-surface"][content="static"]') || !cleanStatic(location.href)) return false;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical || new URL(canonical.href).pathname !== location.pathname) return false;
    if (document.referrer) {
      const ref = new URL(document.referrer);
      // Only origin-only referrals qualify; legacy/full private referrals do not.
      if (ref.pathname !== "/" || ref.search || ref.hash) return false;
    }
    if (document.querySelector("script[data-cf-beacon]")) return false;
    const script = document.createElement("script");
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.referrerPolicy = "origin";
    script.setAttribute("data-cf-beacon", JSON.stringify({ token: "7b612188c2a449909f50da3aa16e2263" }));
    document.head.appendChild(script);
    return true;
  } catch (_) { return false; }
}

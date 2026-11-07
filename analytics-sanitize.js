// Early classic script: declarations only, no app state or storage access.
// Umami's documented data-before-send hook must exist before its tracker loads:
// https://docs.umami.is/docs/tracker-configuration#data-before-send
function qaAnalyticsPage(value) {
  const pages = ["home", "arena", "strategies", "strategy", "compare", "portfolio", "favorites",
    "research", "methodology", "changelog", "ea-arena", "ea-ranking", "ea-detail", "ea-pages",
    "lab", "about", "privacy-policy", "terms", "faq", "glossary", "frameworks", "ai-arena",
    "signals", "evidence", "heatmap", "reports", "costs", "backtest-strategies"];
  return typeof value === "string" && pages.includes(value) ? value : "other";
}

function qaAnalyticsContext(value) {
  try {
    const url = new URL(value || location.href, location.origin);
    if (url.origin !== location.origin) return { page: "other", lang: "en", url: "/?page=other&lang=en" };
    const parts = url.pathname.split("/").filter(Boolean);
    const pathLang = parts[0] === "zh" ? parts.shift() : "en";
    const page = qaAnalyticsPage(url.searchParams.get("page") || parts[0] || "home");
    const lang = url.searchParams.get("lang") === "zh" || pathLang === "zh" ? "zh" : "en";
    return { page, lang, url: `/?page=${page}&lang=${lang}` };
  } catch (_) {
    return { page: "other", lang: "en", url: "/?page=other&lang=en" };
  }
}

function qaAnalyticsEvent(name, props) {
  const names = ["search_open", "search_select", "export_csv", "export_png", "share_compare",
    "share_portfolio", "favorite_toggle", "language_switch", "outbound_mql5", "newsletter_subscribe"];
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

// Optional support is a plain outbound link. No provider script, iframe or fetch.
(() => {
  "use strict";
  const copy = {
    en: { label: "Support Quant Arena", button: "Buy me a coffee", text: "If Quant Arena saved you research time, buy me a coffee to support data updates, backtest verification and new tools. Support is optional." },
    zh: { label: "支持 Quant Arena", button: "请我喝杯咖啡", text: "如果 Quant Arena 帮你节省了研究时间，可以请我喝杯咖啡，支持数据更新、回测验证和新工具开发。支持完全自愿。" }
  };
  // The generated footer receives its URL only from data/site_config.json.
  const configured = document.querySelector('[data-support-card="footer"] a')?.getAttribute("href") || "";
  const url = /^https:\/\/ko-fi\.com\/[A-Za-z0-9_]+\/$/.test(configured) ? configured : "";
  const language = () => (typeof getLang === "function" ? getLang() : document.documentElement.lang).startsWith("zh") ? "zh" : "en";

  function localize(card) {
    const text = copy[language()];
    card.setAttribute("aria-label", text.label);
    card.querySelector("p").textContent = text.text;
    const link = card.querySelector("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.referrerPolicy = "no-referrer";
    link.textContent = text.button;
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = " ↗";
    link.append(arrow);
  }

  function create(placement) {
    const card = document.createElement("aside");
    card.className = `qa-support qa-support--${placement}`;
    card.dataset.supportCard = placement;
    card.append(document.createElement("p"));
    const link = document.createElement("a");
    link.className = "qa-support-link";
    card.append(link);
    localize(card);
    return card;
  }

  function render(route) {
    if (!url) return;
    document.querySelectorAll("[data-support-card]").forEach(localize);
    if (route?.page === "research" && route.params?.get("slug")) {
      const article = document.querySelector("#app .content-article");
      if (article && !article.querySelector('[data-support-card="article"]')) article.append(create("article"));
    }
  }

  document.addEventListener("qa:download-ready", event => {
    if (!url) return;
    const trigger = event.detail?.anchor;
    // No filename, result, query, portfolio definition or page URL is copied.
    if (!(trigger instanceof HTMLElement) || !trigger.isConnected || trigger === document.body) return;
    document.querySelectorAll('[data-support-card="download"]').forEach(card => card.remove());
    const container = trigger.closest(".hero-actions, .export-actions, .card-actions");
    (container || trigger).insertAdjacentElement("afterend", create("download"));
  });
  window.qaRenderSupport = render;
  document.addEventListener("DOMContentLoaded", () => render());
})();

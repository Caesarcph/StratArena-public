const EA_CATEGORIES = [
  { value: "Trend Following", key: "category.trend_following" },
  { value: "Momentum", key: "category.momentum" },
  { value: "Mean Reversion", key: "category.mean_reversion" },
  { value: "Breakout", key: "category.breakout" },
  { value: "Scalping", key: "category.scalping" },
  { value: "Grid", key: "category.grid" },
  { value: "Martingale", key: "category.martingale" },
  { value: "Hedging", key: "category.hedging" },
  { value: "Multi-Timeframe", key: "category.multi_timeframe" },
  { value: "Pivot Point", key: "category.pivot_point" },
  { value: "Candlestick Pattern", key: "category.candlestick_pattern" },
  { value: "Machine Learning", key: "category.machine_learning" },
  { value: "Statistical Arbitrage", key: "category.statistical_arbitrage" },
  { value: "News Trading", key: "category.news_trading" },
  { value: "Session Trading", key: "category.session_trading" },
  { value: "Utility", key: "category.utility" },
  { value: "Unclassified", key: "category.unclassified" }
];

const EA_RISK_LEVELS = ["safe", "low", "medium", "caution", "high", "dangerous"];

const EA_RISK_COLORS = {
safe: "#22c55e",
low: "#4ade80",
medium: "#eab308",
caution: "#f97316",
high: "#ef4444",
dangerous: "#dc2626",
na: "#6b7280"
};

const EA_CATEGORY_COLORS = {
  "Trend Following": "#3b82f6",
  Momentum: "#8b5cf6",
  "Mean Reversion": "#ec4899",
  Breakout: "#f59e0b",
  Scalping: "#ef4444",
  Grid: "#f97316",
  Martingale: "#dc2626",
  Hedging: "#14b8a6",
  "Multi-Timeframe": "#6366f1",
  "Pivot Point": "#84cc16",
  "Candlestick Pattern": "#a855f7",
  "Machine Learning": "#06b6d4",
  "Statistical Arbitrage": "#10b981",
  "News Trading": "#f43f5e",
  "Session Trading": "#0ea5e9",
  Utility: "#64748b",
  Unclassified: "#475569"
};

function eaArenaState(route) {
  return {
    search: route.params.get("q") || "",
    category: route.params.get("cat") || "",
    risk: route.params.get("risk") || "",
    rating: route.params.get("rating") || "",
    sort: route.params.get("sort") || "name",
    analyzed: route.params.get("analyzed") === "1",
    view: route.params.get("view") || "grid"
  };
}

function eaNavigate(updates) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(updates).forEach(([k, v]) => {
    if (v === "" || v === undefined || v === null) params.delete(k);
    else params.set(k, v);
  });
  params.set("page", "ea-arena");
  window.history.pushState({}, "", "?" + params.toString());
  render();
}

function getEACategoryLabel(value) {
  const item = EA_CATEGORIES.find((entry) => entry.value === value) || EA_CATEGORIES.find((entry) => entry.value === "Unclassified");
  return item ? t(item.key) : value;
}

function getEABacktestStatus(value) {
  if (!value) return getLang() === "zh" ? "待定" : "Pending";
  if (String(value).toLowerCase() === "pending") return getLang() === "zh" ? "待定" : "Pending";
  return value;
}

function eaStars(rating) {
  if (!rating || rating <= 0) return `<span class="ea-rating-na">${t("common.na")}</span>`;
  const r = Math.min(5, Math.max(1, Math.round(rating)));
  return `<span class="ea-rating-stars">${"★".repeat(r)}${"☆".repeat(5 - r)}</span>`;
}

function eaRiskBadge(risk) {
  const riskKey = risk || "na";
  const color = EA_RISK_COLORS[riskKey] || EA_RISK_COLORS.na;
  return `<span class="ea-risk-badge" style="--risk-color:${color}">${t(`risk.${riskKey}`)}</span>`;
}

function eaCategoryBadge(cat) {
  const value = cat || "Unclassified";
  const color = EA_CATEGORY_COLORS[value] || EA_CATEGORY_COLORS.Unclassified;
  return `<span class="ea-category-badge" style="--cat-color:${color}">${getEACategoryLabel(value)}</span>`;
}

function renderEAArena(route) {
  const s = eaArenaState(route);
  const all = store.eaCatalog || [];
  let items = [...all];

  if (s.search) {
    const q = s.search.toLowerCase();
    items = items.filter(
      (ea) =>
        (ea.name || "").toLowerCase().includes(q) ||
        (ea.id || "").toLowerCase().includes(q) ||
        (ea.author || "").toLowerCase().includes(q)
    );
  }
  if (s.category) items = items.filter((ea) => ea.category === s.category);
  if (s.risk) items = items.filter((ea) => ea.overall_risk === s.risk);
  if (s.rating) items = items.filter((ea) => String(ea.rating) === s.rating);
  if (s.analyzed) items = items.filter((ea) => store.eaAnalysis[ea.id]);

  items.sort((a, b) => {
    switch (s.sort) {
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "category":
        return (a.category || "").localeCompare(b.category || "");
      case "risk":
        return EA_RISK_LEVELS.indexOf(a.overall_risk) - EA_RISK_LEVELS.indexOf(b.overall_risk);
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });

  const catCounts = {};
  all.forEach((ea) => {
    const value = ea.category || "Unclassified";
    catCounts[value] = (catCounts[value] || 0) + 1;
  });
  const riskCounts = {};
  all.forEach((ea) => {
    const value = ea.overall_risk || "na";
    riskCounts[value] = (riskCounts[value] || 0) + 1;
  });
  const ratingCounts = {};
  all.forEach((ea) => {
    const value = ea.rating || 0;
    ratingCounts[value] = (ratingCounts[value] || 0) + 1;
  });
  const analyzedCount = all.filter((ea) => store.eaAnalysis[ea.id]).length;

  const catChips = EA_CATEGORIES.filter((c) => catCounts[c.value])
    .map(
      (c) => `<button class="ea-chip ${s.category === c.value ? "active" : ""}" data-ea-cat="${c.value}">${t(c.key)} <span class="ea-chip-count">${catCounts[c.value]}</span></button>`
    )
    .join("");
  const riskChips = EA_RISK_LEVELS.filter((risk) => riskCounts[risk])
    .map(
      (risk) => `<button class="ea-chip ${s.risk === risk ? "active" : ""}" data-ea-risk="${risk}">${t(`risk.${risk}`)} <span class="ea-chip-count">${riskCounts[risk]}</span></button>`
    )
    .join("");
  const ratingChips = [1, 2, 3, 4, 5]
    .filter((rating) => ratingCounts[rating])
    .map(
      (rating) => `<button class="ea-chip ${s.rating === String(rating) ? "active" : ""}" data-ea-rating="${rating}">${"★".repeat(rating)} <span class="ea-chip-count">${ratingCounts[rating]}</span></button>`
    )
    .join("");

  const cards = items
    .map((ea) => {
      const analysis = store.eaAnalysis[ea.id];
      return `
      <a class="ea-card" href="?page=ea-detail&id=${ea.id}" data-ea-id="${ea.id}">
        <div class="ea-card-header">
          <span class="ea-card-id">${ea.id}</span>
          ${analysis ? `<span class="ea-analyzed-badge">${t("common.analyzed")}</span>` : ""}
          ${ea.absorbed_by ? `<span class="ea-absorbed-badge">${t("common.absorbed")}</span>` : ""}
        </div>
        <h3 class="ea-card-name">${ea.name || t("common.unknown")}</h3>
        <div class="ea-card-meta">
          ${eaCategoryBadge(ea.category || "Unclassified")}
          ${eaRiskBadge(ea.overall_risk)}
        </div>
        <div class="ea-card-footer">
          <span class="ea-card-author">${ea.author || t("common.unknown")}</span>
          <span class="ea-card-rating">${eaStars(ea.rating)}</span>
        </div>
      </a>`;
    })
    .join("");

  return `
  <section class="ea-arena-page section">
    <div class="section-header">
      <div>
        <div class="eyebrow">${getLang() === "zh" ? "MQL5 智能交易系统" : "MQL5 Expert Advisors"}</div>
        <h1>${getLang() === "zh" ? "EA 竞技场" : "EA Arena"}</h1>
        <p>${getLang() === "zh" ? `浏览、评估并比较 ${all.length} 个 MQL5 智能交易系统，其中 ${analyzedCount} 个附带详细分析。` : `Browse, evaluate, and compare ${all.length} MQL5 Expert Advisors. ${analyzedCount} with detailed analysis.`}</p>
      </div>
      <div class="ea-toolbar">
        <input type="search" class="ea-search" placeholder="${getLang() === "zh" ? "按名称、ID 或作者搜索 EA…" : "Search EAs by name, ID, or author…"}" value="${s.search}" data-ea-search />
        <select class="ea-sort" data-ea-sort>
          <option value="name" ${s.sort === "name" ? "selected" : ""}>${getLang() === "zh" ? "名称 A-Z" : "Name A-Z"}</option>
          <option value="category" ${s.sort === "category" ? "selected" : ""}>${getLang() === "zh" ? "分类" : "Category"}</option>
          <option value="risk" ${s.sort === "risk" ? "selected" : ""}>${getLang() === "zh" ? "风险等级" : "Risk Level"}</option>
          <option value="rating" ${s.sort === "rating" ? "selected" : ""}>${getLang() === "zh" ? "评分 ↓" : "Rating ↓"}</option>
        </select>
        <button class="ea-view-toggle" data-ea-view="${s.view === "grid" ? "list" : "grid"}" title="${getLang() === "zh" ? "切换视图" : "Toggle view"}">
          ${s.view === "grid" ? "☰" : "⊞"}
        </button>
        <label class="ea-analyzed-toggle">
          <input type="checkbox" ${s.analyzed ? "checked" : ""} data-ea-analyzed /> ${getLang() === "zh" ? "仅看已分析" : "Analyzed only"}
        </label>
      </div>
    </div>

    <div class="ea-filters">
      <div class="ea-filter-row">
        <span class="ea-filter-label">${getLang() === "zh" ? "分类" : "Category"}</span>
        <div class="ea-chips">${catChips}</div>
      </div>
      <div class="ea-filter-row">
        <span class="ea-filter-label">${getLang() === "zh" ? "风险" : "Risk"}</span>
        <div class="ea-chips">${riskChips}</div>
      </div>
      ${ratingChips ? `<div class="ea-filter-row"><span class="ea-filter-label">${getLang() === "zh" ? "评分" : "Rating"}</span><div class="ea-chips">${ratingChips}</div></div>` : ""}
    </div>

    <p class="ea-results-count">${getLang() === "zh" ? `显示 ${items.length} / ${all.length} 个 EA` : `${items.length} of ${all.length} EAs`}</p>

    <div class="ea-${s.view} ${items.length === 0 ? "ea-empty" : ""}">
      ${cards || `<p class="ea-no-results">${getLang() === "zh" ? "没有 EA 符合当前筛选条件。" : "No EAs match your filters."}</p>`}
    </div>
  </section>`;
}

function bindEAArena(route) {
  const s = eaArenaState(route);
  let searchTimer;
  const searchInput = document.querySelector("[data-ea-search]");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        eaNavigate({ q: searchInput.value.trim(), page: "ea-arena" });
      }, 300);
    });
  }

  document.querySelectorAll("[data-ea-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.eaCat;
      eaNavigate({ cat: s.category === cat ? "" : cat });
    });
  });

  document.querySelectorAll("[data-ea-risk]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const risk = btn.dataset.eaRisk;
      eaNavigate({ risk: s.risk === risk ? "" : risk });
    });
  });

  document.querySelectorAll("[data-ea-rating]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rating = btn.dataset.eaRating;
      eaNavigate({ rating: s.rating === rating ? "" : rating });
    });
  });

  const sortSelect = document.querySelector("[data-ea-sort]");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      eaNavigate({ sort: sortSelect.value });
    });
  }

  const viewBtn = document.querySelector("[data-ea-view]");
  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      eaNavigate({ view: viewBtn.dataset.eaView });
    });
  }

  const analyzedCheck = document.querySelector("[data-ea-analyzed]");
  if (analyzedCheck) {
    analyzedCheck.addEventListener("change", () => {
      eaNavigate({ analyzed: analyzedCheck.checked ? "1" : "" });
    });
  }
}

function renderEADetail(route) {
  const id = route.params.get("id");
  const ea = (store.eaCatalog || []).find((e) => e.id === id);
  if (!ea) {
    return `<section class="section"><h2>${getLang() === "zh" ? "未找到 EA" : "EA Not Found"}</h2><p>${getLang() === "zh" ? `不存在 ID 为 \"${id}\" 的智能交易系统。` : `No Expert Advisor with ID "${id}".`}</p><a class="button ghost" href="?page=ea-arena">${getLang() === "zh" ? "返回 EA 竞技场" : "Back to EA Arena"}</a></section>`;
  }

  const analysis = store.eaAnalysis[id];
  const mql5Url = `https://www.mql5.com/en/code/${id.replace(/^EA-/, "")}`;

  function scoreBar(label, value, max) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return `<div class="ea-score-row"><span class="ea-score-label">${label}</span><div class="ea-score-bar"><div class="ea-score-fill" style="width:${pct}%"></div></div><span class="ea-score-value">${value}/${max}</span></div>`;
  }

  const infoItems = [
    [getLang() === "zh" ? "策略类型" : "Strategy Type", getEACategoryLabel(ea.category || "Unclassified")],
    [getLang() === "zh" ? "子分类" : "Sub-category", ea.sub_category || "—"],
    [getLang() === "zh" ? "回测状态" : "Backtest Status", getEABacktestStatus(ea.backtest_status)],
    [getLang() === "zh" ? "时间框架" : "Timeframes", (ea.timeframes || []).join(", ") || "—"],
    [getLang() === "zh" ? "指标" : "Indicators", (ea.indicators || []).join(", ") || "—"],
    [getLang() === "zh" ? "作者" : "Author", ea.author || (getLang() === "zh" ? "未知" : "Unknown")],
    [getLang() === "zh" ? "来源" : "Source", `<a href="${mql5Url}" target="_blank" rel="noopener">${getLang() === "zh" ? "MQL5 代码" : "MQL5 Code"}</a>`]
  ]
    .map(
      ([k, v]) => `<div class="ea-info-item"><span class="ea-info-key">${k}</span><span class="ea-info-val">${v}</span></div>`
    )
    .join("");

  let paramsHtml = "";
  if (analysis && analysis.parameters && analysis.parameters.length) {
    const rows = analysis.parameters
      .map(
        (p) => `<tr><td>${p.name_en || p.name || "—"}</td><td>${p.default_value_en || p.default_value || "—"}</td><td>${p.description_en || p.description || "—"}</td></tr>`
      )
      .join("");
    paramsHtml = `
    <div class="ea-section">
      <h2>${getLang() === "zh" ? "参数" : "Parameters"}</h2>
      <table class="ea-params-table">
        <thead><tr><th>${getLang() === "zh" ? "参数" : "Parameter"}</th><th>${getLang() === "zh" ? "默认值" : "Default"}</th><th>${getLang() === "zh" ? "说明" : "Description"}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  let analysisHtml = "";
  if (analysis) {
    const isEn = getLang() === "en";
    const prosList = isEn ? (analysis.pros_en || analysis.pros || []) : (analysis.pros || []);
    const consList = isEn ? (analysis.cons_en || analysis.cons || []) : (analysis.cons || []);
    const impsList = isEn ? (analysis.improvements_en || analysis.improvements || []) : (analysis.improvements || []);
    const prosHtml = prosList.map((p) => `<li>${p}</li>`).join("");
    const consHtml = consList.map((c) => `<li>${c}</li>`).join("");
    const impsHtml = impsList.map((i) => `<li>${i}</li>`).join("");

    let riskHtml = "";
    if (analysis.risk_assessment) {
      const ra = analysis.risk_assessment;
      const riskPointsList = isEn ? (ra.risk_points_en || ra.risk_points || []) : (ra.risk_points || []);
      const riskPoints = riskPointsList.map((rp) => `<li>${rp}</li>`).join("");
      riskHtml = `
      <div class="ea-section">
        <h2>${getLang() === "zh" ? "风险评估" : "Risk Assessment"}</h2>
        <div class="ea-risk-summary">
          <div class="ea-risk-item"><span class="ea-risk-key">${getLang() === "zh" ? "总体" : "Overall"}</span>${eaRiskBadge(ra.overall || ea.overall_risk)}</div>
          ${ra.martingale ? `<div class="ea-risk-item"><span class="ea-risk-key">${getLang() === "zh" ? "马丁格尔" : "Martingale"}</span>${eaRiskBadge(ra.martingale)}</div>` : ""}
          ${ra.stop_loss ? `<div class="ea-risk-item"><span class="ea-risk-key">${getLang() === "zh" ? "止损" : "Stop Loss"}</span>${eaRiskBadge(ra.stop_loss)}</div>` : ""}
        </div>
        ${riskPoints ? `<ul class="ea-risk-points">${riskPoints}</ul>` : ""}
      </div>`;
    }

    let scoresHtml = "";
    if (analysis.scores) {
      const sc = analysis.scores;
      scoresHtml = `
      <div class="ea-section">
        <h2>${getLang() === "zh" ? "评估评分" : "Evaluation Scores"}</h2>
        ${scoreBar(getLang() === "zh" ? "代码质量" : "Code Quality", sc.code_quality || 0, 5)}
        ${scoreBar(getLang() === "zh" ? "策略逻辑" : "Strategy Logic", sc.strategy_logic || 0, 5)}
        ${scoreBar(getLang() === "zh" ? "风险管理" : "Risk Management", sc.risk_management || 0, 5)}
        ${scoreBar(getLang() === "zh" ? "稳健性" : "Robustness", sc.robustness || 0, 5)}
        ${sc.innovation ? scoreBar(getLang() === "zh" ? "创新性" : "Innovation", sc.innovation, 5) : ""}
        ${sc.documentation ? scoreBar(getLang() === "zh" ? "文档" : "Documentation", sc.documentation, 5) : ""}
        ${scoreBar(getLang() === "zh" ? "总体" : "Overall", sc.overall || 0, 5)}
      </div>`;
    }

    const strategyText = isEn ? (analysis.strategy_analysis_en || analysis.summary_en || analysis.strategy_analysis || analysis.summary || "") : (analysis.strategy_analysis || analysis.summary || "");
    analysisHtml = `
    <div class="ea-section"><h2>${getLang() === "zh" ? "策略分析" : "Strategy Analysis"}</h2><div class="ea-analysis-text">${strategyText}</div></div>
    ${paramsHtml}
    <div class="ea-section ea-pros-cons">
      <div class="ea-pros"><h3>${getLang() === "zh" ? "优势" : "Strengths"}</h3><ul>${prosHtml || `<li>${getLang() === "zh" ? "未评估" : "Not evaluated"}</li>`}</ul></div>
      <div class="ea-cons"><h3>${getLang() === "zh" ? "劣势" : "Weaknesses"}</h3><ul>${consHtml || `<li>${getLang() === "zh" ? "未评估" : "Not evaluated"}</li>`}</ul></div>
      <div class="ea-improvements"><h3>${getLang() === "zh" ? "改进建议" : "Improvements"}</h3><ul>${impsHtml || `<li>${getLang() === "zh" ? "未评估" : "Not evaluated"}</li>`}</ul></div>
    </div>
    ${riskHtml}
    ${scoresHtml}
    ${ea.absorbed_by ? `<div class="ea-section ea-absorption"><h2>${getLang() === "zh" ? "吸收状态" : "Absorption Status"}</h2><p>${getLang() === "zh" ? `该 EA 已被吸收到 <strong>${ea.absorbed_by}</strong> 中。` : `This EA has been absorbed into <strong>${ea.absorbed_by}</strong>.`}</p></div>` : ""}`;
  } else {
    analysisHtml = `
    <div class="ea-section ea-pending"><h2>${getLang() === "zh" ? "分析待定" : "Analysis Pending"}</h2><p>${getLang() === "zh" ? "该 EA 尚未完成分析。下方摘要根据源码头部自动生成。" : "This EA has not been analyzed yet. The summary below is auto-generated from the source code header."}</p></div>
    ${paramsHtml}`;
  }

 let backtestHtml = "";
 const btRaw = store.eaBacktestIndex[id];
 if (btRaw) {
  const isNested = btRaw && typeof btRaw === "object" && !btRaw.status && !btRaw.total_trades;
  const isZh = getLang() === "zh";
  let symbols, activeBt, defaultSymbol;
  if (isNested) {
   symbols = Object.keys(btRaw).filter(s => btRaw[s] && btRaw[s].status === "completed");
   defaultSymbol = symbols.includes("EURUSD") ? "EURUSD" : symbols[0];
   activeBt = btRaw[defaultSymbol];
  } else {
   symbols = [];
   defaultSymbol = "";
   activeBt = btRaw.status === "completed" ? btRaw : null;
  }
  if (activeBt) {
   const pnlClass = activeBt.pnl_pct > 0 ? "ea-bt-profit" : activeBt.pnl_pct < 0 ? "ea-bt-loss" : "";
   const hasTrades = activeBt.total_trades > 0;
   const wrClass = activeBt.win_rate >= 50 ? "ea-bt-profit" : "ea-bt-loss";
   const sharpeClass = activeBt.sharpe_ratio > 0 ? "ea-bt-profit" : activeBt.sharpe_ratio < 0 ? "ea-bt-loss" : "";
   let tabsHtml = "";
   if (symbols.length > 1) {
    tabsHtml = `<div class="ea-bt-symbols">${symbols.map(s => {
     const sd = btRaw[s];
     const profit = sd && sd.pnl_pct > 0;
     return `<button class="ea-bt-symbol-btn${s === defaultSymbol ? " active" : ""}" data-bt-symbol="${s}" data-profit="${profit}">${s}</button>`;
    }).join("")}</div>`;
   }
   backtestHtml = `
  <div class="ea-section ea-backtest-section" data-bt-default="${defaultSymbol}">
   <h2>${isZh ? "回测结果" : "Backtest Results"}</h2>
   ${tabsHtml}
   <div class="ea-bt-summary" id="ea-bt-summary">
    <div class="ea-bt-metric ea-bt-metric-main ${pnlClass}">
     <span class="ea-bt-label">${isZh ? "总盈亏" : "Total P&L"}</span>
     <span class="ea-bt-value">${activeBt.pnl_pct > 0 ? "+" : ""}${activeBt.pnl_pct.toFixed(2)}%</span>
     <span class="ea-bt-sub">$${activeBt.start_value ? activeBt.pnl.toFixed(2) : "—"}</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "初始资金" : "Start Value"}</span>
     <span class="ea-bt-value">$${activeBt.start_value ? activeBt.start_value.toLocaleString() : "10,000"}</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "最终资金" : "End Value"}</span>
     <span class="ea-bt-value">$${activeBt.end_value ? activeBt.end_value.toLocaleString() : "—"}</span>
    </div>
   </div>
   <div class="ea-bt-grid" id="ea-bt-grid">
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "总交易数" : "Total Trades"}</span>
     <span class="ea-bt-value">${activeBt.total_trades}</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "胜 / 负" : "Won / Lost"}</span>
     <span class="ea-bt-value">${activeBt.won} / ${activeBt.lost}</span>
    </div>
    <div class="ea-bt-metric ${hasTrades ? wrClass : ""}">
     <span class="ea-bt-label">${isZh ? "胜率" : "Win Rate"}</span>
     <span class="ea-bt-value">${activeBt.win_rate.toFixed(1)}%</span>
    </div>
    <div class="ea-bt-metric ${sharpeClass}">
     <span class="ea-bt-label">${isZh ? "夏普比率" : "Sharpe Ratio"}</span>
     <span class="ea-bt-value">${activeBt.sharpe_ratio !== undefined ? activeBt.sharpe_ratio.toFixed(3) : "—"}</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "最大回撤" : "Max Drawdown"}</span>
     <span class="ea-bt-value ea-bt-loss">${activeBt.max_drawdown_pct !== undefined ? activeBt.max_drawdown_pct.toFixed(2) : "—"}%</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "年化收益" : "Annual Return"}</span>
     <span class="ea-bt-value ${activeBt.annual_return > 0 ? "ea-bt-profit" : activeBt.annual_return < 0 ? "ea-bt-loss" : ""}">${activeBt.annual_return !== undefined ? activeBt.annual_return.toFixed(2) : "—"}%</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "数据源" : "Data Source"}</span>
     <span class="ea-bt-value ea-bt-small">${activeBt.data_file || "—"}</span>
    </div>
    ${activeBt.timestamp ? `<div class="ea-bt-metric"><span class="ea-bt-label">${isZh ? "回测时间" : "Backtest Time"}</span><span class="ea-bt-value ea-bt-small">${new Date(activeBt.timestamp).toLocaleDateString()}</span></div>` : ""}
   </div>
   ${!hasTrades ? `<p class="ea-bt-note">${isZh ? "该策略在当前数据集上未产生交易信号。可能需要调整参数或更换数据周期。" : "No trades were generated on the current dataset. Parameters or timeframe may need adjustment."}</p>` : `<div class="ea-bt-chart-wrap"><canvas id="equity-curve-chart" class="ea-bt-chart"></canvas></div>`}
  </div>`;
  }
 }

  return `
    <section class="ea-detail-page section">
      <a class="ea-back-link" href="?page=ea-arena">← ${getLang() === "zh" ? "返回 EA 竞技场" : "Back to EA Arena"}</a>
      <div class="ea-detail-header">
        <div class="ea-detail-badges">
          <span class="ea-detail-id">${ea.id}</span>
          ${eaCategoryBadge(ea.category || "Unclassified")}
          ${eaRiskBadge(ea.overall_risk)}
          ${eaStars(ea.rating)}
          ${store.eaAnalysis[id] ? `<span class="ea-analyzed-badge">${getLang() === "zh" ? "已分析" : "Analyzed"}</span>` : `<span class="ea-pending-badge">${getLang() === "zh" ? "待定" : "Pending"}</span>`}
          ${ea.absorbed_by ? `<span class="ea-absorbed-badge">${getLang() === "zh" ? "已吸收" : "Absorbed"}</span>` : ""}
        </div>
        <h1>${ea.name || (getLang() === "zh" ? "未知 EA" : "Unknown EA")}</h1>
        <p class="ea-detail-desc">${ea.description || (getLang() === "zh" ? "暂无描述。" : "No description available.")}</p>
      </div>

      <div class="ea-info-grid">${infoItems}</div>

      ${backtestHtml}

      ${analysis && analysis.summary ? `<div class="ea-section"><h2>${getLang() === "zh" ? "摘要" : "Summary"}</h2><p>${analysis.summary}</p></div>` : ""}

      ${analysisHtml}
    </section>`;
}

function bindEADetail(route) {
 const id = route.params.get("id");
 const btRaw = store.eaBacktestIndex[id];
 if (!btRaw) return;
 const isNested = typeof btRaw === "object" && !btRaw.status && !btRaw.total_trades;
 const section = document.querySelector(".ea-backtest-section");
 if (!section) return;
 const defaultSymbol = section.dataset.btDefault || "";
 function loadSymbol(symbol) {
  const path = symbol
   ? `data/backtest-results/${symbol}/${id}.json`
   : `data/backtest-results/${id}.json`;
  fetch(path)
   .then(r => r.json())
   .then(data => {
    if (data.equity_curve && data.equity_curve.length > 0) {
     setTimeout(() => drawEquityCurve(data.equity_curve, data.start_value), 100);
    } else {
     const canvas = document.getElementById("equity-curve-chart");
     if (canvas) { const ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }
   })
   .catch(() => {});
 }
 function updateMetrics(symbol) {
  if (!isNested) return;
  const bt = btRaw[symbol];
  if (!bt) return;
  const isZh = getLang() === "zh";
  const pnlClass = bt.pnl_pct > 0 ? "ea-bt-profit" : bt.pnl_pct < 0 ? "ea-bt-loss" : "";
  const hasTrades = bt.total_trades > 0;
  const wrClass = hasTrades && bt.win_rate >= 50 ? "ea-bt-profit" : hasTrades ? "ea-bt-loss" : "";
  const sharpeClass = bt.sharpe_ratio > 0 ? "ea-bt-profit" : bt.sharpe_ratio < 0 ? "ea-bt-loss" : "";
  const summary = document.getElementById("ea-bt-summary");
  if (summary) {
   summary.innerHTML = `
    <div class="ea-bt-metric ea-bt-metric-main ${pnlClass}">
     <span class="ea-bt-label">${isZh ? "总盈亏" : "Total P&L"}</span>
     <span class="ea-bt-value">${bt.pnl_pct > 0 ? "+" : ""}${bt.pnl_pct.toFixed(2)}%</span>
     <span class="ea-bt-sub">$${bt.start_value ? bt.pnl.toFixed(2) : "—"}</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "初始资金" : "Start Value"}</span>
     <span class="ea-bt-value">$${bt.start_value ? bt.start_value.toLocaleString() : "10,000"}</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "最终资金" : "End Value"}</span>
     <span class="ea-bt-value">$${bt.end_value ? bt.end_value.toLocaleString() : "—"}</span>
    </div>`;
  }
  const grid = document.getElementById("ea-bt-grid");
  if (grid) {
   grid.innerHTML = `
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "总交易数" : "Total Trades"}</span>
     <span class="ea-bt-value">${bt.total_trades}</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "胜 / 负" : "Won / Lost"}</span>
     <span class="ea-bt-value">${bt.won} / ${bt.lost}</span>
    </div>
    <div class="ea-bt-metric ${wrClass}">
     <span class="ea-bt-label">${isZh ? "胜率" : "Win Rate"}</span>
     <span class="ea-bt-value">${bt.win_rate.toFixed(1)}%</span>
    </div>
    <div class="ea-bt-metric ${sharpeClass}">
     <span class="ea-bt-label">${isZh ? "夏普比率" : "Sharpe Ratio"}</span>
     <span class="ea-bt-value">${bt.sharpe_ratio !== undefined ? bt.sharpe_ratio.toFixed(3) : "—"}</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "最大回撤" : "Max Drawdown"}</span>
     <span class="ea-bt-value ea-bt-loss">${bt.max_drawdown_pct !== undefined ? bt.max_drawdown_pct.toFixed(2) : "—"}%</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "年化收益" : "Annual Return"}</span>
     <span class="ea-bt-value ${bt.annual_return > 0 ? "ea-bt-profit" : bt.annual_return < 0 ? "ea-bt-loss" : ""}">${bt.annual_return !== undefined ? bt.annual_return.toFixed(2) : "—"}%</span>
    </div>
    <div class="ea-bt-metric">
     <span class="ea-bt-label">${isZh ? "数据源" : "Data Source"}</span>
     <span class="ea-bt-value ea-bt-small">${bt.data_file || "—"}</span>
    </div>
    ${bt.timestamp ? `<div class="ea-bt-metric"><span class="ea-bt-label">${isZh ? "回测时间" : "Backtest Time"}</span><span class="ea-bt-value ea-bt-small">${new Date(bt.timestamp).toLocaleDateString()}</span></div>` : ""}`;
  }
  const noteEl = section.querySelector(".ea-bt-note");
  const chartWrap = section.querySelector(".ea-bt-chart-wrap");
  if (!hasTrades) {
   if (chartWrap) chartWrap.remove();
   if (!noteEl) {
    const note = document.createElement("p");
    note.className = "ea-bt-note";
    note.textContent = isZh ? "该策略在当前数据集上未产生交易信号。可能需要调整参数或更换数据周期。" : "No trades were generated on the current dataset. Parameters or timeframe may need adjustment.";
    section.appendChild(note);
   }
  } else {
   if (noteEl) noteEl.remove();
   if (!chartWrap) {
    const wrap = document.createElement("div");
    wrap.className = "ea-bt-chart-wrap";
    wrap.innerHTML = '<canvas id="equity-curve-chart" class="ea-bt-chart"></canvas>';
    section.appendChild(wrap);
   }
  }
 }
 if (isNested) {
  const symbols = Object.keys(btRaw).filter(s => btRaw[s] && btRaw[s].status === "completed");
  section.querySelectorAll(".ea-bt-symbol-btn").forEach(btn => {
   btn.addEventListener("click", () => {
    const sym = btn.dataset.btSymbol;
    section.querySelectorAll(".ea-bt-symbol-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    updateMetrics(sym);
    loadSymbol(sym);
   });
  });
  const defaultBt = btRaw[defaultSymbol];
  if (defaultBt && defaultBt.total_trades > 0) loadSymbol(defaultSymbol);
 } else {
  if (btRaw.total_trades > 0) loadSymbol("");
 }
}

function drawEquityCurve(curve, startValue) {
  const canvas = document.getElementById("equity-curve-chart");
  if (!canvas || !curve.length) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.getBoundingClientRect().width || canvas.parentElement.offsetWidth || 800;
  const H = 260;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const pad = { t: 20, r: 16, b: 36, l: 60 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const vals = curve.map(p => p.v);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const textColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
  const startLineY = pad.t + cH * (1 - (startValue - minV) / range);
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (cH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    const v = maxV - (range / 4) * i;
    ctx.fillStyle = textColor;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(v >= 10000 ? "$" + (v / 1000).toFixed(1) + "k" : "$" + v.toFixed(0), pad.l - 8, y + 4);
  }
  if (startValue >= minV && startValue <= maxV) {
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, startLineY); ctx.lineTo(W - pad.r, startLineY); ctx.stroke();
    ctx.setLineDash([]);
  }
  const n = curve.length;
  const xStep = cW / (n - 1);
  const profit = vals[vals.length - 1] >= startValue;
  const lineColor = profit ? "#1f6f78" : "#c0392b";
  const fillTop = profit ? "rgba(31,111,120,0.25)" : "rgba(192,57,43,0.25)";
  const fillBot = "rgba(0,0,0,0)";
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = pad.l + i * xStep;
    const y = pad.t + cH * (1 - (vals[i] - minV) / range);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineTo(pad.l + (n - 1) * xStep, pad.t + cH);
  ctx.lineTo(pad.l, pad.t + cH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
  grad.addColorStop(0, fillTop);
  grad.addColorStop(1, fillBot);
  ctx.fillStyle = grad;
  ctx.fill();
  const dateLabels = [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor(3 * n / 4), n - 1];
  ctx.fillStyle = textColor;
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  dateLabels.forEach(i => {
    if (i < n) {
      const x = pad.l + i * xStep;
      ctx.fillText(curve[i].d.slice(5), x, H - 8);
    }
  });
}

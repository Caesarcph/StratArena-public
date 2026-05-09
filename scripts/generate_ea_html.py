#!/usr/bin/env python3
import os, json, argparse, html
from pathlib import Path

STRATARENA = os.path.join(os.path.dirname(__file__), "..")
DATA_DIR = os.path.join(STRATARENA, "data")
PAGES_DIR = os.path.join(STRATARENA, "ea-pages")

RISK_COLORS = {
    "safe": "#22c55e", "low": "#4ade80", "medium": "#eab308",
    "caution": "#f97316", "high": "#ef4444", "dangerous": "#dc2626", "na": "#6b7280"
}

CATEGORY_COLORS = {
    "Trend Following": "#3b82f6", "Momentum": "#8b5cf6",
    "Mean Reversion": "#ec4899", "Breakout": "#f59e0b",
    "Scalping": "#ef4444", "Grid": "#f97316", "Martingale": "#dc2626",
    "Hedging": "#14b8a6", "Multi-Timeframe": "#6366f1",
    "Pivot Point": "#84cc16", "Candlestick Pattern": "#a855f7",
    "Machine Learning": "#06b6d4", "Statistical Arbitrage": "#10b981",
    "News Trading": "#f43f5e", "Session Trading": "#0ea5e9",
    "Utility": "#64748b", "Unclassified": "#475569"
}

def esc(text):
    return html.escape(str(text)) if text else ""

def stars_html(rating):
    if not rating or rating <= 0:
        return '<span style="color:#6b7280">N/A</span>'
    r = min(5, max(1, round(rating)))
    return f'<span style="color:#eab308">{"★" * r}</span><span style="color:#374151">{"☆" * (5 - r)}</span>'

def score_bar(label, value, max_val=5):
    pct = min(100, max(0, (value / max_val) * 100)) if value else 0
    val_str = f"{value:.1f}" if value else "0"
    return f'<div class="score-row"><span class="score-label">{esc(label)}</span><div class="score-bar"><div class="score-fill" style="width:{pct}%"></div></div><span class="score-value">{val_str}/{max_val}</span></div>'

def list_items(items):
    if not items:
        return '<li style="color:#6b7280">—</li>'
    return "\n".join(f"<li>{esc(item)}</li>" for item in items)

def param_rows(params):
    if not params:
        return '<tr><td colspan="3" style="color:#6b7280;text-align:center">—</td></tr>'
    return "\n".join(
        f'<tr><td>{esc(p.get("name_en") or p.get("name",""))}</td><td><code>{esc(p.get("default_value_en") or p.get("default_value",""))}</code></td><td>{esc(p.get("description_en") or p.get("description",""))}</td></tr>'
        for p in params
    )

def generate_ea_page(ea_id: str, catalog: dict, analysis: dict) -> str:
    cat = catalog.get(ea_id, {})
    ana = analysis.get(ea_id, {})

    ea_name = ana.get("name") or cat.get("name") or ea_id
    category = ana.get("category") or cat.get("category") or "Unclassified"
    category_zh = ana.get("category_zh", "")
    cat_color = CATEGORY_COLORS.get(category, "#475569")
    risk = ana.get("risk_assessment", {}).get("overall") or cat.get("overall_risk") or "na"
    risk_color = RISK_COLORS.get(risk, "#6b7280")
    rating = ana.get("rating") or cat.get("rating") or 0
    is_trading = ana.get("is_trading", True)
    mql5_url = f"https://www.mql5.com/en/code/{ea_id.replace('EA-', '')}"
    description_en = cat.get("description") or ana.get("summary_en") or ana.get("summary") or ""
    description_zh = ana.get("summary_zh") or ana.get("summary") or ""
    summary_en = ana.get("summary_en") or ana.get("summary") or ""
    summary_zh = ana.get("summary_zh") or ana.get("summary") or ""
    strategy_zh = ana.get("strategy_analysis") or ana.get("summary") or ""
    strategy_en = ana.get("strategy_analysis_en") or ana.get("summary_en") or ana.get("summary") or ""
    scores = ana.get("scores", {})
    ra = ana.get("risk_assessment", {})
    risk_points_zh = ra.get("risk_points", [])
    risk_points_en = ra.get("risk_points_en", [])
    timeframes = ana.get("timeframes") or cat.get("timeframes") or []
    indicators = ana.get("indicators_used") or cat.get("indicators") or []
    author = cat.get("author", "")

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(ea_name)} - EA Analysis | QuantArena</title>
<meta name="description" content="{esc(summary_en[:160])}">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6;min-height:100vh}}
.container{{max-width:960px;margin:0 auto;padding:24px 16px}}
.back{{display:inline-block;color:#94a3b8;text-decoration:none;margin-bottom:20px;font-size:14px}}
.back:hover{{color:#e2e8f0}}
.header{{margin-bottom:32px}}
.badges{{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center}}
.badge{{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600}}
.badge-id{{background:#1e293b;color:#94a3b8}}
.badge-cat{{background:{cat_color}22;color:{cat_color};border:1px solid {cat_color}44}}
.badge-risk{{background:{risk_color}22;color:{risk_color};border:1px solid {risk_color}44}}
.badge-type{{background:#1e293b;color:#94a3b8;border:1px solid #334155}}
h1{{font-size:28px;font-weight:700;margin-bottom:8px;color:#f1f5f9}}
.desc{{color:#94a3b8;font-size:14px;margin-bottom:12px}}
.meta-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:32px}}
.meta-item{{background:#1e293b;border-radius:8px;padding:12px}}
.meta-key{{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px}}
.meta-val{{font-size:14px;color:#e2e8f0;margin-top:2px}}
.meta-val a{{color:#3b82f6;text-decoration:none}}
.section{{background:#1e293b;border-radius:12px;padding:20px;margin-bottom:20px}}
.section h2{{font-size:18px;font-weight:600;color:#f1f5f9;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #334155}}
.section h3{{font-size:15px;font-weight:600;color:#94a3b8;margin-bottom:8px}}
.lang-toggle{{display:flex;gap:4px;margin-bottom:16px}}
.lang-btn{{padding:4px 12px;border-radius:6px;border:1px solid #334155;background:transparent;color:#94a3b8;cursor:pointer;font-size:13px}}
.lang-btn.active{{background:#3b82f6;color:#fff;border-color:#3b82f6}}
.pros-cons{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}}
@media(max-width:768px){{.pros-cons{{grid-template-columns:1fr}}}}
.pros ul{{color:#4ade80;list-style:disc;padding-left:20px}}
.cons ul{{color:#f87171;list-style:disc;padding-left:20px}}
.improvements ul{{color:#60a5fa;list-style:disc;padding-left:20px}}
.score-row{{display:flex;align-items:center;gap:8px;margin-bottom:6px}}
.score-label{{width:100px;font-size:13px;color:#94a3b8;flex-shrink:0}}
.score-bar{{flex:1;height:8px;background:#0f172a;border-radius:4px;overflow:hidden}}
.score-fill{{height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:4px}}
.score-value{{width:36px;font-size:13px;color:#94a3b8;text-align:right;flex-shrink:0}}
table{{width:100%;border-collapse:collapse}}
th{{text-align:left;padding:8px 12px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #334155}}
td{{padding:8px 12px;color:#e2e8f0;font-size:14px;border-bottom:1px solid #1e293b}}
code{{background:#0f172a;padding:2px 6px;border-radius:4px;font-size:13px;color:#60a5fa}}
.risk-summary{{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px}}
.risk-item{{display:flex;align-items:center;gap:8px}}
.risk-key{{font-size:13px;color:#94a3b8}}
[lang]{{display:none}}
[lang].visible{{display:block}}
</style>
</head>
<body>
<div class="container">
  <a class="back" href="https://quantarenas.com/?page=ea-arena">← Back to EA Arena</a>

<div class="header">
  <div class="badges">
    <span class="badge badge-id">{esc(ea_id)}</span>
    <span class="badge badge-cat">{esc(category)}</span>
    <span class="badge badge-risk">{esc(risk.upper())}</span>
    <span class="badge badge-type">{"Trading EA" if is_trading else "Utility"}</span>
    {stars_html(rating)}
  </div>
  <h1>{esc(ea_name)}</h1>
  <p class="desc">{esc(description_en)}</p></div>

  <div class="meta-grid">
  <div class="meta-item"><div class="meta-key">Category</div><div class="meta-val">{esc(category)}</div></div>
  <div class="meta-item"><div class="meta-key">Risk</div><div class="meta-val" style="color:{risk_color}">{esc(risk.upper())}</div></div>
  <div class="meta-item"><div class="meta-key">Rating</div><div class="meta-val">{stars_html(rating)}</div></div>
  <div class="meta-item"><div class="meta-key">Timeframes</div><div class="meta-val">{esc(", ".join(timeframes)) if timeframes else "—"}</div></div>
  <div class="meta-item"><div class="meta-key">Indicators</div><div class="meta-val">{esc(", ".join(indicators)) if indicators else "—"}</div></div>
  <div class="meta-item"><div class="meta-key">Author</div><div class="meta-val">{esc(author) or "—"}</div></div>
  <div class="meta-item"><div class="meta-key">Source</div><div class="meta-val"><a href="{mql5_url}" target="_blank" rel="noopener">MQL5 Code</a></div></div>
  <div class="meta-item"><div class="meta-key">Type</div><div class="meta-val">{"Trading EA" if is_trading else "Utility Tool"}</div></div>
  </div>

<div class="section">
  <div class="lang-toggle">
    <button class="lang-btn active" onclick="switchLang(this,'zh')">中文</button>
    <button class="lang-btn" onclick="switchLang(this,'en')">English</button>
  </div>
  <div lang="zh" class="visible">
    <h2>摘要</h2>
    <p>{esc(summary_zh) or "暂无"}</p>
    {"<h2>策略分析</h2><p>" + esc(strategy_zh) + "</p>" if strategy_zh else ""}
  </div>
  <div lang="en">
    <h2>Summary</h2>
    <p>{esc(summary_en) or "N/A"}</p>
    {"<h2>Strategy Analysis</h2><p>" + esc(strategy_en) + "</p>" if strategy_en else ""}
  </div>
</div>

<div class="section">
  <div class="lang-toggle">
    <button class="lang-btn active" onclick="switchLang2(this,'zh')">中文</button>
    <button class="lang-btn" onclick="switchLang2(this,'en')">English</button>
  </div>
  <div lang2="zh" class="visible pros-cons">
    <div class="pros"><h3>优势</h3><ul>{list_items(ana.get("pros", []))}</ul></div>
    <div class="cons"><h3>劣势</h3><ul>{list_items(ana.get("cons", []))}</ul></div>
    <div class="improvements"><h3>改进建议</h3><ul>{list_items(ana.get("improvements", []))}</ul></div>
  </div>
  <div lang2="en" class="pros-cons">
    <div class="pros"><h3>Strengths</h3><ul>{list_items(ana.get("pros_en", []))}</ul></div>
    <div class="cons"><h3>Weaknesses</h3><ul>{list_items(ana.get("cons_en", []))}</ul></div>
    <div class="improvements"><h3>Improvements</h3><ul>{list_items(ana.get("improvements_en", []))}</ul></div>
  </div>
</div>

<div class="section">
  <div class="lang-toggle">
    <button class="lang-btn active" onclick="switchLang3(this,'zh')">中文</button>
    <button class="lang-btn" onclick="switchLang3(this,'en')">English</button>
  </div>
  <div lang3="zh" class="visible">
  <h2>风险评估</h2>
  <div class="risk-summary">
  <div class="risk-item"><span class="risk-key">总体:</span><span class="badge badge-risk">{esc(risk.upper())}</span></div>
  </div>
  <h3>风险点</h3>
  <ul style="list-style:disc;padding-left:20px;color:#f87171">{list_items(risk_points_zh)}</ul>
  </div>
  <div lang3="en">
  <h2>Risk Assessment</h2>
  <div class="risk-summary">
  <div class="risk-item"><span class="risk-key">Overall:</span><span class="badge badge-risk">{esc(risk.upper())}</span></div>
  </div>
  <h3>Risk Points</h3>
  <ul style="list-style:disc;padding-left:20px;color:#f87171">{list_items(risk_points_en)}</ul>
  </div>
</div>

  <div class="section">
  <h2>Evaluation Scores</h2>
  {score_bar("Code Quality", scores.get("code_quality", 0))}
  {score_bar("Strategy Logic", scores.get("strategy_logic", 0))}
  {score_bar("Risk Management", scores.get("risk_management", 0))}
  {score_bar("Robustness", scores.get("robustness", 0))}
  {score_bar("Innovation", scores.get("innovation", 0))}
  {score_bar("Documentation", scores.get("documentation", 0))}
  {score_bar("Overall", scores.get("overall", 0))}
  </div>

  <div class="section">
  <h2>Parameters</h2>
  <table>
  <thead><tr><th>Parameter</th><th>Default</th><th>Description</th></tr></thead>
  <tbody>{param_rows(ana.get("parameters", []))}</tbody>
  </table>
  </div>

</div>

<script>
function switchLang(btn,lang){{
  btn.parentElement.parentElement.querySelectorAll("[lang]").forEach(el=>{{el.classList.toggle("visible",el.getAttribute("lang")===lang)}});
  btn.parentElement.querySelectorAll(".lang-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
}}
function switchLang2(btn,lang){{
  document.querySelectorAll("[lang2]").forEach(el=>el.classList.toggle("visible",el.getAttribute("lang2")===lang));
  btn.parentElement.querySelectorAll(".lang-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
}}
function switchLang3(btn,lang){{
  document.querySelectorAll("[lang3]").forEach(el=>el.classList.toggle("visible",el.getAttribute("lang3")===lang));
  btn.parentElement.querySelectorAll(".lang-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
}}
</script>
</body>
</html>'''


def load_json(path, default=None):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default if default is not None else {}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ea", type=str, help="Generate HTML for specific EA (e.g., EA-11408)")
    parser.add_argument("--rebuild", action="store_true", help="Regenerate all HTML pages")
    args = parser.parse_args()

    catalog_list = load_json(os.path.join(DATA_DIR, "ea_catalog.json"), [])
    analysis = load_json(os.path.join(DATA_DIR, "ea_analysis.json"), {})

    catalog = {ea["id"]: ea for ea in catalog_list}

    os.makedirs(PAGES_DIR, exist_ok=True)

    if args.ea:
        ea_id = args.ea if args.ea.startswith("EA-") else f"EA-{args.ea}"
        if ea_id not in analysis and ea_id not in catalog:
            print(f"ERROR: {ea_id} not found in catalog or analysis")
            return
        html_content = generate_ea_page(ea_id, catalog, analysis)
        out_path = os.path.join(PAGES_DIR, f"{ea_id}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"Generated: {out_path}")
        return

    analyzed_ids = set(analysis.keys())
    if not args.rebuild:
        existing = {f.replace(".html", "") for f in os.listdir(PAGES_DIR) if f.endswith(".html")} if os.path.isdir(PAGES_DIR) else set()
        to_generate = analyzed_ids - existing
    else:
        to_generate = analyzed_ids

    print(f"Catalog: {len(catalog)} | Analysis: {len(analyzed_ids)} | To generate: {len(to_generate)}")

    count = 0
    for ea_id in sorted(to_generate):
        html_content = generate_ea_page(ea_id, catalog, analysis)
        out_path = os.path.join(PAGES_DIR, f"{ea_id}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        count += 1
        if count % 50 == 0:
            print(f"  Generated {count}/{len(to_generate)}...")

    print(f"Done. Generated {count} HTML pages in {PAGES_DIR}")


if __name__ == "__main__":
    main()

# Quant Arena

**Live site: [quantarenas.com](https://quantarenas.com)**

Public build of Quant Arena, a bilingual (English / 中文) research site for systematic trading strategies and MQL5 Expert Advisors. This repository is what GitHub Pages serves at quantarenas.com: static HTML/CSS/JS plus the JSON data the pages load at runtime.

> Research and education only. Nothing here is investment advice, and backtest results are not evidence of live profitability.

## What's on the site

- **Strategy Arena** – 72 documented systematic strategies with rankings, equity curves, and side-by-side comparison.
- **EA Arena** – 1,515 MQL5 Expert Advisors catalogued and analysed (logic summary, parameters, risk rating), each with its own detail page.
- **Backtests** – EAs that can be converted automatically are re-implemented in Python and backtested on H1 data (EURUSD, GBPUSD, USDJPY, XAUUSD).
- **Methodology, research notes and a changelog** documenting how the data is produced and what changed.

## How it works

```
private research repo                      this repo (GitHub Pages)
─────────────────────                      ────────────────────────
Python backtests & EA analysis  ──publish──▶  data/*.json, data/backtest-results/
generate_ea_html.py             ──publish──▶  ea-pages/EA-*.html
                                               index.html + app.js / ea-arena.js
                                               (vanilla JS, Chart.js and canvas charts,
                                                i18n.js for EN/中文)
```

The research pipeline lives in a separate private repository. A scheduled job (`scripts/daily_update.py`) regenerates the data and commits it here as `[auto] … site publish` commits, so most history in this repo is automated.

## Repository layout

| Path | Contents |
| :--- | :--- |
| `index.html`, `app.js`, `ea-arena.js`, `content.js`, `i18n.js`, `styles.css` | Single-page front end (routing via `?page=`) |
| `data/` | Strategy, EA catalogue, analysis and backtest JSON consumed by the front end |
| `ea-pages/` | Pre-rendered, SEO-friendly detail page for each EA |
| `scripts/` | Page generator and the daily publish job |
| `sitemap.xml`, `robots.txt`, `CNAME` | Hosting and SEO |

## Run locally

It's a static site; any file server works:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Stack

Python (data processing, backtesting) · JavaScript · Chart.js · HTML/CSS · JSON · GitHub Pages

---

Built by [Peihao Chen](https://github.com/Caesarcph).

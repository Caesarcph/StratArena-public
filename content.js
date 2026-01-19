const CONTENT_PAGES = {
  about: {
    title: "About QuantArenas",
    subtitle:
      "A research platform that compares systematic strategies under one shared rulebook.",
    updated: "2026-01-13",
    sections: [
      {
        heading: "A research arena, not a signal service",
        paragraphs: [
          "QuantArenas is a research platform for comparing systematic strategies in a consistent, repeatable way. It exists to make strategy behavior visible without the noise of opinionated trade calls. Every strategy is described, scored, and ranked using the same data sources, the same evaluation windows, and the same reporting format. That consistency lets readers compare ideas that normally live in separate notebooks, papers, or blog posts. The site is designed for reading and analysis, not for execution, and it favors clarity over complexity.",
          "QuantArenas is not a signal service, brokerage, or automated trading system. It does not issue buy or sell alerts, provide personalized investment recommendations, or promise results. Strategies here are simplified research models meant to be inspected and stress tested by the reader. The goal is to show how an idea behaves across time and instruments, not to offer a turnkey product or a performance guarantee."
        ]
      },
      {
        heading: "Data sources and transparency",
        paragraphs: [
          "All price series are historical daily bars from public sources, collected through the yfinance interface. The input uses adjusted closes for splits and dividends where available, which keeps long horizon comparisons consistent. Instruments are chosen to cover common index, commodity, and FX proxies that are widely referenced and easy to reproduce. The same instrument list is applied to every strategy so the ranking reflects strategy differences, not data inconsistencies.",
          "Because the project is static and reproducible, the data pipeline prioritizes determinism. Missing sessions are left as gaps, and strategies that require intraday data are intentionally excluded. The data is not a substitute for institutional feeds, and it may include survivorship or proxy biases. These limitations are documented so readers can interpret results as research signals rather than trading grade performance."
        ]
      },
      {
        heading: "How strategies are scored",
        paragraphs: [
          "Strategies are scored with a blended Arena Score that balances return and risk. The score combines CAGR, Sharpe, Sortino, and Calmar ratios, and it penalizes large drawdowns. Each metric is normalized so that a single extreme value cannot dominate the rank. This creates a leaderboard that rewards consistent performance over a single lucky run and discourages brittle, high volatility outcomes.",
          "The system also compares strategy behavior across multiple time windows. A model that only looks strong in the last few months but collapses on longer windows will rank lower than a steadier approach. Walk forward optimization is available to select parameters from prior windows, but if that walk forward output is weaker than the default configuration, the default result is retained. This keeps the score anchored to a realistic baseline."
        ]
      },
      {
        heading: "Research goals and engineering background",
        paragraphs: [
          "QuantArenas is built to support structured research. Every strategy includes readable pseudocode, tags, and suggested comparisons. This makes it easier to examine the intuition behind the rules and to place an idea inside a wider strategy family. The platform is meant to complement academic papers and practitioner notes by giving a standardized output for exploration.",
          "From an engineering perspective, the platform emphasizes a single deterministic pipeline, limited external dependencies, and open inspection of assumptions. The aim is to keep experiments reproducible for students and independent researchers who cannot access proprietary data or black box tools. The site also serves as a log of iterations, showing how a strategy evolves as new evidence is added."
        ]
      },
      {
        heading: "How to use the platform responsibly",
        paragraphs: [
          "Treat the rankings as a research index, not a buy list. Use the results to narrow down ideas, then read the strategy description, inspect the chart behavior, and understand what the signal is actually doing. A strong rank does not replace independent validation, and a weak rank does not mean the idea is useless. The point is to reveal trade offs and to surface questions worth testing.",
          "If you decide to explore a strategy further, rebuild it with your own data, add realistic costs, and stress test across multiple regimes. Consider position sizing, liquidity, and risk controls that are not modeled here. QuantArenas gives a clean baseline, but responsible use requires additional work and a clear understanding of the risks.",
          "Keep notes on why a strategy ranks well and test whether that reason is still plausible today. A simple checklist such as data assumptions, regime fit, and failure mode helps avoid copying strategies blindly. The site is designed to be a starting point for that checklist, not the final answer, and it rewards careful reading over fast decisions."
        ]
      },
      {
        heading: "Risk and usage disclaimer",
        paragraphs: [
          "All information on this site is for educational and research purposes only. It is not financial advice, and it should not be construed as an offer to buy or sell any security, derivative, or cryptocurrency. Past performance does not guarantee future results, and every strategy can experience prolonged losses or underperformance.",
          "Use this material at your own risk. If you act on any idea presented here, you are responsible for evaluating whether it is appropriate for your risk tolerance, time horizon, and regulatory environment. QuantArenas makes no warranties about the accuracy or completeness of the data, and it does not provide tax, legal, or investment guidance."
        ]
      }
    ]
  },
  methodology: {
    title: "Methodology",
    subtitle: "How QuantArenas builds comparable strategy results across assets and time windows.",
    updated: "2026-01-13",
    sections: [
      {
        heading: "Data coverage and inputs",
        paragraphs: [
          "The methodology starts with a shared data universe. Daily adjusted close series are pulled for each instrument, aligned to a common start date, and normalized to a base value for comparison across assets. The instruments cover index, commodity, and FX proxies that are widely traded and have long public histories.",
          "Only daily frequency is used in the core pipeline to reduce noise and to keep the same sampling for every strategy. Intraday signals, event driven models, and microstructure effects are intentionally excluded. The focus is on rules that can be evaluated with end of day data and interpreted consistently across markets."
        ]
      },
      {
        heading: "Signal generation and execution",
        paragraphs: [
          "Signals are generated at the close of each session and applied on the next session. This avoids look ahead bias and aligns with a realistic end of day workflow. Positions are either fully invested or in cash for single asset strategies, while portfolio strategies output target weights that are applied at the next rebalance.",
          "Transaction costs, slippage, and financing are not modeled in the baseline score. The purpose of the Arena Score is relative comparison across strategies, not a broker ready profit and loss statement. Readers should assume that high turnover models will perform worse in live conditions, and that liquidity constraints may invalidate some signals."
        ]
      },
      {
        heading: "Evaluation windows",
        paragraphs: [
          "Each strategy is evaluated across multiple windows, from one month to the full history. The same windows are used for every strategy, which prevents cherry picking. Short windows reveal responsiveness, while long windows highlight regime dependence and drawdown behavior.",
          "Walk forward optimization is enabled to pick parameter sets that worked best in the prior training window, then applied to the next test window. However, if the walk forward result underperforms the default configuration, the default result is kept. This provides a conservative comparison while still capturing the benefit of rolling calibration."
        ]
      },
      {
        heading: "Benchmarks and comparability",
        paragraphs: [
          "Benchmark options include buy and hold, a simple 60/40 proxy, and a risk parity proxy. Benchmarks are normalized to the same starting value as the strategy series, and all reporting uses the same date alignment. This helps readers contextualize how much of the return comes from the strategy rules versus market drift.",
          "Cross asset comparisons use the same scoring logic and the same window set. A strategy that behaves well only on one symbol will show that dependency in the summary metrics, while a robust rule will score more consistently across instruments."
        ]
      },
      {
        heading: "Metrics and Arena Score",
        paragraphs: [
          "The Arena Score blends return and risk metrics instead of relying on a single ratio. CAGR measures compounding, Sharpe captures volatility adjusted return, Sortino focuses on downside risk, and Calmar ties performance to maximum drawdown. Each component is standardized before aggregation, and extreme values are clipped to prevent a single metric from dominating the score.",
          "Drawdown, volatility, and trade count are reported separately to provide a sense of stability and activity. The score is not a prediction of future returns. It is a comparative statistic that highlights how a strategy behaved under this dataset and these rules."
        ]
      },
      {
        heading: "Assumptions and simplifications",
        paragraphs: [
          "The research pipeline assumes full allocation to the active signal with no leverage and no short borrow constraints unless the strategy explicitly defines them. Returns are computed from adjusted closes, which capture splits and dividends but do not model intraday liquidity or execution timing. These assumptions keep results consistent across strategies even if they understate real world frictions.",
          "Portfolio strategies rebalance on a consistent cadence, and trades are applied on the next available session. This standardization makes the comparison fair, but it can also reduce the apparent advantage of faster signals. The intent is to preserve comparability, not to optimize any single strategy's execution."
        ]
      },
      {
        heading: "Limitations and planned refinements",
        paragraphs: [
          "The methodology is intentionally simple so that results remain comparable, but that simplicity has limits. The pipeline does not model intraday fills, execution slippage, or market impact. It also uses public data sources that can differ from institutional feeds. These constraints are part of the design and should be considered when translating results into real portfolios.",
          "Future refinements focus on transparency rather than complexity. Planned upgrades include clearer parameter sensitivity views, richer attribution, and expanded documentation around data quality. The goal is to keep the platform readable while still giving researchers enough detail to judge whether a strategy is robust or fragile."
        ]
      },
      {
        heading: "Interpreting results",
        paragraphs: [
          "The methodology is intentionally transparent, but it is still a model. A high score does not guarantee live performance, and a low score does not prove an idea is worthless. The output should be read as a research summary and combined with other due diligence such as liquidity analysis, execution modeling, and stress testing.",
          "QuantArenas is updated with new strategies and updated data over time. Changes are logged in the changelog so readers can track when rankings shift and why a strategy may behave differently across releases.",
          "When comparing strategies, focus on relative differences rather than absolute precision. Small score gaps may not be meaningful, especially when two strategies share similar risk profiles. Use the charts, drawdown history, and trade count to understand whether a strategy fits your research goals.",
          "All results are for research and education only. They are not financial advice and should not be treated as a recommendation to trade. Always validate a strategy in your own environment before taking any real market risk."
        ]
      }
    ]
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How QuantArenas collects, uses, and protects information.",
    updated: "2026-01-13",
    sections: [
      {
        heading: "Overview",
        paragraphs: [
          "QuantArenas is a static research site. We do not require user accounts and we do not collect personal profiles. This policy explains what limited information may be collected through analytics and advertising services, and how that information is used."
        ]
      },
      {
        heading: "Information we collect",
        paragraphs: [
          "We collect aggregate usage data such as page views, device type, and approximate location through privacy focused analytics. We do not collect names, payment data, or direct identifiers. If you contact us by email, we will receive your email address and any content you send."
        ]
      },
      {
        heading: "Cookies and analytics",
        paragraphs: [
          "The site uses cookies and similar technologies to measure traffic and diagnose errors. We use Cloudflare Web Analytics to understand which pages are read most often and to improve performance. These tools may store anonymous identifiers in your browser."
        ]
      },
      {
        heading: "Advertising",
        paragraphs: [
          "QuantArenas may display ads served by Google AdSense. AdSense may use cookies or device identifiers to show relevant ads and to measure ad performance. You can manage ad personalization in your Google account settings and opt out of interest based ads where available."
        ]
      },
      {
        heading: "Data sharing and retention",
        paragraphs: [
          "We do not sell personal data. We share limited analytics data with our service providers solely to operate and improve the site. Data is retained only as long as needed for analytics and compliance purposes."
        ]
      },
      {
        heading: "Security and contact",
        paragraphs: [
          "We take reasonable steps to protect the site and its data, but no internet service is completely secure. If you have questions about this policy, contact chenpeihao1997@gmail.com."
        ]
      }
    ]
  },
  terms: {
    title: "Terms of Use",
    subtitle: "Conditions for using the QuantArenas website and content.",
    updated: "2026-01-13",
    sections: [
      {
        heading: "Acceptance of terms",
        paragraphs: [
          "By accessing QuantArenas, you agree to these Terms of Use and to all applicable laws and regulations. If you do not agree, please do not use the site."
        ]
      },
      {
        heading: "Research use only",
        paragraphs: [
          "All content is provided for informational, educational, and research purposes. The site does not provide investment advice, trading recommendations, or a guarantee of results. You are responsible for any decisions you make based on the information presented."
        ]
      },
      {
        heading: "No warranties",
        paragraphs: [
          "The site is provided on an as is basis without warranties of any kind. We do not guarantee accuracy, completeness, or availability. Historical performance does not guarantee future results."
        ]
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "All text, design, and original research content on QuantArenas is owned by the site operator unless otherwise noted. You may share links to the site, but you may not copy or redistribute substantial portions of the content without permission."
        ]
      },
      {
        heading: "Third party data",
        paragraphs: [
          "Some data and libraries are provided by third parties such as yfinance and public market data sources. Their terms may apply in addition to these terms."
        ]
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "QuantArenas will not be liable for any direct or indirect losses arising from the use of this site, including lost profits or trading losses. Use the site at your own risk."
        ]
      },
      {
        heading: "Changes",
        paragraphs: [
          "We may update these terms from time to time. Continued use of the site after changes means you accept the updated terms."
        ]
      }
    ]
  }
};

const FAQ_ITEMS = [
  {
    question: "Is this financial advice?",
    answer:
      "No. QuantArenas is a research platform. It does not provide personalized advice or recommendations, and it should not be used as the sole basis for investment decisions."
  },
  {
    question: "Can I auto trade these strategies?",
    answer:
      "The strategies are research models and are not production ready trading systems. If you choose to implement them, you are responsible for execution, risk controls, and compliance with your broker or jurisdiction."
  },
  {
    question: "How often are rankings updated?",
    answer:
      "Rankings are refreshed when data and strategy runs are updated. The site is designed for daily refreshes, and the changelog records when scoring logic or strategy sets change."
  },
  {
    question: "Why do strategies fail or underperform?",
    answer:
      "Strategies can fail because market regimes change, transaction costs are higher than expected, or the original edge was overfit to a specific period. QuantArenas highlights these risks but cannot eliminate them."
  },
  {
    question: "Where does the data come from?",
    answer:
      "Historical data is collected from public sources using the yfinance interface. The site focuses on daily adjusted close series and does not use proprietary feeds."
  },
  {
    question: "Do results include transaction costs?",
    answer:
      "No. The baseline results are frictionless to keep comparisons consistent. High turnover strategies will likely perform worse in live trading once costs are applied."
  },
  {
    question: "How can I suggest a strategy?",
    answer:
      "Email chenpeihao1997@gmail.com with the strategy name, a short description, and any references."
  }
];

const RESEARCH_INDEX = {
  title: "Research",
  intro:
    "QuantArenas research articles explain strategy logic, market fit, and failure modes in long form. These pages are designed for reading, not for live execution.",
  note:
    "Each article includes narrative interpretation, a figure, and a discussion of risks to help you understand when a strategy is likely to break."
};

const RESEARCH_ARTICLES = [
  {
    slug: "ema-crossover-strategy",
    title: "EMA Crossover Strategy: Reading Trend With Two Clocks",
    summary:
      "An in depth look at why exponential moving average crossovers persist, how to interpret their backtests, and when trend signals fail.",
    date: "2026-01-13",
    readTime: "12 min read",
    category: "Trend Following",
    featured: true,
    tags: ["Trend", "Moving Average"],
    figure: {
      title: "EMA crossover signal sketch",
      caption:
        "A simplified illustration of price (teal) with fast and slow EMAs (orange and gray).",
      svg: `<svg viewBox="0 0 640 240" role="img" aria-label="EMA crossover sketch">
  <rect x="0" y="0" width="640" height="240" fill="#f8f1e8" />
  <g stroke="#d8cbbd" stroke-width="1">
    <line x1="40" y1="40" x2="600" y2="40" />
    <line x1="40" y1="80" x2="600" y2="80" />
    <line x1="40" y1="120" x2="600" y2="120" />
    <line x1="40" y1="160" x2="600" y2="160" />
    <line x1="40" y1="200" x2="600" y2="200" />
  </g>
  <polyline fill="none" stroke="#1f6f78" stroke-width="3" points="40,170 90,150 140,160 190,120 240,110 290,90 340,100 390,70 440,60 490,80 540,50 600,70" />
  <polyline fill="none" stroke="#e16b3a" stroke-width="2.5" points="40,180 90,165 140,150 190,135 240,120 290,110 340,105 390,95 440,85 490,80 540,75 600,80" />
  <polyline fill="none" stroke="#7c7c7c" stroke-width="2" points="40,190 90,180 140,170 190,155 240,140 290,130 340,125 390,120 440,115 490,110 540,105 600,100" />
  <circle cx="240" cy="120" r="5" fill="#e16b3a" />
  <circle cx="240" cy="140" r="5" fill="#7c7c7c" />
  <text x="40" y="30" fill="#5b554d" font-size="12">Price</text>
</svg>`
    },
    sections: [
      {
        heading: "Why EMA crossovers persist",
        paragraphs: [
          "The exponential moving average crossover exists because markets rarely move in straight lines. Prices drift, pause, and then continue, and traders need a simple way to decide whether a move is noise or a trend that is worth following. An EMA smooths recent prices while keeping more weight on the latest data, so it reacts faster than a simple average. By comparing a fast EMA to a slow EMA, the strategy asks a single question: is short term momentum strong enough to outrun the long term baseline? The answer is often good enough to keep traders aligned with the dominant move without overfitting to daily noise.",
          "EMA crossovers are also popular because they are easy to explain. A two line rule can be implemented across equities, FX, or commodities with minimal changes, which makes it a natural benchmark for trend systems. The simplicity hides an important idea: the crossover is not a prediction, it is a filter. It allows a trader to say no during choppy regimes and yes during clean directional moves. That filter, not the entry precision, is what keeps the strategy alive across decades."
        ]
      },
      {
        heading: "Signal mechanics without the math overload",
        paragraphs: [
          "A classic EMA crossover uses a fast window such as 20 days and a slow window such as 100 or 200 days. The fast EMA reacts to recent price changes while the slow EMA defines the longer term regime. When the fast line rises above the slow line, the strategy goes long. When it falls below, the strategy exits or goes short depending on the design. This creates a small number of trades, each one attempting to capture a multi week or multi month trend.",
          "Because EMAs emphasize recent data, the crossover often occurs after a trend has already started. That delay is intentional. The strategy gives up the first part of a move in exchange for avoiding many false starts. In practice, the choice of windows controls the trade off between responsiveness and stability. Short windows increase turnover and whipsaws, while longer windows increase delay but may improve trend quality."
        ]
      },
      {
        heading: "Market fit and regime behavior",
        paragraphs: [
          "EMA crossovers are most effective in markets that exhibit sustained directional moves. Equity indices and macro driven commodities often fit this profile because they trend in response to economic cycles, risk appetite, and policy shifts. The strategy can also work in FX pairs when a clear rate differential or risk regime exists, but it tends to be more sensitive to sudden reversals and central bank surprises.",
          "In sideways markets the crossover struggles. Range bound regimes generate frequent cross signals with little follow through, leading to a series of small losses. That is why a crossover strategy typically looks best over long horizons that include both trends and noise. The long horizon allows a few large winners to outweigh the smaller whipsaws."
        ]
      },
      {
        heading: "How to read backtests",
        paragraphs: [
          "Backtests for EMA crossovers often show a stair step equity curve. Long flat periods are followed by sharp gains during trend phases, then giveback during choppy markets. This is not a bug. It reflects the reality that trend following pays only when trends exist. When evaluating results, focus on the distribution of trade outcomes rather than the average trade. A small number of big winners often drives total return.",
          "Look at drawdown depth and duration. A crossover may show acceptable long term return but still experience a multi year drawdown if the market stays range bound or reverses sharply. Also compare trade counts and turnover. If a parameter set produces too many trades, it may be too sensitive and may not survive real world costs."
        ]
      },
      {
        heading: "Risk and failure modes",
        paragraphs: [
          "The primary risk is whipsaw. When price oscillates around the slow EMA, the strategy flips positions and suffers a series of small losses. Another risk is gap risk. Because trades are executed on the next session, a sudden overnight gap can create a much worse entry or exit than expected. The model is also exposed to crash risk because it remains long during trends and exits only after a reversal is confirmed.",
          "Parameter sensitivity is another weakness. A crossover that looks perfect on a specific historical window can fail out of sample if the chosen windows fit that period too tightly. Walk forward tests and multiple window evaluations help, but they do not eliminate the risk of overfitting. Risk overlays such as stop losses or volatility filters can reduce drawdowns, but they may also cut the biggest winners."
        ]
      },
      {
        heading: "How it differs from other trend rules",
        paragraphs: [
          "Compared to Donchian breakouts, EMA crossovers react to average price rather than to extreme highs or lows. This makes them smoother but sometimes slower to catch sudden breakouts. Compared to Keltner or Bollinger channel systems, EMA crossovers ignore volatility expansion and focus purely on direction. That makes them simpler but less adaptive to volatility regimes.",
          "Adaptive moving averages such as KAMA aim to adjust their speed based on market efficiency. They can outperform a fixed EMA in some regimes, but they are harder to interpret and tune. The EMA crossover remains a baseline because it is transparent and robust across assets. It is a useful reference point when testing more complex trend systems."
        ]
      },
      {
        heading: "Practical variations and portfolio use",
        paragraphs: [
          "Researchers often adapt EMA lengths to the instrument. FX pairs may respond better to faster averages, while equity indices may benefit from slower settings that filter out noise. Other variations require the fast EMA to be rising, or the price to be above a longer trend filter, before entering. These small additions can reduce whipsaws without changing the core logic.",
          "In diversified portfolios, EMA crossovers are usually one sleeve among others. Trend exposure can be sized by volatility or capped by correlation so that one regime does not dominate risk. Pairing trend systems with mean reversion or carry models can smooth returns and reduce long drawdown stretches. The crossover works best when it is allowed to do one job: capture trends when they appear.",
          "A practical workflow is to treat the crossover as a regime filter and then apply more refined entries within that regime. For example, a trader might only take pullback entries when the fast EMA stays above the slow EMA. This preserves the trend bias while allowing more precise timing, and it can reduce the frustration of late entries without changing the underlying philosophy."
        ]
      }
    ]
  },
  {
    slug: "parabolic-sar-strategy",
    title: "Parabolic SAR Strategy: A Trend Exit Engine",
    summary:
      "Parabolic SAR uses a trailing stop that accelerates with trend strength. This article explains why it works, when it fails, and how to read its backtests.",
    date: "2026-01-13",
    readTime: "11 min read",
    category: "Trend Following",
    featured: true,
    tags: ["Trend", "Parabolic SAR"],
    figure: {
      title: "Parabolic SAR stop trail",
      caption:
        "Dots represent the SAR level trailing price as the trend accelerates.",
      svg: `<svg viewBox="0 0 640 240" role="img" aria-label="Parabolic SAR sketch">
  <rect x="0" y="0" width="640" height="240" fill="#f8f1e8" />
  <g stroke="#d8cbbd" stroke-width="1">
    <line x1="40" y1="40" x2="600" y2="40" />
    <line x1="40" y1="80" x2="600" y2="80" />
    <line x1="40" y1="120" x2="600" y2="120" />
    <line x1="40" y1="160" x2="600" y2="160" />
    <line x1="40" y1="200" x2="600" y2="200" />
  </g>
  <polyline fill="none" stroke="#1f6f78" stroke-width="3" points="40,180 90,165 140,150 190,135 240,120 290,100 340,90 390,80 440,75 490,70 540,65 600,70" />
  <g fill="#e16b3a">
    <circle cx="60" cy="195" r="4" />
    <circle cx="110" cy="185" r="4" />
    <circle cx="160" cy="175" r="4" />
    <circle cx="210" cy="160" r="4" />
    <circle cx="260" cy="145" r="4" />
    <circle cx="310" cy="125" r="4" />
    <circle cx="360" cy="110" r="4" />
    <circle cx="410" cy="100" r="4" />
    <circle cx="460" cy="95" r="4" />
    <circle cx="510" cy="90" r="4" />
  </g>
</svg>`
    },
    sections: [
      {
        heading: "Why parabolic SAR exists",
        paragraphs: [
          "The parabolic SAR was designed to answer a practical question: how can a trader stay in a trend while progressively locking in gains? Traditional moving average systems wait for a crossover to exit, which can give back a large portion of a move. The SAR creates a trailing stop that rises faster as the trend extends, so it acts like a mechanical way to tighten risk when momentum is strong. In effect it is a trend following rule with an embedded exit engine.",
          "The appeal of SAR is that it converts a vague idea, stay with the trend but do not give everything back, into a concrete rule. It defines a stop level each day. When price crosses that level, the position flips. This creates an automatic acceleration of the stop as the trend persists, which can shorten drawdowns and force discipline in fast moving markets."
        ]
      },
      {
        heading: "Signal mechanics and parameters",
        paragraphs: [
          "A parabolic SAR is computed from prior highs and lows with an acceleration factor. The acceleration factor starts small and increases as the trend continues, which pulls the stop level closer to price. That is why SAR appears as dots that curve toward price over time. When the price touches the dots, the trend is considered broken and the position reverses.",
          "Most implementations use a starting acceleration factor such as 0.02 and a maximum such as 0.2. Lower values make the stop looser and allow trends to run longer, while higher values tighten the stop and create more frequent reversals. The choice of parameters drives the balance between capturing long trends and avoiding long drawdowns when the trend ends."
        ]
      },
      {
        heading: "Market fit and regime behavior",
        paragraphs: [
          "SAR performs best in strong, sustained trends with smooth pullbacks. Commodities and FX sometimes fit this profile when macro drivers create directional momentum. In equity indices, SAR can still work but it may reverse too quickly during volatile corrections because the stop accelerates toward price just as volatility rises.",
          "In sideways markets SAR tends to flip repeatedly. Each reversal can be small, but the cumulative effect can be frustrating. A common way to improve stability is to combine SAR with a higher level trend filter such as a long term moving average, so the SAR only trades in the direction of the broader regime."
        ]
      },
      {
        heading: "How to read backtests",
        paragraphs: [
          "SAR backtests often show faster exits than moving average systems. That usually reduces maximum drawdown but can also reduce total return because the system exits earlier. When reviewing results, compare the distribution of trade lengths. SAR tends to produce many medium length trades rather than a few long ones, which can lead to more turnover.",
          "Also look at the asymmetry of gains and losses. SAR can cut losses quickly, but it can also exit during a normal pullback in a strong trend and then re enter at a worse price. If the equity curve shows a sawtooth pattern, it often means the acceleration is too aggressive for the instrument."
        ]
      },
      {
        heading: "Risk and failure modes",
        paragraphs: [
          "The main risk is over sensitivity to volatility. When volatility spikes, the SAR dots move closer to price and a quick reversal can force an exit at the worst time. The strategy can also reverse too often in noisy regimes, generating costs that the backtest does not model. Another risk is gap exposure. Since the stop is evaluated at the next close, large overnight gaps can bypass the intended exit level.",
          "SAR is also parameter sensitive. A small change in the acceleration factor can materially change the trade count and drawdown profile. That sensitivity makes it prone to overfitting if parameters are tuned too aggressively on a single window. A stable configuration should perform reasonably across multiple windows, not just the best one."
        ]
      },
      {
        heading: "How it differs from other trend tools",
        paragraphs: [
          "Unlike a moving average crossover, SAR does not require two averages. It is closer to a dynamic trailing stop that speeds up when the trend is strong. Compared to Donchian or channel breakouts, SAR reacts to the slope of the move rather than to price extremes. This can make it feel more responsive but also more fragile in choppy markets.",
          "In practice, SAR is often used as an exit engine layered on top of another entry signal. That hybrid approach keeps the entry logic robust and uses SAR to manage exits. When used alone, SAR can still provide a complete system, but it benefits from a trend filter to avoid rapid reversals in range bound conditions."
        ]
      },
      {
        heading: "Implementation notes and risk controls",
        paragraphs: [
          "The acceleration factor is the main sensitivity lever. A lower starting value and a lower maximum keep the stop farther from price, which can preserve longer trends but also allow deeper drawdowns. A higher setting tightens the stop and increases turnover. Many practitioners pair SAR with a volatility filter or a higher timeframe trend condition so that reversals are not triggered during short lived noise spikes.",
          "Because SAR can flip positions quickly, portfolio sizing matters. Risk based position sizing and caps on exposure can prevent the strategy from dominating portfolio risk during volatile regimes. It is also common to enforce a minimum holding period or to require confirmation from another indicator before reversing, which reduces churn while keeping the trailing stop advantage.",
          "A useful diagnostic is to track the average distance between price and the SAR dots. If that distance is consistently tiny, the strategy is likely too sensitive and will churn. If it is consistently large, the system may be too slow to protect gains. Monitoring that distance alongside drawdown can help tune SAR without relying on performance alone.",
          "Some implementations restrict SAR to long only signals in equity indices because short trades can be dominated by short squeezes and policy driven rallies. Testing long only and long short variants side by side helps clarify whether SAR is being used as a trend filter or as a full directional system. The distinction matters when you compare it to other trend rules in the Arena.",
          "Another common tweak is confirmation. Requiring two consecutive closes beyond the SAR dots before reversing can reduce noise while keeping the trailing stop idea intact. This small delay slightly reduces responsiveness but often improves stability when the market oscillates around the stop line."
        ]
      }
    ]
  },
  {
    slug: "volatility-breakout",
    title: "Volatility Breakout Strategy: Trading Expansion Without Overreach",
    summary:
      "Volatility breakouts focus on price moves that escape a recent range. This guide explains the logic, the regimes where it works, and the traps to avoid.",
    date: "2026-01-13",
    readTime: "13 min read",
    category: "Trend Following",
    featured: true,
    tags: ["Breakout", "Volatility"],
    figure: {
      title: "Volatility breakout channel",
      caption:
        "A simplified channel shows how price expansion can trigger a breakout entry.",
      svg: `<svg viewBox="0 0 640 240" role="img" aria-label="Volatility breakout sketch">
  <rect x="0" y="0" width="640" height="240" fill="#f8f1e8" />
  <rect x="60" y="70" width="520" height="100" fill="none" stroke="#7c7c7c" stroke-width="2" stroke-dasharray="6 6" />
  <polyline fill="none" stroke="#1f6f78" stroke-width="3" points="60,160 120,150 180,145 240,140 300,135 360,130 420,120 480,90 540,60 600,70" />
  <circle cx="540" cy="60" r="6" fill="#e16b3a" />
</svg>`
    },
    sections: [
      {
        heading: "Why volatility breakouts matter",
        paragraphs: [
          "Volatility breakout strategies are built on a simple observation: when price finally escapes a tight range, the move can be large because many participants were positioned for mean reversion. A breakout signals that new information or order flow has shifted the balance, and the market is no longer comfortable in its previous range. Traders use this signal to align with the new direction before the move becomes obvious to everyone.",
          "Breakout logic is also attractive because it connects directly to risk management. A range gives a natural level for a stop, and the size of the range helps define position sizing. That structure makes breakouts popular in systematic trend following, especially in futures and macro portfolios where volatility varies widely across instruments."
        ]
      },
      {
        heading: "How the signal is constructed",
        paragraphs: [
          "A common implementation defines a channel around recent prices using average true range or a rolling high and low. When price closes above the upper channel, the strategy goes long; when it closes below the lower channel, it goes short or exits. The channel width adapts to volatility, so the breakout threshold expands when markets are noisy and contracts when markets are calm.",
          "This adaptive threshold is critical. A fixed percentage breakout can be too sensitive in high volatility regimes and too slow in low volatility regimes. By scaling with recent volatility, the strategy focuses on moves that are unusual relative to the current environment, which improves signal quality across assets."
        ]
      },
      {
        heading: "Market fit and regime behavior",
        paragraphs: [
          "Breakouts tend to perform well during regime shifts and macro driven trends. Commodities often experience these phases when supply or demand shocks hit, and FX pairs can trend during rate cycles or geopolitical events. Equity indices also produce breakout opportunities around policy shifts or crisis events, although strong mean reversion phases can still challenge the system.",
          "In stable, low volatility environments, breakouts may trigger but fail quickly, leading to a series of small losses. The strategy may look dormant for long stretches, then suddenly become active during volatility expansions. That behavior is expected and should be interpreted as a feature rather than a flaw."
        ]
      },
      {
        heading: "How to read backtests",
        paragraphs: [
          "When you examine a volatility breakout backtest, look for clusters of gains during crisis or transition periods. Those clusters are often responsible for most of the return. The equity curve may appear flat during quiet markets, then jump during breakouts. This creates a lumpy return profile that can feel uncomfortable but is consistent with the strategy logic.",
          "Trade duration matters. Breakouts that immediately fail suggest the channel is too narrow or the instrument is prone to false moves. If the backtest shows extremely long holding periods, the channel may be too wide and the strategy may be behaving more like a slow trend follower than a breakout system."
        ]
      },
      {
        heading: "Risk and failure modes",
        paragraphs: [
          "False breakouts are the primary risk. Price can briefly cross a channel and then reverse, especially around news events or thin liquidity. Because the backtest does not model slippage, real world results can be worse when breakouts happen during gap moves or fast markets. Another risk is volatility contraction after entry. If volatility collapses, a breakout may stall and reverse, leading to a slow drawdown.",
          "Parameter sensitivity is also important. The lookback window and volatility multiplier can dramatically change trade frequency. Overly short windows can produce excessive churn, while overly long windows may miss early stages of regime change. Robust breakouts tend to use moderate windows and are evaluated across multiple time frames."
        ]
      },
      {
        heading: "How it differs from related strategies",
        paragraphs: [
          "Compared to a pure moving average trend system, a volatility breakout triggers on a discrete range escape rather than on a smooth trend confirmation. This can enter earlier in a move but at the cost of higher false positives. Compared to Donchian breakouts, volatility adjusted channels respond to changing noise levels, which can improve performance across assets with different volatility profiles.",
          "Breakout strategies also differ from mean reversion systems in their relationship to risk. Mean reversion expects price to come back, while breakouts expect price to keep moving. Mixing the two can be valuable, but it requires clear regime logic. Understanding this distinction is essential when interpreting backtests and when combining strategies in a portfolio."
        ]
      },
      {
        heading: "Implementation notes and sizing",
        paragraphs: [
          "Position sizing is a core part of breakout design. Because breakouts often occur alongside volatility expansion, fixed position sizes can lead to unintended risk spikes. Many practitioners scale exposure by recent ATR or by target volatility so that a breakout in a volatile instrument does not overwhelm the portfolio. Others delay entry to the next session to avoid trading directly into a gap, which reduces slippage but may miss a small part of the move.",
          "Exit logic should be explicit. A breakout that fails quickly can be cut using a close back inside the channel, a trailing stop, or a time stop. The choice determines whether the strategy behaves more like a short term breakout system or a longer trend follower. In portfolio context, breakouts are often paired with carry or mean reversion sleeves to diversify the return sources and to reduce the frequency of long flat periods.",
          "Another variation is multi timeframe confirmation. A breakout on a daily chart may be filtered by a weekly trend or by a volatility regime indicator so that signals only fire when expansion aligns across horizons. This reduces false positives but can delay entries. The trade off is consistent with all breakout systems: better signal quality usually means fewer opportunities.",
          "Channel selection also matters. ATR based channels adapt to changing volatility, while Donchian style channels emphasize price extremes. ATR channels may fire earlier in slow expansions, while Donchian channels can wait for clearer regime shifts. Testing both across instruments helps clarify whether the strategy should prioritize early entry or higher conviction breakouts.",
          "Some practitioners wait for a retest of the breakout level before entering. This can increase the win rate by avoiding early false breaks, but it can also miss the strongest trends that never pull back. As with all breakout variants, the trade off is between early participation and higher confirmation.",
          "Volume or regime filters can be layered on top of breakouts to avoid low conviction moves, but they must be applied consistently across assets to avoid bias. If those inputs are not available for every instrument, the cleanest approach is to keep the breakout rules simple and comparable."
        ]
      }
    ]
  },
  {
    slug: "how-quantarenas-ranks-strategies",
    title: "How QuantArenas Ranks Strategies",
    summary:
      "A full methodology essay on why the Arena Score blends multiple metrics, how stability is measured, and how to read results without overfitting.",
    date: "2026-01-13",
    readTime: "14 min read",
    category: "Methodology",
    featured: false,
    tags: ["Methodology", "Scoring"],
    figure: {
      title: "Arena Score components",
      caption:
        "The score balances return and risk to avoid single metric bias.",
      svg: `<svg viewBox="0 0 640 240" role="img" aria-label="Arena score components">
  <rect x="0" y="0" width="640" height="240" fill="#f8f1e8" />
  <rect x="80" y="60" width="80" height="120" fill="#1f6f78" />
  <rect x="200" y="90" width="80" height="90" fill="#e16b3a" />
  <rect x="320" y="80" width="80" height="100" fill="#3d6e4e" />
  <rect x="440" y="70" width="80" height="110" fill="#7c7c7c" />
  <text x="90" y="200" fill="#5b554d" font-size="12">CAGR</text>
  <text x="205" y="200" fill="#5b554d" font-size="12">Sharpe</text>
  <text x="325" y="200" fill="#5b554d" font-size="12">Sortino</text>
  <text x="445" y="200" fill="#5b554d" font-size="12">Calmar</text>
</svg>`
    },
    sections: [
      {
        heading: "Why a single metric is not enough",
        paragraphs: [
          "Many strategy rankings lean on a single number, often Sharpe or CAGR. That shortcut is convenient, but it hides important trade offs. A high CAGR can come from a small number of extreme trades, while a high Sharpe can come from a low volatility strategy that never captures large upside. QuantArenas uses a blended score because no single metric captures return, risk, and drawdown simultaneously.",
          "The blended score is designed to discourage fragile strategies. A model that looks brilliant on one metric but poor on another should not dominate the leaderboard. By combining multiple metrics, the Arena Score reflects the idea that a durable strategy must be good enough across several dimensions, not just one."
        ]
      },
      {
        heading: "Balancing stability with return",
        paragraphs: [
          "Stability is measured by how consistently a strategy performs across time windows and across assets. If a strategy performs well only in a short window, it may be overfit to a specific regime. QuantArenas evaluates multiple windows from one month to the full history so that short term spikes do not define the rank.",
          "This approach often lowers the score of fast, opportunistic strategies. That is intentional. A short term spike might still be valuable to a trader, but it should be treated as a tactical tool, not a core system. The Arena Score is weighted toward repeatability, which favors models that hold up across longer periods."
        ]
      },
      {
        heading: "The role of walk forward optimization",
        paragraphs: [
          "Walk forward optimization is used to evaluate parameter stability. Parameters are optimized on a training window and then applied to a forward test window. This mimics how a strategy might be tuned in practice, while still keeping the test window out of sample.",
          "QuantArenas uses a conservative rule: if the walk forward result underperforms the default parameter configuration, the default result is kept. This prevents the leaderboard from being dominated by aggressive tuning and forces strategies to prove that optimization adds real value."
        ]
      },
      {
        heading: "Benchmarking and normalization",
        paragraphs: [
          "Benchmarks provide context. A strategy that performs only slightly better than a passive benchmark with far more risk should not rank at the top. QuantArenas compares strategy equity curves to benchmarks such as buy and hold, a 60/40 proxy, and a risk parity proxy, and then summarizes the difference in metrics.",
          "Metrics are normalized before aggregation. This means a single outlier does not skew the score. Normalization also allows apples to apples comparisons between instruments with different volatility profiles, which is essential when ranking strategies across indices, commodities, and FX."
        ]
      },
      {
        heading: "How to interpret the Arena Score",
        paragraphs: [
          "The Arena Score is not a promise. It is a ranking under a specific dataset, specific windows, and specific rules. It should be read as a research summary that highlights how a strategy behaved historically under these assumptions. A high score suggests stability and strong risk adjusted returns, but it is not a substitute for live trading validation.",
          "Use the score to shortlist strategies, then read the strategy notes and review the charts. Pay attention to drawdown depth, trade count, and the shape of the equity curve. The ranking is a starting point for analysis, not the final decision."
        ]
      },
      {
        heading: "Reading results in context",
        paragraphs: [
          "Context matters because every strategy reflects a trade off. A strategy that performs well on equity indices might perform poorly on commodities if its logic assumes persistent upward drift. Similarly, a strategy that looks strong in a long window may deliver little in short windows that capture recent regime shifts. The research pages emphasize these differences so you can decide whether a strategy aligns with the market you care about.",
          "The platform also emphasizes cross strategy comparisons. A top ranked strategy is not automatically the best choice if it is highly correlated with other systems you already use. Combining strategies that respond to different signals can reduce portfolio level drawdowns, even if each strategy has a slightly lower standalone score. This is why the Arena includes correlation tools and similarity notes next to the rankings.",
          "Use the score as a map, not a destination. It can highlight strong candidates, but it cannot replace domain knowledge, execution planning, or risk budgeting. The most useful results are often in the middle of the list, where stable strategies with reasonable drawdowns can complement a portfolio without becoming the dominant risk driver."
        ]
      },
      {
        heading: "Using the score in a workflow",
        paragraphs: [
          "A practical workflow starts with the research index, then narrows the list based on asset class and holding period. From there, review the full strategy page, compare it against peers, and inspect the drawdown chart for regime sensitivity. Only after that should you rebuild the strategy with your own parameters and data. This sequence keeps the score as a discovery tool rather than a final decision.",
          "Document your assumptions as you go. If a strategy ranks well because of a specific regime, write that down and monitor when the regime changes. Use the changelog to track method updates, and treat any major rank changes as a prompt to re examine the strategy. A disciplined workflow helps prevent performance chasing and encourages research driven decisions.",
          "The workflow should also include a sanity check against benchmarks. If a strategy only marginally improves on a passive baseline while adding significant drawdown risk, it may not be worth the added complexity. Treat the Arena Score as one signal in a broader research process that includes domain knowledge and practical constraints.",
          "Keep a research log. Recording why you selected a strategy, what risks you expect, and how you plan to size it makes future reviews more objective. Without that context it is easy to attribute success to skill and failure to bad luck, which undermines the purpose of a structured research platform."
        ]
      },
      {
        heading: "Avoiding overconfidence",
        paragraphs: [
          "Backtests can be misleading. Data mining, survivorship bias, and the absence of transaction costs can make a strategy look better than it will perform in live conditions. QuantArenas does not attempt to hide these limitations. Instead, it surfaces them so the reader can calibrate expectations.",
          "The best use of the platform is comparative research. Study how a strategy behaves across assets, how its drawdown compares to peers, and whether it complements other strategies. A research platform cannot guarantee results, but it can help you ask the right questions before capital is at risk."
        ]
      }
    ]
  }
];


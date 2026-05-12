const CONTENT_PAGES = {
  about: {
    title: { en: "About QuantArenas", zh: "关于 QuantArenas" },
    subtitle: {
      en: "A research platform that compares systematic strategies and MQL5 Expert Advisors under one shared rulebook.",
      zh: "一个在统一评估框架下比较系统化策略与 MQL5 EA 的研究平台。"
    },
    updated: "2026-05-11",
    sections: [
      {
        heading: { en: "A research arena, not a signal service", zh: "研究竞技场，而非信号服务" },
        paragraphs: [
          {
            en: "QuantArenas is a research platform for comparing systematic strategies in a consistent, repeatable way. It exists to make strategy behavior visible without the noise of opinionated trade calls. Every strategy is described, scored, and ranked using the same data sources, the same evaluation windows, and the same reporting format. That consistency lets readers compare ideas that normally live in separate notebooks, papers, or blog posts. The site is designed for reading and analysis, not for execution, and it favors clarity over complexity.",
            zh: "QuantArenas 是一个以一致、可复现方式比较系统化策略的研究平台。它的存在，是为了在不受主观交易观点干扰的情况下，让策略行为更加清晰可见。每个策略都使用相同的数据来源、相同的评估窗口和相同的报告格式进行说明、评分与排名。这种一致性让读者能够比较那些原本散落在不同笔记本、论文或博客文章中的想法。本站面向阅读与分析，而非实际执行，并且更重视清晰性而非复杂性。"
          },
          {
            en: "QuantArenas is not a signal service, brokerage, or automated trading system. It does not issue buy or sell alerts, provide personalized investment recommendations, or promise results. Strategies here are simplified research models meant to be inspected and stress tested by the reader. The goal is to show how an idea behaves across time and instruments, not to offer a turnkey product or a performance guarantee.",
            zh: "QuantArenas 不是信号服务、券商平台，也不是自动化交易系统。它不会发布买卖提醒、提供个性化投资建议，或承诺任何结果。这里展示的策略是经过简化的研究模型，旨在供读者审视、复核并进行压力测试。平台的目标，是展示一个想法在不同时间与不同标的上的表现方式，而不是提供开箱即用的产品或业绩保证。"
          }
        ]
      },
      {
        heading: { en: "Data sources and transparency", zh: "数据来源与透明度" },
        paragraphs: [
          {
            en: "All price series are historical daily bars from public sources, collected through the yfinance interface. The input uses adjusted closes for splits and dividends where available, which keeps long horizon comparisons consistent. Instruments are chosen to cover common index, commodity, and FX proxies that are widely referenced and easy to reproduce. The same instrument list is applied to every strategy so the ranking reflects strategy differences, not data inconsistencies.",
            zh: "所有价格序列均来自公共来源的历史日线数据，并通过 yfinance 接口采集。输入数据在可用时采用已对拆股与分红进行调整的收盘价，以保持长期区间比较的一致性。标的的选择覆盖常见的指数、商品与外汇代理品种，这些品种被广泛引用且易于复现。每个策略都使用相同的标的清单，因此排名反映的是策略差异，而不是数据不一致。"
          },
          {
            en: "Because the project is static and reproducible, the data pipeline prioritizes determinism. Missing sessions are left as gaps, and strategies that require intraday data are intentionally excluded. The data is not a substitute for institutional feeds, and it may include survivorship or proxy biases. These limitations are documented so readers can interpret results as research signals rather than trading grade performance.",
            zh: "由于该项目强调静态可复现，数据流水线优先保证确定性。缺失交易日将保留为空缺，而需要日内数据的策略会被有意排除。这里的数据不能替代机构级行情源，并且可能包含生存者偏差或代理偏差。我们明确记录这些限制，以便读者将结果理解为研究参考信号，而非可直接用于实盘的业绩表现。"
          }
        ]
      },
      {
        heading: { en: "How strategies are scored", zh: "策略如何评分" },
        paragraphs: [
          {
            en: "Strategies are scored with a blended Arena Score that balances return and risk. The score combines CAGR, Sharpe, Sortino, and Calmar ratios, and it penalizes large drawdowns. Each metric is normalized so that a single extreme value cannot dominate the rank. This creates a leaderboard that rewards consistent performance over a single lucky run and discourages brittle, high volatility outcomes.",
            zh: "策略采用综合性的 Arena Score 评分，以平衡收益与风险。该评分结合了 CAGR、夏普比率、Sortino 比率与 Calmar 比率，并对大幅回撤进行惩罚。每项指标都会先标准化，避免单一极端值主导整体排名。由此形成的排行榜，更奖励稳定持续的表现，而不是一次幸运行情带来的偶发高收益，也能抑制脆弱且高波动的结果。"
          },
          {
            en: "The system also compares strategy behavior across multiple time windows. A model that only looks strong in the last few months but collapses on longer windows will rank lower than a steadier approach. Walk forward optimization is available to select parameters from prior windows, but if that walk forward output is weaker than the default configuration, the default result is retained. This keeps the score anchored to a realistic baseline.",
            zh: "系统还会在多个时间窗口下比较策略行为。若某个模型仅在最近几个月表现强劲，却在更长周期中失效，其排名会低于更稳健的策略。平台支持滚动前瞻优化，以基于过往窗口选择参数；但若前瞻优化结果弱于默认配置，则保留默认结果。这使得评分始终锚定在更具现实意义的基准之上。"
          }
        ]
      },
      {
        heading: { en: "Research goals and engineering background", zh: "研究目标与工程背景" },
        paragraphs: [
          {
            en: "QuantArenas is built to support structured research. Every strategy includes readable pseudocode, tags, and suggested comparisons. This makes it easier to examine the intuition behind the rules and to place an idea inside a wider strategy family. The platform is meant to complement academic papers and practitioner notes by giving a standardized output for exploration.",
            zh: "QuantArenas 的构建目标是支持结构化研究。每个策略都附带可读性强的伪代码、标签以及建议比较对象，这使得研究者更容易理解规则背后的逻辑直觉，并将某个想法放入更广泛的策略谱系中进行考察。平台希望通过提供标准化输出，补充学术论文与实务研究笔记的探索价值。"
          },
          {
            en: "From an engineering perspective, the platform emphasizes a single deterministic pipeline, limited external dependencies, and open inspection of assumptions. The aim is to keep experiments reproducible for students and independent researchers who cannot access proprietary data or black box tools. The site also serves as a log of iterations, showing how a strategy evolves as new evidence is added.",
            zh: "从工程角度看，平台强调单一且确定性的流水线、尽量有限的外部依赖，以及对各项假设的开放式检视。其目标，是让无法接触专有数据或黑箱工具的学生与独立研究者也能复现实验。本站同时也是一个迭代记录，展示策略如何随着新增证据而不断演化。"
          }
        ]
      },
      {
        heading: { en: "How to use the platform responsibly", zh: "如何负责任地使用本平台" },
        paragraphs: [
          {
            en: "Treat the rankings as a research index, not a buy list. Use the results to narrow down ideas, then read the strategy description, inspect the chart behavior, and understand what the signal is actually doing. A strong rank does not replace independent validation, and a weak rank does not mean the idea is useless. The point is to reveal trade offs and to surface questions worth testing.",
            zh: "请将排名视为研究索引，而不是买入清单。你可以先借助结果缩小研究范围，再阅读策略说明、观察图表行为，并理解信号本身究竟在捕捉什么。高排名不能替代独立验证，低排名也不意味着想法毫无价值。平台的意义在于揭示权衡关系，并提出值得进一步检验的问题。"
          },
          {
            en: "If you decide to explore a strategy further, rebuild it with your own data, add realistic costs, and stress test across multiple regimes. Consider position sizing, liquidity, and risk controls that are not modeled here. QuantArenas gives a clean baseline, but responsible use requires additional work and a clear understanding of the risks.",
            zh: "如果你决定进一步研究某个策略，请使用自己的数据进行重建，加入更真实的交易成本，并在多种市场环境下进行压力测试。同时也应考虑这里尚未建模的仓位规模、流动性与风险控制因素。QuantArenas 提供的是一个干净的基准起点，但负责任的使用仍然需要额外工作，以及对风险有清晰的理解。"
          },
          {
            en: "Keep notes on why a strategy ranks well and test whether that reason is still plausible today. A simple checklist such as data assumptions, regime fit, and failure mode helps avoid copying strategies blindly. The site is designed to be a starting point for that checklist, not the final answer, and it rewards careful reading over fast decisions.",
            zh: "请记录某个策略之所以排名较高的原因，并检验这些原因在当下是否仍然成立。一份简单的检查清单——例如数据假设、市场环境适配性与失效模式——有助于避免盲目照搬策略。本站的定位，是为这份清单提供一个起点，而不是给出最终答案；它鼓励的是审慎阅读，而非仓促决策。"
          }
        ]
      },
    {
      heading: { en: "EA Arena: Expert Advisor analysis", zh: "EA 竞技场：EA 分析模块" },
      paragraphs: [
        {
          en: "EA Arena is a dedicated module for analyzing and comparing MQL5 Expert Advisors. It covers 1,515 EAs from the MQL5 Code Base, each classified into one of 16 categories such as Trend Following, Momentum, Scalping, Breakout, and Utility. Every EA receives an automated analysis that covers strategy logic, risk profile, parameter documentation, and a suitability rating. The goal is to give traders a structured way to browse, compare, and evaluate EAs before deploying them on a live account.",
          zh: "EA 竞技场是用于分析和比较 MQL5 Expert Advisor 的专门模块。它收录了来自 MQL5 Code Base 的 1,515 个 EA，每个 EA 均被归入趋势跟踪、动量、剥头皮、突破、工具等 16 个类别之一。每个 EA 都经过自动化分析，涵盖策略逻辑、风险特征、参数文档与适用性评级。目标是为交易者提供一种结构化的方式，在实际部署前浏览、比较和评估 EA。"
        },
        {
          en: "The analysis pipeline uses NVIDIA GLM-5.1 to read each EA's source code and produce bilingual (Chinese/English) reports. Utility EAs — such as control panels, trade managers, and notification helpers — are separated from trading EAs so that users can filter by purpose. Each EA has a standalone HTML detail page with Open Graph and Twitter Card meta tags for social sharing. EAs can be compared side by side (up to 4 at a time) with a dedicated comparison view.",
          zh: "分析流水线使用 NVIDIA GLM-5.1 读取每个 EA 的源代码，生成中英双语报告。工具类 EA（如控制面板、交易管理器、通知助手）与交易类 EA 分开归类，方便用户按用途筛选。每个 EA 都拥有独立的 HTML 详情页，并带有 Open Graph 与 Twitter Card 元标签以支持社交分享。EA 支持并排比较（最多 4 个），配有专用比较视图。"
        },
        {
          en: "Data is lazy-loaded for performance: the initial page fetch is under 20KB, with individual EA analysis files loaded on demand. The platform enforces a zero-Chinese policy in English fields — if an English translation is unavailable, the field shows N/A rather than leaking Chinese content. There are no uncategorized EAs; every entry has a specific category assignment.",
          zh: "数据采用懒加载机制以优化性能：初始页面请求不超过 20KB，单个 EA 的分析文件按需加载。平台在英文字段中执行零中文策略——如果英文翻译不可用，字段显示 N/A，而不会泄露中文内容。平台中不存在未分类 EA；每个条目都有明确的类别归属。"
        }
      ]
    },
    {
      heading: { en: "Risk and usage disclaimer", zh: "风险与使用免责声明" },
        paragraphs: [
          {
            en: "All information on this site is for educational and research purposes only. It is not financial advice, and it should not be construed as an offer to buy or sell any security, derivative, or cryptocurrency. Past performance does not guarantee future results, and every strategy can experience prolonged losses or underperformance.",
            zh: "本站所有信息仅用于教育与研究目的。其内容不构成金融建议，也不应被解读为对任何证券、衍生品或加密资产的买卖要约。过往表现并不保证未来结果，任何策略都可能经历长期亏损或表现不及预期。"
          },
          {
            en: "Use this material at your own risk. If you act on any idea presented here, you are responsible for evaluating whether it is appropriate for your risk tolerance, time horizon, and regulatory environment. QuantArenas makes no warranties about the accuracy or completeness of the data, and it does not provide tax, legal, or investment guidance.",
            zh: "使用本站内容所产生的风险由你自行承担。若你基于此处展示的任何想法采取行动，你有责任自行评估其是否适合你的风险承受能力、投资期限与监管环境。QuantArenas 不对数据的准确性或完整性作出任何保证，也不提供税务、法律或投资建议。"
          }
        ]
      }
    ]
  },
  methodology: {
    title: { en: "Methodology", zh: "方法论" },
    subtitle: {
      en: "How QuantArenas builds comparable strategy results across assets and time windows.",
      zh: "QuantArenas 如何在不同资产与时间窗口之间构建可比的策略结果。"
    },
    updated: "2026-01-13",
    sections: [
      {
        heading: { en: "Data coverage and inputs", zh: "数据覆盖范围与输入" },
        paragraphs: [
          {
            en: "The methodology starts with a shared data universe. Daily adjusted close series are pulled for each instrument, aligned to a common start date, and normalized to a base value for comparison across assets. The instruments cover index, commodity, and FX proxies that are widely traded and have long public histories.",
            zh: "方法论始于一个共享的数据池。我们为每个标的提取日度复权收盘价序列，将其对齐到统一起始日期，并归一化至同一基准值，以便进行跨资产比较。所选标的覆盖交易活跃、公开历史较长的指数、商品与外汇代理品种。"
          },
          {
            en: "Only daily frequency is used in the core pipeline to reduce noise and to keep the same sampling for every strategy. Intraday signals, event driven models, and microstructure effects are intentionally excluded. The focus is on rules that can be evaluated with end of day data and interpreted consistently across markets.",
            zh: "核心流水线仅使用日频数据，以减少噪声，并确保所有策略采用一致的采样频率。日内信号、事件驱动模型以及微观结构效应均被有意排除。我们的重点是那些能够用日终数据评估，并可在不同市场中保持一致解释的规则。"
          }
        ]
      },
      {
        heading: { en: "Signal generation and execution", zh: "信号生成与执行" },
        paragraphs: [
          {
            en: "Signals are generated at the close of each session and applied on the next session. This avoids look ahead bias and aligns with a realistic end of day workflow. Positions are either fully invested or in cash for single asset strategies, while portfolio strategies output target weights that are applied at the next rebalance.",
            zh: "信号在每个交易日收盘后生成，并在下一个交易日执行。这种设定可避免前视偏差，也更符合现实中的日终决策流程。对于单资产策略，仓位要么满仓持有，要么为空仓；对于组合策略，则输出目标权重，并在下一次再平衡时应用。"
          },
          {
            en: "Transaction costs, slippage, and financing are not modeled in the baseline score. The purpose of the Arena Score is relative comparison across strategies, not a broker ready profit and loss statement. Readers should assume that high turnover models will perform worse in live conditions, and that liquidity constraints may invalidate some signals.",
            zh: "基准评分并未纳入交易成本、滑点与融资成本。Arena Score 的目的，是进行策略之间的相对比较，而不是生成可直接用于券商层面的损益报表。读者应假设，高换手模型在实盘中的表现很可能更差，而流动性约束也可能使部分信号失效。"
          }
        ]
      },
      {
        heading: { en: "Evaluation windows", zh: "评估窗口" },
        paragraphs: [
          {
            en: "Each strategy is evaluated across multiple windows, from one month to the full history. The same windows are used for every strategy, which prevents cherry picking. Short windows reveal responsiveness, while long windows highlight regime dependence and drawdown behavior.",
            zh: "每个策略都会在多个窗口中进行评估，范围从一个月至完整历史区间。所有策略使用相同的窗口集合，以防止选择性展示结果。短窗口有助于观察响应速度，长窗口则更能体现对市场环境的依赖性以及回撤特征。"
          },
          {
            en: "Walk forward optimization is enabled to pick parameter sets that worked best in the prior training window, then applied to the next test window. However, if the walk forward result underperforms the default configuration, the default result is kept. This provides a conservative comparison while still capturing the benefit of rolling calibration.",
            zh: "平台启用滚动前瞻优化，以选取在前一个训练窗口中表现最佳的参数组合，并将其应用于下一测试窗口。但如果前瞻优化结果不如默认配置，则保留默认结果。这样既能保留滚动校准的潜在优势，又能维持更保守的比较标准。"
          }
        ]
      },
      {
        heading: { en: "Benchmarks and comparability", zh: "基准与可比性" },
        paragraphs: [
          {
            en: "Benchmark options include buy and hold, a simple 60/40 proxy, and a risk parity proxy. Benchmarks are normalized to the same starting value as the strategy series, and all reporting uses the same date alignment. This helps readers contextualize how much of the return comes from the strategy rules versus market drift.",
            zh: "基准选项包括买入并持有、简化版 60/40 组合代理，以及风险平价代理。所有基准都会归一化到与策略序列相同的起始值，且全部报告都采用一致的日期对齐方式。这有助于读者区分收益究竟更多来自策略规则，还是来自市场自身漂移。"
          },
          {
            en: "Cross asset comparisons use the same scoring logic and the same window set. A strategy that behaves well only on one symbol will show that dependency in the summary metrics, while a robust rule will score more consistently across instruments.",
            zh: "跨资产比较使用相同的评分逻辑与相同的窗口集合。若某个策略仅在单一标的上表现良好，这种依赖性会在汇总指标中体现出来；而更稳健的规则，则会在不同标的之间取得更一致的得分。"
          }
        ]
      },
      {
        heading: { en: "Metrics and Arena Score", zh: "指标与 Arena Score" },
        paragraphs: [
          {
            en: "The Arena Score blends return and risk metrics instead of relying on a single ratio. CAGR measures compounding, Sharpe captures volatility adjusted return, Sortino focuses on downside risk, and Calmar ties performance to maximum drawdown. Each component is standardized before aggregation, and extreme values are clipped to prevent a single metric from dominating the score.",
            zh: "Arena Score 通过综合收益与风险指标进行评分，而不是依赖单一比率。CAGR 衡量复利增长，夏普比率反映经波动率调整后的收益，Sortino 比率关注下行风险，Calmar 比率则将收益与最大回撤联系起来。各项指标在汇总前都会先进行标准化，并对极端值加以截尾，以防止单一指标主导总分。"
          },
          {
            en: "Drawdown, volatility, and trade count are reported separately to provide a sense of stability and activity. The score is not a prediction of future returns. It is a comparative statistic that highlights how a strategy behaved under this dataset and these rules.",
            zh: "回撤、波动率与交易次数会单独报告，以帮助读者判断策略的稳定性与活跃程度。该评分并不是对未来收益的预测，而是在当前数据集与规则设定下，对策略历史行为进行比较的统计量。"
          }
        ]
      },
      {
        heading: { en: "Assumptions and simplifications", zh: "假设与简化" },
        paragraphs: [
          {
            en: "The research pipeline assumes full allocation to the active signal with no leverage and no short borrow constraints unless the strategy explicitly defines them. Returns are computed from adjusted closes, which capture splits and dividends but do not model intraday liquidity or execution timing. These assumptions keep results consistent across strategies even if they understate real world frictions.",
            zh: "研究流水线默认假设：活跃信号对应满仓配置，不使用杠杆，也不存在融券约束，除非策略本身有明确规定。收益基于复权收盘价计算，因此能够反映拆股与分红，但不会建模日内流动性或具体成交时点。这些假设即便低估了现实交易摩擦，也能保持不同策略之间结果的一致性。"
          },
          {
            en: "Portfolio strategies rebalance on a consistent cadence, and trades are applied on the next available session. This standardization makes the comparison fair, but it can also reduce the apparent advantage of faster signals. The intent is to preserve comparability, not to optimize any single strategy's execution.",
            zh: "组合策略按照一致的频率进行再平衡，交易在下一个可用交易日执行。这种标准化有助于保证比较公平，但也可能削弱更快信号在执行层面的表观优势。我们的目标是维护可比性，而不是优化任何单一策略的执行表现。"
          }
        ]
      },
      {
        heading: { en: "Limitations and planned refinements", zh: "局限性与计划中的改进" },
        paragraphs: [
          {
            en: "The methodology is intentionally simple so that results remain comparable, but that simplicity has limits. The pipeline does not model intraday fills, execution slippage, or market impact. It also uses public data sources that can differ from institutional feeds. These constraints are part of the design and should be considered when translating results into real portfolios.",
            zh: "该方法论刻意保持简洁，以确保结果具备可比性，但这种简洁性本身也存在边界。流水线并未建模日内成交、执行滑点或市场冲击成本，同时使用的也是可能与机构级行情存在差异的公共数据源。这些限制本就是设计的一部分，在将结果映射到真实投资组合时应充分考虑。"
          },
          {
            en: "Future refinements focus on transparency rather than complexity. Planned upgrades include clearer parameter sensitivity views, richer attribution, and expanded documentation around data quality. The goal is to keep the platform readable while still giving researchers enough detail to judge whether a strategy is robust or fragile.",
            zh: "未来的改进重点将放在提升透明度，而非堆叠复杂度。计划中的升级包括更清晰的参数敏感性视图、更丰富的归因分析，以及更完整的数据质量说明文档。目标是在保持平台可读性的同时，为研究者提供足够细节，以判断某个策略究竟稳健还是脆弱。"
          }
        ]
      },
      {
        heading: { en: "Interpreting results", zh: "如何解读结果" },
        paragraphs: [
          {
            en: "The methodology is intentionally transparent, but it is still a model. A high score does not guarantee live performance, and a low score does not prove an idea is worthless. The output should be read as a research summary and combined with other due diligence such as liquidity analysis, execution modeling, and stress testing.",
            zh: "该方法论虽刻意保持透明，但它本质上仍是一个模型。高分并不保证实盘表现，低分也不意味着一个想法毫无价值。输出结果应被视为研究摘要，并与流动性分析、执行建模和压力测试等其他尽职调查工作结合使用。"
          },
          {
            en: "QuantArenas is updated with new strategies and updated data over time. Changes are logged in the changelog so readers can track when rankings shift and why a strategy may behave differently across releases.",
            zh: "QuantArenas 会随着新策略加入与数据更新而持续演进。所有变更都会记录在更新日志中，方便读者追踪排名何时发生变化，以及为何同一策略会在不同版本之间呈现不同表现。"
          },
          {
            en: "When comparing strategies, focus on relative differences rather than absolute precision. Small score gaps may not be meaningful, especially when two strategies share similar risk profiles. Use the charts, drawdown history, and trade count to understand whether a strategy fits your research goals.",
            zh: "在比较策略时，应关注相对差异，而不是绝对精度。尤其当两个策略具有相近的风险特征时，微小的评分差距未必具备实际意义。请结合图表、回撤历史与交易次数，判断某个策略是否符合你的研究目标。"
          },
          {
            en: "All results are for research and education only. They are not financial advice and should not be treated as a recommendation to trade. Always validate a strategy in your own environment before taking any real market risk.",
            zh: "所有结果仅供研究与教育用途。它们不构成金融建议，也不应被视为交易推荐。在承担任何真实市场风险之前，请务必在你自己的环境中完成策略验证。"
          }
        ]
      }
    ]
  },
  privacy: {
    title: { en: "Privacy Policy", zh: "隐私政策" },
    subtitle: {
      en: "How QuantArenas collects, uses, and protects information.",
      zh: "QuantArenas 如何收集、使用并保护信息。"
    },
    updated: "2026-01-13",
    sections: [
      {
        heading: { en: "Overview", zh: "概述" },
        paragraphs: [
          {
            en: "QuantArenas is a static research site. We do not require user accounts and we do not collect personal profiles. This policy explains what limited information may be collected through analytics and advertising services, and how that information is used.",
            zh: "QuantArenas 是一个静态研究网站。我们不要求用户注册账户，也不会收集个人档案信息。本政策说明通过分析服务与广告服务可能收集的有限信息，以及这些信息的使用方式。"
          }
        ]
      },
      {
        heading: { en: "Information we collect", zh: "我们收集的信息" },
        paragraphs: [
          {
            en: "We collect aggregate usage data such as page views, device type, and approximate location through privacy focused analytics. We do not collect names, payment data, or direct identifiers. If you contact us by email, we will receive your email address and any content you send.",
            zh: "我们通过注重隐私的分析工具收集聚合层面的使用数据，例如页面浏览量、设备类型与大致地理位置。我们不会收集姓名、支付信息或直接身份标识符。如果你通过电子邮件联系我们，我们将收到你的邮箱地址以及你发送的内容。"
          }
        ]
      },
      {
        heading: { en: "Cookies and analytics", zh: "Cookie 与分析" },
        paragraphs: [
          {
            en: "The site uses cookies and similar technologies to measure traffic and diagnose errors. We use Cloudflare Web Analytics to understand which pages are read most often and to improve performance. These tools may store anonymous identifiers in your browser.",
            zh: "本站使用 Cookie 及类似技术来衡量流量并诊断错误。我们使用 Cloudflare Web Analytics 来了解哪些页面被最频繁阅读，并据此改进性能。这些工具可能会在你的浏览器中存储匿名标识符。"
          }
        ]
      },
      {
        heading: { en: "Advertising", zh: "广告" },
        paragraphs: [
          {
            en: "QuantArenas may display ads served by Google AdSense. AdSense may use cookies or device identifiers to show relevant ads and to measure ad performance. You can manage ad personalization in your Google account settings and opt out of interest based ads where available.",
            zh: "QuantArenas 可能会展示由 Google AdSense 提供的广告。AdSense 可能使用 Cookie 或设备标识符来展示相关广告并衡量广告效果。你可以在 Google 账户设置中管理广告个性化，并在可用范围内选择退出基于兴趣的广告。"
          }
        ]
      },
      {
        heading: { en: "Data sharing and retention", zh: "数据共享与保留" },
        paragraphs: [
          {
            en: "We do not sell personal data. We share limited analytics data with our service providers solely to operate and improve the site. Data is retained only as long as needed for analytics and compliance purposes.",
            zh: "我们不会出售个人数据。我们仅会在运营与改进网站所必需的范围内，与服务提供商共享有限的分析数据。数据仅在满足分析与合规目的所需的期限内保留。"
          }
        ]
      },
      {
        heading: { en: "Security and contact", zh: "安全与联系方式" },
        paragraphs: [
          {
            en: "We take reasonable steps to protect the site and its data, but no internet service is completely secure. If you have questions about this policy, contact chenpeihao1997@gmail.com.",
            zh: "我们会采取合理措施保护网站及其数据，但任何互联网服务都无法做到绝对安全。如果你对本政策有任何疑问，请联系 chenpeihao1997@gmail.com。"
          }
        ]
      }
    ]
  },
  terms: {
    title: { en: "Terms of Use", zh: "使用条款" },
    subtitle: {
      en: "Conditions for using the QuantArenas website and content.",
      zh: "使用 QuantArenas 网站及内容的相关条件。"
    },
    updated: "2026-01-13",
    sections: [
      {
        heading: { en: "Acceptance of terms", zh: "条款接受" },
        paragraphs: [
          {
            en: "By accessing QuantArenas, you agree to these Terms of Use and to all applicable laws and regulations. If you do not agree, please do not use the site.",
            zh: "访问 QuantArenas 即表示你同意遵守本使用条款以及所有适用法律法规。如不同意，请不要使用本站。"
          }
        ]
      },
      {
        heading: { en: "Research use only", zh: "仅供研究使用" },
        paragraphs: [
          {
            en: "All content is provided for informational, educational, and research purposes. The site does not provide investment advice, trading recommendations, or a guarantee of results. You are responsible for any decisions you make based on the information presented.",
            zh: "所有内容仅供信息获取、教育与研究之用。本站不提供投资建议、交易推荐，也不保证任何结果。你基于所展示信息作出的任何决策，均由你自行负责。"
          }
        ]
      },
      {
        heading: { en: "No warranties", zh: "不作任何保证" },
        paragraphs: [
          {
            en: "The site is provided on an as is basis without warranties of any kind. We do not guarantee accuracy, completeness, or availability. Historical performance does not guarantee future results.",
            zh: "本站按“现状”提供，不附带任何形式的保证。我们不保证内容的准确性、完整性或可用性。历史表现并不保证未来结果。"
          }
        ]
      },
      {
        heading: { en: "Intellectual property", zh: "知识产权" },
        paragraphs: [
          {
            en: "All text, design, and original research content on QuantArenas is owned by the site operator unless otherwise noted. You may share links to the site, but you may not copy or redistribute substantial portions of the content without permission.",
            zh: "除非另有说明，QuantArenas 上的所有文本、设计与原创研究内容均归网站运营方所有。你可以分享本站链接，但未经许可，不得复制或重新分发内容中的实质性部分。"
          }
        ]
      },
      {
        heading: { en: "Third party data", zh: "第三方数据" },
        paragraphs: [
          {
            en: "Some data and libraries are provided by third parties such as yfinance and public market data sources. Their terms may apply in addition to these terms.",
            zh: "部分数据与库由第三方提供，例如 yfinance 及公共市场数据源。除本条款外，这些第三方自身的使用条款也可能适用。"
          }
        ]
      },
      {
        heading: { en: "Limitation of liability", zh: "责任限制" },
        paragraphs: [
          {
            en: "QuantArenas will not be liable for any direct or indirect losses arising from the use of this site, including lost profits or trading losses. Use the site at your own risk.",
            zh: "对于因使用本站而产生的任何直接或间接损失，包括利润损失或交易亏损，QuantArenas 概不承担责任。使用本站风险自负。"
          }
        ]
      },
      {
        heading: { en: "Changes", zh: "条款变更" },
        paragraphs: [
          {
            en: "We may update these terms from time to time. Continued use of the site after changes means you accept the updated terms.",
            zh: "我们可能会不时更新这些条款。条款变更后继续使用本站，即表示你接受更新后的内容。"
          }
        ]
      }
    ]
  }
};

const FAQ_ITEMS = [
  {
    question: { en: "Is this financial advice?", zh: "这是否构成金融建议？" },
    answer: {
      en: "No. QuantArenas is a research platform. It does not provide personalized advice or recommendations, and it should not be used as the sole basis for investment decisions.",
      zh: "不是。QuantArenas 是一个研究平台。它不提供个性化建议或推荐，也不应被作为投资决策的唯一依据。"
    }
  },
  {
    question: { en: "Can I auto trade these strategies?", zh: "我可以将这些策略用于自动交易吗？" },
    answer: {
      en: "The strategies are research models and are not production ready trading systems. If you choose to implement them, you are responsible for execution, risk controls, and compliance with your broker or jurisdiction.",
      zh: "这些策略属于研究模型，并非可直接投产的交易系统。如果你选择自行实现，你需要自行负责执行、风控以及符合你的券商要求和所在司法辖区的合规规定。"
    }
  },
  {
    question: { en: "How often are rankings updated?", zh: "排名多久更新一次？" },
    answer: {
      en: "Rankings are refreshed when data and strategy runs are updated. The site is designed for daily refreshes, and the changelog records when scoring logic or strategy sets change.",
      zh: "当数据与策略运行结果更新时，排名也会随之刷新。本站按日更新进行设计，更新日志会记录评分逻辑或策略集合发生变化的时间点。"
    }
  },
  {
    question: { en: "Why do strategies fail or underperform?", zh: "为什么策略会失效或表现不佳？" },
    answer: {
      en: "Strategies can fail because market regimes change, transaction costs are higher than expected, or the original edge was overfit to a specific period. QuantArenas highlights these risks but cannot eliminate them.",
      zh: "策略可能因市场环境变化、交易成本高于预期，或原始优势仅对某一特定时期过拟合而失效。QuantArenas 会提示这些风险，但无法消除它们。"
    }
  },
  {
    question: { en: "Where does the data come from?", zh: "数据来自哪里？" },
    answer: {
      en: "Historical data is collected from public sources using the yfinance interface. The site focuses on daily adjusted close series and does not use proprietary feeds.",
      zh: "历史数据通过 yfinance 接口从公共来源采集。本站主要使用日度复权收盘价序列，不使用专有行情源。"
    }
  },
  {
    question: { en: "Do results include transaction costs?", zh: "结果是否包含交易成本？" },
    answer: {
      en: "No. The baseline results are frictionless to keep comparisons consistent. High turnover strategies will likely perform worse in live trading once costs are applied.",
      zh: "不包含。基准结果假设无摩擦成本，以保持比较的一致性。高换手策略在计入成本后，实盘表现很可能会更差。"
    }
  },
  {
    question: { en: "How can I suggest a strategy?", zh: "我如何推荐一个策略？" },
    answer: {
      en: "Email chenpeihao1997@gmail.com with the strategy name, a short description, and any references.",
      zh: "请发送邮件至 chenpeihao1997@gmail.com，并附上策略名称、简要说明以及相关参考资料。"
    }
  },
  {
    question: { en: "What is EA Arena?", zh: "什么是 EA 竞技场？" },
    answer: {
      en: "EA Arena is a dedicated module that analyzes and compares 1,515 MQL5 Expert Advisors from the MQL5 Code Base. Each EA is classified into one of 16 categories and receives an automated analysis covering strategy logic, risk profile, parameters, and suitability. You can browse, filter, and compare up to 4 EAs side by side.",
      zh: "EA 竞技场是分析和比较来自 MQL5 Code Base 的 1,515 个 MQL5 Expert Advisor 的专门模块。每个 EA 被归入 16 个类别之一，并经过自动化分析，涵盖策略逻辑、风险特征、参数与适用性。你可以浏览、筛选，并最多并排比较 4 个 EA。"
    }
  },
  {
    question: { en: "How are EAs analyzed?", zh: "EA 是如何被分析的？" },
    answer: {
      en: "Each EA's MQ5 source code is read by NVIDIA GLM-5.1, which produces a structured analysis covering strategy description, risk level, parameter documentation, and category classification. The output is bilingual (Chinese/English). A validation layer ensures every EA has a specific category and that English fields never contain Chinese characters.",
      zh: "每个 EA 的 MQ5 源代码由 NVIDIA GLM-5.1 读取，生成结构化分析，涵盖策略描述、风险等级、参数文档与类别分类。输出为中英双语。验证层确保每个 EA 都有明确类别，且英文字段中不包含中文字符。"
    }
  },
  {
    question: { en: "Why do some English fields show N/A?", zh: "为什么某些英文字段显示 N/A？" },
    answer: {
      en: "The platform enforces a zero-Chinese policy in English views. If an English translation is unavailable or contains Chinese characters, the field is replaced with N/A. This is intentional — N/A is preferable to showing Chinese content to English-speaking users.",
      zh: "平台在英文视图中执行零中文策略。如果英文翻译不可用或包含中文字符，该字段会被替换为 N/A。这是有意为之——对英文用户而言，N/A 比显示中文内容更可取。"
    }
  },
  {
    question: { en: "How are Utility EAs different from trading EAs?", zh: "工具类 EA 与交易类 EA 有何区别？" },
    answer: {
      en: "Utility EAs are tools that assist with trading operations — control panels, trade managers, notification helpers, and dashboard scripts. They do not open or close trades on their own. Trading EAs (Trend Following, Momentum, Scalping, etc.) generate signals and execute trades. The EA Arena separates these so you can filter by purpose.",
      zh: "工具类 EA 是辅助交易操作的工具——控制面板、交易管理器、通知助手和仪表板脚本。它们不会自行开仓或平仓。交易类 EA（趋势跟踪、动量、剥头皮等）生成信号并执行交易。EA 竞技场将两者分开，方便你按用途筛选。"
    }
  },
  {
    question: { en: "Can I compare EAs side by side?", zh: "我可以并排比较 EA 吗？" },
    answer: {
      en: "Yes. Select up to 4 EAs using the checkboxes on the EA Arena page, then click Compare. A comparison modal shows strategy logic, risk levels, categories, and parameters side by side. You can also share comparison links via URL parameters (compare=EA-1,EA-2).",
      zh: "可以。在 EA 竞技场页面使用复选框选择最多 4 个 EA，然后点击比较按钮。比较弹窗会并排展示策略逻辑、风险等级、类别与参数。你也可以通过 URL 参数（compare=EA-1,EA-2）分享比较链接。"
    }
  }
];

const RESEARCH_INDEX = {
  title: { en: "Research", zh: "研究" },
  intro: {
    en: "QuantArenas research articles explain strategy logic, market fit, and failure modes in long form. These pages are designed for reading, not for live execution.",
    zh: "QuantArenas 的研究文章以长文形式解释策略逻辑、市场适配性与失效模式。这些页面面向阅读与研究，而非实时执行。"
  },
  note: {
    en: "Each article includes narrative interpretation, a figure, and a discussion of risks to help you understand when a strategy is likely to break.",
    zh: "每篇文章都包含叙述性解读、一幅示意图以及风险讨论，帮助你理解策略在何种情况下更可能失效。"
  }
};

const RESEARCH_ARTICLES = [
  {
    slug: "keltner-vs-bollinger",
    title: { en: "Keltner Channel Breakout vs Bollinger Band Reversion", zh: "肯特纳通道突破 vs 布林带回归" },
    summary: {
      en: "Comparing two classic volatility envelopes. One rides trends using ATR, the other fades extremes using standard deviation. When to use which?",
      zh: "比较两种经典波动率包络。一种通过 ATR 顺势而行，另一种利用标准差在极端波动中做均值回归。该如何取舍？"
    },
    date: "2026-02-04",
    readTime: "12 min read",
    category: "Trend Following",
    featured: false,
    tags: ["Keltner", "Bollinger", "Breakout", "Mean Reversion"],
    figure: {
      title: { en: "Channel Comparison", zh: "通道对比" },
      caption: {
        en: "Keltner Channels (Blue) are smoother and use ATR; Bollinger Bands (Red) are reactive and use Standard Deviation.",
        zh: "肯特纳通道（蓝色）更平滑，基于 ATR 构建；布林带（红色）反应更敏捷，基于标准差计算。"
      },
      svg: `<svg viewBox="0 0 640 240" role="img" aria-label="Channel comparison">
  <rect x="0" y="0" width="640" height="240" fill="#f8f1e8" />
  <path d="M40,120 Q160,80 280,120 T520,120" fill="none" stroke="#5b554d" stroke-width="2" />
  <path d="M40,90 Q160,50 280,90 T520,90" fill="none" stroke="#1f6f78" stroke-width="2" stroke-dasharray="4" />
  <path d="M40,150 Q160,110 280,150 T520,150" fill="none" stroke="#1f6f78" stroke-width="2" stroke-dasharray="4" />
  <path d="M40,80 Q160,30 280,80 T520,80" fill="none" stroke="#e16b3a" stroke-width="2" />
  <path d="M40,160 Q160,130 280,160 T520,160" fill="none" stroke="#e16b3a" stroke-width="2" />
  <text x="540" y="90" fill="#1f6f78" font-size="10">Keltner</text>
  <text x="540" y="80" fill="#e16b3a" font-size="10">Bollinger</text>
</svg>`
    },
    sections: [
      {
        heading: { en: "Two paths to volatility", zh: "理解波动率的两条路径" },
        paragraphs: [
          {
            en: "Volatility envelopes are among the most versatile tools in a systematic trader's kit. They adapt to market noise, expanding when risk is high and contracting when it is low. But not all envelopes are built the same. Keltner Channels and Bollinger Bands represent two fundamentally different philosophies about how price moves.",
            zh: "波动率包络是系统化交易者工具箱中用途最广的工具之一。它们会随市场噪音变化而自适应：风险升高时扩张，风险回落时收缩。但不同包络的构造逻辑并不相同。肯特纳通道与布林带分别代表了两种对价格运动截然不同的理解框架。"
          },
          {
            en: "Keltner Channels use Average True Range (ATR) to define their width. ATR is an additive metric that measures absolute price movement. Bollinger Bands use Standard Deviation, which measures variance from the mean. This difference sounds academic, but in practice, it changes everything about how the strategy reacts to a breakout.",
            zh: "肯特纳通道用平均真实波幅（ATR）定义通道宽度。ATR 是一种加法型指标，用于衡量价格的绝对波动幅度。布林带则使用标准差来刻画价格围绕均值的离散程度。这个差异听起来像学术细节，但在实盘中，它几乎决定了策略对突破信号的全部反应方式。"
          }
        ]
      },
      {
        heading: { en: "Keltner: The steady hand", zh: "肯特纳：稳健的手" },
        paragraphs: [
          {
            en: "Keltner Channels are typically constructed as an Exponential Moving Average (EMA) plus or minus a multiple of ATR. Because ATR changes relatively slowly, Keltner Channels are stable. They don't flare out wildly during a single shock event. This makes them ideal for trend following.",
            zh: "肯特纳通道通常由指数移动平均线（EMA）上下叠加若干倍 ATR 构成。由于 ATR 的变化相对平缓，肯特纳通道整体更加稳定，不会因为一次单独的冲击事件而剧烈张开。这使它非常适合用于趋势跟随。"
          },
          {
            en: "A Keltner breakout signals that price has moved significantly beyond its average daily range in a sustained way. It suggests a shift in the supply/demand balance that is likely to persist. The stability of the channel means you don't get shaken out by a momentary spike in volatility.",
            zh: "肯特纳通道突破意味着价格以持续方式显著偏离了其平均日内波动区间，暗示供需平衡可能发生了具有延续性的变化。由于通道本身较稳定，策略不容易因短暂的波动率尖峰而被震出场。"
          }
        ]
      },
      {
        heading: { en: "Bollinger: The rubber band", zh: "布林带：橡皮筋效应" },
        paragraphs: [
          {
            en: "Bollinger Bands use standard deviation. Because standard deviation squares the errors, it is highly sensitive to outliers. A sudden price spike causes Bollinger Bands to expand rapidly. This 'ballooning' effect is why Bollinger Bands are often preferred for mean reversion.",
            zh: "布林带使用标准差。由于标准差会对偏离值进行平方处理，因此对异常波动极为敏感。价格一旦突然急冲，布林带会迅速扩张。正是这种“膨胀”效应，使布林带常被用于均值回归策略。"
          },
          {
            en: "When price hits the upper Bollinger Band, it is statistically extended (e.g., 2 sigma moves occur less than 5% of the time in a normal distribution). The rapid expansion of the bands often captures the price action, suggesting the move is overextended and due to snap back—like a stretched rubber band.",
            zh: "当价格触及布林带上轨时，从统计意义上看往往已经处于扩张状态（例如在正态分布下，2 个标准差之外的波动发生概率不到 5%）。布林带的快速扩张通常能捕捉到这种价格拉伸，并提示行情可能已经过度延伸，随后存在像被拉长的橡皮筋一样回弹的可能。"
          }
        ]
      },
      {
        heading: { en: "The Squeeze: When they agree", zh: "挤压形态：两者共识的时刻" },
        paragraphs: [
          {
            en: "One of the most powerful signals occurs when these two indicators are compared. The 'TTM Squeeze' or similar strategies look for periods where the Bollinger Bands contract *inside* the Keltner Channels. This indicates an extremely low volatility regime—the calm before the storm.",
            zh: "最强的信号之一来自这两个指标的对比使用。TTM Squeeze 等类似策略会寻找布林带收缩到*完全落在*肯特纳通道内部的阶段。这通常意味着市场处于极低波动率状态，也就是“风暴前的平静”。"
          },
          {
            en: "When volatility compresses this tightly, a violent expansion usually follows. Traders wait for the Bollinger Bands to break out of the Keltner Channels, signaling the start of a new impulse move. In this context, they work together: Bollinger measures the compression, and Keltner provides the baseline.",
            zh: "当波动率被压缩到如此程度后，往往会迎来剧烈的扩张。交易者会等待布林带重新突破肯特纳通道，以此视为新一轮脉冲行情的起点。在这种用法中，两者是互补关系：布林带负责度量压缩程度，肯特纳通道则提供基准框架。"
          }
        ]
      },
      {
        heading: { en: "Choosing the right tool", zh: "如何选择合适工具" },
        paragraphs: [
          {
            en: "If you are building a trend following system, start with Keltner Channels. Their stability produces fewer false exits during the noisy start of a trend. Use a multiple like 2.0 or 2.5 ATR to filter out chop.",
            zh: "如果你在构建趋势跟随系统，应优先从肯特纳通道开始。其稳定性能够在趋势初期的噪音阶段减少错误离场。常见做法是使用 2.0 或 2.5 倍 ATR 作为过滤参数，以排除震荡行情。"
          },
          {
            en: "If you are building a mean reversion system, start with Bollinger Bands. Their elasticity helps identify the exact moment a move has exhausted itself. Look for closes outside the bands followed by a reversal candle back inside.",
            zh: "如果你在构建均值回归系统，则应优先考虑布林带。其“弹性”特征有助于识别行情何时真正走到衰竭边缘。可重点关注价格收盘突破带外、随后再以反转 K 线回到带内的形态。"
          }
        ]
      }
    ]
  },
  {
    slug: "ema-crossover-strategy",
    title: { en: "EMA Crossover Strategy: Reading Trend With Two Clocks", zh: "EMA 交叉策略：用两只时钟读取趋势" },
    summary: {
      en: "An in depth look at why exponential moving average crossovers persist, how to interpret their backtests, and when trend signals fail.",
      zh: "深入解析指数移动平均线交叉为何长期有效、应如何解读其回测，以及趋势信号何时会失效。"
    },
    date: "2026-01-13",
    readTime: "12 min read",
    category: "Trend Following",
    featured: true,
    tags: ["Trend", "Moving Average"],
    figure: {
      title: { en: "EMA crossover signal sketch", zh: "EMA 交叉信号示意图" },
      caption: {
        en: "A simplified illustration of price (teal) with fast and slow EMAs (orange and gray).",
        zh: "价格（青绿色）与快、慢 EMA（橙色与灰色）的简化示意图。"
      },
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
        heading: { en: "Why EMA crossovers persist", zh: "为何 EMA 交叉长期存在" },
        paragraphs: [
          {
            en: "The exponential moving average crossover exists because markets rarely move in straight lines. Prices drift, pause, and then continue, and traders need a simple way to decide whether a move is noise or a trend that is worth following. An EMA smooths recent prices while keeping more weight on the latest data, so it reacts faster than a simple average. By comparing a fast EMA to a slow EMA, the strategy asks a single question: is short term momentum strong enough to outrun the long term baseline? The answer is often good enough to keep traders aligned with the dominant move without overfitting to daily noise.",
            zh: "指数移动平均线交叉之所以长期有效，是因为市场很少沿直线运行。价格会漂移、停顿，再继续推进，交易者需要一种简单方式来判断当前波动究竟只是噪音，还是值得跟随的趋势。EMA 在平滑近期价格的同时，对最新数据赋予更高权重，因此反应快于简单均线。通过比较快线与慢线，策略本质上只在回答一个问题：短期动能是否足以跑赢长期基准？很多时候，这个答案已足够让交易者跟上主导趋势，而不必对日常噪音过度拟合。"
          },
          {
            en: "EMA crossovers are also popular because they are easy to explain. A two line rule can be implemented across equities, FX, or commodities with minimal changes, which makes it a natural benchmark for trend systems. The simplicity hides an important idea: the crossover is not a prediction, it is a filter. It allows a trader to say no during choppy regimes and yes during clean directional moves. That filter, not the entry precision, is what keeps the strategy alive across decades.",
            zh: "EMA 交叉之所以广受欢迎，还因为它极易解释。一套双均线规则只需极少调整，就能应用到股票、外汇和商品市场，因此天然适合作为趋势系统的基准模型。这种简洁性背后隐藏着一个关键点：交叉不是预测工具，而是过滤器。它帮助交易者在震荡市场中选择观望，在方向清晰的行情中选择参与。真正让这一策略跨越数十年仍然存活的，不是入场精度，而是这种过滤机制。"
          }
        ]
      },
      {
        heading: { en: "Signal mechanics without the math overload", zh: "不过度数学化的信号机制" },
        paragraphs: [
          {
            en: "A classic EMA crossover uses a fast window such as 20 days and a slow window such as 100 or 200 days. The fast EMA reacts to recent price changes while the slow EMA defines the longer term regime. When the fast line rises above the slow line, the strategy goes long. When it falls below, the strategy exits or goes short depending on the design. This creates a small number of trades, each one attempting to capture a multi week or multi month trend.",
            zh: "经典 EMA 交叉通常采用 20 日等较快窗口与 100 日或 200 日等较慢窗口。快 EMA 对近期价格变化反应更快，慢 EMA 则用于界定更长期的市场状态。当快线向上穿越慢线时，策略做多；当快线跌破慢线时，则根据设计选择平仓或反手做空。这样的规则会生成较少但更聚焦的交易，每一笔都试图捕捉数周乃至数月的趋势。"
          },
          {
            en: "Because EMAs emphasize recent data, the crossover often occurs after a trend has already started. That delay is intentional. The strategy gives up the first part of a move in exchange for avoiding many false starts. In practice, the choice of windows controls the trade off between responsiveness and stability. Short windows increase turnover and whipsaws, while longer windows increase delay but may improve trend quality.",
            zh: "由于 EMA 更重视近期数据，交叉往往发生在趋势已经启动之后。这种滞后是有意为之。策略愿意放弃一段行情起步阶段，以换取减少大量假启动信号。在实务中，窗口长度决定了“响应速度”与“稳定性”之间的权衡。较短窗口会提高换手并带来更多反复震荡，较长窗口则会增加滞后，但往往能提升趋势质量。"
          }
        ]
      },
      {
        heading: { en: "Market fit and regime behavior", zh: "市场适配性与市场状态表现" },
        paragraphs: [
          {
            en: "EMA crossovers are most effective in markets that exhibit sustained directional moves. Equity indices and macro driven commodities often fit this profile because they trend in response to economic cycles, risk appetite, and policy shifts. The strategy can also work in FX pairs when a clear rate differential or risk regime exists, but it tends to be more sensitive to sudden reversals and central bank surprises.",
            zh: "EMA 交叉在持续单边运行的市场中最为有效。股票指数与受宏观因素驱动的商品通常符合这一特征，因为它们会随经济周期、风险偏好和政策变化形成趋势。当汇率差异或风险环境较为明确时，该策略在外汇品种中也能发挥作用，但对突发反转和央行意外事件通常更为敏感。"
          },
          {
            en: "In sideways markets the crossover struggles. Range bound regimes generate frequent cross signals with little follow through, leading to a series of small losses. That is why a crossover strategy typically looks best over long horizons that include both trends and noise. The long horizon allows a few large winners to outweigh the smaller whipsaws.",
            zh: "在横盘市场中，交叉策略往往表现艰难。区间震荡会产生频繁交叉，但后续延续性很差，最终形成一连串小亏损。因此，交叉策略通常只有在同时覆盖趋势与噪音的长周期回测中，表现才更有说服力。拉长周期后，少数大赢家才有机会覆盖大量小幅震荡损失。"
          }
        ]
      },
      {
        heading: { en: "How to read backtests", zh: "如何解读回测" },
        paragraphs: [
          {
            en: "Backtests for EMA crossovers often show a stair step equity curve. Long flat periods are followed by sharp gains during trend phases, then giveback during choppy markets. This is not a bug. It reflects the reality that trend following pays only when trends exist. When evaluating results, focus on the distribution of trade outcomes rather than the average trade. A small number of big winners often drives total return.",
            zh: "EMA 交叉策略的回测净值曲线常呈现“台阶状”。长时间横盘之后，趋势阶段出现快速拉升，随后又在震荡市场中回吐部分收益。这并不是缺陷，而是趋势跟随的真实特征：只有当趋势存在时，策略才会获得报酬。评估结果时，应更多关注交易结果的分布，而不是单笔平均收益。总体回报往往由少数几笔大赢家驱动。"
          },
          {
            en: "Look at drawdown depth and duration. A crossover may show acceptable long term return but still experience a multi year drawdown if the market stays range bound or reverses sharply. Also compare trade counts and turnover. If a parameter set produces too many trades, it may be too sensitive and may not survive real world costs.",
            zh: "还应重点观察回撤深度与回撤持续时间。某一组交叉参数即便长期收益尚可，如果市场长期震荡或急剧反转，仍可能经历持续数年的回撤。同时也要比较交易次数与换手率。若某组参数产生过多交易，往往意味着系统过于敏感，未必能承受真实世界中的交易成本。"
          }
        ]
      },
      {
        heading: { en: "Risk and failure modes", zh: "风险与失效模式" },
        paragraphs: [
          {
            en: "The primary risk is whipsaw. When price oscillates around the slow EMA, the strategy flips positions and suffers a series of small losses. Another risk is gap risk. Because trades are executed on the next session, a sudden overnight gap can create a much worse entry or exit than expected. The model is also exposed to crash risk because it remains long during trends and exits only after a reversal is confirmed.",
            zh: "核心风险是反复震荡带来的 whipsaw。当价格围绕慢 EMA 来回摆动时，策略会频繁翻转仓位并承受连续小亏损。另一个风险是跳空风险。由于交易在下一交易时段执行，隔夜跳空可能导致远差于预期的入场或出场价格。该模型还暴露于崩跌风险之下，因为它在趋势中持续持有，只有在反转被确认后才退出。"
          },
          {
            en: "Parameter sensitivity is another weakness. A crossover that looks perfect on a specific historical window can fail out of sample if the chosen windows fit that period too tightly. Walk forward tests and multiple window evaluations help, but they do not eliminate the risk of overfitting. Risk overlays such as stop losses or volatility filters can reduce drawdowns, but they may also cut the biggest winners.",
            zh: "参数敏感性也是其弱点之一。某组交叉参数在特定历史窗口中看似完美，但若窗口选择对该时期拟合过紧，样本外表现可能迅速失效。滚动前瞻测试和多窗口评估虽然有帮助，但并不能彻底消除过拟合风险。止损或波动率过滤等风险覆盖层可以降低回撤，但也可能同时截断那些最重要的大盈利交易。"
          }
        ]
      },
      {
        heading: { en: "How it differs from other trend rules", zh: "它与其他趋势规则有何不同" },
        paragraphs: [
          {
            en: "Compared to Donchian breakouts, EMA crossovers react to average price rather than to extreme highs or lows. This makes them smoother but sometimes slower to catch sudden breakouts. Compared to Keltner or Bollinger channel systems, EMA crossovers ignore volatility expansion and focus purely on direction. That makes them simpler but less adaptive to volatility regimes.",
            zh: "与唐奇安突破相比，EMA 交叉关注的是平均价格变化，而不是极端高点或低点，因此通常更平滑，但在应对突发突破时有时会更慢。与肯特纳或布林带通道系统相比，EMA 交叉忽略波动率扩张，只聚焦方向本身。这使它更简单，但对不同波动率环境的适应性较弱。"
          },
          {
            en: "Adaptive moving averages such as KAMA aim to adjust their speed based on market efficiency. They can outperform a fixed EMA in some regimes, but they are harder to interpret and tune. The EMA crossover remains a baseline because it is transparent and robust across assets. It is a useful reference point when testing more complex trend systems.",
            zh: "像 KAMA 这样的自适应移动平均线试图根据市场效率动态调整响应速度。在某些市场状态下，它们可能优于固定 EMA，但解释和调参都更复杂。EMA 交叉之所以仍被视为基准，是因为它足够透明，并能在多类资产上保持稳健。在测试更复杂的趋势系统时，它是一个非常有价值的参考起点。"
          }
        ]
      },
      {
        heading: { en: "Practical variations and portfolio use", zh: "实务变体与组合中的角色" },
        paragraphs: [
          {
            en: "Researchers often adapt EMA lengths to the instrument. FX pairs may respond better to faster averages, while equity indices may benefit from slower settings that filter out noise. Other variations require the fast EMA to be rising, or the price to be above a longer trend filter, before entering. These small additions can reduce whipsaws without changing the core logic.",
            zh: "研究者通常会根据标的调整 EMA 长度。外汇货币对可能更适合较快均线，而股票指数则可能更受益于能过滤噪音的较慢参数。其他常见变体包括要求快 EMA 本身正在上行，或要求价格位于更长期趋势过滤器上方后才允许入场。这些小幅调整能在不改变核心逻辑的前提下减少反复震荡。"
          },
          {
            en: "In diversified portfolios, EMA crossovers are usually one sleeve among others. Trend exposure can be sized by volatility or capped by correlation so that one regime does not dominate risk. Pairing trend systems with mean reversion or carry models can smooth returns and reduce long drawdown stretches. The crossover works best when it is allowed to do one job: capture trends when they appear.",
            zh: "在分散化投资组合中，EMA 交叉通常只是其中一个策略分层。趋势敞口可以按波动率分配，或通过相关性上限进行约束，以避免单一市场状态主导组合风险。将趋势系统与均值回归或 carry 模型配合，往往有助于平滑收益并缩短长期回撤阶段。EMA 交叉最适合承担一项清晰任务：当趋势出现时负责捕捉它。"
          },
          {
            en: "A practical workflow is to treat the crossover as a regime filter and then apply more refined entries within that regime. For example, a trader might only take pullback entries when the fast EMA stays above the slow EMA. This preserves the trend bias while allowing more precise timing, and it can reduce the frustration of late entries without changing the underlying philosophy.",
            zh: "一种实用流程是先把交叉视为市场状态过滤器，再在该状态内叠加更精细的入场规则。例如，交易者可以仅在快 EMA 位于慢 EMA 上方时做回调买入。这样既保留了趋势偏向，又能获得更精确的择时，同时减少“追得太晚”的挫败感，而无需改变策略的底层哲学。"
          }
        ]
      }
    ]
  },
  {
    slug: "parabolic-sar-strategy",
    title: { en: "Parabolic SAR Strategy: A Trend Exit Engine", zh: "抛物线 SAR 策略：趋势退出引擎" },
    summary: { en: "Parabolic SAR uses a trailing stop that accelerates with trend strength. This article explains why it works, when it fails, and how to read its backtests.", zh: "抛物线 SAR 使用会随趋势强度加速的跟踪止损。本文解释它为何有效、何时失效，以及如何解读其回测。" },
    date: "2026-01-13",
    readTime: "11 min read",
    category: "Trend Following",
    featured: true,
    tags: ["Trend", "Parabolic SAR"],
    figure: {
      title: { en: "Parabolic SAR stop trail", zh: "抛物线 SAR 止损轨迹" },
      caption: { en: "Dots represent the SAR level trailing price as the trend accelerates.", zh: "圆点表示随着趋势加速而不断贴近价格的 SAR 水平。" },
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
    sections: []
  },
  {
    slug: "volatility-breakout",
    title: { en: "Volatility Breakout Strategy: Trading Expansion Without Overreach", zh: "波动率突破策略：参与扩张而不过度追价" },
    summary: { en: "Volatility breakouts focus on price moves that escape a recent range. This guide explains the logic, the regimes where it works, and the traps to avoid.", zh: "波动率突破聚焦于价格脱离近期区间的走势。本文解释其逻辑、适用的市场环境以及需要避免的陷阱。" },
    date: "2026-01-13",
    readTime: "13 min read",
    category: "Trend Following",
    featured: true,
    tags: ["Breakout", "Volatility"],
    figure: {
      title: { en: "Volatility breakout channel", zh: "波动率突破通道" },
      caption: { en: "A simplified channel shows how price expansion can trigger a breakout entry.", zh: "简化通道示意价格扩张如何触发突破入场。" },
      svg: `<svg viewBox="0 0 640 240" role="img" aria-label="Volatility breakout sketch">
  <rect x="0" y="0" width="640" height="240" fill="#f8f1e8" />
  <rect x="60" y="70" width="520" height="100" fill="none" stroke="#7c7c7c" stroke-width="2" stroke-dasharray="6 6" />
  <polyline fill="none" stroke="#1f6f78" stroke-width="3" points="60,160 120,150 180,145 240,140 300,135 360,130 420,120 480,90 540,60 600,70" />
  <circle cx="540" cy="60" r="6" fill="#e16b3a" />
</svg>`
    },
    sections: []
  },
  {
    slug: "donchian-turtle-breakout",
    title: { en: "Donchian Channel and Turtle Breakout: Trading the 20/10 Rule", zh: "唐奇安通道与海龟突破：交易 20/10 规则" },
    summary: { en: "The Turtle system uses Donchian breakouts and risk based sizing to capture sustained trends. This research note explains the logic, market fit, and failure modes.", zh: "海龟系统通过唐奇安突破与基于风险的头寸规模来捕捉持续趋势。本文说明其逻辑、市场适配性与失效模式。" },
    date: "2026-01-20",
    readTime: "14 min read",
    category: "Trend Following",
    featured: false,
    tags: ["Breakout", "Donchian", "Turtle"],
    figure: {
      title: { en: "Donchian breakout channel", zh: "唐奇安突破通道" },
      caption: { en: "Price pushes above the recent channel to trigger a breakout entry.", zh: "价格向上突破近期通道，从而触发突破入场。" },
      svg: `<svg viewBox="0 0 640 240" role="img" aria-label="Donchian breakout sketch">
  <rect x="0" y="0" width="640" height="240" fill="#f8f1e8" />
  <rect x="70" y="70" width="500" height="100" fill="none" stroke="#7c7c7c" stroke-width="2" stroke-dasharray="6 6" />
  <polyline fill="none" stroke="#1f6f78" stroke-width="3" points="70,160 120,150 170,140 220,145 270,130 320,120 370,110 420,95 470,85 520,70 570,60" />
  <circle cx="520" cy="70" r="6" fill="#e16b3a" />
</svg>`
    },
    sections: []
  },
  {
    slug: "supertrend-atr-trailing-stop",
    title: { en: "Supertrend and ATR Trailing Stop: Volatility Adjusted Trend Control", zh: "Supertrend 与 ATR 跟踪止损：波动率调整后的趋势控制" },
    summary: { en: "Supertrend uses ATR based bands to define trend flips and stops. This research note explains the signal mechanics, regime fit, and the risks of whipsaw.", zh: "Supertrend 使用基于 ATR 的带状结构定义趋势翻转与止损。本文解释其信号机制、适用环境与反复震荡风险。" },
    date: "2026-01-20",
    readTime: "13 min read",
    category: "Trend Following",
    featured: false,
    tags: ["Supertrend", "ATR", "Trailing Stop"],
    figure: {
      title: { en: "Supertrend band and flip", zh: "Supertrend 带与翻转" },
      caption: { en: "ATR based bands trail price and flip when the trend changes.", zh: "基于 ATR 的带状结构跟随价格，并在趋势变化时翻转。" },
      svg: `<svg viewBox="0 0 640 240" role="img" aria-label="Supertrend sketch">
  <rect x="0" y="0" width="640" height="240" fill="#f8f1e8" />
  <polyline fill="none" stroke="#7c7c7c" stroke-width="2" points="60,170 120,155 180,150 240,140 300,130 360,120 420,115 480,120 540,110 600,100" />
  <polyline fill="none" stroke="#1f6f78" stroke-width="2.5" points="60,150 120,135 180,128 240,118 300,108 360,100 420,98 480,105 540,95 600,88" />
  <polyline fill="none" stroke="#e16b3a" stroke-width="2.5" points="60,190 120,175 180,170 240,160 300,150 360,140 420,138 480,145 540,135 600,125" />
  <circle cx="480" cy="120" r="6" fill="#e16b3a" />
</svg>`
    },
    sections: []
  },
  {
    slug: "ichimoku-cloud-strategy",
    title: { en: "Ichimoku Cloud Strategy: Regime, Momentum, and Support in One System", zh: "一目均衡表策略：将市场状态、动能与支撑整合于一体" },
    summary: { en: "Ichimoku combines trend, momentum, and support into a single framework. This research note breaks down the components, signals, and common traps.", zh: "一目均衡表将趋势、动能与支撑阻力整合为单一框架。本文拆解其组成、信号与常见陷阱。" },
    date: "2026-01-20",
    readTime: "14 min read",
    category: "Trend Following",
    featured: false,
    tags: ["Ichimoku", "Cloud", "Regime"],
    figure: {
      title: { en: "Ichimoku cloud regime", zh: "一目云图的市场状态" },
      caption: { en: "The cloud highlights support and resistance zones while price signals trend direction.", zh: "云层突出显示支撑与阻力区间，而价格位置则指示趋势方向。" },
      svg: `<svg viewBox="0 0 640 240" role="img" aria-label="Ichimoku cloud sketch">
  <rect x="0" y="0" width="640" height="240" fill="#f8f1e8" />
  <polygon points="60,140 160,130 260,135 360,125 460,115 560,120 560,160 460,170 360,165 260,175 160,170 60,180" fill="#d9e7d0" />
  <polyline fill="none" stroke="#1f6f78" stroke-width="3" points="60,160 120,150 180,145 240,135 300,120 360,110 420,105 480,100 540,95 600,90" />
  <polyline fill="none" stroke="#e16b3a" stroke-width="2" points="60,130 120,125 180,120 240,118 300,115 360,112 420,110 480,108 540,106 600,104" />
</svg>`
    },
    sections: []
  },
  {
    slug: "rsi-mean-reversion",
    title: { en: "RSI Mean Reversion Strategy: Buying Weakness Inside Ranges", zh: "RSI 均值回归策略：在区间中买入弱势" },
    summary: { en: "RSI mean reversion looks for short term exhaustion and then fades the move. This research note covers the signal logic, market fit, and risk traps.", zh: "RSI 均值回归寻找短期衰竭后的反向机会。本文涵盖其信号逻辑、市场适配性与风险陷阱。" },
    date: "2026-01-19",
    readTime: "13 min read",
    category: "Mean Reversion",
    featured: false,
    tags: ["RSI", "Mean Reversion", "Oscillator"],
    figure: {
      title: { en: "RSI band with mean reversion zones", zh: "带有均值回归区间的 RSI 波段" },
      caption: { en: "A simplified view of RSI oscillating between oversold and overbought bands.", zh: "RSI 在超卖与超买区间之间摆动的简化示意图。" },
      svg: `<svg viewBox="0 0 640 240" role="img" aria-label="RSI mean reversion sketch">
  <rect x="0" y="0" width="640" height="240" fill="#f8f1e8" />
  <rect x="60" y="50" width="520" height="140" fill="none" stroke="#d8cbbd" stroke-width="2" />
  <line x1="60" y1="90" x2="580" y2="90" stroke="#e16b3a" stroke-width="2" stroke-dasharray="6 6" />
  <line x1="60" y1="150" x2="580" y2="150" stroke="#1f6f78" stroke-width="2" stroke-dasharray="6 6" />
  <polyline fill="none" stroke="#4b4e6d" stroke-width="3" points="60,140 110,160 160,170 210,150 260,130 310,110 360,95 410,120 460,145 510,155 560,135 580,120" />
  <text x="60" y="40" fill="#5b554d" font-size="12">RSI</text>
  <text x="590" y="95" fill="#e16b3a" font-size="12">70</text>
  <text x="590" y="155" fill="#1f6f78" font-size="12">30</text>
</svg>`
    },
    sections: []
  },
  {
    slug: "how-quantarenas-ranks-strategies",
    title: { en: "How QuantArenas Ranks Strategies", zh: "QuantArenas 如何对策略进行排名" },
    summary: { en: "A full methodology essay on why the Arena Score blends multiple metrics, how stability is measured, and how to read results without overfitting.", zh: "一篇完整的方法论文章，解释 Arena Score 为何融合多项指标、如何衡量稳定性，以及如何在避免过拟合的前提下解读结果。" },
    date: "2026-01-13",
    readTime: "14 min read",
    category: "Methodology",
    featured: false,
    tags: ["Methodology", "Scoring"],
    figure: {
      title: { en: "Arena Score components", zh: "Arena Score 的组成" },
      caption: { en: "The score balances return and risk to avoid single metric bias.", zh: "该评分在收益与风险之间取得平衡，以避免单一指标偏差。" },
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
    sections: []
  }
];


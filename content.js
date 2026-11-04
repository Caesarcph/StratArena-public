const CONTENT_PAGES = {
  about: {
    title: { en: "About QuantArenas", zh: "关于 QuantArenas" },
    subtitle: {
      en: "A bilingual research platform for systematic stock strategies and MQL5 Expert Advisor analysis with backtesting.",
      zh: "一个面向系统化股票策略与 MQL5 EA 分析的双语研究平台，配备回测功能。"
    },
    updated: "2026-11-03",
    sections: [
      {
        heading: { en: "Two arenas, one platform", zh: "两个竞技场，一个平台" },
        paragraphs: [
          {
            en: "QuantArenas operates two complementary research modules. The Strategy Arena covers systematic stock strategies scored and ranked across multiple instruments and time windows using a consistent methodology. The EA Arena provides AI-analyzed MQL5 Expert Advisors sourced from the MQL5 CodeBase, each with bilingual descriptions, parameter documentation, and category classification (trading vs. utility).",
            zh: "QuantArenas 运营两个互补的研究模块。策略竞技场覆盖在多种标的与时间窗口下评分排名的系统化股票策略。EA 竞技场提供源自 MQL5 CodeBase 的 AI 分析 MQL5 Expert Advisor，每个 EA 均配备双语描述、参数文档与类别分类（交易型 vs. 工具型）。"
          },
          {
            en: "QuantArenas is not a signal service, brokerage, or automated trading system. It does not issue buy or sell alerts, provide personalized investment recommendations, or promise results. Strategies and EAs here are research models meant to be inspected and stress tested by the reader. The goal is to make strategy behavior visible, not to offer a turnkey product or a performance guarantee.",
            zh: "QuantArenas 不是信号服务、券商平台，也不是自动化交易系统。它不会发布买卖提醒、提供个性化投资建议，或承诺任何结果。这里展示的策略与 EA 均为研究模型，旨在供读者审视、复核并进行压力测试。平台的目标，是让策略行为更加清晰可见，而不是提供开箱即用的产品或业绩保证。"
          }
        ]
      },
      {
        heading: { en: "EA Arena: MQL5 analysis pipeline", zh: "EA 竞技场：MQL5 分析流水线" },
        paragraphs: [
          {
            en: "The EA Arena analyzes MQL5 Expert Advisors using an automated pipeline powered by NVIDIA GLM-5.1. Each EA is extracted from the MQL5 CodeBase, parsed for strategy logic, and documented with bilingual (CN/EN) descriptions, parameter explanations, and category tags. Trading EAs are separated from utility indicators, scripts, and panel tools so researchers can focus on actionable strategies.",
            zh: "EA 竞技场使用由 NVIDIA GLM-5.1 驱动的自动化流水线分析 MQL5 Expert Advisor。每个 EA 从 MQL5 CodeBase 提取后，经过策略逻辑解析，并生成双语（中/英）描述、参数说明与类别标签。交易型 EA 与工具型指标、脚本和面板程序分开归类，方便研究者聚焦可执行的策略。"
          },
          {
            en: "For auto-convertible EAs, the platform generates Python backtrader code from the extracted logic, backtests it on one year of hourly data for EUR/USD, GBP/USD, USD/JPY and gold, and publishes the results on each EA's page. Backtest metrics include total trades, win rate, net P&L, maximum drawdown and recovery factor, and every trading EA gets a blow-up risk label. This LLM-assisted MQ5→Python pipeline makes it possible to evaluate EAs at scale without a live MetaTrader environment.",
            zh: "对于可自动转换的 EA，平台会从提取的逻辑生成 Python backtrader 代码，在 EUR/USD、GBP/USD、USD/JPY 和黄金一年的小时线数据上回测，并把结果发布到每个 EA 的页面。回测指标包括总交易次数、胜率、净盈亏、最大回撤和恢复因子，每个交易型 EA 还有爆仓风险标签。这种 LLM 辅助的 MQ5→Python 流水线使得无需 MetaTrader 环境即可大规模评估 EA。"
          }
        ]
      },
      {
        heading: { en: "Strategy Arena: stock strategy scoring", zh: "策略竞技场：股票策略评分" },
        paragraphs: [
          {
            en: "Stock strategies are scored with the Arena Score (v2, since November 2026). Every strategy is compared with all other strategies on the same market and time window, and five components are turned into percentiles: return quality (Sharpe and Sortino, 30%), drawdown control (Calmar and Ulcer index, 25%), consistency (share of positive months and time under water, 20%), robustness (the worst Sharpe across the 1Y, 3Y, 5Y and full windows, 15%) and statistical significance (the probabilistic Sharpe ratio, 10%). Because each component is a rank, a single extreme value cannot dominate, and strategies no longer tie at the top. Strategies that were in the market less than 5% of the time in a window are not ranked.",
            zh: "股票策略使用 Arena Score 评分（2026 年 11 月起为第二版）。每个策略都和同一品种、同一时间窗口内的所有策略比较，五个分项分别换算成百分位：收益质量（夏普和索提诺，30%）、回撤控制（卡玛比率和 Ulcer 指数，25%）、稳定性（正收益月份占比和水下时间，20%）、稳健性（1 年、3 年、5 年和全部历史中最差的夏普，15%）、统计可信度（概率夏普比率，10%）。因为每一项都是排名，单个极端值无法主导结果，头部也不会再出现并列。某个窗口内持仓时间不到 5% 的策略不参与排名。"
          },
          {
            en: "The system also compares strategy behavior across multiple time windows. A model that only looks strong in the last few months but collapses on longer windows will rank lower than a steadier approach. Parameters are re-selected every six months by walk-forward optimization, using only data available at the time, and the walk-forward result is the one shown. Until 3 November 2026 the default parameters were kept whenever they scored better over the whole history; because that choice looked at the full sample, it made about one in five results slightly optimistic, so it was dropped.",
            zh: "系统还会在多个时间窗口下比较策略行为。若某个模型仅在最近几个月表现强劲，却在更长周期中失效，其排名会低于更稳健的策略。参数每六个月用滚动前推优化重新选择，只用当时已有的数据，网站展示的就是滚动前推的结果。2026 年 11 月 3 日之前，如果默认参数在整段历史上得分更高，就保留默认参数；这一步看过了整段样本，让大约五分之一的结果略偏乐观，所以已经取消。"
          }
        ]
      },
      {
        heading: { en: "Data sources and transparency", zh: "数据来源与透明度" },
        paragraphs: [
          {
            en: "Stock strategy data uses historical daily bars from public sources, collected through the yfinance interface with adjusted closes for splits and dividends. EA backtests use the most recent twelve months of hourly (H1) bars for EUR/USD, GBP/USD, USD/JPY and gold, downloaded from free public sources (yfinance, with Dukascopy as a fallback) and re-run every month. All data sources are documented, and the same instrument set is applied consistently within each module so that rankings reflect strategy differences, not data inconsistencies.",
            zh: "股票策略数据使用来自公共来源的历史日线数据，通过 yfinance 接口采集，并采用已对拆股与分红进行调整的收盘价。EA 回测使用 EUR/USD、GBP/USD、USD/JPY 和黄金最近 12 个月的小时线（H1），数据来自免费的公共来源（yfinance，备用 Dukascopy），每月重跑一次。所有数据来源均有记录，且每个模块内使用一致的标的集合，确保排名反映策略差异，而非数据不一致。"
          },
          {
            en: "Because the project is static and reproducible, both pipelines prioritize determinism. Missing sessions are left as gaps, and strategies that require data not available in public feeds are excluded. The data is not a substitute for institutional feeds and may include survivorship or proxy biases. These limitations are documented so readers can interpret results as research signals rather than trading grade performance.",
            zh: "由于该项目强调静态可复现，两条流水线均优先保证确定性。缺失交易日将保留为空缺，而需要公共数据源不支持的数据的策略会被排除。这里的数据不能替代机构级行情源，并且可能包含生存者偏差或代理偏差。我们明确记录这些限制，以便读者将结果理解为研究参考信号，而非可直接用于实盘的业绩表现。"
          }
        ]
      },
      {
        heading: { en: "Research goals and engineering", zh: "研究目标与工程" },
        paragraphs: [
          {
            en: "QuantArenas is built to support structured research. Stock strategies include readable pseudocode, tags, and suggested comparisons. EA analyses include signal logic breakdowns, parameter descriptions, and backtest performance with equity curves. The platform complements academic papers and practitioner notes by giving a standardized output for exploration and comparison.",
            zh: "QuantArenas 的构建目标是支持结构化研究。股票策略附带可读性强的伪代码、标签以及建议比较对象。EA 分析包含信号逻辑拆解、参数说明以及带有净值曲线的回测表现。平台希望通过提供标准化输出，补充学术论文与实务研究笔记的探索与比较价值。"
          },
          {
            en: "From an engineering perspective, the platform emphasizes deterministic pipelines, limited external dependencies, and open inspection of assumptions. The EA analysis pipeline uses GLM-5.1 for MQL5 parsing and backtrader for execution, both running in a reproducible, script-driven workflow. The site also serves as a log of iterations, showing how strategies and EA analyses evolve as new evidence is added.",
            zh: "从工程角度看，平台强调确定性流水线、尽量有限的外部依赖，以及对各项假设的开放式检视。EA 分析流水线使用 GLM-5.1 进行 MQL5 解析，使用 backtrader 执行回测，两者均在可复现的脚本驱动工作流中运行。本站同时也是一个迭代记录，展示策略与 EA 分析如何随着新增证据而不断演化。"
          }
        ]
      },
      {
        heading: { en: "How to use the platform responsibly", zh: "如何负责任地使用本平台" },
        paragraphs: [
          {
            en: "Treat the rankings and backtest results as a research index, not a buy list. Use the results to narrow down ideas, then read the strategy description, inspect the chart behavior, and understand what the signal is actually doing. A strong rank or profitable backtest does not replace independent validation, and a weak rank does not mean the idea is useless. The point is to reveal trade offs and to surface questions worth testing.",
            zh: "请将排名与回测结果视为研究索引，而不是买入清单。你可以先借助结果缩小研究范围，再阅读策略说明、观察图表行为，并理解信号本身究竟在捕捉什么。高排名或盈利回测不能替代独立验证，低排名也不意味着想法毫无价值。平台的意义在于揭示权衡关系，并提出值得进一步检验的问题。"
          },
          {
            en: "If you decide to explore a strategy or EA further, rebuild it with your own data, add realistic costs, and stress test across multiple regimes. Consider position sizing, liquidity, and risk controls that are not modeled here. QuantArenas gives a clean baseline, but responsible use requires additional work and a clear understanding of the risks.",
            zh: "如果你决定进一步研究某个策略或 EA，请使用自己的数据进行重建，加入更真实的交易成本，并在多种市场环境下进行压力测试。同时也应考虑这里尚未建模的仓位规模、流动性与风险控制因素。QuantArenas 提供的是一个干净的基准起点，但负责任的使用仍然需要额外工作，以及对风险有清晰的理解。"
          },
          {
            en: "Keep notes on why a strategy ranks well or an EA backtest shows profit, and test whether that reason is still plausible today. A simple checklist such as data assumptions, regime fit, and failure mode helps avoid copying strategies blindly. The site is designed to be a starting point for that checklist, not the final answer, and it rewards careful reading over fast decisions.",
            zh: "请记录某个策略之所以排名较高或某个 EA 回测盈利的原因，并检验这些原因在当下是否仍然成立。一份简单的检查清单——例如数据假设、市场环境适配性与失效模式——有助于避免盲目照搬策略。本站的定位，是为这份清单提供一个起点，而不是给出最终答案；它鼓励的是审慎阅读，而非仓促决策。"
          }
        ]
      },
      {
        heading: { en: "Risk and usage disclaimer", zh: "风险与使用免责声明" },
        paragraphs: [
          {
            en: "All information on this site is for educational and research purposes only. It is not financial advice, and it should not be construed as an offer to buy or sell any security, derivative, or cryptocurrency. Past performance does not guarantee future results, and every strategy can experience prolonged losses or underperformance. EA backtests are conducted on limited historical data and do not account for slippage, spread, or commission costs.",
            zh: "本站所有信息仅用于教育与研究目的。其内容不构成金融建议，也不应被解读为对任何证券、衍生品或加密资产的买卖要约。过往表现并不保证未来结果，任何策略都可能经历长期亏损或表现不及预期。EA 回测基于有限的历史数据，且未计入滑点、点差与佣金成本。"
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
      en: "How QuantArenas evaluates stock strategies and MQL5 Expert Advisors using consistent, reproducible methods.",
      zh: "QuantArenas 如何使用一致、可复现的方法评估股票策略与 MQL5 Expert Advisor。"
    },
    updated: "2026-11-03",
    sections: [
      {
        heading: { en: "Strategy Arena methodology", zh: "策略竞技场方法论" },
        paragraphs: [
          {
            en: "The stock strategy pipeline starts with a shared data universe. Daily adjusted close series are pulled for each instrument, aligned to a common start date, and normalized to a base value for comparison across assets. The instruments cover index, commodity, and FX proxies that are widely traded and have long public histories. Only daily frequency is used in the core pipeline to reduce noise and to keep the same sampling for every strategy.",
            zh: "股票策略流水线始于一个共享的数据池。我们为每个标的提取日度复权收盘价序列，将其对齐到统一起始日期，并归一化至同一基准值，以便进行跨资产比较。所选标的覆盖交易活跃、公开历史较长的指数、商品与外汇代理品种。核心流水线仅使用日频数据，以减少噪声，并确保所有策略采用一致的采样频率。"
          }
        ]
      },
      {
        heading: { en: "EA Arena methodology", zh: "EA 竞技场方法论" },
        paragraphs: [
          {
            en: "The EA Arena uses an LLM-assisted pipeline to analyze MQL5 Expert Advisors. First, the MQ5 source code is parsed by GLM-5.1 into a structured JSON representation capturing indicators, entry/exit rules, parameters, and strategy type. Second, auto-convertible EAs are translated into Python backtrader strategies using a template-based code generator that maps MQL5 indicator calls to backtrader equivalents. Third, generated strategies are backtested on one year of H1 data for EUR/USD, GBP/USD, USD/JPY and gold with the same account for every EA: $10,000, 1:100 leverage, the EA's own lot size converted to contract units (100,000 per currency lot, 100 ounces per gold lot), one order at a time, and a broker-style stop-out when equity falls to 10% of the starting balance.",
            zh: "EA 竞技场使用 LLM 辅助流水线分析 MQL5 Expert Advisor。首先，MQ5 源代码由 GLM-5.1 解析为结构化 JSON，捕获指标、入场/出场规则、参数与策略类型。其次，可自动转换的 EA 通过基于模板的代码生成器翻译为 Python backtrader 策略，将 MQL5 指标调用映射为 backtrader 等价物。第三，生成的策略在 EUR/USD、GBP/USD、USD/JPY 和黄金一年的 H1 数据上回测，所有 EA 使用同样的账户：1 万美元、1:100 杠杆、EA 自己的手数（按合约换算：外汇每手 10 万单位，黄金每手 100 盎司）、一次只下一张单，净值跌到初始资金的 10% 时按券商规则强制平仓。"
          },
          {
            en: "EAs that rely on MT5-specific features (custom indicators, DLL calls, or MQL5-only objects) are classified as manual-convert or mt5-only and are documented without backtesting. The convertibility classification ensures that only strategies with a reliable Python translation enter the backtest pipeline, keeping results comparable and interpretable.",
            zh: "依赖 MT5 专有特性的 EA（自定义指标、DLL 调用或 MQL5 专属对象）被分类为手动转换或仅限 MT5，仅进行文档化而不执行回测。可转换性分类确保只有具备可靠 Python 翻译的策略进入回测流水线，从而保持结果的可比性与可解释性。"
          }
        ]
      },
      {
        heading: { en: "Signal generation and execution", zh: "信号生成与执行" },
        paragraphs: [
          {
            en: "For stock strategies, signals are generated at the close of each session and applied on the next session. This avoids look ahead bias and aligns with a realistic end of day workflow. For EA backtests, signals are generated on each H1 bar and executed at the next bar's open. Both approaches avoid look ahead bias while maintaining realistic execution assumptions.",
            zh: "股票策略的信号在每个交易日收盘后生成，并在下一个交易日执行，以避免前视偏差并符合现实中的日终决策流程。EA 回测的信号在每个 H1 柱生成，并在下一柱开盘时执行。两种方式均避免前视偏差，同时保持现实的执行假设。"
          },
          {
            en: "Transaction costs, slippage, and financing are not modeled in the baseline scores. The purpose is relative comparison across strategies, not a broker ready profit and loss statement. Readers should assume that high turnover models will perform worse in live conditions, and that liquidity constraints may invalidate some signals.",
            zh: "基准评分并未纳入交易成本、滑点与融资成本。评分的目的是进行策略之间的相对比较，而不是生成可直接用于券商层面的损益报表。读者应假设，高换手模型在实盘中的表现很可能更差，而流动性约束也可能使部分信号失效。"
          }
        ]
      },
      {
        heading: { en: "Metrics and scoring", zh: "指标与评分" },
        paragraphs: [
          {
            en: "Stock strategies are scored with the Arena Score, a weighted average of percentile ranks (return quality, drawdown control, consistency, robustness and significance) within the same market and window. EA backtests report total trades, win rate, net P&L, maximum drawdown (both percentage and dollar), and an equity curve. The different scoring approaches reflect the different data frequencies and evaluation goals of each module.",
            zh: "股票策略使用 Arena Score 评分：在同一品种、同一窗口内，把收益质量、回撤控制、稳定性、稳健性和统计可信度换算成百分位后加权平均。EA 回测报告总交易次数、胜率、净盈亏、最大回撤（百分比与金额）以及净值曲线。不同的评分方式反映了两个模块在数据频率与评估目标上的差异。"
          }
        ]
      },
      {
        heading: { en: "Limitations and simplifications", zh: "局限性与简化" },
        paragraphs: [
          {
            en: "The stock strategy pipeline assumes full allocation with no leverage and no short borrow constraints unless the strategy explicitly defines them. The EA backtest pipeline uses four instruments, one year of hourly data and a standard account, which may not match the instrument, timeframe, account size or broker settings the original EA was designed for. Both pipelines use public data sources that can differ from institutional feeds. Strategy results use walk-forward optimization only. Until 3 November 2026 the site kept the default parameters whenever they scored better over the full history, which applied to 106 of 576 strategy-and-market results; because that choice saw the whole sample, those results were slightly optimistic.",
            zh: "股票策略流水线默认假设满仓配置，不使用杠杆，也不存在融券约束，除非策略本身有明确规定。EA 回测流水线使用四个品种、一年的小时线和统一的账户设置，可能与原 EA 设计时针对的品种、周期、资金规模或券商设置不同。两条流水线均使用可能与机构级行情存在差异的公共数据源。策略结果一律采用滚动前推优化。2026 年 11 月 3 日之前，如果默认参数在整段历史上得分更高，网站就保留默认参数，576 个“策略 × 市场”结果里有 106 个属于这种情况；这一步看过了整段样本，所以这些结果略偏乐观。"
          },
          {
            en: "The MQ5→Python translation may simplify or approximate some indicator calculations. Custom indicators, multi-timeframe logic, and DLL-dependent features are intentionally excluded from auto-conversion. These constraints are part of the design and should be considered when interpreting backtest results.",
            zh: "MQ5→Python 翻译可能会简化或近似某些指标计算。自定义指标、多时间周期逻辑和依赖 DLL 的特性被有意排除在自动转换之外。这些限制本就是设计的一部分，在解读回测结果时应充分考虑。"
          }
        ]
      },
      {
        heading: { en: "Interpreting results", zh: "如何解读结果" },
        paragraphs: [
          {
            en: "The methodology is intentionally transparent, but it is still a model. A high score or profitable backtest does not guarantee live performance, and a low score does not prove an idea is worthless. The output should be read as a research summary and combined with other due diligence such as liquidity analysis, execution modeling, and stress testing.",
            zh: "该方法论虽刻意保持透明，但它本质上仍是一个模型。高分或盈利回测并不保证实盘表现，低分也不意味着一个想法毫无价值。输出结果应被视为研究摘要，并与流动性分析、执行建模和压力测试等其他尽职调查工作结合使用。"
          },
          {
            en: "QuantArenas is updated with new strategies, new EA analyses, and new backtest results over time. Changes are logged in the changelog so readers can track when rankings shift and why a strategy may behave differently across releases.",
            zh: "QuantArenas 会随着新策略加入、新 EA 分析与新回测结果而持续演进。所有变更都会记录在更新日志中，方便读者追踪排名何时发生变化，以及为何同一策略会在不同版本之间呈现不同表现。"
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
    "slug": "trading-costs-backtest-impact",
    "title": {
      "en": "What Trading Costs Do to a Backtest: 576 Strategy Results With and Without Costs",
      "zh": "交易成本对回测的影响：576 个策略结果扣成本前后对比"
    },
    "summary": {
      "en": "Every backtest on Quant Arena is shown before trading costs, with a cost estimate next to it. Over the five years to November 2026, an assumed 10 basis points per trade cost the median strategy 1.2 percentage points a year, about a fifth of its return. For one result in six it took half or more. 53 profitable results turned flat or negative, and the number that beat buy-and-hold fell from 195 to 163. At 30 basis points only 129 would have.",
      "zh": "Quant Arena 上所有回测展示的都是扣成本前的结果，旁边附上成本估算。截至 2026 年 11 月的五年里，按每次交易 10 个基点算，中位数策略每年要少赚 1.2 个百分点，大约是收益的五分之一；每六个结果里就有一个被吃掉一半甚至更多。有 53 个原本赚钱的结果变成不赚或亏钱，跑赢买入持有的结果从 195 个降到 163 个；如果成本是 30 个基点，只剩 129 个。"
    },
    "date": "2027-01-26",
    "readTime": "3 min read",
    "category": "Methodology",
    "featured": false,
    "tags": [
      "Costs",
      "Turnover",
      "Slippage"
    ],
    "sections": [
      {
        "heading": {
          "en": "The test",
          "zh": "测试方式"
        },
        "paragraphs": [
          {
            "en": "We took all 576 strategy-and-market results over the five years to 3 November 2026: 72 strategies on up to 10 markets, all with walk-forward optimization. For each one we estimate the cost of trading from its turnover: every time the position changes by 100% of the account, we charge 10 basis points (0.10%). That covers commission, the bid-ask spread and some slippage, a middle-of-the-road figure for a retail trader. Large ETFs and major currency pairs can be cheaper; crypto and thinner markets usually cost more.",
            "zh": "我们取了截至 2026 年 11 月 3 日近五年的全部 576 个“策略 × 市场”结果：72 个策略，最多 10 个市场，全部用滚动前推优化。每个结果按换手估算交易成本：仓位每变动相当于账户 100% 的金额，就收 10 个基点（0.10%）。这包括佣金、买卖价差和一部分滑点，对个人交易者来说是个中间水平。大型 ETF 和主要货币对可能更便宜，加密货币和流动性差的市场通常更贵。"
          },
          {
            "en": "The cost is subtracted from the annual return. This is an approximation, but a close one at these sizes, and the same one the cost slider on every strategy page uses.",
            "zh": "成本直接从年化收益里减掉。这是近似算法，但在这个量级上误差很小，和每个策略页面上的成本滑块用的是同一种算法。"
          }
        ]
      },
      {
        "heading": {
          "en": "The typical cost: 1.2 points a year",
          "zh": "典型成本：每年 1.2 个百分点"
        },
        "paragraphs": [
          {
            "en": "The median result changed position 82 times in five years and paid about **1.2 percentage points a year** at 10 basis points. One in ten paid 2.9 points or more, and the busiest paid 6.8.",
            "zh": "中位数结果五年里调整了 82 次仓位，按 10 个基点算，每年大约要付 **1.2 个百分点**。十分之一的结果每年要付 2.9 个百分点以上，交易最频繁的要付 6.8 个百分点。"
          },
          {
            "en": "That sounds small, but most strategy returns are small too. Among the 340 results that made more than 1% a year, the cost took a median of **20%** of the return. For 60 of them (18%) it took half or more.",
            "zh": "听起来不多，但大多数策略的收益本来也不高。在年化超过 1% 的 340 个结果里，成本吃掉的收益中位数是 **20%**；其中 60 个（18%）被吃掉一半甚至更多。"
          }
        ]
      },
      {
        "heading": {
          "en": "Profitable results that stop being profitable",
          "zh": "赚钱的结果变得不赚钱"
        },
        "paragraphs": [
          {
            "en": "380 of the 576 results had a positive annual return before costs. Charging for trading turned some of them into losers:",
            "zh": "576 个结果里有 380 个扣成本前年化为正。算上交易成本后，一部分变成了亏损："
          },
          {
            "en": [
              "At 5 basis points: 34 became flat or negative",
              "At 10 basis points: 53",
              "At 20 basis points: 94",
              "At 30 basis points: 149, nearly two in five"
            ],
            "zh": [
              "5 个基点：34 个变成不赚或亏钱",
              "10 个基点：53 个",
              "20 个基点：94 个",
              "30 个基点：149 个，接近五分之二"
            ]
          },
          {
            "en": "The same happens to the results that look best. Before costs, 195 results beat simply holding the market over five years. After 10 basis points 163 still did, after 20 basis points 145, and after 30 basis points 129. On the S&P 500 the bar was already high: 2 of 62 strategies beat holding the index before costs, and only one after.",
            "zh": "看起来最好的那些结果也一样。扣成本前，有 195 个结果五年下来跑赢了直接持有；扣 10 个基点后还剩 163 个，20 个基点 145 个，30 个基点 129 个。标普 500 上门槛本来就高：扣成本前 62 个策略只有 2 个跑赢持有指数，扣成本后只剩 1 个。"
          }
        ]
      },
      {
        "heading": {
          "en": "Who pays the most",
          "zh": "谁付得最多"
        },
        "paragraphs": [
          {
            "en": "Cost depends almost entirely on how often a strategy trades. A few examples on the S&P 500 over five years:",
            "zh": "成本几乎完全取决于交易频率。看几个标普 500 上近五年的例子："
          },
          {
            "en": [
              "**TREND-17 Chandelier Exit** made 6.1% a year before costs from 119 position changes, about 3.8% after",
              "**MR-16 Connors RSI** made 7.9% a year from 152 changes, about 4.8% after",
              "**HMA-01 HMA Crossover** was already flat before costs (−0.1%) and lost about 3.9% a year after",
              "**TREND-10 Ichimoku Cloud** traded 59 times and kept 5.3% of its 6.5%"
            ],
            "zh": [
              "**TREND-17 吊灯止损**：仓位调整 119 次，扣成本前年化 6.1%，扣后约 3.8%",
              "**MR-16 康纳斯 RSI**：调整 152 次，年化 7.9%，扣后约 4.8%",
              "**HMA-01 HMA 交叉**：扣成本前就基本持平（−0.1%），扣后每年亏约 3.9%",
              "**TREND-10 一目均衡表**：只交易了 59 次，6.5% 的年化里保住了 5.3%"
            ]
          },
          {
            "en": "By family, volatility strategies traded the most (a median of 151 position changes in five years) and paid 1.7 points a year. Regime strategies paid 2.2. Trend and mean-reversion strategies paid about 1.2 each, but that hurts mean reversion far more: its median result made only 0.8% a year, so the cost was larger than the return. The cheapest strategies to run were slow allocation rules such as dual momentum and asset-class rotation, which change position only a few times a year.",
            "zh": "按类别看，波动率策略交易最频繁（五年调整仓位中位数 151 次），每年成本 1.7 个百分点；市场状态类 2.2 个百分点。趋势和均值回归都是 1.2 个百分点左右，但对均值回归伤害大得多：它的中位数结果年化只有 0.8%，成本比收益还高。运行成本最低的是双动量、资产类别轮动这类慢速配置规则，一年只调整几次仓位。"
          }
        ]
      },
      {
        "heading": {
          "en": "What to take from it",
          "zh": "结论"
        },
        "paragraphs": [
          {
            "en": [
              "Read every backtest as \"before costs\" unless it says otherwise, and check how often the strategy trades.",
              "At 10 basis points, a strategy that changes position about 30 times a year needs roughly 3 points of extra return just to break even with a version that never trades.",
              "Fast strategies on small edges are the first to disappear. Slow strategies with larger edges survive costs best.",
              "Use your own numbers. Every strategy page has a cost slider from 0 to 50 basis points."
            ],
            "zh": [
              "除非特别说明，所有回测都要当成“扣成本前”来看，并且留意策略交易有多频繁。",
              "按 10 个基点算，一年调整 30 次左右仓位的策略，每年要多赚大约 3 个百分点，才能和不交易的版本打平。",
              "靠微薄优势、交易又快的策略最先消失；交易慢、优势大的策略最扛得住成本。",
              "用你自己的成本去算。每个策略页面都有 0 到 50 个基点的成本滑块。"
            ]
          },
          {
            "en": "These are backtests, not investment advice.",
            "zh": "以上都是回测结果，不构成投资建议。"
          }
        ]
      }
    ],
    "dataAsOf": "2026-11-03"
  },
  {
    "slug": "walk-forward-out-of-sample-decay",
    "title": {
      "en": "How Much of a Backtest Survives Out of Sample? Walk-Forward Results for 63 Strategies",
      "zh": "回测到了样本外还剩多少？63 个策略的滚动前推检验"
    },
    "summary": {
      "en": "We re-tuned 63 strategies on 10 markets every six months for up to 14 years and then traded the chosen settings on data they had never seen. The median Sharpe ratio fell from 0.32 on the training data to 0.19 out of sample. Trend and momentum strategies kept almost all of their edge; mean reversion lost nearly all of it. Re-tuning beat simply keeping the default settings only half the time, and the best predictor of a strategy that holds up was a parameter grid where every setting worked.",
      "zh": "我们让 63 个策略在 10 个市场上每六个月重新调一次参数，最长跑了 14 年，每次都拿选出的参数去交易它们从没见过的数据。夏普中位数从训练期的 0.32 降到了样本外的 0.19。趋势和动量策略几乎保住了全部优势，均值回归则几乎全丢了。重新调参只有一半的时候比一直用默认参数好；最能预示策略经得住考验的，是参数网格里每一组参数都有效。"
    },
    "date": "2027-01-12",
    "readTime": "4 min read",
    "category": "Methodology",
    "featured": false,
    "tags": [
      "Walk-Forward",
      "Overfitting",
      "Robustness"
    ],
    "sections": [
      {
        "heading": {
          "en": "The test",
          "zh": "测试方式"
        },
        "paragraphs": [
          {
            "en": "Quant Arena runs every strategy with walk-forward optimization. For each strategy and market we take three years of daily data, try up to nine parameter settings, keep the one that scored best, and trade it for the next six months. Then the window moves forward six months and the process repeats, typically 28 times, from January 2013 to November 2026 (bitcoin from 2017, ether from 2020).",
            "zh": "Quant Arena 上的每个策略都用滚动前推优化回测。对每个策略和市场，我们取 3 年日线数据，试最多 9 组参数，留下得分最高的一组，用它交易接下来的 6 个月；然后窗口往前挪 6 个月，再重复一遍。一般要重复 28 次，从 2013 年 1 月一直到 2026 年 11 月（比特币从 2017 年、以太坊从 2020 年开始）。"
          },
          {
            "en": "That gives two numbers for every strategy and market. The in-sample Sharpe ratio is what the chosen settings achieved on the three years they were picked on, averaged over all the re-fits. The out-of-sample Sharpe ratio is what the strategy earned in the six-month periods that followed, stitched together. This study covers the 486 strategy-and-market pairs with something to tune, from 63 strategies: most run on all 10 markets, a few only on their own portfolio basket. Nine strategies have no adjustable parameters and are left out. All figures are before trading costs.",
            "zh": "这样每个“策略 × 市场”就有两个数字。样本内夏普，是选出的参数在它被选出来的那 3 年里的表现，再对所有重新选参取平均；样本外夏普，是之后那些 6 个月拼起来、策略真正赚到的。这次研究覆盖 486 个有参数可调的“策略 × 市场”组合，来自 63 个策略：大多数在全部 10 个市场上运行，少数只在自己的组合篮子上运行。有 9 个策略没有可调参数，不在其中。所有数字都没扣交易成本。"
          }
        ]
      },
      {
        "heading": {
          "en": "The headline: about 40% of the Sharpe ratio disappears",
          "zh": "结论先说：大约 40% 的夏普没了"
        },
        "paragraphs": [
          {
            "en": "Across all 486 pairs the median in-sample Sharpe ratio was **0.32** and the median out-of-sample Sharpe ratio **0.19**. In 357 pairs (73%) the strategy did worse on new data than on the data it was tuned on, and in 91 pairs the Sharpe ratio fell by more than 0.3.",
            "zh": "486 个组合里，样本内夏普中位数是 **0.32**，样本外是 **0.19**。有 357 个组合（73%）在新数据上的表现不如调参用的数据，其中 91 个夏普掉了 0.3 以上。"
          },
          {
            "en": "Part of that drop is the cost of choosing. When you test nine settings and keep the best, the winner looks better than its true quality simply because it was the luckiest of nine. Over the full history the median setting in each grid had a Sharpe ratio of 0.18 and the best one 0.31, a gap of about the same size as the in-sample to out-of-sample drop.",
            "zh": "一部分下降是“挑选”本身的代价。从 9 组参数里挑最好的一组，赢家看起来会比它真实的水平更好，只因为它是 9 组里运气最好的。在全部历史上，每个参数网格里中位数那一组的夏普是 0.18，最好的一组是 0.31，差距和样本内到样本外的下降差不多大。"
          }
        ]
      },
      {
        "heading": {
          "en": "Trend held up, mean reversion did not",
          "zh": "趋势扛住了，均值回归没有"
        },
        "paragraphs": [
          {
            "en": "The decay was very uneven across strategy families. Median Sharpe ratio, in-sample then out of sample:",
            "zh": "不同类别的策略，衰减差别很大。夏普中位数，样本内 → 样本外："
          },
          {
            "en": [
              "Trend following (21 strategies, 201 pairs): 0.37 → **0.34**",
              "Momentum (7 strategies, 43 pairs): 0.37 → **0.35**",
              "Volatility (6 strategies, 51 pairs): 0.33 → **0.18**",
              "Mean reversion (13 strategies, 121 pairs): 0.29 → **0.03**"
            ],
            "zh": [
              "趋势跟踪（21 个策略，201 个组合）：0.37 → **0.34**",
              "动量（7 个策略，43 个组合）：0.37 → **0.35**",
              "波动率（6 个策略，51 个组合）：0.33 → **0.18**",
              "均值回归（13 个策略，121 个组合）：0.29 → **0.03**"
            ]
          },
          {
            "en": "Trend and momentum rules lost about a tenth of their in-sample Sharpe ratio. Mean-reversion rules, which buy dips and sell rallies at tuned thresholds, kept almost nothing: only 67 of their 121 pairs had a positive Sharpe ratio out of sample. A threshold that caught the reversals of the last three years tends not to catch the next ones.",
            "zh": "趋势和动量规则只丢了大约十分之一的样本内夏普。均值回归规则按调好的阈值逢低买入、逢高卖出，到了样本外几乎什么都没剩：121 个组合里只有 67 个样本外夏普为正。能抓住过去 3 年反转的阈值，往往抓不住接下来的反转。"
          }
        ]
      },
      {
        "heading": {
          "en": "Re-tuning was a coin flip",
          "zh": "重新调参就像抛硬币"
        },
        "paragraphs": [
          {
            "en": "The out-of-sample periods give a fair comparison: what if we had simply kept the default settings over the same months? The default parameters had a median out-of-sample Sharpe ratio of **0.20**, slightly higher than the re-tuned 0.19, and re-tuning won in only 248 of 486 pairs (51%).",
            "zh": "样本外的这些月份正好可以做一个公平的对比：如果同样这些月份一直用默认参数会怎样？默认参数的样本外夏普中位数是 **0.20**，比重新调参的 0.19 还略高一点；486 个组合里，重新调参只赢了 248 个（51%）。"
          },
          {
            "en": "Re-tuning helped most on oil (31 of 47 pairs) and bitcoin (32 of 47) and least on EUR/USD (17 of 47). For regime-switching and volatility strategies it hurt more often than it helped. The chosen settings also changed a lot: in a median of 8 of 28 re-fits the winning setting was different from the previous one. That is a sign the optimizer was often chasing noise.",
            "zh": "调参帮助最大的是原油（47 个里赢了 31 个）和比特币（47 个里 32 个），最小的是欧元/美元（47 个里 17 个）。对市场状态切换和波动率类策略来说，调参坏处比好处多。选出的参数也换得很勤：28 次重新选参里，中位数有 8 次换成了和上一次不同的参数。这说明优化器很多时候是在追逐噪音。"
          }
        ]
      },
      {
        "heading": {
          "en": "What predicts a strategy that holds up",
          "zh": "什么样的策略经得住考验"
        },
        "paragraphs": [
          {
            "en": "Two things did.",
            "zh": "有两样东西能看出来。"
          },
          {
            "en": "The first is the in-sample result itself. Ranking pairs by in-sample Sharpe ratio and by out-of-sample Sharpe ratio gave very similar orders (rank correlation 0.84). The 97 pairs with the highest in-sample Sharpe ratios fell from 0.94 to 0.74, but every one of them stayed positive out of sample. A strong backtest shrinks; it rarely turns into a loser.",
            "zh": "第一是样本内结果本身。按样本内夏普和样本外夏普分别排序，两个顺序非常接近（秩相关系数 0.84）。样本内夏普最高的 97 个组合，从 0.94 降到了 0.74，但每一个在样本外都还是正的。很强的回测会缩水，但很少会变成亏损。"
          },
          {
            "en": "The second is the shape of the parameter grid. Where all the settings had a positive Sharpe ratio over the full history (277 pairs), the out-of-sample median was **0.40** and 273 of the 277 stayed positive. Where only some settings worked (105 pairs), the out-of-sample median was 0.02, about zero. A strategy that only works with one particular setting is probably fitted to the past.",
            "zh": "第二是参数网格的形状。在全部历史上所有参数组夏普都为正的 277 个组合，样本外中位数是 **0.40**，277 个里有 273 个样本外仍为正。只有部分参数有效的 105 个组合，样本外中位数是 0.02，基本是 0。只在某一组特定参数下才有效的策略，多半是拟合了过去。"
          }
        ]
      },
      {
        "heading": {
          "en": "Markets",
          "zh": "分市场看"
        },
        "paragraphs": [
          {
            "en": "The decay showed up almost everywhere. On the S&P 500 the median Sharpe ratio went from 0.83 to 0.63, on gold from 0.50 to 0.37, on bitcoin from 0.97 to 0.64. EUR/USD and natural gas were negative even in sample (0.01 and −0.09) and worse out of sample. The exceptions were broad commodities and oil, where the out-of-sample median matched or slightly beat the in-sample one.",
            "zh": "几乎每个市场都有衰减。标普 500 的夏普中位数从 0.83 降到 0.63，黄金从 0.50 降到 0.37，比特币从 0.97 降到 0.64。欧元/美元和天然气连样本内都是负的（0.01 和 −0.09），样本外更差。例外是综合大宗商品和原油，样本外中位数和样本内持平，甚至略高。"
          }
        ]
      },
      {
        "heading": {
          "en": "What to take from it",
          "zh": "结论"
        },
        "paragraphs": [
          {
            "en": [
              "Expect a backtest Sharpe ratio to shrink by roughly a third to a half on new data, and by much more for tuned mean-reversion rules.",
              "Look at the whole parameter grid, not the best cell. If most nearby settings also work, the result is far more likely to last.",
              "Re-optimizing regularly is not a free improvement. Over these 14 years it did no better than leaving sensible defaults alone.",
              "Strong results usually stay positive. They just get smaller."
            ],
            "zh": [
              "回测里的夏普，到了新数据上大概会缩水三分之一到一半；调过参的均值回归规则缩水得更多。",
              "看整个参数网格，而不是最好的那一格。如果相邻的参数大多也有效，结果更有可能持续。",
              "定期重新优化不是白来的提升。在这 14 年里，它并不比一直用合理的默认参数更好。",
              "很强的结果通常还会是正的，只是会变小。"
            ]
          },
          {
            "en": "Every strategy page now shows its own out-of-sample check, with the in-sample Sharpe ratio, the out-of-sample Sharpe ratio, the default-settings comparison and the parameter grid. These are backtests, not investment advice.",
            "zh": "现在每个策略页面都有自己的“样本外检验”：样本内夏普、样本外夏普、默认参数对比和参数网格。以上都是回测结果，不构成投资建议。"
          }
        ]
      }
    ],
    "dataAsOf": "2026-11-03"
  },
  {
    "slug": "rsi-vs-stochastic-williams-cci",
    "title": {
      "en": "RSI vs Stochastic vs Williams %R vs CCI: Six Oscillators Backtested on 10 Markets",
      "zh": "RSI、随机指标、威廉指标还是 CCI？6 个震荡指标策略在 10 个市场上的回测"
    },
    "summary": {
      "en": "Six \"buy when oversold\" strategies built on different oscillators, tested on ten markets. Plain RSI with a volatility cap was the most consistent: a positive Sharpe ratio on all ten markets over five years and a median drawdown of 10%. Connors RSI was the best on the S&P 500. Stochastic, Williams %R and CCI turned out to be close cousins that stay in the market longer, and lost 27% to 35% in the 2020 crash, against 5% for RSI.",
      "zh": "6 个基于不同震荡指标的“超卖就买”策略，在 10 个市场上回测。带波动率上限的普通 RSI 最稳：近五年在全部 10 个市场上夏普都为正，最大回撤中位数 10%。康纳斯 RSI 在标普 500 上最好。随机指标、威廉指标和 CCI 其实是近亲，持仓时间更长，2020 年暴跌时亏了 27% 到 35%，RSI 只亏了 5%。"
    },
    "date": "2026-12-29",
    "readTime": "3 min read",
    "category": "Strategy Comparison",
    "featured": false,
    "tags": [
      "Mean Reversion",
      "Oscillator",
      "RSI"
    ],
    "sections": [
      {
        "heading": {
          "en": "The six strategies",
          "zh": "6 个策略"
        },
        "paragraphs": [
          {
            "en": "All six buy when an oscillator says the market is oversold and sell when it recovers:",
            "zh": "这 6 个策略都是震荡指标显示超卖时买入、回升后卖出："
          },
          {
            "en": [
              "**MR-01 RSI Mean Reversion**: the classic RSI, with a cap that keeps it out of very volatile markets",
              "**MR-16 Connors RSI**: a composite of a short RSI, the length of the current up or down streak, and how today's move ranks against recent days",
              "**MR-10 Stochastic Oscillator Reversion**",
              "**MR-11 Williams %R Reversion**",
              "**MR-05 CCI Mean Reversion** (Commodity Channel Index)",
              "**MR-12 Money Flow Index Reversion**, which adds volume to an RSI-like reading"
            ],
            "zh": [
              "**MR-01 RSI 均值回归**：经典 RSI，加了一个波动率上限，市场太剧烈时不进场",
              "**MR-16 康纳斯 RSI**：由短周期 RSI、连涨连跌天数，以及当天涨跌在近期的排位组合而成",
              "**MR-10 随机指标回归**",
              "**MR-11 威廉指标回归**",
              "**MR-05 CCI 均值回归**（商品通道指数）",
              "**MR-12 资金流量指标回归**：在类似 RSI 的读数里加入了成交量"
            ]
          },
          {
            "en": "Each runs on ten markets (the S&P 500, gold, silver, oil, natural gas, agriculture, broad commodities, EUR/USD, bitcoin and ether) with daily data and walk-forward optimization, before trading costs unless stated. We look at the last five years and at the full history since 2010.",
            "zh": "每个策略都在 10 个市场上运行（标普 500、黄金、白银、原油、天然气、农产品、综合大宗商品、欧元/美元、比特币和以太坊），使用日线数据和滚动前推优化，除非特别说明都不计交易成本。我们分别看近五年和 2010 年以来的完整历史。"
          }
        ]
      },
      {
        "heading": {
          "en": "Five years: RSI was the most consistent",
          "zh": "近五年：RSI 最稳"
        },
        "paragraphs": [
          {
            "en": "Over the five years to November 2026, the median Sharpe ratio across the ten markets was:",
            "zh": "截至 2026 年 11 月的五年里，10 个市场的夏普中位数是："
          },
          {
            "en": [
              "RSI: 0.41, positive on all 10 markets",
              "Money Flow Index: 0.39, positive on 7",
              "Stochastic: 0.28, positive on 7",
              "CCI: 0.26, positive on 6",
              "Williams %R: 0.13, positive on 7",
              "Connors RSI: 0.09, positive on 6"
            ],
            "zh": [
              "RSI：0.41，10 个市场全部为正",
              "资金流量指标：0.39，7 个为正",
              "随机指标：0.28，7 个为正",
              "CCI：0.26，6 个为正",
              "威廉指标：0.13，7 个为正",
              "康纳斯 RSI：0.09，6 个为正"
            ]
          },
          {
            "en": "RSI also had the smallest drawdowns, a median of 10% against 18% to 25% for the stochastic-type oscillators, largely because it was in the market only 10% of the time. It had the best Sharpe ratio of the six on five markets: gold, silver, EUR/USD, natural gas and bitcoin.",
            "zh": "RSI 的回撤也最小，中位数 10%，随机指标这一类是 18% 到 25%，主要原因是 RSI 只有 10% 的时间在场内。在黄金、白银、欧元/美元、天然气和比特币这 5 个市场上，它是 6 个策略里夏普最高的。"
          }
        ]
      },
      {
        "heading": {
          "en": "The S&P 500 is a special case",
          "zh": "标普 500 是个特例"
        },
        "paragraphs": [
          {
            "en": "On the S&P 500 the ranking changes. Over the last five years Connors RSI had a Sharpe ratio of 1.03 (7.9% a year) and plain RSI 0.77 (5.2% a year), both above buy-and-hold's 0.73, though below its 11.7% a year. Since 2010 Connors RSI kept the lead with a Sharpe ratio of 0.80 and a probabilistic Sharpe ratio above 99.9%, close to holding the index (0.85) while invested only 11% of the time.",
            "zh": "到了标普 500，排名就变了。近五年康纳斯 RSI 的夏普是 1.03（年化 7.9%），普通 RSI 是 0.77（年化 5.2%），都高于买入持有的 0.73，但年化收益都不如持有的 11.7%。2010 年以来康纳斯 RSI 依然领先，夏普 0.80，概率夏普比率（PSR）超过 99.9%，只有 11% 的时间持仓，夏普却接近持有指数的 0.85。"
          },
          {
            "en": "Elsewhere Connors RSI was weak: since 2010 its median Sharpe ratio across the ten markets was slightly negative. Buying short, sharp dips has worked best on the broad stock market.",
            "zh": "在其他市场上康纳斯 RSI 表现平平：2010 年以来它在 10 个市场的夏普中位数略低于 0。抄短线急跌，在大盘股指上效果最好。"
          }
        ]
      },
      {
        "heading": {
          "en": "Three oscillators, one signal",
          "zh": "三个指标，其实是一个信号"
        },
        "paragraphs": [
          {
            "en": "Stochastic, Williams %R and CCI measure much the same thing: where today's price sits within its recent range. Their daily returns on the S&P 500 over five years were correlated at 0.71 to 0.83, against about 0.3 to 0.6 between them and RSI. They also stayed in the market longer, 26% to 44% of the time, and held on through falls.",
            "zh": "随机指标、威廉指标和 CCI 衡量的东西差不多：今天的价格处在最近区间的什么位置。近五年它们在标普 500 上的日收益相关系数在 0.71 到 0.83 之间，和 RSI 只有 0.3 到 0.6 左右。它们在场内的时间也更长，占 26% 到 44%，下跌时会一直拿着。"
          },
          {
            "en": "That showed in the COVID crash of February and March 2020, when the S&P 500 fell 33.7%: CCI lost 35.4%, Stochastic 30.4% and Williams %R 26.7%. Plain RSI lost 4.8%, thanks to its volatility cap, and Connors RSI, which exits after short bounces, gained 9.4%.",
            "zh": "这在 2020 年 2–3 月的新冠暴跌中表现得很明显：标普 500 跌了 33.7%，CCI 亏了 35.4%，随机指标亏 30.4%，威廉指标亏 26.7%。普通 RSI 靠波动率上限只亏了 4.8%，康纳斯 RSI 因为反弹一下就离场，反而赚了 9.4%。"
          }
        ]
      },
      {
        "heading": {
          "en": "Since 2010",
          "zh": "2010 年以来"
        },
        "paragraphs": [
          {
            "en": "Over the full history the picture is sobering. Across the ten markets the median Sharpe ratio was 0.13 for RSI, 0.11 for the Money Flow Index and about zero or slightly negative for the other four, with median worst drawdowns of 45% to 73%: buying dips in oil, natural gas or crypto during long declines was ruinous. None of the six beat simply holding the S&P 500, which made 13.9% a year with a Sharpe ratio of 0.85.",
            "zh": "放到完整的历史里，结果就让人清醒多了。10 个市场的夏普中位数，RSI 是 0.13，资金流量指标 0.11，其余 4 个在 0 左右甚至略低于 0；最大回撤中位数在 45% 到 73% 之间：在原油、天然气或加密货币的长期下跌里抄底，代价是毁灭性的。6 个策略都没跑赢直接持有标普 500，后者年化 13.9%，夏普 0.85。"
          }
        ]
      },
      {
        "heading": {
          "en": "Costs",
          "zh": "交易成本"
        },
        "paragraphs": [
          {
            "en": "Oscillator strategies trade often. Connors RSI averaged about 29 trades a year over the last five years, the stochastic-type oscillators 23 to 25, RSI and the Money Flow Index about 13. At 10 basis points per trade that costs roughly 2.9, 2.2 to 2.5 and 1.1 to 1.3 points a year respectively, a large share of returns that are mostly in single digits.",
            "zh": "震荡指标策略交易很频繁。近五年康纳斯 RSI 平均每年交易约 29 次，随机指标这一类 23 到 25 次，RSI 和资金流量指标大约 13 次。按每次 10 个基点算，每年的成本分别约 2.9、2.2 到 2.5 和 1.1 到 1.3 个百分点，而这些策略的收益大多只有个位数。"
          }
        ]
      },
      {
        "heading": {
          "en": "What to take from it",
          "zh": "结论"
        },
        "paragraphs": [
          {
            "en": [
              "If you use one oscillator, plain RSI with a volatility filter was the most robust across markets, and the filter mattered as much as the oscillator.",
              "Stochastic, Williams %R and CCI are close substitutes; choosing between them changes little, and all three need a way to step aside in crashes.",
              "Connors RSI is a stock-index tool. It was the best of the six on the S&P 500 and unremarkable elsewhere.",
              "Count the trades: on most markets, costs take a big bite out of oscillator strategies."
            ],
            "zh": [
              "如果只用一个震荡指标，带波动率过滤的普通 RSI 在各个市场上最稳；过滤条件和指标本身一样重要。",
              "随机指标、威廉指标和 CCI 可以互相替代，选哪个差别不大，但三者都需要在暴跌时有办法离场。",
              "康纳斯 RSI 是股指工具：在标普 500 上是 6 个策略里最好的，在别的市场上表现一般。",
              "留意交易次数：在大多数市场上，成本会吃掉震荡指标策略相当一部分收益。"
            ]
          },
          {
            "en": "Every strategy page shows these results per market, updated every trading day. These are backtests, not investment advice.",
            "zh": "每个策略页面都有分市场的结果，每个交易日更新。以上都是回测结果，不构成投资建议。"
          }
        ]
      }
    ],
    "dataAsOf": "2026-11-03"
  },
  {
    "slug": "sell-in-may-turn-of-the-month",
    "title": {
      "en": "Sell in May and the Turn of the Month: Do Calendar Effects Still Work?",
      "zh": "“五月卖出”和月末效应还灵吗？10 个市场、16 年的回测"
    },
    "summary": {
      "en": "Two of the best-known calendar rules, tested on ten markets since 2010. On the S&P 500, \"Sell in May\" earned 7.7% a year against 13.9% for holding, and did not avoid the worst crash, which fell inside its November–April season. The turn-of-the-month rule made 5.6% a year while invested only a third of the time, with a much smaller drawdown, but it has been weak over the last five years and trades often enough for costs to eat half of it.",
      "zh": "我们在 10 个市场上回测了两条最有名的日历规则，时间从 2010 年开始。在标普 500 上，“五月卖出”年化 7.7%，直接持有是 13.9%；而且它没躲过最大的那次暴跌，因为暴跌正好发生在它持仓的 11 月到 4 月之间。月末效应规则只有三分之一的时间持仓，年化 5.6%，回撤小得多；但近五年表现很弱，而且交易频繁，成本能吃掉一半收益。"
    },
    "date": "2026-12-15",
    "readTime": "3 min read",
    "category": "Strategy Study",
    "featured": false,
    "tags": [
      "Seasonality",
      "Calendar"
    ],
    "sections": [
      {
        "heading": {
          "en": "The two rules",
          "zh": "两条规则"
        },
        "paragraphs": [
          {
            "en": [
              "**Sell in May (SEAS-01)**: own the market from November to April and hold cash from May to October. Two trades a year.",
              "**Turn of the month (CAL-01)**: own the market for roughly the last three and the first three trading days of each month and hold cash otherwise, which on the S&P 500 means about a third of all trading days."
            ],
            "zh": [
              "**五月卖出（SEAS-01）**：11 月到 4 月持有，5 月到 10 月拿现金。一年交易两次。",
              "**月末效应（CAL-01）**：每个月最后三个和开头三个交易日左右持有，其余时间拿现金。在标普 500 上，大约三分之一的交易日在场内。"
            ]
          },
          {
            "en": "Both run on ten markets from 2010 (bitcoin from 2014, ether from 2017) under the same rules as every Quant Arena strategy: daily data, signals executed on the next session, walk-forward optimization (only the turn-of-the-month rule has a setting to tune, the number of days), and no trading costs unless stated.",
            "zh": "两条规则都在 10 个市场上从 2010 年开始回测（比特币从 2014 年、以太坊从 2017 年开始），规则和 Quant Arena 上所有策略一样：日线数据，信号在下一个交易日执行，滚动前推优化（只有月末效应有一个可调的参数，就是天数），除非特别说明都不计交易成本。"
          }
        ]
      },
      {
        "heading": {
          "en": "Sell in May on the S&P 500",
          "zh": "标普 500 上的“五月卖出”"
        },
        "paragraphs": [
          {
            "en": "Since 2010 the rule earned 7.7% a year on the S&P 500, against 13.9% for simply holding, with a Sharpe ratio of 0.64 against 0.85. It did not even soften the worst fall: the COVID crash of February and March 2020 happened inside the November–April window, so the rule's worst drawdown was the same 34% as the index's.",
            "zh": "2010 年以来，这条规则在标普 500 上年化 7.7%，直接持有是 13.9%；夏普 0.64，持有是 0.85。它甚至没能减轻最大的那次下跌：2020 年 2–3 月的新冠暴跌正好落在 11 月到 4 月的持仓期里，所以它的最大回撤和指数一样，都是 34%。"
          },
          {
            "en": "The rule looked better in the early 2010s: from 2010 to 2015 it had a higher Sharpe ratio than holding (1.10 against 0.83). From 2016 onwards it fell behind on both return and risk-adjusted return.",
            "zh": "2010 年代初这条规则看起来还不错：2010 到 2015 年，它的夏普比持有更高（1.10 对 0.83）。但从 2016 年开始，不管是收益还是风险调整后的收益，它都落后了。"
          }
        ]
      },
      {
        "heading": {
          "en": "Sell in May on other markets",
          "zh": "其他市场上的“五月卖出”"
        },
        "paragraphs": [
          {
            "en": "On commodities the picture is different. Over the last five years the rule had a higher Sharpe ratio than buy-and-hold on seven of ten markets, including gold (1.02 against 0.91) and agriculture (1.02 against 0.70), and a smaller worst drawdown on all ten.",
            "zh": "大宗商品上情况不太一样。近五年里，这条规则在 10 个市场中的 7 个夏普高于买入持有，包括黄金（1.02 对 0.91）和农产品（1.02 对 0.70），而且 10 个市场的最大回撤都更小。"
          },
          {
            "en": "Over the full history since 2010, though, it beat holding on a risk-adjusted basis on only five markets, mostly by small margins: oil, EUR/USD, broad commodities, agriculture and natural gas. A pattern that comes and goes like this is more likely to be chance than a reliable seasonal force.",
            "zh": "但把时间拉长到 2010 年以来，它只在 5 个市场上风险调整后跑赢持有，而且大多领先不多：原油、欧元/美元、综合大宗商品、农产品和天然气。这种时有时无的规律，更像是巧合，而不是稳定的季节性。"
          }
        ]
      },
      {
        "heading": {
          "en": "The turn of the month",
          "zh": "月末效应"
        },
        "paragraphs": [
          {
            "en": "The turn-of-the-month rule is the stronger of the two on the S&P 500. Since 2010 it earned 5.6% a year while invested only 33% of the time, with a worst drawdown of 20.3% against 33.7% for the index, and a probabilistic Sharpe ratio of 99%: judged on its own, before adjusting for the many rules we test, very unlikely to be pure luck. It also did well on gold (Sharpe ratio 0.59 against 0.50 for holding) and on bitcoin (16.3% a year since 2014, though holding bitcoin made far more).",
            "zh": "在标普 500 上，月末效应是两条规则里更强的一条。2010 年以来，它只有 33% 的时间持仓，年化 5.6%，最大回撤 20.3%，指数是 33.7%；概率夏普比率（PSR）99%：在不考虑我们同时测试了很多规则的前提下，很难说只是运气。它在黄金上也不错（夏普 0.59，持有是 0.50），在比特币上 2014 年以来年化 16.3%（当然直接持有比特币赚得多得多）。"
          },
          {
            "en": "But it is not steady. On the S&P 500 it made 3.7% a year from 2010 to 2015 and 8.9% from 2016 to 2020, when its Sharpe ratio was slightly above buy-and-hold's. Over the last five years it made only 2.9% a year, and it lost money on seven of the other nine markets.",
            "zh": "但它并不稳定。在标普 500 上，2010–2015 年年化 3.7%，2016–2020 年 8.9%，这段时间夏普略高于持有。近五年只有年化 2.9%，在另外 9 个市场里有 7 个是亏钱的。"
          }
        ]
      },
      {
        "heading": {
          "en": "Costs",
          "zh": "交易成本"
        },
        "paragraphs": [
          {
            "en": "Calendar rules trade on a schedule, and the turn-of-the-month rule trades a lot: about 24 trades a year. At 10 basis points per trade that costs roughly 2.4 points a year, nearly half of its 5.6% on the S&P 500. Sell in May trades twice a year and costs about 0.2 points.",
            "zh": "日历规则按时间表交易，月末效应交易得很频繁：一年大约 24 次。按每次 10 个基点算，每年成本大约 2.4 个百分点，几乎是它在标普 500 上 5.6% 年化收益的一半。“五月卖出”一年只交易两次，成本大约 0.2 个百分点。"
          }
        ]
      },
      {
        "heading": {
          "en": "In a crash",
          "zh": "暴跌的时候"
        },
        "paragraphs": [
          {
            "en": "Because it is out of the market two thirds of the time, the turn-of-the-month rule sidestepped the S&P 500's three big falls: +2.8% in the fourth quarter of 2018 while the index fell 19.2%, −4.9% in the COVID crash (index −33.7%) and −0.1% in the 2022 bear market (index −24.5%). Sell in May was caught by the first two, losing 13.8% and 33.7%, and lost 13.0% in 2022.",
            "zh": "月末效应三分之二的时间都不在场内，所以躲过了标普 500 的三次大跌：2018 年四季度指数跌 19.2%，它反而赚了 2.8%；新冠暴跌指数跌 33.7%，它只亏 4.9%；2022 年熊市指数跌 24.5%，它只亏 0.1%。“五月卖出”前两次都没躲开，分别亏了 13.8% 和 33.7%，2022 年亏了 13.0%。"
          }
        ]
      },
      {
        "heading": {
          "en": "What to take from it",
          "zh": "结论"
        },
        "paragraphs": [
          {
            "en": [
              "Sell in May has not paid on the S&P 500 since the early 2010s. On commodities it has looked good lately, but not consistently.",
              "The turn-of-the-month effect on stocks is visible over 16 years, but it is uneven, and trading costs take about half of it.",
              "Both rules cut drawdowns mostly by being out of the market. A simple trend filter protected about as well in the 2020 crash (median trend-following strategy −4.7%) with fewer trades."
            ],
            "zh": [
              "“五月卖出”在标普 500 上从 2010 年代初以后就不灵了。在大宗商品上最近几年看起来不错，但并不稳定。",
              "股票上的月末效应在 16 年里确实看得到，但时强时弱，而且交易成本会吃掉大约一半。",
              "两条规则减少回撤，主要靠的是不在场内。一个简单的趋势过滤在 2020 年暴跌中保护得差不多好（趋势跟踪策略中位数 −4.7%），交易次数还更少。"
            ]
          },
          {
            "en": "Every number here is on the strategy pages for SEAS-01 and CAL-01, updated every trading day. These are backtests, not investment advice.",
            "zh": "文中所有数字都能在 SEAS-01 和 CAL-01 的策略页面上看到，每个交易日更新。以上都是回测结果，不构成投资建议。"
          }
        ]
      }
    ],
    "dataAsOf": "2026-11-03"
  },
  {
    "slug": "trend-following-vs-mean-reversion",
    "title": {
      "en": "Trend Following vs Mean Reversion: What 381 Backtests on 10 Markets Show",
      "zh": "趋势跟踪还是均值回归？10 个市场、381 次回测的答案"
    },
    "summary": {
      "en": "We compared 24 trend-following and 15 mean-reversion strategies on ten markets over five years. Trend following had the better median Sharpe ratio on six markets, including gold, silver and bitcoin; mean reversion won on oil, broad commodities and agriculture. Mean reversion was in the market only 15% of the time and had less than half the drawdowns, but in a crash buying the dip hurt: on the S&P 500 in March 2020 it lost about four times as much as trend following.",
      "zh": "我们在 10 个市场上比较了 24 个趋势跟踪策略和 15 个均值回归策略近五年的表现。趋势跟踪在 6 个市场上夏普中位数更高，包括黄金、白银和比特币；均值回归在原油、综合大宗商品和农产品上胜出。均值回归只有 15% 的时间持仓，回撤不到趋势跟踪的一半；但遇到暴跌时，抄底很伤：2020 年 3 月的标普 500 上，它亏的差不多是趋势跟踪的四倍。"
    },
    "date": "2026-12-01",
    "readTime": "4 min read",
    "category": "Strategy Comparison",
    "featured": false,
    "tags": [
      "Trend",
      "Mean Reversion",
      "Crash"
    ],
    "sections": [
      {
        "heading": {
          "en": "The test",
          "zh": "测试方式"
        },
        "paragraphs": [
          {
            "en": "Quant Arena groups its strategies into families. Here we compare the 24 trend-following strategies (moving-average crossovers, channel breakouts, Supertrend, Ichimoku, turtle rules and similar) with the 15 mean-reversion strategies (RSI, Bollinger Bands, z-scores, Connors RSI and similar) on ten markets: the S&P 500 (SPY), gold, silver, oil, natural gas, agriculture, broad commodities, EUR/USD, bitcoin and ether. Every strategy uses daily data and walk-forward optimization, with no trading costs unless stated. The main window is the five years to 3 November 2026, which gives 240 trend-following and 141 mean-reversion results.",
            "zh": "Quant Arena 把策略分成几个大类。这次比较的是 24 个趋势跟踪策略（均线交叉、通道突破、超级趋势、一目均衡表、海龟法则等）和 15 个均值回归策略（RSI、布林带、Z 分数、康纳斯 RSI 等），市场共 10 个：标普 500（SPY）、黄金、白银、原油、天然气、农产品、综合大宗商品、欧元/美元、比特币和以太坊。所有策略都用日线数据和滚动前推优化，除非特别说明都不计交易成本。主要看截至 2026 年 11 月 3 日的近五年，一共是 240 个趋势跟踪结果和 141 个均值回归结果。"
          }
        ]
      },
      {
        "heading": {
          "en": "Market by market",
          "zh": "逐个市场看"
        },
        "paragraphs": [
          {
            "en": "Median Sharpe ratio over five years, trend following vs mean reversion:",
            "zh": "近五年的夏普中位数，趋势跟踪对均值回归："
          },
          {
            "en": [
              "Gold: 0.78 vs 0.35",
              "Silver: 0.54 vs 0.07",
              "S&P 500: 0.53 vs 0.41",
              "Bitcoin: 0.35 vs 0.12",
              "Ether: 0.20 vs 0.00",
              "EUR/USD: 0.11 vs −0.13",
              "Oil: 0.39 vs 0.85",
              "Broad commodities: 0.38 vs 0.57",
              "Agriculture: 0.39 vs 0.42",
              "Natural gas: −0.24 vs −0.12"
            ],
            "zh": [
              "黄金：0.78 对 0.35",
              "白银：0.54 对 0.07",
              "标普 500：0.53 对 0.41",
              "比特币：0.35 对 0.12",
              "以太坊：0.20 对 0.00",
              "欧元/美元：0.11 对 −0.13",
              "原油：0.39 对 0.85",
              "综合大宗商品：0.38 对 0.57",
              "农产品：0.39 对 0.42",
              "天然气：−0.24 对 −0.12"
            ]
          },
          {
            "en": "Trend following won where prices made long, one-way moves: precious metals and crypto. Mean reversion won on the commodity markets that went back and forth, oil above all, where its median Sharpe ratio of 0.85 was the best figure for either family on any market. On natural gas, which lost 35% a year, the median strategy of both families lost money.",
            "zh": "价格走出长时间单边行情的市场，趋势跟踪赢了：贵金属和加密货币都是这样。来回震荡的大宗商品市场，均值回归赢了，尤其是原油：0.85 的夏普中位数是两类策略在所有市场里最高的一个。天然气每年跌 35%，两类策略都没占到便宜。"
          }
        ]
      },
      {
        "heading": {
          "en": "Return against pain",
          "zh": "收益和回撤"
        },
        "paragraphs": [
          {
            "en": "Across all markets, the median trend-following result returned 4.0% a year with a Sharpe ratio of 0.32 and a worst drawdown of 31.6%. The median mean-reversion result returned 0.8% a year with a Sharpe ratio of 0.20 and a worst drawdown of 14.7%.",
            "zh": "把所有市场放在一起看，趋势跟踪的中位数结果是年化 4.0%、夏普 0.32、最大回撤 31.6%；均值回归的中位数结果是年化 0.8%、夏普 0.20、最大回撤 14.7%。"
          },
          {
            "en": "Most of the difference in drawdowns is time in the market. Mean-reversion rules wait for stretched prices and were invested only 15% of the time, against 49% for trend following. Both traded about 13 times a year, so costs hit them about equally: roughly 1.2 points of annual return at 10 basis points per unit traded.",
            "zh": "回撤差这么多，主要是因为持仓时间不同。均值回归要等价格偏离得够远才出手，只有 15% 的时间在场内，趋势跟踪则是 49%。两类策略每年都交易 13 次左右，所以成本的影响差不多：按每单位成交 10 个基点算，每年大约少赚 1.2 个百分点。"
          }
        ]
      },
      {
        "heading": {
          "en": "When markets crash",
          "zh": "暴跌的时候"
        },
        "paragraphs": [
          {
            "en": "The S&P 500 had three sharp sell-offs in our data: the fourth quarter of 2018 (−19.2%), the COVID crash of February and March 2020 (−33.7%) and the 2022 bear market (−24.5%). Nearly every strategy in both families lost far less than the index each time, because both spend a lot of time out of the market. But they protected in different ways.",
            "zh": "我们的数据里，标普 500 有过三次急跌：2018 年四季度（−19.2%）、2020 年 2–3 月的新冠暴跌（−33.7%）和 2022 年熊市（−24.5%）。每一次，两类策略几乎都比指数亏得少得多，因为它们本来就有很多时间不在场内。但两者的保护方式不一样。"
          },
          {
            "en": "In the COVID crash the median trend-following strategy lost 4.7%: it had already stepped aside as prices broke down. The median mean-reversion strategy lost 18.3%, because each new low looked like a bargain and triggered another buy. In the slower 2022 decline mean reversion did better: its median strategy ended flat, against −8.0% for trend following.",
            "zh": "新冠暴跌时，趋势跟踪的中位数策略只亏了 4.7%：价格跌破趋势时它已经离场了。均值回归的中位数策略亏了 18.3%，因为每一个新低看起来都像便宜货，于是一次又一次地买进。到了跌得比较慢的 2022 年，均值回归反而更好：中位数策略不赚不亏，趋势跟踪则是 −8.0%。"
          }
        ]
      },
      {
        "heading": {
          "en": "The last twelve months",
          "zh": "最近 12 个月"
        },
        "paragraphs": [
          {
            "en": "Over the year to November 2026 the picture was more one-sided: trend following had the better median Sharpe ratio on eight of ten markets. The exception that matters most is the S&P 500, where mean reversion led clearly (1.07 against 0.33) in a market that rose 11.6% with only shallow pullbacks. One year is a short sample, but it is a reminder that the better family changes with the character of the market.",
            "zh": "截至 2026 年 11 月的一年里，局面更一边倒：10 个市场中有 8 个是趋势跟踪的夏普中位数更高。最值得注意的例外是标普 500：这一年指数涨了 11.6%，回调都很浅，均值回归明显领先（1.07 对 0.33）。一年的样本很短，但它提醒我们，哪一类策略更好，会随着市场的性格而变。"
          }
        ]
      },
      {
        "heading": {
          "en": "Neither beat simply holding",
          "zh": "两类策略都很难跑赢持有"
        },
        "paragraphs": [
          {
            "en": "In absolute return both families mostly trailed buy-and-hold: 84 of 240 trend-following results (35%) and 41 of 141 mean-reversion results (29%) earned more than holding the market over five years. On five of the ten markets, simply holding had a higher Sharpe ratio than the median strategy of either family. Their value lies in how they lose, not in how much they make.",
            "zh": "论绝对收益，两类策略大多不如买入持有：近五年里，240 个趋势跟踪结果中有 84 个（35%）、141 个均值回归结果中有 41 个（29%）赚得比持有多。在 10 个市场中的 5 个，直接持有的夏普比两类策略的中位数都高。它们的价值在于怎么亏，而不是能赚多少。"
          }
        ]
      },
      {
        "heading": {
          "en": "The gap inside each family is bigger",
          "zh": "同一类策略之间的差别更大"
        },
        "paragraphs": [
          {
            "en": "The difference between the families is smaller than the difference within them. The middle half of trend-following results had Sharpe ratios between 0.05 and 0.55; for mean reversion the middle half ran from −0.06 to 0.46. 77% of trend-following results and 66% of mean-reversion results had a positive Sharpe ratio. Choosing a sound rule, and checking it on more than one market, matters more than choosing the family.",
            "zh": "两类策略之间的差距，比同一类内部的差距小。趋势跟踪中间一半结果的夏普在 0.05 到 0.55 之间；均值回归中间一半在 −0.06 到 0.46 之间。77% 的趋势跟踪结果和 66% 的均值回归结果夏普为正。选对一条靠谱的规则、并在不止一个市场上验证，比选哪一类更重要。"
          }
        ]
      },
      {
        "heading": {
          "en": "What to take from it",
          "zh": "结论"
        },
        "paragraphs": [
          {
            "en": [
              "Trend following suited markets with long one-way moves (gold, silver, crypto) and lost little in sudden crashes.",
              "Mean reversion suited choppy commodity markets and kept drawdowns small by staying out most of the time, but buying dips in a crash was costly.",
              "Neither beat simply holding on most markets. Use them to shape risk, and judge any strategy on several markets, not one."
            ],
            "zh": [
              "趋势跟踪适合有长时间单边行情的市场（黄金、白银、加密货币），突然暴跌时亏得少。",
              "均值回归适合来回震荡的大宗商品市场，大部分时间不持仓，所以回撤小；但在暴跌中抄底代价很大。",
              "两者在大多数市场上都跑不赢直接持有。用它们来控制风险，并且在多个市场上检验一个策略，而不是只看一个。"
            ]
          },
          {
            "en": "The strategy heatmap shows every strategy on every market with current data. These are backtests, not investment advice.",
            "zh": "策略热力图上有每个策略在每个市场上的最新数据。以上都是回测结果，不构成投资建议。"
          }
        ]
      }
    ],
    "dataAsOf": "2026-11-03"
  },
  {
    "slug": "gold-trading-strategies-backtested",
    "title": {
      "en": "We Backtested 56 Trading Strategies on Gold. Only 3 Beat Simply Holding It.",
      "zh": "我们在黄金上回测了 56 个交易策略，只有 3 个跑赢了直接持有"
    },
    "summary": {
      "en": "Gold more than doubled between November 2021 and November 2026, then fell 28% from its January 2026 peak. Over those five years only three of 56 rule-based strategies earned more than simply holding the gold ETF. But 55 had smaller drawdowns, eleven had a better Sharpe ratio, and trend and volatility rules worked noticeably better on gold than on the S&P 500.",
      "zh": "2021 年 11 月到 2026 年 11 月，黄金涨了一倍多，又从 2026 年 1 月的高点跌了 28%。这五年里，56 个规则化策略只有 3 个比直接持有黄金 ETF 赚得多。但有 55 个策略的最大回撤更小，11 个的夏普比率更高；而且趋势和波动率类策略在黄金上的表现明显好于在标普 500 上。"
    },
    "date": "2026-11-17",
    "readTime": "4 min read",
    "category": "Market Study",
    "featured": false,
    "tags": [
      "Gold",
      "Volatility",
      "Regime",
      "Stop Loss"
    ],
    "sections": [
      {
        "heading": {
          "en": "The test",
          "zh": "测试方式"
        },
        "paragraphs": [
          {
            "en": "Every strategy on Quant Arena runs under the same rules: daily data, signals at the close executed on the next session, walk-forward optimization that re-fits parameters on past data every six months, full allocation without leverage, and no trading costs unless stated. This study uses the 56 strategies that trade gold through GLD, the largest gold ETF, from 3 November 2021 to 3 November 2026. Buy-and-hold means owning GLD for the whole period.",
            "zh": "Quant Arena 上的每个策略都按同一套规则回测：日线数据，收盘时出信号、下一个交易日执行，用滚动前推优化每六个月只用过去的数据重新选参数，满仓、不加杠杆，除非特别说明都不计交易成本。这次看的是在 GLD（规模最大的黄金 ETF）上交易的 56 个策略，时间从 2021 年 11 月 3 日到 2026 年 11 月 3 日。“买入持有”就是这五年一直拿着 GLD。"
          }
        ]
      },
      {
        "heading": {
          "en": "Gold was hard to beat",
          "zh": "黄金很难跑赢"
        },
        "paragraphs": [
          {
            "en": "Holding GLD returned 117% over the five years, 16.73% a year, with a Sharpe ratio of 0.91. Most of it came late: gold rose 27% in 2024 and 64% in 2025. Only three strategies earned a higher annual return, and none by more than a percentage point:",
            "zh": "这五年直接持有 GLD 的总收益是 117%，年化 16.73%，夏普比率 0.91。大部分涨幅来得很晚：2024 年涨了 27%，2025 年涨了 64%。只有 3 个策略的年化收益更高，而且领先都不到 1 个百分点："
          },
          {
            "en": [
              "**REG-01 Regime Switch**: 17.42% a year, worst drawdown 17.7%",
              "**RISK-01 Drawdown Control**: 17.12% a year, worst drawdown 24.4%",
              "**RISK-03 Stop Loss Overlay**: 16.92% a year, worst drawdown 13.9%"
            ],
            "zh": [
              "**REG-01 市场状态切换**：年化 17.42%，最大回撤 17.7%",
              "**RISK-01 回撤控制**：年化 17.12%，最大回撤 24.4%",
              "**RISK-03 止损叠加**：年化 16.92%，最大回撤 13.9%"
            ]
          },
          {
            "en": "It is the same story as on the S&P 500, where two of 62 strategies beat buy-and-hold over the same five years. In a strong, steady rally, any rule that spends time out of the market gives up return.",
            "zh": "这和标普 500 上的情况一样：同样五年，62 个策略里只有 2 个跑赢买入持有。在一轮又强又稳的上涨里，任何会离场的规则都要少赚一些。"
          }
        ]
      },
      {
        "heading": {
          "en": "Where the strategies won: risk",
          "zh": "策略赢在风险上"
        },
        "paragraphs": [
          {
            "en": "55 of the 56 strategies had a smaller worst drawdown than holding gold, which fell 28.3% at its worst; the exception, MOM-03 52-Week High Momentum, fell 33.9%. Most of the difference comes from simply not always being invested: the median strategy was in the market 47% of the time. Eleven strategies also had a higher Sharpe ratio than buy-and-hold, meaning more return for each unit of volatility.",
            "zh": "56 个策略中有 55 个的最大回撤小于直接持有黄金（最大回撤 28.3%）；唯一的例外是 MOM-03 52 周新高动量，最大回撤 33.9%。差别主要来自它们不总在场内：中位数策略只有 47% 的时间持仓。另外有 11 个策略的夏普比率高于买入持有，也就是每承担一单位波动，赚得更多。"
          },
          {
            "en": "The best balance came from **VOL-13 Volatility Regime Strategy**: 11.4% a year with a Sharpe ratio of 1.20 and a worst drawdown of 10.5%, less than 40% of buy-and-hold's. **REG-01 Regime Switch** came closest to having both: 17.4% a year, Sharpe 1.19, worst drawdown 17.7%. **RISK-03 Stop Loss Overlay** matched gold's return with half its drawdown (13.9%).",
            "zh": "平衡得最好的是 **VOL-13 波动率状态策略**：年化 11.4%，夏普 1.20，最大回撤 10.5%，还不到买入持有的 40%。**REG-01 市场状态切换** 最接近两头兼顾：年化 17.4%，夏普 1.19，最大回撤 17.7%。**RISK-03 止损叠加** 赚到了和黄金差不多的收益，回撤只有一半（13.9%）。"
          }
        ]
      },
      {
        "heading": {
          "en": "Gold suits trend and volatility rules",
          "zh": "黄金更适合趋势和波动率策略"
        },
        "paragraphs": [
          {
            "en": "All 56 strategies also ran on the S&P 500 (SPY) over the same five years, so they can be compared directly. 33 of the 56 had a higher Sharpe ratio on gold. By family, the median Sharpe ratio on gold versus SPY was:",
            "zh": "这 56 个策略同一时间段也都在标普 500（SPY）上跑过，可以直接对比。其中 33 个在黄金上的夏普比率更高。按策略类别看，黄金和 SPY 上的夏普中位数分别是："
          },
          {
            "en": [
              "Volatility strategies: 0.98 vs 0.47",
              "Trend following: 0.78 vs 0.53",
              "Momentum: 0.69 vs 0.63",
              "Mean reversion: 0.35 vs 0.42"
            ],
            "zh": [
              "波动率策略：0.98 对 0.47",
              "趋势跟踪：0.78 对 0.53",
              "动量：0.69 对 0.63",
              "均值回归：0.35 对 0.42"
            ]
          },
          {
            "en": "Gold's gains came in long runs, the kind of market that trend and volatility-breakout rules are built for. Buying dips did not help: mean-reversion rules did slightly worse on gold than on stocks.",
            "zh": "黄金的涨幅是一段一段持续出来的，正好是趋势和波动率突破规则擅长的行情。逢低买入就没占到便宜：均值回归策略在黄金上反而比在股票上稍差。"
          }
        ]
      },
      {
        "heading": {
          "en": "The last twelve months: a 28% fall",
          "zh": "最近 12 个月：一次 28% 的下跌"
        },
        "paragraphs": [
          {
            "en": "The last year looked very different. Gold peaked on 29 January 2026, fell 28% to its low on 30 October, and ended the twelve months 2.6% lower. 41 of the 56 strategies did better than holding, and all but one had a smaller drawdown.",
            "zh": "最近一年完全是另一番景象。黄金在 2026 年 1 月 29 日见顶，到 10 月 30 日的低点跌了 28%，整整 12 个月下来跌了 2.6%。56 个策略里有 41 个比持有表现好，除了一个之外回撤都更小。"
          },
          {
            "en": "The one-year leader was **MR-01 RSI Mean Reversion**: +18.5% with a Sharpe ratio of 1.80, from 22 trades and only 9% of the time in the market. Over the full five years the same strategy made 4.8% a year on gold. Twenty-two trades is a small sample, and one-year leaders change often, so treat them with care.",
            "zh": "近一年排第一的是 **MR-01 RSI 均值回归**：收益 +18.5%，夏普 1.80，只交易了 22 次，持仓时间仅占 9%。但放到完整的五年，同一个策略在黄金上的年化只有 4.8%。22 笔交易的样本很小，一年期的冠军也经常换人，看的时候要谨慎。"
          }
        ]
      },
      {
        "heading": {
          "en": "How sure can we be?",
          "zh": "这些结果有多可靠"
        },
        "paragraphs": [
          {
            "en": "On gold, 25 of the 56 strategies have a probabilistic Sharpe ratio above 95%: judged on its own, each has a 95% or higher probability that its true Sharpe ratio is above zero. On the S&P 500 the count is 11 of 62. But once you correct for testing hundreds of strategy-and-market pairs at the same time (the deflated Sharpe ratio), none reaches 95%; the best, VOL-13, gets to 80%.",
            "zh": "在黄金上，56 个策略中有 25 个的概率夏普比率（PSR）超过 95%：单独来看，每个都有 95% 以上的把握真实夏普大于 0。在标普 500 上是 62 个中有 11 个。但如果考虑到我们同时测试了几百个“策略 × 市场”组合（Deflated Sharpe），没有一个能达到 95%，最高的 VOL-13 也只有 80%。"
          },
          {
            "en": "That is the same lesson as in our luck-adjusted study of all 72 strategies: these are promising candidates, not proven edges.",
            "zh": "这和我们对全部 72 个策略做的运气修正研究结论一样：这些是值得关注的候选，而不是被证明了的优势。"
          }
        ]
      },
      {
        "heading": {
          "en": "Before costs",
          "zh": "还没算交易成本"
        },
        "paragraphs": [
          {
            "en": "All figures are before trading costs. At an assumed 10 basis points per unit traded, the strategies above give up between 0.3 and 2 points of annual return: about 0.3 for RISK-01, 0.9 for REG-01, 1.6 for RISK-03 and 2 for VOL-13. Busier strategies pay much more: TREND-17 Chandelier Exit, with 332 trades, drops from 11.5% to roughly 4.8% a year. Every strategy page has a cost slider to try other levels.",
            "zh": "以上数字都没扣交易成本。按每单位成交 10 个基点的成本估算，上面这些策略每年要少赚 0.3 到 2 个百分点：RISK-01 约 0.3，REG-01 约 0.9，RISK-03 约 1.6，VOL-13 约 2。交易越频繁，成本越高：交易了 332 次的 TREND-17 吊灯止损，年化会从 11.5% 降到 4.8% 左右。每个策略页面都有成本滑块，可以试试别的成本水平。"
          }
        ]
      },
      {
        "heading": {
          "en": "What to take from it",
          "zh": "结论"
        },
        "paragraphs": [
          {
            "en": [
              "If you just wanted gold's return, holding it was hard to beat: 53 of 56 strategies earned less over five years.",
              "If you wanted gold with less pain, several rules cut the worst drawdown by between a third and almost two-thirds while keeping much of the return, and volatility- and regime-based rules did best.",
              "One-year winners, and any result not adjusted for multiple testing, deserve extra skepticism."
            ],
            "zh": [
              "如果只是想拿到黄金的收益，直接持有很难被超越：五年下来 56 个策略里有 53 个赚得更少。",
              "如果想少受点罪，有几个规则把最大回撤砍掉了三分之一到将近三分之二，同时保住了大部分收益，其中波动率和市场状态类策略做得最好。",
              "一年期的冠军，以及没做多重检验修正的结果，都要多打几个问号。"
            ]
          },
          {
            "en": "The gold column of the strategy heatmap and the leaderboard show the current numbers, updated every trading day. These are backtests, not investment advice.",
            "zh": "策略热力图的黄金一列和排行榜上有最新数字，每个交易日更新。以上都是回测结果，不构成投资建议。"
          }
        ]
      }
    ],
    "dataAsOf": "2026-11-03"
  },
  {
    "slug": "luck-adjusted-sharpe-72-strategies",
    "title": {
      "en": "We Backtested 72 Strategies. After Adjusting for Luck, None Clearly Beat the Odds.",
      "zh": "我们回测了 72 个策略，扣除运气之后，没有一个能明确胜出"
    },
    "summary": {
      "en": "104 strategy-and-market combinations look statistically convincing on their own. Once you account for the fact that we tested hundreds of them at the same time, the number drops to zero. Here is what that means for reading any leaderboard, including ours.",
      "zh": "单独看，有 104 个“策略 × 市场”的结果在统计上很有说服力；可一旦考虑到我们同时测试了几百个，这个数字就变成了零。这对怎么看任何排行榜（包括我们自己的）都很重要。"
    },
    "date": "2026-11-03",
    "readTime": "3 min read",
    "category": "Methodology",
    "featured": true,
    "tags": [
      "Sharpe Ratio",
      "Overfitting",
      "Statistics"
    ],
    "sections": [
      {
        "heading": {
          "en": "The setup",
          "zh": "测试方式"
        },
        "paragraphs": [
          {
            "en": "Quant Arena runs 72 systematic strategies on up to 10 markets — US stocks (SPY), gold, silver, oil, natural gas, agriculture, broad commodities, EUR/USD, bitcoin and ether — with the same rules, the same walk-forward optimization and the same metrics. Over the last five years of data that gives 576 strategy-and-market results.",
            "zh": "Quant Arena 在最多 10 个市场上运行 72 个系统化策略：美股（SPY）、黄金、白银、原油、天然气、农产品、综合大宗商品、欧元/美元、比特币和以太坊。所有策略使用同样的规则、同样的滚动前推优化和同样的指标。近五年的数据一共给出 576 个“策略 × 市场”结果。"
          },
          {
            "en": "For each one we compute two numbers that try to answer the question \"is this edge real or luck?\":",
            "zh": "每个结果我们都算两个数，试图回答“这是真本事还是运气”："
          },
          {
            "en": [
              "The **probabilistic Sharpe ratio (PSR)**: the probability that the true Sharpe ratio is above zero, given how long and how lumpy the return history is.",
              "The **deflated Sharpe ratio (DSR)**: the same question, but against the best Sharpe ratio you would expect from luck alone when you test many strategies at once."
            ],
            "zh": [
              "**概率夏普（PSR）**：结合收益记录的长度和形状，真实夏普大于 0 的概率。",
              "**Deflated 夏普（DSR）**：同一个问题，但比较对象换成“同时测试很多策略时，单靠运气能达到的最好夏普”。"
            ]
          }
        ]
      },
      {
        "heading": {
          "en": "What the numbers say",
          "zh": "数据怎么说"
        },
        "paragraphs": [
          {
            "en": "Looked at one by one, 104 of the 576 results have a PSR above 95%. That is the kind of number that ends up in a marketing deck.",
            "zh": "逐个看，576 个结果里有 104 个的 PSR 超过 95%，这种数字很容易被写进宣传材料。"
          },
          {
            "en": "The DSR tells a different story. Not a single result clears 95%. The best is SAR-01 Parabolic SAR on EUR/USD at 91%, followed by REG-14 Volatility Regime Switch on gold (85%), MACRO-01 Cross-Asset Momentum on SPY (84%), TREND-20 Vortex Indicator on EUR/USD (83%), and MR-03 Kalman Filter Mean Reversion on broad commodities and VOL-13 Volatility Regime Strategy on gold (82% each). The median DSR across all 576 results is 23%.",
            "zh": "DSR 给出的答案完全不同：没有一个结果超过 95%。最高的是欧元/美元上的 SAR-01 抛物线 SAR（91%），其后是黄金上的 REG-14 波动率状态切换（85%）、SPY 上的 MACRO-01 跨资产动量（84%）、欧元/美元上的 TREND-20 涡旋指标（83%），以及综合大宗商品上的 MR-03 卡尔曼滤波均值回归和黄金上的 VOL-13 波动率状态策略（都是 82%）。576 个结果的 DSR 中位数只有 23%。"
          },
          {
            "en": "In plain words: if you pick the best-looking strategy after trying hundreds, a five-year Sharpe ratio of 1.2–1.5 is roughly what chance alone would hand you.",
            "zh": "说白了：试了几百个之后挑出看起来最好的那个，五年夏普 1.2 到 1.5，差不多就是运气本身能给你的水平。"
          }
        ]
      },
      {
        "heading": {
          "en": "Why this happens",
          "zh": "为什么会这样"
        },
        "paragraphs": [
          {
            "en": "Every extra strategy you test is another lottery ticket. With 60 strategies on the same market, the luckiest one will usually show a Sharpe ratio well above its true value. The DSR, introduced by Bailey and López de Prado, estimates how high that \"luckiest ticket\" should be from the spread of all the results, and only gives credit for the part above it.",
            "zh": "每多测试一个策略，就多买了一张彩票。同一个市场上有 60 个策略时，最幸运的那个，夏普通常会明显高于它的真实水平。Bailey 和 López de Prado 提出的 DSR，用所有结果的离散程度估计“最幸运的那张彩票”该有多高，只把超过这条线的部分算作真本事。"
          },
          {
            "en": "Two details in our setup make the bar higher, not lower. First, the same strategy appears on many correlated markets. Second, walk-forward optimization picks parameters from a small grid every six months, which is itself a form of testing. We count only the strategies, not the parameter sets, so if anything our DSR is still generous.",
            "zh": "我们的设置里有两点会让门槛更高而不是更低：第一，同一个策略出现在多个相关的市场上；第二，滚动前推优化每六个月从一个小参数网格里挑参数，这本身也是一种“多次测试”。我们只把策略个数算作试验次数，没有算参数组合，所以我们的 DSR 其实还偏宽松。"
          }
        ]
      },
      {
        "heading": {
          "en": "Buy-and-hold is a hard benchmark",
          "zh": "买入持有是个很难打败的基准"
        },
        "paragraphs": [
          {
            "en": "The same five years show how high the bar was. Buy-and-hold SPY returned about 13.2% a year with a Sharpe ratio of 0.81. Only 1 of the 62 strategies tested on SPY beat it on annual return, and 14 beat it on Sharpe ratio. Most timing strategies spend part of the time in cash, so they give up return in exchange for smaller drawdowns — a trade-off that can be worth it, but is not \"beating the market\".",
            "zh": "同样这五年，也能看出门槛有多高：买入持有 SPY 年化约 13.2%，夏普 0.81。在 SPY 上测试的 62 个策略里，只有 1 个年化收益超过它，14 个夏普超过它。大多数择时策略有一部分时间空仓，用更小的回撤换了更低的收益——这种交换可能值得，但它不等于“跑赢市场”。"
          }
        ]
      },
      {
        "heading": {
          "en": "How to use this when you read a leaderboard",
          "zh": "看排行榜时可以怎么用"
        },
        "paragraphs": [
          {
            "en": [
              "Treat a high Sharpe ratio as a reason to look closer, not as a conclusion. Check the DSR on the strategy page.",
              "Prefer strategies that hold up across markets and time windows. The Arena Score's robustness component uses the worst Sharpe across the 1-, 3-, 5-year and full windows for exactly this reason.",
              "Look at what a strategy was designed to do. A trend filter that halves the drawdown of buy-and-hold is doing its job even if its DSR is modest.",
              "Remember the costs. Our backtests do not subtract commissions or slippage; strategy pages show an estimate after 10 basis points."
            ],
            "zh": [
              "把高夏普当成值得细看的理由，而不是结论。去策略页看看 DSR。",
              "优先选在不同市场、不同时间窗口都站得住的策略。Arena Score 的稳健性分项用的就是 1 年、3 年、5 年和全部历史中最差的那个夏普。",
              "看策略本来想解决什么问题。一个把买入持有的回撤砍掉一半的趋势过滤，即使 DSR 不高，也是在做它该做的事。",
              "别忘了成本。我们的回测没有扣佣金和滑点；策略页给出了扣除 10 个基点后的估算。"
            ]
          }
        ]
      },
      {
        "heading": {
          "en": "What we changed",
          "zh": "我们做了什么调整"
        },
        "paragraphs": [
          {
            "en": "The deflated Sharpe ratio now appears on every strategy page next to the probabilistic Sharpe ratio, and the Arena Score uses PSR for its significance component. We would rather show an honest \"probably luck\" than a confident number that will not survive the next five years.",
            "zh": "现在每个策略页都会在概率夏普旁边显示 Deflated 夏普，Arena Score 的统计可信度分项也使用 PSR。我们宁愿诚实地告诉你“很可能是运气”，也不想给出一个下一个五年就站不住的漂亮数字。"
          }
        ]
      }
    ],
    "dataAsOf": "2026-08-14"
  },
  {
    "slug": "free-mt5-expert-advisors-backtested",
    "title": {
      "en": "We Tried to Backtest 1,063 Free MT5 Expert Advisors. Here Is What Survived.",
      "zh": "我们试着回测了 1063 个免费 MT5 EA，最后留下了什么"
    },
    "summary": {
      "en": "Free MetaTrader 5 EAs from the MQL5 CodeBase, converted automatically and tested on four markets for one year. More than half could not be converted at all. Of the 1,123 results we trust, about half made money — but on currencies the typical EA ended flat, only 30 EAs were profitable on all four markets, and one in five gold runs wiped out the account.",
      "zh": "来自 MQL5 代码库的免费 MetaTrader 5 智能交易系统，经自动转换后在四个市场上测试了一年。一半以上根本没法转换；在 1123 个可信的结果里，大约一半赚钱——但在外汇上，典型的 EA 基本不赚不亏，只有 30 个 EA 在四个市场上都盈利，黄金上每五次回测就有一次把账户亏光。"
    },
    "date": "2026-11-03",
    "readTime": "3 min read",
    "category": "EA Research",
    "featured": false,
    "tags": [
      "MT5",
      "Expert Advisor",
      "Backtest",
      "Risk"
    ],
    "sections": [
      {
        "heading": {
          "en": "What we did",
          "zh": "我们做了什么"
        },
        "paragraphs": [
          {
            "en": "**Update, 3 November 2026:** after publishing we found 85 EAs whose converted versions produce exactly the same backtest as another EA on every market — for example 14 unrelated EAs with identical results. The conversion evidently lost what made them different, so their 298 runs are no longer counted, and the figures below have been recalculated. Most of them were profitable on gold, so the gold numbers fell the most. All figures here come from the test on hourly data from May 2025 to May 2026. Since 4 November 2026 every EA is re-run each month on the latest twelve months, so the numbers on the EA pages differ slightly from this article.",
            "zh": "**2026 年 11 月 3 日更新：** 文章发布后我们发现，有 85 个 EA 转换后的回测在每个市场上都和另一个 EA 一模一样——比如有 14 个毫不相干的 EA 结果完全相同。这说明转换丢掉了它们各自的特点，所以这 298 次运行不再计入，下面的数字都已重新计算。这些结果大多在黄金上赚钱，所以黄金相关的数字变化最大。文中所有数字都来自 2025 年 5 月至 2026 年 5 月小时线上的那次测试。2026 年 11 月 4 日起，每个 EA 每月都会用最近 12 个月的数据重跑一次，所以 EA 页面上的数字和本文会略有不同。"
          },
          {
            "en": "The EA Arena catalogs 1,515 Expert Advisors published on the MQL5 CodeBase. For 1,063 of them we translated the MQL5 source into Python automatically and backtested it on one year of hourly data (May 2025 to May 2026) for EUR/USD, GBP/USD, USD/JPY and gold. Every EA got the same account: $10,000, 1:100 leverage, the EA's own lot size (100,000 units per currency lot, 100 ounces per gold lot), one order at a time, the same commission, and a broker-style stop-out when equity falls below 10% of the starting balance.",
            "zh": "EA 竞技场收录了 MQL5 代码库里公开的 1515 个智能交易系统。其中 1063 个，我们把 MQL5 源码自动翻译成 Python，在欧元/美元、英镑/美元、美元/日元和黄金一年的小时线数据（2025 年 5 月到 2026 年 5 月）上回测。所有 EA 用同样的账户条件：1 万美元本金、1:100 杠杆、按 EA 自己设定的手数下单（外汇每手 10 万单位，黄金每手 100 盎司）、同一时间只有一张挂单、相同的佣金，净值跌破初始资金 10% 时像券商一样强制平仓。"
          }
        ]
      },
      {
        "heading": {
          "en": "Most EAs could not be tested",
          "zh": "大多数 EA 没法测试"
        },
        "paragraphs": [
          {
            "en": "Automatic conversion is hard. Out of 4,252 EA-and-market runs:",
            "zh": "自动转换很难。4252 次“EA × 市场”运行中："
          },
          {
            "en": [
              "2,348 came from EAs whose entry logic the converter could not translate (custom indicators, unusual order handling). We label them \"not convertible yet\" instead of pretending they were tested.",
              "144 depend on a custom indicator the converter replaced with a placeholder, so they do not test the real EA.",
              "155 converted but never traded. For 112 of them we can point to the conversion bug: the fast and slow settings of a crossover were lost, a price-based indicator was asked to cross zero, lines on different scales were compared, or no entry rule survived.",
              "88 stopped with an error, and 96 traded too little or produced a flat curve.",
              "298 runs from 85 different EAs came out exactly identical to another EA's run on every market, which means the conversion lost what made them different. We no longer count them.",
              "1,123 results are reliable enough to rank."
            ],
            "zh": [
              "2348 次来自转换器无法翻译开仓逻辑的 EA（自定义指标、特殊的下单方式等）。我们把它们标为“暂不支持转换”，而不是假装测过。",
              "144 次依赖转换器无法翻译的自定义指标，回测里用了占位指标代替，测的并不是 EA 的真实逻辑。",
              "155 次转换成功但从未交易。其中 112 次能找到具体的转换错误：均线交叉的快慢参数丢失、要求基于价格的指标穿越 0、拿量纲不同的两条线比较，或者开仓规则在转换中丢了。",
              "88 次运行报错，96 次交易太少或曲线持平。",
              "还有 85 个不同的 EA、共 298 次运行，在每个市场上都和另一个 EA 的结果一模一样，说明转换丢掉了它们各自的特点，这些我们不再计入。",
              "剩下 1123 个结果足够可信，可以排名。"
            ]
          }
        ]
      },
      {
        "heading": {
          "en": "The results we trust",
          "zh": "可信的结果"
        },
        "paragraphs": [
          {
            "en": [
              "About half were profitable: 562 of 1,123. The median result was roughly zero over the year, with a median maximum drawdown of 7.8%. The typical EA had a longest losing streak of 6 trades and held a position for about a day.",
              "On the three currency pairs the typical EA went nowhere: the median result was −0.12%, and only 27 of 830 currency results made more than 10%.",
              "Gold looks better than it is. Gold rose 44% over the test year, so long-leaning systems were carried by the trend: the median gold result was +4.5% — with a median drawdown of 60%. 61 of 293 gold runs (21%) lost the whole account.",
              "Consistency was rare: of 271 EAs with reliable results on all four markets, 30 were profitable on every one.",
              "187 results had a Sharpe ratio above 1. Over a single year that is easy to reach by chance, which is why the EA Ranking also shows the recovery factor and how many markets an EA made money on."
            ],
            "zh": [
              "大约一半赚钱：1123 个里有 562 个。中位数结果一年基本是 0，最大回撤中位数 7.8%。典型的 EA 最长连亏 6 笔，平均持仓大约一天。",
              "在三个货币对上，典型的 EA 原地踏步：中位数结果是 −0.12%，830 个外汇结果里只有 27 个赚了 10% 以上。",
              "黄金的数字看起来比实际好。测试这一年黄金涨了 44%，偏多的系统是被趋势带着走的：黄金结果的中位数是 +4.5%，但回撤中位数高达 60%；293 次黄金回测里有 61 次（21%）把整个账户亏光。",
              "稳定的很少：在四个市场都有可信结果的 271 个 EA 里，只有 30 个在每个市场都盈利。",
              "187 个结果的夏普超过 1。只看一年，这个水平很容易靠运气达到，所以 EA 排行榜还展示了恢复因子和 EA 在几个品种上赚钱。"
            ]
          }
        ]
      },
      {
        "heading": {
          "en": "Categories and risk",
          "zh": "类别与风险"
        },
        "paragraphs": [
          {
            "en": "The arena's risk review rates 34 of 40 martingale EAs and 14 of 33 grid EAs as \"dangerous\": they increase exposure after losses or keep opening positions against the trend. In our backtests martingale EAs did not show the usual very high win rates (median 49%), most likely because the automatic conversion trades a fixed lot size instead of reproducing the lot multiplication. Their real-world risk is therefore higher than these numbers suggest — read the risk review on each EA page, not only the backtest.",
            "zh": "竞技场的风险评估把 40 个马丁格尔 EA 中的 34 个、33 个网格 EA 中的 14 个评为“危险”：它们在亏损后加大仓位，或者逆势不断开新仓。在我们的回测里，马丁 EA 并没有表现出通常那种很高的胜率（中位数 49%），很可能是因为自动转换用了固定手数，没有还原加倍下注的逻辑。所以它们在真实交易中的风险比这些数字显示的更高——请看每个 EA 页面上的风险评估，而不只是回测结果。"
          }
        ]
      },
      {
        "heading": {
          "en": "How to use the EA Arena",
          "zh": "怎么用 EA 竞技场"
        },
        "paragraphs": [
          {
            "en": [
              "Treat \"not convertible yet\" as \"unknown\", not \"bad\".",
              "Look for EAs that hold up on several markets, not one spectacular result. The \"Markets\" column in the EA Ranking shows this at a glance.",
              "On gold, check the drawdown before the profit: 0.1 lot of gold on a $10,000 account is a much bigger bet than 0.1 lot of EUR/USD.",
              "Check the risk rating and the risk points before the P&L.",
              "Free code is a learning resource. If you trade an EA, test it yourself in the MT5 Strategy Tester with your broker's data and costs — and you can compare the result with the arena in the Strategy Lab."
            ],
            "zh": [
              "把“暂不支持转换”理解为“未知”，而不是“不好”。",
              "找在多个市场上都站得住的 EA，而不是某一次特别亮眼的结果。EA 排行榜里的“盈利品种”一栏一眼就能看出来。",
              "看黄金 EA 时先看回撤再看收益：1 万美元的账户做 0.1 手黄金，风险比 0.1 手欧元/美元大得多。",
              "先看风险等级和风险点，再看盈亏。",
              "免费代码是很好的学习材料。如果要实盘，请用自己券商的数据和成本在 MT5 策略测试器里重新测试——测完可以到策略实验室和竞技场的策略比一比。"
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "which-strategies-survived-2022",
    "title": {
      "en": "Which Trading Strategies Survived 2022? 62 Backtests Through Three Sell-offs",
      "zh": "哪些交易策略扛过了 2022？62 个回测在三次大跌中的表现"
    },
    "summary": {
      "en": "In the 2022 bear market SPY fell 24.5% from peak to trough. Every one of the 62 strategies we run on SPY lost less, and ten of them made money. Mean reversion held up best, momentum worst. Here is what the COVID crash and the late-2018 sell-off add to the picture.",
      "zh": "2022 年熊市里，SPY 从高点到低点跌了 24.5%。我们在 SPY 上运行的 62 个策略，全部亏得比它少，其中 10 个还赚了钱。均值回归最扛得住，动量最差。再加上新冠暴跌和 2018 年底那次下跌，能看到更完整的图景。"
    },
    "date": "2026-11-03",
    "readTime": "3 min read",
    "category": "Research",
    "featured": false,
    "tags": [
      "Bear Market",
      "Drawdown",
      "Mean Reversion",
      "Trend"
    ],
    "sections": [
      {
        "heading": {
          "en": "The three sell-offs",
          "zh": "三次大跌"
        },
        "paragraphs": [
          {
            "en": "We looked at three periods when US stocks fell sharply, using the same dates for every strategy:",
            "zh": "我们选了美股三次明显下跌的时期，所有策略用同样的日期："
          },
          {
            "en": [
              "Q4 2018: 1 October to 24 December 2018 — SPY −19.2%",
              "COVID crash: 19 February to 23 March 2020 — SPY −33.7%",
              "2022 bear market: 3 January to 12 October 2022 — SPY −24.5%"
            ],
            "zh": [
              "2018 年四季度：2018 年 10 月 1 日到 12 月 24 日，SPY 跌 19.2%",
              "新冠暴跌：2020 年 2 月 19 日到 3 月 23 日，SPY 跌 33.7%",
              "2022 年熊市：2022 年 1 月 3 日到 10 月 12 日，SPY 跌 24.5%"
            ]
          },
          {
            "en": "All results are from walk-forward backtests on daily data, before trading costs.",
            "zh": "所有结果都来自日线数据的滚动前推回测，未扣交易成本。"
          }
        ]
      },
      {
        "heading": {
          "en": "2022 — a slow bear favours the patient",
          "zh": "2022 年——慢熊更奖励有耐心的策略"
        },
        "paragraphs": [
          {
            "en": "Every strategy lost less than buy-and-hold in 2022, and the median strategy lost 6.8%. Ten finished the period with a gain. The top of the list is dominated by mean reversion: RSI Mean Reversion (+8.9%), Ultimate Oscillator (+8.1%), Z-Score Mean Reversion (+6.3%), Bollinger Band Reversion (+5.7%) and Hurst-Filtered Mean Reversion (+4.1%). Linear Regression Channel (+3.9%) and Crisis Alpha (+3.6%) complete the group.",
            "zh": "2022 年所有策略都比买入持有亏得少，中位数亏损 6.8%，有 10 个最终是赚钱的。排在前面的基本都是均值回归：RSI 均值回归（+8.9%）、终极震荡指标（+8.1%）、Z 分数均值回归（+6.3%）、布林带回归（+5.7%）和 Hurst 过滤均值回归（+4.1%），再加上线性回归通道（+3.9%）和危机 Alpha（+3.6%）。"
          },
          {
            "en": "By style, the median 2022 result was −1.4% for mean reversion, −6.8% for volatility strategies, −7.1% for trend following, −8.4% for regime strategies and −11.4% for momentum. 2022 was a grinding decline with sharp bear-market rallies. Strategies that buy short-term oversold readings and exit quickly caught those rallies; momentum strategies, which need a sustained move, kept getting whipsawed.",
            "zh": "按风格看，2022 年的中位数结果分别是：均值回归 −1.4%，波动率策略 −6.8%，趋势跟踪 −7.1%，市场状态策略 −8.4%，动量 −11.4%。2022 年是一边慢慢下跌、一边夹着猛烈反弹的熊市。买入短期超卖、很快离场的策略吃到了这些反弹；而需要持续行情的动量策略，一直被来回打脸。"
          },
          {
            "en": "The weakest results came from Drawdown Control (−23.8%), Williams %R Reversion (−19.6%), Time-Series Momentum (−18.9%), Parabolic SAR (−17.2%) and 52-Week High Momentum (−16.4%).",
            "zh": "表现最差的是回撤控制（−23.8%）、威廉指标回归（−19.6%）、时间序列动量（−18.9%）、抛物线 SAR（−17.2%）和 52 周新高动量（−16.4%）。"
          }
        ]
      },
      {
        "heading": {
          "en": "2020 — a crash too fast for most rules",
          "zh": "2020 年——跌得太快，大多数规则来不及反应"
        },
        "paragraphs": [
          {
            "en": "The COVID crash took only 23 trading days. The median strategy lost 7.6% while SPY lost a third of its value, but only three strategies made money: Linear Regression Channel (+33.9%), Crisis Alpha (+25.7%) and Connors RSI (+9.4%). Trend strategies did better than their reputation for crashes suggests: the median trend strategy lost 4.7%, and only a quarter lost more than 10%, mostly because they had already stepped aside when the market first wobbled in late February.",
            "zh": "新冠暴跌只用了 23 个交易日。SPY 跌掉三分之一时，策略的中位数亏损是 7.6%，但只有三个策略赚了钱：线性回归通道（+33.9%）、危机 Alpha（+25.7%）和康纳斯 RSI（+9.4%）。趋势策略的表现比“遇到暴跌就失灵”的印象要好：趋势类策略的中位数只亏了 4.7%，只有四分之一亏损超过 10%，主要是因为 2 月底市场刚开始晃动时，它们大多已经离场。"
          }
        ]
      },
      {
        "heading": {
          "en": "Holding up in both",
          "zh": "两次都扛住了"
        },
        "paragraphs": [
          {
            "en": "41 of the 62 strategies lost less than half of SPY's decline in both the COVID crash and the 2022 bear market. That sounds reassuring until you look at the other side of the ledger: over the last five years only one strategy beat buy-and-hold SPY on annual return. Protection in sell-offs was paid for with lower returns in the rallies in between.",
            "zh": "在新冠暴跌和 2022 年熊市里，62 个策略中有 41 个的亏损都不到 SPY 跌幅的一半。听起来很安心，但看看另一面：近五年里，只有 1 个策略的年化收益超过买入持有 SPY。大跌中的保护，是用两次大跌之间上涨行情里的少赚换来的。"
          }
        ]
      },
      {
        "heading": {
          "en": "What to take away",
          "zh": "几点结论"
        },
        "paragraphs": [
          {
            "en": [
              "No style protects in every kind of sell-off. Fast crashes and slow bear markets reward different behaviour.",
              "Mean reversion did well in 2022 because the decline came with violent rallies. In a crash without rebounds it would have kept buying dips.",
              "Read crisis results together with the full-period return. A strategy that loses little in a crash but never catches up is not necessarily better.",
              "Every strategy page now has a \"How it held up in sell-offs\" table with these three periods and its returns above and below the 200-day moving average."
            ],
            "zh": [
              "没有哪种风格能扛住所有类型的大跌。急跌和慢熊奖励的是不同的行为。",
              "均值回归在 2022 年表现好，是因为那次下跌伴随着剧烈反弹；如果是一路下跌没有反弹，它会一直抄底抄在半山腰。",
              "看大跌表现时要结合全周期收益。大跌中亏得少、但之后一直追不回来的策略，不一定更好。",
              "现在每个策略页都有“大跌行情中的表现”表格，包括这三个时期，以及市场在 200 日均线上方和下方时的收益。"
            ]
          }
        ]
      }
    ],
    "dataAsOf": "2026-08-14"
  },
  {
    "slug": "why-martingale-and-grid-eas-blow-up",
    "title": {
      "en": "Why Martingale and Grid EAs Blow Up: What 1,515 Free MT5 Expert Advisors and Their Losing Streaks Show",
      "zh": "马丁格尔和网格 EA 为什么会爆仓：1515 个免费 MT5 EA 和它们的连亏记录告诉你"
    },
    "summary": {
      "en": "Martingale and grid EAs make up 5% of the free MT5 Expert Advisors we review, but more than half of the ones we rate \"dangerous\". The reason is arithmetic: losing streaks of six to eight trades are normal — and that is exactly where doubling the position runs out of money.",
      "zh": "在我们评估的免费 MT5 智能交易系统里，马丁格尔和网格 EA 只占 5%，却占了被评为“危险”的一半以上。原因是一道算术题：连亏 6 到 8 笔很正常，而这恰恰是加倍下注的资金耗尽的地方。"
    },
    "date": "2026-11-03",
    "readTime": "3 min read",
    "category": "EA Research",
    "featured": false,
    "tags": [
      "Martingale",
      "Grid",
      "Expert Advisor",
      "Risk"
    ],
    "sections": [
      {
        "heading": {
          "en": "Where the danger is concentrated",
          "zh": "危险集中在哪里"
        },
        "paragraphs": [
          {
            "en": "Our risk review covers all 1,515 EAs in the EA Arena. 88 of them are rated \"dangerous\". Most of those come from two small categories:",
            "zh": "我们的风险评估覆盖了 EA 竞技场里全部 1515 个 EA，其中 88 个被评为“危险”。它们大多来自两个很小的类别："
          },
          {
            "en": [
              "Martingale: 34 of 40 EAs (85%) rated dangerous.",
              "Grid: 14 of 33 (42%).",
              "Trend following, momentum, breakout and mean reversion: 2–4% each."
            ],
            "zh": [
              "马丁格尔：40 个里 34 个（85%）被评为危险。",
              "网格：33 个里 14 个（42%）。",
              "趋势跟踪、动量、突破和均值回归：各自只有 2%–4%。"
            ]
          },
          {
            "en": "Martingale and grid EAs are 73 of 1,515 EAs (5%) but 48 of the 88 dangerous ones (55%).",
            "zh": "马丁格尔和网格 EA 合计只占 1515 个里的 73 个（5%），却占了 88 个危险 EA 里的 48 个（55%）。"
          }
        ]
      },
      {
        "heading": {
          "en": "How a martingale works — and fails",
          "zh": "马丁格尔怎么运作，又怎么失败"
        },
        "paragraphs": [
          {
            "en": "A martingale EA increases the position after every loss, usually doubling it, so that one win recovers everything lost before. Most of the time this works, which is why these EAs show high win rates and smooth equity curves. The problem is the losing streak. If the first trade risks 0.5% of the account and every loss doubles the next position:",
            "zh": "马丁格尔 EA 每亏一次就加大仓位，通常是翻倍，指望赢一次就把之前亏的全部赚回来。大多数时候这确实管用，所以这类 EA 胜率很高、权益曲线很平滑。问题出在连续亏损上。假设第一笔交易承担账户 0.5% 的风险，每亏一次下一笔仓位翻倍："
          },
          {
            "en": [
              "after 4 losses in a row the account is down 7.5%;",
              "after 6 losses, 31.5%;",
              "after 7 losses, 63.5%;",
              "the eighth trade alone would then risk 64% of the starting balance, with only 36.5% left. One more loss and the account is gone."
            ],
            "zh": [
              "连亏 4 笔，账户亏 7.5%；",
              "连亏 6 笔，亏 31.5%；",
              "连亏 7 笔，亏 63.5%；",
              "这时第八笔单子本身就要承担初始资金 64% 的风险，而账户只剩 36.5%。再亏一次，账户就没了。"
            ]
          }
        ]
      },
      {
        "heading": {
          "en": "How common are long losing streaks?",
          "zh": "连亏有多常见？"
        },
        "paragraphs": [
          {
            "en": "We looked at the longest losing streak in 1,095 reliable EA backtests that made at least 20 trades over one year of hourly data (May 2025 to May 2026). The median longest streak was 6 losses. More than a fifth of them (22.5%) had 8 or more losses in a row, and 5.2% had 10 or more. These are ordinary EAs, not martingales — they simply show how often a run of losses happens. For a doubling martingale, a streak that is unremarkable for a normal EA is fatal.",
            "zh": "我们统计了 1095 个可信的 EA 回测（2025 年 5 月至 2026 年 5 月一年的小时线数据、至少 20 笔交易）里的最长连亏。中位数是 6 笔；超过五分之一（22.5%）的回测出现过连亏 8 笔或更多，5.2% 出现过 10 笔或更多。这些都是普通 EA，不是马丁格尔——它们只是说明连续亏损有多常见。对普通 EA 来说平平无奇的一段连亏，对翻倍加仓的马丁格尔就是致命的。"
          }
        ]
      },
      {
        "heading": {
          "en": "Grids: the same problem in a trend",
          "zh": "网格：遇到趋势是同一个问题"
        },
        "paragraphs": [
          {
            "en": "A grid EA places orders at fixed price steps and adds positions as price moves against it, expecting it to come back. In a range that works. In a trend the positions pile up: over our test year gold rose from about $3,280 to $4,730, so a grid adding one short position every $20 would have opened more than 70 of them, all losing at once. Grids without a maximum number of positions or a stop for the whole basket are the ones our review marks as dangerous.",
            "zh": "网格 EA 按固定价格间隔挂单，价格逆向移动时不断加仓，等着价格回来。在震荡行情里这行得通；遇到趋势，仓位就会越堆越多。我们测试的这一年里，黄金从大约 3280 美元涨到 4730 美元，一个每涨 20 美元加一张空单的网格，会开出 70 多张空单，而且全部同时亏损。没有最大仓位数、也没有整体止损的网格，就是我们评估里标为危险的那一类。"
          }
        ]
      },
      {
        "heading": {
          "en": "Why our backtests understate the risk",
          "zh": "为什么我们的回测低估了风险"
        },
        "paragraphs": [
          {
            "en": "Our automatic conversion trades a fixed lot size, so it does not reproduce lot doubling or unlimited grid levels. That is why martingale EAs in our backtests show ordinary results (median win rate 49%) instead of the typical \"95% wins, then a wipe-out\". Treat their backtest numbers as a lower bound on risk and read the risk review on each EA page.",
            "zh": "我们的自动转换按固定手数交易，没有还原加倍下注和无限加网格的逻辑。所以马丁格尔 EA 在我们的回测里表现得很普通（胜率中位数 49%），而不是典型的“95% 都赢，然后一次爆仓”。请把它们的回测数字当作风险的下限，并且一定要看每个 EA 页面上的风险评估。"
          }
        ]
      },
      {
        "heading": {
          "en": "Before you run one",
          "zh": "真要用之前"
        },
        "paragraphs": [
          {
            "en": [
              "Check the maximum lot multiplier and the maximum number of grid levels. If there is no cap, the worst case is the whole account.",
              "Work out how many losses in a row your account can absorb at the EA's settings, and compare it with the losing streaks above.",
              "Look for a stop for the whole basket of positions, not just per trade.",
              "Test in the MT5 Strategy Tester over several years, including fast trends — one quiet year will make almost any martingale look good."
            ],
            "zh": [
              "查清楚最大加倍倍数和最多加几层网格。如果没有上限，最坏情况就是整个账户。",
              "按 EA 的参数算一算，你的账户能扛住连亏几笔，再和上面的连亏数据比一比。",
              "看有没有针对整组持仓的止损，而不只是单笔止损。",
              "在 MT5 策略测试器里测好几年的数据，一定要包含快速单边行情——只测一年平静的行情，几乎任何马丁都会看起来不错。"
            ]
          }
        ]
      }
    ]
  },
  {
    "slug": "moving-average-strategies-bitcoin",
    "title": {
      "en": "Do Moving-Average Strategies Still Work on Bitcoin? Nine Systems, Five Years",
      "zh": "均线策略在比特币上还管用吗？9 个系统、5 年数据"
    },
    "summary": {
      "en": "Over the last five years buy-and-hold bitcoin returned 7.2% a year with a 77% drawdown. Five of nine moving-average-style systems beat that return, and every one of them cut the worst drawdown. Over the full history the picture flips: almost nothing beats simply holding.",
      "zh": "近五年，买入持有比特币年化 7.2%，最大回撤 77%。9 个均线类系统里有 5 个年化收益超过它，而且每一个都把最大回撤压低了。但放到全部历史里看，结果反过来：几乎没有策略能跑赢直接持有。"
    },
    "date": "2026-11-03",
    "readTime": "3 min read",
    "category": "Trend Following",
    "featured": false,
    "tags": [
      "Bitcoin",
      "Moving Average",
      "Trend"
    ],
    "sections": [
      {
        "heading": {
          "en": "What we tested",
          "zh": "测了什么"
        },
        "paragraphs": [
          {
            "en": "Nine trend systems from the arena that are built on moving averages or close relatives: the 50/200 Dual Moving Average, Triple Moving Average, Kaufman Adaptive MA, Hull MA crossover, MACD, MACD with an RSI filter, Ichimoku Cloud, Supertrend, and a dual-MA trend with a macro-event blackout. All run long-only on daily BTC-USD data with walk-forward optimization, before trading costs.",
            "zh": "竞技场里 9 个基于均线或类似原理的趋势系统：50/200 双均线、三均线、考夫曼自适应均线、赫尔均线交叉、MACD、MACD + RSI 过滤、一目均衡表、超级趋势，以及带宏观事件过滤的双均线。全部只做多，在 BTC-USD 日线上用滚动前推优化回测，未扣交易成本。"
          }
        ]
      },
      {
        "heading": {
          "en": "The last five years",
          "zh": "近五年"
        },
        "paragraphs": [
          {
            "en": "Buy-and-hold bitcoin: 7.2% a year, Sharpe ratio 0.33, maximum drawdown −76.6%.",
            "zh": "买入持有比特币：年化 7.2%，夏普 0.33，最大回撤 −76.6%。"
          },
          {
            "en": "Five systems beat that annual return: Trend + Macro Filter (19.4%), Ichimoku Cloud (11.9%), Dual Moving Average (10.9%), MACD (8.1%) and Supertrend (7.8%). The other four lagged: Triple MA (6.3%), Hull MA (4.3%), MACD + RSI (2.6%) and Kaufman Adaptive MA (2.3%).",
            "zh": "5 个系统的年化收益超过了它：趋势 + 宏观事件过滤（19.4%）、一目均衡表（11.9%）、双均线（10.9%）、MACD（8.1%）和超级趋势（7.8%）。另外 4 个落后：三均线（6.3%）、赫尔均线（4.3%）、MACD + RSI（2.6%）和考夫曼自适应均线（2.3%）。"
          },
          {
            "en": "The more consistent result is risk. Every system had a smaller maximum drawdown than holding, between −33% (Trend + Macro Filter) and −58% (Hull MA). They achieved it the simple way: they were in the market only 34–53% of the time.",
            "zh": "更一致的结果在风险上：每个系统的最大回撤都比持有小，在 −33%（趋势 + 宏观过滤）到 −58%（赫尔均线）之间。做法也很朴素：它们只有 34%–53% 的时间持仓。"
          }
        ]
      },
      {
        "heading": {
          "en": "The full history tells a different story",
          "zh": "全部历史讲的是另一个故事"
        },
        "paragraphs": [
          {
            "en": "Since our bitcoin data begins in September 2014, buy-and-hold compounded at about 51% a year. Most moving-average systems landed between 43% and 60%: Ichimoku (60.0%) and MACD (58.2%) a bit ahead, Supertrend (42.8%) and the macro-filter version (46.8%) behind, and the MACD + RSI filter far behind (15.5%). Drawdowns were still lower (−46% to −74% vs −83%), but in the explosive early years, being out of the market for half the time was expensive.",
            "zh": "从我们的比特币数据起点（2014 年 9 月）算，买入持有年化约 51%。大多数均线系统在 43% 到 60% 之间：一目均衡表（60.0%）和 MACD（58.2%）略好，超级趋势（42.8%）和宏观过滤版（46.8%）落后，MACD + RSI 过滤则远远落后（15.5%）。回撤依然更小（−46% 到 −74%，持有是 −83%），但在早期爆发式上涨的那几年，一半时间不在场的代价很大。"
          }
        ]
      },
      {
        "heading": {
          "en": "Costs matter more than usual",
          "zh": "成本比平时更重要"
        },
        "paragraphs": [
          {
            "en": "The fast systems trade a lot: the Hull MA crossover made 266 trades in five years and the Kaufman Adaptive MA 187, against 10–12 for the dual and triple MA. Crypto trading costs are higher than for ETFs, so the strategy pages' cost slider is worth a look before drawing conclusions about the fast systems.",
            "zh": "快速系统交易很频繁：赫尔均线交叉五年交易 266 次，考夫曼自适应均线 187 次，而双均线和三均线只有 10–12 次。加密货币的交易成本比 ETF 高，下结论之前，不妨用策略页的成本滑块看看快速系统扣成本后的样子。"
          }
        ]
      },
      {
        "heading": {
          "en": "Takeaways",
          "zh": "几点结论"
        },
        "paragraphs": [
          {
            "en": [
              "On bitcoin, simple slow trend filters did their main job in the last five years: similar or better returns with roughly a third less drawdown.",
              "They do not reliably beat holding in a strong bull market; their value is surviving the bear markets.",
              "Filters on top of filters (MACD + RSI) cut returns more than risk here.",
              "Faster systems need a realistic cost assumption."
            ],
            "zh": [
              "在比特币上，简单的慢速趋势过滤在近五年完成了它的主要任务：收益相近甚至更好，回撤少了大约三分之一。",
              "在强牛市里，它们并不能稳定跑赢持有；它们的价值在于熬过熊市。",
              "过滤再叠加过滤（MACD + RSI），在这里减掉的收益比减掉的风险更多。",
              "快速系统一定要用符合实际的成本假设。"
            ]
          }
        ]
      }
    ],
    "dataAsOf": "2026-08-14"
  },
  {
    "slug": "turtle-trading-2021-2026",
    "title": {
      "en": "Does Turtle Trading Still Work? Ten Markets, 2021–2026",
      "zh": "海龟交易法还管用吗？10 个市场、2021–2026"
    },
    "summary": {
      "en": "Two breakout systems, ten markets, five years. Neither beat buy-and-hold on most markets, but the slower Donchian version had a smaller drawdown on nine of ten, and both made money on commodities in the 2022 bear market when stocks fell 25%.",
      "zh": "两套突破系统，10 个市场，5 年数据。在大多数市场上，它们都没跑赢买入持有；但较慢的唐奇安版本在 10 个市场中的 9 个回撤更小，而且在 2022 年股市跌 25% 的熊市里，两套系统都在大宗商品上赚到了钱。"
    },
    "date": "2026-11-03",
    "readTime": "3 min read",
    "category": "Trend Following",
    "featured": false,
    "tags": [
      "Turtle Trading",
      "Donchian",
      "Breakout",
      "Trend"
    ],
    "sections": [
      {
        "heading": {
          "en": "The two systems",
          "zh": "两套系统"
        },
        "paragraphs": [
          {
            "en": [
              "**Turtle Trading (TURTLE-01):** long when price breaks a 20-day high, out on a 10-day low — the faster original rule.",
              "**Donchian Breakout (TREND-02):** long on a 55-day high, out on a 20-day low, ATR position sizing — the slower variant."
            ],
            "zh": [
              "**海龟交易法（TURTLE-01）**：突破 20 日高点做多，跌破 10 日低点离场，是较快的原版规则。",
              "**唐奇安通道突破（TREND-02）**：突破 55 日高点做多，跌破 20 日低点离场，按 ATR 调整仓位，是较慢的版本。"
            ]
          },
          {
            "en": "Unlike the original Turtle rules, both versions here trade long only and do not add to winning positions. Both run on daily data for US stocks, gold, silver, oil, natural gas, agriculture, broad commodities, EUR/USD, bitcoin and ether, with walk-forward optimization and no trading costs.",
            "zh": "和原版海龟规则不同，这里的两个版本都只做多、不加仓。两者都在美股、黄金、白银、原油、天然气、农产品、综合大宗商品、欧元/美元、比特币和以太坊的日线上回测，使用滚动前推优化，未扣交易成本。"
          }
        ]
      },
      {
        "heading": {
          "en": "Returns: hard to beat holding",
          "zh": "收益：很难跑赢持有"
        },
        "paragraphs": [
          {
            "en": "Over the last five years each system beat buy-and-hold on annual return on four of ten markets: EUR/USD, natural gas, bitcoin and ether. Bitcoin stands out — Turtle 20.3% a year and Donchian 12.7% vs 7.2% for holding — but on US stocks (8.5% and 4.5% vs 13.2%), gold, silver and oil, staying invested won.",
            "zh": "近五年，两套系统各自在 10 个市场中的 4 个跑赢了买入持有的年化收益：欧元/美元、天然气、比特币和以太坊。比特币最突出——海龟年化 20.3%、唐奇安 12.7%，持有只有 7.2%——但在美股（8.5% 和 4.5%，持有 13.2%）、黄金、白银和原油上，一直持有更好。"
          }
        ]
      },
      {
        "heading": {
          "en": "Risk: where breakouts earn their keep",
          "zh": "风险：突破系统的价值所在"
        },
        "paragraphs": [
          {
            "en": "Drawdowns tell the other half. The 55/20 Donchian system had a smaller maximum drawdown than holding on nine of ten markets — for example −17.8% vs −24.5% on SPY, −38.0% vs −76.6% on bitcoin. The faster Turtle rule did so on seven, and on SPY its drawdown was only −8.5% with a Sharpe ratio of 0.92, above buy-and-hold's 0.81.",
            "zh": "回撤是另一半故事。55/20 唐奇安系统在 10 个市场中的 9 个，最大回撤都比持有小，比如 SPY 上 −17.8% 对 −24.5%，比特币上 −38.0% 对 −76.6%。较快的海龟规则在 7 个市场做到了这一点；在 SPY 上它的回撤只有 −8.5%，夏普 0.92，高于买入持有的 0.81。"
          }
        ]
      },
      {
        "heading": {
          "en": "2022: the commodity trend",
          "zh": "2022 年：大宗商品的趋势"
        },
        "paragraphs": [
          {
            "en": "When stocks fell 24.5% between January and October 2022, the breakout systems found the trend elsewhere: Donchian gained 37.3% on oil and 28.9% on broad commodities, and Turtle gained 64.5% on natural gas and 13.1% on broad commodities. On bitcoin, both lost 26–30% in the same period — breakouts follow trends, they do not avoid every fall.",
            "zh": "2022 年 1 月到 10 月，美股跌了 24.5%，突破系统在别的地方找到了趋势：唐奇安在原油上赚了 37.3%，在综合大宗商品上赚了 28.9%；海龟在天然气上赚了 64.5%，在综合大宗商品上赚了 13.1%。同一时期在比特币上，两者都亏了 26%–30%——突破系统跟随趋势，但并不能躲开每一次下跌。"
          }
        ]
      },
      {
        "heading": {
          "en": "Takeaways",
          "zh": "几点结论"
        },
        "paragraphs": [
          {
            "en": [
              "On a single market, breakout trend following rarely beats buy-and-hold on return; its job is cutting the drawdown.",
              "Its strength is diversification across markets: in 2022 the commodity breakouts paid while equities fell.",
              "Slower rules (55/20) were steadier than faster ones (20/10) on most markets.",
              "Choppy, range-bound markets (EUR/USD, agriculture) are where breakouts struggle."
            ],
            "zh": [
              "在单一市场上，突破型趋势跟踪很少在收益上跑赢持有；它的任务是压低回撤。",
              "它真正的长处是跨市场分散：2022 年股票下跌时，大宗商品上的突破信号赚到了钱。",
              "在大多数市场上，较慢的规则（55/20）比较快的规则（20/10）更稳。",
              "区间震荡的市场（欧元/美元、农产品）是突破系统最难做的地方。"
            ]
          }
        ]
      }
    ],
    "dataAsOf": "2026-08-14"
  },
  {
    "slug": "macd-vs-macd-rsi-filter",
    "title": {
      "en": "Does an RSI Filter Make MACD Better? A Ten-Market Test",
      "zh": "给 MACD 加上 RSI 过滤会更好吗？10 个市场实测"
    },
    "summary": {
      "en": "Adding an RSI filter to a MACD crossover cut the maximum drawdown on nine of ten markets and reduced trading by 10–30%. It improved the Sharpe ratio on only five, and gave up return on the strongest trends — silver, bitcoin and ether.",
      "zh": "给 MACD 交叉加上 RSI 过滤后，10 个市场中有 9 个的最大回撤变小了，交易次数减少了 10%–30%；但夏普只在 5 个市场上变好，而且在趋势最强的市场——白银、比特币和以太坊——上明显少赚了。"
    },
    "date": "2026-11-03",
    "readTime": "3 min read",
    "category": "Trend Following",
    "featured": false,
    "tags": [
      "MACD",
      "RSI",
      "Filter",
      "Trend"
    ],
    "sections": [
      {
        "heading": {
          "en": "The two versions",
          "zh": "两个版本"
        },
        "paragraphs": [
          {
            "en": [
              "**MACD Strategy (TREND-12):** long when the MACD line crosses above its signal line, out on the opposite cross.",
              "**MACD + RSI Filter (COMBO-02):** the same crossover, but buy signals are ignored when RSI is overbought and sell signals when it is oversold."
            ],
            "zh": [
              "**MACD 策略（TREND-12）**：MACD 线上穿信号线做多，反向交叉离场。",
              "**MACD + RSI 过滤（COMBO-02）**：同样的交叉，但 RSI 超买时忽略买入信号，超卖时忽略卖出信号。"
            ]
          },
          {
            "en": "Both are tested over the last five years on ten markets with daily data, walk-forward optimization and no trading costs.",
            "zh": "两者都在 10 个市场近五年的日线数据上回测，使用滚动前推优化，未扣交易成本。"
          }
        ]
      },
      {
        "heading": {
          "en": "Risk went down almost everywhere",
          "zh": "风险几乎全面下降"
        },
        "paragraphs": [
          {
            "en": "The filter reduced the maximum drawdown on nine of ten markets. The biggest changes were on silver (−46.7% to −28.1%), broad commodities (−30.7% to −17.0%) and gold (−21.9% to −12.2%). The only exception was EUR/USD (−10.9% to −12.0%). It also traded less on every market — on bitcoin, 106 trades instead of 140.",
            "zh": "加了过滤之后，10 个市场中有 9 个的最大回撤变小。变化最大的是白银（−46.7% 降到 −28.1%）、综合大宗商品（−30.7% 降到 −17.0%）和黄金（−21.9% 降到 −12.2%）。唯一的例外是欧元/美元（−10.9% 变成 −12.0%）。所有市场的交易都变少了——比特币上从 140 次降到 106 次。"
          }
        ]
      },
      {
        "heading": {
          "en": "Risk-adjusted returns: a coin flip",
          "zh": "风险调整后收益：一半一半"
        },
        "paragraphs": [
          {
            "en": "The Sharpe ratio improved on five markets: gold (0.70 → 0.84), broad commodities (0.46 → 0.63), agriculture (0.14 → 0.41), EUR/USD (−0.16 → 0.05) and natural gas (−0.44 → −0.24). It got worse on the other five: US stocks, oil, silver, bitcoin and ether.",
            "zh": "夏普在 5 个市场变好：黄金（0.70 → 0.84）、综合大宗商品（0.46 → 0.63）、农产品（0.14 → 0.41）、欧元/美元（−0.16 → 0.05）和天然气（−0.44 → −0.24）；在另外 5 个市场变差：美股、原油、白银、比特币和以太坊。"
          }
        ]
      },
      {
        "heading": {
          "en": "Where the filter hurts",
          "zh": "过滤在哪里帮倒忙"
        },
        "paragraphs": [
          {
            "en": "The filter's logic — \"don't buy when RSI is already high\" — is exactly wrong at the start of a strong trend, when RSI stays high for weeks. That is where it lost the most return: silver (12.2% → 6.8% a year), bitcoin (8.1% → 2.6%) and ether (8.4% → 3.4%).",
            "zh": "过滤的逻辑是“RSI 已经很高就别买”，而这恰恰在强趋势刚开始时是错的——那时 RSI 会连续好几周保持高位。所以它在这些市场上损失的收益最多：白银（年化 12.2% 降到 6.8%）、比特币（8.1% 降到 2.6%）和以太坊（8.4% 降到 3.4%）。"
          }
        ]
      },
      {
        "heading": {
          "en": "Takeaways",
          "zh": "几点结论"
        },
        "paragraphs": [
          {
            "en": [
              "An RSI filter on MACD works as a risk reducer, not a return booster.",
              "It helps most on slow, mean-reverting markets (gold, commodities, agriculture) and hurts most on fast trending ones (crypto, silver).",
              "Fewer trades also means lower costs, which the backtest numbers above do not include yet; try the cost slider on both strategy pages."
            ],
            "zh": [
              "给 MACD 加 RSI 过滤，作用是降风险，而不是提收益。",
              "它在节奏慢、带均值回归特征的市场（黄金、大宗商品、农产品）上帮助最大，在快速趋势的市场（加密货币、白银）上伤害最大。",
              "交易更少也意味着成本更低，而上面的回测数字还没扣成本；可以在两个策略页上用成本滑块对比一下。"
            ]
          }
        ]
      }
    ],
    "dataAsOf": "2026-08-14"
  },
  {
    "slug": "how-to-read-drawdown-ulcer-index-rolling-sharpe",
    "title": {
      "en": "Two Strategies, the Same 10% Drawdown, Very Different Pain: How to Read Drawdown, the Ulcer Index and Rolling Sharpe",
      "zh": "回撤都是 10%，难受程度却差很多：怎么看最大回撤、Ulcer 指数和滚动夏普"
    },
    "summary": {
      "en": "Maximum drawdown tells you how deep the worst fall was, not how long you spent underwater or how often it happened. Two strategies on the S&P 500 with almost identical 10% drawdowns show why the Ulcer index and drawdown duration are worth a look — and why a single Sharpe ratio can mislead as much as a single drawdown.",
      "zh": "最大回撤只告诉你最深的一次跌了多少，不告诉你在水下待了多久、跌了几次。标普 500 上两个最大回撤几乎一样（约 10%）的策略，说明了为什么值得看一看 Ulcer 指数和回撤持续时间——也说明了只看一个夏普比率，和只看一个回撤数字一样容易被误导。"
    },
    "date": "2026-11-03",
    "readTime": "3 min read",
    "category": "Methodology",
    "featured": false,
    "tags": [
      "Drawdown",
      "Ulcer Index",
      "Sharpe Ratio",
      "Risk"
    ],
    "sections": [
      {
        "heading": {
          "en": "Maximum drawdown: the depth of the worst hole",
          "zh": "最大回撤：最深的那个坑"
        },
        "paragraphs": [
          {
            "en": "Maximum drawdown is the largest fall from a peak to a later low. It is the number most people look at first, and for good reason: it is roughly the worst loss you would have had to sit through. But it is one number from one episode. It says nothing about how long the strategy took to recover, or whether it spent most of its life a few percent below its high.",
            "zh": "最大回撤是从高点到之后低点的最大跌幅。大多数人第一眼就看它，这有道理：它大致就是你需要熬过的最大亏损。但它只是一次事件里的一个数字，既不说明策略花了多久才回到高点，也不说明它是不是大部分时间都在高点下方几个百分点徘徊。"
          }
        ]
      },
      {
        "heading": {
          "en": "Same depth, different experience",
          "zh": "坑一样深，感受完全不同"
        },
        "paragraphs": [
          {
            "en": "Over the last five years on SPY, Z-Score Mean Reversion and Volatility Breakout both had a maximum drawdown of about 10% (−10.4% and −10.1%). On a leaderboard sorted by drawdown they look alike. They were not:",
            "zh": "近五年在 SPY 上，Z 分数均值回归和波动率突破的最大回撤都在 10% 左右（−10.4% 和 −10.1%）。在按回撤排序的排行榜上，它们看起来差不多，实际上却不是："
          },
          {
            "en": [
              "Z-Score Mean Reversion was below its previous high on 32% of days; its longest drawdown lasted 224 days. Ulcer index: 1.2%.",
              "Volatility Breakout was below its previous high on 98% of days (including long stretches out of the market while still below an earlier peak); its longest drawdown lasted 1,006 days — almost three years without a new high. Ulcer index: 5.3%."
            ],
            "zh": [
              "Z 分数均值回归有 32% 的交易日低于前高，最长一次回撤持续 224 天，Ulcer 指数 1.2%。",
              "波动率突破有 98% 的交易日低于前高（其中包括低于前高时长期空仓的日子），最长一次回撤持续 1006 天——将近三年没有创新高，Ulcer 指数 5.3%。"
            ]
          },
          {
            "en": "The first strategy had one sharp dip and recovered. The second spent nearly the whole period slightly underwater. Annual returns followed the same pattern: 8.0% against 2.5%.",
            "zh": "前者是一次急跌然后很快恢复，后者几乎整段时间都在水下一点点的位置。年化收益也是同样的规律：8.0% 对 2.5%。"
          }
        ]
      },
      {
        "heading": {
          "en": "The Ulcer index: depth and duration in one number",
          "zh": "Ulcer 指数：把深度和时长合成一个数"
        },
        "paragraphs": [
          {
            "en": "The Ulcer index is the root mean square of the daily drawdown: every day below the previous peak counts, and deeper days count more. A strategy that falls 10% once and recovers quickly gets a low value; one that hovers 3–5% below its high for years gets a high value, even with a smaller maximum drawdown. That matches how drawdowns feel to the person running the strategy — long stretches without progress are what make people give up. On Quant Arena you find it in the risk tab of every strategy page, next to the longest drawdown in days and the share of time underwater.",
            "zh": "Ulcer 指数是每天回撤幅度的均方根：每一个低于前高的交易日都算进去，跌得越深权重越大。一次跌 10% 但很快恢复的策略，Ulcer 指数很低；常年在高点下方 3%–5% 徘徊的策略，即使最大回撤更小，Ulcer 指数也会更高。这和实际执行策略时的感受是一致的——长时间没有进展，才是让人放弃的原因。在 Quant Arena 每个策略页的风险标签里都能找到它，旁边还有最长回撤天数和水下时间占比。"
          }
        ]
      },
      {
        "heading": {
          "en": "Rolling Sharpe: one ratio, many periods",
          "zh": "滚动夏普：同一个比率，不同的时间段"
        },
        "paragraphs": [
          {
            "en": "A Sharpe ratio averages return per unit of risk over a whole period, and the period matters a lot. On SPY:",
            "zh": "夏普比率是整段时间里单位风险的平均收益，而“整段时间”取多长影响很大。以 SPY 为例："
          },
          {
            "en": [
              "Volatility Breakout: Sharpe 2.49 over the last year, 1.07 over three years, 0.47 over five, 0.14 over its full history.",
              "Ichimoku Cloud: −0.24 over the last year, but 1.00 over three years and 0.70 over its full history."
            ],
            "zh": [
              "波动率突破：近一年夏普 2.49，近三年 1.07，近五年 0.47，全部历史只有 0.14。",
              "一目均衡表：近一年 −0.24，但近三年 1.00，全部历史 0.70。"
            ]
          },
          {
            "en": "Judged on the last year alone, you would pick the first and drop the second — the opposite of what the longer record suggests. The rolling Sharpe chart on each strategy page shows the ratio over a moving one-year window, so you can see whether a good number is typical or a recent streak.",
            "zh": "如果只看近一年，你会选前者、放弃后者——和更长期的记录给出的结论正好相反。每个策略页上的滚动夏普图展示的是一年滚动窗口的夏普，可以看出一个好数字是常态，还是最近刚好走运。"
          }
        ]
      },
      {
        "heading": {
          "en": "A simple checklist",
          "zh": "一份简单的检查清单"
        },
        "paragraphs": [
          {
            "en": [
              "Read maximum drawdown together with the longest drawdown in days and the Ulcer index.",
              "Prefer strategies whose Sharpe ratio is reasonable across 1, 3 and 5 years over ones with one spectacular window.",
              "Check the 90% bootstrap range for the drawdown: the worst case you live through can be deeper than the one the backtest happened to produce.",
              "Ask yourself how long you could watch a strategy go nowhere before switching it off — then compare that with its longest drawdown."
            ],
            "zh": [
              "看最大回撤时，同时看最长回撤天数和 Ulcer 指数。",
              "优先选 1 年、3 年、5 年夏普都说得过去的策略，而不是只有某一个时间窗口特别亮眼的。",
              "看一看回撤的 90% Bootstrap 区间：你实际经历的最坏情况，可能比回测碰巧给出的更深。",
              "问问自己：一个策略原地踏步多久，你就会把它关掉？再拿这个时间和它的最长回撤比一比。"
            ]
          }
        ]
      }
    ],
    "dataAsOf": "2026-08-14"
  },
  {
    "slug": "keltner-vs-bollinger",
    "title": {
      "en": "Keltner Breakout or Bollinger Reversion? Ten Markets Split Down the Middle",
      "zh": "肯特纳突破还是布林带回归？10 个市场正好一半对一半"
    },
    "summary": {
      "en": "Two volatility-band strategies that do opposite things: one buys when price breaks out of a Keltner Channel, the other buys when price falls to the lower Bollinger Band. Over the last five years each had the better Sharpe ratio on exactly five of ten markets — and the split follows a clear pattern: breakouts won where prices trended, reversion won where they went back and forth.",
      "zh": "两个基于波动率通道、做法正好相反的策略：一个在价格突破肯特纳通道时买入，一个在价格跌到布林带下轨时买入。近五年，它们各自在 10 个市场中的 5 个夏普更高——而且分界很清楚：价格走趋势的市场突破赢，来回震荡的市场回归赢。"
    },
    "date": "2026-11-03",
    "readTime": "3 min read",
    "category": "Trend Following",
    "featured": false,
    "tags": [
      "Keltner Channel",
      "Bollinger Bands",
      "Breakout",
      "Mean Reversion"
    ],
    "sections": [
      {
        "heading": {
          "en": "The strategies",
          "zh": "三个策略"
        },
        "paragraphs": [
          {
            "en": [
              "**Keltner Channel Breakout (KC-01):** a 20-day EMA midline with bands at 2× the 20-day ATR; goes long when price closes above the upper band and exits when it falls back below the midline.",
              "**Bollinger Band Reversion (MR-02):** goes long when price touches the lower Bollinger Band and exits at the middle band, with a bandwidth filter.",
              "**Bollinger-Keltner Squeeze (COMBO-01):** waits until the Bollinger Bands contract inside the Keltner Channel, then trades in the direction of the move when the squeeze releases."
            ],
            "zh": [
              "**肯特纳通道突破（KC-01）**：以 20 日 EMA 为中线、上下轨距中线 2 倍 20 日 ATR，收盘突破上轨时做多，跌回中线下方离场。",
              "**布林带回归（MR-02）**：价格触及布林带下轨时做多，回到中轨离场，带宽度过滤。",
              "**布林-肯特纳挤压（COMBO-01）**：等布林带收窄到肯特纳通道里面，挤压释放时顺着方向交易。"
            ]
          },
          {
            "en": "All three run long-only on daily data with walk-forward optimization and no trading costs; the figures below cover the last five years.",
            "zh": "三个策略都只做多，在日线上用滚动前推优化回测，未扣交易成本；下面的数字都是近五年。"
          }
        ]
      },
      {
        "heading": {
          "en": "Where breakouts won",
          "zh": "突破赢在哪里"
        },
        "paragraphs": [
          {
            "en": "The Keltner breakout had the higher Sharpe ratio on US stocks, gold, silver, bitcoin and ether. Crypto stands out: 14.7% a year on bitcoin (buy-and-hold 7.2%) and 13.3% on ether, where holding lost 8.8% a year. On SPY it made 4.9% a year with a −8.5% maximum drawdown and a Sharpe ratio of 0.75 — far less return than holding (13.2%), but a third of the drawdown.",
            "zh": "肯特纳突破在美股、黄金、白银、比特币和以太坊上夏普更高。加密货币最明显：比特币年化 14.7%（持有 7.2%），以太坊年化 13.3%，而同期持有以太坊每年亏 8.8%。在 SPY 上它年化 4.9%，最大回撤 −8.5%，夏普 0.75——收益远低于持有（13.2%），但回撤只有三分之一。"
          }
        ]
      },
      {
        "heading": {
          "en": "Where reversion won",
          "zh": "回归赢在哪里"
        },
        "paragraphs": [
          {
            "en": "Bollinger reversion had the higher Sharpe ratio on oil, broad commodities, agriculture, EUR/USD and natural gas — markets that spent much of the period moving sideways. Its best result was oil: 11.5% a year with a Sharpe ratio of 0.91 and a −13% drawdown, while being in the market only 12% of the time. On EUR/USD it was the only one of the three that made money (1.3% a year, maximum drawdown −2.6%).",
            "zh": "布林带回归在原油、综合大宗商品、农产品、欧元/美元和天然气上夏普更高——这些市场这几年大部分时间都在横盘。它最好的结果是原油：年化 11.5%，夏普 0.91，回撤 −13%，而持仓时间只有 12%。在欧元/美元上，它是三个策略里唯一赚钱的（年化 1.3%，最大回撤 −2.6%）。"
          }
        ]
      },
      {
        "heading": {
          "en": "The squeeze: one good market",
          "zh": "挤压策略：只有一个好市场"
        },
        "paragraphs": [
          {
            "en": "Combining both ideas did not combine their strengths. The squeeze strategy traded about twice as often as the other two and had the best Sharpe ratio of the three on only one market, gold (10.6% a year, Sharpe 0.99). On US stocks it lost 1.4% a year.",
            "zh": "把两种思路合在一起，并没有把优点也合在一起。挤压策略的交易次数大约是另外两个的两倍，只在一个市场上夏普排第一——黄金（年化 10.6%，夏普 0.99）。在美股上它每年亏 1.4%。"
          }
        ]
      },
      {
        "heading": {
          "en": "How sure can we be?",
          "zh": "结论有多可靠？"
        },
        "paragraphs": [
          {
            "en": "Not very. The 90% bootstrap ranges are wide: on SPY, for example, the breakout's annual return ranges from 0.5% to 10.8% and the reversion strategy's from −1.7% to 8.1%. After adjusting for the number of strategies we test, none of the 30 results reaches a Deflated Sharpe of 95%; the best is the squeeze on gold at 63%. The market split is the more useful finding than any single number.",
            "zh": "不太可靠。90% 的 Bootstrap 区间很宽：比如在 SPY 上，突破策略的年化收益区间是 0.5% 到 10.8%，回归策略是 −1.7% 到 8.1%。考虑到我们测试的策略数量，30 个结果里没有一个的 Deflated 夏普达到 95%，最高的是黄金上的挤压策略，63%。比起任何一个具体数字，“按市场分界”这个规律更有参考价值。"
          }
        ]
      },
      {
        "heading": {
          "en": "Takeaways",
          "zh": "几点结论"
        },
        "paragraphs": [
          {
            "en": [
              "Breakout and reversion are not better or worse — they suit different markets. Trending assets (stocks, metals, crypto) favored the breakout; range-bound ones (oil, agriculture, currencies) favored reversion.",
              "Mean reversion with Bollinger Bands is in the market rarely (6–15% of days), so its returns are small even when its Sharpe ratio is good.",
              "Neither beat buy-and-hold on return in the strong bull markets; their value is lower drawdowns.",
              "Check the market before picking the strategy, and use the heatmap page to see this pattern across all strategies."
            ],
            "zh": [
              "突破和回归没有绝对的好坏，而是适合不同的市场：走趋势的资产（股票、贵金属、加密货币）更适合突破，区间震荡的资产（原油、农产品、外汇）更适合回归。",
              "布林带回归很少持仓（6%–15% 的交易日），所以即使夏普不错，收益也不高。",
              "在强牛市里，两者的收益都跑不赢持有；它们的价值在于回撤更小。",
              "先看市场再选策略；可以到热力图页面看看所有策略是不是都有这种规律。"
            ]
          }
        ]
      }
    ],
    "figure": {
      "title": {
        "en": "Channel Comparison",
        "zh": "通道对比"
      },
      "caption": {
        "en": "Keltner Channels (Blue) are smoother and use ATR; Bollinger Bands (Red) are reactive and use Standard Deviation.",
        "zh": "肯特纳通道（蓝色）更平滑，基于 ATR 构建；布林带（红色）反应更敏捷，基于标准差计算。"
      },
      "svg": "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"Channel comparison\">\n  <rect x=\"0\" y=\"0\" width=\"640\" height=\"240\" fill=\"#f8f1e8\" />\n  <path d=\"M40,120 Q160,80 280,120 T520,120\" fill=\"none\" stroke=\"#5b554d\" stroke-width=\"2\" />\n  <path d=\"M40,90 Q160,50 280,90 T520,90\" fill=\"none\" stroke=\"#1f6f78\" stroke-width=\"2\" stroke-dasharray=\"4\" />\n  <path d=\"M40,150 Q160,110 280,150 T520,150\" fill=\"none\" stroke=\"#1f6f78\" stroke-width=\"2\" stroke-dasharray=\"4\" />\n  <path d=\"M40,80 Q160,30 280,80 T520,80\" fill=\"none\" stroke=\"#e16b3a\" stroke-width=\"2\" />\n  <path d=\"M40,160 Q160,130 280,160 T520,160\" fill=\"none\" stroke=\"#e16b3a\" stroke-width=\"2\" />\n  <text x=\"540\" y=\"90\" fill=\"#1f6f78\" font-size=\"10\">Keltner</text>\n  <text x=\"540\" y=\"80\" fill=\"#e16b3a\" font-size=\"10\">Bollinger</text>\n</svg>"
    },
    "dataAsOf": "2026-08-14"
  },
  {
    "slug": "ema-crossover-strategy",
    "title": {
      "en": "EMA Crossover Strategy: Reading Trend With Two Clocks",
      "zh": "EMA 交叉策略：用两只时钟读取趋势"
    },
    "summary": {
      "en": "An in depth look at why exponential moving average crossovers persist, how to interpret their backtests, and when trend signals fail.",
      "zh": "深入解析指数移动平均线交叉为何长期有效、应如何解读其回测，以及趋势信号何时会失效。"
    },
    "date": "2026-01-13",
    "readTime": "12 min read",
    "category": "Trend Following",
    "featured": true,
    "tags": [
      "Trend",
      "Moving Average"
    ],
    "figure": {
      "title": {
        "en": "EMA crossover signal sketch",
        "zh": "EMA 交叉信号示意图"
      },
      "caption": {
        "en": "A simplified illustration of price (teal) with fast and slow EMAs (orange and gray).",
        "zh": "价格（青绿色）与快、慢 EMA（橙色与灰色）的简化示意图。"
      },
      "svg": "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"EMA crossover sketch\">\n  <rect x=\"0\" y=\"0\" width=\"640\" height=\"240\" fill=\"#f8f1e8\" />\n  <g stroke=\"#d8cbbd\" stroke-width=\"1\">\n    <line x1=\"40\" y1=\"40\" x2=\"600\" y2=\"40\" />\n    <line x1=\"40\" y1=\"80\" x2=\"600\" y2=\"80\" />\n    <line x1=\"40\" y1=\"120\" x2=\"600\" y2=\"120\" />\n    <line x1=\"40\" y1=\"160\" x2=\"600\" y2=\"160\" />\n    <line x1=\"40\" y1=\"200\" x2=\"600\" y2=\"200\" />\n  </g>\n  <polyline fill=\"none\" stroke=\"#1f6f78\" stroke-width=\"3\" points=\"40,170 90,150 140,160 190,120 240,110 290,90 340,100 390,70 440,60 490,80 540,50 600,70\" />\n  <polyline fill=\"none\" stroke=\"#e16b3a\" stroke-width=\"2.5\" points=\"40,180 90,165 140,150 190,135 240,120 290,110 340,105 390,95 440,85 490,80 540,75 600,80\" />\n  <polyline fill=\"none\" stroke=\"#7c7c7c\" stroke-width=\"2\" points=\"40,190 90,180 140,170 190,155 240,140 290,130 340,125 390,120 440,115 490,110 540,105 600,100\" />\n  <circle cx=\"240\" cy=\"120\" r=\"5\" fill=\"#e16b3a\" />\n  <circle cx=\"240\" cy=\"140\" r=\"5\" fill=\"#7c7c7c\" />\n  <text x=\"40\" y=\"30\" fill=\"#5b554d\" font-size=\"12\">Price</text>\n</svg>"
    },
    "sections": [
      {
        "heading": {
          "en": "Why EMA crossovers persist",
          "zh": "为何 EMA 交叉长期存在"
        },
        "paragraphs": [
          {
            "en": "The exponential moving average crossover exists because markets rarely move in straight lines. Prices drift, pause, and then continue, and traders need a simple way to decide whether a move is noise or a trend that is worth following. An EMA smooths recent prices while keeping more weight on the latest data, so it reacts faster than a simple average. By comparing a fast EMA to a slow EMA, the strategy asks a single question: is short term momentum strong enough to outrun the long term baseline? The answer is often good enough to keep traders aligned with the dominant move without overfitting to daily noise.",
            "zh": "指数移动平均线交叉之所以长期有效，是因为市场很少沿直线运行。价格会漂移、停顿，再继续推进，交易者需要一种简单方式来判断当前波动究竟只是噪音，还是值得跟随的趋势。EMA 在平滑近期价格的同时，对最新数据赋予更高权重，因此反应快于简单均线。通过比较快线与慢线，策略本质上只在回答一个问题：短期动能是否足以跑赢长期基准？很多时候，这个答案已足够让交易者跟上主导趋势，而不必对日常噪音过度拟合。"
          },
          {
            "en": "EMA crossovers are also popular because they are easy to explain. A two line rule can be implemented across equities, FX, or commodities with minimal changes, which makes it a natural benchmark for trend systems. The simplicity hides an important idea: the crossover is not a prediction, it is a filter. It allows a trader to say no during choppy regimes and yes during clean directional moves. That filter, not the entry precision, is what keeps the strategy alive across decades.",
            "zh": "EMA 交叉之所以广受欢迎，还因为它极易解释。一套双均线规则只需极少调整，就能应用到股票、外汇和商品市场，因此天然适合作为趋势系统的基准模型。这种简洁性背后隐藏着一个关键点：交叉不是预测工具，而是过滤器。它帮助交易者在震荡市场中选择观望，在方向清晰的行情中选择参与。真正让这一策略跨越数十年仍然存活的，不是入场精度，而是这种过滤机制。"
          }
        ]
      },
      {
        "heading": {
          "en": "Signal mechanics without the math overload",
          "zh": "不过度数学化的信号机制"
        },
        "paragraphs": [
          {
            "en": "A classic EMA crossover uses a fast window such as 20 days and a slow window such as 100 or 200 days. The fast EMA reacts to recent price changes while the slow EMA defines the longer term regime. When the fast line rises above the slow line, the strategy goes long. When it falls below, the strategy exits or goes short depending on the design. This creates a small number of trades, each one attempting to capture a multi week or multi month trend.",
            "zh": "经典 EMA 交叉通常采用 20 日等较快窗口与 100 日或 200 日等较慢窗口。快 EMA 对近期价格变化反应更快，慢 EMA 则用于界定更长期的市场状态。当快线向上穿越慢线时，策略做多；当快线跌破慢线时，则根据设计选择平仓或反手做空。这样的规则会生成较少但更聚焦的交易，每一笔都试图捕捉数周乃至数月的趋势。"
          },
          {
            "en": "Because EMAs emphasize recent data, the crossover often occurs after a trend has already started. That delay is intentional. The strategy gives up the first part of a move in exchange for avoiding many false starts. In practice, the choice of windows controls the trade off between responsiveness and stability. Short windows increase turnover and whipsaws, while longer windows increase delay but may improve trend quality.",
            "zh": "由于 EMA 更重视近期数据，交叉往往发生在趋势已经启动之后。这种滞后是有意为之。策略愿意放弃一段行情起步阶段，以换取减少大量假启动信号。在实务中，窗口长度决定了“响应速度”与“稳定性”之间的权衡。较短窗口会提高换手并带来更多反复震荡，较长窗口则会增加滞后，但往往能提升趋势质量。"
          }
        ]
      },
      {
        "heading": {
          "en": "Market fit and regime behavior",
          "zh": "市场适配性与市场状态表现"
        },
        "paragraphs": [
          {
            "en": "EMA crossovers are most effective in markets that exhibit sustained directional moves. Equity indices and macro driven commodities often fit this profile because they trend in response to economic cycles, risk appetite, and policy shifts. The strategy can also work in FX pairs when a clear rate differential or risk regime exists, but it tends to be more sensitive to sudden reversals and central bank surprises.",
            "zh": "EMA 交叉在持续单边运行的市场中最为有效。股票指数与受宏观因素驱动的商品通常符合这一特征，因为它们会随经济周期、风险偏好和政策变化形成趋势。当汇率差异或风险环境较为明确时，该策略在外汇品种中也能发挥作用，但对突发反转和央行意外事件通常更为敏感。"
          },
          {
            "en": "In sideways markets the crossover struggles. Range bound regimes generate frequent cross signals with little follow through, leading to a series of small losses. That is why a crossover strategy typically looks best over long horizons that include both trends and noise. The long horizon allows a few large winners to outweigh the smaller whipsaws.",
            "zh": "在横盘市场中，交叉策略往往表现艰难。区间震荡会产生频繁交叉，但后续延续性很差，最终形成一连串小亏损。因此，交叉策略通常只有在同时覆盖趋势与噪音的长周期回测中，表现才更有说服力。拉长周期后，少数大赢家才有机会覆盖大量小幅震荡损失。"
          }
        ]
      },
      {
        "heading": {
          "en": "How to read backtests",
          "zh": "如何解读回测"
        },
        "paragraphs": [
          {
            "en": "Backtests for EMA crossovers often show a stair step equity curve. Long flat periods are followed by sharp gains during trend phases, then giveback during choppy markets. This is not a bug. It reflects the reality that trend following pays only when trends exist. When evaluating results, focus on the distribution of trade outcomes rather than the average trade. A small number of big winners often drives total return.",
            "zh": "EMA 交叉策略的回测净值曲线常呈现“台阶状”。长时间横盘之后，趋势阶段出现快速拉升，随后又在震荡市场中回吐部分收益。这并不是缺陷，而是趋势跟随的真实特征：只有当趋势存在时，策略才会获得报酬。评估结果时，应更多关注交易结果的分布，而不是单笔平均收益。总体回报往往由少数几笔大赢家驱动。"
          },
          {
            "en": "Look at drawdown depth and duration. A crossover may show acceptable long term return but still experience a multi year drawdown if the market stays range bound or reverses sharply. Also compare trade counts and turnover. If a parameter set produces too many trades, it may be too sensitive and may not survive real world costs.",
            "zh": "还应重点观察回撤深度与回撤持续时间。某一组交叉参数即便长期收益尚可，如果市场长期震荡或急剧反转，仍可能经历持续数年的回撤。同时也要比较交易次数与换手率。若某组参数产生过多交易，往往意味着系统过于敏感，未必能承受真实世界中的交易成本。"
          }
        ]
      },
      {
        "heading": {
          "en": "Risk and failure modes",
          "zh": "风险与失效模式"
        },
        "paragraphs": [
          {
            "en": "The primary risk is whipsaw. When price oscillates around the slow EMA, the strategy flips positions and suffers a series of small losses. Another risk is gap risk. Because trades are executed on the next session, a sudden overnight gap can create a much worse entry or exit than expected. The model is also exposed to crash risk because it remains long during trends and exits only after a reversal is confirmed.",
            "zh": "核心风险是反复震荡带来的 whipsaw。当价格围绕慢 EMA 来回摆动时，策略会频繁翻转仓位并承受连续小亏损。另一个风险是跳空风险。由于交易在下一交易时段执行，隔夜跳空可能导致远差于预期的入场或出场价格。该模型还暴露于崩跌风险之下，因为它在趋势中持续持有，只有在反转被确认后才退出。"
          },
          {
            "en": "Parameter sensitivity is another weakness. A crossover that looks perfect on a specific historical window can fail out of sample if the chosen windows fit that period too tightly. Walk forward tests and multiple window evaluations help, but they do not eliminate the risk of overfitting. Risk overlays such as stop losses or volatility filters can reduce drawdowns, but they may also cut the biggest winners.",
            "zh": "参数敏感性也是其弱点之一。某组交叉参数在特定历史窗口中看似完美，但若窗口选择对该时期拟合过紧，样本外表现可能迅速失效。滚动前瞻测试和多窗口评估虽然有帮助，但并不能彻底消除过拟合风险。止损或波动率过滤等风险覆盖层可以降低回撤，但也可能同时截断那些最重要的大盈利交易。"
          }
        ]
      },
      {
        "heading": {
          "en": "How it differs from other trend rules",
          "zh": "它与其他趋势规则有何不同"
        },
        "paragraphs": [
          {
            "en": "Compared to Donchian breakouts, EMA crossovers react to average price rather than to extreme highs or lows. This makes them smoother but sometimes slower to catch sudden breakouts. Compared to Keltner or Bollinger channel systems, EMA crossovers ignore volatility expansion and focus purely on direction. That makes them simpler but less adaptive to volatility regimes.",
            "zh": "与唐奇安突破相比，EMA 交叉关注的是平均价格变化，而不是极端高点或低点，因此通常更平滑，但在应对突发突破时有时会更慢。与肯特纳或布林带通道系统相比，EMA 交叉忽略波动率扩张，只聚焦方向本身。这使它更简单，但对不同波动率环境的适应性较弱。"
          },
          {
            "en": "Adaptive moving averages such as KAMA aim to adjust their speed based on market efficiency. They can outperform a fixed EMA in some regimes, but they are harder to interpret and tune. The EMA crossover remains a baseline because it is transparent and robust across assets. It is a useful reference point when testing more complex trend systems.",
            "zh": "像 KAMA 这样的自适应移动平均线试图根据市场效率动态调整响应速度。在某些市场状态下，它们可能优于固定 EMA，但解释和调参都更复杂。EMA 交叉之所以仍被视为基准，是因为它足够透明，并能在多类资产上保持稳健。在测试更复杂的趋势系统时，它是一个非常有价值的参考起点。"
          }
        ]
      },
      {
        "heading": {
          "en": "Practical variations and portfolio use",
          "zh": "实务变体与组合中的角色"
        },
        "paragraphs": [
          {
            "en": "Researchers often adapt EMA lengths to the instrument. FX pairs may respond better to faster averages, while equity indices may benefit from slower settings that filter out noise. Other variations require the fast EMA to be rising, or the price to be above a longer trend filter, before entering. These small additions can reduce whipsaws without changing the core logic.",
            "zh": "研究者通常会根据标的调整 EMA 长度。外汇货币对可能更适合较快均线，而股票指数则可能更受益于能过滤噪音的较慢参数。其他常见变体包括要求快 EMA 本身正在上行，或要求价格位于更长期趋势过滤器上方后才允许入场。这些小幅调整能在不改变核心逻辑的前提下减少反复震荡。"
          },
          {
            "en": "In diversified portfolios, EMA crossovers are usually one sleeve among others. Trend exposure can be sized by volatility or capped by correlation so that one regime does not dominate risk. Pairing trend systems with mean reversion or carry models can smooth returns and reduce long drawdown stretches. The crossover works best when it is allowed to do one job: capture trends when they appear.",
            "zh": "在分散化投资组合中，EMA 交叉通常只是其中一个策略分层。趋势敞口可以按波动率分配，或通过相关性上限进行约束，以避免单一市场状态主导组合风险。将趋势系统与均值回归或 carry 模型配合，往往有助于平滑收益并缩短长期回撤阶段。EMA 交叉最适合承担一项清晰任务：当趋势出现时负责捕捉它。"
          },
          {
            "en": "A practical workflow is to treat the crossover as a regime filter and then apply more refined entries within that regime. For example, a trader might only take pullback entries when the fast EMA stays above the slow EMA. This preserves the trend bias while allowing more precise timing, and it can reduce the frustration of late entries without changing the underlying philosophy.",
            "zh": "一种实用流程是先把交叉视为市场状态过滤器，再在该状态内叠加更精细的入场规则。例如，交易者可以仅在快 EMA 位于慢 EMA 上方时做回调买入。这样既保留了趋势偏向，又能获得更精确的择时，同时减少“追得太晚”的挫败感，而无需改变策略的底层哲学。"
          }
        ]
      }
    ]
  },
  {
    "slug": "parabolic-sar-strategy",
    "title": {
      "en": "Parabolic SAR Strategy: A Trend Exit Engine",
      "zh": "抛物线 SAR 策略：趋势退出引擎"
    },
    "summary": {
      "en": "Parabolic SAR uses a trailing stop that accelerates with trend strength. This article explains why it works, when it fails, and how to read its backtests.",
      "zh": "抛物线 SAR 使用会随趋势强度加速的跟踪止损。本文解释它为何有效、何时失效，以及如何解读其回测。"
    },
    "date": "2026-01-13",
    "readTime": "11 min read",
    "category": "Trend Following",
    "featured": true,
    "tags": [
      "Trend",
      "Parabolic SAR"
    ],
    "figure": {
      "title": {
        "en": "Parabolic SAR stop trail",
        "zh": "抛物线 SAR 止损轨迹"
      },
      "caption": {
        "en": "Dots represent the SAR level trailing price as the trend accelerates.",
        "zh": "圆点表示随着趋势加速而不断贴近价格的 SAR 水平。"
      },
      "svg": "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"Parabolic SAR sketch\">\n  <rect x=\"0\" y=\"0\" width=\"640\" height=\"240\" fill=\"#f8f1e8\" />\n  <g stroke=\"#d8cbbd\" stroke-width=\"1\">\n    <line x1=\"40\" y1=\"40\" x2=\"600\" y2=\"40\" />\n    <line x1=\"40\" y1=\"80\" x2=\"600\" y2=\"80\" />\n    <line x1=\"40\" y1=\"120\" x2=\"600\" y2=\"120\" />\n    <line x1=\"40\" y1=\"160\" x2=\"600\" y2=\"160\" />\n    <line x1=\"40\" y1=\"200\" x2=\"600\" y2=\"200\" />\n  </g>\n  <polyline fill=\"none\" stroke=\"#1f6f78\" stroke-width=\"3\" points=\"40,180 90,165 140,150 190,135 240,120 290,100 340,90 390,80 440,75 490,70 540,65 600,70\" />\n  <g fill=\"#e16b3a\">\n    <circle cx=\"60\" cy=\"195\" r=\"4\" />\n    <circle cx=\"110\" cy=\"185\" r=\"4\" />\n    <circle cx=\"160\" cy=\"175\" r=\"4\" />\n    <circle cx=\"210\" cy=\"160\" r=\"4\" />\n    <circle cx=\"260\" cy=\"145\" r=\"4\" />\n    <circle cx=\"310\" cy=\"125\" r=\"4\" />\n    <circle cx=\"360\" cy=\"110\" r=\"4\" />\n    <circle cx=\"410\" cy=\"100\" r=\"4\" />\n    <circle cx=\"460\" cy=\"95\" r=\"4\" />\n    <circle cx=\"510\" cy=\"90\" r=\"4\" />\n  </g>\n</svg>"
    },
    "sections": []
  },
  {
    "slug": "volatility-breakout",
    "title": {
      "en": "Volatility Breakout Strategy: Trading Expansion Without Overreach",
      "zh": "波动率突破策略：参与扩张而不过度追价"
    },
    "summary": {
      "en": "Volatility breakouts focus on price moves that escape a recent range. This guide explains the logic, the regimes where it works, and the traps to avoid.",
      "zh": "波动率突破聚焦于价格脱离近期区间的走势。本文解释其逻辑、适用的市场环境以及需要避免的陷阱。"
    },
    "date": "2026-01-13",
    "readTime": "13 min read",
    "category": "Trend Following",
    "featured": true,
    "tags": [
      "Breakout",
      "Volatility"
    ],
    "figure": {
      "title": {
        "en": "Volatility breakout channel",
        "zh": "波动率突破通道"
      },
      "caption": {
        "en": "A simplified channel shows how price expansion can trigger a breakout entry.",
        "zh": "简化通道示意价格扩张如何触发突破入场。"
      },
      "svg": "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"Volatility breakout sketch\">\n  <rect x=\"0\" y=\"0\" width=\"640\" height=\"240\" fill=\"#f8f1e8\" />\n  <rect x=\"60\" y=\"70\" width=\"520\" height=\"100\" fill=\"none\" stroke=\"#7c7c7c\" stroke-width=\"2\" stroke-dasharray=\"6 6\" />\n  <polyline fill=\"none\" stroke=\"#1f6f78\" stroke-width=\"3\" points=\"60,160 120,150 180,145 240,140 300,135 360,130 420,120 480,90 540,60 600,70\" />\n  <circle cx=\"540\" cy=\"60\" r=\"6\" fill=\"#e16b3a\" />\n</svg>"
    },
    "sections": []
  },
  {
    "slug": "donchian-turtle-breakout",
    "title": {
      "en": "Donchian Channel and Turtle Breakout: Trading the 20/10 Rule",
      "zh": "唐奇安通道与海龟突破：交易 20/10 规则"
    },
    "summary": {
      "en": "The Turtle system uses Donchian breakouts and risk based sizing to capture sustained trends. This research note explains the logic, market fit, and failure modes.",
      "zh": "海龟系统通过唐奇安突破与基于风险的头寸规模来捕捉持续趋势。本文说明其逻辑、市场适配性与失效模式。"
    },
    "date": "2026-01-20",
    "readTime": "14 min read",
    "category": "Trend Following",
    "featured": false,
    "tags": [
      "Breakout",
      "Donchian",
      "Turtle"
    ],
    "figure": {
      "title": {
        "en": "Donchian breakout channel",
        "zh": "唐奇安突破通道"
      },
      "caption": {
        "en": "Price pushes above the recent channel to trigger a breakout entry.",
        "zh": "价格向上突破近期通道，从而触发突破入场。"
      },
      "svg": "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"Donchian breakout sketch\">\n  <rect x=\"0\" y=\"0\" width=\"640\" height=\"240\" fill=\"#f8f1e8\" />\n  <rect x=\"70\" y=\"70\" width=\"500\" height=\"100\" fill=\"none\" stroke=\"#7c7c7c\" stroke-width=\"2\" stroke-dasharray=\"6 6\" />\n  <polyline fill=\"none\" stroke=\"#1f6f78\" stroke-width=\"3\" points=\"70,160 120,150 170,140 220,145 270,130 320,120 370,110 420,95 470,85 520,70 570,60\" />\n  <circle cx=\"520\" cy=\"70\" r=\"6\" fill=\"#e16b3a\" />\n</svg>"
    },
    "sections": []
  },
  {
    "slug": "supertrend-atr-trailing-stop",
    "title": {
      "en": "Supertrend and ATR Trailing Stop: Volatility Adjusted Trend Control",
      "zh": "Supertrend 与 ATR 跟踪止损：波动率调整后的趋势控制"
    },
    "summary": {
      "en": "Supertrend uses ATR based bands to define trend flips and stops. This research note explains the signal mechanics, regime fit, and the risks of whipsaw.",
      "zh": "Supertrend 使用基于 ATR 的带状结构定义趋势翻转与止损。本文解释其信号机制、适用环境与反复震荡风险。"
    },
    "date": "2026-01-20",
    "readTime": "13 min read",
    "category": "Trend Following",
    "featured": false,
    "tags": [
      "Supertrend",
      "ATR",
      "Trailing Stop"
    ],
    "figure": {
      "title": {
        "en": "Supertrend band and flip",
        "zh": "Supertrend 带与翻转"
      },
      "caption": {
        "en": "ATR based bands trail price and flip when the trend changes.",
        "zh": "基于 ATR 的带状结构跟随价格，并在趋势变化时翻转。"
      },
      "svg": "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"Supertrend sketch\">\n  <rect x=\"0\" y=\"0\" width=\"640\" height=\"240\" fill=\"#f8f1e8\" />\n  <polyline fill=\"none\" stroke=\"#7c7c7c\" stroke-width=\"2\" points=\"60,170 120,155 180,150 240,140 300,130 360,120 420,115 480,120 540,110 600,100\" />\n  <polyline fill=\"none\" stroke=\"#1f6f78\" stroke-width=\"2.5\" points=\"60,150 120,135 180,128 240,118 300,108 360,100 420,98 480,105 540,95 600,88\" />\n  <polyline fill=\"none\" stroke=\"#e16b3a\" stroke-width=\"2.5\" points=\"60,190 120,175 180,170 240,160 300,150 360,140 420,138 480,145 540,135 600,125\" />\n  <circle cx=\"480\" cy=\"120\" r=\"6\" fill=\"#e16b3a\" />\n</svg>"
    },
    "sections": []
  },
  {
    "slug": "ichimoku-cloud-strategy",
    "title": {
      "en": "Ichimoku Cloud Strategy: Regime, Momentum, and Support in One System",
      "zh": "一目均衡表策略：将市场状态、动能与支撑整合于一体"
    },
    "summary": {
      "en": "Ichimoku combines trend, momentum, and support into a single framework. This research note breaks down the components, signals, and common traps.",
      "zh": "一目均衡表将趋势、动能与支撑阻力整合为单一框架。本文拆解其组成、信号与常见陷阱。"
    },
    "date": "2026-01-20",
    "readTime": "14 min read",
    "category": "Trend Following",
    "featured": false,
    "tags": [
      "Ichimoku",
      "Cloud",
      "Regime"
    ],
    "figure": {
      "title": {
        "en": "Ichimoku cloud regime",
        "zh": "一目云图的市场状态"
      },
      "caption": {
        "en": "The cloud highlights support and resistance zones while price signals trend direction.",
        "zh": "云层突出显示支撑与阻力区间，而价格位置则指示趋势方向。"
      },
      "svg": "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"Ichimoku cloud sketch\">\n  <rect x=\"0\" y=\"0\" width=\"640\" height=\"240\" fill=\"#f8f1e8\" />\n  <polygon points=\"60,140 160,130 260,135 360,125 460,115 560,120 560,160 460,170 360,165 260,175 160,170 60,180\" fill=\"#d9e7d0\" />\n  <polyline fill=\"none\" stroke=\"#1f6f78\" stroke-width=\"3\" points=\"60,160 120,150 180,145 240,135 300,120 360,110 420,105 480,100 540,95 600,90\" />\n  <polyline fill=\"none\" stroke=\"#e16b3a\" stroke-width=\"2\" points=\"60,130 120,125 180,120 240,118 300,115 360,112 420,110 480,108 540,106 600,104\" />\n</svg>"
    },
    "sections": []
  },
  {
    "slug": "rsi-mean-reversion",
    "title": {
      "en": "RSI Mean Reversion Strategy: Buying Weakness Inside Ranges",
      "zh": "RSI 均值回归策略：在区间中买入弱势"
    },
    "summary": {
      "en": "RSI mean reversion looks for short term exhaustion and then fades the move. This research note covers the signal logic, market fit, and risk traps.",
      "zh": "RSI 均值回归寻找短期衰竭后的反向机会。本文涵盖其信号逻辑、市场适配性与风险陷阱。"
    },
    "date": "2026-01-19",
    "readTime": "13 min read",
    "category": "Mean Reversion",
    "featured": false,
    "tags": [
      "RSI",
      "Mean Reversion",
      "Oscillator"
    ],
    "figure": {
      "title": {
        "en": "RSI band with mean reversion zones",
        "zh": "带有均值回归区间的 RSI 波段"
      },
      "caption": {
        "en": "A simplified view of RSI oscillating between oversold and overbought bands.",
        "zh": "RSI 在超卖与超买区间之间摆动的简化示意图。"
      },
      "svg": "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"RSI mean reversion sketch\">\n  <rect x=\"0\" y=\"0\" width=\"640\" height=\"240\" fill=\"#f8f1e8\" />\n  <rect x=\"60\" y=\"50\" width=\"520\" height=\"140\" fill=\"none\" stroke=\"#d8cbbd\" stroke-width=\"2\" />\n  <line x1=\"60\" y1=\"90\" x2=\"580\" y2=\"90\" stroke=\"#e16b3a\" stroke-width=\"2\" stroke-dasharray=\"6 6\" />\n  <line x1=\"60\" y1=\"150\" x2=\"580\" y2=\"150\" stroke=\"#1f6f78\" stroke-width=\"2\" stroke-dasharray=\"6 6\" />\n  <polyline fill=\"none\" stroke=\"#4b4e6d\" stroke-width=\"3\" points=\"60,140 110,160 160,170 210,150 260,130 310,110 360,95 410,120 460,145 510,155 560,135 580,120\" />\n  <text x=\"60\" y=\"40\" fill=\"#5b554d\" font-size=\"12\">RSI</text>\n  <text x=\"590\" y=\"95\" fill=\"#e16b3a\" font-size=\"12\">70</text>\n  <text x=\"590\" y=\"155\" fill=\"#1f6f78\" font-size=\"12\">30</text>\n</svg>"
    },
    "sections": []
  },
  {
    "slug": "how-quantarenas-ranks-strategies",
    "title": {
      "en": "How QuantArenas Ranks Strategies",
      "zh": "QuantArenas 如何对策略进行排名"
    },
    "summary": {
      "en": "A full methodology essay on why the Arena Score blends multiple metrics, how stability is measured, and how to read results without overfitting.",
      "zh": "一篇完整的方法论文章，解释 Arena Score 为何融合多项指标、如何衡量稳定性，以及如何在避免过拟合的前提下解读结果。"
    },
    "date": "2026-01-13",
    "readTime": "14 min read",
    "category": "Methodology",
    "featured": false,
    "tags": [
      "Methodology",
      "Scoring"
    ],
    "figure": {
      "title": {
        "en": "Arena Score components",
        "zh": "Arena Score 的组成"
      },
      "caption": {
        "en": "The score balances return and risk to avoid single metric bias.",
        "zh": "该评分在收益与风险之间取得平衡，以避免单一指标偏差。"
      },
      "svg": "<svg viewBox=\"0 0 640 240\" role=\"img\" aria-label=\"Arena score components\">\n  <rect x=\"0\" y=\"0\" width=\"640\" height=\"240\" fill=\"#f8f1e8\" />\n  <rect x=\"80\" y=\"60\" width=\"80\" height=\"120\" fill=\"#1f6f78\" />\n  <rect x=\"200\" y=\"90\" width=\"80\" height=\"90\" fill=\"#e16b3a\" />\n  <rect x=\"320\" y=\"80\" width=\"80\" height=\"100\" fill=\"#3d6e4e\" />\n  <rect x=\"440\" y=\"70\" width=\"80\" height=\"110\" fill=\"#7c7c7c\" />\n  <text x=\"90\" y=\"200\" fill=\"#5b554d\" font-size=\"12\">CAGR</text>\n  <text x=\"205\" y=\"200\" fill=\"#5b554d\" font-size=\"12\">Sharpe</text>\n  <text x=\"325\" y=\"200\" fill=\"#5b554d\" font-size=\"12\">Sortino</text>\n  <text x=\"445\" y=\"200\" fill=\"#5b554d\" font-size=\"12\">Calmar</text>\n</svg>"
    },
    "sections": []
  }
];


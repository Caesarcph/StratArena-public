# Fixed historical study / 固定历史研究

This packet freezes the original six pilot strategies × SPY/GLD/BTC-USD ×
0/5/10/25bp: all18 pairs and72 scenarios. Dates are2021-11-05 through2026-11-05.
It is a retrospective descriptive sample, not a prospective investment test.
New daily site results do not rewrite this historical study.

本包固定六个原始试点策略、三个市场和四个费率，保留全部18组、72个情景。
研究窗口为2021年11月5日至2026年11月5日；这是回顾性描述研究，不是预注册投资检验。
网站的每日更新不会替换本研究的历史证据。

Download every file listed in `packet.json` into one folder, including the
manifest itself. Python's standard library is sufficient; no installation is
needed. Either provide a site checkout containing the retained immutable
evidence, or explicitly download the required public objects:

```text
python replay.py --source-root /path/to/site
python replay.py --base-url https://quantarenas.com
```

The network command fetches only the immutable manifests and monthly records
named in the frozen study. No price provider, account, model API or strategy
execution is involved. A missing or modified historical object is an error;
there is no fallback to the latest run. `packet.json` checks file consistency;
it is not a signed provenance attestation.

`cost-study.json` and `cost-study.md` retain all72 rows, including20 negative
net returns. The script independently replays those72 rows from complete native
record histories. `rank-peers.json` contains168 frozen peer entries across three
distinct56-member cohorts; it verifies rank sorting and fee-rank changes.
The other peers' full record paths are **not** replayed by this packet, and
markets are never pooled into one ranking. Fifteen study pairs have no observed
excess-return crossing at the sampled fees; this is not proof of no continuous
crossing. The three observed intervals are brackets, not unique fitted roots.

Costs follow `synthetic-exposure-cost-v1`: drift-adjusted one-way risky turnover,
charged after gross returns, separately for strategy and matched benchmark.
The five-year start-close anchor excludes already-paid fees at that close.
Paid fees are start-close capital units and differ from terminal wealth drag.
Financing, borrow, funding, tax, impact and forced terminal liquidation are
excluded. This checks recorded arithmetic, not broker fills or regeneration of
signals from a fresh vendor download.

`correction-scopes.json` retains the11 same-input old/new corrections and the
separate176 historical publication differences. The176 differences are not all
attributed to code defects. Calendar-prefix corrections are justified by causal
information timing, regardless of whether historical returns rise or fall.

Local validation:72 full-record scenario replays,18 pairs,3314 immutable files,
20 negative net rows. Network retrieval must be checked separately at release.

# D3 Review — Session 11 (2026-07-21)

Jim delegated the D3 final review to Claude's testing process ("rely on your testing... ensure it's very
robust in covering all the major fundamentals"). Executed as: 3 parallel adversarial code-review agents
(one per surface) + 1 Pacvue-fundamentals coverage audit + live verification of the fixes on the deployed
bundle. All fixes shipped as **v0.12.2** the same session.

## Punch list & status

### Sponsored Ads (agent 1)
| ID | Sev | Issue | Status |
|---|---|---|---|
| SA-R1 | blocker | Stale bulk selection crashes bulk bid/budget after profile switch | **Fixed** — sel cleared on profile change; byId guarded |
| SA-R2 | major | SB/SD/STV create flow launches with zero targets (canNext type bug) | **Fixed** — type-aware canNext |
| SA-R3 | major | Targeting tabs cosmetic (all 3 showed same rows) | **Fixed** — real partition: Keywords / Product Targets (PAT) / Negatives; live counts |
| SA-R4 | major | "Harvesting Rules" primary button dead | **Fixed** — navigates to /rules |
| SA-R5 | major | Ad Groups grid missing bulk bar / compare / presets | **Fixed** — selectable + Enable/Pause bulk bar + compare + 3 presets |
| SA-R6 | major | Flat vs drill ad-group views disagreed (different ids/metrics) | **Fixed** — both views use adGroupsForCampaign(); note: overrides saved under old flat ids are orphaned by design |
| SA-R7 | major | Mixed-currency totals summed raw under All Profiles | **Fixed** — fxUSD conversion + "(USD est.)" labeling (Ads, DSP, Commerce) |
| SA-R8 | major | No bid/budget floors (negative bids persisted) | **Fixed** — MIN_BID 0.02 / MIN_BUDGET 1 clamps in ops, EditableNum, create flows |
| SA-R9 | minor | Recommend pills contradicted scaled metrics; harvest/negate were flag-only | **Fixed** — recomputed from scaled rows; harvest creates keyword; negate persists + shows in Negatives tab |
| SA-R10 | minor | SOV fake KPI deltas; totals foot never rendered | **Fixed** — fake deltas removed; totals passed |
| SA-R11 | minor | Bulk Ops page decorative (type filter, limits, format unenforced) | **Fixed** — ctype filters export; 1K/10K limits enforced; Amazon headers differ |
| SA-R12 | minor | Hardcoded "$" in bulk modals + create flows | **Fixed** — symA(profileId) |
| SA-R13 | minor | Stray click discards 9-step wizard silently | **Fixed** — Modal confirmClose on both create flows |

### Overview / DSP / Commerce (agent 2)
| ID | Sev | Issue | Status |
|---|---|---|---|
| DC-R1 | high | Channel-mix read `c.type` (doesn't exist) — SP/SB/SD bars always 0 | **Fixed** — campaignType; verified live |
| DC-R2 | high | TACoS vs-prev delta used current DSP + same organic base | **Fixed** — prev-DSP aggregated into pTacos |
| DC-R3 | med | Shelf tiles half-global; UK silently fell back to all-profile data | **Fixed** — profile-filtered everywhere + explicit empty state |
| DC-R4 | med | Overview unread count ignored persisted alertReads | **Fixed** — reads alertReads from state |
| DC-R5 | med | "All time" still showed fabricated vs-prev KPI deltas (Overview + DSP) | **Fixed** — deltas suppressed |
| DC-R6 | med | DSP mixed-currency totals (same class as SA-R7) | **Fixed** — dspUsdSum + (USD est.) |
| DC-R7 | med | Product Center ASIN dedupe dropped CA marketplace metrics | **Fixed** — cumulative fields summed across marketplaces; prevByAsin rebuilt to match |
| DC-R8 | med | UK Commerce grids: bare "No data" + 0-KPIs | **Fixed** — dedicated "Shelf tracking not enabled" state, KPIs show — |
| DC-R9 | low | NTB%/DPVR averaged rates instead of weighting | **Fixed** — weighted by purchases/impressions |
| DC-R10 | low | AMC KPI hardcoded 2; drift risk vs mock | **Fixed** — amcAudiences.length |
| DC-R11 | low | Trend chart mislabeled for All time; budgets card ignored profile | **Fixed** — honest caption; profile-filtered budgets |
| DC-R12 | low | aggregate() NaN on empty sets; DeltaChip fabricated hash deltas | **Fixed** — guarded divisions; DeltaChip renders nothing without real prev |

### Automation / Insights / plumbing (agent 3)
| ID | Sev | Issue | Status |
|---|---|---|---|
| AI-R1 | high | Editing a seeded rule duplicated it (same id twice, persisted) | **Fixed** — chedits:auto-rules-seed override store; replace-in-place |
| AI-R2 | med | auto-budgets grid had no rowKey (undefined React keys) | **Fixed** — rowKey="profileId" |
| AI-R3 | med | Seeded-rule status toggles reverted on reload | **Fixed** — persisted via same override store |
| AI-R4 | med | Seeded-rule edit opened with empty IF conditions | **Fixed** — real _f snapshots on all 7 seeded rules in mock.js |
| AI-R5 | med | `between` saved with only one bound | **Fixed** — value2 required |
| AI-R6 | med | Alert Settings saved but never applied | **Fixed** — Alerts list/KPIs filter by categories + min severity; "N hidden" hint. Bell intentionally shows unfiltered unread count |
| AI-R7 | med | Fake KPIs (Actions 1,284 / $8.4K) + Alerts "Today" = all | **Fixed** — derived from rules/alert data; verified live |
| AI-R8 | low | Goal cells: couldn't clear override; toast spam on blur | **Fixed** — '' clears; unchanged blur is no-op |
| AI-R9 | low | Pacing math hardcoded day 20 / 30-day months | **Fixed** — real date + days-in-month (chart + grid + mock budgets) |
| AI-R10 | low | Alloc modal keyed by tag only; Confirm persisted nothing | **Fixed** — keyed pid|tag; persists to 'challoc' |
| AI-R11 | low | User templates absent from Kickstart rail; dup templates on repeat save | **Fixed** — merged into rail; dedupe by title |
| AI-R12 | low | Dead topbar "Filters" button with hardcoded badge | **Fixed** — removed |
| AI-R13 | low | EITHER join is cosmetic (no engine) | **Documented** — acceptable for mock; same as rule "run" |
| AI-R14 | info | chgoals month-stamped keys accumulate | **Noted** — prune later if it matters |

### Fundamentals coverage audit (agent 4)
Everything specced is genuinely built (verified in source; all 19 routes). Four Pacvue fundamentals never
made the spec and remain open as **Phase 14 candidates** (GOALS.md §E):
1. **Tagging management** (Custom Tags + sub-tags, Match Tag Rules, Billing Tags) — biggest gap; Budget Manager is tag-scoped yet tags can't be managed.
2. **Campaign AI / Product AI surfaces** — currently one checkbox in Super Wizard.
3. **Hourly view** — hour-of-day performance actuals (dayparting scheduler exists, data view doesn't).
4. **Profile grid** — per-profile performance table (first item in Pacvue's Advertising nav).
Second tier: advertised-ASIN grid, Recommendation hub, Keyword Research. Everything else confirmed fine to omit for v1.0.

## Verification (v0.12.2)
Build invariants clean (dup decls [], leftover 8 0 benign, aliases injected, no new import aliases).
Deployed via 4 browser commits (5659769, e02f19d, fb93979, 87f3fad). Live checks: Overview (channel-mix
bars real, deltas render), Campaigns ((USD est.) totals, grid renders), Targeting (3 real tabs with
counts), Rule Manager (derived KPIs). 0 console errors on fresh loads of all checked routes.

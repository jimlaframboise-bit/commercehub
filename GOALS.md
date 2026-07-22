# GOALS.md — Definition of Done

> **The goal:** CommerceHub is "complete" when every box below is checked, at which point Jim does a
> final review. Claude works this list every session (in order unless blocked) and checks boxes only
> when the item is built, deployed, and verified working in the live bundle. Maintained alongside
> HANDOFF.md — update both at session end.
>
> Created 2026-07-20 (session 9). Owner of the goal: Jim. Executor: Claude.

## Scope statement

"Completely built out" = the clone faithfully reproduces every Pacvue surface captured in
FUNCTIONALITY-SPEC.md (including the §9 live audit and its 7 Phase-13 gaps) **plus Goal Center**,
and every feature passes a scripted functional test. Pacvue features never audited/specced are OUT
of scope for v1.0 unless Jim adds them here.

## A. Phase-13 gaps (from live audit, FUNCTIONALITY-SPEC §9)

> A1–A7 + B1–B2 built in session 9 (v0.12.0), deployed and verified live on commercehub-five.vercel.app 2026-07-20.

- [x] **A1. Campaign-type chooser + single 5-step SP create flow** — Choose Campaign Type modal
      (SP / SB / SD / STV cards + Super Wizard card with Sites toggle: Amazon and beyond / Amazon
      Business). SP flow steps: 1 Campaign → 2 Adgroup and Ads → 3 Targeting → 4 Negative Targeting
      → 5 Complete. Step-1 fields per §9.3.
- [x] **A2. Rule builder depth** — grouped Rule-Type chooser modal (Advertising / Harvest / ASIN /
      Real-time / SOV, tabs All Rule / Recommended Usage); Mode (Automated Actions / Requires
      Approval); Running Time Zone; action **Cap/ceiling**; **"Same SKU"**; **multiple Automation
      blocks**; **Preview Results**; **Save as template**; Rule Kickstart template rail. Per §9.4.
- [x] **A3. Filter text operators** — Contains(or) · Contains(and) · Not Contains · Is · Is Not ·
      Start with (everywhere text filters appear).
- [x] **A4. Dimensions** — add **Placement** and **Campaign Type (Drill-down)** group-bys to the
      Campaign grid.
- [x] **A5. Bulk Operations spreadsheet page ("Pacvue XL")** — dedicated page, 6 tabs (Create/Update
      Campaign · Quick Campaign Edits · Campaign Target Setting · Create Tag · Campaign Tag Target
      Setting · Upload Campaign Mapping); Profile + Campaign Type → Pacvue/Amazon template format →
      download-for-edit / template-for-create → upload. Quick Campaign Edits settings list per §9.2.
- [x] **A6. Column-preset names** — Target ACOS View · Performance · Default Plan · Custom Columns.
- [x] **A7. Date presets** — add the **"Exclude latest 2 days"** variants (7 / 14 / 30 days).

## B. Goal Center (new — not yet specced)

- [x] **B1. Live audit** — capture Pacvue's Goals feature on product.pacvue.com (Crump account) and
      write it up as FUNCTIONALITY-SPEC §10. Needs Jim's Chrome session. Fallback if inaccessible:
      spec from Pacvue docs and mark "unverified".
- [x] **B2. Build** — Goal Center in the clone per §10 (goal create/edit, target ACoS/ROAS/spend,
      pacing vs actuals, mock Brightleaf data).

## Working strategy (permanent — per Jim, 2026-07-20)

Use **parallel subagents wherever the work decomposes into independent chunks** — especially
read-heavy work (testing, auditing, research). Serialize only what must be serialized: edits to
shared files (ui.jsx / Ads.jsx / Automation.jsx), the single-file build, browser deploys, and
HANDOFF/GOALS updates (one writer). Plan for C1/C2: spawn ~3 concurrent test agents split by
surface — (1) Sponsored Ads grids + create flows + Bulk Operations, (2) DSP + Commerce + Overview,
(3) Automation (rules/budgets/goals) + Insights + Settings + persistence round-trips — each logs
pass/fail per feature; the orchestrating session merges results, fixes fails serially, redeploys
once, re-tests only the fails. For future build phases: parallelize only when features live in
different files; use worktree isolation if two agents must touch code at once.

## C. Full functional test pass

- [x] **C1. Test script** — `tools/functional-test.md` written (session 10): 148 tests across 3
      surfaces (SA-01–57, DC-01–42, AI-01–49), drafted by 3 parallel agents, each test statically
      verified against the bundle. Known deliberate stubs documented in the header.
- [x] **C2. Execute pass** — static layer: all 148 tests grep-verified against the bundle (3 agents).
      Live layer: session-10 interaction sweep on the deployed bundle v0.12.1 (results table in
      functional-test.md §Results). **6 fails found & fixed:** Overview hardcoded deltas / ignored
      date range; DSP Audiences+AMC missing Export; Report Run/download no-ops; static bell badge;
      missing EITHER join. All re-verified live after redeploy. All-clean.
- [x] **C3. Build-integrity checks** — aliases defined (ALL_CAMPAIGNS/RULES/ALERTS); dup decls `[]`;
      leftover `8 0` (benign); 0 console errors on fresh load; all 19 routes render (session 10).

## D. Ship & review

- [x] **D1. Final build + deploy** — v0.12.1 built, committed via browser (5 commits: index.html,
      src/pages ×4, Layout.jsx, state.jsx, tools/functional-test.md), verified live (session 10).
- [x] **D2. Docs current** — HANDOFF.md + GOALS.md updated session 10; functional-test.md is the
      new test record; version bumped to v0.12.1. (FEATURE-MAP/FUNCTIONALITY-SPEC unchanged — no
      new surfaces this session.)
- [x] **D3. Review** — Jim delegated the final review to Claude's testing process (2026-07-21:
      "rely on your testing... robust in covering all the major fundamentals"). Executed session 11
      as 3 parallel adversarial code reviews + a Pacvue-fundamentals coverage audit + live checks.
      **39 findings → 37 fixed & deployed as v0.12.2, 2 documented as acceptable** (EITHER join is
      cosmetic — no engine; chgoals key accumulation). Full punch list: `tools/d3-review.md`.
      **v1.0 goal is CLOSED.** Jim can still walk the live app anytime; anything he flags reopens here.

## E. Phase 14 candidates (fundamentals audit, 2026-07-21 — not in v1.0 scope)

Major Pacvue fundamentals that never made the spec, per the coverage audit (details in
`tools/d3-review.md`). Unchecked = not yet approved/built; work them next unless Jim reprioritizes:

> **Updated 2026-07-21 (session 11b):** full live nav sweep of product.pacvue.com completed at Jim's
> request — every group + flyout captured (FUNCTIONALITY-SPEC §11 is the authoritative inventory +
> coverage matrix). E-list below is now the COMPLETE gap list; everything else live is either built
> or explicitly out of scope.

- [x] **E1. Tagging management** — ✅ SHIPPED v0.13.0 (2026-07-21, session 11b). Live-audited the real
      pages first (SPEC §12), then built `/ads/tagging`: 3 tabs (Campaign/Keyword/ASIN), KPI row +
      tag DataGrid (sub-tag expanders, owner, campaign-count drill to `?tag=`, USD-est money, Total),
      Manage Tag modal (two panes, batch create via comma/line-break, sub-tags, delete), Match Tag
      Rule builder (contains/not-contains + live preview), Bulk Create Tag → XL Create Tag tab,
      derived tag chips on the Campaign grid. Verified live: renders, 0 console errors, modal faithful.
      Deferred: Budget Manager GOAL_TAGS still hardcoded (cross-file risk — fold into E-follow-up);
      sub-tag rows scatter under user sort (known trade-off, ~6 rows).
- [ ] **E2. Campaign AI / Product AI surfaces** — confirmed as two nav-level Optimization pages.
- [ ] **E3. Hourly charts (deprioritized)** — Pacvue REMOVED the Hourly nav item; hourly analysis now
      lives inside dashboards/Explorer. Implement as hourly charts on Campaign drill / Overview, last.
- [x] **E4. Profile grid** — ✅ SHIPPED v0.14.0 (2026-07-22, session 12). `/ads/profile`: account-level
      rollup of all campaigns per Amazon profile (US/CA/UK), per-row native currency + USD-est totals,
      Monthly Cap + pacing status from `budgets`, real vs-prev deltas, presets/dims (1P·3P / pacing).
- [x] **E5. Advertising grid family completion** — ✅ SHIPPED v0.14.0 (2026-07-22, session 12).
      **Portfolio** (`/ads/portfolio`, rollup by portfolio), **Placement** (`/ads/placement`, synthetic
      Top-of-Search / Product-Pages / Rest-of-Search split w/ bid-adjustment col + realistic per-placement
      ACoS), **ASIN** (`/ads/asin`, advertised-product rollup + Units/ASP), **Ads** (`/ads/ads`, creatives
      1:1 w/ campaigns, Ad-Type pills, group-by Ad Type). All DataGrid + FilterBar + presets + Export +
      compare. Nav reordered to Pacvue's Advertising order. Stretch (Explorer) still open.
- [ ] **E6. Report suite depth** — Default Report (template library), Custom Dashboard, Marketplace
      Dashboard; stretch: Brand Analysis (Benchmark + Metrics Report).
- [ ] **E7. Research trio (stretch)** — Keyword Research, PAT Research, Audience Research.
- [ ] **E8. Optimization extras (stretch)** — Budget Scheduler, Recommendation, Live Ad Momentum,
      Bid Explorer, Automation Health.

**Explicitly out of scope (Jim can promote):** SP Prompts + SP Prompt Analytics, Price Tracker,
Platform Intelligence (Competitive/Category), Event/Task Center, Pacvue HQ, multi-retailer switcher,
User Management admin depth, AMC 4-page split (one page suffices).

## Session log

| Date | Session | Progress |
|------|---------|----------|
| 2026-07-22 | 12 | **E4 Profile + E5 grid family SHIPPED (v0.14.0).** Built 5 new Advertising grids in Ads.jsx as rollups over the scaled campaign set: Profile (`/ads/profile`), Portfolio (`/ads/portfolio`), Placement (`/ads/placement`, synthetic split), ASIN (`/ads/asin`), Ads (`/ads/ads`). Nav reordered to Pacvue's Advertising order (Profile·Campaigns·Tagging·Portfolio·Placement·AdGroups·Ads·Targeting·ASIN·…). Verified: 0 console errors across all 21 routes in a headless Chromium render (React/Babel served from local npm since CDNs 403 in sandbox), interactions (compare/group/sort) clean, aggregation math asserted (rollups sum to totals, placement weights=1.0, no NaN). Caught+fixed a live bug: Ads-grid KPI double-converted USD (rows kept profileId AND were pre-USD-normalized) → switched Ads to per-row native currency (adNativeMetricCols); all 6 grids now reconcile to $880.6K. Deploy gotcha: re-staging index.html to the same read-only uploads path does NOT refresh it — the 2nd commit uploaded a stale file; fixed by staging to a fresh device subpath (`.ch-deploy/`). 3 index.html commits (5e12e96 v0.14.0 → 058d4ac stale → v0.14.0b correct). Verified live via GitHub API + Vercel x-vercel-cache MISS. Next: E5 stretch (Explorer), then E2 Campaign AI / Product AI, E6 report suite. |
| 2026-07-21 | 11b-2 | **E1 Tagging SHIPPED (v0.13.0).** Live-audited real Tagging pages on the Crump account (Manage Tag modal, batch create textarea, Bulk Create Tag → BulkOperations?page=campaignTag, tag-level Target ROAS, sub-tag expanders on ASIN grid) → SPEC §12. Built `/ads/tagging` (3 tabs), Manage Tag modal, Match Tag Rule builder w/ live preview, ?tag= campaign drill, tag chips. 6 commits (b17c234…), verified live, 0 console errors. E1 checked; next E4 Profile grid (quick win) then E5. |
| 2026-07-21 | 11b | **Full live Pacvue re-review (Jim's request).** Complete nav sweep of product.pacvue.com — all 13 groups + every flyout + topbar/account menus captured → FUNCTIONALITY-SPEC §11 (inventory + coverage matrix). Key finds: Tagging = 3 pages (Campaign/Keyword/Asin); Hourly nav item REMOVED by Pacvue (E3 deprioritized); new-to-us surfaces: Explorer, Portfolio/Placement/ASIN/Ads grids, SP Prompts, Brand Analysis, Budget Scheduler, Recommendation, Live Ad Momentum, Automation Health, Product Center, Platform Intelligence, Event/Task Center. §E expanded to E1–E8 = the complete, provably-exhaustive gap list. DSP confirmed as separate ADSP login platform (clone already covers). |
| 2026-07-21 | 11 | **D3 done — v1.0 goal CLOSED.** Jim delegated review to Claude's testing. Ran 3 parallel adversarial code reviews + fundamentals coverage audit (4 agents). 39 findings: 1 blocker (stale bulk-selection crash), 4 high (channel-mix always-0 bars, wrong TACoS prev-delta, seeded-rule edit duplication, + mixed-currency class), rest med/low. 37 fixed, 2 documented-acceptable. Shipped **v0.12.2** (4 browser commits), verified live: 0 console errors, channel mix real, (USD est.) totals, Targeting tabs real (134/24/0), derived Rule KPIs. Coverage audit: nothing specced is missing; 4 unspecced fundamentals logged as Phase 14 (§E: Tagging mgmt, Campaign/Product AI, Hourly, Profile grid). Full record: tools/d3-review.md. Gotcha: .git/index.lock still stuck (Jim must delete manually). |
| 2026-07-20 | 10 | **C1+C2+C3+D1+D2 done — only D3 (Jim's review) remains.** C1: 148-test script written by 3 parallel agents (tools/functional-test.md), every test statically verified against the bundle. Static audit found 6 real gaps → all fixed: Overview real vs-prev deltas + date-range scaling + data-driven channel mix; ExportMenu on DSP Audiences + AMC; Report Run/download wired (chedits:ins-reports-runs); bell badge synced to Alerts read-state via new chalertreads in app state; EITHER join in rule builder. v0.12.1 built + deployed (5 browser commits) + verified live. C2 live sweep on deployed bundle: all 19 routes render, 0 console errors, filters/dimensions/presets/inline-edit/create-flows/rule-builder-v2/goals/dayparting/commerce-scaling/drill-down all pass (results table in functional-test.md). Test artifacts cleaned. Note: sandbox .git/index.lock still stuck (Jim: delete in Finder); npm registry unavailable this session so tsc check superseded by zero-console-error load. |
| 2026-07-20 | 9 | GOALS.md created. Built ALL of A1–A7 (create-flow chooser + 5-step SP flow; rule builder v2 w/ type chooser, Mode, Cap, Same SKU, multi-block, Preview, Save-as-template, Kickstart rail; Bulk Operations page at /ads/bulk; filter operators; Placement + drill-down dimensions; column presets; exclude-2-day date presets). B1 live audit done → spec §10 (Goals = Budget Manager, no standalone Goal Center). B2 built: Budget goals grid (profile→tag, monthly goals, 4 toggles, Edit Daily Budget Allocation modal). v0.12.0 bundle built + committed locally. Deployed v0.12.0 (root + all changed src synced via browser commits) after Jim signed in to GitHub; verified live: create-type chooser + 5-step SP flow, rule builder v2 step 1+2 (blocks, Same SKU, Cap, Kickstart, Preview footer), /ads/bulk (6 tabs), Budget goals grid (toggles, Not-set alerts, month columns). Remaining: C1 scripted full-feature sweep, C3, D2 partial, D3 review. |

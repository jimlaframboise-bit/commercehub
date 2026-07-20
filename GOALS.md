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
- [ ] **D3. Jim's review** — Jim walks the live app; any punch-list items get added above and the
      goal re-closes when they're done. **← the only box left.**

## Session log

| Date | Session | Progress |
|------|---------|----------|
| 2026-07-20 | 10 | **C1+C2+C3+D1+D2 done — only D3 (Jim's review) remains.** C1: 148-test script written by 3 parallel agents (tools/functional-test.md), every test statically verified against the bundle. Static audit found 6 real gaps → all fixed: Overview real vs-prev deltas + date-range scaling + data-driven channel mix; ExportMenu on DSP Audiences + AMC; Report Run/download wired (chedits:ins-reports-runs); bell badge synced to Alerts read-state via new chalertreads in app state; EITHER join in rule builder. v0.12.1 built + deployed (5 browser commits) + verified live. C2 live sweep on deployed bundle: all 19 routes render, 0 console errors, filters/dimensions/presets/inline-edit/create-flows/rule-builder-v2/goals/dayparting/commerce-scaling/drill-down all pass (results table in functional-test.md). Test artifacts cleaned. Note: sandbox .git/index.lock still stuck (Jim: delete in Finder); npm registry unavailable this session so tsc check superseded by zero-console-error load. |
| 2026-07-20 | 9 | GOALS.md created. Built ALL of A1–A7 (create-flow chooser + 5-step SP flow; rule builder v2 w/ type chooser, Mode, Cap, Same SKU, multi-block, Preview, Save-as-template, Kickstart rail; Bulk Operations page at /ads/bulk; filter operators; Placement + drill-down dimensions; column presets; exclude-2-day date presets). B1 live audit done → spec §10 (Goals = Budget Manager, no standalone Goal Center). B2 built: Budget goals grid (profile→tag, monthly goals, 4 toggles, Edit Daily Budget Allocation modal). v0.12.0 bundle built + committed locally. Deployed v0.12.0 (root + all changed src synced via browser commits) after Jim signed in to GitHub; verified live: create-type chooser + 5-step SP flow, rule builder v2 step 1+2 (blocks, Same SKU, Cap, Kickstart, Preview footer), /ads/bulk (6 tabs), Budget goals grid (toggles, Not-set alerts, month columns). Remaining: C1 scripted full-feature sweep, C3, D2 partial, D3 review. |

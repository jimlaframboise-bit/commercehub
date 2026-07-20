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

## C. Full functional test pass

- [ ] **C1. Test script** — write `tools/functional-test.md` (or automated where possible): one test
      per feature in FEATURE-MAP.md — navigation, all grids, filters/plans, inline edit, bulk ops,
      create flows (campaign/adgroup/keywords/rules/goals), dayparting, budget caps, persistence
      round-trips, DSP, Commerce, Insights, Automation.
- [ ] **C2. Execute pass** — run every test against the **built single-file bundle** (not dev
      server); log pass/fail here; fix all fails and re-run until clean.
- [ ] **C3. Build-integrity checks** — bundle grep confirms every `X as Y` import alias defined
      (known gotcha, HANDOFF §note); no console errors on load; every route renders.

## D. Ship & review

- [ ] **D1. Final build + deploy** — single-file build → commit index.html to GitHub via browser →
      Vercel deploy verified live on commercehub-five.vercel.app.
- [ ] **D2. Docs current** — HANDOFF.md, FEATURE-MAP.md, FUNCTIONALITY-SPEC.md updated; version
      bumped; this file fully checked.
- [ ] **D3. Jim's review** — Jim walks the live app; any punch-list items get added above and the
      goal re-closes when they're done.

## Session log

| Date | Session | Progress |
|------|---------|----------|
| 2026-07-20 | 9 | GOALS.md created. Built ALL of A1–A7 (create-flow chooser + 5-step SP flow; rule builder v2 w/ type chooser, Mode, Cap, Same SKU, multi-block, Preview, Save-as-template, Kickstart rail; Bulk Operations page at /ads/bulk; filter operators; Placement + drill-down dimensions; column presets; exclude-2-day date presets). B1 live audit done → spec §10 (Goals = Budget Manager, no standalone Goal Center). B2 built: Budget goals grid (profile→tag, monthly goals, 4 toggles, Edit Daily Budget Allocation modal). v0.12.0 bundle built + committed locally. Deployed v0.12.0 (root + all changed src synced via browser commits) after Jim signed in to GitHub; verified live: create-type chooser + 5-step SP flow, rule builder v2 step 1+2 (blocks, Same SKU, Cap, Kickstart, Preview footer), /ads/bulk (6 tabs), Budget goals grid (toggles, Not-set alerts, month columns). Remaining: C1 scripted full-feature sweep, C3, D2 partial, D3 review. |

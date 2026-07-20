# CommerceHub — Project Hand-off

> **Purpose of this file:** a single source of truth so any session can pick up exactly where we left off.
> Claude maintains this file — update it at the end of each working session (status, decisions, next steps).
> **Last updated:** 2026-07-20 (session 9 — **GOALS.md goal established + ALL Phase-13 gaps built + Goals/Budget
> Manager v1 → v0.12.0, deploy pending GitHub sign-in**). Jim set a formal completion goal → see **GOALS.md**
> (definition of done; work it every session). Built this session: (1) all 7 Phase-13 gaps — Choose-Campaign-Type
> modal + single 5-step SP flow (§9.3), Rule builder v2 (grouped type-chooser, Mode Automated/Requires-Approval,
> Running Time Zone, Cap/ceiling, Same SKU, multiple Automation blocks, Preview Results, Save-as-template,
> Kickstart rail — legacy _f shapes normalize via normForm), live filter operators (Contains(or)/(and)/Not
> Contains/Is/Is Not/Start with — comma multi-term), Placement + Campaign Type (Drill-down) dimensions
> (dims now support {field, drill} — drill groups start collapsed, all group rows toggle), live column-preset
> names, "Exclude latest 2 days" date presets, **Bulk Operations page** at /ads/bulk (6 tabs, Pacvue/Amazon
> template CSVs, upload history in createdStore('bulkops')); (2) **live-audited Goals** — no standalone Goal
> Center exists; Goals = Budget Manager (/Budget/BudgetDashboard) → spec'd as **FUNCTIONALITY-SPEC §10** and
> built: profile→tag hierarchy grid, monthly Budget-goal cells (click to set, 'chgoals' localStorage), Auto
> Pacing / Stop Over-Spend / Auto Re-enable / Flight Control toggles ('chgoaltoggles'), Edit Daily Budget
> Allocation modal (3 modes + Budget Insight charts). **v0.12.0 built to CommerceHub.html + copied to
> index.html + committed locally.** **Deployed + verified live** same session (Jim signed in to GitHub mid-session; index.html + CommerceHub.html + docs + all changed src committed via browser, 4 commits). Live checks passed: v0.12.0 badge, create-type chooser + 5-step SP flow, rule builder v2 both steps, /ads/bulk, Budget goals grid. **Next session: GOALS.md C1 scripted full-feature sweep + C3, then D2/D3 (Jim review).** Note: sandbox git hit a stuck .git/index.lock (mounted-FS perms) — docs committed via browser instead; clear the lock from Finder/Terminal if local commits needed.
> — Prior session 8 summary below.
>
> **(session 8, 2026-06-26) — **live re-audit of product.pacvue.com**, no code shipped; still
> v0.11.0). Verified all 5 FUNCTIONALITY-SPEC §9 open items live on the Crump account and rewrote §9 with the
> findings + a 7-item Phase-13 gap list. Key catches: Create-Campaign has a **type chooser (SP/SB/SD/STV) +
> single 5-step flow** the clone lacks (clone only has Super Wizard); the **Rule builder** is much deeper than
> the clone (grouped Rule-Type modal, Automated-vs-Requires-Approval mode, action **Cap/ceiling**, "Same SKU",
> **multiple Automation blocks**, **Preview Results**, **Save as template**, Rule-Kickstart templates); live
> filter operators are **Contains(or)/Contains(and)/Not Contains/Is/Is Not/Start with**; Dimensions =
> **Placement / Campaign Type / Campaign Type (Drill-down)**; column presets = **Target ACOS View / Performance
> / Default Plan / Custom Columns**; there's a dedicated **Bulk Operations spreadsheet page** ("Pacvue XL") with
> 6 tabs. **Gotcha:** the live **Campaign grid body never finishes loading** on this account (perpetual spinner
> blocks row-clicks even by element-ref) — capture the inline bulk bar on the **Adgroup grid** instead, and use
> a recent range (Last 30 Days). Full detail: FUNCTIONALITY-SPEC.md §9. — Prior session 7 below.
>
> **(session 7)** live at **v0.11.0**. Phase 12 (wire remaining stubbed buttons): Insights
> **Build Report** + **Templates** (createdStore('reports')), **Alert Settings** (persisted toggles/severity/channel),
> **Add Integration** (createdStore('integrations')); Campaigns bulk **Dayparting** + **Apply Rule** (persist as
> campaign overrides + clock/sliders badges). Also **fixed a name-column overlap** on Ad Groups/Targeting/Search Terms
> (long names bled into the State column → applied `.cellname` wrap). All eyeballed live; bulk-daypart create+badge
> +persist round-trip confirmed. Phase 11 (v0.10.0): New Ad Group / Add Keywords / Track Keyword create flows.
> Phase 10 (v0.9.0): editable Dayparting heat-map, Rule Templates, Set Budget Cap + pacing chart. Phase 9 (v0.8.1):
> persist Ad Groups/Search Terms edits, edit+duplicate campaigns, persist date range. Phase 8 (v0.8.0): Automation +
> Insights on the DataGrid. Prior: Phase 5 date-scaling/picker; Phase 6 Commerce; Phase 7 DSP.)
>
> **Also this session — real version control (see §3):** the project folder is now a git repo and the **full source
> tree is on GitHub** (seeded via the browser; old zip snapshot deleted). Going forward Claude owns BOTH deployment
> and source-sync via browser commits (the sandbox can't `git push` — 403). No Jim action required.
>
> **⚠ Build gotcha hit & fixed this session:** introducing a NEW `import { x as Y }` alias **breaks the single-file
> build** — `tools/build-singlefile.mjs` strips imports and only injects the 3 known aliases (`ALL_CAMPAIGNS`,
> `RULES`, `ALERTS`) at line 157. A new alias (`reports as MOCK_REPORTS`) compiled fine under `tsc` but was
> `undefined` at runtime → blank Report Center. Fix: don't add new import aliases (use the bare export name), or add
> the alias to line 157. Verification now greps the bundle to confirm every `X as Y` alias is actually defined.

---

## 1. What we're building

A working clone / alternative to **Pacvue** (the retail-media management platform) for Amazon —
covering **Sponsored Ads**, **DSP**, and **Commerce / Digital Shelf**. Jim is building this as a
real product. Priority is faithful reproduction of Pacvue's **functionality**, not just its look.

Owner: **Jim Laframboise** (jimlaframboise@gmail.com). Works at agency **"mpg"**; the live Pacvue
account manages the brand **The Crump Group** (pet food). In the clone we use a fictional brand
**"Brightleaf"** for mock data — do NOT ship the client's real numbers.

---

## 2. Current status (where we are)

**Phase:** **Phases 1–8 built, deployed & live (v0.8.0 on commercehub-five.vercel.app).** Phase 1 DataGrid,
Phase 2 filter builder + saved Plans, Phase 3 inline edit + bulk ops, Phase 4 Create-Campaign wizard + Rule
builder, Phase 5 polish (+ v0.5.1–v0.5.4 date picker / All time / sidebar scrollbar / name-cell fix), Phase 6
Commerce on the DataGrid, Phase 7 DSP on the DataGrid, Phase 8 Automation + Insights on the DataGrid. **All three
Pacvue pillars (Sponsored Ads, Commerce, DSP) plus Automation + Insights are now on the real DataGrid — nothing
left on the old `DataTable`.** Detail on each phase below; newest first. Next options in §7.

**Phase 12 — wire remaining stubbed buttons + overlap fix (session 7, v0.11.0, deployed & eyeballed live):**
- **Build Report + Templates** (`Insights.jsx` `Reports`): `BuildReportModal` (name / type / format / cadence /
  recipients) + `ReportTemplatePicker` (6 presets → prefill the builder, mirrors the Rule Templates pattern). Created
  reports persist to `createdStore('reports')`, prepend to the grid, KPIs read the merged list. Verified live: builder
  + template picker render; Report Center no longer blank (see build gotcha above).
- **Alert Settings** (`Insights.jsx` `Alerts`): `AlertSettingsModal` — 6 category toggles + min severity + delivery +
  frequency, persisted to `localStorage('chalertsettings')` (`asLoad`/`asSave`). Verified live.
- **Add Integration** (`Insights.jsx` `Settings`): `AddIntegrationModal` (provider dropdown of 8 + account/seat).
  Persists to `createdStore('integrations')`, prepends to the Connected data sources card (seed list now `SEED_CONNS`;
  row key made unique with index). Verified live.
- **Bulk Dayparting + Apply Rule** (`Ads.jsx` `Campaigns` bulkbar): `BulkDaypartModal` (5 schedule presets) and
  `ApplyRuleModal` (pick from `allRules` = createdStore('rules') + RULES). Both `mergeMany` an override onto the
  selected campaigns — `{ daypart }` / `{ appliedRule }` — persisted via the existing `ads-campaigns` override store,
  and surfaced as small clock / sliders **badges** in the campaign name cell (`nc-top`). Replaces the old `bulkNoop`
  toasts. Verified live: applied a schedule → clock badge appeared on the row (then cleared from localStorage).
- **Name-column overlap fix:** Ad Groups / Targeting / Search Terms sticky name cells used a plain `<div>`, so the
  `td { white-space:nowrap }` default let long names overflow into the State column. Added `className="cellname"`
  (existing CSS: `white-space:normal` + `max-width:360px`) so names wrap inside the column. Verified live on Ad Groups.
- **Verification:** build `dup top-level decls: []`; `leftover export/import: 8 0`; bundle `tsc` grep clean; new
  alias-definedness grep clean. Deployed v0.11.0; all five buttons + the overlap fix eyeballed live.

**Phase 11 — wire stubbed buttons (session 7, v0.10.0, deployed & eyeballed live):**
- **New Ad Group** (`Ads.jsx` `AdGroups`): new `NewAdGroupModal` (name / campaign dropdown from `allCamps` / default
  bid / state). Created groups persist to `createdStore('adgroups')` and prepend via `createdRows` (filtered by `?camp`
  when drilling). Rows get `ZERO_METRICS` (new groups start at 0 spend/sales/etc.) + `targets:0`, so they flow through
  `scaleForRange`/filters without NaN. New module consts `ZERO_METRICS` + `MATCH_TYPES`. Verified live: created
  "QA Test · Exact" → grid 30→31, survived reload (then cleared from localStorage).
- **Add Keywords** (`Ads.jsx` `Targeting`): new `AddKeywordsModal` (multi-line keyword textarea → one row each / match
  type / bid / campaign dropdown). `created` keywords merge ahead of the `keywords` mock (`allKeywords`) before the
  profile filter, persist to `createdStore('keywords')`, stamped with `ZERO_METRICS` + `sugBid=bid`, `topOfSearchIS:0`.
  Live counter shows N keywords. Verified live: modal renders with dropdown + counter.
- **Track Keyword** (`Ads.jsx` `ShareOfVoice`): new `TrackKeywordModal` (keyword + optional est. search volume + top
  competitor). Created rows persist to `createdStore('sov')`, prepend via `allSov`, start at 0 paid/organic/total SOV
  and `yourRank:0` (rendered as "—" — updated the `yourRank` column render to show "—" when 0). Verified live: modal
  renders.
- **Verification:** build `dup top-level decls: []`; `leftover export/import: 8 0` (same benign footnote text). Bundle
  `tsc` grep `TS1xxx|TS2304|TS2448|TS2454` = clean. Node check: zero-metric created rows → no NaN in rate math. All
  three modals eyeballed live on the deploy; New Ad Group create+persist round-trip confirmed (grid 30→31→reload).
  Version label bumped to v0.10.0 (separate commit).

**Phase 10 — deepen Automation (session 6, v0.9.0, deployed & eyeballed live):**
- **Editable Dayparting heat-map** (`Ads.jsx` `Dayparting`): added a **brush palette** (`DP_BRUSHES` 0.4–1.5×) — pick a
  multiplier, then **click or drag** across cells to paint (per-cell `onMouseDown`/`onMouseEnter` + a `painting` ref +
  a window `mouseup` listener). Grid persists to `localStorage('chdaypart')` (`dpLoad`/`dpSave`). **Reset** restores the
  mock default, **Suggest Schedule** applies a heuristic curve (`dpSuggest`), **Apply to Campaigns** toasts. Subtitle
  shows live avg/peak. New CSS `.dp-brushes` / `.dp-swatch`. Verified live: painted a cell → survived reload.
- **Rule Templates** (`Automation.jsx`): `RULE_TEMPLATES` (5 presets: Defend ACoS / Scale Winners / Harvest / Negate /
  Budget Pacing) + a `TemplatePicker` modal (`.tmpl-card`). Picking a template feeds its clean form into the existing
  `RuleBuilder` via the `initial` prop **without** an `_id` → opens in **create mode, fully prefilled** (reuses the
  Phase 8 edit-mode plumbing). Wired to the Rule Manager **Templates** button (`picker` state). Verified live: "Scale
  Winners" opened the builder with ROAS ≥ 4 AND Orders ≥ 10, Increase bid 8%, 7d lookback, etc.
- **Set Budget Cap + pacing** (`Automation.jsx` `Budgets`): new `SetBudgetCapModal` (pick marketplace + new cap);
  caps persist to `localStorage('chbudgetcaps')` via `capStore`; `withCap()` re-derives targetPace / pacePct / remaining /
  status (forecast is spend-based so it's unchanged). KPIs + grid + pacing chart all read the capped `data` (via
  `useMemo`). New **`PacingChart`** — a hand-rolled inline SVG (no Recharts dep): actual spend line to "today" (day 20),
  dashed projection to EOM (red when forecast > cap), cap line, target-pace diagonal, today marker. Verified live:
  Amazon USA cap $185K→$240K → Total Cap, Remaining, Avg Pace and the chart cap-line all recomputed. (Test caps,
  painted dayparting cell, and a stale Phase-8 rule "(copy)" were all cleared from localStorage afterward.)
- **Verification:** build `dup top-level decls: []`; `leftover export/import: 8 0` (benign footnote text); full-bundle
  `tsc` grep `TS1xxx|TS2304|TS2448|TS2454` = clean. Deployed v0.9.0; all three features eyeballed live.

**Phase 9 — polish backlog (session 6, v0.8.1, deployed & eyeballed live):**
- **Persisted Ad Groups edits** (`Ads.jsx` `AdGroups`): added inline `StateSelect` (Enabled/Paused) + `EditableNum`
  Default Bid, backed by `usePersistentOverrides('ads-adgroups')` (merged into `rawRows` before `scaleForRange`).
  Verified live: set a default bid to $13.50 → survived a full reload.
- **Persisted Search Terms actions** (`Ads.jsx` `SearchTerms`): replaced the React-only `harvested` Set with
  `usePersistentOverrides('ads-searchterms-acts')` storing `{ termId: 'harvest' | 'negate' }`; the Negate button now
  works (was a no-op) and both harvest/negate states persist across reload + show ✓ when applied.
- **Edit + duplicate created campaigns** (`Ads.jsx`): new lightweight `EditCampaignModal` (name / daily budget / state /
  type / bid strategy — the 9-step wizard stays for creation). New `act` column shows edit + `copy` icons **only for
  user-created campaigns** (`createdById[r.id]`); seed rows show "—". `act` added to all three column presets so it's
  visible. Edit writes back to `createdStore('campaigns')` and clears that row's inline override so edited values win;
  duplicate clones to a new `CNEW…` id, `" (copy)"`, Paused. Verified live: created a campaign → edited budget
  $50→$75 → duplicated it (grid 4→5). (Test artifacts cleared from localStorage afterward.)
- **Persisted date range** (`state.jsx`): `range` + `customRange` now save to `localStorage('chrange')` and reload from
  it, so a custom range no longer resets to "Last 30 days" on refresh.
- **3 missing alert icons** added to `Icon.jsx` (`trend-down`, `doc`, `budget`) so every Alerts row renders a real glyph.
- **Dead code removed**: deleted `DataTable` + `useSort` from `ui.jsx` (unused since Phase 8). Grep confirms no page
  imports them. (`DataGrid` is the only table component now.)
- **Verification:** build `dup top-level decls: []`; `leftover export/import: 8 0` (same benign footnote-text "export"
  hits as v0.8.0 — no real ESM exports); full-bundle `tsc` grep `TS1xxx|TS2304|TS2448|TS2454` = clean. Deployed,
  eyeballed live on v0.8.1.

**Phase 8 — Automation + Insights on the DataGrid (session 6, v0.8.0, deployed `3e991c5`, eyeballed live):**
- **Rule Manager** (`Automation.jsx` `Rules()`): the rule card-list is now a `DataGrid` (id `auto-rules`) — columns Rule
  (sticky, type icon + `custom` tag) / Type / Trigger (IF) / Action (THEN) / Scope / Schedule / Last run / Affected
  (totals) / Status (Pill + Toggle) / actions. `FilterBar` (`RM_FIELDS`: type/status/scope enums + name/trigger/action
  text) + SearchBox + `ExportMenu` + dimensions (type/status/scope). **Edit + Duplicate:** `RuleBuilder` gained an
  `initial` prop + edit mode (title/button swap, keeps id/status/affected, `lastRun:'just now (edited)'`). Created rules
  now persist a clean `_f` form snapshot so edit reopens the builder fully prefilled; seed rules (no `_f`) use
  `fallbackForm(r)` (name/type/scope/freq prefilled, default conditions). Duplicate clones any rule → new id,
  `" (copy)"`, status Paused, persisted to `createdStore('rules')`. Toggle on created rules writes through to the store.
- **Budget Manager** (`Automation.jsx` `Budgets()`): per-profile cards → `DataGrid` (id `auto-budgets`) with a live
  **pacing bar** in the Spent/Cap cell (`.bm-pace` + `.miniprog`, colored by pace status), columns Marketplace (sticky) /
  Monthly Cap / Spent-Cap / % of Cap / Remaining / Forecast EOM (red when > cap) / Pace % / Status. Totals row sums
  cap/spent/remaining/forecast. `FilterBar` (`BM_FIELDS`) + SearchBox + `ExportMenu` + dims (status/currency).
  Multi-currency preserved via `cur(v, b.currency)`. KPIs + the upload-caps hint kept.
- **Report Center** (`Insights.jsx` `Reports()`): dropped `DataTable`/`useSort` → `DataGrid` (id `ins-reports`) keeping the
  Run/download action column; `FilterBar` (`RP_FIELDS`: type/format/owner enums) + SearchBox + `ExportMenu` + dims
  (type/owner/format) + Recipients total. The "Report builder — data sources" widget card is unchanged above the grid.
- **Alerts** (`Insights.jsx` `Alerts()`): notification card-list → `DataGrid` (id `ins-alerts`). Rows decorated with
  `sevLabel` (High/Med/Low) + `status` (Unread/Read) so enum filters work; columns Alert (sticky: sev icon + title +
  `.dot-unread` + body) / Severity (Pill, sorts by `sevRank`) / Status / Time / Mark-read action. `FilterBar`
  (`AL_FIELDS`) + SearchBox + `ExportMenu` + dims (severity/status). `markRead`/`markAll` preserved (verified live:
  marking read flips the row + drops the Unread KPI).
- New CSS in `styles.css`: `.dot-unread`, `.bm-pace`, `.rm-clip` (clamps long IF/THEN text). New `copy` icon in `Icon.jsx`.
- **Known cosmetic (pre-existing, not a regression):** a few alert rows show a generic dots glyph because their mock
  `icon` names (`trend-down`, `budget`, `doc`) aren't in the `Icon` set. Same as the old card view. Easy future win:
  add those three paths to `Icon.jsx`.
- **Verification:** build → `dup top-level decls: []`; the `leftover export/import` count is **8 0** but all 8 are benign
  (1 comment, 1 `name='export'` default param, 6 footnote text strings like "…and export the current view") — **no real
  ESM `export` statements**. Full single-file bundle `tsc` grep `TS1xxx|TS2304|TS2448|TS2454` = clean. Deployed
  `3e991c5`; all four pages eyeballed live (grids render, sort/totals/pagination work; duplicate + edit-modal +
  mark-read tested live). **Note for next session:** the §3/deploy-memory sanity-check says build prints `0 0` — it now
  prints `8 0` because the new footnotes contain the word "export"; that's expected, not a problem.

**Phase 5 — polish (session 5, shipped as v0.5.0, deployed `a7c1397`, eyeballed live):**
- **Persisted inline/bulk edits** — new `usePersistentOverrides(id)` hook + `chedits:<id>` store in `ui.jsx`.
  Campaigns (`ads-campaigns`) and Targeting (`ads-targeting`) now keep inline bid/budget/state + bulk edits
  across reload (was React-only state that reset). Replaces the old `useState({})` overrides.
- **Row drill-down** — campaign name is a `<Link>` to `/ads/adgroups?camp=<id>`. The single-file router shim
  (`tools/build-singlefile.mjs`) was upgraded to split path vs query so `?camp=` routes match; `useLocation()`
  now returns `{pathname, search}` (+ a `useNavigate` shim). `AdGroups` reads `?camp` via `URLSearchParams`,
  shows a back-bar, and generates that campaign's ad groups via `adGroupsForCampaign()` (splits the campaign's
  metrics across `adGroups.total` groups by deterministic weights). Default (no param) view unchanged.
- **Working export** — `ExportMenu` (Popover: CSV + Excel) + `exportCSV`/`exportXLS` in `ui.jsx`. Exports the
  CURRENT filtered rows using each page's `*_FIELDS` schema (scalar, labeled). CSV is RFC-escaped w/ BOM; the
  `.xls` is a SpreadsheetML/HTML table Excel opens natively (no library). Wired on all 5 ads grids; toasts row count.
- **Real date-range + period-compare** — `scaleForRange(rows, range)` + `scaleRow` + `RANGE_DAYS` in `ui.jsx`.
  Mock metrics = ~30-day baseline; counts scale by `days/30` × a deterministic per-row period factor (separate
  demand vs cost factors so ACoS/ROAS actually shift period-to-period); rates recomputed from scaled sums. Bids,
  budgets and other non-metric fields pass through untouched (so edits survive). Returns `{rows, prev}`; the
  top-bar date range now drives KPIs, totals, the grid, and export. **DataGrid `comparePrev` prop** feeds real
  vs-prev deltas into the compare toggle (replaces the old hash-mock `DeltaChip`); KPI cards (`KpiRow prev=…`)
  show real deltas too (ACoS/Spend flagged good-when-down). Wired with compare on Campaigns + Targeting; scaling
  also applied to Ad Groups, Search Terms (KPIs/totals reflect the range).
- **Verification done:** build prints `0` real ESM exports (2 whole-word "export" hits are a comment + a default
  string param) and `[]` dup decls; full bundle `tsc` grep `TS1xxx|TS2304|TS2448|TS2454` = clean; a Node numeric
  test confirmed range scaling, preserved bids/budgets, no NaN/Inf, real deltas, and correct CSV escaping.
  All four were deployed (commit `a7c1397`) and eyeballed live: drill-down (`?camp=`), date-range rescale,
  real vs-prev delta chips, export menu — zero console errors.

**Phase 5.1 — real date picker (session 5, shipped as v0.5.1, deployed `94aadd9`, eyeballed live):**
- **`resolveRange(label, custom)`** in `ui.jsx` → `{ label, days, key }`. "This month" = `now.getDate()` days;
  "Last month" = days in the previous calendar month; "Custom…" = inclusive day-count from the picked start/end
  (label like "Jun 1 – Jun 23"). `scaleForRange` now accepts a label string OR a resolved object.
- **State** (`state.jsx`): added `customRange {start,end}` + memoized `rangeResolved`; exposed via `useApp()`.
  `state.jsx` imports `resolveRange` from `ui.jsx` (one-way dep; ui is concatenated before state in the build).
- **Topbar** (`Layout.jsx`): the date button shows `rangeResolved.label`; "Custom…" opens a `CustomRangePanel`
  (start/end `<input type=date>`, defaults to last 7 days ending today, Apply/Cancel). All Ads pages read
  `rangeResolved` (not the bare `range` label) for scaling + subheaders.
- Verified live: Custom Jun 1–23 → button + subheader update, metrics scale to 23 days (Impr 17.3M→13.2M).

**Phase 4 — builders (session 4, live & verified, persisted to localStorage):**
- **`createdStore`** in `ui.jsx` — localStorage persistence for user-created entities (`chcreated:campaigns`,
  `chcreated:rules`); merged ahead of the mock data on each page.
- **Create-Campaign Super Wizard** (`CreateCampaignWizard` in `Ads.jsx`) — 9 steps: products → daily budget →
  schedule → type (SP-Auto/Manual/PAT) → ad groups by match type → Branded/Category/Competitor themes →
  naming template (with `{brand}/{asin}/{type}/{theme}/{match}` vars + live preview) → optional Campaign AI
  (Target ACoS/ROAS + max bid + priority) → review & launch. Launch creates one campaign per product (zeroed
  metrics, **NEW** tag), prepends to the grid, persists, and toasts. Verified live: launched a campaign →
  grid 40→41, persisted entry confirmed.
- **Rule builder** (`RuleBuilder` in `Automation.jsx`) — name, type, scope, IF condition rows
  (metric/op/value + AND/OR/EITHER, between, min-clicks/min-spend gates), lookback 7/14/30d + exclude-latest,
  THEN action (bid ±%/set/ceiling/floor, pause/enable, budget %, placement %, harvest, negative) + value,
  run frequency. Builds the `rules`-shaped object (trigger/action strings) and prepends to Rule Manager;
  persists + toasts. Verified live: created "IF ACoS > 35% (14d, excl. latest day) · THEN Decrease bid by 15%".
- **Both builders share the `Modal` shell.** Test artifacts created during verification were cleared from
  localStorage afterward.

**Phase 3 — inline edit + working bulk ops (session 4, live & verified on Campaigns + Targeting):**
- New primitives in `src/components/ui.jsx`: **`EditableNum`** (click-to-edit numeric cell; Enter/blur commit,
  Esc cancel), **`StateSelect`** (Enabled/Paused/**Archived** dropdown), **`Modal`** (overlay dialog), and a
  **toast system** — `toast(msg, kind)` + `<ToastHost/>` (mounted once in `Layout.jsx`). CSS for all in styles.css.
- **Campaigns:** State is now an inline dropdown (was a toggle); Daily Budget is inline-editable; a bulk **Tag**
  shows a chip next to the campaign name. Bulk bar fully works: **Enable / Pause / Archive** (state), **Adjust
  Bids** (set / +% / −% / to available / ceiling / floor — via `BulkBidModal`), **Adjust Budget** (set / +% / −%
  via `BulkBudgetModal`), **Tag** (`BulkTagModal`). Dayparting / Apply Rule fire a confirmation toast only
  (cross-feature stubs). All edits write to the in-memory `overrides` map and fire a toast.
- **Targeting:** inline State dropdown + inline **Bid** edit; bulk **Set Bid / Bid +% / Bid −%** (shared
  `BulkBidModal` via `initialMode`), bulk **Pause**, bulk **Add as Negative** (toast stub). Same `overrides` pattern.
- Bid/budget math: `applyBidOp` / `applyBudgetOp` helpers in `Ads.jsx`. Verified live: bulk +10% on 40 campaigns
  raised each actual bid ×1.1 exactly (9.8→10.78…) with a "Updated bids on 40 campaigns — all succeeded" toast.
- **Persistence caveat:** edits live in React `overrides` state (NOT localStorage) — they **reset on reload**.
  Wire to a persistent store if real persistence is wanted later.

**Phase 2 — filter builder + saved Plans (session 4, live & verified on Campaigns):**
- New **`FilterBar`** + **`applyFilters()`** + **`loadFilterModel()`** in `src/components/ui.jsx`. Schema-driven:
  page passes a `fields` array (`{key,label,type:'text'|'enum'|'number',options?}`); FilterBar edits a
  `model = {join:'AND'|'OR', conditions:[{id,field,op,value}]}`; page calls `applyFilters(rows, model, fields)`.
- **Operators by type:** text = contains / does not contain / equals / starts with; enum = is any of / is not
  (multi-select chips); number = > ≥ < ≤ = / between (two inputs). **ALL/ANY (AND/OR)** join toggle.
- **Active-filter chips** render next to the Filters button (each removable); button shows a **count badge**.
- **Saved Plans:** name + save the current filter set; apply/delete from the panel. Persisted to
  **localStorage** (`chplan:<id>`). The working filter model also persists (`chfilter:<id>`) via `loadFilterModel`.
- **Wired on ALL 5 ads grids** — each has its own `*_FIELDS` schema in `Ads.jsx` and a `FilterBar` in the
  grid's `toolbarLeft`, with per-grid persistence ids: `ads-campaigns` (Type chips removed, name SearchBox
  kept), `ads-adgroups`, `ads-targeting`, `ads-searchterms` (FilterBar sits **alongside** the existing
  Harvest/Negate/Monitor recommend chips — both AND together; `recommend` intentionally omitted from the
  filter fields), `ads-sov`. KPIs + grid + counts recompute on the filtered set in every view.
- Verified live: Campaigns ACoS%>40 → KPI Orders 123.2K→39K + Plan "High ACoS (>40%)" saved; Targeting
  Match Type = Exact enum filter → grid showed only Exact rows. (Other three share identical wiring; tsc clean.)

**Done:**
- v1 app built and **deployed live** (renders all modules on mock data).
- Deep doc-research pass + **live desktop audit** of `product.pacvue.com` (real IA + grid mechanics).
- **`FUNCTIONALITY-SPEC.md` written** — how real Pacvue works + gap analysis + phased rebuild plan.
- **Phase 1 `DataGrid` component built** (`src/components/ui.jsx`) and now used by **every** grid in the app —
  Ads, Commerce, DSP, Automation (Rule/Budget Manager) and Insights (Report Center/Alerts). The old
  `DataTable`/`useSort` helpers are no longer referenced by any page (they still exist in `ui.jsx`, now dead code —
  safe to delete in a future cleanup).

**What the new DataGrid does (all working on mock data):**
- **Sort on every column** (click header; caret shows dir; numeric vs text aware; `sort:false` opts a col out).
- **Column presets + custom chooser** — a "Columns" popover with preset views (Campaigns: Default /
  Performance / Target ACOS) **plus per-column show/hide and ↑/↓ reorder**; selection **persists** to
  localStorage per grid id (`chgrid:<id>`). Sticky first column is pinned & non-hideable.
- **Pagination** — footer "Total N entries", page-size selector (25/50/100), windowed numbered pages,
  prev/next, and **Go-to-page** input.
- **Pinned Totals row** (`<tfoot>`) — per-column `foot(rows)` aggregates (ACoS/ROAS computed from summed
  spend/sales via `aggregate()`, not averaged). Sticks to bottom on scroll.
- **Frozen first column + horizontal scroll** (existing `sticky-l`).
- **Group-by (Dimensions)** — popover to group rows by a field (Campaigns: Type / Portfolio / Targeting /
  Profile); renders group header rows with per-group subtotals. Pagination is bypassed in grouped mode.
- **Period-compare toggle** ("vs prev period") — shows ▲/▼ delta chips on `delta:true` numeric cols. Now uses
  **real prior-period values** via the `comparePrev` prop (map keyed by rowKey); falls back to the old hash-mock
  only when no `comparePrev` is supplied. `compareDisabled` greys out the toggle (used for "All time").
- **Density toggle** (Compact) — tightens row padding.

**API:** `<DataGrid id columns rows initialSort presets defaultPreset dimensions totals compare comparePrev
compareDisabled selectable selected onToggle onToggleAll rowKey toolbarLeft />`. Column: `{key,label,num,sticky,
width,render(row),sortVal(row),sort:false,foot(rows),delta:true}`. The grid renders its own control bar
(search/chips go in `toolbarLeft`); page still renders the page head + bulk bar + footnote.

**Verification routine (every deploy this session passed it):** build prints `0 0` leftover import/export
and `[]` dup top-level decls; the full single-file bundle parses via `tsc` clean for `TS1xxx | TS2304 |
TS2448 | TS2454`; then deploy and **eyeball live in the browser** (Phases 1–4 were all clicked-through on
the live Vercel site, not just static-checked). Use a `?v=<n>` cache-buster when re-checking the live URL.

**Key discovery (confirmed):** the real desktop product is **`product.pacvue.com`** (full data grids).
`app.pacvue.com` is the **mobile build** (cards, no tables) — don't audit grids there.

---

## 3. Live deployment

- **Live URL:** https://commercehub-five.vercel.app  (public, mock data only)
- **GitHub repo:** `jimlaframboise-bit/commercehub` (public). Now holds the **full diffable source** — `src/` tree,
  `tools/`, configs, docs, and the deployed `index.html` (seeded via the browser in session 7; the old zip snapshot was
  deleted). Pushes to `main` auto-redeploy on Vercel.
- **Source / version control (set up session 7):** the project folder is a **real local git repo** (branch `main`;
  `.gitignore` excludes `node_modules/`, `dist/`, `CommerceHub.html`, `*.zip`). The remote already has the complete
  source (no Jim push required — Claude seeded it file-by-file through the GitHub web UI). Zip snapshots are **retired**
  in favour of git history.
  - **Sandbox limit:** Claude **cannot `git push`** (no GitHub network from the sandbox — `git ls-remote` → 403). So
    Claude commits to GitHub the same way it deploys: **through the browser (Claude-in-Chrome) web-UI commits.**
  - **Deploy + source-sync workflow (Claude owns both — confirmed by Jim session 7):** each release Claude (1) builds
    `index.html` + uploads it via the browser (Vercel auto-deploys), AND (2) uploads the changed **source** files via
    the browser to keep the repo's `src/` tree in step with the build. To commit into an existing subfolder, navigate
    to `https://github.com/<repo>/upload/main/<path>` (e.g. `/upload/main/src/pages`) — GitHub creates the path on
    commit; the file-input upload flattens to the page's path, so do one folder per commit. Also keep a **local git
    commit** each session for in-sandbox history/diffs.
  - *(Optional, Jim only)* to connect his local working copy for terminal pushes:
    `git remote add origin https://github.com/jimlaframboise-bit/commercehub.git` then `git pull --rebase` (the remote
    already has content, so don't force).
- **Vercel:** project `commercehub` under team `jimlaframboise-7150s-projects` (Hobby plan),
  preset "Other" (static). GitHub↔Vercel already connected.
- **Deploy method today:** the single-file `index.html` is uploaded to the repo via GitHub web UI;
  Vercel auto-deploys. (Future: point Vercel at the full Vite project so it builds properly.)

---

## 4. The codebase (in this folder)

Two parallel builds live here:

**A. Full Vite/React project (the real foundation to extend):**
```
package.json, vite.config.js, index.html (Vite entry)
src/main.jsx, App.jsx, state.jsx, styles.css
src/lib/format.js
src/data/mock.js          ← deterministic mock data (profiles, campaigns, keywords, etc.)
src/components/Icon.jsx, Layout.jsx, ui.jsx
src/pages/Overview.jsx, Ads.jsx, Dsp.jsx, Commerce.jsx, Automation.jsx, Insights.jsx
```
Run locally: `npm install && npm run dev`.

**B. Single-file deployable build:** `CommerceHub.html` (and a copy committed as repo `index.html`).
- Built by **`tools/build-singlefile.mjs`** (persisted in repo). It concatenates the `src/` files, strips
  ESM imports/exports, and injects shims. **To rebuild:** from the project root run
  `node tools/build-singlefile.mjs` → regenerates `CommerceHub.html`; then `cp CommerceHub.html index.html`
  and push `index.html` to the GitHub repo to redeploy on Vercel.
- Shims in the single-file build: a tiny hash-router (replaces react-router-dom) and a small **SVG
  chart engine** (replaces Recharts, whose CDN UMD failed to load). Loads React + Babel-standalone from
  unpkg and transpiles JSX in-browser.

**Gotchas already solved (keep in mind when editing):**
- Single-file build runs all files in ONE scope, so duplicate top-level declarations break it. We
  renamed collisions: `PageHead`→`AdsHead/DspHead/CommerceHead/AutoHead/InsHead`; `sym`→`symA` (Ads);
  `paceColor`→`ovPace` (Overview); `sevBg/sevColor`→`insSevBg/insSevColor` (Insights).
- Aliased imports (`campaigns as ALL_CAMPAIGNS`, `alerts as ALERTS`, `rules as RULES`) are lost when
  imports are stripped, so the build re-injects `const ALL_CAMPAIGNS = campaigns; const ALERTS = alerts;
  const RULES = rules;` before the render call.
- **TDZ gotcha (bit us in Phase 4):** because those aliases are injected at the END of the bundle, you must
  NOT use `ALL_CAMPAIGNS`/`ALERTS`/`RULES` at **module top-level** (e.g. `const X = [...ALL_CAMPAIGNS]`) — it
  runs before the alias exists → "Cannot access 'ALL_CAMPAIGNS' before initialization" and a blank page.
  Only reference them **inside component/function bodies** (evaluated at render). Fix used: a lazy
  `getProductList()` function instead of a top-level const.
- **Build verification now also greps `tsc` for `TS2448`/`TS2454`** (block-scoped-used-before-declaration),
  which catches the TDZ class above. Full check: `TS1xxx | TS2304 | TS2448 | TS2454` = clean.

---

## 5. App structure (current modules/routes)

- `/` Overview · `/ads/campaigns` `/ads/adgroups` `/ads/targeting` `/ads/search-terms` `/ads/sov`
  `/ads/dayparting` · `/dsp` `/dsp/audiences` `/dsp/amc` · `/commerce/shelf` `/commerce/buybox`
  `/commerce/products` · `/rules` `/budgets` · `/reports` `/alerts` `/settings`
- Pacvue's real top-level modules (from live app): **Sponsored Ads, DSP, Commerce**.
  - Sponsored Ads sub-views: Profile, Tagging, Campaign, Ad Group, Product Eligibility, Product,
    Share of Voice, Hourly.
  - Commerce (Vendor) sub-views: Vendor Account, Market, Brand, Category, ASIN, Periscope.

---

## 6. Functional research findings (for the rebuild)

Priorities Jim approved to make genuinely functional: **(1) data-grid mechanics, (2) filtering & saved
views, (3) inline editing & bulk ops, (4) campaign creation & rule builder.**

Verified from Pacvue docs (high confidence):
- **Metrics/columns + formulas:** Spend, Sales, Orders, Sale Units, Impressions, Clicks, ACOS(=Spend/Sales),
  ROAS(=Sales/Spend), CPC, CTR, CVR(=Orders/Clicks), CPA(=Spend/Orders), AOV(=Sales/Orders),
  ASP(=Sales/Units), TACOS, TROAS, NTB.
- **Hierarchy:** campaign → ad group → targets/ASINs. "Group by" includes **placement** (campaign-level
  only). Match type (broad/phrase/exact) is a structuring dimension.
- **Custom Tags = Pacvue's portfolio alternative:** two-level **tags + sub-tags**, non-exclusive; auto-assign
  via "Match Tag Rules" (contains / does not contain on campaign name). Separate from **Billing Tags**
  (exclusive, billing-only).
- **Bulk Operations** (rows selected): bulk bid (set / +%/ −% / to suggested), bulk daily budget, bulk
  state (enable/pause/archive), bulk add keywords/harvest, bulk add negatives (exact/phrase), bulk apply
  dayparting, bulk apply/assign rules, bulk apply tags, bulk ToS/PDP placement %, "Campaign Tune-up",
  bulk creation via **Super Wizard**. Also an Excel integration ("Pacvue XL").
- **Super Wizard** (bulk campaign creation) — 9 steps: products → daily budget → date range → type
  (SP Auto/Manual/PAT) → split by match type into ad groups → split by Branded/Category/Competitor →
  naming rules (custom variables) → optional AI (Target ACOS/ROAS + Max Bid + Spend-vs-Performance
  priority) → run.
- **Campaign AI:** two inputs (Target ROAS + Max Bid), auto pacing + auto keyword harvesting; an
  alternative to manual rules. **Product AI:** Efficiency/Traffic/Conversion launch strategies.
- **Rule builder:** triggers (ROAS, ACoS, CVR, CPC, CTR, Impr, Clicks, Spend, Orders, Organic Rank, SOV,
  weeks-of-cover); operators (>, <, between, with min clicks/spend gates); combine with **AND/OR/EITHER**;
  actions (bid ±%/to value, ceiling/floor, pause, ToS/PDP %, harvest, add negative, adjust budget);
  lookback 7/14/30d (often excluding yesterday); frequency hourly/daily/every-2-days; scope
  profile/campaign/ad-group/tag. Rule types: bid, placement-modifier, keyword-harvest, negative-harvest,
  dayparting, budget (Budget Calendar/cap/auto-refill), inventory/retail auto-pause.
- **Dayparting:** weekday × hour heat-map; up to 5 metrics (CPC/Spend/Impr/Clicks/CTR); priority modes
  (Lowest CPC / More clicks / Impressions / CTR); percent-based +/- multipliers; manual hour overrides.
- **Share of Voice:** keyword tracking scraped 24×/day; Paid vs Organic (SOV=paid; Share of Shelf=paid+organic);
  top-5 brand/ASIN comparison; Weighted SOV; Bid Explorer.

**NOT publicly documented — must verify live at product.pacvue.com:** exact column-picker UI,
sort behavior (single/multi, arrows), pagination vs infinite scroll, rows-per-page, totals/summary row,
saved/named grid views + filter-count badge, the literal Bulk Operations menu items, Search Term &
SOV exact column headers, dayparting lookback default.

(Full research detail is in the session transcript; key sources: pacvue.com blogs on Super Wizard,
bid-placement-modifier rules, optimization rules, dayparting/SOV; support.pacvue.com glossaries.)

---

## 7. Next steps (resume here)

**Phases 1–8 are all live & deployed (v0.8.0 on commercehub-five.vercel.app). Nothing pending. Every page in the
app now runs on the real `DataGrid`.**

**Phase 6 — Commerce on the DataGrid (session 5, v0.6.0, deployed `b423c43`, eyeballed live):**
- New `scaleFields(rows, range, fields)` in `ui.jsx` — scales ONLY the listed cumulative fields
  (`glanceViews`, `orderedRevenue`) by the date range, leaving state/quality fields (Buy Box %, price, rating,
  content score, stock) untouched. Returns `{rows, prev}`.
- `Commerce.jsx` fully rewritten: shared `useCommerceData()` (profile filter + `scaleFields` + derived string
  mirrors `availability`/`mapStatus`/`aplusLabel`/`videoLabel` so enum filters work on booleans). All three
  pages now use `DataGrid` + `FilterBar` (per-page `*_FIELDS`, ids `commerce-shelf|buybox|products`) + `ExportMenu`.
  Digital Shelf & Product Center have presets, dimensions, and compare (on the cumulative metrics); Buy Box is
  state-focused (no compare). Product Center dedupes by ASIN (`rowKey="asin"`, prev remapped to `prevByAsin`).

**Phase 7 — DSP on the DataGrid (session 5, v0.7.0, deployed `3cac635`, eyeballed live):**
- `data/mock.js`: `dspOrders` expanded from 6 → 26 (named flagship orders + a generator across profiles/tactics,
  each with `profileId`); generator tactics const is `DSP_GEN_TACTICS` (renamed to avoid colliding with
  `DSP_TACTICS` in `Dsp.jsx` — remember: single-file build = one scope, no duplicate top-level names).
- `Dsp.jsx` rewritten. **DSP Campaigns**: `scaleDsp()` scales cumulative metrics (impr/clicks/spend/purchases/
  sales) by range then recomputes roas/cpm/ctr (cur + prev); full DataGrid (presets, dimensions by tactic/
  status/profile, totals, compare, compareDisabled on All time), FilterBar (`dsp-orders`), ExportMenu, real KPI
  deltas, multi-currency via `symD`. **Audience Builder** + **AMC**: kept the builder/template cards; tables moved
  to DataGrid + FilterBar + ExportMenu + dimensions + totals (no date scaling — not time-series).

**Next options (Phase 13 — pick one):** (Phases 11 & 12 wire-stubbed-buttons are DONE — every page-header & bulkbar
button now opens a real modal / persists; see §2.)
- **Remaining toast-only actions** — the per-row Report "Run"/download, the Report-builder data-source `+` widgets,
  Search Terms "Harvesting Rules", and the intentionally-stubbed "Apply to Campaigns" on Dayparting + rule "run"
  (these last two have no campaign engine behind them). Low priority / cosmetic.
- **Infra (bigger)** — point Vercel at the full Vite project for proper builds; add access protection; wire real
  Amazon Ads/SP-API data behind the mock layer.
- ✅ **DONE (session 8):** re-verified all FUNCTIONALITY-SPEC §9 live-only items at `product.pacvue.com`. §9 now
  holds the findings + a **7-item Phase-13 gap list** (top picks: the SP/SB/SD/STV **type chooser + single
  5-step Create flow**, and **deepening the Rule builder** to match live). Pick from that list to build next.

---

## 8. Useful reference docs in this folder
- `README.md` — what it is + how to run.
- `FEATURE-MAP.md` — Pacvue capability → where it lives in the clone (from session 1).
- `FUNCTIONALITY-SPEC.md` — ✅ written: deep interaction spec + gap analysis + phased rebuild plan (§8 of it).
- `HANDOFF.md` — this file.

## 9. How to resume (quick start for the next session)
1. Read this file top-to-bottom, then skim `FUNCTIONALITY-SPEC.md` §8.
2. The full editable source is the **Vite project under `src/`** (the repo only holds the single-file
   `index.html`). Edit `src/`, then **rebuild + redeploy** per §4 / §3.
3. **Deploy** is via the GitHub web-UI upload of `index.html` through the connected browser → Vercel
   auto-deploys. Exact click-by-click steps + gotchas (commit button is below the fold; cache-buster on
   verify) are saved in memory: see the "CommerceHub deploy process" memory.
4. **Before deploying**, always run the verification routine in §2 (build invariants + `tsc` grep incl.
   `TS2448|TS2454`) and then eyeball the live site.
5. Bump the sidebar version label (`.app-version` in `Layout.jsx`) when a phase ships — currently **v0.9.0**.
   (Note: since Phase 8 the build's `leftover export/import` line reads **`8 0`**, not `0 0` — the 8 are footnote
   text containing the word "export", not real ESM exports. Don't treat it as a regression.)

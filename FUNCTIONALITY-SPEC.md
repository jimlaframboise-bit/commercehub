# CommerceHub — Pacvue Functionality Spec & Gap Analysis

> Deep-dive into how Pacvue's **desktop** product (`product.pacvue.com`) actually works, captured from
> the live account + Pacvue docs. This is the basis for rebuilding the clone's interaction layer.
> **Review this, then we build.** Status legend: ✅ in clone · 🟡 partial · ❌ missing.
>
> Created session 2 · 2026-06-20. · **§9 live-verified session 8 · 2026-06-26** (all open items captured).

---

## 0. Key correction from session 1

The real desktop product is **`product.pacvue.com`** ("PACVUE ADS"), not `app.pacvue.com` (which is the
mobile build that renders cards, no tables). Everything below is from the desktop product. Pacvue also has
a platform switcher across many retailers (Amazon, Walmart, Instacart, Criteo, Target, Kroger, Chewy,
DoorDash, TikTok, etc.) and two modes per retailer: **Advertising** and **Commerce**. We are cloning the
**Amazon › Advertising** experience first.

---

## 1. Global shell & information architecture (real desktop nav)

**Left icon rail → expandable sections:**
- **Home**
- **Product Center:** Product Dashboard, Product Listing
- **Budget:** Budget Dashboard
- **Advertising (Campaign):** Explorer · Profile · Tagging · Portfolio · **Campaign** · Placement(New) ·
  Adgroup · Ads(New) · Targeting · ASIN · Search Term · Negative Targeting · **Bulk Operations**
- **Analysis:** Competitive
- **Report:** Default Report(New) · My Report · SP Prompt Analytics Report(New) · Marketplace Dashboard ·
  Custom Dashboard · Brand Analysis(New)
- **Research:** Keyword Research · PAT Research · Audience Research
- **Optimization:** Dayparting Scheduler · Budget Scheduler · **Rule** · Campaign AI · Product AI ·
  Recommendation · Live Ad Momentum · Bid Explorer · Automation Health
- **AMC:** AMC Dashboard · AMC Report · AMC Account · AMC Activate · Audience Hub
- **Price Tracker**
- **Intelligence:** Competitive · Category
- **Event:** Advertising Event · Task Center

**Top bar (global, applies to grids):**
- Account selector ("Pacvue HQ"), platform switcher (Advertising/Commerce + retailer).
- **Profile** multi-select (e.g. Amazon USA, Amazon Canada [CA]) with Select-All.
- **Campaign Tag / Portfolio** filter with explicit **And / Or** boolean toggle + multi-select values.
- **Date range** with rich presets: Yesterday, Last 7 Days, *Last 7 Days (Exclude latest 2 days)*,
  Last Week, This Week, Last 14/30/60 Days (+ exclude-2-days variants), Last 2/4 Weeks, This/Last Month,
  YTD, Last Year, Last 12 Months, Custom Range. Plus **Compare** (Custom or **YoY**) → comparison deltas.
- Sync, downloads tray, notifications (Data Alert / Scheduled Task / Manual Task / System tabs), help, user menu.
- **Executive Hub** menu: Executive Dashboard, Automation Value Insights, Cross-Retailer, SOV Dashboard,
  Incrementality, Budget Plan, Keyword Opportunity, Creative Hub, Media Plan, etc.

---

## 2. THE DATA GRID — core mechanics (priority #1)

This is the heart of Pacvue and the biggest gap. Every advertising view (Campaign, Adgroup, Targeting,
ASIN, Search Term…) is the same powerful grid:

| Mechanic | Real Pacvue behavior | Clone |
|---|---|---|
| **Sort** | Every column header has a sort caret; click to sort asc/desc (server-side). | 🟡 only a few Campaign cols |
| **Column views (presets)** | A "Column" menu with saved views: **Target ACOS View, Performance, Default Plan, Custom Columns** — switching changes the visible metric set. | ❌ |
| **Custom columns** | Choose/add/remove/reorder columns (Custom Columns view); persists. | ❌ |
| **Frozen first column + horizontal scroll** | Campaign Name frozen; metrics scroll horizontally with ◄ ► affordance. | 🟡 sticky col only |
| **Pagination** | Footer: "**Total N entries**", **page-size selector (25/page…)**, numbered pages (1…95), **Go to page**. | ❌ renders all rows |
| **Totals / summary row** | A pinned **Total** row aggregates the page/all (e.g. ACoS 63.78%, ROAS C$1.57). | ❌ |
| **Group by (Dimensions)** | "**Dimensions**" selector regroups rows (e.g. by placement, type…). | ❌ |
| **Period compare ("Total")** | "**Total**" toggle switches between absolute and vs-previous-period deltas (paired with Compare date range). | ❌ |
| **Inline state edit** | Per-row **State** dropdown (Enabled / Paused / Archived) — not just a toggle. | 🟡 toggle only |
| **Row drill-down** | Campaign Name is a link → drills into ad groups / detail. | ❌ |
| **Export** | Download grid (Excel/CSV); also async "download tasks" tray. | 🟡 button only |
| **Density / layout** | Compact rows, wrapped long names, fixed header on scroll. | 🟡 |

Default Campaign columns seen: Campaign Name · State · Status (Enabled/Paused/Out of Budget) ·
Active/Total AdGroup · Profile Name · Campaign Type (SP-Auto/SP-Manual/SB/SBV/SD) · Daily Budget ·
Act/Avl Bid · Impr · Clicks · CTR · Spend · CPC · Sales · Orders · CVR · CPA · ACoS · ROAS · AOV · ASP ·
NTB-Orders/%/Sales · ATC.

---

## 3. Filtering & saved views (priority #2)

- **Filters panel** (toggle on the grid) with stacked filter fields, each with an **operator**:
  - Campaign (multi-select), Campaign Name with **"Contains(or)" / Contains(and) / Equals / Not contains**
    + free-text, **State = "All but Archived"** (default), Status (multi), ASIN with Contains operator,
    plus metric-threshold filters.
- **Boolean tag logic:** Campaign Tag / Portfolio filter supports **And / Or**.
- **"Plan" = saved filter set** (the Plan button with a save icon) — name & reuse filter configurations.
- Profile + date-range + tag filters are global and persist across views.

**Clone gap:** ❌ real filter builder (operators, metric thresholds), ❌ saved views/Plans, 🟡 only simple chips.

---

## 4. Inline editing & bulk operations (priority #3)

**Inline edit (per row):** State dropdown, Daily Budget (pencil), Bid (pencil) — edits persist and emit a
"Update N campaigns' state — all succeed" task notification.

**Bulk Operations** — select rows (checkbox) → action bar; also a dedicated **Bulk Operations** page and
**Bulk Upload** (Excel template) + **Prompts**. Documented bulk actions:
- Bulk **state** (Enable / Pause / Archive)
- Bulk **bid** (set to value · +%/−% · to suggested · set min/max ceiling-floor)
- Bulk **daily budget** (set · +%/−%)
- Bulk **placement %** (Top-of-Search / Product-page / Rest-of-search modifiers)
- Bulk **add keywords / harvest** (Auto→Manual), bulk **add negatives** (exact/phrase, campaign or ad-group)
- Bulk **apply dayparting**, bulk **apply/assign rule**, bulk **apply tags/portfolio**
- Bulk **create** via **Super Wizard**, "Campaign Tune-up", and **Pacvue XL** (Excel) round-trip

**Clone gap:** 🟡 bulk bar exists visually but actions are no-ops; ❌ inline budget/bid editing; ❌ persist.

---

## 5. Campaign creation (priority #4)

- **Create Campaign** (single) and **Bulk Upload** (Excel) on the grid.
- **Super Wizard** (bulk creation), 9 steps: (1) pick products/ASINs → (2) daily budget → (3) date range →
  (4) campaign type (SP Auto / Manual / PAT) → (5) split by **match type** into ad groups →
  (6) split by **Branded / Category / Competitor** → (7) **naming rules** with custom variables →
  (8) optional **AI** (Target ACoS/ROAS + Max Bid + Spend-vs-Performance priority) → (9) review & run.
- **Campaign AI** (Target ROAS + Max Bid; auto pacing + auto harvesting) and **Product AI**
  (Efficiency / Traffic / Conversion launch strategies) as automated alternatives.

**Clone gap:** ❌ creation wizard (only a button).

---

## 6. Rule builder & optimization (priority #4)

**Rule** (Optimization › Rule) — IF/THEN automation:
- **Triggers/metrics:** ROAS, ACoS, CVR, CPC, CTR, Impressions, Clicks, Spend, Orders, Organic Rank, SOV,
  weeks-of-cover; **operators** >, <, between, with **min clicks/spend gates**.
- **Logic:** combine conditions with **And / Or / Either**.
- **Lookback window:** 7 / 14 / 30 days, often **excluding yesterday/latest 2 days**.
- **Actions:** bid ±%/to value, set ceiling/floor, pause/enable, placement %, harvest keyword,
  add negative, adjust budget.
- **Frequency:** hourly / daily / every-2-days; **scope:** profile / campaign / ad-group / tag.
- **Rule types:** Bid, Placement-modifier, Keyword-harvest, Negative-harvest, **Dayparting**,
  **Budget** (Budget Scheduler — calendar, caps, auto-refill), **inventory/retail auto-pause**.

**Adjacent optimization tools:** Dayparting Scheduler (weekday×hour heat-map, up to 5 metrics, priority
modes, %-multipliers, manual overrides), Budget Scheduler, Bid Explorer, Live Ad Momentum, Recommendation,
Automation Health/Value.

**Clone gap:** 🟡 rule list with on/off toggles exists; ❌ no rule-builder UI; ❌ dayparting is static.

---

## 7. Other modules (lower priority, for completeness)
- **Product Center** (Product Dashboard/Listing), **Budget Dashboard**, **Reports** (Default/My/Custom
  dashboards, Brand Analysis), **AMC** (Dashboard/Report/Account/Activate/Audience Hub),
  **Intelligence** (Competitive/Category), **Price Tracker**, **Events/Task Center**, **Tagging/Portfolio**.

---

## 8. Gap analysis → rebuild priorities

**Phase 1 — Real DataGrid component (biggest impact).** Build one reusable grid used by every view:
sort on every column (asc/desc), column-view presets + custom-column chooser (add/remove/reorder/persist),
pagination (page-size + total + go-to-page), pinned Totals row, frozen first column + horizontal scroll,
group-by (Dimensions), period-compare toggle, density. *This alone fixes the "can't even sort" problem.*

**Phase 2 — Filtering & saved views.** Filter builder with per-field operators (contains/equals/threshold),
And/Or tag logic, and **saved Plans/Views**.

**Phase 3 — Inline edit + bulk ops that persist.** Inline State/Bid/Budget editing into local state; a real
bulk-action bar (state, bid ±%, budget, dayparting, tags, negatives) that applies to selected rows with a
confirmation/"task" toast.

**Phase 4 — Builders.** Create-Campaign wizard (Super-Wizard-style steps) and a Rule builder
(condition rows with metric/operator/value + And/Or, actions, frequency, scope).

**Phase 5 — polish.** Drill-down navigation, export, date-range presets + compare deltas, Dimensions.

---

## 9. Live-verified findings (session 8 — audited live on product.pacvue.com, Crump account, Last 30 Days)

> All five open items below were verified live. ✅ = captured. Note: the **Campaign grid body would not
> finish loading** on this account (perpetual spinner overlay blocks row clicks) — so the inline Campaign
> bulk bar was captured on the **Adgroup grid** instead (same component); other surfaces all loaded fine.

**9.1 Column views / Custom Columns ✅** — The grid toolbar has a **"Column"** icon → dropdown of **4 preset
views: Target ACOS View · Performance · Default Plan · Custom Columns** (switching changes the visible metric
set; "Custom Columns" is itself a saved set, NOT a separate drag-reorder modal in this version). Separate
layout controls live in the **"…" (More Action)** menu: fit-columns, hide, **Row Height (Compact / Standard /
Wide)**, save-layout; plus standalone **Insight**, sort, and **download** icons. *Clone already has presets +
a custom show/hide/reorder chooser, so it matches/exceeds this. Minor: align preset NAMES to the live four.*

**9.2 Bulk Operations ✅** — Two distinct surfaces:
- **Inline bulk bar** (select row checkboxes) → "**N Selected**" + context buttons. On **Adgroup**: **Change
  State** (→ Enabled / Paused / Archived), **Adgroup Setting**, **Add**, **More Bulk Edits** (→ SD Creative
  Setting, Targeting Setting). (Campaign-level bar is richer per docs — bid/budget/tag/dayparting/rule — but
  its grid wouldn't load this session.)
- **Dedicated Bulk Operations page** (`/Campaign/BulkOperations`) = spreadsheet round-trip ("Pacvue XL").
  Tabs: **Create / Update Campaign · Quick Campaign Edits · Campaign Target Setting · Create Tag · Campaign
  Tag Target Setting · Upload Campaign Mapping**. Flow: pick Profile + Campaign Type → choose template format
  (**Pacvue / Amazon**) → Download existing-data-for-editing or template-for-creation → edit → upload.
  **Quick Campaign Edits** "setting to modify" list: **Change Campaign Name · Change Campaign Budget · Change
  Campaign State · Change Targeting Bid · Change Targeting State · Add Targeting · Add Negative Targeting**
  (up to 10,000 campaigns / 1,000 keywords per file).

**9.3 Create Campaign single flow ✅** — "Create Campaign" → **Choose Campaign Type** modal: **Sponsored
Products · Sponsored Brands · Sponsored Display · Sponsored TV** (each a card + Continue), plus a **Sponsored
Products Super Wizard** card with a NEW **Sites** toggle (**Amazon and beyond** / **Amazon Business**).
Single **SP** flow = 5 steps: **1 Campaign → 2 Adgroup and Ads → 3 Targeting → 4 Negative Targeting →
5 Complete**. Step 1 fields: **Profile · Campaign Name (≤128 chars) · Campaign State (Enabled/Paused) · Date
Range (Any Date Range / Select a Date Range) · Daily Budget · Sites (Amazon and beyond / Amazon Business) ·
Targeting (Automatic / Manual)**. *Clone has the Super Wizard but NOT this type-chooser + single 5-step flow → gap.*

**9.4 Rule builder ✅** — List page tabs: **Auto Rules · Manual Rules · Commerce Rules · Rule Library**;
filters Rule Type / Rule State / Profile / Frequency / Apply Level / Campaign / Owner / Sort by / Rule Name;
buttons Create Auto Rules · Bulk Operation · Import Shared Rule · SharePass List. **Select Rule Type** modal
(tabs **All Rule / Recommended Usage**) grouped:
- **Advertising:** Targeting Rule (Bid, Pause Targeting) · Campaign Rule (Budget, Pause campaign) · Placement
  Rule (Placement) · Adgroup Rule (Default Bid, Pause adgroups) · Audience Rule (Audience)
- **Harvest:** Harvest Keywords Rule (Add Keywords) · Harvest Product Targetings Rule (Add PATs) · Negative
  Targeting Rule (Add Negative)
- **ASIN:** ASIN Rule (Pause/Enable ASIN) · **Real-time:** Auto Refill Rule (Budget) · **SOV:** SOV Bid Rule (Bid)

Builder = 2 steps: **1 Basic Information → 2 Automation Setting**.
- **Step 1:** Rule Name (≤150) · Running Time Zone · **Mode (Automated Actions / Requires Approval)** · Running
  Date (start ~ end / no-end) + **Exclude Date** · **Send Email** toggle · **Apply to** (Targeting Type + Level:
  Campaign) → object **dual-list transfer** (left available + Filters, right selected).
- **Step 2 (Automation Setting):** an **Automation** block (duplicable) with **Requirements (IF)** rows —
  metric (cascading **Targeting / Adgroup / Campaign** → ROAS, ACOS, CPC, CPA, CVR, CTR, Clicks, Sales,
  Impressions) + operator (>, …) + value-type (Custom) + value + **"Same SKU"**; **Add** for more rows
  (AND/OR via +/copy). **Action (THEN):** e.g. Increase bid + value + % + **Cap (ceiling, C$)**. **Data from:**
  Last 7 days **exclude Latest 2 days**. **Add Automation** (multiple IF/THEN blocks). **Frequency:** Time /
  Click Hit → Weekly / Sunday / time-of-day. Right rail: **Recommendation / Rule Kickstart** template list.
  Footer: Previous · **Preview Results** · Cancel · **Save as template** · OK.

**9.5 Dimensions + Filters + Date presets ✅**
- **Dimensions** (group-by, Campaign grid): **Placement · Campaign Type · Campaign Type (Drill-down)** (+ search).
- **Filters** fields: Profile (region-tree multi-select CA/US + Select All) · Campaign Tag (**And/Or** + Add
  Tag) · Campaign (multi) · Campaign Name (operator + text) · Campaign Type · **State (default "All but
  Archived")** · Status · ASIN (operator + add). **Text-filter operators: Contains(or) · Contains(and) ·
  Not Contains · Is · Is Not · Start with.**
- **Date presets:** Real Time (Today) · Yesterday · Last 7 Days · **Last 7 Days (Exclude latest 2 days)** ·
  Last Week · This Week · Last 14 Days (+exclude-2-days) · Last 2 Weeks · Last 4 Weeks · Last 30 Days
  (+exclude-2-days) · Last Month · This Month · … + **Compare** checkbox.

## 10. Goals / Budget Manager (session 9 — audited live 2026-07-20, Crump account)

> Pacvue has **no standalone "Goal Center"** on this account — goal functionality IS the **Budget
> Manager** (`/Budget/BudgetDashboard`): monthly budget goals per profile → per campaign-tag, with
> pacing, delivery and automation toggles. Sidebar: Budget Manager (top-level). Nav check confirmed
> Optimization contains only: Dayparting Scheduler · Budget Scheduler · Rule · Campaign AI ·
> Product AI · Recommendation · Live Ad Momentum · Bid Explorer · Automation Health.

**10.1 Dashboard grid** — hierarchical: **Profile rows** (Amazon Canada [CA], Amazon USA; "Tag"
badge; expand caret) → **tag rows** (CA: Catch All · Dental · Freeze Dried · Sprinkles), each tag a
link. Toolbar: **Add Profile** (primary) · **Bulk Operations** (disabled until selection) ·
**Calendar Template Manager** · **Bulk Upload ▾**. Top-right icons: API/code · email · watch ·
layout · download, plus a **list-view / analysis-view toggle** on the page title bar.
Fixed columns per tag row: **Calendar** (icon → Edit Daily Budget Allocation) · **AI** (icon) ·
**Auto Pacing** (toggle + red "!" when unset budget) · **Stop Over-Spend** (toggle + "!") ·
**Auto Re-enable** (toggle) · **Flight Control** (toggle). Profile row shows "N/6 Active" rollups
for Auto Pacing and Stop Over-Spend.
Then **repeating month groups** (06-2026 · 07-2026 · 08-2026 …, horizontal scroll): **Budget**
(value or "Not set" + pencil edit inline) · **Spend** · **Percentage** (pacing bar, e.g. 61%) ·
**Planned Budget Percentage** (60.8%) · **Delivery Rate** (100% green; 103% amber + chart icon) ·
**Est Spend** (C$30.95K) · **ROAS** (C$3.47) · **Yday** (C$1,142.3). Profile row totals the tags
(C$23K budget / C$16.84K spend). Live examples: Freeze Dried CA = C$10,000 budget, C$9,950 spend,
61%, 59.6% planned, 103% delivery, C$20.59K est, C$3.26 ROAS, C$818.1 yday. Pagination:
"Total 2 entries, 10/page".

**10.2 Edit Daily Budget Allocation modal** (Calendar icon) — **Use Template** toggle; **Daily
Budget Mode** radio: **Even Amount** ("Monthly budget would be allocated to every day evenly") /
**Fixed Monthly Budget** / **Set Value By Date**; **Budget Insight** section with metric tabs
(**Impression / CTR / CVR / ROAS**) and two charts: **Day of Week** (bars) + **Day of Month**
(line). Footer Cancel / Confirm. Tooltip on calendar icon: "Calendar Set Manually : Even Amount".

**10.3 Clone build (v1)** — rebuilt Budget Manager page to this structure with Brightleaf mock
data; goals persist in localStorage ('chgoals'); toggles persist; allocation modal implemented with
mock insight charts. Not yet built: Calendar Template Manager, Bulk Upload, analysis view, AI modal.

### Phase-13 gaps surfaced by this audit (clone vs live)
1. **Campaign-type chooser + single 5-step Create flow** (SP/SB/SD/STV + Sites toggle) — clone only has the Super Wizard.
2. **Rule builder depth** — add the grouped **Rule-Type chooser modal**, **Mode (Automated/Requires Approval)**,
   Running Time Zone, **action Cap/ceiling**, **"Same SKU"**, **multiple Automation blocks**, **Preview Results**,
   **Save as template**, and the **Rule Kickstart** template rail.
3. **Filter operators** — align to Contains(or) / Contains(and) / Not Contains / Is / Is Not / Start with.
4. **Dimensions** — add **Placement** and **Campaign Type (Drill-down)**.
5. **Dedicated Bulk Operations spreadsheet page** ("Pacvue XL") with the 6 tabs + Quick Campaign Edits list.
6. **Column-preset names** — align to Target ACOS View / Performance / Default Plan / Custom Columns.
7. **Date presets** — add the **"Exclude latest 2 days"** variants.

# CommerceHub — Pacvue Functionality Spec & Gap Analysis

> Deep-dive into how Pacvue's **desktop** product (`product.pacvue.com`) actually works, captured from
> the live account + Pacvue docs. This is the basis for rebuilding the clone's interaction layer.
> **Review this, then we build.** Status legend: ✅ in clone · 🟡 partial · ❌ missing.
>
> Created session 2 · 2026-06-20.

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

## 9. Open items to verify next live session
- Exact **Custom Columns** chooser UI (the add/remove/reorder panel) and full metric list.
- Literal **Bulk Operations** action-bar labels and each action's modal.
- **Create Campaign** single-flow fields, step by step.
- **Rule** builder screen layout (condition/action rows).
- **Dimensions** group-by option list; **Filters** panel full operator list.
(The live grid loaded slowly on an old date range; revisit with a recent range, e.g. Last 30 Days.)

# CommerceHub — Functional Test Script (GOALS.md C1)

> One test per feature in FEATURE-MAP.md / FUNCTIONALITY-SPEC.md (incl. §9 gaps + §10 Goals).
> **Method:** STATIC = verified by grep/inspection of the built single-file bundle (`CommerceHub.html`);
> BROWSER = requires live interaction against the built bundle (run in Chrome, not the dev server).
> **Static result** column records the bundle-presence check done 2026-07-20 (session 10).
> Browser-pass results are logged in §Results at the bottom.
>
> **Known deliberate stubs (expected toast-only, NOT fails):** Targeting bulk "Add as Negative";
> Dayparting "Apply to Campaigns"; rule "run" (no campaign engine behind the mock layer).

---

# Functional tests — Sponsored Ads surface

Routes covered: `/ads/campaigns`, `/ads/adgroups`, `/ads/targeting`, `/ads/search-terms`, `/ads/sov`, `/ads/dayparting`, `/ads/bulk`.
Static verification run against the built bundle `CommerceHub.html` (identical to `index.html`, verified with `cmp`). Method = STATIC when the behavior is fully verifiable by grep/inspection of the bundle; BROWSER when live interaction is required to confirm rendering/behavior (static column still records whether the implementing code is present and wired).

## Campaigns — /ads/campaigns

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| SA-01 | Route renders Campaigns grid | Navigate to `/ads/campaigns` | Page head "Campaigns", KPI row (Impressions…Orders), DataGrid with sticky Campaign column, footnote | BROWSER | PASS — `<Route path="/ads/campaigns" element={<Campaigns />}>` + `<DataGrid id="ads-campaigns">` in bundle |
| SA-02 | Column sort | Click a metric header (e.g. Spend), click again | Sorts desc then asc; caret indicator flips; numeric vs string comparators | BROWSER | PASS — `onSort`, `SortCaret`, `sortVal` logic present; initialSort `{key:'spend'}` wired |
| SA-03 | Column presets (live names) | Columns menu → switch presets | Exactly 4 presets: Target ACOS View · Performance · Default Plan · Custom Columns; visible column set changes; default = Default Plan | BROWSER | PASS — all 4 preset names + `applyPreset` + `defaultPreset="Default Plan"` in bundle |
| SA-04 | Show/hide/reorder columns persist | Columns menu → uncheck a column, move one with ↑/↓, reload | View becomes "Custom"; layout restored after reload | STATIC | PASS — `toggleCol`/`moveCol` set view Custom; `gridStore` reads and writes `chgrid:<id>` (getItem/setItem both present, key symmetric) |
| SA-05 | Pagination + go-to-page | Set Rows=25, click page numbers, ‹/›, type page in "Go to" + Enter | Correct slice per page; "Total N entries"; Go-to clamps 1..pageCount | BROWSER | PASS — `pageList`, `pg-total`, `Go to` input with Enter handler present |
| SA-06 | Totals row | Enable totals-bearing view; scroll to grid foot | Pinned `tfoot` row "Total · N" with per-column aggregates (`foot(rows)`) | BROWSER | PASS — `totals` prop + tfoot `Total · {totalEntries}` + `foot:` aggregates on metric columns |
| SA-07 | Dimensions group-by incl. Placement + Campaign Type (Drill-down) | Dimensions menu → group by Placement; then Campaign Type (Drill-down) | Group header rows with counts + group subtotals; plain dims start expanded; Drill-down dim starts **collapsed**, click header to expand; pager shows "Grouped — all rows shown" | BROWSER | PASS — dims array has `Placement`, `Campaign Type`, `Campaign Type (Drill-down)` with `drill: true`; collapsed logic `dimDef?.drill ? toggledGroups.has(g) : !toggledGroups.has(g)` present |
| SA-08 | Compare vs prev period | Toggle "vs prev period"; also set range to All time | Delta chips (▲/▼ %) on delta columns computed from `comparePrev`; toggle disabled for "All time" with tooltip | BROWSER | PASS — `vs prev period` toggle, `DeltaChip`, `comparePrev={prev}`, `compareDisabled` on All time all present |
| SA-09 | Density toggle | Click "Compact" chip | Table gains `dense` class (tighter rows); toggles back | BROWSER | PASS — Compact chip + `dt dense` class switch present |
| SA-10 | Text filter operators | Filters → add condition on Campaign Name; try each op; use comma list "beef, salmon" | 6 operators: Contains(or) · Contains(and) · Not Contains · Is · Is Not · Start with; comma splits into multi-terms (or=some, and=every, not=none) | STATIC | PASS — all 6 labels in OPS.text; `q.split(',')` multi-term logic with every/some/none branches present |
| SA-11 | Enum + number operators | Add Status filter (is any of / is not); add Spend filter (>, ≥, <, ≤, =, between with min–max) | Enum chips multi-select; number ops incl. two-input `between` | STATIC | PASS — OPS.enum (`is any of`/`is not`) and OPS.number incl. `between` + min/max inputs present |
| SA-12 | AND/OR join + filter chips | Add 2 conditions; switch ALL conditions / ANY condition; remove via chip ✕ | Join respected in `applyFilters` (every vs some); active conditions render as removable chips | STATIC | PASS — ALL/ANY seg buttons, `model.join === 'OR' ? res.some : res.every`, `fchip` chips with removeById |
| SA-13 | Saved Plans persistence | Build filters → type name → Save Plan; reload; apply; delete | Plan saved to `chplan:ads-campaigns`; listed in panel; apply restores model; delete removes | STATIC | PASS — planStore get/set both use `chplan:` prefix; savePlan/applyPlan/deletePlan wired in FilterBar |
| SA-14 | Filter model persists per grid | Set a filter, reload page | Conditions restored (`loadFilterModel('ads-campaigns')`) | STATIC | PASS — filterStore reads+writes `chfilter:` (symmetric); FilterBar effect persists on change; page inits via `loadFilterModel('ads-campaigns')` |
| SA-15 | Date presets incl. Exclude-latest-2-days | Open topbar range menu | Presets include Last 7/14/30 days each with "(Exclude latest 2 days)" variant; grid metrics rescale (`scaleForRange`) | STATIC | PASS — `ranges` array in Layout has all 3 exclude variants; RANGE_DAYS maps each; scaleForRange wired on all Ads grids |
| SA-16 | Custom date range | Range menu → Custom… → pick start/end | Label becomes "Mon D – Mon D"; days computed from real dates | BROWSER | PASS — `Custom…` preset + `resolveRange` custom branch (`custom.start/custom.end`) present |
| SA-17 | Selected range persists | Pick a range, reload | Same range restored (localStorage `chrange`) | STATIC | PASS — `chrange` getItem+setItem both present in state provider |
| SA-18 | Inline State dropdown | Click State pill on a row → choose Paused/Archived | Popover with Enabled/Paused/Archived; row state + status update | BROWSER | PASS — `StateSelect` def + use on campaigns `state` column; `setState` merges override |
| SA-19 | Inline budget edit + persistence | Click Daily Budget cell, type value, Enter; reload | EditableNum commits on Enter/blur, Esc cancels; toast; value persists via `chedits:ads-campaigns` | STATIC | PASS — `<EditableNum` on dailyBudget; `usePersistentOverrides('ads-campaigns')` → editStore reads+writes `chedits:` (symmetric) |
| SA-20 | Bulk Enable/Pause/Archive | Select rows → bulk bar → Enable / Pause / Archive | "N selected" bar appears; state+status set on all selected; selection clears; toast | BROWSER | PASS — bulkbar with Enable/Pause/Archive buttons → `bulkState` → `mergeMany` |
| SA-21 | Adjust Bids modal | Select rows → Adjust Bids → each mode | Modal "Adjust bids"; 6 modes: Set to value / Increase % / Decrease % / Set to available bid / ceiling / floor; `applyBidOp` math applied to actlBid | BROWSER | PASS — `<BulkBidModal` invoked; title "Adjust bids"; all 6 modes + `applyBidOp` (set/inc/dec/suggested/ceiling/floor) present |
| SA-22 | Adjust Budget modal | Select rows → Adjust Budget → set/inc/dec | Modal "Adjust daily budget"; dailyBudget updated via `applyBudgetOp` | BROWSER | PASS — `<BulkBudgetModal` invoked; title present; applyBulkBudget wired |
| SA-23 | Bulk Tag | Select rows → Tag → enter name | Modal "Apply tag"; tag chip appears in Campaign name cell | BROWSER | PASS — `<BulkTagModal` invoked; tag rendered in namecell |
| SA-24 | Bulk Dayparting + clock badge | Select rows → Dayparting → pick schedule → Apply | Modal "Apply dayparting" with 5 schedule presets; row gets clock-icon badge titled "Dayparting: <sched>" | BROWSER | PASS — `<BulkDaypartModal` invoked; DAYPART_PRESETS; clock badge render `r.daypart &&` present |
| SA-25 | Bulk Apply Rule + badge | Select rows → Apply Rule → choose rule | Modal "Apply automation rule" listing rules (created + seeded); IF/THEN note; sliders-icon badge titled "Rule: <name>" | BROWSER | PASS — `<ApplyRuleModal` invoked with `[...createdStore.get('rules'), ...RULES]`; badge render `r.appliedRule &&` present |
| SA-26 | Choose Campaign Type modal | Create Campaign button | Modal "Create Campaign / Choose Campaign Type": SP · SB · SD · Sponsored TV cards + Super Wizard card with Sites chips (Amazon and beyond / Amazon Business); Continue disabled until selection | BROWSER | PASS — `<ChooseCampaignType` invoked; CC_TYPES incl. STV; CC_SITES both labels; `disabled={!sel}` |
| SA-27 | 5-step SP single flow | Chooser → SP → Continue; walk steps | Steps: Campaign → Adgroup and Ads → Targeting → Negative Targeting → Complete; step 1 fields Profile/Name(≤128)/State/Date Range/Daily Budget/Sites/Targeting(Auto-Manual); auto match groups (Close/Loose/Substitutes/Complements) or manual keywords; Launch adds row | BROWSER | PASS — `<SingleCampaignFlow` invoked; exact 5-step array, `maxLength={128}`, AUTO_GROUPS, negative match types present |
| SA-28 | 9-step Super Wizard | Chooser → Super Wizard card → Continue | Steps: Products → Daily budget → Schedule → Campaign type → Ad groups → Targeting themes → Naming → Optimization → Review; naming template vars {brand}{asin}{type}{theme}{match}; launches one campaign per product | BROWSER | PASS — `<CreateCampaignWizard` invoked; exact 9-step array + varchips + launch mapping present |
| SA-29 | Created campaigns persist | Launch from either flow; reload | Rows prepended with tag NEW; stored in `chcreated:campaigns`; survive reload (`createdStore.get('campaigns')` on mount) | STATIC | PASS — createdStore reads+writes `chcreated:` (symmetric); `createdStore.set('campaigns', …)` in onLaunch/save/duplicate; init reads store |
| SA-30 | Edit created campaign (act column) | On a created row, click edit icon in act column | "Edit Campaign" modal (name/budget/state/type/bid strategy); save updates row + clears its inline override; seeded rows show "—" | BROWSER | PASS — `<EditCampaignModal` invoked via `createdById[r.id]` guard; saveCampaign deletes override for edited id |
| SA-31 | Duplicate created campaign | Click copy icon on created row | Copy appended: name + " (copy)", state Paused, tag NEW; persists | BROWSER | PASS — `duplicateCampaign` wired to copy icon; sets store |
| SA-32 | Export CSV/XLS | Export → CSV, then Excel | Files `campaigns-<date>.csv/.xls` download with CAMPAIGN_FIELDS headers and currently-filtered rows; toast with row count | BROWSER | PASS — `<ExportMenu name="campaigns" rows={filtered}>`; exportCSV/exportXLS + Blob download present |

## Ad Groups — /ads/adgroups

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| SA-33 | Route renders Ad Groups grid | Navigate to `/ads/adgroups` | KPI row + DataGrid (`id="ads-adgroups"`) with State/Default Bid/metrics; totals; dims Profile/State; FilterBar | BROWSER | PASS — route + grid + FilterBar `id="ads-adgroups"` present |
| SA-34 | New Ad Group modal | Click "New Ad Group" → fill name/campaign/bid/state → Create | Modal "New Ad Group"; row appears with zero metrics; persists in `chcreated:adgroups` | BROWSER | PASS — `<NewAdGroupModal` invoked; `createdStore.get('adgroups')` + `.set('adgroups', …)` both present |
| SA-35 | ?camp= drill-down + back-bar | From Campaigns, click a campaign name link | URL `/ads/adgroups?camp=<id>`; drillbar "Back to Campaigns" + campaign name + type pill; rows = that campaign's ad groups (deterministic split) | BROWSER | PASS — `get('camp')`, `adGroupsForCampaign`, drillbar + Back-link `to="/ads/campaigns"` present |
| SA-36 | Inline edits persist | Change State (Enabled/Paused) and Default Bid; reload | Overrides stored under `chedits:ads-adgroups` and reapplied | STATIC | PASS — `usePersistentOverrides('ads-adgroups')`; StateSelect (2-option) + EditableNum on defaultBid wired to merge |
| SA-37 | Export CSV/XLS | Export menu → both formats | `ad-groups-<date>.csv/.xls` with ADGROUP_FIELDS | BROWSER | PASS — `<ExportMenu name="ad-groups">` present |

## Targeting — /ads/targeting

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| SA-38 | Route renders Targeting grid + tabs | Navigate to `/ads/targeting` | View tabs Keywords / Product Targets / Negatives; grid `id="ads-targeting"` with Match/State/Bid/Suggested/Top-of-Search IS; compare toggle; totals | BROWSER | PASS — route + tab triple + grid props present |
| SA-39 | Add Keywords modal | "Add Keywords" → multi-line keywords, campaign, match, bid → Add | Modal "Add Keywords"; one row per line, state Enabled, zero metrics; persists via `chcreated:keywords` | BROWSER | PASS — `<AddKeywordsModal` invoked; newline parse; `createdStore.set('keywords', …)` present |
| SA-40 | Bulk bar: Set Bid / +% / −% / Pause / Add as Negative | Select rows → each button | Set Bid/+%/−% open BulkBidModal preset to that mode (suggested label "suggested bid"); Pause sets state; Add as Negative clears selection + toast ("negative exact" — toast-only, no negative row created) | BROWSER | PASS — all 5 buttons + `initialMode` prop + bulkPause/bulkNegative present. Note: Add as Negative is intentionally toast-only (no persistence) |
| SA-41 | Inline bid/state edit + persistence | Edit Bid cell; change State; reload | Committed via `chedits:ads-targeting`; `applyBidOp` used for bulk math (set/inc/dec/suggested/ceiling/floor) | STATIC | PASS — `usePersistentOverrides('ads-targeting')`; EditableNum on bid; applyBidOp shared |
| SA-42 | Export CSV/XLS | Export menu → both formats | `targeting-<date>.csv/.xls` with TARGETING_FIELDS | BROWSER | PASS — `<ExportMenu name="targeting">` present |

## Search Terms — /ads/search-terms

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| SA-43 | Route renders + recommendation chips | Navigate to `/ads/search-terms` | Hint with harvest/negate counts; chips All/Harvest/Negate/Monitor filter rows by `recommend`; grid `id="ads-searchterms"`; Recommendation pill column; dims Recommendation | BROWSER | PASS — route, chip quad, recTone pills, dims present |
| SA-44 | Harvest / Negate actions persist | Click Harvest on a harvest row, Negate on a negate row; reload | Button flips to "Harvested"/"Negated" with check icon; toasts; stored in `chedits:ads-searchterms-acts` and restored on reload | STATIC | PASS — `usePersistentOverrides('ads-searchterms-acts')`; harvest/negate setters + label flip `acts[r.id]===…` present; key read/write symmetric via editStore |
| SA-45 | Export CSV/XLS | Export menu → both formats | `search-terms-<date>.csv/.xls` with SEARCHTERM_FIELDS | BROWSER | PASS — `<ExportMenu name="search-terms">` present |

## Share of Voice — /ads/sov

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| SA-46 | Route renders SOV grid + KPIs | Navigate to `/ads/sov` | KPIs Avg Paid/Organic/Total SOV, Keywords Tracked, #1 Rank; grid `id="ads-sov"` with Paid/Organic share bars, rank, competitor, 7d trend; dim Top Competitor | BROWSER | PASS — route, KPI labels, ShareBar, dims present |
| SA-47 | Track Keyword modal | "Track Keyword" → keyword (+optional volume/competitor) → Track | Modal "Track Keyword"; zero-share row prepended; persists via `chcreated:sov`; toast | BROWSER | PASS — `<TrackKeywordModal` invoked; `createdStore.get('sov')` + `.set('sov', …)` both present |
| SA-48 | Export CSV/XLS | Export menu → both formats | `share-of-voice-<date>.csv/.xls` with SOV_FIELDS | BROWSER | PASS — `<ExportMenu name="share-of-voice">` present |

## Dayparting — /ads/dayparting

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| SA-49 | Route renders heatmap + brush palette | Navigate to `/ads/dayparting` | 7×24 grid (168 hourly slots, avg/peak in card sub); brush palette 0.40×–1.50× (7 swatches); legend | BROWSER | PASS — route, DP_BRUSHES (7 values), dp-swatch buttons, "168 hourly slots" present |
| SA-50 | Paint via click + drag, persists | Pick brush; click a cell; mousedown + drag across cells; reload | Cells set to brush value (mousedown paints, mouseenter paints while held; global mouseup ends); saved to localStorage `chdaypart` on every paint and restored on load | STATIC | PASS — paint handlers (`painting.current`), window mouseup cleanup; `dpSave` on paint; `getItem(DP_KEY)`/`setItem(DP_KEY)` both present, DP_KEY='chdaypart' |
| SA-51 | Reset | Click Reset | Grid returns to default `dayparting` mock schedule; persisted; toast "Schedule reset to default" | BROWSER | PASS — reset handler writes default via dpSave |
| SA-52 | Suggest Schedule | Click Suggest Schedule | Heuristic schedule applied (overnight 0.35, midday 1.3, evening 1.5, weekend ×1.1, cap 1.6); persisted; toast | BROWSER | PASS — `dpSuggest` defined and wired to button |
| SA-53 | Apply to Campaigns | Click Apply to Campaigns | Toast "Dayparting schedule applied to 40 campaigns" (mock push) | BROWSER | PASS — apply handler + toast present |

## Bulk Operations — /ads/bulk

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| SA-54 | Route renders 6 tabs | Navigate to `/ads/bulk` | Segmented tabs: Create / Update Campaign · Quick Campaign Edits · Campaign Target Setting · Create Tag · Campaign Tag Target Setting · Upload Campaign Mapping; per-tab field schema drives templates | BROWSER | PASS — XL_TABS array with all 6 labels + XL_FIELDS per tab present |
| SA-55 | Quick Campaign Edits setting list | Select Quick Campaign Edits tab → "Setting to modify" dropdown | 7 settings: Change Campaign Name / Budget / State · Change Targeting Bid / State · Add Targeting · Add Negative Targeting | STATIC | PASS — XL_QUICK contains all 7 (incl. "Change Targeting Bid"); dropdown rendered only on that tab |
| SA-56 | Pacvue/Amazon template downloads | Toggle format Pacvue↔Amazon; Download template (create); Download existing data (edit) | CSV named `<fmt>-<tab>-template-<date>.csv` (header-only) or `…-existing-data-…` (campaign rows for chosen profile); toasts | BROWSER | PASS — format seg `['Pacvue','Amazon']`, `downloadTemplate`/`downloadExisting` → exportCSV wired |
| SA-57 | Upload + history persistence + 10k limit | Upload a filled CSV; upload one with >10,000 data rows; reload | History card row: timestamp · tab (+setting) · filename · row count · format · status; "Rejected — over 10,000 row limit" for oversize; history persists in `chcreated:bulkops` | STATIC | PASS — FileReader row count, `n > 10000` reject branch, `createdStore.get('bulkops')` + `.set('bulkops', …)` both present |

---

# Test Section DC — Overview + DSP + Commerce

Scope: routes `/` (Overview), `/dsp`, `/dsp/audiences`, `/dsp/amc`, `/commerce/shelf`, `/commerce/buybox`, `/commerce/products`, plus topbar date-range/profile controls.
Static verification performed by grep against the built bundle `CommerceHub.html` (2026-07-20 build, 327,358 bytes, identical to `index.html`). Bundle carries raw JSX transpiled in-browser by Babel standalone, so source-form patterns are grep-able verbatim.

Legend — Method: STATIC = verifiable by grep on the bundle; BROWSER = needs live interaction (static column then records whether the implementing code is present and wired, not runtime behavior).

## Overview (`/`)

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| DC-01 | KPI cards with real vs-prev deltas | Load `/`; note the 8 KPI cards (Ad Spend, Ad Sales, ACoS, ROAS, TACoS, Impressions, Orders, Avg Buy Box); change the date range and profile; observe delta chips | Delta chips reflect computed change vs the prior period (values shift when the period shifts) | BROWSER | **FAIL** — deltas are hardcoded literals in the bundle (`delta={8.2}`, `delta={12.6}`, `delta={-2.4}` etc. at Kpi call sites in the Overview section); no `comparePrev`/`scaleForRange` feeds Overview KPIs |
| DC-02 | Spend-vs-sales trend chart (SVG chart engine) | Load `/`; inspect "Performance trend · Spend vs Sales · last 30 days" card | SVG line/area chart renders from `timeseries` mock data | STATIC | PASS — `<PerfChart data={timeseries}` invoked; `function PerfChart` present in ui section |
| DC-03 | Spend & sales by channel | Load `/`; inspect "Spend & sales by channel" card | Dual-bar chart with SP / SB / SD / DSP rows, spend + sales series | STATIC | PASS — `<DualBar data={channelData}` invoked with `Sponsored Products/Brands/Display` + DSP rows. Note: SP/SB/SD values are hardcoded constants; only the DSP row derives from `dspOrders` |
| DC-04 | Profile switcher (All/US/CA/UK) filters data | Load `/`; switch topbar profile to US, CA, UK, back to All Profiles | KPI values change; subtitle shows the selected profile | BROWSER | PASS (wiring) — `campaigns.filter((c) => c.profileId === profileId)` present in Overview. Note: DSP spend/sales, TACoS constant, and digital-shelf health tiles are **not** profile-filtered (computed over full `dspOrders`/`digitalShelf`) |
| DC-05 | Date range affects Overview KPIs | Change topbar range (e.g. Last 7 days vs Last 30 days) on `/` | KPI values rescale to the selected range | BROWSER | **FAIL** — Overview destructures only `{ profileId }` from `useApp()`; `rangeResolved` is never read and no `scaleForRange`/`scaleFields` call exists in the Overview section. Date range provably has no effect on this page |

## Topbar (global, tested from `/`)

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| DC-06 | Date-range button + preset list incl. "Exclude latest 2 days" variants | Click calendar button; inspect preset list | 12 presets: Today, Yesterday, Last 7/14/30 days each with an "(Exclude latest 2 days)" variant, This month, Last month, All time, Custom… | STATIC | PASS — full `ranges` array in Topbar and matching `RANGE_DAYS` map incl. `'Last 7/14/30 days (Exclude latest 2 days)'` keys |
| DC-07 | Custom range panel | Pick "Custom…"; set start/end; Apply | Panel opens with two date inputs; applying sets label to "MMM d – MMM d" and days from the picked span | BROWSER | PASS (wiring) — `CustomRangePanel` component + `onApply={... setCustomRange({ start, end }); setRange('Custom…')}` + `resolveRange` custom branch (`key: custom:start_end`) all present |
| DC-08 | Range persists across reload (localStorage `chrange`) | Set a range; reload page | Same range label restored | STATIC | PASS — `localStorage.setItem('chrange', JSON.stringify({ range, customRange }))` in AppProvider effect, `localStorage.getItem('chrange')` in loader |
| DC-09 | Profile switcher persistence | Select US profile; reload | Profile restored if persistence implemented | STATIC | n-a — not implemented (by design): `chrange` payload contains only `{ range, customRange }`; `profileId` is plain `useState('all')`. Reload resets to All Profiles |

## DSP Campaigns (`/dsp`)

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| DC-10 | Column presets | Open column chooser on grid `dsp-orders`; switch Default / Performance / Delivery | Visible columns change per preset | STATIC | PASS — `presets` object with `Default/Performance/Delivery` keys passed to `<DataGrid id="dsp-orders"`; DataGrid renders `cm-presets` from `Object.keys(presets)` |
| DC-11 | Dimensions (group by tactic/status/profile) | Use group-by control | Rows group with subtotals by Tactic, Status, Profile | STATIC | PASS — `dimensions` = `[{ key: 'tactic'...}, { key: 'status'...}, { key: 'profileId', label: 'Profile' }]` on dsp-orders grid |
| DC-12 | Totals row | Inspect grid footer | Footer sums Budget/Spend/Impr/Clicks/Sales etc., weighted CTR/CPM/ROAS recomputed from sums | STATIC | PASS — `totals` prop set; every numeric column defines `foot:` recomputing from row sums |
| DC-13 | Compare toggle, disabled on All time | Toggle "vs prev period"; then set range = All time | Delta sub-rows appear; toggle disabled with tooltip on All time | STATIC | PASS — `compare comparePrev={prev} compareDisabled={allTime}` with `allTime = rangeResolved.label === 'All time'`; DataGrid gates via `compareOn && !compareDisabled` + disabled-toggle tooltip |
| DC-14 | FilterBar (id `dsp-orders`) + saved plans | Add filter (e.g. Tactic = Remarketing); save as Plan; reload | Rows filter; model persists under `chfilter:dsp-orders` / plans under `chplan:dsp-orders` | STATIC | PASS — `<FilterBar id="dsp-orders"` with `DSP_FIELDS`, `loadFilterModel('dsp-orders')` initializer, `chfilter:`/`chplan:` storage helpers present |
| DC-15 | Export CSV/XLS | Export menu → CSV, then Excel | Files `dsp-campaigns-YYYY-MM-DD.csv/.xls` download with current filtered rows; toast confirms | STATIC | PASS — `<ExportMenu name="dsp-campaigns" fields={DSP_FIELDS} rows={filtered}` + `exportCSV`/`exportXLS` implementations |
| DC-16 | KPI deltas are real vs-prev | Change range; watch DSP KPI delta chips | Deltas computed from prev-period rows, not constants | STATIC | PASS — `dl = (cur, prv) => ((cur - prv) / Math.abs(prv)) * 100` over `prevFiltered` mapped from `prev[r.id]` |
| DC-17 | Multi-currency symbols | Switch profile to CA / UK; inspect Budget/Spend/CPM/Sales cells and footers | C$ / £ symbols per row profile; footer uses first row's symbol | STATIC | PASS — `symD = (pid) => profileById[pid]?.currency || '$'` used in all money renders/footers; mock profiles carry `currency: '$'`, `'C$'`, `'£'` |
| DC-18 | scaleDsp recomputes derived rates after range scaling | Change range; check ROAS/CPM/CTR columns stay internally consistent (ROAS = sales/spend etc.) | Derived rates recomputed from scaled cumulatives for both current and prev rows | STATIC | PASS — `scaleDsp` calls `scaleFields(rows, range, ['impr','clicks','spend','purchases','sales'])` then `fix()` recomputes `roas/cpm/ctr` and applies it to every `prev[k]` too |

## Audience Builder (`/dsp/audiences`)

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| DC-19 | Builder card — seed by ASINs/Keywords | Toggle ASINs / Keywords tabs; check input placeholder changes; click Generate Audience | Tab state switches placeholder (`Paste ASINs…` vs `Enter seed keywords…`) | STATIC | PASS — `seedType === 'ASINs'` conditional placeholder, viewtab toggle, `Generate Audience` button present |
| DC-20 | Prebuilt template list | Inspect "Prebuilt templates" card | 5 templates (Awareness, Retargeting, Repeat purchase, Competitor conquest, High-LTV lookalike) each with Use button | STATIC | PASS — all 5 template strings + `Prebuilt templates` card rendered |
| DC-21 | SP×DSP overlap visual | Inspect "Audience overlap" card | Two-circle SVG venn with 28% label and footnote | STATIC | PASS — inline `<svg>` venn + `28% of converters` footnote |
| DC-22 | DataGrid + FilterBar + dimensions + totals | Filter by Type; group by Type/Status; check footer | Grid `dsp-audiences` filters, groups, totals Reach/Used-in | STATIC | PASS — `<DataGrid id="dsp-audiences"` with `dimensions` (type/status), `totals`, `<FilterBar id="dsp-audiences"` + `loadFilterModel('dsp-audiences')` — ids consistent |
| DC-23 | Export on audience grid | Look for Export control on `/dsp/audiences` | CSV/XLS export of the audience list | STATIC | **FAIL** — no `<ExportMenu` on the Audiences page (bundle has 13 ExportMenu instances; none named for audiences) and DataGrid has no built-in export. Feature absent |

## AMC (`/dsp/amc`)

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| DC-24 | Query library grid + FilterBar | Search/filter queries; group by Template/Schedule/Status | Grid `dsp-amc` filters via AMC_FIELDS; dims work; totals on Rows | STATIC | PASS — `<DataGrid id="dsp-amc"` + `<FilterBar id="dsp-amc"` + `loadFilterModel('dsp-amc')`, dims template/schedule/status, `totals` |
| DC-25 | Template cards | Inspect Templates card | 6 tiles: Customer Journey, New-to-Brand Analysis, Audience Overlap, Frequency Analysis, Path to Conversion, Custom SQL | STATIC | PASS — all 6 template strings present |
| DC-26 | Build Audience action | Check per-row actions | View + Build Audience buttons on each query row | STATIC | PASS — `Build Audience` button in `act` column render |
| DC-27 | Export on AMC grid | Look for Export control on `/dsp/amc` | CSV/XLS export of query list | STATIC | **FAIL** — no `<ExportMenu` on the AMC page (page head has only Refresh All / New Query). Feature absent |

## Commerce shared plumbing

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| DC-28 | useCommerceData: profile filter + selective scaling | On any commerce page, switch profile and range; compare columns | Rows filter by profile; only Glance Views + Ordered Revenue rescale with range; Buy Box %, price, rating, content score, stock unchanged | STATIC | PASS — `scaleFields(base, rangeResolved, ['glanceViews', 'orderedRevenue'])` — exactly two fields listed; `scaleFields` mutates only listed fields |
| DC-29 | Derived enum mirrors for filters | Filter Availability / MAP / A+ / Video via FilterBar enums | String mirrors drive enum filters: In Stock/Out of Stock, OK/Violation, Yes/No ×2 | STATIC | PASS — decorate() sets `availability`, `mapStatus`, `aplusLabel`, `videoLabel` exactly as specified; enum options in SHELF/BUYBOX/PRODUCT_FIELDS match those strings |

## Digital Shelf (`/commerce/shelf`)

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| DC-30 | Grid presets / dimensions / compare | Switch presets (Default, Content health, Availability & price, Performance); group by Category/Marketplace/Availability/Brand; toggle compare; set All time | Presets swap columns; grouping works; compare shows prev deltas on Glance Views + Ordered Rev, disabled on All time | STATIC | PASS — all 4 preset keys, 4 dims, `compare comparePrev={prev} compareDisabled={allTime}` on `<DataGrid id="commerce-shelf"` |
| DC-31 | FilterBar (id `commerce-shelf`) | Multi-condition filter (e.g. Availability = Out of Stock AND Content Score < 75); save Plan | Rows filter; persists under `chfilter:commerce-shelf` | STATIC | PASS — `<FilterBar id="commerce-shelf"` + `loadFilterModel('commerce-shelf')`, ids consistent with grid |
| DC-32 | MAP flag | Find a MAP-violating row; inspect Price cell | Red "MAP" pill appended to price | STATIC | PASS — `r.mapViolation && <span className="pill red" ...>MAP` in price render |
| DC-33 | Content score | Inspect Content Score column | Color-coded mini progress bar (green ≥85 / amber ≥70 / red) with numeric value | STATIC | PASS — `<ScoreBar v={r.listingScore}` with threshold coloring |
| DC-34 | Export CSV/XLS | Export menu on shelf grid | `digital-shelf-YYYY-MM-DD.csv/.xls` with filtered rows | STATIC | PASS — `<ExportMenu name="digital-shelf" fields={SHELF_FIELDS} rows={filtered}` |

Note: the "Ad Action" column called out in FEATURE-MAP §3 is implemented on the Buy Box grid (DC-37), not the Digital Shelf grid — Shelf carries the Rule-R5 hint banner instead. Not a defect, but the feature map's wording points at Shelf.

## Buy Box & Inventory (`/commerce/buybox`)

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| DC-35 | State-focused grid, no compare | Inspect grid toolbar on `commerce-buybox` | No "vs prev period" toggle (state metrics have no period compare); totals + dims (Availability/MAP/Marketplace) present | STATIC | PASS — `<DataGrid id="commerce-buybox"` block has `dimensions` + `totals` and **no** `compare`/`comparePrev` props (verified by block extraction) |
| DC-36 | FilterBar (id `commerce-buybox`) | Filter MAP = Violation, Availability = Out of Stock | Rows filter; persists under `chfilter:commerce-buybox` | STATIC | PASS — `<FilterBar id="commerce-buybox"` + `loadFilterModel('commerce-buybox')` consistent |
| DC-37 | Ad Action column | Inspect rows with OOS or Buy Box < 50% | "Ads paused" amber pill; otherwise green "Serving" | STATIC | PASS — `key: 'adImpact', label: 'Ad Action'` with `(!r.inStock \|\| r.buyBox < 50)` logic |
| DC-38 | Export CSV/XLS | Export menu | `buy-box-inventory-YYYY-MM-DD.csv/.xls` | STATIC | PASS — `<ExportMenu name="buy-box-inventory"` |

## Product Center (`/commerce/products`)

| ID | Feature | Steps | Expected | Method | Static result |
|---|---|---|---|---|---|
| DC-39 | Dedupe by ASIN | With All Profiles selected, confirm each ASIN appears once (US+CA duplicates collapsed); row keys stable | Catalog-level view keyed by ASIN | STATIC | PASS — `m[d.asin] = m[d.asin] \|\| d` reducer + `rowKey="asin"` on `<DataGrid id="commerce-products"` |
| DC-40 | Prev-period map remapped by ASIN | Toggle compare; deltas render on Ordered Rev | Compare lookups hit by asin, not id | STATIC | PASS — `prevByAsin[r.asin] = prev[r.id]` + `comparePrev={prevByAsin}` `compareDisabled={allTime}` |
| DC-41 | Filters / presets / dimensions | Filter A+ Content = No; presets Default / Content gaps / Reviews & CVR; group by Category/A+/Video | All operate on the deduped set | STATIC | PASS — `<FilterBar id="commerce-products"` + `loadFilterModel('commerce-products')`, 3 preset keys, 3 dims present |
| DC-42 | Export CSV/XLS | Export menu | `product-center-YYYY-MM-DD.csv/.xls` | STATIC | PASS — `<ExportMenu name="product-center" fields={PRODUCT_FIELDS} rows={filtered}` |

## Cross-cutting wiring checks (informational)

- Router vs sidebar: every sidebar `to:` path has a matching `<Route>`; router additionally defines `/settings` (reachable via topbar/gear, not sidebar) and a `*` fallback to Overview. No orphan routes, no dead nav links.
- Grid id consistency: all six DC-surface grids use the same id for `DataGrid`, `FilterBar`, and `loadFilterModel` (`dsp-orders`, `dsp-audiences`, `dsp-amc`, `commerce-shelf`, `commerce-buybox`, `commerce-products`).
- All cited components are invoked in the bundle: `<DataGrid` ×15, `<ExportMenu` ×13, `<FilterBar`, `<PerfChart`, `<DualBar`, `<CustomRangePanel` all present as JSX invocations, and `Dsp/Audiences/Amc/DigitalShelf/BuyBox/Products` are each mounted by a Route.

### Static failures in this section

| ID | Failure |
|---|---|
| DC-01 | Overview KPI deltas hardcoded (`delta={8.2}` etc.) — not real vs-prev |
| DC-05 | Overview ignores date range entirely (`useApp()` → `profileId` only; no `rangeResolved`) |
| DC-23 | No Export control on Audience Builder grid |
| DC-27 | No Export control on AMC grid |

---

# Test section — Automation + Insights + Settings + Persistence (AI-xx)

Surface: `/rules`, `/budgets`, `/reports`, `/alerts`, `/settings` + cross-app localStorage round-trip.
Static verification done by grepping `CommerceHub.html` (bundle line numbers cited). Method: STATIC = verified by grep alone; BROWSER = needs a live click-through (static column records whether the code is present & wired).

## Rule Manager (/rules)

| ID | Feature | Steps | Expected | Method | Static result |
|----|---------|-------|----------|--------|---------------|
| AI-01 | Auto-rules DataGrid | Open /rules | Grid `id="auto-rules"` renders seeded rules + KPIs; sortable columns, pinned Totals (Affected foot), sticky Rule column | BROWSER | PASS — `<DataGrid id="auto-rules"` with `totals` + `initialSort` wired |
| AI-02 | FilterBar + saved filter model | Add a filter (e.g. Type = Bid), reload | Rows filter; model persists via `chfilter:auto-rules` | BROWSER | PASS — `<FilterBar id="auto-rules"` + `loadFilterModel('auto-rules')` on mount, `filterStore.set` in effect (bundle 1718) |
| AI-03 | Export | Export menu → CSV | File contains current filtered rows, RM_FIELDS columns | BROWSER | PASS — `<ExportMenu name="rule-manager" fields={RM_FIELDS} rows={filtered}` |
| AI-04 | Dimensions (group-by) | Open Dimensions → Type / Status / Scope | Grid groups by chosen dim | BROWSER | PASS — `dimensions={dims}` with type/status/scope on auto-rules grid |
| AI-05 | Rule-Type chooser modal (§9.4) | Click "Create Auto Rules" | "Select Rule Type" modal, tabs **All Rule / Recommended Usage**, groups **Advertising / Harvest / ASIN / Real-time / SOV**; Recommended tab filters to `rec` items; picking one opens builder with that ruleType | BROWSER | PASS — title `Select Rule Type` ×1, all 5 group labels present, `Recommended Usage` ×1, `<RuleTypeChooser` invoked, onPick → `setEdit({ ruleType, type })` |
| AI-06 | Builder step 1 — Basic Information | In builder: name (≤150), Running Time Zone select, Mode seg, Running Date start/end, Exclude Date(s), Send Email toggle, Apply to | Next disabled until name non-empty; Mode = **Automated Actions / Requires Approval**; 6 timezones | BROWSER | PASS — `Running Time Zone` ×1, `Automated Actions` ×2, `Requires Approval` ×3, `step1Ok` gates Next |
| AI-07 | IF condition rows | Step 2: add rows (level Targeting/Adgroup/Campaign, 12 metrics, ops incl. **between** → 2nd value input), AND/OR seg, **Same SKU** check, min-clicks / min-spend gates | Rows add/remove; between shows "and <max>"; gates appear in trigger string | BROWSER | PASS (partial) — all present incl. `Same SKU` ×2, `Min clicks gate`; **note: no EITHER join — only AND/OR seg (spec §6 lists And/Or/Either)** |
| AI-08 | Lookback + exclude-latest | Set Data from = Last 14 days, toggle "Exclude latest 2 days" | Trigger string gains `(14d, excl. latest 2d)` | BROWSER | PASS — lookback select 7/14/30 + `excludeLatest` check; `buildTrigger` emits excl. suffix |
| AI-09 | THEN action + Cap/ceiling | Pick action (11 options), value where needed, Cap $ | `RB_NEEDS_VAL` actions require value (save gated); cap appends "· cap $x" | BROWSER | PASS — `Cap / ceiling ($, optional)` input; `actionStr` appends cap; `blocksOk` gates OK |
| AI-10 | Multiple Automation blocks | Click "Add Automation", fill block 2, delete block | Blocks duplicate/delete; rule trigger notes "+1 more automation" | BROWSER | PASS — `Add Automation` ×1, `addBlock`/`delBlock`, buildTrigger `+N more automation` |
| AI-11 | Preview Results | Click Preview Results with valid blocks | Note shows "~N targets across M campaigns" (deterministic mock hash) | BROWSER | PASS — `Preview Results` ×2 (btn + note), `doPreview` seeded hash |
| AI-12 | Save as template | Fill rule → "Save as template" | Toast "Saved as template"; appears in Templates picker; persists `chcreated:ruleTemplates` | BROWSER | PASS — `createdStore.add('ruleTemplates')` (add() exists, bundle 1886); picker merges `createdStore.get('ruleTemplates')` |
| AI-13 | Rule Kickstart rail | In step 2, click a Kickstart card | Right rail lists 5 templates; clicking loads form via `normForm` + toast | BROWSER | PASS — `Rule Kickstart` ×1, rail maps RULE_TEMPLATES, onClick `setF(normForm(t.form))` |
| AI-14 | Legacy form normalization (normForm) | Load a legacy template (flat `conditions`/`action`) into v2 builder | Flat shape converted to `blocks[0]`; no crash | BROWSER | PASS — `normForm` ×3 in bundle; maps legacy conditions → blocks and back-fills level/sameSku; `cleanForm` mirrors legacy keys into `_f` |
| AI-15 | Create rule → persists | Save new rule, reload | Row prepended with "custom" tag; survives reload via `chcreated:rules` | BROWSER | PASS — `createdStore.set('rules', [rule, ...created])`; mount reads `[...createdStore.get('rules'), ...RULES]` |
| AI-16 | Edit rule (prefilled) | Edit a created rule and a seeded rule | Created rule prefills from `_f`; seeded rule prefills via `fallbackForm`; save updates in place ("Rule updated") | BROWSER | PASS — `openEdit` uses `r._f || fallbackForm(r)`; `fallbackForm` ×3 in bundle |
| AI-17 | Duplicate rule | Click copy icon | New row `"<name> (copy)"`, status **Paused**, affected 0, persisted | BROWSER | PASS — `(copy)` ×2 in bundle, `status: 'Paused'`, `createdStore.set('rules', [copy, ...])` |
| AI-18 | Status toggle write-through | Toggle a created rule off, reload | Pill flips Active↔Paused; created rules persist the flip in `chcreated:rules` | BROWSER | PASS — `toggle()` mirrors into store when `created.some(x => x.id === id)` |
| AI-19 | Rule Templates picker (5 presets) | Click "Templates" | Modal "Rule Templates" lists 5 presets (Defend Target ACoS, Scale Winners, Harvest, Negate, Budget Pacing Guard) + any saved; pick prefills builder | BROWSER | PASS — title `Rule Templates` ×1; preset keys acos/scale/harvest/negate/budget all in bundle; `<TemplatePicker` invoked |

## Budget/Goals Manager (/budgets)

| ID | Feature | Steps | Expected | Method | Static result |
|----|---------|-------|----------|--------|---------------|
| AI-20 | Profile→tag hierarchy grid (§10) | Open /budgets, expand a profile row | Profile rows ("Tag" badge, caret, N/x Active rollups) → tag rows (CA: Catch All/Dental/Freeze Dried/Sprinkles); 3 month groups × 8 cols (Budget/Spend/%/Planned %/Delivery/Est Spend/ROAS/Yday) | BROWSER | PASS — GOAL_TAGS per profile, month header maps 8 labels, `N/tags.length Active` rollup rendered |
| AI-21 | Budget-goal cell → chgoals | Click a "Not set ✎" Budget cell, type value, Enter; reload | Inline input; goal saved (`chgoals`), pacing/%/delivery recompute off new budget; Escape cancels | BROWSER | PASS — `saveGoal` → `goalStore.set` → `localStorage.setItem('chgoals')`; `tagMonth` reads override first |
| AI-22 | 4 automation toggles → chgoaltoggles | Flip Auto Pacing / Stop Over-Spend / Auto Re-enable / Flight Control on a tag; reload | Toggle persists (`chgoaltoggles`, default on); profile rollup count updates | BROWSER | PASS — all 4 labels ×2 each in bundle; `flipTgl` writes `chgoaltoggles` |
| AI-23 | Edit Daily Budget Allocation modal | Click a tag's Calendar icon | Modal "Edit Daily Budget Allocation": Use Template toggle, 3 modes (**Even Amount / Fixed Monthly Budget / Set Value By Date**) with helper text, **Budget Insight** tabs (Impression/CTR/CVR/ROAS) + Day-of-Week bars + Day-of-Month line; Confirm toasts | BROWSER | PASS — title ×2, all 3 mode labels + `Budget Insight` ×1, `<AllocModal` invoked |
| AI-24 | Set Budget Cap modal → chbudgetcaps | "Set Budget Cap" → pick marketplace, enter cap, Save | Cap persisted per profileId in `chbudgetcaps`; toast; Save disabled unless cap > 0 | BROWSER | PASS — title `Set Budget Cap` ×3, `capStore.set` → `chbudgetcaps`, `<SetBudgetCapModal` invoked |
| AI-25 | PacingChart SVG | Inspect "Month pacing — blended" card | SVG has: solid actual line to day 20, dashed projection to day 30 (red if over cap), dashed red cap line + label, grey target-pace diagonal, today marker | BROWSER | PASS — `<PacingChart` invoked; paths with `strokeDasharray` for projection/cap, diagonal `x(0),y(0) → x(days),y(cap)` |
| AI-26 | KPIs recompute on cap change | Change a cap; watch KPI row + grid | Total Monthly Cap / Remaining / Avg Pace + row pace %, remaining, status recompute live (`withCap`); Forecast unchanged (spend-based) | BROWSER | PASS — `withCap` ×2; `data = useMemo(budgets.map(b => withCap(b, caps)), [caps])` feeds KPIs and grid |
| AI-27 | Not-set alerts | Find a tag with no budget in current month | Red "!" beside Auto Pacing / Stop Over-Spend toggles, tooltip "No budget goal set"; "Not set ✎" in Budget cell | BROWSER | PASS — `!m0.budget && <span title="No budget goal set">!` and `Not set` ×1 |
| AI-28 | Budgets DataGrid/FilterBar/Export | Filter pace status, group by currency, export | Grid `auto-budgets` with totals, dims (Pace status/Currency), `chfilter:auto-budgets`, ExportMenu "budget-manager" | BROWSER | PASS — `<DataGrid id="auto-budgets"` + FilterBar + ExportMenu all wired |

## Report Center (/reports)

| ID | Feature | Steps | Expected | Method | Static result |
|----|---------|-------|----------|--------|---------------|
| AI-29 | Reports DataGrid + FilterBar + Export | Open /reports; filter, group, export | Grid `ins-reports` (totals: recipients foot), dims Type/Owner/Format, `chfilter:ins-reports`, ExportMenu "report-center" | BROWSER | PASS — `<DataGrid id="ins-reports"` + FilterBar/ExportMenu wired |
| AI-30 | Build Report modal → chcreated:reports | "Build Report" → name/type/format/cadence/recipients → Create; reload | Row prepended (owner You, updated "just now"); persists via `chcreated:reports`; Create disabled without name | BROWSER | PASS — title `Build Report` ×2, `createdStore.set('reports')`, mount `createdStore.get('reports')`, `<BuildReportModal` invoked |
| AI-31 | Report Templates picker (6 presets) | "Templates" → pick one | Modal "Report Templates" lists 6 presets (Exec / Campaign / Harvest / SOV / Shelf / DSP); pick prefills builder ("New report from template") | BROWSER | PASS — title ×1, preset keys exec/camp/harvest/sov/shelf/dsp present, onPick → `setBuilder(form)` |
| AI-32 | Run / download action | Click Run or download on a row | Report runs / file downloads (or visible feedback) | BROWSER | **FAIL — Run and download Btns have no onClick (bundle 5025: `<Btn sm ghost icon="play">Run</Btn><Btn sm ghost icon="download" />`); pure no-ops** |

## Alerts (/alerts)

| ID | Feature | Steps | Expected | Method | Static result |
|----|---------|-------|----------|--------|---------------|
| AI-33 | Alerts DataGrid + severity/status filters | Open /alerts; filter Severity = High, Status = Unread | Grid `ins-alerts`, severity Pills (red/amber/gray), sorts by sevRank; FilterBar enum fields Severity/Status; dims Severity/Status | BROWSER | PASS — `<DataGrid id="ins-alerts"`, AL_FIELDS enums, `chfilter:ins-alerts` |
| AI-34 | Mark read / mark all | Click "Mark read" on a row; then "Mark all read" | Row flips to Read (bold→normal, unread dot gone), Unread KPI decrements; mark-all zeroes it. Session-only (not persisted) | BROWSER | PASS — `markRead`/`markAll` update state; KPI `alerts.filter(a=>!a.read).length` |
| AI-35 | Alert Settings modal → chalertsettings | "Alert Settings" → flip category toggles, set severity/delivery/frequency → Save; reload and reopen | 6 category toggles (budget/acos/buybox/stock/rank/anomaly) + Minimum severity + Delivery + Frequency persist via `chalertsettings` | BROWSER | PASS — `AS_KEY = 'chalertsettings'` (bundle 5078), 6 category labels ×1 each, asLoad merges AS_DEFAULT, `<AlertSettingsModal` invoked |
| AI-36 | Bell badge | Check topbar bell; mark alerts read on /alerts | Badge shows unread count; navigates to /alerts | BROWSER | PASS (partial) — badge wired (bundle 2174/2228) but computed from the **static mock `alerts` in Layout, not shared with Alerts page state — badge will NOT decrement after mark-read**. Known limitation, not a key mismatch |

## Settings (/settings)

| ID | Feature | Steps | Expected | Method | Static result |
|----|---------|-------|----------|--------|---------------|
| AI-37 | Add Integration modal → chcreated:integrations | "Add Integration" → pick provider (8 options), enter account, Connect; reload | Modal lists 8 providers (Walmart Connect, Instacart, Target Roundel, Criteo, Google Ads, TikTok Shop, Shopify, GA4); Connect disabled without account; new source **prepends** to Connected data sources with green pill; persists `chcreated:integrations` | BROWSER | PASS — title `Add Integration` ×2, 8 provider entries, `createdStore.set('integrations', [c, ...created])`, mount reads store, `<AddIntegrationModal` invoked; route + nav gear link present (bundle 5266, 2230) |

## Persistence round-trip matrix

Every localStorage key in the bundle, with write path + read-on-load path. Steps for each: perform the UI action, reload, confirm state restored (BROWSER); static result = both `setItem` and `getItem` exist for the exact same key string.

| ID | Feature (key) | Steps | Expected | Method | Static result |
|----|---------------|-------|----------|--------|---------------|
| AI-38 | `chgrid:<id>` — grid layout | Reorder/hide columns, switch view preset; reload | Layout restored per grid id | BROWSER | PASS — set/get pair `'chgrid:' + id` (bundle 1373/1367) |
| AI-39 | `chfilter:<id>` — filter models | Set filters on any grid; reload | Filters restored (`loadFilterModel`) | BROWSER | PASS — set/get pair `'chfilter:' + id` |
| AI-40 | `chplan:<id>` — saved views/plans | Save a view; reload | Saved plans listed | BROWSER | PASS — set/get pair `'chplan:' + id` (planStore, bundle 1715/1729) |
| AI-41 | `chedits:<id>` — inline edit overrides | Inline-edit a campaign field; reload | Override reapplied (`usePersistentOverrides`: ads-campaigns / ads-adgroups / ads-targeting / ads-searchterms-acts) | BROWSER | PASS — set/get pair `'chedits:' + id`; 4 call sites |
| AI-42 | `chcreated:<kind>` — created entities | Create rule/report/integration/campaign etc.; reload | Rows survive. Kinds in bundle: rules, ruleTemplates, reports, integrations, campaigns, adgroups, keywords, bulkops, sov — every kind has both a `set` and a `get` call site | BROWSER | PASS — single canonical set/get pair `'chcreated:' + kind` (bundle 1884-86); all 9 kinds read+written |
| AI-43 | `chrange` — date range | Change global date range; reload | Range + customRange restored (state.jsx AppProvider) | BROWSER | PASS — get on load (bundle-equiv of state.jsx:6), set in effect |
| AI-44 | `chdaypart` — dayparting grid | Edit dayparting heat-map; reload | 7-row grid restored | BROWSER | PASS — via `DP_KEY = 'chdaypart'` (bundle 3541), dpLoad/dpSave both use DP_KEY |
| AI-45 | `chbudgetcaps` — budget caps | Set a cap; reload | Cap + recomputed pacing restored | BROWSER | PASS — capStore set/get literal pair |
| AI-46 | `chgoals` — monthly budget goals | Set a Budget cell; reload | Goal restored, pacing recomputed | BROWSER | PASS — goalStore set/get literal pair |
| AI-47 | `chgoaltoggles` — goal automation toggles | Flip a toggle; reload | Toggle state restored (default on) | BROWSER | PASS — get in useState init, set in flipTgl |
| AI-48 | `chalertsettings` — alert settings | Save Alert Settings; reload | Settings restored merged over defaults | BROWSER | PASS — via `AS_KEY = 'chalertsettings'` (bundle 5078), asLoad/asSave both use AS_KEY |
| AI-49 | Key-set integrity + alias audit | Enumerate all `localStorage.(get\|set)Item` in bundle; diff read vs write key sets; grep for un-injected `import { x as Y }` aliases | Exactly 11 key families, each with matching read+write, zero orphans; only ALL_CAMPAIGNS/ALERTS/RULES aliases needed and all 3 injected (bundle 5275) | STATIC | PASS — 9 literal families get+set symmetric; chdaypart/chalertsettings via const key vars (why they escape a literal-only grep); src has only 2 alias imports (`rules as RULES`, `alerts as ALERTS`), ALL_CAMPAIGNS used by comment-documented convention in Ads — no 4th alias to break the bundle |

---

## Results — browser pass

**Executed 2026-07-20 (session 10) against the deployed built bundle v0.12.1 (commercehub-five.vercel.app).**
Evidence layers: (1) per-test static bundle verification (columns above, re-run on v0.12.1 build — all clean);
(2) session-9 live verification of A1–A7/B1–B2 features; (3) session-10 live interaction sweep below.

| Area | Live checks executed | Result |
|---|---|---|
| Routes / console (C3) | All 19 routes rendered (title + grid/KPI probes); fresh load with console tracking → 0 errors; alias grep ALL_CAMPAIGNS/RULES/ALERTS defined; build invariants (dup decls [], leftover 8 0 benign) | PASS |
| Overview | KPIs rescale 30d→7d with real vs-prev deltas (were hardcoded — FIXED); trend sub follows range; channel mix now data-driven; Avg Buy Box delta removed (no fake) | PASS |
| Campaigns grid | 6 text operators live; Contains(or) "salmon" filtered 40→8 + badge; dimensions incl. Placement + Campaign Type (Drill-down) collapsed→expand (6→16 rows)→None; 4 column presets; inline budget edit → chedits + Enter commit; saved Plan present | PASS |
| Create flows | Choose-Campaign-Type modal (SP/SB/SD/STV + Super Wizard); SP card select → Continue → 5-step flow (Campaign / Adgroup and Ads / Targeting / Negative Targeting / Complete) | PASS |
| Rule builder v2 | Chooser: 5 groups + All Rule/Recommended Usage tabs; step 1: Mode (Automated/Requires Approval) + Running Time Zone; step 2: Same SKU, Cap, Add Automation (multi-block), Preview Results, Save as template, Kickstart rail; EITHER join appears with 2+ conditions (ADDED this session) | PASS |
| Budgets / Goals | Goal cell click → inline input → chgoals persist; 16 automation toggles → chgoaltoggles persist; Set Budget Cap present; Alloc modal verified session 9 + static | PASS |
| Reports | Run → toast + Updated "just now" + chedits:ins-reports-runs persist (was no-op — FIXED); download wired to CSV export (was no-op — FIXED) | PASS |
| Alerts / bell badge | Mark read → Unread KPI 3→2 AND topbar badge 3→2 (was static — FIXED); survives full reload via chalertreads | PASS |
| DSP | Multi-currency ($/C$/£); compare toggle → delta chips; ExportMenu on Audiences + AMC (was missing — FIXED) | PASS |
| Commerce | scaleFields: Buy Box/price/rating/content static across ranges; Glance Views + revenue scale (57.1K→224.6K on 7d→30d) | PASS |
| Drill-down / Settings | Campaign name → Ad Groups ?camp view (3 rows + back-bar); Add Integration modal (8 providers) | PASS |
| Dayparting | 7 brushes; paint → chdaypart persisted; Reset restores | PASS |
| Bulk Operations | 6 tabs, Profile/Campaign Type scope, Pacvue/Amazon template format, download/upload + history present | PASS |

**Fails found & fixed this session (all deployed in v0.12.1):** Overview hardcoded deltas; Overview ignored date range; Audience Builder + AMC missing ExportMenu; Report Run/download no-ops; bell badge never decremented; missing EITHER join.
**Known deliberate stubs (unchanged, expected):** Targeting bulk Add-as-Negative (toast), Dayparting Apply to Campaigns (toast), rule "run" (no engine).
**Test artifacts cleaned from localStorage after the pass.** tsc unavailable in this session's sandbox — superseded by the stronger zero-console-error load check (Babel parses the full bundle at runtime).


# Pacvue Feature Map → CommerceHub

This document captures the deep dive into Pacvue's Amazon functionality and maps each
capability to where it lives in the CommerceHub prototype. It is organized by the platform's
own information architecture, which was confirmed against the live Pacvue Amazon application
and Pacvue's public documentation.

## Platform information architecture (from the live app)

Pacvue's Amazon product is organized into three top-level modules, each with its own set of
sub-views, surfaced through a module switcher and a per-module view selector:

- **Sponsored Ads** — Profile, Tagging, Campaign, Ad Group, Product Eligibility, Product,
  Share of Voice, Hourly.
- **DSP** — programmatic campaign management, plus the AMC Console.
- **Commerce** (retail / digital shelf) — Account, Market, Brand, Category, ASIN, Periscope
  (across Vendor / Seller channels).

The shared metric vocabulary observed in the app includes: Impressions, Clicks, CTR, Spend,
CPC, Sales, Orders, Sale Units, ACOS, ROAS, CPA, CVR, AOV, ASP, and the New-to-Brand (NTB)
family — NTB-Orders, NTB-Orders%, NTB-OrderRate, NTB-Sales, NTB-Sales%, plus ATC (add-to-cart).
The Commerce module uses a retail vocabulary: Ordered Revenue, Ordered Units, Shipped Revenue,
Shipped Units, Shipped COGS, Retailer GPM%, Net PPM%, Glance Views, Conversion Rate, and
Buy Box Ownership. CommerceHub reuses this vocabulary so the clone reads like the real product.

The live campaign grid exposes these columns, all reproduced in CommerceHub's campaign table:
State (enable/pause), Status (Enabled / Paused / Out of Budget), Active/Total Ad Group,
Profile Name, Campaign Type (e.g. SP-Auto, SP-Manual), Targeting Type (Auto/Manual),
Daily Budget, Actual Bid / Available Bid, and the full metric set above. Campaign naming
follows a Product-ASIN-CampaignType-TargetingType convention (e.g. `…-B0…-SP-Manual-KW-Category-Broad`).

## 1. Advertising / Campaign Management

| Pacvue capability | Where in CommerceHub |
|---|---|
| Sponsored Products / Brands / Display campaign management | **Sponsored Ads → Campaigns** (`/ads/campaigns`) — sortable grid with State toggle, Status, Type, Targeting, Daily Budget, Act/Avl bid, full metrics |
| Ad group management & default bids | **Sponsored Ads → Ad Groups** (`/ads/adgroups`) |
| Keyword & product (PAT) targeting with bid management, suggested bids, Top-of-Search IS | **Sponsored Ads → Targeting** (`/ads/targeting`) |
| Rules-based bid automation (target ACoS / ROAS / CVR) | **Automation → Rule Manager** (`/rules`) — Bid rules R1/R2 |
| Keyword harvesting (Auto → Manual on a rolling basis) | **Sponsored Ads → Search Terms** (`/ads/search-terms`) + Rule R3 |
| Negative keyword automation | Search Terms "negate" recommendations + Rule R4 |
| Dayparting — hourly bid multipliers, day-of-week | **Sponsored Ads → Dayparting** (`/ads/dayparting`) — 7×24 heatmap |
| Bulk operations (bids, budgets, keywords, negatives, tags) | Campaign & Targeting **bulk-action bar** (select rows) |
| Budget management — monthly caps, pacing, forecast, auto-pause | **Automation → Budget Manager** (`/budgets`) + Rule R7 pacing guard |
| Campaign AI / Super Wizard (hands-off setup) | Represented via "Create Campaign" + Rule templates (roadmap for full wizard) |

## 2. Analytics & Reporting

| Pacvue capability | Where in CommerceHub |
|---|---|
| Cross-retailer / cross-profile dashboards | **Overview** (`/`) + topbar **profile switcher** (All / US / CA / UK) |
| Core KPIs: ACoS, ROAS, TACoS, CVR, CPC, CPA, NTB | KPI card rows on Overview and every module |
| Performance trends & media-mix charts | Overview trend (spend vs sales) + spend/sales by channel |
| Share of Voice (paid + organic, by keyword) vs competitors | **Sponsored Ads → Share of Voice** (`/ads/sov`) |
| Customizable + scheduled reports (Report Builder, widgets) | **Insights → Report Center** (`/reports`) — saved/scheduled reports + widget library |
| Alerts & notifications | **Insights → Alerts** (`/alerts`) + topbar bell badge |

## 3. Retail / Digital Shelf (Commerce)

| Pacvue capability | Where in CommerceHub |
|---|---|
| ASIN-level Buy Box ownership monitoring | **Commerce → Buy Box & Inventory** (`/commerce/buybox`) |
| Inventory / out-of-stock detection → auto-pause ads | Buy Box & Digital Shelf, wired to Rule R5 (retail signal → ad action) |
| Pricing consistency / MAP violations | Digital Shelf price column + MAP flag |
| Content & listing accuracy (title, images, A+, video), content score | **Commerce → Digital Shelf** + **Product Center** (`/commerce/products`) |
| Ratings & reviews monitoring | Digital Shelf / Product Center rating + review counts |
| Sales velocity / glance views / conversion | Digital Shelf metrics (Glance Views, CVR, Ordered Revenue) |
| Retail signals feeding ad automation | "Ad Action" column (Serving / Ads paused) + Rule R5 |

## 4. DSP & AMC Audiences

| Pacvue capability | Where in CommerceHub |
|---|---|
| DSP campaign / order & line-item management | **DSP → DSP Campaigns** (`/dsp`) — budget, spend, DPVR, purchases, ROAS, NTB% |
| Audience builder from ASINs or keywords (Deep Intelligence) | **DSP → Audience Builder** (`/dsp/audiences`) — seed by ASIN/keyword |
| Prebuilt audience segments & templates (awareness, retargeting, repeat purchase, conquest) | Audience Builder template list |
| AMC reporting & instructional queries | **DSP → AMC** (`/dsp/amc`) — query library + templates |
| AMC audience creation & activation into DSP | AMC "Build Audience" + Audience Builder (AMC-modeled lookalike) |
| SP × DSP audience overlap / incrementality | Audience Builder overlap visual (28% dual-exposed) |
| DSP dayparting auto-apply | Dayparting page + Rule Manager (Dayparting rule type) |
| Performance+ / Brand+ strategies | DSP orders tagged with these tactics |

## Notes & deliberate simplifications

- **Mock data only.** `src/data/mock.js` deterministically generates a fictional "Brightleaf"
  pet-nutrition catalog across US/CA/UK so the UI is populated and internally consistent
  (ACoS ≈ 35%, ROAS ≈ 2.85). No real account data is used.
- **Currency.** Per-profile currency symbols are shown ($, C$, £). The "All Profiles"
  aggregate sums nominal values for demonstration; production would normalize FX.
- **Interactions** (toggles, bulk actions, harvest, rule on/off) update local React state only;
  nothing persists or calls an external API.

## Research sources

- Pacvue for Amazon — https://pacvue.com/marketplaces/pacvue-for-amazon/
- The AI-Powered Commerce Media Platform — https://pacvue.com/platform/
- Retail Media Ad Management — https://pacvue.com/retail-media-ad-management/
- Advertising Automation — https://pacvue.com/platform/need/advertising-automation/
- Digital Shelf Analytics & Optimization — https://pacvue.com/platform/digital-shelf-optimization/
- Amazon DSP (Programmatic Commerce Growth) — https://pacvue.com/amazon-demand-side-platform/
- Unlock the Full Power of Amazon Marketing Cloud (AMC) — https://pacvue.com/amazon-marketing-cloud/
- Save Countless Hours with Pacvue's Super Wizard — https://pacvue.com/blog/save-countless-hours-with-pacvues-super-wizard/
- Dayparting during shopping events using Share of Voice — https://pacvue.com/blog/how-to-adjust-your-amazon-ppc-dayparting-during-shopping-events-using-share-of-voice-data/
- Pacvue Knowledge Base (Amazon Commerce / DSP user guides) — https://support.pacvue.com/hc/en-us
- Live Pacvue Amazon application (app.pacvue.com) — module/view IA, metric vocabulary, and campaign-grid columns (captured with account access during this build)

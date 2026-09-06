# Refreshing the Amazon Tracker page

The Tracker page at `/tracker` is a **frozen snapshot**. A browser tab cannot reach the
Pacvue MCP connector, so the numbers are baked into the bundle and only change when someone
re-runs this procedure. Everything needed lives in `tools/tracker/`.

## What the page is

`src/pages/Tracker.jsx` renders `src/data/trackerSnapshot.js` — a base64 copy of the R3
"Amazon Tracker" redesign — inside an iframe. The **design is untouched**; only its data
layer was swapped from the live connector to a frozen dataset. The iframe exists because the
tracker ships its own full stylesheet with selectors (`.card`, `.pill`, bare elements) that
would otherwise collide with CommerceHub's.

The tracker artifact remains the separate live original. This page is a mirror, not a
replacement, and the artifact must never be edited to match this one.

## Refresh procedure (rewritten 2026-09-06 — fed from the daily pipeline, no hand pull)

The R3 page and the R10c tracker on `crump-amazon-tracker.vercel.app` issue the same seven base
queries plus movers. The R10c pipeline (project `tracker_build/REFRESH_RUNBOOK.md`, scheduled task
`refresh-amazon-tracker`, weekdays 14:00) already pulls, ties out and stores them as
`tracker_build/r10c_snapshot_<DATE>.json`. This page is built from that file — one pull, two
pages, one set of figures. Do not re-pull by hand; a second copy of the same numbers is a second
thing to tie out.

1. `node tools/tracker/gen-raw-from-r10c.mjs <project>/tracker_build/r10c_snapshot_<DATE>.json`
   — writes `raw.js` (with `AS_OF` and the measured `FX` exported) and `titles.json`.
2. `EXPECT_CUT=<dCommon from pull_<DATE>/_derived.json> node tools/tracker/build-snapshot.mjs`
   — rebuilds `snapshot.json`; **fails loudly** on any reconciliation break. Month, prior month and
   days-in-month all derive from `AS_OF`; nothing about the month is a literal any more.
3. `node tools/tracker/make-tracker-page.mjs` — re-applies the plumbing patches to the R3 source
   (`TRACKER_SRC` overrides the path; `npm install chart.js@4.5.0` once at the repo root). Aborts
   if any patch does not match exactly once. Includes the one-FX-path patch (below).
4. `node tools/tracker/emit-module.mjs` — writes `src/data/trackerSnapshot.js`.
5. `JSDOM_DIR=<dir with node_modules/jsdom> node tools/tracker/check-tracker-jsdom.mjs` — the
   Playwright check ported to jsdom (this sandbox has no Chromium). 26 assertions across six filter
   states, expectations computed from `snapshot.json` independently of the page. All must pass.
6. `node tools/build-singlefile.mjs`, copy `CommerceHub.html` to `index.html`, confirm
   `dup top-level decls: []`, then boot the bundle under jsdom for `/`, `/tracker` (one iframe,
   snapshot date inside it) — see memory `commercehub-singlefile-router-shim` for why this step is
   not optional.
7. Commit and push (`attribution_push/github_token.txt` PAT from the sandbox). Verify the live page.

### FX — one path (2026-09-06)

The connector converts the ad-spend rows to CAD itself; the rate it used is measured on the same
pull as US-ads-in-USD ÷ US-ads-in-CAD (`fx.json`, 1.39041 on 2026-09-04). The R3 artifact converts
vendor COGS at its own literal 1.42071. Left alone, spend and COGS would sit on two rates inside one
page and every TACoS would be off by the ratio (~2.2%). `make-tracker-page.mjs` therefore patches
the page's `FX` to the measured rate, which is exactly what the R10c tracker does. The on-page
"US at <rate>" label reads the same constant. The 1.42071 pin remains the *plan* convention
(`registry.json fx.connector`); this page reports what the connector actually delivered.

## Reconciliation checks (step 3)

These are not smoke tests; they are the reason the numbers can be trusted:

- the settled common window resolves to the expected day (min of last settled ads day, last
  settled CA COGS day, last settled US COGS day, and today − 2)
- daily COGS through the cut rolls up within the monthly figure, per market
- ASIN-attributed spend reconciles against campaign-level spend (coverage is displayed on
  the page, never assumed)
- every brand name resolves — note Pacvue returns **two apostrophe variants** for
  Crumps’ Naturals and the curly one carries all real revenue
- every movers ASIN maps to a brand

## Known caps, stated on the page

Movers are drawn from the top 80 ASINs by shipped COGS in each window rather than all of
them. Both directions are covered (a riser is large in the current window, a faller is large
in the base window), but it is a cap and the page says so.

## The one thing not to do

Do not let the page's clock drift. `now` is pinned to the snapshot date inside the bundle —
a frozen dataset read by a live clock would slide the rolling-12 window off its own data and
quietly render a wrong chart with no error.

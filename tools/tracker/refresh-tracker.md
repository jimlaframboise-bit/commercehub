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

## Refresh procedure

1. **Pull** the nine queries through the Pacvue MCP connector, exactly as listed in
   `tools/tracker/raw.js` (7 base + 2 movers), plus product titles for movers. Window is
   rolling 12 months + the live month; FX is the connector standard **1.42071**; US COGS
   arrives in native USD and is converted, ad spend is requested with `toCurrency: CAD`.
   Ads carry no brand dimension — brand-level spend is attributed by advertised ASIN from
   the product-ad fact, pulled as three brand-scoped queries so the totals stay exact.
2. **Rewrite** `tools/tracker/raw.js` with the new rows and set `AS_OF` / `CUT_DAY` in
   `tools/tracker/build-snapshot.mjs`.
3. `node tools/tracker/build-snapshot.mjs` — rebuilds `snapshot.json` and **fails loudly**
   if any reconciliation check breaks. Do not proceed past a FAIL.
4. `node tools/tracker/make-tracker-page.mjs` — re-applies the 12 plumbing patches to the
   tracker source. It aborts if any patch does not match exactly once, which is the guard
   against silently building against a changed artifact.
5. `node tools/tracker/emit-module.mjs` — writes `src/data/trackerSnapshot.js`.
6. `node tools/build-singlefile.mjs` then copy `CommerceHub.html` to `index.html`.
7. `node tools/tracker/check-tracker.mjs` — headless render across all six filter states.
   Zero console errors and 23/23 required.
8. Commit and deploy.

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

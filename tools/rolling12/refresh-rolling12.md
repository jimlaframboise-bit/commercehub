# Refreshing the Rolling12 Tracker page

The Rolling12 Tracker at `/rolling12` is a **frozen snapshot**. A browser tab cannot reach the
Pacvue MCP connector — `window.cowork.callMcpTool` does not exist in a browser and no amount of
effort makes it appear without a backend — so the numbers are baked into the bundle and only
change when someone re-runs this procedure. Everything needed lives in `tools/rolling12/`.

## What the page is

`src/pages/Rolling12.jsx` renders `src/data/rolling12Snapshot.js` — a base64 copy of the
**original `amazon-rolling12-tracker` artifact** — inside an iframe. The design and the
arithmetic are the artifact's; only the data layer was swapped from the live connector to a
frozen dataset. The iframe exists because the tracker ships its own full stylesheet with
selectors (`.card`, `.pill`, bare elements) that would otherwise collide with CommerceHub's.

This is the **sibling** of `/tracker`, which carries the R3 redesign. They are separate
artifacts by standing instruction. Neither page should be folded into the other, and editing
either artifact to match its page is backwards — the artifacts are the originals.

## Refresh procedure

1. **Pull** the nine queries through the Pacvue MCP connector, exactly as the artifact issues
   them (they are listed with their filters and limits at the top of `raw12.js`):
   monthly + daily vendor COGS, monthly + daily ad spend, ASIN-level COGS for the current
   window and the prior month, product titles for the movers, and the two segment queries.
   Window is rolling 12 months + the live month.
   **FX is 1.4205** — the rate the original artifact uses. Do NOT switch it to the 1.42071
   connector standard: this page must agree with the artifact it clones, and the redesign at
   `/tracker` is the one that uses 1.42071. A one-page-only FX change is a silent discrepancy
   between two pages that look like they should match.
2. The segment and movers queries are cut at the **settled day**, which you do not know until
   you have pulled the daily rows. Pull the four date-grained queries first, compute
   `min(last settled ads day, last settled CA COGS day, last settled US COGS day, today − 2)`,
   then pull the remaining five against that cut.
3. **Rewrite** the row-sets in `tools/rolling12/data/*.json`, set `AS_OF` in `gen-raw12.cjs`'s
   output header, and run `node tools/rolling12/gen-raw12.cjs` to regenerate `raw12.js`.
4. Set `AS_OF` and `CUT_DAY` in `build-snapshot12.mjs`, then
   `node tools/rolling12/build-snapshot12.mjs` — rebuilds `snapshot12.json` and **fails loudly**
   if any reconciliation check breaks. Do not proceed past a FAIL.
5. `node tools/rolling12/make-rolling12-page.mjs` — re-applies the 13 plumbing patches to the
   artifact source in `artifact-source.html`. It aborts if any patch does not match exactly
   once, which is the guard against silently building against a changed artifact. Re-export
   `artifact-source.html` from the artifact whenever the artifact itself changes.
6. `node tools/rolling12/emit-module12.mjs` — writes `src/data/rolling12Snapshot.js`.
7. `node tools/build-singlefile.mjs`, then copy `CommerceHub.html` to `index.html`.
   **Check the "dup top-level decls" line comes back empty** — see the warning below.
8. `node tools/rolling12/check-rolling12.mjs` — 38 assertions against the standalone page.
   `node tools/rolling12/prove-watchdog.mjs` — proves the stall watchdog still fires.
   `node tools/gen-render-html.mjs && node tools/render-check.mjs` — walks all 29 routes.
   Run all three against the **byte-identical build you will deploy**.
9. Commit and deploy.

## Reconciliation checks (step 4)

These are not smoke tests; they are the reason the numbers can be trusted:

- the settled common window resolves to the expected day (min of last settled ads day, last
  settled CA COGS day, last settled US COGS day, and today − 2)
- daily COGS through the cut rolls up within the monthly figure, per market
- the **ASIN-level** pull and the **daily** pull agree to the cent, in CAD — two independent
  queries over different groupings of the same dollars
- the **segment** COGS pull agrees with both of them
- segment spend never materially exceeds campaign-level spend (tag coverage may be under 100%
  legitimately; a small over-count is Pacvue converting USD→CAD at each grain independently)
- every mover the page will show resolves to a real product title — a bare ASIN in the movers
  card is a bug, not a cosmetic issue
- the snapshot month is one the frozen `PLAN` block covers, or every card reads "—"

## Traps

1. **A frozen dataset with a live clock is a silent wrong answer.** `now` is pinned to the
   snapshot date. Unpinned, the rolling-12 window slides off its own data and renders a wrong
   chart with **no error at all**.
2. **Name collisions across pages are silent.** The single-file build concatenates every page
   into one scope. `Rolling12.jsx` deliberately does not reuse `payload` / `decodeHtml` from
   `Tracker.jsx` — identical names would overwrite each other and make `/tracker` render *this*
   page's snapshot with nothing thrown anywhere. `build-singlefile.mjs` prints
   `dup top-level decls:` for exactly this reason. It must be `[]`.
3. **A silent forever-spinner is a defect regardless of cause.** The watchdog lives in its own
   `<script>` ahead of the main one, so it survives a parse error in the main script — which is
   the very case that produces an endless spinner. `prove-watchdog.mjs` corrupts the main
   script on purpose and asserts the diagnosis appears. Run it; do not assume it works.
4. **Hardcoded dates rot every refresh.** Every date on the page derives from `snapshot.asOf`.
   Keep it that way — the check script derives its expectations the same way, so a hardcoded
   date would make the check pass while the page is wrong.
5. **The frozen `PLAN` block is not refreshed by this procedure.** It lives inside the artifact
   and is set once when a month is planned. When the calendar rolls into a month the artifact
   has no `PLAN` entry for, every scoreboard card reads "—" and the page is useless until the
   month is projected and frozen into **both** artifacts. `build-snapshot12.mjs` checks this
   and fails rather than shipping a page of dashes.

## Known external dependency

The movers card shows product photos from Shopify's public CDN, exactly as the artifact ships
them. They are not inlined. If the CDN is unreachable, each photo's `onerror` hides it and the
branded fallback tile behind it shows through — the card stays readable. The build sandbox has
no route to that CDN, so the render checks separate those failures out and assert the fallback
rendered rather than pretending the requests succeeded.

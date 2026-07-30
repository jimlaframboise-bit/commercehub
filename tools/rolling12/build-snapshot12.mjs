/* Turns the raw Pacvue pull in raw12.js into the frozen snapshot the Rolling12 Tracker page
   reads. Emits rows in exactly the shapes the ORIGINAL artifact's q() returns, so the
   artifact's own pipeline runs unmodified — the only thing swapped is where rows come from.

   This FAILS LOUDLY. Do not proceed past a FAIL: a frozen dataset that silently disagrees
   with Pacvue is worse than no page at all. */
import * as R from './raw12.js';
import { readFileSync, writeFileSync } from 'node:fs';

const FX = 1.4205;                 // the ORIGINAL artifact's rate — see the note in raw12.js
const AS_OF = R.AS_OF;             // '2026-07-30'
const CUT_DAY = 28;                // settled common window — recomputed below and asserted
const PLAN_COGS = 1440000;         // frozen July projection, from the artifact's PLAN block
const DAYS_IN_MONTH = 31;

const vMonthly = R.vMonthly.map(([date, country_code, shipped_cogs]) => ({ date, country_code, shipped_cogs }));
const aMonthly = R.aMonthly.map(([date, country_code, spend]) => ({ date, country_code, spend }));
const vDaily   = R.vDaily.map(([date, country_code, shipped_cogs]) => ({ date, country_code, shipped_cogs }));
const aDaily   = R.aDaily.map(([date, country_code, spend]) => ({ date, country_code, spend }));
const moversCur  = R.moversCur.map(([asin, country_code, shipped_cogs]) => ({ asin, country_code, shipped_cogs }));
const moversBase = R.moversBase.map(([asin, country_code, shipped_cogs]) => ({ asin, country_code, shipped_cogs }));
const segSpend = R.segSpend.map(([TagName, country_code, spend]) => ({ TagName, country_code, spend }));
const segCogs  = R.segCogs.map(([category_level_one, country_code, shipped_cogs]) => ({ category_level_one, country_code, shipped_cogs }));
const titles = Object.fromEntries(R.titles);

/* ---------- product photos for movers the artifact's own map does not cover ----------
   The artifact carries a hand-curated PRODUCT_IMAGES map, frozen when it was built on
   2026-07-09. The movers card, by contrast, is computed from live data every refresh — so any
   ASIN that becomes a top-5 mover after that date has no photo and silently falls back to a
   branded letter tile. That is what happened to B0CK8HD9L6 and B0CBL544BJ (spotted by Jim,
   2026-07-30).

   These entries are merged ON TOP of the artifact's map at build time, so the artifact itself
   is never edited. Add to this list rather than to the artifact; the coverage check below
   fails the build if a mover is still uncovered, so the gap can no longer ship silently.

   Sourced from the Shopify Admin API (featured image of the matching product). As the
   artifact already notes for Crumps' items, the shot shows the product line and the pack size
   may differ from the ASIN's — CN_MiniTrainersLamb is the 132 g front because no 300 g shot
   exists on the store. */
const CRUMPS = 'https://cdn.shopify.com/s/files/1/0510/6073/6172/files/';
const EXTRA_IMAGES = {
  // Plaque Busters Advanced - Double Fresh Dental Sticks, 270 g (exact size match)
  B0CK8HD9L6: CRUMPS + 'CN_PlaqueBustersAdvDoubleFresh_Jul2024_10PK-MED-LG-DOG_270g_FRONT.jpg?v=1744640800',
  // Mini Trainers Lamb (semi-moist), 300 g — 132 g pack shot, the only one on the store
  B0CBL544BJ: CRUMPS + 'CN_MiniTrainersLamb_Jul2024_132g_FRONT.jpg?v=1744640827',
};

/* ---------- reconciliation (RULE 0: verify, never assume) ---------- */
const cad = (v, m) => (v || 0) * (m === 'US' ? FX : 1);
const checks = [];
const check = (label, a, b, ok) => checks.push({ label, a, b, diff: (typeof a === 'number' && typeof b === 'number') ? +(a - b).toFixed(2) : '', ok });
const near = (label, a, b, tol) => check(label, +a.toFixed(2), +b.toFixed(2), Math.abs(a - b) <= tol);

// 1. the settled common window must land where we think it does — same arithmetic the page runs
const lastDay = rows => { const ds = [...new Set(rows.map(r => r.date))].sort(); return ds.length ? +ds[ds.length - 1].slice(8, 10) : 0; };
const adsLast    = lastDay(aDaily.filter(r => r.date < AS_OF && (r.spend || 0) > 0));
const vendLastCA = lastDay(vDaily.filter(r => r.country_code !== 'US' && (r.shipped_cogs || 0) > 0));
const vendLastUS = lastDay(vDaily.filter(r => r.country_code === 'US' && (r.shipped_cogs || 0) > 0));
const SETTLE = 2;
const dCommon = Math.max(0, Math.min(adsLast, vendLastCA, vendLastUS, +AS_OF.slice(8, 10) - SETTLE));
check('settled window day', dCommon, CUT_DAY, dCommon === CUT_DAY);
const cut = AS_OF.slice(0, 8) + String(dCommon).padStart(2, '0');

// 2. daily COGS through the cut must roll up under the month's own figure, per market
for (const m of ['CA', 'US']) {
  const d  = vDaily.filter(r => (r.country_code === 'US' ? 'US' : 'CA') === m && r.date <= cut).reduce((s, r) => s + (r.shipped_cogs || 0), 0);
  const mo = vMonthly.filter(r => (r.country_code === 'US' ? 'US' : 'CA') === m && r.date === '2026-07-01').reduce((s, r) => s + (r.shipped_cogs || 0), 0);
  check(`daily<=cut <= monthly COGS ${m}`, +d.toFixed(2), +mo.toFixed(2), d <= mo + 0.01);
}

// 3. the ASIN-level current-window pull must reconcile to the daily pull. Two independent
//    queries against different groupings — if these disagree the movers card is lying.
const mtdCogs = { CA: 0, US: 0 };
for (const r of vDaily) if (r.date <= cut) mtdCogs[r.country_code === 'US' ? 'US' : 'CA'] += cad(r.shipped_cogs, r.country_code);
const asinSum = moversCur.reduce((s, r) => s + cad(r.shipped_cogs, r.country_code), 0);
near('ASIN sum == daily MTD (CAD)', asinSum, mtdCogs.CA + mtdCogs.US, 0.5);

// 4. segment COGS through the cut must reconcile to the same MTD total
const segCogsSum = segCogs.reduce((s, r) => s + cad(r.shipped_cogs, r.country_code), 0);
near('segment COGS == daily MTD (CAD)', segCogsSum, mtdCogs.CA + mtdCogs.US, 0.5);

// 5. segment spend must not MATERIALLY exceed campaign-level MTD spend. Tag coverage can be
//    below 100% legitimately (an untagged campaign's spend belongs to no tag), so the real
//    assertion is one-sided. The tolerance is not slop: Pacvue converts USD→CAD at each
//    aggregation grain independently, so the tag-grouped sum and the day-grouped sum of the
//    same dollars land a few cents apart. Anything beyond a rounding band means the two
//    queries are not describing the same spend, which is a genuine failure.
const mtdSpend = { CA: 0, US: 0 };
for (const r of aDaily) if (r.date <= cut) mtdSpend[r.country_code === 'US' ? 'US' : 'CA'] += (r.spend || 0);
const segSpendSum = segSpend.reduce((s, r) => s + (r.spend || 0), 0);
const spendTotal = mtdSpend.CA + mtdSpend.US;
const FX_ROUNDING_BAND = Math.max(1, spendTotal * 0.0001);   // $1, or 1bp on larger totals
check('segment spend <= campaign spend (+FX rounding band)',
  +segSpendSum.toFixed(2), +spendTotal.toFixed(2), segSpendSum <= spendTotal + FX_ROUNDING_BAND);
const tagCoverage = segSpendSum / spendTotal;

// 6. every mover the page will show must have a title — a bare ASIN in the movers card is a bug
const aggr = rows => { const m = {}; for (const r of rows) { if (!r.asin || r.shipped_cogs == null) continue; m[r.asin] = (m[r.asin] || 0) + cad(r.shipped_cogs, r.country_code); } return m; };
const cur = aggr(moversCur), base = aggr(moversBase);
const baseTotal = Object.values(base).reduce((s, x) => s + x, 0);
const expFactor = PLAN_COGS * dCommon / DAYS_IN_MONTH;
const items = [...new Set([...Object.keys(cur), ...Object.keys(base)])].map(asin => {
  const act = cur[asin] || 0, exp = baseTotal ? (base[asin] || 0) / baseTotal * expFactor : 0;
  return { asin, act, exp, dev: act - exp };
});
const pos = items.filter(x => x.dev > 500).sort((a, b) => b.dev - a.dev).slice(0, 5);
const neg = items.filter(x => x.dev < -500).sort((a, b) => a.dev - b.dev).slice(0, 5);
const movers = [...pos, ...neg];
const untitled = movers.map(x => x.asin).filter(a => !titles[a]);
check('movers without a title', untitled.length, 0, untitled.length === 0);
check('movers shown (5 up + 5 down)', movers.length, 10, movers.length === 10);

// 7. every mover on the card must resolve to a product photo. A branded letter tile is the
//    degraded state, not the intent, and it is invisible to any check that only asks whether
//    the page rendered — which is how two of them shipped on 2026-07-30. The artifact's own
//    map is READ FROM THE ARTIFACT rather than duplicated here, so if it ever grows this
//    check follows it automatically instead of going stale.
const artifactSrc = readFileSync(new URL('./artifact-source.html', import.meta.url), 'utf8');
const mapStart = artifactSrc.indexOf('const PRODUCT_IMAGES');
const mapBlock = artifactSrc.slice(mapStart, artifactSrc.indexOf('};', mapStart) + 2);
const builtInImages = [...mapBlock.matchAll(/\b(B0[A-Z0-9]{8})\s*:/g)].map(m => m[1]);
check('artifact PRODUCT_IMAGES map found', builtInImages.length > 0, true, builtInImages.length > 0);
const covered = new Set([...builtInImages, ...Object.keys(EXTRA_IMAGES)]);
const noPhoto = movers.map(x => x.asin).filter(a => !covered.has(a));
check('movers with no product photo', noPhoto.length, 0, noPhoto.length === 0);

// 8. the current month must be the one the frozen PLAN block covers, or every card reads "—"
check('PLAN month == snapshot month', AS_OF.slice(0, 7), '2026-07', AS_OF.slice(0, 7) === '2026-07');

// 9. rolling-12 window must be complete: 12 closed months + the live one, both markets
const monthsSeen = new Set(vMonthly.map(r => r.date.slice(0, 7)));
check('months in COGS window', monthsSeen.size, 13, monthsSeen.size === 13);

const cogs12  = vMonthly.reduce((s, r) => s + cad(r.shipped_cogs, r.country_code), 0);
const spend12 = aMonthly.reduce((s, r) => s + (r.spend || 0), 0);

const snapshot = {
  asOf: AS_OF, fx: FX, cut, dCommon,
  tagCoverage: +tagCoverage.toFixed(4),
  source: 'Pacvue connector (execute_query) — pulled ' + AS_OF,
  moversCap: 'top 500 ASIN rows by shipped COGS in each window (the artifact\'s own limit)',
  vMonthly, aMonthly, vDaily, aDaily, segSpend, segCogs, titles,
  images: EXTRA_IMAGES,
  movers: { cur: moversCur, base: moversBase, pk: '2026-06' }
};
writeFileSync(new URL('./snapshot12.json', import.meta.url), JSON.stringify(snapshot));

const money = v => v.toLocaleString('en', { maximumFractionDigits: 0 });
console.log('as of              :', AS_OF, '| cut =', cut, `(day ${dCommon} of ${DAYS_IN_MONTH})`);
console.log('rolling-12 COGS CAD:', money(cogs12));
console.log('rolling-12 spend CAD:', money(spend12));
console.log('July MTD COGS  CAD :', money(mtdCogs.CA + mtdCogs.US), `(CA ${money(mtdCogs.CA)} / US ${money(mtdCogs.US)})`);
console.log('July MTD spend CAD :', money(spendTotal), `(CA ${money(mtdSpend.CA)} / US ${money(mtdSpend.US)})`);
console.log('tag-coverage of spend:', (tagCoverage * 100).toFixed(1) + '%');
console.log('mover photo coverage :', `${movers.length - noPhoto.length}/${movers.length}` +
  ` (${builtInImages.length} from the artifact, ${Object.keys(EXTRA_IMAGES).length} added at build time)`);
if (noPhoto.length) {
  console.error('\n  Movers with no photo: ' + noPhoto.map(a => `${a} — ${titles[a] || 'no title'}`).join('\n                        '));
  console.error('  Find each on the Shopify store and add it to EXTRA_IMAGES near the top of this file.');
}
console.log('\nchecks:');
for (const c of checks) console.log(` ${c.ok ? 'PASS' : 'FAIL'}  ${c.label}: ${c.a} vs ${c.b}${c.diff !== '' ? ` (Δ ${c.diff})` : ''}`);
if (checks.some(c => !c.ok)) { console.error('\nRECONCILIATION FAILED — do not build.'); process.exit(1); }
console.log('\nAll checks passed. snapshot12.json written.');

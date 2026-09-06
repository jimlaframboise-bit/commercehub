/* Turns the raw Pacvue pull into the frozen snapshot the CommerceHub Tracker page reads.
   Emits rows in exactly the shapes the R3 tracker's q() returns, so the tracker's own
   pipeline runs unmodified. */
import * as R from './raw.js';
import { writeFileSync } from 'node:fs';

/* AS_OF and FX come from raw.js (written by gen-raw-from-r10c.mjs from the daily pipeline's
   verified snapshot). Nothing about the month is hardcoded here any more: until 2026-09-06 this
   file carried '2026-07-', '2026-07-01' and pk '2026-06' as literals, so every refresh after
   July would have reconciled against the wrong month and still said PASS. */
const FX = +(+R.FX).toFixed(5);           // measured on the same pull as the CAD ad-spend rows; 5 dp so the page label reads 1.39041, not 15 digits
const AS_OF = R.AS_OF;
const CUR = AS_OF.slice(0, 7);            // '2026-09'
const CUR_FIRST = CUR + '-01';
const PK = (() => { const [y, m] = CUR.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7); })();          // prior month, e.g. '2026-08'
const PREV_DAYS = (() => { const [y, m] = PK.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); })();
// Expected settled cut. Pass EXPECT_CUT=<day> to assert a known value (the daily pipeline writes
// it to pull_<DATE>/_derived.json as dCommon); otherwise the computed value is accepted and printed.
const CUT_DAY = process.env.EXPECT_CUT ? +process.env.EXPECT_CUT : null;

// representative real ASIN per brand — lets brand-attributed spend flow through the
// tracker's ASIN->brand map with no code change
const REP = { CF: 'B09KSV26D7', CN: 'B01M1VAH9F', DD: 'B0DBRR1HVV' };
const BRAND_NAME = { CF: 'Caledon Farms', CN: 'Crumps’ Naturals', DD: 'Dog Delights' };

const vMonthly = R.vMonthly.map(([date, country_code, amazon_brand_name, shipped_cogs]) =>
  ({ date, country_code, amazon_brand_name, shipped_cogs }));
const aMonthly = R.aMonthly.map(([date, country_code, spend]) => ({ date, country_code, spend }));
const vDaily = R.vDaily.map(([date, country_code, amazon_brand_name, shipped_cogs]) =>
  ({ date, country_code, amazon_brand_name, shipped_cogs }));
const aDaily = R.aDaily.map(([date, country_code, spend]) => ({ date, country_code, spend }));
const aMonthlyAsin = R.aMonthlyBrand.map(([date, country_code, b, product_ad_spend]) =>
  ({ date, country_code, asin: REP[b], product_ad_spend }));
const aDailyAsin = R.aDailyBrand.map(([date, country_code, b, product_ad_spend]) =>
  ({ date, country_code, asin: REP[b], product_ad_spend }));

const brandMapRows = [];
for (const [k, list] of [['CF', R.CF_ASINS], ['CN', R.CN_ASINS], ['DD', R.DD_ASINS]])
  for (const asin of list) brandMapRows.push({ asin, amazon_brand_name: BRAND_NAME[k], shipped_cogs: 1 });

const moversCur = R.moversCur.map(([asin, country_code, shipped_cogs]) => ({ asin, country_code, shipped_cogs }));
const moversBase = R.moversBase.map(([asin, country_code, shipped_cogs]) => ({ asin, country_code, shipped_cogs }));

/* ---------- reconciliation (RULE 0: verify, never assume) ---------- */
const cad = (v, m) => (v || 0) * (m === 'US' ? FX : 1);
const bk = raw => { const s = raw.toLowerCase();
  return s.includes('caledon') ? 'CF' : s.includes('crump') ? 'CN' : s.includes('dog delights') ? 'DD' : null; };

const checks = [];
const near = (a, b, tol, label) => {
  const ok = Math.abs(a - b) <= tol;
  checks.push({ label, a: +a.toFixed(2), b: +b.toFixed(2), diff: +(a - b).toFixed(2), ok });
  return ok;
};

// 1. settled common window must land on the expected day
const lastDay = ds => Math.max(...ds.map(d => +d.slice(8, 10)));
const adsLast = lastDay(aDaily.filter(r => r.date < AS_OF && r.spend > 0).map(r => r.date));
const vCA = lastDay(vDaily.filter(r => r.country_code === 'CA' && r.shipped_cogs > 0).map(r => r.date));
const vUS = lastDay(vDaily.filter(r => r.country_code === 'US' && r.shipped_cogs > 0).map(r => r.date));
const SETTLE = 2;
const asOfDay = +AS_OF.slice(8, 10);
const dCommon = Math.min(adsLast, vCA, vUS, asOfDay - SETTLE);
if (CUT_DAY !== null)
  checks.push({ label: 'settled window day', a: dCommon, b: CUT_DAY, diff: dCommon - CUT_DAY, ok: dCommon === CUT_DAY });
else
  checks.push({ label: 'settled window day (computed, not asserted)', a: dCommon, b: dCommon, diff: 0, ok: dCommon >= 0 });
const cut = CUR + '-' + String(dCommon).padStart(2, '0');

// 2. daily COGS (to cut) must roll up under the July monthly figure
for (const m of ['CA', 'US']) {
  const d = vDaily.filter(r => r.country_code === m && r.date <= cut).reduce((s, r) => s + r.shipped_cogs, 0);
  const mo = vMonthly.filter(r => r.country_code === m && r.date === CUR_FIRST).reduce((s, r) => s + r.shipped_cogs, 0);
  checks.push({ label: `daily<=cut <= monthly COGS ${m}`, a: +d.toFixed(2), b: +mo.toFixed(2), diff: +(d - mo).toFixed(2), ok: d <= mo + 0.01 });
}

// 3. brand-attributed spend vs campaign-level spend — the coverage disclosure
const covAttr = aDailyAsin.filter(r => r.date <= cut).reduce((s, r) => s + r.product_ad_spend, 0);
const covTotal = aDaily.filter(r => r.date <= cut).reduce((s, r) => s + r.spend, 0);
const coverage = covAttr / covTotal;
checks.push({ label: 'spend attribution coverage', a: +(coverage * 100).toFixed(2), b: 100, diff: +((coverage - 1) * 100).toFixed(2), ok: coverage > 0.9 && coverage < 1.1 });

// 4. rolling-12 CAD totals
const cogs12 = vMonthly.reduce((s, r) => s + cad(r.shipped_cogs, r.country_code), 0);
const spend12 = aMonthly.reduce((s, r) => s + r.spend, 0);

// 5. every brand in the COGS rows resolves
const unresolved = [...new Set(vMonthly.concat(vDaily).map(r => r.amazon_brand_name))].filter(n => !bk(n));
checks.push({ label: 'unresolved brand names', a: unresolved.length, b: 0, diff: unresolved.length, ok: !unresolved.length });

// 6. movers ASINs all resolve to a brand
const asinBrand = {}; for (const r of brandMapRows) asinBrand[r.asin] = bk(r.amazon_brand_name);
const missing = [...new Set(moversCur.concat(moversBase).map(r => r.asin))].filter(a => !asinBrand[a]);
checks.push({ label: 'movers ASINs unmapped', a: missing.length, b: 0, diff: missing.length, ok: !missing.length });

const snapshot = {
  asOf: AS_OF, fx: FX, cut, dCommon,
  coverage: +coverage.toFixed(4),
  source: 'Pacvue connector (execute_query) — pulled ' + AS_OF + ' by the daily tracker pipeline; FX measured on that pull = ' + FX.toFixed(5),
  moversCap: 'top 80 ASINs by shipped COGS in each window',
  vMonthly, aMonthly, vDaily, aDaily, aMonthlyAsin, aDailyAsin, brandMapRows,
  movers: { cur: moversCur, base: moversBase, pk: PK, prevDays: PREV_DAYS }
};

writeFileSync(new URL('./snapshot.json', import.meta.url), JSON.stringify(snapshot));

console.log('rolling-12 shipped COGS (CAD):', cogs12.toLocaleString('en', { maximumFractionDigits: 0 }));
console.log('rolling-12 ad spend    (CAD):', spend12.toLocaleString('en', { maximumFractionDigits: 0 }));
console.log('cut =', cut, '| coverage =', (coverage * 100).toFixed(2) + '%');
console.log('\nchecks:');
for (const c of checks) console.log(` ${c.ok ? 'PASS' : 'FAIL'}  ${c.label}: ${c.a} vs ${c.b} (Δ ${c.diff})`);
if (checks.some(c => !c.ok)) { console.error('\nRECONCILIATION FAILED'); process.exit(1); }
console.log('\nAll checks passed. snapshot.json written.');

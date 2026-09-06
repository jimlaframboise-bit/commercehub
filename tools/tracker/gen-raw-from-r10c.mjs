/* Generate tools/tracker/raw.js + titles.json from an R10c snapshot produced by the daily
   tracker pipeline (project tracker_build/r10c_snapshot_<DATE>.json).

   Why: the R3 tracker on CommerceHub /tracker and the R10c tracker on Vercel issue the SAME
   seven base queries plus movers, and the R10c pipeline already pulls, ties out and stores them
   every weekday at 14:00 (tracker_build/REFRESH_RUNBOOK.md). Re-pulling them by hand for this
   page would be a second, un-tied copy of the same numbers. So this page is fed from that
   verified snapshot instead - one pull, two pages, one set of figures.

   Usage:  node tools/tracker/gen-raw-from-r10c.mjs <path to r10c_snapshot_YYYY-MM-DD.json>
   Then:   node tools/tracker/build-snapshot.mjs   (reads AS_OF / FX from the generated raw.js) */
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('usage: gen-raw-from-r10c.mjs <r10c_snapshot.json>'); process.exit(2); }
const S = JSON.parse(readFileSync(src, 'utf8'));

const need = ['pulled_at', 'fx', 'q0_vMonthly', 'q1_aMonthly', 'q2_vDaily', 'q3_aDaily',
  'q4_agg', 'q5_agg', 'q6_brandMap', 'movers_cur', 'movers_base', 'titles'];
for (const k of need) if (!(k in S)) { console.error('snapshot missing key: ' + k); process.exit(1); }

// brand key exactly as build-snapshot.mjs resolves it (bk): substring match, apostrophe-agnostic
const bk = n => { const s = String(n).toLowerCase();
  return s.includes('caledon') ? 'CF' : s.includes('crump') ? 'CN' : s.includes('dog delights') ? 'DD' : null; };

const J = v => JSON.stringify(v);
const rows = (arr, f) => arr.map(r => J(f(r))).join(',\n');

const vMonthly = rows(S.q0_vMonthly, r => [r.date, r.country_code, r.amazon_brand_name, +r.shipped_cogs || 0]);
const aMonthly = rows(S.q1_aMonthly.filter(r => r.date), r => [r.date, r.country_code, +r.spend || 0]);
const vDaily   = rows(S.q2_vDaily,   r => [r.date, r.country_code, r.amazon_brand_name, +r.shipped_cogs || 0]);
const aDaily   = rows(S.q3_aDaily,   r => [r.date, r.country_code, +r.spend || 0]);
// q4_agg is month-keyed ("2025-09"); raw.js wants a first-of-month date
const aMonthlyBrand = rows(S.q4_agg, r => [r.k + '-01', r.m, r.b, +r.v || 0]);
const aDailyBrand   = rows(S.q5_agg, r => [r.d, r.m, r.b, +r.v || 0]);

const lists = { CF: new Set(), CN: new Set(), DD: new Set() };
let unmapped = 0;
for (const r of S.q6_brandMap) { const k = bk(r.amazon_brand_name); if (k) lists[k].add(r.asin); else unmapped++; }
if (unmapped) { console.error(`q6_brandMap: ${unmapped} rows with an unrecognised brand name`); process.exit(1); }

const moversCur  = rows(S.movers_cur,  r => [r.asin, r.country_code, +r.shipped_cogs || 0]);
const moversBase = rows(S.movers_base, r => [r.asin, r.country_code, +r.shipped_cogs || 0]);

const out = `// RAW Pacvue pull - generated ${new Date().toISOString().slice(0, 10)} by gen-raw-from-r10c.mjs
// from the daily tracker pipeline's verified snapshot (pulled ${S.pulled_at}, tie-outs per
// tracker_build/REFRESH_RUNBOOK.md). Every number is a verbatim connector row. No inference. (RULE 0)
// Query shapes mirror the R3 tracker artifact exactly (7 base + 2 movers).
//
// FX: the connector converted the ad-spend rows to CAD itself; the rate it used was measured on
// the same pull as US-ads-in-USD / US-ads-in-CAD = ${S.fx}. Vendor COGS arrives native and
// build-snapshot.mjs converts it at THIS SAME rate, so spend and COGS sit on one path.

export const AS_OF = ${J(S.pulled_at)};
export const FX = ${S.fx};

// ---- q0: monthly shipped COGS by month x market x brand (NATIVE currency) ----
export const vMonthly = [
${vMonthly}
];

// ---- q1: monthly ad spend, campaign level, converted to CAD by the connector ----
export const aMonthly = [
${aMonthly}
];

// ---- q2: current-month daily shipped COGS by market x brand (NATIVE) ----
export const vDaily = [
${vDaily}
];

// ---- q3: current-month daily ad spend, campaign level, CAD ----
export const aDaily = [
${aDaily}
];

// ---- q4: monthly ad spend attributed to brand via advertised ASIN, CAD ----
export const aMonthlyBrand = [
${aMonthlyBrand}
];

// ---- q5: current-month daily ad spend attributed to brand, CAD ----
export const aDailyBrand = [
${aDailyBrand}
];

// ---- q6: ASIN -> brand (from the vendor catalogue, 12-month window) ----
export const CF_ASINS = ${J([...lists.CF].sort())};
export const CN_ASINS = ${J([...lists.CN].sort())};
export const DD_ASINS = ${J([...lists.DD].sort())};

// ---- movers: ASIN-level shipped COGS, current window (to the cut) and prior full month ----
export const moversCur = [
${moversCur}
];
export const moversBase = [
${moversBase}
];
`;
writeFileSync(new URL('./raw.js', import.meta.url), out);
writeFileSync(new URL('./titles.json', import.meta.url), JSON.stringify(S.titles, null, 0));

console.log(`raw.js written from ${src}`);
console.log(`  AS_OF ${S.pulled_at} · FX ${S.fx}`);
console.log(`  vMonthly ${S.q0_vMonthly.length} · aMonthly ${S.q1_aMonthly.length} · vDaily ${S.q2_vDaily.length} · aDaily ${S.q3_aDaily.length}`);
console.log(`  brand spend: monthly ${S.q4_agg.length} · daily ${S.q5_agg.length}`);
console.log(`  ASINs: CF ${lists.CF.size} · CN ${lists.CN.size} · DD ${lists.DD.size}`);
console.log(`  movers: cur ${S.movers_cur.length} · base ${S.movers_base.length} · titles ${Object.keys(S.titles).length}`);

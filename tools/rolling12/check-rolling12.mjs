/* Headless render check for the Rolling12 Tracker page.

   This asserts what should be TRUE on screen, not merely that nothing threw. The C4 lesson
   from this repo is that "renders with 0 console errors" cannot catch a wrong number or a
   dead control, so every check here reads a rendered value and compares it to a figure
   computed independently from snapshot12.json.

   Usage:  node tools/rolling12/check-rolling12.mjs [path-to-html]
           (defaults to tools/rolling12/rolling12-page.html) */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const FILE = process.argv[2] || new URL('./rolling12-page.html', import.meta.url).pathname;
const snap = JSON.parse(readFileSync(new URL('./snapshot12.json', import.meta.url)));
const FX = snap.fx, cut = snap.cut, d = snap.dCommon;
const DAYS = 31, PLAN_COGS = 1440000, PLAN_BUDGET = 104000;

/* ---- independently recompute what the page should show, straight from the snapshot ---- */
const cad = (v, m) => (v || 0) * (m === 'US' ? FX : 1);
const mtdCogs = { CA: 0, US: 0 }, mtdSpend = { CA: 0, US: 0 };
for (const r of snap.vDaily) if (r.date <= cut) mtdCogs[r.country_code === 'US' ? 'US' : 'CA'] += cad(r.shipped_cogs, r.country_code);
for (const r of snap.aDaily) if (r.date <= cut) mtdSpend[r.country_code === 'US' ? 'US' : 'CA'] += (r.spend || 0);
const mtdC = mtdCogs.CA + mtdCogs.US, mtdS = mtdSpend.CA + mtdSpend.US;
const actualize = (mtd, proj) => mtd + proj * (DAYS - d) / DAYS;
const actCA = actualize(mtdCogs.CA, 651000), actUS = actualize(mtdCogs.US, 789000);
const combAct = actCA + actUS;
const fmtM = v => '$' + (v / 1e6).toFixed(2) + 'M';
const fmtK = v => '$' + Math.round(v / 1000) + 'K';

const checks = [];
const ok = (label, pass, detail = '') => checks.push({ label, pass, detail });
/* Card labels are uppercased by CSS and innerText returns the RENDERED text, so every
   text assertion is case-insensitive on purpose. */
const has = (hay, needle, label) => ok(label, hay.toLowerCase().includes(String(needle).toLowerCase()), needle);
const asOfLong = new Date(snap.asOf + 'T12:00:00Z').toLocaleDateString('en',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const asOfShort = new Date(snap.asOf + 'T12:00:00Z').toLocaleDateString('en-GB',
  { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/* Pinned browser path — same one tools/tracker/check-tracker.mjs uses. Override with
   CHROME_PATH if the sandbox ships a different build. */
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
/* Product photos come from Shopify's public CDN, exactly as the artifact ships them. The
   build sandbox has no route to that CDN, so those requests fail here and will not fail in
   a real browser. They are separated out rather than ignored: the count is reported, and
   the graceful fallback they trigger (the brand tile behind each photo) is asserted below. */
const errors = [], imageErrors = [];
const isImageFailure = t => /cdn\.shopify\.com/.test(t) || /ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|Failed to load resource/.test(t);
page.on('console', m => { if (m.type() === 'error') (isImageFailure(m.text()) ? imageErrors : errors).push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('requestfailed', r => { if (r.resourceType() === 'image') imageErrors.push(r.url()); });

await page.goto('file://' + FILE);
await page.waitForSelector('#content', { state: 'visible', timeout: 20000 });
await page.waitForTimeout(1200);

const text = await page.locator('body').innerText();

/* 1 — it finished, and it says it is a snapshot rather than pretending to be live */
ok('loading spinner is gone', await page.locator('#loading').isHidden());
ok('watchdog saw the script finish', await page.evaluate(() => !!(window.__r12 && window.__r12.finished)));
has(text, 'Pacvue snapshot · ' + asOfShort, 'header carries the snapshot date');
has(text, 'Static snapshot', 'footer discloses the snapshot');
ok('no "Refreshed <clock time>" claim', !/Refreshed \d/.test(text));

/* 2 — the clock is pinned; an unpinned clock is the silent-wrong-answer failure mode */
const pinned = await page.evaluate(() => document.body.innerText);
has(pinned, 'Pulled from Pacvue ' + asOfLong, 'as-of line reads the snapshot date');
has(pinned, `Jul 1–${d}`, 'measured window says the settled cut');

/* 3 — the three scoreboard cards must carry the recomputed figures */
has(text, `Shipped COGS so far — days 1–${d} of ${DAYS}`, 'COGS-so-far card header');
has(text, fmtM(mtdC), 'MTD shipped COGS');
has(text, fmtM(PLAN_COGS * d / DAYS), 'expected-by-now COGS');
has(text, fmtM(combAct) + ' est.', 'actualized full-month COGS');
has(text, fmtM(PLAN_COGS) + ' projected (frozen)', 'frozen projection');
has(text, `Ad spend so far — days 1–${d} of ${DAYS}`, 'ad-spend card header');
has(text, fmtK(mtdS), 'MTD ad spend');
has(text, `of ${fmtK(PLAN_BUDGET)} budget`, 'budget reference');

/* 4 — the charts actually drew */
const canvases = await page.evaluate(() => [...document.querySelectorAll('canvas')].map(c => ({ id: c.id, w: c.width, h: c.height })));
for (const id of ['chart', 'chartCA', 'chartUS', 'chartZoom', 'chartAttrib']) {
  const c = canvases.find(x => x.id === id);
  ok(`canvas #${id} rendered`, !!c && c.w > 100 && c.h > 50, c ? `${c.w}x${c.h}` : 'missing');
}

/* 5 — movers: ten rows, all with real titles, none showing a bare ASIN as its name */
const drvPos = await page.locator('#drvPos').innerText();
const drvNeg = await page.locator('#drvNeg').innerText();
ok('5 risers listed', (drvPos.match(/actual \$/g) || []).length === 5, drvPos.split('\n')[0]);
ok('5 fallers listed', (drvNeg.match(/actual \$/g) || []).length === 5, drvNeg.split('\n')[0]);
const bareAsin = /^B0[A-Z0-9]{8}$/m;
ok('no mover shows a bare ASIN as its title', !bareAsin.test(drvPos) && !bareAsin.test(drvNeg));
has(drvPos + drvNeg, 'Caledon Farms', 'mover titles resolved');

/* Every mover must carry a product photo element. The branded letter tile sits BEHIND the
   photo as a fallback, so a missing photo is invisible to any check that only looks at
   rendered text — which is exactly how two shipped unnoticed on 2026-07-30. Asserting on the
   <img> element (not on whether it loaded) is the right test here: the build sandbox has no
   route to Shopify's CDN, but the element's presence and src are what the build controls. */
const moverImgs = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#drvPos > div, #drvNeg > div')];
  return rows.map(r => {
    const img = r.querySelector('img');
    const asin = (r.textContent.match(/\bB0[A-Z0-9]{8}\b/) || [null])[0];
    return { asin, src: img ? img.getAttribute('src') : null };
  });
});
ok('10 mover rows found', moverImgs.length === 10, moverImgs.length + ' rows');
const photoless = moverImgs.filter(m => !m.src).map(m => m.asin || '?');
ok('every mover has a product photo, not a fallback tile', photoless.length === 0,
  photoless.length ? 'no photo: ' + photoless.join(', ') : '10/10');
ok('every photo src points at the Shopify CDN', moverImgs.every(m => !m.src || /^https:\/\/cdn\.shopify\.com\//.test(m.src)));
// the two Jim reported, named explicitly so a regression is unmistakable
for (const asin of ['B0CK8HD9L6', 'B0CBL544BJ']) {
  const row = moverImgs.find(m => m.asin === asin);
  ok(`${asin} has a photo (was a tile before 2026-07-30)`, !!(row && row.src),
    row ? (row.src || 'MISSING').slice(-52) : 'not a mover in this snapshot');
}

/* 6 — segment tables rendered for both markets and reconcile to the MTD totals */
/* The page drops rows with no spend and under $500 COGS before totalling, so the table's
   Total is NOT the raw MTD figure. Replicate that filter rather than loosening the check. */
const segTotals = {};
for (const m of ['CA', 'US']) {
  const rows = {};
  const touch = n => (rows[n] = rows[n] || { spend: 0, cogs: 0 });
  const SEG_MAP = { 'Sweet Potato': 'Sweet Potato Chews', 'Sticks & Jerky': 'Chewy Sticks & Jerky', 'Training Treats': 'Mini Trainers' };
  for (const r of snap.segSpend) if ((r.country_code === 'US' ? 'US' : 'CA') === m && r.TagName && r.spend)
    touch(SEG_MAP[r.TagName] || r.TagName).spend += r.spend;
  for (const r of snap.segCogs) if ((r.country_code === 'US' ? 'US' : 'CA') === m && r.category_level_one && r.shipped_cogs)
    touch(r.category_level_one).cogs += cad(r.shipped_cogs, m);
  const kept = Object.values(rows).filter(r => r.spend > 0 || r.cogs > 500);
  segTotals[m] = { spend: kept.reduce((s, r) => s + r.spend, 0), cogs: kept.reduce((s, r) => s + r.cogs, 0) };
}
for (const [id, m] of [['segCA', 'CA'], ['segUS', 'US']]) {
  const t = await page.locator('#' + id).innerText();
  ok(`${id} table rendered`, t.includes('SEGMENT') && t.includes('TACOS'));
  ok(`${id} total COGS matches the filtered ${m} MTD`, t.includes(fmtK(segTotals[m].cogs)), fmtK(segTotals[m].cogs));
  ok(`${id} total spend matches the filtered ${m} MTD`, t.includes(fmtK(segTotals[m].spend)), fmtK(segTotals[m].spend));
}

/* 7 — market pacing bars */
for (const [id, m] of [['spendCA', 'CA'], ['spendUS', 'US']]) {
  const t = await page.locator('#' + id).innerText();
  ok(`${id} pacing bar rendered`, t.includes('of') && t.includes('plan'));
  ok(`${id} shows MTD ${m} spend`, t.includes(fmtK(mtdSpend[m])), fmtK(mtdSpend[m]));
}

/* 8 — nothing threw, and no error banner is showing */
ok('error banner hidden', await page.locator('#err').isHidden());
ok('zero console/page errors (excluding blocked product photos)', errors.length === 0, errors.slice(0, 3).join(' | '));
ok('product-photo fallback tiles rendered', /[\u{1F300}-\u{1FAFF}]/u.test(drvPos + drvNeg),
  imageErrors.length + ' photo request(s) blocked in this sandbox — fallback tiles shown');

/* 9 — the page reports a sane height to its host frame */
const h = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
ok('content height is plausible for the iframe host', h > 1500 && h < 12000, h + 'px');

await browser.close();

let failed = 0;
for (const c of checks) {
  if (!c.pass) failed++;
  console.log(` ${c.pass ? 'PASS' : 'FAIL'}  ${c.label}${c.detail ? '  [' + c.detail + ']' : ''}`);
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) { console.error('RENDER CHECK FAILED — do not deploy.'); process.exit(1); }

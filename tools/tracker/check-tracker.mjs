/* Renders the transformed tracker page headless and asserts it reproduces the pulled
   snapshot across every filter state. Verification, not a smoke test. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const snap = JSON.parse(readFileSync(new URL('./snapshot.json', import.meta.url)));
const FX = snap.fx;
const url = 'file://' + new URL('./tracker-page.html', import.meta.url).pathname;

// independent expectation, computed from the snapshot rather than read off the page
const bk = r => { const s = r.toLowerCase();
  return s.includes('caledon') ? 'CF' : s.includes('crump') ? 'CN' : s.includes('dog delights') ? 'DD' : null; };
const cad = (v, m) => (v || 0) * (m === 'US' ? FX : 1);
function expectCogsMTD(mkts, brands) {
  return snap.vDaily.filter(r => r.date <= snap.cut && mkts.includes(r.country_code) && brands.includes(bk(r.amazon_brand_name)))
    .reduce((s, r) => s + cad(r.shipped_cogs, r.country_code), 0);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('#content', { state: 'visible', timeout: 20000 });

const results = [];
const check = (label, pass, detail) => { results.push({ label, pass, detail }); };

// chrome + honesty
const pill = (await page.textContent('#modePill')).trim();
check('pill does not claim LIVE', !/LIVE/i.test(pill) && /snapshot/i.test(pill), pill);
check('no SAMPLE banner', !(await page.$('.banner')), 'sample fallback did not trigger');
check('charts drew', (await page.$$eval('canvas', cs => cs.filter(c => c.width > 0 && c.height > 0).length)) >= 2, 'canvases sized');
const foot = await page.textContent('.foot');
check('footer discloses snapshot', /Static snapshot/.test(foot) && /28 Jul 2026/.test(foot), '');

// filter states: [label, market buttons, brand buttons, expected markets, expected brands]
const STATES = [
  ['blended',        [],           [],           ['CA', 'US'], ['CF', 'CN', 'DD']],
  ['US only',        ['CA'],       [],           ['US'],       ['CF', 'CN', 'DD']],
  ['CA only',        ['US'],       [],           ['CA'],       ['CF', 'CN', 'DD']],
  ['both + CF',      [],           ['CN', 'DD'], ['CA', 'US'], ['CF']],
  ['US + CN',        ['CA'],       ['CF', 'DD'], ['US'],       ['CN']],
  ['DD only',        [],           ['CF', 'CN'], ['CA', 'US'], ['DD']],
];

for (const [label, offM, offB, mkts, brands] of STATES) {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#content', { state: 'visible' });
  for (const k of offM) await page.click(`.tbtn[data-g="m"][data-k="${k}"]`);
  for (const k of offB) await page.click(`.tbtn[data-g="b"][data-k="${k}"]`);
  await page.waitForTimeout(250);

  const shown = await page.$$eval('.tbtn.on', bs => bs.map(b => b.dataset.g + ':' + b.dataset.k));
  const wantOn = mkts.map(m => 'm:' + m).concat(brands.map(b => 'b:' + b)).sort().join(',');
  check(`${label} — buttons`, shown.sort().join(',') === wantOn, shown.join(','));

  const exp = expectCogsMTD(mkts, brands);
  const txt = await page.textContent('#content');
  // the hero card renders $X.XXM at any scale; the smaller cards auto-scale. Accept either.
  const fmtM = v => '$' + (v / 1e6).toFixed(2) + 'M';
  const fmtAuto = v => Math.abs(v) >= 1e6 ? fmtM(v)
    : Math.abs(v) < 1000 ? '$' + Math.round(v)
    : Math.abs(v) < 100000 ? '$' + (v / 1000).toFixed(1) + 'K'
    : '$' + Math.round(v / 1000) + 'K';
  const forms = [...new Set([fmtM(exp), fmtAuto(exp)])];
  check(`${label} — actualized COGS ${forms.join(' or ')} on page`,
    forms.some(f => txt.includes(f)), `expected one of ${forms.join(' / ')} (raw ${exp.toFixed(2)})`);
  check(`${label} — no errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
}

// brand views must not fabricate a plan comparison
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#content', { state: 'visible' });
await page.click('.tbtn[data-g="b"][data-k="CN"]');
await page.click('.tbtn[data-g="b"][data-k="DD"]');
await page.waitForTimeout(250);
const brandTxt = await page.textContent('#content');
check('brand view shows n/a instead of a fabricated plan', /n\/a/i.test(brandTxt), '');

await page.screenshot({ path: 'tracker-blended.png', fullPage: true });
await browser.close();

let fails = 0;
for (const r of results) { if (!r.pass) fails++; console.log(` ${r.pass ? 'PASS' : 'FAIL'}  ${r.label}${r.detail && !r.pass ? '  — ' + r.detail : ''}`); }
console.log(`\n${results.length - fails}/${results.length} passed; ${errors.length} page/console errors`);
if (errors.length) console.log(errors.join('\n'));
process.exit(fails || errors.length ? 1 : 0);

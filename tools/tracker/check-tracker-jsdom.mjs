/* jsdom port of check-tracker.mjs (which needs Playwright + a Chromium binary this sandbox does
   not have). Same assertions, same independent expectations computed from snapshot.json rather
   than read off the page. Chart.js is stubbed exactly as tracker_build/verify_baked.mjs does.
     JSDOM_DIR=<dir with node_modules/jsdom> node tools/tracker/check-tracker-jsdom.mjs */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JSDOM_DIR || '.').replace(/\/?$/, '/'));
const { JSDOM, VirtualConsole } = require('jsdom');

const snap = JSON.parse(fs.readFileSync(new URL('./snapshot.json', import.meta.url)));
const FX = snap.fx;
let html = fs.readFileSync(new URL('./tracker-page.html', import.meta.url), 'utf8');

// Drop the inlined Chart.js (real Chart.js needs a real canvas); the stub below stands in.
const cj = html.indexOf('<script>/*!\n * Chart.js');
if (cj < 0) { console.error('inlined Chart.js block not found'); process.exit(1); }
const cjEnd = html.indexOf('</script>', cj) + 9;
html = html.slice(0, cj) + html.slice(cjEnd);

const bk = r => { const s = r.toLowerCase();
  return s.includes('caledon') ? 'CF' : s.includes('crump') ? 'CN' : s.includes('dog delights') ? 'DD' : null; };
const cad = (v, m) => (v || 0) * (m === 'US' ? FX : 1);
const expectCogsMTD = (mkts, brands) => snap.vDaily
  .filter(r => r.date <= snap.cut && mkts.includes(r.country_code) && brands.includes(bk(r.amazon_brand_name)))
  .reduce((s, r) => s + cad(r.shipped_cogs, r.country_code), 0);

function chartStub(window) {
  const charts = [];
  function Chart(ctx, cfg) { charts.push(cfg); this.config = cfg; this.data = cfg && cfg.data; this.options = cfg && cfg.options;
    this.chartArea = { top: 0, bottom: 300, left: 0, right: 600, width: 600, height: 300 };
    this.scales = { x: { getPixelForValue: () => 0 }, y: { getPixelForValue: () => 0 } };
    this.update = () => {}; this.destroy = () => {}; this.resize = () => {}; this.getDatasetMeta = () => ({ data: [] }); }
  Chart.defaults = { font: { family: '' }, color: '', plugins: {} }; Chart.register = () => {}; Chart.__charts = charts;
  window.Chart = Chart;
  window.HTMLCanvasElement.prototype.getContext = () => ({ canvas: { width: 600, height: 300 },
    save(){}, restore(){}, beginPath(){}, closePath(){}, moveTo(){}, lineTo(){}, stroke(){}, fill(){}, fillRect(){}, clearRect(){},
    arc(){}, rect(){}, fillText(){}, strokeText(){}, measureText: () => ({ width: 40 }), setLineDash(){}, translate(){}, rotate(){},
    scale(){}, createLinearGradient: () => ({ addColorStop(){} }), setTransform(){}, drawImage(){}, clip(){} });
}
async function load() {
  const errors = [], vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdom: ' + String(e && e.message || e)));
  vc.on('error', (...a) => errors.push('console: ' + a.join(' ')));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    url: 'https://commercehub-five.vercel.app/tracker', beforeParse: chartStub });
  for (let i = 0; i < 80; i++) await new Promise(r => setTimeout(r, 25));
  return { w: dom.window, d: dom.window.document, errors };
}
const settle = () => new Promise(r => setTimeout(r, 300));
const txt = el => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '');
const results = []; const check = (label, pass, detail = '') => results.push({ label, pass, detail });

const AS_OF_LABEL = new Date(snap.asOf + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
{
  const { w, d, errors } = await load();
  const pill = txt(d.querySelector('#modePill'));
  check('pill does not claim LIVE', !/LIVE/i.test(pill) && /snapshot/i.test(pill), pill);
  check(`pill carries the snapshot date (${AS_OF_LABEL})`, pill.includes(AS_OF_LABEL), pill);
  check('no SAMPLE banner', !d.querySelector('.banner'), 'sample fallback did not trigger');
  check('charts constructed (>=2)', w.Chart.__charts.length >= 2, String(w.Chart.__charts.length));
  const foot = txt(d.querySelector('.foot'));
  check('footer discloses snapshot', /Static snapshot/.test(foot) && foot.includes(AS_OF_LABEL), foot.slice(-160));
  check('content visible', d.querySelector('#content') && d.querySelector('#content').style.display !== 'none', '');
  check('initial load — no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
}

const STATES = [
  ['blended',   [],     [],           ['CA', 'US'], ['CF', 'CN', 'DD']],
  ['US only',   ['CA'], [],           ['US'],       ['CF', 'CN', 'DD']],
  ['CA only',   ['US'], [],           ['CA'],       ['CF', 'CN', 'DD']],
  ['both + CF', [],     ['CN', 'DD'], ['CA', 'US'], ['CF']],
  ['US + CN',   ['CA'], ['CF', 'DD'], ['US'],       ['CN']],
  ['DD only',   [],     ['CF', 'CN'], ['CA', 'US'], ['DD']],
];
const fmtM = v => '$' + (v / 1e6).toFixed(2) + 'M';
const fmtAuto = v => Math.abs(v) >= 1e6 ? fmtM(v) : Math.abs(v) < 1000 ? '$' + Math.round(v)
  : Math.abs(v) < 100000 ? '$' + (v / 1000).toFixed(1) + 'K' : '$' + Math.round(v / 1000) + 'K';

for (const [label, offM, offB, mkts, brands] of STATES) {
  const { d, errors } = await load();
  for (const k of offM) d.querySelector(`.tbtn[data-g="m"][data-k="${k}"]`).click();
  for (const k of offB) d.querySelector(`.tbtn[data-g="b"][data-k="${k}"]`).click();
  await settle();
  const shown = [...d.querySelectorAll('.tbtn.on')].map(b => b.dataset.g + ':' + b.dataset.k).sort().join(',');
  const wantOn = mkts.map(m => 'm:' + m).concat(brands.map(b => 'b:' + b)).sort().join(',');
  check(`${label} — buttons`, shown === wantOn, shown);
  const exp = expectCogsMTD(mkts, brands);
  const t = txt(d.querySelector('#content'));
  const forms = [...new Set([fmtM(exp), fmtAuto(exp)])];
  check(`${label} — actualized COGS ${forms.join(' or ')} on page`, forms.some(f => t.includes(f)), `raw ${exp.toFixed(2)}`);
  check(`${label} — no errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
}
{
  const { d } = await load();
  d.querySelector('.tbtn[data-g="b"][data-k="CN"]').click();
  d.querySelector('.tbtn[data-g="b"][data-k="DD"]').click();
  await settle();
  check('brand view shows n/a instead of a fabricated plan', /n\/a/i.test(txt(d.querySelector('#content'))), '');
}
let fails = 0;
for (const r of results) { if (!r.pass) fails++; console.log(` ${r.pass ? 'PASS' : 'FAIL'}  ${r.label}${!r.pass && r.detail ? '  — ' + r.detail : ''}`); }
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);

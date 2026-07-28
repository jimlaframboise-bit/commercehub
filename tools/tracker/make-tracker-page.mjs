/* Transforms the R3 Amazon Tracker artifact into the self-contained page embedded in
   CommerceHub. DESIGN IS UNTOUCHED — every change here is plumbing:
     - the Cowork/Pacvue MCP bridge is replaced by the frozen snapshot pulled 2026-07-28
     - "now" is pinned to the snapshot date so the rolling-12 window can't drift
     - Chart.js is inlined (no CDN dependency; keeps the CommerceHub bundle self-contained)
     - the LIVE pill tells the truth about being a snapshot
     - the page reports its height so the host iframe can size to content            */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = '/mnt/user-data/uploads/Crump Group FY27 Ads Plan/tracker_versions/redesign_2026-07-28_R3_market-brand-filters.html';
const snapshot = JSON.parse(readFileSync(new URL('./snapshot.json', import.meta.url)));
const titles = JSON.parse(readFileSync(new URL('./titles.json', import.meta.url)));
snapshot.titles = titles;

let h = readFileSync(SRC, 'utf8');
const before = h.length;
const patches = [];
function patch(label, find, replace) {
  const hits = h.split(find).length - 1;
  if (hits !== 1) { console.error(`PATCH FAIL [${label}]: expected 1 match, found ${hits}`); process.exit(1); }
  h = h.replace(find, () => replace);
  patches.push(label);
}

/* 1 — drop the Cowork artifact manifest (meaningless outside the artifact runtime) */
patch('strip artifact meta',
  h.slice(h.indexOf('<script type="application/json" id="cowork-artifact-meta">'), h.indexOf('</script>') + 9),
  '');

/* 2 — inline Chart.js in place of the CDN tag */
const chartjs = readFileSync(new URL('./node_modules/chart.js/dist/chart.umd.js', import.meta.url), 'utf8');
patch('inline chart.js',
  '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.js" integrity="sha384-iU8HYtnGQ8Cy4zl7gbNMOhsDTTKX02BTXptVP/vqAWIaTfM7isw76iyZCsjL2eVi" crossorigin="anonymous"></script>',
  '<script>' + chartjs + '</script>');

/* 3 — the frozen dataset + a q() that serves it, in place of the MCP bridge */
patch('freeze mode', "let MODE = 'live', MODE_WHY = [];", "let MODE = 'frozen', MODE_WHY = [];\nconst SNAP = " + JSON.stringify(snapshot) + ';');

patch('replace q()',
`async function q(args) {
  if (MODE === 'sample') return SAMPLE.route(args).filter(x => !('date' in x) || x.date);
  let r;
  try {
    r = await window.cowork.callMcpTool(TOOL, args);
  } catch (e) {
    const err = new Error('The Pacvue call was rejected by the bridge. ' + GRANT_HINT + ' — Raw error: ' + String(e && (e.message || e)).slice(0, 500));
    err.diag = coworkDiag();
    throw err;
  }
  if (r.isError) {
    const msg = JSON.stringify(r.content).slice(0, 500);
    const err = new Error(/denied|permission|grant|not allowed|unauthori|not.?connected|no such tool|unknown tool/i.test(msg)
      ? 'Pacvue access was refused. ' + GRANT_HINT + ' — Raw error: ' + msg
      : 'Connector query failed: ' + msg);
    err.diag = coworkDiag();
    throw err;
  }
  const payload = r.structuredContent ?? JSON.parse(r.content[0].text);
  return (payload.rows || []).filter(x => !('date' in x) || x.date);
}`,
`/* Frozen-snapshot router. Same call signatures the live artifact uses, served from the
   dataset pulled from Pacvue on \${SNAP.asOf} — see SNAP.source. */
async function q(args) {
  const dims = (args.dimensions || []).map(x => x.field);
  const gran = (((args.dimensions || []).find(x => x.granularity)) || {}).granularity;
  const has = f => dims.includes(f);
  const rows = (() => {
    if (args.platform === 'commerce-amazon-vendor') {
      if (has('product_title')) {
        const want = (args.filters || []).find(f => f.field === 'asin');
        const list = want ? want.value : Object.keys(SNAP.titles);
        return list.filter(a => SNAP.titles[a])
          .map(a => ({ asin: a, product_title: SNAP.titles[a], country_code: 'CA', shipped_cogs: 1 }));
      }
      if (has('amazon_brand_name') && has('asin')) return SNAP.brandMapRows;
      if (has('amazon_brand_name')) return gran === 'day' ? SNAP.vDaily : SNAP.vMonthly;
      if (has('asin')) {
        const df = (args.filters || []).find(f => f.field === 'date');
        const from = df && Array.isArray(df.value) ? df.value[0] : '';
        return from.slice(0, 7) === SNAP.asOf.slice(0, 7) ? SNAP.movers.cur : SNAP.movers.base;
      }
    }
    if (args.platform === 'amazon-ads') {
      const byAsin = dims.some(d => /asin/.test(d));
      if (gran === 'day') return byAsin ? SNAP.aDailyAsin : SNAP.aDaily;
      return byAsin ? SNAP.aMonthlyAsin : SNAP.aMonthly;
    }
    return [];
  })();
  return rows.filter(x => !('date' in x) || x.date);
}`);

/* 4 — no connector bridge to wait for */
patch('skip bridge wait',
  `  try { await waitForCowork(); }
  catch (e) { MODE = 'sample'; MODE_WHY = [e.message].concat(e.diag || []); }

  const now = new Date();`,
  `  // "now" is pinned to the snapshot date: a frozen dataset with a moving clock would
  // silently slide the rolling-12 window off its data.
  const now = new Date(SNAP.asOf + 'T12:00:00Z');`);

/* 5 — titles come from the snapshot */
patch('frozen titles',
  `      for (const r of rows) {
        if (!r.asin || !r.product_title) continue;
        if (!titleCache[r.asin] || r.country_code === 'CA') titleCache[r.asin] = r.product_title;
      }`,
  `      for (const r of rows) {
        if (!r.asin || !r.product_title) continue;
        titleCache[r.asin] = r.product_title;
      }`);

/* 6 — the status pill must not claim to be live */
patch('honest pill',
  '<span class="pill live" id="modePill"><span class="dot"></span>LIVE · Pacvue</span>',
  '<span class="pill month" id="modePill">Pacvue snapshot · 28 Jul 2026</span>');
patch('loading copy', 'Pulling live data from the Pacvue connector…', 'Loading the Pacvue snapshot…');
patch('asof placeholder', 'Connecting to the Pacvue connector…', 'Loading…');

/* 7 — say so in the methodology footer */
patch('footer provenance',
  "(MODE === 'sample' ? ' <strong>This render used the built-in sample dataset (design preview), not Pacvue.</strong>' : '')",
  `' <strong>Static snapshot</strong> — figures were pulled from Pacvue on 28 Jul 2026 and are frozen into this page; ` +
  `they do not refresh when you open it. Movers are drawn from the top 80 ASINs by shipped COGS in each window.'`);

/* 8 — don't assert a clock time the snapshot doesn't have (pinned "now" is midday UTC) */
patch('date not time', "'. Refreshed ' + now.toLocaleString() + '. ' +",
  "'. Pulled from Pacvue ' + now.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) + '. ' +");

/* 9 — report height so the CommerceHub shell can size the frame to content */
patch('height reporting', '\nmain().catch(e => {',
`
function reportHeight() {
  if (window.parent === window) return;
  const el = document.documentElement;
  parent.postMessage({ type: 'ch-tracker-height', height: Math.max(el.scrollHeight, document.body.scrollHeight) }, '*');
}
window.addEventListener('load', reportHeight);
window.addEventListener('resize', reportHeight);
new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true, attributes: true });
setInterval(reportHeight, 1000);

main().then(reportHeight).catch(e => {`);

writeFileSync(new URL('./tracker-page.html', import.meta.url), h);
console.log(`patches applied (${patches.length}): ` + patches.join(', '));
console.log(`size ${(before / 1024).toFixed(0)}KB -> ${(h.length / 1024).toFixed(0)}KB`);
if (/cowork\.callMcpTool|waitForCowork\(\)/.test(h.replace(/function waitForCowork[\s\S]*?\n}/, '')))
  { console.error('FAIL: a live-bridge call survived'); process.exit(1); }
console.log('OK — no live-bridge calls remain on any executed path.');

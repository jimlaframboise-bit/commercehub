/* Transforms the R3 Amazon Tracker artifact into the self-contained page embedded in
   CommerceHub. DESIGN IS UNTOUCHED — every change here is plumbing:
     - the Cowork/Pacvue MCP bridge is replaced by the frozen snapshot pulled 2026-07-28
     - "now" is pinned to the snapshot date so the rolling-12 window can't drift
     - Chart.js is inlined (no CDN dependency; keeps the CommerceHub bundle self-contained)
     - the LIVE pill tells the truth about being a snapshot
     - the page reports its height so the host iframe can size to content            */
import { readFileSync, writeFileSync } from 'node:fs';

// The R3 source lives in the project folder, whose mount path differs per session. Pass it as
// TRACKER_SRC; the default below is the sandbox mount used 2026-09-06. (The previous literal
// pointed at a dead /mnt/user-data/uploads path and would have failed every refresh.)
const SRC = process.env.TRACKER_SRC ||
  '/sessions/modest-exciting-brahmagupta/mnt/Crump Group FY27 Ads Plan/tracker_versions/redesign_2026-07-28_R3_market-brand-filters.html';
const snapshot = JSON.parse(readFileSync(new URL('./snapshot.json', import.meta.url)));
const titles = JSON.parse(readFileSync(new URL('./titles.json', import.meta.url)));
snapshot.titles = titles;

const AS_OF_LABEL = new Date(snapshot.asOf + 'T12:00:00Z').toLocaleDateString('en-GB',
  { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });   // e.g. "29 Jul 2026"

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
// `npm install chart.js@4.5.0` from anywhere in the repo lands in the ROOT node_modules (there is
// no package.json in tools/tracker), so resolve from the repo root; CHARTJS overrides.
const chartjs = readFileSync(process.env.CHARTJS || new URL('../../node_modules/chart.js/dist/chart.umd.js', import.meta.url), 'utf8');
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
  '<span class="pill month" id="modePill">Pacvue snapshot · ' + AS_OF_LABEL + '</span>');
patch('loading copy', 'Pulling live data from the Pacvue connector…', 'Loading the Pacvue snapshot…');
patch('asof placeholder', 'Connecting to the Pacvue connector…', 'Loading…');

/* 7 — say so in the methodology footer */
patch('footer provenance',
  "(MODE === 'sample' ? ' <strong>This render used the built-in sample dataset (design preview), not Pacvue.</strong>' : '')",
  `' <strong>Static snapshot</strong> — figures were pulled from Pacvue on ${AS_OF_LABEL} and are frozen into this page; ` +
  `they do not refresh when you open it. Movers are drawn from the top 80 ASINs by shipped COGS in each window.'`);

/* 8 — watchdog: never leave a silent spinner.
   This lives in its OWN <script> ahead of the main one, so it still runs even if the main
   script fails to parse — which is exactly the case that produces an endless spinner and no
   error. It reports what it can observe (did the script start, did Chart load, what threw,
   which browser) instead of leaving the reader guessing. */
const WATCHDOG = `<script>
(function () {
  var D = { started: false, finished: false, errors: [] };
  window.__trk = D;
  window.addEventListener('error', function (e) {
    D.errors.push(String((e && e.message) || 'error') + (e && e.lineno ? ' (line ' + e.lineno + ')' : ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    D.errors.push('unhandled rejection: ' + String((r && (r.message || r)) || 'unknown'));
  });
  function report() {
    var l = document.getElementById('loading');
    if (!l) return;
    try { if (window.getComputedStyle(l).display === 'none') return; } catch (x) {}
    var bits = [];
    bits.push('charting library: ' + (typeof Chart === 'undefined' ? 'DID NOT LOAD' : 'loaded'));
    bits.push('page script: ' + (D.started ? (D.finished ? 'finished (so the stall is later)' : 'started but did not finish') : 'NEVER STARTED - it failed to parse or run in this browser'));
    if (D.errors.length) bits.push('errors: ' + D.errors.slice(0, 4).join(' | '));
    else bits.push('errors: none reported');
    bits.push('screen: ' + (window.innerWidth || '?') + 'x' + (window.innerHeight || '?'));
    bits.push(navigator.userAgent);
    l.innerHTML =
      '<div style="max-width:660px;margin:0 auto;text-align:left;font:15px/1.6 system-ui,-apple-system,sans-serif;color:#14181f">' +
      '<div style="font-weight:700;font-size:18px;margin-bottom:10px">This page could not finish loading in this browser.</div>' +
      '<div style="color:#46536a;margin-bottom:16px">The tracker is one self-contained file with no server behind it, so this is something about the browser it opened in rather than a connection problem. Trying a different browser often works. The detail below is the useful part to send back.</div>' +
      '<pre style="white-space:pre-wrap;word-break:break-word;background:#fff;border-radius:14px;padding:16px;font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#46536a;margin:0">' +
      bits.join('\\n') + '</pre></div>';
  }
  setTimeout(report, 8000);
})();
</script>`;
patch('watchdog', '\n<script>\nconst FX = 1.42071;',
  '\n' + WATCHDOG + '\n<script>\ntry { window.__trk.started = true } catch (e) {}\nconst FX = 1.42071;');
patch('watchdog finished flag',
  `  el('loading').style.display = 'none';
  el('content').style.display = 'block';`,
  `  el('loading').style.display = 'none';
  el('content').style.display = 'block';
  try { window.__trk.finished = true } catch (e) {}`);

/* 8b — one FX path. The connector converted the ad-spend rows to CAD at a rate measured on the
   same pull (snapshot.fx). The artifact converts vendor COGS at its own literal 1.42071. Left
   alone, spend and COGS would sit on two different rates inside one page and every TACoS would
   be off by the ratio. So COGS is converted at the measured rate too - exactly what the R10c
   tracker on Vercel does. The on-page "US at <rate>" label reads the same constant, so it stays
   truthful. Added 2026-09-06. */
patch('one FX path',
  'const FX = 1.42071; // Pacvue connector rate — the Crump reporting standard (Jim, 2026-07-28)',
  'const FX = ' + snapshot.fx + '; // measured on the ' + snapshot.asOf + ' pull as US ads in USD / US ads in CAD; the connector used it for the spend rows, so COGS uses it too (one path)');

/* 9 — don't assert a clock time the snapshot doesn't have (pinned "now" is midday UTC) */
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

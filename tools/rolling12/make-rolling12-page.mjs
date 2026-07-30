/* Transforms the ORIGINAL `amazon-rolling12-tracker` artifact into the self-contained page
   embedded in CommerceHub at /rolling12.

   DESIGN AND MATH ARE UNTOUCHED — every change below is plumbing:
     - the Cowork/Pacvue MCP bridge is replaced by the frozen snapshot
     - "now" is pinned to the snapshot date so the rolling-12 window can't drift off its data
     - Chart.js is inlined (no CDN dependency; the page works offline)
     - the header and footer say plainly that this is a snapshot, not a live read
     - a watchdog turns a stall into a diagnosis instead of an endless spinner
     - the page reports its height so the host iframe can size to content

   Every patch below asserts it matched EXACTLY ONCE. If the artifact source moves, this
   aborts rather than building something that merely looks right. That guard is the whole
   point of doing it this way instead of hand-editing a copy. */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = new URL('./artifact-source.html', import.meta.url);
const snapshot = JSON.parse(readFileSync(new URL('./snapshot12.json', import.meta.url)));

const AS_OF_LABEL = new Date(snapshot.asOf + 'T12:00:00Z').toLocaleDateString('en-GB',
  { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });   // e.g. "30 Jul 2026"

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

/* 3 — the frozen dataset, injected just above the artifact's own constants */
patch('inject snapshot', "const FX = 1.4205;", "const SNAP = " + JSON.stringify(snapshot) + ';\nconst FX = 1.4205;');

/* 4 — a q() that serves the snapshot, in place of the MCP bridge.
   Same call signatures the live artifact uses; routed on the dimensions each query asks for,
   which is what makes the artifact's nine call sites work with no changes to any of them. */
patch('replace q()',
`async function q(args) {
  const r = await window.cowork.callMcpTool(TOOL, args);
  if (r.isError) throw new Error('Connector query failed: ' + JSON.stringify(r.content).slice(0, 300));
  const payload = r.structuredContent ?? JSON.parse(r.content[0].text);
  // drop null-date subtotal rows, but only for queries that HAVE a date dimension
  return (payload.rows || []).filter(x => !('date' in x) || x.date);
}`,
`/* Frozen-snapshot router. Serves the dataset pulled from Pacvue on \${SNAP.asOf} (see
   SNAP.source) in the exact row shapes the live connector returns. */
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
      if (has('category_level_one')) return SNAP.segCogs;
      if (has('asin')) {
        const df = (args.filters || []).find(f => f.field === 'date');
        const from = df && Array.isArray(df.value) ? df.value[0] : '';
        return from.slice(0, 7) === SNAP.asOf.slice(0, 7) ? SNAP.movers.cur : SNAP.movers.base;
      }
      return gran === 'day' ? SNAP.vDaily : SNAP.vMonthly;
    }
    if (args.platform === 'amazon-ads') {
      if (has('campaign_tag.TagName')) return SNAP.segSpend;
      return gran === 'day' ? SNAP.aDaily : SNAP.aMonthly;
    }
    return [];
  })();
  return rows.filter(x => !('date' in x) || x.date);
}`);

/* 5 — no connector bridge to wait for, and a pinned clock.
   A frozen dataset read by a live clock would slide the rolling-12 window off its own data
   and render a wrong chart with no error at all — the quietest failure this page can have. */
patch('skip bridge wait + pin clock',
`  await waitForCowork();
  const now = new Date();`,
`  // "now" is pinned to the snapshot date. Do not let this drift.
  const now = new Date(SNAP.asOf + 'T12:00:00Z');`);

/* 6 — the header must not claim to be live */
patch('loading copy', 'Pulling live data from the Pacvue connector…', 'Loading the Pacvue snapshot…');
patch('asof placeholder', '<div class="sub" id="asof">Loading…</div>',
  '<div class="sub" id="asof">Loading…</div>\n<div class="sub" style="margin-top:-10px"><span class="pill neutral" style="margin-top:0">Pacvue snapshot · ' + AS_OF_LABEL + '</span></div>');
patch('date not time', "`All CAD (US market at ${FX}). Refreshed ${now.toLocaleString()}. ` +",
  "`All CAD (US market at ${FX}). Pulled from Pacvue ${now.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}. ` +");

/* 7 — say so in the methodology footer too, where someone checking the numbers will look */
patch('footer provenance',
  "'Version: v2 (COGS + ad spend). v1 (COGS + ordered revenue) archived in the project folder under tracker_versions/.';",
  "'Version: v2 (COGS + ad spend). v1 (COGS + ordered revenue) archived in the project folder under tracker_versions/. ' +\n    '<strong>Static snapshot</strong> — these figures were pulled from Pacvue on " + AS_OF_LABEL + " and are frozen into this page; " +
  "they do not refresh when you open it. The live version is the Cowork artifact of the same name.';");

/* 8 — watchdog: never leave a silent spinner.
   This lives in its OWN <script> ahead of the main one, so it still runs even if the main
   script fails to parse — which is exactly the case that produces an endless spinner and no
   error. It reports what it can observe rather than leaving the reader guessing. */
const WATCHDOG = `<script>
(function () {
  var D = { started: false, finished: false, errors: [] };
  window.__r12 = D;
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
      '<div style="max-width:660px;margin:0 auto;text-align:left;font:15px/1.6 system-ui,-apple-system,sans-serif;color:#0b0b0b">' +
      '<div style="font-weight:700;font-size:18px;margin-bottom:10px">This page could not finish loading in this browser.</div>' +
      '<div style="color:#6b6a66;margin-bottom:16px">The tracker is one self-contained file with no server behind it, so this is something about the browser it opened in rather than a connection problem. Trying a different browser often works. The detail below is the useful part to send back.</div>' +
      '<pre style="white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #e5e4de;border-radius:8px;padding:16px;font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#6b6a66;margin:0">' +
      bits.join('\\n') + '</pre></div>';
  }
  setTimeout(report, 8000);
})();
</script>`;
patch('watchdog', '\n<script>\nconst SNAP =',
  '\n' + WATCHDOG + '\n<script>\ntry { window.__r12.started = true } catch (e) {}\nconst SNAP =');
patch('watchdog finished flag',
`  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';
}`,
`  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';
  try { window.__r12.finished = true } catch (e) {}
}`);

/* 9 — report height so the CommerceHub shell can size the frame to content (no inner scrollbar) */
patch('height reporting', '\nmain().catch(e => {',
`
function reportHeight() {
  if (window.parent === window) return;
  const el = document.documentElement;
  parent.postMessage({ type: 'ch-rolling12-height', height: Math.max(el.scrollHeight, document.body.scrollHeight) }, '*');
}
window.addEventListener('load', reportHeight);
window.addEventListener('resize', reportHeight);
new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true, attributes: true });
setInterval(reportHeight, 1000);

main().then(reportHeight).catch(e => {`);

/* 10 — the error path still mentions reloading to retry a connector. There is no connector. */
patch('error copy', "e.message + ' — hit Reload to retry, or check that the Pacvue connector is connected.'",
  "e.message + ' — this page reads a frozen snapshot, so a reload will not change the outcome. Rebuild it with tools/rolling12/refresh-rolling12.md.'");

writeFileSync(new URL('./rolling12-page.html', import.meta.url), h);
console.log(`patches applied (${patches.length}): ` + patches.join(', '));
console.log(`size ${(before / 1024).toFixed(0)}KB -> ${(h.length / 1024).toFixed(0)}KB`);

/* final guard: prove no live-bridge call survives on any path the page can execute.
   waitForCowork() is left defined but unreferenced; strip its body before asserting. */
const executed = h.replace(/async function waitForCowork\(\)[\s\S]*?\n}/, '');
if (/cowork\.callMcpTool|waitForCowork\(\)/.test(executed)) {
  console.error('FAIL: a live-bridge call survived'); process.exit(1);
}
if (/cdn\.jsdelivr|unpkg\.com|cdnjs/.test(h)) {
  console.error('FAIL: an external script/CDN reference survived'); process.exit(1);
}
console.log('OK — no live-bridge calls and no CDN dependencies remain on any executed path.');

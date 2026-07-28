/* Wires the Tracker page into CommerceHub. Every edit is an exact-match replacement that
   aborts unless it hits exactly once, and each is guarded by a marker so re-running is a
   no-op rather than a half-application. */
import { readFileSync, writeFileSync } from 'node:fs'
const log = []
function edit(rel, marker, find, replace) {
  const s = readFileSync(rel, 'utf8')
  if (s.includes(marker)) { log.push(`= ${rel}  (already applied: ${marker})`); return }
  const hits = s.split(find).length - 1
  if (hits !== 1) { console.error(`FAIL ${rel}: pattern matched ${hits}x, expected 1\n  ${find.slice(0,70)}`); process.exit(1) }
  writeFileSync(rel, s.replace(find, () => replace))
  log.push(`+ ${rel}  (${marker})`)
}

edit('src/App.jsx', 'pages/Tracker.jsx',
  "import Overview from './pages/Overview.jsx'",
  "import Overview from './pages/Overview.jsx'\nimport Tracker from './pages/Tracker.jsx'")
edit('src/App.jsx', 'path="/tracker"',
  '          <Route path="/ads/profile" element={<ProfileGrid />} />',
  '          <Route path="/tracker" element={<Tracker />} />\n          <Route path="/ads/profile" element={<ProfileGrid />} />')

edit('src/components/Layout.jsx', "label: 'Amazon Tracker'",
  "  { section: null, items: [{ to: '/', label: 'Overview', icon: 'dashboard', end: true }] },",
  "  { section: null, items: [\n    { to: '/', label: 'Overview', icon: 'dashboard', end: true },\n    { to: '/tracker', label: 'Amazon Tracker', icon: 'bars' },\n  ] },")
edit('src/components/Layout.jsx', "'/tracker': 'Amazon Tracker'",
  "  '/': 'Overview', '/ads/profile': 'Sponsored Ads · Profile',",
  "  '/': 'Overview', '/tracker': 'Amazon Tracker', '/ads/profile': 'Sponsored Ads · Profile',")
edit('src/components/Layout.jsx', 'v0.16.0', '>v0.15.0<', '>v0.16.0<')

edit('src/styles.css', '.tracker-embed',
  '.page-head {',
  '/* Amazon Tracker embed - full-bleed inside .content (padding 20px 22px 60px);\n' +
  '   the tracker supplies its own background, padding and max-width. */\n' +
  '.tracker-embed { margin: -20px -22px -60px; background: #f3f4f3; }\n' +
  '.tracker-embed iframe { display: block; width: 100%; border: 0; background: #f3f4f3; }\n' +
  '.tracker-missing { padding: 28px; color: var(--text-2); font-size: 13px; line-height: 1.6; }\n' +
  '.tracker-missing code { background: var(--surface-2); padding: 1px 5px; border-radius: 4px; }\n\n' +
  '.page-head {')

/* The page joins the Babel body; its ~570KB base64 payload deliberately does not -
   Babel-standalone deoptimises any inline script over 500KB and slows the whole boot. */
edit('tools/build-singlefile.mjs', 'pages/Tracker.jsx',
  "'src/state.jsx', 'src/components/Layout.jsx', 'src/pages/Overview.jsx',",
  "'src/state.jsx', 'src/components/Layout.jsx', 'src/pages/Overview.jsx', 'src/pages/Tracker.jsx',")
edit('tools/build-singlefile.mjs', 'const trackerB64',
  'const html = `<!doctype html>',
  `// Amazon Tracker payload - kept out of the Babel block on purpose (see src/pages/Tracker.jsx).
const trackerB64 = (() => {
  const m = read('src/data/trackerSnapshot.js').match(/TRACKER_HTML_B64\\s*=\\s*"([A-Za-z0-9+/=]*)"/)
  if (!m || !m[1]) { console.error('ERROR: could not read TRACKER_HTML_B64 from src/data/trackerSnapshot.js'); process.exit(1) }
  return m[1]
})()

const html = \`<!doctype html>`)
edit('tools/build-singlefile.mjs', 'window.__TRACKER_HTML_B64=',
  '<script type="text/babel" data-presets="react">',
  '<script>window.__TRACKER_HTML_B64="${trackerB64}";</script>\n<script type="text/babel" data-presets="react">')

/* route walker: add /tracker and teach it to look inside the frame */
edit('tools/render-check.mjs', "'/tracker',",
  "'/reports', '/alerts', '/settings',",
  "'/reports', '/alerts', '/settings', '/tracker',")
edit('tools/render-check.mjs', "route === '/tracker' ? 2500", "await page.waitForTimeout(450)", "await page.waitForTimeout(route === '/tracker' ? 2500 : 450)")
edit('tools/render-check.mjs', 'tracker-embed iframe',
  '  if (!ok) errors.push(`[${route}] EMPTY content region`)',
  `  // /tracker is an embedded document - the host .content holds no text of its own, so the
  // generic assertion does not apply. It gets a stronger, frame-aware check instead.
  if (!ok && route !== '/tracker') errors.push(\`[\${route}] EMPTY content region\`)
  if (route === '/tracker') {
    const fr = await page.evaluate(() => {
      const f = document.querySelector('.tracker-embed iframe')
      if (!f) return { ok: false, why: 'no iframe' }
      const d = f.contentDocument
      if (!d) return { ok: false, why: 'no contentDocument' }
      const c = d.getElementById('content')
      const txt = (d.body && d.body.textContent || '').trim()
      return {
        ok: !!c && getComputedStyle(c).display !== 'none' && txt.length > 500,
        why: \`content=\${!!c} chars=\${txt.length}\`,
        pill: (d.getElementById('modePill') || {}).textContent || '',
        sample: !!d.querySelector('.banner'),
        canvases: [...d.querySelectorAll('canvas')].filter((x) => x.width > 0).length,
        height: f.getBoundingClientRect().height,
      }
    })
    if (!fr.ok) errors.push(\`[/tracker] frame did not render - \${fr.why}\`)
    if (fr.sample) errors.push('[/tracker] fell back to SAMPLE data')
    if (/LIVE/i.test(fr.pill)) errors.push(\`[/tracker] pill claims LIVE: \${fr.pill}\`)
    if (fr.canvases < 2) errors.push(\`[/tracker] charts did not draw (\${fr.canvases} canvases)\`)
    if (fr.height < 1200) errors.push(\`[/tracker] frame did not size to content (\${Math.round(fr.height)}px)\`)
    rowCounts['/tracker'] = \`frame \${Math.round(fr.height)}px · \${fr.canvases} charts · \${fr.pill.trim()}\`
  }`)

console.log(log.join('\n'))

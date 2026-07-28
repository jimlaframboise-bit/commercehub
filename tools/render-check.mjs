import { chromium } from 'playwright'
import path from 'path'

const ROUTES = [
  '/', '/ads/profile', '/ads/campaigns', '/ads/tagging', '/ads/portfolio', '/ads/placement',
  '/ads/adgroups', '/ads/ads', '/ads/asin', '/ads/targeting', '/ads/search-terms', '/ads/sov',
  '/ads/dayparting', '/ads/bulk', '/dsp', '/dsp/audiences', '/dsp/amc', '/commerce/shelf',
  '/commerce/buybox', '/commerce/products', '/rules', '/budgets', '/ai/campaign', '/ai/product',
  '/reports', '/alerts', '/settings', '/tracker',
]

const url = 'file://' + path.resolve('render-check.html')
const errors = []
let cur = 'boot'

const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${cur}] console.error: ${m.text()}`) })
page.on('pageerror', (e) => errors.push(`[${cur}] pageerror: ${e.message}`))

await page.goto(url, { waitUntil: 'networkidle' })
// Wait for the app to mount (boot text replaced by real content)
await page.waitForFunction(() => {
  const r = document.getElementById('root')
  return r && !r.querySelector('#boot') && r.children.length > 0
}, { timeout: 20000 })

const rowCounts = {}
for (const route of ROUTES) {
  cur = route
  await page.evaluate((h) => { window.location.hash = h }, route)
  await page.waitForTimeout(route === '/tracker' ? 2500 : 450)
  // sanity: content rendered under .content
  const ok = await page.evaluate(() => {
    const c = document.querySelector('.content')
    return c && c.textContent.trim().length > 0
  })
  // /tracker is an embedded document - the host .content holds no text of its own, so the
  // generic assertion does not apply. It gets a stronger, frame-aware check instead.
  if (!ok && route !== '/tracker') errors.push(`[${route}] EMPTY content region`)
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
        why: `content=${!!c} chars=${txt.length}`,
        pill: (d.getElementById('modePill') || {}).textContent || '',
        sample: !!d.querySelector('.banner'),
        canvases: [...d.querySelectorAll('canvas')].filter((x) => x.width > 0).length,
        height: f.getBoundingClientRect().height,
      }
    })
    if (!fr.ok) errors.push(`[/tracker] frame did not render - ${fr.why}`)
    if (fr.sample) errors.push('[/tracker] fell back to SAMPLE data')
    if (/LIVE/i.test(fr.pill)) errors.push(`[/tracker] pill claims LIVE: ${fr.pill}`)
    if (fr.canvases < 2) errors.push(`[/tracker] charts did not draw (${fr.canvases} canvases)`)
    if (fr.height < 1200) errors.push(`[/tracker] frame did not size to content (${Math.round(fr.height)}px)`)
    rowCounts['/tracker'] = `frame ${Math.round(fr.height)}px · ${fr.canvases} charts · ${fr.pill.trim()}`
  }
  // capture grid entry count if present
  const cnt = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((n) => /Total\s[\d,]+\sentries/i.test(n.textContent || '') && n.children.length < 4)
    if (!el) return null
    const m = (el.textContent || '').match(/Total\s([\d,]+)\sentries/i)
    return m ? m[1] : null
  })
  if (cnt) rowCounts[route] = cnt
}

// Targeted AI interaction checks -------------------------------------------------
cur = '/ai/campaign (interactions)'
await page.evaluate(() => { window.location.hash = '/ai/campaign' })
await page.waitForTimeout(400)
// switch to Campaign Level tab
await page.evaluate(() => {
  const t = [...document.querySelectorAll('.viewtab')].find((x) => /Campaign Level/.test(x.textContent))
  if (t) t.click()
})
await page.waitForTimeout(350)
// open Launch modal
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /Launch AI for/.test(x.textContent))
  if (b) b.click()
})
await page.waitForTimeout(350)
const camModal = await page.evaluate(() => !!document.querySelector('.modal'))
if (!camModal) errors.push('[ai/campaign] Launch modal did not open')
await page.keyboard.press('Escape')

cur = '/ai/product (interactions)'
await page.evaluate(() => { window.location.hash = '/ai/product' })
await page.waitForTimeout(400)
const evCount = await page.evaluate(() => document.querySelectorAll('.ai-event').length)
if (evCount !== 4) errors.push(`[ai/product] expected 4 managed-event cards, got ${evCount}`)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Launch AI')
  if (b) b.click()
})
await page.waitForTimeout(350)
const prodModal = await page.evaluate(() => !!document.querySelector('.modal'))
if (!prodModal) errors.push('[ai/product] Launch modal did not open')

await browser.close()

console.log('=== render-check results ===')
console.log('routes walked:', ROUTES.length)
console.log('grid entry counts:', JSON.stringify(rowCounts))
if (errors.length) { console.log('FAIL —', errors.length, 'issue(s):'); errors.forEach((e) => console.log('  •', e)); process.exit(1) }
else console.log('PASS — 0 console/page errors across all routes + AI interactions')

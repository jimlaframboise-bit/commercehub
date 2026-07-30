/* Proves the load watchdog actually fires, by deliberately corrupting the main script so it
   cannot parse — the exact case that otherwise produces an endless spinner and no message.
   A watchdog that has never been seen to fire is an assumption, not a safety net. */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright';

const src = new URL('./rolling12-page.html', import.meta.url).pathname;
const broken = '/tmp/rolling12-broken.html';
let h = readFileSync(src, 'utf8');
// inject a syntax error into the main script (not the watchdog's own script)
const marker = 'try { window.__r12.started = true } catch (e) {}';
if (!h.includes(marker)) { console.error('FAIL: marker not found — watchdog wiring changed'); process.exit(1); }
writeFileSync(broken, h.replace(marker, marker + '\nconst = ;   /* deliberate syntax error */'));

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
await page.goto('file://' + broken);
await page.waitForTimeout(9500);
const t = await page.locator('#loading').innerText();
await browser.close();
unlinkSync(broken);

const wants = ['could not finish loading', 'charting library: loaded', 'NEVER STARTED'];
const missing = wants.filter(w => !t.includes(w));
console.log(t.split('\n').slice(0, 8).join('\n'));
if (missing.length) { console.error('\nFAIL: watchdog did not report: ' + missing.join(', ')); process.exit(1); }
console.log('\nPASS — a fatal parse error in the main script produces a diagnosis, not a silent spinner.');

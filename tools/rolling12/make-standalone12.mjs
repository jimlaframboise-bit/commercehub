/* Emits the STANDALONE build of the Rolling12 Tracker — the same page CommerceHub embeds at
   /rolling12, served on its own URL at crump-amazon-tracker.vercel.app/rolling12 (repo
   jimlaframboise-bit/crump-amazon-tracker, path rolling12/index.html).

   Only two things differ from the embedded build, both because it is now a top-level document
   rather than an iframe:
     - its own <title> (the embedded copy inherits CommerceHub's)
     - robots noindex/nofollow — the URL is public and carries real Crump financials, so keeping
       it out of search results is the cheapest thing that helps. It is NOT access control and
       must never be described as such: anyone with the link can read the page.

   The height-reporting code is left in place untouched; it returns early when there is no
   parent frame, so it is inert here. Run this after make-rolling12-page.mjs. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = new URL('./rolling12-page.html', import.meta.url);
const outDir = new URL('./standalone/', import.meta.url);
const snapshot = JSON.parse(readFileSync(new URL('./snapshot12.json', import.meta.url)));

let h = readFileSync(src, 'utf8');
const patches = [];
function patch(label, find, replace) {
  const hits = h.split(find).length - 1;
  if (hits !== 1) { console.error(`PATCH FAIL [${label}]: expected 1 match, found ${hits}`); process.exit(1); }
  h = h.replace(find, () => replace);
  patches.push(label);
}

patch('standalone title + noindex',
  '<title>Crump Group - Amazon History &amp; Forecasting</title>',
  '<title>Crump Group — Rolling 12 Tracker</title>\n' +
  '<meta name="robots" content="noindex, nofollow">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">');

mkdirSync(outDir, { recursive: true });
writeFileSync(new URL('./index.html', outDir), h);

/* A robots.txt as well — the meta tag only helps crawlers that fetch the page. Neither is
   access control; see the note at the top of this file. */
writeFileSync(new URL('./robots.txt', outDir), 'User-agent: *\nDisallow: /\n');

console.log(`patches applied (${patches.length}): ${patches.join(', ')}`);
console.log(`standalone/index.html written — ${(h.length / 1024).toFixed(0)}KB, snapshot ${snapshot.asOf} (cut ${snapshot.cut})`);
if (!/name="robots" content="noindex/.test(h)) { console.error('FAIL: noindex tag missing'); process.exit(1); }
if (/cdn\.jsdelivr|unpkg\.com|cdnjs/.test(h)) { console.error('FAIL: a CDN script reference survived'); process.exit(1); }
console.log('OK — noindex present, no CDN script dependencies.');

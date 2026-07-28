/* Writes src/data/trackerSnapshot.js from the transformed tracker page. */
import { readFileSync, writeFileSync } from 'node:fs';
const REPO = new URL('../../', import.meta.url);          // tools/tracker/ -> repo root
const html = readFileSync(new URL('./tracker-page.html', import.meta.url));
const date = JSON.parse(readFileSync(new URL('./snapshot.json', import.meta.url))).asOf;
const mod = `/* Amazon Tracker — frozen Pacvue snapshot, pulled ${date}.
 *
 * The R3 "Amazon Tracker" redesign embedded verbatim: the design is byte-for-byte the
 * artifact build, and only its data layer was swapped from the live Pacvue MCP bridge
 * (which does not exist in a browser) to the snapshot frozen inside it.
 *
 * GENERATED — do not hand-edit. See tools/tracker/refresh-tracker.md.
 */
export const TRACKER_SNAPSHOT_DATE = ${JSON.stringify(date)};
export const TRACKER_HTML_B64 = "${html.toString('base64')}";
`;
writeFileSync(new URL('./src/data/trackerSnapshot.js', REPO), mod);
console.log(`trackerSnapshot.js written — ${(html.length / 1024).toFixed(0)}KB html -> ${(mod.length / 1024).toFixed(0)}KB module`);

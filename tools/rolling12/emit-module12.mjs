/* Writes src/data/rolling12Snapshot.js from the transformed Rolling12 page. */
import { readFileSync, writeFileSync } from 'node:fs';
const REPO = new URL('../../', import.meta.url);          // tools/rolling12/ -> repo root
const html = readFileSync(new URL('./rolling12-page.html', import.meta.url));
const snap = JSON.parse(readFileSync(new URL('./snapshot12.json', import.meta.url)));
const mod = `/* Amazon Rolling12 Tracker — frozen Pacvue snapshot, pulled ${snap.asOf}.
 *
 * The ORIGINAL \`amazon-rolling12-tracker\` artifact embedded verbatim: the design and the
 * arithmetic are the artifact's, and only its data layer was swapped from the live Pacvue
 * MCP bridge (which does not exist in a browser) to the snapshot frozen inside it.
 *
 * Separate from trackerSnapshot.js, which carries the R3 redesign shown at /tracker. The
 * two pages are different artifacts by Jim's standing instruction and must stay separate.
 *
 * GENERATED — do not hand-edit. See tools/rolling12/refresh-rolling12.md.
 */
export const ROLLING12_SNAPSHOT_DATE = ${JSON.stringify(snap.asOf)};
export const ROLLING12_CUT = ${JSON.stringify(snap.cut)};
export const ROLLING12_HTML_B64 = "${html.toString('base64')}";
`;
writeFileSync(new URL('./src/data/rolling12Snapshot.js', REPO), mod);
console.log(`rolling12Snapshot.js written — ${(html.length / 1024).toFixed(0)}KB html -> ${(mod.length / 1024).toFixed(0)}KB module (as of ${snap.asOf}, cut ${snap.cut})`);

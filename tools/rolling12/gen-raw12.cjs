/* One-off generator: turns the pulled JSON row-sets in ./data into raw12.js.
   Kept in the repo so a refresh can regenerate raw12.js the same way. */
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const J = f => JSON.parse(fs.readFileSync(path.join(dir, 'data', f), 'utf8'));
const seg = J('seg.json');

const TITLES = [
  ["B09KSV26D7", "Caledon Farms, Value Pack Sweet Potato Chews, 795 g, Dog Treats"],
  ["B00VGTHAQG", "Caledon Farms, Sweet Potato Chews, 265 g, Dog Treats"],
  ["B00XRIKR0U", "Caledon Farms Beef Liver Bites Freeze Dried 150 Grams"],
  ["B0CK8HD9L6", "Crumps' Naturals, Plaque Busters Advanced - Double Fresh Dental Sticks, 270 g, Dog Treats"],
  ["B08TR8Q8M8", "Caledon Farms Chicken Morsels Dog Treats: 125G/4.4OZ"],
  ["B01M1VAH9F", "Crumps' Naturals Mt-Fd-105 Mini Trainers Freeze Dried Beef Liver (1 Pack), 126 G (Packaging may vary)"],
  ["B0FM9T41F2", "Caledon Farms, Value Pack Freeze Dried Beef Liver Bites, 355 g, Dog Treats"],
  ["B01M0MDD9T", "Crumps’ Naturals Original Plaque Busters, 7”- 10 Pack"],
  ["B0CBL544BJ", "Crumps' Naturals, Mini Trainers Lamb (semi-Moist), 300 g, Dog Treats"],
  ["B09KT9L6D1", "Caledon Farms Value Pack Beef Tendersticks 12oz/340G brown"]
];

const arr = (name, rows, cmt) => `/* ${cmt} */\nexport const ${name} = ${JSON.stringify(rows)};\n\n`;

let out = `/* Raw Pacvue pull for the Rolling12 Tracker page — pulled 2026-07-30 through the Pacvue MCP
   connector (execute_query): exactly the nine queries the original \`amazon-rolling12-tracker\`
   artifact issues, with the same filters and limits.

   Money is in the currency Pacvue returned. Vendor shipped COGS is native (CAD for CA, USD for
   US) and is converted downstream at FX 1.4205 — the rate the ORIGINAL artifact uses. Do not
   "correct" it to the 1.42071 connector standard here: this page is a faithful clone of that
   artifact, and the two must agree. Ad spend was requested with toCurrency: CAD and is already
   CAD. Rows are positional tuples to keep the file small.                                    */

export const AS_OF = "2026-07-30";

`;
out += arr('vMonthly', J('vMonthly.json'), '[date, country_code, shipped_cogs] — vendor asin level, month grain, 2025-07-01..2026-07-30');
out += arr('aMonthly', J('aMonthly.json'), '[date, country_code, spend CAD] — ads campaign level, month grain (null-date subtotal rows dropped)');
out += arr('vDaily', J('vDaily.json'), '[date, country_code, shipped_cogs] — vendor, day grain, 2026-07-01..2026-07-30');
out += arr('aDaily', J('aDaily.json'), '[date, country_code, spend CAD] — ads, day grain, 2026-07-01..2026-07-30');
out += arr('moversCur', J('moversCur.json'), '[asin, country_code, shipped_cogs] — vendor by ASIN, 2026-07-01..cut, shipped_cogs > 0, limit 500');
out += arr('moversBase', J('moversBase.json'), '[asin, country_code, shipped_cogs] — vendor by ASIN, 2026-06-01..2026-06-30, shipped_cogs > 0, limit 500');
out += arr('segSpend', seg.segSpend, '[campaign_tag.TagName, country_code, spend CAD] — ads, 2026-07-01..cut, limit 80');
out += arr('segCogs', seg.segCogs, '[category_level_one, country_code, shipped_cogs] — vendor, 2026-07-01..cut, limit 80');
out += arr('titles', TITLES, '[asin, product_title] — CA title preferred, exactly as the artifact resolves it. Movers only.');

fs.writeFileSync(path.join(dir, 'raw12.js'), out);
console.log('raw12.js written —', (out.length / 1024).toFixed(1) + 'KB');

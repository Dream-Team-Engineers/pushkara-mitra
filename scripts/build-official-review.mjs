// Generates an offline human-review artifact outside the app's public directory.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const input = resolve(root, 'docs/content/official-candidate.json');
const userInput = resolve(root, 'docs/content/user-ghats-candidate.json');
const output = resolve(root, 'docs/content/official-content-review.html');
const expectedSources = {
  festival: 'https://eastgodavari.ap.gov.in/godavari-pushkaralu-2027/',
  ghats: 'https://eastgodavari.ap.gov.in/ghats/',
};
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
// Newspaper-reported plan, not a complete inventory or an operational count.
const plannedDistricts = [
  ['Dr. B.R. Ambedkar Konaseema', 175],
  ['Kakinada', 88],
  ['East Godavari', 82],
  ['Eluru', 44],
  ['West Godavari', 40],
  ['Polavaram', 11],
];
const isDate = (value) => {
  if (typeof value !== 'string' || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

export function validateCandidate(data) {
  if (
    !data ||
    data.reviewStatus !== 'NEEDS_REVIEW' ||
    !isDate(data.checkedOn) ||
    !isDate(data.festival?.startDate) ||
    !isDate(data.festival?.endDate) ||
    data.festival.startDate > data.festival.endDate ||
    data.festival.source !== expectedSources.festival ||
    data.ghatsSource?.url !== expectedSources.ghats ||
    !isDate(data.festival.sourceLastUpdated) ||
    !isDate(data.ghatsSource.sourceLastUpdated) ||
    typeof data.festival.name !== 'string' ||
    !data.festival.name.trim() ||
    !Array.isArray(data.groups) ||
    !data.groups.length
  )
    throw new Error('Invalid or non-review candidate; no artifact generated.');
  const names = [];
  for (const group of data.groups) {
    if (
      typeof group?.name !== 'string' ||
      !group.name.trim() ||
      !Array.isArray(group.places) ||
      !group.places.length ||
      group.places.some((name) => typeof name !== 'string' || !name.trim())
    )
      throw new Error('Invalid ghat group; no artifact generated.');
    names.push(...group.places);
  }
  if (new Set(names.map((name) => name.trim().toLowerCase())).size !== names.length)
    throw new Error('Duplicate ghat names; no artifact generated.');
  return data;
}

export function renderReview(candidate, userCandidate = null) {
  const data = validateCandidate(candidate);
  let userSection = '';
  if (userCandidate) {
    if (userCandidate.reviewStatus !== 'NEEDS_REVIEW' || !Array.isArray(userCandidate.rows))
      throw new Error('Invalid user-supplied candidate.');
    const districts = new Map();
    for (const row of userCandidate.rows) {
      const district = row['District (2027)'];
      if (typeof district !== 'string' || !district.trim() || typeof row['Ghat name'] !== 'string')
        throw new Error('Invalid user-supplied ghat row.');
      if (!districts.has(district)) districts.set(district, []);
      districts.get(district).push(row);
    }
    const ordered = [
      ...plannedDistricts.map(([name]) => name),
      ...[...districts.keys()].filter(
        (name) => !plannedDistricts.some(([planned]) => planned === name),
      ),
    ];
    const lists = ordered
      .map((district) => {
        const rows = districts.get(district) ?? [];
        const planned = plannedDistricts.find(([name]) => name === district)?.[1];
        const planLabel =
          planned === undefined ? 'Not in the six-district report' : `${planned} planned`;
        return `<details class="card district"><summary>${escapeHtml(district)} <span class="count">${escapeHtml(planLabel)} · ${rows.length} submitted</span></summary>${rows.length ? rows.map((row) => `<details class="entry"><summary>${escapeHtml(row['Ghat name'])}</summary><p><strong>Submitted locality:</strong> ${escapeHtml(row['Mandal / Taluk'])} · ${escapeHtml(row['Village / Location'])}<br><strong>Submitted type:</strong> ${escapeHtml(row['Ghat type'])}</p><p><strong>History and significance (unverified):</strong> ${escapeHtml(row['History & significance'])}</p><p><strong>Source description supplied:</strong> ${escapeHtml(row.Source)}</p><p><strong>Facilities and access:</strong> Unknown. <strong>Directions:</strong> Unavailable until the destination is verified.</p></details>`).join('') : '<p>No submitted records for this district. The planned count does not identify individual ghats.</p>'}</details>`;
      })
      .join('');
    userSection = `<section><h2>Explore ghats by district</h2><p class="notice"><strong>440 planned ghats</strong> across six districts, as reported on 26 August 2026; this is a plan, not a completed or verified list. <a href="https://www.newindianexpress.com/states/andhra-pradesh/2026/Aug/26/ensure-grand-safe-and-sacred-pushkarams-cm-naidu">Read the report</a>. Another report gives a different figure; confirm the latest official plan before publication.</p><p>${userCandidate.rows.length} user-supplied rows. These are unverified leads, not a confirmed 2027 list. District assignments, names, history, classifications and source descriptions require independent checking. Entries may duplicate the district list or each other; current access and safety are unknown. Expand a district and then a ghat to inspect the submitted details.</p><label for="ghat-search">Search submitted ghats or localities</label><input id="ghat-search" type="search" placeholder="Search names or places" autocomplete="off"><p id="search-status" role="status" aria-live="polite"></p>${lists}</section>`;
  }
  const groups = data.groups
    .map(
      (group) =>
        `<section class="group"><h3>${escapeHtml(group.name)}</h3><ul>${group.places
          .map((name) => `<li>${escapeHtml(name)}</li>`)
          .join('')}</ul></section>`,
    )
    .join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Official content candidate · Human review</title>
<style>
:root{font-family:system-ui,sans-serif;color:#302923;background:#f7f3eb;line-height:1.55}*{box-sizing:border-box}body{margin:0}main{max-width:58rem;margin:auto;padding:1.25rem}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(1.75rem,6vw,2.6rem);line-height:1.15}h2{font-size:1.25rem}.banner{background:#3a2922;color:#fff7ea;padding:.8rem 1rem;font-weight:700}.intro{margin:1.5rem 0}.card,.group{background:#fffcf6;border:1px solid #dfd4c6;border-radius:1rem;padding:1rem;margin:1rem 0}.period{font-size:1.35rem;font-weight:700;color:#87402e}.notice{border-left:4px solid #a04b34;padding-left:1rem}ul{margin:0;padding-left:1.25rem}li{margin:.35rem 0}a{color:#7c3928;text-underline-offset:.2em}small{color:#665c52}@media(min-width:700px){.groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.group{margin:0}}
</style><style>summary{cursor:pointer;font-weight:700}.entry{border-top:1px solid #dfd4c6;margin-top:.8rem;padding-top:.8rem}.entry p{margin:.6rem 0;font-size:.95rem}details[open]>summary{margin-bottom:.65rem}.count{display:block;font-size:.85rem;font-weight:400;color:#665c52}label{display:block;font-weight:700}input{width:100%;padding:.8rem;margin:.5rem 0;border:1px solid #aa9e91;border-radius:.6rem;font:inherit;background:white;color:#302923}[hidden]{display:none!important}</style></head><body><div class="banner">HUMAN REVIEW CANDIDATE · NOT APPROVED FOR APP USE</div><main>
<div class="intro"><p>Pushkara Mitra · source-backed candidate</p><h1>${escapeHtml(data.festival.name)}</h1><p>This separate offline review page is not an official service or a published schedule.</p></div>
<section class="card"><h2>Festival period</h2><p class="period">${escapeHtml(data.festival.startDate)} – ${escapeHtml(data.festival.endDate)}</p><p class="notice">Date conflict OQ-004 and the authoritative government order need human review before use.</p><p><a href="${escapeHtml(data.festival.source)}">East Godavari district festival source</a><br><small>Source page reports last update ${escapeHtml(data.festival.sourceLastUpdated)}; checked ${escapeHtml(data.checkedOn)}.</small></p></section>
<section><h2>District-listed ghats</h2><p class="notice">Names and groupings are from the district page. Current opening, access, safety, facilities and hours are unknown. Source spellings are retained; Telugu and Hindi names need human review.</p><div class="groups">${groups}</div><p><a href="${escapeHtml(data.ghatsSource.url)}">East Godavari district ghat source</a><br><small>Source page reports last update ${escapeHtml(data.ghatsSource.sourceLastUpdated)}; checked ${escapeHtml(data.checkedOn)}.</small></p></section>
${userSection}<p class="notice">Human approval of standards, content, applicable scope and translations remains pending. Recheck the sources before app use.</p></main><script>const search=document.getElementById('ghat-search');if(search){search.addEventListener('input',()=>{const query=search.value.trim().toLocaleLowerCase();let matches=0;document.querySelectorAll('.district').forEach(district=>{let visible=0;district.querySelectorAll('.entry').forEach(entry=>{const match=!query||entry.textContent.toLocaleLowerCase().includes(query);entry.hidden=!match;if(match){visible++;matches++}});district.hidden=!!query&&!visible;if(query&&visible)district.open=true});document.getElementById('search-status').textContent=query?matches+' submitted records match.':''})}</script></body></html>\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const candidate = JSON.parse(readFileSync(input, 'utf8'));
  const userCandidate = JSON.parse(readFileSync(userInput, 'utf8'));
  const prettier = await import('prettier');
  const html = await prettier.format(renderReview(candidate, userCandidate), {
    ...(await prettier.resolveConfig(output)),
    filepath: output,
  });
  writeFileSync(output, html, 'utf8');
  console.log(`Review artifact written to ${output}; no app content was activated.`);
}

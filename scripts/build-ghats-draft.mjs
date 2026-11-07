// Export only review-safe fields for the isolated draft app branch.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const input = resolve(root, 'docs/content/user-ghats-candidate.json');
const output = resolve(root, 'public/assets/ghats-draft.v1.mjs');
const source = JSON.parse(readFileSync(input, 'utf8'));

if (
  source.reviewStatus !== 'NEEDS_REVIEW' ||
  !Array.isArray(source.rows) ||
  source.rows.length !== 159
)
  throw new Error('Expected the 159-row unapproved ghat candidate.');

const rows = source.rows.map((row, index) => {
  const result = {
    name: row['Ghat name'],
    district: row['District (2027)'],
    mandal: row['Mandal / Taluk'],
    locality: row['Village / Location'],
  };
  if (Object.values(result).some((value) => typeof value !== 'string' || !value.trim()))
    throw new Error(`Invalid ghat candidate row ${index + 1}.`);
  return result;
});

const moduleSource = `// Review branch only. User-submitted leads, not verified 2027 ghat guidance.\nexport const GHATS_DRAFT_STATUS = 'NEEDS_REVIEW';\nexport const GHATS_DRAFT_SOURCE_HASH = ${JSON.stringify(source.sha256)};\nexport const submittedGhats = ${JSON.stringify(rows, null, 2)};\n`;
const prettier = await import('prettier');
writeFileSync(
  output,
  await prettier.format(moduleSource, {
    ...(await prettier.resolveConfig(output)),
    filepath: output,
  }),
  'utf8',
);
console.log(`Generated ${rows.length} unverified draft ghat names and localities.`);

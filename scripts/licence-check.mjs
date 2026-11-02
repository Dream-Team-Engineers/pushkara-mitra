// Fails on any dependency licence outside the allow-list (docs/legal/licence-register.md).
// Reviewed exceptions live in docs/legal/licence-exceptions.json and need CODEOWNER approval.
// An exception matches by package name AND exact licence string, so a licence change fails the build.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ALLOWED = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'BlueOak-1.0.0',
]);

export function isAllowed(licence) {
  const text = String(licence).replace(/[()*]/g, '');
  const parts = text.split(/\s+(?:OR|AND)\s+|;/).map((part) => part.trim());
  return / OR /.test(text) ? parts.some((p) => ALLOWED.has(p)) : parts.every((p) => ALLOWED.has(p));
}

function nameOf(key) {
  return key.slice(0, key.lastIndexOf('@'));
}

function main() {
  const exceptions = JSON.parse(
    readFileSync('docs/legal/licence-exceptions.json', 'utf8'),
  ).exceptions;
  const npm = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const raw = execFileSync(
    npm,
    ['license-checker-rseidelsohn', '--excludePrivatePackages', '--json'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' },
  );
  const packages = JSON.parse(raw);

  const failures = [];
  const used = new Set();
  for (const [key, info] of Object.entries(packages)) {
    const licence = String(info.licenses);
    if (isAllowed(licence)) continue;
    const name = nameOf(key);
    const match = exceptions.find(
      (e) =>
        e.licence === licence &&
        (e.name.endsWith('*') ? name.startsWith(e.name.slice(0, -1)) : e.name === name),
    );
    if (match) used.add(match.name);
    else failures.push(`${key}: ${licence}`);
  }

  console.log(`Checked ${String(Object.keys(packages).length)} packages.`);
  console.log(`Reviewed exceptions in use: ${used.size > 0 ? [...used].join(', ') : 'none'}`);
  if (failures.length > 0) {
    console.error('Licence not on the allow-list and not a reviewed exception:');
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
}

main();

// Build a scan-only production inventory from npm's committed v3 lock, offline.
// No install/resolution, lifecycle execution, registry requests or lock rewrites.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, posix } from 'node:path';
import { URL, pathToFileURL } from 'node:url';

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Invalid ${label}.`);
  return value;
}
const PACKAGE = /^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/;
const LOCATION =
  /^(?:node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*)(?:\/node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*)*$/;
function edges(record, key) {
  const map = record[key] === undefined ? {} : object(record[key], key);
  for (const [name, spec] of Object.entries(map)) {
    if (!PACKAGE.test(name) || typeof spec !== 'string' || !spec.trim())
      throw new Error(`Invalid ${key} edge.`);
    // Aliases/local/git/URL/workspace dependencies need an explicitly supported
    // identity/inventory strategy rather than silently scanning the wrong name.
    if (/^(?:npm:|file:|link:|workspace:|git|https?:|github:|gitlab:|bitbucket:)|[/\\]/i.test(spec))
      throw new Error(`Unsupported ${key} dependency source.`);
  }
  return map;
}
function peerMetadata(record, peers) {
  const metadata =
    record.peerDependenciesMeta === undefined
      ? {}
      : object(record.peerDependenciesMeta, 'peer metadata');
  const normalized = {};
  for (const [name, entry] of Object.entries(metadata)) {
    const meta = object(entry, 'peer metadata');
    if (
      !Object.hasOwn(peers, name) ||
      Object.keys(meta).some((key) => key !== 'optional') ||
      (meta.optional !== undefined && typeof meta.optional !== 'boolean')
    )
      throw new Error('Unsupported peer dependency metadata.');
    normalized[name] = meta.optional === true;
  }
  return normalized;
}
function sameMap(a, b) {
  return JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
}

export function productionLock(lock, manifest) {
  object(lock, 'lockfile');
  object(manifest, 'manifest');
  if (lock.lockfileVersion !== 3 || Object.hasOwn(lock, 'dependencies'))
    throw new Error('Only npm lockfile v3 packages inventories are supported.');
  const packages = object(lock.packages, 'packages map');
  const root = object(packages[''], 'root package');
  if (root.name !== manifest.name || root.version !== manifest.version)
    throw new Error('Manifest and locked root identity differ.');
  for (const path of Object.keys(packages)) {
    if (path && !LOCATION.test(path)) throw new Error('Unsupported locked package location.');
    object(packages[path], 'package record');
  }
  for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    if (!sameMap(edges(root, key), edges(manifest, key)))
      throw new Error(`Manifest and locked ${key} differ.`);
  }
  if (
    !sameMap(
      peerMetadata(root, edges(root, 'peerDependencies')),
      peerMetadata(manifest, edges(manifest, 'peerDependencies')),
    )
  )
    throw new Error('Manifest and locked peer metadata differ.');
  const selected = new Set();
  const pending = [''];
  function resolve(from, name, optional) {
    let directory = from;
    for (;;) {
      if (posix.basename(directory) !== 'node_modules') {
        const candidate = directory ? `${directory}/node_modules/${name}` : `node_modules/${name}`;
        if (Object.hasOwn(packages, candidate)) return candidate;
      }
      if (!directory) break;
      const parent = posix.dirname(directory);
      directory = parent === '.' ? '' : parent;
    }
    if (optional) return null;
    throw new Error('Required production or peer dependency is absent from the committed lock.');
  }
  while (pending.length) {
    const path = pending.pop();
    if (selected.has(path)) continue;
    const record = packages[path];
    if (path) {
      if (record.link || record.inBundle || record.dev === true)
        throw new Error('Unsupported linked/bundled or dev-only production record.');
      if (
        typeof record.version !== 'string' ||
        !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/.test(record.version)
      )
        throw new Error('Missing or unsupported locked production version.');
      if (
        typeof record.resolved !== 'string' ||
        typeof record.integrity !== 'string' ||
        !record.integrity.trim()
      )
        throw new Error('Production tarball lacks locked source/integrity evidence.');
      let source;
      try {
        source = new URL(record.resolved);
      } catch {
        throw new Error('Invalid locked source.');
      }
      if (source.protocol !== 'https:' || source.username || source.password)
        throw new Error('Unsupported locked production source.');
    }
    selected.add(path);
    const optional = edges(record, 'optionalDependencies');
    const required = edges(record, 'dependencies');
    const peers = edges(record, 'peerDependencies');
    const peerMeta = peerMetadata(record, peers);
    for (const name of new Set([
      ...Object.keys(required),
      ...Object.keys(optional),
      ...Object.keys(peers),
    ])) {
      // optionalDependencies overrides a same-named dependencies edge. A peer
      // marked optional may legitimately be absent, but present peers are scanned.
      const mayBeAbsent =
        Object.hasOwn(optional, name) ||
        (!Object.hasOwn(required, name) && peerMeta[name] === true);
      const target = resolve(path, name, mayBeAbsent);
      if (target) pending.push(target);
    }
  }
  for (const [path, record] of Object.entries(packages)) {
    if (path && !selected.has(path) && record.dev !== true)
      throw new Error('Unreachable non-dev package in the committed lock.');
  }
  const productionRoot = { ...root };
  delete productionRoot.devDependencies;
  const inventory = Object.fromEntries(
    [...selected].sort().map((path) => [path, path ? packages[path] : productionRoot]),
  );
  return { lock: { ...lock, packages: inventory }, count: selected.size - 1 };
}

function main() {
  try {
    const [
      lockPath = 'package-lock.json',
      manifestPath = 'package.json',
      output = 'prod-deps/package-lock.json',
    ] = process.argv.slice(2);
    const result = productionLock(
      JSON.parse(readFileSync(lockPath, 'utf8')),
      JSON.parse(readFileSync(manifestPath, 'utf8')),
    );
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(result.lock, null, 2)}\n`);
    console.log(result.count);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Production inventory failed.');
    process.exitCode = 1;
  }
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();

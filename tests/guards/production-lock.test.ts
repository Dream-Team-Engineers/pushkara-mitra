import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Data = Record<string, unknown>;
type Lock = { lockfileVersion: number; packages: Record<string, Data> };
const script = join(import.meta.dirname, '../../scripts/production-lock.mjs');
const identity = { name: 'synthetic-app', version: '1.0.0' };
const pkg = (version = '1.0.0', extra: Data = {}): Data => ({
  version,
  resolved: `https://registry.example/package-${version}.tgz`,
  integrity: 'sha512-c3ludGhldGljLWZpeHR1cmU=',
  ...extra,
});
const fixture = (root: Data, packages: Record<string, Data>): Lock => ({
  lockfileVersion: 3,
  packages: { '': { ...identity, ...root }, ...packages },
});
function inventory(lock: Lock, manifest: Data = lock.packages[''] ?? {}) {
  const dir = mkdtempSync(join(tmpdir(), 'production-lock-'));
  try {
    const input = JSON.stringify(lock);
    writeFileSync(join(dir, 'package-lock.json'), input);
    writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest));
    const result = spawnSync(process.execPath, [script], {
      cwd: dir,
      encoding: 'utf8',
      env: { PATH: '/no-npm-or-network-tool' },
    });
    if (result.error) throw result.error;
    const output = join(dir, 'prod-deps/package-lock.json');
    expect(readFileSync(join(dir, 'package-lock.json'), 'utf8')).toBe(input);
    return {
      status: result.status,
      count: result.stdout.trim(),
      lock: existsSync(output) ? (JSON.parse(readFileSync(output, 'utf8')) as Lock) : null,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('offline committed production lock inventory', () => {
  it('reports an empty runtime graph without invoking npm or resolution tools', () => {
    const result = inventory(
      fixture(
        { devDependencies: { tool: '^1' } },
        {
          'node_modules/tool': pkg('1.0.0', { dev: true }),
        },
      ),
    );
    expect(result.status).toBe(0);
    expect(result.count).toBe('0');
    expect(Object.keys(result.lock?.packages ?? {})).toEqual(['']);
    expect(result.lock?.packages['']).not.toHaveProperty('devDependencies');
  });
  it('preserves locked vulnerable versions and integrity instead of resolving newer ranges', () => {
    const lock = fixture(
      { dependencies: { library: '^1' }, devDependencies: { tool: '^1' } },
      {
        'node_modules/library': pkg('1.0.0', { dependencies: { vulnerable: '^0.1.0' } }),
        'node_modules/vulnerable': pkg('0.1.0'),
        'node_modules/tool': pkg('1.0.0', { dev: true }),
      },
    );
    const result = inventory(lock);
    expect(result.status).toBe(0);
    expect(result.count).toBe('2');
    expect(result.lock?.packages['node_modules/library']).toEqual(
      lock.packages['node_modules/library'],
    );
    expect(result.lock?.packages['node_modules/vulnerable']).toEqual(
      lock.packages['node_modules/vulnerable'],
    );
    expect(result.lock?.packages).not.toHaveProperty('node_modules/tool');
  });
  it('follows nested, hoisted and scoped locked locations', () => {
    const lock = fixture(
      { dependencies: { a: '^1', b: '^1' } },
      {
        'node_modules/a': pkg('1.0.0', { dependencies: { '@scope/lib': '^2' } }),
        'node_modules/a/node_modules/@scope/lib': pkg('2.0.0', { dependencies: { shared: '^1' } }),
        'node_modules/b': pkg('1.0.0', { dependencies: { '@scope/lib': '^1' } }),
        'node_modules/@scope/lib': pkg(),
        'node_modules/shared': pkg(),
      },
    );
    const result = inventory(lock);
    expect(result.status).toBe(0);
    expect(result.count).toBe('5');
    expect(result.lock?.packages).toEqual(lock.packages);
  });
  it('includes optional/devOptional records and optional transitive dependencies', () => {
    const lock = fixture(
      { dependencies: { a: '^1' } },
      {
        'node_modules/a': pkg('1.0.0', {
          dependencies: { native: '^9' },
          optionalDependencies: { native: '^1', missing: '^1' },
        }),
        'node_modules/native': pkg('1.0.0', {
          optional: true,
          devOptional: true,
          dependencies: { support: '^1' },
        }),
        'node_modules/support': pkg('1.0.0', { optional: true }),
      },
    );
    const result = inventory(lock);
    expect(result.status).toBe(0);
    expect(result.count).toBe('3');
    expect(result.lock?.packages['node_modules/native']).toEqual(
      lock.packages['node_modules/native'],
    );
  });
  it('includes present peers, skips explicitly optional absent peers and rejects absent required peers', () => {
    const lock = fixture(
      { dependencies: { a: '^1' } },
      {
        'node_modules/a': pkg('1.0.0', {
          peerDependencies: { host: '^1', plugin: '^1', missing: '^1' },
          peerDependenciesMeta: { plugin: { optional: true }, missing: { optional: true } },
        }),
        'node_modules/host': pkg(),
        'node_modules/plugin': pkg(),
      },
    );
    expect(inventory(lock).count).toBe('3');
    delete lock.packages['node_modules/host'];
    expect(inventory(lock).status).toBe(1);
  });
  it('terminates cyclic runtime graphs while retaining every node', () => {
    const lock = fixture(
      { dependencies: { a: '^1' } },
      {
        'node_modules/a': pkg('1.0.0', { dependencies: { b: '^1' } }),
        'node_modules/b': pkg('1.0.0', { dependencies: { a: '^1' } }),
      },
    );
    expect(inventory(lock).count).toBe('2');
  });
  const invalid: [string, () => Lock][] = [
    ['old lock format', () => ({ ...fixture({}, {}), lockfileVersion: 2 })],
    [
      'absent required transitive',
      () =>
        fixture(
          { dependencies: { a: '^1' } },
          { 'node_modules/a': pkg('1.0.0', { dependencies: { missing: '^1' } }) },
        ),
    ],
    [
      'dev-only runtime record',
      () =>
        fixture({ dependencies: { a: '^1' } }, { 'node_modules/a': pkg('1.0.0', { dev: true }) }),
    ],
    ['unreachable non-dev record', () => fixture({}, { 'node_modules/hidden': pkg() })],
    [
      'alias identity',
      () => fixture({ dependencies: { a: 'npm:other@1' } }, { 'node_modules/a': pkg() }),
    ],
    [
      'linked workspace',
      () => fixture({ dependencies: { a: '^1' } }, { 'node_modules/a': { link: true } }),
    ],
    [
      'missing integrity',
      () =>
        fixture(
          { dependencies: { a: '^1' } },
          { 'node_modules/a': { version: '1.0.0', resolved: 'https://registry.example/a.tgz' } },
        ),
    ],
    [
      'git source',
      () =>
        fixture(
          { dependencies: { a: '^1' } },
          { 'node_modules/a': pkg('1.0.0', { resolved: 'git+ssh://git.example/a' }) },
        ),
    ],
    ['escaping package location', () => fixture({}, { '../outside': pkg('1.0.0', { dev: true }) })],
  ];
  it.each(invalid)('fails closed for %s', (_name, make) => {
    const result = inventory(make());
    expect(result.status).toBe(1);
    expect(result.lock).toBeNull();
  });
  it('rejects manifest/runtime dependency and peer-metadata drift', () => {
    expect(
      inventory(fixture({ optionalDependencies: { a: '^1' } }, {}), {
        ...identity,
        dependencies: { a: '^1' },
      }).status,
    ).toBe(1);
    const lock = fixture(
      { peerDependencies: { host: '^1' }, peerDependenciesMeta: { host: { optional: true } } },
      {},
    );
    expect(inventory(lock, { ...identity, peerDependencies: { host: '^1' } }).status).toBe(1);
  });
});

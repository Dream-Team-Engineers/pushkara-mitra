import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = (name: string) =>
  readFileSync(join(import.meta.dirname, '..', '..', '.github', 'workflows', name), 'utf8');

type Entry = { value: string; body: string };

/**
 * Deliberately restricted reader for the reviewed block-style workflow maps.
 * This is not a YAML parser: nonempty flow maps, aliases, merge keys, quoted keys and
 * alternative layouts fail closed and require explicit review of this guard.
 * Actionlint remains responsible for general workflow/YAML validation.
 */
function blockMap(source: string): Map<string, Entry> {
  const lines = source.split('\n').filter((line) => line.trim() && !/^\s*#/.test(line));
  const first = lines[0];
  if (!first || /\t/.test(source)) throw new Error('Expected space-indented block map');
  const indent = first.length - first.trimStart().length;
  const result = new Map<string, Entry>();
  let key: string | undefined;
  for (const line of lines) {
    const depth = line.length - line.trimStart().length;
    if (depth < indent) throw new Error('Unexpected indentation');
    if (depth === indent) {
      const match = /^([A-Za-z_][A-Za-z0-9_-]*):(?:\s+(.*))?$/.exec(line.trimStart());
      if (!match?.[1] || result.has(match[1])) throw new Error('Unsupported or duplicate key');
      if (/^[&*!]/.test(match[2] ?? '')) throw new Error('Unsupported YAML node');
      key = match[1];
      result.set(key, { value: match[2] ?? '', body: '' });
    } else {
      if (!key) throw new Error('Missing parent key');
      const entry = result.get(key);
      if (!entry) throw new Error('Missing entry');
      entry.body += `${line}\n`;
    }
  }
  return result;
}

function keys(map: Map<string, Entry>, expected: string[]): void {
  expect([...map.keys()].sort()).toEqual([...expected].sort());
}

function nested(map: Map<string, Entry>, key: string): Map<string, Entry> {
  const entry = map.get(key);
  expect(entry?.value).toBe('');
  return blockMap(entry?.body ?? '');
}

function scalar(map: Map<string, Entry>, key: string): string {
  const entry = map.get(key);
  expect(entry).toBeDefined();
  expect(entry?.body).toBe('');
  return entry?.value.replace(/\s+#.*$/, '') ?? '';
}

function singleStep(job: Map<string, Entry>): Map<string, Entry> {
  const entry = job.get('steps');
  expect(entry?.value).toBe('');
  const body = entry?.body ?? '';
  const lines = body.split('\n');
  // One sequence element only. Nested sequence syntax is also unsupported.
  expect(lines.filter((line) => /^\s*-\s/.test(line))).toHaveLength(1);
  expect(lines[0]).toMatch(/^\s*-(?: name:| id:)/);
  return blockMap(body.replace(/^(\s*)- /, '$1  '));
}

function assertReleaseSafety(source: string): void {
  const root = blockMap(source);
  keys(root, ['name', 'on', 'permissions', 'concurrency', 'jobs']);
  expect(scalar(root, 'permissions')).toBe('{}');
  const trigger = nested(root, 'on');
  keys(trigger, ['push']);
  const push = nested(trigger, 'push');
  keys(push, ['branches']);
  expect(scalar(push, 'branches')).toBe('[main]');

  const jobs = nested(root, 'jobs');
  keys(jobs, ['release-please']);
  const release = nested(jobs, 'release-please');
  keys(release, ['name', 'runs-on', 'timeout-minutes', 'permissions', 'outputs', 'steps']);
  expect(scalar(release, 'runs-on')).toBe('ubuntu-24.04');
  const permissions = nested(release, 'permissions');
  keys(permissions, ['contents', 'pull-requests', 'issues']);
  for (const key of permissions.keys()) expect(scalar(permissions, key)).toBe('write');
  const step = singleStep(release);
  keys(step, ['id', 'uses', 'with']);
  expect(scalar(step, 'id')).toBe('release');
  expect(scalar(step, 'uses')).toMatch(/^googleapis\/release-please-action@[a-f0-9]{40}$/);
  const inputs = nested(step, 'with');
  keys(inputs, ['config-file', 'manifest-file']);
  expect(scalar(inputs, 'config-file')).toBe('release-please-config.json');
  expect(scalar(inputs, 'manifest-file')).toBe('.release-please-manifest.json');
}

function assertProductionBlocked(source: string): void {
  expect(source).not.toMatch(/\$\{\{/);
  const root = blockMap(source);
  keys(root, ['name', 'on', 'permissions', 'jobs']);
  expect(scalar(root, 'permissions')).toBe('{}');
  const trigger = nested(root, 'on');
  keys(trigger, ['workflow_call']);
  const callable = nested(trigger, 'workflow_call');
  keys(callable, ['inputs']);
  const inputs = nested(callable, 'inputs');
  keys(inputs, ['ref']);
  const ref = nested(inputs, 'ref');
  keys(ref, ['description', 'required', 'type']);
  expect(scalar(ref, 'required')).toBe('true');
  expect(scalar(ref, 'type')).toBe('string');

  const jobs = nested(root, 'jobs');
  keys(jobs, ['blocked']);
  const blocked = nested(jobs, 'blocked');
  keys(blocked, ['name', 'runs-on', 'timeout-minutes', 'steps']);
  expect(scalar(blocked, 'runs-on')).toBe('ubuntu-24.04');
  const step = singleStep(blocked);
  keys(step, ['name', 'run']);
  const run = step.get('run');
  expect(run?.value).toBe('|');
  const commands =
    run?.body
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean) ?? [];
  expect(commands).toHaveLength(2);
  // Literal diagnostic only: reject shell expansion, substitutions and extra commands.
  expect(commands[0]).toMatch(/^echo "[^"$`\\]*"$/);
  expect(commands[1]).toBe('exit 1');
}

const release = workflow('release.yml');
const production = workflow('deploy-production.yml');

describe('production release stop gate', () => {
  it('preserves the sole release-please job without deployment steps or credentials', () => {
    assertReleaseSafety(release);
  });

  it('retains only an unconditional credential-free failing production job', () => {
    assertProductionBlocked(production);
  });

  const releaseMutations: [string, string][] = [
    [
      'inline deployment job',
      `${release}\n  ship:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: npx wrangler deploy --env production\n`,
    ],
    [
      'differently named reusable deployment',
      `${release}\n  publish:\n    uses: ./.github/workflows/ship.yml\n`,
    ],
    [
      'deployment inside the release job',
      release.replace(
        '    steps:',
        '    steps:\n      - run: npx wrangler deploy --env production',
      ),
    ],
    [
      'top-level credential inheritance',
      release.replace(
        'permissions: {}',
        'env:\n  TOKEN: ${{ secrets.PRODUCTION_TOKEN }}\npermissions: {}',
      ),
    ],
  ];
  for (const [name, mutated] of releaseMutations) {
    it(`rejects ${name}`, () => {
      expect(mutated).not.toBe(release);
      expect(() => {
        assertReleaseSafety(mutated);
      }).toThrow();
    });
  }

  const productionMutations: [string, string][] = [
    [
      'conditional failure step',
      production.replace('        run: |', '        if: false\n        run: |'),
    ],
    [
      'conditional shell failure',
      production.replace('          exit 1', '          if false; then exit 1; fi'),
    ],
    [
      'ignored failure',
      production.replace('        run: |', '        continue-on-error: true\n        run: |'),
    ],
    [
      'additional deployment step',
      `${production}\n      - run: npx wrangler deploy --env production\n`,
    ],
    ['additional reusable job', `${production}\n  ship:\n    uses: ./.github/workflows/ship.yml\n`],
    [
      'production environment binding',
      production.replace('    steps:', '    environment: production\n    steps:'),
    ],
    [
      'checkout action',
      production.replace(
        '      - name:',
        '      - uses: actions/checkout@0123456789012345678901234567890123456789\n      - name:',
      ),
    ],
    [
      'shell command substitution',
      production.replace('echo "::error::', 'echo "$(npx deploy) ::error::'),
    ],
    [
      'duplicate jobs mapping',
      `${production}\njobs:\n  ship:\n    uses: ./.github/workflows/ship.yml\n`,
    ],
  ];
  for (const [name, mutated] of productionMutations) {
    it(`rejects ${name}`, () => {
      expect(mutated).not.toBe(production);
      expect(() => {
        assertProductionBlocked(mutated);
      }).toThrow();
    });
  }
});

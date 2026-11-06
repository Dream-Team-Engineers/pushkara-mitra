import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(import.meta.dirname, '../../.github/workflows/preview.yml'),
  'utf8',
);

function assertPaused(workflow: string): void {
  // This is a restricted reviewed shape, not a general YAML parser. Unknown
  // layouts fail closed; workflow changes also require actionlint and review.
  expect(workflow).not.toContain('${{');
  expect(workflow).not.toContain('\t');
  const lines = workflow.split('\n').filter((line) => line.trim() && !/^\s*#/.test(line));
  const at = (depth: number) =>
    lines.filter((line) => line.length - line.trimStart().length === depth);
  const keys = (depth: number) => at(depth).map((line) => /^\s*([a-z_-]+):/.exec(line)?.[1]);
  expect(keys(0)).toEqual(['name', 'on', 'permissions', 'jobs']);
  expect(at(0).slice(1)).toEqual(['on:', 'permissions: {}', 'jobs:']);
  expect(at(2)).toEqual(['  workflow_dispatch:', '  paused:']);
  expect(keys(4)).toEqual(['name', 'runs-on', 'timeout-minutes', 'steps']);
  expect(at(4).slice(1)).toEqual([
    '    runs-on: ubuntu-24.04',
    '    timeout-minutes: 1',
    '    steps:',
  ]);
  expect(at(6)).toHaveLength(1);
  expect(at(6)[0]).toMatch(/^ {6}- name: [^\n]+$/);
  expect(at(8)).toEqual(['        run: |']);
  const commands = at(10).map((line) => line.trim());
  expect(commands).toHaveLength(2);
  expect(commands[0]).toMatch(/^echo "[^"$`\\]*"$/);
  expect(commands[1]).toBe('exit 1');
  expect(lines).toHaveLength(
    at(0).length + at(2).length + at(4).length + at(6).length + at(8).length + at(10).length,
  );
}

describe('preview credential isolation pause', () => {
  it('has no automatic PR trigger, privileged permission, checkout or environment secret use', () => {
    assertPaused(source);
  });

  const mutations = [
    source.replace('  workflow_dispatch:', '  pull_request:'),
    source +
      '\n  steal:\n    env:\n      TOKEN: ${{ secrets["CLOUDFLARE_API_TOKEN"] }}\n    steps:\n      - run: curl https://example.invalid\n',
    source +
      '\n  extra:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: curl https://example.invalid\n',
    source + '\n      - run: curl https://example.invalid\n',
    source.replace('        run: |', '        if: false\n        run: |'),
    source.replace('        run: |', '        continue-on-error: true\n        run: |'),
    source.replace('permissions: {}', 'permissions: write-all'),
  ];
  it.each(mutations.map((mutated, i) => ({ mutated, i })))(
    'rejects credential or extra-execution mutation $i',
    ({ mutated }) => {
      expect(mutated).not.toBe(source);
      expect(() => {
        assertPaused(mutated);
      }).toThrow();
    },
  );

  it('fails visibly without invoking any deployment tooling', () => {
    const script = source.split('        run: |\n')[1]?.replaceAll(/^ {10}/gm, '');
    expect(script).toBeDefined();
    const result = spawnSync('bash', ['-c', script ?? 'exit 99'], {
      encoding: 'utf8',
      env: { PATH: '/usr/bin:/bin' },
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Preview upload is paused');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Config guard for ADR 0004 Amendment 1 and proposed Amendment 2.
 * GroupLocation remains the only class. Preview and staging use unused SQLite provisioning
 * for Workers Free; top-level and production stay unchanged. Amendment 2 is a proposal,
 * not owner approval or deployment authorization. Further changes require reviewed decisions.
 */
const TOML = readFileSync(join(import.meta.dirname, '..', '..', 'wrangler.toml'), 'utf8');

const EXPECTED: Record<string, 'new_classes' | 'new_sqlite_classes'> = {
  top: 'new_classes',
  preview: 'new_sqlite_classes',
  staging: 'new_sqlite_classes',
  production: 'new_classes',
};

const DECLARATION = /^\s*(new_classes|new_sqlite_classes)\s*=\s*\[([^\]]*)\]/gm;

/** Body of each `[[migrations]]` / `[[env.<name>.migrations]]` table, keyed by environment. */
function migrationBlocks(toml: string): Map<string, string[]> {
  const blocks = new Map<string, string[]>();
  const header = /^\[\[(?:env\.([a-z]+)\.)?migrations\]\]\s*$/gm;
  for (const match of toml.matchAll(header)) {
    const start = match.index + match[0].length;
    const rest = toml.slice(start);
    const next = rest.search(/^\[/m);
    const body = next === -1 ? rest : rest.slice(0, next);
    const env = match[1] ?? 'top';
    blocks.set(env, [...(blocks.get(env) ?? []), body]);
  }
  return blocks;
}

function assertEnvironmentMigration(toml: string, env: string): void {
  const bodies = migrationBlocks(toml).get(env) ?? [];
  expect(bodies).toHaveLength(1);
  const body = bodies.join('\n');
  const declared = [...body.matchAll(DECLARATION)];
  expect(declared.map((d) => d[1])).toEqual([EXPECTED[env]]);
  expect(declared[0]?.[2]?.replaceAll(/["\s]/g, '')).toBe('GroupLocation');
  expect([...body.matchAll(/^\s*tag\s*=\s*"([^"\n]+)"/gm)].map((m) => m[1])).toEqual(['v1']);
}

describe('wrangler.toml Durable Object migrations', () => {
  const blocks = migrationBlocks(TOML);

  it('declares a migration for every environment', () => {
    expect([...blocks.keys()].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [env, key] of Object.entries(EXPECTED)) {
    it(`${env} declares only GroupLocation, with ${key}`, () => {
      assertEnvironmentMigration(TOML, env);
    });
  }

  it('rejects preview fallback to the unsupported Free-plan backend', () => {
    const changed = TOML.replace(
      '[[env.preview.migrations]]\ntag = "v1"\nnew_sqlite_classes',
      '[[env.preview.migrations]]\ntag = "v1"\nnew_classes',
    );
    expect(changed).not.toBe(TOML);
    expect(() => {
      assertEnvironmentMigration(changed, 'preview');
    }).toThrow();
  });

  it('rejects production migration changes or namespace-reset tags', () => {
    const changed = TOML.replace(
      '[[env.production.migrations]]\ntag = "v1"\nnew_classes',
      '[[env.production.migrations]]\ntag = "v1"\nnew_sqlite_classes',
    );
    expect(changed).not.toBe(TOML);
    expect(() => {
      assertEnvironmentMigration(changed, 'production');
    }).toThrow();
    const reset = TOML.replaceAll('tag = "v1"', 'tag = "v2"');
    expect(() => {
      assertEnvironmentMigration(reset, 'preview');
    }).toThrow();
  });

  it('binds no Durable Object class other than GroupLocation', () => {
    const classes = [...TOML.matchAll(/^\s*class_name\s*=\s*"([^"]+)"/gm)].map((m) => m[1]);
    expect(classes.length).toBeGreaterThan(0);
    expect(new Set(classes)).toEqual(new Set(['GroupLocation']));
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Config guard for ADR 0004 Amendment 1.
 * GroupLocation is the only Durable Object class, and only staging may use the SQLite backend
 * (required by Workers Free). Changing this needs a new ADR amendment with owner approval.
 */
const TOML = readFileSync(join(import.meta.dirname, '..', '..', 'wrangler.toml'), 'utf8');

const EXPECTED: Record<string, 'new_classes' | 'new_sqlite_classes'> = {
  top: 'new_classes',
  preview: 'new_classes',
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

describe('wrangler.toml Durable Object migrations', () => {
  const blocks = migrationBlocks(TOML);

  it('declares a migration for every environment', () => {
    expect([...blocks.keys()].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [env, key] of Object.entries(EXPECTED)) {
    it(`${env} declares only GroupLocation, with ${key}`, () => {
      const body = (blocks.get(env) ?? []).join('\n');
      const declared = [...body.matchAll(DECLARATION)];
      expect(declared.map((d) => d[1])).toEqual([key]);
      expect(declared[0]?.[2]?.replaceAll(/["\s]/g, '')).toBe('GroupLocation');
    });
  }

  it('binds no Durable Object class other than GroupLocation', () => {
    const classes = [...TOML.matchAll(/^\s*class_name\s*=\s*"([^"]+)"/gm)].map((m) => m[1]);
    expect(classes.length).toBeGreaterThan(0);
    expect(new Set(classes)).toEqual(new Set(['GroupLocation']));
  });
});

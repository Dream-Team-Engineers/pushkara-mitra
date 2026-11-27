import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import core from '../../migrations/0002_backend_core.sql?raw';
import groupName from '../../migrations/0004_group_name.sql?raw';
import groupBlock from '../../migrations/0005_group_block.sql?raw';
import memberName from '../../migrations/0009_member_name.sql?raw';
import { d1Repository } from '../../src/db/repository';

/** Retention: an ended group, its members' first names, invitations and blocks are deleted. */
const DB = (env as unknown as { DB: D1Database }).DB;
const repo = d1Repository(DB);
const NOW = '2026-12-01T00:00:00.000Z';

beforeAll(async () => {
  for (const migration of [core, groupName, groupBlock, memberName]) {
    for (const statement of migration.split(/;\s*\n\s*\n/)) {
      const sql = statement.trim();
      if (sql !== '') await DB.prepare(sql).run();
    }
  }
});

async function count(table: string): Promise<number> {
  const row = await DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
  return row?.n ?? -1;
}

describe('purgeEndedGroups', () => {
  it('deletes ended groups with their first names and keeps live ones', async () => {
    await repo.createGroup(
      'g-ended',
      'owner-1',
      'Ended',
      '2026-11-01T00:00:00.000Z',
      '2026-11-15T00:00:00.000Z',
      'hash-ended',
      '2026-11-15T00:00:00.000Z',
      5,
    );
    await repo.createGroup(
      'g-live',
      'owner-2',
      'Live',
      '2026-11-25T00:00:00.000Z',
      '2026-12-09T00:00:00.000Z',
      'hash-live',
      '2026-12-09T00:00:00.000Z',
      5,
    );
    await repo.setMemberName('g-ended', 'owner-1', 'Asha');
    await repo.setMemberName('g-live', 'owner-2', 'Ravi');
    await DB.prepare(
      "INSERT INTO group_block (group_id, subject_ref, blocked_at) VALUES ('g-ended', 'x', ?)",
    )
      .bind(NOW)
      .run();

    expect(await repo.purgeEndedGroups(NOW)).toBe(1);

    expect(await count('group_')).toBe(1);
    expect(await count('membership')).toBe(1);
    expect(await count('invitation')).toBe(1);
    expect(await count('group_block')).toBe(0);
    const names = await DB.prepare('SELECT display_name FROM membership').all<{
      display_name: string;
    }>();
    expect(names.results.map((r) => r.display_name)).toEqual(['Ravi']);
    expect(await repo.purgeEndedGroups(NOW)).toBe(0);
  });
});

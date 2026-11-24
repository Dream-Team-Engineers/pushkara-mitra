import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import core from '../../migrations/0002_backend_core.sql?raw';
import partners from '../../migrations/0007_partners.sql?raw';

/** Migration 0007 rebuilds consent_ledger: existing rows, their order and the trigger must survive. */
const DB = (env as unknown as { DB: D1Database }).DB;

async function apply(migration: string): Promise<void> {
  for (const statement of migration.split(/;\s*\n\s*\n/)) {
    const sql = statement.trim();
    if (sql !== '') await DB.prepare(sql).run();
  }
}

describe('migration 0007', () => {
  it('keeps every consent row in order, keeps the append-only trigger, and adds partner', async () => {
    await apply(core);
    const insert = DB.prepare(
      'INSERT INTO consent_ledger (id, subject_ref, purpose_id, notice_version, locale, decision, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    await insert
      .bind('c1', 'subject-a', 'group', 'group-1', 'te', 'granted', '2026-11-20T10:00:00Z')
      .run();
    await insert
      .bind('c2', 'subject-a', 'group', 'group-1', 'te', 'withdrawn', '2026-11-20T11:00:00Z')
      .run();
    await insert
      .bind('c3', 'subject-b', 'sign-in', 'v1', 'en', 'granted', '2026-11-21T09:00:00Z')
      .run();
    // Before the migration the ledger refuses the new purpose.
    await expect(
      insert
        .bind('c4', 'subject-b', 'partner', 'partner-1', 'en', 'granted', '2026-11-21T09:00:00Z')
        .run(),
    ).rejects.toThrow();

    await apply(partners);

    const rows = await DB.prepare(
      'SELECT id, subject_ref, purpose_id, notice_version, locale, decision, at FROM consent_ledger ORDER BY rowid',
    ).all<{ id: string; purpose_id: string; decision: string }>();
    expect(rows.results.map((r) => [r.id, r.purpose_id, r.decision])).toEqual([
      ['c1', 'group', 'granted'],
      ['c2', 'group', 'withdrawn'],
      ['c3', 'sign-in', 'granted'],
    ]);

    await insert
      .bind('c4', 'subject-b', 'partner', 'partner-1', 'en', 'granted', '2026-11-22T09:00:00Z')
      .run();
    await expect(
      DB.prepare("UPDATE consent_ledger SET decision = 'withdrawn' WHERE id = 'c1'").run(),
    ).rejects.toThrow();
    await expect(
      insert.bind('c5', 'subject-b', 'bogus', 'v1', 'en', 'granted', '2026-11-22T09:00:00Z').run(),
    ).rejects.toThrow();
    const index = await DB.prepare(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'index' AND name = 'idx_consent_subject'",
    ).first<{ n: number }>();
    expect(index?.n).toBe(1);
  });
});

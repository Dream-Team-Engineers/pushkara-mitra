import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import core from '../../migrations/0002_backend_core.sql?raw';
import partners from '../../migrations/0007_partners.sql?raw';
import roles from '../../migrations/0008_partner_roles.sql?raw';
import { d1Repository } from '../../src/db/repository';
import { EVENT_END_WITH_BUFFER, PARTNER_RETENTION_ENDS_AT } from '../../src/retention';

/** Retention (OQ-046): partner data goes one year after the event end plus the owner's one-week buffer. */
const DB = (env as unknown as { DB: D1Database }).DB;
const repo = d1Repository(DB);

beforeAll(async () => {
  for (const migration of [core, partners, roles]) {
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

describe('partner retention date', () => {
  it('is one year after the event end (7 July 2027) plus one week of buffer', () => {
    expect(EVENT_END_WITH_BUFFER).toBe('2027-07-14T00:00:00.000Z');
    expect(PARTNER_RETENTION_ENDS_AT).toBe('2028-07-14T00:00:00.000Z');
  });
});

describe('purgePartners', () => {
  it('does nothing before the date and deletes partners, reads, updates and audit names after it', async () => {
    await DB.prepare(
      "INSERT INTO partner (subject_ref, role, ghat_id, status, name, email, applied_at) VALUES ('p1', 'priest', NULL, 'approved', 'Asha', 'a@example.org', '2027-06-01T00:00:00Z')",
    ).run();
    await DB.prepare(
      "INSERT INTO partner_update (id, subject_ref, kind, ghat_id, value, created_at) VALUES ('u1', 'p1', 'crowd', 'g1', 'low', '2027-07-01T00:00:00Z')",
    ).run();
    await DB.prepare(
      "INSERT INTO partner_audit (id, admin, action, target, at) VALUES ('a1', 'admin', 'approve', 'p1', '2027-06-02T00:00:00Z')",
    ).run();

    expect(await repo.purgePartners('2028-07-13T23:59:59.000Z', PARTNER_RETENTION_ENDS_AT)).toBe(0);
    expect(await count('partner')).toBe(1);

    expect(await repo.purgePartners('2028-07-14T00:00:00.000Z', PARTNER_RETENTION_ENDS_AT)).toBe(1);
    expect(await count('partner')).toBe(0);
    expect(await count('partner_update')).toBe(0);
    const audit = await DB.prepare('SELECT target FROM partner_audit').first<{ target: string }>();
    expect(audit?.target).toBe('removed');
  });
});

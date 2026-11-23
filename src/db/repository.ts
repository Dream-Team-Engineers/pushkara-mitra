/**
 * The only module that talks to D1. Routes never contain SQL; every statement is parameterised and
 * ownership always comes from the verified session, never from an id the client supplies.
 * No coordinate, person name, email or phone column exists (ADR 0004, ADR 0006). The only free text
 * is the group name the leader types (16 characters at most, ADR 0017, data inventory DI-17).
 */
import { randomId } from './ids';

export type ConsentPurpose = 'sign-in' | 'group' | 'pass' | 'notifications';
export type SosCategory = 'medical' | 'lost' | 'crowd' | 'other';

export type CrowdLevel = 'low' | 'moderate' | 'high';

export interface CrowdReading {
  readonly ghatId: string;
  readonly level: CrowdLevel;
  readonly reportedAt: string;
}

export interface ConsentRecord {
  readonly purposeId: ConsentPurpose;
  readonly noticeVersion: string;
  readonly locale: 'te' | 'en' | 'hi';
  readonly decision: 'granted' | 'withdrawn';
  readonly at: string;
}

export interface GroupSummary {
  readonly id: string;
  readonly name: string | null;
  readonly role: 'owner' | 'member';
  readonly state: 'active' | 'closed';
  readonly expiresAt: string;
  readonly memberCount: number;
}

export type JoinResult =
  | { readonly ok: true; readonly groupId: string }
  | { readonly ok: false; readonly reason: 'invalid_code' | 'already_member' | 'full' };

/** Most people one group may hold, owner included (ADR 0017). */
export const MAX_GROUP_MEMBERS = 10;

export interface Repository {
  createSession(input: {
    idHash: string;
    subjectRef: string;
    createdAt: string;
    expiresAt: string;
  }): Promise<void>;
  isSessionActive(idHash: string, subjectRef: string, nowIso: string): Promise<boolean>;
  revokeSession(idHash: string, nowIso: string): Promise<void>;

  recordConsent(subjectRef: string, record: ConsentRecord): Promise<void>;
  listConsent(subjectRef: string): Promise<readonly ConsentRecord[]>;

  createGroup(
    ownerRef: string,
    name: string | null,
    nowIso: string,
    expiresIso: string,
    codeHash: string,
    inviteExpiresIso: string,
    uses: number,
  ): Promise<string>;
  createInvitation(
    subjectRef: string,
    groupId: string,
    codeHash: string,
    expiresIso: string,
    uses: number,
    nowIso: string,
  ): Promise<boolean>;
  joinWithCode(subjectRef: string, codeHash: string, nowIso: string): Promise<JoinResult>;
  leaveGroup(subjectRef: string, groupId: string): Promise<boolean>;
  /**
   * The pseudonyms of the other (non-owner) members, only when `ownerRef` owns this active,
   * unexpired group; otherwise null. Used to match a per-group handle for removal.
   */
  listMembersForOwner(
    ownerRef: string,
    groupId: string,
    nowIso: string,
  ): Promise<readonly string[] | null>;
  /** Removes a non-owner member and revokes every open invite code of the group. */
  removeMember(groupId: string, subjectRef: string, nowIso: string): Promise<boolean>;
  listGroups(subjectRef: string, nowIso: string): Promise<readonly GroupSummary[]>;
  /** The person's role in this active, unexpired group, or null when they are not a member. */
  memberRole(
    subjectRef: string,
    groupId: string,
    nowIso: string,
  ): Promise<'owner' | 'member' | null>;

  /** Idempotent on the request hash: a retry returns the original id with `duplicate: true`. */
  insertSos(input: {
    requestHash: string;
    category: SosCategory;
    createdAt: string;
  }): Promise<{ id: string; duplicate: boolean }>;

  /** Keeps only the latest level per ghat. No history, no reporter, no location. */
  upsertCrowdReading(input: {
    ghatId: string;
    level: CrowdLevel;
    reportedAt: string;
  }): Promise<void>;
  /** Readings reported at or after `sinceIso`; older ones are not returned (the caller shows noData). */
  listCrowdReadings(sinceIso: string): Promise<readonly CrowdReading[]>;

  /** Erasure: removes everything held for this subject. Returns row counts. */
  eraseSubject(subjectRef: string): Promise<{ sessions: number; consents: number; groups: number }>;
}

interface Row {
  readonly [column: string]: unknown;
}

export function d1Repository(db: D1Database): Repository {
  const run = (sql: string, ...params: unknown[]) =>
    db
      .prepare(sql)
      .bind(...params)
      .run();
  const all = async <T extends Row>(sql: string, ...params: unknown[]) =>
    (
      await db
        .prepare(sql)
        .bind(...params)
        .all<T>()
    ).results;

  return {
    async createSession({ idHash, subjectRef, createdAt, expiresAt }) {
      await run(
        'INSERT INTO session (id_hash, subject_ref, created_at, expires_at) VALUES (?, ?, ?, ?)',
        idHash,
        subjectRef,
        createdAt,
        expiresAt,
      );
    },

    async isSessionActive(idHash, subjectRef, nowIso) {
      const rows = await all(
        'SELECT 1 AS ok FROM session WHERE id_hash = ? AND subject_ref = ? AND revoked_at IS NULL AND expires_at > ?',
        idHash,
        subjectRef,
        nowIso,
      );
      return rows.length === 1;
    },

    async revokeSession(idHash, nowIso) {
      await run(
        'UPDATE session SET revoked_at = ? WHERE id_hash = ? AND revoked_at IS NULL',
        nowIso,
        idHash,
      );
    },

    async recordConsent(subjectRef, r) {
      await run(
        'INSERT INTO consent_ledger (id, subject_ref, purpose_id, notice_version, locale, decision, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        randomId(),
        subjectRef,
        r.purposeId,
        r.noticeVersion,
        r.locale,
        r.decision,
        r.at,
      );
    },

    async listConsent(subjectRef) {
      const rows = await all<{
        purpose_id: ConsentPurpose;
        notice_version: string;
        locale: 'te' | 'en' | 'hi';
        decision: 'granted' | 'withdrawn';
        at: string;
      }>(
        'SELECT purpose_id, notice_version, locale, decision, at FROM consent_ledger WHERE subject_ref = ? ORDER BY at, rowid',
        subjectRef,
      );
      return rows.map((r) => ({
        purposeId: r.purpose_id,
        noticeVersion: r.notice_version,
        locale: r.locale,
        decision: r.decision,
        at: r.at,
      }));
    },

    async createGroup(ownerRef, name, nowIso, expiresIso, codeHash, inviteExpiresIso, uses) {
      const id = randomId();
      await db.batch([
        db
          .prepare('INSERT INTO group_ (id, name, created_at, expires_at) VALUES (?, ?, ?, ?)')
          .bind(id, name, nowIso, expiresIso),
        db
          .prepare(
            "INSERT INTO membership (group_id, subject_ref, role, joined_at) VALUES (?, ?, 'owner', ?)",
          )
          .bind(id, ownerRef, nowIso),
        db
          .prepare(
            'INSERT INTO invitation (code_hash, group_id, expires_at, uses_left) VALUES (?, ?, ?, ?)',
          )
          .bind(codeHash, id, inviteExpiresIso, uses),
      ]);
      return id;
    },

    async createInvitation(subjectRef, groupId, codeHash, expiresIso, uses, nowIso) {
      // Only the owner of an active, unexpired group may invite. The check and the insert are one statement.
      const result = await run(
        `INSERT INTO invitation (code_hash, group_id, expires_at, uses_left)
         SELECT ?, g.id, ?, ? FROM group_ g
         JOIN membership m ON m.group_id = g.id AND m.subject_ref = ? AND m.role = 'owner'
         WHERE g.id = ? AND g.state = 'active' AND g.expires_at > ?`,
        codeHash,
        expiresIso,
        uses,
        subjectRef,
        groupId,
        nowIso,
      );
      return result.meta.changes === 1;
    },

    async joinWithCode(subjectRef, codeHash, nowIso) {
      const invites = await all<{ group_id: string }>(
        `SELECT i.group_id FROM invitation i JOIN group_ g ON g.id = i.group_id
         WHERE i.code_hash = ? AND i.revoked_at IS NULL AND i.uses_left > 0
           AND i.expires_at > ? AND g.state = 'active' AND g.expires_at > ?`,
        codeHash,
        nowIso,
        nowIso,
      );
      const groupId = invites[0]?.group_id;
      if (groupId === undefined) return { ok: false, reason: 'invalid_code' };
      const existing = await all(
        'SELECT 1 AS ok FROM membership WHERE group_id = ? AND subject_ref = ?',
        groupId,
        subjectRef,
      );
      if (existing.length > 0) return { ok: false, reason: 'already_member' };
      const counted = await all<{ n: number }>(
        'SELECT COUNT(*) AS n FROM membership WHERE group_id = ?',
        groupId,
      );
      if ((counted[0]?.n ?? 0) >= MAX_GROUP_MEMBERS) return { ok: false, reason: 'full' };
      // Spend a use atomically; if another person took the last one, the update changes nothing.
      const spent = await run(
        `UPDATE invitation SET uses_left = uses_left - 1
         WHERE code_hash = ? AND uses_left > 0 AND revoked_at IS NULL AND expires_at > ?`,
        codeHash,
        nowIso,
      );
      if (spent.meta.changes !== 1) return { ok: false, reason: 'invalid_code' };
      // The limit is checked again in the insert itself, so two people joining at once cannot pass it.
      const inserted = await run(
        `INSERT OR IGNORE INTO membership (group_id, subject_ref, role, joined_at)
         SELECT ?, ?, 'member', ?
         WHERE (SELECT COUNT(*) FROM membership WHERE group_id = ?) < ?`,
        groupId,
        subjectRef,
        nowIso,
        groupId,
        MAX_GROUP_MEMBERS,
      );
      if (inserted.meta.changes !== 1) {
        await run('UPDATE invitation SET uses_left = uses_left + 1 WHERE code_hash = ?', codeHash);
        return { ok: false, reason: 'full' };
      }
      return { ok: true, groupId };
    },

    async leaveGroup(subjectRef, groupId) {
      const result = await run(
        'DELETE FROM membership WHERE group_id = ? AND subject_ref = ?',
        groupId,
        subjectRef,
      );
      if (result.meta.changes !== 1) return false;
      // A group with nobody left is removed (cascade removes its invitations).
      await run(
        'DELETE FROM group_ WHERE id = ? AND NOT EXISTS (SELECT 1 FROM membership WHERE group_id = ?)',
        groupId,
        groupId,
      );
      return true;
    },

    async listMembersForOwner(ownerRef, groupId, nowIso) {
      const owner = await all(
        `SELECT 1 AS ok FROM membership m JOIN group_ g ON g.id = m.group_id
         WHERE m.group_id = ? AND m.subject_ref = ? AND m.role = 'owner'
           AND g.state = 'active' AND g.expires_at > ?`,
        groupId,
        ownerRef,
        nowIso,
      );
      if (owner.length !== 1) return null;
      const rows = await all<{ subject_ref: string }>(
        "SELECT subject_ref FROM membership WHERE group_id = ? AND role = 'member'",
        groupId,
      );
      return rows.map((r) => r.subject_ref);
    },

    async removeMember(groupId, subjectRef, nowIso) {
      const removed = await run(
        "DELETE FROM membership WHERE group_id = ? AND subject_ref = ? AND role = 'member'",
        groupId,
        subjectRef,
      );
      if (removed.meta.changes !== 1) return false;
      // Old codes stop working, so the removed person cannot simply join again.
      await run(
        'UPDATE invitation SET revoked_at = ? WHERE group_id = ? AND revoked_at IS NULL',
        nowIso,
        groupId,
      );
      return true;
    },

    async listGroups(subjectRef, nowIso) {
      const rows = await all<{
        id: string;
        name: string | null;
        role: 'owner' | 'member';
        state: 'active' | 'closed';
        expires_at: string;
        member_count: number;
      }>(
        `SELECT g.id, g.name, m.role, g.state, g.expires_at,
                (SELECT COUNT(*) FROM membership x WHERE x.group_id = g.id) AS member_count
         FROM membership m JOIN group_ g ON g.id = m.group_id
         WHERE m.subject_ref = ? AND g.expires_at > ? ORDER BY g.created_at, g.id`,
        subjectRef,
        nowIso,
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        state: r.state,
        expiresAt: r.expires_at,
        memberCount: r.member_count,
      }));
    },

    async memberRole(subjectRef, groupId, nowIso) {
      const rows = await all<{ role: 'owner' | 'member' }>(
        `SELECT m.role FROM membership m JOIN group_ g ON g.id = m.group_id
         WHERE m.group_id = ? AND m.subject_ref = ? AND g.state = 'active' AND g.expires_at > ?`,
        groupId,
        subjectRef,
        nowIso,
      );
      return rows[0]?.role ?? null;
    },

    async insertSos({ requestHash, category, createdAt }) {
      const id = randomId();
      const inserted = await run(
        'INSERT OR IGNORE INTO sos_request (id, request_hash, category, created_at) VALUES (?, ?, ?, ?)',
        id,
        requestHash,
        category,
        createdAt,
      );
      if (inserted.meta.changes === 1) return { id, duplicate: false };
      const rows = await all<{ id: string }>(
        'SELECT id FROM sos_request WHERE request_hash = ?',
        requestHash,
      );
      const existing = rows[0]?.id;
      if (existing === undefined) throw new Error('sos insert failed');
      return { id: existing, duplicate: true };
    },

    async upsertCrowdReading({ ghatId, level, reportedAt }) {
      await run(
        `INSERT INTO crowd_reading (ghat_id, level, reported_at) VALUES (?, ?, ?)
         ON CONFLICT (ghat_id) DO UPDATE SET level = excluded.level, reported_at = excluded.reported_at`,
        ghatId,
        level,
        reportedAt,
      );
    },

    async listCrowdReadings(sinceIso) {
      const rows = await all<{ ghat_id: string; level: CrowdLevel; reported_at: string }>(
        'SELECT ghat_id, level, reported_at FROM crowd_reading WHERE reported_at >= ? ORDER BY ghat_id',
        sinceIso,
      );
      return rows.map((r) => ({ ghatId: r.ghat_id, level: r.level, reportedAt: r.reported_at }));
    },

    async eraseSubject(subjectRef) {
      // The leader typed the group name: it goes with their account, even if the group continues.
      await run(
        `UPDATE group_ SET name = NULL WHERE id IN
           (SELECT group_id FROM membership WHERE subject_ref = ? AND role = 'owner')`,
        subjectRef,
      );
      const [sessions, consents, memberships] = await db.batch([
        db.prepare('DELETE FROM session WHERE subject_ref = ?').bind(subjectRef),
        db.prepare('DELETE FROM consent_ledger WHERE subject_ref = ?').bind(subjectRef),
        db.prepare('DELETE FROM membership WHERE subject_ref = ?').bind(subjectRef),
      ]);
      // Groups left with no members are removed; their invitations go with them.
      await run(
        'DELETE FROM group_ WHERE NOT EXISTS (SELECT 1 FROM membership WHERE group_id = group_.id)',
      );
      return {
        sessions: sessions?.meta.changes ?? 0,
        consents: consents?.meta.changes ?? 0,
        groups: memberships?.meta.changes ?? 0,
      };
    },
  };
}

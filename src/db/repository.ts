/**
 * The only module that talks to D1. Routes never contain SQL; every statement is parameterised and
 * ownership always comes from the verified session, never from an id the client supplies.
 * No coordinate, person name, email or phone column exists (ADR 0004, ADR 0006). The only free text
 * is the group name the leader types (16 characters at most, ADR 0017, data inventory DI-17).
 */
import { randomId } from './ids';

export type ConsentPurpose = 'sign-in' | 'group' | 'pass' | 'notifications' | 'partner';
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

export type PartnerRole = 'priest' | 'volunteer' | 'vendor' | 'moderator';
export type PartnerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type PartnerKind = 'crowd' | 'river' | 'food';

/** What the person themselves may know about their own application (never the name or email). */
export interface PartnerRecord {
  readonly role: PartnerRole;
  readonly ghatId: string | null;
  readonly status: PartnerStatus;
  readonly availableUntil: string | null;
}

export type ApplyResult = 'created' | 'exists' | 'cooldown';

export interface PartnerNudge {
  readonly id: string;
  readonly kind: PartnerKind;
  readonly ghatId: string | null;
  readonly createdAt: string;
  readonly read: boolean;
}

/** A volunteer's update as pilgrims see it: no partner identity of any kind. */
export interface PublicPartnerUpdate {
  readonly kind: PartnerKind;
  readonly ghatId: string;
  readonly value: string;
  readonly reportedAt: string;
}

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
    id: string,
    ownerRef: string,
    name: string | null,
    nowIso: string,
    expiresIso: string,
    codeHash: string,
    inviteExpiresIso: string,
    uses: number,
  ): Promise<string>;
  /** Makes sure the group's permanent code is accepted (older groups had random codes). */
  ensureInvitation(
    groupId: string,
    codeHash: string,
    expiresIso: string,
    uses: number,
  ): Promise<void>;
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
  /** Removes a non-owner member and blocks them from joining this group again with its code. */
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

  /** Adds one to each period's counter (ADR 0018). Counts only: no person, device or address. */
  countMetric(
    periods: readonly string[],
    metric: 'open' | 'install',
    locale: 'te' | 'en' | 'hi',
  ): Promise<void>;

  /** Partners (ADR 0019). The applicant's name and email are stored for admins only. */
  getPartner(subjectRef: string): Promise<PartnerRecord | null>;
  /** A new or renewed application. A rejected person may apply again only after `cooldownBeforeIso`. */
  applyPartner(input: {
    subjectRef: string;
    role: PartnerRole;
    ghatId: string | null;
    name: string;
    email: string;
    nowIso: string;
    cooldownBeforeIso: string;
  }): Promise<ApplyResult>;
  /** Approved partners only: switches availability on until `untilIso`, or off with null. */
  setAvailability(subjectRef: string, untilIso: string | null): Promise<boolean>;
  /** Nudges still open that apply to this partner (no ghat, or their home ghat). */
  listNudges(
    subjectRef: string,
    ghatId: string | null,
    nowIso: string,
  ): Promise<readonly PartnerNudge[]>;
  markNudgesRead(subjectRef: string, nowIso: string): Promise<void>;
  /** How many updates this partner posted since `sinceIso` (optionally for one kind and ghat). */
  countPartnerUpdates(
    subjectRef: string,
    sinceIso: string,
    only?: { kind: PartnerKind; ghatId: string },
  ): Promise<number>;
  insertPartnerUpdate(input: {
    subjectRef: string;
    kind: PartnerKind;
    ghatId: string;
    value: string;
    createdAt: string;
  }): Promise<string>;
  /** Latest unhidden update per kind and ghat from approved partners, newer than `sinceIso`. */
  listPublicPartnerUpdates(sinceIso: string): Promise<readonly PublicPartnerUpdate[]>;

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

    async createGroup(id, ownerRef, name, nowIso, expiresIso, codeHash, inviteExpiresIso, uses) {
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

    async ensureInvitation(groupId, codeHash, expiresIso, uses) {
      await run(
        `INSERT OR IGNORE INTO invitation (code_hash, group_id, expires_at, uses_left)
         VALUES (?, ?, ?, ?)`,
        codeHash,
        groupId,
        expiresIso,
        uses,
      );
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
      // Removed by the leader: the same answer as a wrong code, so nothing is revealed.
      const blocked = await all(
        'SELECT 1 AS ok FROM group_block WHERE group_id = ? AND subject_ref = ?',
        groupId,
        subjectRef,
      );
      if (blocked.length > 0) return { ok: false, reason: 'invalid_code' };
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
      // The code stays the same for the whole group, so the removed person is blocked instead.
      await run(
        'INSERT OR IGNORE INTO group_block (group_id, subject_ref, blocked_at) VALUES (?, ?, ?)',
        groupId,
        subjectRef,
        nowIso,
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

    async countMetric(periods, metric, locale) {
      await db.batch(
        periods.map((period) =>
          db
            .prepare(
              `INSERT INTO daily_metric (period, metric, locale, n) VALUES (?, ?, ?, 1)
               ON CONFLICT (period, metric, locale) DO UPDATE SET n = n + 1`,
            )
            .bind(period, metric, locale),
        ),
      );
    },

    async getPartner(subjectRef) {
      const rows = await all<{
        role: PartnerRole;
        ghat_id: string | null;
        status: PartnerStatus;
        available_until: string | null;
      }>(
        'SELECT role, ghat_id, status, available_until FROM partner WHERE subject_ref = ?',
        subjectRef,
      );
      const r = rows[0];
      if (r === undefined) return null;
      return {
        role: r.role,
        ghatId: r.ghat_id,
        status: r.status,
        availableUntil: r.available_until,
      };
    },

    async applyPartner({ subjectRef, role, ghatId, name, email, nowIso, cooldownBeforeIso }) {
      const inserted = await run(
        `INSERT OR IGNORE INTO partner (subject_ref, role, ghat_id, status, name, email, applied_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
        subjectRef,
        role,
        ghatId,
        name,
        email,
        nowIso,
      );
      if (inserted.meta.changes === 1) return 'created';
      // Only a rejected person may apply again, and only after the waiting time.
      const renewed = await run(
        `UPDATE partner SET role = ?, ghat_id = ?, status = 'pending', name = ?, email = ?,
                applied_at = ?, decided_at = NULL, decided_by = NULL, available_until = NULL
         WHERE subject_ref = ? AND status = 'rejected' AND decided_at IS NOT NULL AND decided_at <= ?`,
        role,
        ghatId,
        name,
        email,
        nowIso,
        subjectRef,
        cooldownBeforeIso,
      );
      if (renewed.meta.changes === 1) return 'created';
      const rows = await all<{ status: PartnerStatus }>(
        'SELECT status FROM partner WHERE subject_ref = ?',
        subjectRef,
      );
      return rows[0]?.status === 'rejected' ? 'cooldown' : 'exists';
    },

    async setAvailability(subjectRef, untilIso) {
      const result = await run(
        "UPDATE partner SET available_until = ? WHERE subject_ref = ? AND status = 'approved'",
        untilIso,
        subjectRef,
      );
      return result.meta.changes === 1;
    },

    async listNudges(subjectRef, ghatId, nowIso) {
      const rows = await all<{
        id: string;
        kind: PartnerKind;
        ghat_id: string | null;
        created_at: string;
        is_read: number;
      }>(
        `SELECT n.id, n.kind, n.ghat_id, n.created_at,
                EXISTS (SELECT 1 FROM partner_nudge_read r WHERE r.nudge_id = n.id AND r.subject_ref = ?) AS is_read
         FROM partner_nudge n
         WHERE n.expires_at > ? AND (n.ghat_id IS NULL OR n.ghat_id = ?)
         ORDER BY n.created_at DESC, n.id`,
        subjectRef,
        nowIso,
        ghatId,
      );
      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        ghatId: r.ghat_id,
        createdAt: r.created_at,
        read: r.is_read === 1,
      }));
    },

    async markNudgesRead(subjectRef, nowIso) {
      await run(
        `INSERT OR IGNORE INTO partner_nudge_read (nudge_id, subject_ref)
         SELECT id, ? FROM partner_nudge WHERE expires_at > ?`,
        subjectRef,
        nowIso,
      );
    },

    async countPartnerUpdates(subjectRef, sinceIso, only) {
      const rows =
        only === undefined
          ? await all<{ n: number }>(
              'SELECT COUNT(*) AS n FROM partner_update WHERE subject_ref = ? AND created_at >= ?',
              subjectRef,
              sinceIso,
            )
          : await all<{ n: number }>(
              `SELECT COUNT(*) AS n FROM partner_update
               WHERE subject_ref = ? AND created_at >= ? AND kind = ? AND ghat_id = ?`,
              subjectRef,
              sinceIso,
              only.kind,
              only.ghatId,
            );
      return rows[0]?.n ?? 0;
    },

    async insertPartnerUpdate({ subjectRef, kind, ghatId, value, createdAt }) {
      const id = randomId();
      await run(
        `INSERT INTO partner_update (id, subject_ref, kind, ghat_id, value, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        id,
        subjectRef,
        kind,
        ghatId,
        value,
        createdAt,
      );
      return id;
    },

    async listPublicPartnerUpdates(sinceIso) {
      // Latest per kind and ghat. A hidden update is skipped, so an older visible one may show;
      // a suspended or removed partner's updates never show.
      const rows = await all<{
        kind: PartnerKind;
        ghat_id: string;
        value: string;
        created_at: string;
      }>(
        `SELECT u.kind, u.ghat_id, u.value, u.created_at
         FROM partner_update u JOIN partner p ON p.subject_ref = u.subject_ref
         WHERE u.hidden_at IS NULL AND p.status = 'approved' AND u.created_at >= ?
           AND NOT EXISTS (
             SELECT 1 FROM partner_update v JOIN partner q ON q.subject_ref = v.subject_ref
             WHERE v.kind = u.kind AND v.ghat_id = u.ghat_id AND v.hidden_at IS NULL
               AND q.status = 'approved' AND v.created_at >= ?
               AND (v.created_at > u.created_at OR (v.created_at = u.created_at AND v.id > u.id)))
         ORDER BY u.ghat_id, u.kind`,
        sinceIso,
        sinceIso,
      );
      return rows.map((r) => ({
        kind: r.kind,
        ghatId: r.ghat_id,
        value: r.value,
        reportedAt: r.created_at,
      }));
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
        db.prepare('DELETE FROM group_block WHERE subject_ref = ?').bind(subjectRef),
        // Partner data (ADR 0019): application, name and email, reads, updates. The audit trail keeps
        // the admin's decision but loses the person.
        db.prepare('DELETE FROM partner WHERE subject_ref = ?').bind(subjectRef),
        db.prepare('DELETE FROM partner_nudge_read WHERE subject_ref = ?').bind(subjectRef),
        db.prepare('DELETE FROM partner_update WHERE subject_ref = ?').bind(subjectRef),
        db.prepare("UPDATE partner_audit SET target = 'removed' WHERE target = ?").bind(subjectRef),
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

import type { PartnerRole } from './repository';

/**
 * Partner administration for the staff dashboard (ADR 0019, amending ADR 0018 section 3). This is the
 * only admin module that writes, and it touches only the partner tables: partner, partner_nudge,
 * partner_push (ADR 0020), partner_update and partner_audit. It never reads sessions, memberships, groups, consent records,
 * positions or any pilgrim data. Every write records the admin's Access subject (never an email).
 * Applicant names and emails are returned here for admins only.
 */
export type PartnerAction = 'approve' | 'reject' | 'suspend';
export type NudgeKind = 'crowd' | 'river' | 'food';

export interface PartnerRow {
  readonly ref: string;
  readonly name: string;
  readonly email: string;
  readonly role: PartnerRole;
  readonly ghatId: string | null;
  readonly status: 'pending' | 'approved' | 'rejected' | 'suspended';
  readonly appliedAt: string;
  readonly available: boolean;
}

export interface UpdateRow {
  readonly id: string;
  readonly partnerName: string;
  readonly kind: string;
  readonly ghatId: string;
  readonly value: string;
  readonly createdAt: string;
  readonly hidden: boolean;
}

export interface PartnerOverview {
  readonly priestsAvailable: number;
  readonly volunteersAvailable: number;
  readonly pending: number;
  readonly approved: number;
  readonly nudgesToday: number;
  readonly waiting: readonly PartnerRow[];
  readonly partners: readonly PartnerRow[];
  readonly updates: readonly UpdateRow[];
}

const HOUR = 3600;
const DAY = 24 * HOUR;
/** Most nudges one admin may send in an hour. */
export const NUDGES_PER_ADMIN_PER_HOUR = 10;
/** Phone notifications (ADR 0020): most pushes one nudge may send on the free Workers plan (OQ-028). */
export const PUSH_PER_NUDGE_CAP = 40;
export const PUSH_PER_PARTNER_PER_HOUR = 3;
export const PUSH_PER_PARTNER_PER_DAY = 10;
/** A push address that keeps failing is deleted after this long without a success. */
const PUSH_FAILING_SECONDS = 30 * 24 * 60 * 60;
/** A nudge stays open this long. */
export const NUDGE_OPEN_SECONDS = 6 * HOUR;
/** Hidden updates after this many hide actions suspend the partner until an admin reviews. */
export const HIDES_BEFORE_SUSPENSION = 3;
const REJECTED_DETAILS_SECONDS = 30 * DAY;

const iso = (ms: number): string => new Date(ms).toISOString();

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

interface RawPartner {
  readonly subject_ref: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly role: PartnerRole;
  readonly ghat_id: string | null;
  readonly status: 'pending' | 'approved' | 'rejected' | 'suspended';
  readonly applied_at: string;
  readonly available_until: string | null;
}

function toRow(r: RawPartner, nowIso: string): PartnerRow {
  return {
    ref: r.subject_ref,
    name: r.name ?? '(removed)',
    email: r.email ?? '(removed)',
    role: r.role,
    ghatId: r.ghat_id,
    status: r.status,
    appliedAt: r.applied_at,
    available: r.available_until !== null && r.available_until > nowIso,
  };
}

/** Deletes what the retention rules say is due (ADR 0019). Safe to run on every view. */
export async function purgeDuePartnerData(db: D1Database, nowMs: number): Promise<void> {
  const day = iso(nowMs - DAY);
  await db.batch([
    // A rejected applicant's name and email go 30 days after the decision; the decision stays.
    db
      .prepare(
        "UPDATE partner SET name = NULL, email = NULL WHERE status = 'rejected' AND decided_at IS NOT NULL AND decided_at < ?",
      )
      .bind(iso(nowMs - REJECTED_DETAILS_SECONDS * 1000)),
    // Nudges are deleted 24 hours after they open; their read marks follow.
    db
      .prepare('DELETE FROM partner_push WHERE failed_at IS NOT NULL AND failed_at < ?')
      .bind(iso(nowMs - PUSH_FAILING_SECONDS * 1000)),
    db.prepare('DELETE FROM partner_nudge WHERE created_at < ?').bind(day),
    db.prepare(
      'DELETE FROM partner_nudge_read WHERE nudge_id NOT IN (SELECT id FROM partner_nudge)',
    ),
    // Hidden updates are deleted 24 hours after hiding; ordinary updates after a day (they stop
    // showing to pilgrims after 3 hours).
    db
      .prepare('DELETE FROM partner_update WHERE hidden_at IS NOT NULL AND hidden_at < ?')
      .bind(day),
    db.prepare('DELETE FROM partner_update WHERE created_at < ?').bind(day),
  ]);
}

export async function partnerOverview(db: D1Database, nowMs: number): Promise<PartnerOverview> {
  const nowIso = iso(nowMs);
  const dayStartIso = iso(nowMs - DAY);
  const [counts, nudges, pending, partners, updates] = await Promise.all([
    db
      .prepare(
        `SELECT
           COALESCE(SUM(status = 'approved' AND role = 'priest' AND available_until > ?), 0) AS priests,
           COALESCE(SUM(status = 'approved' AND role = 'volunteer' AND available_until > ?), 0) AS volunteers,
           COALESCE(SUM(status = 'pending'), 0) AS pending,
           COALESCE(SUM(status = 'approved'), 0) AS approved
         FROM partner`,
      )
      .bind(nowIso, nowIso)
      .first<{ priests: number; volunteers: number; pending: number; approved: number }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM partner_audit WHERE action = 'nudge' AND at >= ?")
      .bind(dayStartIso)
      .first<{ n: number }>(),
    db
      .prepare(
        "SELECT * FROM partner WHERE status = 'pending' ORDER BY applied_at, subject_ref LIMIT 50",
      )
      .all<RawPartner>(),
    db
      .prepare(
        "SELECT * FROM partner WHERE status IN ('approved','suspended') ORDER BY status, applied_at, subject_ref LIMIT 100",
      )
      .all<RawPartner>(),
    db
      .prepare(
        `SELECT u.id, COALESCE(p.name, '(removed)') AS partner_name, u.kind, u.ghat_id, u.value,
                u.created_at, u.hidden_at
         FROM partner_update u LEFT JOIN partner p ON p.subject_ref = u.subject_ref
         WHERE u.created_at >= ? ORDER BY u.created_at DESC, u.id LIMIT 50`,
      )
      .bind(dayStartIso)
      .all<{
        id: string;
        partner_name: string;
        kind: string;
        ghat_id: string;
        value: string;
        created_at: string;
        hidden_at: string | null;
      }>(),
  ]);
  return {
    priestsAvailable: counts?.priests ?? 0,
    volunteersAvailable: counts?.volunteers ?? 0,
    pending: counts?.pending ?? 0,
    approved: counts?.approved ?? 0,
    nudgesToday: nudges?.n ?? 0,
    waiting: pending.results.map((r) => toRow(r, nowIso)),
    partners: partners.results.map((r) => toRow(r, nowIso)),
    updates: updates.results.map((r) => ({
      id: r.id,
      partnerName: r.partner_name,
      kind: r.kind,
      ghatId: r.ghat_id,
      value: r.value,
      createdAt: r.created_at,
      hidden: r.hidden_at !== null,
    })),
  };
}

function audit(
  db: D1Database,
  admin: string,
  action: 'approve' | 'reject' | 'suspend' | 'hide' | 'unhide' | 'nudge',
  target: string,
  nowIso: string,
): D1PreparedStatement {
  return db
    .prepare('INSERT INTO partner_audit (id, admin, action, target, at) VALUES (?, ?, ?, ?, ?)')
    .bind(newId(), admin, action, target, nowIso);
}

/** Approve (also re-approves a suspended partner), reject a waiting application, or suspend. */
export async function decidePartner(
  db: D1Database,
  admin: string,
  ref: string,
  action: PartnerAction,
  nowMs: number,
): Promise<boolean> {
  const nowIso = iso(nowMs);
  const [from, to, clear] =
    action === 'approve'
      ? (["('pending','suspended')", 'approved', false] as const)
      : action === 'reject'
        ? (["('pending')", 'rejected', true] as const)
        : (["('approved')", 'suspended', true] as const);
  const result = await db
    .prepare(
      `UPDATE partner SET status = ?, decided_at = ?, decided_by = ?${clear ? ', available_until = NULL' : ''}
       WHERE subject_ref = ? AND status IN ${from}`,
    )
    .bind(to, nowIso, admin, ref)
    .run();
  if (result.meta.changes !== 1) return false;
  if (action !== 'approve') {
    await db.prepare('DELETE FROM partner_push WHERE subject_ref = ?').bind(ref).run();
  }
  await audit(db, admin, action, ref, nowIso).run();
  return true;
}

/** Sends one fixed-wording nudge. Returns false when this admin has sent too many in the last hour. */
export async function sendNudge(
  db: D1Database,
  admin: string,
  kind: NudgeKind,
  ghatId: string | null,
  nowMs: number,
): Promise<boolean> {
  const nowIso = iso(nowMs);
  const recent = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM partner_audit WHERE action = 'nudge' AND admin = ? AND at >= ?",
    )
    .bind(admin, iso(nowMs - HOUR * 1000))
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= NUDGES_PER_ADMIN_PER_HOUR) return false;
  const id = newId();
  await db.batch([
    db
      .prepare(
        'INSERT INTO partner_nudge (id, kind, ghat_id, created_at, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(id, kind, ghatId, nowIso, iso(nowMs + NUDGE_OPEN_SECONDS * 1000), admin),
    audit(db, admin, 'nudge', id, nowIso),
  ]);
  return true;
}

/**
 * Hides or shows an update. After the third hidden update of one partner the partner is suspended
 * until an admin reviews (recorded as the admin "system").
 */
export async function setUpdateHidden(
  db: D1Database,
  admin: string,
  id: string,
  hidden: boolean,
  nowMs: number,
): Promise<boolean> {
  const nowIso = iso(nowMs);
  const result = await db
    .prepare('UPDATE partner_update SET hidden_at = ? WHERE id = ? AND (hidden_at IS NULL) = ?')
    .bind(hidden ? nowIso : null, id, hidden ? 1 : 0)
    .run();
  if (result.meta.changes !== 1) return false;
  await audit(db, admin, hidden ? 'hide' : 'unhide', id, nowIso).run();
  if (hidden) {
    const owner = await db
      .prepare('SELECT subject_ref FROM partner_update WHERE id = ?')
      .bind(id)
      .first<{ subject_ref: string }>();
    if (owner !== null) {
      const count = await db
        .prepare(
          'SELECT COUNT(*) AS n FROM partner_update WHERE subject_ref = ? AND hidden_at IS NOT NULL',
        )
        .bind(owner.subject_ref)
        .first<{ n: number }>();
      if ((count?.n ?? 0) >= HIDES_BEFORE_SUSPENSION) {
        const suspended = await db
          .prepare(
            "UPDATE partner SET status = 'suspended', decided_at = ?, decided_by = 'system', available_until = NULL WHERE subject_ref = ? AND status = 'approved'",
          )
          .bind(nowIso, owner.subject_ref)
          .run();
        if (suspended.meta.changes === 1) {
          await db
            .prepare('DELETE FROM partner_push WHERE subject_ref = ?')
            .bind(owner.subject_ref)
            .run();
          await audit(db, 'system', 'suspend', owner.subject_ref, nowIso).run();
        }
      }
    }
  }
  return true;
}

export interface PushTarget {
  readonly ref: string;
  readonly endpoint: string;
}

/**
 * Who gets a phone notification for a nudge (ADR 0020): approved partners who are available now,
 * whose home ghat matches (or all, when the nudge names no ghat), who opted in, and who are under
 * their hourly and daily limits. At most `PUSH_PER_NUDGE_CAP` are returned; `more` counts the rest.
 * Push addresses leave this function only to be used for sending.
 */
export async function pushTargets(
  db: D1Database,
  ghatId: string | null,
  nowMs: number,
): Promise<{ targets: PushTarget[]; more: number }> {
  const nowIso = iso(nowMs);
  const { results } = await db
    .prepare(
      `SELECT p.subject_ref AS ref, x.endpoint, x.hour_start, x.hour_count, x.day_start, x.day_count
       FROM partner p JOIN partner_push x ON x.subject_ref = p.subject_ref
       WHERE p.status = 'approved' AND p.available_until > ? AND (? IS NULL OR p.ghat_id = ?)
       ORDER BY x.created_at, p.subject_ref`,
    )
    .bind(nowIso, ghatId, ghatId)
    .all<{
      ref: string;
      endpoint: string;
      hour_start: string | null;
      hour_count: number;
      day_start: string | null;
      day_count: number;
    }>();
  const hourAgo = iso(nowMs - HOUR * 1000);
  const dayAgo = iso(nowMs - DAY);
  const within = results.filter(
    (r) =>
      (r.hour_start === null ||
        r.hour_start < hourAgo ||
        r.hour_count < PUSH_PER_PARTNER_PER_HOUR) &&
      (r.day_start === null || r.day_start < dayAgo || r.day_count < PUSH_PER_PARTNER_PER_DAY),
  );
  return {
    targets: within.slice(0, PUSH_PER_NUDGE_CAP).map((r) => ({ ref: r.ref, endpoint: r.endpoint })),
    more: Math.max(0, within.length - PUSH_PER_NUDGE_CAP),
  };
}

/** Records each attempt against the partner's limits; deletes addresses a push service says are gone. */
export async function recordPushResults(
  db: D1Database,
  results: readonly { ref: string; outcome: 'ok' | 'gone' | 'failed' }[],
  nowMs: number,
): Promise<void> {
  if (results.length === 0) return;
  const nowIso = iso(nowMs);
  const hourAgo = iso(nowMs - HOUR * 1000);
  const dayAgo = iso(nowMs - DAY);
  await db.batch(
    results.map((r) =>
      r.outcome === 'gone'
        ? db.prepare('DELETE FROM partner_push WHERE subject_ref = ?').bind(r.ref)
        : db
            .prepare(
              `UPDATE partner_push SET
                 last_ok_at = CASE WHEN ? = 1 THEN ? ELSE last_ok_at END,
                 failed_at = CASE WHEN ? = 1 THEN NULL ELSE COALESCE(failed_at, ?) END,
                 hour_count = CASE WHEN hour_start IS NULL OR hour_start < ? THEN 1 ELSE hour_count + 1 END,
                 hour_start = CASE WHEN hour_start IS NULL OR hour_start < ? THEN ? ELSE hour_start END,
                 day_count = CASE WHEN day_start IS NULL OR day_start < ? THEN 1 ELSE day_count + 1 END,
                 day_start = CASE WHEN day_start IS NULL OR day_start < ? THEN ? ELSE day_start END
               WHERE subject_ref = ?`,
            )
            .bind(
              r.outcome === 'ok' ? 1 : 0,
              nowIso,
              r.outcome === 'ok' ? 1 : 0,
              nowIso,
              hourAgo,
              hourAgo,
              nowIso,
              dayAgo,
              dayAgo,
              nowIso,
              r.ref,
            ),
    ),
  );
}

/**
 * Read-only aggregate queries for the staff dashboard (ADR 0018). Counts only: no query here returns
 * a pseudonym, name, email, group name, code or position. Days are India time (UTC+05:30); stored
 * times are UTC ISO-8601, so each query shifts them by 330 minutes before taking the date.
 */
const IST = "'+330 minutes'";
const istDay = (column: string) => `substr(datetime(${column}, ${IST}), 1, 10)`;

export interface DayRow {
  readonly day: string;
  readonly opens: number;
  readonly installs: number;
  readonly signIns: number;
  readonly newSignIns: number;
  readonly groupsCreated: number;
  readonly joins: number;
}

export interface Growth {
  readonly days: readonly DayRow[];
  readonly opensByLocale: Readonly<Record<'te' | 'en' | 'hi', number>>;
}

export interface Live {
  readonly opensThisHour: number;
  readonly opensLastHour: number;
  readonly signInsLastHour: number;
  readonly activeGroups: number;
  readonly crowd: readonly { ghatId: string; level: string; reportedAt: string }[];
}

export interface GroupStats {
  readonly active: number;
  readonly members: number;
  readonly full: number;
  readonly named: number;
  readonly endingSoon: number;
  readonly removals: number;
  readonly createdTotal: number;
}

export interface TableCounts {
  readonly [table: string]: number;
}

/** Every India-time day from `from` to `to` inclusive (YYYY-MM-DD). */
export function dayList(from: string, to: string): readonly string[] {
  const days: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end && days.length < 366; t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

type Counted = { day: string; n: number };

async function perDay(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<Map<string, number>> {
  const rows = (
    await db
      .prepare(sql)
      .bind(...params)
      .all<Counted>()
  ).results;
  return new Map(rows.map((r) => [r.day, r.n]));
}

export async function growth(db: D1Database, from: string, to: string): Promise<Growth> {
  const between = `BETWEEN ? AND ?`;
  const [opens, installs, signIns, newSignIns, groupsCreated, joins, locales] = await Promise.all([
    perDay(
      db,
      `SELECT period AS day, SUM(n) AS n FROM daily_metric
       WHERE metric = 'open' AND length(period) = 10 AND period ${between} GROUP BY period`,
      from,
      to,
    ),
    perDay(
      db,
      `SELECT period AS day, SUM(n) AS n FROM daily_metric
       WHERE metric = 'install' AND length(period) = 10 AND period ${between} GROUP BY period`,
      from,
      to,
    ),
    perDay(
      db,
      `SELECT ${istDay('created_at')} AS day, COUNT(*) AS n FROM session
       WHERE ${istDay('created_at')} ${between} GROUP BY day`,
      from,
      to,
    ),
    perDay(
      db,
      `SELECT ${istDay('first')} AS day, COUNT(*) AS n
       FROM (SELECT MIN(created_at) AS first FROM session GROUP BY subject_ref)
       WHERE ${istDay('first')} ${between} GROUP BY day`,
      from,
      to,
    ),
    perDay(
      db,
      `SELECT ${istDay('created_at')} AS day, COUNT(*) AS n FROM group_
       WHERE ${istDay('created_at')} ${between} GROUP BY day`,
      from,
      to,
    ),
    perDay(
      db,
      `SELECT ${istDay('joined_at')} AS day, COUNT(*) AS n FROM membership
       WHERE role = 'member' AND ${istDay('joined_at')} ${between} GROUP BY day`,
      from,
      to,
    ),
    db
      .prepare(
        `SELECT locale, SUM(n) AS n FROM daily_metric
         WHERE metric = 'open' AND length(period) = 10 AND period ${between} GROUP BY locale`,
      )
      .bind(from, to)
      .all<{ locale: 'te' | 'en' | 'hi'; n: number }>(),
  ]);
  const byLocale = { te: 0, en: 0, hi: 0 };
  for (const row of locales.results) byLocale[row.locale] = row.n;
  return {
    days: dayList(from, to).map((day) => ({
      day,
      opens: opens.get(day) ?? 0,
      installs: installs.get(day) ?? 0,
      signIns: signIns.get(day) ?? 0,
      newSignIns: newSignIns.get(day) ?? 0,
      groupsCreated: groupsCreated.get(day) ?? 0,
      joins: joins.get(day) ?? 0,
    })),
    opensByLocale: byLocale,
  };
}

async function count(db: D1Database, sql: string, ...params: unknown[]): Promise<number> {
  const row = await db
    .prepare(sql)
    .bind(...params)
    .first<{ n: number | null }>();
  return row?.n ?? 0;
}

export async function live(
  db: D1Database,
  nowIso: string,
  hourNow: string,
  hourBefore: string,
): Promise<Live> {
  const hourAgo = new Date(Date.parse(nowIso) - 3_600_000).toISOString();
  const [opensThisHour, opensLastHour, signInsLastHour, activeGroups, crowd] = await Promise.all([
    count(db, `SELECT SUM(n) AS n FROM daily_metric WHERE metric = 'open' AND period = ?`, hourNow),
    count(
      db,
      `SELECT SUM(n) AS n FROM daily_metric WHERE metric = 'open' AND period = ?`,
      hourBefore,
    ),
    count(db, 'SELECT COUNT(*) AS n FROM session WHERE created_at > ?', hourAgo),
    count(db, "SELECT COUNT(*) AS n FROM group_ WHERE state = 'active' AND expires_at > ?", nowIso),
    db
      .prepare('SELECT ghat_id, level, reported_at FROM crowd_reading ORDER BY ghat_id LIMIT 50')
      .all<{ ghat_id: string; level: string; reported_at: string }>(),
  ]);
  return {
    opensThisHour,
    opensLastHour,
    signInsLastHour,
    activeGroups,
    crowd: crowd.results.map((r) => ({
      ghatId: r.ghat_id,
      level: r.level,
      reportedAt: r.reported_at,
    })),
  };
}

export async function groupStats(
  db: D1Database,
  nowIso: string,
  maxMembers: number,
): Promise<GroupStats> {
  const soon = new Date(Date.parse(nowIso) + 48 * 3_600_000).toISOString();
  const activeWhere = "g.state = 'active' AND g.expires_at > ?";
  const [active, members, full, named, endingSoon, removals, createdTotal] = await Promise.all([
    count(db, `SELECT COUNT(*) AS n FROM group_ g WHERE ${activeWhere}`, nowIso),
    count(
      db,
      `SELECT COUNT(*) AS n FROM membership m JOIN group_ g ON g.id = m.group_id WHERE ${activeWhere}`,
      nowIso,
    ),
    count(
      db,
      `SELECT COUNT(*) AS n FROM (SELECT g.id FROM group_ g JOIN membership m ON m.group_id = g.id
         WHERE ${activeWhere} GROUP BY g.id HAVING COUNT(*) >= ?)`,
      nowIso,
      maxMembers,
    ),
    count(
      db,
      `SELECT COUNT(*) AS n FROM group_ g WHERE ${activeWhere} AND g.name IS NOT NULL`,
      nowIso,
    ),
    count(
      db,
      `SELECT COUNT(*) AS n FROM group_ g WHERE ${activeWhere} AND g.expires_at <= ?`,
      nowIso,
      soon,
    ),
    count(db, 'SELECT COUNT(*) AS n FROM group_block'),
    count(db, 'SELECT COUNT(*) AS n FROM group_'),
  ]);
  return { active, members, full, named, endingSoon, removals, createdTotal };
}

const TABLES = [
  'session',
  'consent_ledger',
  'group_',
  'membership',
  'invitation',
  'group_block',
  'crowd_reading',
  'daily_metric',
] as const;

export async function tableCounts(db: D1Database): Promise<TableCounts> {
  const counts = await Promise.all(
    TABLES.map(
      async (table) => [table, await count(db, `SELECT COUNT(*) AS n FROM ${table}`)] as const,
    ),
  );
  return Object.fromEntries(counts);
}

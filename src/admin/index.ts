import { growth, groupStats, live, tableCounts } from '../db/adminStats';
import { istPeriods } from '../http/istTime';
import type { KeyLookup } from '../security/accessJwt';
import { admit, type AdminAccessEnv } from './access';
import {
  ADMIN_CSS,
  growthBody,
  groupsBody,
  liveBody,
  moreBody,
  page,
  partnersBody,
  type Range,
  type Tab,
} from './render';

/**
 * Staff admin dashboard Worker (ADR 0018). A separate Worker on its own address, behind Cloudflare
 * Access; it binds the same D1 database as the app and only reads from it. Every request is admitted
 * by `admit` first; nothing is shown without a verified Access token.
 */
export interface AdminEnv extends AdminAccessEnv {
  readonly DB?: D1Database;
  /** Shown on the More tab, e.g. "staging". */
  readonly ENVIRONMENT_NAME?: string;
}

export interface AdminDeps {
  readonly lookupKey?: KeyLookup;
  readonly nowMs?: () => number;
}

const MAX_MEMBERS = 10;
const CROWD_STALE_MINUTES = 30;
const TABS: readonly Tab[] = ['growth', 'live', 'groups', 'partners', 'more'];
const RANGES: readonly Range[] = ['today', '7d', '30d', 'day'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
} as const;

function respond(body: string, status: number, type: string): Response {
  return new Response(body, {
    status,
    headers: { ...SECURITY_HEADERS, 'Content-Type': `${type}; charset=utf-8` },
  });
}

function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function istClock(nowMs: number): string {
  return new Date(nowMs + 5.5 * 3_600_000).toISOString().slice(11, 16);
}

export async function handleAdmin(
  request: Request,
  env: AdminEnv,
  deps: AdminDeps = {},
): Promise<Response> {
  const nowMs = (deps.nowMs ?? (() => Date.now()))();
  const admission = await admit(request, env, Math.floor(nowMs / 1000), deps.lookupKey);
  if (!admission.ok) {
    return respond(
      admission.status === 503 ? 'The dashboard is not available.' : 'Not allowed.',
      admission.status,
      'text/plain',
    );
  }
  if (request.method !== 'GET') return respond('Method not allowed.', 405, 'text/plain');

  const url = new URL(request.url);
  if (url.pathname === '/admin.css') {
    return new Response(ADMIN_CSS, {
      headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/css; charset=utf-8' },
    });
  }
  if (url.pathname !== '/') return respond('Not found.', 404, 'text/plain');

  const db = env.DB;
  if (db === undefined) return respond('The database is not connected.', 503, 'text/plain');

  const tabParam = url.searchParams.get('tab') ?? 'growth';
  const tab: Tab = (TABS as readonly string[]).includes(tabParam) ? (tabParam as Tab) : 'growth';
  const nowSeconds = Math.floor(nowMs / 1000);
  const [today, hourNow] = istPeriods(nowSeconds);
  const updated = `Updated ${istClock(nowMs)} IST`;

  try {
    if (tab === 'growth') {
      const rangeParam = url.searchParams.get('range') ?? '7d';
      const range: Range = (RANGES as readonly string[]).includes(rangeParam)
        ? (rangeParam as Range)
        : '7d';
      const dayParam = url.searchParams.get('day') ?? today;
      const day = DAY.test(dayParam) && dayParam <= today ? dayParam : today;
      const [from, to] =
        range === 'today'
          ? [today, today]
          : range === '30d'
            ? [shiftDay(today, -29), today]
            : range === 'day'
              ? [day, day]
              : [shiftDay(today, -6), today];
      const data = await growth(db, from, to);
      return respond(
        page(
          { tab, title: 'Growth', subtitle: 'App opens, sign-ins and groups', updated },
          growthBody(data, range, day, today),
        ),
        200,
        'text/html',
      );
    }
    if (tab === 'live') {
      const [, hourBefore] = istPeriods(nowSeconds - 3600);
      const data = await live(db, new Date(nowMs).toISOString(), hourNow, hourBefore);
      return respond(
        page(
          { tab, title: 'Live', subtitle: 'Right now', updated, refreshSeconds: 30 },
          liveBody(data, nowMs, CROWD_STALE_MINUTES),
        ),
        200,
        'text/html',
      );
    }
    if (tab === 'groups') {
      const data = await groupStats(db, new Date(nowMs).toISOString(), MAX_MEMBERS);
      return respond(
        page(
          { tab, title: 'Groups', subtitle: 'Families and parties using My Group', updated },
          groupsBody(data, MAX_MEMBERS),
        ),
        200,
        'text/html',
      );
    }
    if (tab === 'partners') {
      return respond(
        page(
          { tab, title: 'Partners', subtitle: 'Priests and volunteers', updated },
          partnersBody(),
        ),
        200,
        'text/html',
      );
    }
    const counts = await tableCounts(db);
    return respond(
      page(
        { tab, title: 'More', subtitle: 'System and data', updated },
        moreBody(counts, env.ENVIRONMENT_NAME ?? 'unknown', admission.subject),
      ),
      200,
      'text/html',
    );
  } catch {
    return respond('The dashboard could not read the database.', 503, 'text/plain');
  }
}

export default {
  fetch(request: Request, env: AdminEnv): Promise<Response> {
    return handleAdmin(request, env);
  },
} satisfies ExportedHandler<AdminEnv>;

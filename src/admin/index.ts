import {
  decidePartner,
  partnerOverview,
  pushTargets,
  purgeDuePartnerData,
  recordPushResults,
  sendNudge,
  setUpdateHidden,
} from '../db/adminPartners';
import { PUBLISHED_CONTENT } from '../content/publishedContent';
import { growth, groupStats, live, tableCounts } from '../db/adminStats';
import { istPeriods } from '../http/istTime';
import type { KeyLookup } from '../security/accessJwt';
import { admit, type AdminAccessEnv } from './access';
import { pushConfig, sendToTargets } from './push';
import {
  ADMIN_CSS,
  growthBody,
  groupsBody,
  liveBody,
  moreBody,
  page,
  PARTNER_NOTICES,
  partnersBody,
  type Range,
  type Tab,
} from './render';

/**
 * Staff admin dashboard Worker (ADR 0018). A separate Worker on its own address, behind Cloudflare
 * Access; it binds the same D1 database as the app. It reads aggregates, and since ADR 0019 it has
 * exactly three write actions on partner data (decide, nudge, hide), each a same-origin form POST
 * carrying a token derived from the Access token. Every request is admitted by `admit` first;
 * nothing is shown or changed without a verified Access token.
 */
export interface AdminEnv extends AdminAccessEnv {
  readonly DB?: D1Database;
  /** Shown on the More tab, e.g. "staging". */
  readonly ENVIRONMENT_NAME?: string;
  /** Partners (ADR 0019): the Partners tab can change data only when this is exactly `enabled`. */
  readonly FLAG_PARTNERS?: string;
  /** Partner phone notifications (ADR 0020); also needs the three VAPID values (see push.ts). */
  readonly FLAG_PARTNER_PUSH?: string;
  readonly VAPID_PRIVATE_KEY?: string;
  readonly VAPID_PUBLIC_KEY?: string;
  readonly VAPID_SUBJECT?: string;
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

const FORM_BODY_MAX = 2048;
// Counts shown after a nudge: sent, failed, left to the inbox. Digits only, so nothing is reflected.
const PUSH_PARAM = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const REF = /^[A-Za-z0-9_-]{8,128}$/;
const ID = /^[a-f0-9]{32}$/;
const GHAT = /^[a-z0-9][a-z0-9/-]{0,63}$/;
const WRITE_PATHS = ['/partners/decide', '/partners/nudge', '/partners/hide'];

/** Token for the forms: unknown to another site because it is derived from this session's Access token. */
async function csrfToken(jwt: string | null): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`admin-csrf.v1|${jwt ?? ''}`),
  );
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The published ghats (the same ids partners choose in the app), for the nudge dropdown. */
function ghatChoices(): { id: string; name: string }[] {
  return PUBLISHED_CONTENT.ghats.dataset.items.flatMap((item) => {
    const { id, name } = item;
    return typeof id === 'string' && typeof name === 'string' && GHAT.test(id)
      ? [{ id, name }]
      : [];
  });
}

function backToPartners(notice: string, push?: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      ...SECURITY_HEADERS,
      Location: `/?tab=partners&notice=${notice}${push === undefined ? '' : `&push=${push}`}`,
    },
  });
}

/** The three partner write actions. Anything unexpected is refused before the database is touched. */
async function partnerWrite(
  request: Request,
  env: AdminEnv,
  path: string,
  admin: string,
  nowMs: number,
): Promise<Response> {
  if (env.FLAG_PARTNERS !== 'enabled') return respond('Not found.', 404, 'text/plain');
  // The page sends Referrer-Policy: no-referrer, and some browsers then send "Origin: null" on a
  // same-origin form post. Sec-Fetch-Site is set by the browser and cannot be forged by a page, so
  // it is accepted in that case. Anything else must carry this Worker's own origin.
  const origin = request.headers.get('Origin');
  const sameSite =
    origin === new URL(request.url).origin ||
    ((origin === null || origin === 'null') &&
      request.headers.get('Sec-Fetch-Site') === 'same-origin');
  if (!sameSite) return respond('Not allowed (origin).', 403, 'text/plain');
  if (
    !(request.headers.get('Content-Type') ?? '')
      .toLowerCase()
      .startsWith('application/x-www-form-urlencoded')
  ) {
    return respond('Not allowed.', 415, 'text/plain');
  }
  const text = await request.text();
  if (text.length > FORM_BODY_MAX) return respond('Too large.', 413, 'text/plain');
  const form = new URLSearchParams(text);
  const given = form.get('csrf') ?? '';
  const expected = await csrfToken(request.headers.get('Cf-Access-Jwt-Assertion'));
  if (!sameText(given, expected))
    return respond('Not allowed (token). Reload the page and try again.', 403, 'text/plain');
  const db = env.DB;
  if (db === undefined) return respond('The database is not connected.', 503, 'text/plain');

  try {
    if (path === '/partners/decide') {
      const ref = form.get('ref') ?? '';
      const choice = form.get('do');
      if (!REF.test(ref) || (choice !== 'approve' && choice !== 'reject' && choice !== 'suspend')) {
        return backToPartners('invalid');
      }
      const done = await decidePartner(db, admin, ref, choice, nowMs);
      return backToPartners(
        done
          ? { approve: 'approved', reject: 'rejected', suspend: 'suspended' }[choice]
          : 'invalid',
      );
    }
    if (path === '/partners/nudge') {
      const kind = form.get('kind');
      const ghat = (form.get('ghat') ?? '').trim();
      if (
        (kind !== 'crowd' && kind !== 'river' && kind !== 'food') ||
        (ghat !== '' && !GHAT.test(ghat))
      ) {
        return backToPartners('invalid');
      }
      const ghatId = ghat === '' ? null : ghat;
      const sent = await sendNudge(db, admin, kind, ghatId, nowMs);
      if (!sent) return backToPartners('limit');
      // Phone notifications are best effort: the nudge is already in every inbox (ADR 0020).
      const config = pushConfig(env);
      if (config === null) return backToPartners('nudged');
      try {
        const { targets, more } = await pushTargets(db, ghatId, nowMs);
        const { results, run } = await sendToTargets(targets, config, Math.floor(nowMs / 1000));
        await recordPushResults(db, results, nowMs);
        return backToPartners(
          'nudged',
          [run.sent, run.failed + run.gone, more].map(String).join('.'),
        );
      } catch {
        return backToPartners('nudged', '0.0.0');
      }
    }
    const id = form.get('id') ?? '';
    const choice = form.get('do');
    if (!ID.test(id) || (choice !== 'hide' && choice !== 'show')) return backToPartners('invalid');
    const done = await setUpdateHidden(db, admin, id, choice === 'hide', nowMs);
    return backToPartners(done ? (choice === 'hide' ? 'hidden' : 'shown') : 'invalid');
  } catch {
    return respond('The change could not be saved.', 503, 'text/plain');
  }
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
  const url = new URL(request.url);
  if (request.method === 'POST' && WRITE_PATHS.includes(url.pathname)) {
    return partnerWrite(request, env, url.pathname, admission.subject, nowMs);
  }
  if (request.method !== 'GET') return respond('Method not allowed.', 405, 'text/plain');

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
      const writable = env.FLAG_PARTNERS === 'enabled';
      // Retention rules run when staff look (ADR 0019), only where partners are switched on.
      if (writable) await purgeDuePartnerData(db, nowMs);
      const noticeParam = url.searchParams.get('notice');
      return respond(
        page(
          { tab, title: 'Partners', subtitle: 'Priests and volunteers', updated },
          partnersBody({
            data: await partnerOverview(db, nowMs),
            csrf: await csrfToken(request.headers.get('Cf-Access-Jwt-Assertion')),
            writable,
            notice: noticeParam !== null && noticeParam in PARTNER_NOTICES ? noticeParam : null,
            push: PUSH_PARAM.exec(url.searchParams.get('push') ?? ''),
            ghats: ghatChoices(),
            nowMs,
          }),
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

import { groupJoinCode, randomId, sha256Hex } from '../db/ids';
import type { ConsentPurpose, CrowdLevel, Repository, SosCategory } from '../db/repository';
import { envFlags } from '../flags';
import { istPeriods } from '../http/istTime';
import { handlePartners, PARTNER_PATHS } from './partners';
import type { KeyFetcher } from '../security/googleIdToken';
import { memoryRateLimiter, type RateLimiter } from '../security/rateLimit';
import {
  clearedSessionCookie,
  readCookie,
  readSessionToken,
  SESSION_COOKIE,
} from '../security/session';

/**
 * Pilgrim-owned and intake routes, version 1. Reserved prefix `/api/v1/` (ADR 0012 section 7).
 *
 *   GET    /api/v1/me                  signed-in person and their consent history
 *   DELETE /api/v1/me                  erase everything held for the person, clear the cookie
 *   GET    /api/v1/me/consents         consent history
 *   POST   /api/v1/me/consents         record a grant or withdrawal (append-only)
 *   GET    /api/v1/groups              groups the person belongs to           [flag FLAG_GROUPS]
 *   POST   /api/v1/groups              create a group (optional name), code   [flag FLAG_GROUPS]
 *   POST   /api/v1/groups/join         join with a code                       [flag FLAG_GROUPS]
 *   POST   /api/v1/groups/{id}/invite  owner gets the group's (permanent) code [flag FLAG_GROUPS]
 *   POST   /api/v1/groups/{id}/leave   leave a group                          [flag FLAG_GROUPS]
 *   POST   /api/v1/groups/{id}/remove  owner removes a member by handle       [flag FLAG_GROUPS]
 *   POST   /api/v1/groups/{id}/rename  owner changes the (required, unique) name [flag FLAG_GROUPS]
 *   GET    /api/v1/groups/{id}/members everyone in the group: handle, role, first name [FLAG_GROUPS]
 *   GET    /api/v1/groups/{id}/live    WebSocket to the in-memory live room   [+ FLAG_GROUP_LOCATION]
 *   POST   /api/v1/ping                count one app open or install         [flag FLAG_METRICS]
 *   /api/v1/partners/...               priests and volunteers (ADR 0019)      [flag FLAG_PARTNERS]
 *   POST   /api/v1/sos                 SOS intake, no sign-in, no location    [flag FLAG_SOS]
 *   GET    /api/v1/crowd               latest crowd level per ghat, public    [flag FLAG_CROWD]
 *   POST   /api/v1/crowd               report a level, bearer token only      [flag FLAG_CROWD]
 *
 * Everything fails closed: a flag that is not exactly `enabled` answers 404; a missing database or
 * session secret answers 503 and never pretends to have stored or sent anything. Ownership comes from
 * the signed session. No coordinates or free text are accepted or stored; the only person name kept is
 * a group member's first name, taken from the signed session (never from the request). Errors use the fixed
 * envelope with reviewed constant messages that never echo input.
 */
export const V1_PREFIX = '/api/v1/';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const MAX_BODY_BYTES = 2048;
const GROUP_LIFETIME_SECONDS = 14 * 24 * 60 * 60; // PROPOSAL: should match the event window (BF-08).
/** One code per group for its whole life (owner decision 2026-11-23); the 10-member limit caps joins. */
const INVITE_USES = 10_000;
const GROUP_ID = /^[a-z2-7]{26}$/;
const GROUP_ACTION = /^\/groups\/[a-z2-7]{26}\/(invite|leave|live|remove|members|rename)$/;
/** Longest first name kept for a member (ADR 0017, migration 0009). */
const MEMBER_NAME_MAX = 20;

/** The first word of the sign-in name, at most 20 characters, or null when there is none. */
export function memberFirstName(raw: string): string | null {
  const first = raw.normalize('NFC').trim().split(/\s+/)[0] ?? '';
  // At most 20 code points, as SQLite's length() counts them (the column's CHECK).
  let clipped = '';
  let count = 0;
  for (const char of first) {
    if (count === MEMBER_NAME_MAX) break;
    clipped += char;
    count++;
  }
  return clipped === '' ? null : clipped;
}
const MEMBER_HANDLE = /^[a-f0-9]{16}$/;
/** Group name: letters and digits in any script (with their combining marks), single spaces, 16 max. */
const GROUP_NAME = /^[\p{L}\p{M}\p{N}]+(?: [\p{L}\p{M}\p{N}]+)*$/u;
export const GROUP_NAME_MAX = 16;

/** Characters as SQLite's length() counts them (Unicode code points). */
function codePoints(text: string): number {
  let count = 0;
  for (const char of text) if (char !== '') count++;
  return count;
}

/** The cleaned group name, null for none, or undefined when it is not allowed. */
export function cleanGroupName(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  const name = raw.normalize('NFC').trim().replaceAll(/\s+/g, ' ');
  if (name === '') return null;
  if (codePoints(name) > GROUP_NAME_MAX || !GROUP_NAME.test(name)) return undefined;
  return name;
}
/** The browser push public key, only while phone notifications are switched on (ADR 0020). */
function pushKey(env: object, on: boolean): string | undefined {
  const key = (env as { VAPID_PUBLIC_KEY?: unknown }).VAPID_PUBLIC_KEY;
  return on && typeof key === 'string' && key !== '' ? key : undefined;
}
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
const JOIN_CODE = /^[A-HJKMNP-Z2-9]{8}$/;
const PURPOSES: readonly ConsentPurpose[] = [
  'sign-in',
  'group',
  'pass',
  'notifications',
  'partner',
];
const SOS_CATEGORIES: readonly SosCategory[] = ['medical', 'lost', 'crowd', 'other'];
const LOCALES = ['te', 'en', 'hi'] as const;
const CROWD_LEVELS: readonly CrowdLevel[] = ['low', 'moderate', 'high'];
const GHAT_ID = /^[a-z0-9][a-z0-9/-]{0,63}$/;
/** A reading older than this is not shown: the app reports "No data" rather than a stale level. */
export const CROWD_STALE_AFTER_SECONDS = 30 * 60;

const MESSAGES = {
  INVALID_REQUEST: 'The request is not valid.',
  NOT_SIGNED_IN: 'Sign in is required.',
  FORBIDDEN: 'The request is not allowed.',
  UNAUTHORIZED: 'A valid reporting token is required.',
  NOT_FOUND: 'Not found.',
  METHOD_NOT_ALLOWED: 'Method not allowed.',
  UNSUPPORTED_MEDIA_TYPE: 'Send JSON.',
  TOO_LARGE: 'The request is too large.',
  RATE_LIMITED: 'Too many requests. Try again shortly.',
  UNAVAILABLE: 'The service is not available.',
  INVALID_CODE: 'The code is not valid or has expired.',
  ALREADY_MEMBER: 'Already a member.',
  GROUP_FULL: 'The group is full.',
  INVALID_NAME: 'Use up to 16 letters or digits.',
  NAME_REQUIRED: 'Enter a group name.',
  NAME_TAKEN: 'That group name is already taken.',
} as const;
type ErrorCode = keyof typeof MESSAGES;

function fail(code: ErrorCode, status: number, extra: Record<string, string> = {}): Response {
  return Response.json(
    { error: { code, message: MESSAGES[code] } },
    { status, headers: { ...NO_STORE, ...extra } },
  );
}

function ok(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export interface V1Deps {
  readonly env: object;
  readonly repo: Repository | undefined;
  readonly sessionSecret: string | undefined;
  /** Bearer token allowed to report crowd levels. Unset means reporting is unavailable (503). */
  readonly crowdIngestToken?: string | undefined;
  /** The live-room Durable Object namespace (ADR 0017). Absent means live sharing is unavailable. */
  readonly groupLocation?: DurableObjectNamespace | undefined;
  /** Google sign-in settings, used only to re-verify a partner applicant (ADR 0019). */
  readonly googleClientId?: string | undefined;
  readonly googleKeys?: KeyFetcher | undefined;
  readonly sosLimiter?: RateLimiter;
  readonly limiter?: RateLimiter;
  readonly nowSeconds?: () => number;
}

const defaultSosLimiter = memoryRateLimiter(10, 60);
const defaultLimiter = memoryRateLimiter(60, 60);

function sameOrigin(request: Request): boolean {
  return request.headers.get('Origin') === new URL(request.url).origin;
}

const iso = (seconds: number): string => new Date(seconds * 1000).toISOString();

async function readJsonObject(request: Request): Promise<Record<string, unknown> | Response> {
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
    return fail('UNSUPPORTED_MEDIA_TYPE', 415);
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return fail('TOO_LARGE', 413);
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return fail('INVALID_REQUEST', 400);
    }
    return value as Record<string, unknown>;
  } catch {
    return fail('INVALID_REQUEST', 400);
  }
}

/** True when the object has exactly these keys (unknown fields are rejected, ADR 0012 section 7). */
function hasOnlyKeys(body: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(body);
  return actual.length === keys.length && keys.every((k) => actual.includes(k));
}

interface Signed {
  readonly subjectRef: string;
  readonly name: string;
}

async function requireSession(
  request: Request,
  deps: V1Deps,
  repo: Repository,
  now: number,
): Promise<Signed | Response> {
  const secret = deps.sessionSecret;
  const token = readCookie(request.headers.get('Cookie'), SESSION_COOKIE);
  if (secret === undefined || secret === '' || token === null) return fail('NOT_SIGNED_IN', 401);
  const session = await readSessionToken(token, secret, now);
  if (session?.sid === undefined) return fail('NOT_SIGNED_IN', 401);
  const active = await repo.isSessionActive(await sha256Hex(session.sid), session.id, iso(now));
  if (!active) return fail('NOT_SIGNED_IN', 401);
  return { subjectRef: session.id, name: session.name };
}

/** Counts one app open or install. Nothing about the person or device is kept (ADR 0018). */
async function ping(request: Request, repo: Repository, now: number): Promise<Response> {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'POST' });
  if (!sameOrigin(request)) return fail('FORBIDDEN', 403);
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const { event, locale } = body;
  if (
    !hasOnlyKeys(body, ['event', 'locale']) ||
    (event !== 'open' && event !== 'install') ||
    typeof locale !== 'string' ||
    !(LOCALES as readonly string[]).includes(locale)
  ) {
    return fail('INVALID_REQUEST', 400);
  }
  await repo.countMetric(istPeriods(now), event, locale as 'te' | 'en' | 'hi');
  return new Response(null, { status: 204, headers: NO_STORE });
}

async function sos(request: Request, repo: Repository, now: number): Promise<Response> {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'POST' });
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  if (!hasOnlyKeys(body, ['requestId', 'category'])) return fail('INVALID_REQUEST', 400);
  const { requestId, category } = body;
  if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) {
    return fail('INVALID_REQUEST', 400);
  }
  if (typeof category !== 'string' || !SOS_CATEGORIES.includes(category as SosCategory)) {
    return fail('INVALID_REQUEST', 400);
  }
  const result = await repo.insertSos({
    requestHash: await sha256Hex(`sos.v1|${requestId}`),
    category: category as SosCategory,
    createdAt: iso(now),
  });
  // "received" is all this route can honestly say: staff alerting and SMS are not wired (OQ-035,
  // provider undecided). The page must not show "confirmed" or "help is coming" from this reply.
  return ok({ status: 'received', reference: result.id }, 202);
}

/** Equal-length comparison that does not stop at the first different character. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function crowd(
  request: Request,
  deps: V1Deps,
  repo: Repository,
  now: number,
): Promise<Response> {
  if (request.method === 'GET') {
    const since = iso(now - CROWD_STALE_AFTER_SECONDS);
    const readings = await repo.listCrowdReadings(since);
    return ok({
      staleAfterSeconds: CROWD_STALE_AFTER_SECONDS,
      ghats: Object.fromEntries(
        readings.map((r) => [r.ghatId, { level: r.level, reportedAt: r.reportedAt }]),
      ),
    });
  }
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'GET, POST' });

  const expected = deps.crowdIngestToken;
  if (expected === undefined || expected === '') return fail('UNAVAILABLE', 503);
  const header = request.headers.get('Authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  // Hash both sides so the comparison length never depends on the secret.
  const matches = sameText(
    await sha256Hex(`crowd.v1|${given}`),
    await sha256Hex(`crowd.v1|${expected}`),
  );
  if (!matches) return fail('UNAUTHORIZED', 401, { 'WWW-Authenticate': 'Bearer' });

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  if (!hasOnlyKeys(body, ['ghatId', 'level'])) return fail('INVALID_REQUEST', 400);
  const { ghatId, level } = body;
  if (typeof ghatId !== 'string' || !GHAT_ID.test(ghatId)) return fail('INVALID_REQUEST', 400);
  if (typeof level !== 'string' || !CROWD_LEVELS.includes(level as CrowdLevel)) {
    return fail('INVALID_REQUEST', 400);
  }
  await repo.upsertCrowdReading({ ghatId, level: level as CrowdLevel, reportedAt: iso(now) });
  return ok({ recorded: true }, 201);
}

async function me(
  request: Request,
  deps: V1Deps,
  repo: Repository,
  now: number,
  rest: string,
): Promise<Response> {
  const signed = await requireSession(request, deps, repo, now);
  if (signed instanceof Response) return signed;

  if (rest === '') {
    if (request.method === 'GET') {
      return ok({ name: signed.name, consents: await repo.listConsent(signed.subjectRef) });
    }
    if (request.method === 'DELETE') {
      if (!sameOrigin(request)) return fail('FORBIDDEN', 403);
      const erased = await repo.eraseSubject(signed.subjectRef);
      const headers = new Headers(NO_STORE);
      headers.append('Set-Cookie', clearedSessionCookie());
      return Response.json({ erased }, { headers });
    }
    return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'GET, DELETE' });
  }

  if (rest === '/consents') {
    if (request.method === 'GET') {
      return ok({ consents: await repo.listConsent(signed.subjectRef) });
    }
    if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'GET, POST' });
    if (!sameOrigin(request)) return fail('FORBIDDEN', 403);
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;
    if (!hasOnlyKeys(body, ['purposeId', 'noticeVersion', 'locale', 'decision'])) {
      return fail('INVALID_REQUEST', 400);
    }
    const { purposeId, noticeVersion, locale, decision } = body;
    if (
      typeof purposeId !== 'string' ||
      !PURPOSES.includes(purposeId as ConsentPurpose) ||
      typeof noticeVersion !== 'string' ||
      !/^[A-Za-z0-9._-]{1,40}$/.test(noticeVersion) ||
      typeof locale !== 'string' ||
      !(LOCALES as readonly string[]).includes(locale) ||
      (decision !== 'granted' && decision !== 'withdrawn')
    ) {
      return fail('INVALID_REQUEST', 400);
    }
    await repo.recordConsent(signed.subjectRef, {
      purposeId: purposeId as ConsentPurpose,
      noticeVersion,
      locale: locale as 'te' | 'en' | 'hi',
      decision,
      at: iso(now),
    });
    return ok({ recorded: true }, 201);
  }
  return fail('NOT_FOUND', 404);
}

/** Per-group member handle: the same person gets an unrelated handle in each group. */
export async function memberHandle(groupId: string, subjectRef: string): Promise<string> {
  return (await sha256Hex(`member.v1|${groupId}|${subjectRef}`)).slice(0, 16);
}

function roomFor(ns: DurableObjectNamespace, groupId: string): DurableObjectStub {
  return ns.get(ns.idFromName(groupId));
}

/** Closes a leaver's or removed member's live connections at once. Best effort: memory only. */
async function kickFromRoom(
  deps: V1Deps,
  groupId: string,
  handle: string,
  reason: 'left' | 'removed',
): Promise<void> {
  const ns = deps.groupLocation;
  if (ns === undefined) return;
  try {
    await roomFor(ns, groupId).fetch(`https://room/kick?reason=${reason}`, {
      method: 'POST',
      headers: { 'X-PM-Member': handle },
    });
  } catch {
    // The room may not exist; nothing is stored there either way.
  }
}

/** Opens the WebSocket to the group's live room after sign-in and membership checks (ADR 0017). */
async function live(
  request: Request,
  deps: V1Deps,
  repo: Repository,
  now: number,
  signed: Signed,
  groupId: string,
): Promise<Response> {
  if (request.method !== 'GET') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'GET' });
  if (!envFlags(deps.env).isEnabled('group-location')) return fail('NOT_FOUND', 404);
  if ((request.headers.get('Upgrade') ?? '').toLowerCase() !== 'websocket') {
    return fail('INVALID_REQUEST', 426, { Upgrade: 'websocket' });
  }
  if (!sameOrigin(request)) return fail('FORBIDDEN', 403);
  // Not a member, or the group is closed or gone: the same answer, so ids cannot be probed.
  const role = await repo.memberRole(signed.subjectRef, groupId, iso(now));
  if (role === null) return fail('NOT_FOUND', 404);
  const ns = deps.groupLocation;
  if (ns === undefined) return fail('UNAVAILABLE', 503);
  // A fresh request: nothing the client sent is forwarded except the upgrade itself.
  return roomFor(ns, groupId).fetch('https://room/live', {
    headers: {
      Upgrade: 'websocket',
      'X-PM-Member': await memberHandle(groupId, signed.subjectRef),
      'X-PM-Name': signed.name,
      'X-PM-Role': role,
    },
  });
}

/** The owner removes a member, named by their per-group handle as shown in the live room. */
async function removeMember(
  request: Request,
  deps: V1Deps,
  repo: Repository,
  now: number,
  signed: Signed,
  groupId: string,
): Promise<Response> {
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const handle = body['member'];
  if (!hasOnlyKeys(body, ['member']) || typeof handle !== 'string' || !MEMBER_HANDLE.test(handle)) {
    return fail('INVALID_REQUEST', 400);
  }
  // Not the owner, the group is closed or gone, or no such member: the same answer every time.
  const refs = await repo.listMembersForOwner(signed.subjectRef, groupId, iso(now));
  if (refs === null) return fail('NOT_FOUND', 404);
  let target: string | undefined;
  for (const ref of refs) {
    if ((await memberHandle(groupId, ref)) === handle) target = ref;
  }
  if (target === undefined || !(await repo.removeMember(groupId, target, iso(now)))) {
    return fail('NOT_FOUND', 404);
  }
  await kickFromRoom(deps, groupId, handle, 'removed');
  return new Response(null, { status: 204, headers: NO_STORE });
}

/**
 * Everyone in the group, for its members only: per-group handle, role and first name. Never the
 * pseudonym, email or anything about position; who is online comes from the live room.
 */
async function members(
  request: Request,
  repo: Repository,
  now: number,
  signed: Signed,
  groupId: string,
): Promise<Response> {
  if (request.method !== 'GET') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'GET' });
  // Not a member, or the group is closed or gone: the same answer, so ids cannot be probed.
  const rows = await repo.listMembers(signed.subjectRef, groupId, iso(now));
  if (rows === null) return fail('NOT_FOUND', 404);
  return ok({
    members: await Promise.all(
      rows.map(async (row) => ({
        id: await memberHandle(groupId, row.subjectRef),
        name: row.name ?? '',
        role: row.role,
        you: row.subjectRef === signed.subjectRef,
      })),
    ),
  });
}

async function groups(
  request: Request,
  deps: V1Deps,
  repo: Repository,
  now: number,
  rest: string,
): Promise<Response> {
  const signed = await requireSession(request, deps, repo, now);
  if (signed instanceof Response) return signed;

  const secret = deps.sessionSecret ?? '';
  /** The group's permanent code, made acceptable to the join route if it is not yet. */
  const codeFor = async (groupId: string, expiresIso: string): Promise<string> => {
    const code = await groupJoinCode(secret, groupId);
    await repo.ensureInvitation(
      groupId,
      await sha256Hex(`join.v1|${code}`),
      expiresIso,
      INVITE_USES,
    );
    return code;
  };

  const firstName = memberFirstName(signed.name);

  if (rest === '') {
    if (request.method === 'GET') {
      const list = await repo.listGroups(signed.subjectRef, iso(now));
      const withCodes = await Promise.all(
        list.map(async (group) => {
          if (group.state !== 'active') return group;
          // Keeps the person's first name current for the member list (and fills it for older groups).
          await repo.setMemberName(group.id, signed.subjectRef, firstName);
          return { ...group, joinCode: await codeFor(group.id, group.expiresAt) };
        }),
      );
      return ok({ groups: withCodes });
    }
    if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'GET, POST' });
    if (!sameOrigin(request)) return fail('FORBIDDEN', 403);
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;
    const keys = Object.keys(body);
    if (keys.length > 1 || (keys.length === 1 && keys[0] !== 'name')) {
      return fail('INVALID_REQUEST', 400);
    }
    const name = cleanGroupName(body['name']);
    if (name === undefined) return fail('INVALID_NAME', 400);
    // A group needs a name (owner decision 2026-11-28), and no two active groups share one.
    if (name === null) return fail('NAME_REQUIRED', 400);
    if (await repo.groupNameTaken(name)) return fail('NAME_TAKEN', 409);
    const id = randomId();
    const code = await groupJoinCode(secret, id);
    const expires = iso(now + GROUP_LIFETIME_SECONDS);
    try {
      await repo.createGroup(
        id,
        signed.subjectRef,
        name,
        iso(now),
        expires,
        await sha256Hex(`join.v1|${code}`),
        expires,
        INVITE_USES,
      );
    } catch (error) {
      // Two people choosing the same name at the same moment: the unique index refuses the second.
      if (await repo.groupNameTaken(name)) return fail('NAME_TAKEN', 409);
      throw error;
    }
    await repo.setMemberName(id, signed.subjectRef, firstName);
    return ok({ id, joinCode: code }, 201);
  }

  if (rest === '/join') {
    if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'POST' });
    if (!sameOrigin(request)) return fail('FORBIDDEN', 403);
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;
    if (!hasOnlyKeys(body, ['code']) || typeof body['code'] !== 'string') {
      return fail('INVALID_REQUEST', 400);
    }
    const code = body['code'].toUpperCase().replaceAll(/[\s-]/g, '');
    if (!JOIN_CODE.test(code)) return fail('INVALID_CODE', 400);
    const result = await repo.joinWithCode(
      signed.subjectRef,
      await sha256Hex(`join.v1|${code}`),
      iso(now),
    );
    if (result.ok) {
      await repo.setMemberName(result.groupId, signed.subjectRef, firstName);
      return ok({ id: result.groupId });
    }
    if (result.reason === 'already_member') return fail('ALREADY_MEMBER', 409);
    if (result.reason === 'full') return fail('GROUP_FULL', 409);
    return fail('INVALID_CODE', 400);
  }

  const match = /^\/([a-z2-7]{26})\/(invite|leave|live|remove|members|rename)$/.exec(rest);
  if (match !== null) {
    const id = match[1] ?? '';
    if (!GROUP_ID.test(id)) return fail('NOT_FOUND', 404);
    if (match[2] === 'live') return live(request, deps, repo, now, signed, id);
    if (match[2] === 'members') return members(request, repo, now, signed, id);
    if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'POST' });
    if (!sameOrigin(request)) return fail('FORBIDDEN', 403);
    if (match[2] === 'leave') {
      if (!(await repo.leaveGroup(signed.subjectRef, id))) return fail('NOT_FOUND', 404);
      await kickFromRoom(deps, id, await memberHandle(id, signed.subjectRef), 'left');
      return new Response(null, { status: 204, headers: NO_STORE });
    }
    if (match[2] === 'remove') return removeMember(request, deps, repo, now, signed, id);
    if (match[2] === 'rename') {
      // Only the owner of an active group may rename it; anyone else gets the same answer as a wrong id.
      const body = await readJsonObject(request);
      if (body instanceof Response) return body;
      if (!hasOnlyKeys(body, ['name'])) return fail('INVALID_REQUEST', 400);
      const name = cleanGroupName(body['name']);
      if (name === undefined) return fail('INVALID_NAME', 400);
      if (name === null) return fail('NAME_REQUIRED', 400);
      const owned = await repo.listGroups(signed.subjectRef, iso(now));
      if (!owned.some((g) => g.id === id && g.role === 'owner' && g.state === 'active')) {
        return fail('NOT_FOUND', 404);
      }
      if (await repo.groupNameTaken(name, id)) return fail('NAME_TAKEN', 409);
      try {
        if (!(await repo.renameGroup(id, name))) return fail('NOT_FOUND', 404);
      } catch (error) {
        if (await repo.groupNameTaken(name, id)) return fail('NAME_TAKEN', 409);
        throw error;
      }
      return new Response(null, { status: 204, headers: NO_STORE });
    }
    // The group keeps one code; the owner just gets it again. Not the owner, or the group is closed
    // or gone: the same answer, so ids cannot be probed.
    const groups = await repo.listGroups(signed.subjectRef, iso(now));
    const mine = groups.find((g) => g.id === id && g.role === 'owner' && g.state === 'active');
    if (mine === undefined) return fail('NOT_FOUND', 404);
    return ok({ joinCode: await codeFor(id, mine.expiresAt) }, 201);
  }
  return fail('NOT_FOUND', 404);
}

export async function handleV1(request: Request, deps: V1Deps): Promise<Response> {
  const { pathname } = new URL(request.url);
  const path = pathname.slice(V1_PREFIX.length - 1); // keeps the leading slash
  const flags = envFlags(deps.env);
  const now = (deps.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();

  const isSos = path === '/sos';
  const isPing = path === '/ping';
  const isCrowd = path === '/crowd';
  const isGroups = path === '/groups' || path.startsWith('/groups/');
  const isPartners = PARTNER_PATHS.includes(path);
  const isMe = path === '/me' || path === '/me/consents';
  // Unknown paths are 404 before any flag, limiter, database or session is consulted.
  const knownGroups = path === '/groups' || path === '/groups/join' || GROUP_ACTION.test(path);
  if (!isSos && !isPing && !isCrowd && !isMe && !isPartners && !(isGroups && knownGroups)) {
    return fail('NOT_FOUND', 404);
  }
  if (isPing && !flags.isEnabled('metrics')) return fail('NOT_FOUND', 404);
  if (isSos && !flags.isEnabled('sos')) return fail('NOT_FOUND', 404);
  if (isGroups && !flags.isEnabled('groups')) return fail('NOT_FOUND', 404);
  if (isCrowd && !flags.isEnabled('crowd')) return fail('NOT_FOUND', 404);
  if (isPartners && !flags.isEnabled('partners')) return fail('NOT_FOUND', 404);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const limiter = isSos ? (deps.sosLimiter ?? defaultSosLimiter) : (deps.limiter ?? defaultLimiter);
  if (!(await limiter.allow(`${isSos ? 'sos' : 'v1'}|${ip}`, now))) {
    return fail('RATE_LIMITED', 429, { 'Retry-After': '60' });
  }

  // Without a database nothing can be stored, so say so. Never answer as if it were saved.
  const repo = deps.repo;
  if (repo === undefined) return fail('UNAVAILABLE', 503);
  try {
    if (isSos) return await sos(request, repo, now);
    if (isPing) return await ping(request, repo, now);
    if (isCrowd) return await crowd(request, deps, repo, now);
    if (isPartners) {
      return await handlePartners(
        {
          request,
          repo,
          now,
          sessionSecret: deps.sessionSecret,
          googleClientId: deps.googleClientId,
          googleKeys: deps.googleKeys,
          requireSession: () => requireSession(request, deps, repo, now),
          readJson: () => readJsonObject(request),
          hasOnlyKeys,
          sameOrigin: () => sameOrigin(request),
          pushPublicKey: pushKey(deps.env, flags.isEnabled('partner-push')),
          recordPushConsent: (subjectRef, locale, decision) =>
            repo.recordConsent(subjectRef, {
              purposeId: 'partner_push',
              noticeVersion: 'partner-push-1',
              locale,
              decision,
              at: iso(now),
            }),
          recordConsent: (subjectRef, locale) =>
            repo.recordConsent(subjectRef, {
              purposeId: 'partner',
              noticeVersion: 'partner-1',
              locale,
              decision: 'granted',
              at: iso(now),
            }),
        },
        path,
      );
    }
    if (isGroups) return await groups(request, deps, repo, now, path.slice('/groups'.length));
    return await me(request, deps, repo, now, path.slice('/me'.length));
  } catch {
    return fail('UNAVAILABLE', 503);
  }
}

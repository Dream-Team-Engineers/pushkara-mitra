import { randomJoinCode, sha256Hex } from '../db/ids';
import type { ConsentPurpose, Repository, SosCategory } from '../db/repository';
import { envFlags } from '../flags';
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
 *   POST   /api/v1/groups              create a group, returns a join code    [flag FLAG_GROUPS]
 *   POST   /api/v1/groups/join         join with a code                       [flag FLAG_GROUPS]
 *   POST   /api/v1/groups/{id}/invite  owner issues another join code         [flag FLAG_GROUPS]
 *   POST   /api/v1/groups/{id}/leave   leave a group                          [flag FLAG_GROUPS]
 *   POST   /api/v1/sos                 SOS intake, no sign-in, no location    [flag FLAG_SOS]
 *
 * Everything fails closed: a flag that is not exactly `enabled` answers 404; a missing database or
 * session secret answers 503 and never pretends to have stored or sent anything. Ownership comes from
 * the signed session. No coordinates, names or free text are accepted or stored. Errors use the fixed
 * envelope with reviewed constant messages that never echo input.
 */
export const V1_PREFIX = '/api/v1/';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const MAX_BODY_BYTES = 2048;
const GROUP_LIFETIME_SECONDS = 14 * 24 * 60 * 60; // PROPOSAL: should match the event window (BF-08).
const INVITE_LIFETIME_SECONDS = 24 * 60 * 60;
const INVITE_USES = 20;
const GROUP_ID = /^[a-z2-7]{26}$/;
const GROUP_ACTION = /^\/groups\/[a-z2-7]{26}\/(invite|leave)$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
const JOIN_CODE = /^[A-HJKMNP-Z2-9]{8}$/;
const PURPOSES: readonly ConsentPurpose[] = ['sign-in', 'group', 'pass', 'notifications'];
const SOS_CATEGORIES: readonly SosCategory[] = ['medical', 'lost', 'crowd', 'other'];
const LOCALES = ['te', 'en', 'hi'] as const;

const MESSAGES = {
  INVALID_REQUEST: 'The request is not valid.',
  NOT_SIGNED_IN: 'Sign in is required.',
  FORBIDDEN: 'The request is not allowed.',
  NOT_FOUND: 'Not found.',
  METHOD_NOT_ALLOWED: 'Method not allowed.',
  UNSUPPORTED_MEDIA_TYPE: 'Send JSON.',
  TOO_LARGE: 'The request is too large.',
  RATE_LIMITED: 'Too many requests. Try again shortly.',
  UNAVAILABLE: 'The service is not available.',
  INVALID_CODE: 'The code is not valid or has expired.',
  ALREADY_MEMBER: 'Already a member.',
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

async function groups(
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
      return ok({ groups: await repo.listGroups(signed.subjectRef, iso(now)) });
    }
    if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'GET, POST' });
    if (!sameOrigin(request)) return fail('FORBIDDEN', 403);
    const code = randomJoinCode();
    const id = await repo.createGroup(
      signed.subjectRef,
      iso(now),
      iso(now + GROUP_LIFETIME_SECONDS),
      await sha256Hex(`join.v1|${code}`),
      iso(now + INVITE_LIFETIME_SECONDS),
      INVITE_USES,
    );
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
    if (result.ok) return ok({ id: result.groupId });
    return result.reason === 'already_member'
      ? fail('ALREADY_MEMBER', 409)
      : fail('INVALID_CODE', 400);
  }

  const match = /^\/([a-z2-7]{26})\/(invite|leave)$/.exec(rest);
  if (match !== null) {
    const id = match[1] ?? '';
    if (!GROUP_ID.test(id)) return fail('NOT_FOUND', 404);
    if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405, { Allow: 'POST' });
    if (!sameOrigin(request)) return fail('FORBIDDEN', 403);
    if (match[2] === 'leave') {
      return (await repo.leaveGroup(signed.subjectRef, id))
        ? new Response(null, { status: 204, headers: NO_STORE })
        : fail('NOT_FOUND', 404);
    }
    const code = randomJoinCode();
    const created = await repo.createInvitation(
      signed.subjectRef,
      id,
      await sha256Hex(`join.v1|${code}`),
      iso(now + INVITE_LIFETIME_SECONDS),
      INVITE_USES,
      iso(now),
    );
    // Not the owner, or the group is closed or gone: the same answer, so ids cannot be probed.
    return created ? ok({ joinCode: code }, 201) : fail('NOT_FOUND', 404);
  }
  return fail('NOT_FOUND', 404);
}

export async function handleV1(request: Request, deps: V1Deps): Promise<Response> {
  const { pathname } = new URL(request.url);
  const path = pathname.slice(V1_PREFIX.length - 1); // keeps the leading slash
  const flags = envFlags(deps.env);
  const now = (deps.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();

  const isSos = path === '/sos';
  const isGroups = path === '/groups' || path.startsWith('/groups/');
  const isMe = path === '/me' || path === '/me/consents';
  // Unknown paths are 404 before any flag, limiter, database or session is consulted.
  const knownGroups = path === '/groups' || path === '/groups/join' || GROUP_ACTION.test(path);
  if (!isSos && !isMe && !(isGroups && knownGroups)) return fail('NOT_FOUND', 404);
  if (isSos && !flags.isEnabled('sos')) return fail('NOT_FOUND', 404);
  if (isGroups && !flags.isEnabled('groups')) return fail('NOT_FOUND', 404);

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
    if (isGroups) return await groups(request, deps, repo, now, path.slice('/groups'.length));
    return await me(request, deps, repo, now, path.slice('/me'.length));
  } catch {
    return fail('UNAVAILABLE', 503);
  }
}

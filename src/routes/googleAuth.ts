import { randomId, sha256Hex } from '../db/ids';
import type { Repository } from '../db/repository';
import { googleKeyFetcher, verifyGoogleIdToken, type KeyFetcher } from '../security/googleIdToken';
import {
  AUTH_WINDOW_SECONDS,
  memoryRateLimiter,
  unlimited,
  type RateLimiter,
} from '../security/rateLimit';
import {
  clearedNonceCookie,
  clearedSessionCookie,
  createNonce,
  createSessionToken,
  NONCE_COOKIE,
  nonceCookie,
  readCookie,
  readNonce,
  readSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  pseudonymFor,
  sessionCookie,
} from '../security/session';

/**
 * Sign-in routes. They exist only where GOOGLE_CLIENT_ID is configured (staging first).
 *
 *   GET  /api/auth/nonce                                           ->  { nonce } (sets a short-lived signed cookie)
 *   POST /api/auth/google  { "credential": "<Google ID token>" }  ->  { name, email, remembered }
 *   GET  /api/auth/me                                              ->  { remembered: true, name } or 401
 *   POST /api/auth/logout                                          ->  204, session cookie cleared
 *
 * Stateless: the Worker verifies the Google token, and, when SESSION_SECRET is set, hands back a
 * signed HttpOnly cookie so the person stays signed in on that device. Nothing is stored on the
 * server and nothing is logged. Without SESSION_SECRET the person stays signed in only while the
 * page is open ("remembered": false). The cookie holds a pseudonymous ID and the display name (never
 * the email), so /api/auth/me returns the name but not the email: the page keeps the email from the
 * sign-in response in memory only. Every route is rate limited per client IP (429 with Retry-After).
 */
export const AUTH_PREFIX = '/api/auth/';
export const GOOGLE_AUTH_PATH = '/api/auth/google';
const MAX_BODY_BYTES = 8192;
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function fail(status: number, error: string, extra: Record<string, string> = {}): Response {
  return Response.json({ error }, { status, headers: { ...NO_STORE, ...extra } });
}

export interface AuthDeps {
  readonly clientId: string | undefined;
  readonly sessionSecret: string | undefined;
  readonly getKeys?: KeyFetcher;
  readonly nowSeconds?: () => number;
  readonly limiter?: RateLimiter;
  /** When present, sessions are recorded server-side so they can be revoked (sign-out, erasure). */
  readonly repo?: Repository;
}

const defaultLimiter = memoryRateLimiter();

/** Browsers always send Origin on a same-origin POST, so a missing or foreign Origin is refused. */
function sameOrigin(request: Request): boolean {
  return request.headers.get('Origin') === new URL(request.url).origin;
}

async function nonce(deps: AuthDeps, now: number): Promise<Response> {
  const secret = deps.sessionSecret;
  if (secret === undefined || secret === '') {
    return Response.json({ nonce: null }, { headers: NO_STORE });
  }
  const cookieValue = await createNonce(secret, now);
  const headers = new Headers(NO_STORE);
  headers.append('Set-Cookie', nonceCookie(cookieValue));
  return Response.json({ nonce: cookieValue.split('.')[0] }, { headers });
}

async function signIn(request: Request, deps: AuthDeps, now: number): Promise<Response> {
  if (!sameOrigin(request)) return fail(403, 'forbidden');
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
    return fail(415, 'unsupported_media_type');
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return fail(413, 'too_large');
  let credential: unknown;
  try {
    credential = (JSON.parse(text) as { credential?: unknown }).credential;
  } catch {
    return fail(400, 'bad_request');
  }
  if (typeof credential !== 'string') return fail(400, 'bad_request');

  const secret = deps.sessionSecret;
  const remembered = secret !== undefined && secret !== '';
  let expectedNonce: string | undefined;
  if (remembered) {
    // Replay protection: the token must carry the nonce from this browser's signed nonce cookie.
    const cookie = readCookie(request.headers.get('Cookie'), NONCE_COOKIE);
    const value = cookie === null ? null : await readNonce(cookie, secret, now);
    if (value === null) return fail(401, 'invalid_token');
    expectedNonce = value;
  }

  const user = await verifyGoogleIdToken(credential, {
    clientId: deps.clientId ?? '',
    nowSeconds: now,
    getKeys: deps.getKeys ?? googleKeyFetcher(() => Math.floor(Date.now() / 1000)),
    ...(expectedNonce === undefined ? {} : { expectedNonce }),
  });
  if (user === null) return fail(401, 'invalid_token');

  const headers = new Headers(NO_STORE);
  if (remembered) {
    let sid: string | undefined;
    if (deps.repo !== undefined) {
      sid = randomId();
      try {
        await deps.repo.createSession({
          idHash: await sha256Hex(sid),
          subjectRef: await pseudonymFor(user.sub, secret),
          createdAt: new Date(now * 1000).toISOString(),
          expiresAt: new Date((now + SESSION_MAX_AGE_SECONDS) * 1000).toISOString(),
        });
      } catch {
        return fail(503, 'unavailable'); // Never issue a cookie the server cannot revoke.
      }
    }
    headers.append('Set-Cookie', sessionCookie(await createSessionToken(user, secret, now, sid)));
    headers.append('Set-Cookie', clearedNonceCookie());
  }
  return Response.json({ name: user.name, email: user.email, remembered }, { headers });
}

async function me(request: Request, deps: AuthDeps, now: number): Promise<Response> {
  const secret = deps.sessionSecret;
  const token = readCookie(request.headers.get('Cookie'), SESSION_COOKIE);
  if (secret === undefined || secret === '' || token === null) return fail(401, 'not_signed_in');
  const session = await readSessionToken(token, secret, now);
  if (session === null) return fail(401, 'not_signed_in');
  if (deps.repo !== undefined) {
    // With a database, only a session the server still holds (and has not revoked) signs anyone in.
    try {
      const active =
        session.sid !== undefined &&
        (await deps.repo.isSessionActive(
          await sha256Hex(session.sid),
          session.id,
          new Date(now * 1000).toISOString(),
        ));
      if (!active) return fail(401, 'not_signed_in');
    } catch {
      return fail(503, 'unavailable');
    }
  }
  return Response.json({ remembered: true, name: session.name }, { headers: NO_STORE });
}

async function logout(request: Request, deps: AuthDeps, now: number): Promise<Response> {
  if (!sameOrigin(request)) return fail(403, 'forbidden');
  const secret = deps.sessionSecret;
  const token = readCookie(request.headers.get('Cookie'), SESSION_COOKIE);
  if (deps.repo !== undefined && secret !== undefined && secret !== '' && token !== null) {
    const session = await readSessionToken(token, secret, now);
    if (session?.sid !== undefined) {
      try {
        await deps.repo.revokeSession(
          await sha256Hex(session.sid),
          new Date(now * 1000).toISOString(),
        );
      } catch {
        return fail(503, 'unavailable'); // Do not claim sign-out when the server-side record remains.
      }
    }
  }
  const headers = new Headers(NO_STORE);
  headers.append('Set-Cookie', clearedSessionCookie());
  return new Response(null, { status: 204, headers });
}

export async function handleAuth(request: Request, deps: AuthDeps): Promise<Response> {
  if (deps.clientId === undefined || deps.clientId === '') {
    return new Response('Not Found', { status: 404, headers: NO_STORE });
  }
  const { pathname } = new URL(request.url);
  const now = (deps.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (!(await (deps.limiter ?? defaultLimiter).allow(ip, now))) {
    return fail(429, 'rate_limited', { 'Retry-After': String(AUTH_WINDOW_SECONDS) });
  }
  if (pathname === GOOGLE_AUTH_PATH) {
    return request.method === 'POST'
      ? signIn(request, deps, now)
      : fail(405, 'method_not_allowed', { Allow: 'POST' });
  }
  if (pathname === `${AUTH_PREFIX}nonce`) {
    return request.method === 'GET'
      ? nonce(deps, now)
      : fail(405, 'method_not_allowed', { Allow: 'GET' });
  }
  if (pathname === `${AUTH_PREFIX}me`) {
    return request.method === 'GET'
      ? me(request, deps, now)
      : fail(405, 'method_not_allowed', { Allow: 'GET' });
  }
  if (pathname === `${AUTH_PREFIX}logout`) {
    return request.method === 'POST'
      ? logout(request, deps, now)
      : fail(405, 'method_not_allowed', { Allow: 'POST' });
  }
  return new Response('Not Found', { status: 404, headers: NO_STORE });
}

/** Kept for callers and tests that use the original signature (no session cookie). */
export function handleGoogleAuth(
  request: Request,
  clientId: string | undefined,
  getKeys?: KeyFetcher,
  nowSeconds?: () => number,
  sessionSecret?: string,
): Promise<Response> {
  return handleAuth(request, {
    limiter: unlimited,
    clientId,
    sessionSecret,
    ...(getKeys === undefined ? {} : { getKeys }),
    ...(nowSeconds === undefined ? {} : { nowSeconds }),
  });
}

import { googleKeyFetcher, verifyGoogleIdToken, type KeyFetcher } from '../security/googleIdToken';
import {
  clearedSessionCookie,
  createSessionToken,
  readCookie,
  readSessionToken,
  SESSION_COOKIE,
  sessionCookie,
} from '../security/session';

/**
 * Sign-in routes. They exist only where GOOGLE_CLIENT_ID is configured (staging first).
 *
 *   POST /api/auth/google  { "credential": "<Google ID token>" }  ->  { name, email, remembered }
 *   GET  /api/auth/me                                              ->  { name, email } or 401
 *   POST /api/auth/logout                                          ->  204, session cookie cleared
 *
 * Stateless: the Worker verifies the Google token, and, when SESSION_SECRET is set, hands back a
 * signed HttpOnly cookie so the person stays signed in on that device. Nothing is stored on the
 * server and nothing is logged. Without SESSION_SECRET the person stays signed in only while the
 * page is open ("remembered": false).
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
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return origin === null || origin === new URL(request.url).origin;
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

  const user = await verifyGoogleIdToken(credential, {
    clientId: deps.clientId ?? '',
    nowSeconds: now,
    getKeys: deps.getKeys ?? googleKeyFetcher(() => Math.floor(Date.now() / 1000)),
  });
  if (user === null) return fail(401, 'invalid_token');

  const secret = deps.sessionSecret;
  const remembered = secret !== undefined && secret !== '';
  const headers = new Headers(NO_STORE);
  if (remembered)
    headers.append('Set-Cookie', sessionCookie(await createSessionToken(user, secret, now)));
  return Response.json({ ...user, remembered }, { headers });
}

async function me(request: Request, deps: AuthDeps, now: number): Promise<Response> {
  const secret = deps.sessionSecret;
  const token = readCookie(request.headers.get('Cookie'), SESSION_COOKIE);
  if (secret === undefined || secret === '' || token === null) return fail(401, 'not_signed_in');
  const user = await readSessionToken(token, secret, now);
  if (user === null) return fail(401, 'not_signed_in');
  return Response.json({ ...user, remembered: true }, { headers: NO_STORE });
}

function logout(request: Request): Response {
  if (!sameOrigin(request)) return fail(403, 'forbidden');
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
  if (pathname === GOOGLE_AUTH_PATH) {
    return request.method === 'POST'
      ? signIn(request, deps, now)
      : fail(405, 'method_not_allowed', { Allow: 'POST' });
  }
  if (pathname === `${AUTH_PREFIX}me`) {
    return request.method === 'GET'
      ? me(request, deps, now)
      : fail(405, 'method_not_allowed', { Allow: 'GET' });
  }
  if (pathname === `${AUTH_PREFIX}logout`) {
    return request.method === 'POST'
      ? logout(request)
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
    clientId,
    sessionSecret,
    ...(getKeys === undefined ? {} : { getKeys }),
    ...(nowSeconds === undefined ? {} : { nowSeconds }),
  });
}

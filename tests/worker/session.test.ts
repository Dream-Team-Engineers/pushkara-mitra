import { describe, expect, it } from 'vitest';
import worker from '../../src/index';
import { handleAuth } from '../../src/routes/googleAuth';
import {
  clearedSessionCookie,
  createSessionToken,
  pseudonymFor,
  readCookie,
  readSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionCookie,
} from '../../src/security/session';

const SECRET = 'test-secret-value-that-is-long-enough-0123456789';
const NOW = 1_800_000_000;
const USER = { sub: 'google-sub-1', name: 'Lakshmi Devi', email: 'pilgrim@example.com' };
const CLIENT_ID = 'client-123.apps.googleusercontent.com';

describe('session token', () => {
  it('round-trips a pseudonymous id and carries no personal data', async () => {
    const token = await createSessionToken(USER, SECRET, NOW);
    const session = await readSessionToken(token, SECRET, NOW + 60);
    expect(session?.id).toBeTruthy();
    const decoded = atob((token.split('.')[1] ?? '').replaceAll('-', '+').replaceAll('_', '/'));
    expect(decoded).not.toMatch(/@|Lakshmi|pilgrim|google-sub-1/);
    expect(await pseudonymFor('google-sub-1', SECRET)).toBe(session?.id);
    expect(await pseudonymFor('google-sub-2', SECRET)).not.toBe(session?.id);
  });

  it('expires after the maximum age', async () => {
    const token = await createSessionToken(USER, SECRET, NOW);
    expect(await readSessionToken(token, SECRET, NOW + SESSION_MAX_AGE_SECONDS - 1)).not.toBeNull();
    expect(await readSessionToken(token, SECRET, NOW + SESSION_MAX_AGE_SECONDS)).toBeNull();
  });

  it('rejects another secret, a tampered payload, a swapped signature and junk', async () => {
    const token = await createSessionToken(USER, SECRET, NOW);
    expect(await readSessionToken(token, 'another-secret-another-secret-12345', NOW)).toBeNull();
    const [version, payload, signature] = token.split('.') as [string, string, string];
    const forgedPayload = btoa(JSON.stringify({ s: 'admin', iat: NOW, exp: NOW + 999999 }))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
    expect(
      await readSessionToken(`${version}.${forgedPayload}.${signature}`, SECRET, NOW),
    ).toBeNull();
    expect(await readSessionToken(`v0.${payload}.${signature}`, SECRET, NOW)).toBeNull();
    expect(await readSessionToken(`${version}.${payload}.AAAA`, SECRET, NOW)).toBeNull();
    for (const bad of ['', 'a.b', 'a.b.c.d', '###', 'x'.repeat(3000)]) {
      expect(await readSessionToken(bad, SECRET, NOW)).toBeNull();
    }
    expect(await readSessionToken(token, '', NOW)).toBeNull();
  });

  it('builds a locked-down cookie and a clearing cookie', () => {
    const cookie = sessionCookie('abc');
    expect(cookie.startsWith(`${SESSION_COOKIE}=abc;`)).toBe(true);
    expect(SESSION_COOKIE.startsWith('__Host-')).toBe(true);
    for (const part of ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/']) {
      expect(cookie).toContain(part);
    }
    expect(cookie).not.toContain('Domain');
    expect(cookie).toContain(`Max-Age=${String(SESSION_MAX_AGE_SECONDS)}`);
    expect(clearedSessionCookie()).toContain('Max-Age=0');
  });

  it('reads one cookie out of several', () => {
    expect(readCookie('a=1; __Host-pm_session=tok.en.x; b=2', SESSION_COOKIE)).toBe('tok.en.x');
    expect(readCookie('a=1', SESSION_COOKIE)).toBeNull();
    expect(readCookie(null, SESSION_COOKIE)).toBeNull();
  });
});

const deps = (secret: string | undefined) => ({
  clientId: CLIENT_ID,
  sessionSecret: secret,
  nowSeconds: () => NOW,
});

function req(path: string, init: RequestInit = {}): Request {
  return new Request(`https://app.test${path}`, init);
}

describe('GET /api/auth/me', () => {
  it('confirms a valid cookie without any personal data, never cached', async () => {
    const token = await createSessionToken(USER, SECRET, NOW);
    const res = await handleAuth(
      req('/api/auth/me', { headers: { Cookie: `${SESSION_COOKIE}=${token}` } }),
      deps(SECRET),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ remembered: true });
  });

  it('answers 401 for no cookie, a bad cookie, an expired cookie or no secret', async () => {
    expect((await handleAuth(req('/api/auth/me'), deps(SECRET))).status).toBe(401);
    const bad = req('/api/auth/me', { headers: { Cookie: `${SESSION_COOKIE}=junk` } });
    expect((await handleAuth(bad, deps(SECRET))).status).toBe(401);
    const old = await createSessionToken(USER, SECRET, NOW - SESSION_MAX_AGE_SECONDS - 5);
    const expired = req('/api/auth/me', { headers: { Cookie: `${SESSION_COOKIE}=${old}` } });
    expect((await handleAuth(expired, deps(SECRET))).status).toBe(401);
    const fresh = await createSessionToken(USER, SECRET, NOW);
    const noSecret = req('/api/auth/me', { headers: { Cookie: `${SESSION_COOKIE}=${fresh}` } });
    expect((await handleAuth(noSecret, deps(undefined))).status).toBe(401);
  });

  it('is GET only', async () => {
    expect((await handleAuth(req('/api/auth/me', { method: 'POST' }), deps(SECRET))).status).toBe(
      405,
    );
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie with 204', async () => {
    const res = await handleAuth(
      req('/api/auth/logout', { method: 'POST', headers: { Origin: 'https://app.test' } }),
      deps(SECRET),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('refuses a foreign origin and the wrong method', async () => {
    const foreign = req('/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
    });
    expect((await handleAuth(foreign, deps(SECRET))).status).toBe(403);
    const noOrigin = req('/api/auth/logout', { method: 'POST' });
    expect((await handleAuth(noOrigin, deps(SECRET))).status).toBe(403);
    expect((await handleAuth(req('/api/auth/logout'), deps(SECRET))).status).toBe(405);
  });
});

describe('auth routes where sign-in is not configured', () => {
  it('are all 404 through the Worker (production)', async () => {
    for (const path of [
      '/api/auth/google',
      '/api/auth/me',
      '/api/auth/logout',
      '/api/auth/other',
    ]) {
      expect((await worker.fetch(req(path), {})).status).toBe(404);
    }
  });

  it('answers 404 for unknown auth paths where it is configured', async () => {
    expect((await handleAuth(req('/api/auth/other'), deps(SECRET))).status).toBe(404);
  });
});

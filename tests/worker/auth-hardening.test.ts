import { beforeAll, describe, expect, it } from 'vitest';
import { handleAuth } from '../../src/routes/googleAuth';
import {
  googleKeyFetcher,
  GOOGLE_JWKS_URL,
  resetKeyCache,
  verifyGoogleIdToken,
  type Jwk,
} from '../../src/security/googleIdToken';
import { memoryRateLimiter } from '../../src/security/rateLimit';

// Regression tests for the 18 Nov 2026 audit: H1 (key cache), H2 (rate limit), H3 and M1 (cookie
// contents, sub identity), M2 (nonce replay protection), M4 (Origin required).

const CLIENT_ID = 'client-123.apps.googleusercontent.com';
const SECRET = 'test-only-session-secret-not-real';
const NOW = 1_800_000_000;

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

let privateKey: CryptoKey;
let jwk: Jwk;
beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const exported = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
  privateKey = pair.privateKey;
  jwk = { kid: 'key-1', kty: 'RSA', alg: 'RS256', n: exported.n ?? '', e: exported.e ?? '' };
});

async function sign(extra: Record<string, unknown> = {}): Promise<string> {
  const head = b64url(JSON.stringify({ alg: 'RS256', kid: 'key-1', typ: 'JWT' }));
  const body = b64url(
    JSON.stringify({
      iss: 'https://accounts.google.com',
      aud: CLIENT_ID,
      exp: NOW + 3000,
      iat: NOW - 10,
      sub: 'google-sub-1',
      email: 'pilgrim@example.com',
      email_verified: true,
      name: 'Lakshmi Devi',
      ...extra,
    }),
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(new Uint8Array(signature))}`;
}

const deps = (limiter = memoryRateLimiter(1000, 60)) => ({
  clientId: CLIENT_ID,
  sessionSecret: SECRET,
  nowSeconds: () => NOW,
  getKeys: () => Promise.resolve([jwk]),
  limiter,
});

async function issueNonce(): Promise<{ cookie: string; nonce: string }> {
  const res = await handleAuth(new Request('https://app.test/api/auth/nonce'), deps());
  const cookie = (res.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';
  const body = await res.json<{ nonce: string }>();
  return { cookie, nonce: body.nonce };
}

function signIn(credential: string, cookie?: string): Request {
  return new Request('https://app.test/api/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://app.test',
      ...(cookie === undefined ? {} : { Cookie: cookie }),
    },
    body: JSON.stringify({ credential }),
  });
}

function sessionPayload(res: Response): { s: string } {
  const raw = (res.headers.getSetCookie().find((c) => c.startsWith('__Host-pm_session=')) ?? '')
    .split(';')[0]
    ?.split('=')[1];
  const payload = (raw ?? '').split('.')[1] ?? '';
  return JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/'))) as { s: string };
}

describe('H3 / M1: the session cookie holds only a pseudonymous id', () => {
  it('has no email, name or Google sub, and is stable for one sub when the email changes', async () => {
    const ids: string[] = [];
    for (const email of ['a@example.com', 'b@example.com']) {
      const { cookie, nonce } = await issueNonce();
      const res = await handleAuth(signIn(await sign({ email, nonce }), cookie), deps());
      expect(res.status).toBe(200);
      const raw = JSON.stringify(sessionPayload(res));
      expect(raw).not.toMatch(/@|Lakshmi|pilgrim|google-sub-1/);
      ids.push(sessionPayload(res).s);
    }
    expect(ids[0]).toBeTruthy();
    expect(ids[0]).toBe(ids[1]);
  });
});

describe('M2: nonce replay protection', () => {
  it('rejects a token with no nonce cookie, another browser nonce, or a forged nonce cookie', async () => {
    const { cookie, nonce } = await issueNonce();
    const token = await sign({ nonce });
    expect((await handleAuth(signIn(token), deps())).status).toBe(401);
    const other = await issueNonce();
    expect((await handleAuth(signIn(token, other.cookie), deps())).status).toBe(401);
    const forged = `__Host-pm_nonce=${nonce}.${String(NOW + 600)}.AAAA`;
    expect((await handleAuth(signIn(token, forged), deps())).status).toBe(401);
    expect((await handleAuth(signIn(await sign(), cookie), deps())).status).toBe(401);
    const ok = await handleAuth(signIn(token, cookie), deps());
    expect(ok.status).toBe(200);
    expect(ok.headers.getSetCookie().some((c) => c.startsWith('__Host-pm_nonce=; Max-Age=0'))).toBe(
      true,
    );
  });

  it('rejects an expired nonce cookie', async () => {
    const { cookie, nonce } = await issueNonce();
    const late = { ...deps(), nowSeconds: () => NOW + 601 };
    expect((await handleAuth(signIn(await sign({ nonce }), cookie), late)).status).toBe(401);
  });

  it('verifier requires the expected nonce', async () => {
    const options = { clientId: CLIENT_ID, nowSeconds: NOW, getKeys: () => Promise.resolve([jwk]) };
    const token = await sign({ nonce: 'n-1' });
    expect(await verifyGoogleIdToken(token, { ...options, expectedNonce: 'n-1' })).not.toBeNull();
    expect(await verifyGoogleIdToken(token, { ...options, expectedNonce: 'n-2' })).toBeNull();
    expect(
      await verifyGoogleIdToken(await sign(), { ...options, expectedNonce: 'n-1' }),
    ).toBeNull();
    expect(await verifyGoogleIdToken(await sign({ sub: undefined }), options)).toBeNull();
  });
});

describe('M4: Origin is required on POST', () => {
  it('refuses a sign-in POST with no Origin header', async () => {
    const request = new Request('https://app.test/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'x' }),
    });
    expect((await handleAuth(request, deps())).status).toBe(403);
  });
});

describe('H2: rate limiting on /api/auth/*', () => {
  it('answers 429 with Retry-After beyond the window limit, per client IP', async () => {
    const limiter = memoryRateLimiter(3, 60);
    const call = (ip: string) =>
      handleAuth(
        new Request('https://app.test/api/auth/me', { headers: { 'CF-Connecting-IP': ip } }),
        deps(limiter),
      );
    for (let index = 0; index < 3; index += 1) expect((await call('203.0.113.1')).status).toBe(401);
    const blocked = await call('203.0.113.1');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('60');
    expect((await call('203.0.113.2')).status).toBe(401);
  });

  it('opens a new window later', async () => {
    const limiter = memoryRateLimiter(1, 60);
    expect(await limiter.allow('k', NOW)).toBe(true);
    expect(await limiter.allow('k', NOW)).toBe(false);
    expect(await limiter.allow('k', NOW + 60)).toBe(true);
  });
});

describe('H1: googleKeyFetcher', () => {
  const t0 = 1_000_000;
  const keysBody = (kid: string) => JSON.stringify({ keys: [{ ...jwk, kid }] });
  const asFetch = (fn: (url: string) => Promise<Response>) => fn as unknown as typeof fetch;

  it('uses only fetch options Cloudflare Workers accept (redirect "error" threw on staging)', async () => {
    resetKeyCache();
    let redirect: unknown;
    const getKeys = googleKeyFetcher(() => t0, ((_url: string, init?: RequestInit) => {
      redirect = init?.redirect;
      return Promise.resolve(new Response(keysBody('k1')));
    }) as unknown as typeof fetch);
    await getKeys('k1');
    expect(['follow', 'manual']).toContain(redirect);
    expect(redirect).toBe('manual');
  });

  it('caches, refetches once for an unknown kid, then backs off', async () => {
    resetKeyCache();
    let now = t0;
    let calls = 0;
    let body = keysBody('k1');
    const getKeys = googleKeyFetcher(
      () => now,
      asFetch((url) => {
        expect(url).toBe(GOOGLE_JWKS_URL);
        calls += 1;
        return Promise.resolve(new Response(body));
      }),
    );
    expect((await getKeys('k1'))[0]?.kid).toBe('k1');
    expect((await getKeys('k1'))[0]?.kid).toBe('k1');
    expect(calls).toBe(1);
    now += 10;
    await getKeys('forged');
    expect(calls).toBe(1);
    now += 61;
    body = keysBody('k2');
    expect((await getKeys('k2'))[0]?.kid).toBe('k2');
    expect(calls).toBe(2);
    await getKeys('forged');
    expect(calls).toBe(2);
  });

  it('never serves a stale key past the hard limit when the fetch fails', async () => {
    resetKeyCache();
    let down = false;
    let now = t0;
    const getKeys = googleKeyFetcher(
      () => now,
      asFetch(() =>
        down ? Promise.reject(new Error('down')) : Promise.resolve(new Response(keysBody('k1'))),
      ),
    );
    expect(await getKeys('k1')).toHaveLength(1);
    down = true;
    now += 3000;
    expect(await getKeys('k1')).toHaveLength(1);
    now += 700;
    expect(await getKeys('k1')).toHaveLength(0);
  });

  it('treats a bad status, bad body, oversized body or empty key list as a failure', async () => {
    for (const bad of [
      () => new Response('x', { status: 500 }),
      () => new Response('not json'),
      () => new Response('x'.repeat(70_000)),
      () => new Response('{"keys":[]}'),
    ]) {
      resetKeyCache();
      const getKeys = googleKeyFetcher(
        () => t0,
        asFetch(() => Promise.resolve(bad())),
      );
      expect(await getKeys('k1')).toHaveLength(0);
    }
  });
});

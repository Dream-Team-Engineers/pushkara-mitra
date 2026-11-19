import { beforeAll, describe, expect, it } from 'vitest';
import worker from '../../src/index';
import { handleGoogleAuth } from '../../src/routes/googleAuth';
import { CONTENT_SECURITY_POLICY_GOOGLE, SECURITY_HEADERS } from '../../src/security/headers';
import { verifyGoogleIdToken, type Jwk } from '../../src/security/googleIdToken';

const CLIENT_ID = 'client-123.apps.googleusercontent.com';
const NOW = 1_800_000_000;

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

interface Pair {
  readonly privateKey: CryptoKey;
  readonly jwk: Jwk;
}

async function makePair(kid: string): Promise<Pair> {
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
  return {
    privateKey: pair.privateKey,
    jwk: { kid, kty: 'RSA', alg: 'RS256', n: exported.n ?? '', e: exported.e ?? '' },
  };
}

async function sign(
  pair: Pair,
  claims: Record<string, unknown>,
  header: Record<string, unknown> = {},
): Promise<string> {
  const head = b64url(JSON.stringify({ alg: 'RS256', kid: pair.jwk.kid, typ: 'JWT', ...header }));
  const body = b64url(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    pair.privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(new Uint8Array(signature))}`;
}

const GOOD = {
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  exp: NOW + 3000,
  iat: NOW - 10,
  sub: 'google-sub-1',
  email: 'pilgrim@example.com',
  email_verified: true,
  name: 'Lakshmi Devi',
};

let pair: Pair;
let other: Pair;
beforeAll(async () => {
  pair = await makePair('key-1');
  other = await makePair('key-1');
});

const opts = (keys: readonly Jwk[] = [pair.jwk]) => ({
  clientId: CLIENT_ID,
  nowSeconds: NOW,
  getKeys: () => Promise.resolve(keys),
});

describe('verifyGoogleIdToken', () => {
  it('accepts a valid token and returns the sub, name and email', async () => {
    expect(await verifyGoogleIdToken(await sign(pair, GOOD), opts())).toEqual({
      sub: 'google-sub-1',
      name: 'Lakshmi Devi',
      email: 'pilgrim@example.com',
    });
  });

  it('accepts the bare accounts.google.com issuer and falls back to the email name', async () => {
    const token = await sign(pair, { ...GOOD, iss: 'accounts.google.com', name: undefined });
    expect(await verifyGoogleIdToken(token, opts())).toEqual({
      sub: 'google-sub-1',
      name: 'pilgrim',
      email: 'pilgrim@example.com',
    });
  });

  it.each([
    ['a token for another app', { aud: 'someone-else' }],
    ['a wrong issuer', { iss: 'https://evil.example' }],
    ['an expired token', { exp: NOW - 600 }],
    ['a token issued in the future', { iat: NOW + 3600 }],
    ['an unverified email', { email_verified: false }],
    ['a missing email', { email: undefined }],
    ['a missing sub', { sub: undefined }],
  ])('rejects %s', async (_label, change) => {
    expect(await verifyGoogleIdToken(await sign(pair, { ...GOOD, ...change }), opts())).toBeNull();
  });

  it('rejects a token signed by a different key with the same kid', async () => {
    expect(await verifyGoogleIdToken(await sign(other, GOOD), opts())).toBeNull();
  });

  it('rejects an unknown kid, a non-RS256 algorithm and "none"', async () => {
    expect(
      await verifyGoogleIdToken(await sign(pair, GOOD, { kid: 'unknown' }), opts()),
    ).toBeNull();
    expect(await verifyGoogleIdToken(await sign(pair, GOOD, { alg: 'HS256' }), opts())).toBeNull();
    const unsigned = `${b64url(JSON.stringify({ alg: 'none', kid: 'key-1' }))}.${b64url(JSON.stringify(GOOD))}.`;
    expect(await verifyGoogleIdToken(unsigned, opts())).toBeNull();
  });

  it('rejects tampered, malformed, empty and oversized input without throwing', async () => {
    const token = await sign(pair, GOOD);
    const [head, , signature] = token.split('.') as [string, string, string];
    const forged = `${head}.${b64url(JSON.stringify({ ...GOOD, email: 'admin@example.com' }))}.${signature}`;
    expect(await verifyGoogleIdToken(forged, opts())).toBeNull();
    for (const bad of ['', 'a.b', 'a.b.c.d', '###.###.###', 'x'.repeat(5000)]) {
      expect(await verifyGoogleIdToken(bad, opts())).toBeNull();
    }
  });

  it('rejects everything when no client ID is configured', async () => {
    expect(
      await verifyGoogleIdToken(await sign(pair, GOOD), { ...opts(), clientId: '' }),
    ).toBeNull();
  });
});

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://app.test/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://app.test', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/auth/google', () => {
  const keys = () => Promise.resolve([pair.jwk]);
  const now = () => NOW;

  it('is a 404 where sign-in is not configured (production)', async () => {
    const res = await handleGoogleAuth(post({ credential: 'x' }), undefined, keys, now);
    expect(res.status).toBe(404);
    const viaWorker = await worker.fetch(post({ credential: 'x' }), {});
    expect(viaWorker.status).toBe(404);
  });

  it('sets a signed session cookie only when a session secret is configured', async () => {
    const token = await sign(pair, GOOD);
    const without = await handleGoogleAuth(post({ credential: token }), CLIENT_ID, keys, now);
    expect(without.headers.get('Set-Cookie')).toBeNull();
    expect(await without.json()).toEqual({
      name: 'Lakshmi Devi',
      email: 'pilgrim@example.com',
      remembered: false,
    });
    const issued = await handleGoogleAuth(
      new Request('https://app.test/api/auth/nonce'),
      CLIENT_ID,
      keys,
      now,
      'a-long-enough-secret-for-the-test-0123456789',
    );
    const nonceCookie = (issued.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';
    const { nonce } = await issued.json<{ nonce: string }>();
    const withSecret = await handleGoogleAuth(
      post({ credential: await sign(pair, { ...GOOD, nonce }) }, { Cookie: nonceCookie }),
      CLIENT_ID,
      keys,
      now,
      'a-long-enough-secret-for-the-test-0123456789',
    );
    const cookie = withSecret.headers.get('Set-Cookie') ?? '';
    expect(cookie).toContain('__Host-pm_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(await withSecret.json()).toMatchObject({ remembered: true });
  });

  it('answers 200 with name and email for a valid token, never cached', async () => {
    const res = await handleGoogleAuth(
      post({ credential: await sign(pair, GOOD) }),
      CLIENT_ID,
      keys,
      now,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(await res.json()).toEqual({
      name: 'Lakshmi Devi',
      email: 'pilgrim@example.com',
      remembered: false,
    });
  });

  it('answers 401 with no detail for a bad token', async () => {
    const res = await handleGoogleAuth(
      post({ credential: await sign(pair, { ...GOOD, aud: 'other' }) }),
      CLIENT_ID,
      keys,
      now,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_token' });
  });

  it('rejects wrong methods, content types, origins, bodies and sizes', async () => {
    const get = new Request('https://app.test/api/auth/google');
    expect((await handleGoogleAuth(get, CLIENT_ID, keys, now)).status).toBe(405);
    const text = new Request('https://app.test/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Origin: 'https://app.test' },
      body: '{}',
    });
    expect((await handleGoogleAuth(text, CLIENT_ID, keys, now)).status).toBe(415);
    const foreign = post({ credential: 'x' }, { Origin: 'https://evil.example' });
    expect((await handleGoogleAuth(foreign, CLIENT_ID, keys, now)).status).toBe(403);
    const noOrigin = new Request('https://app.test/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'x' }),
    });
    expect((await handleGoogleAuth(noOrigin, CLIENT_ID, keys, now)).status).toBe(403);
    expect((await handleGoogleAuth(post('not json'), CLIENT_ID, keys, now)).status).toBe(400);
    expect((await handleGoogleAuth(post({ credential: 5 }), CLIENT_ID, keys, now)).status).toBe(
      400,
    );
    expect(
      (await handleGoogleAuth(post({ credential: 'x'.repeat(9000) }), CLIENT_ID, keys, now)).status,
    ).toBe(413);
  });

  it('goes through the Worker with the Google-aware security headers only when configured', async () => {
    const configured = await worker.fetch(new Request('https://app.test/healthz'), {
      GOOGLE_CLIENT_ID: CLIENT_ID,
    });
    expect(configured.headers.get('Content-Security-Policy')).toBe(CONTENT_SECURITY_POLICY_GOOGLE);
    expect(configured.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
    const plain = await worker.fetch(new Request('https://app.test/healthz'), {});
    expect(plain.headers.get('Content-Security-Policy')).toBe(
      SECURITY_HEADERS['Content-Security-Policy'],
    );
    expect(plain.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
  });

  it('keeps the Google policy narrow: no inline or eval scripts, only the gsi paths', () => {
    // Only styles may be inline (Google's button); never scripts.
    expect(CONTENT_SECURITY_POLICY_GOOGLE.match(/unsafe-inline/g)).toHaveLength(1);
    expect(CONTENT_SECURITY_POLICY_GOOGLE).toContain(
      "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    );
    expect(CONTENT_SECURITY_POLICY_GOOGLE).not.toMatch(/script-src[^;]*unsafe/);
    expect(CONTENT_SECURITY_POLICY_GOOGLE).not.toContain('unsafe-eval');
    expect(CONTENT_SECURITY_POLICY_GOOGLE).toContain(
      "script-src 'self' https://accounts.google.com/gsi/client",
    );
    expect(CONTENT_SECURITY_POLICY_GOOGLE).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY_GOOGLE).toContain("default-src 'none'");
  });
});

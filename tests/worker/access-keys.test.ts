import { beforeAll, describe, expect, it } from 'vitest';
import { verifyAccessToken } from '../../src/security/accessJwt';
import {
  createAccessKeyLookup,
  KEYS_PATH,
  MAX_KEYS_BODY_CHARS,
} from '../../src/security/accessKeys';

/** Synthetic team and keys only. No network is used: every fetch is an injected fake. */
const ISSUER = 'https://synthetic-team.cloudflareaccess.com';

let publicJwk: JsonWebKey;
let privateKey: CryptoKey;

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
  publicJwk = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
  privateKey = pair.privateKey;
});

function body(kids: string[]): string {
  return JSON.stringify({
    keys: kids.map((kid) => ({
      kid,
      kty: 'RSA',
      alg: 'RS256',
      use: 'sig',
      n: publicJwk.n,
      e: publicJwk.e,
    })),
  });
}

interface Harness {
  readonly calls: Array<{ url: string; init: RequestInit }>;
  clock: number;
  respond: () => Response | Promise<Response>;
}
function harness(kids: string[] = ['k1']): Harness {
  const state: Harness = {
    calls: [],
    clock: 1_000_000,
    respond: () => new Response(body(kids), { headers: { 'Content-Type': 'application/json' } }),
  };
  return state;
}
function lookupFor(state: Harness, extra: { ttlMs?: number; minRefetchMs?: number } = {}) {
  return createAccessKeyLookup({
    issuer: ISSUER,
    now: () => state.clock,
    fetcher: (url, init) => {
      state.calls.push({ url, init });
      return Promise.resolve(state.respond());
    },
    ...extra,
  });
}

describe('fetches the configured team keys safely', () => {
  it('requests exactly the team certs URL with no redirects and a timeout', async () => {
    const state = harness();
    await lookupFor(state)('k1');
    expect(state.calls).toHaveLength(1);
    expect(state.calls[0]?.url).toBe(`${ISSUER}${KEYS_PATH}`);
    expect(state.calls[0]?.init.redirect).toBe('error');
    expect(state.calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
    expect(state.calls[0]?.init.method).toBe('GET');
  });

  it('refuses an issuer that is not an Access team domain', () => {
    for (const issuer of [
      '',
      'http://x.cloudflareaccess.com',
      'https://evil.example.com',
      `${ISSUER}/`,
    ]) {
      expect(() => createAccessKeyLookup({ issuer })).toThrow();
    }
  });

  it('returns only the public RSA fields', async () => {
    const jwk = await lookupFor(harness())('k1');
    expect(Object.keys(jwk ?? {}).sort()).toEqual(['alg', 'e', 'kty', 'n', 'use']);
  });
});

describe('caching and refetch limits', () => {
  it('serves cached keys until the TTL ends, then refetches', async () => {
    const state = harness();
    const lookup = lookupFor(state, { ttlMs: 1000 });
    await lookup('k1');
    state.clock += 999;
    await lookup('k1');
    expect(state.calls).toHaveLength(1);
    state.clock += 2;
    await lookup('k1');
    expect(state.calls).toHaveLength(2);
  });

  it('refetches once for an unknown kid, then not again within the minimum interval', async () => {
    const state = harness();
    const lookup = lookupFor(state, { ttlMs: 600_000, minRefetchMs: 60_000 });
    await lookup('k1');
    // Straight after a fetch an unknown kid does not trigger another one.
    expect(await lookup('forged-0')).toBeNull();
    expect(state.calls).toHaveLength(1);
    state.clock += 61_000;
    expect(await lookup('forged-1')).toBeNull();
    expect(state.calls).toHaveLength(2);
    for (let index = 0; index < 20; index += 1)
      expect(await lookup(`forged-${String(index + 2)}`)).toBeNull();
    expect(state.calls).toHaveLength(2);
    state.clock += 60_001;
    expect(await lookup('forged-late')).toBeNull();
    expect(state.calls).toHaveLength(3);
  });

  it('picks up a rotated key when an unknown kid appears after the interval', async () => {
    const state = harness(['k1']);
    const lookup = lookupFor(state, { ttlMs: 600_000, minRefetchMs: 60_000 });
    await lookup('k1');
    state.clock += 61_000;
    state.respond = () => new Response(body(['k1', 'k2']));
    expect(await lookup('k2')).not.toBeNull();
  });

  it('shares one request between simultaneous lookups', async () => {
    const state = harness();
    const lookup = lookupFor(state);
    const results = await Promise.all([lookup('k1'), lookup('k1'), lookup('k1')]);
    expect(results.every((jwk) => jwk !== null)).toBe(true);
    expect(state.calls).toHaveLength(1);
  });
});

describe('fails closed', () => {
  it('throws on network failure, bad status, bad JSON, wrong shape, no usable keys and oversize', async () => {
    const bad: Array<() => Response | Promise<Response>> = [
      () => Promise.reject(new Error('network')),
      () => new Response('nope', { status: 503 }),
      () => new Response('not json'),
      () => new Response(JSON.stringify({ keys: 'x' })),
      () => new Response(JSON.stringify({ keys: [{ kid: 'k1', kty: 'EC' }, { kty: 'RSA' }, 5] })),
      () => new Response(' '.repeat(MAX_KEYS_BODY_CHARS + 1)),
    ];
    for (const respond of bad) {
      const state = harness();
      state.respond = respond;
      await expect(lookupFor(state)('k1')).rejects.toThrow();
    }
  });

  it('does not serve expired keys when the refresh fails, and backs off', async () => {
    const state = harness();
    const lookup = lookupFor(state, { ttlMs: 1000, minRefetchMs: 60_000 });
    await lookup('k1');
    state.clock += 61_000;
    state.respond = () => new Response('down', { status: 500 });
    await expect(lookup('k1')).rejects.toThrow();
    const attempts = state.calls.length;
    state.clock += 1000;
    await expect(lookup('k1')).rejects.toThrow();
    expect(state.calls).toHaveLength(attempts);
    state.clock += 60_000;
    state.respond = () => new Response(body(['k1']));
    expect(await lookup('k1')).not.toBeNull();
  });

  it('keeps serving known keys when an unknown-kid refresh fails', async () => {
    const state = harness();
    const lookup = lookupFor(state, { ttlMs: 600_000, minRefetchMs: 10 });
    await lookup('k1');
    state.clock += 100;
    state.respond = () => new Response('down', { status: 500 });
    await expect(lookup('unknown')).rejects.toThrow();
    expect(await lookup('k1')).not.toBeNull();
  });
});

describe('works with the verifier end to end', () => {
  async function token(kid: string): Promise<string> {
    const enc = (value: unknown) =>
      btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const input = `${enc({ alg: 'RS256', typ: 'JWT', kid })}.${enc({ iss: ISSUER, aud: ['a'], sub: 's', exp: 2_000_000_000 })}`;
    const signature = new Uint8Array(
      await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(input)),
    );
    let binary = '';
    for (const byte of signature) binary += String.fromCharCode(byte);
    return `${input}.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  }
  const config = { issuer: ISSUER, audience: 'a' };

  it('accepts a token for a fetched key and denies when keys are unavailable', async () => {
    const good = lookupFor(harness());
    expect((await verifyAccessToken(await token('k1'), config, good, 1_900_000_000)).ok).toBe(true);

    const down = harness();
    down.respond = () => new Response('down', { status: 500 });
    expect(
      await verifyAccessToken(await token('k1'), config, lookupFor(down), 1_900_000_000),
    ).toEqual({
      ok: false,
      reason: 'keys_unavailable',
    });
  });

  it('denies an unknown key id', async () => {
    expect(
      await verifyAccessToken(await token('ghost'), config, lookupFor(harness()), 1_900_000_000),
    ).toEqual({ ok: false, reason: 'unknown_key' });
  });
});

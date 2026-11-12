import { beforeAll, describe, expect, it } from 'vitest';
import {
  CLOCK_SKEW_SECONDS,
  MAX_TOKEN_LENGTH,
  verifyAccessToken,
  type AccessConfig,
  type KeyLookup,
} from '../../src/security/accessJwt';

/** Synthetic keys and tokens only. Nothing here is a real team, application or person. */
const CONFIG: AccessConfig = {
  issuer: 'https://synthetic-team.cloudflareaccess.com',
  audience: 'synthetic-aud-tag',
};
const NOW = 1_800_000_000;

function b64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function encodeJson(value: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(value)));
}

interface Pair {
  readonly privateKey: CryptoKey;
  readonly publicJwk: JsonWebKey;
}
async function makePair(modulusLength = 2048): Promise<Pair> {
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  return {
    privateKey: pair.privateKey,
    publicJwk: (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey,
  };
}

interface TokenParts {
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}
async function sign(pair: Pair, parts: TokenParts = {}): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT', kid: 'k1', ...parts.header };
  const payload = {
    iss: CONFIG.issuer,
    aud: [CONFIG.audience],
    sub: 'synthetic-subject-1',
    exp: NOW + 600,
    iat: NOW,
    ...parts.payload,
  };
  const signingInput = `${encodeJson(header)}.${encodeJson(payload)}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    pair.privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64url(new Uint8Array(signature))}`;
}

let good: Pair;
let other: Pair;
let lookup: KeyLookup;

beforeAll(async () => {
  good = await makePair();
  other = await makePair();
  lookup = (kid) => Promise.resolve(kid === 'k1' ? good.publicJwk : null);
});

async function verify(token: string | null | undefined, config = CONFIG, find = lookup, now = NOW) {
  return verifyAccessToken(token, config, find, now);
}

describe('accepts only a correctly signed, in-window token for this team and application', () => {
  it('returns only the issuer and subject', async () => {
    const result = await verify(
      await sign(good, { payload: { email: 'someone@example.invalid' } }),
    );
    expect(result).toEqual({
      ok: true,
      principal: { issuer: CONFIG.issuer, subject: 'synthetic-subject-1' },
    });
    expect(JSON.stringify(result)).not.toContain('example.invalid');
  });

  it('accepts aud as a string or as an array containing the application', async () => {
    expect((await verify(await sign(good, { payload: { aud: CONFIG.audience } }))).ok).toBe(true);
    expect((await verify(await sign(good, { payload: { aud: ['x', CONFIG.audience] } }))).ok).toBe(
      true,
    );
  });

  it('tolerates a small clock skew either way and no more', async () => {
    const justExpired = await sign(good, { payload: { exp: NOW - CLOCK_SKEW_SECONDS + 1 } });
    expect((await verify(justExpired)).ok).toBe(true);
    const longExpired = await sign(good, { payload: { exp: NOW - CLOCK_SKEW_SECONDS } });
    expect(await verify(longExpired)).toEqual({ ok: false, reason: 'expired' });
    const early = await sign(good, { payload: { nbf: NOW + CLOCK_SKEW_SECONDS + 1 } });
    expect(await verify(early)).toEqual({ ok: false, reason: 'not_yet_valid' });
  });
});

describe('fails closed with a fixed reason', () => {
  it('rejects wrong issuer and wrong audience', async () => {
    const issuer = await sign(good, { payload: { iss: 'https://other.cloudflareaccess.com' } });
    expect(await verify(issuer)).toEqual({ ok: false, reason: 'bad_issuer' });
    const audience = await sign(good, { payload: { aud: ['another-app'] } });
    expect(await verify(audience)).toEqual({ ok: false, reason: 'bad_audience' });
    const noAudience = await sign(good, { payload: { aud: undefined } });
    expect(await verify(noAudience)).toEqual({ ok: false, reason: 'bad_audience' });
  });

  it('rejects missing or malformed exp, sub and nbf', async () => {
    for (const payload of [
      { exp: undefined },
      { exp: 'soon' },
      { sub: undefined },
      { sub: '' },
      { nbf: 'x' },
    ]) {
      expect((await verify(await sign(good, { payload }))).ok).toBe(false);
    }
    expect(await verify(await sign(good, { payload: { sub: 'a'.repeat(257) } }))).toEqual({
      ok: false,
      reason: 'missing_claim',
    });
  });

  it('rejects a token signed by a different key, a tampered payload and a tampered signature', async () => {
    const forged = await sign(other);
    expect(await verify(forged)).toEqual({ ok: false, reason: 'bad_signature' });

    const valid = await sign(good);
    const [h = '', , s = ''] = valid.split('.');
    const swapped = `${h}.${encodeJson({ iss: CONFIG.issuer, aud: [CONFIG.audience], sub: 'attacker', exp: NOW + 600 })}.${s}`;
    expect(await verify(swapped)).toEqual({ ok: false, reason: 'bad_signature' });

    const flipped = valid.slice(0, -4) + (valid.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect((await verify(flipped)).ok).toBe(false);
  });

  it('never trusts the algorithm named in the header', async () => {
    for (const alg of ['none', 'HS256', 'RS384', 'ES256', 'rs256', undefined]) {
      const token = await sign(good, { header: { alg } });
      expect(await verify(token)).toEqual({ ok: false, reason: 'unsupported_algorithm' });
    }
    const unsigned = `${encodeJson({ alg: 'none', kid: 'k1' })}.${encodeJson({ iss: CONFIG.issuer })}.`;
    expect((await verify(unsigned)).ok).toBe(false);
  });

  it('rejects headers that would redirect key lookup or add critical extensions', async () => {
    for (const extra of [
      { jku: 'https://x.invalid/k' },
      { x5u: 'x' },
      { jwk: {} },
      { x5c: ['x'] },
      { crit: ['b64'] },
    ]) {
      expect(await verify(await sign(good, { header: extra }))).toEqual({
        ok: false,
        reason: 'unsupported_header',
      });
    }
    expect((await verify(await sign(good, { header: { typ: 'at+jwt' } }))).ok).toBe(false);
  });

  it('rejects unknown, missing and oversized key ids', async () => {
    expect(await verify(await sign(good, { header: { kid: 'unknown' } }))).toEqual({
      ok: false,
      reason: 'unknown_key',
    });
    expect((await verify(await sign(good, { header: { kid: undefined } }))).ok).toBe(false);
    expect((await verify(await sign(good, { header: { kid: 'k'.repeat(129) } }))).ok).toBe(false);
  });

  it('reports unavailable keys without allowing the request', async () => {
    const broken: KeyLookup = () => Promise.reject(new Error('network'));
    expect(await verify(await sign(good), CONFIG, broken)).toEqual({
      ok: false,
      reason: 'keys_unavailable',
    });
  });

  it('rejects weak or wrong-type keys even when the signature would verify', async () => {
    const weak = await makePair(1024);
    const weakLookup: KeyLookup = () => Promise.resolve(weak.publicJwk);
    expect(await verify(await sign(weak), CONFIG, weakLookup)).toEqual({
      ok: false,
      reason: 'unknown_key',
    });
    const wrongType: KeyLookup = () => Promise.resolve({ ...good.publicJwk, kty: 'EC' });
    expect((await verify(await sign(good), CONFIG, wrongType)).ok).toBe(false);
    const wrongAlg: KeyLookup = () => Promise.resolve({ ...good.publicJwk, alg: 'RS512' });
    expect((await verify(await sign(good), CONFIG, wrongAlg)).ok).toBe(false);
    const wrongUse: KeyLookup = () => Promise.resolve({ ...good.publicJwk, use: 'enc' });
    expect((await verify(await sign(good), CONFIG, wrongUse)).ok).toBe(false);
  });

  it('rejects malformed input without throwing', async () => {
    const inputs: Array<string | null | undefined> = [
      undefined,
      null,
      '',
      'a',
      'a.b',
      'a.b.c.d',
      '...',
      '!!!.???.***',
      `${encodeJson([])}.${encodeJson({})}.AAAA`,
      'x'.repeat(MAX_TOKEN_LENGTH + 1),
    ];
    for (const input of inputs) {
      const result = await verify(input);
      expect(result.ok).toBe(false);
    }
  });

  it('refuses to run with a configuration that is not an Access team issuer', async () => {
    const token = await sign(good);
    for (const issuer of [
      '',
      'http://synthetic-team.cloudflareaccess.com',
      'https://synthetic-team.cloudflareaccess.com/',
      'https://evil.example.com',
      'https://x.cloudflareaccess.com.evil.example',
    ]) {
      expect(await verify(token, { issuer, audience: CONFIG.audience })).toEqual({
        ok: false,
        reason: 'misconfigured',
      });
    }
    expect(await verify(token, { issuer: CONFIG.issuer, audience: '' })).toEqual({
      ok: false,
      reason: 'misconfigured',
    });
  });
});

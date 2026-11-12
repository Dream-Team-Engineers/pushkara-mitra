/**
 * Verification of a Cloudflare Access application token (the `Cf-Access-Jwt-Assertion` header).
 *
 * DISABLED: nothing imports this module. No admin route, sign-in or role exists, and BF-02/BF-03
 * are not approved (docs/proposals/BF_DECISION_RECOMMENDATIONS.md). A guard test keeps it unwired.
 *
 * What it proves: the token was signed by a key the caller supplied for the configured team
 * issuer and application audience, and is within its validity window. It returns only the stable
 * (issuer, subject) pair. It never reads an email, never grants a role, and never throws: every
 * failure is a closed reason code so a caller must fail closed. Authorisation is a separate,
 * server-side step; Access admission alone grants nothing.
 *
 * Deliberate limits: RS256 only; the header's `alg` is never used to choose an algorithm;
 * `jku`, `x5u`, `jwk`, `x5c` and `crit` headers are rejected; keys come from the caller, never
 * from the token. Uses the platform WebCrypto, no new dependency (the registry is unavailable
 * to the build environment; a reviewer may prefer a maintained library such as `jose`).
 */

export interface AccessConfig {
  /** Exactly `https://<team>.cloudflareaccess.com`. */
  readonly issuer: string;
  /** The Access application AUD tag. */
  readonly audience: string;
}

export type AccessFailure =
  | 'misconfigured'
  | 'malformed'
  | 'unsupported_algorithm'
  | 'unsupported_header'
  | 'unknown_key'
  | 'keys_unavailable'
  | 'bad_signature'
  | 'bad_issuer'
  | 'bad_audience'
  | 'expired'
  | 'not_yet_valid'
  | 'missing_claim';

export type AccessResult =
  | { readonly ok: true; readonly principal: { readonly issuer: string; readonly subject: string } }
  | { readonly ok: false; readonly reason: AccessFailure };

/** Returns the public key for a key id, or null when unknown. May reject when keys are unreachable. */
export type KeyLookup = (kid: string) => Promise<JsonWebKey | null>;

export const MAX_TOKEN_LENGTH = 8192;
export const CLOCK_SKEW_SECONDS = 30;
const MIN_MODULUS_BYTES = 256; // 2048-bit
const ISSUER_PATTERN = /^https:\/\/[a-z0-9][a-z0-9-]{0,62}\.cloudflareaccess\.com$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const FORBIDDEN_HEADERS = ['jku', 'x5u', 'jwk', 'x5c', 'crit'];

function fail(reason: AccessFailure): AccessResult {
  return { ok: false, reason };
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!BASE64URL.test(value)) return null;
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function decodeJsonObject(value: string): Record<string, unknown> | null {
  const bytes = decodeBase64Url(value);
  if (bytes === null) return null;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function usableKey(jwk: JsonWebKey): { n: string; e: string } | null {
  const { n, e } = jwk;
  if (jwk.kty !== 'RSA' || typeof n !== 'string' || typeof e !== 'string') return null;
  if (jwk.alg !== undefined && jwk.alg !== 'RS256') return null;
  if (jwk.use !== undefined && jwk.use !== 'sig') return null;
  const modulus = decodeBase64Url(n);
  return modulus !== null && modulus.length >= MIN_MODULUS_BYTES ? { n, e } : null;
}

function audienceMatches(claim: unknown, audience: string): boolean {
  if (typeof claim === 'string') return claim === audience;
  return Array.isArray(claim) && claim.some((entry) => entry === audience);
}

export async function verifyAccessToken(
  token: string | null | undefined,
  config: AccessConfig,
  lookupKey: KeyLookup,
  nowSeconds: number,
): Promise<AccessResult> {
  if (!ISSUER_PATTERN.test(config.issuer) || config.audience.length === 0) {
    return fail('misconfigured');
  }
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return fail('malformed');
  }
  const parts = token.split('.');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (
    parts.length !== 3 ||
    encodedHeader === undefined ||
    encodedPayload === undefined ||
    encodedSignature === undefined
  ) {
    return fail('malformed');
  }

  const header = decodeJsonObject(encodedHeader);
  const payload = decodeJsonObject(encodedPayload);
  const signature = decodeBase64Url(encodedSignature);
  if (header === null || payload === null || signature === null || signature.length === 0) {
    return fail('malformed');
  }
  if (FORBIDDEN_HEADERS.some((name) => name in header)) return fail('unsupported_header');
  if (header['alg'] !== 'RS256') return fail('unsupported_algorithm');
  if (header['typ'] !== undefined && header['typ'] !== 'JWT') return fail('unsupported_header');
  const kid = header['kid'];
  if (typeof kid !== 'string' || kid.length === 0 || kid.length > 128) return fail('malformed');

  let jwk: JsonWebKey | null;
  try {
    jwk = await lookupKey(kid);
  } catch {
    return fail('keys_unavailable');
  }
  const material = jwk === null ? null : usableKey(jwk);
  if (material === null) return fail('unknown_key');

  let valid: boolean;
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: material.n, e: material.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signature,
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
  } catch {
    return fail('bad_signature');
  }
  if (!valid) return fail('bad_signature');

  // Claims are read only after the signature verified.
  if (payload['iss'] !== config.issuer) return fail('bad_issuer');
  if (!audienceMatches(payload['aud'], config.audience)) return fail('bad_audience');

  const exp = payload['exp'];
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return fail('missing_claim');
  if (exp + CLOCK_SKEW_SECONDS <= nowSeconds) return fail('expired');
  const nbf = payload['nbf'];
  if (nbf !== undefined) {
    if (typeof nbf !== 'number' || !Number.isFinite(nbf)) return fail('missing_claim');
    if (nbf - CLOCK_SKEW_SECONDS > nowSeconds) return fail('not_yet_valid');
  }

  const subject = payload['sub'];
  if (typeof subject !== 'string' || subject.length === 0 || subject.length > 256) {
    return fail('missing_claim');
  }
  return { ok: true, principal: { issuer: config.issuer, subject } };
}

/**
 * Verifies a Google Sign-In ID token (a signed JWT) inside the Worker.
 *
 * The browser alone cannot be trusted to say who signed in, so the Worker checks, with Google's public
 * keys: the signature (RS256 only), the issuer, that the token was issued for OUR client ID, that it has
 * not expired, and that Google verified the email. Nothing is stored and the token and its claims are
 * never logged. ADR 0008: missing, malformed, forged, expired, future, wrong-issuer/audience and
 * unknown-key tokens must not authenticate.
 */
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS: readonly string[] = ['https://accounts.google.com', 'accounts.google.com'];
const MAX_TOKEN_LENGTH = 4096;
const CLOCK_SKEW_SECONDS = 60;
const KEY_CACHE_SECONDS = 3600;
const KEY_REFRESH_MIN_SECONDS = 300;

export interface GoogleUser {
  readonly name: string;
  readonly email: string;
}

export interface Jwk {
  readonly kid?: string;
  readonly kty?: string;
  readonly alg?: string;
  readonly n?: string;
  readonly e?: string;
}

export type KeyFetcher = () => Promise<readonly Jwk[]>;

export interface VerifyOptions {
  readonly clientId: string;
  readonly nowSeconds: number;
  readonly getKeys: KeyFetcher;
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function parseJson(bytes: Uint8Array): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Returns the signed-in person, or null for any token that must not authenticate. */
export async function verifyGoogleIdToken(
  token: string,
  options: VerifyOptions,
): Promise<GoogleUser | null> {
  try {
    if (options.clientId === '' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
      return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

    const header = parseJson(base64UrlToBytes(headerPart));
    if (header === null || header['alg'] !== 'RS256' || typeof header['kid'] !== 'string') {
      return null;
    }

    const jwk = (await options.getKeys()).find(
      (key) =>
        key.kid === header['kid'] &&
        key.kty === 'RSA' &&
        key.n !== undefined &&
        key.e !== undefined,
    );
    if (jwk?.n === undefined || jwk.e === undefined) return null;

    const publicKey = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const signed = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      base64UrlToBytes(signaturePart),
      signed,
    );
    if (!valid) return null;

    const claims = parseJson(base64UrlToBytes(payloadPart));
    if (claims === null) return null;
    const { iss, aud, exp, iat, email, email_verified: emailVerified, name } = claims;
    if (typeof iss !== 'string' || !ISSUERS.includes(iss)) return null;
    if (aud !== options.clientId) return null;
    if (typeof exp !== 'number' || exp <= options.nowSeconds - CLOCK_SKEW_SECONDS) return null;
    if (typeof iat === 'number' && iat > options.nowSeconds + CLOCK_SKEW_SECONDS) return null;
    if (typeof email !== 'string' || email.length === 0 || email.length > 320) return null;
    if (emailVerified !== true) return null;

    const display =
      typeof name === 'string' && name.trim() !== '' ? name.trim() : email.split('@')[0];
    return { name: (display ?? email).slice(0, 80), email };
  } catch {
    return null;
  }
}

let cachedKeys: readonly Jwk[] = [];
let cachedAt = 0;

/** Google's public keys, cached in memory for the life of the isolate and refreshed on rotation. */
export function googleKeyFetcher(
  nowSeconds: () => number,
  fetcher: typeof fetch = fetch,
): KeyFetcher {
  return async () => {
    const now = nowSeconds();
    if (cachedKeys.length > 0 && now - cachedAt < KEY_CACHE_SECONDS) return cachedKeys;
    if (cachedKeys.length > 0 && now - cachedAt < KEY_REFRESH_MIN_SECONDS) return cachedKeys;
    const response = await fetcher(GOOGLE_JWKS_URL);
    if (!response.ok) return cachedKeys;
    const body: unknown = await response.json();
    const keys =
      typeof body === 'object' && body !== null && Array.isArray((body as { keys?: unknown }).keys)
        ? (body as { keys: Jwk[] }).keys
        : [];
    if (keys.length > 0) {
      cachedKeys = keys;
      cachedAt = now;
    }
    return cachedKeys;
  };
}

/** Test helper: forget cached keys. */
export function resetKeyCache(): void {
  cachedKeys = [];
  cachedAt = 0;
}

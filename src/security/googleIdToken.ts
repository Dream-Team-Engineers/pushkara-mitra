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
const KEY_REFRESH_MIN_SECONDS = 60;
const KEY_FETCH_TIMEOUT_MS = 3000;
const MAX_KEYS_BODY_CHARS = 65536;
const MAX_KEYS = 20;

export interface GoogleUser {
  /** Google's stable account identifier. Used only to derive a pseudonymous ID; never put in a cookie. */
  readonly sub: string;
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

/** Returns Google's keys; `kid` lets the source refetch (rate-limited) when it does not know that key. */
export type KeyFetcher = (kid: string) => Promise<readonly Jwk[]>;

export interface VerifyOptions {
  readonly clientId: string;
  readonly nowSeconds: number;
  readonly getKeys: KeyFetcher;
  /** When set, the token's `nonce` claim must equal it (replay protection, ADR 0008). */
  readonly expectedNonce?: string;
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
/** TEMPORARY staging diagnostic (remove): which check rejected the last token. */
export let lastRejection = '';
export let keyDiag = '';
function rejected(code: string): null {
  lastRejection = code;
  return null;
}

export async function verifyGoogleIdToken(
  token: string,
  options: VerifyOptions,
): Promise<GoogleUser | null> {
  try {
    if (options.clientId === '' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
      return rejected('r1');
    }
    const parts = token.split('.');
    if (parts.length !== 3) return rejected('r2');
    const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

    const header = parseJson(base64UrlToBytes(headerPart));
    if (header === null || header['alg'] !== 'RS256' || typeof header['kid'] !== 'string') {
      return rejected('r3');
    }

    const jwk = (await options.getKeys(header['kid'])).find(
      (key) =>
        key.kid === header['kid'] &&
        key.kty === 'RSA' &&
        key.n !== undefined &&
        key.e !== undefined,
    );
    if (jwk?.n === undefined || jwk.e === undefined) return rejected('r4');

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
    if (!valid) return rejected('r5');

    const claims = parseJson(base64UrlToBytes(payloadPart));
    if (claims === null) return rejected('r6');
    const { iss, aud, exp, iat, sub, nonce, email, email_verified: emailVerified, name } = claims;
    if (typeof iss !== 'string' || !ISSUERS.includes(iss)) return rejected('r7');
    if (aud !== options.clientId) return rejected('r8');
    if (typeof exp !== 'number' || exp <= options.nowSeconds - CLOCK_SKEW_SECONDS)
      return rejected('r9');
    if (typeof iat === 'number' && iat > options.nowSeconds + CLOCK_SKEW_SECONDS)
      return rejected('r10');
    if (typeof sub !== 'string' || sub.length === 0 || sub.length > 255) return rejected('r11');
    if (options.expectedNonce !== undefined && nonce !== options.expectedNonce)
      return rejected('r12');
    if (typeof email !== 'string' || email.length === 0 || email.length > 320)
      return rejected('r13');
    if (emailVerified !== true) return rejected('r14');

    const display =
      typeof name === 'string' && name.trim() !== '' ? name.trim() : email.split('@')[0];
    return { sub, name: (display ?? email).slice(0, 80), email };
  } catch {
    return rejected('r15');
  }
}

let cachedKeys: readonly Jwk[] = [];
let cachedAt = Number.NEGATIVE_INFINITY;
let lastAttempt = Number.NEGATIVE_INFINITY;
let inFlight: Promise<void> | null = null;

function parseKeys(text: string): Jwk[] {
  if (text.length > MAX_KEYS_BODY_CHARS) throw new Error('keys response too large');
  const body: unknown = JSON.parse(text);
  const raw = typeof body === 'object' && body !== null ? (body as { keys?: unknown }).keys : null;
  if (!Array.isArray(raw)) throw new Error('keys response shape');
  const keys = (raw as Jwk[]).slice(0, MAX_KEYS);
  if (keys.length === 0) throw new Error('no keys');
  return keys;
}

/**
 * Google's public keys, cached in memory for the life of the isolate.
 *
 * Fail closed (same policy as the disabled Access key source): keys are served only while younger than the TTL, so a
 * rotated or revoked key is never trusted past it, even when Google cannot be reached. An unknown `kid`
 * triggers at most one refetch per minimum interval, so forged key ids cannot make the Worker hammer
 * Google. The fetch has a timeout, no redirects and a body-size cap.
 */
export function googleKeyFetcher(
  nowSeconds: () => number,
  fetcher: typeof fetch = fetch,
): KeyFetcher {
  async function refresh(now: number): Promise<void> {
    lastAttempt = now;
    try {
      const response = await fetcher(GOOGLE_JWKS_URL, {
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(KEY_FETCH_TIMEOUT_MS),
      });
      keyDiag = `http${response.status}`;
      if (!response.ok) return;
      cachedKeys = parseKeys(await response.text());
      cachedAt = now;
      keyDiag = `ok${cachedKeys.length}`;
    } catch (error) {
      keyDiag = `err:${error instanceof Error ? error.name + ':' + error.message.slice(0, 60) : 'x'}`;
      // Keep whatever is still within its TTL; nothing older is ever served.
    }
  }

  return async (kid) => {
    const now = nowSeconds();
    const fresh = cachedKeys.length > 0 && now - cachedAt < KEY_CACHE_SECONDS;
    const known = fresh && cachedKeys.some((key) => key.kid === kid);
    if (!known && now - lastAttempt >= KEY_REFRESH_MIN_SECONDS) {
      inFlight ??= refresh(now).finally(() => {
        inFlight = null;
      });
      await inFlight;
    }
    return cachedKeys.length > 0 && now - cachedAt < KEY_CACHE_SECONDS ? cachedKeys : [];
  };
}

/** Test helper: forget cached keys and the refetch back-off. */
export function resetKeyCache(): void {
  cachedKeys = [];
  cachedAt = Number.NEGATIVE_INFINITY;
  lastAttempt = Number.NEGATIVE_INFINITY;
  inFlight = null;
}

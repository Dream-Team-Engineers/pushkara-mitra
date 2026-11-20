/**
 * Stateless sign-in session: a signed value kept in an HttpOnly cookie on the person's device.
 *
 * There is no session table and no database. The Worker signs {id, issued, expiry} with
 * HMAC-SHA256 using SESSION_SECRET (a Worker secret, never in the repository). A cookie that is
 * missing, malformed, tampered with or expired, or one signed with another secret, does not
 * authenticate. Because nothing is kept on the server, "sign out" clears the cookie on that device;
 * a copied cookie stays valid until it expires (at most SESSION_MAX_AGE_SECONDS, 7 days; server-side
 * revocation needs the database, see the audit item M3). The cookie carries the display name (so the
 * header can greet the person after a refresh) but never the email or the raw Google identifier.
 *
 * The __Host- prefix makes browsers accept the cookie only over HTTPS, for this exact host, with
 * Path=/ and no Domain, so a sibling subdomain cannot set or replace it.
 */
export interface SessionUser {
  /** Pseudonymous ID: HMAC of the Google `sub`. Not an email, name or the raw Google identifier. */
  readonly id: string;
  /** Display name for the header after a refresh. Never an email. Empty when the cookie has none. */
  readonly name: string;
}

const MAX_NAME = 60;

export const SESSION_COOKIE = '__Host-pm_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const VERSION = 'v1';

interface Claims {
  readonly s: string;
  readonly n?: string;
  readonly iat: number;
  readonly exp: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function hmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  );
}

/** A stable pseudonym for a Google account. Keyed by the secret, so it cannot be recomputed from `sub` alone. */
export async function pseudonymFor(sub: string, secret: string): Promise<string> {
  const digest = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret, 'sign'),
    new TextEncoder().encode(`uid.v1.google|${sub}`),
  );
  return toBase64Url(new Uint8Array(digest).slice(0, 16));
}

export async function createSessionToken(
  user: { readonly sub: string; readonly name?: string },
  secret: string,
  nowSeconds: number,
): Promise<string> {
  const name = (user.name ?? '').trim().slice(0, MAX_NAME);
  const claims: Claims = {
    s: await pseudonymFor(user.sub, secret),
    ...(name === '' ? {} : { n: name }),
    iat: nowSeconds,
    exp: nowSeconds + SESSION_MAX_AGE_SECONDS,
  };
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret, 'sign'),
    new TextEncoder().encode(`${VERSION}.${payload}`),
  );
  return `${VERSION}.${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns the pseudonymous person for a valid session value, or null for anything that must not authenticate. */
export async function readSessionToken(
  token: string,
  secret: string,
  nowSeconds: number,
): Promise<SessionUser | null> {
  try {
    if (secret === '' || token.length === 0 || token.length > 2048) return null;
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== VERSION) return null;
    const [, payload, signature] = parts as [string, string, string];
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret, 'verify'),
      fromBase64Url(signature),
      new TextEncoder().encode(`${VERSION}.${payload}`),
    );
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Partial<Claims>;
    if (typeof claims.s !== 'string' || claims.s === '') return null;
    if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) return null;
    if (typeof claims.iat !== 'number' || claims.iat > nowSeconds + 60) return null;
    const name = typeof claims.n === 'string' ? claims.n.slice(0, MAX_NAME) : '';
    return { id: claims.s, name };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Max-Age=${String(SESSION_MAX_AGE_SECONDS)}; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

export function readCookie(header: string | null, name: string): string | null {
  if (header === null) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/**
 * Sign-in nonce (replay protection). GET /api/auth/nonce issues a random value in a short-lived signed
 * cookie; the page passes the same value to Google, which puts it in the ID token, and the Worker accepts
 * the token only when the two match. A token captured elsewhere has no matching cookie.
 */
export const NONCE_COOKIE = '__Host-pm_nonce';
export const NONCE_MAX_AGE_SECONDS = 600;

export async function createNonce(secret: string, nowSeconds: number): Promise<string> {
  const random = crypto.getRandomValues(new Uint8Array(16));
  const value = toBase64Url(random);
  const exp = String(nowSeconds + NONCE_MAX_AGE_SECONDS);
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret, 'sign'),
    new TextEncoder().encode(`nonce.v1.${value}.${exp}`),
  );
  return `${value}.${exp}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns the nonce value (the part Google echoes) for a valid, unexpired nonce cookie, else null. */
export async function readNonce(
  cookieValue: string,
  secret: string,
  nowSeconds: number,
): Promise<string | null> {
  try {
    if (secret === '' || cookieValue.length > 256) return null;
    const parts = cookieValue.split('.');
    if (parts.length !== 3) return null;
    const [value, exp, signature] = parts as [string, string, string];
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret, 'verify'),
      fromBase64Url(signature),
      new TextEncoder().encode(`nonce.v1.${value}.${exp}`),
    );
    if (!valid || !(Number(exp) > nowSeconds)) return null;
    return value;
  } catch {
    return null;
  }
}

export function nonceCookie(cookieValue: string): string {
  return `${NONCE_COOKIE}=${cookieValue}; Max-Age=${String(NONCE_MAX_AGE_SECONDS)}; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

export function clearedNonceCookie(): string {
  return `${NONCE_COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

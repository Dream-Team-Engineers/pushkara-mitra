/**
 * Stateless sign-in session: a signed value kept in an HttpOnly cookie on the person's device.
 *
 * There is no session table and no database. The Worker signs {name, email, issued, expiry} with
 * HMAC-SHA256 using SESSION_SECRET (a Worker secret, never in the repository). A cookie that is
 * missing, malformed, tampered with or expired, or one signed with another secret, does not
 * authenticate. Because nothing is kept on the server, "sign out" clears the cookie on that device;
 * a copied cookie stays valid until it expires (at most SESSION_MAX_AGE_SECONDS).
 *
 * The __Host- prefix makes browsers accept the cookie only over HTTPS, for this exact host, with
 * Path=/ and no Domain, so a sibling subdomain cannot set or replace it.
 */
import type { GoogleUser } from './googleIdToken';

export const SESSION_COOKIE = '__Host-pm_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const VERSION = 'v1';

interface Claims {
  readonly n: string;
  readonly e: string;
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

export async function createSessionToken(
  user: GoogleUser,
  secret: string,
  nowSeconds: number,
): Promise<string> {
  const claims: Claims = {
    n: user.name,
    e: user.email,
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

/** Returns the person for a valid session value, or null for anything that must not authenticate. */
export async function readSessionToken(
  token: string,
  secret: string,
  nowSeconds: number,
): Promise<GoogleUser | null> {
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
    if (typeof claims.n !== 'string' || typeof claims.e !== 'string') return null;
    if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) return null;
    if (typeof claims.iat !== 'number' || claims.iat > nowSeconds + 60) return null;
    return { name: claims.n, email: claims.e };
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

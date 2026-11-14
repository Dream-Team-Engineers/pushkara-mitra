/**
 * Public-key source for Cloudflare Access token verification.
 *
 * DISABLED: nothing imports this module (guard test). It only fetches and caches the public
 * keys of one configured Access team; it holds no secret and reads no user data.
 *
 * Failure policy (a proposal for the BF-02 review, not an approved decision): FAIL CLOSED.
 * Keys are used only while younger than `ttlMs`. If they cannot be refreshed after that, the
 * lookup throws, and the verifier reports `keys_unavailable` so the request is denied. Stale keys
 * are never served after the TTL. An unknown key id triggers at most one refetch per
 * `minRefetchMs`, so forged `kid` values cannot make the Worker hammer the keys endpoint.
 * Cloudflare rotates signing keys with an overlap period (official docs, retrieved 2026-11-11),
 * which is why a short TTL is safe.
 */
import type { KeyLookup } from './accessJwt';

export interface KeySourceOptions {
  /** Exactly `https://<team>.cloudflareaccess.com`. */
  readonly issuer: string;
  readonly fetcher?: (url: string, init: RequestInit) => Promise<Response>;
  /** Milliseconds since the epoch; injectable for tests. */
  readonly now?: () => number;
  readonly ttlMs?: number;
  readonly minRefetchMs?: number;
  readonly timeoutMs?: number;
}

export const KEYS_PATH = '/cdn-cgi/access/certs';
export const MAX_KEYS_BODY_CHARS = 65536;
export const MAX_KEYS = 20;
const ISSUER_PATTERN = /^https:\/\/[a-z0-9][a-z0-9-]{0,62}\.cloudflareaccess\.com$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseKeys(text: string): Map<string, JsonWebKey> {
  if (text.length > MAX_KEYS_BODY_CHARS) throw new Error('keys response too large');
  const parsed: unknown = JSON.parse(text);
  const raw = isRecord(parsed) ? parsed['keys'] : undefined;
  if (!Array.isArray(raw)) throw new Error('keys response shape');
  const keys = new Map<string, JsonWebKey>();
  for (const entry of (raw as unknown[]).slice(0, MAX_KEYS)) {
    if (!isRecord(entry)) continue;
    const { kid, kty, n, e } = entry;
    if (typeof kid !== 'string' || kid.length === 0 || kid.length > 128) continue;
    if (kty !== 'RSA' || typeof n !== 'string' || typeof e !== 'string') continue;
    keys.set(kid, { kty: 'RSA', n, e, alg: 'RS256', use: 'sig' });
  }
  if (keys.size === 0) throw new Error('no usable keys');
  return keys;
}

export function createAccessKeyLookup(options: KeySourceOptions): KeyLookup {
  if (!ISSUER_PATTERN.test(options.issuer)) throw new Error('invalid Access issuer');
  const fetcher = options.fetcher ?? ((url, init) => fetch(url, init));
  const now = options.now ?? (() => Date.now());
  const ttlMs = options.ttlMs ?? 300_000;
  const minRefetchMs = options.minRefetchMs ?? 60_000;
  const timeoutMs = options.timeoutMs ?? 3_000;
  const url = `${options.issuer}${KEYS_PATH}`;

  let keys = new Map<string, JsonWebKey>();
  let fetchedAt = Number.NEGATIVE_INFINITY;
  let lastAttempt = Number.NEGATIVE_INFINITY;
  let inFlight: Promise<void> | null = null;

  async function refresh(): Promise<void> {
    lastAttempt = now();
    const response = await fetcher(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error('keys endpoint status');
    keys = parseKeys(await response.text());
    fetchedAt = now();
  }

  function refreshOnce(): Promise<void> {
    inFlight ??= refresh().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return async (kid) => {
    const fresh = now() - fetchedAt < ttlMs;
    if (fresh) {
      const known = keys.get(kid);
      if (known !== undefined) return known;
      if (now() - lastAttempt < minRefetchMs) return null;
    } else if (now() - lastAttempt < minRefetchMs && inFlight === null) {
      throw new Error('keys unavailable');
    }
    await refreshOnce();
    return keys.get(kid) ?? null;
  };
}

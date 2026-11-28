/**
 * Phone notifications for partner nudges (ADR 0020). Sends an EMPTY Web Push message: no payload,
 * so nothing about the nudge, the ghat or the person travels through the browser vendors' servers.
 * The only secret is the VAPID private key, held by this Worker alone. Push addresses are
 * credentials: they are never logged, shown or put in an error message here. This file has no
 * database access; src/db/adminPartners.ts does the reading and writing of partner data.
 */
export interface PushEnv {
  readonly FLAG_PARTNER_PUSH?: string | undefined;
  /** Worker secret: the VAPID private key, 32 bytes as base64url. */
  readonly VAPID_PRIVATE_KEY?: string | undefined;
  /** Public key, 65 bytes (uncompressed point) as base64url. Not a secret. */
  readonly VAPID_PUBLIC_KEY?: string | undefined;
  /** Contact for the push services: a `mailto:` or `https:` address chosen by the owner. */
  readonly VAPID_SUBJECT?: string | undefined;
}

export interface PushConfig {
  readonly privateKey: string;
  readonly publicKey: string;
  readonly subject: string;
}

export type PushOutcome = 'ok' | 'gone' | 'failed';

const B64URL = /^[A-Za-z0-9_-]+$/;
const SUBJECT = /^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s/]+[^\s]*)$/;
const TIMEOUT_MS = 5000;
/** How long a push service may hold a message for an offline phone: as long as a nudge is open. */
export const PUSH_TTL_SECONDS = 6 * 60 * 60;

/** Null unless the flag is exactly `enabled` and all three values are present and well formed. */
export function pushConfig(env: PushEnv): PushConfig | null {
  const { FLAG_PARTNER_PUSH, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } = env;
  if (
    FLAG_PARTNER_PUSH !== 'enabled' ||
    VAPID_PRIVATE_KEY === undefined ||
    VAPID_PUBLIC_KEY === undefined ||
    VAPID_SUBJECT === undefined ||
    !B64URL.test(VAPID_PRIVATE_KEY) ||
    !B64URL.test(VAPID_PUBLIC_KEY) ||
    !SUBJECT.test(VAPID_SUBJECT)
  ) {
    return null;
  }
  return { privateKey: VAPID_PRIVATE_KEY, publicKey: VAPID_PUBLIC_KEY, subject: VAPID_SUBJECT };
}

function fromB64url(text: string): Uint8Array {
  const padded = text
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(text.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function toB64url(bytes: Uint8Array | string): string {
  const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function signingKey(config: PushConfig): Promise<CryptoKey> {
  const point = fromB64url(config.publicKey);
  if (point.length !== 65 || point[0] !== 4 || fromB64url(config.privateKey).length !== 32) {
    throw new Error('VAPID key shape');
  }
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: config.privateKey,
      x: toB64url(point.slice(1, 33)),
      y: toB64url(point.slice(33, 65)),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

/** The `Authorization` header value for one push service (RFC 8292). */
export async function vapidAuthorization(
  endpoint: string,
  config: PushConfig,
  nowSeconds: number,
  key?: CryptoKey,
): Promise<string> {
  const header = toB64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = toB64url(
    JSON.stringify({
      aud: new URL(endpoint).origin,
      exp: nowSeconds + 12 * 60 * 60,
      sub: config.subject,
    }),
  );
  const signed = `${header}.${claims}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key ?? (await signingKey(config)),
    new TextEncoder().encode(signed),
  );
  return `vapid t=${signed}.${toB64url(new Uint8Array(signature))}, k=${config.publicKey}`;
}

/** Sends one empty push. Never throws and never reveals the address. */
export async function sendEmptyPush(
  endpoint: string,
  config: PushConfig,
  nowSeconds: number,
  key?: CryptoKey,
  fetcher: typeof fetch = fetch,
): Promise<PushOutcome> {
  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: await vapidAuthorization(endpoint, config, nowSeconds, key),
        TTL: String(PUSH_TTL_SECONDS),
        Urgency: 'normal',
      },
    });
    if (response.status >= 200 && response.status < 300) return 'ok';
    // 404 and 410 mean the browser has dropped the subscription for good.
    return response.status === 404 || response.status === 410 ? 'gone' : 'failed';
  } catch {
    return 'failed';
  }
}

export interface PushRun {
  readonly sent: number;
  readonly failed: number;
  readonly gone: number;
}

/** Sends to every target in parallel (callers keep the list within the per-nudge cap). */
export async function sendToTargets(
  targets: readonly { readonly ref: string; readonly endpoint: string }[],
  config: PushConfig,
  nowSeconds: number,
  fetcher: typeof fetch = fetch,
): Promise<{ results: { ref: string; outcome: PushOutcome }[]; run: PushRun }> {
  const key = targets.length === 0 ? undefined : await signingKey(config);
  const results = await Promise.all(
    targets.map(async (t) => ({
      ref: t.ref,
      outcome: await sendEmptyPush(t.endpoint, config, nowSeconds, key, fetcher),
    })),
  );
  const count = (o: PushOutcome): number => results.filter((r) => r.outcome === o).length;
  return { results, run: { sent: count('ok'), failed: count('failed'), gone: count('gone') } };
}

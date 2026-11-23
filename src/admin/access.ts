import { createAccessKeyLookup } from '../security/accessKeys';
import { verifyAccessToken, type KeyLookup } from '../security/accessJwt';

/**
 * Staff admission for the admin Worker (ADR 0018, BF-02). Cloudflare Access sits in front of the
 * whole Worker and its policy names the three admins; this check still verifies the Access token on
 * every request and fails closed. Email is never read. Optional `ADMIN_SUBJECTS` narrows admission
 * to listed Access subjects (set outside Git).
 */
export interface AdminAccessEnv {
  readonly ACCESS_TEAM_DOMAIN?: string;
  readonly ACCESS_AUD?: string;
  readonly ADMIN_SUBJECTS?: string;
}

export type Admission =
  | { readonly ok: true; readonly subject: string }
  | { readonly ok: false; readonly status: 403 | 503 };

const lookups = new Map<string, KeyLookup>();

function lookupFor(issuer: string): KeyLookup {
  let lookup = lookups.get(issuer);
  if (lookup === undefined) {
    lookup = createAccessKeyLookup({ issuer });
    lookups.set(issuer, lookup);
  }
  return lookup;
}

export async function admit(
  request: Request,
  env: AdminAccessEnv,
  nowSeconds: number,
  lookupKey?: KeyLookup,
): Promise<Admission> {
  const issuer = (env.ACCESS_TEAM_DOMAIN ?? '').replace(/\/+$/, '');
  const audience = env.ACCESS_AUD ?? '';
  if (
    !/^https:\/\/[a-z0-9][a-z0-9-]{0,62}\.cloudflareaccess\.com$/.test(issuer) ||
    audience === ''
  ) {
    return { ok: false, status: 503 };
  }
  const result = await verifyAccessToken(
    request.headers.get('Cf-Access-Jwt-Assertion'),
    { issuer, audience },
    lookupKey ?? lookupFor(issuer),
    nowSeconds,
  );
  if (!result.ok) {
    return { ok: false, status: result.reason === 'keys_unavailable' ? 503 : 403 };
  }
  const allowed = (env.ADMIN_SUBJECTS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  if (allowed.length > 0 && !allowed.includes(result.principal.subject)) {
    return { ok: false, status: 403 };
  }
  return { ok: true, subject: result.principal.subject };
}

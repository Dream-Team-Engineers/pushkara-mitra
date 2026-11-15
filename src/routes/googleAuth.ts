import { googleKeyFetcher, verifyGoogleIdToken, type KeyFetcher } from '../security/googleIdToken';

/**
 * POST /api/auth/google  { "credential": "<Google ID token>" }  ->  { "name", "email" }
 *
 * Stateless: it verifies the token and answers. It sets no cookie, stores nothing and logs nothing.
 * It exists only when GOOGLE_CLIENT_ID is configured for the environment (staging first).
 */
export const GOOGLE_AUTH_PATH = '/api/auth/google';
const MAX_BODY_BYTES = 8192;
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function fail(status: number, error: string, extra: Record<string, string> = {}): Response {
  return Response.json({ error }, { status, headers: { ...NO_STORE, ...extra } });
}

export async function handleGoogleAuth(
  request: Request,
  clientId: string | undefined,
  getKeys: KeyFetcher = googleKeyFetcher(() => Math.floor(Date.now() / 1000)),
  nowSeconds: () => number = () => Math.floor(Date.now() / 1000),
): Promise<Response> {
  if (clientId === undefined || clientId === '') {
    return new Response('Not Found', { status: 404, headers: NO_STORE });
  }
  if (request.method !== 'POST') return fail(405, 'method_not_allowed', { Allow: 'POST' });

  const origin = request.headers.get('Origin');
  if (origin !== null && origin !== new URL(request.url).origin) return fail(403, 'forbidden');
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
    return fail(415, 'unsupported_media_type');
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return fail(413, 'too_large');
  let credential: unknown;
  try {
    credential = (JSON.parse(text) as { credential?: unknown }).credential;
  } catch {
    return fail(400, 'bad_request');
  }
  if (typeof credential !== 'string') return fail(400, 'bad_request');

  const user = await verifyGoogleIdToken(credential, {
    clientId,
    nowSeconds: nowSeconds(),
    getKeys,
  });
  if (user === null) return fail(401, 'invalid_token');
  return Response.json(user, { headers: NO_STORE });
}

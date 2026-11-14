import { isPublishedDataset, type ContentKind } from '../../../../src/content/publicContentSchema';
import type { RequestFn } from './publicInformation';

/**
 * Client for GET /api/public/content/{kind} (docs/contracts/public-content.openapi.yaml).
 * Public, read-only, no credentials. The reply is checked with the same schema the Worker uses.
 * A 404 with CONTENT_UNAVAILABLE means "nothing approved yet" and returns null; anything else
 * unexpected throws, so the screen shows its error or last-good state instead of bad data.
 */
export const PUBLIC_CONTENT_PREFIX = '/api/public/content/';
const REQUEST_TIMEOUT_MS = 8000;

function isUnavailableBody(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const error = (value as Record<string, unknown>)['error'];
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<string, unknown>)['code'] === 'CONTENT_UNAVAILABLE'
  );
}

const defaultRequest: RequestFn = (input, init) => fetch(input, init);

export async function fetchPublicContent<T>(
  kind: ContentKind,
  request: RequestFn = defaultRequest,
): Promise<readonly T[] | null> {
  const response = await request(`${PUBLIC_CONTENT_PREFIX}${kind}`, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) {
    const body: unknown = await response.json().catch(() => null);
    if (isUnavailableBody(body)) return null;
    throw new Error('Unexpected 404 from the public content endpoint');
  }
  if (response.status !== 200) throw new Error(`Public content failed: ${String(response.status)}`);
  const body: unknown = await response.json();
  if (!isPublishedDataset(body, kind))
    throw new Error('Public content does not match its contract');
  // The schema check above guarantees each item has exactly the fields of this kind.
  return body.items as unknown as readonly T[];
}

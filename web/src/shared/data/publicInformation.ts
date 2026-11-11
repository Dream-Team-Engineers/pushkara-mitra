import type { Locale } from '../i18n/i18n';

/**
 * Client for GET /api/public/information (docs/contracts/public-information.openapi.yaml).
 * Public, read-only, no credentials. The response is validated against the contract before use,
 * so a malformed or unexpected reply shows the error state instead of unlabelled content.
 * A 404 with the contract's INFORMATION_UNAVAILABLE body means "no approved copy yet" and is not
 * an error; a 404 from anything else (for example a host without the Worker) is an error.
 */
export const PUBLIC_INFORMATION_PATH = '/api/public/information';
const REQUEST_TIMEOUT_MS = 8000;

export interface PublicInformation {
  readonly locale: Locale;
  readonly revision: string;
  readonly independentApplication: true;
  readonly title: string;
  readonly paragraphs: readonly string[];
}

export type RequestFn = (input: string, init: RequestInit) => Promise<Response>;

const DOCUMENT_KEYS = ['independentApplication', 'locale', 'paragraphs', 'revision', 'title'];
const REVISION = /^[a-zA-Z0-9._-]{1,64}$/;

function isText(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

export function isPublicInformation(value: unknown, expected: Locale): value is PublicInformation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== DOCUMENT_KEYS.length || keys.some((key, i) => key !== DOCUMENT_KEYS[i])) {
    return false;
  }
  const paragraphs = record['paragraphs'];
  return (
    record['locale'] === expected &&
    record['independentApplication'] === true &&
    typeof record['revision'] === 'string' &&
    REVISION.test(record['revision']) &&
    isText(record['title'], 1, 120) &&
    Array.isArray(paragraphs) &&
    paragraphs.length >= 1 &&
    paragraphs.length <= 12 &&
    paragraphs.every((paragraph) => isText(paragraph, 1, 600))
  );
}

function isUnavailableBody(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const error = (value as Record<string, unknown>)['error'];
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<string, unknown>)['code'] === 'INFORMATION_UNAVAILABLE'
  );
}

const defaultRequest: RequestFn = (input, init) => fetch(input, init);

/** Returns the approved document, or null when none is published for this language. */
export async function fetchPublicInformation(
  lang: Locale,
  request: RequestFn = defaultRequest,
): Promise<PublicInformation | null> {
  const response = await request(`${PUBLIC_INFORMATION_PATH}?lang=${lang}`, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) {
    const body: unknown = await response.json().catch(() => null);
    if (isUnavailableBody(body)) return null;
    throw new Error('Unexpected 404 from the public information endpoint');
  }
  if (response.status !== 200)
    throw new Error(`Public information failed: ${String(response.status)}`);
  const body: unknown = await response.json();
  if (!isPublicInformation(body, lang)) {
    throw new Error('Public information does not match its contract');
  }
  return body;
}

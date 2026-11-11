import {
  approvedDocument,
  DEFAULT_LOCALE,
  INFORMATION_ENTRIES,
  isLocale,
  type InformationEntry,
  type Locale,
} from '../content/publicInformation';
import { publicError } from '../http/errors';
import { parseStrictQuery } from '../http/query';

export const PUBLIC_INFORMATION_PATH = '/api/public/information';

/**
 * GET /api/public/information?lang=te|en|hi
 * Reads repository content only: no database, cookies, Authorization, identity or side effect.
 * A locale without approved copy is 404 (never another language, never a draft). Always no-store.
 */
export function handlePublicInformation(
  url: URL,
  entries: Readonly<Record<Locale, InformationEntry>> = INFORMATION_ENTRIES,
): Response {
  const query = parseStrictQuery(url, ['lang']);
  if (query === null) return publicError('INVALID_QUERY', 400);
  const requested = query.get('lang') ?? DEFAULT_LOCALE;
  if (!isLocale(requested)) return publicError('INVALID_QUERY', 400);
  const document = approvedDocument(requested, entries);
  if (document === null) return publicError('INFORMATION_UNAVAILABLE', 404);
  return Response.json(document, { headers: { 'Cache-Control': 'no-store' } });
}

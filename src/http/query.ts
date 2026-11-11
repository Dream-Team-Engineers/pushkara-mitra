/**
 * Strict query parsing for public read routes. Anything not explicitly allowed is rejected:
 * unknown keys, repeated keys, empty or oversized values, and over-long query strings.
 * Returns null for a rejected query, so callers cannot accidentally use a partial result.
 */
const MAX_QUERY_LENGTH = 64;

export function parseStrictQuery(
  url: URL,
  allowed: readonly string[],
): ReadonlyMap<string, string> | null {
  if (url.search.length > MAX_QUERY_LENGTH) return null;
  const result = new Map<string, string>();
  for (const [key, value] of url.searchParams) {
    if (!allowed.includes(key) || result.has(key) || value === '') return null;
    result.set(key, value);
  }
  return result;
}

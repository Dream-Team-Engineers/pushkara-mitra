import { useEffect } from 'preact/hooks';
import { createResource } from './resource';
import { useResource } from './useResource';

/**
 * Client for GET /api/public/news (live headlines the Worker refreshes every 15 minutes).
 * The reply is checked item by item; anything off throws so the screen keeps its last good data.
 * Links only ever point to https pages.
 */
export interface NewsItem {
  readonly id: string;
  readonly title: string;
  readonly source: string;
  readonly url: string;
  readonly publishedAt: string;
}

const NEWS_PATH = '/api/public/news';
const REQUEST_TIMEOUT_MS = 8000;
const MINUTE = 60_000;

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function isNewsItem(value: unknown): value is NewsItem {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r['id'] === 'string' &&
    typeof r['title'] === 'string' &&
    r['title'] !== '' &&
    typeof r['source'] === 'string' &&
    typeof r['url'] === 'string' &&
    isHttps(r['url']) &&
    typeof r['publishedAt'] === 'string' &&
    !Number.isNaN(Date.parse(r['publishedAt']))
  );
}

/** Live items, or null when the service has none (404): callers then show nothing live. */
export async function fetchNews(
  request: typeof fetch = (input, init) => fetch(input, init),
): Promise<readonly NewsItem[] | null> {
  const response = await request(NEWS_PATH, {
    method: 'GET',
    credentials: 'omit',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (response.status !== 200) throw new Error(`News failed: ${String(response.status)}`);
  const body: unknown = await response.json();
  const items = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(items) || !items.every(isNewsItem)) {
    throw new Error('News does not match its contract');
  }
  return items;
}

export const newsResource = createResource(fetchNews, 30 * MINUTE);

/** Live headlines for a screen, re-checked every 15 minutes while it is open. Null until available. */
export function useLiveNews(): readonly NewsItem[] | null {
  const state = useResource(newsResource);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void newsResource.refresh();
    }, 15 * MINUTE);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return state.status === 'ready' ? state.data : null;
}

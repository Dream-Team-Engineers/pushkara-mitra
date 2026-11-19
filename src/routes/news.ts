import { publicError } from '../http/errors';
import { parseStrictQuery } from '../http/query';

/**
 * GET /api/public/news: headlines about the Godavari Pushkaralu, refreshed automatically.
 *
 * The Worker reads Google News' public RSS search feed server-side (so the page CSP stays
 * `connect-src 'self'`), keeps the newest items, and caches the result at the edge for 15
 * minutes. Only headline, publisher name, link and time are passed on, never article text.
 * No user input reaches the upstream request, nothing about the reader is sent or stored, and
 * nothing is written to Worker storage. Items are third-party journalism, not official notices;
 * the app labels them with their publisher. Google News feed terms: NEEDS REVIEW (OQ-037).
 */
export const PUBLIC_NEWS_PATH = '/api/public/news';
export const NEWS_FEED_URL =
  'https://news.google.com/rss/search?q=Godavari+Pushkaralu&hl=en-IN&gl=IN&ceid=IN:en';
const MAX_ITEMS = 10;
const CACHE_SECONDS = 15 * 60;
const FETCH_TIMEOUT_MS = 6000;
const MAX_FEED_BYTES = 600_000;

export interface NewsItem {
  readonly id: string;
  readonly title: string;
  readonly source: string;
  readonly url: string;
  /** ISO 8601 UTC. */
  readonly publishedAt: string;
}

const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

function decode(raw: string): string {
  const stripped = raw.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1');
  return stripped
    .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string | null {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(block);
  return match?.[1] === undefined ? null : decode(match[1]);
}

/** Parses RSS 2.0 `<item>` blocks. Items without a title, https link or valid date are dropped. */
export function parseNewsFeed(xml: string): readonly NewsItem[] {
  const items: NewsItem[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1] ?? '';
    const link = tag(block, 'link');
    const pubDate = tag(block, 'pubDate');
    const source = tag(block, 'source');
    let title = tag(block, 'title');
    if (title === null || link === null || pubDate === null) continue;
    const time = Date.parse(pubDate);
    if (Number.isNaN(time) || !link.startsWith('https://')) continue;
    // Google appends " - Publisher" to the title; the publisher is carried separately.
    if (source !== null && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(source.length + 3));
    }
    if (title.length === 0 || title.length > 200) continue;
    items.push({
      id: `n${String(time)}-${String(items.length)}`,
      title,
      source: (source ?? 'News').slice(0, 80),
      url: link.slice(0, 500),
      publishedAt: new Date(time).toISOString(),
    });
  }
  return items
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, MAX_ITEMS);
}

export type FeedFetcher = (url: string, init: RequestInit) => Promise<Response>;

export async function handlePublicNews(
  url: URL,
  fetcher: FeedFetcher = (input, init) => fetch(input, init),
): Promise<Response> {
  if (parseStrictQuery(url, []) === null) return publicError('INVALID_QUERY', 400);
  try {
    const upstream = await fetcher(NEWS_FEED_URL, {
      headers: { Accept: 'application/rss+xml, application/xml' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
    });
    if (!upstream.ok) return publicError('CONTENT_UNAVAILABLE', 404);
    const xml = (await upstream.text()).slice(0, MAX_FEED_BYTES);
    const items = parseNewsFeed(xml);
    if (items.length === 0) return publicError('CONTENT_UNAVAILABLE', 404);
    return Response.json(
      { kind: 'news', fetchedAt: new Date().toISOString(), items },
      { headers: { 'Cache-Control': `public, max-age=${String(CACHE_SECONDS)}` } },
    );
  } catch {
    return publicError('CONTENT_UNAVAILABLE', 404);
  }
}

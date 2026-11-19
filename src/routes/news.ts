import { publicError } from '../http/errors';
import { parseStrictQuery } from '../http/query';

/**
 * GET /api/public/news: headlines about the Godavari Pushkaralu, refreshed automatically.
 *
 * Owner decision 2026-11-19: use the publishers' own RSS feeds (Google News' feed is restricted to
 * personal feed readers and answers 503 to Workers, OQ-037). The Worker reads each feed server-side
 * (so the page CSP stays `connect-src 'self'`), keeps only items that mention Pushkaralu, merges
 * them newest first, and caches the result at the edge for 15 minutes. Only headline, publisher
 * name, link and time are passed on, never article text. No user input reaches the upstream
 * requests, nothing about the reader is sent or stored, and nothing is written to Worker storage.
 * One feed failing does not stop the others. Items are third-party journalism, not official
 * notices; the app labels them with their publisher. Each publisher's terms for headline reuse:
 * NEEDS REVIEW (OQ-037). Feeds checked 2026-11-19; add a feed here only after opening it.
 */
export const PUBLIC_NEWS_PATH = '/api/public/news';

export interface NewsFeed {
  readonly publisher: string;
  readonly url: string;
}

export const NEWS_FEEDS: readonly NewsFeed[] = [
  { publisher: 'Siasat', url: 'https://www.siasat.com/tag/godavari-pushkaralu/feed/' },
  { publisher: 'Telangana Today', url: 'https://telanganatoday.com/tag/godavari-pushkaralu/feed' },
  {
    publisher: 'The Hindu',
    url: 'https://www.thehindu.com/news/national/andhra-pradesh/feeder/default.rss',
  },
];

const MAX_ITEMS = 10;
const CACHE_SECONDS = 15 * 60;
const FETCH_TIMEOUT_MS = 6000;
const MAX_FEED_BYTES = 700_000;
const MAX_LINK = 2000;
/** Only items that mention the festival are kept (tag feeds and regional feeds carry other stories). */
const TOPIC = /pushkar/i;

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
  const stripped = raw.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
  return stripped
    .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/&#(\d{2,5});/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string | null {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(block);
  return match?.[1] === undefined ? null : decode(match[1]);
}

/**
 * Parses RSS 2.0 `<item>` blocks from one publisher. Items that do not mention Pushkaralu, or have
 * no title, https link or valid date, are dropped. The publisher name comes from our own list.
 */
export function parseNewsFeed(xml: string, publisher: string): readonly NewsItem[] {
  const items: NewsItem[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1] ?? '';
    const title = tag(block, 'title');
    const link = tag(block, 'link');
    const pubDate = tag(block, 'pubDate');
    if (title === null || link === null || pubDate === null) continue;
    const time = Date.parse(pubDate);
    // A cut link is a broken link, so links are never truncated, only dropped when absurd.
    if (Number.isNaN(time) || !link.startsWith('https://') || link.length > MAX_LINK) continue;
    if (title.length === 0 || title.length > 200) continue;
    if (!TOPIC.test(`${title} ${tag(block, 'description') ?? ''} ${link}`)) continue;
    items.push({
      id: `n${String(time)}-${String(link.length)}-${String(items.length)}`,
      title,
      source: publisher,
      url: link,
      publishedAt: new Date(time).toISOString(),
    });
  }
  return items;
}

/** Merges feeds: newest first, one entry per link, at most MAX_ITEMS. */
export function mergeNews(lists: readonly (readonly NewsItem[])[]): readonly NewsItem[] {
  const seen = new Set<string>();
  return lists
    .flat()
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .slice(0, MAX_ITEMS)
    .map((item, index) => ({ ...item, id: `n${String(index)}-${item.publishedAt}` }));
}

export type FeedFetcher = (url: string, init: RequestInit) => Promise<Response>;

async function readFeed(feed: NewsFeed, fetcher: FeedFetcher): Promise<readonly NewsItem[]> {
  const upstream = await fetcher(feed.url, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
  });
  if (!upstream.ok) return [];
  return parseNewsFeed((await upstream.text()).slice(0, MAX_FEED_BYTES), feed.publisher);
}

export async function handlePublicNews(
  url: URL,
  fetcher: FeedFetcher = (input, init) => fetch(input, init),
  feeds: readonly NewsFeed[] = NEWS_FEEDS,
): Promise<Response> {
  if (parseStrictQuery(url, []) === null) return publicError('INVALID_QUERY', 400);
  const results = await Promise.allSettled(feeds.map((feed) => readFeed(feed, fetcher)));
  const items = mergeNews(results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
  if (items.length === 0) return publicError('CONTENT_UNAVAILABLE', 404);
  return Response.json(
    { kind: 'news', fetchedAt: new Date().toISOString(), items },
    { headers: { 'Cache-Control': `public, max-age=${String(CACHE_SECONDS)}` } },
  );
}

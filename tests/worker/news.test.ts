import { describe, expect, it } from 'vitest';
import { handlePublicNews, mergeNews, parseNewsFeed, type NewsFeed } from '../../src/routes/news';

const rss = (items: string): string =>
  `<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`;
const item = (title: string, link: string, date: string, description = ''): string =>
  `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate><description>${description}</description></item>`;

const FEED = rss(
  [
    item('Older Pushkaralu story', 'https://a.example/1', 'Tue, 25 Aug 2026 07:00:00 +0000'),
    item(
      '<![CDATA[Newer &amp; bigger Pushkaralu story]]>',
      'https://a.example/2',
      'Mon, 16 Nov 2026 18:45:26 +0000',
    ),
    item('Unrelated story', 'https://a.example/3', 'Mon, 16 Nov 2026 18:45:26 +0000'),
    item(
      'Trains planned',
      'https://a.example/4',
      'Mon, 16 Nov 2026 12:00:00 +0000',
      '<p>SCoR plans trips for Godavari Pushkarams</p>',
    ),
    item('Insecure Pushkaralu', 'http://a.example/5', 'Mon, 16 Nov 2026 18:45:26 +0000'),
    item('Bad date Pushkaralu', 'https://a.example/6', 'not a date'),
    item('Apostrophe&#8217;s Pushkaralu', 'https://a.example/7', 'Sun, 15 Nov 2026 10:00:00 +0000'),
  ].join(''),
);

describe('parseNewsFeed', () => {
  const items = parseNewsFeed(FEED, 'Paper');

  it('keeps only valid Pushkaralu items, labelled with our publisher name', () => {
    expect(items.map((i) => i.url)).toEqual([
      'https://a.example/1',
      'https://a.example/2',
      'https://a.example/4',
      'https://a.example/7',
    ]);
    expect(items.every((i) => i.source === 'Paper')).toBe(true);
  });

  it('decodes CDATA and entities, and matches the topic in the description', () => {
    expect(items[1]?.title).toBe('Newer & bigger Pushkaralu story');
    expect(items[3]?.title).toBe('Apostrophe’s Pushkaralu');
    expect(items[2]?.url).toBe('https://a.example/4');
  });

  it('keeps long links whole and drops absurdly long ones', () => {
    const long = `https://news.example/${'a'.repeat(900)}`;
    const huge = `https://news.example/${'b'.repeat(2500)}`;
    const feed = rss(
      item('Long Pushkaralu', long, 'Mon, 16 Nov 2026 18:45:26 GMT') +
        item('Huge Pushkaralu', huge, 'Mon, 16 Nov 2026 18:45:26 GMT'),
    );
    expect(parseNewsFeed(feed, 'P').map((i) => i.url)).toEqual([long]);
  });
});

describe('mergeNews', () => {
  it('sorts newest first, removes duplicate links and caps at ten', () => {
    const make = (n: number) =>
      parseNewsFeed(
        rss(
          item(
            `Pushkaralu ${String(n)}`,
            `https://a.example/${String(n)}`,
            `Mon, ${String(n).padStart(2, '0')} Nov 2026 10:00:00 +0000`,
          ),
        ),
        'P',
      );
    const lists = Array.from({ length: 12 }, (_, i) => make(i + 1));
    const merged = mergeNews([...lists, make(12)]);
    expect(merged).toHaveLength(10);
    expect(merged[0]?.url).toBe('https://a.example/12');
    expect(new Set(merged.map((i) => i.url)).size).toBe(10);
  });
});

describe('handlePublicNews', () => {
  const url = new URL('https://x.test/api/public/news');
  const feeds: readonly NewsFeed[] = [
    { publisher: 'One', url: 'https://one.example/feed' },
    { publisher: 'Two', url: 'https://two.example/feed' },
  ];

  it('merges feeds, survives one failing, and sets a 15 minute cache', async () => {
    const response = await handlePublicNews(
      url,
      (input) =>
        input.startsWith('https://one')
          ? Promise.reject(new Error('down'))
          : Promise.resolve(new Response(FEED)),
      feeds,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('max-age=900');
    const body = await response.json<{ items: { source: string }[] }>();
    expect(body.items).toHaveLength(4);
    expect(body.items.every((i) => i.source === 'Two')).toBe(true);
  });

  it('answers 404 when every feed fails or has nothing on the topic', async () => {
    const failed = await handlePublicNews(url, () => Promise.reject(new Error('down')), feeds);
    expect(failed.status).toBe(404);
    const empty = await handlePublicNews(
      url,
      () =>
        Promise.resolve(
          new Response(
            rss(item('Cricket', 'https://a.example/9', 'Mon, 16 Nov 2026 18:45:26 +0000')),
          ),
        ),
      feeds,
    );
    expect(empty.status).toBe(404);
    const blocked = await handlePublicNews(
      url,
      () => Promise.resolve(new Response('no', { status: 503 })),
      feeds,
    );
    expect(blocked.status).toBe(404);
  });

  it('rejects any query string', async () => {
    const response = await handlePublicNews(
      new URL(`${url.href}?q=x`),
      () => Promise.resolve(new Response(FEED)),
      feeds,
    );
    expect(response.status).toBe(400);
  });
});

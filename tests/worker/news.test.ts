import { describe, expect, it } from 'vitest';
import { handlePublicNews, parseNewsFeed } from '../../src/routes/news';

const FEED = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Older story - The Hindu</title><link>https://news.example/a</link><pubDate>Tue, 25 Aug 2026 07:00:00 GMT</pubDate><source url="https://thehindu.com">The Hindu</source></item>
<item><title><![CDATA[Newer &amp; bigger story - Deccan Chronicle]]></title><link>https://news.example/b</link><pubDate>Mon, 16 Nov 2026 18:45:26 GMT</pubDate><source url="https://dc.com">Deccan Chronicle</source></item>
<item><title>Insecure link</title><link>http://news.example/c</link><pubDate>Mon, 16 Nov 2026 18:45:26 GMT</pubDate></item>
<item><title>Bad date</title><link>https://news.example/d</link><pubDate>not a date</pubDate></item>
</channel></rss>`;

describe('parseNewsFeed', () => {
  it('keeps valid items newest first, strips the publisher suffix and decodes entities', () => {
    const items = parseNewsFeed(FEED);
    expect(items.map((item) => item.title)).toEqual(['Newer & bigger story', 'Older story']);
    expect(items[0]?.source).toBe('Deccan Chronicle');
    expect(items[0]?.publishedAt).toBe('2026-11-16T18:45:26.000Z');
  });

  it('keeps long links whole and drops absurdly long ones', () => {
    const long = `https://news.example/${'a'.repeat(900)}`;
    const huge = `https://news.example/${'b'.repeat(2500)}`;
    const feed = `<rss><channel>
<item><title>Long</title><link>${long}</link><pubDate>Mon, 16 Nov 2026 18:45:26 GMT</pubDate></item>
<item><title>Huge</title><link>${huge}</link><pubDate>Mon, 16 Nov 2026 18:45:26 GMT</pubDate></item>
</channel></rss>`;
    expect(parseNewsFeed(feed).map((item) => item.url)).toEqual([long]);
  });

  it('drops insecure links and bad dates', () => {
    expect(parseNewsFeed(FEED).every((item) => item.url.startsWith('https://'))).toBe(true);
  });
});

describe('handlePublicNews', () => {
  const url = new URL('https://x.test/api/public/news');

  it('serves parsed items with a 15 minute cache', async () => {
    const response = await handlePublicNews(url, () => Promise.resolve(new Response(FEED)));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('max-age=900');
    const body = await response.json<{ items: unknown[] }>();
    expect(body.items).toHaveLength(2);
  });

  it('answers 404 when the feed fails or is empty', async () => {
    const failed = await handlePublicNews(url, () => Promise.reject(new Error('down')));
    expect(failed.status).toBe(404);
    const empty = await handlePublicNews(url, () => Promise.resolve(new Response('<rss/>')));
    expect(empty.status).toBe(404);
  });

  it('rejects any query string', async () => {
    const response = await handlePublicNews(new URL(`${url.href}?q=x`), () =>
      Promise.resolve(new Response(FEED)),
    );
    expect(response.status).toBe(400);
  });
});

import { describe, expect, it } from 'vitest';
import { fetchNews } from './news';

const ITEM = {
  id: 'n1',
  title: 'Headline',
  source: 'Paper',
  url: 'https://news.example/a',
  publishedAt: '2026-11-16T18:45:26.000Z',
};

const reply =
  (status: number, body: unknown): typeof fetch =>
  () =>
    Promise.resolve(Response.json(body, { status }));

describe('fetchNews', () => {
  it('returns valid items', async () => {
    expect(await fetchNews(reply(200, { items: [ITEM] }))).toEqual([ITEM]);
  });
  it('returns null on 404', async () => {
    expect(await fetchNews(reply(404, {}))).toBeNull();
  });
  it('throws on a non-https link or other failure', async () => {
    await expect(
      fetchNews(reply(200, { items: [{ ...ITEM, url: 'http://x.test' }] })),
    ).rejects.toThrow();
    await expect(fetchNews(reply(500, {}))).rejects.toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { fetchCrowd } from './crowd';

const NOW = Date.parse('2026-12-01T10:00:00.000Z');
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

const reply =
  (status: number, body: unknown): typeof fetch =>
  () =>
    Promise.resolve(Response.json(body, { status }));

const body = (ghats: unknown) => ({ staleAfterSeconds: 1800, ghats });

describe('fetchCrowd', () => {
  it('returns the level for each ghat with a fresh reading', async () => {
    const result = await fetchCrowd(
      reply(
        200,
        body({
          'pushkar-ghat': { level: 'high', reportedAt: ago(60) },
          'saraswati-ghat': { level: 'low', reportedAt: ago(600) },
        }),
      ),
      NOW,
    );
    expect(result).toEqual({ 'pushkar-ghat': 'high', 'saraswati-ghat': 'low' });
  });

  it('drops a reading older than the stale window', async () => {
    const result = await fetchCrowd(
      reply(200, body({ 'old-ghat': { level: 'high', reportedAt: ago(1801) } })),
      NOW,
    );
    expect(result).toEqual({});
  });

  it('returns null when the service is off or unavailable', async () => {
    expect(await fetchCrowd(reply(404, {}), NOW)).toBeNull();
    expect(await fetchCrowd(reply(503, {}), NOW)).toBeNull();
  });

  it('throws on other failures and on a reply that breaks the contract', async () => {
    await expect(fetchCrowd(reply(500, {}), NOW)).rejects.toThrow();
    await expect(fetchCrowd(reply(200, {}), NOW)).rejects.toThrow();
    await expect(fetchCrowd(reply(200, { ghats: {} }), NOW)).rejects.toThrow();
    await expect(
      fetchCrowd(reply(200, body({ a: { level: 'noData', reportedAt: ago(1) } })), NOW),
    ).rejects.toThrow();
    await expect(
      fetchCrowd(reply(200, body({ a: { level: 'low', reportedAt: 'not a date' } })), NOW),
    ).rejects.toThrow();
    await expect(fetchCrowd(reply(200, body({ a: 'low' })), NOW)).rejects.toThrow();
  });
});

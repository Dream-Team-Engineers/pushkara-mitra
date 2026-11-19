import { describe, expect, it } from 'vitest';
import { tilesAvailable } from './mapArchive';

describe('tilesAvailable', () => {
  const reply =
    (status: number, body: string): typeof fetch =>
    () =>
      Promise.resolve(new Response(body, { status }));

  it('is true for a real archive (ranged or whole)', async () => {
    expect(await tilesAvailable(reply(206, 'PMTiles\u0003rest'))).toBe(true);
    expect(await tilesAvailable(reply(200, 'PMTiles\u0003rest'))).toBe(true);
  });

  it('is false for a missing file, an HTML fallback page or a network error', async () => {
    expect(await tilesAvailable(reply(404, 'Not Found'))).toBe(false);
    expect(await tilesAvailable(reply(200, '<!doctype html><html>'))).toBe(false);
    expect(await tilesAvailable(() => Promise.reject(new Error('offline')))).toBe(false);
  });
});

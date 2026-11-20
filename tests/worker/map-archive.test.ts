import { describe, expect, it } from 'vitest';
import worker from '../../src/index';
import { handleMapArchive, MAP_ARCHIVE_KEY, parseRange } from '../../src/routes/mapArchive';

const BYTES = Uint8Array.from({ length: 100 }, (_, i) => i);
const assets = (status = 200): Fetcher =>
  ({
    fetch: () => Promise.resolve(new Response(status === 200 ? BYTES : 'no', { status })),
  }) as unknown as Fetcher;
const get = (range?: string) =>
  new Request('https://x.test/maps/godavari.pmtiles', {
    headers: range === undefined ? {} : { Range: range },
  });

describe('parseRange', () => {
  it('reads start-end, open-ended and suffix ranges', () => {
    expect(parseRange('bytes=0-6', 100)).toEqual([0, 6]);
    expect(parseRange('bytes=90-', 100)).toEqual([90, 99]);
    expect(parseRange('bytes=-10', 100)).toEqual([90, 99]);
    expect(parseRange('bytes=50-500', 100)).toEqual([50, 99]);
  });
  it('ignores a missing or unsupported header and rejects a range past the end', () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange('bytes=0-1,5-6', 100)).toBeNull();
    expect(parseRange('bytes=200-300', 100)).toBe('invalid');
  });
});

describe('handleMapArchive', () => {
  it('answers a range with 206 and exactly those bytes', async () => {
    const response = await handleMapArchive(get('bytes=2-5'), assets());
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe('bytes 2-5/100');
    expect(response.headers.get('Accept-Ranges')).toBe('bytes');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([2, 3, 4, 5]);
  });

  it('answers a request without a range with the whole file', async () => {
    const response = await handleMapArchive(get(), assets());
    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBe(100);
  });

  it('answers 416 for a range past the end', async () => {
    const response = await handleMapArchive(get('bytes=500-600'), assets());
    expect(response.status).toBe(416);
  });
});

describe('retina sprites', () => {
  it('asks static assets for the canonical %40 name, so there is no redirect', async () => {
    const seen: string[] = [];
    const env = {
      ASSETS: {
        fetch: (request: Request) => {
          seen.push(new URL(request.url).pathname);
          return Promise.resolve(new Response('{}'));
        },
      } as unknown as Fetcher,
    };
    const response = await worker.fetch(
      new Request('https://x.test/maps/sprites/v4/light@2x.json'),
      env,
    );
    expect(response.status).toBe(200);
    expect(seen).toEqual(['/maps/sprites/v4/light%402x.json']);
  });
});

describe('handleMapArchive with an R2 bucket', () => {
  const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  function bucket(present = true): R2Bucket {
    return {
      head: (key: string) =>
        Promise.resolve(present && key === MAP_ARCHIVE_KEY ? { size: data.length } : null),
      get: (_key: string, options?: { range?: { offset: number; length: number } }) => {
        const slice = options?.range
          ? data.slice(options.range.offset, options.range.offset + options.range.length)
          : data;
        return Promise.resolve({ body: new Response(slice).body });
      },
    } as unknown as R2Bucket;
  }
  const request = (range?: string) =>
    new Request('https://example.test/maps/godavari.pmtiles', {
      headers: range === undefined ? {} : { Range: range },
    });
  const noAssets = {
    fetch: () => Promise.resolve(new Response('no', { status: 404 })),
  } as unknown as Fetcher;

  it('answers a byte range from R2', async () => {
    const response = await handleMapArchive(request('bytes=2-5'), noAssets, bucket());
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe('bytes 2-5/10');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([2, 3, 4, 5]);
  });

  it('refuses a range past the end', async () => {
    expect((await handleMapArchive(request('bytes=50-60'), noAssets, bucket())).status).toBe(416);
  });

  it('falls back to the static file when R2 has no archive', async () => {
    const response = await handleMapArchive(request('bytes=2-5'), noAssets, bucket(false));
    // Not served from R2 (no object there); the static path answers instead.
    expect([200, 206, 404]).toContain(response.status);
    expect(response.headers.get('Content-Range')).not.toBe('bytes 2-5/10');
  });
});

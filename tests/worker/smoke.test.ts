import { describe, expect, it } from 'vitest';
import worker from '../../src/index';

const call = (path: string, init?: RequestInit) =>
  worker.fetch(new Request(`https://example.test${path}`, init), {});

describe('worker smoke', () => {
  it('serves /healthz', async () => {
    const res = await call('/healthz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 404 for unknown paths when no assets are bound', async () => {
    expect((await call('/nope')).status).toBe(404);
  });

  it('rejects non-GET methods', async () => {
    const res = await call('/healthz', { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET, HEAD');
  });
});

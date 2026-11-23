import { describe, expect, it } from 'vitest';
import { countEvent } from './ping';

function fake(status: number) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const request = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: input instanceof Request ? input.url : input.toString(), init });
    return Promise.resolve(new Response(null, { status }));
  }) as typeof fetch;
  return { request, calls };
}

describe('app-open counter', () => {
  it('sends nothing when the build has counting off', async () => {
    const off = fake(204);
    expect(await countEvent('open', off.request, false)).toBe(false);
    expect(off.calls).toHaveLength(0);
  });

  it('sends only the event and language, without cookies', async () => {
    const on = fake(204);
    expect(await countEvent('install', on.request, true)).toBe(true);
    expect(on.calls[0]?.url).toBe('/api/v1/ping');
    expect(on.calls[0]?.init?.credentials).toBe('omit');
    expect(JSON.parse(on.calls[0]?.init?.body as string)).toEqual({
      event: 'install',
      locale: 'te',
    });
  });

  it('never throws when the request fails', async () => {
    const broken = (() => Promise.reject(new Error('offline'))) as typeof fetch;
    expect(await countEvent('open', broken, true)).toBe(false);
  });
});

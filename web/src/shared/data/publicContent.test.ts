import { describe, expect, it } from 'vitest';
import { fetchPublicContent, PUBLIC_CONTENT_PREFIX } from './publicContent';
import type { RequestFn } from './publicInformation';

const ITEM = {
  source: 'Official portal',
  sourceUrl: 'https://example.gov.in/',
  updatedAt: '2026-11-14T10:00:00+05:30',
  status: 'verified',
  synthetic: false,
  id: 'h1',
  kind: 'police',
  number: '100',
};

function reply(status: number, body: unknown): { request: RequestFn; calls: RequestInit[] } {
  const calls: RequestInit[] = [];
  return {
    calls,
    request: (input, init) => {
      expect(input).toBe(`${PUBLIC_CONTENT_PREFIX}helplines`);
      calls.push(init);
      return Promise.resolve(Response.json(body, { status }));
    },
  };
}

describe('public content client', () => {
  it('returns validated items and sends no credentials', async () => {
    const { request, calls } = reply(200, { kind: 'helplines', revision: 'r1', items: [ITEM] });
    await expect(fetchPublicContent('helplines', request)).resolves.toEqual([ITEM]);
    expect(calls[0]?.credentials).toBe('omit');
    expect(calls[0]?.cache).toBe('no-store');
  });

  it('returns null when nothing is approved', async () => {
    const { request } = reply(404, { error: { code: 'CONTENT_UNAVAILABLE', message: 'x' } });
    await expect(fetchPublicContent('helplines', request)).resolves.toBeNull();
  });

  it.each([
    ['a 404 from something other than the API', 404, 'Not Found'],
    ['a server error', 500, {}],
    ['a contract violation', 200, { kind: 'helplines', revision: 'r1', items: [{ id: 1 }] }],
    ['the wrong kind', 200, { kind: 'ghats', revision: 'r1', items: [ITEM] }],
  ])('throws on %s instead of showing bad data', async (_label, status, body) => {
    const { request } = reply(status, body);
    await expect(fetchPublicContent('helplines', request)).rejects.toThrow();
  });
});

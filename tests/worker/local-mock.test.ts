import { describe, expect, it } from 'vitest';
import worker from '../../src/index';

const request = (host: string, method = 'GET') =>
  new Request(`http://${host}/api/demo/events`, { method });

describe('local synthetic service boundary', () => {
  it('stays disabled without the opt-in and on non-loopback hosts', async () => {
    for (const [host, env] of [
      ['127.0.0.1', {}],
      ['example.test', { LOCAL_SYNTHETIC_DEMO: 'enabled' }],
    ] as const) {
      const response = await worker.fetch(request(host), env);
      expect(response.status).toBe(404);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
  });

  it('returns invented, uncached fixtures in local opt-in mode', async () => {
    const response = await worker.fetch(request('127.0.0.1'), {
      LOCAL_SYNTHETIC_DEMO: 'enabled',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    const payload = await response.json<{
      synthetic: boolean;
      source: string;
      events: { code: string; title: Record<string, string>; detail: Record<string, string> }[];
    }>();
    expect(payload.synthetic).toBe(true);
    expect(payload.source).toBe('local-mock');
    expect(payload.events.map((event) => event.code)).toEqual(['M1', 'M2']);
    expect(payload.events[0]?.title.en).toContain('Mock');
    for (const event of payload.events) {
      for (const language of ['te', 'en', 'hi']) {
        expect(event.title[language]).toBeTruthy();
        expect(event.detail[language]).toBeTruthy();
      }
      expect(event.title.hi).not.toMatch(/[A-Za-z]/);
      expect(event.detail.hi).not.toMatch(/[A-Za-z]/);
    }
  });

  it('never accepts writes', async () => {
    const response = await worker.fetch(request('127.0.0.1', 'POST'), {
      LOCAL_SYNTHETIC_DEMO: 'enabled',
    });
    expect(response.status).toBe(405);
  });
});

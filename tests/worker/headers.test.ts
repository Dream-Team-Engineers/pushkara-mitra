import { describe, expect, it } from 'vitest';
import worker from '../../src/index';
import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  withSecurityHeaders,
} from '../../src/security/headers';

describe('security headers', () => {
  it('are present on success, error and 405 responses', async () => {
    for (const [path, init] of [
      ['/healthz', undefined],
      ['/missing', undefined],
      ['/healthz', { method: 'DELETE' }],
    ] as const) {
      const res = await worker.fetch(new Request(`https://example.test${path}`, init), {});
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        expect(res.headers.get(name), `${name} on ${path}`).toBe(value);
      }
    }
  });

  it('has a strict CSP', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-inline');
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval');
  });

  it('lets this site ask for the device position only where it is switched on', () => {
    const base = new Response('ok');
    expect(withSecurityHeaders(base).headers.get('Permissions-Policy')).toContain('geolocation=()');
    const enabled = withSecurityHeaders(new Response('ok'), false, true).headers.get(
      'Permissions-Policy',
    );
    expect(enabled).toContain('geolocation=(self)');
    expect(enabled).toContain('camera=()');
    expect(enabled).not.toContain('geolocation=*');
  });

  it('denies geolocation by default and sends no referrer', () => {
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('geolocation=()');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('no-referrer');
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toMatch(/max-age=\d+/);
  });
});

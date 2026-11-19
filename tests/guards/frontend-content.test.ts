import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listCodeFiles, readCode } from './frontend-scan';
import { stripComments } from './scan';

/**
 * Content and egress guard for web/src (ADR 0011, docs/frontend/architecture-blueprint.md).
 * docs/content/*.json is NEEDS_REVIEW and must never reach the app, and the app must not
 * hard-code links to external sites or load third-party assets (CSP is 'self' only).
 */
const ROOT = join(import.meta.dirname, '..', '..', 'web', 'src');
const files = readCode(ROOT, listCodeFiles(ROOT));
const production = files.filter((file) => !/\.test\.tsx?$/.test(file.path));

describe('frontend content guard', () => {
  it('finds frontend code to scan', () => {
    expect(production.length).toBeGreaterThan(5);
  });

  it('never imports from docs/content or the repo-level content folders', () => {
    const offenders = files
      .filter((file) => /docs\/content|\.\.\/\.\.\/\.\.\/docs/.test(stripComments(file.source)))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  /**
   * Owner decision 2026-11-15 (ADR 0008, OQ-030): Google sign-in. This file may name Google's sign-in
   * script and nothing else; the Worker's Content-Security-Policy allows only that origin path, and only
   * where GOOGLE_CLIENT_ID is configured (staging first).
   */
  const EXTERNAL_URL_ALLOW_LIST: Readonly<Record<string, readonly string[]>> = {
    'shared/auth/google.ts': ['https://accounts.google.com/gsi/client'],
    /**
     * Owner request 2026-11-19: outbound source links for travel, stay, culture and maps. Every URL
     * is a page the agent opened or is marked "not yet checked" on screen. Links open in a new tab;
     * the page CSP is unchanged because nothing is fetched from these hosts.
     */
    'shared/data/sourceLinks.ts': [
      'https://www.irctc.co.in/',
      'https://www.apsrtconline.in/',
      'https://www.aai.aero/',
      'https://eastgodavari.ap.gov.in/godavari-pushkaralu-2027/',
      'https://eastgodavari.ap.gov.in/Hotels',
      'https://eastgodavari.ap.gov.in/religious-tourism/',
      'https://eastgodavari.ap.gov.in/cultural-tourism/',
      'https://en.wikipedia.org/wiki/Godavari_Pushkaram',
      'https://www.openstreetmap.org/search?query=',
    ],
  };

  it('hard-codes no external URLs in application code', () => {
    const offenders = production
      .filter((file) => /https?:\/\//.test(stripComments(file.source)))
      .filter((file) => !(file.path in EXTERNAL_URL_ALLOW_LIST))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('lets the allow-listed files name only the URLs they are approved for', () => {
    for (const [path, allowed] of Object.entries(EXTERNAL_URL_ALLOW_LIST)) {
      const file = production.find((candidate) => candidate.path === path);
      const urls = [...stripComments(file?.source ?? '').matchAll(/https?:\/\/[^'"`\s)]+/g)].map(
        (match) => match[0],
      );
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) expect(allowed).toContain(url);
    }
  });

  it('keeps the scanner honest', () => {
    expect(/https?:\/\//.test(stripComments("const a = 'https://example.org';"))).toBe(true);
    expect(/https?:\/\//.test(stripComments('// https://example.org\nconst a = 1;'))).toBe(false);
    expect(/docs\/content/.test(stripComments("import x from '../docs/content/a.json';"))).toBe(
      true,
    );
  });
});

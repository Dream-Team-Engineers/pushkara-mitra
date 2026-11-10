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

  it('hard-codes no external URLs in application code', () => {
    const offenders = production
      .filter((file) => /https?:\/\//.test(stripComments(file.source)))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('keeps the scanner honest', () => {
    expect(/https?:\/\//.test(stripComments("const a = 'https://example.org';"))).toBe(true);
    expect(/https?:\/\//.test(stripComments('// https://example.org\nconst a = 1;'))).toBe(false);
    expect(/docs\/content/.test(stripComments("import x from '../docs/content/a.json';"))).toBe(
      true,
    );
  });
});

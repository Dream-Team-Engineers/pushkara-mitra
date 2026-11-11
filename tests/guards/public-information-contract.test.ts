import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '../../src/content/publicInformation';

/**
 * Keeps docs/contracts/public-information.openapi.yaml and the code in step. A change to either
 * side that is not mirrored fails here, in the same reviewed PR. Text checks, not a YAML parse,
 * so no new dependency is needed.
 */
const spec = readFileSync(
  join(import.meta.dirname, '..', '..', 'docs', 'contracts', 'public-information.openapi.yaml'),
  'utf8',
);
const validator = readFileSync(
  join(import.meta.dirname, '..', '..', 'src', 'content', 'publicInformation.ts'),
  'utf8',
);
const client = readFileSync(
  join(import.meta.dirname, '..', '..', 'web', 'src', 'shared', 'data', 'publicInformation.ts'),
  'utf8',
);

describe('public information contract matches the code', () => {
  it('lists the same locales', () => {
    expect(spec).toContain(`enum: [${LOCALES.join(', ')}]`);
  });

  it('uses the same limits on the server validator and the client validator', () => {
    for (const source of [spec]) {
      expect(source).toContain('maxItems: 12');
      expect(source).toContain('maxLength: 600');
      expect(source).toContain('maxLength: 120');
      expect(source).toContain("pattern: '^[a-zA-Z0-9._-]+$'");
    }
    expect(validator).toContain('paragraph.length > 600');
    expect(validator).toContain('document.title.length > 120');
    expect(validator).toContain('document.paragraphs.length > 12');
    expect(client).toContain("isText(record['title'], 1, 120)");
    expect(client).toContain('paragraphs.length <= 12');
    expect(client).toContain('isText(paragraph, 1, 600)');
  });

  it('declares exactly the two documented error codes', () => {
    expect(spec).toContain('enum: [INVALID_QUERY, INFORMATION_UNAVAILABLE]');
    const errors = readFileSync(
      join(import.meta.dirname, '..', '..', 'src', 'http', 'errors.ts'),
      'utf8',
    );
    expect(errors).toContain("'INVALID_QUERY' | 'INFORMATION_UNAVAILABLE'");
  });

  it('keeps no-store on every documented response', () => {
    expect(spec.match(/const: no-store/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('does not mark the endpoint approved', () => {
    expect(spec).toContain('x-review-status: PROPOSED');
    expect(spec).toContain('x-approval-evidence: null');
  });
});

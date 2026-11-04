import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = (name: string) =>
  readFileSync(join(import.meta.dirname, '..', '..', '.github', 'workflows', name), 'utf8');

describe('production release stop gate', () => {
  it('preserves release-please automation and its release configuration', () => {
    const release = workflow('release.yml');
    expect(release).toMatch(/branches:\s*\[main\]/);
    expect(release).toMatch(/uses: googleapis\/release-please-action@[a-f0-9]{40}/);
    expect(release).toContain('config-file: release-please-config.json');
    expect(release).toContain('manifest-file: .release-please-manifest.json');
  });

  it('does not deploy production when a release is created', () => {
    expect(workflow('release.yml')).not.toMatch(/uses:.*deploy-production/);
  });

  it('fails the retained callable workflow without exposing production credentials', () => {
    const production = workflow('deploy-production.yml');
    expect(production).toContain('workflow_call:');
    expect(production).toMatch(/^\s+exit 1$/m);
    expect(production).not.toMatch(
      /secrets\.|environment:\s*production|wrangler|actions\/checkout/,
    );
  });
});

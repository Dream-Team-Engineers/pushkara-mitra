import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (file: string): string => readFileSync(join(ROOT, file), 'utf8');

describe('Google sign-in configuration', () => {
  const fromVite = /STAGING_GOOGLE_CLIENT_ID =\s*'([^']+)'/.exec(read('vite.config.ts'))?.[1];
  const stagingBlock = /\[env\.staging\.vars\][^[]*/.exec(read('wrangler.toml'))?.[0] ?? '';
  const fromWrangler = /GOOGLE_CLIENT_ID\s*=\s*"([^"]+)"/.exec(stagingBlock)?.[1];

  it('uses the same public client ID in the staging build and the staging Worker', () => {
    expect(fromVite).toMatch(/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
    expect(fromWrangler).toBe(fromVite);
  });

  it('sets no client ID for preview or production, so sign-in stays off there', () => {
    const wrangler = read('wrangler.toml');
    expect(wrangler.match(/GOOGLE_CLIENT_ID/g)).toHaveLength(1);
    expect(wrangler).not.toMatch(/\[env\.production\.vars\]/);
    const pkg = read('package.json');
    expect(pkg).toMatch(/"ship:staging":[^\n]*build:web:staging/);
    expect(pkg).toMatch(/"ship:production":[^\n]*build:web &&/);
  });

  it('builds staging with the staging mode in CI, so a push cannot remove the client ID', () => {
    const workflow = read('.github/workflows/deploy-staging.yml');
    expect(workflow).toMatch(/run:\s*npm run build:web:staging/);
    expect(workflow).not.toMatch(/run:\s*npm run build:web\s*$/m);
  });

  it('holds no client secret anywhere in the repository config', () => {
    for (const file of ['vite.config.ts', 'wrangler.toml', 'package.json']) {
      expect(read(file)).not.toMatch(/GOCSPX-|client_secret/i);
    }
  });
});

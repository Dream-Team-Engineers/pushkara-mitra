import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (file: string): string => readFileSync(join(ROOT, file), 'utf8');

describe('Google sign-in configuration', () => {
  const fromVite = /GOOGLE_CLIENT_ID_PUBLIC =\s*'([^']+)'/.exec(read('vite.config.ts'))?.[1];
  const stagingBlock = /\[env\.staging\.vars\][^[]*/.exec(read('wrangler.toml'))?.[0] ?? '';
  const fromWrangler = /GOOGLE_CLIENT_ID\s*=\s*"([^"]+)"/.exec(stagingBlock)?.[1];

  it('uses the same public client ID in the staging build and the staging Worker', () => {
    expect(fromVite).toMatch(/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
    expect(fromWrangler).toBe(fromVite);
  });

  it('sets the client ID for staging and production only, never for preview or top level', () => {
    const wrangler = read('wrangler.toml');
    const production = /\[env\.production\.vars\][^[]*/.exec(wrangler)?.[0] ?? '';
    expect(/GOOGLE_CLIENT_ID\s*=\s*"([^"]+)"/.exec(production)?.[1]).toBe(fromVite);
    expect(wrangler.match(/GOOGLE_CLIENT_ID/g)).toHaveLength(2);
    expect(wrangler).not.toMatch(/\[env\.preview\.vars\]/);
    const pkg = read('package.json');
    expect(pkg).toMatch(/"ship:staging":[^\n]*build:web:staging/);
    // The live release uses its own mode; a plain build (CI, preview) carries no client ID.
    expect(pkg).toMatch(/"ship:production":[^\n]*build:web:production/);
    expect(pkg).toMatch(/"build:web:production":\s*"vite build --mode release"/);
    expect(read('vite.config.ts')).toMatch(/staging \|\| release\s*\? GOOGLE_CLIENT_ID_PUBLIC/);
  });

  it('keeps metrics, device location and sample rows out of the release build', () => {
    const vite = read('vite.config.ts');
    expect(vite).toMatch(/VITE_GROUPS'[^\n]*staging \|\| release/);
    expect(vite).toMatch(/VITE_METRICS'[^\n]*staging/);
    expect(vite).toMatch(/VITE_DEVICE_LOCATION'[^\n]*staging/);
    expect(vite).not.toMatch(/VITE_(METRICS|DEVICE_LOCATION)'[^\n]*release/);
    expect(vite).toMatch(/VITE_SHOW_SAMPLES'[^;]*\|\| release/);
    const production = /\[env\.production\.vars\][^[]*/.exec(read('wrangler.toml'))?.[0] ?? '';
    // Groups are on in production, but live position sharing is not.
    expect(production).toMatch(/FLAG_GROUPS\s*=\s*"enabled"/);
    expect(production).not.toMatch(/FLAG_GROUP_LOCATION|FLAG_METRICS|DEVICE_LOCATION/);
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

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Phone notifications for partners (ADR 0020): the rules that must hold in the files themselves. */
const root = join(import.meta.dirname, '..', '..');
const read = (...parts: string[]): string => readFileSync(join(root, ...parts), 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

describe('partner push guard (ADR 0020)', () => {
  it('keeps the push handlers in the service worker free of network and cache calls', () => {
    const sw = read('web', 'build', 'sw.template.js');
    const start = sw.indexOf("self.addEventListener('push'");
    const end = sw.indexOf('const rangeBlobs');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = sw.slice(start, end);
    expect(block).not.toMatch(/\bfetch\s*\(/);
    expect(block).not.toMatch(/\bcaches\b/);
    expect(block).not.toMatch(/event\.data/);
    // The text is fixed here; the click always opens the app's own Partners screen.
    expect(block).toContain("'A new request is waiting.'");
    expect(block).toContain("'/#/partners'");
  });

  it('holds the VAPID private key in the admin Worker only', () => {
    for (const file of sourceFiles(join(root, 'src'))) {
      if (file.includes(join('src', 'admin'))) continue;
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/VAPID_PRIVATE_KEY/);
    }
    expect(read('wrangler.toml')).not.toMatch(/VAPID_PRIVATE_KEY/);
    expect(read('wrangler.admin.toml')).not.toMatch(/VAPID_PRIVATE_KEY\s*=/);
  });

  it('never logs or throws a push address', () => {
    for (const file of [
      join(root, 'src', 'admin', 'push.ts'),
      join(root, 'src', 'routes', 'partners.ts'),
      join(root, 'src', 'security', 'pushEndpoint.ts'),
    ]) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/console\./);
      expect(text, file).not.toMatch(/new Error\([^)]*endpoint/);
    }
  });

  it('stores no location, device detail or message content with a subscription', () => {
    const sql = read('migrations', '0010_partner_push.sql');
    const table = /CREATE TABLE partner_push \(([\s\S]*?)\) STRICT;/.exec(sql)?.[1] ?? '';
    expect(table).not.toBe('');
    expect(table).not.toMatch(
      /lat|lng|latitude|longitude|coordinate|user_agent|device|ip_|payload|p256dh|auth_/i,
    );
  });

  it('keeps the flag fail-closed and out of the public config', () => {
    const flags = read('src', 'flags.ts');
    expect(flags).toContain("'partner-push': 'FLAG_PARTNER_PUSH'");
    // Off everywhere until the owner sets the keys and turns it on for staging by hand.
    expect(read('wrangler.toml')).not.toMatch(/FLAG_PARTNER_PUSH\s*=/);
    expect(read('wrangler.admin.toml')).not.toMatch(/FLAG_PARTNER_PUSH\s*=/);
  });
});

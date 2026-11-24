import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Access verifier is used only by the separate staff admin Worker (src/admin/, ADR 0018; owner
 * decisions on BF-02 and BF-03, 2026-11-23). The public app Worker must never import it and has no
 * admin route; the admin Worker never reads an email claim.
 */
const root = join(import.meta.dirname, '..', '..');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('Access token verifier stays in the admin Worker', () => {
  it('is imported only by the admin Worker', () => {
    const adminDir = join(root, 'src', 'admin');
    for (const file of sourceFiles(join(root, 'src'))) {
      if (file.endsWith('accessJwt.ts') || file.endsWith('accessKeys.ts')) continue;
      if (file.startsWith(adminDir)) continue;
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/accessJwt/);
      expect(text, file).not.toMatch(/accessKeys/);
    }
  });

  it('has no route for admin or auth paths in the Worker entry', () => {
    const entry = readFileSync(join(root, 'src', 'index.ts'), 'utf8');
    expect(entry).not.toMatch(/['"`]\/admin/);
    expect(entry).not.toMatch(/['"`]\/auth/);
    expect(entry).not.toMatch(/Cf-Access/i);
  });

  it('never reads an email claim from the Access token', () => {
    // render.ts is left out on purpose: since ADR 0019 it shows a partner applicant's own name and
    // email (from the database, for approving them), which is not an Access claim.
    for (const file of [
      join(root, 'src', 'security', 'accessJwt.ts'),
      join(root, 'src', 'admin', 'access.ts'),
      join(root, 'src', 'admin', 'index.ts'),
    ]) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\.email\b|\[['"]email['"]\]/);
    }
  });

  it('keeps the admin Worker separate and read-only', () => {
    for (const file of sourceFiles(join(root, 'src', 'admin'))) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/);
      expect(text, file).not.toMatch(/from '\.\.\/routes\//);
    }
    const stats = readFileSync(join(root, 'src', 'db', 'adminStats.ts'), 'utf8');
    expect(stats).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/);
  });

  it('limits the admin writes to partner data (ADR 0019)', () => {
    const text = readFileSync(join(root, 'src', 'db', 'adminPartners.ts'), 'utf8');
    const allowed = [
      'partner',
      'partner_nudge',
      'partner_nudge_read',
      'partner_update',
      'partner_audit',
    ];
    // Every write statement names one of the partner tables and nothing else.
    const writes = [...text.matchAll(/\b(?:INSERT INTO|UPDATE|DELETE FROM)\s+([a-z_]+)/g)].map(
      (m) => m[1] ?? '',
    );
    expect(writes.length).toBeGreaterThan(0);
    for (const table of writes) expect(allowed).toContain(table);
    expect(text).not.toMatch(/\b(DROP|ALTER|CREATE)\b/);
    // It never touches pilgrim data, positions or consent records.
    expect(text).not.toMatch(
      /\b(session|membership|group_|group_block|invitation|consent_ledger|sos_request|crowd_reading|daily_metric)\b/,
    );
    expect(text).not.toMatch(/\b(lat|lng|latitude|longitude|coordinates?)\b/i);
    // The admin Worker has exactly three write routes.
    const index = readFileSync(join(root, 'src', 'admin', 'index.ts'), 'utf8');
    const paths = /const WRITE_PATHS = \[([^\]]*)\]/.exec(index)?.[1] ?? '';
    expect(paths.match(/'[^']+'/g)).toEqual([
      "'/partners/decide'",
      "'/partners/nudge'",
      "'/partners/hide'",
    ]);
  });
});

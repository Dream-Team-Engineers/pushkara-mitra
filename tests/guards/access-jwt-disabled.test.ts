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

  it('never reads an email claim', () => {
    for (const file of [
      join(root, 'src', 'security', 'accessJwt.ts'),
      ...sourceFiles(join(root, 'src', 'admin')),
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
});

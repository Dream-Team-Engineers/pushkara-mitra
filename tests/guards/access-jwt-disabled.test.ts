import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Access verifier is a building block, not a feature. BF-02 and BF-03 are not approved, so
 * nothing in the Worker may import it, and no admin or auth route may exist yet.
 */
const root = join(import.meta.dirname, '..', '..');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('Access token verifier stays disabled', () => {
  it('is not imported by any Worker source file', () => {
    for (const file of sourceFiles(join(root, 'src'))) {
      if (file.endsWith('accessJwt.ts') || file.endsWith('accessKeys.ts')) continue;
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
    const source = readFileSync(join(root, 'src', 'security', 'accessJwt.ts'), 'utf8');
    expect(source).not.toMatch(/\[['"]email['"]\]/);
  });
});

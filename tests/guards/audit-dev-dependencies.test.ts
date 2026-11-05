import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(import.meta.dirname, '../../scripts/audit-dev-dependencies.mjs');
const report = (moderate: number, high = 0) => ({
  metadata: {
    vulnerabilities: { info: 0, low: 0, moderate, high, critical: 0, total: moderate + high },
  },
});
function audit(stdout: unknown, status: number, raw = false, legacy = false) {
  const dir = mkdtempSync(join(tmpdir(), 'audit-result-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    const input = join(dir, 'result');
    writeFileSync(input, raw ? String(stdout) : JSON.stringify(stdout));
    writeFileSync(join(bin, 'npm'), '#!/bin/sh\ncat "$REPORT_FILE"\nexit "$REPORT_EXIT"\n', {
      mode: 0o755,
    });
    return spawnSync(
      legacy ? 'bash' : process.execPath,
      legacy ? ['-c', 'npm audit --audit-level=high || echo advisory-warning'] : [script],
      {
        encoding: 'utf8',
        env: { PATH: `${bin}:/usr/bin:/bin`, REPORT_FILE: input, REPORT_EXIT: String(status) },
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('informational dependency findings versus scanner failure', () => {
  it('accepts a completed clean audit', () => {
    expect(audit(report(0), 0).status).toBe(0);
  });
  it('reports moderate findings without treating them as an outage', () => {
    const result = audit(report(27), 0);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('27 entries');
  });
  it('retains informational high dev findings with valid evidence', () => {
    const result = audit(report(0, 1), 1);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Production audit remains a separate blocking check');
  });
  it.each([
    { output: { error: { code: 'ENETWORK' } }, exit: 1 },
    { output: report(0), exit: 2 },
    { output: report(0), exit: 1 },
    { output: { metadata: { vulnerabilities: { high: -1 } } }, exit: 0 },
  ])('fails operational or invalid evidence: $exit / $output', ({ output, exit }) => {
    expect(audit(output, exit).status).toBe(1);
  });
  it('demonstrates why the old catch-all hid an operational failure', () => {
    const error = { error: { code: 'ENETWORK' } };
    expect(audit(error, 2, false, true).status).toBe(0);
    expect(audit(error, 2).status).toBe(1);
  });

  it('rejects non-JSON output instead of announcing advisories', () => {
    const result = audit('private registry unavailable', 1, true);
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('::warning::');
  });
});

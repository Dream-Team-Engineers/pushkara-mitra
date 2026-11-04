import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(import.meta.dirname, '../../.github/workflows/preview.yml'),
  'utf8',
);
const start = workflow.indexOf('      - name: Upload preview Worker version');
const end = workflow.indexOf('      - name: Comment preview URL', start);
const step = workflow.slice(start, end);
const script = step.split('        run: |\n')[1]?.replaceAll(/^ {10}/gm, '');
if (start < 0 || end < 0 || !script) throw new Error('Preview upload script not found');

function runUpload(mode: string, credentials: boolean) {
  const dir = mkdtempSync(join(tmpdir(), 'preview-upload-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    writeFileSync(
      join(bin, 'npx'),
      '#!/bin/sh\ncase "$MOCK_MODE" in\nfail) exit 7;;\nno-url) echo "upload complete";;\ninvalid-url) echo "https://version.workers.dev.evil.example";;\nok) echo "https://version.example.workers.dev";;\nesac\n',
      { mode: 0o755 },
    );
    const output = join(dir, 'output');
    writeFileSync(output, '');
    const result = spawnSync('bash', ['-c', script ?? 'exit 99'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        PATH: `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`,
        GITHUB_OUTPUT: output,
        MOCK_MODE: mode,
        PR_NUMBER: '1',
        CLOUDFLARE_API_TOKEN: credentials ? 'synthetic-test-token' : '',
        CLOUDFLARE_ACCOUNT_ID: credentials ? 'synthetic-test-account' : '',
      },
    });
    if (result.error) throw result.error;
    return { status: result.status, output: readFileSync(output, 'utf8') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('preview upload outcome', () => {
  it('fails visibly when credentials are absent', () => {
    const result = runUpload('ok', false);
    expect(result.status).toBe(1);
    expect(result.output).toContain('deployed=false');
    expect(result.output).not.toContain('deployed=true');
    expect(workflow).toContain("if: failure() && steps.upload.outputs.deployed == 'false'");
  });

  it('preserves upload failure through the logging pipeline', () => {
    const result = runUpload('fail', true);
    expect(result.status).toBe(7);
    expect(result.output).not.toContain('deployed=true');
  });

  it('does not report success without a preview URL', () => {
    const result = runUpload('no-url', true);
    expect(result.status).toBe(1);
    expect(result.output).not.toContain('deployed=true');
  });

  it('rejects a lookalike workers.dev hostname', () => {
    const result = runUpload('invalid-url', true);
    expect(result.status).toBe(1);
    expect(result.output).not.toContain('deployed=true');
  });

  it('reports success and the URL only after a successful upload', () => {
    const result = runUpload('ok', true);
    expect(result.status).toBe(0);
    expect(result.output).toContain('deployed=true');
    expect(result.output).toContain('url=https://version.example.workers.dev');
  });
});

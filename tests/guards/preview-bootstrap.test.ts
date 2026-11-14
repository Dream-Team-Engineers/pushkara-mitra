import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../..');
const workflow = readFileSync(join(root, '.github/workflows/bootstrap-preview.yml'), 'utf8');
const mergeSha = 'a'.repeat(40);
const headSha = 'b'.repeat(40);
const repository = 'Dream-Team-Engineers/pushkara-mitra';
const basePr = {
  number: 99,
  state: 'closed',
  merged_at: '2026-11-04T12:00:00Z',
  merge_commit_sha: mergeSha,
  user: { login: 'gkmraju' },
  base: { ref: 'main', repo: { full_name: repository } },
  head: { sha: headSha, repo: { full_name: repository } },
};
function sourceResult(pr: unknown) {
  const dir = mkdtempSync(join(tmpdir(), 'preview-review-'));
  try {
    writeFileSync(join(dir, 'pr.json'), JSON.stringify(pr));
    return spawnSync(
      process.execPath,
      [
        join(root, 'scripts/verify-preview-bootstrap-review.mjs'),
        join(dir, 'pr.json'),
        mergeSha,
        repository,
        '99',
      ],
      { encoding: 'utf8' },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('manual owner bootstrap boundary', () => {
  it('is dispatch-only, checks immutable main and exposes Cloudflare secrets only to deployment', () => {
    const trigger = workflow.split('\non:\n')[1]?.split('\npermissions:')[0];
    expect(trigger).toContain('workflow_dispatch:');
    expect(trigger).not.toMatch(/^ {2}(?:push|pull_request|workflow_call|schedule):/m);
    expect(workflow).toContain('ref: ${{ github.sha }}');
    expect(workflow).toContain('environment: preview');
    expect(workflow).not.toContain('secrets: inherit');
    expect(workflow.split('CLOUDFLARE_API_TOKEN:')).toHaveLength(2);
  });

  const guard = workflow
    .split('      - name: Validate manual preview intent')[1]
    ?.split('      - uses:')[0]
    ?.split('        run: |\n')[1]
    ?.replaceAll(/^ {10}/gm, '');
  if (!guard) throw new Error('Bootstrap manual intent guard missing');
  const validIntent = {
    BOOTSTRAP_EVENT: 'workflow_dispatch',
    BOOTSTRAP_ACTOR: 'gkmraju',
    BOOTSTRAP_REF: 'refs/heads/main',
    BOOTSTRAP_CONFIRMATION: 'BOOTSTRAP_PREVIEW',
    BOOTSTRAP_PR: '99',
    BOOTSTRAP_PREFLIGHT: 'true',
  };
  it('accepts explicit main dispatch intent only', () => {
    expect(spawnSync('bash', ['-c', guard], { env: validIntent }).status).toBe(0);
  });
  for (const [key, value] of Object.entries({
    BOOTSTRAP_EVENT: 'pull_request',
    BOOTSTRAP_ACTOR: 'someone-else',
    BOOTSTRAP_REF: 'refs/heads/feature',
    BOOTSTRAP_CONFIRMATION: 'yes',
    BOOTSTRAP_PR: '99; echo unsafe',
    BOOTSTRAP_PREFLIGHT: 'false',
  })) {
    it(`rejects invalid ${key}`, () => {
      expect(
        spawnSync('bash', ['-c', guard], { env: { ...validIntent, [key]: value } }).status,
      ).toBe(1);
    });
  }

  it('accepts only a merged source PR at the immutable main commit', () => {
    expect(sourceResult(basePr).status).toBe(0);
    expect(sourceResult({ ...basePr, merged_at: null }).status).toBe(1);
    expect(sourceResult({ ...basePr, merge_commit_sha: 'c'.repeat(40) }).status).toBe(1);
    expect(
      sourceResult({ ...basePr, base: { ref: 'other', repo: { full_name: repository } } }).status,
    ).toBe(1);
  });
});

const mockNpx = `#!/usr/bin/env node
const fs = require('node:fs');
fs.writeFileSync(process.env.MOCK_MARKER, JSON.stringify(process.argv.slice(2)));
if (process.env.MOCK_MODE === 'deploy-fail') { console.error(process.env.CLOUDFLARE_API_TOKEN); process.exit(7); }
console.log(process.env.MOCK_MODE === 'bad-url' ? 'https://pushkara-mitra-preview.example.workers.dev.evil.test' : 'https://pushkara-mitra-preview.example.workers.dev');
`;
const mockCurl = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2), url = args.at(-1), mode = process.env.MOCK_MODE;
const arg = (name) => args[args.indexOf(name) + 1];
const write = (name, value) => { if (args.includes(name)) fs.writeFileSync(arg(name), value); };
const nl = String.fromCharCode(13, 10);
if (url.startsWith('https://api.cloudflare.com/')) {
  const errors = mode === 'mixed-missing' ? [{code:10007},{code:10000}] : [{code:10007}];
  write('--output', JSON.stringify({success:false,errors}));
  process.stdout.write(mode === 'exists' ? '200' : mode === 'forbidden' ? '403' : '404');
} else if (args.includes('--request')) {
  write('--output', 'Method Not Allowed');
  const old = ['HTTP/2 503','Allow: GET, HEAD','',''].join(nl);
  const final = mode === 'stale-post-headers' ? ['HTTP/2 405','',''].join(nl) : ['HTTP/2 405','Allow: GET, HEAD','',''].join(nl);
  write('--dump-header', (mode === 'stale-post-headers' ? old : '') + final);
  process.stdout.write(mode === 'bad-method' ? '200' : '405');
} else {
  if (mode === 'health-http') process.exit(22);
  write('--output', JSON.stringify({status:mode === 'bad-body' ? 'bad' : 'ok'}));
  const rows=['HTTP/2 200','Cache-Control: '+(mode === 'bad-cache' ? 'public' : 'no-store'),'Content-Security-Policy: default-src none','Strict-Transport-Security: max-age=31536000','X-Content-Type-Options: nosniff','Referrer-Policy: no-referrer'];
  if (mode !== 'bad-headers') rows.push('Permissions-Policy: geolocation=()');
  rows.push('','');
  let h=rows.join(nl);
  if (mode === 'stale-headers') h=h.replace('HTTP/2 200','HTTP/2 503') + ['HTTP/2 200','',''].join(nl);
  write('--dump-header', h); process.stdout.write('200');
}
`;
function deployResult(mode: string, credentials = 'both') {
  const dir = mkdtempSync(join(tmpdir(), 'preview-deploy-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'npx'), mockNpx, { mode: 0o755 });
    writeFileSync(join(bin, 'curl'), mockCurl, { mode: 0o755 });
    const summary = join(dir, 'summary'),
      marker = join(dir, 'deployed');
    const token = 'synthetic-preview-token';
    const result = spawnSync(process.execPath, [join(root, 'scripts/bootstrap-preview.mjs')], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        PATH: `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`,
        RUNNER_TEMP: dir,
        MOCK_MODE: mode,
        MOCK_MARKER: marker,
        GITHUB_STEP_SUMMARY: summary,
        CLOUDFLARE_API_TOKEN: credentials === 'none' ? '' : token,
        CLOUDFLARE_ACCOUNT_ID: credentials === 'both' ? '0'.repeat(32) : '',
      },
    });
    if (result.error) throw result.error;
    expect(`${result.stdout}${result.stderr}`).not.toContain(token);
    return {
      status: result.status,
      invoked: existsSync(marker),
      args: existsSync(marker) ? (JSON.parse(readFileSync(marker, 'utf8')) as unknown) : null,
      summary: existsSync(summary) ? readFileSync(summary, 'utf8') : '',
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('one-time preview deployment without external calls', () => {
  it.each(['none', 'token-only'])('does not deploy with %s credentials', (credentials) => {
    const result = deployResult('ok', credentials);
    expect(result.status).toBe(1);
    expect(result.invoked).toBe(false);
  });
  it.each(['exists', 'forbidden', 'mixed-missing'])(
    'stops preflight on %s without overwrite or reset',
    (mode) => {
      const result = deployResult(mode);
      expect(result.status).toBe(1);
      expect(result.invoked).toBe(false);
    },
  );
  it.each([
    'deploy-fail',
    'bad-url',
    'health-http',
    'bad-body',
    'bad-cache',
    'bad-headers',
    'bad-method',
    'stale-headers',
    'stale-post-headers',
  ])('does not claim verified success on %s', (mode) => {
    const result = deployResult(mode);
    expect(result.status).toBe(1);
    expect(result.summary).toBe('');
  });
  it('targets preview only and verifies health before reporting success', () => {
    const result = deployResult('ok');
    expect(result.status).toBe(0);
    expect(result.args).toEqual(['wrangler', 'deploy', '--env', 'preview']);
    expect(result.summary).toContain('https://pushkara-mitra-preview.example.workers.dev');
    expect(result.summary).toContain('not feature/UAT readiness');
  });
});

// One-time preview bootstrap only. Stops on existing Worker; requires a human-controlled single-writer window.
// The existence check is not an atomic create-if-absent operation. Never deletes or resets resources.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';

let work;
try {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) throw new Error('Missing preview credentials; nothing deployed.');
  if (!/^[a-f0-9]{32}$/i.test(account))
    throw new Error('Invalid preview account identifier format.');
  work = mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), 'preview-bootstrap-'));
  const run = (command, args) => {
    const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    if (result.error || result.status !== 0) {
      const safe = `${result.stdout ?? ''}${result.stderr ?? ''}`
        .replaceAll(token, '***')
        .replaceAll(account, '***');
      if (command === 'npx' && safe) console.error(safe);
      throw new Error(`${command} failed; bootstrap stopped without retry or reset.`);
    }
    return result.stdout.trim();
  };
  const readJson = (path) => {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      throw new Error('Missing or invalid JSON response; bootstrap stopped.');
    }
  };
  const workerBody = join(work, 'worker.json');
  const http = run('curl', [
    '--silent',
    '--show-error',
    '--max-time',
    '20',
    '--output',
    workerBody,
    '--write-out',
    '%{http_code}',
    '--header',
    `Authorization: Bearer ${token}`,
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/pushkara-mitra-preview`,
  ]);
  if (!/^\d{3}$/.test(http))
    throw new Error('Invalid Cloudflare HTTP status; no deployment performed.');
  if (http === '200')
    throw new Error(
      'Preview Worker already exists: stop bootstrap and use version upload; do not overwrite it.',
    );
  if (http !== '404')
    throw new Error(
      `Preview existence check returned HTTP ${http}; verify account/token access, no deployment performed.`,
    );
  const missing = readJson(workerBody);
  if (
    missing.success !== false ||
    !Array.isArray(missing.errors) ||
    missing.errors.length !== 1 ||
    missing.errors[0]?.code !== 10007
  ) {
    throw new Error('Cloudflare did not confirm Worker-not-found; no deployment performed.');
  }
  const output = run('npx', ['wrangler', 'deploy', '--env', 'preview']);
  writeFileSync(
    join(work, 'deploy.log'),
    output.replaceAll(token, '***').replaceAll(account, '***'),
  );
  const origins = new Set();
  const plainOutput = output.replaceAll(String.fromCharCode(27), ' ');
  for (const candidate of plainOutput.match(/https:\/\/[^\s"<>]+/g) ?? []) {
    try {
      const url = new URL(candidate);
      if (
        url.protocol === 'https:' &&
        /^pushkara-mitra-preview\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.workers\.dev$/.test(
          url.hostname,
        ) &&
        !url.username &&
        !url.password &&
        !url.port &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash
      )
        origins.add(url.origin);
    } catch {
      /* Ignore non-URL output; require exactly one valid origin below. */
    }
  }
  if (origins.size !== 1)
    throw new Error(
      'Deploy returned no unique exact preview workers.dev URL; bootstrap is NOT verified. Do not redeploy blindly.',
    );
  const [url] = origins;
  const body = join(work, 'health.json');
  const headers = join(work, 'health.headers');
  const status = run('curl', [
    '--silent',
    '--show-error',
    '--fail',
    '--max-time',
    '10',
    '--retry',
    '3',
    '--retry-delay',
    '2',
    '--retry-all-errors',
    '--output',
    body,
    '--dump-header',
    headers,
    '--write-out',
    '%{http_code}',
    `${url}/healthz`,
  ]);
  const health = readJson(body);
  const finalHeaders = (path, expected) => {
    const blocks = readFileSync(path, 'utf8')
      .split(/\r?\n\r?\n/)
      .filter((block) => /^HTTP\/\S+\s+\d{3}(?:\s|$)/.test(block));
    const last = blocks.at(-1);
    if (!last || /^HTTP\/\S+\s+(\d{3})/.exec(last)?.[1] !== expected)
      throw new Error('Final HTTP header status does not match the required response.');
    return new Map(
      [...last.matchAll(/^([^\s:]+):\s*([^\r\n]*)/gm)].map((m) => [
        m[1].toLowerCase(),
        m[2].trim().toLowerCase(),
      ]),
    );
  };
  const values = finalHeaders(headers, '200');
  if (status !== '200' || health.status !== 'ok' || Object.keys(health).length !== 1)
    throw new Error('Preview health JSON/status check failed after deployment.');
  if (
    !values
      .get('cache-control')
      ?.split(',')
      .map((v) => v.trim())
      .includes('no-store')
  )
    throw new Error('Preview health no-store check failed after deployment.');
  for (const name of [
    'content-security-policy',
    'strict-transport-security',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
  ]) {
    if (!values.get(name)) throw new Error(`Missing ${name} on preview health response.`);
  }
  const postHeaders = join(work, 'post.headers');
  const postStatus = run('curl', [
    '--silent',
    '--show-error',
    '--max-time',
    '10',
    '--request',
    'POST',
    '--output',
    join(work, 'post.body'),
    '--dump-header',
    postHeaders,
    '--write-out',
    '%{http_code}',
    `${url}/healthz`,
  ]);
  if (postStatus !== '405' || finalHeaders(postHeaders, '405').get('allow') !== 'get, head')
    throw new Error('Preview method guard failed after deployment.');
  const summary = `Preview bootstrap deployed and health-checked: ${url}. This is scaffold health, not feature/UAT readiness.\n`;
  console.log(summary.trim());
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Preview bootstrap failed.');
  process.exitCode = 1;
} finally {
  if (work) rmSync(work, { recursive: true, force: true });
}

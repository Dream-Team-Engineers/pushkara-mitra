// Real local Wrangler routing: never uploads or deploys a Worker.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import ts from 'typescript';

const { AbortController, AbortSignal, fetch } = globalThis;

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'pushkara-routing-'));
const interruption = new AbortController();
const interrupt = () => interruption.abort(new Error('Local routing test interrupted.'));
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

// Reuse the existing, self-contained header contract without requiring a new
// dependency or Node's experimental TypeScript loader. Policy unit tests remain
// responsible for its values; this test proves actual delivery uses the wrapper.
const headerSource = readFileSync(new URL('../src/security/headers.ts', import.meta.url), 'utf8');
const headerModule = ts.transpileModule(headerSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { SECURITY_HEADERS } = await import(
  `data:text/javascript;base64,${Buffer.from(headerModule).toString('base64')}`
);

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

async function stop(child) {
  if (!child.pid) return;
  const signal = (name) => {
    try {
      if (process.platform === 'win32') child.kill(name);
      else process.kill(-child.pid, name);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  };
  signal('SIGTERM');
  const deadline = Date.now() + 5000;
  while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) {
    await delay(50);
  }
  if (child.exitCode === null && child.signalCode === null) signal('SIGKILL');
}

async function checkEnvironment(environment) {
  interruption.signal.throwIfAborted();
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const label = environment ?? 'default';
  const args = [
    join(root, 'node_modules/wrangler/wrangler-dist/cli.js'),
    'dev',
    '--local',
    '--ip',
    '127.0.0.1',
    '--port',
    String(port),
    '--inspector-port',
    '0',
    '--persist-to',
    join(temporary, label, 'state'),
    '--log-level',
    'error',
  ];
  if (environment) args.push('--env', environment);
  const child = spawn(process.execPath, args, {
    cwd: root,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: join(temporary, label, 'wrangler.log'),
      // The pinned local runtime supports this switch. Synthetic Request.cf
      // metadata is sufficient: no remote metadata request is needed here.
      CLOUDFLARE_CF_FETCH_ENABLED: 'false',
    },
  });
  // Drain output without printing local bindings or other developer data.
  child.stdout.resume();
  child.stderr.resume();
  let startupError;
  child.once('error', (error) => {
    startupError = error;
  });
  const request = (path, method = 'GET') =>
    fetch(`${origin}${path}`, {
      method,
      redirect: 'manual',
      signal: AbortSignal.any([interruption.signal, AbortSignal.timeout(3000)]),
    });

  try {
    const deadline = Date.now() + 45000;
    let ready = false;
    while (Date.now() < deadline) {
      interruption.signal.throwIfAborted();
      if (startupError) throw startupError;
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`${label}: local Wrangler exited before readiness.`);
      }
      try {
        const response = await request('/healthz');
        ready = response.status === 200 && (await response.text()) === '{"status":"ok"}';
        if (ready) break;
      } catch {
        interruption.signal.throwIfAborted();
      }
      await delay(100);
    }
    assert.ok(ready, `${label}: local Wrangler did not become ready.`);

    const cases = [
      ['GET', '/', 200],
      ['HEAD', '/', 200],
      ['GET', '/index.html', 307],
      ['GET', '/sw.js', 200],
      ['GET', '/manifest.webmanifest', 200],
      ['GET', '/healthz', 200],
      ['HEAD', '/healthz', 200],
      ['GET', '/missing-route', 404],
      ['GET', '/api', 404],
      ['GET', '/api/v1/me/missing', 404],
      ['GET', '/admin', 404],
      ['GET', '/admin/missing', 404],
      ['GET', '/auth/missing', 404],
      ['GET', '/%61dmin/missing', 404],
      ['POST', '/', 405],
      ['POST', '/index.html', 405],
      ['POST', '/sw.js', 405],
      ['POST', '/healthz', 405],
      ['POST', '/api/missing', 405],
      ['DELETE', '/healthz', 405],
    ];
    for (const [method, path, status] of cases) {
      interruption.signal.throwIfAborted();
      const context = `${label}: ${method} ${path}`;
      const response = await request(path, method);
      const body = await response.text();
      assert.equal(response.status, status, `${context}: status`);
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        assert.equal(response.headers.get(name), value, `${context}: ${name}`);
      }
      if (method === 'HEAD') assert.equal(body, '', `${context}: HEAD body`);
      if (status === 405) {
        assert.equal(response.headers.get('Allow'), 'GET, HEAD', `${context}: Allow`);
        assert.equal(body, 'Method Not Allowed', `${context}: denial body`);
      }
      if (status === 404)
        assert.doesNotMatch(body, /<!doctype|<html/i, `${context}: no SPA fallback`);
      if (path === '/' && method === 'GET') {
        assert.match(body, /<!doctype\s+html>/i, `${context}: HTML document`);
        assert.match(body, /<title(?:\s[^>]*)?>\s*[^<\s][^<]*<\/title>/i, `${context}: page title`);
      }
      if (path === '/index.html') {
        if (method === 'GET') assert.equal(response.headers.get('Location'), '/');
      }
      if (path === '/sw.js' && method === 'GET') assert.match(body, /addEventListener/);
      if (path === '/manifest.webmanifest')
        assert.match(JSON.parse(body).name, /^Pushkara Mitra(?:\s|$)/, `${context}: app identity`);
      if (path === '/healthz' && (method === 'GET' || method === 'HEAD')) {
        assert.equal(
          response.headers.get('Cache-Control'),
          'no-store',
          `${context}: health caching`,
        );
        if (method === 'GET') assert.deepEqual(JSON.parse(body), { status: 'ok' });
      }
    }
    console.log(`${label}: ${cases.length} actual local routing cases passed.`);
    return cases.length;
  } finally {
    await stop(child);
  }
}

try {
  let count = 0;
  // Even the production-named configuration is exercised with --local only.
  // No credentials, upload, deployment or remote binding command is used.
  for (const environment of [undefined, 'preview', 'staging', 'production']) {
    count += await checkEnvironment(environment);
  }
  console.log(
    `${count} routing cases passed across four local configurations; no deployment performed.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Local routing verification failed.');
  process.exitCode = 1;
} finally {
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
  rmSync(temporary, { recursive: true, force: true });
}

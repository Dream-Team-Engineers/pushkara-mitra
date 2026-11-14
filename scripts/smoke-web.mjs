// Real-browser smoke test of the built frontend (dist/web). No dependencies: it serves the build,
// starts the Chrome that is already installed, and drives it over the DevTools protocol.
// Checks, under the production CSP: every route renders; no console errors or CSP violations; the
// service worker installs; and with the network OFF every route still renders from the cache.
// It is a smoke test on one desktop Chrome engine at 360 px width, not a device or accessibility audit.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DIST = process.argv[2] ?? 'dist/web';
const ROUTES = [
  '/',
  '/pass',
  '/group',
  '/map',
  '/ghats',
  '/stay',
  '/travel',
  '/help',
  '/updates',
  '/conditions',
  '/partners',
  '/settings',
];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
};
// Same policy as src/security/headers.ts, minus upgrade-insecure-requests (this test server is HTTP).
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`No build output at ${DIST}. Run "npm run build:web" first.`);
  process.exit(2);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rel =
    url.pathname === '/' ? 'index.html' : normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  const file = join(DIST, rel);
  if (!file.startsWith(DIST) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Content-Security-Policy': CSP,
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
    'Cache-Control': 'no-cache',
  });
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const profile = mkdtempSync(join(tmpdir(), 'pm-smoke-'));
const chromeBin = process.env.CHROME_BIN ?? 'google-chrome';
/**
 * Starting headless Chrome on a shared CI runner occasionally takes longer than expected. Retry a
 * bounded number of times with a fresh process and a longer wait, and say which attempt failed.
 * A persistent failure still fails the job: this never hides a real startup problem.
 */
const START_ATTEMPTS = 3;
const START_TIMEOUT_MS = 30000;

function launchChrome() {
  const child = spawn(
    chromeBin,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const url = new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start')), START_TIMEOUT_MS);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', () => {
      clearTimeout(timer);
      reject(new Error('Chrome exited before it was ready'));
    });
    child.stderr.on('data', (chunk) => {
      buffer += chunk;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffer);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  return { child, url };
}

let chrome;
let wsUrl;
for (let attempt = 1; attempt <= START_ATTEMPTS; attempt += 1) {
  const launched = launchChrome();
  try {
    wsUrl = await launched.url;
    chrome = launched.child;
    break;
  } catch (error) {
    console.error(`Chrome start attempt ${attempt} of ${START_ATTEMPTS} failed: ${error.message}`);
    launched.child.kill('SIGKILL');
    if (attempt === START_ATTEMPTS) throw error;
  }
}

const port = new URL(wsUrl).port;
const targets = await (await globalThis.fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((target) => target.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let nextId = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (message) => {
  const data = JSON.parse(message.data);
  if (data.id !== undefined) {
    pending.get(data.id)?.(data);
    return;
  }
  if (data.method === 'Runtime.exceptionThrown')
    problems.push(
      `exception: ${data.params.exceptionDetails.text} ${data.params.exceptionDetails.exception?.description ?? ''}`,
    );
  if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error')
    problems.push(
      `console.error: ${data.params.args.map((a) => a.value ?? a.description).join(' ')}`,
    );
  if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error')
    problems.push(`log: ${data.params.entry.text} ${data.params.entry.url ?? ''}`);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, (reply) =>
      reply.error ? reject(new Error(`${method}: ${reply.error.message}`)) : resolve(reply.result),
    );
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(`evaluate failed: ${exceptionDetails.text}`);
  return result.value;
};
async function waitFor(expression, what, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evaluate(expression).catch(() => false)) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const SCREEN = `(() => { const m = document.querySelector('main'); const h = m && m.querySelector('h1,h2'); return !!h && h.textContent.trim().length > 0; })()`;
const OVERFLOW = `document.documentElement.scrollWidth <= window.innerWidth`;
async function visit(route) {
  await evaluate(`location.hash = ${JSON.stringify('#' + route)}; true`);
  await waitFor(SCREEN, `screen for ${route}`);
  await sleep(150);
  return { rendered: await evaluate(SCREEN), fits: await evaluate(OVERFLOW) };
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 740,
    deviceScaleFactor: 2,
    mobile: true,
  });

  // 1. Online: load, render every route.
  await send('Page.navigate', { url: `${base}/` });
  await waitFor(
    `document.querySelector('#app') && document.querySelector('#app').children.length > 0`,
    'app to mount',
  );
  check('Home mounts under the production CSP', true);
  check(
    'Language is Telugu by default',
    (await evaluate('document.documentElement.lang')) === 'te',
  );
  const fonts = await evaluate(
    `performance.getEntriesByType('resource').map((e) => new URL(e.name).pathname).filter((p) => p.startsWith('/fonts/'))`,
  );
  check(
    'No Hindi font downloaded for the Telugu Home screen',
    !fonts.some((p) => p.includes('Devanagari')),
    fonts.join(', '),
  );
  for (const route of ROUTES) {
    const outcome = await visit(route);
    check(`Online: ${route} renders`, outcome.rendered);
    check(`Online: ${route} has no horizontal scroll at 360 px`, outcome.fits);
  }

  // 2. Service worker installs and the cache holds the build.
  await waitFor(
    `navigator.serviceWorker.ready.then((r) => !!r.active)`,
    'service worker to activate',
  );
  const cacheNames = await evaluate(`caches.keys()`);
  check(
    'Service worker active with a versioned cache',
    cacheNames.some((name) => name.startsWith('pushkara-app-')),
    cacheNames.join(', '),
  );
  const cachedPaths = await evaluate(
    `caches.open(${JSON.stringify(cacheNames[0] ?? '')}).then((c) => c.keys()).then((k) => k.map((r) => new URL(r.url).pathname))`,
  );
  const requiredCached = [
    '/',
    '/manifest.webmanifest',
    '/fonts/NotoSansTelugu-400.woff',
    '/fonts/Roboto-400-latin.woff',
  ];
  check(
    'Cache holds the shell, manifest and default-language fonts',
    requiredCached.every((p) => cachedPaths.includes(p)),
    `${cachedPaths.length} entries`,
  );
  check(
    'Cache holds no API, auth or admin paths',
    !cachedPaths.some((p) => /^\/(api|auth|admin)/.test(p)),
  );

  // 3. Offline: reload with the network off and visit every route from the cache.
  await send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await send('Page.navigate', { url: `${base}/` });
  await waitFor(
    `document.querySelector('#app') && document.querySelector('#app').children.length > 0`,
    'offline app to mount',
  );
  check('Offline: Home mounts after a cold navigation', true);
  for (const route of ROUTES) {
    const outcome = await visit(route);
    check(`Offline: ${route} renders from the cache`, outcome.rendered);
  }
  check(
    'Offline: the offline notice is shown',
    await evaluate(`!!document.querySelector('.offline-banner')`),
  );
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });

  check(
    'No console errors, exceptions or CSP violations',
    problems.length === 0,
    problems.slice(0, 5).join(' | '),
  );
} catch (error) {
  check(
    'Smoke test ran to completion',
    false,
    error instanceof Error ? error.message : String(error),
  );
} finally {
  ws.close();
  server.close();
  chrome.kill();
  await new Promise((resolve) => {
    chrome.once('exit', resolve);
    setTimeout(resolve, 5000);
  });
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    // A leftover temp profile is harmless.
  }
}

const lines = [
  '### Frontend browser smoke test (dist/web, headless Chrome, 360 px)',
  '',
  '| Check | Result | Detail |',
  '| --- | --- | --- |',
  ...results.map(
    (r) => `| ${r.name} | ${r.ok ? 'pass' : 'FAIL'} | ${r.detail.replaceAll('|', '/')} |`,
  ),
];
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
process.exit(results.every((r) => r.ok) ? 0 : 1);

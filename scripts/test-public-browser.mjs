// Optional local-only QA harness. Uses an already installed Playwright/Chromium;
// it does not install dependencies, change application files or deploy anything.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';

/* global navigator, document, window, getComputedStyle, caches, fetch */

const origin = new URL(process.env.QA_ORIGIN ?? 'http://127.0.0.1:8912');
if (
  origin.protocol !== 'http:' ||
  !['127.0.0.1', 'localhost'].includes(origin.hostname) ||
  origin.username ||
  origin.password ||
  origin.pathname !== '/'
)
  throw new Error('QA_ORIGIN must be a local HTTP origin.');
const publicDir = process.env.SHELL_PUBLIC_DIR;
if (!publicDir)
  throw new Error('SHELL_PUBLIC_DIR must identify the exact local public snapshot under review.');
const artifacts = process.env.QA_ARTIFACT_DIR ?? '/tmp/pushkara-public-browser-qa';
mkdirSync(artifacts, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  headless: true,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
context.setDefaultTimeout(10000);
context.setDefaultNavigationTimeout(10000);
const external = [];
const pageErrors = [];
const results = [];
await context.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (!['127.0.0.1', 'localhost'].includes(u.hostname)) {
    external.push(u.origin);
    return route.abort();
  }
  return route.continue();
});
const page = await context.newPage();
page.on('pageerror', (error) => pageErrors.push(error.message));
const paths = [
  '/',
  '/assets/shell.v1.css',
  '/assets/shell.v1.mjs',
  '/assets/mobile-sections.v1.mjs',
  '/assets/icons.v1.mjs',
  '/assets/offline-status.v1.mjs',
  '/assets/mitra-mark.svg',
  '/assets/quick-access-synthetic-v1.jpg',
  '/assets/fonts/Roboto-400-latin.woff',
  '/assets/fonts/Roboto-700-latin.woff',
  '/assets/fonts/NotoSansTelugu-400.woff',
  '/assets/fonts/NotoSansTelugu-700.woff',
  '/assets/fonts/NotoSansDevanagari-400.woff',
  '/assets/fonts/NotoSansDevanagari-700.woff',
  '/manifest.webmanifest',
];
const expectedCache = /^export const EXPECTED_STATIC_CACHE = ['"]([^'"]+)['"];$/m.exec(
  readFileSync(join(publicDir, 'assets/offline-status.v1.mjs'), 'utf8'),
)?.[1];
assert.ok(
  expectedCache?.startsWith('pushkara-static-prototype-'),
  'Expected current static cache declaration',
);
async function check(name, fn) {
  try {
    const evidence = await fn();
    results.push({ name, pass: true, evidence });
    console.log('PASS', name);
  } catch (error) {
    results.push({ name, pass: false, error: error.message });
    console.log('FAIL', name, error.message);
  } finally {
    await context.setOffline(false);
  }
}
async function load(hash = 'home') {
  await page.goto(`${origin.origin}/#${hash}`, { waitUntil: 'networkidle' });
  await page
    .locator('#area-grid .area-card')
    .first()
    .waitFor({ state: 'attached', timeout: 10000 });
  await page.locator(`#route-${hash}`).waitFor({ state: 'visible' });
}
async function route(name) {
  const primary = page.locator(`.primary-nav [data-route="${name}"]`);
  const bottom = page.locator(`.bottom-nav [data-route="${name}"]`);
  if (await primary.isVisible()) await primary.focus();
  else if (await bottom.isVisible()) await bottom.focus();
  else {
    await page.evaluate((target) => (window.location.hash = target), name);
    await page.locator(`#route-${name}`).waitFor({ state: 'visible' });
    return;
  }
  await page.keyboard.press('Enter');
  await page.locator(`#route-${name}`).waitFor({ state: 'visible' });
}
async function snapshotCaches(p) {
  return p.evaluate(async () => {
    const output = [];
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      output.push({
        name,
        urls: (await c.keys()).map((r) => ({
          url: r.url,
          method: r.method,
          authorization: r.headers.has('Authorization'),
        })),
      });
    }
    return output;
  });
}
let fixtureServer;
let fixtureContext;
try {
  await check('Telugu default, visible route and eight original product-area cards', async () => {
    await load();
    assert.equal(await page.locator('html').getAttribute('lang'), 'te');
    assert.deepEqual(
      await page
        .locator('#language option')
        .evaluateAll((options) => options.map((option) => option.value)),
      ['te', 'en', 'hi'],
    );
    assert.equal(await page.locator('.route-panel:visible').count(), 1);
    assert.equal(await page.locator('#area-grid .area-card').count(), 8);
  });
  await check(
    'Keyboard skip on Home is visible and focuses main without route change',
    async () => {
      await load();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
      const rect = await page.locator('.skip-link').boundingBox();
      assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= 900);
      const before = new URL(page.url()).hash;
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
      assert.equal(new URL(page.url()).hash, before);
    },
  );
  for (const name of ['plan', 'about'])
    await check(`Skip preserves ${name} route and focuses main`, async () => {
      await load(name);
      await page.locator('.skip-link').focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      assert.equal(new URL(page.url()).hash, `#${name}`);
      assert.equal(await page.locator(`#route-${name}:visible`).count(), 1);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
    });
  await check('Keyboard navigation, current-page state and browser Back', async () => {
    await load();
    await route('plan');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
    assert.equal(
      await page.locator('.primary-nav [aria-current="page"]').getAttribute('data-route'),
      'plan',
    );
    await route('updates');
    await page.goBack();
    await page.locator('#route-plan').waitFor({ state: 'visible' });
    assert.equal(
      await page.locator('.primary-nav [aria-current="page"]').getAttribute('data-route'),
      'plan',
    );
  });
  await check('Mobile bottom navigation and icon shortcuts stay usable at 390px', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await load('explore');
      assert.equal(await page.locator('.bottom-nav a:visible').count(), 5);
      assert.equal(await page.locator('#primary-nav').isVisible(), false);
      assert.equal(await page.locator('#route-explore .section-link-card svg').count(), 12);
      await page.locator('.bottom-nav [data-route="plan"]').click();
      await page.locator('#route-plan').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#route-plan .notice[role="status"]').count(), 1);
      assert.equal(
        await page.locator('.bottom-nav [aria-current="page"]').getAttribute('data-route'),
        'plan',
      );
      await page.locator('.bottom-nav [data-route="home"]').click();
      await page.locator('#route-home').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#quick-grid .quick-tile svg').count(), 8);
      const symbolBox = await page.locator('#quick-grid .quick-tile svg').first().boundingBox();
      const targetBox = await page.locator('#quick-grid .quick-tile').first().boundingBox();
      assert.ok(symbolBox && symbolBox.width <= 16);
      assert.ok(targetBox && targetBox.width >= 44 && targetBox.height >= 44);
      const positions = await page.locator('#quick-grid .quick-tile').evaluateAll((tiles) =>
        tiles.slice(0, 5).map((tile) => ({
          x: tile.getBoundingClientRect().x,
          y: tile.getBoundingClientRect().y,
        })),
      );
      assert.ok(positions.slice(0, 4).every((position) => position.y === positions[0].y));
      assert.ok(positions[4].y > positions[0].y);
      assert.ok(
        await page
          .locator('#quick-grid .quick-name')
          .evaluateAll((labels) =>
            labels.every((label) => label.scrollWidth <= label.clientWidth + 1),
          ),
      );
      assert.match(
        await page
          .locator('#quick-grid .quick-icon')
          .first()
          .evaluate((el) => getComputedStyle(el, '::after').backgroundImage),
        /quick-access-synthetic-v1\.jpg/,
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        true,
      );
      await page.locator('.feature-details summary').click();
      assert.equal(await page.locator('#area-grid .area-image').count(), 8);
      assert.equal(await page.locator('#area-grid a.area-card').count(), 7);
      await page.locator('#area-grid a[href="#pass"]').click();
      await page.locator('#route-pass').waitFor({ state: 'visible' });
    } finally {
      await page.setViewportSize({ width: 1280, height: 900 });
    }
  });
  await check('Plan shows review-pending status without sample events or mock fetch', async () => {
    const requests = [];
    const record = (request) => {
      if (new URL(request.url()).pathname === '/api/demo/events') requests.push(request.url());
    };
    page.on('request', record);
    try {
      await page.goto(`${origin.origin}/?local-mock=1#plan`, { waitUntil: 'networkidle' });
      await page.locator('#route-plan .notice[role="status"]').waitFor({ state: 'visible' });
      assert.equal(await page.locator('.event-card, [data-filter]').count(), 0);
      assert.deepEqual(requests, []);
    } finally {
      page.off('request', record);
    }
  });
  await check('Visible keyboard focus and theme state', async () => {
    await load();
    await page.locator('#theme').focus();
    assert.equal(await page.locator('#theme .theme-dot').count(), 1);
    assert.ok((await page.locator('#theme .theme-icon').boundingBox()).width <= 44);
    assert.ok((await page.locator('#theme').boundingBox()).height >= 44);
    assert.ok((await page.locator('#theme .theme-label').textContent()).trim());
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#theme').getAttribute('aria-pressed'), 'true');
    const focus = await page.locator('#theme').evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    assert.notEqual(focus.style, 'none');
    assert.ok(focus.width >= 2);
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#theme').getAttribute('aria-pressed'), 'false');
  });
  await check('Theme label stays above its icon in all three languages', async () => {
    await load();
    try {
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 900 });
        for (const lang of ['te', 'en', 'hi']) {
          await page.selectOption('#language', lang);
          for (const state of ['false', 'true']) {
            assert.equal(await page.locator('#theme').getAttribute('aria-pressed'), state);
            const label = page.locator('#theme .theme-label');
            const labelBox = await label.boundingBox();
            const iconBox = await page.locator('#theme .theme-icon').boundingBox();
            assert.ok(labelBox && iconBox && labelBox.y + labelBox.height <= iconBox.y + 1);
            if (lang !== 'en') assert.doesNotMatch(await label.textContent(), /[A-Za-z]/);
            await page.locator('#theme').click();
          }
        }
      }
    } finally {
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    await page.selectOption('#language', 'te');
    await page.evaluate(() => (window.location.hash = 'stays'));
    await page.locator('#route-stays').waitFor({ state: 'visible' });
    assert.doesNotMatch(await page.locator('#route-stays .tag').first().textContent(), /[A-Za-z]/);
  });
  await check('Language controls update document language without empty content', async () => {
    await load();
    for (const lang of ['te', 'en', 'hi']) {
      await page.selectOption('#language', lang);
      assert.equal(await page.locator('html').getAttribute('lang'), lang);
      assert.ok((await page.locator('#home-title').textContent()).trim());
      assert.equal(await page.locator('.area-card').count(), 8);
      if (lang === 'hi') {
        await page.evaluate(() => (window.location.hash = 'explore'));
        await page.locator('#route-explore').waitFor({ state: 'visible' });
        const menuText = [
          ...(await page.locator('#quick-grid .quick-name').allTextContents()),
          ...(await page.locator('.bottom-nav a span').allTextContents()),
          ...(await page.locator('#route-explore .section-link-card h2').allTextContents()),
        ];
        assert.ok(menuText.every((value) => value.trim() && !/[A-Za-z]/.test(value)));
      }
    }
    return {
      nativeLanguageReview: 'NOT PERFORMED; translations remain unreviewed',
    };
  });
  await check('320/375/1280px multilingual layout at 100% and 200% root-text size', async () => {
    await load();
    const failures = [];
    let cases = 0;
    for (const lang of ['te', 'en', 'hi']) {
      await page.selectOption('#language', lang);
      for (const width of [320, 375, 1280])
        for (const scale of [1, 2]) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(
            (s) => (document.documentElement.style.fontSize = `${s * 100}%`),
            scale,
          );
          for (const name of ['home', 'plan', 'updates', 'about']) {
            await route(name);
            const bounds = await page.evaluate(() => ({
              width: window.innerWidth,
              scroll: document.documentElement.scrollWidth,
              clipped: [
                ...document.querySelectorAll(
                  '.area-card,.site-header,.reading-card,.event-card,.notice',
                ),
              ]
                .filter(
                  (el) =>
                    el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 1,
                )
                .map((el) => el.className),
            }));
            cases++;
            if (bounds.scroll > bounds.width + 1 || bounds.clipped.length)
              failures.push({ lang, width, scale, route: name, ...bounds });
          }
        }
    }
    await page.evaluate(() => (document.documentElement.style.fontSize = '100%'));
    assert.deepEqual(failures, []);
    return {
      cases,
      method:
        '200% root text enlargement plus narrow CSS viewports; not native browser zoom certification',
    };
  });
  await check('Computed visible-text contrast in light/dark route states', async () => {
    await load();
    await page.selectOption('#language', 'en');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => (document.documentElement.style.fontSize = '100%'));
    let measured = 0;
    const failures = [];
    for (const dark of [false, true]) {
      if ((await page.locator('#theme').getAttribute('aria-pressed')) !== String(dark))
        await page.locator('#theme').click();
      for (const name of ['home', 'plan', 'updates', 'about']) {
        await route(name);
        const result = await page.evaluate(() => {
          const rgb = (s) => {
            const m = /rgba?\(([^)]+)\)/.exec(s);
            if (!m) return null;
            const a = m[1].split(',').map(Number);
            return a.length === 3 ? [...a, 1] : a;
          };
          const lum = (a) =>
            a
              .slice(0, 3)
              .map((v) => {
                v /= 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              })
              .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
          const rows = [];
          for (const el of document.querySelectorAll('body *')) {
            if (
              el.closest('[hidden],[aria-hidden="true"],.sr-only') ||
              !Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())
            )
              continue;
            const r = el.getBoundingClientRect();
            if (r.width <= 1 || r.height <= 1) continue;
            const s = getComputedStyle(el);
            if (s.visibility === 'hidden') continue;
            const fg = rgb(s.color);
            let current = el,
              bg;
            while (current) {
              const candidate = rgb(getComputedStyle(current).backgroundColor);
              if (candidate && candidate[3] === 1) {
                bg = candidate;
                break;
              }
              current = current.parentElement;
            }
            if (!fg || !bg) {
              rows.push({
                unsupported: true,
                text: el.textContent.trim().slice(0, 40),
              });
              continue;
            }
            const a = lum(fg),
              b = lum(bg);
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            const large =
              parseFloat(s.fontSize) >= 24 ||
              (parseFloat(s.fontSize) >= 18.666 && Number(s.fontWeight) >= 700);
            rows.push({
              ratio,
              required: large ? 3 : 4.5,
              text: el.textContent.trim().slice(0, 40),
            });
          }
          return rows;
        });
        measured += result.length;
        failures.push(
          ...result
            .filter((r) => r.unsupported || r.ratio + 0.01 < r.required)
            .map((r) => ({ dark, route: name, ...r })),
        );
      }
    }
    assert.deepEqual(failures, []);
    return {
      measured,
      scope:
        'Computed visible text only; no axe/full non-text contrast or screen-reader certification',
    };
  });
  await check(
    'Current controller acknowledges exactly fifteen public resources within bounded time',
    async () => {
      await load();
      await page.waitForFunction(
        () =>
          navigator.serviceWorker.controller &&
          document.querySelector('#offline-status')?.dataset.offlineState === 'ready-online',
        null,
        { timeout: 10000 },
      );
      const caches = await snapshotCaches(page);
      const own = caches.filter((c) => c.name.startsWith('pushkara-static-prototype-'));
      assert.equal(own.length, 1);
      assert.equal(own[0].name, expectedCache);
      assert.deepEqual(own[0].urls.map((r) => new URL(r.url).pathname).sort(), [...paths].sort());
      return { cache: own[0].name, resources: own[0].urls.length };
    },
  );
  await check(
    'Offline reload/navigation and protected/query/authorized cache exclusion',
    async () => {
      await load('plan');
      await page.waitForFunction(
        () => document.querySelector('#offline-status')?.dataset.offlineState === 'ready-online',
        null,
        { timeout: 10000 },
      );
      await page.evaluate(async () => {
        for (const path of ['/healthz', '/api/qa-not-real', '/admin/qa-not-real', '/?qa=1']) {
          try {
            await fetch(path, { cache: 'no-store' });
          } catch {
            /* Expected network refusal; explicit cache-exclusion assertions follow. */
          }
        }
        await fetch('/', {
          headers: { Authorization: 'Bearer synthetic-qa-only' },
          cache: 'no-store',
        });
      });
      await context.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#route-plan .notice[role="status"]').waitFor({ timeout: 6000 });
      await page.waitForFunction(
        () => document.querySelector('#offline-status')?.dataset.offlineState === 'ready-offline',
        null,
        { timeout: 6000 },
      );
      const blocked = await page.evaluate(async () => {
        const out = [];
        for (const path of ['/healthz', '/api/qa-not-real', '/admin/qa-not-real', '/?qa=1']) {
          try {
            await fetch(path, { cache: 'no-store' });
            out.push(path);
          } catch {
            /* Expected network refusal; explicit cache-exclusion assertions follow. */
          }
        }
        try {
          await fetch('/', {
            headers: { Authorization: 'Bearer synthetic-qa-only' },
            cache: 'no-store',
          });
          out.push('authorized-root');
        } catch {
          /* Expected network refusal; explicit cache-exclusion assertions follow. */
        }
        return out;
      });
      assert.deepEqual(blocked, []);
      for (const cache of await snapshotCaches(page))
        for (const entry of cache.urls) {
          const url = new URL(entry.url);
          assert.ok(
            paths.includes(url.pathname) &&
              !url.search &&
              !entry.authorization &&
              entry.method === 'GET',
          );
        }
      await context.setOffline(false);
    },
  );
  await check(
    'Legacy controller, failed upgrade and complete current upgrade do not fake offline readiness',
    async () => {
      const files = new Map(
        paths.map((path) => [
          path,
          readFileSync(join(publicDir, path === '/' ? 'index.html' : path.slice(1))),
        ]),
      );
      const currentWorker = readFileSync(join(publicDir, 'sw.js'), 'utf8');
      let phase = 'legacy';
      const legacyPaths = paths.filter((p) => !p.includes('offline-status'));
      const legacy = `const NAME='pushkara-static-prototype-qa-legacy';const PATHS=${JSON.stringify(legacyPaths)};self.addEventListener('install',e=>e.waitUntil(caches.open(NAME).then(c=>c.addAll(PATHS)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method==='GET'&&u.origin===self.location.origin&&!u.search&&PATHS.includes(u.pathname)&&!e.request.headers.has('Authorization'))e.respondWith(caches.open(NAME).then(async c=>(await c.match(u.pathname))||fetch(e.request)));});`;
      const failedWorker = currentWorker.replace(
        "'/manifest.webmanifest',",
        "'/manifest.webmanifest', '/qa-missing-static',",
      );
      assert.notEqual(failedWorker, currentWorker, 'Fixture must add a failing precache resource');
      const headers = Object.fromEntries(
        (await context.request.get(`${origin.origin}/healthz`))
          .headersArray()
          .filter((h) =>
            [
              'content-security-policy',
              'x-content-type-options',
              'referrer-policy',
              'permissions-policy',
              'cross-origin-opener-policy',
              'cross-origin-resource-policy',
            ].includes(h.name.toLowerCase()),
          )
          .map((h) => [h.name, h.value]),
      );
      fixtureServer = createServer((req, res) => {
        const path = new URL(req.url, 'http://127.0.0.1').pathname;
        for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
        res.setHeader('Cache-Control', 'no-store');
        if (path === '/index.html') {
          res.writeHead(307, { Location: '/' });
          res.end();
          return;
        }
        if (path === '/sw.js') {
          res.setHeader('Content-Type', 'text/javascript');
          res.end(phase === 'legacy' ? legacy : phase === 'failed' ? failedWorker : currentWorker);
          return;
        }
        const body = files.get(path);
        if (!body) {
          res.writeHead(503);
          res.end('Synthetic missing fixture');
          return;
        }
        res.setHeader(
          'Content-Type',
          path.endsWith('.mjs')
            ? 'text/javascript'
            : path.endsWith('.css')
              ? 'text/css'
              : path.endsWith('.svg')
                ? 'image/svg+xml'
                : path.endsWith('.webmanifest')
                  ? 'application/manifest+json'
                  : 'text/html',
        );
        res.end(body);
      });
      await new Promise((resolve) => fixtureServer.listen(0, '127.0.0.1', resolve));
      const address = fixtureServer.address();
      const fixtureOrigin = `http://127.0.0.1:${address.port}`;
      fixtureContext = await browser.newContext({ reducedMotion: 'reduce' });
      fixtureContext.setDefaultTimeout(10000);
      fixtureContext.setDefaultNavigationTimeout(10000);
      const f = await fixtureContext.newPage();
      await f.goto(fixtureOrigin, { waitUntil: 'networkidle' });
      await f.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
        timeout: 10000,
      });
      await f.waitForTimeout(2000);
      assert.equal(
        await f.locator('#offline-status').getAttribute('data-offline-state'),
        'not-verified',
      );
      phase = 'failed';
      await f.evaluate(async () => {
        const r = await navigator.serviceWorker.getRegistration();
        window.__qaUpgradeState = 'pending';
        r.addEventListener('updatefound', () => {
          const w = r.installing;
          w.addEventListener('statechange', () => (window.__qaUpgradeState = w.state));
        });
        await r.update();
      });
      await f.waitForFunction(() => window.__qaUpgradeState === 'redundant', null, {
        timeout: 10000,
      });
      assert.equal(
        await f.locator('#offline-status').getAttribute('data-offline-state'),
        'not-verified',
      );
      assert.ok((await snapshotCaches(f)).some((c) => c.name.endsWith('qa-legacy')));
      phase = 'current';
      await f.evaluate(async () => {
        await (await navigator.serviceWorker.getRegistration()).update();
      });
      await f.waitForFunction(
        () => document.querySelector('#offline-status')?.dataset.offlineState === 'ready-online',
        null,
        { timeout: 10000 },
      );
      await f.waitForFunction(
        async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return (
            navigator.serviceWorker.controller?.state === 'activated' &&
            navigator.serviceWorker.controller === registration.active
          );
        },
        null,
        { timeout: 10000 },
      );
      const upgraded = await snapshotCaches(f);
      const own = upgraded.filter((c) => c.name === expectedCache);
      assert.equal(own.length, 1);
      assert.deepEqual(own[0].urls.map((r) => new URL(r.url).pathname).sort(), [...paths].sort());
      for (const cache of upgraded)
        for (const entry of cache.urls) {
          const url = new URL(entry.url);
          assert.ok(
            paths.includes(url.pathname) &&
              !url.search &&
              !entry.authorization &&
              entry.method === 'GET',
          );
        }
      await fixtureContext.setOffline(true);
      await f.reload({ waitUntil: 'domcontentloaded' });
      await f.locator('.area-card').first().waitFor({ timeout: 6000 });
      await f.waitForFunction(
        () => document.querySelector('#offline-status')?.dataset.offlineState === 'ready-offline',
        null,
        { timeout: 6000 },
      );
      return {
        legacy: 'not falsely ready',
        failedUpgrade: 'legacy remains; not falsely ready',
        current: 'fifteen cached resources and functional offline reload',
        scope:
          'Synthetic legacy/failure fixture; not an old released artifact. Legacy in-flight fetch may recreate an old public cache; current acknowledged cache, not perpetual old-cache absence, is verified.',
      };
    },
  );
  await check('No application page errors or cross-origin requests', async () => {
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(external, []);
  });
} finally {
  if (fixtureContext) await fixtureContext.close();
  if (fixtureServer) {
    fixtureServer.closeAllConnections();
    await new Promise((resolve) => fixtureServer.close(resolve));
  }
  await context.close();
  await browser.close();
  const report = {
    browser: 'Chromium',
    origin: origin.origin,
    results,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    limitations: [
      'No WCAG conformance claim',
      'No axe or assistive-technology/manual native-language review',
      'Root font200% stress is not native browser-zoom certification',
      'Chromium only; no Safari/Firefox/device/browser-store certification',
      'Synthetic legacy/failure upgrade fixture, not a released artifact',
    ],
  };
  writeFileSync(
    join(artifacts, 'public-shell-browser-results.json'),
    JSON.stringify(report, null, 2),
  );
  if (report.failed) process.exitCode = 1;
  console.log(`${report.passed} passed; ${report.failed} failed. Evidence: ${artifacts}`);
}

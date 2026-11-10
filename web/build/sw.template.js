// Pushkara Mitra service worker (generated at build time; placeholders are replaced by web/build/sw.ts).
// Only exact, own, static GET resources are cached. No query strings, no Authorization requests, no
// /api, /auth or /admin paths. Nothing user-specific, and never a location, is ever cached.
const CACHE_PREFIX = 'pushkara-app-';
// Caches written by the earlier public prototype worker; removed once this worker takes over.
const LEGACY_PREFIX = 'pushkara-static-prototype-';
const CACHE_NAME = CACHE_PREFIX + '__VERSION__';
const PRECACHE = __PRECACHE__;
const OPTIONAL = __OPTIONAL__;
const ALLOWED = new Set(PRECACHE.concat(OPTIONAL));

const usable = (response) => response !== undefined && response.ok && response.type !== 'opaque';

self.addEventListener('install', (event) => {
  // No skipWaiting here: the page asks the person before an update takes over (SKIP_WAITING below).
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(
        PRECACHE.map(
          (path) => new Request(new URL(path, self.location.origin).href, { cache: 'reload' }),
        ),
      );
      for (const path of PRECACHE) {
        if (!usable(await cache.match(path))) throw new Error('Precache verification failed');
      }
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(LEGACY_PREFIX) ||
                (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('Authorization')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search !== '' || !ALLOWED.has(url.pathname))
    return;
  event.respondWith(respond(url.pathname, request));
});

async function respond(path, request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(path);
  if (usable(cached)) return cached;
  // Missing or corrupt entry: drop it and fetch a fresh copy, keeping it for next time.
  if (cached !== undefined) await cache.delete(path);
  const fresh = await fetch(request);
  if (usable(fresh)) await cache.put(path, fresh.clone());
  return fresh;
}

// Original public prototype. Only exact, own, static GET resources are cacheable.
const CACHE_PREFIX = 'pushkara-static-prototype-';
// Bump this AND offline-status.v1.mjs whenever any precached resource changes.
const CACHE_NAME = `${CACHE_PREFIX}v23`;
const STATUS_MESSAGE = 'PUSHKARA_STATIC_STATUS_V23';
// Cache canonical URLs only: /index.html is a redirect, not an offline resource.
const STATIC_PATHS = [
  '/',
  '/assets/shell.v1.css',
  '/assets/shell.v1.mjs',
  '/assets/mobile-sections.v1.mjs',
  '/assets/ghats-draft-view.v1.mjs',
  '/assets/ghats-draft.v1.mjs',
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
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PATHS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.search ||
    !STATIC_PATHS.includes(url.pathname)
  )
    return;
  if (event.request.headers.has('Authorization')) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(url.pathname);
      return cached || fetch(event.request);
    }),
  );
});

// Reply only to the supplied dedicated port. Incoming data cannot select a URL/cache.
self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object' || event.data.type !== STATUS_MESSAGE) return;
  const port = event.ports && event.ports[0];
  if (!port || typeof port.postMessage !== 'function') return;
  event.waitUntil(
    (async () => {
      let complete = false;
      try {
        if ((await caches.keys()).includes(CACHE_NAME)) {
          const cache = await caches.open(CACHE_NAME);
          const resources = await Promise.all(STATIC_PATHS.map((path) => cache.match(path)));
          complete = resources.every(
            (response) => response && response.ok && response.type !== 'opaque',
          );
        }
      } catch {
        complete = false;
      }
      port.postMessage({ type: STATUS_MESSAGE, version: CACHE_NAME, complete });
    })(),
  );
});

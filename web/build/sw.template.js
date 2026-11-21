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
// Offline map: saved only after the person taps "Save map" (never at install). It has its own
// cache, named after the map files, so an app update that leaves the map alone keeps it.
const MAP_PREFIX = 'pushkara-map-';
const MAP_CACHE = MAP_PREFIX + '__MAP_VERSION__';
const MAP = __MAP__;
const MAP_SET = new Set(MAP);
const MAP_DONE = '/__map-saved__';
// The code that draws the map is stored too, so the map screen opens with no signal.
const MAP_CODE = OPTIONAL.filter((path) => /^\/assets\/(?:LiveMap|maplibre-gl-worker)-/.test(path));

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
                (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) ||
                (key.startsWith(MAP_PREFIX) && key !== MAP_CACHE),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
    return;
  }
  // Only these two fixed commands exist; they never take a path or a cache name from the page.
  const port = event.ports && event.ports[0];
  if (!port) return;
  if (data.type === 'MAP_STATUS') {
    event.waitUntil(mapSaved().then((ready) => port.postMessage({ ready })));
  } else if (data.type === 'MAP_DOWNLOAD') {
    event.waitUntil(saveMap().then((ready) => port.postMessage({ ready })));
  }
});

async function mapSaved() {
  try {
    return usable(await (await caches.open(MAP_CACHE)).match(MAP_DONE));
  } catch {
    return false;
  }
}

// Fetches every map file whole (a 200 answer, not a range) and stores it. The marker is written
// last, so a download cut short never reports "saved".
async function saveMap() {
  try {
    const maps = await caches.open(MAP_CACHE);
    const app = await caches.open(CACHE_NAME);
    const jobs = MAP.map((path) => [maps, path]).concat(MAP_CODE.map((path) => [app, path]));
    for (const [cache, path] of jobs) {
      if (usable(await cache.match(path))) continue;
      const response = await fetch(
        new Request(new URL(path, self.location.origin).href, {
          cache: 'reload',
          credentials: 'omit',
        }),
      );
      if (!usable(response) || response.status !== 200) throw new Error('Map download failed');
      await cache.put(path, response);
    }
    await maps.put(MAP_DONE, new Response('saved'));
    return true;
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('Authorization')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search !== '') return;
  if (MAP_SET.has(url.pathname)) {
    event.respondWith(respondMap(url.pathname, request));
    return;
  }
  if (!ALLOWED.has(url.pathname)) return;
  event.respondWith(respond(url.pathname, request));
});

const rangeBlobs = new Map();

// Saved map files are used first (online or not). The tile archive is read in slices, and the
// Cache API cannot store a partial answer, so a slice is cut from the whole saved file here.
async function respondMap(path, request) {
  const cache = await caches.open(MAP_CACHE);
  const cached = await cache.match(path);
  if (!usable(cached)) return fetch(request);
  const range = request.headers.get('Range');
  const parsed = range === null ? null : /^bytes=(\d+)-(\d*)$/.exec(range);
  if (parsed === null) return cached;
  if (!rangeBlobs.has(path)) rangeBlobs.set(path, cached.clone().blob());
  const blob = await rangeBlobs.get(path);
  const start = Number(parsed[1]);
  if (start >= blob.size) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': 'bytes */' + blob.size },
    });
  }
  const end = Math.min(parsed[2] === '' ? blob.size - 1 : Number(parsed[2]), blob.size - 1);
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + blob.size,
      'Content-Length': String(end - start + 1),
    },
  });
}

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

// Stub service worker. Caches no personal data and no API responses.
// Offline strategy arrives in milestone M2 (see docs/decisions/0003-offline-first-pwa.md).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

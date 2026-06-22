// Minimal Service Worker — exists only to satisfy Chrome's PWA installability
// criteria (requires a registered SW with a fetch handler). No offline caching
// is performed; every request passes through to the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

// JP's Classification of Drugs — Service Worker
// Provides full offline functionality via Cache Storage API
// Version: 5.1

const CACHE_NAME = 'jp-drug-ref-v5-1';
const BASE = '/JP-drug-classification';
const ASSETS_TO_CACHE = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/drugdata.js',
  BASE + '/app.js',
  BASE + '/manifest.json',
  BASE + '/icons/icon-72x72.png',
  BASE + '/icons/icon-96x96.png',
  BASE + '/icons/icon-128x128.png',
  BASE + '/icons/icon-144x144.png',
  BASE + '/icons/icon-152x152.png',
  BASE + '/icons/icon-192x192.png',
  BASE + '/icons/icon-384x384.png',
  BASE + '/icons/icon-512x512.png'
];

// Install: cache all assets immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching all app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first strategy (fully offline)
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Not in cache — fetch from network and cache it
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 ||
                networkResponse.type === 'opaque') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          })
          .catch(() => {
            // Network failed — return offline page if available
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Message handler — allow manual cache update
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

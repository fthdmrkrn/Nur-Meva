const CACHE_VERSION = 'nurmeva-v3';

const CACHE_FILES = [
  './manifest.json',
  './icon-512-1.png',
  './favicon-1.ico'
];

// Bunlar her zaman network'ten gelsin (HTML dahil)
const NETWORK_FIRST = [
  './index.html',
  './'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return Promise.all(
        CACHE_FILES.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('Cache başarısız:', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((isimler) =>
      Promise.all(
        isimler
          .filter((isim) => isim !== CACHE_VERSION)
          .map((isim) => caches.delete(isim))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isHTML = NETWORK_FIRST.some(p => url.pathname.endsWith(p.replace('.', '')) || url.pathname === '/' || url.pathname.endsWith('.html'));

  if (isHTML) {
    // Network-first: her zaman güncel HTML gelsin
    event.respondWith(
      fetch(event.request).then((networkCevap) => {
        if (networkCevap && networkCevap.status === 200) {
          const klon = networkCevap.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, klon).catch(() => {});
          });
        }
        return networkCevap;
      }).catch(() => {
        // Offline ise cache'den sun
        return caches.match(event.request) || caches.match('./index.html');
      })
    );
    return;
  }

  // Diğerleri: cache-first (ikonlar, manifest)
  event.respondWith(
    caches.match(event.request).then((cevap) => {
      if (cevap) return cevap;
      return fetch(event.request).then((networkCevap) => {
        if (!networkCevap || networkCevap.status !== 200) return networkCevap;
        const klon = networkCevap.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(event.request, klon).catch(() => {});
        });
        return networkCevap;
      });
    })
  );
});

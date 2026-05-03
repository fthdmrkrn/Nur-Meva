const CACHE_VERSION = 'nurmeva-v2';

const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-512-1.png',
  './favicon-1.ico'
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
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

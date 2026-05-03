// Nur Meva PWA Service Worker
// Versiyon: cache adını her güncelledikten sonra değiştir, böylece tarayıcı yeni dosyaları çeker.
const CACHE_VERSION = 'nurmeva-v1';

// Cache'lenecek dosyalar
const CACHE_FILES = [
  './',
  './nurmeva.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './favicon.ico',
  // Google Fonts - cache to enable offline
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Bubblegum+Sans&display=swap'
];

// Install: dosyaları cache'e al
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // addAll başarısız olursa tüm kurulum başarısız olur, bu yüzden tek tek deniyoruz
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

// Activate: eski cache'leri temizle
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

// Fetch: önce cache, yoksa network, network'ten gelen yeni şeyi cache'e ekle
self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini ele al
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cevap) => {
      // Cache'te varsa onu döndür
      if (cevap) return cevap;
      
      // Yoksa network'ten al ve cache'e ekle
      return fetch(event.request).then((networkCevap) => {
        // Sadece başarılı cevapları cache'le
        if (!networkCevap || networkCevap.status !== 200) {
          return networkCevap;
        }
        
        // Response cloneable, klonlayıp cache'e ekle
        const klon = networkCevap.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(event.request, klon).catch(() => {});
        });
        
        return networkCevap;
      }).catch(() => {
        // Network yok ve cache'te de yok
        // Eğer HTML isteniyorsa fallback olarak ana sayfayı göster
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./nurmeva.html');
        }
      });
    })
  );
});

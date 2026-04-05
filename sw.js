const CACHE_NAME = 'zen-ryu-pwa-v4';
const STATIC_URLS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './database.js',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './img/ryu_dragon.png',
  './img/techniques/str_1.png',
  './img/techniques/str_2.png',
  './img/techniques/str_3.png',
  './img/techniques/str_4.png',
  './img/techniques/str_5.png',
  './img/techniques/str_6.png',
  './img/techniques/str_7.png',
  './img/techniques/str_8.png',
  './img/techniques/str_9.png',
  './img/techniques/str_10.png',
  './img/techniques/str_11.png',
  './img/techniques/str_12.png',
  './img/techniques/str_13.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        let responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // Fallback offline si falta red
      });
    })
  );
});

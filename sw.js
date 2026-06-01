// ⚠️ IMPORTANTE: incrementa esta versión en CADA deploy a GitHub
// para forzar la actualización en los teléfonos que ya tienen la app instalada.
// Ejemplo: 'zen-ryu-pwa-v5', 'zen-ryu-pwa-v6', etc.
const CACHE_NAME = 'zen-ryu-pwa-v55';

// Archivos del "shell" de la app — se cachean en install
const STATIC_URLS = [
  './',
  './index.html',
  './style.css',
  './app.js?v=18',
  './database.js?v=13',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './victory_coin.png',
];

// Imágenes — se cachean la primera vez que se usan (Cache-First)
const IMAGE_EXTS = ['.png', '.jpg', '.gif', '.webp', '.svg'];

// ─── INSTALL: pre-cachea el shell de la app ───────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_URLS.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting(); // Activa el nuevo SW de inmediato sin esperar que se cierren tabs
});

// ─── ACTIVATE: elimina cachés viejos ──────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // Toma control de todos los tabs abiertos
  );
});

// ─── FETCH: estrategia híbrida ────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // 1. IGNORAR peticiones que no sean GET (como POST de la API de Gemini)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 2. IGNORAR peticiones de orígenes externos (como Hugging Face, CDN de jsdelivr, Google API)
  // Esto evita problemas de CORS, Range Requests parciales (ONNX) y desconexiones
  if (url.origin !== self.location.origin) {
    return;
  }

  const isImage = IMAGE_EXTS.some(ext => url.pathname.endsWith(ext));

  if (isImage) {
    // CACHE-FIRST para imágenes (no cambian, se sirven rápido offline)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {});
      })
    );
  } else {
    // NETWORK-FIRST para HTML/JS/CSS: siempre intenta la red primero
    // Si la red falla (offline), sirve desde caché como fallback
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
  }
});

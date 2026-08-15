const CACHE_PREFIX = 'seki-last-summer-2026-app-';
const CACHE = CACHE_PREFIX + 'v7';
const APP_SHELL = [
  './',
  './index.html',
  './assets/css/style.css?v=7',
  './assets/css/last-summer.css?v=7',
  './assets/js/app.js?v=7',
  './assets/images/destinations/ikoma-attraction.jpg',
  './assets/images/destinations/wakasa-wada-beach.jpg',
  './assets/images/shot-samples/composition-last-summer.jpg',
  './assets/images/shot-guide/prayer-detail.webp',
  './manifest.webmanifest',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, {cache:'reload'}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put('./index.html', response.clone())));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())));
    return response;
  })));
});

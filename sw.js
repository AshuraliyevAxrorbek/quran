// sw.js — Qur'anuz ilovasi uchun offline kesh
const CACHE_NAME = 'quranuz-cache-v1';
const CORE_ASSETS = [
  './qurianify/index.html',
  './manifest.json',
  './assets/logo.png'
];

// O'rnatish — asosiy fayllarni oldindan keshlash
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Eski keshlarni tozalash
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// So'rovlarni ushlab qolish: rasm/video/shrift/audio — "cache-first",
// boshqa hammasi — "network-first, keshga tushish bilan"
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  const isMedia = /\.(png|jpg|jpeg|webp|svg|mp4|mp3|woff2?|ttf)$/i.test(url.pathname);

  if (isMedia) {
    // Rasmlar/videolar: avval keshdan, bo'lmasa tarmoqdan olib keshga qo'shadi
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        }).catch(() => cached);
      })
    );
  } else if (req.method === 'GET' && url.origin === location.origin) {
    // HTML/JS/CSS: avval tarmoqdan, bo'lmasa keshdan (yangilanishlar tez ko'rinsin)
    e.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return res;
      }).catch(() => caches.match(req))
    );
  }
  // Boshqa domenlar (masalan mp3quran.net audio) — brauzerning o'ziga qoldiriladi
});

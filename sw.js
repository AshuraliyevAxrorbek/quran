// sw.js — Qur'anuz ilovasi uchun offline kesh
const CACHE_NAME = 'quranuz-cache-v13';
const AUDIO_CACHE = 'quran-audio-cache'; // ilova yuklab olgan oflayn audiolar — o'chirilmaydi

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo.png'
];

// O'rnatish: har bir faylni alohida keshlaymiz, biri topilmasa ham o'rnatish yiqilmaydi
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(CORE_ASSETS.map((u) => cache.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

// Eski versiyalarni tozalash (audio keshiga tegmaydi)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== AUDIO_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Keshdagi to'liq faylni Range so'roviga 206 javob qilib qaytarish (audio/video uchun)
async function rangeResponse(req, cached) {
  const buf = await cached.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : buf.byteLength - 1;
  if (m && !m[1] && m[2]) { // "bytes=-500" — oxirgi 500 bayt
    start = Math.max(0, buf.byteLength - parseInt(m[2], 10));
    end = buf.byteLength - 1;
  }
  end = Math.min(end, buf.byteLength - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  const isImgFont = /\.(png|jpe?g|webp|svg|gif|ico|woff2?|ttf)$/i.test(url.pathname);
  const isStream = /\.(mp3|mp4|m4a|ogg|webm)$/i.test(url.pathname);

  // Rasm/shrift: cache-first (bir marta yuklansa keyin bir zumda ochiladi)
  if (isImgFont && sameOrigin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Audio/video: faqat oflayn yuklab olingan bo'lsa keshdan beramiz, aks holda brauzerga qoldiramiz
  if (isStream) {
    e.respondWith(
      caches.match(req.url).then((cached) => {
        if (!cached) return fetch(req);
        if (req.headers.get('range')) return rangeResponse(req, cached);
        return cached;
      }).catch(() => fetch(req))
    );
    return;
  }

  // HTML/JS/CSS (faqat o'z domenimiz): network-first, oflaynda keshdan
  if (sameOrigin) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() =>
        caches.match(req).then((c) => c || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
    );
  }
  // Boshqa domenlar (API, Google Fonts) — brauzerning o'ziga qoldiriladi
});

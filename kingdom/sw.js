/* Офлайн-режим. Когда есть интернет — всегда берём свежие файлы с сайта и обновляем копию;
   когда интернета нет — отдаём сохранённую копию. Обновления игры подхватываются сами. */
const VERSION = 'kingdom-30';
const FILES = ['./', 'index.html', 'css/style.css', 'js/data.js', 'js/math.js', 'js/tower.js', 'js/workshop.js', 'js/hall.js', 'js/skills.js', 'js/grade3.js', 'js/art.js', 'js/audio.js', 'js/sync.js', 'js/game.js',
  'fonts/Inter-Bold.woff', 'fonts/Inter-Black.woff', 'icons/icon-192.png', 'icons/icon-512.png', 'manifest.webmanifest'];
const fresh = url => new Request(url, { cache: 'reload' });      // мимо кэша браузера
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(fresh))).then(() => self.skipWaiting())));
const IMG = 'kingdom-img-3';      // картинки меняются редко: берём из копии, при новой версии картинки меняем номер
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || /api\.php/.test(u.pathname)) return;   // синхронизация всегда идёт на сервер
  if (/\/img\//.test(u.pathname)) {
    e.respondWith(caches.open(IMG).then(async c => {
      const hit = await c.match(e.request.url); if (hit) return hit;
      const r = await fetch(e.request); if (r.ok) c.put(e.request.url, r.clone()); return r;
    }));
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const r = await Promise.race([fetch(fresh(u.origin + u.pathname)), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 4000))]);
      if (r && r.ok) { cache.put(u.origin + u.pathname, r.clone()); return r; }
      throw new Error('bad response');
    } catch (err) {
      const m = await cache.match(u.origin + u.pathname) || (u.pathname.endsWith('/') ? await cache.match(u.origin + u.pathname + 'index.html') : null);
      if (m) return m;
      throw err;
    }
  })());
});

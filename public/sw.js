// Served at /train/sw.js, so its scope is /train/ only. It can never intercept
// the marketing site at the root.
var CACHE = 'ff-train-v1';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(['./']); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.indexOf('supabase') !== -1) return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      if (r.ok) { var c = r.clone(); caches.open(CACHE).then(function (cache) { cache.put(e.request, c); }); }
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
});
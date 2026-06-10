var CACHE = 'ff-v5';

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(['/']); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(k) {
    return Promise.all(k.filter(function(n) { return n !== CACHE; }).map(function(n) { return caches.delete(n); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.indexOf('supabase') !== -1) return;
  e.respondWith(
    fetch(e.request).then(function(r) {
      if (r.ok) { var c = r.clone(); caches.open(CACHE).then(function(cache) { cache.put(e.request, c); }); }
      return r;
    }).catch(function() { return caches.match(e.request); })
  );
});
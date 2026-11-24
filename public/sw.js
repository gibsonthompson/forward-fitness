// Served at /train/sw.js, so its scope is /train/ only. It can never intercept
// the marketing site at the root.
//
// The build stamps a unique id into this file on every deploy, so the browser
// sees a changed worker and installs it. Old caches are deleted on activate.
var BUILD = '__BUILD_ID__';
var CACHE = 'ff-train-' + BUILD;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.add(new Request('./', { cache: 'reload' })); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Only handle our own files. Supabase, fonts and the API always go straight to the network.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return;
  if (/\/(version\.json|sw\.js)$/.test(url.pathname)) return;

  // App shell: always try the network first so a new deploy loads immediately.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
        if (r.ok) { var c = r.clone(); caches.open(CACHE).then(function (cache) { cache.put('./', c); }); }
        return r;
      }).catch(function () { return caches.match('./'); })
    );
    return;
  }

  // Built assets have content hashes in their names, so a cached copy is always correct.
  if (url.pathname.indexOf('/assets/') !== -1) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (r) {
          if (r.ok) { var c = r.clone(); caches.open(CACHE).then(function (cache) { cache.put(req, c); }); }
          return r;
        });
      })
    );
    return;
  }

  // Everything else (icons, manifest): network first, cache as offline fallback.
  e.respondWith(
    fetch(req).then(function (r) {
      if (r.ok) { var c = r.clone(); caches.open(CACHE).then(function (cache) { cache.put(req, c); }); }
      return r;
    }).catch(function () { return caches.match(req); })
  );
});

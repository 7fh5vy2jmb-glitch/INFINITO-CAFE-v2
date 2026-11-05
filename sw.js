/* Service worker: deja el sitio disponible sin conexión.
   Sube el número de versión cuando cambies archivos. */
var V = 'infinito-v1';
var NAMES = ['intro', 'maquina', 'bar', 'menu', 'entrada', 'jarabes', 'horario'];
var ASSETS = ['./', 'index.html', 'style.css', 'script.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
NAMES.forEach(function (n) { ASSETS.push(n + '-800.webp', n + '-1600.webp'); });

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(function () { return caches.match('index.html'); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(V).then(function (c) { c.put(req, copy); });
      return res;
    });
  }));
});

/* CTEFA-CLASSIC Web — service worker : l'application s'ouvre sans internet.
 * - page (index.html) : réseau d'abord (pour recevoir les mises à jour), sinon copie locale ;
 * - bibliothèques (Firebase, Excel, QR) et icônes : copie locale d'abord, rafraîchie en arrière-plan.
 * Les données de l'école restent gérées par Firebase (cache hors ligne IndexedDB). */
var VERSION = 'ctefa-v1';
var BASE = ['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png',
  'https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-app-compat.js',
  'https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-auth-compat.js',
  'https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'];
var CDN = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com)\//;

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(BASE.map(function (u) { return c.add(new Request(u, { mode: /^http/.test(u) ? 'no-cors' : 'same-origin' })).catch(function () {}); }));
  }));
});
self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (ev) { if (ev.data === 'activer') self.skipWaiting(); });
self.addEventListener('fetch', function (ev) {
  var req = ev.request, url = req.url;
  if (req.method !== 'GET') return;
  if (/googleapis\.com\/(google\.firestore|identitytoolkit)|firestore\.googleapis|securetoken|firebaseinstallations/.test(url)) return;   /* Firebase gère lui-même */
  var memeSite = url.indexOf(self.location.origin) === 0;
  if (req.mode === 'navigate' || (memeSite && /\/(index\.html)?(\?.*)?$/.test(new URL(url).pathname))) {
    ev.respondWith(fetch(req).then(function (r) { var c = r.clone(); caches.open(VERSION).then(function (k) { k.put('./index.html', c); }); return r; })
      .catch(function () { return caches.match('./index.html').then(function (r) { return r || caches.match('./'); }); }));
    return;
  }
  if (memeSite || CDN.test(url)) {
    ev.respondWith(caches.match(req, { ignoreVary: true }).then(function (enCache) {
      var reseau = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) { var c = r.clone(); caches.open(VERSION).then(function (k) { k.put(req, c); }); } return r; }).catch(function () { return enCache; });
      return enCache || reseau;
    }));
  }
});

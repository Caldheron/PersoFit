const VERSION = 'fitness-1.0.0';
const FILES = ['./', './index.html', './css/style.css', './manifest.webmanifest', './data/exercices.json', './icons/icon-192.png', './icons/icon-512.png',
  './js/app.js', './js/bus.js', './js/calc.js', './js/chrono.js', './js/data.js', './js/gen.js', './js/lib.js', './js/store.js', './js/ui-chrono.js', './js/ui-exercices.js',
  './js/ui-historique.js', './js/ui-reglages.js', './js/ui-seance.js', './js/util.js', './js/version.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES))); });
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});

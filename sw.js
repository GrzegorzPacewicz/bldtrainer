const CACHE_NAME = 'bldtrainer-v20';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css?v=20',
    '/js/db.js?v=20',
    '/js/game.js?v=20',
    '/js/import.js?v=20',
    '/js/stats.js?v=20',
    '/js/app.js?v=20',
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('cdn.jsdelivr.net')) {
        e.respondWith(fetch(e.request));
        return;
    }

    e.respondWith(
        fetch(e.request, { cache: 'no-store' })
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(e.request, clone);
                });
                return response;
            })
            .catch(() => caches.match(e.request))
    );
});

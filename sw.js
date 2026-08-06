const CACHE_NAME = 'bldtrainer-v13';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css?v=13',
    '/js/db.js?v=13',
    '/js/game.js?v=13',
    '/js/import.js?v=13',
    '/js/stats.js?v=13',
    '/js/app.js?v=13',
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

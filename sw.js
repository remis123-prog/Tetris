const CACHE_NAME = 'tetris-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './audio.js',
    './game.js',
    './controls.js',
    './ui.js',
    './icon.svg',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

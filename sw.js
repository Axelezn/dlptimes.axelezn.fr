// sw.js (Version Cache-Only - Notifications et Surveillance Retirées)

const CACHE_NAME = 'dlp-wait-times-cache-v49';


const urlsToCache = [
  // RACINE
  './', 
  './index.html',
  './manifest.json',

  // Dossier HTML 
  './disneyland_park.html',
  './disneyland_studios.html',
  './shows.html',
  './live-map.html',

  // DOSSIER CSS
  './css/index.css',
  './css/park-styles.css',
  './css/map-style.css',

  // DOSSIER JS
  './js/timetables.js', 
  './js/app-park.js', 
  './js/app-studios.js',
  './js/pwa_register.js',
  './js/json/dlp-coords.json',
  './js/json/restaurants.json',
  './js/json/shops.json',
  './js/app-shows.js',
  './js/app-map.js',


  './imgs/dlppark.png', 
  './imgs/dlpstudios.png',
  './imgs/icon-192.png', 
  './imgs/icon-512.png',
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mise en cache des ressources statiques');
        return cache.addAll(urlsToCache).catch((err) => {
             console.error('Erreur FATALE lors de la mise en cache :', err);
        });
      })
  );
});


self.addEventListener('fetch', (event) => {

  if (event.request.url.includes('api.themeparks.wiki')) {
    event.respondWith(fetch(event.request)); 
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {

        if (response) {
          return response;
        }

        return fetch(event.request);
      })
  );
});

// 3. Activation : suppression des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation et nettoyage des anciens caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
         
          return cacheName.startsWith('dlp-wait-times-cache-') && cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// --- FIN DU CODE ---
// Toute la logique de notifications, d'API polling, et d'événements push a été retirée.
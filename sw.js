// sw.js (Version Cache-Only - Notifications et Surveillance Retirées)

// Incrémentez la version pour forcer la mise à jour du cache
const CACHE_NAME = 'dlp-wait-times-cache-v48'; // ⭐ NOUVELLE VERSION PROPRE

// Liste des fichiers statiques à mettre en cache lors de l'installation
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

  // DOSSIER IMGS (Images et Icônes PWA)
  './imgs/dlppark.png', 
  './imgs/dlpstudios.png',
  './imgs/icon-192.png', 
  './imgs/icon-512.png',
];

// 1. Installation du Service Worker et mise en cache
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

// 2. Stratégie de mise en cache : Cache-First
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes API pour s'assurer des données en temps réel
  if (event.request.url.includes('api.themeparks.wiki')) {
    event.respondWith(fetch(event.request)); // Va directement au réseau
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si la ressource est dans le cache, on la retourne
        if (response) {
          return response;
        }
        // Sinon, on va la chercher sur le réseau
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
          // Supprime tous les caches qui commencent par notre préfixe mais ne sont pas la version actuelle
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
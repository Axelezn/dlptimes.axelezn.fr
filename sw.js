// sw.js (TEST V14 - Retrait des HTML secondaires)
// Incrémentez la version à chaque changement dans la liste 'urlsToCache'
const CACHE_NAME = 'dlp-wait-times-cache-v16'; // ⭐ NOUVEAU CACHE

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

  // DOSSIER JS
  './js/timetables.js', 
  './js/app-park.js', 
  './js/app-studios.js',
  './js/pwa_register.js',
    './js/dlp-coords.json',
    './js/app-shows.js',
    './js/app-map.js',

  // DOSSIER IMGS (Images et Icônes PWA)
  './imgs/dlppark.png', 
  './imgs/dlpstudios.png',
  './imgs/icon-192x192.png', 
  './imgs/icon-512x512.png'
];

// Installation du Service Worker et mise en cache des ressources statiques
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mise en cache des ressources statiques');
        return cache.addAll(urlsToCache).catch((err) => {
             // Si cette erreur apparaît encore, c'est un autre fichier qui manque.
             console.error('Erreur FATALE lors de la mise en cache (Vérifiez si un fichier de urlsToCache est manquant) :', err);
        });
      })
  );
});

// Stratégie de mise en cache : Cache-First
self.addEventListener('fetch', (event) => {
  // 🚫 Ignorer les requêtes API pour s'assurer des données en temps réel
  if (event.request.url.includes('api.themeparks.wiki')) {
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

// Mise à jour : suppression des anciens caches
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
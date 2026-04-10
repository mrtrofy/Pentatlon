const cacheName = 'penta-elite-v3'; // Nueva versión
const assets = [
  './',
  './index.html',
  './Penta.html',
  './manifest.json',
  './logo1.ico',
  './deeee.jpeg', 
  './yo.jpeg',
  './LOGO-192.png',
  './LOGO-512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  // Agregamos las librerías de Firebase para que carguen offline
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'
];

// Instalación: Guardar todo en caché
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return Promise.all(
        assets.map(url => {
          return cache.add(url).catch(err => console.error('Fallo al guardar:', url));
        })
      );
    })
  );
});

// Estrategia: Cache First (Primero Caché, luego Red)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      // Si está en caché, lo devuelve. Si no, intenta buscarlo en internet.
      return response || fetch(e.request).catch(() => {
        // Opcional: Aquí podrías devolver una página de "Estás offline" 
        // si el recurso no existe en el caché.
      });
    })
  );
});
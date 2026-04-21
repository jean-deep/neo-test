// Define el nombre de la caché y la versión.
// Incrementa el número de versión cada vez que realices cambios en los archivos de la app.
const CACHE_NAME = 'code-companion-cache-v7.01.collapsible-menu--new-button--buttons';
// Lista de archivos para precache. Debes incluir todos los archivos de tu app.
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&family=Orbitron:wght@400;700&family=Inter:wght@400;700&display=swap'
];

// Evento de instalación: se activa cuando el Service Worker se instala por primera vez.
// La llamada a self.skipWaiting() fuerza a que el nuevo SW se active inmediatamente.
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando y precargando activos...');
    self.skipWaiting(); // NEW: Force the new service worker to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Precargando todos los activos...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.error('[Service Worker] Error al precargar activos:', error);
            })
    );
});

// Evento de activación: se activa cuando el Service Worker se activa.
// clients.claim() le dice al Service Worker que tome el control de todas las pestañas abiertas.
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activando y limpiando cachés antiguas...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Eliminando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim(); // NEW: Take control of all clients
        })
    );
});

// Evento de fetch: se activa para cada solicitud de la red.
// Esta es la lógica principal para servir archivos desde la caché o la red.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Se encontró un archivo en la caché. Se sirve la versión en caché.
            if (response) {
                console.log(`[Service Worker] Sirviendo desde la caché: ${event.request.url}`);
                // También se busca la versión más reciente en la red y se actualiza la caché en segundo plano.
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                            console.log(`[Service Worker] Actualizando caché para: ${event.request.url}`);
                        });
                    }
                }).catch((error) => {
                    console.error('[Service Worker] Falló la actualización de la caché en segundo plano:', error);
                });
                return response;
            }

            // No se encontró en la caché, se busca en la red.
            console.log(`[Service Worker] Sirviendo desde la red: ${event.request.url}`);
            return fetch(event.request).then((networkResponse) => {
                // Si la respuesta es válida, se guarda en la caché para futuras visitas.
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            });
        }).catch(() => {
            // Si la solicitud falla tanto en caché como en red, se puede mostrar una página de fallback.
            // Por ahora, solo se devuelve un error.
            return new Response('No hay conexión a internet.');
        })
    );
});

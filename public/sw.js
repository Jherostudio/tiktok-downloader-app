self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Al ser una herramienta Online no guardaremos caché profundo, 
    // pero responder todo con fetch permite a la PWA saltar el error de "no offline support"
    e.respondWith(fetch(e.request).catch(() => new Response("Estás desconectado. Necesitas internet para descargar videos.")));
});

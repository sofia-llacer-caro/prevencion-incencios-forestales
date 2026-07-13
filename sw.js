/* Service worker · Guía de incendios Aras de los Olmos
   Estrategia sencilla de "app shell": se cachea todo en la instalación y se
   sirve desde caché primero, para que la guía funcione sin cobertura.
   Al cambiar el contenido, sube CACHE_VERSION para forzar la actualización. */

var CACHE_VERSION = "aras-incendios-v1";

var APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./icons/favicon.svg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_VERSION; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  // Solo gestionamos peticiones GET de nuestro propio origen
  // (el iframe del mapa de OpenStreetMap sigue necesitando conexión).
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        // Guarda en caché lo que se vaya pidiendo, por si se añaden archivos nuevos.
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        // Sin conexión y sin caché: para navegaciones devolvemos la portada.
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});

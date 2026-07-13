/* Guía de incendios · Aras de los Olmos
   JS vanilla: tamaño de texto, coordenadas GPS y service worker. */
(function () {
  "use strict";

  document.body.classList.remove("no-js");

  /* ============ 0. Flujo guiado: rutas por hash (#/vista) ============ */
  // Cada sección lleva data-flow="vista1 vista2..." con las vistas donde se
  // muestra. Las rutas "#/x" filtran la guía; los anclajes normales "#seccion"
  // abren la guía completa y saltan a esa sección. Sin JS se ve todo seguido.

  var VIEWS = {
    // pantallas de preguntas
    inicio: null,
    donde: null,
    quien: null,
    // vistas de contenido filtrado (etiqueta para la barra superior)
    emergencia: "Emergencia: veo humo o fuego",
    monte: "Estás en el monte a pie",
    coche: "Estás en el coche",
    casa: "Estás en una casa",
    visita: "Vienes de visita este verano",
    "eclipse-info": "Vienes a ver el eclipse de 2026",
    pueblo: "Eres del pueblo o tienes casa aquí",
    todo: "Guía completa"
  };

  var flowEls = document.querySelectorAll("main [data-flow]");
  var resultBar = document.getElementById("result-bar");
  var resultLabel = document.getElementById("result-label");

  function route() {
    var hash = location.hash;
    var view = "inicio";
    var anchor = null;

    if (hash.indexOf("#/") === 0 && VIEWS.hasOwnProperty(hash.slice(2))) {
      view = hash.slice(2);
    } else if (hash.length > 1) {
      // Anclaje normal (nav superior o enlaces internos): guía completa + salto.
      view = "todo";
      anchor = document.getElementById(hash.slice(1));
    }

    document.body.setAttribute("data-view", view);
    for (var i = 0; i < flowEls.length; i++) {
      var el = flowEls[i];
      el.hidden = (" " + el.getAttribute("data-flow") + " ").indexOf(" " + view + " ") === -1;
    }

    var label = VIEWS[view];
    resultBar.hidden = !label;
    if (label) resultLabel.textContent = label;

    if (anchor) {
      anchor.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }

  window.addEventListener("hashchange", route);
  route();

  /* ============ 1. Tamaño de texto ajustable (persistente) ============ */

  var FONT_SIZES = [100, 112.5, 125, 140, 160]; // % sobre 16px; 112.5% es el valor por defecto
  var FONT_KEY = "aras-font-size";

  function applyFontSize(pct) {
    document.documentElement.style.fontSize = pct + "%";
    try { localStorage.setItem(FONT_KEY, String(pct)); } catch (e) { /* modo privado: no pasa nada */ }
  }

  function currentFontSize() {
    var saved = NaN;
    try { saved = parseFloat(localStorage.getItem(FONT_KEY)); } catch (e) { /* ignorar */ }
    return FONT_SIZES.indexOf(saved) !== -1 ? saved : 112.5;
  }

  function stepFontSize(dir) {
    var idx = FONT_SIZES.indexOf(currentFontSize()) + dir;
    idx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx));
    applyFontSize(FONT_SIZES[idx]);
  }

  applyFontSize(currentFontSize());

  document.getElementById("font-smaller").addEventListener("click", function () { stepFontSize(-1); });
  document.getElementById("font-bigger").addEventListener("click", function () { stepFontSize(1); });

  /* ============ 2. Copiar coordenadas GPS ============ */

  var gpsBtn = document.getElementById("gps-copy");
  var gpsOut = document.getElementById("gps-result");

  function showCoords(text, isError) {
    gpsOut.textContent = text;
    gpsOut.classList.toggle("gps-error", !!isError);
  }

  function copyText(text) {
    // navigator.clipboard requiere contexto seguro (https/localhost); si falla,
    // usamos el método clásico para que funcione también abierto como archivo local.
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { /* sin soporte */ }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error("copy failed"));
    });
  }

  if (gpsBtn) {
    gpsBtn.addEventListener("click", function () {
      if (!("geolocation" in navigator)) {
        showCoords("Tu navegador no permite obtener la ubicación. Usa Google Maps o la app de brújula del móvil para leer tus coordenadas.", true);
        return;
      }
      gpsBtn.disabled = true;
      showCoords("Obteniendo tu posición… acepta el permiso de ubicación si el navegador te lo pide.");

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          gpsBtn.disabled = false;
          var lat = pos.coords.latitude.toFixed(5);
          var lon = pos.coords.longitude.toFixed(5);
          var precision = Math.round(pos.coords.accuracy);
          var coords = lat + ", " + lon;
          copyText(coords).then(
            function () {
              showCoords("📋 Copiado: " + coords + "  (precisión ±" + precision + " m). Léelo así al 112: latitud " + lat + ", longitud " + lon + ".");
            },
            function () {
              showCoords("Tus coordenadas (cópialas o léelas al 112): latitud " + lat + ", longitud " + lon + " (precisión ±" + precision + " m).");
            }
          );
        },
        function (err) {
          gpsBtn.disabled = false;
          var msg;
          if (err.code === err.PERMISSION_DENIED) {
            msg = "Has denegado el permiso de ubicación. Actívalo en los ajustes del navegador y vuelve a intentarlo, o da referencias verbales al 112 (camino, paraje, punto cardinal).";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = "No se ha podido obtener la posición (sin señal GPS). Da referencias verbales al 112: camino, paraje, punto cardinal respecto al pueblo.";
          } else {
            msg = "La ubicación ha tardado demasiado. Inténtalo de nuevo a cielo abierto, o da referencias verbales al 112.";
          }
          showCoords(msg, true);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
      );
    });
  }

  /* ============ 3. Service worker (solo https o localhost) ============ */

  // En file:// (doble clic en index.html) los service workers no están permitidos;
  // la página funciona igual, solo que sin caché offline.
  var isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if ("serviceWorker" in navigator && (location.protocol === "https:" || isLocalhost)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function (err) {
        console.warn("Service worker no registrado:", err);
      });
    });
  }
})();

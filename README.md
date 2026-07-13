# Guía de incendios forestales · Aras de los Olmos

Web estática de una sola página, en español, con información de autoprotección
frente a incendios forestales para visitantes de Aras de los Olmos (Valencia).
Sin frameworks, sin build step, sin analytics: HTML + CSS + JS vanilla.
Funciona **sin conexión** después de la primera visita (service worker).

## Probar en local

Doble clic en `index.html` y listo. Todo funciona igual, salvo dos cosas que
los navegadores solo permiten en `https://` o `localhost`:

- El **service worker** (caché offline) no se registra en `file://`.
- El **mapa incrustado** de OpenStreetMap necesita conexión siempre.

Para probarlo completo en local, sirve la carpeta con cualquier servidor
estático, por ejemplo:

```
python -m http.server 8000
# o
npx serve .
```

y abre http://localhost:8000

## Publicar gratis en GitHub Pages

1. Crea un repositorio en GitHub y sube todos los archivos (la carpeta
   `icons/` incluida) a la rama `main`.
2. En el repositorio: **Settings → Pages → Build and deployment**.
3. En "Source" elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. Guarda. En 1-2 minutos la web estará en
   `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

También funciona tal cual en **Netlify** (arrastra la carpeta a
app.netlify.com/drop) o en **Cloudflare Pages**.

## Cómo actualizar el contenido

| Quiero cambiar…                                | Toca este archivo |
|------------------------------------------------|-------------------|
| Textos, teléfonos, secciones, enlaces           | `index.html` (todo el contenido está ahí, en HTML plano) |
| Colores, tipografía, espaciados                 | `styles.css` (los colores están en las variables `:root` del principio) |
| Botón de coordenadas GPS, tamaño de texto       | `app.js` |
| Iconos                                          | El "sprite" de símbolos SVG al principio de `index.html` (los archivos de `icons/` son copias sueltas de referencia; el favicon es `icons/favicon.svg`) |

### Cambiar teléfonos

Busca `tel:` en `index.html`. El del ayuntamiento está como
`tel:+34962102001` (formato internacional para que funcione desde móviles
extranjeros); el texto visible se cambia justo al lado.

### Cambiar o sustituir el mapa de evacuación

En `index.html`, sección `id="evacuacion"`: hay un `<iframe>` de
OpenStreetMap centrado en 39.9686, -1.0655 como ejemplo. El ayuntamiento
puede sustituirlo por una imagen del plano oficial
(`<img src="plano-evacuacion.png" alt="...">`) — si es una imagen local,
añádela también a la lista `APP_SHELL` de `sw.js` para que se vea offline.

### Rellenar los bloques "PENDIENTE DE CONFIRMAR"

Hay dos bloques rayados en ámbar (secciones de teléfonos y de evacuación)
pensados para que el ayuntamiento los complete. Búscalos en `index.html`
por el texto `PENDIENTE DE CONFIRMAR`.

### MUY IMPORTANTE al publicar cambios: versión del caché

El service worker guarda una copia de toda la web en el móvil del visitante.
Para que los visitantes que ya la tienen cacheada reciban tus cambios, **sube
el número de versión** en la primera línea útil de `sw.js`:

```js
var CACHE_VERSION = "aras-incendios-v2";  // v1 → v2, v3…
```

Si no lo haces, los cambios tardarán en llegar a quien ya visitó la web.

## Estructura de archivos

```
index.html   Todo el contenido y los iconos SVG inline
styles.css   Estilos (mobile-first, alto contraste)
app.js       Coordenadas GPS, ajuste de tamaño de texto, registro del SW
sw.js        Service worker: caché offline (app shell)
icons/       favicon.svg + iconos SVG sueltos de referencia
```

## Idiomas

De momento solo español. El aviso "Available in English & Valencià soon"
está en el `<p class="lang-note">` del principio de `index.html`; elimínalo
o conviértelo en selector cuando existan las traducciones.

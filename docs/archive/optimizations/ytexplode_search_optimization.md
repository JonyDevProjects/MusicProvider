# Informe de Optimización: Búsquedas Ágiles (Inspirado en YtExplode)

**Fecha:** 2026-08-09
**Asunto:** Estrategias para reducir el overhead de ~1.7s en las búsquedas (Search API).

## 1. El Problema del Overhead Actual (`yt-dlp`)
Nuestra prueba de baseline de rendimiento revela que el endpoint `/api/search` demora aproximadamente **1.73s** en completarse (TTFB).
Este delay no es de latencia de red puramente, sino que es causado por el **overhead de instanciar un subproceso del sistema** para ejecutar el binario de `yt-dlp` (`exec("bin/yt-dlp ytsearch...")`), el cual debe cargar su intérprete de Python empaquetado, inicializar extractores y resolver la petición a YouTube antes de retornar el JSON a Node.js.

## 2. Referencias Históricas en Engram (`youtube_explode_dart`)
Al revisar la memoria de Engram, el proyecto cuenta con un rico historial de investigación sobre implementaciones sin backend o con dependencias nativas rápidas, específicamente orientadas a iOS (Memorias #89, #90, #94, #106, #115, #125):
- Se implementó un `MusicService Strategy Pattern` que permitió a la aplicación cliente (`Spoti5_app`) realizar **búsquedas directas** a la API interna de YouTube (InnerTube API) desde el propio código Dart, utilizando la librería `youtube_explode_dart`.
- Las búsquedas realizadas puramente a nivel de código (HTTP/JSON), sin levantar un binario pesado en disco, logran que los resultados se desplieguen de forma casi **instantánea**, resultando en una UX muy fluida.
- *Nota de riesgo (Memoria #125):* Si bien es veloz, `youtube_explode` puede sufrir bloqueos (Rate Limits / 403) muy rápido cuando se encarga de resolver URLs de streaming (manifest fetch).

## 3. Aproximaciones Propuestas (Soluciones Híbridas)
Para traer la fluidez de `youtube_explode_dart` al flujo backend actual sin sacrificar la estabilidad probada del proxy de streaming de `yt-dlp`, podemos adoptar uno de los siguientes enfoques:

### A) Delegación al Cliente (Dart Frontend) - Enfoque Híbrido
- **Cómo funciona:** Modificamos el Factory o PlayerProvider en `Spoti5_app` para que **la acción de búsqueda (`Search`)** se realice localmente usando `youtube_explode_dart`, evitando pasar por el backend.
- **Cuándo usar backend:** Cuando el usuario selecciona una canción, el frontend llama al endpoint backend (`/api/audio/stream` o `/resolve`), delegando la extracción profunda de la URL del stream a `yt-dlp` en el Node.js.
- **Ventaja:** Cero carga extra en nuestro servidor. UX inmediata en el cliente.
- **Desventaja:** Posibles bloqueos IP si el usuario busca excesivamente rápido, aunque la búsqueda de texto sufre menos rate limit que la resolución del stream.

### B) Reemplazo de la Librería de Búsqueda en el Backend (Node.js)
- **Cómo funciona:** En lugar de hacer que `/api/search` ejecute `yt-dlp`, podemos usar una librería pura en JavaScript/TypeScript que simule a `youtube_explode` en el lado de Node (ej. `youtubei.js`, `yt-search`, o play-dl).
- **Flujo:** `/api/search` utiliza la librería Node (TTFB estimado: ~200-400ms). `/api/info` y `/api/audio/resolve` siguen utilizando el subproceso de `yt-dlp` debido a su alta resistencia contra rotación de firmas y algoritmos anti-bot.
- **Ventaja:** Mantiene el frontend completamente agnóstico (toda la lógica queda centralizada en el `ApiService`).
- **Desventaja:** Requiere añadir una dependencia extra al proyecto backend y refactorizar `src/ytdlpWrapper.ts`.

## Conclusión
La latencia de 1.7s en búsqueda daña la "sensación de respuesta" de la app. Separar el **motor de búsqueda** (que requiere velocidad) del **motor de extracción de streams** (que requiere robustez pesada como `yt-dlp`) es el camino arquitectónico recomendado para recuperar la fluidez que proporcionaba la implementación anterior.

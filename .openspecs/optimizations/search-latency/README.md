# Optimización de Búsqueda (Search Latency)

## Problema
El TTFB del endpoint de búsqueda (`/api/search`) usando `yt-dlp` en el backend es de ~1.73s. Esto se debe al overhead de invocar el binario y el intérprete interno de Python en cada solicitud.

## Propuestas

### Opción A: Cliente Híbrido (Frontend Dart)
- **Concepto:** Delegar la búsqueda puramente al cliente Flutter usando la librería `youtube_explode_dart`.
- **Implementación:**
  1. Crear una clase `HybridMusicService` en Flutter que en su método `searchTracks` delegue la llamada a `youtube_explode_dart` en vez de hacer un HTTP GET a `/api/search`.
  2. El método `getStream` seguirá llamando al backend Node.js (`/api/audio/stream` o `/api/audio/resolve`) para mantener la robustez anti-bot de `yt-dlp`.
  3. Modificar `MusicServiceFactory` para que priorice este servicio híbrido en plataformas móviles.
- **Testing:**
  - Validar visualmente en el emulador o dispositivo físico que la búsqueda se retorna de manera casi instantánea.
  - Asegurar que la reproducción posterior fluye sin fallos a través del backend local.

### Opción B: Librería Nativa JS en Backend (Node.js)
- **Concepto:** Reemplazar `yt-dlp` en el backend únicamente para el método de búsqueda, usando un scraper rápido en JS nativo (ej. `yt-search`).
- **Implementación:**
  1. Ejecutar `npm install yt-search` (y dependencias de tipos).
  2. Modificar la función `searchTracks` en `src/ytdlpWrapper.ts` para que importe y ejecute `yt-search`.
  3. Formatear la salida del resultado para que cumpla con la interfaz `Track` preexistente, garantizando así cero cambios en el cliente API.
  4. Eliminar el uso del subproceso de Python/yt-dlp para la búsqueda.
- **Testing:**
  - Volver a ejecutar los tests automatizados (`npm run test`, E2E, etc.) asegurando compatibilidad del contrato de la API.
  - Ejecutar el script `curl-timing.sh` y documentar la bajada esperada del TTFB desde 1.7s a unos ~200-400ms.

## Estrategia de Ejecución SDD
1. **Paso 1:** Implementaremos y probaremos la **Opción A** en el frontend.
2. **Paso 2:** Analizaremos el impacto (ventajas/desventajas). Luego la mantendremos temporalmente apagada o en una rama separada para aislar pruebas.
3. **Paso 3:** Implementaremos la **Opción B** modificando el servidor backend Node.js.
4. **Paso 4:** Pasaremos de nuevo por la fase de testing (automatizado y de latencia).
5. **Paso 5:** Decisión arquitectónica final basada en los resultados y guardado del conocimiento en Engram.

## Ejecución y Resultados

### Resultado Opción A (Cliente Híbrido)
Se implementó `HybridMusicService` que hace la búsqueda localmente (Dart) y el streaming a través del proxy backend. 
**Pro:** Búsqueda ultra-rápida (prácticamente instantánea para el usuario) ya que no incurre en un salto de red hacia nuestro backend, contactando directamente a YouTube a través de `youtube_explode_dart`.
**Contra:** Requiere lógica de cliente y, dadas las metas a futuro (plugins en TypeScript para Nuclear), desvía demasiada lógica vital al frontend.

### Resultado Opción B (Backend Optimization)
Se restauró el cliente estándar (`ApiService`) y se reemplazó la lógica de búsqueda en Node.js, cambiando el CLI de `yt-dlp` por la librería npm `yt-search`.
**Pro:** Completamente en el backend. Todas las interfaces del cliente permanecen idénticas (se re-mapearon los campos de `yt-search` a la interfaz preexistente `YtdlpSearchResult`).
**Mejora de TTFB:** Al medir `/api/search`, el tiempo pasó de **~1.73s** a un promedio de **~0.76s** (reducción del 56% de la latencia). Los tests del backend (`npm test`) pasaron sin fallos.

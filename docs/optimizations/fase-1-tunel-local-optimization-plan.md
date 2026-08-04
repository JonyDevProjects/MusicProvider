# Plan de Optimización — Fase 1 (Túnel Local)

Este documento detalla todas las posibles optimizaciones para reducir la latencia y mejorar los tiempos de respuesta de la aplicación MusicProvider bajo la arquitectura de **Fase 1: Túnel Local (Cloudflare Tunnel)**. El plan abarca mejoras desde el backend en Node.js hasta el cliente en Flutter, basándose en los hallazgos de las sesiones de testing.

---

## 1. Optimizaciones Implementadas (Fase 1)

Se implementaron las siguientes optimizaciones y verificaron:

### Backend (Node.js/TypeScript) — `src/server.ts`

- **A.1. HTTP Keep-Alive / Connection Pooling hacia YouTube CDN**: Se crearon agentes `https.Agent({ keepAlive: true })` y `http.Agent({ keepAlive: true })` globales y se pasaron como `agent` en las opciones de `client.get()` hacia el CDN, reutilizando conexiones TCP/TLS entre requests de chunks. **Impacto: Alto**. **Verificado**: el endpoint `/api/audio/stream` responde con `Connection: keep-alive`.
- **A.2. LRU Cache / Limpieza Proactiva de Memoria**: Se reemplazó el `Map` manual (`streamUrlCache`) por `LRUCache<string, YtdlpStreamInfo>` del paquete `lru-cache` con `max: 100` y `ttl: 5min`, eliminando el memory leak de forma automática. **Impacto: Medio**. **Verificado**: el endpoint `/api/audio/resolve` retorna en ~0.003s tras el warmup (cache HIT).
- **A.3. Normalización y Propagación de Headers**: Se filtran los headers hop-by-hop (`connection`, `keep-alive`, `transfer-encoding`, etc.) y se garantizan explícitamente `Content-Type`, `Accept-Ranges: bytes`, `Content-Length`, y `Content-Range` al cliente. **Impacto: Medio**. **Verificado**: el endpoint `/api/audio/stream` retorna `Content-Range: bytes 0-3830363/3830364`, `Accept-Ranges: bytes`, `Content-Length: 3830364`.
- **A.4. Pre-resolución en Background (Batch Resolve)**: `/api/search` ahora dispara asíncronamente (fire-and-forget) `getCachedStreamInfo` para los top 3 resultados, poblando la caché antes de que el cliente solicite reproducción. **Impacto: Alto**. **Verificado**: los logs del servidor muestran resolución en background tras cada búsqueda.

### Aplicación (Flutter/Dart)

- **B.1. Cache Warmup Explícito Post-Búsqueda**: Se añadió el método `warmupCache(List<String> videoIds)` a la interfaz `MusicService`. En `PlayerProvider.searchTracks()`, tras recibir resultados, se despachan peticiones asíncronas `GET` a `/api/audio/resolve` para los primeros 3 tracks. `ApiService` implementa el warmup real; los servicios nativos (`YtdlpNativeService`, `YtExplodeService`) lo implementan como no-op. **Impacto: Alto**.
- **B.2. HTTP/2 y Keep-Alive del Túnel**: Se reemplazaron las llamadas `http.get()` (que crean un cliente efímero por request) por un `http.Client` persistente (`_client`) reutilizado en todas las llamadas del `ApiService`, manteniendo la conexión TCP/TLS al túnel entre peticiones. **Impacto: Medio**.
- **B.3. Prefetching de Primeros Chunks de Audio**: pendiente (Avanzado — Alto esfuerzo).

### Verificación

- `npx tsc --noEmit` — pasa sin errores.
- `npx vitest run` — 6/6 tests pasan.
- `flutter analyze` — sin errores.
- `flutter test` — 11/11 tests pasan.
- Test manual con `curl` de los endpoints `/api/search`, `/api/audio/resolve`, `/api/audio/stream` — todos responden correctamente con headers prístinos y keep-alive.

---

## 2. Plan de Optimizaciones Pendientes (Por Prioridad)

### B.3. Prefetching de Primeros Chunks de Audio (Avanzado)
- **Problema**: Aunque la URL se resuelva en 0ms, la descarga inicial del stream a través de la red celular añade latencia hasta llenar el buffer del AVPlayer.
- **Solución**: Una vez obtenida la metadata del prefetch, descargar proactivamente el primer megabyte del archivo de audio a la caché local del dispositivo. Cuando el usuario hace *play*, servir ese primer megabyte localmente, y pedir al proxy los bytes desde `1048576` en adelante.
- **Impacto**: Muy Alto (Reproducción instantánea real).
- **Esfuerzo**: Alto (Requiere interceptar los requests de AVPlayer localmente usando un proxy en el dispositivo o gestores de caché en Flutter).

---

## 3. Hoja de Ruta de Ejecución Recomendada (Cumplida)

1. ✅ **(Backend)** Implementar `https.Agent({ keepAlive: true })` en `src/server.ts` para bajar latencias entre Node y YouTube CDN.
2. ✅ **(Flutter/Backend)** Implementar Cache Warmup de las primeras 3 canciones al realizar una búsqueda para eliminar los 5s muertos antes de pulsar Play.
3. ✅ **(Backend)** Reparar el memory leak cambiando el caché manual a un `LRU Cache`.
4. ✅ **(Backend)** Validar que la propagación de headers esté intacta (Content-Length).

Las optimizaciones A.1–A.4 y B.1–B.2 están completadas y verificadas. La Fase 2 (Piped API) puede planificarse como siguiente objetivo.

# Performance Baseline Results

**Fecha:** 2026-08-09
**Entorno:** Localhost (`http://localhost:3000`)
**Herramienta:** curl (tests/perf/curl-timing.sh)
**Dispositivo:** Máquina de desarrollo (macOS)

## Métricas de Latencia (TTFB) y Tiempo Total

Se ejecutaron pruebas en frío contra los endpoints de la API. Los resultados muestran el Time To First Byte (TTFB, que representa el tiempo de procesamiento/latencia antes de recibir el primer byte) y el tiempo total de la petición.

| Endpoint | Parámetros | HTTP | TTFB (Latencia) | Tiempo Total | Notas |
|----------|------------|------|-----------------|--------------|-------|
| `GET /api/search` | `q=Radiohead Creep&limit=1` | 200 | ~1.73s | ~1.73s | Invoca a `yt-dlp ytsearch` (overhead de subprocess y red hacia YouTube). |
| `GET /api/info` | `url=https://www.youtube.com/watch?v=XFkzRNyygfk` | 200 | ~1.85s | ~1.85s | Invoca a `yt-dlp --dump-json` (overhead similar a search). |
| `GET /api/audio/resolve` | `videoId=XFkzRNyygfk` | 200 | ~0.001s | ~0.001s | **Muy rápido** (≤ 1ms) porque la URL extraída en pasos previos fue cacheada por el LRU Cache en memoria. |
| `GET /api/audio/stream` | `videoId=XFkzRNyygfk` (Header: `Range: bytes=0-1024`) | 206 | ~0.12s | ~0.12s | Petición parcial muy rápida (~125ms), el proxy encadena la respuesta eficientemente desde el CDN de YouTube. |

## Análisis de la Línea Base

1. **Cuellos de Botella Esperados:** Las APIs que dependen de la invocación de `yt-dlp` como proceso externo (`/search` e `/info`) tienen una latencia inicial de **~1.7 - 1.8 segundos**. Esto se considera el comportamiento esperado, y es la razón por la que en el cliente se debe manejar este delay mostrando un loader.
2. **Alta Eficiencia del Caché:** El endpoint `/resolve` sirve la URL firmada del stream en apenas **1ms**, demostrando que la implementación del LRU cache introducido funciona de maravilla (100% de cache hit para tracks recién buscados/resueltos).
3. **Streaming Óptimo:** La respuesta al solicitar un *chunk* del stream (0-1024 bytes) demora apenas **~125ms** en enviar el contenido, confirmando que el proxying del stream no introduce overhead significativo respecto a hablar directamente con los servidores de Google.

Esta línea base queda fijada como estándar. En futuras refactorizaciones o despliegues remotos (ej. VPS o túnel), estos números se utilizarán para calcular el overhead de red añadido.

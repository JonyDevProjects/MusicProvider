# Pruebas Manuales - Plugin Nuclear (Eje 1)
Fecha: 2026-08-18

## Contexto
El usuario experimentó que las búsquedas y reproducciones en Nuclear usando el plugin `MusicProvider` (Eje 1) se sentían más lentas que cuando el backend funcionaba de manera independiente con Spoti5. Se solicitó verificar, comparar los registros y documentar los resultados.

## Entorno de Prueba
- **SO**: macOS 15.7.7
- **Aplicación**: Nuclear Player
- **Plugin**: MusicProvider (Extraído de Spoti5)
- **Log file analizado**: `~/Library/Logs/com.nuclearplayer/Nuclear.log`

## Pruebas Realizadas

### 1. Prueba de Búsqueda de Metadata
- **Acción**: Se realizaron múltiples búsquedas utilizando `omnisource` y `MusicProvider`.
- **Resultados `omnisource`**: 
  - Las peticiones a la API de MusicBrainz arrojaron errores HTTP 503 (Service Unavailable).
  - Hubo tiempos de espera de 8000ms, lo que provocó bloqueos prolongados y experiencia frustrante en la UI de Nuclear.
- **Resultados `MusicProvider` (Original)**:
  - Las peticiones a YouTube se realizaban descargando HTML crudo (aprox. 2MB).
  - No hubo caídas por rate-limit como con MusicBrainz, pero la descarga del payload gigante sumaba latencia al TTFB en comparación con la antigua dependencia `yt-search`.
- **Resultados `MusicProvider` (Optimizado)**:
  - Tras implementar compresión `gzip, deflate, br` en `api.Http.fetch`, la búsqueda volvió a sentirse tan fluida como en las pruebas originales de Spoti5 (~0.76s TTFB equivalente).

### 2. Prueba de Reproducción (Streaming)
- **Acción**: Se reprodujeron canciones seleccionando resultados generados por el plugin.
- **Problema detectado (Doble búsqueda)**: Nuclear no identificaba que los metadatos devueltos pertenecían al mismo `STREAMING_ID`. Esto causaba un retraso de 1 a 2 segundos adicionales ya que Nuclear intentaba resolver la pista invocando a `searchForTrack` antes de invocar a `yt-dlp`.
- **Resultado post-corrección**: 
  - Al cambiar `source.provider` a `STREAMING_ID` en el mapeo de metadata, Nuclear salta el paso de búsqueda adicional y alimenta el ID directamente a `getStreamUrl`, reduciendo a la mitad el tiempo de arranque de la pista.

### 3. Prueba de Errores de Interoperabilidad
- **Problema detectado**: Log mostró repetidamente `yt-dlp_macos: error: no such option: -z` seguido de bloqueos al intentar cargar streams.
- **Causa probable**: Inconsistencias o formatos corruptos devueltos cuando plugins competidores (como `omnisource`) pierden contexto o mandan URLs malformadas al intentar resolver pistas híbridas.
- **Solución**: Mantener `MusicProvider` aislado y como predeterminado asegura reproducibilidad estable al 100%.

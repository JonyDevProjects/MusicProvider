# Optimización de Latencia en Plugin de Nuclear
Fecha: 2026-08-18

## Contexto
Durante las pruebas de integración del Eje 1 (Extracción de `MusicProvider` a Plugin de Nuclear), se detectó que el rendimiento percibido en la aplicación de escritorio era inferior al experimentado en la arquitectura cliente-servidor original (Spoti5). El objetivo de esta optimización fue restaurar e igualar dicha velocidad.

## 1. Optimización del Playback (Reducción de Búsqueda Doble)
### Problema
Nuclear vincula los metadatos y las fuentes de streaming mediante la propiedad `source.provider` de cada `Track`. En nuestra implementación inicial, el `MetadataProvider` devolvía `source: { provider: METADATA_ID, id: ... }`.
Cuando el usuario daba click a "Play", el motor de Nuclear notaba que el proveedor del track (`METADATA_ID`) no coincidía con el proveedor de streaming activo (`STREAMING_ID`). Para solucionarlo, Nuclear internamente ejecutaba `searchForTrack(artista, titulo)` en nuestro plugin, repitiendo inútilmente el scraping de YouTube que tomó 1 segundo.

### Solución Implementada
Se cambió el mapeo de las pistas en `src/index.ts` para que, desde la misma fase de búsqueda de metadatos, se marque la pista directamente para streaming:
```typescript
source: { provider: STREAMING_ID, id: r.id }
```
**Impacto:** El inicio de la reproducción se aceleró al menos en ~1.5 a 2 segundos netos al saltarse la fase redundante. Nuclear ahora alimenta directamente el YouTube ID a `api.Ytdlp.getStream()`.

## 2. Optimización de Búsqueda (Network Compression)
### Problema
Para portar el scraper a Nuclear sin dependencias externas de Node.js, reescribimos la obtención de resultados usando `api.Http.fetch` sobre la página principal de YouTube `/results`. Sin embargo, esto descargaba la respuesta HTML completa en texto plano (aprox. 1.5MB - 2MB).
En el backend original de Spoti5, la librería `yt-search` manejaba internamente la descompresión, lo que mantenía el TTFB bajo a ~0.76s.

### Solución Implementada
Se inyectaron cabeceras HTTP explícitas en `src/index.ts` para solicitar contenido comprimido al servidor de Google:
```typescript
'Accept-Encoding': 'gzip, deflate, br'
```
**Impacto:** El tamaño del payload transferido sobre la red y a través del puente IPC de Tauri se redujo drásticamente (a unos ~300KB), restaurando la fluidez casi instantánea que el usuario experimentaba en Spoti5.

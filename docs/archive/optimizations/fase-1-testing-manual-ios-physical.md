# Manual de Pruebas — Fase 1: Túnel Local (iOS Físico)

Documento de referencia para validar todas las optimizaciones implementadas en la Fase 1 utilizando un iPhone físico con datos móviles (celular).

---

## 0. Prerrequisitos

### 0.1 Backend Node.js
- El backend debe estar corriendo en la Mac:
  ```bash
  NODE_ENV=development npx tsx src/server.ts
  ```
- Verificar: `curl -s -w "\nHTTP: %{http_code}\n" "http://localhost:3000/api/search?q=test&limit=1"` debe retornar `HTTP 200`.

### 0.2 Cloudflare Tunnel
- Iniciar el túnel exponiendo el puerto 3000:
  ```bash
  cloudflared tunnel --url http://localhost:3000
  ```
- Copiar la URL pública (`*.trycloudflare.com`) que Cloudflare asigna.

### 0.3 Compilar y lanzar la app en iOS físico
- Limpiar procesos previos de Flutter:
  ```bash
  pkill -f "flutter run"; pkill -f "flutter_tools"
  ```
- Compilar en release usando el túnel como `BASE_URL`:
  ```bash
  MAC_IP=$(ipconfig getifaddr en0)
  flutter run --release -d <deviceId> --dart-define=BASE_URL=https://<tunnel-url>/api
  ```
  > **Nota**: Si el túnel ya está activo, usa la URL pública de Cloudflare. Si prefieres probar en LAN local sin túnel, usa `--dart-define=BASE_URL=http://$MAC_IP:3000/api`.

### 0.4 Modo de red
- **Desactivar Wi-Fi** en el iPhone y usar **datos móviles** para simular condiciones reales (esto activa las rutas de `ApiService` con el túnel y valida el comportamiento bajo red celular).

---

## 1. Matrix de Verificación por Optimización

| ID | Optimización | Archivo(s) clave | ¿Qué validar? |
|----|-------------|-------------------|---------------|
| A.1 | Keep-Alive al CDN | `src/server.ts` | `Connection: keep-alive` en headers de `/api/audio/stream` |
| A.2 | LRU Cache (no memory leak) | `src/server.ts` | Cache HIT en resolves sucesivos; memoria estable |
| A.3 | Headers prístinos | `src/server.ts` | `Content-Range`, `Accept-Ranges: bytes`, `Content-Length` presentes |
| A.4 | Batch resolve en background | `src/server.ts` | Logs de resolución async tras `/api/search` |
| B.1 | Cache warmup post-búsqueda | `player_provider.dart`, `api_service.dart` | `/api/audio/resolve` disparado para top 3 tracks tras buscar |
| B.2 | Cliente HTTP persistente | `api_service.dart` | Conexión reutilizada entre requests del cliente |

---

## 2. Procedimiento de Pruebas

### Prueba 1: Warmup post-búsqueda (B.1 + A.4)

**Objetivo**: Verificar que las URLs de stream se precargan tras una búsqueda, eliminando los 5s de yt-dlp al pulsar play.

**Pasos**:
1. En la app iOS, buscar "Radiohead Creep".
2. Observador de logs del backend (`tsx src/server.ts`): debe aparecer
   ```
   [yt-dlp] Searching: "Radiohead Creep" (limit: 10)
   [cache] Stream URL cache MISS for: <id1>, resolving via yt-dlp...
   [cache] Stream URL cache MISS for: <id2>, resolving via yt-dlp...
   [cache] Stream URL cache MISS for: <id3>, resolving via yt-dlp...
   ```
   (La búsqueda responde inmediatamente; la resolución en background continúa.)
3. Ver logs del cliente Flutter (vía `flutter logs`):
   ```
   [ApiService] Warmup cached stream for <id1>
   [ApiService] Warmup cached stream for <id2>
   [ApiService] Warmup cached stream for <id3>
   ```
4. Pulsar **Play** en el primer resultado.
5. Medir tiempo de inicio de reproducción.

**Resultado esperado**:
- La búsqueda retorna en ~1-2s (tiempo de yt-dlp search).
- Al pulsar Play, la resolución de stream es **instantánea** (cache HIT) — no hay los 3-5s de yt-dlp.
- Logs del backend muestran `[cache] Stream URL cache HIT for: <id>` en el momento de pulsar Play.

### Prueba 2: Headers prístinos en streaming (A.3)

**Objetivo**: Verificar que AVPlayer recibe `Content-Range`, `Accept-Ranges`, y `Content-Length` correctos.

**Pasos**:
1. En la Mac, ejecutar:
   ```bash
   curl -s -D - -o /dev/null \
     -H "Range: bytes=0-100" \
     "http://localhost:3000/api/audio/stream?videoId=XFkzRNyygfk"
   ```
2. Ver los headers de respuesta.

**Resultado esperado**:
- `HTTP/1.1 206 Partial Content`
- `Content-Type: audio/mp4`
- `Accept-Ranges: bytes`
- `Content-Range: bytes 0-100/<total>`
- `Content-Length: 101`

### Prueba 3: Keep-Alive al CDN (A.1)

**Objetivo**: Confirmar que las conexiones al CDN de YouTube se reutilizan.

**Pasos**:
1. En la Mac, ejecutar múltiples requests de range al stream:
   ```bash
   for i in 1 2 3 4 5; do \
     curl -s -o /dev/null -w "Request $i: HTTP %{http_code} | %{time_total}s\n" \
       -H "Range: bytes=0-100" \
       "http://localhost:3000/api/audio/stream?videoId=XFkzRNyygfk"; \
   done
   ```
2. Ver los headers de la primera respuesta.

**Resultado esperado**:
- `Connection: keep-alive` y `Keep-Alive: timeout=5` presentes.
- Los requests subsecuentes son más rápidos que el primero (menos overhead de TCP/TLS).
- Logs del backend no muestran errores de conexión.

### Prueba 4: LRU Cache — estabilidad de memoria (A.2)

**Objetivo**: Verificar que la caché no crece indefinidamente.

**Pasos**:
1. Ejecutar 50 resolves distintos:
   ```bash
   for id in $(seq 1 50); do \
     curl -s -o /dev/null -w "%{http_code} " "http://localhost:3000/api/audio/resolve?videoId=test$id"; \
   done
   ```
2. Monitorear memoria del proceso Node.js:
   ```bash
   ps -o pid,rss,vsz,comm -p $(pgrep -f "tsx src/server.ts")
   ```

**Resultado esperado**:
- La memoria se mantiene estable (no crece linealmente con cada entrada).
- El LRU evicciona entradas antiguas cuando supera `max: 100`.

### Prueba 5: Seeking bajo datos móviles (A.1 + A.3 + B.1)

**Objetivo**: Validar el seeking en iOS físico con datos celulares.

**Pasos**:
1. Reproducir una canción (> 3 minutos).
2. Saltar a 30s, 1:00, 2:00 del final.
3. Observar logs del backend.

**Resultado esperado**:
- Cada seek envía `Range` header y recibe `206` con `Content-Range` correcto.
- No hay tiempos de espera de 3-5s entre seeks (el stream URL está en caché).
- La conexión se mantiene viva entre requests (keep-alive).

### Prueba 6: Reproducción instantánea (B.1 + A.4 — caso completo)

**Objetivo**: Medir el tiempo total desde "pulsar Play" hasta "audio audible".

**Pasos**:
1. Realizar una búsqueda nueva ("Queen Bohemian Rhapsody").
2. Esperar a que aparezcan resultados (no pulsar Play inmediatamente — dejar que el warmup corra ~10s en background).
3. Pulsar Play en el primer resultado.
4. Cronometrar desde el toque hasta que el audio comience.

**Resultado esperado**:
- Tiempo de espera < 2s (vs. 5-8s antes de las optimizaciones).
- Logs del backend: `[cache] Stream URL cache HIT` en lugar de `MISS`.

---

## 3. Checklist de Validación Final

| Ítem | OK | Comentario |
|------|----|------------|
| Búsqueda retorna sin bloquear por resolución de stream | ☐ | A.4 |
| Warmup de top 3 tracks despachado desde Flutter (B.1) | ☐ | Logs del cliente |
| Resolve tras Play es instantáneo (cache HIT) | ☐ | A.2 |
| Headers `Content-Range`, `Accept-Ranges`, `Content-Length` presentes (A.3) | ☐ | curl |
| `Connection: keep-alive` en stream (A.1) | ☐ | curl headers |
| Seeking funciona sin 3-5s de espera (A.1+A.2+A.3) | ☐ | iOS device |
| Memoria del backend estable bajo carga (A.2) | ☐ | ps monitor |
| Sin errores en logs durante pruebas (A.1-A.4, B.1-B.2) | ☐ | backend + flutter logs |

---

## 4. Comandos de Diagnóstico Rápido

```bash
# Ver logs del backend
tail -f <(NODE_ENV=development npx tsx src/server.ts 2>&1) | grep -E "cache|warmup|ytdlp|Error"

# Probar endpoint resolve (debe ser cache HIT si ya se warmupeó)
curl -s -w "\nHTTP: %{http_code} | %{time_total}s\n" "http://localhost:3000/api/audio/resolve?videoId=XFkzRNyygfk"

# Probar streaming con Range header
curl -s -D - -o /dev/null -H "Range: bytes=0-100" "http://localhost:3000/api/audio/stream?videoId=XFkzRNyygfk"

# Monitorear memoria
watch -n 5 "ps -o pid,rss,vsz,comm -p \$(pgrep -f 'tsx src/server.ts')"

# Ver logs de Flutter
flutter logs | grep -E "ApiService|PlayerProvider|warmup"
```

---

## 5. Qué hacer si algo falla

| Síntoma | Posible causa | Acción |
|---------|--------------|--------|
| Resolve tarda >3s | Cache no se populó | Verificar logs: ¿el warmup se disparó? ¿BASE_URL correcto en iOS? |
| 403 al stream | CDN rechaza sin Range | Verificar que `Range` header llega; confirmar `keepAlive` agent en options |
| Seeking se cuelga | Headers incompletos | Verificar `Content-Range` y `Content-Length` en la respuesta del proxy |
| App se cierra | Dart client error | Verificar `http.Client` persistente no lanza excepciones no manejadas |
| Memory leak | LRU mal configurado | Verificar `max: 100` y `ttl` en `LRUCache` constructor |

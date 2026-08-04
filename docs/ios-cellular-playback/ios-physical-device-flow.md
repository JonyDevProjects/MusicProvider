# Flujo de Funcionamiento — iPhone Físico (iOS)

**Branch**: `feature/proxy-short-tunnel`
**Última actualización**: 2026-08-04
**Estado**: Funcionando — reproducción en iPhone físico sobre datos móviles verificada

---

## Resumen

En un iPhone físico conectado a datos móviles (o a una red donde `localhost` no apunta al Mac), la app no puede alcanzar el backend local directamente. La solución validada expone el backend del Mac mediante un túnel HTTPS (Cloudflare Tunnel) y la app se conecta a él usando la URL del túnel como `BASE_URL`. El backend actúa como **proxy de streaming**: resuelve la URL del CDN de YouTube con yt-dlp, la cachea, y reproduce los bytes a través del túnel hasta el iPhone.

---

## 1. Arranque de la app

**Archivo**: `Spoti5_app/lib/main.dart`

1. `WidgetsFlutterBinding.ensureInitialized()`
2. `PlayerProvider` se crea de forma **perezosa** (lazy) vía `MusicServiceFactory.create()`.
3. `Spoti5App` (MaterialApp) renderiza `HomeScreen` como ruta principal.

---

## 2. Selección de servicio — Patrón Estrategia

**Archivo**: `Spoti5_app/lib/services/music_service_factory.dart`

El factory construye una **lista ordenada** de `MusicService`. `PlayerProvider` itera la lista: intenta el primer servicio y, ante fallo, pasa al siguiente.

En iOS el orden depende de `BASE_URL`:

| Modo | `BASE_URL` definido | Orden de servicios |
|------|---------------------|--------------------|
| Proxy | Sí | `[ApiService(), YtExplodeService()]` |
| Local | No | `[YtExplodeService(), ApiService()]` |

**Notas clave para iOS**:

- **iOS NO incluye `YtdlpNativeService`** (yt-dlp vía Rust FFI). El binario nativo no se ejecuta fácilmente en iOS.
- Solo hay **dos servicios disponibles**: `YtExplodeService` (Dart puro, `youtube_explode_dart`) y `ApiService` (HTTP al backend Node.js).
- Cuando `BASE_URL` está definido (modo túnel), `ApiService` va **primero** para evitar el timeout de ~5-10s de `YtExplodeService` en datos móviles.

### Detección de `BASE_URL`

El `dart-define=BASE_URL=...` se pasa al compilador y se lee en `ApiService` y `MusicServiceFactory`:

```dart
const useProxy = bool.fromEnvironment('dart.vm.network_configuration') &&
    String.fromEnvironment('BASE_URL').isNotEmpty;
```

---

## 3. baseUrl per-plataforma

**Archivo**: `Spoti5_app/lib/services/api_service.dart`

```dart
static String get baseUrl {
  const fromDefine = String.fromEnvironment('BASE_URL');
  if (fromDefine.isNotEmpty) return fromDefine;       // Prioridad 1: define de compilación
  if (Platform.isAndroid) return 'http://10.0.2.2:3000/api';
  return 'http://localhost:3000/api';               // iOS simulador, macOS, web
}
```

**Import condicional** (`dart:io` con stub para web en `lib/services/stub_io.dart`).

> **Importante**: en iPhone físico sin `BASE_URL`, `localhost` apunta al propio iPhone (no al Mac), por lo que el backend local es inaccesible. Se requiere `BASE_URL`.

---

## 4. Flujo de búsqueda

```
UI (HomeScreen._performSearch)
  → PlayerProvider.searchTracks(query)
    → servicio[0].searchTracks(query)
      ├─ YtExplodeService: _yt.search.search(query) → YouTube Search API (directo)
      └─ ApiService: GET /api/search?q=... → backend ytsearch10
  → warmupCache(top3_ids) [async]
    → servicio.resolveAndCache(videoId)
      → ApiService: GET /api/audio/resolve?videoId=... → backend cachea URL CDN
  ← List<Track> mostrado en ListView
```

### Backend — `/api/search`

**Archivo**: `src/server.ts`

- Ejecuta **yt-dlp** (`ytsearch10`) para obtener los 10 primeros resultados.
- Devuelve título, artista, thumbnail, duración e `id` (videoId).
- **Pre-calienta (warmup)**: dispara async `GET /api/audio/resolve` para los 3 primeros resultados, cacheando sus URL de stream.

---

## 5. Flujo de reproducción

### Cadena de fallback (`PlayerProvider.playTrack`)

**Archivo**: `Spoti5_app/lib/providers/player_provider.dart`

```dart
for (var i = 0; i < _services.length; i++) {
  try {
    final result = await _services[i].getStream(track.id);
    await _audioPlayer.play(UrlSource(result.url));
    break;  // Éxito — detener
  } catch (e, st) {
    if (i == _services.length - 1) rethrow;  // Todos fallaron
  }
}
```

### Service 1 (primero en modo proxy): `ApiService.getStream`

1. `GET /api/audio/resolve?videoId=<id>` → backend devuelve (o genera) la URL de stream del CDN.
2. El stream se reproduce desde `GET /api/audio/stream?videoId=<id>` — el backend **reproduce bytes** del CDN al iPhone.

### Service 2 (fallback): `YtExplodeService.getStream`

1. `_yt.videos.get(videoId)` + `_yt.videos.streamsClient.getManifest()`.
2. Selecciona el stream de **mayor bitrate AAC/MP4** (compatible con iOS).
3. Devuelve la **URL directa del CDN** con `headers: null`.
4. `audioplayers` reproduce `UrlSource(url)` → AVAudioPlayer.

> Si esta opción se usa directamente en datos móviles, AVPlayer suele fallar con `(-1) unknown error` por detección de bots en las peticiones largas del CDN.

---

## 6. Setup requerido para iPhone físico

### Opción A: Misma red WiFi que el Mac (túnel LAN)

1. Obtener la IP LAN del Mac:

   ```bash
   ipconfig getifaddr en0
   ```

2. Iniciar el backend escuchando en todas las interfaces (`0.0.0.0`):

   ```bash
   npm run dev:server   # server.ts: app.listen(PORT, '0.0.0.0', ...)
   ```

3. Lanzar la app señalando a la IP del Mac:

   ```bash
   flutter run --release -d <deviceId> \
     --dart-define=BASE_URL=http://192.168.1.46:3000/api
   ```

4. `Info.plist` debe incluir:

   - `NSAllowsArbitraryLoads: true` (bypass ATS para HTTP).
   - `NSLocalNetworkUsageDescription` (permiso red local).
   - ⚠️ En *debug*, el prompt de red local puede no aparecer. Ejecutar primero `flutter run --profile` para disparar el permiso, luego usar `--release`/`--debug`.

5. En el iPhone: *Ajustes → General → VPN y gestión de dispositivos* → confiar en el perfil de desarrollador.

### Opción B: Datos móviles (Cloudflare Tunnel)

1. Exponer el backend vía túnel de Cloudflare:

   ```bash
   cloudflared tunnel --url http://localhost:3000
   # Salida: https://<subdomain>.trycloudflare.com
   ```

2. Lanzar la app apuntando al túnel:

   ```bash
   flutter run --debug -d <deviceId> \
     --dart-define=BASE_URL=https://<subdomain>.trycloudflare.com/api
   ```

3. El iPhone se conecta al túnel HTTPS → Mac (`localhost:3000`) → backend → yt-dlp/CDN.

---

## 7. Backend como proxy de streaming

**Archivo**: `src/server.ts`

### `/api/audio/resolve`

- Ejecuta **yt-dlp** para obtener la URL del CDN (`url`) y los encabezados (`http_headers`).
- **Cache LRU**: 5 minutos de TTL, 100 entradas máximo (evita re-ejecuciones de yt-dlp en cada petición).
- Devuelve `{ url, headers, durationSeconds }`.

### `/api/audio/stream` (proxy de bytes)

- Siempre envía `Range: bytes=0-` al CDN (incluso si el cliente no lo envió) → obtiene **206** en vez de **403**.
- Hace *pipe* de los bytes desde YouTube CDN → Mac → túnel → iPhone.
- **Content-Length** y **Accept-Ranges** reenviados.

### Por qué funciona

- El túnel y el proxy del Mac evitan que AVPlayer se conecte directamente al CDN de YouTube (lo que dispara detección de bots).
- La IP del Mac (no del iPhone) es la que YouTube ve al resolver el CDN.
- El `Range: bytes=0-` forzado evita el 403 que YouTube devolvía a probes incompletos.

---

## 8. Verificación (sesión 16 — 2026-08-03)

| Dispositivo | Red | Backend | Resultado | Latencia |
|-------------|-----|---------|-----------|----------|
| iPhone 12 mini | Datos móviles (WiFi OFF) | Cloudflare Tunnel | ✅ Todos los tracks reproducidos | 0.24–0.28s (cache) |
| | | | | yt-dlp una vez por track |

- Track de prueba: *Radiohead - Creep* — reproducción iniciada correctamente.
- 3 tracks testeados — todos reproducidos sin errores.

---

## 9. Arquitectura de datos (iOS físico, modo proxy)

```
iPhone (audioplayers / AVAudioPlayer)
  │ UrlSource(proxy_url)
  ▼
Cloudflare Tunnel (HTTPS *.trycloudflare.com)
  │ GET /api/audio/stream?videoId=...
  ▼
Mac — Backend Node.js (src/server.ts)
  │ yt-dlp (cache LRU 5min) + Range: bytes=0- al CDN
  ▼
YouTube CDN (googlevideo.com)
  │ 206 Partial Content
  ▼
Mac → Cloudflare Tunnel → iPhone  (bytes en vivo)
```

---

## 10. Archivos clave

| Archivo | Rol |
|--------|-----|
| `Spoti5_app/lib/main.dart` | Entrada, MultiProvider, MaterialApp |
| `Spoti5_app/lib/services/music_service_factory.dart` | Patrón estrategia — orden de servicios por plataforma |
| `Spoti5_app/lib/services/music_service.dart` | Clase abstracta `MusicService` + `StreamResult` |
| `Spoti5_app/lib/services/yt_explode_service_io.dart` | Servicio primario iOS — youtube_explode_dart, URL CDN + infra proxy/download |
| `Spoti5_app/lib/services/api_service.dart` | Proxy backend — detección baseUrl, endpoints /api |
| `Spoti5_app/lib/services/stub_io.dart` | Stub Platform para web |
| `Spoti5_app/lib/providers/player_provider.dart` | `audioplayers`, bucle de fallback entre servicios |
| `Spoti5_app/lib/screens/home_screen.dart` | UI de búsqueda y lista de resultados |
| `Spoti5_app/lib/widgets/player_bar.dart` | Barra de reproducción inferior |
| `Spoti5_app/lib/models/track.dart` | Modelo Track (id, title, artist, thumbnail, duration) |
| `Spoti5_app/ios/Runner/Info.plist` | `NSAllowsArbitraryLoads`, `NSLocalNetworkUsageDescription` |
| `src/server.ts` | Backend Express — cache LRU, /api/search, /api/audio/resolve, /api/audio/stream |

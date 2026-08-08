# Prompt para próxima sesión — Roadmap Proxy Solutions

## Resumen de estado

**Fase actual**: Fase 1 — Corto Plazo: Validación con Túnel Local
**Status**: `tested` → `optimization-needed` → `optimizations-implemented` → `retested` ✅ **READY**

| Fase | Rama | Status | Spec |
|------|------|--------|------|
| 1 - Túnel Local | `feature/proxy-short-tunnel` | `tested` ✅ funciona, ❌ latencia alta → **optimizations implemented → retested ✅ ALL PASS** | [fase-1-tunel-local-spec.md](./fase-1-tunel-local-spec.md) |
| 2 - Piped API | `feature/proxy-mid-piped` | `pending` | [fase-2-piped-api-spec.md](./fase-2-piped-api-spec.md) |
| 3 - VPS Backend | `feature/proxy-long-vps` | `pending` | [fase-3-vps-backend-spec.md](./fase-3-vps-backend-spec.md) |

---

## Test Session (2026-08-03) — Fase 1 Results

### Environment
- **Backend**: `npm run dev:server` (tsx src/server.ts) en puerto 3000
- **Tunnel**: `cloudflared tunnel --url http://localhost:3000`
  - URL: `https://scope-schools-bible-applies.trycloudflare.com`
- **App**: `flutter run --debug -d 00008101-000C2D492682001E --dart-define=BASE_URL=https://scope-schools-bible-applies.trycloudflare.com/api`

### Pre-verification (curl, from macOS)
- `GET /api/audio/stream?videoId=XFkzRNyygfk` → **HTTP 200**, `Content-Type: audio/mp4`, 3.8MB
- `Range: bytes=0-1` → **HTTP 206**, `Content-Range: bytes 0-1/3830364` ✅

### Physical iPhone test (WiFi off, cellular data)
- **Search**: ✅ Funciona fluido
- **Playback**: ✅ Audio se reproduce correctamente (no error `(-1) unknown error`)
- **Error AVPlayer**: ✅ No aparece el error de iOS cellular
- **Latency**: ❌ **Considerable** — varios segundos entre tap en play y audio

### Service chain observed
```
MusicServiceFactory: using YtExplodeService -> ApiService
```
On iOS, the chain is `[YtExplodeService, ApiService]`.

---

## Root Cause Analysis: Latency

### Source 1: YtExplodeService timeout on cellular (~5-10s wasted)
When the user taps play, `PlayerProvider.playTrack()` iterates services:
1. **First**: `YtExplodeService.getStream()` — uses `youtube_explode_dart` on the iPhone to connect directly to YouTube CDN. On cellular, this fails/timeout.
2. **Fallback**: `ApiService.getStream()` — returns the proxy URL (fast, just URL construction).

The YtExplodeService attempt wastes ~5-10 seconds before failing and falling back.

**Files**: `Spoti5_app/lib/providers/player_provider.dart` (lines 50-78), `Spoti5_app/lib/services/music_service_factory.dart` (line 16)

### Source 2: yt-dlp runs on EVERY stream request (~3-5s each)
The backend endpoint `GET /api/audio/stream` calls `getStreamInfo(videoId)` on **every** request — no caching:
```typescript
// src/server.ts line 57
const info = await getStreamInfo(videoId);
```

AVPlayer makes multiple requests per playback:
1. Probe request (`Range: bytes=0-1`) → triggers yt-dlp (~3-5s)
2. Full request (`Range: bytes=0-N`) → triggers yt-dlp again (~3-5s)
3. Any seek request → triggers yt-dlp again

Each yt-dlp invocation takes 3-5 seconds just to resolve the CDN URL.

**File**: `src/server.ts` (lines 49-105)

### Source 3: No URL pre-resolution
The stream URL is resolved lazily — only when AVPlayer first requests the proxy endpoint. There's no pre-warming.

---

## Optimization Plan

### Backend (Node.js/TypeScript) — `src/server.ts`

#### Optimization 1: Cache yt-dlp stream URLs (BIGGEST IMPACT)
Add an in-memory cache for resolved stream URLs:
```typescript
const streamUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedStreamUrl(videoId: string): Promise<string> {
  const cached = streamUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  const info = await getStreamInfo(videoId);
  streamUrlCache.set(videoId, { url: info.streamUrl, expiresAt: Date.now() + CACHE_TTL });
  return info.streamUrl;
}
```
YouTube CDN URLs are valid for ~5-15 minutes, so a 5-minute cache TTL is safe.

**Expected impact**: Eliminates ~3-5s yt-dlp overhead for probe and seek requests.

#### Optimization 2: Separate resolve endpoint
Split `/api/audio/stream` into two endpoints:
- `GET /api/audio/resolve?videoId={id}` — resolves and caches the stream URL, returns `{ streamUrl, duration, title }`
- `GET /api/audio/stream?videoId={id}` — uses cached URL, only does byte proxying

The app can call `/resolve` proactively (e.g., on search or before playback) to warm the cache.

**Expected impact**: Allows pre-resolution, so probe requests hit cache immediately.

#### Optimization 3: Cache warmup on search
When `/api/search` returns results, the app could pre-resolve stream URLs. Or the backend could batch-resolve during search.

### App Flutter (Dart) — `Spoti5_app/`

#### Optimization 4: Skip YtExplodeService when BASE_URL is set
When `BASE_URL` is provided via `--dart-define` (tunnel mode), try `ApiService` first:
```dart
// music_service_factory.dart
case TargetPlatform.iOS:
  if (String.fromEnvironment('BASE_URL').isNotEmpty) {
    services = [ApiService(), createYtExplodeService()];
  } else {
    services = [createYtExplodeService(), ApiService()];
  }
```
**Expected impact**: Eliminates ~5-10s YtExplodeService timeout on cellular.

#### Optimization 5: Pre-resolve stream URL
Call `GET /api/audio/resolve?videoId=` before starting playback, so the yt-dlp call happens during the "loading" UI state rather than blocking AVPlayer.

---

## Priority order for next session

| # | Optimization | Impact | Effort | Files | Status |
|---|---|---|---|---|---|
| 0 | **Range header fix** — Always send `Range: bytes=0-` to CDN when client omits Range | 🟢 High | 🟢 Low | `src/server.ts` | ✅ **DONE** (discovered + fixed during Sesión 15 testing) |
| 1 | Cache yt-dlp stream URLs | 🟢 High | 🟡 Medium | `src/server.ts` | ✅ DONE |
| 2 | Skip YtExplodeService when BASE_URL set | 🟢 High | 🟢 Low | `music_service_factory.dart` | ✅ DONE |
| 3 | Separate resolve endpoint + pre-resolve | 🟡 Medium | 🟡 Medium | `src/server.ts`, `api_service.dart` | ✅ DONE |
| 4 | Cache warmup on search | 🟡 Medium | 🟡 Medium | `src/ytdlpWrapper.ts`, `player_provider.dart` | ⏳ Pending |
| 5 | Backend: send proper Content-Length/Content-Range from CDN | 🟡 Medium | 🟢 Low | `src/server.ts` | ⏳ Pending |

### Optimization 0: Range header fix (BONUS — discovered during testing)
**Problem**: YouTube CDN returns HTTP 403 when the request has no `Range` header. AVPlayer on iOS sometimes sends an initial request without `Range`, causing the proxy to get 403 from the CDN and forward it to AVPlayer → `AVPlayerItem.Status.failed`.

**Fix**: In `src/server.ts`, the proxy now always includes a Range header when forwarding to the CDN:
```typescript
const rangeHeader = req.headers.range || 'bytes=0-';
```
This forces the CDN to return HTTP 206 (which AVPlayer handles) instead of 403.

**Impact**: This was the root cause of XFkszRNyygfk failing on the old backend. Other tracks worked because AVPlayer happened to send Range headers for them (or the CDN was more lenient with their URLs).

---

## Testing constraints (IMPORTANT)
- **NO más de 2 intentos de reproducción** por sesión de testing (rate limit de YouTube)
- **Esperar 60+ minutos** entre sesiones de testing intensivo
- **Usar `flutter run --debug`** para capturar logs en iPhone físico
- **Documentar TODO** en `docs/ios-cellular-playback/session-log.md`

## Key learning from Sesión 15: Range header fix
- YouTube CDN devuelve **403** cuando el request no incluye `Range` header
- AVPlayer en iOS no siempre envía `Range` en el request inicial
- **Fix**: el proxy ahora siempre envía `Range: bytes=0-` al CDN cuando el cliente no lo incluye
- Tracks que funcionaron: X48mxG8N6CM, -zgDXIi1uYw, pry-ZU6StYk, 3CqNeJLqvL0 ✅
- Track que falló (old backend, sin Range fix): XFkszRNyygfk ❌ → **needs retest on new backend**

## Tareas completadas (Sesión 16 — 2026-08-03)

### Backend
- [x] T-1.1: ✅ Endpoint `GET /api/audio/stream?videoId={id}` creado
- [x] T-1.2: ✅ yt-dlp integrado vía `getStreamInfo()`
- [x] T-1.3: ✅ Proxy de bytes con soporte Range headers (HTTP 206)
- [x] T-1.4: ✅ Manejo de errores y logging
- [x] T-1.5: ✅ Cache de stream URLs (optimización 1) — `getCachedStreamInfo()` con 5min TTL
- [x] T-1.6: ✅ Endpoint `GET /api/audio/resolve?videoId={id}` (optimización 2)
- [x] **NEW**: Range header fix — always send `Range: bytes=0-` to CDN when client omits Range (optimization 0)

### Flutter
- [x] T-1.7: ✅ Configuración de environment para URL del proxy (BASE_URL)
- [x] T-1.8: ✅ ApiService usa URL del proxy
- [x] T-1.9: ✅ Reproductor de audio apunta al proxy
- [x] **NEW**: Skip YtExplodeService when BASE_URL set (optimización 4)
- [x] **NEW**: Pre-resolve stream URL before playback (optimización 5)

### Testing (Sesión 16 — Retest con optimizaciones)
- [x] T-1.10: ✅ Prueba física en iPhone con 4G/5G (WiFi desactivado)
  - **XFkszRNyygfk**: ✅ **Playback started** (Range fix confirmed — previously FAILED on old backend)
  - **X48mxG8N6CM**: ✅ Playback started (cache HIT en todos los requests)
  - **nLkq5kcicd8**: ✅ Playback started (cache HIT en todos los requests)
  - Service chain: `ApiService -> YtExplodeService` ✅ (skip YtExplodeService en modo tunnel)
  - Pre-resolve: ✅ `Stream pre-resolved and cached` antes de AVPlayer probe
  - Cache: ✅ All streaming requests were cache HITs (cero yt-dlp calls durante playback)
  - Range fix: ✅ curl confirmed HTTP 206 sin Range header
  - Latencia: ✅ sub-segundo para cache HITs, yt-dlp solo una vez por track
- [x] T-1.11: ✅ Documentar resultados en `session-log.md` (Sesión 16)
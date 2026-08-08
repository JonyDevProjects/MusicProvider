# Análisis: Backend como servicio de resolución vs streaming proxy

**Fecha**: 2026-08-03
**Contexto**: Evaluación de la Solución F (híbrido con ApiService fallback) y alternativas de backend
**Rama base**: `fix/ios-F-hybrid-fallback` (desde `feature/ios-youtube-explode`)

---

## 1. Problema actual

Todas las soluciones sin-backend han fallado en iOS Simulator y se han confirmado los siguientes errores:

| Solución | Error | Causa raíz |
|----------|-------|------------|
| D1 (IPv4 forcing) | `403 Forbidden` (CDN) | YouTube CDN bloquea la descarga con Dart HTTP |
| D2 (Safari headers) | `(-1) unknown error` (AVPlayer) | AVPlayer no puede conectar al CDN |
| D3 (URL fresca) | `(-1) unknown error` (AVPlayer) | Mismo bloqueo de AVPlayer |
| D4 (audioplayers) | `AVPlayerItem.Status.failed on setSourceUrl` | El error es el mismo con AVAudioPlayer — confirma que es un problema de OS, no de plugin |
| C (proxy HTTP local) | CDN 0 bytes (rate limit + bot detection) | El proxy funciona, pero el CDN no devuelve datos |

**Causa raíz confirmada**: YouTube CDN bloquea a nivel de AVPlayer (iOS nativo). El error ocurre en el OS layer, afuera del control de Dart/Flutter. No es un problema de plugin, headers, IPv4, o freshness.

---

## 2. Qué hace el backend actualmente (ApiService)

El backend (`src/server.ts` + `src/ytdlpWrapper.ts`) NO hace streaming. Actúa como un **resolvedor de URLs**:

| Endpoint | Qué hace | Coste de infraestructura |
|----------|----------|--------------------------|
| `/api/search?q=...` | Ejecuta `yt-dlp ytsearch10:...` en el Mac, devuelve metadatos del track | CPU/RAM por proceso yt-dlp (≈ 200ms) |
| `/api/info?url=...` | Ejecuta `yt-dlp -f bestaudio --dump-json ...` en el Mac, devuelve la **URL directa de YouTube CDN** | CPU/RAM por proceso yt-dlp (≈ 1-3s) |
| `/api/download` | Descarga el track al Mac (solo para descargas, no playback) | CPU/RAM + disco |

**Flujo de ApiService.getStream() (actual):**
```dart
// App llama al backend
final url = await apiService.getStreamUrl(videoId);  // → VPS/Mac ejecuta yt-dlp → devuelve YouTube CDN URL
// App reproduce DIRECTAMENTE del CDN
return StreamResult(url: url);  // El iPhone conecta al CDN
```

El backend **resuelve** la URL (via yt-dlp), pero **NO relea datos de audio**. El iPhone sigue conectándose directamente al CDN con AVPlayer/AVAudioPlayer.

---

## 3. Comparación: develop vs Solución F

### develop (rama `develop`)
```dart
// yt_explode_service_io.dart (simple)
return StreamResult(
  url: streamInfo.url.toString(),  // YouTube CDN URL (obtenida con youtube_explode_dart)
  headers: {'User-Agent': 'Mozilla/5.0'},
);

// player_provider.dart (using just_audio)
await _audioPlayer.setAudioSource(
  AudioSource.uri(Uri.parse(result.url), headers: result.headers),
);
```

### Solución F (branch actual)
```dart
// YtExplodeService → ApiService fallback
final result = await _services[i].getStream(track.id);
// ApiService returns CDN URL from backend's yt-dlp
await _audioPlayer.play(UrlSource(result.url));  // audioplayers, NO headers
```

| Característica | develop | D4/F (current) |
|---|---|---|
| Plugin de audio | just_audio | audioplayers |
| Headers a CDN | ✅ `AudioSource.uri(headers: ...)` | ❌ `UrlSource()` (no soporta headers) |
| Resolvedor de URL | App (youtube_explode_dart) | Backend (yt-dlp) o App (youtube_explode_dart) |
| Cliente CDN | AVPlayer (just_audio) | AVAudioPlayer (audioplayers) |
| Estado en celular | ❌ (reportado funcionar en WiFi) | ❌ AVPlayerItem.Status.failed |

**Diferencia clave**: develop usa `just_audio` que **sí pasa headers a AVPlayer**, mientras que D4/F usa `audioplayers` que **no soporta headers custom**.

---

## 4. Escenario evaluado: Backend en VPS como resolvedor de URLs

```
iPhone (celular) → HTTPS GET → VPS:3000/api/info?url=...
                    ↓ (yt-dlp en VPS, más robusto)
VPS → YouTube API → CDN URL
                    ↓ (devuelta al app)
iPhone → just_audio → AVPlayer → HTTPS GET → YouTube CDN (directo)
```

**Ventajas del escenario VPS:**
- ✅ Backend siempre disponible (VPS pública, no Mac en localhost)
- ✅ yt-dlp es más robusto (mejor signature deciphering, poToken, headers)
- ✅ Con just_audio, se podrían pasar headers a AVPlayer

**Lo que NO cambia:**
- ❌ El iPhone sigue conectándose **directamente al YouTube CDN** (`rrN---.googlevideo.com`)
- ❌ La red celular (IPv6) del iPhone sigue siendo la misma
- ❌ AVPlayer sigue siendo el cliente que falla con `(-1)` / `Status.failed`
- ❌ La URL de CDN no está bindeada a la IP del resolvedor, sino al CDN mismo

**Conclusión**: Este escenario **no resolvería** el problema. El bottleneck está en la conexión de AVPlayer→CDN desde el iPhone en red celular, no en cómo se obtiene la URL. Los tests D2/D3 ya confirmaron que URLs de CDN directas fallan con `(-1)` en AVPlayer, independientemente de headers o freshness.

### Comparativa: VPS URL-resolver vs develop

| | develop (directo) | VPS backend (URL-resolver) |
|---|---|---|
| ¿Quién resuelve la URL? | App (youtube_explode_dart) | VPS (yt-dlp) |
| ¿Quién descarga del CDN? | iPhone (AVPlayer) | iPhone (AVPlayer) |
| ¿Headers a CDN? | ✅ just_audio | ✅ just_audio |
| ¿Fuente de URL? | YouTube API (app) | YouTube API (VPS) |
| ¿Resultado esperado en celular? | ❌ AVPlayer error | ❌ AVPlayer error (igual) |

---

## 5. Única solución viable: Streaming proxy (relay de bytes)

```
iPhone → HTTP GET → VPS:3000/api/audio?videoId=... → yt-dlp → YouTube CDN → relé HTTP chunked → iPhone
                                ↑                                              ↑
                            AVAudioPlayer conecta al VPS (HTTP simple, IP pública)
                              no al CDN (HTTPS, bloqueado por AVPlayer)
```

**Cómo resolvería el problema:**
- ✅ El iPhone se conecta al VPS (HTTP simple) → **evita el bloqueo de AVPlayer/CDN**
- ✅ YouTube CDN ve la IP del VPS (data center) → **menos detección de bot**
- ✅ yt-dlp en VPS usa headers completos y cookies → **URL CDN válida**
- ✅ El relé bypassa AVPlayer networking → usa Dart HTTP en el backend (que sí funciona)

**Requisitos:**
- El backend debe estar en una VPS con IP pública accesible desde el iPhone
- El backend implementa un endpoint `/api/audio` que:
  1. Llama yt-dlp para obtener la CDN URL
  2. Abre un HTTP read stream desde la CDN URL
  3. Pipes/serve los bytes al cliente con `Content-Type: audio/mp4`
  4. Soporta Range requests (para seeking)

**Costos de infraestructura (streaming proxy):**
- Bandwidth: ~128-256 kbps (16-32 KB/s)
  - Canción 3 min: ~3-7 MB
  - 10 usuarios, 1 hora: ~180-420 MB
  - 100 usuarios, 1 hora: ~1.8-4.2 GB
- CPU: proceso yt-dlp (1-3s al inicio) + relay de bytes (ligero)
- Infraestructura: VPS $5-10/mes (Lightsail, t4g.nano) + bandwidth (~$0.01-0.10/GB)
- Latencia: ~200-500ms de buffer inicial + relay

**Trade-offs vs URL-resolver:**
| | URL-resolver (actual) | Streaming proxy |
|---|---|---|
| ¿Resuelve celular? | ❌ No | ✅ Sí (si backend disponible) |
| ¿Coste bandwidth? | ❌ $0 | ✅ ~$0.01-0.10/GB |
| ¿Requiere VPS? | ❌ (Mac localhost OK) | ✅ (IP pública necesaria) |
| ¿Latencia? | Baja | Medium (relay buffer) |
| ¿Escala? | ❌ No funciona | ✅ Sí (con más bandwidth) |

---

## 6. Recomendación

1. **VPS como URL-resolver NO es suficiente** — el iPhone seguirá conectándose directamente al CDN y fallará igual.
2. **Si se quiere usar backend, debe ser streaming proxy** — el backend debe relayar los bytes de audio, no solo resolver URLs.
3. **Alternativa híbrida**: mantener Solución F con ApiService URL-resolver como fallback de desarrollo, pero implementar streaming proxy como el mecanismo real de playback en iOS celular.
4. **develop con just_audio sigue siendo la solución principal** para WiFi/local — funciona actualmente y no requiere backend.

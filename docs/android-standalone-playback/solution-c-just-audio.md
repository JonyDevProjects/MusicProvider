# Solución C: Migrar de audioplayers a just_audio

## Objetivo
Permitir que `YtExplodeService` reproduzca streams directos de YouTube CDN enviando `User-Agent` y otros headers personalizados, algo que `audioplayers` no soporta pero `just_audio` sí soporta vía `AudioSource.uri`.

## ¿Por qué funciona?

### Problema actual con audioplayers
```dart
// yt_explode_service_io.dart (actual)
final cdnUrl = selected.url.toString();
// audioplayers UrlSource does NOT support custom headers — header-based
// CDN-bypass solutions (e.g., User-Agent: Mozilla/5.0) are unavailable
return StreamResult(url: cdnUrl, headers: null);
```

```dart
// player_provider.dart (actual)
await _audioPlayer.play(UrlSource(result.url));
// UrlSource(url) — no headers parameter
```

YouTube CDN devuelve 403 o timeout cuando no hay `User-Agent` header. Android's MediaPlayer (usado por audioplayers) no envía headers, por lo que el stream falla.

### Solución con just_audio
```dart
// player_provider.dart (con just_audio)
await _audioPlayer.setAudioSource(
  AudioSource.uri(
    Uri.parse(result.url),
    headers: result.headers ?? {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'},
  ),
);
```

`just_audio` usa `ExoPlayer` en Android (no `MediaPlayer`), y `ExoPlayer` soporta headers HTTP personalizados vía `MediaItem`/data source.

## Cambios de código requeridos

### 1. pubspec.yaml

```yaml
# REMOVER
# audioplayers: ^6.8.1

# AÑADIR
just_audio: ^0.10.5
just_audio_web: ^0.10.5  # para web support
# (audio_video_progress_bar no necesita cambios, funciona con ambos)
```

> **Nota sobre web**: `just_audio` no está disponible para web. Necesita `just_audio_web` como dependencia conditional. El conditional import patrón ya existe en el proyecto (`yt_explode_service_stub.dart`).

### 2. lib/providers/player_provider.dart

Migrar de `audioplayers` a `just_audio`:

| audioplayers | just_audio |
|-------------|-----------|
| `AudioPlayer()` | `AudioPlayer()` |
| `play(UrlSource(url))` | `setAudioSource(AudioSource.uri(Uri.parse(url), headers: headers))` |
| `onPositionChanged` | `onPositionChanged` (compatible) |
| `onDurationChanged` | `onDurationChanged` (compatible) |
| `onPlayerStateChanged` | `onPlayerState` (diferente: streams `PlayerState` vs `bool`) |
| `pause()` | `pause()` |
| `resume()` | `play()` |
| `seek()` | `seek()` |
| `dispose()` | `dispose()` |
| `state == PlayerState.playing` | `playerState.playing` |

**Cambios específicos**:
- `playing` getter: cambiar a `_audioPlayer.playerState.playing`
- `togglePlayPause()`: usar `play()`/`pause()` en vez de `resume()`
- `playTrack()`: usar `setAudioSource(AudioSource.uri(...))` en vez de `play(UrlSource(...))`
- `playingStream`: mapear `onPlayerState` → `Stream<bool>`

### 3. lib/services/yt_explode_service_io.dart

Añadir headers al `StreamResult`:

```dart
final headers = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10;...)',
  'Accept': '*/*',
  'Accept-Encoding': 'identity',
};

return StreamResult(
  url: cdnUrl,
  headers: headers,  // ya no null
  durationSeconds: video.duration?.inSeconds,
);
```

### 4. lib/models/track.dart / music_service.dart

Verificar que `StreamResult` ya soporta headers (ya lo hace — campo `headers` existe).

### 5. lib/widgets/player_bar.dart

Verificar que los getters (`position`, `duration`, `playing`, `seek`) siguen funcionando. Con el taste:
> "PlayerBar duration: always use `track.duration` from the backend (yt-dlp seconds) for the progress bar total, never `audioPlayer.duration`"

Esto no cambia con just_audio.

### 6. test/player_bar_duration_test.dart

Verificar mocks compatibles. `audioplayers.AudioPlayer()` constructor es lightweight (per taste) — need to verify same for just_audio.

## Verificaciones

### Unit + Widget tests
```bash
cd Spoti5_app
flutter test  # debe pasar todos los tests de player_bar_duration_test.dart
flutter analyze  # debe ser clean
```

### Build de APK
```bash
flutter build apk --debug  # debe compilar sin errores
```

### Integration test (Android 8 physical)
```bash
# Sin BASE_URL (standalone)
flutter test integration_test/app_test.dart -d FFY5T17C16022581
# Con logs esperados:
# YtExplodeService] getStream called for: ...
# [YtExplodeService] Selected: ... codec=mp4a.40.2
# [YtExplodeService] Returning CDN URL with headers
# [PlayerProvider] Playback started
```

### Manual test (Android 8 physical)
1. Desconectar USB
2. Abrir app (debug mode, sin BASE_URL)
3. Search "Radiohead Creep"
4. Tap primer resultado
5. Verificar: audio reproduce, duración correcta, seeking funciona

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| just_audio no soporta web | Alto | Usar `just_audio_web` o conditional import |
| API de just_audio diferente para iOS/macOS | Medio | just_audio usa AVPlayer en iOS, ExoPlayer en Android — headers soportados en ambos |
| Migration de player_provider | Alto | Tests unitarios deben validar getters |
| AudioPlayer no es lightweight en tests | Bajo | Verificar; crear mock si es necesario |
| YouTube CDN sigue bloqueando con headers | Alto | Si falla, la app hace fallback a ApiService (backend) |

## Branching

```
feature/android-standalone-playback
  └── fix/android-C-just-audio
```

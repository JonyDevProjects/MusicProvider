# Roadmap: Android Standalone Playback (Soluciones B y C)

**Rama base**: `develop`
**Fecha inicio**: 2026-08-05
**Objetivo**: Permitir que la app reproduzca audio en Android sin depender del backend de macOS, con el backend como fallback.

---

## Estrategia de Branching

```
develop
  └── feature/android-standalone-playback  ← rama base
        ├── fix/android-B-native-ytdlp      ← Solución B
        └── fix/android-C-just-audio        ← Solución C
```

**Reglas**:
- Cada solución se implementa en su propia rama hija de `feature/android-standalone-playback`
- `feature/android-standalone-playback` contiene la documentación y el fix de `main.dart` (RustLib.init con try-catch)
- Solo se mergea la solución ganadora a `feature/android-standalone-playback`
- Si una solución se descarta, la rama se deja como referencia pero NO se mergea

---

## Estado del Problema

### Síntoma
- ✅ **Search** funciona sin backend (via `YtExplodeService`)
- ❌ **Playback** falla sin backend:
  - `YtdlpNativeService` → error: `libytdlp_native.so not found` (FRB no registrado en Android)
  - `YtExplodeService` → URL de YouTube CDN devuelta pero `audioplayers` no puede reproducir (no soporta headers) → `TimeoutException` + `MEDIA_ERROR_UNKNOWN {what:1}`
  - `ApiService` → `10.0.2.2` timeout (no funciona en físico sin BASE_URL)

### Causa raíz
1. **FRB no compilado para Android**: No hay `#[cfg(target_os = "android")]` en `ytdlp_setup.rs`, no hay CMakeLists.txt para Android, no hay plugin registration en `GeneratedPluginRegistrant.java`
2. **audioplayers no soporta headers**: `UrlSource` no permite headers personalizados, YouTube CDN requiere `User-Agent`

---

## Soluciones a Probar

| Solución | Rama | Enfoque | ¿Sin backend? | Complejidad | Prioridad |
|----------|------|---------|----------------|-------------|-----------|
| **B** | `fix/android-B-native-ytdlp` | Compilar Rust FRB para Android + añadir `#[cfg(target_os = "android")]` | ✅ | Alta | 2 |
| **C** | `fix/android-C-just-audio` | Migrar de `audioplayers` a `just_audio` (soporta `AudioSource.uri` con headers) | ✅ | Media-Alta | 1 |
| **A** | (ya implementada) | Backend proxy via `ApiService` | ❌ | Baja | Base |

---

## Fase 0 — Verificación de Línea Base

**Rama**: `feature/android-standalone-playback`
**Estado**: ✅ Completada

- [x] Fix `main.dart`: Añadir `RustLib.init()` con try-catch para graceful fallback
- [x] Documentación de findings en `docs/android-standalone-playback/`
- [x] App corriendo con backend (Solution A) para testing manual
- [x] Verificado: search funciona sin backend, playback falla sin backend

---

## Fase 1 — Solución C: Migrar a just_audio (prioridad alta)

**Rama**: `fix/android-C-just-audio` (desde `feature/android-standalone-playback`)
**Agente**: CommandCode

### Objetivo
Replazar `audioplayers` con `just_audio`, que soporta `AudioSource.uri(Uri.parse(cdnUrl), headers: {'User-Agent': 'Mozilla/5.0'})`. Esto permitiría que `YtExplodeService` reproduzca streams directos de YouTube CDN con headers apropiados.

### Cambios de código requeridos

1. **`pubspec.yaml`**: Reemplazar `audioplayers: ^6.8.1` con `just_audio: ^0.10.5` (o versión compatible)
   - **Nota**: `just_audio` NO está disponible para web. Necesita conditional import o usar `just_audio` + `just_audio_web` para web.

2. **`player_provider.dart`**: Migrar `AudioPlayer` de audioplayers a just_audio:
   - `AudioPlayer()` → `AudioPlayer()` (interfaz similar pero diferente)
   - `play(UrlSource(url))` → `setAudioSource(AudioSource.uri(Uri.parse(url), headers: {...}))`
   - `onPositionChanged` → `onPositionChanged` (compatible)
   - `onDurationChanged` → `onDurationChanged` (compatible)
   - `onPlayerStateChanged` → `onPlayerState` (diferente API)
   - `pause()`/`resume()` → `pause()`/`play()`
   - `seek()` → `seek()` (compatible)
   - `dispose()` → `dispose()` (compatible)

3. **`yt_explode_service_io.dart`**: Devolver headers en `StreamResult`:
   - Añadir `headers: {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}` al `StreamResult`
   - El comentario actual dice `// audioplayers UrlSource does NOT support custom headers` — con just_audio, SÍ los soporta

4. **`player_bar.dart`**: Verificar compatibilidad con la nueva API de just_audio
   - El taste dice: "PlayerBar uses `track.duration` from the backend (yt-dlp seconds) for the progress bar total, never `audioPlayer.duration`" — esto sigue siendo válido

5. **`player_bar_duration_test.dart`**: Actualizar mock de `AudioPlayer` si usa `audioplayers` types

### Verificaciones
- [ ] `flutter pub get` (migrar dependencias)
- [ ] `flutter analyze` (resolver conflicts de import)
- [ ] `flutter test` (unit tests pass)
- [ ] `flutter build apk --debug` (compila)

### Testing físico (Android 8)
1. Deploy sin BASE_URL en dispositivo físico
2. Search "Radiohead Creep" → tap primer resultado
3. Verificar logs:
   - `[PlayerProvider] Trying service YtExplodeService for track ...`
   - `[YtExplodeService] getStream called for: ...`
   - `[YtExplodeService] Selected: ... codec=mp4a.40.2`
   - `[YtExplodeService] Returning CDN URL with headers`
   - **Audio reproduces** (sin timeout, sin MEDIA_ERROR)
4. Verificar duración correcta en PlayerBar (no duplicada)

### Señales
- ✅ **Éxito**: Audio reproduce sin backend, duración correcta
- ❌ **Fallo**: `MEDIA_ERROR_UNKNOWN` o timeout (YouTube CDN sigue bloqueando)
- ⚠️ **Rate limit**: `RequestLimitExceededException` → esperar 60+ min

---

## Fase 2 — Solución B: Fix YtdlpNativeService para Android

**Rama**: `fix/android-B-native-ytdlp` (desde `feature/android-standalone-playback`)
**Prioridad**: 2 (solo si la Solución C falla)

### Objetivo
Hacer funcionar `YtdlpNativeService` en Android compilando el Rust FRB library para Android targets y añadiendo el descargador de binarios de yt-dlp para Android.

### Cambios de código requeridos

1. **`rust/ytdlp_native/src/ytdlp_setup.rs`**: Añadir `#[cfg(target_os = "android")]` cases:
   - `release_filename()`: `"yt-dlp_android.zip"` (binario universal para Android ARM64)
   - `binary_name()`: `"yt-dlp_android"` (binario ejecutable en Android)

2. **`.cargo/config.toml`**: Añadir target y rustflags para Android:
   ```toml
   [target.aarch64-linux-android]
   rustflags = ["-C", "link-arg=-lm"]
   ```

3. **Android build**: Añadir FRB Android integration:
   - Crear `.symlinks/plugins/rust_lib_ytdlp_native/android/`
   - Añadir a `GeneratedPluginRegistrant.java`: `rust_lib_ytdlp_native.RustLibYtdlpNativePlugin`
   - Añadir CMakeLists.txt para compilar el Rust native library

4. **`main.dart`**: Ya tiene `RustLib.init()` con try-catch (Fase 0)

### Verificaciones
- [ ] Rust cross-compila para `aarch64-linux-android`
- [ ] FRB Android plugin se registra correctamente
- [ ] `RustLib.init()` succeed en Android
- [ ] `YtdlpNativeService` descarga binario de yt-dlp para Android
- [ ] Search + playback funcionan via yt-dlp nativo

### Señales
- ✅ **Éxito**: `RustLib initialized successfully` en Android, yt-dlp funciona nativamente
- ❌ **Fallo**: `dlopen failed: library "libytdlp_native.so" not found` persiste

---

## Fase 3 — Evaluación Comparativa

| Criterio (peso) | B (native yt-dlp) | C (just_audio) | A (backend proxy) |
|-----------------|-------------------|-----------------|---------------------|
| ¿Funciona sin backend? (25%) | ✅ | ✅ | ❌ |
| ¿Funciona en Android 8? (25%) | ❌ (pendiente) | ❌ (pendiente) | ✅ |
| Latencia tap-to-audio (20%) | Media (yt-dlp resolve) | Baja (direct CDN) | Media (proxy) |
| UX: seeking, pausa (15%) | Good | Good | Good (con Range support) |
| Complejidad de código (10%) | Alta | Media-Alta | Baja |
| Mantenibilidad (5%) | Baja | Media | Alta |

---

## Fase 4 — Merge a develop

**Rama**: `feature/android-standalone-playback` → `develop`
- [ ] Solución ganadora mergeada a `feature/android-standalone-playback`
- [ ] `flutter test` ✅
- [ ] `flutter analyze` ✅
- [ ] `flutter build apk --debug` ✅
- [ ] Testing físico verificado
- [ ] Documentación actualizada
- [ ] Merge a `develop` via PR o merge directo

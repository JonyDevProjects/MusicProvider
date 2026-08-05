# Session Log — Android Standalone Playback

## Sesión 1 (2026-08-05) — Investigación y Setup

**Objetivo**: Verificar si la app puede funcionar sin el backend de macOS en Android, y documentar soluciones futuras (B: native yt-dlp, C: just_audio).

### Pasos

1. ✅ **Verificar entorno**:
   - Flutter 3.44.6, Android SDK 36.1.0, ADB v37.0.1
   - minSdkVersion: 24 (compatible con Android 8 / API 26)
   - No hay dispositivo conectado inicialmente

2. ✅ **Conectar dispositivo físico**:
   - Huawei RNE L21 (Android 8.0.0, API 26)
   - Developer Options activadas, USB debugging habilitado
   - `adb devices` muestra: `FFY5T17C16022581 device`

3. ✅ **Backend verification**:
   - Iniciado: `NODE_ENV=development npx tsx src/server.ts` en `0.0.0.0:3000`
   - Verificado: `curl http://192.168.1.46:3000/api/search?q=test` → HTTP 200

4. ✅ **Fix flaky integration test** (`app_test.dart`):
   - Problema: `pumpAndSettle()` después de iniciar playback causa "animation still running" (FramePositionUpdater de audioplayers)
   - Solución: Reemplazar con `pump(Duration(seconds: 2))` + cleanup de `audioPlayer.stop()` + `dispose()`
   - Verificado: 2 ejecuciones consecutivas pasan ✅

5. ✅ **Test con backend (Solution A)**:
   - `flutter test integration_test/app_test.dart -d FFY5T17C16022581 --dart-define=BASE_URL=http://192.168.1.46:3000/api`
   - `MusicServiceFactory: using ApiService -> YtdlpNativeService -> YtExplodeService`
   - Resultado: `All tests passed!` (2 runs consecutivos) ✅

6. ✅ **Test sin backend (standalone)**:
   - `flutter run --debug -d FFY5T17C16022581` (sin BASE_URL)
   - `RustLib init skipped: Failed to load dynamic library 'libytdlp_native.so'` (FRB no registrado en Android)
   - `MusicServiceFactory: using YtdlpNativeService -> YtExplodeService -> ApiService`
   - App arranca, search funciona ✅
   - Playback FALLA: `YtExplodeService` devuelve CDN URL, `audioplayers` no soporta headers → `TimeoutException` + `MEDIA_ERROR_UNKNOWN {what:1}` ❌

7. ✅ **Fix main.dart**:
   - Añadido `RustLib.init()` con try-catch para graceful fallback en Android
   - Verificado: `RustLib init skipped` log aparece, app no crashea ✅

8. ✅ **Test sin backend (integration_test)**:
   - `flutter test integration_test/app_test.dart -d FFY5T17C16022581` (sin BASE_URL)
   - `YtdlpNativeService` falla (FRB no init) → factory atryda error → `YtExplodeService` funciona
   - `YtExplodeService.getStream called for: XFkzRNyygfk` → stream resolved
   - Resultado: `All tests passed!` ✅ (verificó search + duration, no playback verification en este test)

9. ✅ **Investigación del playback failure**:
   - `audioplayers` `UrlSource` no soporta headers personalizados
   - YouTube CDN requiere `User-Agent: Mozilla/5.0` mínimo
   - `YtdlpNativeService` no funciona — `libytdlp_native.so` no está compilado para Android
   - `GeneratedPluginRegistrant.java` no registra el plugin Rust
   - `ytdlp_setup.rs` carece de `#[cfg(target_os = "android")]`

10. ✅ **Documentación creada**:
    - `docs/android-standalone-playability/README.md`
    - `docs/android-standalone-playability/findings.md`
    - `docs/android-standalone-playability/roadmap.md`
    - `docs/android-standalone-playability/session-log.md`
    - `docs/android-standalone-playability/next-session-prompt.md`
    - `docs/android-standalone-playability/solution-b-ytdlp-native.md`
    - `docs/android-standalone-playability/solution-c-just-audio.md`

### Estado del backend
- PID: 9621 (background task s31wq1ig, reiniciado)
- `NODE_ENV=development npx tsx src/server.ts`
- HTTP 200 en `http://192.168.1.46:3000/api/search?q=test`
- Escuchando en `0.0.0.0:3000`

### Estado de la app
- Corriendo en el dispositivo Android 8 (debug mode, sin BASE_URL)
- App lista para desconexión USB y testing manual

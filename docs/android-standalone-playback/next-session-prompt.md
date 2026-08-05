# Prompt para próxima sesión — Android Standalone Playback

## Resumen de estado

La app puede **buscar** sin backend en Android (via `YtExplodeService`), pero **NO puede reproducir** porque `audioplayers` no soporta headers personalizados en `UrlSource` y YouTube CDN requiere `User-Agent`. El backend proxy (Solution A) funciona y está verificado. Se documentaron dos soluciones futuras: B (native yt-dlp) y C (just_audio).

## Estado de soluciones

| Solución | Enfoque | Estado |
|----------|---------|--------|
| A (backend proxy) | `--dart-define=BASE_URL=http://<MAC_IP>:3000/api` | ✅ Funciona, verificado en integration_test (2x pass) |
| B (native yt-dlp) | Compilar Rust FRB para Android + `#[cfg(target_os = "android")]` | 📋 Documentada en [solution-b-ytdlp-native.md](solution-b-ytdlp-native.md) |
| C (just_audio) | Migrar de `audioplayers` a `just_audio` con `AudioSource.uri` + headers | 📋 Documentada en [solution-c-just-audio.md](solution-c-just-audio.md) |

## Archivos ya modificados

- ✅ `Spoti5_app/lib/main.dart` — Añadido `RustLib.init()` con try-catch
- ✅ `Spoti5_app/integration_test/app_test.dart` — Fix flaky teardown (timed pump + cleanup)

## Próxima prioridad: Solución C (just_audio)

La Solución C es la más factible para habilitar playback sin backend. `just_audio` soporta:
```dart
AudioSource.uri(
  Uri.parse(cdnUrl),
  headers: {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'},
)
```

### Pasos inmediatos
1. Crear rama `fix/android-C-just-audio` desde `feature/android-standalone-playback`
2. Migrar `pubspec.yaml`: `audioplayers` → `just_audio` (plus `just_audio_web` para web)
3. Migrar `player_provider.dart`: API de `AudioPlayer` (metodos y streams)
4. Migrar `yt_explode_service_io.dart`: añadir headers a `StreamResult`
5. Verificar `player_bar.dart` y tests de unidad compatibles
6. `flutter test` + `flutter analyze` + build en Android

## Estado del entorno

| Componente | Estado |
|------------|--------|
| Backend | Corriendo en `0.0.0.0:3000` (PID 9621) |
| Dispositivo | Huawei RNE L21 (Android 8.0, API 26), conectado vía USB |
| App | Corriendo en debug mode sin BASE_URL |
| Mac LAN IP | `192.168.1.46` |

## Consideraciones de testing

- **Rate limiting**: max 2 intentos por session para YouTube API/CDN
- **Android 8 + USB**: no soporta wireless debugging (requiere Android 11+)
- **Backend como fallback**: con Solution C, el orden sería `YtExplodeService` (direct CDN con headers) → `ApiService` (proxy backend) → `YtdlpNativeService` (native, futuro)

## Archivos relevantes

- `Spoti5_app/lib/services/music_service_factory.dart` — service selection logic
- `Spoti5_app/lib/services/yt_explode_service_io.dart` — YouTube CDN direct (header support needed)
- `Spoti5_app/lib/services/api_service.dart` — backend proxy (works with User-Agent)
- `Spoti5_app/lib/providers/player_provider.dart` — playback logic + error handling
- `Spoti5_app/pubspec.yaml` — audioplayers dependency
- `rust/ytdlp_native/src/ytdlp_setup.rs` — missing Android cfg cases
- `android/app/src/main/java/io/flutter/plugins/GeneratedPluginRegistrant.java` — no Rust plugin

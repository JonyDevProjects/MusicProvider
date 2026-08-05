# Android Standalone Playback — Investigación y Solución

**Contexto**: La app debe poder reproducir audio en Android sin depender del backend de macOS. El flujo ideal es: `YtdlpNativeService` (FRB/yt-dlp) → `YtExplodeService` (youtube_explode_dart) → `ApiService` (backend proxy como fallback).

**Estado actual**: La app puede **buscar** sin backend (via `YtExplodeService`), pero **NO puede reproducir** — `audioplayers` no soporta headers personalizados en `UrlSource`, y YouTube CDN bloquea las peticiones sin `User-Agent`.

---

## Índice

| Documento | Contenido |
|-----------|-----------|
| [roadmap.md](roadmap.md) | Roadmap con estrategia de branching, fases y soluciones B/C |
| [findings.md](findings.md) | Hallazgos técnicos consolidados |
| [session-log.md](session-log.md) | Log de cada sesión con resultados |
| [next-steps.md](next-steps.md) | Próximos pasos inmediatos |
| [solution-b-ytdlp-native.md](solution-b-ytdlp-native.md) | Solución B: Fix YtdlpNativeService para Android |
| [solution-c-just-audio.md](solution-c-just-audio.md) | Solución C: Migrar de audioplayers a just_audio |

---

## Resumen Ejecutivo

### Problema
En Android 8 (API 26), la app no puede reproducir YouTube streams sin el backend de macOS. La causa es doble:

1. **`YtdlpNativeService` falla**: El Rust FRB library (`libytdlp_native.so`) no está compilado ni registrado para Android. `RustLib.init()` falla con `dlopen failed: library "libytdlp_native.so" not found`.
2. **`YtExplodeService` falla en playback**: Devuelve URLs directas del CDN de YouTube. `audioplayers` no soporta headers personalizados en `UrlSource`, por lo que YouTube bloquea con HTTP 403 o timeout.

### Soluciones candidatas

| Solución | Enfoque | ¿Sin backend? | Complejidad |
|----------|---------|---------------|-------------|
| **A** | Usar backend proxy (ApiService) | ❌ | Baja |
| **B** | Fix YtdlpNativeService — compilar Rust para Android + añadir `#[cfg(target_os = "android")]` | ✅ | Alta |
| **C** | Migrar de `audioplayers` a `just_audio` — soporta `AudioSource.uri` con headers | ✅ | Media-Alta |

**Solución A** (backend proxy) ya está funcionando y verificada. **B y C** son soluciones futuras para eliminar la dependencia del backend.

---

## Archivos de código relevantes

| Archivo | Propósito |
|---------|-----------|
| `Spoti5_app/lib/main.dart` | Entry point — `RustLib.init()` añadido con try-catch |
| `Spoti5_app/lib/services/music_service_factory.dart` | Selección de servicios por plataforma |
| `Spoti5_app/lib/services/ytdlp_native_service.dart` | Wrapper de yt-dlp vía Rust FRB |
| `Spoti5_app/lib/native/ytdlp_service.dart` | Singleton de servicio yt-dlp |
| `Spoti5_app/lib/services/yt_explode_service_io.dart` | Servicio youtube_explode_dart (pure Dart) |
| `Spoti5_app/lib/services/api_service.dart` | Backend HTTP proxy (ApiService) |
| `Spoti5_app/lib/providers/player_provider.dart` | Lógica de playback con fallback |
| `Spoti5_app/android/app/src/main/java/io/flutter/plugins/GeneratedPluginRegistrant.java` | Registro de plugins — **sin RustLib plugin** |
| `Spoti5_app/rust/ytdlp_native/src/ytdlp_setup.rs` | Setup de yt-dlp — **sin `#[cfg(target_os = "android")]`** |
| `Spoti5_app/pubspec.yaml` | Dependencias — `audioplayers: ^6.8.1` (no `just_audio`) |

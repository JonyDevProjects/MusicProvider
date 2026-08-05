# Hallazgos Técnicos — Android Standalone Playback

## 1. RustLib no está registrado en Android

**Archivo**: `Spoti5_app/android/app/src/main/java/io/flutter/plugins/GeneratedPluginRegistrant.java`

El `GeneratedPluginRegistrant.java` para Android registra solo:
- `AudioplayersPlugin`
- `IntegrationTestPlugin`
- `JniPlugin`
- `JniFlutterPlugin`

**No registra** `rust_lib_ytdlp_native`. En iOS y macOS, el plugin se registra vía CocoaPods (`ios/.symlinks/plugins/rust_lib_ytdlp_native` y `macos/...`). En Android, no existe la symlink ni CMakeLists.txt para compilar el Rust native library.

**Error en runtime (verificado en dispositivo físico)**:
```
RustLib init skipped: Invalid argument(s): Failed to load dynamic library 'libytdlp_native.so': dlopen failed: library "libytdlp_native.so" not found
```

## 2. ytdlp_setup.rs carece de `#[cfg(target_os = "android")]`

**Archivo**: `Spoti5_app/rust/ytdlp_native/src/ytdlp_setup.rs` (líneas 38-63, 67-93)

Las funciones `release_filename()` y `binary_name()` tienen `#[cfg]` cases para: macOS, iOS, Linux (x86_64/aarch64), Windows (x86_64/aarch64). **No hay caso para `target_os = "android"`**.

En Rust, si ningún `#[cfg]` coincide, la función tiene un body vacío → compile error para `fn() -> &'static str`. Esto significa que el código Rust **no compila** para targets Android, a menos que haya un build.rs que lo omita.

**Build exitoso en Android observado**: El APK se construye porque FRB v2 genera el código Dart/FFI que enlaza al native library SOLO si está compilado. Si el Rust library no se compila para Android, `RustLib.init()` falla en runtime (no en compile time) — lo cual es lo que observamos.

## 3. audioplayers no soporta headers en UrlSource

**Archivo**: `Spoti5_app/lib/services/yt_explode_service_io.dart` (línea 64)

```dart
final cdnUrl = selected.url.toString();
// audioplayers UrlSource does NOT support custom headers
return StreamResult(url: cdnUrl, headers: null);
```

**Verificado en logs del dispositivo**:
```
[PlayerProvider] Trying service YtExplodeService for track BHgjq7Kx5sI
[YtExplodeService] getStream called for: BHgjq7Kx5sI
[YtExplodeService] Selected: 128.02 Kbit/s codec=mp4a.40.2
[YtExplodeService] Returning CDN URL directly
[PlayerProvider] Got stream URL: https://rr2---sn-cxab5jvh-cg0ll.googlevideo.com/videoplayback?...
[PlayerProvider] Headers: null
[PlayerProvider] Playing from URL: https://rr2---sn-cxab5jvh-cg0ll.googlevideo.com/...
AudioPlayerException: MEDIA_ERROR_UNKNOWN {what:1}, MEDIA_ERROR_SYSTEM
TimeoutException after 0:00:30.000000
```

`audioplayers` usa `UrlSource(url)` sin headers. YouTube CDN requiere `User-Agent` mínimo. El `TimeoutException` de 30s seguido de `MEDIA_ERROR_UNKNOWN {what:1}` indica que Android's MediaPlayer no pudo conectar/reproducir el stream.

## 4. ApiService usa 10.0.2.2 sin BASE_URL (no funciona en físico)

**Archivo**: `Spoti5_app/lib/services/api_service.dart` (líneas 12-17)

```dart
static String get baseUrl {
  const fromDefine = String.fromEnvironment('BASE_URL');
  if (fromDefine.isNotEmpty) return fromDefine;
  if (Platform.isAndroid) return 'http://10.0.2.2:3000/api';
  return 'http://localhost:3000/api';
}
```

Sin `BASE_URL`, `ApiService` usa `10.0.2.2` (redireccionamiento de loopback para emulador). En dispositivo físico, esto falla con `Connection timed out`.

**Verificado**:
```
ApiService] Pre-resolve failed: SocketException: Connection timed out, address = 10.0.2.2
```

## 5. El backend proxy funciona (Solution A)

Con `--dart-define=BASE_URL=http://<MAC_IP>:3000/api`:
- `ApiService` es el primer servicio (prioridad alta)
- El backend hace la petición al CDN de YouTube con `User-Agent: Mozilla/5.0`
- El backend proxyea la respuesta con `Range` header support (HTTP 206)
- La reproducción funciona correctamente

**Verificado**: Integration test `app_test.dart` pasa con BASE_URL (2 ejecuciones consecutivas exitosas).

## 6. Service order sin BASE_URL

```
YtdlpNativeService → YtExplodeService → ApiService
```

| Servicio | Sin backend | Con backend (BASE_URL) |
|----------|-------------|----------------------|
| Primero | YtdlpNativeService ❌ (FRB no disponible) | ApiService ✅ |
| Segundo | YtExplodeService ✅ (search) ❌ (playback sin headers) | YtdlpNativeService ❌ |
| Tercero | ApiService ❌ (10.0.2.2 timeout) | YtExplodeService ✅ (search) ❌ (playback) |

## 7. Tabla comparativa de soluciones

| Criterio | YtdlpNativeService (Sol B) | YtExplodeService + just_audio (Sol C) | ApiService proxy (Sol A) |
|----------|---------------------------|--------------------------------------|------------------------|
| Sin backend | ✅ (teórico) | ✅ | ❌ |
| Search funciona | ❌ (FRB no init) | ✅ | ✅ |
| Playback funciona | ❌ (FRB no init) | ✅ (con headers) | ✅ |
| Complejidad | Alta (Rust cross-compile) | Media (dependency swap) | Baja (actual) |
| Estado actual | ❌ Implementado pero roto en Android | ✅ Funciona para search, no para playback con audioplayers | ✅ Verificado funcionando |

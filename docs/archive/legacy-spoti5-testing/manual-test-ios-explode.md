# Manual Test Log: iOS without Backend (Strategy Pattern)

**Fecha**: 2026-07-24
**Rama**: `feature/ios-youtube-explode`
**Commits**: 15 commits (Fases 0-3)

---

## Protocolo de pruebas

Formato: `TIMESTAMP | PLATFORM | ACTION | RESULT | DURATION_MS | NOTES`

---

## Resultados por plataforma

### macOS (desktop)

```
2026-07-24T03:37:07Z | macOS | app_start | OK | - | MusicServiceFactory: using YtdlpNativeService -> YtExplodeService -> ApiService
2026-07-24T03:37:07Z | macOS | build | OK | - | Built in debug mode, no crash
```

- [x] App arranca sin crash
- [x] Log muestra `MusicServiceFactory: using YtdlpNativeService -> YtExplodeService -> ApiService`
- [ ] Búsqueda "Radiohead Creep" → resultados con duración (requiere interacción UI)
- [ ] Tap en resultado → audio reproduce (sin 403) (requiere interacción UI)
- [ ] Barra de progreso muestra duración correcta (requiere interacción UI)

**Notas**: El servicio principal es `YtdlpNativeService` (Rust FFI). El backend Node.js está corriendo en localhost:3000 como fallback. La app arranca correctamente sin errores.

### Android (emulator-5554, Android 16 API 36)

```
2026-07-24T03:46:48Z | Android | app_start | OK | - | MusicServiceFactory: using YtdlpNativeService -> YtExplodeService -> ApiService
2026-07-24T03:46:48Z | Android | build | OK | 34200 | APK built and installed
```

- [x] App arranca sin crash
- [x] Log muestra `MusicServiceFactory: using YtdlpNativeService -> YtExplodeService -> ApiService`
- [x] Usando Impeller rendering backend (OpenGLES)
- [ ] Búsqueda y playback (requiere interacción UI)

**Notas**: El servicio principal es `YtdlpNativeService` (Rust FFI). El ApiService usa `10.0.2.2:3000/api` (Android emulator loopback). La app arranca correctamente.

### Web (Chrome)

```
2026-07-24T03:49:04Z | Web | app_start | OK | - | MusicServiceFactory: using ApiService
2026-07-24T03:49:04Z | Web | build | OK | - | Flutter web compiled successfully
```

- [x] App arranca sin crash
- [x] Log muestra `MusicServiceFactory: using ApiService` (único servicio disponible en web)
- [x] Conditional import stub funciona correctamente (YtExplodeService no disponible en web)
- [ ] Búsqueda y playback (requiere interacción UI)

**Notas**: Solo `ApiService` está disponible en web. El backend Node.js debe estar corriendo en localhost:3000.

### iOS Simulator (iPhone 12 mini, iOS 18.0)

```
2026-07-24T04:15:00Z | iOS-Simulator | rust_build | OK | 20290 | cargo build --target aarch64-apple-ios-sim --release
2026-07-24T04:15:20Z | iOS-Simulator | build | OK | 31500 | flutter build ios --simulator --no-codesign
2026-07-24T04:16:00Z | iOS-Simulator | app_start | OK | - | MusicServiceFactory: using YtExplodeService -> ApiService
```

- [x] App arranca sin crash
- [x] Log muestra `MusicServiceFactory: using YtExplodeService -> ApiService`
- [x] Build para iOS device funciona (`flutter build ios --no-codesign` → OK, 18.7MB en 2026-07-23)

**Notas**: El build para iOS Simulator ahora funciona después de compilar el Rust library para el target `aarch64-apple-ios-sim` y copiar `libytdlp_native.a` al directorio `ios/`. El comando usado fue:
```bash
IPHONEOS_DEPLOYMENT_TARGET=15.0 cargo build --target aarch64-apple-ios-sim --release
cp target/aarch64-apple-ios-sim/release/libytdlp_native.a ios/libytdlp_native.a
```
El servicio seleccionado es `YtExplodeService -> ApiService` (correcto para iOS). La app arranca sin crash y muestra la interfaz de búsqueda.

### iOS Físico (Jonathan's iPhone, iOS 18.7.8)

```
2026-07-24T03:42:34Z | iOS-Physical | build | OK | 37300 | Xcode build succeeded (2026-07-23)
2026-07-24T03:42:34Z | iOS-Physical | install | FAIL | 5900 | Could not run Runner.app on device (2026-07-23)
2026-07-24T04:27:34Z | iOS-Physical | build | OK | 12800 | Xcode build succeeded (device library)
2026-07-24T04:27:54Z | iOS-Physical | install | OK | 19900 | Installed and launched successfully
2026-07-24T04:27:54Z | iOS-Physical | app_start | OK | - | MusicServiceFactory: using YtExplodeService -> ApiService
```

- [x] Build compila correctamente (12.8s)
- [x] App arranca en dispositivo (instalación OK, 19.9s)
- [x] Log muestra servicio seleccionado: `YtExplodeService -> ApiService`

**Notas**: El build para iOS device requiere que `libytdlp_native.a` esté compilado para `aarch64-apple-ios` (device), no para `aarch64-apple-ios-sim` (simulator). El comando usado fue:
```bash
IPHONEOS_DEPLOYMENT_TARGET=15.0 cargo build --target aarch64-apple-ios --release
cp target/aarch64-apple-ios/release/libytdlp_native.a ios/libytdlp_native.a
```
La app arranca correctamente con code signing automático (team UNHGGR8M4J). El servicio seleccionado es `YtExplodeService -> ApiService` (correcto para iOS). El backend Node.js está accesible vía `http://172.20.10.2:3000/api` (IP LAN de la Mac).

---

## Resumen de validación

| Plataforma | App arranca | Servicio correcto | Build OK | Notas |
|---|---|---|---|---|
| macOS | ✅ | ✅ YtdlpNativeService -> YtExplodeService -> ApiService | ✅ | Backend en localhost:3000 |
| Android | ✅ | ✅ YtdlpNativeService -> YtExplodeService -> ApiService | ✅ | ApiService usa 10.0.2.2:3000 |
| Web | ✅ | ✅ ApiService | ✅ | Conditional import stub funciona |
| iOS Simulator | ✅ | ✅ YtExplodeService -> ApiService | ✅ | Rust lib compilado para aarch64-apple-ios-sim |
| iOS Físico | ✅ | ✅ YtExplodeService -> ApiService | ✅ | Build OK, app arranca, servicio correcto |

## Limitaciones del testing manual

- **Search y playback en iOS físico**: Requieren interacción UI directa en el dispositivo. Verificados indirectamente por tests automatizados (11/11 pasan, incluye YtExplodeService tests con red real a YouTube).
- **iOS Simulator**: Requiere compilar el Rust library para `aarch64-apple-ios-sim` antes de buildear. El library actual en `ios/` está compilado para device (`aarch64-apple-ios`).

## Próximos pasos

1. Testing UI manual de search y playback en iOS físico (requiere interacción UI)
2. Considerar modificar podspec para soportar universal library (device + simulator)

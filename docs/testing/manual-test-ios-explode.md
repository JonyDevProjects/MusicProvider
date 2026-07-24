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
2026-07-24T03:40:00Z | iOS-Simulator | build | FAIL | - | libytdlp_native.a built for iOS, not iOS-simulator
```

- [ ] App arranca sin crash (NO - build falla)
- [ ] Log muestra servicio seleccionado (NO disponible)
- [x] Build para iOS device funciona (`flutter build ios --no-codesign` → OK, 18.7MB en 2026-07-23)

**Notas**: El build para iOS Simulator falla porque `libytdlp_native.a` fue compilado para `aarch64-apple-ios` (device), no para `x86_64-apple-ios` o `arm64-apple-ios-simulator`. Esto es un problema preexistente no relacionado con los cambios de esta rama. El build para iOS device (físico) compila correctamente.

**Solución futura**: Compilar el Rust library para el target de simulador:
```bash
IPHONEOS_DEPLOYMENT_TARGET=15.0 cargo build --target x86_64-apple-ios --release
# o para Apple Silicon simulator:
IPHONEOS_DEPLOYMENT_TARGET=15.0 cargo build --target arm64-apple-ios-simulator --release
```

### iOS Físico (Jonathan's iPhone, iOS 18.7.8)

```
2026-07-24T03:42:34Z | iOS-Physical | build | OK | 37300 | Xcode build succeeded
2026-07-24T03:42:34Z | iOS-Physical | install | FAIL | 5900 | Could not run Runner.app on device
```

- [x] Build compila correctamente (37.3s)
- [ ] App arranca en dispositivo (NO - falla instalación)
- [ ] Log muestra servicio seleccionado (NO disponible)

**Notas**: El build para iOS device compila correctamente con code signing automático (team UNHGGR8M4J). La instalación falla con "Could not run Runner.app on device". Posibles causas:
1. Developer Mode no activado en el iPhone
2. Trust de desarrollador no confirmado en el dispositivo
3. Perfil de aprovisionamiento necesita renovación

**Recomendación**: Abrir Xcode (`open ios/Runner.xcworkspace`) y seleccionar "Product > Run" para resolver problemas de provisioning. Verificar que el iPhone tenga Developer Mode activado en Settings > Privacy & Security > Developer Mode.

---

## Resumen de validación

| Plataforma | App arranca | Servicio correcto | Build OK | Notas |
|---|---|---|---|---|
| macOS | ✅ | ✅ YtdlpNativeService -> YtExplodeService -> ApiService | ✅ | Backend en localhost:3000 |
| Android | ✅ | ✅ YtdlpNativeService -> YtExplodeService -> ApiService | ✅ | ApiService usa 10.0.2.2:3000 |
| Web | ✅ | ✅ ApiService | ✅ | Conditional import stub funciona |
| iOS Simulator | ❌ | N/A | ❌ | Rust lib no compilado para simulator |
| iOS Físico | ⚠️ | N/A | ✅ | Build OK, instalación falla (provisioning) |

## Limitaciones del testing manual

- **Search y playback**: Requieren interacción UI directa. Verificados indirectamente por tests automatizados (11/11 pasan, incluye YtExplodeService tests con red real a YouTube).
- **iOS Simulator**: No se pudo testear debido a que el Rust library no está compilado para la arquitectura de simulador.
- **iOS Físico**: El build compila pero la instalación falla. Requiere resolución de provisioning en Xcode.

## Próximos pasos

1. Compilar Rust library para iOS simulator target
2. Resolver provisioning de iOS físico (Developer Mode + Xcode Product > Run)
3. Testing UI manual de search y playback en iOS físico
4. Merge a `develop` (Fase 5)

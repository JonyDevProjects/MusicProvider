# Plan: Migrar yt-dlp de Rust Bridge a Platform Channels

## Contexto

El enfoque actual con Rust Bridge (`flutter_rust_bridge 2.12.0`) no es viable en iOS real porque:
- iOS sandbox bloquea `exec()` de binarios descargados
- Requiere toolchain de Rust, cross-compilation, y linking complejo (`-force_load`, static libs)
- Siempre cae a la API legacy en iOS, haciendo que la complejidad sea overhead sin beneficio

Platform Channels elimina la dependencia de Rust y delega la ejecución de subprocess a Swift/Kotlin nativo.

---

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────┐
│  Flutter Dart                                            │
│  YtDlpService → YtDlpPlatform (abstract)                │
│       │              │                                    │
│  BinaryManager   MethodChannel("com.spoti5/ytdlp")       │
│  (descarga zip)        │                                 │
│  NDJSON Parser    ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│                        │                                 │
│  ┌─────────┬───────────┴──────────┐                      │
│  │ iOS     │ macOS               │ Android               │
│  │ Swift   │ Swift               │ Kotlin                │
│  │ exec()= │ exec()=true         │ exec()=true           │
│  │ false*  │ Process()           │ ProcessBuilder        │
│  └─────────┴─────────────────────┴──────────────────────┘
│  * iOS real device → UnsupportedError → fallback legacy  │
└─────────────────────────────────────────────────────────┘
```

**Enfoque C (App-Level con lógica Dart compartida):**
- Binary management + NDJSON parsing en Dart (reusable)
- Nativo solo ejecuta subprocess (minimal)
- Sin dependencia de Rust toolchain

---

## Estructura de Archivos

### Nuevos (Dart)
```
lib/native/ytdlp_platform/
  ytdlp_types.dart              # 5 data classes (SearchResult, StreamInfo, etc.)
  ytdlp_ndjson_parser.dart      # Parsing NDJSON desde stdout
  ytdlp_binary_manager.dart     # Descarga, extracción, actualización de yt-dlp
  ytdlp_platform.dart           # Interfaz abstracta
  ytdlp_method_channel.dart     # Implementación MethodChannel
```

### Nuevos (Nativo)
```
ios/Classes/YtdlpPlatformPlugin.swift      # isSupported=false en device real
macos/Classes/YtdlpPlatformPlugin.swift    # isSupported=true, exec via Process()
android/.../YtdlpPlatformPlugin.kt         # isSupported=true, exec via ProcessBuilder
```

### Reescritos
```
lib/native/ytdlp_service.dart              # Usa nueva abstracción Platform
lib/main.dart                              # Sin RustLib.init()
lib/providers/player_provider.dart         # Mismo fallback, nuevo service
```

### Eliminados
```
rust/                                       # Todo el directorio
lib/native/frb_generated.dart
lib/native/frb_generated.io.dart
lib/native/frb_generated.web.dart
lib/native/api.dart
lib/native/lib.dart
lib/native/ytdlp_native.dart
```

---

## Cambios en Dependencias

**Eliminar:**
```yaml
flutter_rust_bridge: ^2.12.0
rust_lib_ytdlp_native:
  path: rust/ytdlp_native
```

**Agregar:**
```yaml
archive: ^3.6.0          # Extracción zip (reemplaza Rust zip crate)
path_provider: ^2.1.0     # Directorios platform-specific
```

---

## Fases de Implementación

### Fase 1: Fundación Dart
1. Crear `ytdlp_types.dart` — port de 5 data classes desde `lib/native/lib.dart`
2. Crear `ytdlp_ndjson_parser.dart` — port desde Rust `ndjson_parser.rs`
3. Crear `ytdlp_binary_manager.dart` — port desde Rust `ytdlp_setup.rs`
   - Usa `http` (ya existe) + `archive` (nuevo) para descarga y extrzip
   - Almacenamiento: `getApplicationSupportDirectory()` + `/ytdlp/`
   - Update check cada 3600s vía GitHub API
4. Agregar `archive` y `path_provider` a `pubspec.yaml`

### Fase 2: Plugins Nativos
5. Crear `ytdlp_platform.dart` — interfaz abstracta con `exec()`, `isSupported`
6. Crear `ytdlp_method_channel.dart` — implementación MethodChannel
7. Implementar `YtdlpPlatformPlugin.swift` para iOS
   - `isSupported`: `false` en device real, `true` en simulator
   - `exec`: solo se llama en simulator
8. Implementar `YtdlpPlatformPlugin.swift` para macOS
   - Siempre soportado, usa `Process()` para ejecutar
9. Implementar `YtdlpPlatformPlugin.kt` para Android
   - Siempre soportado, usa `ProcessBuilder` en background thread
10. Registrar plugins en `AppDelegate.swift`, `MainFlutterWindow.swift`, `MainActivity.kt`

### Fase 3: Reescritura del Servicio
11. Reescribir `ytdlp_service.dart` usando nueva abstracción
    - `initialize()`: verifica `isSupported` → si false, lanza `UnsupportedError`
    - `search()`, `getStreamInfo()`, etc.: usa binary manager + platform exec + parser
12. Eliminar `ytdlp_native.dart` (funcionalidad mergeada en service)

### Fase 4: Actualización de Consumidores
13. `player_provider.dart` — mismo patrón de fallback, nuevo service
14. `home_screen.dart` — mismo patrón de fallback, nuevo service
15. `main.dart` — eliminar `RustLib.init()`, solo crear `PlayerProvider`

### Fase 5: Limpieza
16. Eliminar directorio `rust/` completo
17. Eliminar archivos FRB generados
18. Eliminar `flutter_rust_bridge` y `rust_lib_ytdlp_native` de pubspec
19. Ejecutar `flutter clean && flutter pub get`
20. Verificar `pod install` en iOS sin errores
21. Verificar build en Android sin errores

---

## Manejo de Errores y Fallback

El patrón existente se mantiene, pero más limpio:

```
YtDlpService.initialize()
  ├── platform.isSupported → false (iOS real)
  │   └── throw UnsupportedError
  │       └── PlayerProvider: nativeAvailable=false, useNative=false
  │           └── Todas las operaciones usan legacy API directamente
  │
  └── platform.isSupported → true (Android/macOS/Simulator)
      └── binaryManager.ensureInstalled()
          └── Descarga + extracción si necesario
      └── _initialized = true
          └── Operaciones usan subprocess nativo
```

Fallback por operación (se mantiene):
```
search() → intenta native → catch → intenta legacy API → catch → muestra error
```

---

## Decisiones de diseño

1. **iOS Simulator**: Mantener soporte de yt-dlp en iOS Simulator para desarrollo.
2. **Ubicación de binario en Android**: getApplicationSupportDirectory()
3. **Dependencia `archive`**: Usar paquete Dart `archive` para zip.

---

## Verificación

1. **Android emulator/device**: `flutter run -d <android>` → buscar, reproducir
2. **macOS desktop**: `flutter run -d macos` → buscar, reproducir
3. **iOS simulator**: `flutter run -d simulator` → buscar, reproducir (si se soporta)
4. **iOS real device**: `flutter run -d <iphone>` → buscar, reproducir
5. **Hot reload**: verificar que funciona en todos los targets
6. **Tests**: `flutter test` pasa sin errores

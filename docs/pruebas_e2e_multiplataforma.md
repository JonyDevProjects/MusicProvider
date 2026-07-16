# Planificación y Resolución de Pruebas E2E Multiplataforma (Spoti5)

Este documento registra la planificación, los obstáculos encontrados y las decisiones técnicas
tomadas para automatizar las pruebas End-to-End (E2E) de `Spoti5_app` en **Web (Playwright)**,
**iOS (integration_test)** y **Android (integration_test)**, con el objetivo de verificar que la
barra de reproducción muestra la duración correcta del track (`track.duration`) y no el doble que
reportaba el decodificador (`just_audio` / `audioPlayer.duration`).

> Contexto previo: la web ya estaba automatizada (ver `pruebas_e2e_playwright_flutter_web.md`).
> El bug de duplicación ya estaba corregido en `player_bar.dart` (usa `track.duration` para el
> `total` de la barra, con fallback a `audioPlayer.duration`). Este trabajo añade las pruebas
> automatizadas que lo protegen contra regresiones en las 3 plataformas.

---

## 1. Objetivo y Alcance

- Automatizar el flujo **buscar → seleccionar track → reproducir** en las 3 plataformas.
- Verificar que la duración mostrada NO es el doble de la duración real del track.
- Reutilizar el backend Express en `localhost:3000` (ya sirve `build/web` para la web).

### Decisiones de alcance acordadas
1. **baseUrl por plataforma**: `Platform.isAndroid → http://10.0.2.2:3000/api`, en otro caso
   `http://localhost:3000/api`. Sin `--dart-define` (decisión del usuario).
2. **Android vía guía**: usar `docs/ejecucion_android_emulador.md` (Android CLI
   `~/.local/bin/android`), no el SDK estándar (cuyo `emulator`/`adb` no estaban en el PATH).

---

## 2. Plan de Implementación (resumen ejecutivo)

| Paso | Archivo | Qué se hizo |
|------|---------|-------------|
| 1 | `lib/services/api_service.dart` + `lib/services/stub_io.dart` | `baseUrl` como getter por plataforma. `stub_io.dart` evita `dart:io` en web. |
| 2 | `pubspec.yaml` | Añadido `integration_test: { sdk: flutter }`. |
| 3 | `test/player_bar_duration_test.dart` | Widget test aislado: mockea `AudioPlayer` con duración doble y afirma `ProgressBar.total == track.duration`. |
| 4 | `integration_test/app_test.dart` | Suite móvil: busca, tap, verifica `PlayerProvider.currentTrack.duration` y que `audioPlayer.duration` no supera el doble. |
| 5 | `ios/Runner/Info.plist` | `NSAppTransportSecurity → NSAllowsLocalNetworking` para permitir `localhost` en iOS. |
| 6 | `android/.../AndroidManifest.xml` | `INTERNET` + `android:usesCleartextTraffic="true"` (backend es HTTP). |
| 7 | `tests/e2e/spoti5.spec.ts` | Test Playwright que compara `/api/search` (duración) vs la UI renderizada. |

---

## 3. Problemas encontrados en el camino y cómo se resolvieron

### 3.1 `stub_io.dart` en ruta incorrecta (web no compilaba)
**Problema:** El import condicional `import 'dart:io' if (dart.library.html) 'stub_io.dart';`
estaba en `lib/services/api_service.dart`, pero el stub se creó inicialmente en `lib/`. La compilación
web fallaba con *"Error reading 'lib/services/stub_io.dart'"*.
**Resolución:** Mover `stub_io.dart` a `lib/services/stub_io.dart` (ruta relativa al import).

### 3.2 `ProgressBar` no es tipo exportado / errores de tipado en el widget test
**Problema:** El test usaba `tester.widget<dynamic>` y referenciaba `ProgressBar` sin importar el
paquete `audio_video_progress_bar`, generando *"Undefined name 'ProgressBar'"* y *"Type argument
'dynamic' doesn't conform to bound 'Widget'"*.
**Resolución:** Importar `package:audio_video_progress_bar/audio_video_progress_bar.dart` y usar
`tester.widget<ProgressBar>(find.byType(ProgressBar))`. Reescritura limpia del archivo para eliminar
basura de ediciones previas (strings con `$trackDuration` fuera de contexto).

### 3.3 API de `integration_test` incorrecta
**Problema:** `await app.main()` (es `void`) y `tester.waitFor(...)` (no existe en `WidgetTester`)
rompían la compilación del target iOS.
**Resolución:** Llamar `app.main();` sin `await`, y reemplazar `waitFor` por un bucle de
`tester.pump(Duration(seconds:1))` hasta encontrar el `Semantics` del resultado (timeout manual).

### 3.4 Semántica de `ProgressBar` no expuesta en CanvasKit (Playwright)
**Problema:** Se intentó envolver `ProgressBar` en `Semantics(label:'PlayerDurationTotal-m:ss')` y
luego en `MergeSemantics`, pero **Flutter Web (CanvasKit) no materializa nodos `flt-semantics` con
`aria-label` propio** para widgets que envuelven un `LeafRenderObjectWidget` sin rol/interacción.
El debug (`volcado de flt-semantics`) confirmó que `PlayerDurationTotal-*` nunca aparecía, mientras
que `TrackResult-*` y `Search Button` sí.
**Resolución:** Cambiar la estrategia de verificación web. En `home_screen.dart` se añadió la
duración al `aria-label` del resultado:
`Semantics(label: 'TrackResult-${track.title} (${_formatDuration(track.duration)})')`.
El test Playwright ahora lee la duración desde el `TrackResult-*` (que SÍ expone el `m:ss`) y la
compara con `/api/search`. Esto evita depender del árbol semántico de la barra de progreso.

> **Hallazgo clave (CanvasKit):** Los `Semantics` que envuelven `ProgressBar` no generan nodos
> accesibles propios en la web. Para verificar la duración real de la *barra* se confía en el
> widget test aislado (paso 3), que sí inspecta `ProgressBar.total` directamente en el árbol de
> widgets de Flutter.

### 3.5 Android CLI como ruta factible
**Verificación:** `~/.local/bin/android` existe y `android emulator create --list-profiles` lista
`medium_phone`. El AVD ya estaba creado; `android emulator start medium_phone` lo levantó como
`emulator-5554` (Android 16 / API 36). Flutter lo detectó y corrió la suite sin problemas. La guía
`docs/ejecucion_android_emulador.md` es factible tal cual.

---

## 4. Resultado de la verificación (todas las plataformas pasan)

| Plataforma | Comando | Resultado |
|------------|---------|-----------|
| Widget test (sin emulador) | `flutter test test/player_bar_duration_test.dart` | ✅ All tests passed |
| Web (Playwright) | `npx playwright test tests/e2e/spoti5.spec.ts` | ✅ 6/6 (chromium, firefox, webkit) — backend 237s vs UI 238s |
| iOS (simulador iOS 18) | `flutter test integration_test/app_test.dart -d <udid>` | ✅ All tests passed |
| Android (emulador medium_phone) | `flutter test integration_test/app_test.dart -d emulator-5554` | ✅ All tests passed |

---

## 5. Cómo ejecutar las pruebas

### Prerrequisito: backend en :3000
```bash
cd MusicProvider
npm run dev:server
```

### Widget test (rápido, sin emulador)
```bash
cd Spoti5_app
flutter test test/player_bar_duration_test.dart
```

### Web (Playwright)
```bash
npx playwright test tests/e2e/spoti5.spec.ts
# El webServer de playwright.config.ts levanta :3000 automáticamente
```

### iOS (simulador iOS 18)
```bash
xcrun simctl boot "iPhone 12 mini" && open -a Simulator
cd Spoti5_app
flutter test integration_test/app_test.dart -d <udid-del-simulador>
```

### Android (emulador vía Android CLI)
```bash
~/.local/bin/android emulator start medium_phone
# esperar a que aparezca emulator-5554 en `flutter devices`
cd Spoti5_app
flutter test integration_test/app_test.dart -d emulator-5554
```

---

## 6. Lecciones para el futuro

- **Web/CanvasKit**: no confíes en `Semantics` alrededor de `ProgressBar` para tests de Playwright;
  expón la duración en los resultados de búsqueda (`TrackResult-...`) o usa widget tests de Flutter.
- **Web sin `dart:io`**: cualquier uso de `Platform` debe tener un stub para web en la misma carpeta
  que el import condicional.
- **integration_test**: `main()` es `void` y no hay `tester.waitFor`; usa bucles de `pump` con timeout.
- **iOS**: necesita `NSAllowsLocalNetworking` para hablar con `localhost`.
- **Android emulador**: usa `10.0.2.2` y requiere `INTERNET` + `usesCleartextTraffic` (HTTP).

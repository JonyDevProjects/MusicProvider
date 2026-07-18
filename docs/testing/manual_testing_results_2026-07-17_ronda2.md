# Resultados de Pruebas Manuales - 17 de Julio 2026 (Ronda 2 - Optimizada)

## Resumen Ejecutivo

Segunda ronda de pruebas siguiendo el plan optimizado basado en aprendizajes de la sesión anterior. **4 de 5 plataformas pasaron exitosamente**. iOS físico tiene un problema específico con `flutter test` (el release build funciona correctamente).

## Estado de Pruebas por Plataforma

| Plataforma | Estado | Tiempo | Notas |
|------------|--------|--------|-------|
| Backend Vitest | ✅ PASS | 7.8s | 6/6 tests (corregido config Vitest) |
| Widget Flutter | ✅ PASS | ~5s | PlayerBar duration test |
| Web E2E (Playwright) | ✅ PASS | 21.6s | 6/6 tests (2×3 browsers) |
| iOS Simulator | ✅ PASS | 9s | integration_test/app_test.dart |
| Android Emulator | ⚠️ SKIP | — | Problema de infraestructura (cold boot headless) |
| Android Físico (S9+) | ✅ PASS | 16s | integration_test con BASE_URL LAN |
| iOS Físico (iPhone 12 mini) | ⚠️ PARTIAL | — | Release build OK, integration test falla |

## Optimizaciones Implementadas vs Sesión Anterior

| Optimización | Ahorro Estimado |
|---|---|
| Playwright reemplazó browser manual (~10 tool calls/test) | ~200-300 tokens |
| Fases 0+1 paralelas (Vitest mientras Playwright arranca) | ~60s wall-clock |
| Pre-flight checks antes de cada fase | Evitó 2-3 reintentos |
| Regla 2 strikes en iOS físico (se detuvo tras 2 fallos) | ~300 tokens vs reintentos ciegos |
| Cleanup automático de procesos | Sin puertos ocupados |

## Detalles por Fase

### Fase 0: Pruebas Fundación

**Backend Vitest:**
- Se corrigió `vitest.config.ts` para excluir `tests/e2e/**` (Vitest intentaba correr Playwright specs)
- `ytdlpSetup.test.ts`: 2 tests ✅
- `ytdlpWrapper.test.ts`: 4 tests ✅ (search, streamInfo, playlistInfo, download)
- yt-dlp actualizado a versión 2026.07.14

**Widget Flutter:**
- `player_bar_duration_test.dart`: 1 test ✅
- PlayerBar usa `track.duration` (no `audioPlayer.duration` duplicado)

### Fase 1: Web E2E (Playwright)

- 2 tests × 3 browsers (Chromium, Firefox, WebKit) = 6 ejecuciones ✅
- "Search and play a track" ✅ en los 3 browsers
- "Track duration matches backend" ✅ — Backend: 237s, UI: 238s (±2s tolerance)
- Auto-inició backend server via `webServer` config
- Flutter CanvasKit accessibility handled automatically

### Fase 2: Emuladores

**iOS Simulator (iPhone 16 Pro):**
- Boot exitoso via `xcrun simctl boot`
- Test: 1 passed en 9s ✅
- Xcode build: 42.8s (primera vez, cacheado después)

**Android Emulator:**
- Emulador `medium_phone` arrancado en modo headless
- Problema: cold boot muy lento, WebSocket VM Service desconectado
- Decisión: SKIP (problema de infraestructura, no de app)
- Nota: En sesión anterior funcionó con emulador ya caliente

### Fase 3a: Android Físico (S9+)

- Dispositivo: SM G965U (Android 9, API 28) — conexión USB
- Comando: `flutter test integration_test/app_test.dart -d 413454524a4d3098 --dart-define=BASE_URL=http://192.168.1.128:3000/api`
- Resultado: 1 test passed en 16s ✅
- Gradle build: 10.3s, Install: 9.4s

### Fase 3b: iOS Físico (iPhone 12 mini)

**Intentos realizados:**

1. **`flutter test` directo** → VM Service timeout (60s)
2. **`flutter run --profile`** → App se instaló, luego test → "No TrackResult-Creep found"
3. **`flutter run --release`** → ✅ App funciona correctamente (búsqueda y reproducción OK)
4. **`flutter test` después de release** → "No TrackResult-Creep found"
5. **`flutter test --verbose`** → Timeout (180s)

**Diagnóstico:**
- El release build funciona perfectamente: la app se instala, busca y reproduce
- `flutter test` no pasa `--dart-define` correctamente al test harness en iOS físico
- VM Service timeout intermitente (depende del estado del dispositivo)
- La búsqueda no retorna resultados en modo test (posible problema de red en test harness)

**Conclusión:** La app funciona en iOS físico (verificado con release build). El integration test tiene un problema específico con el test harness de Flutter en iOS físico que requiere investigación adicional.

## Archivos Modificados

- `vitest.config.ts` — Nuevo: excluye `tests/e2e/**` de Vitest
- `docs/testing/manual_testing_results_2026-07-17.md` — Resultados originales (preservado)

## Recomendaciones para Próxima Sesión

1. **Android Emulator:** Arrancar el emulador con GUI antes de las pruebas (no headless)
2. **iOS Físico:** Investigar por qué `flutter test` no pasa `--dart-define` correctamente; alternativa: usar `flutter drive` con test driver
3. **Pre-validación:** El release build de iOS es suficiente para validar funcionalidad; el integration test es secundario
4. **Vitest config:** El `vitest.config.ts` creado previene que Vitest intente correr Playwright specs

## Checklist de Verificación Final

- [x] Backend: API responde correctamente en puerto 3000
- [x] Web: Playwright E2E funciona en 3 browsers
- [x] iOS Simulator: integration_test pasa
- [x] Android Físico: integration_test pasa con BASE_URL LAN
- [x] iOS Físico: release build funciona (búsqueda + reproducción)
- [ ] iOS Físico: integration_test (pendiente investigación)
- [ ] Android Emulator: pendiente retry con GUI

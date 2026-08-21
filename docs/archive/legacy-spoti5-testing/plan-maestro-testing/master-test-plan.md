# Plan Maestro de Testing — MusicProvider / Spoti5_app

> **Objetivo**: Establecer una visión clara del estado funcional y no funcional de la aplicación mediante una estrategia de testing metódica y precisa. Este documento sirve como punto de partida y hoja de ruta.

---

## 1. Arquitectura del Proyecto

MusicProvider es un proyecto **polyglot** con dos componentes principales:

### 1.1 Backend: MusicProvider (Node.js + TypeScript + Express)
- **src/server.ts** — Servidor Express (puerto 3000). Sirve static files de Flutter web en `/` y expone la API REST.
- **src/ytdlpWrapper.ts** — Wrapper de yt-dlp para: search, getStreamInfo, getPlaylistInfo, downloadTrack.
- **src/ytdlpSetup.ts** — Download/verification del binario yt-dlp por plataforma (bin/).
- **src/cli.ts** — Interfaz de línea de comandos.
- **Cache**: LRU cache (streamUrlCache, max: 100, TTL: 5 min) para stream URLs resueltos.
- **Endpoints API**:
  - GET /api/search?q=<query>&limit=N
  - GET /api/info?url=<youtube_url>
  - GET /api/audio/resolve?videoId=<id>
  - GET /api/audio/stream?videoId=<id> (proxy CDN con Range headers + keep-alive)
  - GET /api/playlist?url=<playlist_url>
  - POST /api/download (body: { url })

### 1.2 Frontend: Spoti5_app (Flutter)
- **Plataformas objetivo**: Android, iOS, macOS, Web.
- **Motor de audio**: audioplayers (Android) y just_audio (iOS/Web/macOS).
- **Estado**: Provider Pattern (PlayerProvider).
- **Strategy Pattern**: MusicServiceFactory.create() retorna servicios por plataforma:
  - Web: [ApiService()]
  - Mobile/Desktop: [ApiService(), YtExplodeService(), YtdlpNativeService?] (fallback encadenado)
- **ApiService**: HTTP cliente al backend (search, resolve, stream, warmup).
- **YtExplodeService**: youtube_explode_dart (búsqueda directa, fallback).
- **YtdlpNativeService**: Rust FFI (removido de deps, pero referenced en logs).

---

## 2. Estado Actual del Testing (Baseline)

### 2.1 Pruebas Automatizadas

| Capa | Framework | Archivos | Tests | Comando |
|------|-----------|----------|-------|---------|
| Backend unitario | Vitest | tests/ytdlpSetup.test.ts, tests/ytdlpWrapper.test.ts | 6 | npm run test |
| Backend API HTTP | — | — | 0 | — |
| Flutter unitario | flutter_test | test/widget_test.dart, test/services/* | 7 | cd Spoti5_app && flutter test |
| Flutter widget | flutter_test | test/player_bar_duration_test.dart | 1 | cd Spoti5_app && flutter test |
| Flutter integration | integration_test | integration_test/app_test.dart, playback_test.dart | 2 | cd Spoti5_app && flutter test integration_test/ |
| Web E2E | Playwright | tests/e2e/spoti5.spec.ts, tests/e2e/playpause_debug.spec.ts | 3 | npm run test:e2e |

Total automatizado actual: ~19 tests

### 2.2 Pruebas Manuales (históricas documentadas)

| Plataforma | Estado verificado | Archivo de referencia |
|---|---|---|
| Web (Chromium/Firefox/WebKit) | PASS - busqueda, play, PlayerBar, duracion | manual_testing_results_2026-07-17_ronda2.md |
| Android Emulator | PASS - integration_test | manual_testing_results_2026-07-17_ronda2.md |
| iOS Simulator | PASS - integration_test | manual_testing_results_2026-07-17_ronda2.md |
| Android fisico (S9+) | PASS - integration_test con BASE_URL LAN | manual_testing_results_2026-07-17_ronda2.md |
| iOS fisico (WiFi local) | PASS - release build, busqueda + play | manual-test-ios-physical-2026-07-28-post-fix.md |
| iOS fisico (Datos moviles/tunel) | Investigado - 403/CDN issues, ATS, IPv6 | investigation-ios-cellular-playback-failure.md, phase-1-test-report.md |
| iOS fisico integration_test | BLOQUEADO - Local Network Privacy Prompt + mDNS | manual_testing_results_2026-07-17_ronda3.md |

### 2.3 Limites Conocidos

| # | Limite | Solucion documentada |
|---|--------|---------------------|
| 1 | Flutter integration_test no soporta web | Usar Playwright para web |
| 2 | iOS fisico + flutter test | Local Network Privacy Prompt bloquea integration_test |
| 3 | Android emulator localhost | Usar 10.0.2.2 para el backend |
| 4 | iOS fisico localhost | --dart-define=BASE_URL=http://<MAC_IP>:3000/api |
| 5 | Cloudflare Tunnel efimero | URL caduca ~24h |
| 6 | DNS local no resuelve *.trycloudflare.com | curl --resolve con IP de 1.1.1.1 |
| 7 | yt-dlp Linux binary es glibc-linked | No funciona en Android (Bionic) |
| 8 | pumpAndSettle() hangea durante playback | Usar pump(Duration) con timeouts fijos |
| 9 | iOS Info.plist ATS | NSAllowsArbitraryLoads en Info.plist |
| 10 | Backend debe escuchar en 0.0.0.0 | app.listen(3000, '0.0.0.0') (ya configurado) |

---

## 3. Gap Analysis — Cobertura Faltante

### Cronicos (P0)
1. Tests HTTP para todos los endpoints API REST
2. Tests de LRU cache (HIT/MISS, TTL, eviction, max entries)
3. Tests de proxy streaming (Range headers, keep-alive, hop-by-hop filtering, client disconnect)

### Altos (P1)
4. Tests de PlayerProvider (play, pause, seek, state transitions, error handling, service fallback)
5. Tests de PlayerBar widget (play/pause icon toggle)
6. Playwright seek + error scenario tests
7. Tests de ApiService Flutter (HTTP client layer)
8. Tests de error handling en API (400 missing params, 500 yt-dlp failure)

### Medios (P2)
9. Tests de playlist y download endpoints
10. Cross-platform service fallback tests (strategy pattern)
11. Tests de accesibilidad (semantics/aria-labels en Flutter web)
12. Tests de rendimiento (timing assertions)
13. Tests de CLI
14. Test de Android physical resume() fix (play() + seek stream)
15. Plantilla de checklist de testing manual formalizada

---

## 4. Testing Pyramid

```
Nivel 5: E2E Multi-Plataforma
| Playwright (Web Chromium/Firefox/WebKit)
| Flutter integration_test (Android/iOS Sim/macOS)
| Manual matrix (iOS fisico, Android fisico)
| ~15 tests

Nivel 4: Plataforma/Service Integration
| PlayerProvider + Service strategy pattern
| ApiService HTTP client
| Backend API endpoint tests (supertest)
| ~20 tests

Nivel 3: Backend Service
| Vitest: ytdlpWrapper, LRU cache, proxy/streaming
| HTTP tests para cada endpoint (supertest)
| ~15 tests

Nivel 2: Flutter Widget/Unit
| Flutter: PlayerBar, search results, error states
| Factory + service selection tests
| ~15 tests

Nivel 1: Backend Unit
| Vitest: ytdlpSetup, ytdlpWrapper (actual)
| Config/timing/helpers (no real YouTube calls)
| ~10 tests
```

---

## 5. Fases del Plan Maestro

### Fase 0: Baseline Establishment (1-2 dias)
Objetivo: Documentar el estado actual, establecer metricas baseline, formalizar checklist.

1. Ejecutar todos los tests existentes y registrar resultados en TEST-MATRIX.md
2. Crear docs/testing/TEST-MATRIX.md — Matriz de cobertura feature x plataforma
3. Crear docs/testing/test-checklist.md — Checklist formalizado para testing manual
4. Guardar baseline en Engram: resultados, tiempo de cada suite, cobertura % estimada

### Fase 1: Backend API Coverage (3-4 dias)
Objetivo: Cubrir todos los endpoints HTTP con tests.

1. Instalar supertest como dev dependency
2. Tests para cada endpoint:
   - GET /api/search — 200 success, 400 missing q, 500 yt-dlp failure (mock)
   - GET /api/info — 200 success, 400 missing url
   - GET /api/audio/resolve — 200 success, 400 missing videoId, cache HIT/MISS
   - GET /api/audio/stream — 206 partial, Range header forwarding, client disconnect
   - GET /api/playlist — 200 success, 400 missing url
   - POST /api/download — 200 success, 400 missing url
   - Static file serving (/)
3. Tests de LRU cache — HIT/MISS, TTL eviction, max 100 entries, failed entries no cached
4. Tests de proxy streaming — Range header pasa al CDN, Content-Range reenviado, keep-alive
5. Mocking strategy: mock yt-dlp binary en CI + un test de integracion con yt-dlp real en local

### Fase 2: Flutter Service & Provider Coverage (3-4 dias)
Objetivo: Cubrir la logica de negocio del cliente Flutter.

1. Tests para MusicServiceFactory (existentes) — OK
2. Tests para PlayerProvider — mock de MusicService, validar:
   - playTrack -> estado playing, position avanza
   - togglePlayPause -> play -> pause -> play
   - seek -> position cambia
   - Error handling -> estado error
   - Service fallback (ApiService -> YtExplodeService)
3. Tests para ApiService — mock HTTP, validar:
   - searchTracks -> parsea respuesta JSON
   - getStream -> retorna URL + metadata
   - warmupCache -> fire-and-forget
   - BASE_URL resolution
4. Tests para PlayerBar widget — ampliar:
   - Toggle play/pause muestra icon correcto
   - Seeking actualiza posicion

### Fase 3: Expanded E2E Coverage (3-5 dias)
Objetivo: Cubrir flujos criticos end-to-end que faltan.

1. Playwright (Web) — ampliar spoti5.spec.ts:
   - "Seek to 50% and verify playback resumes"
   - "No results message when searching for non-existent query"
   - "Playback starts within X seconds of selecting result"
   - "Pause and resume preserves position"
   - "CORS preflight and streaming validation via remote Proxy/Tunnel"
2. Flutter integration_test — ampliar app_test.dart:
   - "Toggle play/pause changes icon"
   - "Seek bar updates position during playback"
   - "Fallback to YtExplodeService when primary Proxy fails (502/Timeout)"
   - "Handle connection drop during proxy streaming gracefully"

### Fase 4: Manual Test Formalization + Perf (2-3 dias)
Objetivo: Formalizar testing manual y anadir testing de rendimiento.

1. Template de manual test session
2. Performance baseline tests — curl-based timing
3. Accessibility checklist

### Fase 4.5: Optimización de Búsqueda (Desvío Post-Perf)
Objetivo: Mitigar el overhead de ~1.7s de yt-dlp en el endpoint de búsqueda descubierto durante el baseline.

1. Implementar y probar Opción A (Cliente Flutter híbrido con youtube_explode_dart).
2. Implementar y probar Opción B (Backend Node.js con yt-search/youtubei.js).
3. Re-evaluar performance y asegurar que las pruebas E2E/Unit de fases anteriores siguen pasando.

### Fase 5: CI/CD Pipeline (2-3 dias)
Objetivo: Automatizar todo en CI.

1. GitHub Actions workflow (.github/workflows/test.yml)
2. Test coverage reporting
3. Scheduled manual test runs para iOS fisico

---

## 6. Matriz de Comandos de Testing

| Que | Comando | Requisitos |
|-----|---------|------------|
| Backend unit (Vitest) | npm run test | yt-dlp binary en bin/ |
| Backend API (supertest, post-Fase 1) | npm run test | Mock yt-dlp en CI |
| Flutter unit/widget | cd Spoti5_app && flutter test | Flutter SDK |
| Flutter integration (emulador) | cd Spoti5_app && flutter test integration_test/app_test.dart -d <device> | Emulador, backend en 0.0.0.0:3000 |
| Web E2E (Playwright) | npm run test:e2e | Backend auto-arranca via webServer |
| Web E2E con tunel | BASE_URL=https://<tunnel>.trycloudflare.com/api npm run test:e2e | Tunnel activo, rebuild web |
| iOS fisico (manual) | flutter run --release -d <udid> --dart-define=BASE_URL=http://<MAC_IP>:3000/api | Xcode, certificado, Developer Mode |
| Android fisico (manual) | flutter run --release -d <id> --dart-define=BASE_URL=http://<MAC_IP>:3000/api | USB debugging |

---

## 7. Prioridad de Implementacion

| Prioridad | Gap | Razon |
|-----------|-----|-------|
| P0 | Backend API HTTP tests | Mas critico: no hay cobertura de los endpoints |
| P0 | LRU cache tests | Funcionalidad de performance critica |
| P1 | PlayerProvider tests | Núcleo de la lógica de reproducción |
| P1 | Playwright seek + error tests | Cubre flujos no validados |
| P2 | ApiService Flutter tests | Capa de red cliente |
| P2 | Manual test checklist template | Formaliza lo documentado |
| P3 | CI/CD pipeline | Automatización completa |

---

## 8. Hoja de Ruta Sugerida

Se recomienda comenzar con **Fase 0 + Fase 1** (baseline + backend API tests):

1. Es el layer más bajo de la pirámide y bloquea todo lo demás
2. No requiere devices físicos
3. Establece el baseline numérico de referencia
4. El backend es el corazón del sistema — sin tests HTTP, nada está validado bajo test real


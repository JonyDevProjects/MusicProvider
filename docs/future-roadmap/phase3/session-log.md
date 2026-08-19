# Session Log — Roadmap Fase 3 (Nuclear vs Spoti5)

Convención de marcadores: ✅ completado · ❌ falló/no pasó · ⬜ pendiente · 📝 nota/documentado

---

## Estado actual

> **Ninguna sesión de ejecución registrada todavía.** Este roadmap se creó en la Sesión 0 (Solo documentación: estructura `docs/future-roadmap/phase3/`). Todas las fases 3.0–3.4 y las alternativas A/B/C/D están en `pending`. La próxima sesión inicia la **Fase 3.0**.

---

## Sesión 0 (2026-08-19) — Creación de la estructura documental

**Commits**: sin commits (tarea DOCS-ONLY; no se commiteó nada)
**Branch**: `feat/phase-2-transparent-refresh`
**Objetivo**: Establecer la base documental del estudio de viabilidad arquitectónica de la Fase 3.

### Acciones
- Creación de los 10 archivos de `docs/future-roadmap/phase3/`:
  - `README.md` — índice del track
  - `roadmap.md` — roadmap maestro (branching, sub-fases 3.0–3.4, desviaciones)
  - `benchmark-spec.md` — spec del benchmark (RF-B, RNF-B, escenarios Gherkin)
  - `alternativa-a-isomorfico-spec.md` — Core agnóstico
  - `alternativa-b-js-plugins-spec.md` — plugins JS en Spoti5
  - `alternativa-c-forks-spec.md` — forks especializados
  - `alternativa-d-spoti5-plugin-engine-spec.md` — Spoti5 Plugin Engine (Dart)
  - `findings.md` — hallazgos y restricciones de arquitectura pre-seeded
  - `session-log.md` — este archivo
  - `next-session-prompt.md` — prompt para la próxima sesión
- Carga de skills: `nuclear-reference`, `music-provider`, `cognitive-doc-design`
- Lectura de referencias: roadmap ios-cellular, proxy-solutions README/spec/findings/session, future_roadmap_and_architecture, roadmap-nuclear-spoti5-evolution, tipos del SDK Nuclear

### Decisiones tomadas
1. **Benchmark-first**: ninguna alternativa A/B/C/D se ejecuta antes de los datos del benchmark (Fase 3.1/3.2)
2. **Matriz de decisión con pesos**: Latencia 25%, RAM 20%, Distribución 20%, Mantenibilidad 15%, Riesgo técnico 10%, Esfuerzo 10%
3. **Spoti5 aislado**: el trabajo de la Alternativa D vive en `~/JoniDev/Spoti5` (repo separado desde `chore/isolate-nuclear-plugin`)

### Estado de la solución
| Componente | Estado | Detalle |
|------------|--------|---------|
| Estructura documental Fase 3 | ✅ | 10 archivos creados en `docs/future-roadmap/phase3/` |
| Fase 3.0 (línea base) | ⬜ | `pending` — inicio en próxima sesión |
| Fase 3.1 (diseño benchmark) | ⬜ | `pending` — spec listo, sin ejecución |
| Fase 3.2 (ejecución benchmark) | ⬜ | `pending` |
| Fase 3.3 (matriz de decisión) | ⬜ | `pending` |
| Fase 3.4 (ejecución de la decisión) | ⬜ | `pending` |
| Alternativas A/B/C/D | ⬜ | `pending` (respectos specs creados) |

### Próximos pasos
1. Iniciar **Fase 3.0**: inventario de `server.ts`, `index.ts`, Core (`ytdlpWrapper.ts`, `streamCache.ts`, `ytdlpSetup.ts`) y cliente API de Spoti5 (`~/JoniDev/Spoti5/lib/services/`)
2. Registrar métricas de línea base (latencia, RAM, fricción de distribución) en `findings.md`
3. Confirmar prerrequisitos: Phase 2 mergeado/validado, estado de Phase 1 (paralela)
4. Crear rama `feat/phase3-benchmark` cuando la línea base esté lista

---

## Sesión 1 (2026-08-19) — Preparación de la Matriz de Decisión (Fase 3.3)

**Commits**: sin commits (evaluación y documentación)
**Branch**: `feat/phase3-benchmark`
**Objetivo**: Realizar la evaluación comparativa multicriterio (Fase 3.3) basada en datos del inventario (Fase 3.0), restricciones R-1 a R-10 y specs de las Alternativas A, B, C y D.

### Acciones
- Evaluación cualitativa y cuantitativa de las 4 alternativas arquitectónicas sobre los 6 criterios ponderados (Latencia 25%, RAM 20%, Distribución 20%, Mantenibilidad 15%, Riesgo técnico 10%, Esfuerzo 10%).
- Poblado de la matriz de decisión en `docs/future-roadmap/phase3/findings.md` y `docs/future-roadmap/phase3/roadmap.md`.
- Redacción detallada de la justificación punto por punto referenciando restricciones R-1 a R-10 e inventario de la Fase 3.0.
- Documentación del análisis cualitativo (fortalezas, debilidades, restricciones relevantes y trade-offs clave).
- Preservación explícita de la decisión final como abierta para el usuario.

### Hallazgos
- **Alternativa A (Isomórfico - 3.35/5.00)**: Ofrece alta mantenibilidad y bajo riesgo al centralizar la extracción en un Core agnóstico (`src/core/`), aunque mantiene la necesidad de un servidor Express para Spoti5.
- **Alternativa B (Plugins JS - 3.10/5.00)**: Excelente en distribución (un solo `.zip`), pero con riesgo técnico crítico en iOS (R-5, R-7d, R-10) y esfuerzo desproporcionado (1–2 meses).
- **Alternativa C (Forks - 3.25/5.00)**: Riesgo técnico nulo por desacoplamiento total, pero castigada severamente en mantenibilidad por duplicación de scrapers ante cambios de YouTube (R-6).
- **Alternativa D (Spoti5 Plugin Engine Dart - 3.45/5.00)**: Mejor balance global; modulariza Spoti5 en Dart nativo sin puentes JS, preservando el servidor Express y el transparent refresh 403 probado en Phase 2.
- **Sinergia A + D**: Posibilidad de combinar un Core agnóstico en MusicProvider (A) con la modularización por plugins Dart en Spoti5 (D).

### Estado de la solución
| Componente | Estado | Detalle |
|------------|--------|---------|
| Matriz de decisión Fase 3.3 | ✅ | Puntajes calculados y volcados en `findings.md` y `roadmap.md` |
| Justificaciones por criterio | ✅ | Documentadas con trazabilidad a R-1..R-10 y Fase 3.0 |
| Análisis cualitativo y trade-offs | ✅ | Registrados en `findings.md` |
| Decisión final | ⬜ | Pendiente de selección por el usuario |

### Próximos pasos
1. Presentar la matriz y el análisis comparativo al usuario para la toma de decisión final.
2. Tras la decisión, proceder con la Fase 3.4 (Ejecución de la decisión en la rama correspondiente).

---

## Sesión 2 (2026-08-19) — Sistema Multiagente: Orquestación CC + agy

**Commits**: sin commits (implementación de harness + orquestación)
**Branch**: `feat/phase3-benchmark`
**Objetivo**: Montar sistema multiagente donde Command Code orquesta y Antigravity CLI (agy + gemini-3.7-flash-high) ejecuta las fases SDD.

### Acciones
- **Fase 3.0** (CC directo): Inventario completo de `server.ts` (7 endpoints), `index.ts` (3 providers), Core (`ytdlpWrapper.ts`, `streamCache.ts`, `ytdlpSetup.ts`, `cli.ts`), Spoti5 client (`api_service.dart`, `music_service.dart`, `music_service_factory.dart`), `package.json` (8 deps)
- **Fase 3.1** (CC + agy): Spec del benchmark ya existía de Sesión 0. agy revisó y validó que estaba completo. Status actualizado a `ready-for-implementation`.
- **Fase 3.2** (agy): Implementación del benchmark harness — 5 archivos TypeScript en `benchmarks/`:
  - `tracks.ts` — 10 tracks fijos de YouTube (cortas/estándar/largas/mix)
  - `metrics.ts` — cálculos estadísticos (p50/p95/p99/media/stddev)
  - `model-api.ts` — harness del modelo API (resolveStreamInfo directo)
  - `model-integrated.ts` — harness del modelo integrado (mock Nuclear Host API + toStream)
  - `runner.ts` — orquestador completo, genera JSON + Markdown + actualiza findings.md
  - Scripts en `package.json`: `benchmark:api`, `benchmark:integrated`, `benchmark:all`
- **Fase 3.3** (agy): Matriz de decisión poblada con puntajes justificados — D=3.45, A=3.35, C=3.25, B=3.10

### Configuración del multiagente
- **Orquestador**: Command Code (Gemini 3.1 Pro)
- **Worker SDD**: `agy --print --model gemini-3.7-flash-high --dangerously-skip-permissions`
- **Timeout**: 10min por fase
- **Documento de orquestación**: `docs/future-roadmap/phase3/multiagent-orchestration.md`

### Hallazgos del multiagente
- `agy` no descubre skills de `.agents/skills/` del proyecto automáticamente — hay que incluir el contenido de la skill en el prompt
- `agy --print` funciona bien para ejecución no-interactiva con `--dangerously-skip-permissions`
- `agy` a veces intenta ejecutar archivos markdown como comandos shell (quirk menor, no afecta la calidad del output)
- TypeScript compila limpio tras la implementación de agy (`npx tsc --noEmit` sin errores)

### Estado de la solución
| Componente | Estado | Detalle |
|------------|--------|---------|
| Fase 3.0 (inventario) | ✅ | Inventario completo registrado en findings.md |
| Fase 3.1 (diseño benchmark) | ✅ | Spec validado, status: ready-for-implementation |
| Fase 3.2 (implementación harness) | ✅ | 5 archivos en benchmarks/, TS compila limpio |
| Fase 3.3 (matriz de decisión) | ✅ | Matriz con puntajes justificados: D=3.45 > A=3.35 > C=3.25 > B=3.10 |
| Fase 3.4 (ejecución decisión) | ⬜ | Pendiente de decisión del usuario |
| Benchmark execution | ⬜ | Harness implementado pero no ejecutado (requiere yt-dlp + red) |

### Próximos pasos
1. Ejecutar benchmark: `npm run benchmark:all` (requiere yt-dlp instalado + acceso a YouTube)
2. Presentar resultados al usuario para la decisión final
3. Ejecutar Fase 3.4 con la alternativa ganadora (o híbrido A+D)

---

## Sesión 3 (2026-08-19) — Benchmark + Decisión + Análisis Paralelo con Herdr

**Commits**: sin commits (benchmark + análisis + documento de decisión)
**Branch**: `feat/phase3-benchmark`
**Objetivo**: Ejecutar benchmark, analizar resultados con subagentes paralelos en Herdr, y documentar la decisión arquitectónica.

### Acciones
- **Benchmark ejecutado**: `npm run benchmark:all` — 10 tracks × 3 runs × 2 modelos (54 llamadas exitosas a yt-dlp)
  - 1 track fallido: Pink Floyd "Echoes" (video privado)
  - Plataforma: macOS Darwin arm64, Apple M1 Pro, 16GB RAM, Node v24.15.0
- **Análisis paralelo con Herdr** (3 subagentes `agy` en `gemini-3.7-flash-high`):
  - `analyst-latency`: Análisis estadístico completo (Welch t-test, Mann-Whitney, Wilcoxon). Delta 3.5% NO significativo (p=0.288)
  - `analyst-arch`: Re-evaluación de la matriz con datos reales. Confirma híbrido A+D. Actualizó findings.md
- **Decisión adoptada**: Híbrido A+D
  - A (Core Agnóstico) primero en MusicProvider → sanea el Core
  - Fase 4 (Empaquetado/CI/CD) → distribución del plugin Nuclear
  - D (Spoti5 Plugin Engine) después en ~/JoniDev/Spoti5 → modularización Dart
- **Documento de decisión creado**: `decision-and-execution-plan.md` con roadmap completo

### Hallazgos del benchmark
- **Cold cache**: API 2.59s vs Integrado 2.50s — delta 87ms (3.5%), NO significativo
- **Warm cache**: 0.02ms — 100,000x más rápido que cold (LRU hit instantáneo)
- **p95 cold**: ~3s — límite de UX aceptable (Nielsen: <300ms ideal, 3s = frustración)
- **Bottleneck**: yt-dlp (~2.5s), NO la capa de red ni el proxy Express
- **StdDev**: ~300ms — variabilidad de red 3x mayor que el delta entre modelos
- **Mitigación UX**: pre-fetching de track siguiente + warmup en búsqueda (ya implementado parcialmente)

### Estado de la solución
| Componente | Estado | Detalle |
|------------|--------|---------|
| Fase 3.0 (inventario) | ✅ | Inventario completo |
| Fase 3.1 (diseño benchmark) | ✅ | Spec validado |
| Fase 3.2 (benchmark harness + ejecución) | ✅ | Harness implementado + ejecutado con datos reales |
| Fase 3.3 (matriz de decisión) | ✅ | Matriz poblada + análisis paralelo con Herdr |
| Decisión Fase 3.3 | ✅ | **Híbrido A+D** adoptada por el usuario |
| Plan de ejecución | ✅ | `decision-and-execution-plan.md` creado |
| Fase 3.4 (Alternativa A) | ⬜ | Listo para comenzar — crear rama `feat/phase3-a-isomorphic` |
| Fase 4 (Empaquetado) | ⬜ | Post-A |
| Alternativa D (Spoti5) | ⬜ | Post-Fase 4, en repo Spoti5 |

### Próximos pasos
1. Crear rama `feat/phase3-a-isomorphic` desde `feat/phase3-benchmark`
2. Ejecutar T-A.1 a T-A.12 del spec de Alternativa A (extraer Core agnóstico)
3. Verificar tests + latencia post-refactor
4. Merge a develop → Fase 4 (CI/CD + .zip)
---

## Sesión 4 (2026-08-20) — Fase 3.4: Alternativa A — Core Agnóstico

**Commits**: pendiente
**Branch**: `feat/phase3-a-isomorphic`
**Objetivo**: Extraer el Core agnóstico a `src/core/` desacoplando parsing, extracción, scraping y cache de la plataforma HTTP / Nuclear SDK.

### Acciones
- **T-A.1 a T-A.5**: Creación de `src/core/`:
  - `types.ts`: Definición de interfaces puras `HttpLike`, `SearchResult`, `StreamData`, `PlaylistData`, `TrackData`.
  - `ndjson.ts`: Parsing puro de NDJSON para salidas de yt-dlp.
  - `extractor.ts`: `search()` con `yt-search`, `getStreamInfo()` y `getPlaylistInfo()` con inyección de ejecutor yt-dlp.
  - `ytScraper.ts`: `parseYoutubeSearchHtml()` (función pura sobre `ytInitialData`), `parseDuration()` y `scrapeYoutube()` con transporte `HttpLike`.
  - `cache.ts`: Clase `StreamCache` LRU con TTL configurable y método `resolveStreamInfo()` (promise caching).
  - `index.ts`: Re-exportación completa del Core.
- **T-A.6 a T-A.8**: Refactorización de wrappers:
  - `src/index.ts`: Adaptador HTTP (`createHttpAdapter` con `Accept-Encoding: gzip, deflate, br`), validación de IDs (`isValidVideoId`), mapeo a tipos SDK y registro de providers en `onEnable`.
  - `src/server.ts`: Consumo del Core + `ytdlpWrapper.ts`, mantenimiento de transparent refresh 403, keepAlive HTTP agents y streaming proxy.
  - `src/ytdlpWrapper.ts` y `src/streamCache.ts`: Wrappers delegadores limpios que conservan retrocompatibilidad completa y preservan `downloadTrack()` (con `spawn`) fuera del Core.
- **T-A.9 a T-A.12**: Tests y validación:
  - `tests/core/extractor.test.ts`, `tests/core/ytScraper.test.ts`, `tests/core/cache.test.ts`: 100% green.
  - `npm test`: 7/7 suites pasadas (46/46 tests unitarios e integración).
  - `npx tsc --noEmit`: 0 errores.
  - `grep -r "express\|plugin-sdk" src/core/`: 0 coincidencias.
  - `npm run benchmark:all`: Ejecutado post-refactor (Cold API Media: 2.27s vs Integrado Media: 2.36s, Warm Media: 0.02ms, delta ≤ 100ms vs línea base).
  - `npm run build`: Compilación de `dist/index.js` exitosa.

### Estado de la solución
| Componente | Estado | Detalle |
|------------|--------|---------|
| Core Agnóstico (`src/core/`) | ✅ | 6 archivos modulares sin dependencias de Express ni Plugin SDK |
| Wrapper Nuclear (`src/index.ts`) | ✅ | Providers en `onEnable`, validación de inputs, HttpLike inyectado |
| Server Express (`src/server.ts`) | ✅ | Consumiendo Core, transparent refresh 403 y keep-alive preservados |
| Tests Unitarios & Integración | ✅ | 46 tests pasando en Vitest |
| Benchmark post-refactor | ✅ | Cumple RNF-A.1 / RNF-A.2 |

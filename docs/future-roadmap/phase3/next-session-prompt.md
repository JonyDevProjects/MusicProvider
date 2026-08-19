# Prompt para próxima sesión — Fase 3.4: Alternativa A (Core Agnóstico)

## Resumen de estado

**Fase**: 3.4 — Ejecución de la decisión (Alternativa A)
**Decisión adoptada**: Híbrido A+D (benchmark Fase 3.2 + matriz Fase 3.3 + análisis paralelo Herdr)
**Branch actual**: `feat/phase3-benchmark` → crear `feat/phase3-a-isomorphic`
**Documento maestro**: `docs/future-roadmap/phase3/decision-and-execution-plan.md`
**Spec detallado**: `docs/future-roadmap/phase3/alternativa-a-isomorfico-spec.md`

---

## Qué leer primero (en este orden)

1. `docs/future-roadmap/phase3/decision-and-execution-plan.md` — la decisión y el plan completo (A → Fase 4 → D)
2. `docs/future-roadmap/phase3/alternativa-a-isomorfico-spec.md` — spec de la Alternativa A (RF-A.1 a RF-A.5, escenarios Gherkin, riesgos)
3. `docs/future-roadmap/phase3/findings.md` — restricciones R-1 a R-10 + resultados del benchmark
4. `.agents/AGENTS.md` — convenciones del proyecto (ESM, .js imports, desacoplamiento)
5. `src/ytdlpWrapper.ts` — código que se extrae al Core (240 líneas)
6. `src/streamCache.ts` — cache que se extrae al Core (33 líneas)
7. `src/index.ts` — wrapper Nuclear actual (270 líneas, se refactoriza)
8. `src/server.ts` — wrapper Express actual (256 líneas, se refactoriza)

---

## Checklist completo de la sesión

### Setup
- [ ] Crear rama `feat/phase3-a-isomorphic` desde `feat/phase3-benchmark`
- [ ] Verificar que `npm test` pasa antes de empezar (baseline)
- [ ] Verificar que `npx tsc --noEmit` no tiene errores

### Fase 1: Extracción del Core (`src/core/`)

**T-A.1**: Crear `src/core/types.ts`
- [ ] Definir `HttpLike` (interfaz de transporte HTTP inyectable)
- [ ] Definir `TrackData`, `StreamData`, `SearchResult`, `PlaylistEntry`, `PlaylistData`
- [ ] Verificar: NO importa de `express` ni `@nuclearplayer/plugin-sdk`

**T-A.2**: Crear `src/core/extractor.ts`
- [ ] Mover `search()` desde `ytdlpWrapper.ts` (usa `yt-search`)
- [ ] Mover `getStreamInfo()` desde `ytdlpWrapper.ts` (usa yt-dlp binary vía `execFile`)
- [ ] Mover `getPlaylistInfo()` desde `ytdlpWrapper.ts` (incluye NDJSON parsing)
- [ ] Mover helpers: `normalizeUrl()`, `parseNdjson()`
- [ ] `downloadTrack()` NO se mueve (usa `spawn`, prohibido en Core por R-7d)

**T-A.3**: Crear `src/core/ytScraper.ts`
- [ ] Extraer `scrapeYoutube()` desde `index.ts`
- [ ] Crear función pura `parseYoutubeSearchHtml(html: string, limit: number): SearchResult[]`
- [ ] Crear función con HTTP `scrapeYoutube(http: HttpLike, query: string, limit: number)`
- [ ] Aceptar `HttpLike` como parámetro (en vez de `api.Http.fetch` directo)

**T-A.4**: Crear `src/core/cache.ts`
- [ ] Mover `resolveStreamInfo()`, `streamUrlCache`, `CACHE_TTL` desde `streamCache.ts`
- [ ] TTL configurable por wrapper
- [ ] Mantener lógica de "cache la promesa, no el resultado"

**T-A.5**: Crear `src/core/index.ts`
- [ ] Re-exportar todo: tipos, extractor, scraper, cache

### Fase 2: Refactor de Wrappers

**T-A.6**: Refactor `src/index.ts`
- [ ] Importar desde `./core/index.js` en vez de `./ytdlpWrapper.js` y `./streamCache.js`
- [ ] Adaptar `api.Http.fetch` al interfaz `HttpLike` (wrapper inline)
- [ ] Mantener: providers en `onEnable`, `toStream()`, `toStreamCandidate()`, `sdkToInternal()`
- [ ] Verificar: `source.provider` coincide con `STREAMING_ID` (R-3)
- [ ] Verificar: `Accept-Encoding: gzip, deflate, br` inyectado (R-2)

**T-A.7**: Refactor `src/server.ts`
- [ ] Importar desde `./core/index.js` en vez de `./ytdlpWrapper.js` y `./streamCache.js`
- [ ] `downloadTrack()` se queda importando de `ytdlpWrapper.ts`
- [ ] Mantener: proxy streaming, transparent refresh 403, keep-alive agents, warmup

**T-A.8**: Verificar `ytdlpWrapper.ts` residual
- [ ] Solo contiene `downloadTrack()` y `runYtdlp()`
- [ ] `cli.ts` sigue importando de aquí para `downloadTrack()`

### Fase 3: Tests y Verificación

**T-A.9**: Tests del Core
- [ ] Crear `tests/core/extractor.test.ts` — mock de yt-dlp, testear search/getStreamInfo/getPlaylistInfo
- [ ] Crear `tests/core/ytScraper.test.ts` — HTML pregrabado de YouTube, testear parsing
- [ ] Crear `tests/core/cache.test.ts` — LRU con TTL configurable

**T-A.10**: Verificación de aislamiento
- [ ] `grep -r "express\|plugin-sdk" src/core/` → 0 matches
- [ ] `grep -r "parseNdjson\|ytInitialData" src/ --include='*.ts'` fuera de `src/core/` → 0 matches

**T-A.11**: Tests existentes pasan
- [ ] `npm test` → 100% green
- [ ] `npx tsc --noEmit` → sin errores

**T-A.12**: Benchmark post-refactor
- [ ] `npm run benchmark:all` → delta ≤ 100ms en p95 vs línea base
- [ ] Línea base: API cold p95 = 2.95s, Integrated cold p95 = 3.01s

**T-A.13**: Verificación de transparent refresh 403
- [ ] `NODE_ENV=development npx tsx src/server.ts`
- [ ] curl stream con URL vieja → verificar regeneración sin error

### Cierre
- [ ] Commit en rama `feat/phase3-a-isomorphic`
- [ ] Actualizar `findings.md` (sección Fase 3.4)
- [ ] Actualizar `session-log.md`
- [ ] Guardar en Engram

---

## Estructura propuesta de `src/core/`

```
src/core/
├── types.ts          # TrackData, StreamData, SearchResult, PlaylistData, HttpLike
├── extractor.ts      # search(), getStreamInfo(), getPlaylistInfo() — usa HttpLike
├── ytScraper.ts      # scrapeYoutube(httpLike, query, limit) + parseYoutubeSearchHtml(html, limit)
├── cache.ts          # resolveStreamInfo(), LRU cache con TTL configurable
└── index.ts          # Re-exporta todo el Core
```

### Interfaz `HttpLike` (clave del desacoplamiento)

```typescript
export interface HttpLike {
  fetch(url: string, init?: {
    headers?: Record<string, string>;
    method?: string;
  }): Promise<{
    status: number;
    body: string;
    headers?: Record<string, string>;
  }>;
}
```

- **Nuclear**: `api.Http.fetch` (con `Accept-Encoding: gzip, deflate, br`)
- **Express**: `node-fetch` o `axios`
- **Tests**: doble mock que devuelve HTML/JSON pregrabado

---

## Mapeo de archivos actuales → Core

| Archivo actual | Se mueve a | Qué NO se mueve |
|----------------|------------|-----------------|
| `ytdlpWrapper.ts` → `search()` | `core/extractor.ts` | |
| `ytdlpWrapper.ts` → `getStreamInfo()` | `core/extractor.ts` | |
| `ytdlpWrapper.ts` → `getPlaylistInfo()` | `core/extractor.ts` | |
| `ytdlpWrapper.ts` → `downloadTrack()` | | Se queda en `ytdlpWrapper.ts` (usa `spawn`) |
| `streamCache.ts` | `core/cache.ts` | |
| `index.ts` → `scrapeYoutube()` | `core/ytScraper.ts` | |
| `ytdlpSetup.ts` | | NO se mueve (solo Express/CLI) |

---

## Datos de línea base del benchmark (para comparar post-refactor)

| Métrica | API Model | Integrated Model |
|---------|-----------|-----------------|
| Cold Media | 2.59s | 2.50s |
| Cold p50 | 2.57s | 2.46s |
| Cold p95 | 2.95s | 3.01s |
| Cold p99 | 3.45s | 3.26s |
| Warm Media | 0.02ms | 0.01ms |
| StdDev | 308ms | 279ms |

**Umbral post-refactor**: delta ≤ 100ms en p95 vs estos valores.

**Benchmark track que falló**: Pink Floyd "Echoes" (bM7SZ5SBzyY) — video privado, se ignora en comparación.

---

## Restricciones de arquitectura (R-1 a R-10, resumen)

| # | Restricción | Relevancia para A |
|---|-------------|-------------------|
| R-1 | Nuclear no tiene HTTP nativo; plugins usan `api.Http.fetch` | Core define `HttpLike`; wrapper Nuclear inyecta `api.Http.fetch` |
| R-2 | `api.Http.fetch` requiere `Accept-Encoding: gzip, deflate, br` | Wrapper Nuclear lo inyecta, NO el Core |
| R-5 | `api.Ytdlp.getStream` delega a Rust | Wrapper Nuclear lo llama, NO el Core |
| R-7d | `child_process.spawn` PROHIBIDO en plugins TS | `downloadTrack()` NO va al Core |
| R-8 | Providers se registran en `onEnable`, NO en `onLoad` | Wrapper Nuclear preserva esto |
| R-9 | Spoti5 vive en repo separado | Core no depende de Spoti5 |
| R-10 | iOS celular requiere backend intermedio | Express se mantiene como componente estratégico |

---

## Convenciones críticas del proyecto

1. **ESM obligatorio**: TODAS las importaciones locales terminan en `.js`
2. **Core sin dependencias de plataforma**: 0 imports de `express`, `@nuclearplayer/plugin-sdk`, `http`, `https`
3. **Tests con Vitest**: framework existente, no cambiar
4. **Commits**: formato convencional con heredoc + `Co-authored-by: CommandCodeBot <noreply@commandcode.ai>`
5. **Desacoplamiento máximo**: el Core no sabe nada de `req`/`res`, `api`, ni SDK

---

## Verificación final (checklist de cierre)

- [ ] `src/core/` creado con 5 archivos
- [ ] `grep -r "express\|plugin-sdk" src/core/` = 0 matches
- [ ] `src/index.ts` consume Core, providers en `onEnable`
- [ ] `src/server.ts` consume Core, transparent refresh 403 funciona
- [ ] `downloadTrack()` NO está en el Core
- [ ] `npm test` pasa (existentes + nuevos)
- [ ] `npx tsc --noEmit` sin errores
- [ ] `npm run benchmark:all` → delta ≤ 100ms vs línea base
- [ ] Commit en `feat/phase3-a-isomorphic`
- [ ] findings.md, session-log.md y Engram actualizados

---

## Secuencia completa (después de esta sesión)

1. **Esta sesión** (Alternativa A): Core agnóstico + wrappers refactorizados
2. **Siguiente** (Fase 4): CI/CD GitHub Actions + `.zip` automatizado del plugin Nuclear
3. **Futuro** (Alternativa D, en Spoti5): `spoti5_plugin_sdk` + PluginRegistry + ApiService plugin

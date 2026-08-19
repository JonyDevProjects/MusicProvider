# Decisión y Plan de Ejecución — Fase 3 (Híbrido A+D)

**Fecha**: 2026-08-19
**Decisión**: Híbrido A+D — Core Agnóstico (A) + Spoti5 Plugin Engine (D)
**Prioridad**: Alternativa A → Fase 4 → Alternativa D (en Spoti5)
**Rama base**: `feat/phase3-benchmark`
**Rama de trabajo**: `feat/phase3-a-isomorphic`

---

## 1. La Decisión

Tras ejecutar el benchmark (Fase 3.2), la matriz de decisión (Fase 3.3), y el análisis paralelo con subagentes, se concluye:

| Dato | Resultado |
|------|-----------|
| Delta de latencia API vs Integrado | **+87ms (3.5%) — NO estadísticamente significativo** (Welch p=0.288) |
| Bottleneck identificado | **yt-dlp** (~2.5s cold), NO la capa de red |
| Warm cache | **0.02ms** — 100,000x más rápido que cold |
| p95 cold cache | **~3s** — en el límite de UX aceptable |
| Alternativa ganadora | **D (3.45/5)** con sinergia hacia **A (3.35/5)** |
| Decisión adoptada | **Híbrido A+D**: A primero en MusicProvider, D después en Spoti5 |

### Por qué A primero

1. **A sanea MusicProvider** extrayendo un Core agnóstico que elimina duplicación de código entre `index.ts` (plugin) y `server.ts` (Express)
2. **A es prerequisito natural de D**: Spoti5 necesita un Express estable y limpio como backend de su plugin ApiService — el Core agnóstico garantiza que Express y Nuclear compartan la misma lógica
3. **A tiene el menor riesgo y esfuerzo** (1-2 semanas, score 4/5 en ambos criterios)
4. **A no cierra puertas**: después de A, D se puede implementar independientemente en Spoti5

### Por qué D después

1. D modulariza Spoti5 con `spoti5_plugin_sdk` en Dart nativo — trabajo que vive en `~/JoniDev/Spoti5`
2. D consume el Express que A sanea — por eso A va primero
3. D no bloquea la Fase 4 de MusicProvider (packaging/CI/CD del plugin Nuclear)

---

## 2. Secuencia de Ejecución

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 3.4 — Alternativa A (MusicProvider)                       │
│  Rama: feat/phase3-a-isomorphic                                 │
│  Duración estimada: 1–2 semanas                                 │
│                                                                  │
│  Etapa 1: Extracción del Core (src/core/)                       │
│  ├── T-A.1  Tipos propios (TrackData, StreamData, HttpLike)     │
│  ├── T-A.2  extractor.ts (search, getStreamInfo, getPlaylist)   │
│  ├── T-A.3  ytScraper.ts (parsing ytInitialData)                │
│  └── T-A.4  cache.ts (LRU, TTL configurable)                   │
│                                                                  │
│  Etapa 2: Refactor de Wrappers                                  │
│  ├── T-A.5  index.ts → Core (providers en onEnable)             │
│  ├── T-A.6  Validación de inputs (IDs malformados)              │
│  ├── T-A.7  Accept-Encoding + source.provider                   │
│  ├── T-A.8  server.ts → Core (transparent refresh 403)          │
│  └── T-A.9  Inyección de transporte HTTP                        │
│                                                                  │
│  Etapa 3: Tests y Verificación                                  │
│  ├── T-A.10 Tests del Core (sin servidor ni Nuclear)            │
│  ├── T-A.11 Verificación de latencia/RAM post-refactor          │
│  └── T-A.12 Documentación + Engram + findings.md                │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  FASE 4 — Empaquetado y CI/CD                                   │
│  Rama: feat/phase4-packaging (desde feat/phase3-a-isomorphic)   │
│  Duración estimada: 3–5 días                                    │
│                                                                  │
│  1. GitHub Actions: build en cada release/push a main            │
│  2. Empaquetar dist/index.js + package.json → .zip              │
│  3. (Opcional) Docker image del Express para Spoti5             │
│  4. Nuclear carga el .zip y funciona sin config manual           │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ALTERNATIVA D — Spoti5 Plugin Engine (Spoti5 repo)             │
│  Repo: ~/JoniDev/Spoti5                                         │
│  Rama: feat/spoti5-plugin-engine                                │
│  Duración estimada: 2–4 semanas                                 │
│                                                                  │
│  1. Crear spoti5_plugin_sdk (Dart)                              │
│  2. PluginRegistry + StrategyManager                            │
│  3. ApiService como primer plugin oficial                       │
│  4. Migrar PlayerProvider y MusicServiceFactory                 │
│  5. Tests + verificación en dispositivo físico                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Detalle de la Alternativa A — Core Agnóstico

### 3.1 Estructura propuesta de `src/core/`

```
src/core/
├── types.ts          # TrackData, StreamData, SearchResult, PlaylistData, HttpLike
├── extractor.ts      # search(), getStreamInfo(), getPlaylistInfo() — usa HttpLike
├── ytScraper.ts      # scrapeYoutube(html, limit) → SearchResult[] — parsing ytInitialData
├── cache.ts          # resolveStreamInfo(), LRU cache con TTL configurable
├── ndjson.ts         # parseNdjson() — parsing de playlists de yt-dlp
└── index.ts          # Re-exporta todo el Core
```

### 3.2 Interfaz `HttpLike` (clave del desacoplamiento)

```typescript
// src/core/types.ts
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

- En **Nuclear**: `api.Http.fetch` (con `Accept-Encoding: gzip, deflate, br`)
- En **Express**: `node-fetch` o `axios`
- En **tests**: doble mock que devuelve HTML/JSON pregrabado

### 3.3 Mapeo de archivos actuales → Core

| Archivo actual | Se mueve a | Qué preserva |
|----------------|------------|--------------|
| `ytdlpWrapper.ts` → `search()` | `core/extractor.ts` | Usa `yt-search` (sin cambios) |
| `ytdlpWrapper.ts` → `getStreamInfo()` | `core/extractor.ts` | Usa yt-dlp binary vía `child_process.execFile` |
| `ytdlpWrapper.ts` → `getPlaylistInfo()` | `core/extractor.ts` | NDJSON parsing |
| `ytdlpWrapper.ts` → `downloadTrack()` | Se queda en wrapper (usa `spawn`) | Solo Express; Nuclear no puede usar spawn (R-7d) |
| `streamCache.ts` | `core/cache.ts` | LRU + TTL configurable |
| `index.ts` → `scrapeYoutube()` | `core/ytScraper.ts` | Parsing `ytInitialData` puro (HTML → datos) |
| `ytdlpSetup.ts` | NO se mueve | Solo para Express/CLI (Nuclear gestiona yt-dlp en Rust) |

### 3.4 Qué NO toca el Core

- `src/index.ts` (wrapper Nuclear) — consume el Core, lo adapta a `@nuclearplayer/plugin-sdk`
- `src/server.ts` (wrapper Express) — consume el Core, lo adapta a Express endpoints
- `src/cli.ts` (CLI standalone) — puede consumir el Core o quedarse como está
- `src/ytdlpSetup.ts` — gestión del binario yt-dlp (solo Express/CLI)
- `bin/` — binario de yt-dlp

### 3.5 Flujo de datos post-refactor

```
Búsqueda:
  User → Wrapper → Core.extractor.search(query, httpLike, limit) → yt-search → Results

Stream:
  User → Wrapper → Core.cache.resolveStreamInfo(id, fetchFn) 
                         → Core.extractor.getStreamInfo(id) → yt-dlp binary → StreamData
                         → Cache LRU

Scraping (Nuclear solamente):
  Nuclear → Core.ytScraper.scrapeYoutube(httpLike, query, limit)
          → api.Http.fetch("youtube.com/results?...") con Accept-Encoding
          → Parsing ytInitialData → SearchResult[]

Proxy (Express solamente):
  Spoti5 → server.ts → Core.cache.resolveStreamInfo() → CDN URL
         → http.get(cdnUrl, {Range}) → pipe to response
         → 403? → invalidate cache → retry
```

---

## 4. Criterios de Validación (post-A, pre-Fase 4)

| Criterio | Método | Umbral |
|----------|--------|--------|
| Core sin imports de Express/SDK | `grep -r "express\|plugin-sdk" src/core/` | 0 matches |
| Tests del Core independientes | `npm test` sin levantar servidor | 100% green |
| Plugin Nuclear funciona | Instalar .zip en Nuclear, reproducir pista | Audio suena |
| Express funciona | `npm run dev:server` + curl endpoints | 200 OK + Range 206 |
| Transparent refresh 403 | Forzar 403 (URL vieja) → se regenera | Sin interrupción |
| Latencia post-refactor | `npm run benchmark:all` | Delta ≤ 100ms vs línea base |
| 0 duplicación de parsing | `grep -r "parseNdjson\|ytInitialData" src/ --include='*.ts'` fuera de core | 0 matches |

---

## 5. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| El Core absorbe dependencia implícita de HTTP | Tests con doble mock; CI que verifica 0 imports de HTTP en core/ |
| El refactor rompe el transparent refresh 403 | Tests de supertest existentes se ejecutan antes y después |
| `downloadTrack()` no puede ir al Core (usa `spawn`) | Se queda en el wrapper Express/CLI — el Core no lo toca |
| yt-dlp Setup no es relevante para Nuclear | `ytdlpSetup.ts` permanece fuera del Core, solo en wrappers que lo necesiten |

---

## 6. Entregables por Fase

| Fase | Entregable | Repo |
|------|------------|------|
| **3.4 (A)** | Core agnóstico + wrappers refactorizados + tests + benchmark post-refactor | MusicProvider |
| **4** | CI/CD pipeline + .zip automatizado + (opcional) Docker Express | MusicProvider |
| **D** (futuro) | `spoti5_plugin_sdk` + PluginRegistry + ApiService plugin + tests | Spoti5 |

---

## 7. Decisiones Registradas

| Decisión | Valor | Justificación |
|----------|-------|---------------|
| Alternativa arquitectónica | Híbrido A+D | Benchmark + matriz + análisis paralelo |
| Prioridad | A → 4 → D | A sanea el Core que Express/D necesitan |
| Express se mantiene | Sí (componente estratégico) | Transparent refresh 403 + iOS celular (R-10) + cero penalización de latencia |
| Benchmark como discriminante de latencia | No | Delta 3.5% no significativo (p=0.288) |
| Factores de decisión reales | Mantenibilidad + distribución + restricciones de plataforma | Confirmado por benchmark y análisis cualitativo |

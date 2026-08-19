# Spec: Alternativa A — Modelo Isomórfico (Core Agnóstico)

**Status**: `pending`
**Rama**: `feat/phase3-a-isomorphic`
**Rama base**: `feat/phase3-decision` (o `develop` si se decide sin trial)
**Dependencias**: Resultados del benchmark (Fase 3.2) + decisión de la Fase 3.3 de evaluar A
**Fecha inicio**: TBD (post decisión Fase 3.3)
**Objetivo**: Unificar en un único repositorio la lógica de MusicProvider en un Core agnóstico (sin HTTP ni SDKs de plataforma), con un wrapper Nuclear (`src/index.ts`) y un wrapper Express opcional (`src/server.ts`), maximizando la reutilización de código.

---

## Problema

Hoy existe dualidad de arquitectura: `src/ytdlpWrapper.ts` + `src/streamCache.ts` sirven tanto al plugin (`src/index.ts`) como al server Express (`src/server.ts`), pero cada wrapper mezcla lógica de negocio con lógica de plataforma (SDK Nuclear vs `express`/`req`/`res`). Si se sigue creciendo así, cada plataforma duplicará parsing, caching y decisiones de red.

## Hipótesis

Extraer un Core puro (parsing NDJSON, yt-dlp/yt-search extraction, scraping HTML, LRU cache) **sin dependencias de HTTP ni de plataforma** permite que el mismo código alimente a Nuclear y a Express con un único set de tests, reduciendo el costo de mantenimiento sin degradar la latencia medida en el benchmark.

---

## Requisitos Funcionales

### RF-A.1: Core agnóstico sin dependencias de plataforma
- **Como** desarrollador quiero que el Core (parsing, extracción, caching) no dependa de `express`, `@nuclearplayer/plugin-sdk`, ni de ninguna SDK de HTTP para que sea reutilizable en cualquier anfitrión.

**Criterios de aceptación**:
- [ ] El Core es un módulo TypeScript puro (funciones + tipos propios `TrackData`/`StreamData`)
- [ ] No importa de `express` ni de `@nuclearplayer/plugin-sdk`
- [ ] El transporte HTTP es **inyectado** (interfaz `HttpLike`) para poder usar `api.Http.fetch` en Nuclear y `fetch`/`axios` en Node
- [ ] Los tests del Core no requieren servidor ni SDK Nuclear (dobles de HTTP)

### RF-A.2: Wrapper Nuclear registrado en onEnable
- **Como** desarrollador quiero que `src/index.ts` sea un wrapper fino del Core que registre sus providers en `onEnable` para que la instalación por UI funcione sin perder el API.

**Criterios de aceptación**:
- [ ] `onEnable` registra los providers `streaming` / `playlists` / `metadata` vía `api.Providers.register` (nunca en `onLoad`)
- [ ] El flujo de streaming delega en `api.Ytdlp.getStream` (procesamiento pesado en Rust; óptima aislamiento)
- [ ] `source.provider` de los resultados coincide exactamente con el `STREAMING_ID` activo (evita `searchForTrack` redundante)
- [ ] Los inputs que llegan al SDK se validan antes de llamar a `api.Ytdlp` (IDs malformados rompen el backend Rust)
- [ ] Se inyecta `Accept-Encoding: gzip, deflate, br` en las llamadas de scraping (`api.Http.fetch` no lo hace por defecto)
- [ ] Los tipos de salida mapean a `@nuclearplayer/model` (`Track`, `StreamCandidate`, `Stream`) al estilo de Nuclear

### RF-A.3: Wrapper Express opcional sobre el mismo Core
- **Como** desarrollador quiero que `src/server.ts` consuma el mismo Core para que Spoti5 conserve su PoC funcional sin mantener parsing duplicado.

**Criterios de aceptación**:
- [ ] `/api/search`, `/api/audio/resolve`, `/api/audio/stream` (proxy + transparent refresh 403), `/api/playlist`, `/api/download` siguen funcionando
- [ ] El transparent refresh 403 (Phase 2) usa el cache del Core (`streamCache.ts`)
- [ ] El Core no sabe nada de `req`/`res`: la adaptación vive entera en el server

### RF-A.4: Cache LRU compartida y configurable
- **Como** desarrollador quiero que la LRU cache del Core sea inyectable (memoria o disco) para que sirva en proceso y en server con políticas distintas.

**Criterios de aceptación**:
- [ ] `streamCache.ts` expone `resolveStreamInfo` y `CACHE_TTL` sin importar plataforma
- [ ] La política de TTL es configurable por wrapper (Nuclear puede usar TTL distinto que Express)
- [ ] No usa `child_process.spawn` dentro del Core (prohibido en TS plugins de Nuclear)

### RF-A.5: Scraping de YouTube aislado en el Core
- **Como** desarrollador quiero que el scraping HTML de YouTube viva en el Core con el HTTP inyectado para que ninguno de los wrappers rompa si YouTube cambia su HTML.

**Criterios de aceptación**:
- [ ] La extracción de `ytInitialData` está en el Core (función pura: HTML string → resultados)
- [ ] El parsing NDJSON de yt-dlp también está en el Core y es compartido (preservado de `ytdlpWrapper.ts`)
- [ ] Ante cambio de HTML, solo se toca el Core y los tests lo protegen

---

## Requisitos No Funcionales

### RNF-A.1: Latencia
- La latencia del modelo API no debe degradarse por el refactor: delta <= 100ms en p95 vs línea base (Fase 3.0).
- La latencia del plugin no debe degradarse: delta <= 100ms en p95 vs línea base.

### RNF-A.2: RAM
- Overhead de RAM del Core en el host Nuclear: <= 20MB adicionales (medido con el método de la Fase 3.2).

### RNF-A.3: Mantenibilidad
- Un solo set de tests para el Core (vitest) que corre sin servidor ni Nuclear.
- Sin duplicación de parsing/cache entre wrappers (verificable: 0 imports de yt-dlp/NDJSON parsing fuera del Core).

### RNF-A.4: Esfuerzo estimado
- Bajo-Medio: refactor de extracción, sin cambios de comportamiento. Estimación inicial 1–2 semanas (una persona).

---

## Escenarios de Validación

### Escenario 1: El Core corre sin plataforma
```
DADO el Core aislado con un doble de HTTP
CUANDO se invoca la búsqueda y la resolución de stream
ENTONCES devuelve los mismos resultados que la línea base
Y no importa express ni @nuclearplayer/plugin-sdk
```

### Escenario 2: El plugin sigue funcionando tras el refactor
```
DADO el plugin construido con el Core
CUANDO se instala en Nuclear y se reproduce una pista
ENTONCES el audio suena sin errores
Y la latencia no supera el umbral de RNF-A.1
```

### Escenario 3: El server Express sigue sirviendo a Spoti5
```
DADO el server refactorizado sobre el Core
CUANDO Spoti5 busca y reproduce usando /api/audio/stream
ENTONCES el proxy responde 206 con Range
Y el transparent refresh regenera URLs 403 sin interrupción
```

### Escenario 4: Tests compartidos
```
DADO el set de tests del Core
CUANDO se ejecuta `npm test`
ENTONCES pasa sin levantar el servidor ni Nuclear
```

---

## Tareas de Implementación

### Extracción del Core
- [ ] **T-A.1**: Crear `src/core/` con tipos propios (`TrackData`, `StreamData`, `HttpLike`)
- [ ] **T-A.2**: Mover parsing NDJSON + `search/getStreamInfo/getPlaylistInfo` a `src/core/extractor.ts` (desde `ytdlpWrapper.ts`)
- [ ] **T-A.3**: Mover scraping HTML (parsing `ytInitialData`) a `src/core/ytScraper.ts`
- [ ] **T-A.4**: Mover LRU cache a `src/core/cache.ts` (desde `streamCache.ts`), con TTL configurable

### Wrapper Nuclear
- [ ] **T-A.5**: Refactor `src/index.ts` para consumir el Core (registro en `onEnable`)
- [ ] **T-A.6**: Validación de inputs antes de `api.Ytdlp.getStream` (IDs malformados)
- [ ] **T-A.7**: Verificar inyección de `Accept-Encoding` y coincidencia `source.provider`

### Wrapper Express
- [ ] **T-A.8**: Refactor `src/server.ts` para consumir el Core (mantiene endpoints y transparent refresh)
- [ ] **T-A.9**: Inyectar transporte HTTP en el Core desde el server (fetch/axios)

### Tests y verificación
- [ ] **T-A.10**: Migrar/crear tests del Core (dobles de HTTP, sin servidor ni Nuclear)
- [ ] **T-A.11**: Regenerar mediciones de línea base (latencia/RAM) y comparar contra RNF-A.1/A.2
- [ ] **T-A.12**: Actualizar `findings.md`, `session-log.md` y Engram

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| El Core "agnóstico" termina acoplado a un entorno (HTTP implícito, `fs`, etc.) | Alta | Alto | Inyección de dependencias + tests con dobles; regla: el Core no puede correr un server ni spawn |
| Divergencia de dependencias entre wrappers (Express vs SDK Nuclear) | Media | Alto | CI matrix para `build` de ambos targets; dependencias solo en wrappers |
| Doble mantenimiento si un wrapper no consume el Core al 100% | Media | Medio | Regla RF-A.3: verificación con 0 imports de parsing fuera del Core |
| El refactor introduce bugs silenciosos en el proxy 403 | Media | Medio | Tests de integración del proxy (`supertest`) antes/después del refactor |

---

## Entregable

Repo único `MusicProvider` con un Core agnóstico, wrapper Nuclear y wrapper Express sobre el mismo Core, con línea base de latencia/RAM verificada post-refactor.

---

## Criterios de Cierre

- [ ] Core sin dependencias de `express` ni `@nuclearplayer/plugin-sdk`
- [ ] Wrapper Nuclear registra providers en `onEnable` y delega a `api.Ytdlp`
- [ ] Server Express consume el Core y conserva transparent refresh 403
- [ ] `npm test` del Core pasa sin servidor ni Nuclear
- [ ] Latencia/RAM dentro de umbrales RNF-A.1/A.2 (verificado post-refactor)
- [ ] Resultados y comparación documentados en `findings.md` y `session-log.md`
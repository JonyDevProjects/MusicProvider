# Roadmap Fase 3 — Punto de Inflexión Arquitectónico (Nuclear vs Spoti5)

**Rama base**: `feat/phase-2-transparent-refresh`
**Fecha inicio**: 2026-08-19
**Objetivo**: Realizar un estudio de viabilidad arquitectónica que decida, con datos de un benchmark, si MusicProvider debe mantener un modelo Híbrido/Isomórfico o si Spoti5 debe adoptar la filosofía de plugins de Nuclear. El entregable es una **decisión basada en datos** sobre el futuro de los repositorios, no la implementación de código.

---

## Estrategia de Branching

```
feat/phase-2-transparent-refresh  ← rama base actual (Phase 2: transparent refresh)
  └── feat/phase3-benchmark            ← Fases 3.0 / 3.1 / 3.2 (línea base + diseño + ejecución del benchmark)
        └── feat/phase3-decision       ← Fase 3.3 (matriz de decisión)
              ├── feat/phase3-a-isomorphic            ← Trial Alternativa A (Core agnóstico)
              ├── feat/phase3-b-js-plugins            ← Trial Alternativa B (plugins JS en Spoti5)
              ├── feat/phase3-c-forks                 ← Trial Alternativa C (forks especializados)
              └── feat/phase3-d-spoti5-plugin-engine  ← Trial Alternativa D (repo Spoti5, Dart)
                      │
                      ▼
              Solo la alternativa ganadora (o el híbrido) continúa su desarrollo
```

**Reglas**:
- Las Fases 3.0–3.2 **no modifican código de producción**: solo medición, inventario y documentación. Se ejecutan en `feat/phase3-benchmark`.
- La Fase 3.3 (decisión) vive en `feat/phase3-decision`, creada desde `feat/phase3-benchmark` al terminar la ejecución.
- Las alternativas A/B/C/D se materializan como `trial` solo si el benchmark lo justifica (nunca todas en paralelo, nunca por gusto).
- **Solo se ejecuta la alternativa ganadora tras la matriz de decisión.** Las ramas de trial descartadas se dejan como referencia pero NO se mergean.
- Si la ganadora es D, el trabajo continúa en el repo Spoti5 (`~/JoniDev/Spoti5`) y la rama en MusicProvider queda solo como documentación/spec.
- La rama ganadora se mergea de vuelta a `feat/phase3-decision` y, tras verificación, a `develop`.

---

## Estado del Problema

### Síntoma
- MusicProvider ya funciona como plugin dinámico de Nuclear (`src/index.ts` registra providers en `onEnable`) ✅
- El backend Express (`src/server.ts`) sigue vivo como PoC para Spoti5, con transparent refresh 403 (Phase 2) ⚠️
- Existe **dualidad de arquitectura**: dos wrappers (plugin + Express) sobre la misma lógica de yt-dlp/scraping
- El objetivo principal declarado del proyecto es ser plugin de Nuclear; Spoti5 es una contingencia histórica en otro repo (`~/JoniDev/Spoti5`) ⚠️
- Spoti5 en iOS falló consistentemente contra el CDN de YouTube sin backend (case study `ios-cellular-playback`): cualquier camino sin servidor propio require un host intermedio

### Hipótesis a validar con el benchmark

| # | Hipótesis | Implicación si se confirma |
|---|-----------|----------------------------|
| 1 | El modelo **integrado** (Plugin JS → host nativo) tiene menor latencia tap-to-audio que el modelo **API** (Express → Flutter), por eliminar la red entre cliente y servidor | Alinea con B/D |
| 2 | El modelo **integrado** es más simple de distribuir (`.zip` + PluginLoader) que mantener un backend Express + túnel/VPS | Alinea con B/D |
| 3 | La RAM del host Nuclear con el plugin es comparable (o inferior) a la de un proceso Express dedicado | Despeja la mayor objeción contra el modelo integrado |
| 4 | El mantenimiento de un Core agnóstico con dos wrappers (A) costará menos que mantener dos proyectos separados (C) | Alinea con A |
| 5 | Un `PluginRegistry` Dart (D) puede emular la filosofía de plugins de Nuclear **sin** ejecutar JS, reutilizando el Express PoC probado | Alinea con D |

### Alternativas a evaluar (pros/contras resumidos)

| Alt | Descripción | Pros (resumen) | Contras (resumen) |
|-----|-------------|----------------|-------------------|
| **A** | Modelo Isomórfico: un solo repo con Core agnóstico + wrapper Nuclear + wrapper Express | Reutilización máxima de código; un solo set de tests | Repositorio más pesado; dependencias dispares (Express vs SDK Nuclear) |
| **B** | Ecosistema de plugins JS en Spoti5 (flutter_js / quickjs) con subconjunto de `@nuclearplayer/plugin-sdk` | MusicProvider existe solo como plugin; Express obsoleto y eliminable; mismo `.zip` que Nuclear | Reingeniería masiva en Flutter (puentes JSI/Dart para streaming) |
| **C** | Separación de Contextos: fork Nuclear-plugin y fork Spoti5 (servidor pre-descarga/cache) | Rendimiento óptimo por plataforma sin compromisos | Esfuerzo duplicado; divergencia y dos codebases que mantener |
| **D** | Eje 2: re-arquitecturar Spoti5 con `spoti5_plugin_sdk` Dart + PluginRegistry; el API client actual es el primer plugin oficial | Desacopla el frontend Flutter sin forzar JS; conserva el Express PoC probado | Traslada el foco al repo Dart/Flutter; pausa la consolidación Node.js |

---

## Fase 3.0 — Línea base y contexto

**Rama**: `feat/phase-2-transparent-refresh` (sin sub-rama)
**Agente**: OpenCode (inventario) + usuario (mediciones físicas)
**Criterio de éxito**: inventario completo y métricas de línea base registradas en `findings.md`, con el estado de Phase 1 y Phase 2 confirmado.

### 3.0.1 Inventario del estado actual
- [ ] Auditar `src/server.ts` (Express wrapper): endpoints `/api/search`, `/api/info`, `/api/audio/resolve`, `/api/audio/stream` (proxy con Range + transparent refresh 403), `/api/playlist`, `/api/download`, static web
- [ ] Auditar `src/index.ts` (plugin wrapper): providers `streaming` / `playlists` / `metadata` registrados en `onEnable`, scraping vía `api.Http.fetch`, delegación a `api.Ytdlp.getStream`
- [ ] Auditar archivos Core: `src/ytdlpWrapper.ts` (`search`, `getStreamInfo`, `getPlaylistInfo`, `downloadTrack`), `src/streamCache.ts` (LRU cache, `resolveStreamInfo`, `CACHE_TTL`), `src/ytdlpSetup.ts` (DISCARDED para Nuclear), `src/cli.ts`
- [ ] Auditar cliente API de Spoti5 en `~/JoniDev/Spoti5`: `lib/services/api_service.dart`, `music_service.dart`, `music_service_factory.dart`, `yt_explode_service*.dart`
- [ ] Confirmar dependencias de `package.json` (express, yt-search, lru-cache, @nuclearplayer/plugin-sdk, ...)

### 3.0.2 Métricas de línea base
- [ ] Latencia tap-to-audio actual vía Express PoC (Spoti5 → Express → CDN) con cache frío y con cache caliente
- [ ] RAM del host Nuclear **con** plugin MusicProvider cargado (proceso Tauri/Rust)
- [ ] RAM del host Nuclear **sin** plugin (baseline)
- [ ] Fricción de distribución actual: pasos para instalar el plugin en Nuclear vs pasos para levantar/desplegar Express

### 3.0.3 Prerrequisitos
- [ ] Confirmar Phase 2 (transparent refresh) mergeado y validado en `feat/phase-2-transparent-refresh`
- [ ] Confirmar estado de Phase 1 (age-restriction) como tarea **paralela**: puede integrarse/testearse antes que la Fase 3 (sin bloqueo)
- [ ] Confirmar que Spoti5 vive en repo separado (`~/JoniDev/Spoti5`, aislado en `chore/isolate-nuclear-plugin`)

### 3.0.4 Persistencia
- [ ] Guardar métricas de línea base en `findings.md` (sección Fase 3.0)
- [ ] Guardar resultado en Engram

**Entregable**: sección Fase 3.0 de `findings.md` poblada

---

## Fase 3.1 — Diseño del Benchmark

**Rama**: `feat/phase3-benchmark`
**Agente**: CommandCode (coordinación) + OpenCode (diseño técnico)
**Criterio de éxito**: `benchmark-spec.md` aprobado con métricas, escenarios, herramienta y umbrales medibles.

### 3.1.1 Definir métricas
- [ ] Latencia tap-to-audio (p50/p95/p99) en ambos modelos (API vs Integrado)
- [ ] Consumo de RAM: host (Nuclear) vs móvil (Spoti5) y host vs servidor Express
- [ ] Facilidad de distribución: rúbrica cualitativa (pasos, artefactos, tiempo)
- [ ] Costo de mantenimiento: proxy métrico (líneas duplicadas, tests, dependencias)

### 3.1.2 Definir escenarios y herramienta
- [ ] Escenarios (misma canción, misma red controlada) para ambos modelos
- [ ] Harness replicable desde un solo comando (benchmarks/model-api y model-integrated)
- [ ] Metodología de muestreo de RAM (frecuencia, ventana, metricas de OS)

### 3.1.3 Definir umbrales
- [ ] Mínimo de tracks por escenario (≥10) y runs (≥3)
- [ ] Umbrales de éxito/fracaso por métrica (documentados en el spec)
- [ ] Reglas de reproducibilidad (misma red, misma lista de tracks, orden fijo)

### 3.1.4 Entregable
- [ ] Escribir `benchmark-spec.md` completo (RF, RNF, escenarios Gherkin, tareas, riesgos)

**Entregable**: `benchmark-spec.md`

---

## Fase 3.2 — Ejecución del Benchmark

**Rama**: `feat/phase3-benchmark`
**Agente**: OpenCode (harness y ejecución) + usuario (mediciones en dispositivo físico)
**Criterio de éxito**: todos los escenarios ejecutados y resultados volcados en `findings.md` con intervalos de confianza.

### 3.2.1 Modelo API (Express → Flutter)
- [ ] Implementar harness del modelo API según RF-B.1
- [ ] Ejecutar escenarios de latencia, RAM y distribución
- [ ] Registrar resultados en `findings.md`

### 3.2.2 Modelo Integrado (Plugin JS → Nuclear)
- [ ] Implementar harness del modelo integrado según RF-B.2
- [ ] Ejecutar escenarios de latencia, RAM y distribución
- [ ] Registrar resultados en `findings.md`

### 3.2.3 RAM y distribución
- [ ] Medir RAM del host Nuclear con/sin plugin (RF-B.3)
- [ ] Aplicar rúbrica de fricción de distribución (RF-B.4)

### 3.2.4 Reproducibilidad y reporte
- [ ] Verificar reproducibilidad: mismo track, misma red, 3 runs (RF-B.5)
- [ ] Compilar reporte y guardar en Engram

**Entregable**: `findings.md` con resultados del benchmark

---

## Fase 3.3 — Evaluación comparativa y matriz de decisión

**Rama**: `feat/phase3-decision`
**Agente**: CommandCode (coordinación) + usuario (decisión final)
**Criterio de éxito**: matriz de decisión llena con puntajes justificados por datos y decisión documentada con trazabilidad.

### Matriz de decisión

| Criterio (peso) | A: Isomórfico | B: Plugins JS | C: Forks | D: Plugin Engine Dart |
|-----------------|:-------------:|:-------------:|:--------:|:---------------------:|
| Latencia tap-to-audio (25%) | 3 (0.75) | 4 (1.00) | 4 (1.00) | 3 (0.75) |
| RAM host/móvil (20%) | 3 (0.60) | 3 (0.60) | 4 (0.80) | 4 (0.80) |
| Facilidad de distribución (20%) | 3 (0.60) | 5 (1.00) | 2 (0.40) | 3 (0.60) |
| Mantenibilidad (15%) | 4 (0.60) | 2 (0.30) | 1 (0.15) | 4 (0.60) |
| Riesgo técnico (10%) | 4 (0.40) | 1 (0.10) | 5 (0.50) | 4 (0.40) |
| Esfuerzo (10%) | 4 (0.40) | 1 (0.10) | 4 (0.40) | 3 (0.30) |
| **Total ponderado** | **3.35** | **3.10** | **3.25** | **3.45** |

> Los puntajes se completan con base en el inventario del estado actual (Fase 3.0), restricciones R-1 a R-10 y specs de las alternativas. Para el desglose detallado de justificaciones y análisis cualitativo, ver `findings.md`.

### 3.3.1 Tareas
- [ ] Consolidar resultados del benchmark por criterio
- [ ] Evaluar A, B, C y D contra la matriz (datos del benchmark + restricciones conocidas)
- [ ] Documentar la evaluación criterio por criterio en `findings.md`
- [ ] Registrar toda desviación del plan en el log de desviaciones del roadmap
- [ ] Decidir alternativa ganadora (o híbrido documentado)
- [ ] Documentar la decisión, justificación y tradeoffs en `session-log.md`

**Entregable**: matriz completa + decisión documentada

---

## Fase 3.4 — Ejecución de la decisión

**Rama**: rama de la alternativa ganadora (TBD)
**Agente**: según la ganadora
**Criterio de éxito**: el camino ganador queda en ejecución con su propio roadmap/spec, y la referencia en `future_roadmap_and_architecture.md` queda actualizada.

### 3.4.1 Si gana D (repo Spoti5)
- [ ] Crear epic en `~/JoniDev/Spoti5` basado en `alternativa-d-spoti5-plugin-engine-spec.md`
- [ ] El spec continúa dirigiendo el trabajo en el repo Dart/Flutter

### 3.4.2 Si gana A, B o C (repo MusicProvider)
- [ ] Continuar la implementación siguiendo el spec de la alternativa ganadora
- [ ] Crear rama de implementación según el spec (desde `feat/phase3-decision`)

### 3.4.3 Cierre transversal
- [ ] Merge de la rama ganadora a `feat/phase3-decision` (y luego `develop`)
- [ ] Cerrar ramas de trial descartadas (quedan como referencia, sin merge)
- [ ] Actualizar nota de referencia en `docs/future-roadmap/future_roadmap_and_architecture.md` (FASE 3) con el resultado y el repo donde continúa el plan — **checkbox de tarea; no se ejecuta en esta sesión**
- [ ] Documentar decisión final y aprendizajes en Engram
- [ ] Actualizar `session-log.md` y `next-session-prompt.md`

**Entregable**: decisión ejecutada y referencias actualizadas

---

## Ejecución por Sesión

### Estado actual
> **Ninguna sesión de ejecución registrada todavía.** Este roadmap se creó en la Sesión 0 (solo estructura documental). Todas las fases 3.0–3.4 están en `pending` y todas las tareas en ⬜.

### Plantilla de sesión

```
### Sesión N (YYYY-MM-DD) — [Título]
**Branch base**: [rama donde se trabaja]
**Objetivo**: [qué se busca lograr]

1. ✅/❌/⬜ [tarea]
2. ...
**Conclusión**: [resultado y siguiente acción]
```

### Sesión 0 (2026-08-19) — Creación del roadmap de Fase 3
1. ⬜ Contexto cargado (future roadmap, memoria persistente, SDK Nuclear, skills) — creado durante la Sesión 0
2. ⬜ Estructura documental `docs/future-roadmap/phase3/` creada (README, roadmap, benchmark, 4 specs de alternativas, tracing) — creada durante la Sesión 0
3. ⬜ Iniciar **Fase 3.0**: inventario de `server.ts`, `index.ts`, Core y cliente API de Spoti5

> Aclaración: los ⬜ de la Sesión 0 expresan que **no se ejecutó ninguna tarea de ejecución del roadmap**; la Sesión 0 fue exclusivamente de documentación.

---

## Riesgos y Contingencias

| Riesgo | Contingencia |
|--------|--------------|
| El benchmark no es concluyente (resultados parejos entre modelos) | Usar criterios cualitativos (mantenibilidad, distribución) como desempate y documentar la incertidumbre |
| Rate limiting/bot detection de YouTube distorsiona mediciones | Espaciar runs, respetar cooldowns, usar lista fija de tracks y red controlada (ver case study `ios-cellular-playback`) |
| No se puede aislar la RAM del plugin dentro del host Nuclear | Medir firmware del proceso Tauri/Rust completo y usar delta con/sin plugin como proxy |
| Spoti5 sin dispositivo físico disponible | Emular/simular y declarar el sesgo en `findings.md` |
| La decisión se pospone indefinidamente | Fijar deadline con datos parciales, decidir con los datos disponibles y re-evaluar en la Fase 3.4 |
| Phase 1 (age-restriction) bloquea la integración del plugin durante el benchmark | Tratar Phase 1 como paralela e independiente; el benchmark usa tracks públicos generales |

---

## Tracking de Desviaciones

### ¿Por qué documentar desviaciones?

Las desviaciones son los momentos donde el plan se desvía de la realidad. Son fuente de conocimiento porque revelan suposiciones incorrectas, limitaciones no anticipadas y complejidad real vs estimada. (Misma disciplina que `docs/archive/ios-cellular-playback/roadmap.md`.)

### Plantilla de desviación

```markdown
### Dev-[N]: [Título corto]
- **Fase**: [Fase del roadmap donde ocurrió]
- **Rama**: [Rama donde se descubrió]
- **Plan original**: [Qué decía el plan]
- **Realidad**: [Qué realmente pasó]
- **Causa**: [Por qué el plan estaba equivocado]
- **Impacto**: [Alto/Medio/Bajo] — [Descripción del impacto]
- **Acción tomada**: [Qué se hizo al respecto]
- **Aprendizaje**: [Conocimiento para futuros flujos]
- **Agente que detectó**: [CommandCode/OpenCode/Usuario]
```

### Log de Desviaciones (se llena durante ejecución)

> Este registro se actualiza en tiempo real. Cada desviación se numera secuencialmente y se referencia desde la fase correspondiente.

<!-- Las desviaciones se insertan aquí conforme ocurren -->

### Categorías de desviaciones esperadas

| Categoría | Ejemplo posible | Impacto probable |
|-----------|-----------------|------------------|
| **Medición** | Métricas no reproducibles entre plataformas (RAM/Latency tooling distinto) | Alto |
| **Arquitectura** | El "Core agnóstico" resulta tener dependencias del entorno (HTTP, fs, spawn) | Alto |
| **Nuclear SDK** | Cambios de interfaz entre versiones de `@nuclearplayer/plugin-sdk` | Medio |
| **Flutter/JS engine** | `flutter_js`/`quickjs` no soportan ES2020 completo (solo relevante para B) | Alto |
| **Repositorio** | Spoti5 aislado en repo propio cambia la premisa de "un solo repo" | Medio |
| **Proveedor de datos** | YouTube cambia su HTML/scraping y rompe el harness durante el benchmark | Medio |
| **Dispositivo** | iPhone no disponible; testing limitado a emulador | Alto |

### Cómo usar las desviaciones para mejorar

Al final de cada sesión:
1. Revisar desviaciones capturadas
2. Actualizar hipótesis si la desviación cambia la causa raíz o el modelo evaluado
3. Re-priorizar alternativas si es necesario
4. Guardar aprendizajes en Engram

Al final del roadmap:
1. Compilar todas las desviaciones en la sección final del documento
2. Extraer "Lecciones aprendidas" para futuros estudios de viabilidad
3. Actualizar `future_roadmap_and_architecture.md` con la decisión consolidada

---

## Archivos Relevantes

| Archivo | Propósito |
|---------|-----------|
| `src/server.ts` | Express wrapper (PoC Spoti5): search, info, resolve, stream proxy + transparent refresh 403, playlist, download |
| `src/index.ts` | Plugin wrapper Nuclear: providers streaming/playlists/metadata, registro en `onEnable`, scraping `api.Http.fetch`, delegación `api.Ytdlp.getStream` |
| `src/ytdlpWrapper.ts` | Core de extracción: `search`, `getStreamInfo`, `getPlaylistInfo`, `downloadTrack` (NDJSON parsing) |
| `src/streamCache.ts` | Core de cache: LRU (`resolveStreamInfo`, `streamUrlCache`, `CACHE_TTL`) |
| `src/ytdlpSetup.ts` | DESCARTADO para Nuclear (Nuclear gestiona yt-dlp en Rust); solo relevante para express/descargas |
| `src/cli.ts` | CLI standalone |
| `~/JoniDev/Spoti5/lib/services/api_service.dart` | Cliente API de Spoti5 (espresa a Express) |
| `~/JoniDev/Spoti5/lib/services/music_service.dart` | Interfaz abstracta de servicio + StreamResult |
| `~/JoniDev/Spoti5/lib/services/music_service_factory.dart` | Selección de servicio por plataforma (fallback) |
| `~/JoniDev/nuclear/packages/plugin-sdk/src/types/` | Tipos del SDK: `providers.ts`, `streaming.ts` (StreamingProvider, StreamCandidate), `settings.ts`, `metadata.ts`, `ytdlp.ts` |
| `docs/archive/roadmap-nuclear-plugin-spoti5-evolution.md` | Referencia del "Eje 2" (base de la Alternativa D) |
| `docs/future-roadmap/future_roadmap_and_architecture.md` | Documento fuente; la FASE 3 es la que detallamos aquí |
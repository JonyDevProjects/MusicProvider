# Next Session Prompt — Nuclear Plugin Transition

> **Propósito**: Este documento sirve como handoff universal para **cualquier agente** (Command Code, OpenCode, Antigravity CLI, Cursor, etc.) que continúe el trabajo. Contiene contexto completo, preferencias explícitas (equivalente al sistema *taste* de CommandCode), conocimientos técnicos críticos, y un prompt listo para usar.

---

## 1. Prompt para la Sesión Continua

Copie y pegue el siguiente prompt al inicio de la siguiente sesión con **cualquier agente**:

```
Estás trabajando en MusicProvider (https://github.com/iJonyDev/MusicProvider), un
proyecto TypeScript/ESM que está siendo convertido de un servidor Express standalone
a un plugin de Nuclear (reproductor de música de código abierto).

## Estado actual
- Etapas 1, 2, 3 y 4 del plan (docs/nuclear-plugin/IMPLEMENTATION_PLAN.md) están COMPLETAS y COMMITEADAS.
- Rama actual: chore/isolate-nuclear-plugin (working tree clean).
- El plugin buildea con `npx tsup` → `dist/index.js` (CJS, 26.5 KB, cero require()).
- 29 tests existentes pasan con `npm test`.

## Tarea principal
Continuar con la Etapa 5 y Etapa 6 del plan:
1. Cargar el plugin compilado en Nuclear y realizar pruebas manuales (búsqueda, playback).
2. Investigar y resolver edge cases, como streams largos (+1 hora) y manejo de range headers.
3. Asegurar de que no existan memory leaks en el caché extraído.

## Preferencias (ver sección 2 abajo para detalles)
- Idioma: español (Español)
- Plataforma: Mac (Apple Silicon / M1)
- Metodología: SDD (análisis → diseño → codificación → testing → documentación)
- Git: conventional commits con Co-authored-by trailer
- TypeScript estricto siempre

## Archivos clave
- src/index.ts — Entry point del plugin Nuclear
- src/streamCache.ts — Cache LRU extraída (genérica, con resolveStreamInfo)
- src/ytdlpWrapper.ts — Lógica pura de yt-dlp (NO Express)
- src/server.ts — Servidor Express standalone (temporal)
- tsup.config.ts — Bundler CJS → dist/index.js
- docs/nuclear-plugin/IMPLEMENTATION_PLAN.md — Plan completo con tracking table

Lee docs/nuclear-plugin/IMPLEMENTATION_PLAN.md y docs/nuclear-plugin/next-session-prompt.md
antes de comenzar. Sigue el estilo de documentación del IMPLEMENTATION_PLAN.md.
```

---

## 2. Preferencias Explícitas (equivalente a CommandCode Taste)

### Comunicación
- **Idioma**: Comunica en **español** (Español). Confidence: 0.95
- **Plataforma**: Prefiere **Mac (Apple Silicon / M1)** sobre Windows. Confidence: 0.75

### Metodología de Desarrollo
- **SDD**: Sigue la metodología de diseño estructurado — análisis → diseño → codificación → testing → documentación. Confidence: 0.85
- **Git**: Usa **GitFlow** (`develop` integración, `feature/*` para features, `bugfix/*` para fixes, `hotfix/*` para producción, `main` producción-only). Confidence: 0.80
- **Commits**: Formato *conventional commit* via heredoc (`git commit -F - <<'EOF'`) con trailer `Co-authored-by: CommandCodeBot <noreply@commandcode.ai>`. Confidence: 0.75
- **Commits por etapas**: Al completar y validar una etapa (e.g., Etapa 1), haz commit de todos los cambios como punto de control limpio. Usa `git add -A` (o selección manual si hay archivos auto-gestionados). Confidence: 0.75
- **Push**: Después de commitear en branches, haz push al remoto. Confidence: 0.80

### TypeScript / Arquitectura
- **ESM obligatorio**: `"type": "module"` en package.json. Usa extensión `.js` en todos los imports locales (e.g., `import { x } from './utils.js'`). Confidence: 0.90
- **TypeScript estricto**: `"strict": true` siempre. Ejecuta `npx tsc --noEmit` después de cambios TS. Confidence: 0.80
- **Arquitectura del plugin Nuclear**:
  - Usa `tsup` como bundler; marca dependencias provistas por el runtime como `external` (e.g., `@nuclearplayer/plugin-sdk`). Confidence: 0.75
  - Fuerza paquetes no en el allowlist a bundlear via `noExternal`. Confidence: 0.75
  - Prefiere **cero `require()`** en el bundle de salida — plugins deben ser autocontenidos. Confidence: 0.80
  - Usa `esbuildOptions.conditions` (e.g., `['browser']`) para evitar importar Node.js builtins (`diagnostics_channel`) que no existen en webview. Confidence: 0.70
  - Escribe lógica core como funciones genéricas con dependencias inyectables (e.g., `resolveStreamInfo(videoId, fetchFn)` acepta cualquier función fetch). Confidence: 0.75
  - `outExtension: () => ({ js: '.js' })` en tsup CJS config cuando el runtime espera `.js`. Confidence: 0.65

### Testing
- **Tests de validación**: `npm test` (Vitest) antes y después de cambios. Confidence: 0.85
- **Re-exporta módulos core** desde múltiples entry points para que tests accedan a estado interno sin romper la API pública. Confidence: 0.65
- **Documenta testing**: Reportes estructurados en `/docs/testing/` con entorno, resultados, checklist de validación. Confidence: 0.85
- **Verifica memoria**: Usa `ps -o pid,rss,vsz,comm` antes/después de carga para detectar memory leaks del cache. Confidence: 0.80

### Documentación
- **Formato de roadmap**: Usa tablas de estado (Etapa | Sub-tarea | Estado | Fecha) con ✅/⬜. Confidence: 0.80
- **Desviaciones**: Formato `### Dev-[N]: [Titulo]` con: Fase, Plan original, Realidad, Causa, Impacto, Acción, Aprendizaje. Confidence: 0.80
- **Riesgos**: Tabla `Riesgo | Contingencia`. Confidence: 0.75
- **Actualiza roadmap** después de cada fase completada. Confidence: 0.75
- **Engram**: Al finalizar sesiones, persiste observaciones en Engram usando `mem_save`. Confidence: 0.85

### Nuclear Plugin Runtime (conocimiento técnico)
- El runtime de Nuclear **compila TS→CJS** con esbuild-wasm (`format: 'cjs'`, `platform: 'browser'`).
- El `require` shim solo permite: `@nuclearplayer/plugin-sdk`, `@nuclearplayer/ui`, `react`, `react/jsx-runtime`. **Node.js builtins NO están disponibles**.
- El plugin debe **exportar un objeto default** (NuclearPlugin) con hooks: `onLoad(api)`, `onEnable(api)`, `onDisable(api)`, `onUnload(api)`.
- `api.Ytdlp` proporciona yt-dlp vía backend Rust (Tauri commands: `ytdlp_search`, `ytdlp_get_stream`, `ytdlp_get_playlist`). El plugin debe usar `api.Ytdlp` en lugar de llamar yt-dlp directamente.

### Skills / Knowledge Requerido
El agente debe consultar estos recursos de Nuclear (fuera del repo):

| Recurso | Ubicación | Relevancia |
|---------|-----------|------------|
| `PluginLoader.ts` | `nuclear/packages/player/src/services/plugins/` | Lee manifest, compila/evalúa plugin con `new Function('exports','module','require',code)` |
| `pluginCompiler.ts` | `nuclear/packages/player/src/services/plugins/` | esbuild-wasm TS→CJS, skippea archivos `.js` ya compilados |
| `pluginManifest.ts` | `nuclear/packages/player/src/services/plugins/` | Schema Zod: required (name, version, description, author, main), nuclear opcional (displayName, categories, icon, permissions) |
| `createPluginAPI.ts` | `nuclear/packages/player/src/services/plugins/` | Crea NuclearPluginAPI con ytdlpHost, providersHost, etc. |
| `ytdlpHost.ts` | `nuclear/packages/player/src/services/` | YtdlpHost: search/getStream/getPlaylist → Tauri commands |
| SDK types | `nuclear/packages/plugin-sdk/src/types/` | `NuclearPlugin`, `NuclearPluginAPI`, `StreamingProvider`, `YtdlpStreamInfo` (snake_case) |
| SDK model | `nuclear/packages/plugin-sdk/src/model/` | `Stream`, `StreamCandidate`, `Track`, `ProviderRef` |
| `ytdlp.rs` | `nuclear/packages/player/src-tauri/src/` | Backend Rust: YtdlpStreamInfo { stream_url, duration, title, container, codec } |

---

## 3. Estado Actual de la Implementación

### Etapa 1 — Preparación del Entorno Plugin (✅ COMPLETA)
| Sub-tarea | Estado | Fecha |
|-----------|--------|-------|
| Instalar `@nuclearplayer/plugin-sdk@2.8.0` como devDependency | ✅ | 2026-08-16 |
| Configurar `package.json` con metadata `"nuclear"` + `"main": "dist/index.js"` | ✅ | 2026-08-16 |
| Configurar `tsup.config.ts` (CJS → `dist/index.js`, cero `require()`) | ✅ | 2026-08-16 |

### Etapa 2 — Refactorización Arquitectónica (✅ COMPLETA)
| Sub-tarea | Estado | Fecha |
|-----------|--------|-------|
| Extraer caché LRU de `server.ts` → `src/streamCache.ts` | ✅ | 2026-08-16 |
| Actualizar `server.ts` para importar caché extraída | ✅ | 2026-08-16 |
| Crear `src/index.ts` con ciclo de vida Nuclear (`onLoad`/`onEnable`/`onDisable`/`onUnload`) | ✅ | 2026-08-16 |
| Implementar `StreamingProvider` con `api.Ytdlp.search()` y `api.Ytdlp.getStream()` + caché | ✅ | 2026-08-16 |
| Mapear tipos SDK (snake_case) → modelo interno (camelCase) | ✅ | 2026-08-16 |

### Validación de la Etapa 1+2
- `npx vitest run` → ✅ 23 tests pasan
- `npx tsc --noEmit` → ✅ 0 errores de tipo
- `npx tsup` → ✅ `dist/index.js` generado (26.4 KB, cero `require()`)
- Simulación `evaluatePlugin` (`new Function('exports','module','require',code)`) → ✅ Carga, registra/desregistra proveedor, ejecuta lifecycle completo

### Etapa 3 — Integración de la API de Nuclear (✅ COMPLETA)
| Sub-tarea | Estado | Fecha |
|-----------|--------|-------|
| Implementar searchForTrackV2 usando api.Ytdlp + tipo Track | ✅ | 2026-08-16 |
| Agregar manejo de playlists (api.Ytdlp.getPlaylist) | ✅ | 2026-08-16 |

### Etapa 4 — Empaquetado y Verificación (✅ COMPLETA)
| Sub-tarea | Estado | Fecha |
|-----------|--------|-------|
| Ajustar tests para validar retornos crudos vs HTTP | ✅ | 2026-08-16 |
| CI/CD (`test.yml`) pasa con nuevo empaquetado | ✅ | 2026-08-16 |

### Etapas Pendientes
| Etapa | Sub-tarea | Estado |
|-------|-----------|--------|
| 5 | Cargar plugin en Nuclear, probar búsqueda y playback | ⬜ |
| 6 | Resolver edge cases (streams largos, range headers) | ⬜ |

---

## 4. Conocimientos Técnicos Críticos

### Dev-1: npm 11 silencia devDependencies con `omit = ["dev"]`
- `npm config get omit` puede devolver `dev` a nivel sistema. Si `npx tsup` falla o packages faltan: usar `npm config delete omit`, luego `npm install --include=dev`.

### Dev-2: `lru-cache` v11 usa `diagnostics_channel` (Node.js builtin no disponible en Nuclear webview)
- El `require` shim de Nuclear solo permite 4 módulos. `lru-cache` v11 bundlea `require('diagnostics_channel')` en condición `node`.
- **Solución**: `noExternal: ['lru-cache']` + `esbuildOptions.conditions: ['browser']` en tsup config. Verifica con `grep "require(" dist/index.js`.

### Dev-3: `@nuclearplayer/model` no existe como paquete npm
- El SDK v2.8.0 incluye todos los tipos del modelo en `dist/index.d.ts`. Importa desde `@nuclearplayer/plugin-sdk` directamente.

### Dev-4: Type mismatch snake_case vs camelCase
- SDK usa `stream_url` (snake_case en `YtdlpStreamInfo`). Código interno usa `streamUrl` (camelCase).
- **Solución**: Función `sdkToInternal()` en `src/index.ts` como boundary de mapeo. El caché mantiene el tipo interno.

### Dev-5: Nuclear webview no tiene acceso a Node.js builtins
- El plugin NO puede usar `require('fs')`, `require('child_process')`, etc. El `require` shim falla.
- **Solución**: Usar `api.Ytdlp` (backend Rust) en lugar de `ytdlpWrapper.ts` en el plugin. `ytdlpWrapper.ts` sigue existiendo para el servidor standalone/CLI.

### Dev-6: tsup 8.x usa `.cjs` por defecto para CJS, Nuclear necesita `.js`
- **Solución**: `outExtension: () => ({ js: '.js' })` en tsup config.

---

## 5. Comandos de Verificación

```bash
# Ver estado
git checkout chore/isolate-nuclear-plugin
npm test          # 29 tests deben pasar
npx tsc --noEmit  # verificación de tipos
npx tsup          # genera dist/index.js sin require()

# Verificar bundle limpio
grep "require(" dist/index.js    # debe ser vacío o solo runtime-safe

# Simular evaluación de Nuclear
node -e "
const code = require('fs').readFileSync('dist/index.js','utf8');
const m = {exports: {}};
new Function('exports','module','require',code)(m.exports, m, ()=>{throw new Error('not allowed')});
const plugin = m.exports.default || m.exports;
console.log('Plugin keys:', Object.keys(plugin));
console.log('onLoad:', typeof plugin.onLoad);
console.log('onEnable:', typeof plugin.onEnable);
"
```

---

## 6. Archivos Relevantes

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `package.json` | Metadata Nuclear, `main=dist/index.js`, `build=tsup` | ✅ Completado |
| `tsup.config.ts` | Bundler CJS → `dist/index.js` | ✅ Creado |
| `src/streamCache.ts` | Cache LRU extraída (genérica, `resolveStreamInfo`) | ✅ Creado |
| `src/server.ts` | Servidor Express standalone (usa cache de streamCache) | ✅ Modificado |
| `src/index.ts` | Entry point del plugin Nuclear | ✅ Creado |
| `src/ytdlpWrapper.ts` | Lógica pura de yt-dlp (standalone/CLI) | ✅ Sin cambios |
| `src/ytdlpSetup.ts` | Auto-descarga binario yt-dlp | ✅ Sin cambos |
| `src/cli.ts` | CLI standalone | ✅ Sin cambios |
| `tsconfig.json` | `"type": "module"` (ESM source) | ✅ Sin cambios |
| `AGENTS.md` | Convenciones: ESM + `.js` extension obligatoria | ✅ Sin cambios |
| `tests/index.test.ts` | Tests de integración del Plugin Nuclear | ✅ Creado |
| `tests/ytdlpWrapper.test.ts` | Tests de lógica pura (29 tests en total) | ✅ Verde |
| `.commandcode/taste/` | Preferencias aprendidas (ver sección 2) | — |

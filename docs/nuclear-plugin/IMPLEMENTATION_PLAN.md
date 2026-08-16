# Plan de Desarrollo Eje 1: Plugin de Nuclear

**Fecha**: 2026-08-12
**Objetivo**: Abstraer la lógica del actual servidor NodeJS (MusicProvider) e implementar la API estándar `@nuclearplayer/plugin-sdk` para convertirlo en un módulo de distribución standalone que Nuclear pueda consumir nativamente.

## Etapa 1: Preparación del Entorno Plugin
1. **Configurar NPM para Plugin SDK**
   - Inicializar la estructura requerida por Nuclear.
   - Instalar `@nuclearplayer/plugin-sdk` como dependencia (`npm i -D @nuclearplayer/plugin-sdk`).
   - Ajustar el `package.json` para incluir la entrada `"nuclear": { ... }` con los metadatos requeridos (iconos, permisos, displayName).
2. **Setup del Bundler (tsup o esbuild)**
   - Configurar `tsup` en el proyecto para compilar nuestro código TypeScript (`src/`) en un único archivo CommonJS (`dist/index.js`) que sea compatible con el loader de plugins de Nuclear.

## Etapa 2: Refactorización Arquitectónica
1. **Desacoplar Express.js**
   - En este momento, `ytdlpWrapper.ts` está pensado para ser consumido por un API REST. Debemos extraer los métodos `search()`, `getStreamInfo()`, `getPlaylistInfo()` para que ya no interactúen con Request/Response ni dependan de res.json().
   - Extraer y preservar el gestor de caché `lru-cache` que envuelve las URLs de stream, para seguir entregando caché instantánea.
2. **Definir la clase del Proveedor (Provider)**
   - Crear el archivo principal `src/index.ts`.
   - Implementar las interfaces y ciclo de vida de Nuclear: `onLoad(api)`, `onEnable(api)`.

## Etapa 3: Integración de la API de Nuclear
1. **api.Providers (Streaming y Búsqueda)**
   - Utilizar el objeto `api.Providers.registerAudioSource(...)` o equivalente para inyectar a MusicProvider en el ecosistema.
   - **Búsqueda**: Enlazar la función `yt-search` de nuestra abstracción con el hook de búsqueda del reproductor.
   - **Streaming**: Enlazar la recuperación de URLs de stream (`ytdlpWrapper.getStreamInfo`) al handler de resolución de tracks de Nuclear.
2. **Configuraciones de Usuario (api.Settings)**
   - (Opcional) Proveer ajustes al usuario para configurar la ruta local de `yt-dlp` en caso de que quiera proveer su propio binario, o mantener nuestro sistema de auto-descarga (`ytdlpSetup.ts`).

## Etapa 4: Empaquetado y Verificación
1. **Build y Linting**
   - Correr el comando de build (`npm run build`) y verificar que se genera un `dist/index.js` limpio, que no incluya dependencias problemáticas de Node puras o que dependa de Express (el cual debe ser removido).
2. **Actualización de Unit Tests (Vitest)**
   - Ajustar los tests automatizados para validar los retornos en crudo en vez de las respuestas HTTP de Express.
   - Asegurar que la Pipeline CI/CD en GitHub Actions (`test.yml`) sigue pasando con el nuevo empaquetado.

## Etapa 5: Prueba de Fuego (Nuclear Runtime)
1. **Carga en el Reproductor Nuclear**
   - Cargar manualmente la carpeta `dist/` resultante en el panel de Plugins del cliente web/Tauri de Nuclear.
   - Realizar búsquedas desde la barra de búsqueda de Nuclear y verificar el log de red para certificar que se rutea al plugin.
   - Producir un playback completo, verificando la estabilidad del Stream crudo que `yt-dlp` entrega a la etiqueta `<audio>` / stream del motor interno de Nuclear.

## Etapa 6: Resolución de Edge Cases y Limitaciones
1. **Problema de Playback en Streams Largos (+1 hora)**
   - **Síntoma**: Al intentar cargar un track de larga duración (ej: ~1 hora), el reproductor se queda en un bucle de animación de carga infinito sin llegar a iniciar la reproducción, forzando a desistir.
   - **Posibles Causas**: 
     - La extracción de la URL o el buffer inicial mediante `yt-dlp` falla o hace timeout al procesar un medio tan extenso.
     - Incompatibilidad en la manipulación de Range Headers para el buffering progresivo de un archivo masivo.
     - Expiración de las firmas de URL temporales de YouTube durante la preparación del stream.
    - **Objetivo Técnico**: 
      - Diagnosticar dónde se estanca el proceso (obtención vs enrutamiento de red).
      - Implementar soporte robusto para la entrega por chunks (HTTP 206 Partial Content) y regeneración de URLs si caducan, para asegurar soporte robusto de mixes, podcasts y álbumes largos en Nuclear.

---

**Nota para Agentes**: Todas las implementaciones de código deben respetar el tipado estático riguroso y estar respaldadas por pruebas. ¡Cualquier acoplamiento con servidores HTTP tradicionales (Express/Koa) debe ser eliminado por completo del núcleo del plugin!

---

## Estado de Implementación

| Etapa | Sub-tarea | Estado | Fecha |
|-------|-----------|--------|-------|
| 1.1 | Instalar @nuclearplayer/plugin-sdk, configurar package.json | ✅ Completada | 2026-08-16 |
| 1.2 | Configurar tsup.config.ts (CJS → dist/index.js) | ✅ Completada | 2026-08-16 |
| 2.1 | Extraer caché LRU de server.ts → src/streamCache.ts | ✅ Completada | 2026-08-16 |
| 2.1 | Actualizar server.ts para importar caché extraída | ✅ Completada | 2026-08-16 |
| 2.2 | Crear src/index.ts con ciclo de vida Nuclear (onLoad/onEnable/onDisable/onUnload) | ✅ Completada | 2026-08-16 |
| 2.2 | Implementar StreamingProvider con api.Ytdlp.search() y api.Ytdlp.getStream() | ✅ Completada | 2026-08-16 |
| 2.2 | Mappear tipos SDK (snake_case) → modelo interno (camelCase) | ✅ Completada | 2026-08-16 |
| 3 | Implementar searchForTrackV2 usando api.Ytdlp + tipo Track | ⬜ Pendiente | — |
| 3 | Agregar manejo de playlists (api.Ytdlp.getPlaylist) | ⬜ Pendiente | — |
| 4.1 | Ajustar tests unitarios para validar retornos crudos | ⬜ Pendiente | — |
| 4.2 | CI/CD (test.yml) pasa con nuevo empaquetado | ⬜ Pendiente | — |
| 5 | Cargar plugin en Nuclear, probar búsqueda y playback | ⬜ Pendiente | — |
| 6 | Resolver edge cases (streams largos, range headers) | ⬜ Pendiente | — |

---

## Ejecución por Sesión

### Sesión 1 (2026-08-16) — Etapas 1 y 2: Entorno Plugin + Bundler + Desacoplamiento

1. ✅ Instalar dependencias del plugin SDK y tsup
   - `npm i -D @nuclearplayer/plugin-sdk@^2.8.0 tsup@^8.5.1`
   - **Desviación**: npm 11.12.1 tenía configuración global `omit = ["dev"]` que silenciosamente excludía devDependencies. Solución: `npm i --include=dev` + `npm config delete omit`.

2. ✅ Configurar package.json con metadata Nuclear
   - `"main": "dist/index.js"`, `"build": "tsup"`, `"build:standalone": "tsc"`
   - Sección `"nuclear"`: displayName="MusicProvider", categories=["streaming"], permissions=["net","fs"]

3. ✅ Crear tsup.config.ts para bundler CJS
   - `entry: { index: 'src/index.ts' }`, `format: 'cjs'`, `outDir: 'dist'`
   - `outExtension: () => ({ js: '.js' })` — tsup 8.x usa `.cjs` por defecto, Nuclear necesita `.js`
   - `external: ['@nuclearplayer/plugin-sdk']` — proporcionado por Nuclear en runtime
   - `noExternal: ['lru-cache']` + `esbuildOptions.conditions: ['browser']` — evita `require('diagnostics_channel')` (Node builtin no disponible en webview)

4. ✅ Extraer caché LRU de server.ts → src/streamCache.ts
   - Extracción de `CACHE_TTL`, `streamUrlCache`
   - Nueva API: `resolveStreamInfo(videoId, fetchFn)` — genérica, desacoplada de yt-dlp y Express
   - server.ts importa y reexporta `streamUrlCache` y `CACHE_TTL` para compatibilidad con tests existentes

5. ✅ Crear src/index.ts — entry point del plugin Nuclear
   - `NuclearPlugin` con `onLoad`, `onEnable`, `onDisable`, `onUnload`
   - `StreamingProvider` con `searchForTrack` → `api.Ytdlp.search()` y `getStreamUrl` → `api.Ytdlp.getStream()` + cache
   - Funciones auxiliares: `sdkToInternal()` (snake_case → camelCase), `toStreamCandidate()`, `toStream()`

6. ✅ Validación completa
   - `npx vitest run` → 23 tests pasan (3 archivos)
   - `npx tsc --noEmit` → 0 errores de tipo
   - `npx tsup` → genera `dist/index.js` (26.41 KB)
   - Simulación `evaluatePlugin` con `new Function('exports', 'module', 'require', code)`: plugin se carga, registra/desregistra proveedor correctamente, bundle tiene cero `require()` problemáticos

```log
=== Nuclear Plugin Evaluation Test ===
Plugin type: object
Plugin keys: [ 'onLoad', 'onEnable', 'onDisable', 'onUnload' ]
Registered: music-provider streaming MusicProvider
✅ onLoad executed successfully
✅ onEnable executed successfully
✅ onUnload executed successfully
```

**Conclusión de Sesión 1**: Etapas 1 y 2 completadas. El plugin se construye, carga y ejecuta el ciclo de vida completo en el runtime simulado de Nuclear. Las 23 pruebas existentes pasan sin modificaciones. El bundle es portable (cero require() de módulos no soportados).

---

## Log de Desviaciones

> Formato: `### Dev-[N]: [Título corto]`

### Dev-1: npm 11 silencia devDependencies con `omit = ["dev"]`
- **Fase**: 1.1 — Preparación del Entorno Plugin
- **Plan original**: `npm i -D @nuclearplayer/plugin-sdk tsup` instalaría las dependencias sin problemas.
- **Realidad**: npm mostraba los paquetes como instalados, pero `npx tsup` y `require('@nuclearplayer/plugin-sdk')` fallaban. La causa: `omit = ["dev"]` estaba configurado a nivel global/sistema, excluyendo silenciosamente las devDependencies.
- **Causa**: npm 11.12.1 en este entorno (nvm v24.15.0) puede tener `omit` configurado en el sistema o heredado del entorno.
- **Impacto**: Alto — sin devDependencies, el build con tsup y los types del plugin-sdk no están disponibles.
- **Acción tomada**: Usar `npm i --include=dev` (flag explícito). Luego `npm config delete omit` para remover la configuración.
- **Aprendizaje**: En npm 11, `omit` puede estar configurado por el entorno. Siempre verificar con `npm ls` después de instalar. Usar `--include=dev` cuando las devDependencies son críticas.
- **Agente que detectó**: CommandCode

### Dev-2: `lru-cache` v11 usa `diagnostics_channel` (Node builtin no disponible en Nuclear)
- **Fase**: 1.2 — Setup del Bundler
- **Plan original**: Configurar tsup con `noExternal: ['lru-cache']` para bundlear la dependencia. El bundle resultante sería portable.
- **Realidad**: El bundle incluía `require('diagnostics_channel')` — un módulo builtin de Node.js — que el runtime de Nuclear no proporciona (su `require` shim solo permite 4 módulos: `@nuclearplayer/plugin-sdk`, `@nuclearplayer/ui`, `react`, `react/jsx-runtime`).
- **Causa**: `lru-cache` v11 tiene builds para `node` (usa `diagnostics_channel` para métricas) y `browser` (no lo usa). tsup con `platform: 'node'` resuelve la condición `node` por defecto.
- **Impacto**: Alto — el plugin no cargaría en Nuclear.
- **Acción tomada**: Agregar `esbuildOptions.conditions: ['browser']` al tsup.config.ts. Fuerza a esbuild a usar el build `browser` de `lru-cache`. Bundle resultante: cero llamadas `require()`.
- **Aprendizaje**: Siempre verificar `grep "require(" dist/index.js` antes de cada build. Usar condiciones `browser` para paquetes con builds Node.js específicos.
- **Agente que detectó**: CommandCode

### Dev-3: `@nuclearplayer/model` no está en npm (tipos bundled en plugin-sdk)
- **Fase**: 1.1 — Preparación del Entorno Plugin
- **Plan original**: El plugin importa tipos (`Track`, `Stream`, `StreamCandidate`) que el SDK reexporta desde `@nuclearplayer/model`.
- **Realidad**: `@nuclearplayer/model` no existe como paquete npm (404). El SDK v2.8.0 incluye todos los tipos del modelo en su `dist/index.d.ts` (bundled durante publish). No se necesita instalarlo por separado.
- **Impacto**: Bajo — no requiere acción, solo aclaración.
- **Acción tomada**: Importar todos los tipos directamente desde `@nuclearplayer/plugin-sdk` usando `import type { ... }`.
- **Aprendizaje**: Usar `import type` para imports del SDK — esbuild/tsup los eradiqe durante bundling, evitando runtime requires.
- **Agente que detectó**: CommandCode

### Dev-4: Type mismatch snake_case vs camelCase entre SDK y código interno
- **Fase**: 2.2 — Definir la clase del Proveedor
- **Plan original**: Usar directamente las respuestas de `api.Ytdlp.getStream()` en el caché.
- **Realidad**: `api.Ytdlp.getStream()` devuelve `YtdlpStreamInfo` del SDK con `stream_url` (snake_case), pero el caché y `ytdlpWrapper.ts` usan `YtdlpStreamInfo` interno con `streamUrl` (camelCase).
- **Causa**: El SDK de Nuclear y el código existente de MusicProvider usan convenciones de naming diferentes.
- **Impacto**: Medio — requiere una capa de mapeo.
- **Acción tomada**: Crear `sdkToInternal(info: SDKStreamInfo): YtdlpStreamInfo` en `src/index.ts` que mapea `stream_url` → `streamUrl`. El caché mantiene el tipo interno (camelCase), y el plugin convierte en el boundary.
- **Aprendizaje**: Al integrar código externo, usar funciones de mapeo explícitas en los boundaries es más limpio que modificar tipos existentes.
- **Agente que detectó**: CommandCode

---

## Riesgos y Contingencias

| Riesgo | Contingencia |
|--------|-------------|
| Nuclear `require` shim más restrictivo de lo documentado | Verificar bundle con `grep "require(" dist/index.js` antes de cada build. Si aparece un require no permitido, moverlo a `external` o usar `browser` conditions. |
| `api.Ytdlp` no disponible en runtime (host no configurado) | El `createPluginAPI.ts` siempre proporciona `ytdlpHost`. Añadir guard `api.Ytdlp.available` en `onLoad` como safety net. |
| Bundle demasiado grande para webview | El browser build de `lru-cache` aporta 26KB. Si es problema, reemplazar con `Map` simple + TTL (< 1KB) y usar `lru-cache` solo en standalone server. |
| `yt-search` vs yt-dlp search: formatos diferentes | El SDK usa yt-dlp's `ytsearch:` (Rust backend), no `yt-search` (npm). Documentar diferencias y considerar fallback. |
| Cambios en la API del SDK entre versiones | Fijar `@nuclearplayer/plugin-sdk` a `^2.8.0`. Revisar changelog antes de actualizar. Tests unitarios para `src/index.ts` como regresión guard. |
| npm `omit=dev` vuelve a aparecer | Usar `npm ci --include=dev` o `npm config delete omit`. |

---

## Archivos Relevantes

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `package.json` | Metadata Nuclear, entry point (main=dist/index.js), scripts build=tsup | ✅ Modificado |
| `tsup.config.ts` | Configuración del bundler CJS → dist/index.js | ✅ Creado |
| `src/streamCache.ts` | Módulo de caché LRU extraído (desacoplado de Express) | ✅ Creado |
| `src/server.ts` | Servidor Express standalone (usa cache de streamCache.ts) | ✅ Modificado |
| `src/index.ts` | Entry point del plugin Nuclear (NuclearPlugin + StreamingProvider) | ✅ Creado |
| `tests/api/server.test.ts` | Tests de los endpoints HTTP (pasan sin modificaciones) | ✅ Verde (23 tests) |
| `dist/index.js` | Bundle CJS del plugin (output de tsup, 26.41 KB) | ✅ Generado |

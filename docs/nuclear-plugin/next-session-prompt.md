# SDD — Etapa 1 completada: Próximas tareas para la siguiente sesión

## Resumen de la sesión

Se ha dado inicio oficial a la **Etapa 1 (y principios de la Etapa 2)** del plan de transición a plugin de Nuclear. Todos los objetivos inmediatos del usuario han sido completados:

1. **Entorno plugin**: `@nuclearplayer/plugin-sdk@2.8.0` instalado como `devDependency`, y `package.json` actualizado con metadatos `"nuclear"` (displayName, categories, permissions, icon) y `"main": "dist/index.js"`.
2. **Bundler**: `tsup` instalado y configurado (`tsup.config.ts`). El build produce `dist/index.js` como un único archivo **CommonJS** con **cero `require()` calls** (bundle autocontenido), compatible con el loader de Nuclear.
3. **Desacoplamiento de Express**: El caché LRU (`streamUrlCache`, `getCachedStreamInfo`, `CACHE_TTL`) fue extraído de `src/server.ts` a `src/streamCache.ts`. Se creó `src/index.ts` como entry point del plugin con hooks `onLoad`/`onEnable`/`onUnload` que registra un `StreamingProvider` usando `api.Ytdlp` (el backend Rust de Nuclear).

### Validación
- **23 tests existentes pasan** sin modificaciones.
- **`npx tsc --noEmit`** pasa sin errores de tipado.
- **`npx tsup`** genera `dist/index.js` (26.4 KB) con cero `require()`.

### Nota importante sobre npm
npm tenía `omit=["dev"]` configurado a nivel de sistema, lo que hacía que las `devDependencies` no se instalaran. Se creó `.npmrc` con `omit=` en el directorio del proyecto para corregir esto. Si los paquetes no aparecen tras `npm install`, verificar con `npm config get omit` y asegurar que `.npmrc` contenga `omit=`.

---

## Objetivos para la siguiente sesión (Etapa 2.2 en adelante)

### Etapa 2.2 — Definir la clase del Proveedor (continuar)

El archivo `src/index.ts` ya existe con un `StreamingProvider` básico. Los siguientes pasos son:

1. **Mapear resultados de `api.Ytdlp.search()` a `Track`/`StreamCandidate`**:
   - El SDK usa `YtdlpSearchResult` con `thumbnail` (string). Nuclear's `Track` necesita `thumbnails` (array de `Thumbnail` con `url`, `width?`, `height?`).
   - Convertir `searchForTrack(artist, title, album)` → query de búsqueda → `api.Ytdlp.search()` → mapear a `StreamCandidate[]`.

2. **Mapear `api.Ytdlp.getStream()` a `Stream`**:
   - El SDK usa `YtdlpStreamInfo` con `stream_url` (snake_case). Nuclear's `Stream` usa `url`, `mimeType`, `codec`, `container`, `durationMs`.
   - Usar `resolveStreamInfo(videoId, api.Ytdlp.getStream.bind(api.Ytdlp))` (el resolver genérico en `src/streamCache.ts`) para aplicar caché.

3. **Implementar `searchForTrackV2` (opcional)**: Usar el tipo `Track` del SDK para búsquedas más precisas.

### Etapa 2.3 — Tests de integración

1. **Test unitario para `src/index.ts`**: Mockear `NuclearPluginAPI` y verificar que `onLoad` registra el provider correctamente.
2. **Test para `src/streamCache.ts`**: Verificar el caché LRU funciona (hit/miss, TTL).
3. **Verificar que los tests existentes siguen pasando** tras los cambios.

### Etapa 3 (preview) — Registrar el proveedor en Nuclear

Esta etapa es para después de Etapas 2.2 y 2.3. Implica:
- Usar `api.Providers.register(streamingProvider)` dentro de `onLoad`.
- Mapear nuestros tipos internos (`YtdlpStreamInfo` con `streamUrl` camelCase) a los tipos del SDK (`stream_url` snake_case).
- Considerar la migración del motor de búsqueda de `yt-search` (standalone) a `api.Ytdlp.search` (Nuclear plugin).

---

## Archivos relevantes

| Archivo | Propósito |
|---|---|
| `src/index.ts` | Entry point del plugin Nuclear. Exporta `default` un `NuclearPlugin` con `onLoad`/`onEnable`/`onUnload`. Registra un `StreamingProvider`. |
| `src/streamCache.ts` | Extractor de caché LRU. Exporta `streamUrlCache`, `CACHE_TTL`, `resolveStreamInfo(videoId, fetchFn)` (genérico, inyectable). |
| `src/server.ts` | Servidor Express standalone. Ahora importa el caché desde `streamCache.ts`. |
| `src/ytdlpWrapper.ts` | Lógica pura de yt-dlp (search, getStreamInfo, getPlaylistInfo, downloadTrack). No depende de Express. |
| `src/ytdlpSetup.ts` | Auto-descarga e instalación del binario yt-dlp. |
| `src/cli.ts` | CLI standalone (setup, search, stream, playlist, download). |
| `tsup.config.ts` | Configuración del bundler CJS → `dist/index.js`. |
| `package.json` | Metadata del plugin Nuclear, `"main": "dist/index.js"`, script `"build": "tsup"`. |
| `tsconfig.json` | Configuración TypeScript. `"type": "module"` (ESM source). |
| `AGENTS.md` | Convenciones del proyecto: ESM obligatorio, `.js` extension en imports. |

## Referencias de Nuclear (fuera del repo)

| Archivo | Ubicación | Relevancia |
|---|---|---|
| `PluginLoader.ts` | `nuclear/packages/player/src/services/plugins/` | Lee `package.json` manifest, compila con esbuild (CJS, browser platform), evalúa con `new Function('exports','module','require',code)`. `require` shim solo permite: `@nuclearplayer/plugin-sdk`, `@nuclearplayer/ui`, `react`, `react/jsx-runtime`. |
| `pluginCompiler.ts` | `nuclear/packages/player/src/services/plugins/` | Compila TS→CJS con esbuild-wasm. `format: 'cjs'`, `platform: 'browser'`. Para archivos `.js` ya compilados, devuelve `undefined` (skips compilation). |
| `pluginManifest.ts` | `nuclear/packages/player/src/services/plugins/` | Schema Zod de `package.json` plugin. Required: name, version, description, author, main. `nuclear` opcional: displayName, category, categories, icon, permissions. |
| `createPluginAPI.ts` | `nuclear/packages/player/src/services/plugins/` | Crea `NuclearPluginAPI` con `ytdlpHost` (que invoca comandos Tauri `ytdlp_search`, `ytdlp_get_stream`, `ytdlp_get_playlist` al Rust backend). |
| `types.ts` | `nuclear/packages/plugin-sdk/src/` | Tipos: `NuclearPlugin`, `NuclearPluginAPI`, `StreamingProvider`, `StreamCandidate`, `Stream`, `Track`, `ProviderRef`. |
| `api/index.ts` | `nuclear/packages/plugin-sdk/src/api/` | `NuclearPluginAPI` class. Métodos: `Providers.register()`, `Providers.unregister()`, `Ytdlp.search()`, `Ytdlp.getStream()`, `Ytdlp.getPlaylist()`. |
| `model/Stream.ts` | `nuclear/packages/plugin-sdk/src/model/` | Tipo `Stream`: `{ url, protocol, mimeType?, bitrateKbps?, codec?, container?, qualityLabel?, durationMs?, contentLengthBytes?, source }`. |
| `model/Track.ts` | `nuclear/packages/plugin-sdk/src/model/` | Tipo `Track`: `{ id, title, durationMs?, thumbnails?, source }`. |
| `ytdlp.ts` | `nuclear/packages/plugin-sdk/src/types/` | Tipos del SDK: `YtdlpStreamInfo` (`stream_url` snake_case), `YtdlpSearchResult`, `YtdlpPlaylistInfo`. |

## Decisiones arquitectónicas clave

- El plugin usa `api.Ytdlp` (backend Rust de Nuclear) en lugar de llamar yt-dlp directamente, porque el webview de Nuclear tiene un `require` shim restringido que no permite Node.js built-ins (`fs`, `child_process`, etc.).
- `@nuclearplayer/plugin-sdk` se marca como `external` en tsup porque Nuclear lo provee en runtime; el plugin solo usa tipos del SDK (erasurados en compile time) y el `api` object pasado a `onLoad`.
- `lru-cache` se fuerza a bundlear via `noExternal` porque no está en el allowlist de Nuclear y necesita estar autocontenido.
- `esbuildOptions.conditions: ['browser']` evita que `lru-cache` v11 importe `diagnostics_channel` (Node.js builtin no disponible en webview).
- La lógica de caché se diseñó como `resolveStreamInfo(videoId, fetchFn)` — función genérica con inyección de dependencias — para reutilización entre standalone server (`ytdlpWrapper.getStreamInfo`) y plugin (`api.Ytdlp.getStream`).

## Comando para iniciar

```bash
git checkout chore/isolate-nuclear-plugin
# Verificar estado
npm test          # 23 tests deben pasar
npx tsup          # debe producir dist/index.js sin require()
npx tsc --noEmit  # verificación de tipos
```

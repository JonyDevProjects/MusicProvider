# Análisis de Dependencias y Tecnologías — MusicProvider

**Última actualización:** 2026-08-21  
**Objetivo:** Describir la justificación técnica, roles y ciclos de vida de cada dependencia activa en el proyecto **MusicProvider** como Plugin oficial de Nuclear.

---

## 1. Dependencias de Producción (Core & Runtime)

| Paquete | Versión | Tipo | Justificación Técnica y Propósito |
|---|---|---|---|
| **`@nuclearplayer/plugin-sdk`** | `^2.8.0` | Peer / SDK | Define las interfaces y tipos oficiales de Nuclear (`Plugin`, `StreamProvider`, `StreamCandidate`, `TrackMetadata`, `PlaylistTrack`). Permite tipado estricto y registro de proveedores. |
| **`yt-search`** | `^2.13.1` | Core Scraper | Motor de búsqueda de YouTube de latencia ultra-baja (~100-300 ms). No requiere API keys ni emulación de navegador. Ideal para autocompletado y búsquedas de canciones en caliente. |
| **`yt-dlp`** *(Binario + Wrapper)* | Dynamic | Core Extractor | Extractor de streams y descargas de audio. Descargado y actualizado dinámicamente según plataforma (`ytdlpSetup.ts`), resuelve URLs de CDN con descifrado de firmas (`n-token challenge`). |
| **`lru-cache`** | `^11.5.2` | Core Cache | Caché LRU en memoria Heap de V8 (`max: 100`, `TTL: 5min`). Convierte resoluciones de 2.5s en consultas instantáneas en memoria RAM de ~14 microsegundos. |
| **`adm-zip`** | `^0.5.14` | Packaging | Generación determinista del asset oficial `plugin.zip` conteniendo únicamente `index.js` y `package.json` en la raíz plana para el instalador de Nuclear Store. |
| **`express` / `cors`** | `^5.2.1` | Dev / Testing | Capa de servidor HTTP opcional para desarrollo, benchmarking (`benchmarks/`) y pruebas de streaming progresivo. Totalmente desacoplada del core del plugin. |

---

## 2. Dependencias de Desarrollo y Empaquetado (Tooling)

| Herramienta | Versión | Rol en el Proyecto |
|---|---|---|
| **`tsup`** | `^8.5.1` | Empaquetador basado en `esbuild`. Genera un bundle CommonJS autónomo (`dist/index.js`, ~34 KB) con todas las dependencias embebidas (`noExternal: [/(.*)/]`). |
| **`typescript`** | `^5.9.3` | Compilador y chequeador estático de tipos (`npx tsc --noEmit`). |
| **`vitest`** | `^1.6.0` | Test runner moderno ESM. Ejecuta las suites de pruebas unitarias, scraper, extractor y plugin en <1 segundo. |
| **`@playwright/test`** | `^1.61.1` | Pruebas end-to-end de fixtures y validación de streaming en navegadores web. |
| **`tsx`** | `^4.16.2` | Ejecutor de TypeScript en desarrollo sin paso previo de compilación (usado en `scripts/package-plugin.ts` y benchmarks). |

---

## 3. Principio de Aislamiento y "Zero External Runtime"

Para garantizar que el plugin se instale y ejecute limpiamente en cualquier instalación de Nuclear desktop:
1. **Bundle Autónomo**: `tsup` empaqueta la lógica core en un único archivo JavaScript (`index.js`). No se requiere `node_modules` en la carpeta de instalación de Nuclear (`plugins/music-provider/1.0.0/`).
2. **Desacoplamiento HTTP**: El plugin no requiere un servidor Express levantado en background cuando corre dentro de Nuclear; interactúa directamente a través de las APIs nativas del SDK de Nuclear (`api.Http`, `api.Ytdlp`, `api.Logger`).

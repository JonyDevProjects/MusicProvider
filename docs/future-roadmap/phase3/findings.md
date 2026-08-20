# Hallazgos Técnicos — Roadmap Fase 3 (Nuclear vs Spoti5)

Última actualización: 2026-08-19

---

## 1. Contexto del Problema

MusicProvider llegó a un punto de inflexión arquitectónico: funciona como plugin de Nuclear (`src/index.ts`) y como backend Express para Spoti5 (`src/server.ts`). La Fase 3 del futuro roadmap pide decidir con datos si el modelo debe seguir siendo híbrido/isomórfico o si Spoti5 debe adoptar la filosofía de plugins. Este archivo consolida los hallazgos que alimentan esa decisión.

## 2. Restricciones de arquitectura conocidas (pre-seeded)

Estas restricciones provienen de la experiencia acumulada (integración Nuclear + case study iOS). Se usan como base de los specs y de la matriz de decisión. **Se actualizan cuando el benchmark o la ejecución aporte evidencia nueva.**

| # | Restricción / Hallazgo | Implicación |
|---|------------------------|-------------|
| R-1 | El sandbox de plugins de Nuclear **no tiene dependencias HTTP nativas**; los plugins usan `api.Http.fetch` | Todo scraping/HTTP del plugin debe usar la API del host (nunca `axios`/`fetch` de Node) |
| R-2 | `api.Http.fetch` **NO DEBE** enviar cabeceras manuales `Accept-Encoding: gzip, deflate, br` | `reqwest` en Rust (Nuclear) no tiene habilitada la descompresión automática en `Cargo.toml`. Enviarlo devuelve bytes crudos comprimidos en `response.text()`, corrompiendo el HTML y quebrando el parsing de `ytInitialData`. |
| R-3 | `source.provider` en Nuclear debe coincidir exactamente con el `STREAMING_ID` activo | Si no coincide, Nuclear ejecuta un `searchForTrack` redundante que retrasa el playback 1–2s |
| R-4 | IDs malformados pasados por plugins competidores crashean el backend Rust de yt-dlp de Nuclear | El plugin DEBE validar inputs antes de llamar a `api.Ytdlp.getStream` |
| R-5 | Usar `api.Ytdlp.getStream` delega el procesamiento pesado al backend Rust | Aislamiento óptimo; el plugin no descarga binarios ni hace spawn |
| R-6 | El scraping directo del HTML de YouTube es más robusto que APIs públicas frágiles | `omnisource` falló con 503; el scraping vía `ytInitialData` es la vía estable |
| R-7a | `ytdlpSetup.ts` está **DISCARDED** para Nuclear | Nuclear gestiona yt-dlp en Rust; el plugin solo delega vía Host API |
| R-7b | `ytdlpWrapper.ts` se convierte en la lógica del plugin (MetadataProvider/StreamProvider) | Mantener funciones puras; mapping a tipos del host |
| R-7c | El parsing NDJSON se preserva en el TS plugin y en Rust | Un contrato de parsing compartido entre herederos |
| R-7d | `child_process.spawn` está **PROHIBIDO** en TS plugins (Tauri) | Las descargas NO pueden usar spawn; solo vía Host APIs/fs de Tauri |
| R-7e | Las descargas en el host Nuclear usan Tauri `fs` API, no Node `fs` | El plugin no puede asumir Node APIs de sistema |
| R-7f | Los tipos de TrackInfo deben mapear a `@nuclearplayer/model` | Menos refactor si las interfaces se nombran como las de Nuclear |
| R-7g | Las URLs de yt-dlp directas requieren proxy local (Nuclear tiene `stream_server.rs`) | No devolver CDN URL cruda al reproductor sin el mecanismo de proxy/refresh |
| R-8 | El plugin debe registrar providers en `onEnable`, no en `onLoad` | La instalación por UI llama `PluginLoader.load()` sin el `api` argument |
| R-9 | Spoti5 fue aislado al repo propio `~/JoniDev/Spoti5` (commit `fce7870`) | "Un solo repo" dejó de ser verdad; la Alternativa A/D deben considerar dos repos |
| R-10 | iOS/cellular: YouTube CDN bloquea playback directo sin backend intermedio (case study `ios-cellular-playback`) | Spoti5 sin servidor propio exige un host intermedio (plugin local con proxy, o server) |

## 3. Hallazgos por Sub-Fase

### Fase 3.0 — Línea base y contexto
*(Inventario ejecutado — 2026-08-19 — por Command Code como orquestador)*

#### 3.0.1 Inventario del Express Wrapper (`src/server.ts` — 256 líneas)

| Endpoint | Método | Función | Dependencia Core |
|----------|--------|---------|-----------------|
| `/api/search` | GET | Búsqueda vía `yt-search` (NO yt-dlp). Warmup asíncrono de top 3 resultados al LRU cache | `search()` de `ytdlpWrapper.ts` |
| `/api/info` | GET | Metadata de un video por URL directa | `getStreamInfo()` |
| `/api/audio/resolve` | GET | Pre-resuelve y cachea la CDN URL. Devuelve `streamUrl`, `duration`, `title`, `container`, `codec` | `getCachedStreamInfo()` → `resolveStreamInfo()` |
| `/api/audio/stream` | GET | **Proxy de bytes**: reenvía Range requests al CDN de YouTube. Transparent refresh 403 (si el CDN responde 403, invalida cache y reintenta con URL nueva) | `getCachedStreamInfo()` + `https/http.Agent` con keep-alive |
| `/api/playlist` | GET | Extrae metadatos de playlist por URL | `getPlaylistInfo()` |
| `/api/download` | POST | Descarga audio a disco (`downloads/`) | `downloadTrack()` |
| Static | GET | Sirve Flutter web build desde `Spoti5_app/build/web` (configurable vía `WEB_BUILD_DIR`) | `express.static()` |

**Detalles técnoticos del proxy streaming:**
- Usa `https.Agent({ keepAlive: true })` y `http.Agent({ keepAlive: true })` para reusar conexiones TCP/TLS al CDN
- Transparent refresh 403: si el CDN devuelve 403, borra la URL del cache LRU, regenera via `getCachedStreamInfo()` y reintenta una vez
- Propaga headers del CDN al cliente (Content-Length, Content-Range, Content-Type)
- Filtra hop-by-hop headers (connection, keep-alive, transfer-encoding, etc.)
- Timeout de conexión del cliente: cancela `proxyReq` cuando el cliente cierra (`req.on('close')`)

#### 3.0.2 Inventario del Plugin Wrapper (`src/index.ts` — 270 líneas)

| Provider | ID | Kind | Métodos |
|----------|----|------|---------|
| Streaming | `music-provider-streaming` | `streaming` | `searchForTrack`, `searchForTrackV2`, `getStreamUrl` |
| Playlist | `music-provider-playlist` | `playlists` | `matchesUrl`, `fetchPlaylistByUrl` |
| Metadata | `music-provider-metadata` | `metadata` | `search` (tracks, unified) |

**Flujo de datos del plugin:**
1. `searchForTrack` / `searchForTrackV2`: scraping directo de YouTube HTML → parsing `ytInitialData` → `scrapeYoutube()`
2. `getStreamUrl`: delega a `api.Ytdlp.getStream(id)` → mapea `SDKStreamInfo` → `YtdlpStreamInfo` interno → cache via `resolveStreamInfo()`
3. `fetchPlaylistByUrl`: delega a `api.Ytdlp.getPlaylist(url)`
4. `search` (metadata): misma lógica de scraping que streaming
5. Providers se registran en `onEnable` (NO en `onLoad`) — restricción R-8

**Notas críticas:**
- Scraping YouTube usa `api.Http.fetch` con headers `Accept-Encoding: gzip, deflate, br` (R-2)
- Fallback del scraping: si falla `ytInitialData`, delega a `api.Ytdlp.search()` (R-6)
- `toStream()` añade `&range=0-99999999999` para forzar HTTP 206 en players sin Range header

#### 3.0.3 Inventario Core

| Archivo | Líneas | Responsabilidad | Estado Nuclear |
|---------|--------|-----------------|----------------|
| `ytdlpWrapper.ts` | 240 | `search` (yt-search), `getStreamInfo` (yt-dlp), `getPlaylistInfo` (yt-dlp), `downloadTrack` (yt-dlp spawn). Parsing NDJSON para playlists | Activo — core compartido |
| `streamCache.ts` | 33 | LRU cache (max 100, TTL 5min) para promesas de `YtdlpStreamInfo`. Evita llamadas duplicadas concurrentes al mismo videoId | Activo — core compartido |
| `ytdlpSetup.ts` | 179 | Descarga/actualización del binario yt-dlp desde GitHub nightly. Auto-update cada 1h. Soporte macOS/Linux/Win | **DISCARDED para Nuclear** (R-7a) — Nuclear gestiona yt-dlp en Rust |
| `cli.ts` | 121 | CLI standalone con Commander: `setup`, `search`, `stream`, `playlist`, `download` | Solo para uso directo/standalone |

**Dependencias de `package.json`:**

| Dependencia | Versión | Uso | Relevante para Nuclear |
|-------------|---------|-----|----------------------|
| express | ^5.2.1 | Server HTTP (wrapper Express) | NO — solo PoC Spoti5 |
| cors | ^2.8.6 | CORS para Express | NO |
| yt-search | ^2.13.1 | Búsqueda rápida (NO yt-dlp) | SÍ — search del plugin |
| lru-cache | ^11.5.2 | Cache de URLs de stream | SÍ — core compartido |
| axios | ^1.7.2 | HTTP para setup de yt-dlp | NO — solo para binario |
| adm-zip | ^0.5.14 | Extracción de yt-dlp zip | NO — solo para binario |
| commander | ^12.1.0 | CLI | NO |
| @nuclearplayer/plugin-sdk | ^2.8.0 (dev) | Tipos del plugin Nuclear | SÍ — tipos del plugin |

#### 3.0.4 Inventario Spoti5 (`~/JoniDev/Spoti5`)

| Archivo | Responsabilidad |
|---------|-----------------|
| `api_service.dart` (87 líneas) | Cliente HTTP a Express. `searchTracks`, `getStream`, `getStreamUrl`, `warmupCache`. Usa `http.Client` con connection pooling. Pre-resuelve streams antes de pasar URL al player |
| `music_service.dart` (22 líneas) | Interfaz abstracta `MusicService`: `searchTracks`, `getStream`, `warmupCache`. Clase `StreamResult` con `url`, `headers`, `durationSeconds` |
| `music_service_factory.dart` (24 líneas) | Factory: web → `[ApiService()]`, nativo → `[ApiService(), YtExplodeService()]` (híbrido desactivado post-Fase 4.5 SDD) |

**Configuración de red Spoti5:**
- Emulador Android: `http://10.0.2.2:3000/api`
- iOS/Web/Desktop: `http://localhost:3000/api`
- Dispositivo físico: `--dart-define=BASE_URL=...`

#### 3.0.5 Prerrequisitos confirmados

| Prerrequisito | Estado | Detalle |
|---------------|--------|---------|
| Phase 2 (transparent refresh) | ✅ | Mergeado en `feat/phase-2-transparent-refresh` (commit `71e6d65`) |
| Phase 1 (age-restriction) | ⚠️ | Paralela, sin bloqueo para Fase 3 |
| Repo Spoti5 aislado | ✅ | `~/JoniDev/Spoti5` (rama `chore/isolate-nuclear-plugin`) |

| Métrica de línea base | Valor | Fecha / Run |
|-----------------------|-------|-------------|
| Latencia tap-to-audio (cache frío, Express) | _(por medir)_ | — |
| Latencia tap-to-audio (cache caliente, Express) | _(por medir)_ | — |
| RAM host Nuclear con plugin | _(por medir)_ | — |
| RAM host Nuclear sin plugin (baseline) | _(por medir)_ | — |
| Fricción de distribución plugin (.zip) | _(por medir)_ | — |
| Fricción de distribución backend Express | _(por medir)_ | — |

### Fase 3.1 — Diseño del Benchmark
*(Pendiente de ejecución — spec creado en `benchmark-spec.md`)*

### Fase 3.2 — Ejecución del Benchmark
*(Pendiente de ejecución — resultados se registran aquí)*

**Modelo API (Express → Flutter):**

| Track | Run 1 | Run 2 | Run 3 | p50 | p95 | p99 | media | Notas |
|-------|-------|-------|-------|-----|-----|-----|-------|-------|
| Queen - We Will Rock You | 2036.76ms | 2020.06ms | 2087.43ms | 2036.76ms | 2082.36ms | 2086.41ms | 2048.08ms | Cold cache [short] |
| Rick Astley - Never Gonna Give You Up | 2244.88ms | 2945.87ms | 2328.09ms | 2328.09ms | 2884.09ms | 2933.51ms | 2506.28ms | Cold cache [standard] |
| Radiohead - Creep | 2271.42ms | 2324.31ms | 2027.73ms | 2271.42ms | 2319.02ms | 2323.25ms | 2207.82ms | Cold cache [standard] |
| PSY - Gangnam Style | 2947.88ms | 2607.5ms | 2890.83ms | 2890.83ms | 2942.18ms | 2946.74ms | 2815.41ms | Cold cache [standard] |
| Luis Fonsi - Despacito ft. Daddy Yankee | 2323.75ms | 1990.05ms | 2124.82ms | 2124.82ms | 2303.86ms | 2319.77ms | 2146.21ms | Cold cache [standard] |
| Queen - Bohemian Rhapsody | 2332.85ms | 2715.12ms | 2473.61ms | 2473.61ms | 2690.97ms | 2710.29ms | 2507.19ms | Cold cache [standard] |
| Led Zeppelin - Stairway to Heaven | 2178.54ms | 2049.37ms | 2119.44ms | 2119.44ms | 2172.63ms | 2177.36ms | 2115.78ms | Cold cache [long] |
| Dire Straits - Sultans Of Swing (Alchemy Live) | 2095.44ms | 2105.42ms | 1947.8ms | 2095.44ms | 2104.42ms | 2105.22ms | 2049.55ms | Cold cache [long] |
| Pink Floyd - Echoes (Live at Pompeii) | — | — | — | 0ms | 0ms | 0ms | 0ms | Error: yt-dlp failed: ERROR: [youtube] bM7SZ5SBzyY: Please sign in. Use --cookies-from-browser or --cookies for the authentication. See  https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp  for how to manually pass cookies. Also see  https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies  for tips on effectively exporting YouTube cookies
 |
| Lofi Girl / Chillhop - Lofi Hip Hop Chill Beats - Study Mix | 1928.1ms | 2436.62ms | 1773.19ms | 1928.1ms | 2385.77ms | 2426.45ms | 2045.97ms | Cold cache [mix] |

**Modelo Integrado (Plugin JS → host nativo):**

| Track | Run 1 | Run 2 | Run 3 | p50 | p95 | p99 | media | Notas |
|-------|-------|-------|-------|-----|-----|-----|-------|-------|
| Queen - We Will Rock You | 1772.53ms | 1938.79ms | 2516.01ms | 1938.79ms | 2458.29ms | 2504.47ms | 2075.78ms | Isolated SDK [short] |
| Rick Astley - Never Gonna Give You Up | 2265.99ms | 2210.17ms | 1878.65ms | 2210.17ms | 2260.41ms | 2264.87ms | 2118.27ms | Isolated SDK [standard] |
| Radiohead - Creep | 2157.9ms | 2034.73ms | 2369.7ms | 2157.9ms | 2348.52ms | 2365.47ms | 2187.44ms | Isolated SDK [standard] |
| PSY - Gangnam Style | 2299.55ms | 2137.06ms | 2276.11ms | 2276.11ms | 2297.2ms | 2299.08ms | 2237.57ms | Isolated SDK [standard] |
| Luis Fonsi - Despacito ft. Daddy Yankee | 1982.95ms | 2160.51ms | 2017.56ms | 2017.56ms | 2146.21ms | 2157.65ms | 2053.67ms | Isolated SDK [standard] |
| Queen - Bohemian Rhapsody | 2371.28ms | 2019.52ms | 2542.13ms | 2371.28ms | 2525.04ms | 2538.71ms | 2310.97ms | Isolated SDK [standard] |
| Led Zeppelin - Stairway to Heaven | 4550.34ms | 2076.34ms | 2448.38ms | 2448.38ms | 4340.14ms | 4508.3ms | 3025.02ms | Isolated SDK [long] |
| Dire Straits - Sultans Of Swing (Alchemy Live) | 4162.39ms | 2004.76ms | 2055.37ms | 2055.37ms | 3951.69ms | 4120.25ms | 2740.84ms | Isolated SDK [long] |
| Pink Floyd - Echoes (Live at Pompeii) | — | — | — | 0ms | 0ms | 0ms | 0ms | Error: yt-dlp failed: ERROR: [youtube] bM7SZ5SBzyY: Private video. Sign in if you've been granted access to this video. Use --cookies-from-browser or --cookies for the authentication. See  https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp  for how to manually pass cookies. Also see  https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies  for tips on effectively exporting YouTube cookies
 |
| Lofi Girl / Chillhop - Lofi Hip Hop Chill Beats - Study Mix | 3100.25ms | 2214.34ms | 2218.62ms | 2218.62ms | 3012.09ms | 3082.62ms | 2511.07ms | Isolated SDK [mix] |

**RAM:**

| Escenario | Pico | Media | RSS | Plataforma | Notas |
|-----------|------|-------|-----|------------|-------|
| Nuclear con plugin | _(por medir)_ | — | — | — | — |
| Nuclear sin plugin | _(por medir)_ | — | — | — | — |
| Proceso Express | _(por medir)_ | — | — | — | — |
| Spoti5 (móvil, si aplica) | _(por medir)_ | — | — | — | — |

**Rúbrica de distribución (1–5):**

| Criterio | Plugin (.zip) | Backend Express |
|----------|---------------|-----------------|
| Artefactos a generar | _(por medir)_ | _(por medir)_ |
| Pasos de instalación | _(por medir)_ | _(por medir)_ |
| Requisitos de infraestructura | _(por medir)_ | _(por medir)_ |
| Tiempo de setup | _(por medir)_ | _(por medir)_ |
| **Total** | _(por medir)_ | _(por medir)_ |

### Fase 3.3 — Evaluación comparativa y matriz de decisión

#### 3.3.1 Matriz de Decisión Ponderada (Re-evaluada post-benchmark)

| Criterio (peso) | A: Isomórfico | B: Plugins JS | C: Forks | D: Plugin Engine Dart |
|-----------------|:-------------:|:-------------:|:--------:|:---------------------:|
| **Latencia tap-to-audio (25%)** | 4 (1.00) | 3 (0.75) | 4 (1.00) | 4 (1.00) |
| **RAM host/móvil (20%)** | 3 (0.60) | 3 (0.60) | 4 (0.80) | 4 (0.80) |
| **Facilidad de distribución (20%)** | 3 (0.60) | 5 (1.00) | 2 (0.40) | 3 (0.60) |
| **Mantenibilidad (15%)** | 4 (0.60) | 2 (0.30) | 1 (0.15) | 4 (0.60) |
| **Riesgo técnico (10%)** | 4 (0.40) | 1 (0.10) | 5 (0.50) | 4 (0.40) |
| **Esfuerzo (10%)** | 4 (0.40) | 1 (0.10) | 4 (0.40) | 3 (0.30) |
| **Total Ponderado (100%)** | **3.60** | **2.85** | **3.25** | **3.70** |

*Escala de calificación: 1 = Muy desfavorable / Crítico, 2 = Desfavorable / Alto costo, 3 = Aceptable / Neutro, 4 = Favorable / Bueno, 5 = Óptimo / Excelente.*

> **Nota arquitectónica post-benchmark (`latest.json`):**
> Los datos empíricos del benchmark demuestran que la latencia en frío está dominada en un 96.6% por `yt-dlp` (`getStreamInfo()`), con una media de **2592.30 ms** en Modelo API (Express) vs **2504.84 ms** en Modelo Integrado (Plugin JS), arrojando un delta de tan solo **~87.46 ms (3.4%)**. La capa de red de Express proxy **NO es el cuello de botella**. En caché caliente ambos responden en sub-milisegundos (0.02ms API vs 0.01ms Integrado). Esto invalida la penalización a los modelos basados en servidor y refuta la ventaja de latencia atribuida a la Alternativa B.

---

#### 3.3.2 Justificación de Puntajes por Criterio

##### 1. Latencia tap-to-audio (Peso: 25%)
*Evaluación: Tiempo de resolución de stream y entrega de bytes (Cold & Warm cache).*

- **Alternativa A (Puntaje: 4/5)** *(anteriormente 3/5)*:
  - *Nuclear*: Flujo óptimo en proceso local delegando en `api.Ytdlp.getStream` (Rust) y `stream_server.rs` (R-5, R-7g).
  - *Spoti5*: El benchmark demuestra que el salto HTTP a Express (`/api/audio/resolve` y `/api/audio/stream`) añade una penalización despreciable (<90ms respecto a los ~2.5s que toma `yt-dlp`). El pooling con `keepAlive` y la resolución directa garantizan un rendimiento indistinguible de la integración nativa. En warm cache la entrega es instantánea (~0.02ms).
- **Alternativa B (Puntaje: 3/5)** *(anteriormente 4/5)*:
  - *Ambos entornos*: Elimina el servidor Express, pero **no reduce la latencia en frío** porque el cuello de botella reside en la extracción de YouTube (`yt-dlp`), no en la capa Express.
  - *Penalización móvil*: En Spoti5 móvil (iOS/Android), la ejecución en motores JS embebidos (`flutter_js`/`quickjs`) carece de backend Rust/yt-dlp nativo (R-5, R-7d). El scraping JS en red celular y el paso por puente JSI/FFI introducen variabilidad y riesgo de degradación sin aportar beneficio real frente a un backend optimizado.
- **Alternativa C (Puntaje: 4/5)**:
  - *Nuclear*: Plugin puro sin intermediarios (RF-C-1).
  - *Spoti5*: En frío sufre los mismos ~2.5s de yt-dlp, pero su servidor potente dedicado con pre-descarga a disco y caché persistente permite servir pistas pre-cacheadas a 0ms de resolución.
- **Alternativa D (Puntaje: 4/5)** *(anteriormente 3/5)*:
  - *Nuclear*: Plugin JS estándar sobre Host API de Nuclear (óptimo).
  - *Spoti5*: `spoti5_plugin_sdk` en Dart nativo puro (0 overhead de puente JS). Al conectarse al backend Express con `http.Client` reutilizando conexiones, logra la misma paridad de ~2.5s en frío y sub-milisegundos en caliente validada en el benchmark, sin la sobrecarga ni fragilidad de un runtime JS en móvil.

##### 2. Consumo de RAM host/móvil (Peso: 20%)
*Evaluación: Procesos concurrentes y componentes en memoria necesarios para operar.*

- **Alternativa A (Puntaje: 3/5)**:
  - *Nuclear*: Overhead mínimo (<= 20MB adicionales, RNF-A.2) al ejecutarse en el sandbox de Tauri delegando en Rust (R-5).
  - *Spoti5*: Requiere un proceso de servidor Node.js/Express dedicado corriendo en host/VPS (consumo de Node runtime + LRU cache + módulos de `package.json`, 3.0.1, 3.0.3).
- **Alternativa B (Puntaje: 3/5)**:
  - *Nuclear*: Consumo mínimo en host.
  - *Spoti5*: Elimina el servidor Node.js externo, pero traslada el consumo a la RAM del móvil al embeber la máquina virtual JS (`flutter_js`/`quickjs`), sumando un overhead estimado de <= 30MB en memoria móvil (RF-B-1, RNF-B-2), compitiendo con los recursos de la UI y del reproductor.
- **Alternativa C (Puntaje: 4/5)**:
  - *Nuclear*: Plugin puro ultraligero (sin Express, sin `spawn`, sin binarios propios, R-5, R-7a, R-7d).
  - *Spoti5 móvil*: Cero trabajo pesado de extracción en el teléfono (RAM móvil mínima). El consumo de memoria queda totalmente aislado en el servidor potente dedicado (RF-C-2).
- **Alternativa D (Puntaje: 4/5)**:
  - *Nuclear*: Consumo normal de plugin.
  - *Spoti5 móvil*: Dart nativo puro sin máquinas virtuales JS embebidas (RAM móvil óptima, RNF-D-4). El proceso servidor Express corre de forma desacoplada como backend existente (3.0.1).

##### 3. Facilidad de distribución (Peso: 20%)
*Evaluación: Cantidad de artefactos, pasos de despliegue e infraestructura requerida.*

- **Alternativa A (Puntaje: 3/5)**:
  - *Nuclear*: Distribución óptima mediante un único archivo `.zip` cargable desde la UI (`PluginLoader.load()`, R-8).
  - *Spoti5*: Requiere levantar y configurar el backend Express (Node.js, dependencias, puerto, túnel o VPS para acceso remoto/móvil por R-10, 3.0.4).
- **Alternativa B (Puntaje: 5/5)**:
  - *Ambos entornos*: Máxima simplicidad. Un único artefacto `.zip` universal (`music-provider-vX.Y.Z.zip`) alimenta tanto a Nuclear como a Spoti5 (RF-B-3, RNF-B-3). Cero servidores Express que mantener, cero túneles y cero infraestructura en la nube.
- **Alternativa C (Puntaje: 2/5)**:
  - *Nuclear*: Artefacto `.zip` independiente vía CI.
  - *Spoti5*: Requiere empaquetado y distribución de un servidor backend completo (imágenes Docker, despliegue en VPS/Cloud, gestión de túneles y configuración de endpoints remotos, RF-C-2, RNF-C-3).
- **Alternativa D (Puntaje: 3/5)**:
  - *Nuclear*: Artefacto `.zip` para Nuclear.
  - *Spoti5*: La app móvil compila con `ApiService` embebido como plugin Dart por defecto, pero sigue requiriendo la infraestructura del servidor Express existente para operar (RF-D-3, R-10).

##### 4. Mantenibilidad y código compartido (Peso: 15%)
*Evaluación: Número de bases de código, volumen de código duplicado y esfuerzo de sincronización ante cambios de YouTube.*

- **Alternativa A (Puntaje: 4/5)**:
  - Centraliza la lógica de scraping (`ytInitialData`), parsing NDJSON y cache LRU en un Core agnóstico único (`src/core/`) con transporte HTTP inyectado (`HttpLike`) y tests unitarios únicos con Vitest (RF-A.1, RF-A.5, RNF-A.3).
  - *Penalización leve*: Mantiene dos wrappers (`src/index.ts` y `src/server.ts`, 3.0.1, 3.0.2) en MusicProvider, conviviendo con el repo Spoti5 aislado (R-9).
- **Alternativa B (Puntaje: 2/5)**:
  - Simplifica el repositorio MusicProvider (elimina `server.ts` y Express, RF-B-6).
  - *Penalización severa*: Traslada una enorme deuda de mantenimiento a Spoti5, que debe implementar y sincronizar un subconjunto de `@nuclearplayer/plugin-sdk` en Dart (RF-B-2) y mantener la compatibilidad del runtime JS ante cambios en el SDK de Nuclear (R-1, R-3, R-4).
- **Alternativa C (Puntaje: 1/5)**:
  - Peor escenario: dos bases de código separadas e independientes (`MusicProvider-Nuclear` y `MusicProvider-Spoti5`).
  - Duplica parsing NDJSON, extracción y scraping de YouTube HTML (`ytInitialData`). Cualquier cambio en YouTube (R-6) obliga a corregir y desplegar dos repositorios por separado (RF-C-1, RF-C-2).
- **Alternativa D (Puntaje: 4/5)**:
  - Respeta los lenguajes y herramientas idiomáticas de cada proyecto: Dart nativo modular en Spoti5 (`spoti5_plugin_sdk` + `PluginRegistry`, RF-D-1, RF-D-2) y TypeScript en MusicProvider.
  - No hay emulación de runtimes ajenos ni puentes frágiles; el contrato REST probado de Express sirve de interfaz estable (3.0.1, RF-D-3).

##### 5. Riesgo técnico (Peso: 10%)
*Evaluación: Respeto vs violación de restricciones R-1 a R-10 y viabilidad de las abstracciones.*

- **Alternativa A (Puntaje: 4/5)**:
  - El Core agnóstico desacopla dependencias de red mediante inyección (`HttpLike`). El wrapper Nuclear cumple estrictamente R-1 a R-8 (sin spawn R-7d, sin fs R-7e, registrando en `onEnable` R-8 y validando inputs R-4).
  - Riesgo bajo: posible fuga de abstracción en tipos si no se cuida el aislamiento del Core.
- **Alternativa B (Puntaje: 1/5)**:
  - **Riesgo crítico / Múltiples colisiones con restricciones**:
    - Choca con R-5, R-7a y R-7d: `api.Ytdlp.getStream` delega en el backend Rust de Nuclear; en iOS no existe backend Rust ni se permite ejecutar binarios externos (`spawn` prohibido en sandbox App Store).
    - Choca con R-10: Al eliminar el backend, resolver el bloqueo del CDN de YouTube en conexiones celulares móviles exige implementar un proxy HTTP local con Range 206 dentro del propio dispositivo iOS.
    - Soporte incompleto de ES2020 y APIs asíncronas en motores JS embebidos (`flutter_js`/`quickjs`).
- **Alternativa C (Puntaje: 5/5)**:
  - **Mínimo riesgo técnico**: Cada contexto opera sin compromisos ni abstracciones forzadas.
    - Nuclear opera como plugin TS puro cumpliendo R-1 a R-8 al 100%.
    - Spoti5 opera respaldado por un servidor potente con transparent refresh 403 (Phase 2), resolviendo el bloqueo celular de iOS (R-10).
    - Asume formalmente la separación física de repositorios (R-9).
- **Alternativa D (Puntaje: 4/5)**:
  - Riesgo bajo: Conserva el backend Express probado en Phase 2 (commit `71e6d65`), garantizando transparent refresh 403 y resolución de bloqueo celular en iOS (R-10).
  - No fuerza ejecución de JS en móvil (evita los riesgos de B).
  - Respeta R-9 concentrando los cambios en el repo Spoti5 (`~/JoniDev/Spoti5`).

##### 6. Esfuerzo de implementación (Peso: 10%)
*Evaluación: Alcance de desarrollo, complejidad de refactor y semanas estimadas.*

- **Alternativa A (Puntaje: 4/5)**:
  - Estimación: 1–2 semanas (RNF-A.4).
  - Alcance: Refactor de extracción interna a `src/core/` (`extractor.ts`, `ytScraper.ts`, `cache.ts`), contratos `HttpLike`, adaptación de `index.ts` y `server.ts`, tests con dobles en Vitest. No altera el cliente móvil.
- **Alternativa B (Puntaje: 1/5)**:
  - Estimación: 1–2 meses (RNF-B.4).
  - Alcance: Reingeniería masiva en Spoti5 (integración de motor JS, bindings FFI/JSI, emulación de `@nuclearplayer/plugin-sdk` en Dart, proxy móvil local con Range requests).
- **Alternativa C (Puntaje: 4/5)**:
  - Estimación: 1–2 semanas iniciales (RNF-C.4).
  - Alcance: Podar archivos en fork Nuclear (eliminar `server.ts`, `cli.ts`, `ytdlpSetup.ts`), empaquetar fork Spoti5 (servidor con cache y pre-descarga).
- **Alternativa D (Puntaje: 3/5)**:
  - Estimación: 2–4 semanas (RNF-D.3).
  - Alcance: Creación del paquete `spoti5_plugin_sdk` en Dart, refactor de `PlayerProvider` y `PluginRegistry` en Flutter, migración de `MusicServiceFactory` a `StrategyManager`, adaptación de `ApiService`.

---

#### 3.3.3 Análisis Cualitativo por Alternativa

##### Alternativa A: Modelo Isomórfico (Core Agnóstico)
- **Fortalezas**:
  - Reutilización máxima del código de scraping y extracción en un único módulo agnóstico (`src/core/`).
  - Un único conjunto de pruebas unitarias (`vitest`) protege la lógica de YouTube contra regresiones.
  - Esfuerzo de implementación contenido (1–2 semanas) y bajo riesgo técnico.
  - **Validado por benchmark**: Latencia indistinguible del modelo integrado (~2.5s cold, 0.02ms warm).
- **Debilidades**:
  - Mantiene la dualidad de wrappers (`index.ts` y `server.ts`) dentro del mismo repositorio de MusicProvider.
  - Spoti5 continúa requiriendo infraestructura de backend Express (aunque esta es esencial para solventar R-10).
- **Restricciones más relevantes**:
  - **R-1 y R-2**: Obligan a diseñar el Core con inyección de cliente HTTP (`HttpLike`) para permitir `api.Http.fetch` con gzip en Nuclear y `axios`/`fetch` en Node.js.
  - **R-5 y R-7d**: El Core no puede utilizar `spawn` ni binarios locales para no romper el entorno de plugins de Nuclear.
  - **R-9**: Reconoce que el cliente Spoti5 vive en otro repositorio (`~/JoniDev/Spoti5`), por lo que "isomórfico" aplica a los wrappers de backend/plugin, no al cliente Dart.

##### Alternativa B: Ecosistema de Plugins JS en Spoti5
- **Fortalezas**:
  - Experiencia de distribución: un único artefacto `.zip` universal para Nuclear y Spoti5.
  - MusicProvider se convierte en un plugin puro; el backend Express se elimina.
- **Debilidades**:
  - **Sin ganancia de latencia**: El benchmark demuestra que eliminar el servidor Express no reduce el tiempo de arranque en frío (~2.5s de yt-dlp).
  - Esfuerzo de desarrollo desproporcionado (1–2 meses).
  - Mayor consumo de RAM en el dispositivo móvil (+30MB por motor JS).
  - Complejidad extrema de mantenimiento al tener que sincronizar un host Dart con la especificación de plugins de Nuclear.
- **Restricciones más relevantes**:
  - **R-5, R-7a y R-7d**: Son el principal obstáculo técnico. Nuclear delega en Rust (`api.Ytdlp.getStream`), pero en Flutter/iOS no se puede hacer `spawn` de yt-dlp ni ejecutar binarios no firmados.
  - **R-10**: Sin backend Express intermediario, la app móvil en iOS debe absorber todo el bypass del CDN de YouTube (Range requests y refresh de URLs bloqueadas).

##### Alternativa C: Separación de Contextos (Forks Especializados)
- **Fortalezas**:
  - Rendimiento pre-descarga: Servidor potente con pre-caching a disco y plugin puro en Nuclear.
  - Mínimo riesgo técnico inicial en cada plataforma aislada.
- **Debilidades**:
  - Mantenibilidad crítica: dos bases de código separadas que duplican la lógica de scraping (`ytInitialData`) y parsing NDJSON.
  - Vulnerabilidad ante cambios de YouTube (R-6): cada cambio en YouTube requiere arreglos manuales y despliegues en dos proyectos distintos.
  - Distribución fragmentada con necesidad de infraestructura de servidor para Spoti5.
- **Restricciones más relevantes**:
  - **R-6**: El scraping directo es frágil ante cambios de UI de YouTube; mantener dos scrapers independientes multiplica el costo de soporte.
  - **R-9 y R-10**: Asume formalmente la separación física de proyectos y valida la necesidad de un servidor intermedio para el tráfico celular en iOS.

##### Alternativa D: Eje 2 — Spoti5 Plugin Engine (Dart)
- **Fortalezas**:
  - **Puntaje más alto en la matriz (3.70/5)**.
  - Arquitectura limpia, idiomática y extensible en Spoti5 mediante `spoti5_plugin_sdk` y `PluginRegistry` nativos en Dart, sin puentes JS.
  - Reutiliza el backend Express y `ApiService` probados (Phase 2 transparent refresh 403), preservando la estrategia de fallback de iOS y connection pooling.
  - Permite a Spoti5 adoptar nuevos proveedores de música en Dart sin modificar el Core de la aplicación.
- **Debilidades**:
  - Requiere esfuerzo de desarrollo medio-alto concentrado en el repositorio Flutter (`~/JoniDev/Spoti5`).
  - No elimina la dependencia de infraestructura de servidor Express para el plugin oficial.
- **Restricciones más relevantes**:
  - **R-9**: Se alinea de forma natural con la separación de repositorios, focalizando el trabajo en `~/JoniDev/Spoti5`.
  - **R-10**: Mantiene el backend Express como proxy validado para solventar el bloqueo celular de iOS.
  - **Phase 2 (transparent refresh)**: Capitaliza el trabajo previo completado en `src/server.ts` sin descartarlo.

---

#### 3.3.4 Trade-offs Clave Identificados

1. **Simplicidad de Distribución vs Realidad del Cuello de Botella (B vs A/D)**:
   - La Alternativa B prometía eliminar el servidor a cambio de un gran esfuerzo, pero los benchmarks demuestran que **el servidor Express no penaliza la latencia (<90ms de delta)**. Pagar 1-2 meses de desarrollo y asumir riesgos severos en iOS (R-5, R-7d, R-10) por 0ms de ganancia en el cuello de botella yt-dlp convierte a B en inviable.
2. **Reutilización de Código vs Especialización de Plataforma (A vs C)**:
   - La Alternativa A minimiza la duplicación de código centralizando el scraping en un Core agnóstico (clave para mitigar R-6), mientras que la Alternativa C genera deuda técnica al bifurcar scrapers.
3. **Foco de Desarrollo y Sinergia Óptima: Enfoque Híbrido (A + D)**:
   - **La combinación A + D sigue siendo la mejor decisión arquitectónica**:
     - **En `MusicProvider` (Repo actual)**: Se ejecuta la **Alternativa A**, extrayendo el Core agnóstico (`src/core/`) para servir limpiamente tanto a Nuclear (`src/index.ts`) como al backend Express (`src/server.ts`) con Vitest unit tests.
     - **En `Spoti5` (`~/JoniDev/Spoti5`)**: Se ejecuta la **Alternativa D**, creando el motor de plugins en Dart (`spoti5_plugin_sdk`) donde el proveedor por defecto es `ApiService` conectando al backend Express optimizado.
   - Este híbrido maximiza la mantenibilidad (4/5), minimiza el riesgo técnico (4/5), optimiza la RAM en móvil (4/5) y ofrece una latencia óptima (~2.5s cold, <0.02ms warm).

---

**Decisión:** ✅ **Híbrido A+D** — Alternativa A (Core Agnóstico) primero en MusicProvider, luego Fase 4 (Empaquetado/CI/CD), y Alternativa D (Spoti5 Plugin Engine) en repo Spoti5.

**Justificación**: El benchmark demostró que la latencia NO es un factor discriminante entre modelos (delta 3.5%, p=0.288 — no significativo). El bottleneck es yt-dlp (~2.5s), no la capa de red. La decisión se basa en mantenibilidad (A=4/5), distribución, y restricciones de plataforma (R-5, R-7d, R-10). Ver [decision-and-execution-plan.md](./decision-and-execution-plan.md).

### Fase 3.4 — Ejecución de la decisión
*(Pendiente de ejecución — ruta elegida y pointers se registran aquí)*

---

## 4. Decisiones Pendientes

| Decisión | Opciones | Recomendación |
|----------|----------|---------------|
| Modelo arquitectónico final | A / B / C / D (o híbrido) | **TBD tras benchmark + matriz (Fase 3.3)** |
| Repositorio donde continúa el plan | MusicProvider vs Spoti5 | Depende de la ganadora (D → Spoti5) |
| Persistencia del backend Express | Mantener como PoC / eliminar / convertir en servidor pre-descarga | Depende de la ganadora |
| Mobile plugin execution | No ejecutar JS (D) vs motor embebido (B) | TBD con evidencia de JSI/streaming |

---

## 5. Métricas de Referencia

| Métrica | Objetivo modelo API (Express) | Objetivo modelo Integrado (Nuclear) |
|---------|------------------------------|-------------------------------------|
| Latencia tap-to-audio p95 | < 3s (histórico Proxy Solutions) | <= modelo API (benchmark define delta) |
| RAM host | Proceso Express dedicado | Delta Nuclear plugin vs baseline |
| Distribución | Túnel/VPS/Docker | `.zip` + PluginLoader |
| Mantenimiento | 2 wrappers sobre Core | 1 wrapper (plugin) |

> Referencias documentales: `docs/archive/roadmap-proxy-solutions/`, `docs/archive/ios-cellular-playback/`, `docs/archive/roadmap-nuclear-plugin-spoti5-evolution.md`, `docs/future-roadmap/future_roadmap_and_architecture.md`.
# 🎵 MusicProvider — Plugin para Nuclear Music Player

[![CI](https://github.com/JonyDevProjects/MusicProvider/actions/workflows/ci.yml/badge.svg)](https://github.com/JonyDevProjects/MusicProvider/actions/workflows/ci.yml)
[![Release Plugin](https://github.com/JonyDevProjects/MusicProvider/actions/workflows/release.yml/badge.svg)](https://github.com/JonyDevProjects/MusicProvider/actions/workflows/release.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/JonyDevProjects/MusicProvider/releases/tag/v1.0.0)
[![Plugin SDK](https://img.shields.io/badge/@nuclearplayer/plugin--sdk-2.8.0-green.svg)](https://github.com/NuclearPlayer/nuclear)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

**MusicProvider** es un plugin oficial y autónomo de TypeScript para el reproductor de música libre y de código abierto **[Nuclear](https://nuclear.js.org/)** (`@nuclearplayer/plugin-sdk`).

Proporciona búsqueda de pistas de muy baja latencia, resolución directa de streams crudos (M4A/WEBM Opus) y un sistema de caché LRU en memoria RAM que acelera las consultas repetidas a **~14 microsegundos** (~176,000x más rápido que la resolución en frío).

---

## ⚡ Características Principales

- 🔍 **Búsqueda Instantánea**: Motor de búsqueda optimizado (`yt-search`) con latencias de respuesta de 100-300 ms sin necesidad de API keys de Google.
- 🎧 **Extracción de Streams de Alta Calidad**: Resolución directa de flujos de audio (`yt-dlp` / scraper isomórfico) con descifrado dinámico de tokens anti-throttling (`n-token`).
- ⚡ **Caché LRU en Memoria V8**: Almacenamiento en caliente de URLs de streaming (`lru-cache`) con expiración inteligente por TTL (5 min) y descarte de streams fallidos.
- 📦 **Zero-External Runtime Bundle**: Empaquetado con `tsup` / `esbuild` en un único bundle CommonJS (`dist/index.js`, ~34 KB) totalmente autónomo, sin requerir `node_modules` en tiempo de ejecución.
- 🏬 **Conformidad Estricta con Nuclear Plugin Store**: Generación determinista del asset oficial `plugin.zip` con estructura plana en raíz (`index.js` + `package.json`) y metadatos estándar (`category: "streaming"`, `categories: ["streaming", "metadata"]`).
- 🚀 **Integración CI/CD Automatizada**: Publicación automática de GitHub Releases con assets válidos al crear tags semver (`v*`).

---

## 💎 Propuesta de Valor y Evidencia de Rendimiento (Benchmarks)

MusicProvider resuelve el cuello de botella tradicional de latencia en reproductores de escritorio mediante una arquitectura híbrida que separa la **búsqueda instantánea** de la **resolución de streams**:

### 📊 Benchmark Comparativo: Backend Nativo vs MusicProvider Plugin

| Métrica / Operación | Backend Tradicional (`yt-dlp` spawn) | MusicProvider Plugin (Híbrido) | Factor de Mejora / Evidencia |
|:---|:---:|:---:|:---|
| **Latencia de Búsqueda** | ~1,730 ms | **100 – 300 ms** (`yt-search`) | **🚀 +70% a +85% más rápido** (sin spawn de procesos) |
| **Overhead de CPU en Búsqueda** | Alto (Spawnea subproceso Python por tecla) | **Insignificante** (V8 Task nativo) | Cero carga térmica y ahorro drástico de batería |
| **Resolución Cold Cache** | ~2,592 ms | **~2,504 ms** | Idéntico (I/O Bound hacia CDN de Google) |
| **Resolución Warm Cache (RAM)** | ~2,592 ms (re-ejecuta subproceso) | **0.0142 ms (14.2 µs)** | **⚡ ~176,500x más rápido** (lookup O(1) en V8 Heap) |
| **Time-to-First-Byte (Audio Play)** | 5,000 – 15,000 ms (descarga completa) | **20 – 83 ms** (`Range: bytes=0-`) | Inicio de reproducción prácticamente instantáneo |
| **Consumo de Disco en Playback** | 10 – 20 MB por canción | **0 MB (Streaming directo)** | Sin desgaste de SSD ni archivos temporales huérfanos |

> 📈 *Datos extraídos de suites formales de benchmarking (`benchmarks/results/analysis-latency.md` y `benchmarks/results/latest.json`).*

### 🎧 Ventajas del Streaming Progresivo frente a Descarga Nativa Completa

1. **Playback Instantáneo (Baja Latencia de Inicio)**:
   Al usar peticiones HTTP parciales (`Range: bytes=0-`), el decodificador de audio comienza a sonar tras descargar los primeros ~200 KB en lugar de esperar la descarga total de 10-20 MB.
2. **Cero Fugas de Memoria con Streaming NDJSON**:
   El procesador por líneas `ndjson.ts` procesa catálogos y listas gigantescas evento por evento (`stdout.on('data')`), evitando bloqueos de Event Loop y errores de Out of Memory (OOM).
3. **Resiliencia ante Expiración (Transparent Refresh)**:
   Las firmas temporales de YouTube caducan a las 4-6 horas. MusicProvider detecta errores `403 Forbidden` en reproducciones largas (mixes/podcasts) y re-resuelve automáticamente el stream en caliente sin cortar la reproducción.

---

## 🏗️ Arquitectura del Proyecto

```
MusicProvider Plugin
├── src/
│   ├── index.ts               # Punto de entrada y registro con @nuclearplayer/plugin-sdk
│   ├── core/
│   │   ├── cache.ts           # Motor de caché LRU en memoria (V8 Heap)
│   │   ├── extractor.ts       # Extractor y parser de streams yt-dlp / NDJSON
│   │   ├── ytScraper.ts       # Scraper isomórfico de búsqueda y metadata
│   │   ├── ndjson.ts          # Parser por streaming para evitar problemas de OOM
│   │   └── types.ts           # Tipos de dominio y mapeos del SDK
│   ├── ytdlpSetup.ts          # Descarga y setup automático de binarios yt-dlp
│   ├── ytdlpWrapper.ts        # Wrapper de llamadas al proceso yt-dlp
│   └── server.ts              # Servidor HTTP Express de desarrollo/pruebas
├── scripts/
│   └── package-plugin.ts      # Empaquetador determinista para Nuclear Store (plugin.zip)
├── benchmarks/                # Arnés de pruebas de rendimiento y latencia
└── tests/                     # Test suite completo (Vitest + Playwright)
```

---

## 🚀 Comandos Rápidos

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar el bundle del plugin con tsup
npm run build:plugin

# 3. Generar el paquete oficial para Nuclear Store (plugin.zip)
npm run package

# 4. Ejecutar la suite de tests automáticos (Vitest)
npm test

# 5. Ejecutar tests E2E con Playwright
npm run test:e2e

# 6. Ejecutar benchmarks de rendimiento y latencia
npm run benchmark:all

# 7. (Opcional) Levantar servidor Express para desarrollo/pruebas locales
npm run dev:server
```

---

## 🧪 Pruebas Manuales en Nuclear Desktop

Para probar el plugin en vivo dentro de la aplicación de escritorio de Nuclear:

1. Generar el paquete de desarrollo:
   ```bash
   npm run package
   ```
2. Iniciar Nuclear en modo Tauri dev:
   ```bash
   cd ../nuclear/packages/player
   pnpm tauri dev
   ```
3. Abrir DevTools (`Cmd + Option + I` en macOS o F12).
4. Ir a **Settings > Plugins > Add Plugin** y seleccionar la carpeta de staging generada (`../music-provider-plugin`).
5. Verificar en la pestaña **Console** los logs `[MusicProvider] Plugin enabled` y `[cache] Stream URL cache HIT`.

---

## 📚 Estructura de Documentación

Toda la documentación técnica del proyecto se encuentra organizada de forma modular en el directorio [`docs/`](./docs/):

- 📘 **[Guía de Onboarding & Arquitectura](./docs/README.md)**: Índice general del sistema y guía para nuevos desarrolladores.
- 🔌 **[Integración con Nuclear](./docs/nuclear-plugin/)**: Planes de implementación, mapeo arquitectónico y valor del plugin.
- 🗺️ **[Roadmap y Fases de Evolución](./docs/future-roadmap/)**:
  - **[Fase 1: Restricción de Edad y Autenticación](./docs/future-roadmap/future_roadmap_and_architecture.md#fase-1-manejo-de-restricción-de-edad-age-restricted-content)** — Soporte de cookies y configuración de parámetros para videos con restricción de edad.
  - **[Fase 2: Streams Largos y Refresh Transparente](./docs/future-roadmap/future_roadmap_and_architecture.md#fase-2-casos-extremos-streams-largos-y-caducidad)** — Manejo de caducidad de firmas (HTTP 403) con re-resolución transparente en caliente.
  - **[Fase 3: Motor Isomórfico y Benchmarks](./docs/future-roadmap/phase3/)** — Desacoplamiento del core, benchmarking riguroso de latencia (Cold vs Warm Cache) y optimización en memoria.
  - **[Fase 4: Empaquetado Standalone y CI/CD](./docs/future-roadmap/phase4/)** — Bundle CommonJS autónomo con `tsup` (~34 KB) y pipelines de GitHub Actions.
  - **[Fase 5: Publicación en Nuclear Plugin Store](./docs/future-roadmap/phase5/)** — Conformidad con `plugin.zip`, Release oficial `v1.0.0` y metadatos para `NuclearPlayer/plugin-registry`.
- 🧪 **[Estrategia de Testing](./docs/testing/)**: Pruebas unitarias, de integración, E2E y protocolo de DevTools.
- 📊 **[Optimizaciones y Rendimiento](./docs/optimizations/)**: Análisis de latencia, benchmarks y lecciones aprendidas.
- 📖 **[Referencias Técnicas](./docs/reference/)**: Análisis de dependencias y flujo GitFlow.
- 📦 **[Archivo Histórico](./docs/archive/)**: Documentación de exploraciones previas (Spoti5 mobile POC, pruebas de proxy y experimentos).

---

## 📄 Licencia

Este proyecto está disponible bajo la licencia MIT.

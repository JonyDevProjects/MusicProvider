# Guía de Arquitectura y Documentación: MusicProvider

**Última actualización:** 2026-08-21  
**Estado del Proyecto:** ✅ Versión `v1.0.0` empaquetada, probada y lista para Nuclear Plugin Store.

¡Bienvenido a la documentación técnica de **MusicProvider**! Este documento centraliza la arquitectura, el diseño de módulos y el índice completo de documentación para el desarrollo continuo del plugin.

---

## 1. Visión y Propósito del Proyecto

MusicProvider es un plugin de TypeScript de alto rendimiento diseñado para el reproductor de música **Nuclear** (`@nuclearplayer/plugin-sdk`). Su objetivo es resolver búsquedas de canciones y extraer URLs de streaming de YouTube con la menor latencia posible y máxima resiliencia.

### Principios de Diseño
1. **Aislamiento y Autonomía**: El plugin se compila como un bundle CommonJS autónomo de ~34 KB sin dependencias externas en tiempo de ejecución.
2. **Aceleración por Memoria (In-Memory Caching)**: Utiliza un caché LRU en la memoria Heap de V8 para responder a consultas repetidas en **~14 microsegundos**, eliminando llamadas innecesarias a la red o a subprocesos.
3. **Manejo Seguro de Streams y Memoria**: Emplea parseo línea por línea (NDJSON) para evitar problemas de desbordamiento de memoria (OOM) en listas de reproducción grandes.
4. **Conformidad Estricta con Nuclear Store**: Cumple al 100% las especificaciones de empaquetado (`plugin.zip`), denominación de campos (`id`, `category: "streaming"`, `categories: ["streaming"]`) y ciclo de vida de plugins.

---

## 2. Mapa Arquitectónico del Código

```
src/
├── index.ts               # Punto de integración con el SDK de Nuclear (@nuclearplayer/plugin-sdk)
├── core/
│   ├── index.ts           # Exportaciones consolidadas del motor core
│   ├── cache.ts           # Instancia de LRU Cache (max: 100, TTL: 5 min)
│   ├── extractor.ts       # Extractor y formateador de streams y metadatos
│   ├── ytScraper.ts       # Scraper de búsqueda de tracks y playlists con fallbacks
│   ├── ndjson.ts          # Parser asíncrono para streaming NDJSON
│   └── types.ts           # Definiciones de tipos del dominio y del SDK
├── ytdlpSetup.ts          # Gestión de binarios nativos yt-dlp según SO
├── ytdlpWrapper.ts        # Invocación de subprocesos yt-dlp
├── streamCache.ts         # Wrapper de compatibilidad para el caché de streams
└── server.ts              # Servidor HTTP Express para desarrollo/benchmarks locales
```

---

## 3. Índice y Estructura de Documentación

La documentación se organiza de forma temática en las siguientes secciones:

### 🔌 1. Integración con Nuclear (`docs/nuclear-plugin/`)
- [IMPLEMENTATION_PLAN.md](./nuclear-plugin/IMPLEMENTATION_PLAN.md) — Plan integral de implementación y ciclo de vida en Nuclear.
- [VALUE_PROPOSITION.md](./nuclear-plugin/VALUE_PROPOSITION.md) — Propuesta de valor, análisis comparativo frente a scrapers web tradicionales.
- [architecture_mapping.md](./nuclear-plugin/architecture_mapping.md) — Mapeo de tipos y correspondencia entre MusicProvider y Nuclear SDK.
- [integration_guide.md](./nuclear-plugin/integration_guide.md) — Guía práctica para probar e instalar el plugin en Nuclear Desktop.

### 🗺️ 2. Fases de Evolución y Roadmap (`docs/future-roadmap/`)
- [future_roadmap_and_architecture.md](./future-roadmap/future_roadmap_and_architecture.md) — Visión global de evolución arquitectónica.
- **[Fase 1: Restricción de Edad y Cookies](./future-roadmap/future_roadmap_and_architecture.md#fase-1-manejo-de-restricción-de-edad-age-restricted-content)**:
  - Integración de menú de configuración (`api.Settings`) para cookies y bypass de contenido +18 mediante `yt-dlp`.
- **[Fase 2: Streams Largos y Refresh Transparente](./future-roadmap/future_roadmap_and_architecture.md#fase-2-casos-extremos-streams-largos-y-caducidad)**:
  - Monitoreo de expiración de firmas (HTTP 403) y regeneración transparente del stream en caliente con persistencia en caché LRU.
- **[Fase 3: Motor Isomórfico y Benchmarking](./future-roadmap/phase3/)**:
  - [decision-and-execution-plan.md](./future-roadmap/phase3/decision-and-execution-plan.md) — Diseño y ejecución del motor desacoplado de frameworks HTTP.
  - [findings.md](./future-roadmap/phase3/findings.md) y [session-log.md](./future-roadmap/phase3/session-log.md) — Benchmarking de latencia Cold vs Warm Cache.
- **[Fase 4: Empaquetado Standalone y CI/CD](./future-roadmap/phase4/)**:
  - [README.md](./future-roadmap/phase4/README.md) — Configuración de `tsup` (bundle ~34 KB), `scripts/package-plugin.ts` y workflows de GitHub Actions.
  - [session-log.md](./future-roadmap/phase4/session-log.md) — Bitácora de la Fase 4.
- **[Fase 5: Publicación en Nuclear Plugin Store](./future-roadmap/phase5/)**:
  - [README.md](./future-roadmap/phase5/README.md) — Especificación y requisitos oficiales de publicación en Nuclear Plugin Store.
  - [decision-and-execution-plan.md](./future-roadmap/phase5/decision-and-execution-plan.md) — Release oficial `v1.0.0`, conformidad con `plugin.zip` y preparación del PR para `NuclearPlayer/plugin-registry`.
  - [session-log.md](./future-roadmap/phase5/session-log.md) — Bitácora de la Fase 5.

### 🧪 3. Estrategia de Pruebas (`docs/testing/`)
- [README.md](./testing/README.md) — Guía completa de testing (Vitest, integración de SDK, Playwright E2E y DevTools de Nuclear).
- [manual-test-nuclear-plugin-2026-08-18.md](./testing/manual-test-nuclear-plugin-2026-08-18.md) — Reporte de pruebas manuales en vivo en Nuclear Desktop.
- [manual-test-session-template.md](./testing/manual-test-session-template.md) — Plantilla para sesiones de prueba manual.

### 📊 4. Optimizaciones y Benchmarks (`docs/optimizations/`)
- [README.md](./optimizations/README.md) — Resumen de optimizaciones de latencia y caché.
- [nuclear-plugin-latency-2026-08-18.md](./optimizations/nuclear-plugin-latency-2026-08-18.md) — Análisis detallado de latencia (Cold Cache: 2.5s vs Warm Cache: 14µs).
- [lessons-learned.md](./optimizations/lessons-learned.md) — Lecciones aprendidas durante la optimización del scraping y caché.
- [alternativas-spec.md](./optimizations/alternativas-spec.md) — Evaluación de arquitecturas alternativas.

### 📖 5. Referencias Técnicas (`docs/reference/`)
- [dependency_analysis.md](./reference/dependency_analysis.md) — Justificación técnica y roles de las dependencias del proyecto.
- [gitflow.md](./reference/gitflow.md) — Políticas de ramas, releases y convenciones de commits.

### 📦 6. Archivo Histórico (`docs/archive/`)
Contiene los registros de las primeras etapas del proyecto, incluyendo exploraciones descartadas (ej. cliente móvil Flutter / Spoti5, pruebas de proxy celular y soluciones intermedias).
- [`docs/archive/legacy-spoti5-poc/`](./archive/legacy-spoti5-poc/) — Setup original de Spoti5 y análisis de dependencias de Flutter.
- [`docs/archive/legacy-spoti5-testing/`](./archive/legacy-spoti5-testing/) — Informes de pruebas manuales y planes de testing en dispositivos móviles.
- [`docs/archive/ios-cellular-playback/`](./archive/ios-cellular-playback/) — Investigaciones de reproducción de audio sobre redes celulares en iOS.
- [`docs/archive/roadmap-proxy-solutions/`](./archive/roadmap-proxy-solutions/) — Especificaciones de proxies locales y remotos.

---

## 4. Flujo de Desarrollo Recomendado

1. **Desarrollar cambios**: Modificar archivos en `src/`.
2. **Ejecutar pruebas automatizadas**: `npm test` y `npx tsc --noEmit`.
3. **Empaquetar plugin**: `npm run package` (verifica que `plugin.zip` contenga `index.js` y `package.json`).
4. **Probar en Nuclear Desktop**: Cargar la carpeta de staging (`~/JoniDev/music-provider-plugin`) en Nuclear (`pnpm tauri dev`) y validar la pestaña Console de DevTools.

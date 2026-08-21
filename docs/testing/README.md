# Estrategia de Pruebas y Calidad (Testing Guide) — MusicProvider

**Última actualización:** 2026-08-21  
**Objetivo:** Guía integral de testing para el plugin de Nuclear `music-provider`, cubriendo pruebas unitarias, integración de SDK, fixtures E2E, benchmarking y verificación manual en Nuclear Desktop.

---

## 1. Pirámide de Pruebas del Proyecto

```
                ▲
               / \
              /   \     [Pruebas Manuales en Nuclear Desktop (Tauri DevTools)]
             /-----\
            /       \    [E2E Web Fixtures (Playwright)]
           /---------\
          /           \   [Integración de Plugin SDK & HTTP Proxy (Vitest)]
         /-------------\
        /               \  [Unit Tests: Core Scraper, Extractor, LRU Cache (Vitest)]
       -------------------
```

---

## 2. Pruebas Unitarias y de Módulos Core (Vitest)

Ejecutan en milisegundos sin llamadas externas a red mediante mocks estrictos y validación de tipos:

| Suite | Archivo | Qué Valida |
|---|---|---|
| **Cache LRU** | [`tests/core/cache.test.ts`](../../tests/core/cache.test.ts) | Aciertos (*hits*), fallos (*misses*), expiración por TTL y aislamiento en V8 Heap. |
| **Extractor Core** | [`tests/core/extractor.test.ts`](../../tests/core/extractor.test.ts) | Parseo de JSON/NDJSON de `yt-dlp`, mapeo de streams crudos (M4A/WEBM) y control de errores. |
| **Scraper Core** | [`tests/core/ytScraper.test.ts`](../../tests/core/ytScraper.test.ts) | Construcción de consultas a YouTube, resiliencia ante errores de red y normalización de metadata. |
| **Setup de Binarios** | [`tests/ytdlpSetup.test.ts`](../../tests/ytdlpSetup.test.ts) | Detección de arquitectura de SO, descarga y permisos de ejecución del binario `yt-dlp`. |

```bash
# Ejecutar todas las pruebas unitarias y de integración
npm test
```

---

## 3. Pruebas de Integración con `@nuclearplayer/plugin-sdk`

Ubicadas en [`tests/index.test.ts`](../../tests/index.test.ts), validan el contrato completo del plugin:
- **Ciclo de vida**: `onLoad()`, `onEnable()`, `onDisable()`, `onUnload()`.
- **Registro de Proveedores**: Inyección de `streamProvider` en el registry de Nuclear.
- **Mapeo de Tipos**: Conversión exacta a `StreamCandidate`, `Track`, `Album` y `Artist`.
- **Caché en Caliente**: Verificación de que la segunda consulta de un stream retorna en microsegundos sin re-invocar scrapers.

---

## 4. Pruebas de Integración Live (`tests/ytdlpWrapper.test.ts`)

- Valida la búsqueda real en YouTube y extracción directa de streams usando `yt-dlp`.
- **Comportamiento en CI**: Se salta automáticamente cuando `process.env.CI` está activo para evitar bloqueos por IP / CAPTCHA en los data centers de GitHub Actions.

---

## 5. Pruebas End-to-End con Playwright (`tests/e2e/`)

Valida el comportamiento del audio y el streaming progresivo en navegadores web:

```bash
# Ejecutar tests E2E
npm run test:e2e

# Modo interactivo con UI
npm run test:e2e:ui

# Ver reporte generado
npm run test:e2e:report
```

---

## 6. Protocolo de Pruebas Manuales en Nuclear Desktop (Tauri DevTools)

Para validar el plugin en el entorno real de Nuclear:

1. **Compilar y empaquetar el plugin**:
   ```bash
   npm run package
   ```
2. **Iniciar Nuclear en modo desarrollo**:
   ```bash
   cd /Users/jonathanquishpe/JoniDev/nuclear/packages/player
   pnpm tauri dev
   ```
3. **Abrir DevTools**:
   - Presionar `Cmd + Option + I` (o F12).
4. **Cargar el Plugin**:
   - En Nuclear, ir a **Settings > Plugins > Add Plugin**.
   - Seleccionar la carpeta externa de staging limpia (`/Users/jonathanquishpe/JoniDev/music-provider-plugin`).
5. **Comprobar la Consola de DevTools**:
   - `[MusicProvider] Plugin enabled`: Indica carga exitosa.
   - `[Core:Scraper]`: Logs de scraping de búsqueda.
   - `[cache] Stream URL cache HIT`: Valida la aceleración en memoria RAM.

---

## 7. Benchmarks de Rendimiento

El proyecto cuenta con un arnés de benchmarking para medir latencia de resolución (Cold vs Warm Cache):

```bash
# Ejecutar suite completa de benchmarks
npm run benchmark:all

# Ver resultados más recientes
cat benchmarks/results/latest.json
cat benchmarks/results/analysis-latency.md
```

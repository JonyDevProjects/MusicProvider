# E2E Tests — Plataforma Web (Playwright)

## Contexto

La plataforma Web de MusicProvider está compuesta por el servidor REST en Express
(`src/server.ts`, endpoints `/api/search`, `/api/info`, `/api/playlist`, `/api/download`)
y el frontend Flutter compilado para Web (`Spoti5_app/web`). Hasta ahora las pruebas
automáticas del repositorio se limitan a Vitest sobre el wrapper de `yt-dlp`
(`tests/ytdlpWrapper.test.ts`, `tests/ytdlpSetup.test.ts`), sin cobertura de comportamiento
extremo-a-extremo ni de la interfaz web.

Se requiere una capa de pruebas E2E que valide el flujo completo a través del navegador,
asegurando que el servidor y el cliente web interactúen correctamente ante búsquedas,
consulta de información, playlists y descargas.

## Diseño

- **Stack:** `@playwright/test` con proyectos para Chromium, Firefox y WebKit.
- **Arranque del sistema bajo prueba:** Playwright levanta el servidor Express vía
  `npm run dev:server` (webServer en `playwright.config.ts`), reutilizando el entrypoint
  existente sin duplicar lógica de arranque.
- **Estructura:**
  - `playwright.config.ts` — configuración global, proyectos de navegador y webServer.
  - `tests/e2e/` — carpeta de especificaciones E2E (archivos `*.spec.ts`).
  - `tests/e2e/helpers.ts` — utilidades compartidas (endpoints, health check).
  - `tests/e2e-results/` y `tests/e2e-report/` — salida de trazas, videos e informe HTML.
- **Scripts:** `test:e2e`, `test:e2e:ui`, `test:e2e:report` en `package.json`.
- **Alcance:** Esta fase solo prepara el ecosistema. Los casos de prueba concretos se
  añadirán en iteraciones posteriores, siguiendo el ciclo SDD (`strict_tdd`) del proyecto.

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `playwright.config.ts` | Nuevo — configuración E2E y webServer |
| `tests/e2e/helpers.ts` | Nuevo — helpers y constantes de endpoints |
| `tests/e2e/.gitkeep.ts` | Nuevo — placeholder de la carpeta E2E |
| `package.json` | Añade `@playwright/test` y scripts `test:e2e*` |
| `.gitignore` | Ignora `tests/e2e-results/` y `tests/e2e-report/` |
| `.openspecs/e2e-web-playwright/README.md` | Este spec |

## Criterios de aceptación

- [x] Rama `test/playwright-e2e-setup` creada con convención Gentle-AI (`type/description`).
- [x] `npm install` resuelve `@playwright/test` sin conflictos con dependencias existentes.
- [x] `npx playwright test --list` reconoce el `testDir` sin errores de configuración.
- [x] El `webServer` arranca `dev:server` y queda saludable antes de ejecutar pruebas.
- [x] Artefactos de ejecución excluidos del control de versiones vía `.gitignore`.
- [ ] (Pendiente) Casos de prueba E2E concretos para cada endpoint de la API web.
- [ ] (Pendiente) Al menos un flujo E2E contra la UI de `Spoti5_app/web`.

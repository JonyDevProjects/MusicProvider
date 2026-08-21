# Fase 4 — Empaquetado, Distribución y CI/CD del Plugin Nuclear

**Estado**: ✅ Completado y verificado
**Rama base**: `develop` (o merge desde `feat/phase3-a-isomorphic`)
**Documentos de referencia**:
- [next-session-prompt.md](./next-session-prompt.md) — Guía paso a paso y checklist de ejecución
- [findings.md](./findings.md) — Restricciones técnicas y lecciones aprendidas de la Fase 4
- [session-log.md](./session-log.md) — Bitácora cronológica de sesiones de trabajo

---

## 1. Objetivos de la Fase 4

1. **Automatización de Builds Standalone**:
   - Generar el artefacto de distribución oficial del plugin (`music-provider-plugin.zip` y carpeta de staging) mediante scripts de NPM unificados (`npm run build:plugin`, `npm run package`).
   - Garantizar que el bundle generado contenga únicamente `index.js` y `package.json` limpios, con cero dependencias externas de Node.js no soportadas por el sandbox de Nuclear.

2. **Pipeline de CI/CD (GitHub Actions)**:
   - Configurar workflows para validación de PRs (`lint`, `tsc`, `test`, `build`).
   - Configurar release automation para generar `.zip` y assets adjuntos en cada tag de versión de Git.

3. **Verificación de Instalación y Compatibilidad**:
   - Validar la instalación directa del `.zip` o staging directory en el reproductor Nuclear (desktop Tauri).
   - Asegurar el cumplimiento del protocolo oficial de pruebas manuales documentado en `.agents/AGENTS.md`.

---

## 2. Puntos Clave de la Arquitectura de Plugins en Nuclear

- **Sandbox sin `node_modules`**: El plugin se evalúa mediante `esbuild-wasm` en el webview de Nuclear con un set estricto de módulos permitidos (`@nuclearplayer/plugin-sdk`, `@nuclearplayer/ui`, `react`). Todo lo demás debe estar embebido en `dist/index.js`.
- **Entorno Host**: Las llamadas nativas (`api.Http.fetch`, `api.Ytdlp`) dependen del backend en Rust de Nuclear (`isTauri: true`).
- **Pruebas Oficiales**: Para auditoría de logs, se ejecuta `cd ../nuclear/packages/player && pnpm tauri dev` y se inspecciona la consola con `Cmd + Option + I`.

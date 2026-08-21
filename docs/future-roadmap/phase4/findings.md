# Hallazgos Técnicos y Restricciones — Fase 4 (Empaquetado y CI/CD)

Última actualización: 2026-08-21

---

## 1. Restricciones del Empaquetado y Distribución

| # | Restricción / Hallazgo | Implicación Técnica |
|---|------------------------|---------------------|
| **R4-1** | **Bundle Standalone con `tsup`**: Nuclear no proporciona `node_modules` en runtime | `tsup.config.ts` debe usar `noExternal: [/(.*)/]` excluyendo únicamente `@nuclearplayer/plugin-sdk`. |
| **R4-2** | **Aislamiento de Imports en `src/index.ts`**: Evitar fugas de módulos Node | `src/index.ts` debe importar exclusivamente de submódulos agnósticos puros (`core/ytScraper.js`, `core/cache.js`, `core/types.js`), jamás importar barrels que re-exporten `yt-search` o `cheerio`. |
| **R4-3** | **Comportamiento del instalador de Nuclear**: `installPluginToManagedDir` borra el destino antes de copiar | El script de empaquetado debe generar una carpeta externa limpia (staging) o un `.zip` empaquetado formal para evitar auto-eliminación durante instalaciones de desarrollo. |
| **R4-4** | **Formato del `package.json` en producción**: Validación estricta Zod en Nuclear | Debe incluir `name`, `version`, `description`, `author`, `main: "index.js"` y el bloque `"nuclear": { "displayName": "MusicProvider", "categories": ["streaming", "metadata", "playlists"], "permissions": ["net"] }`. |
| **R4-5** | **Transporte HTTP sin headers corruptores**: `reqwest` en Rust no descomprime | No enviar `Accept-Encoding: gzip, deflate, br` en llamadas a `api.Http.fetch` hasta que el host soporte descompresión nativa. |

---

## 2. Decisiones de Empaquetado

- **Estructura del `.zip`**:
  ```text
  music-provider-plugin.zip
  ├── index.js          (bundle compilado autónomo de ~34 KB)
  └── package.json      (manifiesto limpio validado para Nuclear)
  ```
- **Scripts de NPM a estandarizar**:
  - `npm run build:plugin`: Compila `src/index.ts` a `dist/index.js` mediante `tsup`.
  - `npm run package`: Genera el directorio de staging y comprime el archivo `.zip` en la raíz del proyecto.

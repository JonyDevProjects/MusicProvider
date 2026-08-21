# Prompt para Próxima Sesión — Fase 4: Empaquetado, Distribución y CI/CD

## Resumen de Estado

**Fase**: Fase 4 (Empaquetado y CI/CD)
**Rama de trabajo**: `feat/phase4-packaging-cicd` (creada a partir de `develop` tras el merge de `feat/phase3-a-isomorphic`)
**Objetivo principal**: Implementar los scripts de empaquetado standalone del plugin, configurar el pipeline de CI/CD con GitHub Actions y verificar la instalación en Nuclear.

---

## Qué leer primero (en este orden)

1. `docs/future-roadmap/phase4/README.md` — Visión general y objetivos de la Fase 4.
2. `docs/future-roadmap/phase4/findings.md` — Restricciones R4-1 a R4-5 sobre el sandbox de Nuclear y empaquetado.
3. `.agents/AGENTS.md` — Reglas del proyecto y protocolo oficial de pruebas en Nuclear.
4. `tsup.config.ts` y `package.json` — Configuración actual de build.

---

## Checklist de Tareas — Fase 4

### 1. Setup y Branching
- [ ] Crear rama `feat/phase4-packaging-cicd`
- [ ] Verificar que `npm test` pase al 100% (baseline verde)
- [ ] Verificar `npx tsc --noEmit` sin errores

### 2. Automatización del Empaquetado Standalone
- [ ] Añadir script `scripts/package-plugin.ts` o utilitario con `adm-zip` para generar `music-provider-plugin.zip`.
- [ ] Asegurar que el `.zip` contenga exclusivamente:
  - `index.js` (generado por `tsup` en `dist/index.js`)
  - `package.json` limpio (con metadatos requeridos por Nuclear)
- [ ] Añadir scripts a `package.json`:
  - `"build:plugin": "tsup"`
  - `"package": "tsx scripts/package-plugin.ts"`

### 3. Pipeline de CI/CD (GitHub Actions)
- [ ] Crear `.github/workflows/ci.yml`:
  - Linting y verificación de tipos (`npx tsc --noEmit`)
  - Ejecución de pruebas unitarias (`npm test`)
  - Verificación del build del plugin (`npm run build:plugin`)
- [ ] Crear `.github/workflows/release.yml`:
  - Trigger en push de tags (`v*`)
  - Ejecutar tests y build
  - Empaquetar `music-provider-plugin.zip`
  - Crear GitHub Release con el `.zip` adjunto como asset de distribución

### 4. Verificación y Pruebas
- [ ] Ejecutar `npm run package` localmente.
- [ ] Probar la instalación del `.zip` resultante en Nuclear en vivo siguiendo el protocolo oficial:
  ```bash
  cd /Users/jonathanquishpe/JoniDev/nuclear/packages/player && pnpm tauri dev
  ```
- [ ] Inspeccionar DevTools (`Cmd + Option + I`) para validar activación, búsqueda y reproducción.
- [ ] Persistir avances en `docs/future-roadmap/phase4/session-log.md` y en la memoria de Engram.

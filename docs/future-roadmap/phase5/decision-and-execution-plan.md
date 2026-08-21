# Plan de Decisión y Secuencia de Ejecución — Fase 5: Publicación en Nuclear Store

---

## 1. Secuencia de Tareas de Ejecución

### Etapa 1: Conformidad de Artefactos de Release
- **`T-P5.1`**: Actualizar `scripts/package-plugin.ts` para:
  - Generar el archivo oficial `plugin.zip` en la raíz y en el staging.
  - Asegurar la inclusión de `"category": "streaming"` y `"categories": ["streaming"]` en el `package.json` limpio generado.
  - Validar que `plugin.zip` contenga exclusivamente `index.js` y `package.json` en su raíz.
- **`T-P5.2`**: Actualizar `.github/workflows/ci.yml` y `.github/workflows/release.yml` para empaquetar y publicar `plugin.zip` (además de `music-provider-plugin.zip`).

### Etapa 2: Consolidación Git y Publicación del Tag Oficial
- **`T-P5.3`**: Merge de la rama de trabajo hacia `develop` y hacia `main`.
- **`T-P5.4`**: Creación y push del tag de versión `v1.0.0` hacia GitHub (`git tag v1.0.0 && git push origin v1.0.0`).
- **`T-P5.5`**: Verificación de la ejecución de GitHub Actions `Release Plugin` y comprobación de la disponibilidad pública del release con el asset `plugin.zip`.

### Etapa 3: Publicación en el Registro Oficial de Nuclear
- **`T-P5.6`**: Creación del Fork de `NuclearPlayer/plugin-registry`, adición del registro de `music-provider` en `plugins.json` y apertura del Pull Request oficial.

---

## 2. Matriz de Tareas y Restricciones

| Tarea | Restricciones Aplicables | Artefacto Generado / Modificado |
|---|---|---|
| `T-P5.1` | R5-1, R5-2, R5-4 | `scripts/package-plugin.ts`, `plugin.zip` |
| `T-P5.2` | R5-1 | `.github/workflows/ci.yml`, `.github/workflows/release.yml` |
| `T-P5.3` | N/A | Ramas `develop`, `main` |
| `T-P5.4` | R5-1, R5-3 | Tag `v1.0.0` en GitHub |
| `T-P5.5` | R5-1, R5-6 | GitHub Release `v1.0.0` con asset `plugin.zip` |
| `T-P5.6` | R5-3, R5-4, R5-5 | Pull Request en `NuclearPlayer/plugin-registry` |

---

## 3. Checklist de Verificación y Criterios de Aceptación

- [ ] `npm run package` genera `plugin.zip` con peso < 20 KB conteniendo únicamente `index.js` y `package.json`.
- [ ] `git push origin v1.0.0` ejecuta el workflow de release exitosamente en GitHub Actions.
- [ ] El release en GitHub contiene el asset `plugin.zip` descargable públicamente.
- [ ] La entrada en `plugins.json` del registro de Nuclear pasa la validación del esquema oficial.

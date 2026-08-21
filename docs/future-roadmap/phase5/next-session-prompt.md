# Prompt para Próxima Sesión — Fase 5: Publicación y Distribución en Nuclear Plugin Store

## Resumen de Estado

**Fase**: Fase 5 (Publicación en Nuclear Plugin Store)  
**Estado**: ✅ Release Oficial `v1.0.0` publicado con éxito | Entrada de registro preparada para PR  
**Ramas consolidadas**: `main`, `develop`, `feat/phase5-store-publication`  
**Tag**: `v1.0.0` ([GitHub Release](https://github.com/JonyDevProjects/MusicProvider/releases/tag/v1.0.0))  
**Próximo paso**: Fork de `NuclearPlayer/plugin-registry`, añadir entrada a `plugins.json` y enviar el Pull Request oficial.

---

## Qué leer primero (en este orden)

1. `docs/future-roadmap/phase5/README.md` — Visión general y objetivos de la Fase 5.
2. `docs/future-roadmap/phase5/findings.md` — Restricciones R5-1 a R5-6 de Nuclear Plugin Store y formato de registro.
3. `docs/future-roadmap/phase5/decision-and-execution-plan.md` — Secuencia de tareas T-P5.1 a T-P5.6.
4. `docs/future-roadmap/phase5/session-log.md` — Bitácora completa de las sesiones 1 y 2.
5. `.agents/AGENTS.md` — Reglas del proyecto y protocolo oficial de pruebas.

---

## Checklist de Tareas — Fase 5

### 1. Conformidad de Artefactos
- [x] `T-P5.1`: Actualizar `scripts/package-plugin.ts` para generar `plugin.zip` con `category` y `categories`.
- [x] `T-P5.2`: Actualizar `.github/workflows/ci.yml` y `.github/workflows/release.yml` para incluir `plugin.zip`.
- [x] Probar localmente que `npm run package` genere `plugin.zip` validado.

### 2. Consolidación Git y Release Oficial
- [x] `T-P5.3`: Merge de cambios a `develop` y `main`.
- [x] `T-P5.4`: Crear y pushear tag `v1.0.0` (`git tag v1.0.0 && git push origin v1.0.0`).
- [x] `T-P5.5`: Verificar la publicación del Release en GitHub con `plugin.zip` adjunto.

### 3. Registro en Nuclear Store
- [x] `T-P5.6 (Preparación)`: Generar entrada validada para `plugins.json` con id, repo `JonyDevProjects/MusicProvider`, categorías y metadata.
- [ ] `T-P5.6 (Envío)`: Realizar Fork de `NuclearPlayer/plugin-registry`, agregar `music-provider` a `plugins.json` y abrir Pull Request oficial.
- [ ] Verificar la instalación del plugin desde la pestaña Store en Nuclear desktop tras la aceptación del PR.

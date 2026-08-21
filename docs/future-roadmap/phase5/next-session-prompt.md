# Prompt para Próxima Sesión — Fase 5: Publicación y Distribución en Nuclear Plugin Store

## Resumen de Estado

**Fase**: Fase 5 (Publicación en Nuclear Plugin Store)  
**Rama de trabajo**: `feat/phase5-store-publishing` (o `feat/phase4-packaging-cicd` consolidada)  
**Objetivo principal**: Adaptar el asset a `plugin.zip`, consolidar ramas en `develop` y `main`, generar el tag `v1.0.0` para publicar el Release en GitHub con CI/CD y enviar el PR a `NuclearPlayer/plugin-registry`.

---

## Qué leer primero (en este orden)

1. `docs/future-roadmap/phase5/README.md` — Visión general y objetivos de la Fase 5.
2. `docs/future-roadmap/phase5/findings.md` — Restricciones R5-1 a R5-6 de Nuclear Plugin Store.
3. `docs/future-roadmap/phase5/decision-and-execution-plan.md` — Secuencia de tareas T-P5.1 a T-P5.6.
4. `.agents/AGENTS.md` — Reglas del proyecto y protocolo oficial de pruebas.

---

## Checklist de Tareas — Fase 5

### 1. Conformidad de Artefactos
- [ ] `T-P5.1`: Actualizar `scripts/package-plugin.ts` para generar `plugin.zip` con `category` y `categories`.
- [ ] `T-P5.2`: Actualizar `.github/workflows/ci.yml` y `.github/workflows/release.yml` para incluir `plugin.zip`.
- [ ] Probar localmente que `npm run package` genere `plugin.zip` validado.

### 2. Consolidación Git y Release Oficial
- [ ] `T-P5.3`: Merge de cambios a `develop` y `main`.
- [ ] `T-P5.4`: Crear y pushear tag `v1.0.0` (`git tag v1.0.0 && git push origin v1.0.0`).
- [ ] `T-P5.5`: Verificar la publicación del Release en GitHub con `plugin.zip` adjunto.

### 3. Registro en Nuclear Store
- [ ] `T-P5.6`: Realizar Fork de `NuclearPlayer/plugin-registry`, agregar `music-provider` a `plugins.json` y abrir Pull Request.
- [ ] Verificar la instalación del plugin desde la pestaña Store en Nuclear desktop.

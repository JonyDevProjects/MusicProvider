# Fase 5 — Publicación y Distribución en Nuclear Plugin Store

**Estado**: 🚀 Listo para iniciar  
**Rama base**: `feat/phase4-packaging-cicd` (o `main` tras consolidación)  
**Documentos de referencia**:
- [decision-and-execution-plan.md](./decision-and-execution-plan.md) — Secuencia de ejecución detallada por tareas (T-P5.1 a T-P5.6)
- [findings.md](./findings.md) — Restricciones técnicas y normativas de la Store de Nuclear
- [session-log.md](./session-log.md) — Bitácora cronológica de sesiones de trabajo
- [next-session-prompt.md](./next-session-prompt.md) — Prompt y checklist para el agente ejecutor

---

## 1. Objetivos de la Fase 5

1. **Alineación con el Estándar Oficial de Nuclear Plugin Store**:
   - Ajustar el script de empaquetado (`scripts/package-plugin.ts`) y los workflows de GitHub Actions para generar de forma determinista el asset **`plugin.zip`** (nombre estrictamente requerido por el instalador oficial de Nuclear).
   - Asegurar que el manifiesto `package.json` embebido contenga todos los campos de compatibilidad requeridos (`category: "streaming"`, `categories: ["streaming"]`, descripción entre 10 y 200 caracteres, y `main: "index.js"`).

2. **Consolidación de Ramas y Creación del Primer Release Oficial**:
   - Merge ordenado de `feat/phase4-packaging-cicd` hacia `develop` y `main`.
   - Creación del tag `v1.0.0` y validación de la publicación automatizada del Release en GitHub con el asset `plugin.zip`.

3. **Publicación en el Registro Oficial de Nuclear**:
   - Fork del repositorio oficial [NuclearPlayer/plugin-registry](https://github.com/NuclearPlayer/plugin-registry).
   - Registro de la metadata de `music-provider` en `plugins.json`.
   - Creación y envío del Pull Request oficial para la integración del plugin en el catálogo global de Nuclear.

4. **Verificación End-to-End**:
   - Validación de la instalación directa desde la pestaña **Store** en Nuclear desktop (`pnpm tauri dev`).

---

## 2. Puntos Clave de la Especificación de Nuclear Plugin Store

- **Nombre de Asset Estricto**: Nuclear busca exactamente `plugin.zip` en el release más reciente de GitHub. Si el asset tiene otro nombre, la instalación falla silenciosamente o con error en el cliente.
- **Estructura Plana en Raíz**: El archivo `.zip` debe contener `index.js` y `package.json` directamente en su raíz (sin carpetas intermedias).
- **Registro Desacoplado**: El registro es un archivo JSON estático en GitHub (`NuclearPlayer/plugin-registry`), mientras que el código y los binarios residen en el repositorio del autor (`iJonyDev/MusicProvider`).
- **Actualización Automática**: Nuclear comprueba actualizaciones al iniciar la aplicación y descarga automáticamente la última versión si se detecta un nuevo release en GitHub.

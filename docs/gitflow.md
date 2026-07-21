# GitFlow - MusicProvider

## Resumen

Este documento describe el flujo de trabajo Git adoptado para el proyecto MusicProvider a partir del 21 de julio de 2026.

## Ramas Principales

### `main`
- **Propósito:** Producción estable
- **Regla:** Solo recibe merges de `release/*` o `hotfix/*`
- **Protección:** No se empuja directamente

### `develop`
- **Propósito:** Integración de features
- **Regla:** Rama base para todo trabajo de desarrollo
- **Protección:** Requiere PR para merge a `main`

## Ramas de Soporte

| Prefijo | Propósito | Ejemplo |
|---------|-----------|---------|
| `feature/*` | Nuevas características | `feature/rating-system` |
| `bugfix/*` | Corrección de bugs | `bugfix/fix-yt-dlp-timeout` |
| `hotfix/*` | Parches urgentes a producción | `hotfix/security-patch` |
| `release/*` | Preparación de release | `release/v1.0.0` |

## Flujo de Trabajo

### 1. Nueva Feature

```bash
# Desde develop, crear rama feature
git checkout develop
git pull origin develop
git checkout -b feature/nombre-feature

# Trabajar en la feature
git add .
git commit -m "feat(scope): descripción"

# Subir y crear PR a develop
git push origin feature/nombre-feature
# Crear PR: feature/nombre-feature → develop
```

### 2. Corrección de Bug

```bash
# Desde develop, crear rama bugfix
git checkout develop
git pull origin develop
git checkout -b bugfix/descripción-bug

# Corregir el bug
git add .
git commit -m "fix(scope): descripción"

# Subir y crear PR a develop
git push origin bugfix/descripción-bug
# Crear PR: bugfix/descripción-bug → develop
```

### 3. Release a Producción

```bash
# Crear rama release desde develop
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# Ajustes finales, changelog, etc.
git add .
git commit -m "chore(release): v1.0.0"

# Merge a main y develop
git checkout main
git merge release/v1.0.0 --no-ff
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags

git checkout develop
git merge release/v1.0.0 --no-ff
git push origin develop

# Eliminar rama release
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

### 4. Hotfix Urgente

```bash
# Desde main, crear rama hotfix
git checkout main
git pull origin main
git checkout -b hotfix/descripción

# Corregir
git add .
git commit -m "fix(scope): descripción hotfix"

# Merge a main Y develop
git checkout main
git merge hotfix/descripción --no-ff
git tag -a v1.0.1 -m "Hotfix v1.0.1"
git push origin main --tags

git checkout develop
git merge hotfix/descripción --no-ff
git push origin develop

# Eliminar rama hotfix
git branch -d hotfix/descripción
git push origin --delete hotfix/descripción
```

## Convenciones de Commits

Formato: `<tipo>(<scope>): <descripción>`

| Tipo | Uso |
|------|-----|
| `feat` | Nueva característica |
| `fix` | Corrección de bug |
| `docs` | Documentación |
| `style` | Formato, estilos |
| `refactor` | Refactorización |
| `test` | Tests |
| `chore` | Tareas de mantenimiento |

Ejemplo:
```
feat(rating): add rating system for tracks
fix(yt-dlp): handle timeout on long videos
docs(readme): update setup instructions
```

## Ramas Eliminadas (21/07/2026)

Las siguientes ramas de testing fueron integradas a `main` y eliminadas:
- `test/manual-testing`
- `test/android-physical-device-e2e`
- `test/ios-physical-device-e2e`
- `test/playwright-e2e-setup`

---

**Última actualización:** 21 de julio de 2026

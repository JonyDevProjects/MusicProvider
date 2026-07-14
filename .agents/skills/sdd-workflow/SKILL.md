---
name: sdd-workflow
description: Spec-Driven Development workflow para Command Code. Ciclo completo: diseñar, implementar, verificar. Inspirado en Gentle-AI.
---

# SDD Workflow — Spec-Driven Development

El flujo SDD (Spec-Driven Development) organiza el trabajo sustancial en tres fases:

## Fases del Ciclo SDD

### 1. Diseño (`/sdd-design` o "diseño")

**Configuración de modelo para esta fase:**
- `/model claude-sonnet-5` — modelo más capaz para razonamiento arquitectónico
- `/effort high` — razonamiento profundo para decisiones de diseño
- Atajo: `Alt+P` (Option+P en macOS) para cambiar de modelo rápido

Cuando recibas una tarea que toque 2+ archivos o requiera decisiones de arquitectura:

1. **Crea un spec** en `.openspecs/<cambio>/README.md` con:
   - Contexto del cambio (por qué)
   - Stack detectado (herramientas, test framework)
   - Diseño: interfaces, flujo de datos, archivos a modificar/crear
   - Criterios de aceptación
2. **Pregunta al usuario** si el diseño es correcto antes de implementar.

### 2. Implementación (`/sdd-apply` o "implementación")

**Configuración de modelo para esta fase:**
- `/model deepseek/deepseek-v4-flash` — modelo rápido y preciso para código
- `/effort medium` — esfuerzo equilibrado (o dejar el default)
- Atajo: `Alt+P` (Option+P en macOS) para cambiar de modelo rápido

Una vez aprobado el diseño:

1. **Test-first**: Escribe los tests antes que la implementación.
2. **Implementa**: Codifica siguiendo el diseño del spec.
3. **Valida**: Ejecuta `npm run test` para verificar que los tests pasan.

### 3. Verificación (`/sdd-verify` o "verificación")

**Configuración de modelo para esta fase:**
- `/model deepseek/deepseek-v4-flash` — mismo modelo que implementación para consistencia
- `/effort medium` — esfuerzo equilibrado para revisión
- Atajo: `Alt+P` (Option+P en macOS) para cambiar de modelo rápido

Después de implementar:

1. **Verifica contra el spec**: Revisa que cada criterio de aceptación del spec se cumpla.
2. **Ejecuta la suite completa**: `npm run build && npm run test`.
3. **Actualiza el spec** con el resultado de la verificación.

## Integración con Engram

- Al completar una fase de diseño, llama a `mem_save` con:
  - **title**: "SDD Design: <nombre-del-cambio>"
  - **type**: "architecture"
  - **content**: Resumen del diseño, archivos afectados, decisiones clave

- Al completar la verificación, llama a `mem_save` con:
  - **title**: "SDD Verify: <nombre-del-cambio>"
  - **type**: "decision"
  - **content**: Resultado de la verificación, tests pasados, lecciones aprendidas

## Per-phase model routing

Command Code no tiene routing automático por fase SDD como OpenCode, pero ofrece estas alternativas:

### Alternativa 1: Switch manual vía `/model` (RECOMENDADA — configurada en este skill)

El skill SDD ahora incluye en cada fase los comandos de modelo y esfuerzo explícitos. Sigue el flujo:

| Fase | Modelo | Esfuerzo | Comando combinado |
|---|---|---|---|
| **Diseño** | `MiniMaxAI/MiniMax-M3` | `high` | `/model MiniMaxAI/MiniMax-M3` + `/effort high` |
| **Implementación** | `deepseek/deepseek-v4-flash` | `medium` | `/model deepseek/deepseek-v4-flash` + `/effort medium` |
| **Verificación** | `xiaomi/mimo-v2.5` | `medium` | `/model xiaomi/mimo-v2.5` + `/effort medium` |

Atajo rápido: `Alt+P` (Option+P en macOS) para cambiar el modelo sin escribir.

### Alternativa 2: Sesiones separadas por fase

Inicia sesiones dedicadas con distintos modelos:

```bash
cmd -m claude-sonnet-5           # Sesión para diseño
cmd -m deepseek/deepseek-v4-flash # Sesión para implementación
```

Cada sesión retiene el modelo con el que arrancó.

### Alternativa 3: `/configure-models` (routing automático por tarea)

El comando `/configure-models` permite asignar modelos específicos a tareas built-in de Command Code (exploración, escritura, revisión, etc.). Úsalo dentro de una sesión para configurar qué modelo se encarga de cada tipo de trabajo automáticamente.

### Alternativa 4: Ajustar esfuerzo de razonamiento con `/effort`

En lugar de cambiar de modelo, puedes controlar la profundidad de razonamiento del modelo actual:

- **Diseño**: `/effort high` — razonamiento profundo
- **Implementación**: `/effort medium` o default
- **Tareas simples**: `/effort low` — respuesta rápida

Combinado con `/model`, es la aproximación más cercana al per-phase routing de Gentle-AI.

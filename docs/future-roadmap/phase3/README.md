# Roadmap Fase 3 — Punto de Inflexión Arquitectónico (Nuclear vs Spoti5)

**Proyecto**: MusicProvider
**Fecha creación**: 2026-08-19
**Objetivo**: Documentar el estudio de viabilidad arquitectónica de la Fase 3 del roadmap principal (`docs/future-roadmap/future_roadmap_and_architecture.md`): decidir con datos si MusicProvider mantiene un modelo Híbrido/Isomórfico o si Spoti5 adopta la filosofía de plugins de Nuclear.

---

## Fases / Alternativas

| # | Fase / Alternativa | Rama | Status | Spec |
|---|--------------------|------|--------|------|
| 3.0 | Línea base y contexto | `feat/phase-2-transparent-refresh` (base) | `✅ inventario completo` | [roadmap.md](./roadmap.md#fase-30--línea-base-y-contexto) |
| 3.1 | Diseño del Benchmark | `feat/phase3-benchmark` | `pending` | [benchmark-spec.md](./benchmark-spec.md) |
| 3.2 | Ejecución del Benchmark | `feat/phase3-benchmark` | `pending` | [findings.md](./findings.md) |
| 3.3 | Evaluación comparativa y matriz de decisión | `feat/phase3-benchmark` | ✅ decisión: Híbrido A+D | [roadmap.md](./roadmap.md#fase-33--evaluación-comparativa-y-matriz-de-decisión) |
| **A** | Alternativa A: Modelo Isomórfico (Core Agnóstico) | `feat/phase3-a-isomorphic` | 🔜 siguiente paso | [alternativa-a-isomorfico-spec.md](./alternativa-a-isomorfico-spec.md) |
| **B** | Alternativa B: Ecosistema de Plugins JS en Spoti5 | `feat/phase3-b-js-plugins` | ❌ descartada | [alternativa-b-js-plugins-spec.md](./alternativa-b-js-plugins-spec.md) |
| **C** | Alternativa C: Separación de Contextos (Forks) | `feat/phase3-c-forks` | ❌ descartada | [alternativa-c-forks-spec.md](./alternativa-c-forks-spec.md) |
| **D** | Alternativa D: Eje 2 — Spoti5 Plugin Engine (Dart) | `feat/phase3-d-spoti5-plugin-engine` (repo Spoti5) | ⏳ post-Fase 4 | [alternativa-d-spoti5-plugin-engine-spec.md](./alternativa-d-spoti5-plugin-engine-spec.md) |
| 3.4 | Ejecución de la decisión | `feat/phase3-a-isomorphic` | ⬜ pending | [decision-and-execution-plan.md](./decision-and-execution-plan.md) |

---

## Flujo de Dependencias

```
3.0 Línea base y contexto
    │  (inventario + métricas actuales)
    ▼
3.1 Diseño del Benchmark ──────► benchmark-spec.md
    │
    ▼
3.2 Ejecución del Benchmark ───► findings.md (resultados)
    │
    ▼
3.3 Evaluación y Matriz de Decisión (feat/phase3-decision)
    │
    ├──► Trial A (isomórfico)         ◄── alternativa-a-isomorfico-spec.md
    ├──► Trial B (plugins JS)         ◄── alternativa-b-js-plugins-spec.md
    ├──► Trial C (forks)              ◄── alternativa-c-forks-spec.md
    └──► Trial D (plugin engine Dart) ◄── alternativa-d-spoti5-plugin-engine-spec.md
    │          (las alternativas se evalúan CON DATOS del benchmark, no en paralelo como código)
    ▼
3.4 Ejecución de la decisión (solo la ganadora o híbrido)
    │          (si D gana → epic en repo Spoti5; si A/B/C → continúa en MusicProvider)
    ▼
  ✅ Decisión basada en datos + nota de referencia en future_roadmap_and_architecture.md
```

---

## Cómo Usar Estos Specs

1. **Al inicio de cada sesión**: Revisar [next-session-prompt.md](./next-session-prompt.md) para entender el estado actual
2. **Durante la implementación**: Seguir las tareas listadas en el spec de la fase o alternativa activa
3. **Al finalizar tareas**: Actualizar el `Status` en el spec y documentar en [session-log.md](./session-log.md)
4. **Al descubrir algo nuevo**: Agregar en [findings.md](./findings.md) el hallazgo técnico
5. **Para validación**: Usar los escenarios de validación del spec
6. **Regla de oro**: ninguna alternativa A/B/C/D se ejecuta a fondo sin pasar por la matriz de decisión de la Fase 3.3

---

## Trazabilidad

Cada spec mantiene:
- **Requisitos funcionales** con criterios de aceptación checkbox
- **Tareas de implementación** vinculadas a los requisitos
- **Escenarios de validación** para testing (Gherkin)
- **Riesgos** con mitigaciones definidas
- **Criterios de cierre** para saber cuándo la fase está completa

Los archivos de trazabilidad de este directorio permiten:
- **Continuidad entre sesiones**: `next-session-prompt.md` guarda el estado
- **Historial de decisiones**: `session-log.md` registra cada sesión
- **Aprendizaje acumulado**: `findings.md` consolida hallazgos técnicos y restricciones de arquitectura conocidas

---

## Archivos de Trazabilidad

| Archivo | Propósito |
|---------|-----------|
| [roadmap.md](./roadmap.md) | Roadmap maestro de la Fase 3 (branching, sub-fases, desviaciones) |
| [benchmark-spec.md](./benchmark-spec.md) | Spec del benchmark (métricas, escenarios, umbrales) |
| [alternativa-a-isomorfico-spec.md](./alternativa-a-isomorfico-spec.md) | Spec de la Alternativa A (Core agnóstico) |
| [alternativa-b-js-plugins-spec.md](./alternativa-b-js-plugins-spec.md) | Spec de la Alternativa B (plugins JS en Spoti5) |
| [alternativa-c-forks-spec.md](./alternativa-c-forks-spec.md) | Spec de la Alternativa C (forks especializados) |
| [alternativa-d-spoti5-plugin-engine-spec.md](./alternativa-d-spoti5-plugin-engine-spec.md) | Spec de la Alternativa D (Spoti5 Plugin Engine en Dart) |
| [findings.md](./findings.md) | Hallazgos técnicos por sub-fase y restricciones conocidas |
| [next-session-prompt.md](./next-session-prompt.md) | Prompt y checklist para la próxima sesión |
| [session-log.md](./session-log.md) | Historial de sesiones de ejecución |
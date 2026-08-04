# Roadmap Proxy Solutions — Specs de Fases

**Proyecto**: MusicProvider  
**Fecha creación**: 2026-08-03  
**Objetivo**: Documentar los specs de cada fase del roadmap de solución para iOS Cellular Playback.

---

## Fases

| # | Fase | Rama | Status | Spec |
|---|------|------|--------|------|
| 1 | Corto Plazo: Túnel Local | `feature/proxy-short-tunnel` | `pending` | [fase-1-tunel-local-spec.md](./fase-1-tunel-local-spec.md) |
| 2 | Medio Plazo: Piped API | `feature/proxy-mid-piped` | `pending` | [fase-2-piped-api-spec.md](./fase-2-piped-api-spec.md) |
| 3 | Largo Plazo: VPS Backend | `feature/proxy-long-vps` | `pending` | [fase-3-vps-backend-spec.md](./fase-3-vps-backend-spec.md) |

---

## Flujo de Dependencias

```
Fase 1 (Túnel Local)
    │
    ▼ Valida concepto de proxy
    │
Fase 2 (Piped API)
    │
    ▼ Elimina necesidad de backend propio
    │
Fase 3 (VPS Backend)
    │
    ▼ Producción estable y independiente
    │
  ✅ Estado final
```

---

## Cómo Usar Estos Specs

1. **Al inicio de cada sesión**: Revisar el `Status` de la fase activa
2. **Durante la implementación**: Seguir las tareas listadas en el spec
3. **Al finalizar tareas**: Actualizar el `Status` y documentar en `session-log.md`
4. **Para validación**: Usar los escenarios de validación del spec

---

## Trazabilidad

Cada spec mantiene:
- **Requisitos funcionales** con criterios de aceptación checkbox
- **Tareas de implementación** vinculadas a los requisitos
- **Escenarios de validación** para testing
- **Riesgos** con mitigaciones definidas
- **Criterios de cierre** para saber cuándo la fase está completa

---

## Archivos de Trazabilidad

| Archivo | Propósito |
|---------|-----------|
| [findings.md](./findings.md) | Hallazgos técnicos por fase |
| [next-session-prompt.md](./next-session-prompt.md) | Prompt y checklist para próxima sesión |
| [session-log.md](./session-log.md) | Historial de sesiones de implementación |

---

## Cómo Usar Estos Specs

1. **Al inicio de cada sesión**: Revisar `next-session-prompt.md` para entender el estado actual
2. **Durante la implementación**: Seguir las tareas listadas en el spec de la fase activa
3. **Al finalizar tareas**: Actualizar el `Status` en el spec y documentar en `session-log.md`
4. **Al descubrir algo nuevo**: Agregar en `findings.md` el hallazgo técnico
5. **Para validación**: Usar los escenarios de validación del spec

---

## Trazabilidad

Cada spec mantiene:
- **Requisitos funcionales** con criterios de aceptación checkbox
- **Tareas de implementación** vinculadas a los requisitos
- **Escenarios de validación** para testing
- **Riesgos** con mitigaciones definidas
- **Criterios de cierre** para saber cuándo la fase está completa

Los archivos de trazabilidad en este directorio permiten:
- **Continuidad entre sesiones**: `next-session-prompt.md` guarda el estado
- **Historial de decisiones**: `session-log.md` registra cada sesión
- **Aprendizaje acumulado**: `findings.md` consolida hallazgos técnicos

# Orquestación Multiagente — Fase 3

**Fecha**: 2026-08-19
**Orquestador**: Command Code (Gemini 3.1 Pro)
**Worker SDD**: Antigravity CLI (`agy`) con `gemini-3.7-flash-high`

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────┐
│              COMMAND CODE (Orquestador)          │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Leer     │  │ Validar  │  │ Git / Engram │  │
│  │ Roadmap  │→ │ Outputs  │→ │ Persistir    │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│        │              ▲                          │
│        ▼              │                          │
│  ┌─────────────────────────────────────────┐    │
│  │        AGRICULTURA DE PROMPTS           │    │
│  │  (Contexto + Skill SDD + Spec phase)    │    │
│  └─────────────────────────────────────────┘    │
│        │                                        │
└────────┼────────────────────────────────────────┘
         │  agy --print --model gemini-3.7-flash-high
         ▼
┌─────────────────────────────────────────────────┐
│           ANTIGRAVITY CLI (Worker SDD)           │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Fase     │  │ Fase     │  │ Fase         │  │
│  │ Design   │→ │ Apply    │→ │ Verify       │  │
│  │ (Spec)   │  │ (Code)   │  │ (Validate)   │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                                                  │
│  Modelo: gemini-3.7-flash-high                   │
│  Timeout: 10min por fase                         │
│  Modo: --mode accept-edits                       │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Fases y Asignación de Agentes

| Fase | Agente | Rol | Modelo | Skill SDD |
|------|--------|-----|--------|-----------|
| 3.0 Línea base | **Command Code** | Auditor/inventario | Gemini 3.1 Pro | — (lectura directa) |
| 3.1 Diseño Benchmark | **agy** | SDD Design | gemini-3.7-flash-high | sdd-implementation |
| 3.2 Ejecución Benchmark | **agy** | SDD Apply | gemini-3.7-flash-high | sdd-implementation |
| 3.3 Matriz Decisión | **agy** | SDD Verify | gemini-3.7-flash-high | sdd-workflow |
| 3.4 Ejecución decisión | **agy** + **CC** | Mixto | Según alternativa | sdd-implementation |

---

## Protocolo de Invocación de agy

### Template base

```bash
agy --print \
  --model gemini-3.7-flash-high \
  --mode accept-edits \
  --print-timeout 10m \
  --add-dir /Users/jonathanquishpe/JoniDev/Spoti5 \
  "<PROMPT_CON_CONTEXTO_Y_SKILL>"
```

### Convenciones del prompt

Cada prompt enviado a `agy` sigue esta estructura:

```
## Rol
Eres un agente SDD ejecutando la fase [N] del roadmap de Fase 3.

## Contexto del Proyecto
[Contenido de AGENTS.md]

## Skill SDD a seguir
[Contenido relevante de la skill SDD]

## Tarea Específica
[Instrucciones detalladas de la fase]

## Archivos de Entrada
[Lista de archivos que debe leer]

## Entregable Esperado
[Qué debe producir y dónde guardarlo]

## Restricciones
[Límites, rate-limits, reglas del roadmap]
```

---

## Flujo de Ejecución

### Paso 1: Command Code ejecuta Fase 3.0 (inventario)
- Lee directamente los archivos del proyecto
- Registra hallazgos en `findings.md`
- No necesita agy (es auditoría, no implementación)

### Paso 2: Command Code delega Fase 3.1 a agy (diseño del benchmark)
- Prepara prompt con: contexto del proyecto + skill SDD design + spec phase 3.1
- Invoca `agy --print`
- Valida que `benchmark-spec.md` sea completo
- Si falta algo: re-invoca con instrucciones de corrección

### Paso 3: Command Code delega Fase 3.2 a agy (ejecución del benchmark)
- Prepara prompt con: benchmark-spec + skill SDD apply + resultados esperados
- Invoca `agy --print`
- Valida resultados en `findings.md`

### Paso 4: Command Code delega Fase 3.3 a agy (matriz de decisión)
- Prepa prompt con: findings del benchmark + skill SDD verify + matriz template
- Invoca `agy --print`
- Valida que la matriz esté completa con datos (no opiniones)

### Paso 5: Command Code persiste y cierra
- Guarda resumen en Engram
- Actualiza `session-log.md` y `next-session-prompt.md`
- Crea commits si hay cambios

---

## Validación de Outputs

Command Code valida cada output de `agy` contra:

1. **Completitud**: ¿Todos los campos del spec están llenos?
2. **Trazabilidad**: ¿Cada puntaje/dato tiene fuente documentada?
3. **Consistencia**: ¿Los datos son coherentes entre secciones?
4. **Calidad**: ¿El análisis es técnico y no meramente opinativo?

Si la validación falla → re-invocar `agy` con feedback específico.

---

## Estado de Ejecución

| Fase | Status | Agente | Inicio | Fin | Notas |
|------|--------|--------|--------|-----|-------|
| 3.0 | ✅ completado | CC | 2026-08-19 | 2026-08-19 | Inventario completo en findings.md |
| 3.1 | ✅ completado | CC + agy | 2026-08-19 | 2026-08-19 | Spec validado, status: ready-for-implementation |
| 3.2 | ✅ completado | agy | 2026-08-19 | 2026-08-19 | 5 archivos benchmarks/, TS compila limpio |
| 3.3 | ✅ completado | agy | 2026-08-19 | 2026-08-19 | Matriz: D=3.45, A=3.35, C=3.25, B=3.10 |
| 3.4 | ⬜ pending | mixto | — | — | Esperando decisión del usuario |

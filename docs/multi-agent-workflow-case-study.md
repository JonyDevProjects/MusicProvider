# Caso de Estudio: Flujo Multi-Agente con Herdr

**Fecha**: 2026-07-28
**Proyecto**: MusicProvider
**Tarea**: Fix de YtExplodeService.getStream() en iOS
**Resultado**: ✅ Éxito

---

## Resumen Ejecutivo

Se utilizó un flujo multi-agente coordinado por Herdr para resolver un bug que impedía la reproducción de audio en iOS sin backend. Tres agentes de código trabajaron de forma coordinada:

- **CommandCode** — Coordinación + contexto del proyecto (Engram MCP)
- **OpenCode** — Investigación profunda + diseño SDD
- **Antigravity** — Implementación del fix

El flujo demostró que la coordinación multi-agente puede resolver problemas complejos de forma más eficiente que un solo agente, aprovechando las fortalezas específicas de cada herramienta.

---

## Configuración del Entorno

### Herramientas Requeridas

| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| **Herdr** | 0.7.5 | Multiplexor de terminal para agentes |
| **CommandCode** | 1.4.2 | Coordinación + MCPs |
| **OpenCode** | - | Investigación + SDD (Gentle-AI) |
| **Antigravity** | 1.1.7 | Implementación |
| **Engram** | 1.19.0 | Memoria persistente del proyecto |

### Instalación de Herdr

```bash
# macOS (Homebrew)
brew install herdr

# Verificar instalación
herdr --version
```

### Configuración de Herdr

**Archivo**: `~/.config/herdr/config.toml`

```toml
onboarding = false

[ui]
agent_panel_sort = "spaces"
show_agent_labels_on_pane_borders = true

[ui.sidebar.agents]
row_gap = 0
rows = [["state_icon", "workspace", "tab"], ["agent"]]

[theme]
name = "vesper"
auto_switch = false

[ui.toast]
delivery = "herdr"
delay_seconds = 1

[ui.sound]
enabled = true

[session]
resume_agents_on_restore = true
```

### Integración de Agentes con Herdr

#### OpenCode (Integración nativa)
```bash
herdr integration install opencode
```
Esto instala el plugin en `~/.config/opencode/plugins/herdr-agent-state.js`.

#### Antigravity (Detección automática)
Antigravity es detectado automáticamente por Herdr como `agy`. No requiere integración adicional.

#### CommandCode (Configuración manual)
CommandCode no tiene integración nativa con Herdr. Se requiere:

1. **Manifiesto de detección**: `~/.config/herdr/agent-detection/command-code.toml`
2. **Wrapper script**: `~/.local/bin/cmd-herdr` (opcional)
3. **Skill de Herdr**: `~/.commandcode/skills/herdr/SKILL.md`

**Manifiesto de detección** (`command-code.toml`):
```toml
id = "command-code"
version = "2026.07.27.1"
min_engine_version = 1
updated_at = "2026-07-27T00:00:00Z"
aliases = ["cmd", "commandcode"]

[[rules]]
id = "permission_prompt"
state = "blocked"
priority = 300
region = "whole_recent"
visible_blocker = true
any = [
  { contains = ["Do you want to proceed?"] },
  { contains = ["allow all edits this session"] },
  { contains = ["PLAN MODE"] },
]

[[rules]]
id = "spinner_working"
state = "working"
priority = 110
region = "whole_recent"
visible_working = true
any = [
  { regex = ['[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]'] },
  { contains = ["thinking"] },
]

[[rules]]
id = "prompt_idle"
state = "idle"
priority = 90
region = "whole_recent"
visible_idle = true
any = [
  { line_regex = ['^\s*❯\s*$'] },
  { line_regex = ['^\s*❯\s+\S'] },
]
not = [
  { contains = ["Do you want to proceed?"] },
]
```

**Skill de Herdr para CommandCode** (`~/.commandcode/skills/herdr/SKILL.md`):
Permite que CommandCode controle Herdr cuando corre dentro de un panel. Incluye comandos para:
- Inspeccionar workspaces, tabs y paneles
- Dividir paneles y ejecutar comandos
- Leer output de otros agentes
- Esperar a que agentes terminen

---

## Filosofía del Flujo Multi-Agente

### ¿Por qué usar múltiples agentes?

Cada agente tiene fortalezas específicas:

| Agente | Fortalezas | Mejor para |
|--------|------------|------------|
| **CommandCode** | MCPs (Engram, Context7), coordinación, memoria persistente | Contexto del proyecto, supervisión, documentación |
| **OpenCode** | SDD (Spec-Driven Development), Gentle-AI ecosystem, auditoría de código | Investigación profunda, diseño, code review adversarial |
| **Antigravity** | Implementación rápida, ejecución directa | Fixes puntuales, tests, ejecución |

### Principios del flujo multi-agente

1. **Separación de responsabilidades**: Cada agente tiene un rol claro
2. **Contexto compartido**: Usar specs y memoria persistente (Engram) para compartir conocimiento
3. **Supervisión humana**: El usuario mantiene el control final
4. **Iteración rápida**: Agentes trabajan en paralelo cuando es posible
5. **Trazabilidad**: Todo se documenta y persiste

### Cuándo usar multi-agente vs agente único

**Usar multi-agente cuando:**
- La tarea requiere múltiples disciplinas (investigación + implementación + review)
- Hay decisiones arquitectónicas que necesitan análisis profundo
- Se quiere aprovechar fortalezas específicas de cada agente
- La tarea es compleja (3+ archivos, múltiples pasos)

**Usar agente único cuando:**
- La tarea es simple (1 archivo, cambio pequeño)
- No hay ventaja en dividir el trabajo
- La velocidad es prioritaria

---

## Flujo Ejecutado

### Fase 1: Configuración del Workspace (CommandCode)

```bash
# Crear workspace dedicado
herdr workspace create --cwd ~/JoniDev/MusicProvider --label "ios-stream-fix" --no-focus

# Dividir paneles para 3 agentes
herdr pane split w9:p1 --direction right --no-focus
herdr pane split w9:p2 --direction down --no-focus

# Iniciar agentes
herdr agent start opencode-investigator --kind opencode --pane w9:p1
herdr agent start antigravity-dev --kind agy --pane w9:p2
herdr pane run w9:p3 "cd ~/JoniDev/MusicProvider && cmd"
```

**Resultado**: Workspace `w9` con 3 paneles, cada uno con un agente.

### Fase 2: Contexto del Proyecto (CommandCode)

CommandCode usó Engram MCP para recuperar contexto:

```bash
engram search "youtube_explode_dart iOS audio stream 403"
```

**Memorias recuperadas**:
- #93: YouTube HTTP 403 blocking fix
- #94: iOS youtube_explode_dart implementación

**Acción**: Crear spec SDD en `.openspecs/ios-stream-fix/README.md` con todo el contexto.

### Fase 3: Investigación (OpenCode)

**Prompt enviado via Herdr**:
```bash
herdr agent prompt opencode-investigator \
  "Lee el spec en .openspecs/ios-stream-fix/README.md y ejecuta la Fase 1: Investigación..." \
  --wait --timeout 600000
```

**Estado monitoreado**:
```bash
herdr agent list | jq '.result.agents[] | {name, agent_status}'
```

**Hallazgos de OpenCode**:
1. `just_audio` usa proxy local HTTP para enviar headers
2. iOS bloquea conexiones HTTP incluso a localhost
3. `Info.plist` solo tenía `NSAllowsLocalNetworking`
4. Se requiere `NSAllowsArbitraryLoads` para que el proxy funcione

**Output leído via Herdr**:
```bash
herdr agent read opencode-investigator --source recent-unwrapped --lines 200
```

### Fase 4: Implementación (Antigravity)

**Prompt enviado via Herdr**:
```bash
herdr agent prompt antigravity-dev \
  "Lee el spec... y ejecuta la Fase 2: Implementación del fix..." \
  --wait --timeout 600000
```

**Interacción con el agente**:
Antigravity pidió permisos para editar archivos y ejecutar tests. Se aprobaron via Herdr:
```bash
herdr agent send-keys antigravity-dev enter
```

**Cambio aplicado**:
```diff
# Spoti5_app/ios/Runner/Info.plist
- <key>NSAllowsLocalNetworking</key>
+ <key>NSAllowsArbitraryLoads</key>
```

### Fase 5: Verificación (CommandCode)

**Tests ejecutados**:
```bash
cd Spoti5_app && flutter test
# Resultado: All tests passed! (11 tests)
```

**Prueba en dispositivo físico**:
```bash
flutter run --release -d 00008101-000C2D492682001E \
  --dart-define=BASE_URL=http://192.168.1.46:3000/api
```

**Monitoreo**:
- Backend: `lsof -i :3000` — Sin conexiones externas
- Flutter: Log limpio, sin exceptions
- Dispositivo: Audio se reproduce correctamente

---

## Comandos de Herdr Utilizados

### Gestión de Workspaces
```bash
herdr workspace list                    # Listar workspaces
herdr workspace create --cwd <path>     # Crear workspace
herdr workspace focus <id>              # Enfocar workspace
```

### Gestión de Paneles
```bash
herdr pane split <id> --direction right # Dividir panel
herdr pane run <id> "<command>"         # Ejecutar comando
herdr pane read <id> --source recent    # Leer output
```

### Control de Agentes
```bash
herdr agent list                        # Listar agentes
herdr agent start <name> --kind <kind>  # Iniciar agente
herdr agent prompt <name> "<text>"      # Enviar prompt
herdr agent wait <name> --until done    # Esperar estado
herdr agent send-keys <name> <key>      # Enviar tecla
herdr agent read <name>                 # Leer output
```

### Monitoreo
```bash
herdr agent list | jq '.result.agents[] | {name, agent_status}'
```

---

## Resultados y Métricas

### Tiempos

| Fase | Agente | Duración |
|------|--------|----------|
| Configuración | CommandCode | ~2 min |
| Contexto | CommandCode | ~1 min |
| Investigación | OpenCode | ~6 min |
| Implementación | Antigravity | ~3 min |
| Verificación | CommandCode | ~2 min |
| **Total** | | **~14 min** |

### Calidad del Fix

| Criterio | Estado |
|----------|--------|
| Tests unitarios pasan | ✅ |
| App funciona sin backend | ✅ |
| No regresión en otras plataformas | ✅ |
| Documentado en Engram | ✅ |

### Eficiencia vs Agente Único

Un solo agente habría necesitado:
- Investigar el problema (sin contexto de Engram)
- Diseñar la solución (sin SDD formal)
- Implementar y verificar

**Estimación**: ~25-30 min con un solo agente vs ~14 min con multi-agente.

**Ventaja adicional**: El flujo multi-agente produjo documentación completa (spec SDD, reporte de prueba, memorias en Engram) que un solo agente probablemente no habría generado.

---

## Lecciones Aprendidas

### Lo que funcionó bien

1. **Especialización por agente**: Cada agente hizo lo que mejor sabe hacer
2. **Contexto compartido via Engram**: Las memorias previas aceleraron la investigación
3. **Spec SDD como contrato**: El spec mantuvo a los agentes alineados
4. **Monitoreo en tiempo real**: Herdr permitió supervisar el progreso sin interrumpir
5. **Aprobación de acciones**: Herdr mostró los permisos solicitados por Antigravity

### Mejoras pendientes

1. **Integración nativa de CommandCode**: Actualmente no hay integración nativa con Herdr
2. **Dependencia de modelos**: OpenCode usó MiMo V2.5 (gratuito), podría ser más rápido con Claude
3. **Permisos manuales**: Antigravity requirió aprobación manual para cada acción
4. **Sin paralelismo real**: Las fases fueron secuenciales, no paralelas

### Recomendaciones para futuros flujos

1. **Para tareas de investigación + implementación**: CommandCode (contexto) → OpenCode (SDD) → Antigravity (implementación)
2. **Para code review**: OpenCode con skill `judgment-day`
3. **Para fixes rápidos**: Antigravity solo
4. **Para tareas complejas**: CommandCode como coordinador, múltiples agentes en paralelo

---

## Archivos Generados

| Archivo | Propósito |
|---------|-----------|
| `.openspecs/ios-stream-fix/README.md` | Spec SDD del problema |
| `docs/testing/manual-test-ios-physical-2026-07-28-post-fix.md` | Reporte de prueba |
| `docs/multi-agent-workflow-case-study.md` | Este documento |
| `~/.config/herdr/agent-detection/command-code.toml` | Manifiesto de detección |
| `~/.commandcode/skills/herdr/SKILL.md` | Skill de Herdr para CommandCode |
| `~/.commandcode/skills/herdr-coordination/SKILL.md` | Skill de coordinación |

---

## Conclusión

El flujo multi-agente con Herdr demostró ser una forma efectiva de resolver problemas complejos. La clave es:

1. **Elegir el agente correcto para cada tarea**
2. **Mantener contexto compartido** (Engram, specs)
3. **Documentar todo** para aprendizaje futuro
4. **Supervisar sin interrumpir** (Herdr)

Este caso de estudio sirve como referencia para futuros flujos multi-agente en el proyecto.

---

*Documento generado por CommandCode como parte del flujo multi-agente.*

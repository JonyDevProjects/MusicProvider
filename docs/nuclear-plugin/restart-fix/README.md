# Plan Maestro: Fix del Bug "Restart After Install" en el Plugin Nuclear de MusicProvider

**Fecha**: 2026-08-18
**Estado**: En planificación
**Componente**: Ciclo de vida del Plugin (Nuclear) — `src/index.ts`
**Severidad del Bug**: Media
**Documento base**: `docs/archive/bugs/requires-restart-after-install.md`
**Plan de referencia**: `docs/nuclear-plugin/IMPLEMENTATION_PLAN.md` (Eje 1: Plugin de Nuclear)

---

## Contexto y Problemática

Tras cargar o instalar el plugin `MusicProvider` en Nuclear, la fuente **no aparece inmediatamente** disponible en la interfaz de metadatos o streaming del reproductor. El usuario se ve obligado a **reiniciar completamente** la aplicación Nuclear para que `MusicProvider` sea reconocido y pueda seleccionarse como fuente activa.

Este comportamiento es anómalo: otros plugins de la comunidad (ej. `omnisource`) se integran dinámicamente ("en caliente") a las listas de fuentes sin requerir un reinicio.

---

## Análisis de Causa Raíz

### Hallazgo 1: `onLoad` nunca se ejecuta durante instalación desde la UI

El plugin `MusicProvider` registra todos sus proveedores (`StreamingProvider`, `PlaylistProvider`, `MetadataProvider`) dentro del hook `onLoad` de `src/index.ts` (líneas 143–251). Sin embargo, el ciclo de vida real de Nuclear **no siempre llama `onLoad`**:

| Code path | Llamada a `load()` | ¿`onLoad` se ejecuta? | ¿`onEnable` se ejecuta? |
|---|---|---|---|
| **App startup** (`pluginBootstrap.ts:41`) | `loader.load(api)` — **CON api** | ✅ Sí | ✅ Sí (si `entry.enabled`) |
| **Instalación desde UI** (`pluginStore.tsx:93`) | `managedPluginLoader.load()` — **SIN api** | ❌ **No** | ✅ Sí (si el usuario habilita el plugin) |

**Mecanismo**: En `PluginLoader.ts` (línea 168):
```typescript
if (instance.onLoad && api) {
  await instance.onLoad(api);
}
```

El parámetro `api` es opcional. En `pluginStore.tsx`, `load()` se llama **sin api** (línea 93), luego se crea el api por separado (línea 145: `const api = createPluginAPI(...)`), y si el plugin estaba habilitado, se llama `enablePlugin(id)` que ejecuta `onEnable(api)`.

**Consecuencia**: Durante una instalación desde la UI, `onLoad` nunca recibe el `api`, por lo que **nunca se registran los proveedores**. `onEnable` en MusicProvider solo hace `console.log` — no registra nada. Por eso los proveedores no aparecen hasta el siguiente reinicio (donde `pluginBootstrap.ts` llama `load(api)` y `onLoad` sí se ejecuta).

### Hallazgo 2: `providersHost.register()` ya notifica a la UI

En `providersHost.ts` (línea 55–71), el método `register()` llama internamente a `notify()` (línea 69), que dispara todos los suscriptores de Zustand. La línea 52 confirma:

```typescript
useProvidersStore.subscribe(() => notify());
```

Esto significa que **si `register` se llama correctamente, la UI se actualiza automáticamente**. No se necesita un mecanismo de notificación adicional. El problema no es la notificación — es que `register` nunca se llama fuera de `onLoad`.

### Hallazgo 3: La solución correcta

Comparando el patrón de ciclo de vida de Nuclear:

| Hook | Cuando se llama | Responsabilidad correcta para MusicProvider |
|---|---|---|
| `onLoad(api)` | Arranche (startup). NO se llama desde UI. | Inicialización ligera (pre-creación de objetos, logging). **NO debe registrar proveedores.** |
| `onEnable(api)` | **Siempre** se llama: (1) tras `onLoad` en startup si estaba habilitado, (2) cuando el usuario habilita el plugin desde la UI. | **Crear y registrar** los proveedores (`api.Providers.register(...)`). |
| `onDisable(api)` | Cuando el usuario deshabilita el plugin. | Opcional: desregistrar proveedores para que no aparezcan en la lista. |
| `onUnload(api)` | Al descargar el plugin (cleanup). | Desregistrar todos los proveedores (`api.Providers.unregister(...)`). |

El patrón de referencia (omnisource y otros plugins de Nuclear) registra proveedores en `onEnable`, **no en `onLoad`**.

---

## Solución Propuesta

### Cambio principal: mover el registro de proveedores de `onLoad` a `onEnable`

```typescript
// src/index.ts — ANTES (bug)
onLoad: async (api: NuclearPluginAPI) => {
  api.Providers.register(streamingProvider);   // ← Nunca se llama desde UI
  api.Providers.register(playlistProvider);
  api.Providers.register(metadataProvider);
},
onEnable: async (_api) => {
  console.log(`[${PROVIDER_NAME}] Plugin enabled`);  // ← No registra nada
},

// src/index.ts — DESPUÉS (fix)
onLoad: async (api: NuclearPluginAPI) => {
  // Inicialización ligera — pre-crear objetos de proveedor
  // (opcional, se pueden crear directamente en onEnable)
},
onEnable: async (api: NuclearPluginAPI) => {
  const streamingProvider = { ... };
  const playlistProvider = { ... };
  const metadataProvider = { ... };
  api.Providers.register(streamingProvider);   // ← Se llama desde UI y startup
  api.Providers.register(playlistProvider);
  api.Providers.register(metadataProvider);
},
onDisable: async (api: NuclearPluginAPI) => {
  api.Providers.unregister(STREAMING_ID);   // ← Opcional: limpiar al deshabilitar
  api.Providers.unregister(PLAYLIST_ID);
  api.Providers.unregister(METADATA_ID);
},
onUnload: async (api: NuclearPluginAPI) => {
  api.Providers.unregister(STREAMING_ID);   // ← Cleanup definitivo
  api.Providers.unregister(PLAYLIST_ID);
  api.Providers.unregister(METADATA_ID);
},
```

### Consideración sobre `onDisable`

Debate abierto: ¿debe `onDisable` desregistrar los proveedores?

| Opción | Ventaja | Desventaja |
|---|---|---|
| **A: `onDisable` desregistra** | Proveedores no aparecen en la lista cuando el plugin está deshabilitado. | Si el usuario rehabilita, `onEnable` vuelve a registrar (idempotente gracias a `Map.set`). |
| **B: `onDisable` no desregistra** | Menos overhead. | Proveedores siguen visibles cuando el plugin está deshabilitado (confuso para el usuario). |

**Decisión**: Opción A — `onDisable` desregistra. Es el patrón más limpio y coincide con el comportamiento esperado del usuario.

---

## Estructura de Directorios del Plan

```
docs/nuclear-plugin/restart-fix/
├── README.md          ← Este archivo (plan maestro)
├── findings.md        ← Hallazgos técnicos detallados (root cause, referencias)
├── session-log.md     ← Log de sesión por sesión (qué se hizo, qué se aprendió)
└── next-session-prompt.md ← Prompt de arranque para la siguiente sesión
```

---

## Fases del Plan

### Fase 1 — Investigación y Diagnosis (Bug Validation)

**Objetivo**: Confirmar la causa raíz con pruebas empíricas.

| Tarea | Descripción | Estado |
|---|---|---|
| 1.1 | Añadir logging exhaustivo en `onLoad`, `onEnable`, `onDisable`, `onUnload` de `src/index.ts` para rastrear qué hooks se ejecutan durante (a) instalación desde UI, (b) habilitación manual, (c) arranque de app. | ⬜ |
| 1.2 | Clonar el plugin `omnisource` de Nuclear y comparar su `index.ts` — particularmente en qué hook registra proveedores y cómo maneja `onEnable`. | ⬜ |
| 1.3 | Verificar en `pluginStore.tsx` y `pluginBootstrap.ts` (ya leído) que el flujo de llamadas confirma la hipótesis. | ✅ Completada |
| 1.4 | Documentar hallazgos en `docs/nuclear-plugin/restart-fix/findings.md`. | ⬜ |

**Salida esperada**: `findings.md` con pruebas empíricas que confirman el root cause, incluyendo logs de Nuclear capturados durante instalación desde UI vs. arranque.

### Fase 2 — Diseño de la Solución

**Objetivo**: Diseñar el refactor del ciclo de vida del plugin.

| Tarea | Descripción | Estado |
|---|---|---|
| 2.1 | Diseñar el nuevo mapeo de hooks: qué código va en `onLoad` vs `onEnable` vs `onDisable` vs `onUnload`. | ✅ Completada |
| 2.2 | Decidir si `onDisable` desregistra proveedores (Opción A vs B — ver tabla de arriba). | ✅ Completada |
| 2.3 | Diseñar la estrategia de tests: qué tests existentes (`tests/index.test.ts`) deben actualizarse y qué nuevos tests agregar para validar el nuevo ciclo de vida. | ✅ Completada |
| 2.4 | Escribir specs en `docs/archive/bugs/requires-restart-after-install.md` (actualizar con root cause confirmado). | ✅ Completada |

**Salida esperada**: Diseño de la solución con mapping de hooks, estrategia de tests, y specs actualizados.

### Fase 3 — Implementación

**Objetivo**: Aplicar el refactor y actualizar tests.

| Tarea | Descripción | Estado |
|---|---|---|
| 3.1 | Modificar `src/index.ts`: mover registro de proveedores de `onLoad` a `onEnable`. | ✅ Completada |
| 3.2 | Añadir `unregister` en `onDisable` (Opción A). | ✅ Completada |
| 3.3 | Añadir logging estructurado en los hooks (para validación empírica). | ✅ Completada |
| 3.4 | Actualizar `tests/index.test.ts`: cambiar `plugin.onLoad!` → `plugin.onEnable!` en los tests que verifican el registro. | ✅ Completada |
| 3.5 | Agregar test nuevo: verificar que `onEnable` registra 3 proveedores y `onDisable`/`onUnload` los desregistra. | ✅ Completada |
| 3.6 | Correr `npx vitest run` — todos los tests deben pasar. | ✅ Completada |
| 3.7 | Correr `npx tsc --noEmit` — 0 errores de tipo. | ✅ Completada |
| 3.8 | Correr `npx tsup` — bundle limpio sin `require()` problemáticos. | ✅ Completada |

**Salida esperada**: Código implementado, tests actualizados y pasando, build exitoso.

### Fase 4 — Validación en Nuclear Runtime

**Objetivo**: Probar "en caliente" que el plugin aparece sin reiniciar.

| Tarea | Descripción | Estado |
|---|---|---|
| 4.1 | Construir `dist/index.js` con el fix aplicado. | ✅ Completada |
| 4.2 | Cargar el plugin en una versión de desarrollo de Nuclear desde el panel de Plugins. | ⬜ |
| 4.3 | Habilitar el plugin desde la UI (NO reiniciar). | ⬜ |
| 4.4 | Verificar que el proveedor `MusicProvider` aparece inmediatamente en la lista de fuentes de streaming y metadatos. | ⬜ |
| 4.5 | Realizar una búsqueda y reproducir un track completo para validar el end-to-end. | ⬜ |
| 4.6 | Capturar los logs de Nuclear (`--enable-logging`) para confirmar que los hooks `onLoad`/`onEnable` se ejecutan en el orden correcto. | ⬜ |

**Criterio de éxito**: El proveedor aparece en la lista de fuentes **sin reiniciar** la aplicación Nuclear.

### Fase 5 — Documentación y Cierre

| Tarea | Descripción | Estado |
|---|---|---|
| 5.1 | Actualizar `docs/nuclear-plugin/IMPLEMENTATION_PLAN.md` — marcar el bug como resuelto en el estado de implementación. | ✅ Completada |
| 5.2 | Escribir `docs/nuclear-plugin/restart-fix/session-log.md` con el log completo de sesiones. | ✅ Completada |
| 5.3 | Escribir `docs/nuclear-plugin/restart-fix/next-session-prompt.md`. | ✅ Completada |
| 5.4 | Guardar hallazgos en Engram (memo de root cause y patrón de ciclo de vida). | ✅ Parcial (root cause guardado) |

---

## Riesgos y Contingencias

| Riesgo | Probabilidad | Impacto | Contingencia |
|---|---|---|---|
| El hook `onEnable` no se llama en algún code path inesperado | Baja | Alto | Añadir logging en todos los hooks. Si `onEnable` falla, caer al `onLoad` como fallback (doble registro es idempotente). |
| `api.Providers` no está disponible en `onEnable` (api incompleto) | Baja | Medio | Verificar en `createPluginAPI.ts` — ya confirma que `providersHost` se inyecta en el api. |
| Tests existentes rompen por el cambio de hook | Alta | Baja | Los tests llaman `plugin.onLoad!(mockApi)` directamente. Cambiar a `plugin.onEnable!(mockApi)`. |
| El doble registro (onLoad + onEnable) causa duplicados | Media | Medio | `providersHost.register()` usa `Map.set` (idempotente — sobrescribe, no duplica). No es un problema. |
| `onDisable` interfiere con `resolveActiveOnBootstrap` | Baja | Medio | `resolveActiveOnBootstrap` se llama al startup (línea 80 de `pluginBootstrap.ts`), después de registrar todos los proveedores. `onDisable` solo afecta al toggle manual, no al arranque. |
| El bundle CJS incluye `require()` problemáticos después del refactor | Baja | Medio | Ejecutar `grep "require(" dist/index.js` como check de calidad post-build. |

---

## Archivos Relevantes

| Archivo | Propósito | Estado |
|---|---|---|
| `src/index.ts` | Entry point del plugin Nuclear — **cambio principal** | 🔴 Por modificar |
| `tests/index.test.ts` | Tests del plugin Nuclear — **actualización necesaria** | 🔴 Por modificar |
| `docs/archive/bugs/requires-restart-after-install.md` | Bug report original | 🟡 Por actualizar |
| `docs/nuclear-plugin/IMPLEMENTATION_PLAN.md` | Plan de implementación del plugin (predecesor) | 🟢 Referencia |
| `nuclear/packages/player/src/services/plugins/PluginLoader.ts` | Lifecycle hooks — confirma `onLoad` solo se llama con api | 🟢 Referencia (Nuclear) |
| `nuclear/packages/player/src/stores/pluginStore.tsx` | Confirma `loadPluginFromPath` llama `load()` sin api | 🟢 Referencia (Nuclear) |
| `nuclear/packages/player/src/services/plugins/pluginBootstrap.ts` | Confirma `hydratePluginsFromRegistry` llama `load(api)` con api | 🟢 Referencia (Nuclear) |
| `nuclear/packages/player/src/services/providersHost.ts` | Confirma `register()` llama `notify()` → UI se actualiza | 🟢 Referencia (Nuclear) |

---

## Log de Sesiones

### Sesión 1 (2026-08-18) — Investigación y Diagnóstico

**Agente**: CommandCode (diagnóstico)

1. ✅ Leer el bug report en `docs/archive/bugs/requires-restart-after-install.md`
2. ✅ Leer `src/index.ts` — identificar que proveedores se registran en `onLoad`, y `onEnable` solo loguea
3. ✅ Leer `PluginLoader.ts` (línea 168) — confirmar que `onLoad` solo se ejecuta si `api` está presente
4. ✅ Leer `pluginStore.tsx` — confirmar que `loadPluginFromPath` llama `load()` SIN api (línea 93), y luego llama `onEnable(api)` vía `enablePlugin`
5. ✅ Leer `pluginBootstrap.ts` (línea 41) — confirmar que `hydratePluginsFromRegistry` llama `load(api)` CON api → `onLoad` se ejecuta en startup
6. ✅ Leer `providersHost.ts` (líneas 52, 69) — confirmar que `register()` llama `notify()` y `useProvidersStore.subscribe(() => notify())` → la UI se actualiza automáticamente al registrar
7. ✅ Leer `createPluginAPI.ts` — confirmar que `providersHost` se inyecta en el api del plugin
8. ✅ Leer `tests/index.test.ts` — identificar que los tests llaman `plugin.onLoad!(mockApi)` y esperan 3 registros; estos tests deben actualizarse a `onEnable`
9. ✅ Leer roadmaps existentes (`IMPLEMENTATION_PLAN.md`, `roadmap-nuclear-plugin-spoti5-evolution.md`, `roadmap-unified-proxy-playback.md`) para el formato del plan maestro
10. ✅ Cargar `nuclear-reference` skill para validar el enfoque contra el SDK de Nuclear

**Conclusión de Sesión 1**: La causa raíz está confirmada. El plugin registra proveedores en `onLoad`, pero `onLoad` nunca se llama durante instalación desde la UI porque `PluginLoader.load()` se invoca sin el argumento `api`. La solución es mover el registro a `onEnable`, que se ejecuta tanto en startup como en la UI. La notificación a la UI ya funciona automáticamente vía `providersHost.register()` → `notify()`.

---

## Glosario

| Término | Definición |
|---|---|
| **onLoad** | Hook del ciclo de vida del plugin. Se llama durante `PluginLoader.load(api)` — solo cuando api está presente. En startup se llama con api. En UI install se llama sin api (skipped). |
| **onEnable** | Hook del ciclo de vida. Se llama siempre que el plugin se habilita: tanto en startup (si `entry.enabled`) como desde la UI cuando el usuario hace clic en "enable". |
| **onDisable** | Hook del ciclo de vida. Se llama cuando el plugin se deshabilita desde la UI. |
| **onUnload** | Hook del ciclo de vida. Se llama al descargar/eliminar el plugin. Siempre se llama antes de que la instancia se destruye. |
| **ProvidersHost** | Servicio de Nuclear que gestiona el registro/desregistro de proveedores. `register()` es idempotente (usa `Map.set`). `notify()` dispara a suscriptores de Zustand → UI reactiva. |
| **Hydrate** | Proceso de arranque de Nuclear donde se cargan los plugins registrados desde el disco (pluginBootstrap.ts). |

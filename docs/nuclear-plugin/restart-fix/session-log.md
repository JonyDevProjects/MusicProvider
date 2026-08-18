# Log de Sesiones — Restart After Install Bug Fix

## Sesión 1 (2026-08-18) — Investigación y Diagnóstico

**Agente**: CommandCode
**Objetivo**: Diagnosticar por qué el plugin MusicProvider requiere reinicio de Nuclear para aparecer como fuente.

### Pasos realizados

1. ✅ Leído el bug report en `docs/archive/bugs/requires-restart-after-install.md`
   - Síntoma: el plugin no aparece hasta reiniciar Nuclear
   - Posibles causas sugeridas: errores en registro de API, caché persistente, manejo incorrecto de eventos de ciclo de vida

2. ✅ Leído `src/index.ts` (código actual del plugin)
   - Proveedores (StreamingProvider, PlaylistProvider, MetadataProvider) se registran en `onLoad`
   - `onEnable` solo hace `console.log` — no registra nada
   - `onDisable` también solo loguea
   - `onUnload` desregistra los tres proveedores

3. ✅ Leído `nuclear/packages/player/src/services/plugins/PluginLoader.ts`
   - `load(api?: NuclearPluginAPI)` — api es opcional
   - `if (instance.onLoad && api)` — `onLoad` solo se ejecuta si api está presente

4. ✅ Leído `nuclear/packages/player/src/stores/pluginStore.tsx`
   - `loadPluginFromPath`: llama `managedPluginLoader.load()` **SIN api** (línea 93)
   - Luego crea api por separado (línea 145)
   - `enablePlugin(id)` llama `onEnable(api)` con el api
   - **`onLoad` NUNCA se ejecuta** en este code path

5. ✅ Leído `nuclear/packages/player/src/services/plugins/pluginBootstrap.ts`
   - `hydratePluginsFromRegistry`: crea api PRIMERO (línea 40), llama `loader.load(api)` CON api (línea 41)
   - `onLoad` SÍ se ejecuta en startup
   - Esto explica por qué el reinicio "soluciona" el problema

6. ✅ Leído `nuclear/packages/player/src/services/providersHost.ts`
   - `register()` llama `notify()` (línea 69)
   - `useProvidersStore.subscribe(() => notify())` (línea 52)
   - **La UI se actualiza automáticamente al registrar** — no hay problema de notificación

7. ✅ Leído `nuclear/packages/player/src/services/plugins/createPluginAPI.ts`
   - `providersHost` se inyecta correctamente en el api
   - `onEnable` recibe un api válido con `Providers.register/unregister` disponibles

8. ✅ Leído `tests/index.test.ts`
   - Tests llaman `plugin.onLoad!(mockApi)` y esperan 3 llamadas a `register`
   - Tests deben actualizarse a `plugin.onEnable!(mockApi)` tras el fix
   - Test de `onUnload` verifica `unregister` con `'music-provider'` — necesitará ajuste si cambian los IDs

9. ✅ Leído roadmaps existentes para formato de referencia
   - `docs/nuclear-plugin/IMPLEMENTATION_PLAN.md` — formato completo (etapas, sesiones, desviaciones, riesgos, archivos)
   - `docs/archive/roadmap-nuclear-plugin-spoti5-evolution.md`
   - `docs/archive/unified-proxy-playback/roadmap.md`

10. ✅ Cargado skill `nuclear-reference` para validar enfoque contra el SDK

### Hallazgos clave

- **Root cause**: `onLoad` se registra proveedores, pero `PluginLoader.load()` se llama sin api durante UI install → `onLoad` es skipped → proveedores nunca se registran
- **Solución**: mover registro de `onLoad` → `onEnable` (se ejecuta en ambos code paths)
- **Notificación UI**: ya funciona vía `providersHost.register()` → `notify()` → Zustand subscribers
- **Idempotencia**: `register()` usa `Map.set` — re-registro es seguro

### Artefactos producidos

- `docs/nuclear-plugin/RESTART_FIX_ROADMAP.md` — Plan maestro
- `docs/nuclear-plugin/restart-fix/findings.md` — Análisis de causa raíz detallado
- `docs/nuclear-plugin/restart-fix/session-log.md` — Este archivo

### Decisiones arquitectónicas

- ✅ Los proveedores se registrarán en `onEnable`, no en `onLoad`
- ✅ `onDisable` desregistrará proveedores (para que no aparezcan cuando el plugin está deshabilitado)
- ✅ `onUnload` mantendrá el cleanup de desregistro (comportamiento actual)
- ✅ `onLoad` se mantiene para inicialización ligera (pre-creación de objetos si es necesario)

### Próximos pasos

Ver `docs/nuclear-plugin/RESTART_FIX_ROADMAP.md` — Fases 2 a 5 pendientes de ejecución.

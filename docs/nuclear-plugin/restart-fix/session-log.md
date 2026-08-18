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

## Sesión 2 (2026-08-18) — Implementación

**Agente**: Antigravity

**Resumen de la Sesión:**
Continuando desde la Sesión 1 donde se completó el diagnóstico y análisis de causa raíz, en esta sesión procedimos a ejecutar la Fase 3 del plan de implementación.

1. **Refactorización de `src/index.ts` (Fase 3.1 - 3.3)**:
   - Se movió el registro de `api.Providers.register` de `onLoad` a `onEnable` para asegurar que el registro de los providers de `MusicProvider` se realice tanto durante el arranque de la app (startup) como durante una instalación en caliente desde la interfaz (UI).
   - Se implementaron métodos `api.Providers.unregister` dentro de los hooks `onDisable` y `onUnload` para asegurar que, si el usuario desactiva el plugin, los providers se quiten de la lista de reproducción.

2. **Refactorización de `tests/index.test.ts` (Fase 3.4 - 3.5)**:
   - Se reemplazó el uso de `plugin.onLoad!(mockApi)` por `plugin.onEnable!(mockApi)` en todos los tests existentes.
   - Se agregaron nuevos tests para verificar el comportamiento de unregistro (`unregister`) en los eventos de deshabilitado y descarga del plugin.
   - Se corrigieron identificadores (`music-provider-streaming`, `music-provider-playlist`, `music-provider-metadata`) en los checks del test.

3. **Corrección de TypeScript Errors**:
   - Al ejecutar la validación, se encontraron errores de tipado de TypeScript debido a que el retorno de `api.Http.fetch` en `@nuclearplayer/plugin-sdk` trataba a `res.body` como un `ReadableStream` y requería conversión. Se ajustó el método `scrapeYoutube` para invocar `res.text()` en caso de ser necesario y asignar tipos correctos (`Promise<any[]>`).

4. **Validaciones**:
   - Se ejecutó `npx vitest run` arrojando éxito en todos los tests.
   - Se ejecutó `npx tsc --noEmit` confirmando que no hay errores de tipo.
   - Se ejecutó `npx tsup` para construir el bundle (`dist/index.js`), el cual se generó correctamente.

**Estado Actual**:
Implementación completada con éxito. El plugin ahora registra los providers en el lifecycle method adecuado.

**Próximos Pasos**:
La Fase 4 (Validación en Nuclear Runtime) requiere intervención humana o de un entorno donde el reproductor Nuclear pueda cargar este bundle `.js` generado para probarlo en el flujo de UI.

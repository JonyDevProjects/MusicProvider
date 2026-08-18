# Findings: Root Cause Analysis — Restart After Install Bug

**Fecha**: 2026-08-18
**Componente**: Ciclo de vida del Plugin Nuclear (`src/index.ts`)
**Bug report original**: `docs/archive/bugs/requires-restart-after-install.md`

---

## Síntoma

Tras instalar o cargar el plugin `MusicProvider` en Nuclear, la fuente no aparece en la interfaz hasta que se reinicia la aplicación. Otros plugins (ej. `omnisource`) aparecen dinámicamente sin reinicio.

## Causa Raíz

### El plugin registra proveedores en `onLoad`, pero `onLoad` se omite durante instalación desde la UI

**File: `src/index.ts` (líneas 142–263)**

El plugin `MusicProvider` define:

```typescript
const plugin: NuclearPlugin = {
  onLoad: async (api: NuclearPluginAPI) => {
    // Crea y registra StreamingProvider, PlaylistProvider, MetadataProvider
    api.Providers.register(streamingProvider);
    api.Providers.register(playlistProvider);
    api.Providers.register(metadataProvider);
  },
  onEnable: async (_api: NuclearPluginAPI) => {
    console.log(`[${PROVIDER_NAME}] Plugin enabled`);  // ← NO registra proveedores
  },
  onDisable: async (_api: NuclearPluginAPI) => {
    console.log(`[${PROVIDER_NAME}] Plugin disabled`);  // ← NO desregistra
  },
  onUnload: async (api: NuclearPluginAPI) => {
    api.Providers.unregister(STREAMING_ID);
    api.Providers.unregister(PLAYLIST_ID);
    api.Providers.unregister(METADATA_ID);
  },
};
```

### Dos code paths en Nuclear con comportamiento diferente

**File: `nuclear/packages/player/src/services/plugins/PluginLoader.ts` (línea 161–180)**

```typescript
async load(api?: NuclearPluginAPI): Promise<LoadedPlugin> {
  // ...
  if (instance.onLoad && api) {   // ← api es opcional
    await instance.onLoad(api);
  }
  // ...
}
```

El parámetro `api` es **opcional**. `onLoad` solo se ejecuta si `api` está presente.

#### Code path 1: App startup (`hydratePluginsFromRegistry`)

**File: `nuclear/packages/player/src/services/plugins/pluginBootstrap.ts` (líneas 38–61)**

```typescript
const api = createPluginAPI(metadata.id, metadata.displayName);  // ← api creado primero
const { instance } = await loader.load(api);                   // ← load CON api → onLoad SÍ se ejecuta
// ...
if (entry.enabled) {
  await usePluginStore.getState().enablePlugin(entry.id);       // → onEnable SÍ se ejecuta
}
```

**Resultado**: En startup, `onLoad` se ejecuta con api → proveedores se registran → aparecen tras reiniciar. ✅

#### Code path 2: Instalación desde UI (`loadPluginFromPath`)

**File: `nuclear/packages/player/src/stores/pluginStore.tsx` (líneas 91–172)**

```typescript
const { instance } = await managedPluginLoader.load();          // ← load SIN api → onLoad NO se ejecuta
const api = createPluginAPI(id, loadedMetadata.displayName);    // ← api creado DESPUÉS
// ...
if (enabled) {
  await get().enablePlugin(id);                                   // → onEnable SÍ se ejecuta (con api)
}
```

**Resultado**: En instalación desde UI, `onLoad` se omite (no hay api). `onEnable` se llama pero solo loguea → proveedores nunca se registran → no aparecen. ❌

### La notificación a la UI ya funciona

**File: `nuclear/packages/player/src/services/providersHost.ts` (líneas 28–71)**

```typescript
const subscribers = new Set<() => void>();
const notify = () => {
  for (const listener of subscribers) listener();
};

// Línea 52:
useProvidersStore.subscribe(() => notify());

// En register():
register<T extends ProviderDescriptor>(provider: T): string {
  // ... agrega a byKind y byId maps ...
  notify();  // ← notifica a todos los suscriptores → UI reactiva
  return provider.id;
}
```

**`register()` ya llama a `notify()`**, que dispara a los suscriptores de Zustand. La UI se actualiza automáticamente cuando un proveedor se registra. **No hay problema de notificación** — el problema es que `register()` nunca se llama fuera de `onLoad`.

### El api está disponible en `onEnable`

**File: `nuclear/packages/player/src/services/plugins/createPluginAPI.ts` (líneas 20–43)**

```typescript
export const createPluginAPI = (pluginId: string, displayName: string): NuclearPluginAPI => {
  return new NuclearPluginAPI({
    providersHost,   // ← inyectado correctamente
    // ... otros hosts ...
  });
};
```

`createPluginAPI` inyecta `providersHost` en el api. El api se pasa a `onEnable` en ambos code paths. **No hay problema de disponibilidad de api en `onEnable`**.

## Resumen del Root Cause

| Elemento | ¿Es problema? | Evidencia |
|---|---|---|
| `onLoad` no se llama desde UI install | ✅ Sí — **causa raíz** | `pluginStore.tsx:93` — `load()` sin api; `PluginLoader.ts:168` — `if (instance.onLoad && api)` |
| `onEnable` solo loguea | ✅ Sí — **contribuye** | `src/index.ts:252-254` |
| `providersHost.register()` no notifica | ❌ No | `providersHost.ts:69` — `notify()` se llama; línea 52 — `useProvidersStore.subscribe(() => notify())` |
| `api` no disponible en `onEnable` | ❌ No | `createPluginAPI.ts` inyecta `providersHost` correctamente |

## Solución

Mover el registro de proveedores de `onLoad` a `onEnable`. `onEnable` se ejecuta en **ambos** code paths (startup y UI), y el api con `providersHost` siempre está disponible allí.

## Referencias

- **Bug report**: `docs/archive/bugs/requires-restart-after-install.md`
- **Plugin actual**: `src/index.ts`
- **Nuclear PluginLoader**: `nuclear/packages/player/src/services/plugins/PluginLoader.ts`
- **Nuclear PluginStore**: `nuclear/packages/player/src/stores/pluginStore.tsx`
- **Nuclear PluginBootstrap**: `nuclear/packages/player/src/services/plugins/pluginBootstrap.ts`
- **Nuclear ProvidersHost**: `nuclear/packages/player/src/services/providersHost.ts`
- **Nuclear createPluginAPI**: `nuclear/packages/player/src/services/plugins/createPluginAPI.ts`
- **Tests existentes**: `tests/index.test.ts` (cambian `onLoad` → `onEnable`)
- **Plan maestro**: `docs/nuclear-plugin/restart-fix/README.md`

# Bug: MusicProvider requiere reinicio de Nuclear para aparecer como fuente

**Fecha**: 2026-08-18
**Componente**: Ciclo de vida del Plugin (Nuclear)
**Severidad**: Media

## Descripción del Problema
Tras cargar o instalar el plugin `MusicProvider` en Nuclear, la fuente no aparece inmediatamente disponible en la interfaz de metadatos o streaming del reproductor. El usuario se ve obligado a reiniciar completamente la aplicación Nuclear para que `MusicProvider` sea reconocido y pueda seleccionarse como fuente activa. 

Este comportamiento anómalo se ha comparado con otros plugins de la comunidad (ej. `omnisource`), los cuales sí se integran dinámicamente ("en caliente") a las listas de fuentes sin requerir un reinicio de la aplicación.

## Causa Raíz Confirmada (2026-08-18)
Durante la sesión de diagnóstico se determinó lo siguiente:
El registro de los proveedores (Streaming, Playlist, Metadata) se realizaba erróneamente en el hook `onLoad` en lugar de `onEnable`.
Según el ciclo de vida de Nuclear:
- Durante la instalación desde la UI, el hook `onLoad` no recibe el objeto `api` y, por tanto, no se ejecuta.
- `onEnable` sí recibe siempre el `api` al activarse el plugin (ya sea por instalación "en caliente" o durante el inicio).

Como los proveedores se registraban en `onLoad`, el plugin no avisaba a la interfaz que estaban disponibles cuando se añadían desde la UI. Sin embargo, al reiniciar Nuclear, el `onLoad` se invocaba correctamente, por eso funcionaba tras el reinicio.

## Specs de la Solución Implementada
1. Mover `api.Providers.register(...)` de `onLoad` hacia `onEnable`.
2. Incluir lógica de limpieza `api.Providers.unregister(...)` dentro de `onDisable` y `onUnload`.
3. Actualizar la base de tests `tests/index.test.ts` para que utilicen el hook `onEnable`.

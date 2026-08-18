# Bug: MusicProvider requiere reinicio de Nuclear para aparecer como fuente

**Fecha**: 2026-08-18
**Componente**: Ciclo de vida del Plugin (Nuclear)
**Severidad**: Media

## Descripción del Problema
Tras cargar o instalar el plugin `MusicProvider` en Nuclear, la fuente no aparece inmediatamente disponible en la interfaz de metadatos o streaming del reproductor. El usuario se ve obligado a reiniciar completamente la aplicación Nuclear para que `MusicProvider` sea reconocido y pueda seleccionarse como fuente activa. 

Este comportamiento anómalo se ha comparado con otros plugins de la comunidad (ej. `omnisource`), los cuales sí se integran dinámicamente ("en caliente") a las listas de fuentes sin requerir un reinicio de la aplicación.

## Posibles Causas a Investigar en la Siguiente Sesión
1. **Errores en el registro de la API**: Posiblemente los IDs (`STREAMING_ID`, `METADATA_ID`, `PLAYLIST_ID`) no están siendo emitidos correctamente al bus de eventos de Nuclear durante el hook `onLoad` o `onEnable`.
2. **Caché persistente del ProvidersHost**: En sesiones anteriores se identificó que Nuclear almacena la configuración de los proveedores activos en una base de datos local (history/settings). Si las llamadas de registro (`api.Providers.register`) colisionan o no disparan el re-render en React, el estado interno se queda desincronizado hasta que se reinicia.
3. **Manejo incorrecto de eventos del ciclo de vida**: Es necesario revisar el contrato del `@nuclearplayer/plugin-sdk` para entender si faltan llamadas específicas durante el método `onEnable()` que informen a la UI que un nuevo `MetadataProvider` y `StreamingProvider` han entrado en línea.

## Plan de Acción Recomendado
1. Clonar un plugin de referencia (como `nuclear-plugin-omnisource`) y comparar exhaustivamente su archivo principal (`index.ts`) con el nuestro para identificar diferencias en los hooks de registro.
2. Añadir logs extra en `onEnable()` de MusicProvider para verificar si Nuclear está ejecutando esta función de ciclo de vida correctamente tras la adición del plugin.
3. Implementar la solución y validar instalando el plugin "en caliente" en una versión de desarrollo de Nuclear.

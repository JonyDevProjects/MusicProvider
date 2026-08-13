# Plan de Desarrollo Eje 1: Plugin de Nuclear

**Fecha**: 2026-08-12
**Objetivo**: Abstraer la lógica del actual servidor NodeJS (MusicProvider) e implementar la API estándar `@nuclearplayer/plugin-sdk` para convertirlo en un módulo de distribución standalone que Nuclear pueda consumir nativamente.

## Etapa 1: Preparación del Entorno Plugin
1. **Configurar NPM para Plugin SDK**
   - Inicializar la estructura requerida por Nuclear.
   - Instalar `@nuclearplayer/plugin-sdk` como dependencia (`npm i -D @nuclearplayer/plugin-sdk`).
   - Ajustar el `package.json` para incluir la entrada `"nuclear": { ... }` con los metadatos requeridos (iconos, permisos, displayName).
2. **Setup del Bundler (tsup o esbuild)**
   - Configurar `tsup` en el proyecto para compilar nuestro código TypeScript (`src/`) en un único archivo CommonJS (`dist/index.js`) que sea compatible con el loader de plugins de Nuclear.

## Etapa 2: Refactorización Arquitectónica
1. **Desacoplar Express.js**
   - En este momento, `ytdlpWrapper.ts` está pensado para ser consumido por un API REST. Debemos extraer los métodos `search()`, `getStreamInfo()`, `getPlaylistInfo()` para que ya no interactúen con Request/Response ni dependan de res.json().
   - Extraer y preservar el gestor de caché `lru-cache` que envuelve las URLs de stream, para seguir entregando caché instantánea.
2. **Definir la clase del Proveedor (Provider)**
   - Crear el archivo principal `src/index.ts`.
   - Implementar las interfaces y ciclo de vida de Nuclear: `onLoad(api)`, `onEnable(api)`.

## Etapa 3: Integración de la API de Nuclear
1. **api.Providers (Streaming y Búsqueda)**
   - Utilizar el objeto `api.Providers.registerAudioSource(...)` o equivalente para inyectar a MusicProvider en el ecosistema.
   - **Búsqueda**: Enlazar la función `yt-search` de nuestra abstracción con el hook de búsqueda del reproductor.
   - **Streaming**: Enlazar la recuperación de URLs de stream (`ytdlpWrapper.getStreamInfo`) al handler de resolución de tracks de Nuclear.
2. **Configuraciones de Usuario (api.Settings)**
   - (Opcional) Proveer ajustes al usuario para configurar la ruta local de `yt-dlp` en caso de que quiera proveer su propio binario, o mantener nuestro sistema de auto-descarga (`ytdlpSetup.ts`).

## Etapa 4: Empaquetado y Verificación
1. **Build y Linting**
   - Correr el comando de build (`npm run build`) y verificar que se genera un `dist/index.js` limpio, que no incluya dependencias problemáticas de Node puras o que dependa de Express (el cual debe ser removido).
2. **Actualización de Unit Tests (Vitest)**
   - Ajustar los tests automatizados para validar los retornos en crudo en vez de las respuestas HTTP de Express.
   - Asegurar que la Pipeline CI/CD en GitHub Actions (`test.yml`) sigue pasando con el nuevo empaquetado.

## Etapa 5: Prueba de Fuego (Nuclear Runtime)
1. **Carga en el Reproductor Nuclear**
   - Cargar manualmente la carpeta `dist/` resultante en el panel de Plugins del cliente web/Tauri de Nuclear.
   - Realizar búsquedas desde la barra de búsqueda de Nuclear y verificar el log de red para certificar que se rutea al plugin.
   - Producir un playback completo, verificando la estabilidad del Stream crudo que `yt-dlp` entrega a la etiqueta `<audio>` / stream del motor interno de Nuclear.

## Etapa 6: Resolución de Edge Cases y Limitaciones
1. **Problema de Playback en Streams Largos (+1 hora)**
   - **Síntoma**: Al intentar cargar un track de larga duración (ej: ~1 hora), el reproductor se queda en un bucle de animación de carga infinito sin llegar a iniciar la reproducción, forzando a desistir.
   - **Posibles Causas**: 
     - La extracción de la URL o el buffer inicial mediante `yt-dlp` falla o hace timeout al procesar un medio tan extenso.
     - Incompatibilidad en la manipulación de Range Headers para el buffering progresivo de un archivo masivo.
     - Expiración de las firmas de URL temporales de YouTube durante la preparación del stream.
   - **Objetivo Técnico**: 
     - Diagnosticar dónde se estanca el proceso (obtención vs enrutamiento de red).
     - Implementar soporte robusto para la entrega por chunks (HTTP 206 Partial Content) y regeneración de URLs si caducan, para asegurar soporte robusto de mixes, podcasts y álbumes largos en Nuclear.

---
**Nota para Agentes**: Todas las implementaciones de código deben respetar el tipado estático riguroso y estar respaldadas por pruebas. ¡Cualquier acoplamiento con servidores HTTP tradicionales (Express/Koa) debe ser eliminado por completo del núcleo del plugin!

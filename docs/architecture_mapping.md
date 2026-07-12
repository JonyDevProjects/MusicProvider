# Mapeo Arquitectónico: MusicProvider a Plugin Nuclear

Este documento describe cómo la arquitectura actual desarrollada en el entorno "standalone" de `MusicProvider` se traducirá a la arquitectura real del proyecto `Nuclear` cuando sea integrado.

Dado que la decisión de diseño es implementar la extracción y descarga como un **Plugin de TypeScript** que dotará de metadatos extra a los tracks, este mapeo se centra en el ecosistema de plugins.

## 1. Mapeo General de Responsabilidades

| Responsabilidad en MusicProvider | Archivo Actual | Destino Final en Nuclear | Rol en el Destino |
| :--- | :--- | :--- | :--- |
| **Descarga/Gestión del Binario** | `src/ytdlpSetup.ts` | `packages/player/src-tauri/src/ytdlp.rs` (Backend) o Sistema de Plugins central. | Nuclear ya posee un gestor nativo de `yt-dlp` en Rust. El plugin no debería encargarse de descargar binarios, sino delegar llamadas a la API que expone el Host de Nuclear al Plugin. |
| **Ejecución y Extracción (CLI)** | `src/ytdlpWrapper.ts` | Nuevo Plugin dentro de la arquitectura SDK. | Lógica de negocio del Plugin. El wrapper evolucionará a una implementación de `StreamProvider` o `MetadataProvider` (definidos en `@nuclearplayer/plugin-sdk`). |
| **Parseo NDJSON** | Lógica en `ytdlpWrapper.ts` | Mismo Plugin TS o Backend Rust. | Idealmente, el plugin llamará a un método del SDK tipo `nuclearAPI.ytdlp.query(url)` y recibirá el objeto ya parseado, o procesará el buffer de forma similar a como se hace aquí. |
| **Testing** | `tests/ytdlpWrapper.test.ts` | Pruebas E2E / Unitarias del Plugin. | Se mantendrán similares usando Vitest. |

## 2. Visión del Plugin de TypeScript

El objetivo es crear un plugin de Nuclear. La arquitectura de Nuclear usa un **Host** (en el reproductor principal) que expone funciones (API) a un entorno aislado donde se ejecutan los **Plugins**.

### 2.1. Declaración del Provider
En el SDK de Nuclear (`@nuclearplayer/plugin-sdk/src/types/`), existen varios *Providers* (ej. `StreamProvider`).
Nuestro plugin deberá implementar uno de estos contratos:

```typescript
// Ejemplo conceptual del futuro plugin
import { NuclearPlugin, StreamProvider, Track } from '@nuclearplayer/plugin-sdk';

export default class YtDlpMetadataPlugin implements NuclearPlugin {
  name = 'yt-dlp Extra Metadata Provider';
  version = '1.0.0';

  async init(api: NuclearAPI) {
    // Registro del provider en el Host de Nuclear
    api.stream.registerProvider(new YtDlpMetadataProvider(api));
  }
}
```

### 2.2. Adaptación de Tipos (Mapeo de Datos)
Actualmente en `MusicProvider/src/types.ts` tenemos:
```typescript
export interface TrackInfo {
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  streamUrl: string;
}
```
Durante la integración, estos datos deberán ser mapeados a la estructura `Track` que define el `@nuclearplayer/model` o `@nuclearplayer/plugin-sdk`, resolviendo posibles discrepancias (ej. IDs, tags, origen).

## 3. Consideraciones de Backend vs Frontend (Tauri)

Es importante notar que `yt-dlp` es un proceso externo del sistema operativo.
- **Node.js (Actual):** Usamos `child_process.spawn`.
- **Tauri / Nuclear Plugin:** Los plugins de front-end **no tienen acceso a `child_process`** directamente por razones de seguridad de Tauri. 

**Solución:** El plugin de TypeScript **necesitará que el backend de Rust de Nuclear (Tauri) le exponga un comando IPC** (a través de `invoke` o un Host API). 
- Nuclear ya tiene `packages/player/src-tauri/src/ytdlp.rs`.
- El plugin llamará a un puente, por ejemplo `api.native.runYtdlp(['--dump-json', url])`, y será Rust quien haga el `spawn` e invierta el flujo (NDJSON) de vuelta al plugin de TS para que este extraiga y agregue los metadatos al reproductor.

# Guía de Integración a Nuclear

Este documento es una guía viva que sirve como checklist y bitácora de consideraciones técnicas para el momento en el que el código de `MusicProvider` sea convertido en un plugin para el repositorio oficial de Nuclear.

## Checklist Pre-Integración

### 1. Ajustes del Entorno de Ejecución (Tauri vs Node.js)
El entorno Node.js es permisivo con el sistema de archivos y procesos. El entorno de Plugins de Nuclear corre en un contexto web/Vite más restringido.

- [ ] **Sustituir `child_process.spawn`:** Los plugins TS de Nuclear no pueden hacer `spawn` directamente. Hay que identificar o crear el puente (API Host) en Nuclear para que el Rust backend (`src-tauri/src/ytdlp.rs`) ejecute la consulta `--dump-json` y retorne los datos al frontend.
- [ ] **Sistema de Archivos:** Las descargas físicas (`fs.createWriteStream`) hechas en Node no servirán en el frontend. Deberán usarse las APIs nativas de Tauri (`@tauri-apps/api/fs` o un API custom expuesto por Nuclear).

### 2. Alineación de Datos (Modelos)
- [ ] **Mapeo al Modelo Nuclear:** Revisar el paquete `@nuclearplayer/model`. Mapear nuestro `TrackInfo` interno al modelo estandarizado de Nuclear.
- [ ] **ID y Origen:** Asegurarse de que el plugin pueda inyectar la fuente/origen en el Track (ej. `source: 'yt-dlp-custom-plugin'`) para que el reproductor pueda identificar cómo manejar ese stream.

### 3. Consideraciones de Red y Streaming
- [ ] **CORS y Reproducción:** La URL directa devuelta por `yt-dlp` a menudo requiere headers específicos o falla por CORS en un navegador (`<audio src="...">`). Nuclear tiene un `stream_server.rs` proxy local. El plugin deberá retornar la URL envuelta en la URL de este proxy local si es necesario.

## Pasos para la Integración Física

1.  **Clonar el código base:** Asegurarse de tener el repositorio de Nuclear actualizado localmente en `/Users/jonathanquishpe/JoniDev/nuclear`.
2.  **Scaffolding del Plugin:** Usar el script o la metodología documentada en `.agents/skills/writing-plugins/SKILL.md` (si existe en Nuclear) o crear una nueva carpeta dentro del workspace de plugins (o externamente si se publica en npm).
3.  **Migrar Parseo:** Copiar la lógica de parseo NDJSON de `MusicProvider/src/ytdlpWrapper.ts`.
4.  **Implementar Interfaz SDK:** Envolver la lógica migrada dentro de una clase que implemente `MetadataProvider` o `StreamProvider` (importado de `@nuclearplayer/plugin-sdk`).
5.  **Refinar Pruebas:** Migrar los tests de Vitest de MusicProvider para que funcionen sobre la nueva clase Plugin implementada, usando los `builders` de prueba estandarizados en Nuclear.

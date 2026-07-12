---
name: nuclear-reference
description: Guía de integración y referencia cruzada con el repositorio principal de Nuclear. Obligatorio al diseñar funcionalidades que serán portadas.
---

# Referencia a Nuclear

Este proyecto (`MusicProvider`) es una Prueba de Concepto (PoC) aislada. El código que aquí desarrollamos está destinado a convertirse en un **Plugin de TypeScript** para Nuclear. 

Cuando realices tareas complejas, modelado de datos o diseño de arquitecturas en este repositorio, **DEBES apoyarte en el repositorio principal** (`/Users/jonathanquishpe/JoniDev/nuclear`) para asegurar la alineación conceptual.

## ¿Qué buscar en Nuclear?

### 1. Sistema de Plugins (`packages/plugin-sdk/`)
El objetivo de MusicProvider es nutrir de metadatos a los streams.
- Revisa `packages/plugin-sdk/src/types/` para ver las interfaces actuales (ej. `streamProvider`, `metadataProvider`).
- Observa cómo los plugins de Nuclear devuelven resultados (promesas, manejadores de errores, tipos de retorno estándar como `Track`, `Album`, `Artist`). 
- **Regla:** Intenta nombrar tus interfaces en `src/types.ts` de MusicProvider de manera similar a como las nombra Nuclear en su SDK para minimizar refactorizaciones futuras.

### 2. Implementación nativa actual (`packages/player/src-tauri/src/ytdlp.rs`)
Nuclear ya interactúa con `yt-dlp` a través de Rust.
- Lee el archivo `.rs` para entender cómo el backend actual llama al binario, qué flags le pasa y cómo captura los errores.
- Analiza qué cosas Rust delega a `yt-dlp` y qué cosas procesa la aplicación en sí.

### 3. Evitar Dependencias Problemáticas
El entorno de Plugins de Nuclear tiene limitaciones de dependencias en comparación a un script Node normal. 
- Al proponer librerías de NPM para MusicProvider, verifica si Nuclear ya usa algo equivalente en `packages/player/package.json` o `packages/ui/package.json`.
- Evita añadir librerías masivas de manipulación del sistema operativo, a menos que sean estrictamente para el test local de MusicProvider.

### Flujo de Trabajo Recomendado
1. Diseña la interfaz TS en MusicProvider.
2. Compara tu interfaz usando el comando `cat` o la herramienta `view_file` apuntando a `/Users/jonathanquishpe/JoniDev/nuclear/packages/plugin-sdk/...`.
3. Ajusta la nomenclatura en MusicProvider.
4. Desarrolla y prueba.

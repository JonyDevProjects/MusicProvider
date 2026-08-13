# AGENTS.md

Directrices para agentes de codificación de IA que trabajan en el proyecto MusicProvider (Eje 1).

## Descripción del Proyecto

MusicProvider es un motor backend de búsqueda, proxy y descarga de audio de YouTube escrito en Node.js + TypeScript utilizando ESM. Originalmente construido como un backend independiente para Spoti5, ahora **su objetivo principal es ser extraído y empaquetado como un Plugin de TypeScript para el reproductor Nuclear** (`@nuclearplayer/plugin-sdk`).

El sistema utiliza `yt-search` (para búsquedas de muy baja latencia) y `yt-dlp` (para obtención de streams crudos y descargas nativas) cacheando las URLs temporales con `lru-cache`.

## Comandos del Proyecto

```bash
# Instalación de dependencias
npm install

# Compilación de TypeScript
npm run build

# Ejecutar tests automáticos
npm test
npm run test:e2e
```

## Reglas de Estilo de Código y TypeScript

- **Tipo de Módulo**: El proyecto usa ESM (`"type": "module"` en package.json). **Es obligatorio usar la extensión `.js` en todas las importaciones locales** de archivos TypeScript (por ejemplo: `import { getPlatformInfo } from './ytdlpSetup.js';`).
- **Desacoplamiento (Prioridad Máxima)**: La lógica core (`ytdlpWrapper.ts`, parsing, caching) NO DEBE depender de frameworks de servidor HTTP (como Express.js). Express es solo una capa temporal. Todo debe estar preparado para consumirse como librería.
- **Testing**: Las pruebas se realizan mediante **Vitest** y **Playwright**. Mantenemos el test suite al 100% verde tras cada cambio.

## El Eje 1: Plugin para Nuclear

El objetivo actual del proyecto es:
1. Extraer la lógica pura de obtención de metadata y streams.
2. Adaptar la interfaz a los estándares del `@nuclearplayer/plugin-sdk`.
3. Empaquetar todo el proyecto como un plugin independiente de Nuclear, permitiéndole a Nuclear usar yt-dlp y yt-search.

- **Ubicación de Referencia**: El código base original de Nuclear se encuentra en `/Users/jonathanquishpe/JoniDev/nuclear`.
- Cuando diseñes nuevas funciones, interfaces o flujos de trabajo, **DEBES revisar el código de Nuclear**. En especial:
  - `packages/plugin-sdk/` para entender cómo se declaran los tipos de plugins y cómo retornan la información.
  - `packages/player/src-tauri/src/ytdlp.rs` para ver cómo el backend oficial de Nuclear consume `yt-dlp`.
- Consulta el skill `nuclear-reference` para más detalles.

## Ecosistema configurado (Gentle-AI inspired)

Este proyecto tiene configurados los siguientes componentes del ecosistema:

### MCP Servers
| Servidor | Propósito | Comando de setup |
|---|---|---|
| **Engram** | Memoria persistente del proyecto | `cmd mcp add engram -- engram mcp` |

### Skills instalados
- `sdd-workflow` — Ciclo SDD completo (diseño → implementación → verificación)
- `music-provider` — Guía de integración con yt-dlp
- `nuclear-reference` — Referencia cruzada con el repositorio Nuclear

### OpenSpecs
Los specs de diseño se almacenan en `.openspecs/<cambio>/README.md`. El archivo `.openspecs/config.json` define las convenciones del proyecto.

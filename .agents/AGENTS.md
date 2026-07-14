# AGENTS.md

Directrices para agentes de codificación de IA que trabajan en el proyecto MusicProvider.

## Descripción del Proyecto

MusicProvider es un módulo standalone y CLI desarrollado en Node.js + TypeScript utilizando ESM (ECMAScript Modules). Imita el enfoque de descarga automática, actualización y ejecución del binario `yt-dlp` que utiliza el reproductor Nuclear. Permite buscar canciones, obtener información de streams y descargar tracks de audio en su formato nativo.

## Comandos del Proyecto

```bash
# Instalación de dependencias
npm install

# Compilación de TypeScript
npm run build

# Ejecutar tests automáticos
npm run test

# Ejecución manual en desarrollo (usando tsx para ejecutar archivos de TypeScript directamente)
npx tsx src/cli.ts --help
npx tsx src/cli.ts setup
npx tsx src/cli.ts search "Radiohead Creep"
npx tsx src/cli.ts stream "XFkzRNyygfk"
npx tsx src/cli.ts download "XFkzRNyygfk" --out ./downloads
```

## Reglas de Estilo de Código y TypeScript

- **Tipo de Módulo**: El proyecto usa ESM (`"type": "module"` en package.json). **Es obligatorio usar la extensión `.js` en todas las importaciones locales** de archivos TypeScript (por ejemplo: `import { getPlatformInfo } from './ytdlpSetup.js';`).
- **TypeScript estricto**: Se deben resolver todos los tipos implícitos. No usar tipado `any` a menos que sea estrictamente necesario.
- **Testing**: Las pruebas se realizan mediante **Vitest**. Preferimos pruebas de integración reales utilizando la descarga del binario real y APIs reales, asegurando que el flujo de reproducción/descarga se mantenga funcional tras cambios externos en YouTube.

## Relación con el Proyecto Nuclear (Referencia Obligatoria)

MusicProvider es una Prueba de Concepto (PoC) para una futura integración en el proyecto **Nuclear**. La meta final de la funcionalidad desarrollada aquí es ser exportada como un **Plugin de TypeScript** (utilizando el `@nuclearplayer/plugin-sdk`) que dote de metadatos adicionales a los tracks de audio descargados, y gestione el stream en el reproductor.

- **Ubicación de Referencia**: El código base original de Nuclear se encuentra en `/Users/jonathanquishpe/JoniDev/nuclear`.
- Cuando diseñes nuevas funciones, interfaces o flujos de trabajo, **DEBES revisar el código de Nuclear**. En especial:
  - `packages/plugin-sdk/` para entender cómo se declaran los tipos de plugins y cómo retornan la información.
  - `packages/player/src-tauri/src/ytdlp.rs` para ver cómo el backend oficial consume `yt-dlp`.
- **Regla de Integración**: Evita usar paquetes pesados que no estén alineados con las librerías permitidas o utilizadas en Nuclear, y siempre piensa en el diseño orientado a plugins (abstracciones, "hosts" y "providers"). Consulta el skill `nuclear-reference` para más detalles.

## Ecosistema configurado (Gentle-AI inspired)

Este proyecto tiene configurados los siguientes componentes del ecosistema:

### MCP Servers (conectados vía `cmd mcp`)
| Servidor | Propósito | Comando de setup |
|---|---|---|
| **Engram** | Memoria persistente del proyecto | `cmd mcp add engram -- engram mcp` |
| **Context7** | Documentación actualizada de librerías/APIs | `cmd mcp add context7 -- npx -y @upstash/context7-mcp --api-key <key>` |

### Skills instalados
- `sdd-workflow` — Ciclo SDD completo (diseño → implementación → verificación)
- `music-provider` — Guía de integración con yt-dlp
- `nuclear-reference` — Referencia cruzada con el repositorio Nuclear

### OpenSpecs
Los specs de diseño se almacenan en `.openspecs/<cambio>/README.md`. El archivo `.openspecs/config.json` define las convenciones del proyecto.

### Flujo de trabajo recomendado (SDD)
1. **Tarea sustancial (2+ archivos o decisión arquitectónica)**:
   - Lee el spec existente en `.openspecs/` si aplica
   - Usa el skill `sdd-workflow` para diseñar, implementar y verificar
   - Persiste las decisiones en Engram con `mem_save`

2. **Tarea simple (1 archivo, cambio pequeño)**:
   - Implementa directamente, sin ciclo SDD completo

3. **Documentación de APIs externas**:
   - Usa Context7 (`resolve-library-id` + `query-docs`) para obtener docs actualizadas

4. **Resumen de sesión**:
   - Al finalizar tareas significativas, llama a `mem_session_summary` para persistir el contexto

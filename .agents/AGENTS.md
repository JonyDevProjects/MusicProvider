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

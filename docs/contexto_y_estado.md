# Contexto y Decisiones del Proyecto: MusicProvider

## 1. Contexto de Partida (Antes de la Implementación)

*   **Origen:** El proyecto principal de música (Nuclear) utiliza la herramienta de línea de comandos `yt-dlp` en su backend escrito en Rust (`src-tauri/src/ytdlp.rs`) para resolver metadatos y descargar streams de audio de diversas plataformas.
*   **Necesidad:** Surgió la necesidad de crear una aplicación "standalone" (totalmente independiente y aislada del proyecto principal) para poder probar funcionalidades, flujos de streaming e integraciones con `yt-dlp` de manera ágil antes de integrarlas al reproductor final.
*   **Requerimientos:** Se solicitó una herramienta que pudiera extraer tracks de audio, obtener metadatos básicos (título, artista, miniatura, url de stream) y descargar los archivos físicos en un directorio específico (`/Users/jonathanquishpe/Desktop/Tmp/MusicProvider`).
*   **Situación Previa:** No existía un entorno de pruebas local en TypeScript que replicara de forma fiel cómo el backend de Nuclear invoca y parsea la información asíncrona de `yt-dlp`.

## 2. Decisiones de Diseño Arquitectónico

Durante la implementación en la sesión, se tomaron las siguientes decisiones clave para asegurar la estabilidad y el uso de buenas prácticas:

*   **Stack Tecnológico:** Se optó por **Node.js + TypeScript usando ECMAScript Modules (ESM) nativos**. Esto garantiza que el código sea moderno, use importaciones estándar de la web y sea fácilmente migrable si en un futuro sus partes se extraen como una librería.
*   **Gestión Autónoma del Binario (`src/ytdlpSetup.ts`):** 
    *   En lugar de asumir que la máquina host tiene `yt-dlp` instalado globalmente, o depender de librerías de NPM de terceros desactualizadas, se implementó un script que **detecta el sistema operativo** (macOS, Linux, Windows) y la arquitectura.
    *   La herramienta **descarga automáticamente el binario oficial (nightly build)** de GitHub, le asigna permisos de ejecución (`chmod +x`) y lo almacena localmente en `bin/yt-dlp`. Esto previene problemas con cambios en APIs (ej. Youtube cambiando estructuras y bloqueando bots) asegurando siempre la última versión disponible.
*   **Interacción mediante Child Process (`src/ytdlpWrapper.ts`):**
    *   Se utiliza `child_process.spawn` de Node.js para ejecutar el binario.
    *   Para la extracción de metadatos rápidos sin bajar el archivo entero, se utiliza el flag `--dump-json`.
    *   **Parseo de NDJSON:** Dado que `yt-dlp` retorna datos en formato *New Line Delimited JSON* (un objeto JSON válido en cada línea), se construyó un recolector de buffers en el evento `stdout.on('data')` que separa las respuestas por cada salto de línea (`\n`). Esto permite procesar listas de reproducción gigantes sin desbordar la memoria o romper el parseador de JSON.
*   **Testing de Playlists y Búsquedas:**
    *   Extraer metadatos de listas de reproducción de YouTube mediante URL directa suele fallar rápidamente en entornos automatizados debido a bloqueos antibot.
    *   Como decisión de diseño para testing y uso general, se estableció que las descargas múltiples se pueden probar de forma robusta utilizando el motor de búsqueda integrado (`ytsearchN:query`), que retorna la misma estructura de metadatos de "lista" pero con un índice de éxito mucho mayor.
*   **Pruebas Automatizadas:** Se incluyó **Vitest** en el stack para probar la descarga inicial del binario, la extracción de info única, múltiples tracks y la descarga física de un archivo.

## 3. Estado Actual de la Herramienta

La herramienta ha sido implementada de forma completa y está operativa en su nivel fundacional. 

### Estructura del Directorio
```text
/Users/jonathanquishpe/Desktop/Tmp/MusicProvider/
├── .agents/                 # Ecosistema de agentes (Reglas y Skills documentados para IA)
├── bin/                     # Carpeta autogenerada donde reside el binario de yt-dlp
├── docs/                    # Documentación del proyecto (este archivo)
├── downloads/               # Directorio por defecto para tracks de audio descargados
├── src/
│   ├── cli.ts               # Interfaz de Línea de Comandos para probar funciones manualmente
│   ├── types.ts             # Definiciones de interfaces TypeScript para los metadatos
│   ├── ytdlpSetup.ts        # Lógica de instalación/actualización de yt-dlp
│   └── ytdlpWrapper.ts      # Envoltura de comunicación (métodos principales)
├── tests/
│   └── ytdlpWrapper.test.ts # Pruebas de integración reales
├── package.json
└── tsconfig.json
```

### Funcionalidades Mínimas (MVPs) Completadas:
1.  **Resolución y Extracción de Metadatos:** Recibe un término de búsqueda o URL y extrae correctamente la URL directa del stream, artista, título, duración y thumbnail.
2.  **Soporte de Listas / Búsquedas Múltiples:** Retorna arreglos de tracks parseando la salida NDJSON.
3.  **Descarga Directa al Disco:** Permite descargar la mejor calidad de audio al directorio `downloads/` asignando el nombre del título de la pista.
4.  **CLI Incorporado:** Se crearon scripts en NPM para probar rápido. Ejemplos que el usuario puede correr hoy:
    *   `npm run cli setup` (Fuerza descarga del binario)
    *   `npm run cli info "url o búsqueda"` (Muestra metadatos en consola)
    *   `npm run cli search "artista"` (Busca los 5 primeros resultados)
    *   `npm run cli download "url"` (Descarga el track)
5.  **Compatibilidad Multiplataforma:** La herramienta hereda el soporte de los cientos de páginas web que soporta `yt-dlp` (SoundCloud, Bandcamp, Twitch, Vimeo, etc.) sin necesidad de adaptar código en TypeScript.

## 4. Ecosistema de Agentes

Para asegurar que se pueda iterar y extender esta aplicación en el futuro utilizando IA de manera predecible, se configuraron:
*   **Reglas Locales (`.agents/AGENTS.md`):** Obligan al uso estricto del estándar ESM (extensiones `.js` en importaciones relativas).
*   **Skill Técnico (`.agents/skills/music-provider/SKILL.md`):** Contiene el "know-how" para que cualquier agente que lea el entorno entienda inmediatamente la naturaleza del wrapper, el formato NDJSON y las responsabilidades del binario, sin tener que gastar tiempo "re-descubriendo" el código.

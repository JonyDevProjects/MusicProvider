---
name: music-provider
description: Guía de integración y resolución de problemas con el wrapper de yt-dlp y la descarga de audio.
---

# Skill: MusicProvider (yt-dlp wrapper & downloader)

Este skill describe cómo mantener y extender las funcionalidades de la aplicación standalone MusicProvider. 

## Entendiendo el flujo de yt-dlp

1. **Instalación/Actualización Automática**: El archivo `src/ytdlpSetup.ts` descarga el archivo ZIP empaquetado correspondiente a la plataforma del usuario desde las compilaciones nocturnas (`yt-dlp-nightly-builds`) de GitHub. Si hay cambios en los endpoints de GitHub o en el formato del nombre de los releases de `yt-dlp`, este archivo debe ser actualizado.
2. **Ejecución y Parseo**: La comunicación con `yt-dlp` en `src/ytdlpWrapper.ts` se realiza mediante JSON. El flag `--dump-json` hace que `yt-dlp` imprima una línea de JSON válida para cada resultado encontrado (NDJSON). Si el formato de salida cambia o se requieren nuevos metadatos (como el bitrate o el tamaño del archivo), se deben mapear desde los campos JSON que entrega `yt-dlp`.
3. **Descarga**: Para descargar, se inicia un proceso hijo usando `spawn` con el fin de poder capturar el progreso en tiempo real. El comando descarga directamente el stream de mejor audio y lo coloca en un archivo con el formato del nombre de la canción.

## Modificaciones comunes de yt-dlp

### Cambiar el formato del audio o descargar MP3 con ffmpeg
Si en el futuro se requiere conversión a MP3 o algún formato específico que necesite `ffmpeg`, se debe agregar el flag `-x` junto con `--audio-format mp3`.
Ejemplo de argumentos para descargas procesadas:
```typescript
const args = [
  '-x',
  '--audio-format', 'mp3',
  '--ffmpeg-location', '/ruta/a/ffmpeg', // Opcional, si no está en PATH
  ...
]
```

### Modificar el límite de búsquedas o los flags de YouTube
Si YouTube aplica cambios en su algoritmo que rompen la extracción (lo cual ocurre regularmente), se debe:
1. Verificar si hay una actualización de `yt-dlp` forzando la descarga en `src/ytdlpSetup.ts`.
2. Añadir flags adicionales a la línea de comandos en `src/ytdlpWrapper.ts` (como `--cookies` o `--user-agent`) para evadir el bloqueo.

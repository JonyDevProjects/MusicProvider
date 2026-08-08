# Unified Proxy Playback — Investigación y Solución

**Contexto**: Tras intentar implementar la reproducción standalone en Android (sin dependencia del backend local) usando las Soluciones A, C (`just_audio`) y B (compilación nativa de `yt-dlp` vía Rust), el funcionamiento en Android ha empezado a enfrentar dificultades (problemas de incompatibilidad de binarios glibc vs Bionic, 403 Forbidden desde el CDN, etc.).

Sin embargo, antes de estos intentos de standalone, **ya existía una solución que funcionaba para Android (y otras plataformas)** utilizando el backend `ApiService`. Adicionalmente, gracias a la investigación de iOS (`feature/proxy-short-tunnel`), se logró que el **iPhone físico también funcionara correctamente a través de red celular** utilizando este mismo proxy backend expuesto vía un túnel (Cloudflare Tunnel).

**Objetivo**: Volver al "punto dulce" del desarrollo (commit `a08f0b2` / `ea793c8`) donde el backend proxy resolvía la reproducción para *todas* las plataformas, consolidando el `ApiService` como el mecanismo unificado de reproducción y descartando temporalmente la inestabilidad de las soluciones standalone (B y C).

---

## Índice

| Documento | Contenido |
|-----------|-----------|
| [roadmap.md](roadmap.md) | Roadmap estructurado en fases para restaurar y consolidar la solución proxy |

---

## Resumen del Problema y Decisión

### Por qué fallaron las soluciones standalone recientes:
1. **Solución C (`just_audio` + `youtube_explode_dart`)**: Aunque la librería permitía enviar HTTP headers personalizados, YouTube continuó bloqueando las peticiones directas desde el cliente con errores `403 Forbidden`, debido a protecciones anti-bot de la CDN que requieren parámetros y cookies complejas que solo `yt-dlp` genera fiablemente en el momento.
2. **Solución B (`yt-dlp` nativo en Android vía Rust FRB)**: La compilación del binario empaquetado como `.so` chocó con limitaciones de la libc nativa de Android (Bionic vs Glibc), dificultando enormemente la ejecución de `yt-dlp` empaquetado con PyInstaller de forma consistente y portable.

### La Solución Unificada (Proxy Streaming)
En la rama `feature/proxy-short-tunnel` (integrada justo antes de los experimentos de Android standalone), se validó que:
- El backend en Node (`src/server.ts`) puede invocar `yt-dlp` usando la IP del Mac.
- El backend fuerza la descarga mediante la cabecera `Range: bytes=0-` para saltarse el 403.
- Mediante un **Cloudflare Tunnel**, el dispositivo móvil (incluso un iPhone en red celular) se conecta al backend local, y el stream se reproduce sin latencias severas.
- Esta solución probó ser **100% estable en Android, macOS, iOS Simulator y iPhone Físico**.

### Próximos pasos
El enfoque será crear una nueva rama a partir del commit estable (`a08f0b2`) o revertir limpiamente los commits de las Soluciones B y C, limpiar el código de dependencias inestables, y documentar el uso de `BASE_URL` para que la app sea universalmente dependiente del proxy de forma elegante.

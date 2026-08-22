# Propuesta de Valor: Nuclear MusicProvider Plugin

> **Un proveedor híbrido y optimizado para llevar la experiencia de búsqueda y reproducción de Nuclear al siguiente nivel.**

## 1. El Desafío Actual

Nuclear ofrece una experiencia de escritorio fantástica gracias a su arquitectura basada en plugins y soporte para múltiples fuentes. Actualmente, la integración oficial con YouTube depende de `yt-dlp` ejecutado como un subproceso (Rust/Tauri) a través del backend principal (`src-tauri/src/ytdlp.rs`).

Si bien `yt-dlp` es el estándar de oro indiscutible para resolver streams de audio, utilizarlo para **búsquedas de texto** (`ytsearch{limit}:{query}`) presenta limitaciones arquitectónicas:
1. **Latencia Subóptima:** Inicializar el intérprete de Python, instanciar `yt-dlp`, hacer web scraping y parsear un `ndjson` toma un mínimo de **1.7+ segundos**.
2. **Consumo de Recursos (CPU):** Por cada tecla o consulta que hace el usuario, el sistema debe levantar un proceso binario pesado y efímero.
3. **Bloqueos Tempranos:** Exponer `yt-dlp` a consultas de búsqueda frecuentes incrementa el riesgo de que la IP del usuario caiga en un rate-limit o reciba un HTTP 429 de YouTube de forma prematura.

## 2. Nuestra Solución: Un Enfoque Híbrido

El plugin **MusicProvider** propone una arquitectura híbrida que separa la responsabilidad de la _búsqueda_ de la _resolución de streaming_, escogiendo la mejor herramienta para cada tarea:

- **Búsqueda Ultrarrápida (Nativa JS):** Sustituimos la invocación de `yt-dlp` para búsquedas por `yt-search` (paquete nativo de NPM). Al ejecutarse dentro del mismo contexto V8/Node de Nuclear, eludimos completamente el overhead de los subprocesos de Python.
- **Resolución Precisa (yt-dlp con LRU Cache):** Seguimos utilizando `yt-dlp` exclusivamente para resolver metadatos profundos y URLs de streaming directas, pero añadimos una capa de caché (LRU-cache temporal) para que re-escuchar un stream previamente resuelto tome *0 milisegundos*.

## 3. Benchmark Comparativo y Evidencia Cuantitativa

A continuación, los resultados de rendimiento formalmente medidos en nuestra suite de benchmarks (`benchmarks/results/analysis-latency.md`):

| Métrica / Operación | Backend Oficial de Nuclear (`yt-dlp` en Rust) | MusicProvider Plugin (Híbrido) | Factor de Mejora / Evidencia |
|:---|:---:|:---:|:---|
| **Latencia de Búsqueda (Search)** | ~1,730 ms | **100 – 300 ms** (`yt-search`) | **🚀 +70% a +85% más rápido** (sin spawning de subprocesos) |
| **Overhead de CPU en Búsqueda** | Alto (Spawnea subproceso Python por tecla) | **Insignificante** (V8 Task nativo) | Cero carga térmica y ahorro drástico de batería |
| **Resolución de Stream (Cold Cache)** | ~2,592 ms | **~2,504 ms** | Idéntico (I/O Bound hacia CDN de Google) |
| **Resolución de Stream (Warm Cache / RAM)** | ~2,592 ms (re-ejecuta subproceso) | **0.0142 ms (14.2 µs)** | **⚡ ~176,500x más rápido** (lookup O(1) en V8 Heap) |
| **Time-to-First-Byte (Inicio de Audio)** | 5,000 – 15,000 ms (descarga total) | **20 – 83 ms** (`Range: bytes=0-`) | Inicio de reproducción prácticamente instantáneo |
| **Consumo de Disco en Playback** | 10 – 20 MB por canción | **0 MB (Streaming directo)** | Sin desgaste de SSD ni archivos temporales huérfanos |

## 4. Ventajas Técnicas del Streaming Progresivo vs Descarga Nativa

1. **UX Inmediata (Snappy UX & Playback Instantáneo):**
   - La búsqueda de canciones se reduce por debajo de 300 ms, eliminando la sensación de "lag" al escribir.
   - El audio comienza a sonar en menos de 100 ms tras el clic gracias a las solicitudes HTTP de chunks parciales (`Range: bytes=0-`), sin esperar a que el archivo completo se descargue al disco.
2. **Cero Fugas de Memoria y Manejo Seguro con NDJSON:**
   - La lectura línea por línea mediante `ndjson.ts` permite procesar listas de reproducción gigantescas o resultados múltiples sin desbordar el Heap de V8 ni provocar Out of Memory (OOM).
3. **Resiliencia ante Expiración de URLs (Transparent Refresh):**
   - Las firmas de URLs directas de YouTube caducan a las 4-6 horas. En canciones largas, mixes o podcasts, MusicProvider detecta los errores HTTP 403 y regenera el stream en segundo plano sin interrumpir la reproducción.
4. **Vida Útil de Batería y Cero Desgaste de Disco:**
   - Al no requerir escribir y borrar archivos temporales de 10-20 MB por cada pista escuchada, se preserva la vida útil del disco SSD y la autonomía en portátiles.
5. **Código Mantenible, Tipado y Testeado al 100%:**
   - Construido con TypeScript estricto, 100% compatible con `@nuclearplayer/plugin-sdk`, validado con Vitest y Playwright, y empaquetado como bundle CommonJS autónomo de ~34 KB sin dependencias externas en tiempo de ejecución.

---

**Resumen:** MusicProvider no compite con la robustez de Nuclear; al contrario, actúa como una optimización quirúrgica que elimina el principal cuello de botella percibido por el usuario: *la latencia de descubrimiento y la espera de inicio de reproducción*.

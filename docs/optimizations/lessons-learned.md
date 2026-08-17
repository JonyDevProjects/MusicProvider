# Lecciones Aprendidas (Engram)
Fecha: 2026-08-18
Eje 1: Integración Nuclear Plugin

## 1. El Peligro de las APIs Públicas vs. Alta Disponibilidad (Scraping)
Observamos cómo el plugin `omnisource` colapsaba la interfaz de usuario de Nuclear con esperas de 8000ms porque la API pública de *MusicBrainz* arrojaba errores `HTTP 503 (Rate Limit / Service Unavailable)`. 
**Lección:** Nuestra decisión arquitectónica de depender del HTML inicial de YouTube (scraping directo) demuestra ser infinitamente más robusta y escalable, ya que heredamos la infraestructura de altísima disponibilidad de Google en lugar de depender de APIs gratuitas de terceros que se caen fácilmente.

## 2. El "Sandbox" de Plugins y las Limitaciones de Red
Descubrimos que el entorno de plugins de Nuclear no permite usar módulos core de Node.js (como `http/https`), lo que nos obligó a abandonar librerías optimizadas como `yt-search`. 
**Lección:** Al usar APIs expuestas por el host como `api.Http.fetch`, perdemos las optimizaciones automáticas subyacentes de Node.js. En entornos aislados (WebViews/Tauri) debemos ser extremadamente explícitos con las cabeceras de red (como `Accept-Encoding: gzip, deflate, br`) para no ahogar el rendimiento descargando payloads gigantes (reduciendo el payload de YouTube de 2MB a ~300KB).

## 3. El Motor de Enrutamiento Interno de Nuclear (IDs)
Resolvimos un retraso masivo en la reproducción descubriendo un comportamiento no documentado de Nuclear:
**Lección:** Nuclear vincula los metadatos y el streaming de manera estricta. Si el `source.provider` de un track devuelto por una búsqueda no coincide *exactamente* con el ID del proveedor de streaming activo, Nuclear asume que no sabe de dónde sacar el audio y fuerza una **búsqueda secundaria redundante** (`searchForTrack`). Firmar los tracks con el `STREAMING_ID` desde el primer momento es vital para una experiencia sin latencia ("lag").

## 4. Sensibilidad del Backend Rust (`yt-dlp`) a los Datos Corruptos
Observamos repetidamente el error crítico `yt-dlp_macos: error: no such option: -z` en los logs generales. 
**Lección:** El backend nativo de Nuclear (escrito en Rust) confía ciegamente en los IDs que el plugin le envía. Si un plugin competidor pasa un ID malformado (que en algún punto se interpreta o inyecta como `-z`), causa que el binario de Python `yt-dlp` falle estrepitosamente. Esto resalta la importancia de aislar, validar y sanear fuertemente los inputs (`candidateId`) antes de mandarlos al SDK.

## 5. Delegación de Carga al Motor Nativo
**Lección:** Extraer la obtención del stream crudo hacia `api.Ytdlp.getStream(id)` fue un total acierto. En lugar de que nuestro plugin intente levantar subprocesos o manejar volcados binarios en JavaScript, delegamos todo el trabajo pesado a la capa subyacente en Rust. Esto mantiene el plugin ligero, seguro y completamente enfocado en la lógica de metadatos.

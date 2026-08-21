# Especificación Técnica de Alternativas de Optimización

---

## Alternativa A: YouTube Mobile Scraper (`m.youtube.com`)

### Concepto
YouTube sirve una versión simplificada de su interfaz web en `m.youtube.com` optimizada para conexiones móviles lentas. El HTML pesa alrededor de 180 KB - 250 KB (frente a los ~1.30 MB de la versión de escritorio).

### Implementación
- Modificar la URL en `scrapeYoutube`:
  `https://m.youtube.com/results?search_query=${encodeURIComponent(query)}`
- Enviar User-Agent móvil:
  `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1`
- Adaptar parser regex para extraer `ytInitialData` del HTML móvil.

---

## Alternativa B: YouTube Music / Invidious API Pública

### Concepto
Evitar por completo el parsing de HTML consumiendo un endpoint que retorne JSON directamente sin headers de sesión requeridos.

### Implementación
- Invocar endpoint público de búsqueda (ej. instancia Invidious confiable o endpoint JSON interno de YT Music).
- Mapear el JSON de respuesta a la interfaz interna `SearchResult[]`.

---

## Alternativa C: Descompresión en JS Puro (`fflate`)

### Concepto
Volver a enviar `Accept-Encoding: gzip` a YouTube y realizar la descompresión en JavaScript antes de procesar el texto.

### Implementación
- Añadir dependencia ligera `fflate` (~8 KB).
- Recibir la respuesta de `api.Http.fetch` como bytes/base64 y descomprimir mediante `fflate.gunzipSync()`.
- Parsear el string HTML descomprimido con `parseYoutubeSearchHtml()`.

---

## Alternativa D: LRU Search Cache + Warmup

### Concepto
Almacenar en memoria los resultados de búsquedas recientes con un TTL configurable (ej. 10 - 15 minutos).

### Implementación
- Crear instancia de `LRUCache<string, SearchResult[]>` en `src/core/cache.ts`.
- Retornar inmediatamente resultados cacheados cuando la consulta coincida.

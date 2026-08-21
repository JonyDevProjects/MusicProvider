# Especificación del Benchmark de Optimizaciones

---

## 1. Metodología de Medición

El harness de benchmark ejecutará un banco de pruebas representativo de 10 consultas musicales con distintos perfiles:
1. Pistas en inglés populares (ej. *Radiohead - Creep*, *Queen - Bohemian Rhapsody*).
2. Pistas en español / latinas (ej. *El combo de las estrellas*, *Bacilos - Caraluna*, *Rata Blanca*).
3. Pistas con caracteres especiales / acentos.
4. Búsquedas repetidas (para medir aciertos de caché).

---

## 2. Métricas Clave

| Métrica | Definición | Objetivo |
|---|---|---|
| **Cold Search Latency (p50 / p95)** | Tiempo desde la invocación de búsqueda hasta el retorno de `SearchResult[]` sin caché | < 500 ms (p95) |
| **Warm Search Latency (p50 / p95)** | Tiempo de respuesta para consultas repetidas en memoria | < 1 ms |
| **Network Payload (Bytes)** | Volumen de datos transferidos a través de `api.Http.fetch` | < 300 KB por búsqueda |
| **Bundle Overhead (KB)** | Incremento en el tamaño final de `dist/index.js` | < 15 KB |
| **Error / Fallback Rate (%)** | Porcentaje de búsquedas que requieren delegar en `api.Ytdlp` | < 2% |

# Plan de Optimización de Rendimiento del Plugin MusicProvider

**Estado**: 📋 Planificado (Post-Fase 4)
**Objetivo**: Implementar, comparar mediante benchmarks y adoptar las mejores alternativas para minimizar la latencia de búsqueda y streaming dentro del sandbox de Nuclear sin requerir modificaciones en el backend de Nuclear.

---

## 1. Documentos del Plan

- [benchmark-spec.md](./benchmark-spec.md) — Especificación del harness de pruebas y métricas (latencia p50/p95, payload transferido, tasa de aciertos de caché).
- [alternativas-spec.md](./alternativas-spec.md) — Diseño técnico de cada alternativa a evaluar (YouTube Mobile, Piped/Invidious API, descompresión JS `fflate`, LRU Search Cache).
- [decision-and-results.md](./decision-and-results.md) — Resultados del benchmark, análisis estadístico y decisión final adoptada.

---

## 2. Alternativas a Evaluar

| Alternativa | Enfoque Técnico | Reducción Estimada de Payload | Latencia Esperada |
|---|---|---|---|
| **A. YouTube Mobile (`m.youtube.com`)** | Scraping sobre endpoint móvil con UA específico | **80% de reducción** (~200KB vs ~1.3MB) | ~300 - 500 ms |
| **B. YouTube Music / Invidious API** | Consumo de endpoint JSON directo | **95% de reducción** (~15KB JSON) | ~150 - 300 ms |
| **C. Descompresión JS (`fflate`)** | Embeber descompresor WASM/JS en bundle y forzar `Accept-Encoding: gzip` | **78% de reducción** (~280KB Gzip) | ~500 - 700 ms |
| **D. Cache LRU de Búsquedas + Debouncing** | Cachear respuestas de búsqueda con TTL en memoria | **100% de reducción en hits** (0 bytes) | ~0.02 ms (instantáneo) |

---

## 3. Criterio de Selección

La estrategia ganadora se seleccionará mediante un benchmark automatizado que evaluará:
1. **Latencia de búsqueda en red fría (Cold search p95)**.
2. **Robustez y estabilidad ante cambios de YouTube**.
3. **Mantenibilidad e impacto en el tamaño del bundle (`dist/index.js`)**.

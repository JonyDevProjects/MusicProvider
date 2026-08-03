# Hallazgos Técnicos — Roadmap Proxy Solutions

Última actualización: 206-08-03

---

## 1. Contexto del Problema

### Problema original
iOS bloquea la reproducción de streaming de audio cuando la app accede directamente a URLs de YouTube CDN desde datos celulares. El error `(-1) unknown error` en AVPlayer indica que la request es rechazada a nivel de red/CDN.

### Causa raíz confirmada (de `ios-cellular-playback`)
- YouTube CDN permite probes pequeños (`Range: bytes=0-1`) → 206
- YouTube CDN bloquea descargas completas → 403
- Esto es **bot detection**, no problema de headers, IP, ni proxy
- El bloqueo ocurre en el OS layer (AVPlayer), fuera del control de Dart/Flutter

---

## 2. Estrategia de Solución

### Enfoque: Streaming Proxy
Un proxy intermedio que:
1. Recibe la solicitud de la app iOS
2. Resuelve la URL del stream usando yt-dlp
3. Hace proxy de los bytes al cliente iOS
4. iOS recibe el audio a través de una URL HTTPS propia (no bloqueada)

### Por qué funciona
- La app se conecta a nuestro dominio (no al CDN de YouTube)
- El proxy se conecta al CDN desde macOS (no desde iOS)
- iOS no ve la URL del CDN, solo la URL del proxy

---

## 3. Lecciones de Fases Anteriores

### De `ios-cellular-playback`
1. **No hacer ~50 peticiones repetidas a YouTube** — causa rate limiting
2. **El parámetro `ip=` en YouTube CDN URLs es la IP del cliente**, no del servidor
3. **`badCertificateCallback` no funciona en iOS** para conexiones a IPs raw
4. **YouTube CDN permite probes pequeños pero bloquea descargas completas**
5. **`AudioSource.file()` bypassa AVPlayer HTTP requests** — es clave para evitar 403

---

## 4. Hallazgos por Fase

### Fase 1 — Túnel Local
*(Pendiente de implementación)*

### Fase 2 — Piped API
*(Pendiente de implementación)*

### Fase 3 — VPS Backend
*(Pendiente de implementación)*

---

## 5. Decisiones Pendientes

| Decisión | Opciones | Recomendación |
|----------|----------|---------------|
| Proveedor VPS | Fly.io, Render, Hetzner, AWS Lightsail | TBD según costo y facilidad |
| Framework backend | Node.js, Go, Rust | Node.js (ystack actual) |
| Instancias Piped | kavin.rocks, piped.video, otras | Mínimo 3 para fallback |

---

## 6. Métricas de Referencia

| Métrica | Objetivo Fase 1 | Objetivo Fase 3 |
|---------|-----------------|-----------------|
| Latencia play | < 3s | < 3s |
| Uptime | N/A (testing) | >= 99.5% |
| Costo mensual | $0 (tunnel gratuito) | < $10 |
| Throughput | Suficiente para audio | Suficiente para audio |

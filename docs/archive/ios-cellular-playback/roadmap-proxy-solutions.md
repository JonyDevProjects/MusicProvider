# Roadmap Multi-Agente: iOS Cellular Playback (Streaming Proxy Solutions)

**Rama base sugerida**: `feature/ios-streaming-proxy`
**Fecha inicio**: 2026-08-03
**Objetivo**: Implementar una solución definitiva al problema de `(-1) unknown error` en iOS mediante el uso de un *Streaming Proxy* y resolver la inaccesibilidad del backend local en redes celulares.

---

## Estrategia de Branching

```
develop
  └── feature/ios-streaming-proxy       ← rama base para esta iniciativa
        ├── feature/proxy-short-tunnel  ← Enfoque a corto plazo (Túnel macOS)
        ├── feature/proxy-mid-piped     ← Enfoque a medio plazo (Piped API)
        └── feature/proxy-long-vps      ← Enfoque a largo plazo (VPS Backend)
```

**Reglas**:
- Cada fase se implementa y se prueba de manera iterativa.
- El éxito de la fase a corto plazo valida la hipótesis de que el problema es puramente de red (reachability) y bloqueo directo al CDN.
- Las fases medio y largo plazo deciden la arquitectura final del proyecto.

---

## Fase 1 — Corto Plazo: Validación con Túnel Local (Ngrok / Cloudflare)

**Rama**: `feature/proxy-short-tunnel`
**Objetivo**: Validar el concepto de Streaming Proxy (relay de bytes) exponiendo el backend actual (macOS) a internet de forma temporal y gratuita.

### Tareas en Backend (macOS)
- [ ] Implementar un nuevo endpoint `/api/audio/stream` en Node.js/TypeScript.
- [ ] Hacer que el endpoint resuelva la URL directa con `yt-dlp`.
- [ ] Hacer un HTTP GET a la URL de YouTube CDN desde el backend.
- [ ] Hacer un `.pipe(res)` de los bytes hacia la respuesta HTTP (asegurando pasar headers como `Range` y `Content-Type: audio/mp4`).
- [ ] Exponer el puerto local (ej: 3000) usando `cloudflared` (Cloudflare Tunnels) o `ngrok`.

### Tareas en App (Flutter)
- [ ] Modificar `ApiService` para apuntar a la URL pública temporal del túnel (ej. `https://api.tu-app.trycloudflare.com`).
- [ ] Actualizar el reproductor (`just_audio` o `audioplayers`) para que la fuente de audio apunte a `https://api.tu-app.trycloudflare.com/api/audio/stream?videoId=...`.
- [ ] **Test Físico**: Desactivar WiFi en el iPhone, usar 4G/5G, buscar y reproducir canción.

**Entregable**: Prueba de concepto exitosa que confirma que el proxy soluciona el `AVPlayerItem.Status.failed`.

---

## Fase 2 — Medio Plazo: Integración de Piped API (BaaS)

**Rama**: `feature/proxy-mid-piped`
**Objetivo**: Evitar el mantenimiento de un backend propio e infraestructura, delegando el streaming a instancias públicas Open Source como Piped.

### Tareas en App (Flutter)
- [ ] Investigar el formato de la respuesta de la API de Piped (`https://pipedapi.kavin.rocks/streams/:videoId`).
- [ ] Crear un nuevo servicio `PipedService` (o adaptar `YtExplodeService`) para obtener los streams desde Piped.
- [ ] Analizar los URLs devueltos por Piped (generalmente ya vienen listos para ser consumidos y evitar el CDN bloqueado).
- [ ] Pasar el proxy URL devuelto por Piped directamente a `just_audio`.
- [ ] **Test Físico**: Desactivar WiFi en el iPhone, buscar un track usando la API de Piped y reproducirlo mediante datos celulares.
- [ ] Evaluar tiempos de carga, latencias y estabilidad de la instancia pública.

**Entregable**: Reproducción celular estable y sin servidor propio en macOS.

---

## Fase 3 — Largo Plazo: Migración de Backend a VPS

**Rama**: `feature/proxy-long-vps`
**Objetivo**: Lograr independencia total de APIs de terceros (que pueden caerse o ser bloqueadas) moviendo el backend macOS ya probado (con Streaming Proxy) a un VPS.

### Tareas de Infraestructura (DevOps)
- [ ] Elegir un proveedor de VPS de bajo costo (ej. Fly.io, Render, Hetzner, AWS Lightsail).
- [ ] Crear un `Dockerfile` para empaquetar el backend de Node.js + dependencias de `yt-dlp`.
- [ ] Desplegar el contenedor en el VPS y asegurar que tenga IP estática/dominio HTTPS configurado.

### Tareas en App (Flutter)
- [ ] Configurar variables de entorno (`.env`) en la app de Flutter para apuntar al dominio de producción del VPS (ej. `https://api.musicprovider.com`).
- [ ] Eliminar dependencias temporales de Cloudflare Tunnels o Ngrok de la configuración.
- [ ] **Test Físico**: Verificar reproducción fluida bajo datos celulares.
- [ ] Medir y monitorizar (vía logs del VPS) el consumo de ancho de banda y CPU tras varios días de uso normal para prever costes.

**Entregable**: App en estado de producción con infraestructura estable, proxy propio, sin limitaciones de red para iOS celular.

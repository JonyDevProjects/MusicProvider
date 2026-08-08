# Spec: Fase 1 — Corto Plazo: Validación con Túnel Local

**Status**: `ready` — Entorno preparado, pendiente de implementación
**Rama**: `feature/proxy-short-tunnel`
**Rama base**: `feature/ios-streaming-proxy`
**Dependencias**: Ninguna (fase inicial)
**Fecha inicio**: 2026-08-03
**Objetivo**: Validar el concepto de Streaming Proxy exponiendo el backend actual a internet de forma temporal.

---

## Problema

iOS bloquea la reproducción de audio streaming cuando la app accede a URLs de YouTube CDN directamente desde datos celulares. El error `(-1) unknown error` en AVPlayer indica que la request es rechazada a nivel de red/CDN, no un problema de formato.

## Hipótesis

Exponer el backend local (macOS) como proxy intermedio permite que iOS reciba el audio a través de una URLHTTPS propia (no bloqueada), validando que el problema es puramente de reachability.

---

## Requisitos Funcionales

### RF-1.1: Endpoint de Streaming Proxy
- **Como** desarrollador quiero un endpoint `/api/audio/stream` que actúe como relay de bytes para que la app iOS pueda reproducir audio sin conectarse directamente al CDN de YouTube.

**Criterios de aceptación**:
- [ ] El endpoint acepta `GET /api/audio/stream?videoId={id}`
- [ ] Resuelve la URL del stream usando `yt-dlp` (o `ytdl-core`)
- [ ] Hace proxy del contenido audio realizando GET al CDN y pipeando los bytes
- [ ] Soporta headers `Range` para seeks (HTTP 206 Partial Content)
- [ ] Retorna `Content-Type: audio/mp4` (o el mime correcto)
- [ ] Maneja errores de red/timeout gracefully (502/504)

### RF-1.2: Exposición del Backend
- **Como** desarrollador quiero exponer el puerto local del backend a internet usando Cloudflare Tunnels o Ngrok para que iOS pueda acceder al proxy desde datos celulares.

**Criterios de aceptación**:
- [ ] Se genera una URL pública HTTPS temporal (ej: `https://xxx.trycloudflare.com`)
- [ ] La URL es accesible desde la red celular del iPhone
- [ ] El tunnel se inicia con un comando simple (script o manual)

### RF-1.3: Configuración de la App Flutter
- **Como** usuario quiero que la app apunte al proxy para que la reproducción funcione en celular.

**Criterios de aceptación**:
- [ ] `ApiService` tiene una configuración para la URL base del proxy
- [ ] El endpoint de stream usa la URL del proxy
- [ ] La app puede alternar entre modo local (desarrollo) y modo proxy

---

## Requisitos No Funcionales

### RNF-1.1: Latencia
- El tiempo desde que el usuario presiona play hasta que empieza a sonar debe ser < 3 segundos en 4G/5G.

### RNF-1.2: Disponibilidad
- El tunnel debe estar activo mientras se pruebe. No se requiere uptime 24/7 (es validación de concepto).

### RNF-1.3: Seguridad
- El endpoint NO debe exponer datos sensibles del backend
- La URL del tunnel es temporal y no debehardcodearse en el repo

---

## Escenarios de Validación

### Escenario 1: Happy Path — Reproducción Exitosa
```
DADO que el backend está corriendo en macOS
Y que el tunnel está activo (URL pública disponible)
CUANDO el usuario busca una canción en la app
Y presiona play con datos celulares activos (sin WiFi)
ENTONCES el audio debería comenzar a reproducirse en < 3 segundos
Y no debería aparecer el error (-1) unknown error
```

### Escenario 2: Seek/Range Request
```
DADO que una canción está reproduciéndose
CUANDO el usuario hace seek a la mitad de la canción
ENTONCES el audio debería continuar desde ese punto
Y no debería reiniciarse desde el inicio
```

### Escenario 3: Manejo de Error de Red
```
DADO que el CDN de YouTube retorna un error
CUANDO la app solicita el stream
ENTONCES el endpoint debería retornar un código de error apropiado (502/504)
Y la app debería mostrar un mensaje de error al usuario
```

---

## Tareas de Implementación

### Backend (Node.js/TypeScript)
- [ ] **T-1.1**: Crear endpoint `GET /api/audio/stream` con query param `videoId`
- [ ] **T-1.2**: Integrar `yt-dlp` o `ytdl-core` para resolver URL del CDN
- [ ] **T-1.3**: Implementar proxy de bytes con soporte Range headers
- [ ] **T-1.4**: Agregar manejo de errores y logging

### DevOps / Infraestructura
- [ ] **T-1.5**: Configurar Cloudflare Tunnel (o Ngrok) para el puerto del backend
- [ ] **T-1.6**: Documentar comandos para iniciar tunnel

### App Flutter
- [ ] **T-1.7**: Crear configuración de environment para URL del proxy
- [ ] **T-1.8**: Actualizar `ApiService` para usar URL del proxy en modo tunnel
- [ ] **T-1.9**: Actualizar reproductor de audio para apuntar al proxy

### Testing
- [ ] **T-1.10**: Prueba física en iPhone con 4G/5G (WiFi desactivado)
- [ ] **T-1.11**: Documentar resultados en `session-log.md`

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Tunnel gratuito tiene rate limits | Media | Alto | Usar Cloudflare (más generoso) o probar Ngrok free tier |
| Latencia excesiva por doble salto (iOS→Proxy→CDN) | Baja | Medio | Monitorear tiempos; si es problema, considerar cache |
| yt-dlp no resuelve URL correctamente | Baja | Alto | Verificar con videos públicos; tener fallback a ytdl-core |

---

## Entregable

PoC exitoso que confirma que el proxy soluciona el `AVPlayerItem.Status.failed` en iOS con datos celulares.

---

## Criterios de Cierre

- [ ] Reproducción exitosa en iPhone con 4G/5G activo
- [ ] Seek funciona correctamente
- [ ] Errores manejados adecuadamente
- [ ] Resultados documentados en `session-log.md`

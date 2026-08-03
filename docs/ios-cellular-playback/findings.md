# Hallazgos Técnicos — iOS Cellular Playback

Última actualización: 2026-08-01

---

## 1. Comportamiento de YouTube CDN

### Patrón observado (consistente en TODAS las pruebas)

| Tipo de petición | Range Header | Resultado | Observación |
|-----------------|-------------|-----------|-------------|
| Probe | `bytes=0-1` (2 bytes) | **206** ✅ | Siempre funciona |
| Descarga completa | `bytes=0-N` | **403** ❌ | Siempre falla |

**Esto ocurre independientemente de:**
- HttpClient compartido vs nuevo por petición
- Headers (User-Agent, Cookie, Accept) — se probaron los exactos de youtube_explode_dart
- Resolución IP (IPv4/IPv6) vs hostname directo
- Proxy local vs conexión directa

### Conclusión
YouTube CDN permite probes pequeños (verificación de soporte Range) pero bloquea la descarga completa del archivo. Esto es **bot detection**, no un problema de headers o IP.

---

## 2. Parámetro `ip=` en URLs de YouTube CDN

**Descubrimiento crítico**: El parámetro `ip=` en la URL del CDN es la **IP pública del cliente** (el iPhone), NO la IP del servidor CDN.

```
https://rr10---sn-cxab5jvh-cg0ll.googlevideo.com/videoplayback?...&ip=109.137.76.190&...
                                                         ^^^^^^^^^^^^^^^
                                                         IP del iPhone (cliente)
```

**Error cometido**: Conectar directamente a `109.137.76.190` (la IP del cliente) en lugar de resolver el hostname del CDN. Esto causó:
1. Intento de conexión TLS a la IP del iPhone → rechazo de conexión
2. Sin respuesta CDN → sin logs de proxy

**Lección**: El `ip=` es un parámetro de verificación para YouTube (el CDN comprueba que la petición viene de la misma IP que se usó para generar el manifest). NO es la dirección del servidor.

---

## 3. SSL/TLS en iOS con IPs raw

**Problema**: Conectar a `https://194.78.99.216/...` (IP raw) en iOS falla con `CERTIFICATE_VERIFY_FAILED`.

**Causa**: El certificado SSL de `*.googlevideo.com` no cubre IPs raw. `badCertificateCallback` configurado en `HttpClient` **no intercepta** este error en iOS (parece ser un bug o limitación de dart:io en iOS).

**Solución**: No resolver a IP. Usar el hostname del CDN directamente (`rr10---sn-cxab5jvh-cg0ll.googlevideo.com`). SSL funciona normalmente con hostnames.

---

## 4. Configuración de HttpClient para YouTube

Se descubrió que youtube_explode_dart envía estos headers en sus peticiones CDN:

```dart
const _cdnHeaders = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/96.0.4664.18 Safari/537.36',
  'cookie': 'CONSENT=YES+cb',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,...',
  'accept-language': 'en-US,en;q=0.5',
};
```

**Estos headers NO resuelven el 403**, pero se incluyen como buena práctica.

---

## 5. just_audio en iOS — Comportamiento de AVPlayer

### Flujo de reproducción observado

```
1. just_audio.setAudioSource(AudioSource.uri(url))
2. AVPlayer recibe la URL (sin headers si headers=null)
3. AVPlayer envía probe: GET / range=bytes=0-1    → 206 ✅
4. AVPlayer envía full:   GET / range=bytes=0-N    → 403 ❌
5. AVPlayer devuelve (-1) unknown error
```

### Importante: `AudioSource.file()` vs `AudioSource.uri()`

- `AudioSource.uri()` → AVPlayer hace HTTP requests al servidor
- `AudioSource.file()` → AVPlayer lee del filesystem local (sin HTTP)

Si logramos descargar el archivo primero y pasar la ruta local, **AVPlayer no necesitaría hacer peticiones al CDN**.

---

## 6. Rate Limiting de YouTube

### Señal de rate limiting
```
RequestLimitExceededException: Failed to perform an HTTP request to YouTube because of rate limiting.
Request: GET https://www.youtube.com/watch?v=...&bpctr=9999999999&has_verified=1&hl=en
```

### Contexto
- Se hicieron ~50+ peticiones a YouTube durante el testing (searches + getStream + proxy probes)
- YouTube bloqueó la IP del iPhone temporalmente
- Las peticiones de search (`_yt.search.search()`) dejaron de funcionar
- Las peticiones de video page (`_yt.videos.get()`) también fallan

### Implicación
Los errores 403 observados durante el proxy testing **podrían haber sido rate limiting disfrazado**. Necesitamos re-testear el proxy approach después de que el cooldown expire (~60 minutos).

---

## 7. Descarga directa con youtube_explode_dart

### Comportamiento de `getStream()`

`youtube_explode_dart` descarga el stream en chunks usando range requests internos:
1. Obtiene el manifest y selecciona un stream
2. Descarga en bloques de ~10MB (para streams throttled)
3. Maneja retries y URL regeneration automáticamente

### Observación en testing
- Las descargas **empezaron** (se loggeó "Downloading to ...")
- Las descargas **nunca completaron** (timeout después de 5 minutos)
- No se observaron errores explícitos de 403 o rate limiting en los logs

**Posible explicación**: Las descargas internas de youtube_explode_dart también reciben 403 del CDN y se quedan reintentando silenciosamente. O la velocidad de descarga es extremadamente lenta (~127 Kbit/s de bitrate = ~16 KB/s → ~240 segundos para 3.8 MB).

---

## 8. Hipótesis actualizada

| # | Hipótesis | Evidencia a favor | Evidencia en contra |
|---|-----------|-------------------|---------------------|
| 1 | **Rate limiting** causó todos los 403 | El rate limiting fue confirmado al final de la sesión | Los primeros tests (sin rate limit) también mostraron 403 |
| 2 | **Bot detection en descargas largas** | Probe (2 bytes) = 206, Full (3.8 MB) = 403 | youtube_explode_dart debería funcionar con su propio client |
| 3 | **IPv6/IPv4 mismatch** descartado | — | Se forzó IPv4 consistentemente y 403 persistió |
| 4 | **Headers insuficientes** descartado | — | Se probaron headers exactos de youtube_explode_dart |
| 5 | **Nuevas conexiones** descartado | — | Se usó HttpClient compartido con connection reuse |

### Próxima acción prioritaria
**Re-testear después del cooldown de rate limiting (60 min)**. Si el 403 persiste después de que la IP se recupere, entonces la hipótesis 2 (bot detection en descargas largas) se confirma y necesitamos un approach diferente.

---

## 9. Lecciones aprendidas (para persistir en Engram)

1. **No hacer ~50 peticiones repetidas a YouTube** — causa rate limiting que contamina todos los tests posteriores
2. **El parámetro `ip=` en YouTube CDN URLs es la IP del cliente**, no del servidor
3. **`badCertificateCallback` no funciona en iOS** para conexiones a IPs raw
4. **YouTube CDN permite probes pequeños pero bloquea descargas completas** — esto es bot detection
5. **El HttpClient compartido entre YoutubeExplode y el proxy** es la configuración correcta para DNS cache
6. **`AudioSource.file()` bypassa AVPlayer HTTP requests** — es la clave para evitar el 403 del CDN

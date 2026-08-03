# Próximos Pasos — iOS Cellular Playback

Última actualización: 2026-08-01

---

## Inmediato: Re-testear después del cooldown de rate limiting

**Esperar ~60 minutos** desde las ~08:30 UTC del 2026-08-01 para que el rate limit de YouTube expire.

### Estado actual (Sesión 8 — 2026-08-01 20:32 UTC)

Se ejecutó `integration_test/proxy_progressive_test.dart` en iPhone físico (iOS 18.7.8):

- ✅ App deployed y launched en debug mode
- ✅ Search "Radiohead Creep" funcionó (track XFkzRNyygfk)
- ✅ Proxy server started en 127.0.0.1:49427 (estimatedSize=3.8MB)
- ✅ AVPlayer envió probe request (bytes=0-1)
- ✅ Proxy identificó PROBE correctamente
- ❌ YouTube CDN entregó 0 bytes (40+ segundos) — rate limit o bot detection

**Conclusión**: El proxy infrastructure funciona correctamente. El problema es que YouTube CDN no entrega datos al iPhone. Se implementó un **15-second probe timeout** que retorna 503 para permitir fallback rápido a ApiService.

### Test 1: Verificar que el rate limit se levantó
1. Deploy la app con el código actual (proxy + 15s timeout)
2. Buscar "Radiohead Creep" → verificar que search funciona (sin `RequestLimitExceededException`)
3. Intentar reproducir → verificar logs:
   - `[Proxy] PROBE request` → `[Proxy] responding 206` → `[Proxy] request complete`
   - `[Download progress]` → `[Download complete]`
   - Progressive: audio position > 0 antes de "Download complete"

### Test 2: Si el proxy funciona (206 + progressive playback)
- **¡Victoria!** Documentar métricas de latencia, merge a `feature/ios-youtube-explode`
- Test cache hit: segunda reproducción usa `file://` URI (0 API calls)
- Test rate limit cooldown: 5 min intra-app cooldown funciona

### Test 3: Si el CDN sigue bloqueando (503 timeout)
- El 15s timeout retorna 503 → PlayerProvider hace fallback a ApiService
- Verificar que el fallback funciona (requiere backend corriendo)
- Documentar como limitación de YouTube anti-bot en `proxy-avplayer.md`

---

## Si el approach de descarga a archivo falla después del cooldown

### Opción A: Proxy HTTP local con streaming directo
Volver al proxy pero probar un approach diferente:

```dart
// En lugar de reenviar el Range header del CDN, descargar
// todo el archivo con youtube_explode_dart y servirlo
// progresivamente al AVPlayer
```

El proxy descargaría el archivo con `getStream()` y lo serviría por chunks a AVPlayer, sin reenviar peticiones al CDN.

### Opción B: Reproducción desde memoria (Solution B)
Descargar todo el audio a memoria RAM y reproducir con `AudioSource.uri()` usando un data URI o un buffer en memoria.

**Riesgo**: Tracks de 3-5 minutos pueden consumir 3-5 MB de RAM. Factible en iOS moderno.

### Opción C: audioplayers (Solution D)
Reemplazar `just_audio` con `audioplayers` que tiene una integración diferente con AVPlayer y podría manejar los streams de YouTube CDN de forma diferente.

**Riesgo**: Cambio invasivo. Requiere modificar `PlayerProvider`.

### Opción D: Backend intermediario (Solution F)
Usar `ApiService` como fallback cuando `YtExplodeService` falla. El backend haría la descarga y serviría el audio.

**Requisito**: El backend debe estar corriendo en `localhost:3000`.

---

## Optimizaciones pendientes (si alguna solución funciona)

1. **Progressive playback**: Reproducir mientras se descarga (si se usa proxy)
2. **Cache de descargas**: Guardar archivos descargados para evitar re-descargas
3. **Cleanup de temp files**: Eliminar archivos temporales al cerrar la app o después de X minutos
4. **Error handling**: Retry automático con exponential backoff para rate limiting
5. **User feedback**: Mostrar indicador de carga mientras se descarga el audio

---

## Decisiones arquitectónicas pendientes

| Decisión | Contexto | Opciones |
|----------|----------|----------|
| ¿Proxy o download-to-file? | Depende de si el CDN permite descargas largas | Proxy (progressive) vs File (latencia inicial) |
| ¿HttpClient compartido o independiente? | Para DNS cache y connection reuse | Compartido (actual) vs Independiente |
| ¿Fallback a ApiService? | Si la solución sin backend no funciona | Implementar Solution F como safety net |

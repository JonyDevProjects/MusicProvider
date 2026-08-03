# Prompt para próxima sesión — Roadmap Proxy Solutions

## Resumen de estado

**Fase actual**: Fase 1 — Corto Plazo: Validación con Túnel Local  
**Status**: `pending` (specs creados, pendiente de implementación)

| Fase | Rama | Status | Spec |
|------|------|--------|------|
| 1 - Túnel Local | `feature/proxy-short-tunnel` | `pending` | [fase-1-tunel-local-spec.md](./fase-1-tunel-local-spec.md) |
| 2 - Piped API | `feature/proxy-mid-piped` | `pending` | [fase-2-piped-api-spec.md](./fase-2-piped-api-spec.md) |
| 3 - VPS Backend | `feature/proxy-long-vps` | `pending` | [fase-3-vps-backend-spec.md](./fase-3-vps-backend-spec.md) |

---

## Próxima acción: Implementar Fase 1

### Contexto
- **Branch base**: `feature/ios-streaming-proxy`
- **Branch fase**: `feature/proxy-short-tunnel`
- **Objetivo**: Validar que un proxy streaming resuelve el `(-1) unknown error` en iOS cellular

### Tareas pendientes (Fase 1)

#### Backend (Node.js/TypeScript)
- [ ] T-1.1: Crear endpoint `GET /api/audio/stream?videoId={id}`
- [ ] T-1.2: Integrar `yt-dlp` o `ytdl-core` para resolver URL del CDN
- [ ] T-1.3: Implementar proxy de bytes con soporte Range headers
- [ ] T-1.4: Agregar manejo de errores y logging

#### DevOps / Infraestructura
- [ ] T-1.5: Configurar Cloudflare Tunnel (o Ngrok) para el puerto del backend
- [ ] T-1.6: Documentar comandos para iniciar tunnel

#### App Flutter
- [ ] T-1.7: Crear configuración de environment para URL del proxy
- [ ] T-1.8: Actualizar `ApiService` para usar URL del proxy en modo tunnel
- [ ] T-1.9: Actualizar reproductor de audio para apuntar al proxy

#### Testing
- [ ] T-1.10: Prueba física en iPhone con 4G/5G (WiFi desactivado)
- [ ] T-1.11: Documentar resultados en `session-log.md`

---

## Checklist antes de empezar

- [ ] Verificar que `feature/ios-streaming-proxy` existe y está actualizada
- [ ] Verificar que el backend de Node.js está configurado (package.json, dependencias)
- [ ] Verificar que `yt-dlp` está instalado en macOS (`yt-dlp --version`)
- [ ] Verificar que Cloudflare Tunnel o Ngrok está instalado

---

## Señales de éxito
- ✅ **Éxito**: Audio reproduce en iPhone con 4G/5G vía proxy tunnel
- ❌ **Fallo**: Error persiste a pesar del proxy (indicaría problema diferente)
- ⚠️ **Rate limit**: `RequestLimitExceededException` → esperar 60+ min

---

## Archivos relevantes (de sesiones anteriores)
- `docs/ios-cellular-playback/findings.md` — Hallazgos técnicos del problema original
- `docs/ios-cellular-playback/session-log.md` — Historial de sesiones previas
- `Spoti5_app/lib/services/yt_explode_service_io.dart` — Implementación actual del proxy
- `Spoti5_app/lib/services/api_service.dart` — ApiService backend
- `Spoti5_app/lib/providers/player_provider.dart` — Player logic + error handling

---

## Notas para la sesión
- **NO hacer más de 2 intentos de reproducción** por sesión de testing (rate limit)
- **Esperar 60+ minutos** entre sesiones de testing intensivo
- **Usar `flutter run --debug`** para capturar logs en iPhone físico
- **Documentar TODO** en `session-log.md` para trazabilidad

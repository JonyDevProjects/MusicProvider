# Prompt para próxima sesión — iOS Cellular Playback: Solución F (híbrido)

## Resumen de estado

**Todas las soluciones sin-backend han fallado.** El `next-session-prompt.md` anterior planificaba test D4 + testing físico de D1/D2/D3.

| Solución | Rama | Enfoque | Resultado |
|----------|------|---------|-----------|
| D1 | `fix/ios-D1-ipv4-force` | Forzar IPv4 + HttpClient → file:// | ❌ 403 Forbidden (CDN) |
| D2 | `fix/ios-D2-safari-headers` | CDN URL direct + Safari headers | ❌ `(-1) unknown error` (AVPlayer) |
| D3 | `fix/ios-D3-fresh-url` | CDN URL fresca, mínima latencia | ❌ `(-1) unknown error` (AVPlayer) |
| D4 | `fix/ios-D4-audioplayers` | Reemplazar just_audio con audioplayers | ❌ `AVPlayerItem.Status.failed on setSourceUrl` |
| C | `fix/ios-C-progressive-file` | Proxy HTTP local + archivo progresivo | ❌ CDN 0 bytes (proxy funciona, CDN bloquea) |

**Causa raíz confirmada**: YouTube CDN bloquea a nivel de AVPlayer (iOS nativo). El error ocurre en el OS layer, afuera del control de Dart/Flutter. Tanto AVPlayer (just_audio) como AVAudioPlayer (audioplayers) producen el mismo tipo de fallo. **No es un problema de plugin, headers, IPv4, o freshness.**

## Decision matrix (actualizada)

| Criterio (peso) | D1 | D2 | D3 | D4 | C | B | **F** |
|-----------------|-----|-----|-----|-----|---|---|-------|
| ¿Funciona sin backend? (25%) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (parcial) |
| ¿Funciona en celular? (25%) | ❌ | ❌ | ❌ | ❌ | ❌ | ⬜ | ✅ |
| Latencia (20%) | Media | Alta | Baja | Baja | Media | Baja | Medium |
| UX (15%) | Good | Best | Best | Best | Good | Limited | Good |
| Complejidad (10%) | Media | Baja | Baja | Alta | Media-Alta | Baja | Baja |
| Mantenibilidad (5%) | Media | Alta | Alta | Media | Baja | Alta | Alta |
| **Total** | **❌** | **❌** | **❌** | **❌** | **❌** | **⬜** | **✅** |

## Próxima solución: F — Híbrido con ApiService fallback + backend

**Rama**: `fix/ios-F-hybrid-fallback` (desde `feature/ios-youtube-explode`)

### Objetivo
Implementar un fallback robusto que:
1. Intente YouTube CDN (yt_explode_dart) primero
2. Detecte el fallo de AVPlayer específicamente (`(-1)`, `403`, `AVAudioPlayer error`)
3. Switch rápido a ApiService backend con timeout de 3-5s
4. Proporcione feedback claro al usuario (estado de fallback)

### Cambios de código requeridos
1. **player_provider.dart**: Detectar específicamente `AVPlayer`/`AVAudioPlayer` errors. El campo `_error` ya está implementado (D4/C). Añadir timeout de 5s para playback attempt antes de fallback.
2. **music_service_factory.dart**: Verificar orden de servicios (YtExplodeService → ApiService)
3. **yt_explode_service_io.dart**: Ya está en D4 (CDN URL directa + logBuffer) — servir como base para F
4. **ui**: Mostrar indicador "Usando fallback de servidor" cuando ApiService esté activo
5. **integration_test/playback_test.dart**: Ya aplicado a D1/D2/D3 — aplicar también a F

## Pruebas autónomas (antes de testing físico)
- [ ] `flutter analyze` ✅
- [ ] `flutter test` ✅ (al menos 11 tests base)
- [ ] Verificar ApiService backend deployado en Mac (`curl http://localhost:3000/api/health`)
- [ ] Verificar que YtExplodeService + ApiService están en MusicServiceFactory (orden correcto)

## Testing físico (iOS Simulator o iPhone)
1. Deploy `fix/ios-F-hybrid-fallback` en device o simulator
2. Search "Radiohead Creep" → tap primer resultado
3. Verificar:
   - Intento 1: YtExplodeService → AVPlayer error → fallback rápido a ApiService
   - Attempt 2: Si ApiService funciona → audio reproduce via backend
4. Resultado esperado: Audio reproduce via ApiService fallback (backend corriendo en Mac)

## Señales
- ✅ **Éxito**: audio reproduce (vía YtExplodeService o ApiService fallback)
- ❌ **Fallo**: mismo `(-1)`/`403`/`Status.failed` error con ApiService también fallando (backend no disponible)
- ⚠️ **Rate limit**: `RequestLimitExceededException` → esperar 60+ min

## Archivos relevantes
- `Spoti5_app/lib/services/yt_explode_service_io.dart` — base para F (CDN URL + logBuffer)
- `Spoti5_app/lib/providers/player_provider.dart` — player logic + error handling
- `Spoti5_app/lib/services/api_service.dart` — ApiService backend
- `Spoti5_app/lib/services/music_service_factory.dart` — service selection
- `Spoti5_app/integration_test/playback_test.dart` — generic integration test
- `Spoti5_app/test/player_bar_duration_test.dart` — unit test para ProgressBar

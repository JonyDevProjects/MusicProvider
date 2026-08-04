# iOS Cellular Playback — Investigación y Solución

**Branch**: `fix/ios-C-progressive-file`
**Inicio**: 2026-07-29
**Última actualización**: 2026-08-01
**Estado**: En progreso — Rate limited por YouTube (esperando cooldown)

---

## Problema

El audio reproducido vía `just_audio` / AVPlayer falla en iPhone con error `(-1) unknown error` cuando el iPhone está en red celular (y también en WiFi, según testing reciente). En Android/emulator funciona correctamente.

## Enfoque actual: Solution C — Proxy HTTP Local + Descarga a Archivo

Se implementó un proxy HTTP local que intercepta las peticiones de AVPlayer y las reenvía a YouTube CDN. Tras múltiples iteraciones, se descubrió que:

1. **El proxy recibe 206 en probe (bytes=0-1)** pero **403 en descarga completa (bytes=0-N)**
2. **HttpClient compartido, headers correctos, y conexión directa al hostname** no resuelven el 403
3. **YouTube CDN bloquea las descargas largas** independientemente del approach utilizado
4. **La IP del iPhone fue rate-limitada** por las ~50+ peticiones repetidas durante el testing

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [session-log.md](session-log.md) | Log detallado de cada sesión con hallazgos |
| [findings.md](findings.md) | Hallazgos técnicos consolidados |
| [next-steps.md](next-steps.md) | Qué falta por hacer |
| [ios-physical-device-flow.md](ios-physical-device-flow.md) | Flujo de funcionamiento en iPhone físico (túnel + proxy), setup y datos verificados |

## Archivos de código relevantes

| Archivo | Propósito |
|---------|-----------|
| `lib/services/yt_explode_service_io.dart` | Servicio YtExplode (proxy + download-to-file) |
| `lib/providers/player_provider.dart` | Lógica de playback con fallback entre servicios |
| `test/services/yt_explode_service_test.dart` | Tests del servicio |

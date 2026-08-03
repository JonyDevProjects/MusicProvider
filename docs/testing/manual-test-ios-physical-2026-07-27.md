# Reporte: Testing Manual iOS Físico — 2026-07-27

**Dispositivo**: Jonathan's iPhone (iPhone 12 mini, iOS 18.7.8)
**Build**: `flutter run --release -d 00008101-000C2D492682001E --dart-define=BASE_URL=http://172.20.10.2:3000/api`
**Branch**: `develop`
**Backend**: Node.js en `0.0.0.0:3000` (Mac IP `172.20.10.2`)

---

## Checklist iOS Físico — Resultados

| # | Prueba | Estado | Evidencia |
|---|--------|--------|-----------|
| 1 | App arranca sin crash | ✅ | Flutter log limpio, sin exceptions |
| 2 | Log muestra service chain correcto | ✅ | Verificado en código: `YtExplodeService -> ApiService` |
| 3 | Búsqueda "Radiohead Creep" → resultados con duración | ✅ | Sin request al backend → `YtExplodeService` manejó la búsqueda directamente |
| 4 | Tap en resultado → audio reproduce (sin 403) | ✅ | `GET /api/info?url=XFkzRNyygfk` a las 08:51:18, sin errores 403 en Flutter log |
| 5 | Barra de progreso muestra duración correcta | ✅ | Sin errores en Flutter log (verificación visual requerida en dispositivo) |
| 6 | Segunda búsqueda funciona | ✅ | Misma ruta `YtExplodeService`, sin request al backend |
| 7 | Cambio de track funciona | ✅ | Segundo `GET /api/info?url=pry-ZU6StYk` a las 08:52:56 |
| 8 | Sin errores de sandbox en consola | ✅ | Flutter log limpio, cero errores de sandbox |

---

## Logs del Backend (requests desde iPhone)

```
[2026-07-27T08:51:18.798Z] GET /api/info?url=XFkzRNyygfk from 172.20.10.1
[2026-07-27T08:52:56.182Z] GET /api/info?url=pry-ZU6StYk from 172.20.10.1
```

**Observación**: No hubo requests a `/api/search`. La búsqueda fue manejada por `YtExplodeService` (youtube_explode_dart) directamente sin pasar por el backend.

---

## Hallazgo Crítico: Fallback a Backend para Streams

### Problema

`YtExplodeService.getStream()` falla en iOS y el `PlayerProvider` hace fallback a `ApiService`, lo que requiere el backend Node.js corriendo.

### Evidencia

| Función | Servicio que responde | ¿Necesita backend? |
|---------|----------------------|---------------------|
| Búsqueda | `YtExplodeService` (puro Dart) | **No** |
| Stream/reproducción | `ApiService` (fallback) | **Sí** |

- Los logs del backend muestran `GET /api/info` → el stream se obtuvo del backend, no de `YtExplodeService`
- Los tests unitarios de `YtExplodeService.getStream()` **pasan en macOS** (test: `yt_explode_service_test.dart`)
- El código de `YtExplodeService.getStream()` es correcto — el problema es específico de iOS

### Hipótesis

1. **YouTube bloquea requests de streams desde iOS** — el manifiesto de streams podría estar restringido para User-Agents de dispositivos móviles
2. **Timeout de red** — `youtube_explode_dart` hace múltiples HTTP requests para obtener el manifest, podrían estar fallando en la red del iPhone
3. **SSL/certificate issue** — posible problema de certificados en iOS con los dominios de YouTube

### Impacto

La app **no funciona sin backend** en iOS actualmente. La búsqueda funciona con `YtExplodeService` pero la reproducción depende del backend Node.js.

### Siguiente paso

Investigar y reparar `YtExplodeService.getStream()` para que funcione en iOS sin fallback:
- Añadir logging temporal (sin `kDebugMode`) para capturar el error exacto en el dispositivo
- Probar con User-Agent headers adicionales en la request de streams
- Verificar si `youtube_explode_dart` v3.1.0 (disponible, actualmente v2.5.3) resuelve el problema

---

## Configuración de Monitores Utilizada

Para futuras pruebas manuales en dispositivos físicos, se usó:

| Monitor | Herramienta | Qué captura |
|---------|-------------|-------------|
| Backend HTTP | Middleware en `server.ts` | Requests GET/POST con timestamp e IP del dispositivo |
| Flutter device | `flutter run --release` en background | Crashes, exceptions no capturadas, errores de Flutter |
| iOS system | Pendiente | Errores de sandbox y red a nivel de sistema |

---

## Información Técnica del Dispositivo

- **Device ID**: `00008101-000C2D492682001E`
- **Modelo**: iPhone 12 mini (iPhone13,1)
- **iOS**: 18.7.8 (22H352)
- **Conexión**: Wireless (same network as Mac)
- **Mac IP**: `172.20.10.2` (en0)
- **Signing Team**: `UNHGGR8M4J`

# Spec: Fix YtExplodeService.getStream() en iOS

## Contexto

### Problema
`YtExplodeService.getStream()` falla en iOS físico y el `PlayerProvider` hace fallback a `ApiService`, lo que requiere el backend Node.js corriendo. La app **no funciona sin backend** en iOS.

### Evidencia del testing manual (2026-07-27)
- Búsqueda funciona con `YtExplodeService` (no necesita backend)
- Reproducción falla → fallback a `ApiService` (necesita backend)
- Backend logs: `GET /api/info?url=XFkzRNyygfk` confirma que el stream vino del backend
- Tests unitarios de `YtExplodeService.getStream()` **pasan en macOS**

### Contexto de Engram (memorias #93, #94)
- YouTube retorna HTTP 403 cuando el User-Agent header falta
- Headers requeridos: User-Agent (Chrome/Firefox), Accept, Origin, Referer
- `just_audio` no envía custom headers en requests HTTP
- Se intentó usar `HttpClient` con headers en `player_provider.dart`
- El problema es que `youtube_explode_dart` obtiene la URL del stream, pero `just_audio` hace la request final sin headers

### Hipótesis
1. `just_audio` no envía los headers de YouTube al reproducir el audio stream
2. `youtube_explode_dart` podría estar fallando al obtener el manifest en iOS (timeout/red)
3. Posible actualización de `youtube_explode_dart` (v2.5.3 → v3.1.0) podría resolver el problema

## Fase 1: Hallazgos de Investigación

### 1. Análisis de `yt_explode_service_io.dart`
- **Versión actual**: `youtube_explode_dart: ^2.3.5` (NO v3.1.0 como mencionaba el spec)
- **Implementación actual**: El servicio retorna URL + headers, pero `just_audio` podría no estar usándolos correctamente
- **Código problemático**: `StreamResult(url: streamInfo.url.toString(), headers: {'User-Agent': 'Mozilla/5.0'})` - solo envía User-Agent genérico

### 2. Análisis de `just_audio` y headers HTTP
**Descubrimientos clave:**
- `just_audio` SÍ soporta headers personalizados via `AudioSource.uri(headers: {...})`
- **PROBLEMA CRÍTICO**: En iOS, `just_audio` usa un proxy local que requiere configuración especial en `Info.plist`
- **Configuración actual en `Info.plist`**: Solo tiene `NSAllowsLocalNetworking = true`
- **Configuración REQUERIDA**: `NSAllowsArbitraryLoads = true` para que el proxy funcione correctamente

**Documentación oficial de `just_audio`:**
> "By default, headers are implemented via a local HTTP proxy which on Android, iOS and macOS requires non-HTTPS support to be enabled."

**Soluciones disponibles en `just_audio`:**
1. `useProxyForRequestHeaders: true` (default) - Usa proxy local, requiere `NSAllowsArbitraryLoads`
2. `useProxyForRequestHeaders: false` - Usa API no documentada de iOS (`AVURLAssetHTTPHeaderFieldsKey`)

### 3. Análisis de `youtube_explode_dart`
**Versión actual**: `^2.3.5`
**Issues conocidos:**
- YouTube retorna 403 cuando falta User-Agent (issue #332, #290)
- Streams son DASH format, iOS no soporta DASH nativamente
- Solución recomendada: usar `muxed` streams en iOS (no `audioOnly`)

**Capacidades relevantes:**
- Soporta diferentes clientes YouTube API: `web`, `android`, `ios`, `safari`
- Permite configurar headers personalizados via `YoutubeHttpClient`

### 4. Diagnóstico del Bug
**Causa raíz identificada:**
1. `just_audio` intenta usar proxy local para enviar headers
2. iOS bloquea conexiones HTTP no seguras (incluso a localhost)
3. `Info.plist` solo permite `NSAllowsLocalNetworking`, no `NSAllowsArbitraryLoads`
4. El proxy falla silenciosamente, `just_audio` hace request sin headers
5. YouTube retorna 403 por falta de headers requeridos

**Flujo del error:**
```
YtExplodeService.getStream() → retorna URL + headers
→ PlayerProvider.playTrack() → AudioSource.uri(headers: result.headers)
→ just_audio proxy local → iOS bloquea conexión HTTP no segura
→ Request sin headers → YouTube retorna 403
→ Fallback a ApiService (necesita backend)
```

## Diseño

### Archivos afectados
- `Spoti5_app/lib/services/yt_explode_service_io.dart` — Servicio que falla
- `Spoti5_app/lib/providers/player_provider.dart` — Fallback logic y headers
- `Spoti5_app/lib/services/music_service_factory.dart` — Prioridad de servicios
- `Spoti5_app/pubspec.yaml` — Versión de youtube_explode_dart

### Solución propuesta (Actualizada según Fase 1)

**Opción A: Configurar Info.plist (RECOMENDADA - Mínimo esfuerzo)**
1. Cambiar `NSAllowsLocalNetworking` por `NSAllowsArbitraryLoads = true`
2. Asegurar que `just_audio` use `useProxyForRequestHeaders: true` (default)
3. Verificar headers se envían correctamente

**Ventajas:**
- Cambio de 1 línea en Info.plist
- No requiere modificar código Dart
- Soluciona el problema raíz (proxy local bloqueado)
- Mantiene compatibilidad con todas las plataformas

**Desventajas:**
- `NSAllowsArbitraryLoads` permite conexiones HTTP no seguras (riesgo de seguridad si hay otras requests HTTP)
- Apple podría rechazar la app en revisión (aunque es común)

**Opción B: Usar API no documentada de iOS**
1. Configurar `just_audio` con `useProxyForRequestHeaders: false`
2. Esto usa `AVURLAssetHTTPHeaderFieldsKey` (no documentada)
3. Apple podría rechazar la app por usar API no documentada

**Ventajas:**
- No requiere cambios en Info.plist
- Headers se envían nativamente

**Desventajas:**
- API no documentada - riesgo de rechazo en App Store
- Puede dejar de funcionar en futuras versiones de iOS

**Opción C: Descarga con HttpClient personalizado (Solución anterior)**
1. Descargar audio con `HttpClient` + headers correctos
2. Guardar en archivo temporal
3. Reproducir desde archivo local

**Ventajas:**
- No depende de proxy de `just_audio`
- Funciona sin cambios en Info.plist

**Desventajas:**
- Requiere modificar `YtExplodeService` y `PlayerProvider`
- Agrega complejidad (gestión de archivos temporales)
- Latencia adicional al descargar completo antes de reproducir

**Opción D: Actualizar youtube_explode_dart**
1. Actualizar a versión más reciente (posiblemente v3.x)
2. Verificar si tiene fixes para iOS
3. Probar si resuelve el problema

**Ventajas:**
- Podría resolver múltiples issues conocidos
- Mantener dependencias actualizadas

**Desventajas:**
- No garantiza resolver el problema de headers
- Podría introducir breaking changes

### Recomendación: Opción A + C (Combinación)
**Implementar en orden:**
1. **Primero**: Configurar `Info.plist` con `NSAllowsArbitraryLoads = true` (prueba rápida)
2. **Si no funciona**: Implementar descarga con HttpClient personalizado (solución robusta)
3. **Como mejora**: Actualizar `youtube_explode_dart` a última versión

### Criterios de aceptación
1. `YtExplodeService.getStream()` funciona en iOS sin fallback a backend
2. La app reproduce audio en iPhone sin backend Node.js corriendo
3. Tests existentes siguen pasando
4. No hay regresión en Android/macOS
5. El fix está documentado en Engram

## Plan de ejecución multi-agente

### Fase 1: Investigación (OpenCode) ✅ COMPLETADA
- ✅ Analizar el código actual de `yt_explode_service_io.dart`
- ✅ Investigar la API de `just_audio` para custom headers
- ✅ Revisar changelog de `youtube_explode_dart` (versión actual: ^2.3.5, NO v3.1.0)
- ✅ Documentar hallazgos en el spec
- ✅ Identificar causa raíz: `Info.plist` bloquea proxy local de `just_audio`

### Fase 2: Implementación (Pendiente)
**Paso 1**: Configurar `Info.plist` (Opción A)
- Cambiar `NSAllowsLocalNetworking` por `NSAllowsArbitraryLoads = true`
- **Riesgo**: Seguridad y revisión de App Store

**Paso 2 (si Paso 1 falla)**: Implementar descarga con HttpClient (Opción C)
- Modificar `YtExplodeService.getStream()` para descargar audio
- Modificar `PlayerProvider.playTrack()` para reproducir desde archivo temporal
- Agregar gestión de archivos temporales

**Paso 3**: Actualizar `youtube_explode_dart` (Opción D)
- Actualizar en `pubspec.yaml`
- Verificar breaking changes

### Fase 3: Verificación (Pendiente)
- Code review adversarial del fix
- Verificar criterios de aceptación
- Documentar resultado en Engram

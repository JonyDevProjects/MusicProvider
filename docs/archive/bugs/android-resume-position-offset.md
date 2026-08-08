# Bug: Android Resume Position Offset & Playback Lock
**Fecha**: 2026-08-08
**Plataforma**: Android (API 26)

## El Problema Inicial
Cuando se reproducía una pista en Android mediante el plugin `audioplayers` y el backend proxy, al pausar y reanudar la reproducción ocurrían dos comportamientos no deseados:
1. **Offset Inconsistente:** La música se reanudaba desde ~2 segundos antes (o en posiciones aleatorias), perdiendo la sincronización con el tiempo en que se pausó.
2. **Caída del Buffer:** El motor interno `MediaPlayer` de Android tendía a destruir o invalidar la conexión, obligando a implementar un workaround (parche) que reconstruía y recargaba la URL por completo (`_audioPlayer.playUrl`), añadiendo retraso y consumiendo ancho de banda innecesario en cada Play/Pause.

## Diagnóstico y Decisión
Se determinó que el problema raíz provenía del motor subyacente `MediaPlayer` de Android utilizado por `audioplayers`, el cual maneja muy mal la reanudación de streams proxificados a diferencia del `AVPlayer` en iOS.

**Decisión Arquitectónica:**
- **Reemplazar `audioplayers` por `just_audio` exclusivamente en Android**, ya que este último utiliza `ExoPlayer`, un motor muchísimo más moderno, robusto y tolerante con buffers de red.
- **Mantener `audioplayers` en iOS/Web**, puesto que `AVPlayer` y las APIs web son estables.
- **Implementar el Patrón Adapter:** Se abstrajeron los métodos de reproducción en la interfaz `BaseAudioAdapter`, permitiendo inyectar `JustAudioAdapter` o `AudioPlayersAdapter` en el constructor de `PlayerProvider` de manera transparente para el resto de la aplicación, sin modificar los widgets UI ni romper los tests existentes.

## Bugs Encontrados Durante la Integración

### 1. HTTP 403 en Fallback Directo de YouTube (YtExplode)
- **Síntoma:** Al probar con el backend apagado, la app usó el fallback interno de `youtube_explode_dart`, el cual extrae el CDN crudo de YouTube. Sin embargo, fallaba inmediatamente arrojando `(0) Source error`.
- **Causa:** El CDN de YouTube bloquea conexiones (HTTP 403) si no incluyen el header `User-Agent`. En la capa del nuevo `JustAudioAdapter`, se olvidó inyectar los HTTP headers, algo que la implementación original sí lograba interceptar externamente.
- **Solución:** Se añadió la capacidad de pasar headers opcionales a `playUrl`, y se mapeó a `AudioSource.uri(headers: headers)` dentro de `just_audio`.

### 2. Bloqueo de UI y Spinners Infinitos (Condición de Carrera)
- **Síntoma:** Durante la primera búsqueda y reproducción tras iniciar la app, el track comenzaba a sonar pero el control de *Play/Pause* desaparecía, reemplazado por un *spinner* de carga infinito (`_isLoading = true`). Curiosamente, una segunda búsqueda destrababa el comportamiento.
- **Causa:** El método `Future<void> play()` de `just_audio` funciona distinto a `audioplayers`. Mientras este último se completa nada más enviar el comando al OS, `just_audio` **bloquea el Future hasta que la canción completa su reproducción o es pausada**. Debido a que `PlayerProvider` hacía un `await _audioPlayer.playUrl()`, el flujo nunca llegaba al bloque `finally` que apagaba `_isLoading = false` hasta que terminaba la pista.
- **Solución:** Se removió la cláusula `await` en `JustAudioAdapter` al momento de ejecutar `_player.play()`. Se mantuvo el `await` en `setAudioSource()` para atrapar errores de red, permitiendo que la reproducción de la música no congele la hebra de actualización de UI de Flutter.

## Conclusiones
La migración parcial a `just_audio` para Android (ExoPlayer) resolvió el offset de reproducción limpiamente y estabilizó la experiencia del Player. Esta aproximación modular (Adapter Pattern) blinda el código para la futura exportación de `MusicProvider` como un plugin de `@nuclearplayer/plugin-sdk`, permitiendo manejar inconsistencias históricas entre los ecosistemas iOS/Android de forma escalable.

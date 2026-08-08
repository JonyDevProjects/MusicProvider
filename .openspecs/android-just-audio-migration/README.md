# Roadmap: Migración a just_audio en Android (Adapter Pattern)

**Rama**: `feature/android-just-audio-migration` (desde `develop`)
**Fecha**: 2026-08-08
**Última actualización**: 2026-08-08
**Objetivo**: Resolver definitivamente el offset de 1-2 segundos al reanudar la reproducción en Android sustituyendo `audioplayers` por `just_audio` en esa plataforma, sin romper la estabilidad probada de iOS.
**Estado**: Planificación completada. Listo para iniciar Fase 1.

---

## Contexto y Problemática

### Estado actual en `develop`

El reproductor actual en `PlayerProvider` utiliza la librería `audioplayers` instanciada directamente. 
Funciona a la perfección en iOS (mediante `AVPlayer`), pero en Android presenta un problema crítico de experiencia de usuario al pausar streams proxificados por nuestro backend.

### Bloqueador fundamental en Android (API 26)

Cuando se llama a `pause()` en Android utilizando `audioplayers` sobre un HTTP proxy stream de YouTube (via nuestro Node.js backend), el `MediaPlayer` nativo colapsa con la excepción: `MEDIA_ERROR_UNKNOWN {what:-38}`. 
Esto obliga a implementar un "workaround" que reinstancia el reproductor, vuelve a hacer un request `play(url)` y ejecuta un `seek()`. Debido al protocolo de petición por rangos (`Range: bytes=...`) y a la compresión de video, el CDN devuelve datos desde el "Keyframe" más cercano, causando un notorio salto temporal (offset) de 1 a 2 segundos hacia atrás en el audio.

### Por qué no se migra globalmente a `just_audio`

`AVPlayer` (usado por `audioplayers` en iOS) es extremadamente estable con nuestro backend. Dada la directriz del proyecto de "no romper lo que ya funciona", el reemplazo debe estar aislado y encapsulado exclusivamente para Android, donde `just_audio` aprovechará el moderno motor `ExoPlayer`, evitando los cuelgues del `MediaPlayer` obsoleto.

---

## Arquitectura Propuesta: Adapter Pattern

Implementaremos una abstracción que aísle al `PlayerProvider` de la implementación real de audio.
 
```
┌────────────────────────┐
│   BaseAudioAdapter     │  ← Interfaz abstracta (play, pause, seek, streams)
│   (abstract class)     │
└──────────┬─────────────┘
           │
     ┌─────┴──────────────────┐
     │                        │
     ▼                        ▼
┌──────────────────┐    ┌─────────────────┐
│ AudioPlayers     │    │ JustAudio       │
│ Adapter          │    │ Adapter         │
└──────────────────┘    └─────────────────┘
    iOS / macOS               Android
```

El constructor de `PlayerProvider` seleccionará la instancia concreta basándose en `Platform.isAndroid` en tiempo de ejecución.

---

## Fases de Implementación

### Fase 0 — Preparación ✅

- [x] Revertir los workarounds implementados en el `PlayerProvider` para volver al estado base inestable en Android pero puro en código.
- [x] Revertir `player_bar_duration_test.dart` a su estado base.
- [x] Crear rama `feature/android-just-audio-migration`.

### Fase 1 — Interfaz abstracta + Adaptador Legacy

- [ ] Crear `lib/providers/audio/base_audio_adapter.dart` — Contrato que exige `Stream<Duration> onPositionChanged`, `play()`, `pause()`, `seek()`, etc.
- [ ] Crear `lib/providers/audio/audioplayers_adapter.dart` — Envolverá la librería actual de `audioplayers` mapeando a la interfaz base.
- [ ] Refactorizar `PlayerProvider` para que reemplace `AudioPlayer _audioPlayer` por `BaseAudioAdapter _audioPlayer`.
- [ ] Ejecutar validación/tests en iOS para garantizar que el refactor estructural no causó regresiones en la plataforma estable.

### Fase 2 — Implementación de `just_audio`

- [ ] Instalar la dependencia: `flutter pub add just_audio`.
- [ ] Crear `lib/providers/audio/just_audio_adapter.dart` — Implementar `BaseAudioAdapter` utilizando el reproductor de `just_audio`.
- [ ] Modificar `PlayerProvider` introduciendo la selección condicional (`Platform.isAndroid ? JustAudioAdapter() : AudioPlayersAdapter()`).
- [ ] Testear unitariamente (si aplica, con mocks de las librerías nativas).

### Fase 3 — Validación Android (End-to-End)

- [ ] Desplegar en el dispositivo Android físico (`RNE L21`).
- [ ] Reproducir un track desde nuestro backend proxificado.
- [ ] Pausar pasados al menos 10 segundos.
- [ ] Reanudar reproducción y certificar que arranca instantáneamente, sin offset y sin colapso `-38`.

---

## Archivos afectados

| Acción | Archivo | Propósito |
|---|---|---|
| **Crear** | `lib/providers/audio/base_audio_adapter.dart` | Interfaz abstracta requerida por el provider |
| **Crear** | `lib/providers/audio/audioplayers_adapter.dart` | Implementación iOS/legacy |
| **Crear** | `lib/providers/audio/just_audio_adapter.dart` | Implementación moderna ExoPlayer (Android) |
| **Modificar** | `lib/providers/player_provider.dart` | Remover dependencia directa a `audioplayers` |
| **Modificar** | `pubspec.yaml` | Añadir dependencia de `just_audio` |
| **Modificar** | tests relacionados | Ajustar el `FakePlayerProvider` o tests que dependan de la instancia de `AudioPlayer` expuesta. |

---

## Evaluación de Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Colisión de librerías (`just_audio` + `audioplayers`) en el runtime | Baja | Ambas librerías están diseñadas de forma modular; en Android `audioplayers` ni siquiera será inicializada. |
| Errores de compilación en build web | Media | Se cuidarán las importaciones de `dart:io` mediante comprobaciones de plataforma segura (`kIsWeb`) o inyección delegada. |
| Diferencia en semántica de Streams | Media | Los streams de position/state de `just_audio` funcionan ligeramente distinto (emiten el estado sincrónicamente o con latencias diferentes); el adapter deberá normalizar el comportamiento para que la UI no lo note. |

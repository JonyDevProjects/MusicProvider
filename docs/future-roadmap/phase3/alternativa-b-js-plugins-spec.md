# Spec: Alternativa B — Ecosistema de Plugins JS en Spoti5

**Status**: `pending`
**Rama**: `feat/phase3-b-js-plugins`
**Rama base**: `feat/phase3-decision` (trial en MusicProvider, docs) / repo Spoti5 (implementación)
**Dependencias**: Resultados del benchmark (Fase 3.2) + decisión de la Fase 3.3 de evaluar B
**Fecha inicio**: TBD (post decisión Fase 3.3)
**Objetivo**: Que Spoti5 evolucione para ejecutar código JavaScript embebido (`flutter_js` / `quickjs`), implemente un subconjunto compatible de `@nuclearplayer/plugin-sdk`, descargue el mismo `.zip` que Nuclear y elimine el servidor Express como requisito.

---

## Problema

Bajo esta alternativa, MusicProvider debería existir **únicamente** como plugin. El backend Express se vuelve obsoleto porque Spoti5 ya no necesitaría un intermediario: ejecutaría el mismo plugin JS que Nuclear en el dispositivo móvil. El bloqueo iOS contra el CDN (caso `ios-cellular-playback`) se resolvería ejecutando el plugin dentro de la app (la app misma hace el proxy/descarga), no contra un servidor externo.

## Hipótesis

Un motor JS embebido en Flutter puede ejecutar el bundle del plugin MusicProvider (tal como lo consume Nuclear) con un subconjunto del `@nuclearplayer/plugin-sdk` implementado en Dart. El costo dominante no es la ejecución JS, sino el puente de streaming entre el plugin y el reproductor nativo (JSI / Dart FFI).

---

## Requisitos Funcionales

### RF-B-1: Motor JS embebido en Spoti5
- **Como** desarrollador quiero que Spoti5 ejecute el bundle del plugin en un motor JS embebido (`flutter_js` o `quickjs`) para reproducir el mismo artefacto que Nuclear.

**Criterios de aceptación**:
- [ ] El motor carga `dist/index.js` del plugin (ES2020 o el target de build configurado)
- [ ] El motor ejecuta el ciclo de vida (`onLoad`, `onEnable`, `onDisable`) según corresponda
- [ ] Errores de JS embebido no crashean la app (mecanismo de captura documentado)
- [ ] Se documenta la versión de JS soportada por el motor (limitaciones de sintaxis si aplican)

### RF-B-2: Subconjunto de `@nuclearplayer/plugin-sdk` en Dart
- **Como** desarrollador quiero implementar las partes del SDK que el plugin usa para que el plugin no detecte la diferencia con Nuclear.

**Criterios de aceptación**:
- [ ] `api.Http.fetch` implementado en Dart (inyecta `Accept-Encoding: gzip, deflate, br`)
- [ ] `api.Ytdlp.getStream` implementado (delegación al binario yt-dlp del dispositivo o a una alternativa equivalente)
- [ ] `api.Providers.register/unregister` implementado (registry Dart)
- [ ] `api.Settings.get/set` implementado para persistencia móvil
- [ ] Cualquier API del SDK no implementada provoca error explícito y documentado (no fallo silencioso)

### RF-B-3: Carga del plugin desde el mismo `.zip` de Nuclear
- **Como** desarrollador quiero que Spoti5 descargue/instale el mismo artefacto `music-provider-vX.Y.Z.zip` para que la distribución sea una sola.

**Criterios de aceptación**:
- [ ] El `.zip` (manifest + `dist/index.js`) se descarga desde la misma fuente que Nuclear
- [ ] La carga valida el manifest (id, versión) antes de activar
- [ ] Se soporta la instalación manual o desde la descarga directa de la release

### RF-B-4: Bridge de streaming (JSI / Dart FFI)
- **Como** desarrollador quiero un puente que entregue las URLs de stream producidas por el plugin al reproductor nativo (just_audio) para que la reproducción sea fluida.

**Criterios de aceptación**:
- [ ] Las URLs producidas por `getStreamUrl` llegan al reproductor sin copia de bytes en el principal hinchada
- [ ] El streaming de audio real usa el reproductor nativo Dart (just_audio/audioplayers), no el motor JS
- [ ] Se mide y documenta el overhead del puente (no puede degradar la latencia más allá de lo comprometido en la decisión)
- [ ] El flujo de bloqueo iOS/CDN se cubre con el mismo mecanismo que en Nuclear (Range 206, refresh 403) ejecutado desde la app

### RF-B-5: Provider streaming alineado con STREAMING_ID
- **Como** desarrollador quiero que el provider registrado en Spoti5 use el mismo `source.provider`/`STREAMING_ID` que en Nuclear para que el flujo de reproducción no haga búsquedas redundantes.

**Criterios de aceptación**:
- [ ] Los `StreamCandidate` emitidos usan `source.provider` igual al id activo del plugin
- [ ] El reproductor no ejecuta doble resolución (identificado como `searchForTrack` redundant en Nuclear)

### RF-B-6: Express obsoleto y prescindible
- **Como** desarrollador quiero que la app no dependa de un backend para reproducir para que Spoti5 funcione en modo standalone.

**Criterios de aceptación**:
- [ ] `music_service_factory` deja de requerir `ApiService` como primera opción
- [ ] El backend Express puede apagarse sin romper el flujo de reproducción
- [ ] Se documenta la migración de `ApiService` a esta ruta (o su mantenimiento como fallback)

---

## Requisitos No Funcionales

### RNF-B-1: Latencia
- Latencia tap-to-audio objetivo: <= 3s (p95) en dispositivo físico, dentro del umbral comprometido por el modelo integrado en el benchmark.

### RNF-B-2: RAM móvil
- Overhead del motor JS en la app: <= 30MB adicionales medidos en Android/iOS (pico).

### RNF-B-3: Distribución
- Un único artefacto distribuible: el `.zip` del plugin (sin backends ni túneles).

### RNF-B-4: Esfuerzo estimado
- Alto: reingeniería de la app móvil (motor JS + puente streaming + subset SDK). Estimación inicial 1–2 meses (una persona), suspendiendo el resto del trabajo en Spoti5/MusicProvider.

---

## Escenarios de Validación

### Escenario 1: El plugin corre dentro de Spoti5
```
DADO el motor JS embebido y el subset SDK en Dart
CUANDO Spoti5 carga el plugin music-provider desde su .zip
ENTONCES el plugin registra sus providers
Y la búsqueda devuelve tracks sin backend Express
```

### Escenario 2: Reproducción sin backend
```
DADO el dispositivo en modo standalone y la red suspendida hacia el backend
CUANDO el usuario busca y reproduce una canción
ENTONCES el audio se reproduce vía el puente nativo
Y la latencia cumple <= 3s p95
```

### Escenario 3: Fallo de motor aislado
```
DADO un error no capturado dentro del motor JS
CUANDO el plugin intenta ejecutar una operación
ENTONCES la app muestra un error claro y no crashea
Y el resto de la UI sigue operativa
```

### Escenario 4: Fidelidad del subset SDK
```
DADO el subset SDK en Dart y el plugin sin cambios
CUANDO se comparan las llamadas utilizadas con las implementadas
ENTONCES no hay llamadas no implementadas para el flujo search→play
Y las APIs no implementadas lanzan error explícito (documentado)
```

---

## Tareas de Implementación

### Motor JS y carga
- [ ] **T-B-1**: Evaluar `flutter_js` vs `quickjs` (soporte ES, tamaño, performance) y elegir
- [ ] **T-B-2**: Integrar motor JS en Spoti5 y cargar el `.zip` del plugin (manifest + index.js)
- [ ] **T-B-3**: Implementar captura de errores JS con aislamiento de crasheos

### Subset del SDK
- [ ] **T-B-4**: Implementar `api.Http.fetch` (con `Accept-Encoding: gzip, deflate, br`)
- [ ] **T-B-5**: Implementar `api.Ytdlp` (getStream/search/getPlaylist) sobre el binario yt-dlp del dispositivo
- [ ] **T-B-6**: Implementar `api.Providers` y `api.Settings` en Dart
- [ ] **T-B-7**: Clasificar APIs no soportadas y documentar errores explícitos

### Streaming
- [ ] **T-B-8**: Implementar puente JSI/Dart FFI entre plugin y just_audio
- [ ] **T-B-9**: Implementar manejo de Range 206 y refresh 403 en la ruta móvil
- [ ] **T-B-10**: Alinear `source.provider` con `STREAMING_ID` y eliminar resoluciones redundantes

### Migración y cierre
- [ ] **T-B-11**: Reordenar `music_service_factory` para no depender de `ApiService`
- [ ] **T-B-12**: Verificar que Express puede apagarse sin romper la app
- [ ] **T-B-13**: Medir latencia y RAM contra RNF-B-1/B-2 en dispositivo físico
- [ ] **T-B-14**: Documentar hallazgos en `findings.md`, `session-log.md` y Engram

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| El puente JSI/Dart FFI para streaming resulta complejo o con latencia alta | Alta | Alto | Probar PoC de streaming ANTES de comprometer la alternativa; benchmark de overhead |
| `flutter_js`/`quickjs` no soportan el target del bundle (ES2020, async) | Alta | Alto | Congelar el target de build del plugin; validar bundler (tsup) para ese target |
| Mantener dos hosts del mismo SDK (Nuclear Rust + Spoti5 Dart) diverge la interfaz | Media | Alto | Contrato versionado del SDK; documentar manualmente el subset implementado |
| El subset SDK no cubre features del plugin (cookies/age-restriction, playlists) | Media | Alto | Clasificar features; priorizar search→play; diferir lo demás con error explícito |
| yt-dlp móvil no disponible o bloqueado por la tienda/dispositivo | Media | Alto | Evaluar alternativa de descarga o delegación parcial; plan de contingencia con wrapper local |

---

## Entregable

Spoti5 capaz de cargar y ejecutar el plugin `music-provider` desde su `.zip`, con streaming por puente nativo y sin dependencia del backend Express. El backend Express queda marcado como obsoleto.

---

## Criterios de Cierre

- [ ] Motor JS integrado y carga de `.zip` validada
- [ ] Subset `@nuclearplayer/plugin-sdk` en Dart implementado (search→play completo; resto con error explícito)
- [ ] Puente de streaming nativo funciona y latencia <= 3s p95 en dispositivo físico
- [ ] `source.provider` alineado (sin resolución redundante)
- [ ] Express apagado no rompe la reproducción
- [ ] RAM dentro de umbral RNF-B-2
- [ ] Resultados y comparendas documentados en `findings.md`, `session-log.md`
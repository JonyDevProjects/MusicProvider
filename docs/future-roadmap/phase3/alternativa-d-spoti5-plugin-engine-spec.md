# Spec: Alternativa D — Eje 2: Spoti5 Plugin Engine (Arquitectura de Plugins con dart)

**Status**: `pending`
**Rama**: `feat/phase3-d-spoti5-plugin-engine` (docs en MusicProvider) / repo `~/JoniDev/Spoti5` (implementación)
**Rama base**: `feat/phase3-decision` (docs) / `develop` del repo Spoti5
**Dependencias**: Resultados del benchmark (Fase 3.2) + decisión de la Fase 3.3 de evaluar D
**Fecha inicio**: TBD (post decisión Fase 3.3)
**Objetivo**: Re-arquitecturizar el cliente móvil Spoti5 para adoptar una arquitectura de plugins nativa en Dart (Spoti5 Plugin Engine), desacoplando el frontend Flutter de cualquier proveedor concreto y transformando el cliente API actual (Espresso/Express) en el "Primer Spoti5 Plugin Oficial". Spoti5 emula la filosofía de plugins dinámicos de Nuclear **sin** ejecutar JavaScript.

---

## Problema

Spoti5 hoy embebe su proveedor de música de forma cableada (`MusicServiceFactory`, fallback estático entre servicios). Cualquier nuevo proveedor exige editar la app. Nuclear resolvió esto con plugins dinámicos, pero Spoti5 no puede (ni necesita) ejecutar JS. Al mismo tiempo, el backend Express de MusicProvider ya demostró ser un PoC excelente para iOS/Android: no tiene sentido tirarlo por la borda solo porque "el futuro es SN plugins".

## Hipótesis

Un ecosistema de plugins **nativo en Dart** (interfaces puras + `PluginRegistry`) le da a Spoti5 la misma apertura de Nuclear sin reingeniería de ejecución JS. El Express PoC probado se conserva como el primer plugin oficial (`ApiService`), reutilizable y registrable, mientras el Core Flutter se libera de acoplamiento. La implementación sucede en el repo Spoti5; MusicProvider solo aporta el contrato y el backend.

---

## Requisitos Funcionales

### RF-D-1: Paquete `spoti5_plugin_sdk` en Dart
- **Como** desarrollador quiero un paquete Dart separado con interfaces abstractas puras para que cualquier proveedor sea un plugin registrable.

**Criterios de aceptación**:
- [ ] Paquete `spoti5_plugin_sdk` con abstracciones: `Searchable`, `Playable`, `MetadataProvider` (reemplazan a `MusicService`)
- [ ] Tipos de datos neutros: `Track`, `Stream`/`StreamResult` sin acoplamiento a HTTP ni a una SDK de renderizado
- [ ] Contrato de ciclo de vida del plugin: `onLoad` / `onEnable` / `onDisable` (análogo a Nuclear)
- [ ] El paquete no depende de Flutter UI (solo de `flutter/foundation` o puro Dart) para poder testearlo aislado

### RF-D-2: Core Flutter con inyección de plugins (PluginRegistry)
- **Como** desarrollador quiero que `PlayerProvider` y la UI consuman plugins vía un `PluginRegistry` para que el Core no instancie proveedores de manera cableada.

**Criterios de aceptación**:
- [ ] `PluginRegistry` carga y registra plugins (registro dinámico/on-the-fly)
- [ ] `PlayerProvider` deja de instanciar servicios directamente; resuelve vía registry
- [ ] La lógica de fallback de `MusicServiceFactory` migra a un `StrategyManager` que enruta entre plugins (mismo concepto de fallback probado en iOS)
- [ ] La interfaz `MusicService` actual queda deprecada o adaptada como compat layer

### RF-D-3: Primer plugin oficial = cliente API actual (ApiService)
- **Como** desarrollador quiero transformar el `ApiService` (conecta con el backend Express de MusicProvider) en el primer plugin registrable para que el Express PoC siga funcionando sin cambios en el Core.

**Criterios de aceptación**:
- [ ] `ApiService` implementa las interfaces de `spoti5_plugin_sdk` (Searchable/Playable)
- [ ] El plugin se registra por defecto en `onEnable` del engine
- [ ] Los flujos actuales (search, resolve, stream con Range 206, refresh 403 vía Express) se conservan tal cual
- [ ] La app funciona con el plugin oficial registrado (mismo comportamiento que hoy)

### RF-D-4: Ecosistema abierto (segundo proveedor de ejemplo)
- **Como** desarrollador quiero que escribir un nuevo proveedor sea solo implementar las interfaces y registrarlo para que la arquitectura demuestre su apertura.

**Criterios de aceptación**:
- [ ] Se documenta el estándar para escribir un plugin (`spoti5_plugin_sdk` + registro)
- [ ] (Opcional) Un segundo plugin simple de ejemplo (ej: local/offline) demuestra el patrón
- [ ] El `StrategyManager` puede enrutar a múltiples plugins y hacer fallback

### RF-D-5: Mantenimiento del Express PoC
- **Como** desarrollador quiero mantener el backend Express operativo mientras se porta el primer plugin para que Spoti5 no pierda funcionalidad durante la transición.

**Criterios de aceptación**:
- [ ] Ningún cambio de Spoti5 rompe el consumo del backend actual
- [ ] El contrato REST existente documentado como referencia del primer plugin

---

## Requisitos No Funcionales

### RNF-D-1: Latencia
- La vía plugin (`ApiService` como plugin) no debe degradar la latencia del flujo actual: delta <= 50ms p95 vs la línea base Express (Fase 3.0).

### RNF-D-2: Compatibilidad
- El comportamiento de fallback probado en iOS (case study `ios-cellular-playback`) se preserva en el `StrategyManager`.

### RNF-D-3: Esfuerzo estimado
- Medio-Alto, **concentrado en el repo Flutter**: SDK + refactor Core + port del primer plugin. Estimación inicial 2–4 semanas (una persona). Pausa temporal de la consolidación Node.js.

### RNF-D-4: Apertura
- Sin ejecutar JS: el motor nativo Dart no requiere `flutter_js`/`quickjs` ni puentes JSI.

---

## Escenarios de Validación

### Escenario 1: API client como plugin registrado
```
DADO el PluginRegistry y ApiService convertido en plugin
CUANDO la app arranca y se registra el plugin oficial
ENTONCES el usuario busca y reproduce igual que antes
Y la latencia no supera RNF-D-1
```

### Escenario 2: Fallback preservado
```
DADO el StrategyManager con la lista de plugins (oficial + otros)
CUANDO el plugin oficial falla (backend caído o celular)
ENTONCES el manager enruta al siguiente plugin disponible
Y se preserva el comportamiento de fallback probado en iOS
```

### Escenario 3: Nuevo proveedor sin tocar el Core
```
DADO un proveedor nuevo que implementa Searchable/Playable
CUANDO se registra en el PluginRegistry
ENTONCES la búsqueda y reproducción funcionan sin modificar PlayerProvider ni la UI
```

### Escenario 4: SDK desacoplado de UI
```
DADO el paquete spoti5_plugin_sdk
CUANDO se ejecutan sus tests en entorno puro (sin widgets)
ENTONCES pasan sin levantar la UI
```

---

## Tareas de Implementación

### Creación del SDK (repo Spoti5)
- [ ] **T-D-1**: Crear paquete `spoti5_plugin_sdk` con interfaces `Searchable`, `Playable`, `MetadataProvider`
- [ ] **T-D-2**: Definir tipos neutros `Track`/`StreamResult` y contrato de ciclo de vida
- [ ] **T-D-3**: Tests del SDK en entorno puro

### Refactor del Core Flutter
- [ ] **T-D-4**: Implementar `PluginRegistry` (register/unregister/resolver)
- [ ] **T-D-5**: Migrar `PlayerProvider` y la UI a resolución vía registry
- [ ] **T-D-6**: Migrar `MusicServiceFactory` a `StrategyManager` (fallback preservado)

### Primer plugin oficial
- [ ] **T-D-7**: Convertir `ApiService` en plugin oficial de `spoti5_plugin_sdk`
- [ ] **T-D-8**: Registro por defecto en `onEnable` del engine
- [ ] **T-D-9**: Documentar el estándar de escritura de plugins

### Verificación y cierre
- [ ] **T-D-10**: Tests de integración: search → play vía plugin registrado (iOS/Android)
- [ ] **T-D-11**: Benchmark de latencia del flujo plugin vs línea base Express (RNF-D-1)
- [ ] **T-D-12**: Actualizar `findings.md`, `session-log.md` y Engram; crear epic en repo Spoti5

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| El foco se traslada al repo Dart/Flutter, pausando la consolidación Node.js | Alta | Medio | Delimitar la ventana de la alternativa D en el plan; re-evaluar tras el primer plugin oficial |
| El refactor del Core Flutter rompe el fallback iOS probado | Media | Alto | Portar primero el `StrategyManager` con los tests de fallback existentes; no cambiar comportamiento en el mismo commit |
| El SDK se sobre-diseña (más allá de Searchable/Playable) | Media | Medio | YAGNI: solo las interfaces que el primer plugin + un ejemplo necesitan |
| El backend Express (PoC) sigue siendo un punto único de fallo mientras no haya segundo proveedor | Media | Medio | Documentar como deuda consciente; la apertura habilita el segundo proveedor sin tocar el Core |

---

## Entregable

Spoti5 con arquitectura de plugins nativa en Dart (`spoti5_plugin_sdk` + `PluginRegistry` + `StrategyManager`), con su cliente API actual funcionando como el **Primer Spoti5 Plugin Oficial**, conservando el Express PoC y el comportamiento de fallback probado.

---

## Criterios de Cierre

- [ ] `spoti5_plugin_sdk` publicado en el repo Spoti5 con interfaces Searchable/Playable/MetadataProvider
- [ ] Core Flutter consume plugins vía `PluginRegistry` (sin acoplamiento directo)
- [ ] `StrategyManager` preserva el fallback probado en iOS
- [ ] Primer plugin oficial (`ApiService` → Express) registrado y funcional
- [ ] Latencia del flujo plugin dentro de RNF-D-1
- [ ] Estándar de plugins documentado y (opcional) segundo plugin de ejemplo
- [ ] Resultados y tradeoffs documentados en `findings.md`, `session-log.md` y Engram; epic creado en repo Spoti5
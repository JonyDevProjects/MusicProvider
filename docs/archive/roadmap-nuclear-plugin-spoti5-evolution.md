# Roadmap: Transición a Plugin de Nuclear & Evolución de Spoti5

**Fecha**: 2026-08-11
**Estado**: En planificación (Post-Fase 5)
**Objetivo**: Establecer los pasos de diseño e implementación para transformar la prueba de concepto actual (Backend en Express y app Flutter) en componentes reutilizables, escalables y con arquitectura orientada a plugins para ecosistemas más ambiciosos.

---

## Contexto y Problemática

El proyecto actual, **MusicProvider / Spoti5**, cumplió exitosamente su propósito de probar un proveedor basado en el wrapper nativo de `yt-dlp` interactuando con un frontend Flutter multiplataforma. Sin embargo, su estructura actual es acoplada y monolítica a nivel servidor (servidor Express atado a lógica de negocio) y a nivel cliente (Spoti5 embebe los wrappers de red estáticamente).

El usuario busca diversificar este logro en dos frentes simultáneos:
1. **Consolidar el Backend en Nuclear:** Adaptar el motor robusto de búsqueda, resolución y proxy a un `Plugin de TypeScript` oficial de Nuclear, de modo que el reproductor de escritorio gane capacidades inmediatas.
2. **Re-arquitecturizar Spoti5:** Darle a Spoti5 una arquitectura móvil basada en plugins dinámicos (emulando la filosofía de Nuclear), volviéndolo una plataforma de audio genérica e infinitamente expandible.

---

## Eje 1: Transición a Plugin de Nuclear (Backend)

Nuclear soporta un robusto SDK de Plugins escrito en TypeScript. MusicProvider hoy vive en `src/ytdlpWrapper.ts`.

### Fases de Implementación

#### Fase 1 — Extracción Core y Desacoplamiento
- Mover toda la lógica de validación de binarios (`ytdlpSetup.ts`), búsqueda (`yt-search`) y parsing de streaming/playlists a un módulo abstracto puro sin dependencias de Express (`req`, `res`).
- Definir interfaces de retorno comunes para las peticiones (`TrackData`, `StreamData`) independientes de la web.

#### Fase 2 — Adaptación a `@nuclearplayer/plugin-sdk`
- Instalar la dependencia `@nuclearplayer/plugin-sdk`.
- Crear el wrapper que implemente las interfaces requeridas por Nuclear (`NuclearPlugin`, `AudioSourcePlugin`, etc.).
- Adaptar las llamadas HTTP/proxy de MusicProvider para que encajen en el flujo de buffering de electron de Nuclear.

#### Fase 3 — Compilación y Distribución
- Configurar un bundler (Webpack/Rollup o tsc simple) para emitir un plugin standalone `nuclear-musicprovider-plugin.js`.
- Testear inyectando el plugin en el frontend web local de Nuclear.

---

## Eje 2: Evolución de Spoti5 (Frontend / Mobile)

Spoti5 ahora mismo depende en gran medida del framework Flutter y de patrones Service/Factory estáticos (`MusicServiceFactory`). Para heredar la filosofía de Nuclear, el cliente debe soportar "Providers" dinámicos de terceros.

### Arquitectura Propuesta: Spoti5 Plugin Engine

```
┌─────────────────────────────────────┐
│          Spoti5 Core (UI)           │
│  (State, PlayerBar, Playlist Mngr)  │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│        Plugin Engine (Dart)         │ ← Carga y maneja el ciclo de vida
└────┬───────────────┬───────────┬────┘
     │               │           │
┌────▼────┐     ┌────▼────┐ ┌────▼────┐
│ Plugin A│     │ Plugin B│ │ Plugin C│
│(YouTube)│     │(Spotify)│ │ (Soundc)│
└─────────┘     └─────────┘ └─────────┘
```

### Fases de Implementación

#### Fase 1 — Diseño del Spoti5 Plugin SDK en Dart
- Crear un paquete Dart separado (`spoti5_plugin_sdk`) que defina abstracciones puras (`Searchable`, `Playable`, `MetadataProvider`).
- Estas interfaces reemplazarán al actual `MusicService`.

#### Fase 2 — Refactor del Core Flutter (Dependency Injection)
- Modificar `PlayerProvider` y la UI de `Spoti5_app` para que ya no instancien los servicios de manera cableada.
- Crear un `PluginRegistry` capaz de cargar y alternar implementaciones on-the-fly.
- Mover el comportamiento de "Fallback" del actual `MusicServiceFactory` a un `StrategyManager` que pueda enrutar a diferentes plugins si uno falla.

#### Fase 3 — Primer Spoti5 Plugin Oficial
- Transformar nuestro cliente API actual (`ApiService` que conecta con nuestro backend NodeJS) en un Plugin Spoti5 aislado y registrable.
- Documentar el estándar de comunicación para que desarrolladores externos puedan escribir y cargar sus propios plugins.

---

## Siguientes Pasos Inmediatos

El proyecto se dividirá esencialmente en dos áreas de repositorio. La decisión principal para el próximo Sprint es:
1. **¿Comenzar aislando el código Node.js y empaquetándolo como Nuclear Plugin?**
2. **¿O iniciar la separación de la UI de Spoti5 y su núcleo de carga de plugins?**

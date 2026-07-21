# ADR-001: Flutter Rust Bridge para integración yt-dlp en móvil

## Estado

**Aceptado** - 21 de julio de 2026

## Contexto

La aplicación Flutter Spoti5_app actualmente requiere que el backend Node.js esté ejecutándose en un ordenador de desarrollo para funcionar. Esto limita la portabilidad y crea una dependencia de red local.

Necesitamos una arquitectura que permita a las aplicaciones móviles (iOS y Android) operar de forma independiente con la lógica del backend integrada, específicamente para:

1. Búsqueda de tracks (metadatos)
2. Extracción de URLs de stream de audio
3. Reproducción de audio

### Requisitos

**Funcionales:**
- Búsqueda de tracks por texto
- Extracción de metadatos (título, artista, duración, thumbnail)
- Obtención de URL de stream directa
- Soporte para iOS y Android

**No Funcionales:**
- Latencia de extracción < 2 segundos
- Inicio de reproducción < 3 segundos
- Uso moderado de CPU/memoria
- Sin dependencia de servidor externo
- Código compartible con el ecosistema Nuclear

### Opciones Evaluadas

| Opción | Latencia | Complejidad | iOS | Android | Nuclear Compatible |
|--------|----------|-------------|-----|---------|-------------------|
| yt-dlp directo | 3-8s | Alta | ⚠️ | ✅ | ❌ |
| **Rust Bridge** | 0.5-2s | Alta | ✅ | ✅ | ✅ |
| Platform Channels | 1-3s | Media | ✅ | ✅ | ❌ |
| Servicio Nube | 1-3s | Baja | ✅ | ✅ | ❌ |
| Híbrida Local | 3-10s | Alta | ⚠️ | ✅ | ❌ |

## Decisión

**Implementar Flutter Rust Bridge (FRB) para integrar yt-dlp nativamente en la aplicación Flutter.**

### Razones

1. **Compatibilidad con Nuclear**: El proyecto Nuclear ya implementa esta arquitectura en `packages/player/src-tauri/src/ytdlp.rs`. Compartir código Rust facilita la futura integración de MusicProvider como plugin.

2. **Rendimiento**: Rust ofrece el mejor rendimiento posible (latencia 0.5-2s), comparable a la implementación nativa de Nuclear.

3. **Código compartido**: La lógica de yt-dlp en Rust puede reutilizarse directamente en Nuclear.

4. **Tipo seguro**: Verificación de tipos en tiempo de compilación tanto en Rust como en Dart.

5. **Sin dependencias externas**: Todo embebido en la app, sin necesidad de servidores externos.

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    Spoti5_app (Flutter)                      │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  HomeScreen  │    │ PlayerProvider│    │  ApiService  │  │
│  │   (Search)   │    │   (Audio)    │    │   (Legacy)   │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘  │
│         │                   │                               │
│         └───────────────────┘                               │
│                     │                                       │
│         ┌───────────▼───────────┐                           │
│         │   YtDlpNative (FRB)   │                           │
│         │   - search()          │                           │
│         │   - getStreamInfo()   │                           │
│         │   - getPlaylist()     │                           │
│         └───────────┬───────────┘                           │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
         ┌────────────▼────────────┐
         │   Rust Native Library   │
         │   (ytdlp_native)        │
         │                         │
         │  ┌───────────────────┐  │
         │  │  yt-dlp Wrapper   │  │
         │  │  (NDJSON Parser)  │  │
         │  └───────────────────┘  │
         │                         │
         │  ┌───────────────────┐  │
         │  │  Binary Manager   │  │
         │  │  (Auto-download)  │  │
         │  └───────────────────┘  │
         └─────────────────────────┘
```

### Componentes Principales

#### 1. Rust Library (`rust/ytdlp_native/`)

**Archivos:**
- `src/lib.rs` - Punto de entrada y definición de tipos
- `src/ytdlp.rs` - Wrapper para ejecutar yt-dlp
- `src/ytdlp_setup.rs` - Gestión del binario (descarga/actualización)
- `src/ndjson_parser.rs` - Parseo de salida NDJSON

**Funciones públicas:**
```rust
pub async fn search(query: &str, limit: u32) -> Result<Vec<SearchResult>>
pub async fn get_stream_info(video_id: &str) -> Result<StreamInfo>
pub async fn get_playlist(url: &str) -> Result<PlaylistInfo>
```

#### 2. Flutter Bridge (`lib/native/`)

**Archivos:**
- `ytdlp_native.dart` - Bindings generados por FRB
- `ytdlp_service.dart` - Servicio de alto nivel para la app

#### 3. Tipos Compartidos

```rust
// Rust
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub duration: Option<f64>,
    pub thumbnail: Option<String>,
    pub channel: Option<String>,
}

pub struct StreamInfo {
    pub stream_url: String,
    pub duration: Option<f64>,
    pub title: Option<String>,
    pub container: Option<String>,
    pub codec: Option<String>,
}
```

## Consecuencias

### Positivas

1. **Rendimiento óptimo**: Latencia de extracción 0.5-2 segundos
2. **Código compartido**: Reutilizable en Nuclear
3. **Sin dependencia externa**: App funciona offline (para metadatos cacheados)
4. **Tipo seguro**: Compile-time checks en Rust y Dart
5. **Actualizable**: Binario yt-dlp actualizable sin cambiar la app

### Negativas

1. **Complejidad de desarrollo**: Requiere conocimiento de Rust
2. **Tiempo de implementación**: Mayor que otras opciones
3. **Tamaño de app**: +10-20MB (binario Rust compilado)
4. **Mantenimiento**: Dos lenguajes que mantener (Dart + Rust)

### Riesgos

1. **Curva de aprendizaje**: El equipo necesita aprender Rust
2. **Debugging**: Más difícil de debuggear que código nativo
3. **Dependencias Rust**: Posibles problemas de compilación cross-platform

## Notas de Implementación

### Fase 1: Configuración Inicial
- [ ] Configurar flutter_rust_bridge en Spoti5_app
- [ ] Crear estructura de directorios Rust
- [ ] Configurar build scripts para iOS y Android

### Fase 2: Implementación Rust
- [ ] Implementar wrapper yt-dlp (basado en Nuclear)
- [ ] Implementar gestor de binario
- [ ] Implementar parser NDJSON
- [ ] Tests unitarios en Rust

### Fase 3: Integración Flutter
- [ ] Generar bindings con FRB
- [ ] Crear servicio de alto nivel
- [ ] Integrar con PlayerProvider existente
- [ ] Mantener fallback a API para desarrollo

### Fase 4: Testing
- [ ] Tests de integración en Android
- [ ] Tests de integración en iOS
- [ ] Benchmarks de rendimiento
- [ ] Documentación de uso

## Referencias

- [Nuclear yt-dlp Implementation](https://github.com/nukeop/nuclear/blob/master/packages/player/src-tauri/src/ytdlp.rs)
- [Flutter Rust Bridge Documentation](https://cjycode.com/flutter_rust_bridge/)
- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)

---

**Autor:** Jonathan Quishpe  
**Fecha:** 21 de julio de 2026  
**Versión:** 1.0
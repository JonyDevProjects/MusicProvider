# ADR-002: Backend en la Nube para Funcionalidades Extendidas (Futuro)

## Estado

**Propuesto** - 21 de julio de 2026

## Contexto

Este documento describe una arquitectura futura donde el backend Node.js se desplegaría en la nube para soportar funcionalidades extendidas que no son viables en el dispositivo móvil.

Esta arquitectura se implementará **después** de completar la integración de Flutter Rust Bridge (ADR-001), cuando el backend tenga funcionalidades que requieran recursos del servidor.

## Funcionalidades Futuras que Requieren Backend

### 1. **Procesamiento de Audio Avanzado**
- Conversión de formatos (MP3, AAC, FLAC)
- Normalización de volumen
- Ecualización personalizada
- Mezcla de audio

### 2. **Análisis de Audio**
- Detección de BPM
- Análisis de espectro
- Identificación de género musical
- Detección de mood/emoción

### 3. **Funcionalidades Sociales**
- Playlists colaborativas
- Compartir tracks
- Comentarios y reseñas
- Historial de reproducción sincronizado

### 4. **Machine Learning**
- Recomendaciones personalizadas
- Búsqueda por相似idad de audio
- Clasificación automática de música
- Detección de duplicados

### 5. **Almacenamiento en la Nube**
- Biblioteca de música personal
- Descargas offline sincronizadas
- Backup de preferencias
- Sincronización entre dispositivos

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    Spoti5_app (Flutter)                      │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  HomeScreen  │    │ PlayerProvider│    │ CloudService │  │
│  │   (Search)   │    │   (Audio)    │    │  (Extended)  │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │           │
│         └───────────────────┼───────────────────┘           │
│                             │                               │
│         ┌───────────────────▼───────────────────┐           │
│         │         Hybrid Service Layer          │           │
│         │   (Local FRB + Cloud API Fallback)    │           │
│         └───────────────────┬───────────────────┘           │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Rust Native    │  │  Cloud Backend  │  │  Local Cache    │
│  (yt-dlp)       │  │  (Node.js)      │  │  (SQLite)       │
│                 │  │                 │  │                 │
│  - Search       │  │  - Audio Proc   │  │  - Metadata     │
│  - Stream Info  │  │  - ML/AI        │  │  - Playlists    │
│  - Playlist     │  │  - Social       │  │  - Preferences  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Servicios en la Nube Opcionales

### Opción 1: Vercel/Netlify (Serverless)
**Ideal para:** Funciones específicas bajo demanda

```javascript
// Ejemplo: /api/process-audio
export default async function handler(req, res) {
  const { audioUrl, format } = req.body;
  
  // Procesamiento de audio
  const processed = await processAudio(audioUrl, format);
  
  res.json({ url: processed.url });
}
```

**Ventajas:**
- Sin gestión de servidores
- Escalabilidad automática
- Costo por uso

**Desventajas:**
- Cold starts
- Límites de ejecución
- Costos impredecibles

### Opción 2: Railway/Render (Backend Persistente)
**Ideal para:** Servicios que necesitan estado

```yaml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node dist/server.js"
healthcheckPath = "/health"
```

**Ventajas:**
- Estado persistente
- Mejor rendimiento
- Más control

**Desventajas:**
- Costo fijo mensual
- Gestión de infraestructura

### Opción 3: AWS/GCP/Azure (Infraestructura Completa)
**Ideal para:** Escala empresarial

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      
  redis:
    image: redis:alpine
    
  postgres:
    image: postgres:15
```

**Ventajas:**
- Máximo control
- Servicios integrados (ML, storage, etc.)
- Escalabilidad global

**Desventajas:**
- Complejidad de gestión
- Costos variables
- Curva de aprendizaje

## Modelo de Datos Híbrido

### Datos Locales (Rust/SQLite)
```sql
-- Metadatos de tracks (cache)
CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  duration REAL,
  thumbnail_url TEXT,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Preferencias del usuario
CREATE TABLE preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Datos en la Nube (PostgreSQL)
```sql
-- Playlists del usuario
CREATE TABLE playlists (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de reproducción
CREATE TABLE play_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id TEXT NOT NULL,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_played REAL
);
```

## Estrategia de Sincronización

### 1. Offline-First
```dart
class HybridService {
  final YtDlpNative _localService;
  final CloudService _cloudService;
  
  Future<List<Track>> search(String query) async {
    // Intentar local primero
    try {
      final results = await _localService.search(query);
      await _cacheResults(results);
      return results;
    } catch (e) {
      // Fallback a cloud si local falla
      return await _cloudService.search(query);
    }
  }
  
  Future<void> syncWhenOnline() async {
    // Sincronizar datos offline cuando hay conexión
    final pending = await _getPendingSync();
    await _cloudService.syncData(pending);
  }
}
```

### 2. Conflict Resolution
```dart
enum ConflictResolution {
  localWins,    // Datos locales tienen prioridad
  cloudWins,    // Datos en la nube tienen prioridad
  merge,        // Combinar datos
  userChoice,   // Preguntar al usuario
}

class SyncManager {
  Future<void> resolveConflict(
    ConflictResolution strategy,
    Map<String, dynamic> local,
    Map<String, dynamic> cloud,
  ) async {
    switch (strategy) {
      case ConflictResolution.localWins:
        await _uploadLocal(local);
        break;
      case ConflictResolution.cloudWins:
        await _downloadCloud(cloud);
        break;
      case ConflictResolution.merge:
        await _mergeData(local, cloud);
        break;
      case ConflictResolution.userChoice:
        await _promptUser(local, cloud);
        break;
    }
  }
}
```

## Costos Estimados

### Desarrollo Inicial
| Componente | Tiempo | Costo Estimado |
|------------|--------|----------------|
| Backend API | 2-3 semanas | $2,000-3,000 |
| Infraestructura | 1 semana | $500-1,000 |
| Integración Flutter | 1-2 semanas | $1,000-2,000 |
| **Total** | **4-6 semanas** | **$3,500-6,000** |

### Operación Mensual (1,000 usuarios)
| Servicio | Costo Mensual |
|----------|---------------|
| Hosting (Railway/Render) | $20-50 |
| Base de datos | $15-30 |
| Storage (audio procesado) | $10-20 |
| ML/AI services | $50-100 |
| **Total** | **$95-200** |

## Cronograma de Implementación

### Fase 1: Preparación (Post FRB)
- [ ] Diseñar API REST para funcionalidades extendidas
- [ ] Configurar infraestructura base (Railway/Render)
- [ ] Implementar autenticación de usuarios
- [ ] Crear esquema de base de datos

### Fase 2: Funcionalidades Core
- [ ] Playlists en la nube
- [ ] Historial de reproducción
- [ ] Preferencias sincronizadas
- [ ] Offline-first con sincronización

### Fase 3: Funcionalidades Avanzadas
- [ ] Procesamiento de audio en la nube
- [ ] Recomendaciones ML
- [ ] Análisis de audio
- [ ] Funcionalidades sociales

### Fase 4: Optimización
- [ ] CDN para assets estáticos
- [ ] Cache inteligente
- [ ] Optimización de costos
- [ ] Monitoreo y alertas

## Métricas de Éxito

### Rendimiento
- Latencia de búsqueda < 1s (local) / < 2s (cloud)
- Sincronización < 5s para 100 tracks
- Disponibilidad > 99.9%

### Experiencia de Usuario
- Transparencia entre local/cloud
- Offline mode funcional
- Sincronización sin interrupciones

### Costos
- < $0.10 por usuario por mes
- Escalabilidad lineal
- Optimización automática de recursos

## Referencias

- [ADR-001: Flutter Rust Bridge](./adr-001-flutter-rust-bridge.md)
- [Nuclear Architecture](https://github.com/nukeop/nuclear)
- [Offline-First Architecture](https://offlinefirst.org/)

---

**Autor:** Jonathan Quishpe  
**Fecha:** 21 de julio de 2026  
**Versión:** 1.0  
**Estado:** Propuesto (para implementación futura)
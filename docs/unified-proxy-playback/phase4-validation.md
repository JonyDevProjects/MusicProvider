# Fase 4 — Validación End-to-End

**Agente**: Usuario (testing físico) + CommandCode (coordinación y validación automática)
**Objetivo**: Demostrar que el reproductor funciona sin fallos en todas las plataformas objetivo.

---

## Estado de Validación Automática (✅ completada)

### ✅ Backend API Endpoints
| Endpoint | Verbo | Parámetro | Resultado | HTTP |
|----------|-------|-----------|-----------|------|
| `/api/search` | GET | `q=Radiohead+Creep` | 10 resultados, primer resultado: "Radiohead - Creep" (237s) | 200 |
| `/api/audio/resolve` | GET | `videoId=XFkzRNyygfk` | streamUrl + metadata (m4a, mp4a.40.2, 237s) | 200 |
| `/api/audio/stream` | GET | `videoId=XFkzRNyygfk` + `Range: bytes=0-1023` | 206 Partial Content, Content-Range: bytes 0-1023/3830364 | 206 |

### ✅ Flutter Unit Tests (8/8 passed)
- `MusicServiceFactory` iOS — ApiService primary, YtExplodeService fallback ✓
- `MusicServiceFactory` macOS — ApiService primary, YtExplodeService fallback ✓
- `MusicServiceFactory` Android — ApiService primary, YtExplodeService fallback ✓
- `MusicServiceFactory` all services implement MusicService ✓
- `PlayerBar` uses track.duration for total (no doubled duration) ✓
- App starts correctly ✓
- `YtExplodeService` searchTracks returns list of tracks ✓
- `YtExplodeService` getStream returns CDN URL directly ✓

### ✅ Playwright E2E Tests (2/2 passed)
- **Search and play a track**: Busca "Radiohead Creep", hace clic en el primer resultado, verifica que PlayerBar se activa ✓
- **Track duration in UI matches backend**: Backend=237s, Rendered UI=238s (diff ≤ 2s) ✓

### ✅ Cloudflare Tunnel
- Tunnel URL: `https://church-draw-curves-headers.trycloudflare.com`
- El tunnel proxy correctamente `/api/search` y `/api/audio/stream` (HTTP 206 con Range header)
- Todos los endpoints son accesibles a través del túnel HTTPS público

---

## Estado de Validación Física (Pendiente — requiere dispositivo)

### 4.1. Prueba en Android (Físico / Emulador)
**Comando de ejecución:**

```bash
# Opción A: Android emulador (usa 10.0.2.2)
cd Spoti5_app
flutter run -d android-emulator

# Opción B: Dispositivo físico Android (usa IP LAN de la Mac)
cd Spoti5_app
flutter run -d <deviceId> --dart-define=BASE_URL=http://$(ipconfig getifaddr en0):3000/api

# Opción C: A través del túnel de Cloudflare (cualquier dispositivo)
cd Spoti5_app
flutter run -d <deviceId> --dart-define=BASE_URL=https://church-draw-curves-headers.trycloudflare.com/api
```

**Pasos de validación:**
1. [ ] Levantar backend local (`npm run dev:server` — ya corriendo)
2. [ ] Compilar y correr en Android apuntando al `BASE_URL` del backend
3. [ ] Buscar "Radiohead Creep" → debe mostrar resultados
4. [ ] Tocar el primer resultado → debe reproducir al 100% sin errores 403

**Notas técnicas:**
- El backend ya maneja el `Range` header para seeking, lo que AVPlayer (iOS) y ExoPlayer (Android) requieren.
- El backend fuerza `Range: bytes=0-` si el cliente no envía uno, evitando el 403 de la CDN de YouTube.
- El `ApiService` detecta `Platform.isAndroid` y usa `10.0.2.2` para emuladores automáticamente.

### 4.2. Prueba en iOS (Físico)
**Comando de ejecución:**

```bash
cd Spoti5_app
flutter run -d "Jonathan's iPhone" \
  --dart-define=BASE_URL=https://church-draw-curves-headers.trycloudflare.com/api
```

**Pasos de validación:**
1. [ ] El túnel de Cloudflare está activo (ver arriba)
2. [ ] Lanzar app en iPhone usando el `--dart-define=BASE_URL`
3. [ ] Apagar el WiFi del iPhone, dejándolo en red celular
4. [ ] Buscar y reproducir "Radiohead Creep" → debe funcionar usando los bytes enviados por el backend

**Estado del túnel:** El tunnel `church-draw-curves-headers` está activo y sirviendo el backend. El iPhone conectado inalámbricamente (ID: `00008101-000C2D492682001E`, iOS 18.7.8) está disponible para pruebas.

### 4.3. Documentar resultados
- [ ] Registrar tiempos de carga y estabilidad (ver formato abajo)
- [ ] Dar por concluido el hito y mergear `feature/unified-proxy-playback` a `develop`

---

## Formato de Reporte de Validación Física

Cuando complete las pruebas físicas, complete esta tabla:

| Plataforma | Búsqueda | Tiempo carga (primera nota) | Tiempo reproducción (full track) | Sin cortes | Observaciones |
|------------|----------|-----------------------------|----------------------------------|-|---------------|
| Android emulador | Radiohead Creep | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| Android físico | Radiohead Creep | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| iOS físico (cellular) | Radiohead Creep | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

---

## Merge Plan
Una vez completada la validación física:

```bash
git checkout develop
git merge feature/unified-proxy-playback
git push origin develop
git branch -d feature/unified-proxy-playback
```

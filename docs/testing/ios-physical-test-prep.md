# Guía de Preparación: Pruebas en iOS Físico (WiFi y Celular)

Esta guía documenta todo lo necesario para preparar y ejecutar pruebas en un iPhone físico bajo **cualquier escenario de red**: WiFi local (misma LAN que la Mac), WiFi remoto (red diferente a la Mac), o datos móviles (celular).

> **Contexto**: La app (`Spoti5_app`) consume un backend Node.js (`src/server.ts`). En dispositivos físicos, `localhost` resuelve al propio iPhone, no a la Mac. Se requiere inyectar la URL correcta del backend vía `--dart-defined=BASE_URL`.

---

## 1. Visión General de Escenarios

| Escenario | Descripción | BASE_URL requerida |
|-----------|-------------|-------------------|
| **A. WiFi Local** | iPhone y Mac en **misma** red WiFi | `http://<MAC_IP>:3000/api` |
| **B. WiFi Remoto** | iPhone en WiFi diferente (no puede ver la LAN de la Mac) | `https://<tunnel>.trycloudflare.com/api` |
| **C. Datos Móviles** | iPhone usando **celular** (sin WiFi) | `https://<tunnel>.trycloudflare.com/api` |

### Decision Matrix

| Necesitas... | Usa... |
|-------------|--------|
| Velocidad y sin dependencias externas | **WiFi Local** (Escenario A) |
| Validar el túnel/proxy en condiciones reales | **Datos Móviles** (Escenario C) |
| La Mac y el iPhone no comparten red | **Cloudflare Tunnel** (Escenarios B/C) |
| Pruebas de integration_test (automatizadas) | **WiFi Local** (Escenario A) — el túnel puede interferir con mDNS/VM Service |

---

## 2. Pre-requisitos

### Hardware
- iPhone físico con **Developer Mode activado** (iOS 16+)
- Cable USB para la primera conexión / pairing
- Apple ID con **cuenta Developer** (o gratuita, pero con límites)

### Software (en la Mac)
- **Xcode** + command line tools
- **Flutter SDK** (versión compatible con el proyecto)
- **CocoaPods**: `sudo gem install cocoapods` o `brew install cocoapods`
- **cloudflared**: `brew install cloudflared` (solo para Escenarios B/C)
- **Node.js** (para backend): `npx tsx` disponible

### Backend
- El backend debe escuchar en `0.0.0.0:3000`, no solo `localhost`. Verifica con `curl http://localhost:3000/api/search?q=test`.

---

## 3. Procedimiento de Setup por Escenario

### Escenario A: WiFi Local (misma red)

**Ventajas**: Sin dependencias externas, latencia mínima, compatible con `integration_test`.
**Limitaciones**: Requiere que iPhone y Mac estén en la misma red.

```bash
# 1. Iniciar el backend
cd MusicProvider
NODE_ENV=development npx tsx src/server.ts

# 2. Obtener IP LAN de la Mac
MAC_IP=$(ipconfig getifaddr en0)
echo "Mac IP: $MAC_IP"

# 3. Verificar conectividad desde la LAN (opcional, usando otro device)
curl -s "http://$MAC_IP:3000/api/search?q=test&limit=1"

# 4. Ejecutar la app en release
cd Spoti5_app
flutter run --release -d <deviceId> \
  --dart-define=BASE_URL=http://$MAC_IP:3000/api
```

### Escenario C: Datos Móviles (Cloudflare Tunnel)

**Ventajas**: Simula condiciones reales, funciona en cualquier red.
**Limitaciones**: Latencia extra, DNS local puede fallar (ver troubleshooting).

```bash
# 1. Iniciar el backend
cd MusicProvider
NODE_ENV=development npx tsx src/server.ts

# 2. Iniciar el túnel de Cloudflare
cloudflared tunnel --url http://localhost:3000

# 3. Extraer la URL del túnel (del log de cloudflared)
TUNNEL_URL="https://<random>.trycloudflare.com"

# 4. Verificar el túnel (puede requerir --resolve en DNS local roto)
curl -s --resolve "$TUNNEL_URL:443:$(dig +short $TUNNEL_URL @1.1.1.1)" \
  "https://$TUNNEL_URL/api/search?q=test&limit=1"

# 5. Ejecutar la app en release usando el túnel
cd Spoti5_app
flutter run --release -d <deviceId> \
  --dart-define=BASE_URL="https://$TUNNEL_URL/api"
```

---

## 4. Checklist Pre-Ejecución

Antes de lanzar cualquier build, verifica todo lo siguiente:

- [ ] **Device detectado**: `flutter devices` muestra el iPhone
- [ ] **Developer Mode activado**: en iPhone → Configuración → Privacidad y Seguridad → Modo de desarrollador
- [ ] **Certificado de confianza**: si es primera vez, confiar en el perfil de desarrollo
  - Configuración → General → VPN y gestión de dispositivos → Confiar en [perfil]
- [ ] **Permiso de red local**: si usas Escenario A, ejecuta `flutter run --profile` primero para disparar el prompt de permiso de red local, luego acepta en iOS
- [ ] **Backend corriendo**: `curl http://localhost:3000/api/search?q=test` retorna HTTP 200
- [ ] **BASE_URL correcta**: inyecta la URL que el iPhone puede resolver
  - Escenario A: `http://<MAC_IP>:3000/api`
  - Escenario C: `https://<tunnel>.trycloudflare.com/api`
- [ ] **Túnel activo** (solo B/C): la URL del túnel responde HTTP 200
- [ ] **iOS asociado a la misma red** (solo A): el iPhone puede `ping` la Mac
- [ ] **Personal Hotspot desactivado** en el iPhone

---

## 5. Troubleshooting por Escenario

### 5.1 DNS del túnel falla en la Mac (`.trycloudflare.com` no resuelve)

**Síntoma**: `curl https://<tunnel>.trycloudflare.com/...` retorna `HTTP 000` o `Could not resolve host`.

**Causa**: El DNS local de la red no resuelve dominios de Cloudflare Tunnel (NXDOMAIN). El DNS público (1.1.1.1) sí lo resuelve.

**Solución**: Usar `--resolve` para forzar la IP, o cambiar DNS a Cloudflare:
```bash
# Opción 1: Forzar DNS en curl
curl --resolve "<tunnel>.trycloudflare.com:443:<CDN_IP>" \
  "https://<tunnel>.trycloudflare.com/api/search?q=test"

# Opción 2: Resolver la IP vía 1.1.1.1
TUNNEL="<tunnel>.trycloudflare.com"
IP=$(dig +short $TUNNEL @1.1.1.1 | head -1)
curl --resolve "$TUNNEL:443:$IP" "https://$TUNNEL/api/search?q=test"
```

> **Nota**: Esto es un problema del lado cliente (la Mac). El iPhone en datos móviles resuelve normalmente el túnel usando el DNS del carrier.

### 5.2 "Connection failed (OS Error: No route to host, errno = 65)"

**Síntoma**: La app no puede conectar al backend.

**Solución**: 
1. En Escenario A: verifica que iPhone y Mac estén en la **misma subred**. Usa `http://<MAC_IP>:3000/api`, no `localhost`.
2. En Escenario C: verifica que el túnel esté activo y la URL sea HTTPS. No uses HTTP con datos móviles (Apple ATS rechaza conexiones no encriptadas).

### 5.3 "The Dart VM Service was not discovered after 60 seconds"

**Síntoma**: Flutter build exitoso pero la app no se instala o no responde.

**Solución**:
1. En el iPhone: Configuración → General → VPN y gestión de dispositivos → confía en el certificado de desarrollo.
2. Si usas datos móviles, el mDNS no funciona; el `flutter run` necesita una conexión de red directa con el deviceId. Usar cable USB para el pairing inicial, luego el deployment es inalámbrico.

### 5.4 Cloudflare Tunnel URL caduca

**Síntoma**: El túnel se desconecta o la URL deja de responder.

**Solución**: Las *quick tunnels* de Cloudflare duran ~24h o hasta que se cierra la terminal. Si la URL deja de funcionar, reinicia el `cloudflared tunnel` y actualiza la `--dart-define`.

### 5.5 Build de iOS lento o falla

**Síntoma**: Xcode build tarda >5 minutos o falla con errores de firma.

**Solución**:
```bash
# Limpiar caché de Flutter
flutter clean
flutter pub get
cd ios && pod deintegrate && pod install && cd ..

# Limpiar caché de Xcode
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### 5.6 "rust_lib_ytdlp_native" no soporta SPM

**Síntoma**: Warning durante el build:
```
The following plugins do not support Swift Package Manager for ios:
  - rust_lib_ytdlp_native
```

**Impacto**: Funciona actualmente pero puede romperse en futuras versiones de Flutter. Monitorear.

---

## 6. Comandos de Diagnóstico Rápida

```bash
# === Device ===
flutter devices                                    # listar dispositivos
flutter devices --monitor                         # monitorear cambios

# === Backend ===
curl -s -w "\nHTTP: %{http_code}\n" \
  "http://localhost:3000/api/search?q=test&limit=1"  # health check
curl -s -D - -o /dev/null -H "Range: bytes=0-100" \
  "http://localhost:3000/api/audio/stream?videoId=XFkzRNyygfk"  # headers

# === Cache behavior ===
grep -E "cache|HIT|MISS" <backend_log> | tail -10

# === Tunnel ===
dig +short <tunnel>.trycloudflare.com @1.1.1.1    # DNS resolution
curl --resolve "<tunnel>:443:<IP>" \
  "https://<tunnel>/api/search?q=test&limit=1"     # tunnel health

# === App logs ===
flutter logs | grep -E "ApiService|PlayerProvider|warmup"

# === Memory ===
ps -o pid,rss,vsz,comm -p $(pgrep -f "tsx src/server.ts")
```

---

## 7. Notas de Sesión Reciente (2026-08-04)

- **Backend corrió en**: `NODE_ENV=development npx tsx src/server.ts`
- **Tunnel URL**: `https://activation-accommodation-regulations-ace.trycloudflare.com`
- **Device**: `00008101-000C2D492682001E` (Jonathan's iPhone, iOS 18.7.8)
- **Build time**: Xcode build: 43.2s
- **DNS local roto**: El DNS de la Mac no resuelve `*.trycloudflare.com` (NXDOMAIN). Solución: forzar `--resolve` con IP de 1.1.1.1. El iPhone en datos móviles resuelve normalmente.
- **Cache**: Verified MISS → HIT on repeated `/api/audio/resolve` for same videoId.
- **Streaming**: HTTP 206 con `Content-Range`, `Accept-Ranges: bytes`, `Content-Length` confirmados.

---

## 8. Referencias Relacionadas

- [Fase 1: Manual de Pruebas (iOS físico)](../optimizations/fase-1-testing-manual-ios-physical.md)
- [Troubleshooting iOS](../testing/ios_troubleshooting.md)
- [E2E Dispositivos Físicos](../testing/e2e_mobile_fisicos.md)
- [Roadmap Proxy Solutions](../roadmap-proxy-solutions/README.md)

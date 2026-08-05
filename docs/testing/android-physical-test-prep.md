# Guía de Preparación: Pruebas en Android Físico (Android 8)

Esta guía documenta todo lo necesario para preparar y ejecutar pruebas en un dispositivo Android físico con **Android 8.0 (API 26)** o **Android 8.1 (API 27)**.

> **Contexto**: La app (`Spoti5_app`) consume un backend Node.js (`src/server.ts`). En dispositivos físicos, `localhost` y `10.0.2.2` no resuelven hacia la Mac. Se requiere inyectar la URL del backend vía `--dart-define=BASE_URL=http://<MAC_IP>:3000/api`.

---

## 1. Visión General de Escenarios

| Escenario | Descripción | BASE_URL requerida |
|-----------|-------------|--------------------|
| **A. USB Cable** | Dispositivo conectado vía cable USB (única opción para Android 8) | `http://<MAC_IP>:3000/api` |

> **Nota clave**: Android 8 (API 26/27) **NO soporta Wireless Debugging** — esa función requiere Android 11 (API 30) o superior. Para Android 8, la conexión USB es obligatoria.

---

## 2. Pre-requisitos

### Hardware
- Dispositivo Android 8.0/8.1 físico
- Cable USB (preferiblemente el original del dispositivo)
- Mac con puerto USB-A o USB-C según corresponda

### Software (en la Mac)

| Componente | Estado | Comando de verificación |
|------------|--------|------------------------|
| **Flutter SDK** | Instalado | `flutter --version` |
| **Android SDK** | Instalado (v36.1.0) | `flutter doctor` |
| **ADB (Android Debug Bridge)** | Disponible | `adb version` |
| **Backend Node.js** | Debe estar corriendo | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/search?q=test` |
| **Plataformas Android** | SDK platforms instalados | `ls ~/Library/Android/sdk/platforms/` |

> **Platform tools instalados**: android-28, android-34, android-35, android-36, android-36.1

### Compatibilidad minSdk

| Propiedad | Valor | Comentario |
|-----------|-------|------------|
| **minSdkVersion** | 24 (Android 5.0) | Default de Flutter Gradle plugin (`FlutterExtension.kt`) |
| **Android 8.0** | API 26 | Compatible (26 > 24) ✓ |
| **Android 8.1** | API 27 | Compatible (27 > 24) ✓ |

---

## 3. Procedimiento de Setup del Dispositivo Android

### Paso 1: Activar las Opciones de Desarrollador

1. Abre **Ajustes** → **Acerca del teléfono** (o **Acerca del dispositivo**)
2. Desplázate hasta **Información deSoftware** (o **Número de compilación**)
3. Toca **Número de compilación** **7 veces**
4. Aparecerá el mensaje **"¡Ya eres un desarrollador!"**

> Si no ves "Número de compilación", busca **Versión de Android** o **Build** y repite. Algunos dispositivos requieren tocar también **Número de compilación de seguridad**.

### Paso 2: Habilitar Depuración USB

1. Regresa a **Ajustes** → **Sistema** → **Opciones de desarrollador**
2. Activa **Depuración USB**
3. Conecta el dispositivo a la Mac vía **cable USB**
4. En el dispositivo, aparecerá un diálogo: **"¿Permitir depuración USB?"** con una huella digital RSA
5. Marca **"Siempre permitir en este equipo"** y confirma

> **Importante**: Si no ves el diálogo de autorización RSA, revisa que el cable USB permita transferencia de datos (no solo carga). Algunos cables "solo carga" no funcionan para ADB.

### Paso 3: Verificar la conexión

En la Mac, ejecuta:

```bash
# Verificar con ADB
adb devices

# Verificar con Flutter
flutter devices
```

> [!EXPECTED]
> El dispositivo debería aparecer como `device` (no como `unauthorized`):
> ```
> List of devices attached
> XXXXXXXXXXXX    device
> ```

---

## 4. Procedimiento de Testing

### Paso 1: Iniciar el backend

El backend debe escuchar en `0.0.0.0:3000` (no solo `localhost`) para que el dispositivo físico pueda accederlo.

```bash
cd MusicProvider
NODE_ENV=development npx tsx src/server.ts
```

Verifica que responda:

```bash
MAC_IP=$(ipconfig getifaddr en0)
curl -s -o /dev/null -w "HTTP: %{http_code}" "http://$MAC_IP:3000/api/search?q=test&limit=1"
# Debe retornar: HTTP: 200
```

### Paso 2: Ejecutar tests E2E (`integration_test`)

```bash
cd Spoti5_app
flutter test integration_test/app_test.dart -d <deviceId> \
  --dart-define=BASE_URL=http://$(ipconfig getifaddr en0):3000/api
```

#### Tests disponibles

| Test | Descripción | Archivo |
|------|-------------|---------|
| `app_test.dart` | Buscar "Radiohead Creep", reproducir, verificar que PlayerBar usa `track.duration` y no la duplica | `integration_test/app_test.dart` |
| `playback_test.dart` | Test de reproducción genérica con logging de `YtExplodeService` | `integration_test/playback_test.dart` |

> **Nota**: El `playback_test.dart` fue originalmente escrito para validar el servicio `YtExplodeService` en iOS, pero el test es plataforma-agnóstico. En Android con `BASE_URL` definido, la factory selecciona `ApiService` como primer servicio, por lo que el test valida el flujo de proxy HTTP del backend.

### Paso 3: Ejecución manual (`flutter run --release`)

```bash
cd Spoti5_app
flutter run --release -d <deviceId> \
  --dart-define=BASE_URL=http://$(ipconfig getifaddr en0):3000/api
```

> En **release mode**, `debugPrint` no se muestra. Para capturar logs del cliente durante testing manual, usa `--profile` en su lugar:
> ```bash
> flutter run --profile -d <deviceId> \
>   --dart-define=BASE_URL=http://$(ipconfig getifaddr en0):3000/api
> ```

---

## 5. Checklist Pre-Ejecución

Antes de lanzar cualquier build o test, verifica todo lo siguiente:

- [ ] **Backend corriendo**: `curl http://<MAC_IP>:3000/api/search?q=test` retorna HTTP 200
- [ ] **Backend en 0.0.0.0**: `src/server.ts` usa `app.listen(PORT, '0.0.0.0', ...)` ✓ (verificado)
- [ ] **Misma red WiFi**: El dispositivo Android y la Mac están en la **misma subred** Wi-Fi
- [ ] **Developer Options activado**: tap "Número de compilación" 7 veces en Ajustes → Acerca del teléfono
- [ ] **Depuración USB activada**: en Opciones de desarrollador → "Depuración USB"
- [ ] **Autorización RSA aceptada**: conecta el cable USB y acepta el diálogo "¿Permitir depuración USB?"
- [ ] **Device detectado**: `adb devices` muestra el dispositivo como `device` (no `unauthorized`)
- [ ] **BASE_URL inyectada**: `--dart-define=BASE_URL=http://<MAC_IP>:3000/api`
- [ ] **Cleartext traffic permitido**: el `AndroidManifest.xml` ya tiene `android:usesCleartextTraffic="true"` ✓
- [ ] **Permiso INTERNET**: el `AndroidManifest.xml` ya tiene `<uses-permission android:name="android.permission.INTERNET" />` ✓

---

## 6. Troubleshooting

### 6.1 "List of devices attached" vacío o "unauthorized"

**Síntoma**: `adb devices` muestra el dispositivo como `unauthorized` o no aparece.

**Causa**: El dispositivo no ha sido autorizado o el cable no permite transferencia de datos.

**Solución**:
1. Desconecta y reconecta el cable USB
2. En el dispositivo, asegúrate de que el diálogo RSA aparezca y aceptalo (marca "Siempre permitir")
3. Si no aparece el diálogo, prueba otro cable USB
4. En la Mac: `adb kill-server && adb start-server && adb devices`
5. En el dispositivo: Ajustes → Opciones de desarrollador → "Revocar autorización USB", luego reconecta

### 6.2 "No route to host" o no puede conectar al backend

**Síntoma**: La app no puede resolver el backend, `curl` desde el dispositivo (si rooteado) falla con `No route to host`.

**Solución**:
1. Verifica que iPhone y Mac estén en la **misma subred**: en la Mac, `ipconfig getifaddr en0`; en el dispositivo, revisa la IP asignada por Wi-Fi
2. Asegúrate de usar `http://<MAC_IP>:3000/api` (no `localhost`, no `10.0.2.2`)
3. Verifica que el firewall de la Mac permita conexiones entrantes en el puerto 3000
4. Prueba desde otro dispositivo: `curl http://<MAC_IP>:3000/api/search?q=test`

### 6.3 Build falla con error de minSdk

**Síntoma**: El Gradle build falla indicando que alguna dependencia requiere un `minSdk` mayor al configurado.

**Solución**: 
- El minSdk actual es **24** (default de Flutter). Android 8 es API 26, por lo que es compatible.
- Si una dependencia nueva requiere API >26, modifica en `android/app/build.gradle.kts`:
  ```kotlin
  minSdk = 26  // o superior si la dependencia lo requiere
  ```

### 6.4 Integration test falla en "Searching..."

**Síntoma**: El test `app_test.dart` no encuentra `TrackResult-*` en los resultados de búsqueda.

**Causa común**: La app no pudo conectar al backend (BASE_URL incorrecto o la Mac no es alcanzable desde el dispositivo).

**Solución**:
1. Verifica `BASE_URL` con la IP correcta de la Mac
2. Prueba conectividad: desde el dispositivo Android (o desde otro device en la red), ejecuta:
   ```bash
   curl -s -w "HTTP: %{http_code}" "http://<MAC_IP>:3000/api/search?q=radiohead&limit=3"
   ```
3. Si falla, verifica firewall y que la interfaz Wi-Fi sea `en0` (la más común en macOS)

### 6.5 "dart:ui" o "android.view" errors en Android 8

**Síntoma**: Errores relacionados con APIs de Android no disponibles en Android 8.

**Solución**: 
- Android 8 soporta las APIs utilizadas por Flutter 3.44.6. Si ocurre un error específico, verifica que las dependencias no requieran API >26.
- Asegúrate de no usar APIs introducidas en Android 10+ (API 29+) sin verificación de versión.

---

## 7. Comandos de Diagnóstico Rápida

```bash
# === Environment ===
flutter --version                    # Flutter version
flutter doctor -v                  # Toolchain health
adb version                          # ADB version

# === Device ===
adb devices                          # Listar dispositivos conectados
flutter devices                      # Lista de devices reconocidos por Flutter

# === Backend ===
curl -s -w "\nHTTP: %{http_code}\n" \
  "http://$(ipconfig getifaddr en0):3000/api/search?q=test&limit=1"  # Health check en LAN
ps -o pid,rss,vsz,comm -p $(pgrep -f "tsx src/server.ts")  # Backend memory

# === App logs (Android) ===
flutter logs -d <deviceId> | grep -E "ApiService|PlayerProvider|MusicService"

# === Build verification ===
cd Spoti5_app && flutter build apk --debug  # Build de prueba (usa --debug para debugPrint)
```

---

## 8. Estado Actual del Entorno (2026-08-04)

| Componente | Estado | Detalle |
|------------|--------|---------|
| Flutter | Instalado ✓ | 3.44.6 stable |
| Android SDK | Instalado ✓ | 36.1.0, platforms: android-28, 34, 35, 36, 36.1 |
| ADB | Disponible ✓ | v37.0.1 en `/opt/homebrew/bin/adb` |
| minSdkVersion | 24 ✓ | Compatible con Android 8 (API 26) |
| Backend (Node.js) | Corriendo ✓ | `0.0.0.0:3000`, HTTP 200 en LAN |
| Mac LAN IP | `192.168.1.46` | Obtenido via `ipconfig getifaddr en0` |
| Dispositivo Android | ⚠️ Pendiente | Conectar vía USB y autorizar RSA |
| BASE_URL | Listo ✓ | `http://192.168.1.46:3000/api` |
| AndroidManifest permisos | ✓ | INTERNET + usesCleartextTraffic="true" |

---

## 9. Referencias Relacionadas

- [Preparación iOS Físico (WiFi y Celular)](./ios-physical-test-prep.md)
- [E2E Dispositivos Físicos](./e2e_mobile_fisicos.md)
- [E2E Emuladores](./e2e_mobile_emuladores.md)
- [Integration Guide](../integration_guide.md)

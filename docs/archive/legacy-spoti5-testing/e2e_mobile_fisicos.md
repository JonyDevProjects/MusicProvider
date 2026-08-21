# Pruebas E2E: Dispositivos Físicos (Android / iOS)

Probar la suite E2E (`integration_test/app_test.dart`) en dispositivos físicos tiene desafíos de red que difieren de los emuladores. 

## 1. El Problema de la IP LAN
A diferencia de los simuladores o la web, un dispositivo físico **NO PUEDE** apuntar a `localhost` ni a `10.0.2.2` para resolver hacia la Mac que está sirviendo el backend de `MusicProvider`. 

**Solución**: Ambos equipos (Mac y teléfono) deben estar en la misma subred Wi-Fi. La aplicación usará la IP LAN real de la Mac.

1. Abre tu terminal en la Mac y obtén tu IP:
   ```bash
   ipconfig getifaddr en0
   ```
   *(Anota esta `<MAC_IP>`, por ejemplo `192.168.1.128`)*

2. Pasa esta IP durante la ejecución de las pruebas inyectando una variable de compilación:
   ```bash
   --dart-define=BASE_URL=http://<MAC_IP>:3000/api
   ```

## 2. Configuración para iOS Físico

A diferencia de Android, probar en un iPhone requiere firma digital y CocoaPods.

### Prerrequisitos iOS Físico
1. **CocoaPods:** 
   Ve a la carpeta `ios/` e instala las dependencias (se creará el `Podfile`):
   ```bash
   cd ios && pod install && cd ..
   ```
2. **Firma de Apple (Team):**
   Abre el workspace en Xcode:
   ```bash
   open ios/Runner.xcworkspace
   ```
   Dirígete a la pestaña **Signing & Capabilities** de `Runner` y selecciona tu *Development Team*.

3. **Confiar en el Certificado de Desarrollo (CRÍTICO):**
   
   > [!IMPORTANT]
   > **Este paso es OBLIGATORIO** y es la causa más común del error "The Dart VM Service was not discovered after X seconds".
   
   Si es la primera vez que ejecutas una app con tu certificado de desarrollo en el dispositivo, **debes confiar manualmente en el certificado**:
   
   **En el iPhone/iPad:**
   1. Ve a **Configuración** → **General** → **VPN y gestión de dispositivos**
   2. Busca el perfil con tu Apple ID (ej: `Apple Development: tu@email.com (XXXXXXXXXX)`)
   3. Toca sobre él y selecciona **"Confiar en [nombre del perfil]"**
   4. Confirma la acción
   
   **¿Cómo saber si este es el problema?**
   - Aparece un diálogo **"Untrusted Developer"** en el dispositivo
   - Xcode muestra: `"Unable to launch com.example.app because it has an invalid code signature, inadequate entitlements or its profile has not been explicitly trusted by the user"`
   - Flutter timeout con: `"The Dart VM Service was not discovered after 60 seconds"`
   
   **Verificación:** Después de confiar en el certificado, la app debería instalarse y ejecutarse sin errores.

### Ejecución iOS (Validación Manual / Funcional con `flutter run --release`)

> [!NOTE]
> Para **validación manual funcional** (buscar y reproducir) en iPhone físico por red inalámbrica, usar `flutter run --release` es el flujo que funciona de forma fiable. El `flutter test` (integration_test) en iOS físico presenta barreras de automatización desatendida (Local Network Privacy Prompt, mDNS/VM Service timeout) — ver `ios_troubleshooting.md` y `manual_testing_results_2026-07-17_ronda3.md`.

Flujo validado paso a paso (sesión 2026-07-18, iPhone conectado vía Wi-Fi):

1. **Levantar el backend** (escucha en `0.0.0.0:3000`, no solo `localhost`):
   ```bash
   cd MusicProvider
   npm run dev:server
   ```

2. **Obtener la IP LAN de la Mac** (ambos en la misma subred Wi-Fi):
   ```bash
   ipconfig getifaddr en0
   # Ejemplo real de la sesión: 192.168.1.46
   ```

3. **Verificar el deviceId** del iPhone:
   ```bash
   flutter devices
   # Ejemplo: 00008101-000C2D492682001E (Jonathan's iPhone, wireless)
   ```

4. **Levantar la app en release** inyectando la IP LAN del backend:
   ```bash
   cd Spoti5_app
   flutter run --release -d 00008101-000C2D492682001E \
     --dart-define=BASE_URL=http://192.168.1.46:3000/api
   ```

**Notas importantes:**
- El iPhone físico **NO resuelve `localhost`** ni `10.0.2.2`; requiere la IP LAN real vía `--dart-define=BASE_URL`.
- `api_service.dart` ya resuelve `localhost` para iOS/Web/Desktop y `10.0.2.2` para Android emulator, pero el iPhone físico necesita la IP LAN inyectada manualmente.
- La primera instalación por Wi-Fi a veces falla en "Installing and launching"; relanzar el backend y la app (rebuild) lo resuelve.
- No usar `adb`/`idevice_id` (no están en PATH); el CLI de Android es `~/.local/bin/android` (no acepta `devices`). Usar `flutter devices` para listar.

### Ejecución iOS (Suite E2E `integration_test`)
Conecta el iPhone (por cable o confíalo vía red), verifica el `<deviceId>` con `flutter devices` y ejecuta:
```bash
flutter test integration_test/app_test.dart -d <deviceId> --dart-define=BASE_URL=http://<MAC_IP>:3000/api
```
> [!WARNING]
> En iOS físico este comando puede fallar por el Local Network Privacy Prompt del bundle de test (no se acepta automáticamente) y timeout del Dart VM Service vía mDNS. Prefiere el `flutter run --release` de arriba para validación funcional.

## 3. Configuración para Android Físico

### Ejecución Android
Activa la Depuración USB o "Wireless Debugging" en tu Android, verifica con `flutter devices` y ejecuta:
```bash
flutter test integration_test/app_test.dart -d <deviceId> --dart-define=BASE_URL=http://<MAC_IP>:3000/api
```

### Problemas conocidos de ADB (Wi-Fi)
> [!WARNING]
> Algunos fabricantes (ej. Huawei P30 Pro - Android 10) descartan silenciosamente la conexión `tcpip 5555` cuando se bloquea la pantalla o se desconecta el cable original, devolviendo un error de "Connection refused". Otros modelos (ej. Samsung S9+) sí retienen la sesión por horas. 

**Patrón de Retries:** Si en medio de un flujo de pruebas automáticas, el dispositivo físico lanza errores constantes de comunicación (e.g. `No route to host` o `VM Service not discovered`), detente y **verifica la red o conexión física manualmente** en lugar de hacer reintentos ciegos interminables.

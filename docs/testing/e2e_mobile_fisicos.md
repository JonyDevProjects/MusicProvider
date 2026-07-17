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

### Ejecución iOS
Conecta el iPhone (por cable o confíalo vía red), verifica el `<deviceId>` con `flutter devices` y ejecuta:
```bash
flutter test integration_test/app_test.dart -d <deviceId> --dart-define=BASE_URL=http://<MAC_IP>:3000/api
```

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

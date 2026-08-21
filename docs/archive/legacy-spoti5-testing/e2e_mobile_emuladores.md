# Pruebas E2E: Emuladores Android e iOS

Esta guía documenta los pasos para levantar emuladores de Android e iOS y ejecutar la suite de pruebas de integración de Flutter (`integration_test/app_test.dart`).

> [!IMPORTANT]
> El backend Node.js debe estar corriendo antes de ejecutar estas pruebas:
> ```bash
> cd MusicProvider
> npm run dev:server
> ```

## 1. Emulador Android (Vía Android CLI)

Para las pruebas automatizadas utilizamos la herramienta de línea de comandos `android` en lugar de abrir Android Studio pesado.

### Levantando el emulador
```bash
# Inicia un perfil creado (ej. medium_phone)
~/.local/bin/android emulator start medium_phone
```
Espera un par de minutos a que inicie el sistema Android y usa `flutter devices` para comprobar su nombre asignado (típicamente `emulator-5554`).

### Consideraciones de Red en Android
En un emulador de Android, `localhost` apunta al propio teléfono virtual, **no a la Mac**.
Por ello, la app utiliza la dirección IP especial `10.0.2.2` para resolver hacia la Mac host.

*(Esta configuración se encuentra activa de forma predeterminada para el emulador en `lib/services/api_service.dart`)*.

### Ejecutar Pruebas
```bash
cd Spoti5_app
flutter test integration_test/app_test.dart -d emulator-5554
```

## 2. Simulador iOS (macOS / Xcode)

### Levantando el simulador
Puedes abrirlo gráficamente con Xcode, o por línea de comandos usando `xcrun`:
```bash
xcrun simctl boot "iPhone 12 mini" && open -a Simulator
```

### Ejecutar Pruebas
Verifica el ID o nombre con `flutter devices` y ejecuta:
```bash
cd Spoti5_app
flutter test integration_test/app_test.dart -d <udid-del-simulador>
```
*Nota: iOS Simulator puede acceder a `localhost` directamente sin reglas adicionales especiales de red.*

# Troubleshooting: Pruebas E2E en iOS Físico

Esta guía documenta los problemas más comunes al ejecutar pruebas de integración en dispositivos iOS físicos y sus soluciones.

---

## Problema 1: "Untrusted Developer" / VM Service Timeout

### Síntomas
- **En el iPhone/iPad**: Aparece un diálogo **"Untrusted Developer"**
- **En Xcode**: 
  ```
  Unable to launch com.example.app because it has an invalid code signature, 
  inadequate entitlements or its profile has not been explicitly trusted by the user
  ```
- **En Flutter/CLI**: 
  ```
  The Dart VM Service was not discovered after 60 seconds
  ```

### Causa
El dispositivo **no confía en el certificado de desarrollo** de Apple. Esto ocurre la primera vez que se ejecuta una app firmada con un nuevo certificado o Apple ID.

### Solución

**En el dispositivo iOS:**

1. Ve a **Configuración** → **General** → **VPN y gestión de dispositivos**
2. Busca el perfil de desarrollo (ej: `Apple Development: tu@email.com (XXXXXXXXXX)`)
3. Toca sobre él
4. Selecciona **"Confiar en [nombre del perfil]"**
5. Confirma la acción

**Verificación:**
- La app debería instalarse correctamente
- El diálogo "Untrusted Developer" ya no aparece
- Flutter puede descubrir el VM Service

**Comando de prueba:**
```bash
cd Spoti5_app
flutter test integration_test/app_test.dart -d <deviceId> --dart-define=BASE_URL=http://<MAC_IP>:3000/api
```

---

## Problema 2: No route to host / Permiso de Red Local

### Síntomas
- Error: `"Connection failed (OS Error: No route to host, errno = 65)"`
- El backend funciona desde Safari en el iPhone, pero la app no puede conectarse
- El prompt de permiso de red local **no aparece** automáticamente

### Causa
Bug conocido de Flutter/iOS: el prompt de permiso de red local no se muestra automáticamente en modo debug. iOS requiere permiso explícito para acceder a la red local, pero el prompt no aparece cuando la app se ejecuta desde `flutter test` o `flutter run` en modo debug.

### Solución

**Paso 1: Ejecutar la app en modo profile**
```bash
cd Spoti5_app
flutter run --profile -d <deviceId> --dart-define=BASE_URL=http://<MAC_IP>:3000/api
```

**Paso 2: Abrir la app desde la pantalla de inicio**
- Busca "Spoti5 App" en la pantalla de inicio del iPhone
- Ábrela tocando el ícono

**Paso 3: Aceptar el permiso de red local**
- Aparecerá el prompt: "¿Quiere permitir que Spoti5 App encuentre y se conecte a dispositivos en su red local?"
- Toca **"Permitir"**

**Paso 4: Verificar funcionamiento**
- La app debería poder buscar y reproducir música
- Una vez aceptado el permiso, funcionará en todos los modos (debug, profile, release)

**Paso 5: Ejecutar pruebas E2E**
```bash
flutter test integration_test/app_test.dart -d <deviceId> --dart-define=BASE_URL=http://<MAC_IP>:3000/api
```

### ¿Por qué ocurre esto?
iOS requiere permiso explícito para acceder a la red local (LAN). La primera vez que una app intenta conectarse a una IP local, iOS debe mostrar un prompt de permiso. Sin embargo, hay un bug donde el prompt no se muestra automáticamente en modo debug. Ejecutar en modo profile fuerza a iOS a mostrar el prompt.

### Referencia
- [Flutter Issue #160326: iOS App Does Not Prompt for Network Permission on First Launch in Wi-Fi Environment](https://github.com/flutter/flutter/issues/160326)

---

## Problema 3: Developer Mode (iOS 16+)

### Síntomas
- No aparece la opción "VPN y gestión de dispositivos"
- La app se instala pero no se puede abrir
- Mensaje: "Developer Mode is required to run this app"

### Solución

1. Ve a **Configuración** → **Privacidad y seguridad**
2. Busca **"Modo de desarrollador"** (Developer Mode)
3. **Actívalo**
4. El dispositivo pedirá reiniciar
5. Después del reinicio, confirma activar el modo desarrollador

---

## Problema 4: Certificado Expirado

### Síntomas
- La app se instalaba antes pero ya no funciona
- Error en Xcode: "Code signature invalid" o "Provisioning profile expired"

### Solución

1. Abrir **Xcode** → **Preferences** → **Accounts**
2. Seleccionar tu Apple ID
3. Hacer clic en **"Manage Certificates"**
4. Si el certificado está expirado, eliminarlo y crear uno nuevo
5. En el proyecto: **Signing & Capabilities** → Seleccionar el nuevo certificado

---

## Problema 5: Dispositivo no reconocido

### Síntomas
- `flutter devices` no muestra el iPhone
- Xcode no detecta el dispositivo

### Solución

1. **Verificar cable USB:**
   - Usar cable original o certificado MFi
   - Probar otro puerto USB

2. **Confiar en la computadora:**
   - Al conectar el iPhone, aparece: "¿Confiar en esta computadora?"
   - Tocar **"Confiar"** e ingresar código de acceso

3. **Reiniciar servicios:**
   ```bash
   # Reiniciar el servicio de dispositivos de Xcode
   sudo killall -9 usbmuxd
   ```

---

## Problema 6: Connection refused / localhost apunta al dispositivo

### Síntomas
- Error: `"Connection refused (OS Error: Connection refused, errno = 61)"`
- URI muestra `http://localhost:3000/api/search?q=...`
- El backend funciona correctamente en la Mac
- La app web (Chrome) funciona sin problemas

### Causa
Cuando la app se ejecuta en un dispositivo iOS físico, `localhost` se refiere al **propio iPhone**, no a la Mac donde corre el backend. A diferencia de los emuladores (que mapean `localhost` al host), un dispositivo físico necesita la **IP LAN de la Mac** explícitamente.

### Solución

**Paso 1: Obtener la IP de la Mac**
```bash
ipconfig getifaddr en0
# Ejemplo: 192.168.1.128
```

**Paso 2: Ejecutar la app con `--dart-define`**
```bash
cd Spoti5_app
flutter run --release -d <deviceId> \
  --dart-define=BASE_URL=http://<MAC_IP>:3000/api
```

**Paso 3: Verificar conexión**
- La app debería poder buscar y reproducir música
- Las requests ahora apuntan a `http://192.168.1.128:3000/api` en lugar de `http://localhost:3000/api`

### ¿Por qué ocurre esto?
El código en `api_service.dart` usa `localhost` como fallback para iOS. Esto funciona en emuladores y web, pero en dispositivos físicos `localhost` se resuelve a la propia interfaz de red del dispositivo (127.0.0.1), donde no hay ningún servidor escuchando.

La app soporta `--dart-define=BASE_URL=...` para sobreescribir la URL del backend. Esta es la forma correcta de configurar la conexión para dispositivos físicos.

### Referencia
- Archivo: `Spoti5_app/lib/services/api_service.dart` — lógica de detección de `baseUrl`

---

## Checklist Pre-Ejecución

Antes de ejecutar pruebas E2E en iOS físico, verificar:

- [ ] **Certificado de desarrollo**: Confiar en el certificado en el dispositivo (Configuración → General → VPN y gestión de dispositivos)
- [ ] **Permiso de red local**: Aceptar el permiso ejecutando `flutter run --profile` primero
- [ ] **Developer Mode**: Activado (iOS 16+)
- [ ] **Red Wi-Fi**: Mac y iPhone en la misma subred
- [ ] **Personal Hotspot**: Desactivado
- [ ] **Backend corriendo**: `npm run dev:server` en el puerto 3000
- [ ] **IP de Mac**: Verificada con `ipconfig getifaddr en0`
- [ ] **BASE_URL configurado**: Usar `--dart-define=BASE_URL=http://<MAC_IP>:3000/api` en dispositivos físicos
- [ ] **Dispositivo conectado**: `flutter devices` lo muestra

---

## Comando Completo de Ejecución

```bash
# 1. Verificar dispositivo conectado
flutter devices

# 2. Obtener IP de la Mac
ipconfig getifaddr en0

# 3. Ejecutar prueba (reemplazar valores)
cd Spoti5_app
flutter test integration_test/app_test.dart \
  -d <deviceId> \
  --dart-define=BASE_URL=http://<MAC_IP>:3000/api
```

---

## Referencias

- [Flutter: Integration Testing](https://docs.flutter.dev/testing/integration-tests)
- [Apple: Trusting Developer Apps](https://support.apple.com/en-us/HT204460)
- [Flutter Issue #181480: VM Service Timeout](https://github.com/flutter/flutter/issues/181480)

---

*Última actualización: 18 de Julio 2026*

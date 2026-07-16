# Implementación y Pruebas de Spoti5_app

Este documento detalla la arquitectura implementada para la aplicación `Spoti5_app`, cómo funciona en conjunto con `MusicProvider`, y proporciona una guía exhaustiva para configurar el entorno de Flutter en macOS y probar el flujo completo.

> [!NOTE]
> **Contexto de Progreso:** 
> - **Punto de Partida:** El proyecto inició como una prueba de concepto en la que `MusicProvider` era únicamente un CLI de Node.js que ejecutaba `yt-dlp`.
> - **Avance 1 (Arquitectura):** Se migró el modelo a un formato Cliente-Servidor. `MusicProvider` ahora expone una API REST (Express) en `localhost:3000`.
> - **Avance 2 (Frontend):** Se creó el proyecto `Spoti5_app` en Flutter para consumir esta API usando `just_audio` y el patrón Provider, integrando todo en una sola vista con buscador y reproductor.
> - **Avance 3 (Entorno):** Se completó con éxito la configuración del SDK de Flutter global y la instalación de Xcode (App Store), alcanzando el estatus de **0 issues** en `flutter doctor`. Además, se hizo el scaffolding completo de las plataformas en `Spoti5_app` y se añadieron los permisos de red para macOS (`DebugProfile.entitlements` y `Release.entitlements`).

---

## 1. Resumen de la Implementación Arquitectónica

Para probar el concepto de `MusicProvider` (que interactúa con procesos binarios del sistema) a través de un reproductor universal en Flutter, la arquitectura se dividió en dos componentes:

### 1.1 Backend: Servidor Node.js (MusicProvider)
El código CLI original fue encapsulado en un servidor **Express.js** (`src/server.ts`). Esto permite que los métodos internos de extracción sean accesibles por red:
- **`GET /api/search`**: Llama a `ytdlpWrapper.search()`.
- **`GET /api/info`**: Llama a `ytdlpWrapper.getStreamInfo()` y devuelve la URL directa (stream en crudo m4a/webm) para su reproducción.
- **`POST /api/download`**: Permite descargar la pista en la carpeta `/downloads`.

### 1.2 Frontend: Cliente Flutter (Spoti5_app)
Ubicado en `Spoti5_app/`, es un proyecto Flutter estructurado con las siguientes piezas clave:
- **`just_audio`**: Motor de reproducción. Soporta HLS, DASH y streams directos asíncronos en iOS, Android, Web y Desktop.
- **Provider Pattern**: Gestiona el estado de reproducción (`lib/providers/player_provider.dart`), evitando interfaces bloqueantes.
- **`ApiService`**: Se comunica asíncronamente con el puerto local `3000` de Node.
- **UI Responsiva**: Usando Material 3, un `HomeScreen` y un `PlayerBar` fijo en la base simulan la experiencia de reproductores musicales modernos.

---

## 2. Guía de Configuración del Entorno Flutter (macOS)

Si al ejecutar el comando `flutter --version` el sistema responde con `command not found`, significa que el SDK de Flutter no está instalado o no está exportado en el `PATH` global. Sigue estos pasos:

### Paso 2.1: Instalar Rosetta 2 (Solo para Macs con Apple Silicon M1/M2/M3)
Si usas un Mac con procesador Apple Silicon, debes habilitar Rosetta 2, ya que algunas herramientas dependientes lo requieren.
```bash
sudo softwareupdate --install-rosetta --agree-to-license
```

### Paso 2.2: Descargar el SDK de Flutter
1. Ve al sitio web oficial: [Descargas de Flutter para macOS](https://docs.flutter.dev/get-started/install/macos).
2. Descarga el archivo `.zip` estable correspondiente a tu procesador (Intel o Apple Silicon).
3. Extrae el archivo en tu directorio de desarrollo, por ejemplo en `~/development`:
   ```bash
   mkdir -p ~/development
   cd ~/development
   unzip ~/Downloads/flutter_macos_arm64_*.zip
   ```

### Paso 2.3: Configurar el PATH Global
Para que el comando `flutter` esté disponible globalmente, añade la ruta al archivo de configuración de tu shell (normalmente `.zshrc` en macOS modernos).

1. Abre el archivo:
   ```bash
   nano ~/.zshrc
   ```
2. Añade esta línea al final del archivo (asegúrate de que la ruta coincida donde extrajiste la carpeta):
   ```bash
   export PATH="$PATH:$HOME/development/flutter/bin"
   ```
3. Guarda (`Ctrl+O`, `Enter`) y sal (`Ctrl+X`).
4. Recarga la configuración del terminal:
   ```bash
   source ~/.zshrc
   ```
5. Verifica la instalación:
   ```bash
   flutter --version
   ```

### Paso 2.4: Ejecutar Flutter Doctor
Ejecuta el asistente de diagnóstico que indicará si te faltan dependencias como Xcode (para macOS/iOS) o Android Studio:
```bash
flutter doctor
```
*(Actualmente este paso arroja 0 problemas para macOS/iOS gracias a la instalación exitosa de Xcode desde la App Store).*

### Paso 2.5: Configurar un Dispositivo Android (Set up an Android device)
Dado que has resuelto la configuración para macOS/iOS, falta preparar el entorno de simulación o conexión física para Android.

1. **Instalar Android Studio:**
   - Descarga [Android Studio](https://developer.android.com/studio) y arrástralo a la carpeta de Aplicaciones.
2. **Configurar el Android SDK:**
   - Abre Android Studio. Al iniciar, el asistente de configuración descargará el Android SDK, las Android SDK Command-line Tools y el Android SDK Build-Tools.
3. **Aceptar Licencias de Android:**
   - Abre tu terminal y ejecuta el siguiente comando para aceptar todas las licencias del SDK:
     ```bash
     flutter doctor --android-licenses
     ```
     *(Escribe `y` para aceptar cada una).*
4. **Configurar un Emulador (AVD):**
   - En Android Studio, ve a **Tools > Device Manager**.
   - Haz clic en **Create virtual device**.
   - Elige un perfil de dispositivo (por ejemplo, Pixel 7) y presiona **Next**.
   - Selecciona o descarga una imagen del sistema reciente (ej. API 34 o 35) y finaliza la creación.
   - En el Device Manager, presiona el botón de **Play (▷)** para lanzar el emulador.
5. **Configurar un Dispositivo Físico (Opcional):**
   - Habilita las **Opciones de desarrollador** y la **Depuración por USB** en tu teléfono Android.
   - Conecta el teléfono por USB (o Wi-Fi debugging).
   - Autoriza a la computadora cuando aparezca el mensaje en la pantalla del teléfono.
   
Una vez abierto el emulador (o conectado el dispositivo físico), el comando `flutter devices` te mostrará el entorno de Android como destino válido.

---

## 3. Pruebas del Flujo Completo

Una vez que Flutter esté instalado y configurado correctamente en el sistema, procede con la prueba de integración de ambos entornos.

### Paso 3.1: Levantar el Backend (MusicProvider)
Abre una terminal, navega al directorio raíz del proyecto y arranca el servidor local:
```bash
cd /Users/jonathanquishpe/JoniDev/MusicProvider
npm install
npm run dev:server
```
*Deberás ver en consola: `🚀 MusicProvider Server corriendo en http://localhost:3000`*.

### Paso 3.2: Levantar el Cliente (Spoti5_app)
Abre **una nueva pestaña o ventana** de terminal, instala las dependencias de Flutter y ejecuta la app.

```bash
cd /Users/jonathanquishpe/JoniDev/MusicProvider/Spoti5_app
flutter pub get
```

Puedes correr el proyecto en la plataforma que prefieras:

- **Para macOS nativo (Desktop):**
  ```bash
  flutter run -d macos
  ```
- **Para Web (Google Chrome):**
  ```bash
  flutter run -d chrome
  ```
- **Para Simulador iOS (Requiere Xcode y simulador abierto):**
  ```bash
  flutter run -d iPhone
  ```
- **Para Emulador Android:**
  ```bash
  flutter run -d Android
  ```

> **⚠️ AVISO PARA ANDROID:** Si pruebas en un emulador de Android nativo, el servidor que corre en tu Mac en `localhost` no es directamente accesible usando `localhost` desde dentro del emulador Android. Si vas a usar Android, abre `Spoti5_app/lib/services/api_service.dart` y cambia la constante `baseUrl` de `http://localhost:3000/api` a `http://10.0.2.2:3000/api`.

### Paso 3.3: Ejecución de Flujo Crítico en la UI
1. En la ventana de la aplicación de Flutter, haz clic en la **barra de búsqueda**.
2. Escribe el nombre de una canción o artista (ej. *"Radiohead Creep"*).
3. Presiona **Enter** o el botón de la flecha. *La app llamará al Node backend, y Node llamará a yt-dlp en background, devolviendo JSON.*
4. En la lista, haz tap sobre uno de los resultados.
5. El backend resolverá la mejor fuente de audio (M4A o WEBM puro).
6. El **PlayerBar** inferior de Flutter aparecerá o se activará y **comenzará el streaming en tiempo real** de la pista con `just_audio`.
7. Interactúa con la barra de progreso (Seek) y comprueba el Play/Pause.

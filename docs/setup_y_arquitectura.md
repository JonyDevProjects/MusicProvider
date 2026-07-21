# Setup y Arquitectura de Spoti5_app

Este documento detalla la arquitectura implementada para la aplicación `Spoti5_app`, cómo funciona en conjunto con `MusicProvider`, y proporciona una guía para configurar el entorno de desarrollo en macOS.

> [!NOTE]
> **Contexto de Progreso:** 
> - **Punto de Partida:** El proyecto inició como una prueba de concepto en la que `MusicProvider` era únicamente un CLI de Node.js que ejecutaba `yt-dlp`.
> - **Avance 1 (Arquitectura):** Se migró el modelo a un formato Cliente-Servidor. `MusicProvider` ahora expone una API REST (Express) en `localhost:3000`.
> - **Avance 2 (Frontend):** Se creó el proyecto `Spoti5_app` en Flutter para consumir esta API usando `just_audio` y el patrón Provider.
> - **Avance 3 (Entorno):** Se completó con éxito la configuración del SDK de Flutter global y la instalación de Xcode (App Store). Además, se hizo el scaffolding completo de las plataformas en `Spoti5_app` y se añadieron los permisos de red para macOS.

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
```bash
sudo softwareupdate --install-rosetta --agree-to-license
```

### Paso 2.2: Descargar el SDK de Flutter
Descarga el SDK desde la [web oficial de Flutter para macOS](https://docs.flutter.dev/get-started/install/macos), extráelo en una carpeta de desarrollo (ej. `~/development`).

### Paso 2.3: Configurar el PATH Global
Añade la ruta al archivo de configuración (`~/.zshrc`):
```bash
export PATH="$PATH:$HOME/development/flutter/bin"
```

### Paso 2.4: Ejecutar Flutter Doctor
Ejecuta el asistente de diagnóstico:
```bash
flutter doctor
```

### Paso 2.5: Configurar un Dispositivo Android
1. Instala [Android Studio](https://developer.android.com/studio).
2. Acepta licencias en la terminal: `flutter doctor --android-licenses`
3. Configura el emulador desde Android Studio (Tools > Device Manager).

---

## 3. Guía de Ejecución y Pruebas (Testing)

Para conocer cómo levantar el proyecto e interactuar con la aplicación, así como el detalle de las pruebas end-to-end implementadas (Playwright en Web, Emuladores Android/iOS, y dispositivos físicos reales), por favor consulta nuestra documentación dedicada en el directorio `testing/`:

👉 **[Ir a la Documentación de Testing](./testing/README.md)**

---

## 4. Documentación Relacionada

Para un análisis detallado de todas las dependencias del proyecto, incluyendo diagramas de flujo y justificación arquitectónica:

📄 **[Análisis de Dependencias](./dependency_analysis.md)**

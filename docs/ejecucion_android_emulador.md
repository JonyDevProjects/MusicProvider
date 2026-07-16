# Ejecución de Spoti5 en Emulador Android

Este documento detalla el paso a paso para configurar el entorno y levantar la aplicación Spoti5 en un emulador de Android nativo desde cero, utilizando la herramienta de línea de comandos `android` (Android CLI).

## 1. Instalación de Android CLI (Opcional si ya se tiene Android Studio)

Para facilitar la administración de emuladores sin necesidad de abrir Android Studio, se puede instalar la herramienta **Android CLI**.

En macOS (con chip Apple Silicon / ARM64), se instala ejecutando:

```bash
curl -fsSL https://dl.google.com/android/cli/latest/darwin_arm64/install.sh | bash
```

Esto instalará el ejecutable `android` en `~/.local/bin/android`.

## 2. Creación del Emulador Android

1. Primero, verificamos los perfiles disponibles para crear un dispositivo:
   ```bash
   ~/.local/bin/android emulator create --list-profiles
   ```
   *(Ejemplos de perfiles: `medium_phone`, `small_phone`, `medium_tablet`)*

2. Creamos el emulador utilizando uno de los perfiles (en nuestro caso, `medium_phone`):
   ```bash
   ~/.local/bin/android emulator create medium_phone
   ```
   *Nota: Este proceso descargará automáticamente la imagen del sistema (system image) correspondiente a la arquitectura de tu computadora.*

## 3. Arranque del Emulador

Una vez creado, levantamos el emulador con el comando:

```bash
~/.local/bin/android emulator start medium_phone
```

La ventana del dispositivo virtual aparecerá en la pantalla. Es necesario esperar un par de minutos la primera vez hasta que el sistema operativo Android termine su secuencia de arranque.

## 4. Configuración de Red para el Emulador

El servidor backend de Node.js corre localmente en el puerto `3000`. Sin embargo, para un emulador Android, `localhost` (o `127.0.0.1`) apunta al propio dispositivo Android, no a la Mac.

Por lo tanto, la dirección IP especial `10.0.2.2` se utiliza en Android para referirse a la máquina host (tu Mac).

**Pasos:**
1. Abre el archivo `Spoti5_app/lib/services/api_service.dart`.
2. Busca la constante `baseUrl`.
3. Cambia `http://localhost:3000/api` por `http://10.0.2.2:3000/api`:

```dart
class ApiService {
  // En emulador de Android usa 10.0.2.2 en vez de localhost.
  static const String baseUrl = 'http://10.0.2.2:3000/api';
  // ...
}
```

## 5. Ejecución del Servidor Backend

Antes de abrir la app, debes asegurarte de que el servidor de Node que procesa las descargas y búsquedas esté corriendo.

Desde la raíz del proyecto `MusicProvider`, ejecuta:

```bash
npm run dev:server
```
*(Deberás ver en la consola: `🚀 MusicProvider Server corriendo en http://localhost:3000`)*

## 6. Despliegue de la Aplicación Flutter

Finalmente, se compila y corre la aplicación en el emulador que acabamos de levantar.

1. Abre una nueva pestaña de la terminal y dirígete al directorio de la app Flutter:
   ```bash
   cd Spoti5_app
   ```
2. Lista los dispositivos conectados para verificar el nombre asignado al emulador (típicamente `emulator-5554`):
   ```bash
   flutter devices
   ```
3. Lanza la aplicación especificando el dispositivo:
   ```bash
   flutter run -d emulator-5554
   ```

Una vez terminada la compilación, Spoti5 se abrirá en la pantalla del emulador y podrás buscar canciones, conectándote exitosamente con el backend en segundo plano.

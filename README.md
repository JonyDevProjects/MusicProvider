# 🎵 MusicProvider (PoC para Nuclear)

Bienvenido al repositorio de **MusicProvider**. Este proyecto nació como un entorno aislado (Prueba de Concepto - PoC) para investigar, probar e iterar sobre la extracción de metadatos y streams de audio usando `yt-dlp`. 

El objetivo final de esta base de código es ser portada y consumida como un **Plugin de TypeScript** oficial dentro del reproductor principal, **Nuclear**.

## 🎯 Propósito del Proyecto

El ecosistema principal de Nuclear utiliza `yt-dlp` a través de un backend en Rust (Tauri). Sin embargo, era necesario un entorno de pruebas ágil puramente en TypeScript que pudiera:
1. Buscar pistas de audio de forma robusta.
2. Extraer metadatos (thumbnail, título, artista, duración).
3. Resolver la URL cruda del stream de mejor calidad (M4A/WEBM) sin tener que descargar el archivo completo.
4. Funcionar como un *sandbox* autónomo sin estar atado a la pesada arquitectura de Tauri.

## 🏗️ Estado Actual y Arquitectura

Actualmente, el proyecto ha evolucionado de un simple CLI de Node.js a una **arquitectura Cliente-Servidor** para permitir pruebas cruzadas (Móvil, Web y Escritorio). El ecosistema se divide en dos partes:

### 1. El Backend: MusicProvider (Node.js + Express)
En la raíz del proyecto se encuentra un módulo ECMAScript (ESM) en TypeScript que actúa como servidor REST.
- **Gestión Autónoma:** Identifica tu sistema operativo (Windows, macOS, Linux) y arquitectura, y descarga/actualiza automáticamente el binario oficial de `yt-dlp`.
- **Endpoints Expuestos:** `/api/search`, `/api/info`, `/api/playlist` y `/api/download`.

### 2. El Frontend: Spoti5_app (Flutter)
Ubicada en la carpeta `Spoti5_app/`, es una aplicación universal (iOS, Android, macOS, Web) diseñada para validar visualmente la fiabilidad del backend.
- Consume la API de Node.js local.
- Usa la librería `just_audio` para hacer streaming continuo remoto.
- Maneja su estado a través del patrón `Provider`.

## 🧗 Retos y Decisiones Técnicas en el Camino

Durante el desarrollo nos enfrentamos a diversos desafíos que moldearon la arquitectura actual:

- **Manejo de Memoria con Playlists Gigantes:** `yt-dlp` arroja información de forma masiva. Para evitar desbordamientos de memoria (OOM) o bloqueos en el parseo de JSON en Node.js, implementamos un recolector por eventos que procesa la salida estándar (`stdout`) en formato **NDJSON** (New Line Delimited JSON) línea por línea.
- **La Barrera Móvil (iOS/Android vs Python/Binarios):** El plan inicial era tener un reproductor móvil que usara el código de TypeScript. Sin embargo, los dispositivos móviles no pueden ejecutar binarios empaquetados de Linux/Mac ni dependencias de Python nativamente. Esto nos obligó a pivotar rápidamente: convertimos el motor de `yt-dlp` en un Servidor Backend, permitiendo que la App Móvil/Web sea un cliente ligero.
- **Sandbox de Apple en macOS:** Al testear la aplicación de Flutter compilada para macOS de forma nativa, las peticiones HTTP al localhost (hacia Node.js) eran bloqueadas por el sistema. Tuvimos que inyectar proactivamente los permisos de red `com.apple.security.network.client` en los *Entitlements* de depuración y producción de Xcode.
- **Bloqueos Anti-Bot de YouTube:** Extraer de listas directas fallaba por mecanismos de bloqueo. Por ello, centralizamos la validación usando el motor de búsqueda `ytsearchN:query` integrado en `yt-dlp`, probando ser mucho más robusto para extracción múltiple.

## 🚀 Cómo Empezar y Documentación

Toda la documentación arquitectónica, guías de instalación del entorno (SDK de Flutter, Xcode, Android Studio) y el **paso a paso para ejecutar el servidor y la aplicación** se encuentran documentados de forma pormenorizada en:

📄 **[Setup y Arquitectura (Spoti5)](./docs/setup_y_arquitectura.md)**
📄 **[Guía de Pruebas y E2E (Testing)](./docs/testing/README.md)**
📄 **[Contexto y Estado Original](./docs/contexto_y_estado.md)**

---
*Este proyecto utiliza IA conversacional como soporte de Pair-Programming y orquestación de agentes mediante directrices estrictas definidas en el directorio `.agents/`.*

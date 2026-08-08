# Guía de Onboarding: Proyecto MusicProvider

¡Bienvenido al proyecto MusicProvider! Este documento es el **punto de entrada principal** para cualquier desarrollador nuevo (o agente de IA). Aquí encontrarás el contexto general, cómo ha evolucionado la arquitectura y el estado actual del proyecto cruzando las observaciones registradas en **Engram** con la documentación existente.

---

## 1. Objetivo Principal del Proyecto

MusicProvider nació como una **Prueba de Concepto (PoC) "standalone"** para el proyecto principal **Nuclear**.
- **El Problema:** El backend de Nuclear (Rust) interactúa con `yt-dlp` para resolver streams y metadatos, pero probar flujos o debuggear cambios en la API de YouTube directamente en Nuclear es lento y complejo.
- **La Solución:** Crear un entorno aislado en **Node.js + TypeScript (ESM)** para iterar ágilmente sobre las descargas, el parseo de datos y el streaming, que luego pueda exportarse como un plugin compatible con `@nuclearplayer/plugin-sdk`.

👉 **Ver más:** [`contexto_y_estado.md`](./archive/contexto_y_estado.md) y [`architecture_mapping.md`](./nuclear_integration/architecture_mapping.md) (para ver qué migrará a Nuclear).

---

## 2. Evolución Arquitectónica (De CLI a Full-Stack)

El proyecto ha pasado por diversas iteraciones documentadas en la memoria del proyecto (Engram), pivotando para resolver limitaciones técnicas:

### Fase 1: CLI Node.js Wrapper
Se construyó la base como una herramienta CLI que descarga el binario `yt-dlp`, lo ejecuta en un proceso hijo (`spawn`), y parsea la salida en formato **NDJSON** (útil para procesar listas de reproducción gigantes sin desbordar memoria).
*Ref: Observaciones Engram #30.*

### Fase 2: Cliente-Servidor (Backend Proxy)
Para probar los streams en una interfaz real, el CLI se transformó en un **Servidor Express.js** (`src/server.ts` exponiendo `/api/search`, `/api/info`). Paralelamente, se creó **Spoti5_app**, un frontend en **Flutter** para simular la experiencia de un reproductor musical.
*Ref: [`01-setup_y_arquitectura.md`](./01-setup_y_arquitectura.md) y Obs #29, #32.*

### Fase 3: Exploración Standalone (Flutter Rust Bridge) - *Descartada*
Hubo un intento significativo de ejecutar `yt-dlp` de forma nativa directamente en Android sin depender del backend (macOS), compilando una librería en Rust vía Flutter Rust Bridge (FRB).
* **Bloqueos:**
  1. Los binarios oficiales de `yt-dlp` están linkeados contra `glibc`, mientras que Android usa `Bionic libc`, imposibilitando su ejecución.
  2. La CDN de YouTube devuelve `HTTP 403` si no se envía un header `User-Agent`, y los reproductores nativos (`audioplayers` / `just_audio`) presentaban limitaciones inyectando custom headers en Android.
*Ref: Observaciones Engram sobre Android Standalone, glibc vs Bionic.*

### Fase 4: Arquitectura Unificada (Estado Actual)
Tras los bloqueos de la Fase 3, se consolidó el **Backend Proxy (ApiService)** como la solución unificada y definitiva para **todas** las plataformas (Android, iOS físico, Web, macOS). Se revirtió el uso de Rust FRB y el servidor Node.js es requerido como intermediario confiable para sortear los bloqueos de la CDN.
*Ref: Observación Engram "Unified proxy playback architecture decision".*

---

## 3. Estado Actual y Componentes

Actualmente, el ecosistema se divide en:
1. **Backend Proxy (`/src`):** Servidor Node.js ESM. Resuelve búsquedas y extrae streams limpios utilizando `yt-dlp` local.
2. **Frontend (`/Spoti5_app`):** Interfaz multiplataforma (Web/Móvil/Desktop) desarrollada en Flutter. Usa un patrón Provider (`player_provider.dart`) para el manejo global del estado de reproducción.
3. **Ecosistema de Testing:** 
   - Playwright para tests end-to-end (E2E) de la plataforma Web (ya que Flutter integration tests no soporta Web).
   - Flutter integration tests para Desktop y Emuladores Móviles.
   👉 *Ver directorio [`/testing`](./testing/)*.
4. **Agentic Workflow:** El proyecto usa GitFlow (ramas `develop`, `feature/*`) y está gobernado por directrices de IA (`.agents/AGENTS.md`) usando Engram para persistir conocimiento (SDD workflows, OpenSpecs).
   👉 *Ver [`gitflow.md`](./reference/gitflow.md) y [`multi-agent-workflow-case-study.md`](./archive/multi-agent-workflow-case-study.md).*

---

## 4. Directorio de Documentación

Si eres nuevo, te recomendamos revisar estos documentos en el siguiente orden:

1. **[`01-setup_y_arquitectura.md`](./01-setup_y_arquitectura.md):** Para configurar tu entorno macOS (Flutter SDK, Node.js) y levantar el proyecto.
2. **[`testing/README.md`](./testing/README.md):** (O el directorio de pruebas) para saber cómo ejecutar las suites de prueba.
3. **[`archive/contexto_y_estado.md`](./archive/contexto_y_estado.md):** Detalles profundos del wrapper TypeScript y por qué usamos NDJSON.
4. **[`reference/dependency_analysis.md`](./reference/dependency_analysis.md):** Análisis de todas las librerías utilizadas (Express, just_audio, etc.) y patrones de integración.
5. **[`nuclear_integration/`](./nuclear_integration/):** Lectura obligatoria antes de exportar código de este proyecto al repositorio matriz **Nuclear**. Contiene guías y mapeos.

> **Pro-Tip para Dispositivos Físicos:** Si pruebas en un iPhone o Android físico, este no podrá resolver `localhost`. Debes conectar el dispositivo a la misma red WiFi de tu Mac, ejecutar el servidor escuchando en `0.0.0.0` y levantar la app de Flutter inyectando tu IP LAN real mediante `--dart-define=BASE_URL=http://<TU_IP_LAN>:3000/api`. *(Ref: Obs Engram "Levantar Spoti5 en iPhone físico con backend local")*.

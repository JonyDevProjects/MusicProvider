# Estrategia de Pruebas (Testing) - MusicProvider y Spoti5_app

Este directorio centraliza toda la documentación relacionada con las pruebas automatizadas y manuales, tanto para el backend de Node.js como para las diferentes plataformas del frontend en Flutter (Spoti5_app).

## 1. Pruebas Unitarias y de Integración del Backend

El backend incluye pruebas para validar la descarga del binario `yt-dlp`, la extracción de metadatos y las descargas físicas.

- **Stack:** Vitest
- **Ubicación:** `/tests/`
- **Ejecución:** `npm run test`

## 2. Pruebas de Widgets (Flutter)

Las pruebas aisladas de los componentes visuales de Flutter se ejecutan rápidamente sin necesidad de un emulador o un navegador completo.

- **Ejemplo destacado:** Verificación de que la barra de reproducción (`PlayerBar`) muestra la duración correcta del track (evitando bugs de duplicación de tiempo por parte del decoder de audio).
- **Ejecución:** 
  ```bash
  cd Spoti5_app
  flutter test test/player_bar_duration_test.dart
  ```

## 3. Pruebas End-to-End (E2E)

Las pruebas E2E verifican el flujo completo de la aplicación (Buscar -> Seleccionar Track -> Reproducir) interactuando con la interfaz gráfica e invocando al backend real.

> [!IMPORTANT]
> **Prerrequisito para todas las pruebas E2E:** 
> El servidor backend de Node.js DEBE estar corriendo localmente antes de iniciar cualquier prueba.
> ```bash
> npm run dev:server
> ```

Hemos documentado las particularidades, retos resueltos y flujos de ejecución en las siguientes guías detalladas:

- 🌐 **[E2E en Web (Playwright)](./e2e_web_playwright.md)**: Pruebas sobre CanvasKit simulando inputs nativos y utilizando el árbol semántico (`flt-semantics`).
- 📱 **[E2E en Emuladores (iOS / Android)](./e2e_mobile_emuladores.md)**: Cómo levantar el emulador Android CLI, el Simulador iOS y ejecutar `integration_test/app_test.dart`.
- 📲 **[E2E en Dispositivos Físicos](./e2e_mobile_fisicos.md)**: Configuración de Xcode, `--dart-define=BASE_URL` para LAN, y resolución de problemas comunes como caídas de ADB por Wi-Fi.

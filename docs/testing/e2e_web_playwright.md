# Pruebas E2E: Web (Playwright + Flutter CanvasKit)

Este documento detalla el proceso para ejecutar y comprender las pruebas End-to-End (E2E) de la interfaz web de Spoti5 utilizando Playwright contra el motor Flutter Web (CanvasKit).

## 1. Contexto

Para simplificar el entorno de pruebas, el servidor backend de Express (`src/server.ts`) se configuró para servir los archivos estáticos generados por la compilación de Flutter (`build/web`). Esto permite que Playwright solo necesite levantar y consultar un único servidor local (`http://localhost:3000`).

## 2. Retos de Flutter Web y Soluciones

Flutter Web usando CanvasKit no dibuja un DOM (Document Object Model) tradicional, sino que renderiza píxeles en un `<canvas>`. Esto rompe las herramientas estándar de Playwright. Para solucionarlo, implementamos las siguientes estrategias:

### A. Ausencia del DOM y Árbol de Accesibilidad
- **Problema:** Comandos como `getByPlaceholder` fallan por timeout.
- **Solución:** Inyectamos un clic sintético al iniciar la página para habilitar la accesibilidad de Flutter. 
  ```typescript
  // Forzamos la creación de <flt-semantics>
  page.evaluate(node => node.click())
  ```

### B. Simulación de Interacción (Inputs)
- **Problema:** Usar `fill('texto')` cambia el valor del HTML pero no dispara eventos en el motor de Flutter.
- **Solución:** Simulamos tecleo humano real:
  ```typescript
  await page.keyboard.pressSequentially('Radiohead Creep', { delay: 100 });
  await page.keyboard.press('Enter');
  ```

### C. Selectores Confiables y Estado Oculto
- **Problema:** Los nodos `<flt-semantics>` no tienen texto visible (están ocultos, opacity: 0) y usan atributos `aria-label`.
- **Solución:** 
  1. En Flutter, expusimos metadatos usando `Tooltip` y `Semantics`.
  2. En Playwright, buscamos por `aria-label` y esperamos a que se adjunten (`attached`) en lugar de ser visibles (`visible`).
  ```typescript
  // Selector por atributo aria-label
  page.locator('flt-semantics[aria-label*="TrackResult-Creep" i]').waitFor({ state: 'attached' })
  ```

## 3. Ejecución de las Pruebas

Para correr la suite multiplataforma (Chromium, Firefox, WebKit):

```bash
# Navegar a la raíz del proyecto MusicProvider
npx playwright test tests/e2e/spoti5.spec.ts
```

> [!NOTE]
> El archivo `playwright.config.ts` se encarga automáticamente de arrancar el `webServer` en el puerto `:3000` ejecutando `npm run dev:server`, por lo que no necesitas levantarlo manualmente para las pruebas Web de Playwright.

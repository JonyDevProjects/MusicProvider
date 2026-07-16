# Documentación de Pruebas E2E: Spoti5 Web con Playwright

Este documento detalla el proceso, los desafíos y las decisiones técnicas tomadas para implementar de forma exitosa las pruebas End-to-End (E2E) de la interfaz web de Spoti5 utilizando Playwright y el motor de Flutter Web (CanvasKit).

## Contexto y Objetivo
El objetivo principal era asegurar que el flujo completo de búsqueda y reproducción de música funcionara correctamente desde la plataforma web (Spoti5_app) integrándose con el backend en Node.js (MusicProvider). Las pruebas debían ejecutarse de forma automatizada en los navegadores Chromium, Firefox y WebKit a través de Playwright.

Para simplificar el entorno de pruebas, se configuró el servidor backend de Express (`src/server.ts`) para que sirviera los archivos estáticos de la compilación de Flutter (`build/web`). De esta manera, Playwright solo necesita levantar un único servidor en `http://localhost:3000`.

## Desafíos Encontrados y Resoluciones

Al intentar automatizar la aplicación de Flutter compilada para web (que por defecto utiliza el motor CanvasKit), surgieron una serie de problemas técnicos debido a la naturaleza del renderizado en un `<canvas>`, el cual carece de un DOM (Document Object Model) tradicional.

### 1. Ausencia del DOM y Árbol de Accesibilidad
**Problema:**
Playwright basa su interacción en la lectura del DOM (por ejemplo, buscar elementos por su texto, placeholder o rol). En Flutter Web con CanvasKit, la interfaz se dibuja gráficamente y el DOM está inicialmente vacío, lo que provocaba que comandos como `getByPlaceholder('Search songs...')` fallaran por *timeout*.

**Solución y Decisión:**
Flutter dispone de un árbol semántico (`<flt-semantics>`) para lectores de pantalla que puede ser utilizado para testing. Para que Flutter genere este árbol, inyecta un botón oculto al inicio. 
- **Decisión:** Se programó el script de Playwright para localizar el botón `"Enable accessibility"` inmediatamente después de cargar la página y forzar un clic sobre él.
- **Detalle técnico:** Se usó `page.evaluate(node => node.click())` en lugar del clic sintético de Playwright (`page.click()`), ya que el botón a menudo se posiciona fuera del viewport (fuera de pantalla) para no afectar visualmente el canvas, lo que causaba que las comprobaciones estrictas de visibilidad de Playwright fallaran.

### 2. Simulación de Interacción con Entradas de Texto
**Problema:**
Una vez habilitado el árbol semántico, el test lograba enfocar la barra de búsqueda y utilizaba el comando `fill('Radiohead Creep')`. Sin embargo, la búsqueda no se disparaba. El método `fill` manipula directamente el valor del input en el DOM y lanza un evento sintético, algo que Flutter muchas veces ignora al requerir eventos de hardware (teclado real).

**Solución y Decisión:**
- **Decisión:** Se reemplazó el uso de `fill()` por `pressSequentially('...', { delay: 100 })` seguido de un `page.keyboard.press('Enter')`.
- **Por qué:** `pressSequentially` emite eventos de `keydown`, `keypress` y `keyup` para cada carácter, engañando exitosamente al motor de Flutter Web haciéndole creer que un humano está tipeando. 

### 3. Falta de Selectores Confiables (Localización de Nodos Semánticos)
**Problema:**
A pesar de lanzar la búsqueda, el test fallaba al intentar verificar la aparición de la canción ("Creep") utilizando el comando `getByText('Creep')`. El problema radica en que los nodos `<flt-semantics>` generados por Flutter no contienen texto interno (inner text); en su lugar, utilizan atributos HTML como `aria-label`. 
Aunado a esto, los iconos (como el botón de "Enviar búsqueda") no contaban con un nombre accesible por defecto.

**Solución y Decisión:**
Se hizo necesario realizar adaptaciones directamente en el código fuente de la aplicación Flutter (`Spoti5_app/lib/screens/home_screen.dart`) para garantizar la "testeabilidad" de la interfaz:
1. **Botón de Búsqueda:** Se envolvió el `IconButton` en un widget `Tooltip(message: 'Search Button')`. Esto fuerza a Flutter a generar un `aria-label="Search Button"` identificable por Playwright.
2. **Resultados de Búsqueda:** Se envolvió cada elemento de la lista (`ListTile`) dentro de un widget `Semantics(label: 'TrackResult-${track.title}', button: true)`.
3. **Selectores en Playwright:** En los tests, en lugar de usar `getByText`, se empezó a usar selectores CSS que apuntan a los atributos aria: `page.locator('flt-semantics[aria-label*="TrackResult-Creep" i]')`.
4. **Validación de Estado Oculto:** Ya que los nodos semánticos suelen tener opacidad cero (`opacity: 0`) para ser invisibles a la vista del usuario, Playwright fallaba si se le pedía esperar por su visibilidad (`waitFor({ state: 'visible' })`). **La decisión** fue cambiar las aserciones a esperar a que el elemento estuviera **adjunto** al DOM (`waitFor({ state: 'attached' })`).

## Conclusión

El flujo de integración E2E finalmente se estabilizó de la siguiente manera:
1. Playwright navega a `http://localhost:3000`.
2. Habilita la accesibilidad de Flutter mediante evaluación de DOM.
3. Encuentra la barra de búsqueda por rol (`getByRole('textbox')`) y tipea el query simulando teclas reales.
4. Localiza el botón de envío usando su `aria-label` inyectado mediante un `Tooltip` y lo cliquea forzosamente.
5. Espera la aparición del nodo semántico del resultado de la canción (`TrackResult-Creep`).
6. Hace clic en la canción y valida que la barra del reproductor (`PlayerBar`) se actualice con el título de la canción simulada.

Las pruebas ahora ejecutan con éxito en menos de 6 segundos en **Chromium, Firefox y WebKit**, garantizando que el flujo desde el UI en CanvasKit hasta el binario de yt-dlp opere sin contratiempos.

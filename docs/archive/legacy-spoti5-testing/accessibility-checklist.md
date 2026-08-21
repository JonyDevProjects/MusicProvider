# Accessibility (a11y) Checklist — MusicProvider / Spoti5_app

Este documento sirve como guía para asegurar que la aplicación cumple con estándares de accesibilidad (ej. WCAG) en plataformas Web y Móviles.

## 1. Navegación por Teclado (Específico para Web/Desktop)
- [ ] **Focus Visible:** Todos los elementos interactivos (botones, inputs, sliders) muestran un indicador de foco claro cuando se navega con el tabulador.
- [ ] **Orden Lógico de Tabulación:** El orden al presionar `Tab` sigue un flujo visual lógico (de arriba a abajo, izquierda a derecha).
- [ ] **Acceso a todas las funciones:** Se puede realizar una búsqueda, seleccionar un resultado, pausar, reproducir y adelantar/atrasar usando únicamente el teclado.
- [ ] **Trampas de Teclado:** Asegurarse de que el usuario no quede "atrapado" en un componente (ej. modales) sin poder salir usando `Esc` o `Shift+Tab`.

## 2. Lectores de Pantalla (Screen Readers)
- [ ] **Etiquetas Descriptivas (Semantics/Aria):** Botones icónicos (ej. Play, Pause, Search) tienen etiquetas descriptivas (ej. `Semantics(label: 'Play/Pause', ...)` en Flutter).
- [ ] **Anuncio de Estado:** Los cambios dinámicos (ej. "Reproduciendo track...", "Error de conexión", "Cargando resultados") son anunciados por el lector de pantalla.
- [ ] **Imágenes con Texto Alternativo:** Las miniaturas de los videos/canciones tienen atributos alt o Semantics descriptivos (ej. `Thumbnail for [Nombre de la canción]`).
- [ ] **Roles Correctos:** Asegurar que los botones actúan como botones y los campos de entrada como campos de entrada ante el OS (usar los widgets correctos de Flutter).

## 3. Contraste y Diseño Visual
- [ ] **Contraste de Color:** El texto y los iconos importantes (como el PlayerBar) tienen suficiente contraste respecto a su fondo (idealmente 4.5:1 para texto normal).
- [ ] **Tamaño de Texto Dinámico:** La UI no se rompe y sigue siendo legible si el usuario aumenta el tamaño del texto en las opciones de accesibilidad del sistema operativo.
- [ ] **Uso del Color:** No se usa exclusivamente el color para transmitir información importante (ej. errores de red deben mostrar un icono + texto, no solo pintar la barra de rojo).

## 4. Interacciones y Táctil
- [ ] **Tamaño de Objetivos Táctiles (Tap Targets):** Botones de control de reproducción y elementos de lista tienen un área interactiva mínima de 44x44 pt (iOS) o 48x48 dp (Android).
- [ ] **Gestos Simples:** Tareas complejas pueden realizarse con gestos simples (sin obligar al uso de gestos multi-touch si existe alternativa de un solo toque).

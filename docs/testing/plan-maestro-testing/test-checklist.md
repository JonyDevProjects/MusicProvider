# Checklist de Testing Manual Formalizado — MusicProvider / Spoti5_app

Utilizar esta plantilla al realizar pruebas manuales en dispositivos físicos o emuladores cuando no exista cobertura E2E automatizada (o para sesiones de sanity check).

## Preparación del Entorno
- [ ] Compilar la aplicación para la plataforma objetivo (ej. `flutter build apk` o Run desde Xcode).
- [ ] Asegurarse de que el backend (Express u otro proxy) está corriendo.
- [ ] **Configuración del Endpoint / Proxy:** Apuntar la app al entorno correcto mediante `--dart-define=BASE_URL=<URL>/api` según la solución proxy que se esté probando:
  - *Desarrollo Local:* `http://<IP_LOCAL>:3000` (físicos) o `http://10.0.2.2:3000` (emuladores Android).
  - *Túnel Local (Fase 1 Actual):* Usar Cloudflare Tunnel (ej. `https://<tu-tunel>.trycloudflare.com`). Inícialo con `npm run dev:proxy`.
  - *Piped API (Fase 2 Futura):* URL pública de una instancia de Piped.
  - *VPS Backend (Fase 3 Futura):* URL de producción alojada en un servidor dedicado.

## 1. Búsqueda y Resultados (Search API)
- [ ] Ingresar una consulta válida (ej. "Radiohead Creep") y verificar que la lista se pueble con resultados correctos.
- [ ] Comprobar que los resultados muestran metadatos apropiados (Título, Duración, Miniatura).
- [ ] Ingresar una cadena de búsqueda vacía o causar un error de red y validar que la UI muestre un mensaje de error o estado vacío amigable.

## 2. Reproducción Básica (PlayerProvider / Proxy Stream)
- [ ] Hacer tap en un resultado de la búsqueda para iniciar la reproducción.
- [ ] Verificar que el reproductor maneje adecuadamente la latencia de red inicial y el buffering sin colapsar (especialmente importante a través de túneles remotos o VPS).
- [ ] Validar que el icono del PlayerBar cambie a "Pause" durante la reproducción activa.
- [ ] Presionar "Pause" y confirmar que el audio se detiene de inmediato.
- [ ] Presionar "Play" y confirmar que reanuda desde la misma posición de manera fluida.

## 3. Desplazamiento (Seeking / Range Headers)
- [ ] Arrastrar la barra de progreso manualmente hasta la mitad (aprox. 50% de la pista).
- [ ] Validar que el audio salte a esa posición y se reanude correctamente (esto verifica que el proxy reenvíe exitosamente los headers HTTP 206 / Range al CDN de YouTube).
- [ ] Verificar el comportamiento al arrastrar cerca del final de la pista (transición a estado detenido/completado).

## 4. Casos Límite, Red e Interrupciones
- [ ] **Background:** (Móvil) Bloquear la pantalla durante la reproducción. El audio debe continuar y, de estar implementado, mostrar controles nativos del OS.
- [ ] **Desconexión del Cliente:** Apagar WiFi/Datos en el dispositivo durante un stream. Validar que la app no colapse y arroje el error apropiado.
- [ ] **Caída del Proxy (Timeout/502):** Simular una caída del intermediario (ej. apagar el túnel de Cloudflare o el servidor Express) en plena reproducción. Verificar que el error sea manejado y que la UI informe del fallo.
- [ ] **Red Celular (iOS específico):** Validar reproducción en un iPhone físico usando únicamente datos móviles (esto asegura que el dominio del proxy o túnel sea accesible vía IPv6, saltándose los típicos fallos 403 del CDN local).
- [ ] **Fallback:** Al fallar la conexión con el Proxy (ej. API caída), verificar si la arquitectura del cliente invoca exitosamente el fallback (`YtExplodeService`).
- [ ] **CORS (Exclusivo Web):** Verificar en la plataforma Web que las peticiones al proxy remoto no estén bloqueadas por políticas de origen cruzado.

## 5. Accesibilidad (a11y)
- [ ] (Web) Navegar usando la tecla `Tab` verificando que los controles principales reciban enfoque.
- [ ] Revisar que botones como "Play", "Pause" y el campo de búsqueda tengan etiquetas legibles para lectores de pantalla.

# Registro de Pruebas Manuales (Fase 5 - Cierre)

**Plataforma:** iOS (iPhone Físico)
**Fecha:** 2026-08-11
**Contexto:** Pruebas manuales finales tras reemplazar el motor de búsqueda en el backend por `yt-search` (reduciendo la latencia de búsqueda de ~1.73s a ~0.76s).

## Protocolo Ejecutado

### 1. Entorno Local (LAN)
- **Configuración:** Dispositivo conectado a la misma red WiFi que el servidor local de Node.js.
- **Variable de Entorno:** `--dart-define=BASE_URL=http://<MAC_IP>:3000/api`
- **Resultados:**
  - **Arranque:** Aplicación inicia sin crashes.
  - **Búsqueda:** Búsqueda rápida, los resultados aparecen casi instantáneamente. Las miniaturas y la duración (texto parseado) mantienen compatibilidad con el widget `PlayerBar`.
  - **Reproducción:** El streaming carga con la velocidad esperada de caché.

### 2. Entorno Remoto (Cloudflare Tunnel)
- **Configuración:** Dispositivo usando red de datos móviles (Celular). Conectado al backend mediante URL pública de Cloudflare.
- **Variable de Entorno:** `--dart-define=BASE_URL=https://<TUNNEL_ID>.trycloudflare.com/api`
- **Resultados:**
  - **Búsqueda:** Búsqueda responde de forma consistente y fluida a través del proxy.
  - **Reproducción:** No hay regresiones respecto a la carga de metadatos o chunks vía HTTP parcial. `just_audio` resuelve los headers.

## Conclusión

El reemplazo del binario `yt-dlp` a `yt-search` en la lógica de búsqueda del backend no rompió la interfaz de Flutter. Los E2E y pruebas automatizadas (Fase 5) coinciden de manera fidedigna con la experiencia en el dispositivo. La refactorización y estabilización de MusicProvider son un rotundo éxito.

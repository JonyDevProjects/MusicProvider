# Spec: Fase 3 — Largo Plazo: Migración de Backend a VPS

**Status**: `pending`
**Rama**: `feature/proxy-long-vps`
**Rama base**: `feature/ios-streaming-proxy`
**Dependencias**: Fase 2 completada y validada (o Fase 1 si se decide saltar Piped)
**Fecha inicio**: TBD (post validación Fase 2)
**Objetivo**: Lograr independencia total de APIs de terceros moviendo el backend a un VPS con infraestructura estable.

---

## Problema

Las instancias públicas de Piped pueden caerse, ser bloqueadas, o tener rate limits estrictos. Para una app en producción se necesita un backend propio con disponibilidad garantizada.

## Hipótesis

Un VPS de bajo costo ejecutando el backend de Node.js + yt-dlp puede proveer la misma funcionalidad de proxy con estabilidad y escalabilidad adecuadas para producción.

---

## Requisitos Funcionales

### RF-3.1: Contenedor Docker del Backend
- **Como** desarrollador quiero un Dockerfile que empaquete el backend con todas sus dependencias para que pueda desplegarse en cualquier VPS.

**Criterios de aceptación**:
- [ ] Dockerfile basado en imagen Node.js LTS
- [ ] Instala `yt-dlp` y sus dependencias (Python, FFmpeg)
- [ ] Expone el puerto de la app (ej: 3000)
- [ ] Health check endpoint para monitoreo
- [ ] Variables de entorno configurables (no hardcodeadas)

### RF-3.2: Despliegue en VPS
- **Como** usuario quiero que la app se conecte a un VPS con IP estática y HTTPS para que la reproducción sea confiable y segura.

**Criterios de aceptación**:
- [ ] VPS con IP estática (Fly.io, Render, Hetzner, o AWS Lightsail)
- [ ] Dominio con SSL/TLS configurado (ej: `api.musicprovider.com`)
- [ ] Certificado HTTPS válido (Let's Encrypt o similar)
- [ ] Backend accesible públicamente vía HTTPS

### RF-3.3: Variables de Entorno en Flutter
- **Como** desarrollador quiero configurar la URL de producción en la app para que apunte al VPS en vez de localhost o tunnels.

**Criterios de aceptación**:
- [ ] Variable `API_BASE_URL` en `.env` apunta al VPS
- [ ] Configuración de producción separada de desarrollo
- [ ] No hay URLs de tunnels hardcodeadas en el código fuente

### RF-3.4: Monitoreo y Logs
- **Como** desarrollador quiero monitorear el consumo de recursos del VPS para prever costos y problemas de escala.

**Criterios de aceptación**:
- [ ] Logs de requests al endpoint de stream
- [ ] Métricas de CPU, memoria, y ancho de banda
- [ ] Alertas si el uso excede umbrales configurados
- [ ] Dashboard básico (opcional: Grafana, VPS built-in metrics)

---

## Requisitos No Funcionales

### RNF-3.1: Disponibilidad
- Uptime >= 99.5% (máximo ~3.6 horas de downtime al mes).

### RNF-3.2: Latencia
- Tiempo de respuesta del proxy < 500ms para requests de stream
- Tiempo total play en celular < 3 segundos

### RNF-3.3: Costo
- VPS debe costar < $10/mes para uso inicial
- Escalar horizontalmente si el consumo excede capacidades

### RNF-3.4: Seguridad
- HTTPS obligatorio
- Rate limiting para abusos
- No exponer puertos innecesarios

---

## Escenarios de Validación

### Escenario 1: Despliegue Exitoso
```
DADO que el Dockerfile está creado y testado localmente
CUANDO se despliega al VPS
ENTONCES el backend debería estar corriendo
Y el health check debería retornar 200 OK
Y el endpoint de stream debería ser accesible vía HTTPS
```

### Escenario 2: Reproducción en Producción
```
DADO que la app está configurada con la URL del VPS
CUANDO el usuario busca y reproduce una canción con datos celulares
ENTONCES el audio debería reproducirse sin errores
Y la latencia debería ser < 3 segundos
```

### Escenario 3: Monitoreo de Uso
```
DADO que el backend está desplegado en VPS
CUANDO pasan 7 días de uso normal
ENTONCES debería haber métricas de:
- Total de requests de stream
- Consumo promedio de CPU/memoria
- Ancho de banda total consumido
- Costo estimado del VPS
```

### Escenario 4: Escalamiento
```
DADO que el VPS está al 80% de CPU sostenido
CUANDo se detecta la carga alta
ENTONCES debería poder escalar verticalmente (más RAM/CPU)
O horizontalmente (más instancias) sin downtime significativo
```

---

## Tareas de Implementación

### DevOps / Infraestructura
- [ ] **T-3.1**: Elegir proveedor de VPS (comparar Fly.io vs Render vs Hetzner vs Lightsail)
- [ ] **T-3.2**: Crear Dockerfile para el backend (Node.js + yt-dlp + FFmpeg)
- [ ] **T-3.3**: Crear docker-compose.yml para desarrollo local
- [ ] **T-3.4**: Configurar VPS con IP estática y dominio
- [ ] **T-3.5**: Configurar SSL/TLS (Let's Encrypt o certificado del proveedor)
- [ ] **T-3.6**: Configurar health check endpoint
- [ ] **T-3.7**: Implementar rate limiting en el backend

### App Flutter
- [ ] **T-3.8**: Configurar `.env` con URL de producción del VPS
- [ ] **T-3.9**: Eliminar dependencias de tunnels en configuración
- [ ] **T-3.10**: Actualizar `ApiService` para usar URL de producción
- [ ] **T-3.11**: Configurar variables de entorno por ambiente (dev/staging/prod)

### Monitoreo
- [ ] **T-3.12**: Implementar logging de requests al endpoint
- [ ] **T-3.13**: Configurar métricas básicas de VPS (CPU, RAM, bandwidth)
- [ ] **T-3.14**: Definir alertas de umbrales
- [ ] **T-3.15**: Documentar costos y consumo en `session-log.md`

### Testing
- [ ] **T-3.16**: Prueba de estrés con múltiples requests simultáneos
- [ ] **T-3.17**: Prueba física en iPhone por 7 días con monitoreo
- [ ] **T-3.18**: Documentar resultados finales en `session-log.md`

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Costos de VPS escalan inesperadamente | Media | Alto | Monitorear uso; configurar alerts de billing; empezar con plan mínimo |
| yt-dlp requiere actualizaciones frecuentes | Alta | Medio | Automatizar updates en Docker; monitorear versiones |
| VPS tiene downtime por mantenimiento del proveedor | Baja | Alto | Elegir proveedor con SLA; tener plan de fallback a Piped |
| CDN de YouTube bloquea IP del VPS | Baja | Alto | Rotación de IPs; proxy encadenado; monitorear errores |

---

## Entregable

App en estado de producción con infraestructura estable, proxy propio, sin limitaciones de red para iOS celular.

---

## Criterios de Cierre

- [ ] Backend desplegado y accesible vía HTTPS
- [ ] Reproducción exitosa en iPhone por 7+ días
- [ ] Métricas de uso documentadas
- [ ] Costos mensuales < $10
- [ ] Sin dependencia de tunnels o instancias de terceros
- [ ] Resultados finales documentados en `session-log.md`

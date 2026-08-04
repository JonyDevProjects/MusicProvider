# Spec: Fase 2 — Medio Plazo: Integración de Piped API

**Status**: `pending`
**Rama**: `feature/proxy-mid-piped`
**Rama base**: `feature/ios-streaming-proxy`
**Dependencias**: Fase 1 completada y validada
**Fecha inicio**: TBD (post validación Fase 1)
**Objetivo**: Eliminar la necesidad de backend propio delegando el streaming a instancias públicas Piped.

---

## Problema

La Fase 1 valida el concepto de proxy, pero requiere que el usuario tenga macOS corriendo con un tunnel activo. Esto no es práctico para uso diario ni para distribución a otros usuarios.

## Hipótesis

Las instancias públicas de Piped (API open source de YouTube) ya proveen URLs de streaming que no están bloqueadas por los CDN, eliminando la necesidad de un backend propio.

---

## Requisitos Funcionales

### RF-2.1: Servicio de Integración con Piped
- **Como** desarrollador quiero un servicio `PipedService` que obtenga streams desde la API de Piped para que la app pueda reproducir audio sin backend propio.

**Criterios de aceptación**:
- [ ] `PipedService` consulta `https://pipedapi.kavin.rocks/streams/{videoId}`
- [ ] Parsea la respuesta y extrae las URLs de audio stream
- [ ] Selecciona la mejor calidad disponible (priorizar audio-only si existe)
- [ ] Retorna un modelo `StreamInfo` con URL, formato, y calidad
- [ ] Maneja errores de la API (404, timeout, rate limits)

### RF-2.2: Fallback a Instancias Alternativas
- **Como** usuario quiero que si una instancia de Piped falla, se intente con otra para que la reproducción no falle.

**Criterios de aceptación**:
- [ ] Lista de instancias públicas configurables (mínimo 3)
- [ ] Si una instancia retorna error, probar la siguiente automáticamente
- [ ] Log de cuál instancia fue usada exitosamente
- [ ] Timeout de 5 segundos por instancia antes de fallback

### RF-2.3: Configuración de la App
- **Como** desarrollador quiero configurar qué servicio de streaming usar (Piped vs proxy local) para flexible entre entornos.

**Criterios de aceptación**:
- [ ] Variable de entorno `STREAMING_MODE`: `piped` | `proxy` | `auto`
- [ ] En modo `auto`: intentar Piped primero, fallback a proxy si existe
- [ ] La app detecta automáticamente el modo al iniciar

---

## Requisitos No Funcionales

### RNF-2.1: Disponibilidad
- La app debe funcionar si al menos 1 de 3 instancias de Piped está activa.

### RNF-2.2: Latencia
- Tiempo de respuesta de Piped API < 2 segundos para obtener stream URL.
- Tiempo total play < 4 segundos en 4G/5G.

### RNF-2.3: Rate Limiting
- Implementar cache local de URLs de stream (TTL: 30 minutos) para evitar queries repetidas a Piped.

---

## Escenarios de Validación

### Escenario 1: Happy Path con Piped
```
DADO que la app está configurada en modo Piped
Y que la instancia principal de Piped está activa
CUANDO el usuario busca y reproduce una canción
ENTONCES la app obtiene el stream URL de Piped
Y el audio comienza a reproducirse sin backend propio
```

### Escenario 2: Fallback por Instancia Caída
```
DADO que la instancia principal de Piped está caída (timeout)
CUANDO la app intenta obtener el stream
ENTONCES intenta con la segunda instancia de la lista
Y si es exitosa, reproduce el audio
Y registra en logs cuál instancia funcionó
```

### Escenario 3: Todas las Instancias Caen
```
DADO que todas las instancias de Piped están caídas
CUANDO la app intenta obtener el stream
ENTONCES muestra un mensaje de error al usuario
Y sugiere intentar más tarde o cambiar a modo proxy
```

### Escenario 4: Cache de URLs
```
DADO que el usuario reprodujo una canción hace 10 minutos
CUANDO intenta reproducir la misma canción novamente
ENTONCES la app usa la URL cacheada (sin consultar Piped)
Y la reproducción es más rápida
```

---

## Tareas de Implementación

### App Flutter
- [ ] **T-2.1**: Investigar formato de respuesta de Piped API (`/streams/:videoId`)
- [ ] **T-2.2**: Crear modelo `StreamInfo` (url, format, quality, duration)
- [ ] **T-2.3**: Implementar `PipedService` con consulta a API
- [ ] **T-2.4**: Implementar lógica de fallback entre instancias
- [ ] **T-2.5**: Implementar cache local de URLs (SharedPreferences o similar)
- [ ] **T-2.6**: Crear configuración de modo streaming (`piped`/`proxy`/`auto`)
- [ ] **T-2.7**: Integrar `PipedService` con el reproductor de audio
- [ ] **T-2.8**: Actualizar `ApiService` para usar el servicio configurado

### Testing
- [ ] **T-2.9**: Prueba física en iPhone con 4G/5G
- [ ] **T-2.10**: Test de fallback simulando caída de instancia
- [ ] **T-2.11**: Medir tiempos de carga y documentar en `session-log.md`

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Instancias públicas de Piped son inestables | Alta | Alto | Mantener lista de 5+ instancias; considerar自托管 si es necesario |
| Piped API cambia sin previo aviso | Media | Medio | Versionar la integración; tener tests de contrato |
| Rate limiting agresivo en instancias públicas | Media | Alto | Cache local agresivo; backoff exponencial |
| URLs de Piped también son bloqueadas en cellular | Baja | Alto | Si ocurre, volver a Fase 1 (proxy propio) como fallback |

---

## Entregable

Reproducción celular estable sin servidor propio en macOS, usando instancias públicas de Piped.

---

## Criterios de Cierre

- [ ] Reproducción exitosa en iPhone con 4G/5G usando Piped
- [ ] Fallback entre instancias funciona correctamente
- [ ] Cache reduce consultas repetidas
- [ ] Tiempos de carga < 4 segundos
- [ ] Resultados documentados en `session-log.md`

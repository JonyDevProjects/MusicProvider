# Spec: Alternativa C — Separación de Contextos (Forks Especializados)

**Status**: `pending`
**Rama**: `feat/phase3-c-forks`
**Rama base**: `feat/phase3-decision` (o `develop` si se decide sin trial)
**Dependencias**: Resultados del benchmark (Fase 3.2) + decisión de la Fase 3.3 de evaluar C
**Fecha inicio**: TBD (post decisión Fase 3.3)
**Objetivo**: Dividir el proyecto en dos contextos especializados: `MusicProvider-Nuclear` como plugin puro (asume host con yt-dlp integrado en Rust/C++) y `MusicProvider-Spoti5` como servidor externo potente que pre-descarga y cachea para aliviar la batería/CPU del teléfono.

---

## Problema

Las restricciones de memoria, red y batería de un dispositivo móvil (Spoti5) son radicalmente distintas a las de una app de escritorio Electron/Tauri (Nuclear). Un solo código intenta servir a ambos sin optimizar para ninguno: el plugin debe asumir que el host ya tiene yt-dlp, y el server debe poder hacer descargas pesadas con `spawn`. Mezclar ambos contextos obliga a compromisos que ninguno necesita.

## Hipótesis

Separar los dos contextos permite que cada uno tome decisiones óptimas para su ecosistema: el plugin deja de arrastrar lógica de Express/descarga, y el server (variante Spoti5) se convierte en un servidor de pre-descarga y cache (rol de "servidor potente") que maximize la batería y el rendimiento móvil. El downsides (código duplicado) es aceptable si el benchmark muestra que cada contexto rinde mejor por separado.

---

## Requisitos Funcionales

### RF-C-1: Fork MusicProvider-Nuclear (plugin puro)
- **Como** desarrollador quiero un repo/rama `MusicProvider-Nuclear` enfocado 100% en el plugin de Nuclear para que su mantenimiento sea mínimo y especializado.

**Criterios de aceptación**:
- [ ] `src/server.ts`, `cli.ts` y la lógica de descarga/Express quedan fuera de este contexto (aislados o eliminados)
- [ ] `src/ytdlpSetup.ts` queda **descartado**: el plugin no descarga binarios (Nuclear gestiona yt-dlp en Rust; el plugin solo delega vía `api.Ytdlp`)
- [ ] El plugin registra providers en `onEnable` (instalación por UI sin perder el API)
- [ ] `child_process.spawn` NO existe en código del plugin (prohibido en TS plugins de Tauri)
- [ ] `getStreamUrl` válida inputs antes de llamar a `api.Ytdlp.getStream` (IDs malformados crashean el backend Rust)
- [ ] Se mantiene NDJSON parsing en el plugin (compartido con Rust) y scraping con `api.Http.fetch` (+ `Accept-Encoding: gzip, deflate, br`)

### RF-C-2: Fork MusicProvider-Spoti5 (servidor de pre-descarga y cache)
- **Como** desarrollador quiero que la variante Spoti5 sea un servidor externo potente que resuelva, pre-descargue y cachee para que el teléfono no haga trabajo pesado.

**Criterios de aceptación**:
- [ ] Expone la API REST necesaria para Spoti5 (`/api/search`, `/api/audio/resolve`, `/api/audio/stream` con Range, `/api/playlist`)
- [ ] Mantiene el transparent refresh 403 (Phase 2) del proxy
- [ ] Puede pre-descargar a disco/cache y servir desde ahí (rol de servidor potente que alivia CPU/batería móvil)
- [ ] SÍ puede usar `child_process.spawn` y binarios locales (contexto server, no plugin)

### RF-C-3: Contratos compartidos documentados
- **Como** desarrollador quiero que ambos forks compartan solo los contratos (DTOs y endpoints) mediante documentación para que cada uno pueda evolucionar sin romper al otro.

**Criterios de aceptación**:
- [ ] Los contratos de red de la variante Spoti5 están documentados (ej: un openapi/swagger o markdown de referencia)
- [ ] Los tipos `StreamData`/`TrackData` del Core original quedan como referencia de contrato para ambos forks
- [ ] Cualquier cambio de contrato se versiona y documenta (breaking changes explícitos)

### RF-C-4: Decisión de repositorios
- **Como** desarrollador quiero decidir si los forks viven en repos separados o en ramas/guardas dentro del mismo repo para que la operación diaria sea clara.

**Criterios de aceptación**:
- [ ] Se documenta la estructura elegida (2 repos vs monorepo/ramas) y su lógica
- [ ] El estado real del repo (rama `feat/phase-2-transparent-refresh`) se toma como punto de partida documentado

---

## Requisitos No Funcionales

### RNF-C-1: Latencia
- Plugin: sin degradación vs línea base (delta <= 100ms p95).
- Servidor Spoti5: latencia de resolución <= a la documentada en el benchmark para el modelo API (pre-descarga/cache mejorándola si es posible).

### RNF-C-2: RAM
- Host Nuclear: delega procesamiento a Rust (`api.Ytdlp`) → sin binarios extra en el proceso plugin.
- Teléfono Spoti5: sin trabajo de resolución/descarga pesada en el dispositivo (el servidor hace el trabajo).

### RNF-C-3: Distribución
- Plugin: `.zip` único vía CI (reutiliza ruta de Fase 4 del roadmap principal).
- Servidor Spoti5: imagen Docker o despliegue del proceso Express existente.

### RNF-C-4: Esfuerzo estimado
- Medio: la separación es principalmente estructural (leer/aislar código), no funcional. Estimación inicial 1–2 semanas; el mayor costo es el mantenimiento **continuo** de dos codebases.

---

## Escenarios de Validación

### Escenario 1: Plugin puro reproduce sin Express
```
DADO el fork MusicProvider-Nuclear sin server.ts
CUANDO se instala el plugin en Nuclear y se reproduce una pista
ENTONCES el audio suena sin errores
Y el proceso del plugin no usa spawn ni descarga binarios
```

### Escenario 2: Servidor Spoti5 sirve el catálogo pre-descargado
```
DADO el fork MusicProvider-Spoti5 corriendo como servidor
CUANDO Spoti5 solicita una pista ya pre-cacheada
ENTONCES el audio se sirve desde cache
Y el teléfono no ejecuta resolución yt-dlp local
```

### Escenario 3: Contratos compatibles
```
DADO el contrato de red documentado
CUANDO el plugin y el servidor evolucionan de forma independiente
ENTONCES los cambios de contrato rompen explícitamente (versionado documentado)
Y ningún consumidor queda silenciosamente roto
```

### Escenario 4: Sin locks de entorno cruzado
```
DADO el código del plugin
CUANDO se revisa el tree de imports
ENTONCES no hay imports de Express/descarga/CLI en el contexto plugin
Y el server no importa lógica del plugin SDK
```

---

## Tareas de Implementación

### Separación del repositorio
- [ ] **T-C-1**: Aislar de `MusicProvider-Nuclear`: quitar `server.ts`/`cli.ts`/`ytdlpSetup.ts` del flujo del plugin (ver `chore/isolate-nuclear-plugin` como precedente)
- [ ] **T-C-2**: Aislar `MusicProvider-Spoti5`: extraer server + descarga + cache a su propio contexto
- [ ] **T-C-3**: Documentar la estructura elegida (repos vs ramas) en `findings.md`

### Fortalecer el plugin (Nuclear)
- [ ] **T-C-4**: Verificar ausencia de `spawn` y descarga de binarios en el plugin
- [ ] **T-C-5**: Validación de inputs antes de `api.Ytdlp` + `source.provider` alineado
- [ ] **T-C-6**: Mantener scraping con `api.Http.fetch` (+ `Accept-Encoding`)

### Fortalecer el servidor (Spoti5)
- [ ] **T-C-7**: Implementar pre-descarga/cache a disco en la variante Spoti5
- [ ] **T-C-8**: Verificar transparent refresh 403 y Range 206

### Contratos y verificación
- [ ] **T-C-9**: Documentar contrato de red de la variante Spoti5
- [ ] **T-C-10**: Tests de integración del server y del plugin según corresponda
- [ ] **T-C-11**: Medir latencia/RAM post-separación contra RNF-C-1/C-2
- [ ] **T-C-12**: Actualizar `findings.md`, `session-log.md` y Engram

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Esfuerzo de mantenimiento duplicado (dos codebases) | Alta | Alto | Contratos documentados + CI en ambos; delegar en CRIs; evaluar que el coste se justifique con los resultados del benchmark |
| Divergencia silenciosa de comportamiento (parsing, cache) | Media | Alto | Mantener los tipos de Core originales como contrato de referencia y tests compartidos para los módulos puros |
| El servidor Spoti5 exige infra (VPS/túnel) para pre-descarga | Media | Medio | Reutilizar el trabajo del roadmap de proxy; el pre-cache puede ser early-stage local/lan |
| La separación degrada la velocidad de iteración del equipo | Media | Medio | Proceso de cambio documentado (contratos primero); revisar al mes si la promesa de rendimiento se cumple |

---

## Entregable

Dos contextos especializados operativos: plugin puro para Nuclear (sin Express ni binarios propios) y servidor de pre-descarga/cache para Spoti5, con contratos documentados y rendimiento verificado por plataforma.

---

## Criterios de Cierre

- [ ] Contexto Nuclear: sin `server.ts`/`cli.ts`/`ytdlpSetup.ts`/`spawn` en el flujo del plugin
- [ ] Contexto Spoti5: server con pre-descarga/cache y transparent refresh 403 verificado
- [ ] Contratos de red documentados y versionados
- [ ] Latencia/RAM dentro de umbrales RNF-C-1/C-2 (verificado post-separación)
- [ ] Estructura de repos elegida y documentada
- [ ] Resultados y tradeoffs documentados en `findings.md`, `session-log.md` y Engram
# Spec: Fase 3.1 — Benchmark (API model vs Integrated plugin model)

**Status**: `ready-for-implementation`
**Rama**: `feat/phase3-benchmark`
**Rama base**: `feat/phase-2-transparent-refresh`
**Dependencias**: Fase 3.0 completada (inventario + métricas de línea base) y `feat/phase3-benchmark` creada
**Fecha inicio**: TBD (post Fase 3.0)
**Objetivo**: Producir datos comparables entre el modelo API (Express → Flutter) y el modelo Integrado (Plugin JS → host nativo Nuclear) para alimentar la matriz de decisión de la Fase 3.3.

---

## Problema

Se está por decidir el futuro arquitectónico de MusicProvider (Nuclear vs Spoti5, alternativas A/B/C/D) sin datos medidos. Decidir por intuición en un punto de inflexión tan estructural es un riesgo alto: puede condenar meses de esfuerzo del lado equivocado.

## Hipótesis

Un benchmark controlado (misma lista de tracks, misma red, mismos escenarios) permite cuantificar las diferencias reales de latencia, RAM y fricción de distribución entre ambos modelos. Con esos datos, la matriz de decisión de la Fase 3.3 deja de ser opinión y pasa a ser evidencia.

---

## Requisitos Funcionales

### RF-B.1: Harness de benchmark para el modelo API (Express)
- **Como** desarrollador quiero un harness que mida la latencia tap-to-audio del flujo `Spoti5/ApiService → Express → yt-dlp → CDN` para que la comparación con el modelo integrado sea justa.

**Criterios de aceptación**:
- [ ] Script ejecutable desde un solo comando (`npm run benchmark:api`)
- [ ] Mide desde la invocación de `getStream`/`/api/audio/resolve` hasta el primer byte de audio recibible por el cliente
- [ ] Reporta media, p50, p95 y p99 por track
- [ ] No requiere dispositivo móvil para el caso loopback (usuario físico opcional)

### RF-B.2: Harness de benchmark para el modelo integrado (plugin JS → Nuclear)
- **Como** desarrollador quiero un harness que mida la latencia del flujo `NuclearPlugin → api.Ytdlp.getStream (Rust) → CDN` para que la comparación con el modelo API sea justa.

**Criterios de aceptación**:
- [ ] Ejecuta la misma lista de tracks que el modelo API
- [ ] Reporta las mismas estadísticas (media, p50, p95, p99)
- [ ] Documenta si la medición ocurre dentro del host Nuclear (Tauri) o contra el SDK de forma aislada
- [ ] Si usa el host real, valida que `source.provider` coincide con `STREAMING_ID` (evitar `searchForTrack` redundante que contamina la medición)

### RF-B.3: Metodología de medición de RAM
- **Como** desarrollador quiero una metodología reproducible para medir la RAM del host en ambos modelos para que la dimensión de consumo sea comparable.

**Criterios de aceptación**:
- [ ] Medición del host Nuclear con plugin cargado y con plugin descargado (delta aislable)
- [ ] Medición del proceso Express (baseline del modelo API)
- [ ] Ventana: todo un track completo (o 3 minutos si es más corto que la pista)
- [ ] Muestreo cada 1s; reporta pico, media y RSS
- [ ] Documenta la plataforma y versión de OS/tooling usados

### RF-B.4: Rúbrica de fricción de distribución
- **Como** desarrollador quiero evaluar la facilidad de distribución de cada modelo con una rúbrica que dé un puntaje comparable.

**Criterios de aceptación**:
- [ ] Rúbrica que puntúa 1–5: artefactos a generar, pasos de instalación, requisitos de infraestructura, tiempo de setup
- [ ] Aplicada a: distribución del plugin `.zip` en Nuclear vs distribución del backend Express (local/túnel/VPS)
- [ ] Resultado registrado en `findings.md` como dato de entrada a la matriz (criterio "Facilidad de distribución", 20%)

### RF-B.5: Reproducibilidad del benchmark
- **Como** desarrollador quiero que el benchmark sea reproducible para que los resultados puedan ser auditados o re-ejecutados.

**Criterios de aceptación**:
- [ ] Misma lista fija de tracks (≥10) en ambos modelos
- [ ] Mismas condiciones de red (local/loopback controlada; documentada si es dispositivo)
- [ ] 3 runs por track; se reporta min, mediana, media y desviación
- [ ] El estado de cache (frío/caliente) se declara y controla para ambos modelos
- [ ] Un README breve explica cómo re-ejecutar el benchmark

---

## Requisitos No Funcionales

### RNF-B.1: Cobertura
- Mínimo **10 tracks distintos** por escenario, elegidos de la lista fija de reproducibilidad.
- Máximo 1 escenario fallido por track (si falla, se marca como `failed` y se registra el error, sin sustituir silenciosamente).

### RNF-B.2: Repeticiones
- **3 runs** por track; se reporta intervalo con desviación estándar.
- Si la desviación entre runs supera el 20% de la media, el run se repite y se anota inestabilidad.

### RNF-B.3: Estadísticas
- Se reportan p50, p95, p99 y media para latencia.
- Se reportan pico, media y RSS para RAM.

### RNF-B.4: Condiciones de red
- Latencia: red local controlada (loopback) para aislar el costo del salto Express; si se usa dispositivo físico, cada run declara la red (WiFi local) y se re-ejecuta completo.
- Respetar cooldowns de YouTube (ver `docs/archive/ios-cellular-playback`): máximo 2 intentos de reproducción por pista por sesión de medición intensiva.

### RNF-B.5: Herramienta y plataforma
- Harness en Node/TypeScript (ESM, alineado con el repo) bajo `benchmarks/`.
- Plataforma de medición documentada (macOS/Darwin + versión).

### RNF-B.6: Duración de sesión
- Una sesión de medición completa (API + integrado) no debe exceder la ventana en la que la red/entorno se considera estable (idealmente < 2 horas; si excede, dividir en 2 sesiones y anotar drift).

---

## Escenarios de Validación

### Escenario 1: Comparación de latencia por track
```
DADO que ambos harnesses (API e integrado) tienen la misma lista de 10 tracks
CUANDO se ejecuta el benchmark completo
ENTONCES cada track reporta media, p50, p95 y p99 en ambos modelos
Y el delta de latencia entre modelos queda calculado y volcado en findings.md
```

### Escenario 2: Reproducibilidad
```
DADO un escenario con la misma lista de tracks en la misma red
CUANDO se ejecuta 2 veces con una pausa entre runs
ENTONCES las medias reportadas no difieren más del 20% entre ejecuciones
```

### Escenario 3: RAM del host aislable
```
DADO el host Nuclear funcionando
CUANDO se miden procesos con y sin el plugin MusicProvider
ENTONCES el delta de RAM entre ambos estados queda documentado
Y el delta es interpretable como costo del plugin (evitando conteo del proceso completo)
```

### Escenario 4: Rúbrica de distribución aplicable
```
DADO la rúbrica de fricción (RF-B.4) y ambos modelos
CUANDO se puntúan 5 criterios (artefactos, pasos, infra, tiempo, requisitos)
ENTONCES cada modelo obtiene un puntaje total comparable registrado en findings.md
```

---

## Tareas de Implementación

### Configuración del harness
- [ ] **T-B.1**: Crear `benchmarks/` y estructura base (runner compartido, definición de tracks y red)
- [ ] **T-B.2**: Definir lista fija de 10 tracks (variedad de duración y tipo: canciones cortas, largas, mixes)
- [ ] **T-B.3**: Implementar métricas comunes (p50/p95/p99, media, min, max, stddev)

### Harness modelo API
- [ ] **T-B.4**: Implementar `benchmarks/model-api.ts` sobre `/api/audio/resolve` + `/api/audio/stream` (Express)
- [ ] **T-B.5**: Instrumentar cache frío vs caliente (declarar y medir ambos estados)
- [ ] **T-B.6**: Script `npm run benchmark:api`

### Harness modelo integrado
- [ ] **T-B.7**: Implementar `benchmarks/model-integrated.ts` vía `api.Ytdlp.getStream` (delegación Rust) con validación de `source.provider`
- [ ] **T-B.8**: Documentar si la medición es en host Nuclear real o SDK aislado
- [ ] **T-B.9**: Script `npm run benchmark:integrated`

### RAM y distribución
- [ ] **T-B.10**: Implementar muestreo de RAM (proceso Tauri Nuclear con/sin plugin y proceso Express)
- [ ] **T-B.11**: Definir y aplicar rúbrica de fricción de distribución (RF-B.4)
- [ ] **T-B.12**: Registrar mediciones de RAM y rúbrica en `findings.md`

### Recolección y reporte
- [ ] **T-B.13**: Ejecutar escenarios API e integrado completos (3 runs × 10 tracks)
- [ ] **T-B.14**: Ejecutar verificación de reproducibilidad (2 ejecuciones)
- [ ] **T-B.15**: Volcar todos los resultados en `findings.md` (sección Fase 3.2) y actualizar `session-log.md`
- [ ] **T-B.16**: Guardar datos crudos (JSON/CSV) bajo `benchmarks/results/` para auditoría

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Rate limiting / bot detection de YouTube distorsiona mediciones | Alta | Alto | Lista fija, cooldowns, cache controlado, red local; marcar runs inválidos |
| No se puede aislar la RAM del plugin dentro del host Nuclear | Media | Alto | Medir proceso Tauri/Rust completo y usar delta con/sin plugin |
| El scraping HTML de YouTube cambia durante el benchmark | Media | Medio | Congelar versión del wrapper durante la medición; documentar versión |
| Medir el modelo integrado sin host real contamina resultados | Media | Alto | Declarar el modo de medición en cada tabla; preferir host real |
| El dispositivo móvil (Spoti5) no está disponible para el caso real | Media | Medio | Loopback primero; marcar sesgo de dispositivo en `findings.md` |

---

## Entregable

`docs/future-roadmap/phase3/findings.md` con la sección **Fase 3.2 — Ejecución del Benchmark** poblada: resultados de latencia, RAM y rúbrica de distribución para ambos modelos, con reproducibilidad verificada y datos crudos en `benchmarks/results/`.

---

## Criterios de Cierre

- [ ] Harness API e integrado creados y ejecutables (`npm run benchmark:api`, `npm run benchmark:integrated`)
- [ ] Mismo set de ≥10 tracks corrido en ambos modelos
- [ ] 3 runs por track con estadísticas (p50/p95/p99, media, stddev) reportadas
- [ ] RAM del host Nuclear con/sin plugin medida y delta documentado
- [ ] Rúbrica de fricción de distribución aplicada a ambos modelos
- [ ] Reproducibilidad verificada (2 ejecuciones, delta < 20%)
- [ ] Datos crudos guardados en `benchmarks/results/`
- [ ] Resultados completos volcados en `findings.md` y `session-log.md`
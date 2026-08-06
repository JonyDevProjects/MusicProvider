# Roadmap Multi-Agente: Unified Proxy Playback

**Rama base**: `develop` (o una rama específica creada a partir del commit `a08f0b2`)
**Objetivo**: Consolidar el Backend Proxy (`ApiService`) como la solución única y estable para la reproducción de audio en todas las plataformas (Android, iOS, macOS), revirtiendo las pruebas inestables de reproducción standalone (Soluciones B y C).

---

## Estrategia de Branching

Se creará una nueva rama desde el último commit estable donde el proxy funcionaba para iOS físico y Android no estaba alterado por los experimentos de `just_audio` ni de Rust FRB.

```
develop
  └── feature/unified-proxy-playback  ← rama donde consolidaremos el proxy
```

*Nota: Alternativamente, si se decide continuar desde el HEAD de `develop`, la Fase 1 será realizar revert commits controlados de las soluciones B y C.*

---

## Fase 1 — Rollback a la Línea Base Estable

**Agente**: Antigravity (implementación)

**Objetivo**: Eliminar el código inestable (Rust FRB, `just_audio`) y volver al estado comprobado.

- [x] Identificar el commit estable. Sugerencia: `a08f0b2` (docs(testing): add iOS physical test preparation guide), inmediatamente después del merge del túnel de iOS.
- [x] Crear la rama `feature/unified-proxy-playback` a partir de ese commit.
- [x] Verificar que el archivo `pubspec.yaml` vuelve a depender de `audioplayers` y no contiene configuraciones de Rust.
- [x] Verificar que la inicialización de `RustLib.init()` ya no existe en `main.dart`.
- [x] Correr `flutter clean` y `flutter pub get` para limpiar artefactos nativos antiguos.

---

## Fase 2 — Estandarización de `ApiService`

**Agente**: Antigravity (implementación)

**Objetivo**: Asegurar que `ApiService` sea el servicio predeterminado y robusto para todas las plataformas (incluyendo Android).

- [x] Modificar `MusicServiceFactory` para que `ApiService` sea la prioridad absoluta en **todas** las plataformas.
- [x] Mejorar la lógica de fallback: Si `ApiService` falla (ej. túnel caído), intentar usar `YtExplodeService` solo como un graceful fallback temporal, aunque se sepa que puede fallar por CDN.
- [x] Añadir feedback visual en la UI cuando la app intente conectarse al backend o al túnel y no esté disponible.
- [x] Asegurarse de que el manejo de `BASE_URL` a través de `--dart-define` aplique limpiamente a Android físico y emuladores.

---

## Fase 3 — Optimizaciones en el Backend (Opcional pero Recomendado)

**Agente**: OpenCode / CommandCode

**Objetivo**: Hacer que el backend proxy (`src/server.ts`) sea más resiliente.

- [x] Verificar la caché LRU (ya implementada) y ajustar sus tiempos de TTL si es necesario.
- [x] Agregar reconexión automática o logs más descriptivos cuando el stream de YouTube (`206 Partial Content`) se corte repentinamente.
- [x] Estandarizar scripts en `package.json` para facilitar el levantamiento del backend + túnel de Cloudflare en un solo paso (`npm run dev:proxy`).

---

## Desviaciones y Hallazgos durante la Implementación

Durante la ejecución de las fases 1 a 3 surgieron las siguientes desviaciones no contempladas originalmente:

1. **Conflictos de Git al crear la rama base**: Al intentar cambiar al commit `a08f0b2`, Git bloqueó el proceso debido a que existían archivos binarios sin trackear (`.so`) y cambios no confirmados de los experimentos de Android standalone. Se tuvo que aplicar un `git stash` para aislar esos cambios sucios antes de poder crear la rama estable.
2. **Fallos en Suite de Pruebas Unitarias (`flutter test`)**: Una vez estandarizada la arquitectura a `ApiService`, los tests empezaron a fallar por dos motivos que no estaban en el plan original:
   - **Tests del Factory**: El archivo `music_service_factory_test.dart` estaba altamente acoplado a la vieja lógica condicional (esperaba encontrar `YtdlpNativeService` en Android). Tuvo que ser refactorizado para esperar a `ApiService` como primario en todas las plataformas.
   - **Test de Benchmarks en Rust**: El archivo `benchmark_test.dart` testeaba exclusivamente la inicialización e invocación del binario nativo de yt-dlp. Al abandonar este approach, este archivo tuvo que ser eliminado completamente para evitar compilaciones erróneas.

---

## Fase 4 — Validación End-to-End

**Agente**: Usuario (testing físico) + CommandCode (coordinación)

**Objetivo**: Demostrar que el reproductor funciona sin fallos en todas las plataformas objetivo.

### 4.1. Prueba en Android (Físico / Emulador)
- [ ] Levantar backend local.
- [ ] Compilar y correr en Android apuntando al `BASE_URL` del backend (o al `10.0.2.2` en emulador).
- [ ] Buscar una canción ("Radiohead Creep") y reproducirla. Debe funcionar al 100%.

### 4.2. Prueba en iOS (Físico)
- [ ] Levantar el túnel de Cloudflare.
- [ ] Lanzar app en iPhone usando `--dart-define=BASE_URL=https://<tunnel_url>`.
- [ ] Apagar el WiFi del iPhone, dejándolo en red celular.
- [ ] Buscar y reproducir un track. Debe funcionar (usará los bytes enviados por el backend).

### 4.3. Documentar resultados
- [ ] Registrar tiempos de carga y estabilidad.
- [ ] Dar por concluido el hito y mergear `feature/unified-proxy-playback` a `develop`.

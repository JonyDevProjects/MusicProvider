# Plan de Evolución y Arquitectura: MusicProvider (Fase 2)

Tras la exitosa integración y estabilización de `MusicProvider` como un plugin dinámico para **Nuclear**, el proyecto ha madurado. Sin embargo, nos enfrentamos a desafíos de robustez (Edge Cases) y a una decisión crítica respecto a la compatibilidad bidireccional con el ecosistema móvil **Spoti5**.

A continuación, se detalla el roadmap paso a paso para las próximas fases de desarrollo, con un análisis profundo sobre la bifurcación arquitectónica del backend.

---

## FASE 1: Manejo de Restricción de Edad (Age-Restricted Content)
El objetivo inmediato es evitar fallos silenciosos cuando un usuario intente reproducir contenido explícito o restringido por edad en YouTube.

* **Implementación técnica:**
  1. Utilizar la interfaz `api.Settings` del SDK de Nuclear para exponer un menú de configuración al usuario.
  2. Permitir que el usuario provea una cadena de cookies (o seleccione la opción `--cookies-from-browser` soportada por `yt-dlp`).
  3. Modificar la capa base del plugin (`getStreamUrl`) para inyectar estos parámetros de autenticación dinámicamente en la llamada a `api.Ytdlp.getStream()`.
* **Criterio de éxito:** Poder buscar y reproducir videos marcados para +18 sin errores 403 o excepciones de `yt-dlp`.

---

## FASE 2: Casos Extremos (Streams Largos y Caducidad)
Las URLs cifradas que devuelve YouTube tienen una firma temporal que expira (típicamente entre 4 a 6 horas). En contenido de larga duración (Mixes, Podcasts), el reproductor se cuelga si el motor solicita el siguiente bloque (chunk) usando una URL caducada.

* **Implementación técnica:**
  1. Monitorear los códigos de error HTTP (ej. HTTP 403 Forbidden devuelto a mitad de una reproducción).
  2. Implementar una función de **regeneración (refresh)** transparente: si una URL caduca, el plugin vuelve a solicitar el stream info a `yt-dlp` y actualiza la URL en el motor de reproducción.
  3. Asegurar la persistencia del estado en la caché LRU.
* **Criterio de éxito:** Reproducción ininterrumpida de pistas de más de 4 horas de duración haciendo _seek_ (saltos temporales) sin fallas de red.

---

## FASE 3: El Punto de Inflexión Arquitectónico (Nuclear vs Spoti5)
En lugar de eliminar precipitadamente el backend Express, utilizaremos esta fase como un **estudio de viabilidad arquitectónica**. Sabemos que el backend en Express demostró un rendimiento excelente como PoC con el frontend en Flutter de Spoti5. 

El dilema radica en si MusicProvider debe mantener un modelo **Híbrido/Isomórfico** o si Spoti5 debe adoptar la filosofía de plugins de Nuclear.

### Alternativa A: El Modelo Isomórfico (Core Agnóstico)
Mantener un único repositorio estructurado en capas estrictas:
1. **Core (Agnóstico):** Lógica pura de parsing, extracción (yt-dlp, yt-search) y LRU Cache. Nada de HTTP ni SDKs específicos.
2. **Wrapper Nuclear (`src/index.ts`):** Adapta el Core a los estándares de `@nuclearplayer/plugin-sdk`.
3. **Wrapper Spoti5 (`src/server.ts`):** Adapta el Core a un API REST Express para el consumo nativo de Flutter.
* *Pros:* Reutilización máxima de código.
* *Contras:* Mayor peso del repositorio y necesidad de mantener dependencias dispares.

### Alternativa B: Ecosistema de Plugins JS en Spoti5
Spoti5 podría evolucionar para ejecutar código JavaScript nativamente (usando motores embebidos en Flutter como `flutter_js` o `quickjs`).
* *Dinámica:* Spoti5 implementaría una interfaz compatible (o un subconjunto) del `@nuclearplayer/plugin-sdk`.
* *Pros:* MusicProvider existiría **únicamente** como Plugin. Spoti5 descargaría el mismo archivo `.zip` que usa Nuclear. El servidor Express se vuelve completamente obsoleto y se elimina.
* *Contras:* Requiere un esfuerzo masivo de reingeniería en la app móvil Spoti5 para soportar puentes JSI/Dart eficientes para streaming de audio.

### Alternativa C: Separación de Contextos (Forks Especializados)
Las limitaciones de memoria y red en un dispositivo móvil Android/iOS (Spoti5) son radicalmente distintas a las de una aplicación de escritorio con Electron/Tauri (Nuclear).
* *Dinámica:* Dividir el proyecto. `MusicProvider-Nuclear` asume que el host ya tiene `yt-dlp` integrado en Rust/C++. `MusicProvider-Spoti5` asume el rol de un servidor externo potente que pre-descarga y cachea para aliviar la carga de batería y CPU del teléfono.
* *Pros:* Rendimiento óptimo garantizado para cada plataforma sin compromisos.

### Alternativa D: Desarrollo del "Eje 2" (Evolución de la Arquitectura de Spoti5)
En base al documento original del roadmap (`docs/archive/roadmap-nuclear-plugin-spoti5-evolution.md`), una opción paralela a la experimentación directa en el backend es centrarse en re-arquitecturizar el propio cliente móvil Spoti5 para que adopte una arquitectura de plugins nativa en Dart (`Spoti5 Plugin Engine`).
* *Dinámica:* 
  1. Diseñar el `spoti5_plugin_sdk` en Dart con interfaces abstractas (`Searchable`, `Playable`, etc.).
  2. Refactorizar el Core de Flutter para inyectar estos plugins usando un `PluginRegistry`.
  3. Transformar el cliente API actual (que se comunica con el backend de Express de MusicProvider) en el "Primer Spoti5 Plugin Oficial".
* *Pros:* Desacopla completamente el frontend de Flutter, permitiendo a Spoti5 emular la filosofía de plugins dinámicos de Nuclear sin forzarlo a ejecutar JavaScript. Permite seguir aprovechando el excelente rendimiento de PoC del backend Express.
* *Contras:* Traslada el foco y la mayor parte del esfuerzo temporalmente al repositorio Dart/Flutter, pausando la consolidación en Node.js.

### Plan de Acción para la Fase 3:
No borraremos el servidor Express. En su lugar:
1. Diseñaremos un **banco de pruebas (Benchmark)**.
2. Compararemos latencia, consumo de RAM y facilidad de distribución entre el modelo API (Express → Flutter) vs el modelo Integrado (Plugin JS → Host nativo).
3. Evaluaremos si es más conveniente adaptar MusicProvider para Spoti5 (Alternativas A/B/C) o adaptar Spoti5 para MusicProvider mediante un ecosistema de plugins propio (Alternativa D).
4. Tomaremos una decisión basada en datos sobre el futuro de los repositorios.

---

## FASE 4: Empaquetado y CI/CD (Distribución)
Independientemente de la decisión tomada en la Fase 3, el flujo para el Plugin de Nuclear debe ser _plug-and-play_.

* **Implementación técnica:**
  1. Configurar GitHub Actions para que en cada *Release* o push a la rama `main`, se compile el código (`npm run build`).
  2. Empaquetar el archivo `dist/index.js` y el `package.json` en un `music-provider-vX.Y.Z.zip`.
  3. (Opcional si se mantiene el backend REST) Construir una imagen Docker ligera con el backend de Express para despliegues automatizados de la API requerida por Spoti5.

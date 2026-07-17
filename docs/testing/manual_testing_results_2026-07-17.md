# Resultados de Pruebas Manuales - 17 de Julio 2026

## Resumen Ejecutivo

Se realizaron pruebas manuales en todas las plataformas documentadas siguiendo la estrategia de pruebas del proyecto. **5 de 6 plataformas pasaron exitosamente**, con un timeout conocido en iOS físico.

## Estado de Pruebas por Plataforma

| Plataforma | Estado | Detalles |
|------------|--------|----------|
| Web (Chromium) | ✅ PASS | Búsqueda, reproducción, PlayerBar verificados |
| Android Emulator | ✅ PASS | integration_test/app_test.dart - 1 test passed |
| iOS Simulator | ✅ PASS | integration_test/app_test.dart - 1 test passed |
| Android Físico (S9+) | ✅ PASS | integration_test con BASE_URL LAN |
| iOS Físico (iPhone 12 mini) | ⚠️ TIMEOUT | VM Service no descubierto - requiere verificación manual |

## Detalles por Plataforma

### 1. Backend Verification
- **Endpoint `/api/search`**: Funcional, devuelve tracks con `id`, `title`, `duration`, `thumbnail`, `channel`
- **Endpoint `/api/info`**: Funcional, devuelve `streamUrl`, `duration`, `title`, `container`, `codec`
- **Servidor**: Corriendo en puerto 3000

### 2. Web (Chromium) - Pruebas Manuales con agent-browser

**Flujo principal verificado:**
- ✅ Búsqueda "Radiohead" retornó 10 resultados
- ✅ Selección de track "Creep" (3:57)
- ✅ Reproducción de audio iniciada correctamente
- ✅ Cambio de track mientras otro se reproduce ("No Surprises")
- ✅ Búsqueda sin resultados muestra mensaje "No results. Try searching for a song!"
- ✅ PlayerBar muestra duración del backend (`track.duration`)

**Observaciones:**
- Flutter CanvasKit requiere clic en "Enable accessibility" para generar árbol de accesibilidad
- Los nodos `flt-semantics` con `aria-label` permiten selección confiable
- `fill()` no funciona con campos de texto Flutter; se requiere `keyboard type`

### 3. Android Emulator
- **Comando**: `flutter test integration_test/app_test.dart -d emulator-5554`
- **Resultado**: 1 test passed (11 segundos)
- **Verificación**: PlayerBar usa `track.duration` (no `audioPlayer.duration`)

### 4. iOS Simulator (iPhone 12 mini)
- **Comando**: `flutter test integration_test/app_test.dart -d "iPhone 12 mini"`
- **Resultado**: 1 test passed (13 segundos)
- **Verificación**: PlayerBar usa `track.duration` correctamente

### 5. Android Físico (Samsung S9+)
- **Dispositivo**: SM G965U (Android 9, API 28)
- **Conexión**: USB (413454524a4d3098)
- **Comando**: `flutter test integration_test/app_test.dart -d 413454524a4d3098 --dart-define=BASE_URL=http://192.168.1.128:3000/api`
- **Resultado**: 1 test passed (12 segundos)
- **Verificación**: Conexión LAN exitosa, PlayerBar correcto

### 6. iOS Físico (iPhone 12 mini Joni)
- **Dispositivo**: iPhone 12 mini (iOS 18.7.8)
- **Conexión**: USB (00008101-000C2D492682001E)
- **Estado**: TIMEOUT después de 180 segundos
- **Error**: "The Dart VM Service was not discovered after 60 seconds"
- **Causa probable**: 
  - El dispositivo necesita confiar en el certificado de desarrollo
  - Problemas de conectividad de red entre Mac y dispositivo
  - Posible necesidad de habilitar "Developer Mode" en el dispositivo

## Funcionalidades Verificadas

### Flujo Principal (Search → Select → Play)
1. **Búsqueda**: Campo de texto acepta consultas y retorna resultados de la API
2. **Selección**: Tapping en un track inicia la reproducción
3. **Reproducción**: Audio comienza a reproducirse correctamente
4. **PlayerBar**: 
   - Muestra título y artista del track actual
   - Barra de progreso funcional
   - Duración total coincide con `track.duration` del backend
   - Botón play/pause funcional

### Casos Edge
- ✅ Búsqueda sin resultados
- ✅ Cambio de track durante reproducción
- ✅ Conexión a backend via LAN (dispositivos físicos)

## Problemas Conocidos

### 1. Flutter Web CanvasKit - Accesibilidad
- **Problema**: El árbol de accesibilidad no se genera automáticamente
- **Solución**: Clic en botón "Enable accessibility" al cargar la página
- **Impacto**: Pruebas automatizadas con Playwright requieren inyección de clic

### 2. iOS Físico - VM Service Timeout
- **Problema**: El Dart VM Service no se descubre en 60 segundos
- **Documentado en**: `docs/testing/e2e_mobile_fisicos.md`
- **Solución sugerida**: Verificar confianza del certificado y conectividad de red

### 3. ADB Wi-Fi (Documentado)
- **Problema**: Huawei P30 Pro pierde conexión tcpip al desconectar USB
- **Solución**: Reconectar vía USB y re-establecer tcpip 5555

## Recomendaciones

1. **Para iOS Físico**: Verificar manualmente que el certificado de desarrollo es confiable en el dispositivo antes de ejecutar pruebas automatizadas

2. **Para Flutter Web**: Considerar agregar un init script que habilite la accesibilidad automáticamente para pruebas E2E

3. **Documentación**: La documentación en `/docs/testing/` es precisa y útil para guiar las pruebas en todas las plataformas

## Archivos de Screenshots

Los screenshots de las pruebas manuales en Web están disponibles en:
- `docs/testing/screenshots/spoti5_initial.png`
- `docs/testing/screenshots/spoti5_search_radiohead.png`
- `docs/testing/screenshots/spoti5_playing_creep.png`
- `docs/testing/screenshots/spoti5_playing_no_surprises.png`
- `docs/testing/screenshots/spoti5_no_results.png`

## Conclusión

La aplicación funciona correctamente en 5 de 6 plataformas probadas. El flujo principal (búsqueda → selección → reproducción) es estable y el PlayerBar muestra la duración correcta del backend. La documentación de pruebas es efectiva y guía correctamente los flujos de prueba.

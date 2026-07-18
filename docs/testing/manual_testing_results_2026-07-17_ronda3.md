# Resultados de Pruebas Manuales - 17 de Julio 2026 (Ronda 3 - Resolución de Fallos)

## Resumen Ejecutivo

Esta tercera ronda de pruebas se enfocó exclusivamente en resolver los dos escenarios que presentaron conflictos en la [Ronda 2](./manual_testing_results_2026-07-17_ronda2.md): el **Android Emulator** (fallo por cold boot) y el **iOS Físico** (fallo de test harness / red). 

Se logró superar la prueba del emulador de Android y se identificó con total precisión la causa raíz del problema en iOS, descartando un bug en los flags de Flutter.

## Estado de Pruebas Resolutivas

| Plataforma | Estado | Notas |
|------------|--------|-------|
| Android Emulator | ✅ PASS | Prueba ejecutada con GUI; screenshots capturados exitosamente. |
| iOS Físico (iPhone 12 mini) | ⚠️ DIAGNOSTICADO | Fallo causado por el Local Network Privacy Prompt en el bundle de prueba. |

## Detalles de Resolución por Plataforma

### 1. Android Emulator (Medium Phone)
- **Problema anterior:** El arranque en frío (cold boot) en modo *headless* era muy lento y causaba la desconexión del WebSocket del VM Service.
- **Acción Correctiva:** Se arrancó el emulador explícitamente con interfaz gráfica (GUI) usando el comando `flutter emulators --launch medium_phone` y se le dio tiempo suficiente para completar el arranque.
- **Resultado:** La ejecución de `flutter drive` usando la IP LAN (`192.168.1.128`) completó exitosamente.
- **Trazabilidad:** Se inyectó temporalmente código (`takeScreenshot`) en el `app_test.dart` mediante un `integration_driver`, lo cual nos permitió capturar y extraer exitosamente 3 imágenes del flujo del test:
  - Pantalla inicial.
  - Resultados tras la búsqueda.
  - Reproducción del track con el PlayerBar activo.

### 2. iOS Físico (iPhone 12 mini)
- **Problema anterior:** El release build funcionaba, pero el `integration_test` fallaba sistemáticamente sin encontrar resultados en la red ("No TrackResult-Creep found"), levantando sospechas de que `flutter test` ignoraba el flag `--dart-define`.
- **Estrategia de Diagnóstico:** 
  1. Se intentó ejecutar mediante `flutter drive`, el cual hizo *timeout* esperando al Dart VM Service.
  2. Como *fallback*, se modificó temporalmente `api_service.dart` para **forzar por código** la IP LAN (`192.168.1.128`) y evitar depender del flag. 
  3. Se corrió `flutter test` nuevamente.
- **Resultado del Diagnóstico:** El test se ejecutó pero **volvió a fallar exactamente en el mismo punto**. Esto demostró que el flag `--dart-define` estaba funcionando correctamente y el problema radicaba en otra parte.
- **Causa Raíz:** **Permiso de Red Local (Local Network Privacy Prompt)**. 
  - Al ejecutar pruebas automatizadas (`flutter test` o `flutter drive`), Flutter compila, firma e instala un *App Bundle* de prueba totalmente distinto al de release. 
  - Este nuevo bundle requiere que iOS muestre y el usuario acepte de nuevo el prompt de acceso a la red local. 
  - Al tratarse de una prueba desatendida, nadie presiona "Permitir" en el dispositivo físico, por lo que iOS bloquea las peticiones de red hacia `192.168.1.128`. La UI nunca recibe la respuesta del servidor y el test falla por timeout intentando encontrar el track en la lista.

## Limpieza del Entorno (Cleanup)

Para asegurar la integridad del repositorio de cara a futuros desarrollos, al finalizar las pruebas se revirtieron todos los cambios intrusivos:
- Se eliminó la inyección temporal de `takeScreenshot` en `integration_test/app_test.dart`.
- Se restauró la lógica original de entorno en `lib/services/api_service.dart` para eliminar el hardcodeo de la IP.

## Recomendaciones y Próximos Pasos

1. **Automatización CI/CD para Emuladores:** 
   Asegurar que los pipelines arranquen los emuladores con el tiempo adecuado (o utilicen snapshots previamente calentados) antes de inyectar el test.
2. **E2E en Dispositivos iOS Físicos en LAN:** 
   Tras una profunda investigación técnica, se ha determinado que el uso de `flutter test` en dispositivos físicos con iOS 14+ presenta barreras severas para la automatización desatendida:
   - **Local Network Privacy:** Bloquea peticiones al backend LAN.
   - **MDM Profiles:** Su uso para intentar hacer *bypass* a la privacidad de red rompe el *Provisioning Profile* (Trust chain) e interfiere con el multiplexor USB (usbmuxd).
   - **mDNS y Dart VM Service:** Incluso esquivando las peticiones de red usando un servidor *mock* interno (localhost), la política de red de iOS bloquea los anuncios mDNS que usa Flutter CLI para descubrir el puerto del Dart VM Service, provocando un error irresoluble de *timeout* (60s) en el *handshake* de inyección de test.
3. **Decisión Arquitectónica de Testing:**
   - **Tests Automatizados (E2E):** Ejecutar estrictamente sobre Emuladores Android o **Simuladores iOS** de macOS, donde no existen estas restricciones de red y mDNS.
   - **Validación Manual/Funcional en iOS Físico:** Utilizar `flutter run --release` (que omite el Dart VM Service) para asegurar el despliegue nativo sin fricciones de seguridad.
4. **Mantenimiento de Documentación:** 
   Actualizar `docs/testing/ios_troubleshooting.md` con este hallazgo sobre los *App Bundles* de testing, MDM y mDNS.

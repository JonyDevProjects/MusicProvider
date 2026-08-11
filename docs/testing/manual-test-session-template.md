# Reporte de Sesión de Testing Manual

**Fecha:** YYYY-MM-DD
**Tester:** [Nombre]
**Plataforma / Dispositivo:** [ej. iPhone 13 (iOS 17), Emulador Android API 33, Firefox Web]
**Versión de App / Commit:** [Commit hash o versión]
**Entorno de Backend:** [Localhost, Túnel Cloudflare, Producción]

## 1. Búsqueda y Resultados (Search API)
- [ ] Búsqueda válida retorna resultados: **[PASS/FAIL]** - Notas:
- [ ] Metadatos correctos (Título, duración, imagen): **[PASS/FAIL]** - Notas:
- [ ] Búsqueda vacía / Error manejado: **[PASS/FAIL]** - Notas:

## 2. Reproducción Básica
- [ ] Inicio de reproducción correcto: **[PASS/FAIL]** - Notas:
- [ ] Icono de pausa se muestra durante reproducción: **[PASS/FAIL]** - Notas:
- [ ] Botón de pausa detiene el audio: **[PASS/FAIL]** - Notas:
- [ ] Botón de play reanuda el audio: **[PASS/FAIL]** - Notas:

## 3. Desplazamiento (Seeking)
- [ ] Seek al 50% de la pista (funciona y reanuda): **[PASS/FAIL]** - Notas:
- [ ] Seek cerca del final transiciona correctamente: **[PASS/FAIL]** - Notas:

## 4. Casos Límite y Red
- [ ] (Móvil) Reproducción en background: **[PASS/FAIL/NA]** - Notas:
- [ ] Desconexión simulada manejada sin crash: **[PASS/FAIL]** - Notas:
- [ ] Caída del proxy manejada sin crash: **[PASS/FAIL]** - Notas:
- [ ] (Móvil) Reproducción en red celular exclusiva: **[PASS/FAIL/NA]** - Notas:
- [ ] (Web) CORS policies no bloquean reproducción: **[PASS/FAIL/NA]** - Notas:
- [ ] Fallback a YtExplodeService: **[PASS/FAIL/NA]** - Notas:

## 5. Accesibilidad (a11y)
- [ ] Navegación por teclado (Web): **[PASS/FAIL/NA]** - Notas:
- [ ] Etiquetas legibles por lectores de pantalla: **[PASS/FAIL/NA]** - Notas:

## Resumen de Problemas (Issues Encontrados)
1. 
2. 

## Conclusión
[Aprobado / Requiere correcciones / Bloqueado]

Cambia a la configuración de modelo para la fase de VERIFICACIÓN del ciclo SDD:

1. Ejecuta `/model xiaomi/mimo-v2.5` para usar el modelo de verificación
2. Ejecuta `/effort medium` para revisión equilibrada

Luego procede con la verificación: revisa que cada criterio de aceptación del spec se cumpla, ejecuta `npm run build && npm run test`, y actualiza el spec con el resultado.

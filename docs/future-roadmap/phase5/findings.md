# Hallazgos Técnicos y Restricciones — Fase 5 (Publicación en Nuclear Store)

Última actualización: 2026-08-21  
Documentación de referencia oficial: [docs.nuclearplayer.com/nuclear/plugins/publishing](https://docs.nuclearplayer.com/nuclear/plugins/publishing)

---

## 1. Restricciones y Requisitos del Plugin Store

| # | Restricción / Requisito | Detalle Técnico | Implicación en MusicProvider |
|---|-------------------------|-----------------|------------------------------|
| **R5-1** | **Nombre estricto del asset de release** | Nuclear consulta la API de GitHub Releases y busca exactamente `plugin.zip`. | El script `package-plugin.ts` y los workflows deben generar y adjuntar `plugin.zip` en GitHub Releases. |
| **R5-2** | **Estructura raíz sin anidamiento** | El descompresor de Nuclear espera `index.js` y `package.json` en la raíz del zip (`plugin.zip/index.js`), no dentro de subdirectorios (`plugin.zip/music-provider/index.js`). | `AdmZip.addLocalFile()` debe inyectar directamente los archivos sin prefijos de directorio. |
| **R5-3** | **Coincidencia estricta de `id` con `name`** | El campo `id` en `plugins.json` del registro debe ser exactamente igual al campo `name` en el `package.json` del bundle (`music-provider`). | Ambos manifiestos deben mantener `name: "music-provider"`. |
| **R5-4** | **Compatibilidad dual de categorías** | Nuclear soporta tanto `"category": "streaming"` (legacy/unitaria) como `"categories": ["streaming"]` (múltiple). | El `package.json` generado en staging debe incluir ambos campos para máxima compatibilidad con versiones antiguas y recientes de Nuclear. |
| **R5-5** | **Longitud de descripción validada** | La especificación del registro de Nuclear exige que `description` tenga entre 10 y 200 caracteres. | La descripción actual ("High-performance YouTube music search and streaming provider utilizing yt-dlp", ~83 caracteres) cumple perfectamente. |
| **R5-6** | **Descompresión en el cliente** | Al instalar desde la Store, Nuclear copia los archivos a `plugins/{id}/{version}/` en el AppData del usuario y los carga con `esbuild-wasm`. | El bundle `index.js` debe seguir siendo completamente autónomo (`noExternal: [/(.*)/]`). |

---

## 2. Estructura de la Entrada en `plugins.json` (Registry)

```json
{
  "id": "music-provider",
  "name": "MusicProvider",
  "description": "High-performance YouTube music search and streaming provider utilizing yt-dlp",
  "author": "iJonyDev",
  "repo": "iJonyDev/MusicProvider",
  "category": "streaming",
  "categories": ["streaming"],
  "tags": ["youtube", "streaming", "yt-dlp", "audio"],
  "addedAt": "2026-08-21T00:00:00Z"
}
```

*Nota: Los campos `version` y `downloadUrl` son calculados y actualizados automáticamente por el CI del repositorio `NuclearPlayer/plugin-registry`.*

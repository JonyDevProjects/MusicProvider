# Test Matrix — Baseline (MusicProvider)

Estado de cobertura feature x plataforma tras finalizar la integración inicial de pruebas.

| Feature / End-to-End | Backend API (Vitest) | Web E2E (Playwright) | Android (integration_test) | iOS (integration_test) | Manual (Physical) |
|----------------------|----------------------|-----------------------|----------------------------|------------------------|-------------------|
| API Search           | ✅ PASS (100%)        | ⏳ TBD                | ⏳ TBD                     | ⏳ TBD                 | ✅ PASS            |
| API Resolve          | ✅ PASS (100%)        | ⏳ TBD                | ⏳ TBD                     | ⏳ TBD                 | ✅ PASS            |
| API Stream Proxy     | ✅ PASS (100%)        | ⏳ TBD                | ⏳ TBD                     | ⏳ TBD                 | ✅ PASS            |
| LRU Cache            | ✅ PASS (100%)        | N/A                   | N/A                        | N/A                    | N/A               |
| Play/Pause Toggle    | N/A                  | ✅ PASS                | ✅ PASS                     | ✅ PASS (Simulator)    | ✅ PASS            |
| Seek Position        | N/A                  | ⏳ TBD                | ⏳ TBD                     | ⏳ TBD                 | ✅ PASS            |
| Error Handling (API) | ✅ PASS (100%)        | ⏳ TBD                | ⏳ TBD                     | ⏳ TBD                 | ⏳ TBD             |
| Service Fallback     | N/A                  | ⏳ TBD                | ⏳ TBD                     | ⏳ TBD                 | ⏳ TBD             |

*Nota: La suite actual del Backend toma ~9.5s e incluye 23 tests en total (Nivel 1 y 3 de la pirámide). Flutter cuenta con ~10 tests automatizados.*

### Leyenda
- ✅ **PASS**: Pruebas implementadas, ejecutadas y pasando exitosamente.
- ⏳ **TBD** (*To Be Done*): Pruebas identificadas como necesarias que están pendientes de ser programadas/ejecutadas en las próximas fases.
- **N/A**: No Aplica (la plataforma o capa no requiere pruebas para este flujo específico).

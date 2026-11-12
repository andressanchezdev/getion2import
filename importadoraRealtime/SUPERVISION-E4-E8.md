# Supervisión del trabajo E4–E8 (11-nov-2026)

> Revisión de solo lectura de lo que hizo el agente de VS Code (E4 a E8). No se cambió código. Corregir estos puntos **antes de E9**.

## Resultado general: **bien aplicado**

| Verificación | Resultado |
|---|---|
| `importadoraApi`: build, vet, `go test` con `TEST_DATABASE_URL` | 12/12 suites en verde (base de prueba limpia) |
| `importadoraRealtime`: build, vet, `go test` (con base) | 10/10 suites en verde; contrato 48/48 |
| `importadoraInterfaz`: tsc, lint, test, check:api, check:type, build | 124 archivos / 787 pruebas en verde; build OK |
| 10 flujos e2e contra la API en modo desarrollo (un mal uso de eventos es panic) | 280 comprobaciones, 0 fallas, 0 panics, 0 eventos descartados |
| Eventos REALES guardados por la API durante los e2e, validados contra el contrato | 56 eventos (`entity.status_changed` 24, `stock.changed` 17, `session.revoked` 6, `transfer.*` 9): **0 inválidos** |
| E5 lectura segura (`tx_id < pg_snapshot_xmin`) en las 3 consultas | ✅ con `TestOutOfOrderCommit` |
| E5 superadmin solo `platform` + personal en la recuperación (decisión 2) | ✅ |
| E5 `session.revoked` respeta `exceptSessionId` (`CloseActorExcept`) | ✅ |
| E6 sin `Begin/Commit/Rollback` manuales, sin firma vieja, sin `s.pool` dentro de `WithTx` | ✅ (66 `WithTx`, prueba `TestNoManualBeginInFeatures`) |
| E8 toda llamada `events.Record/Stock` dentro de `WithTx` | ✅ 55 llamadas (3 en auxiliares que reciben la `tx` desde un `WithTx`) |
| E7 sin JWT en la URL, ticket en `?ticket=`, secuenciador sin detección de huecos, watermark, `VITE_REALTIME_ENABLED` | ✅ |
| E7/E8 cierre 4401/4403 → `logoutThunk` | ✅ |
| E8 recargas HTTP de respaldo solo con el socket caído (`status !== 'live'`) | ✅ |
| E8 sin GET de seguimiento en carrito y traslados | ✅ |

## Hallazgos a corregir

| # | Prioridad | Qué | Dónde | Cómo |
|---|---|---|---|---|
| 1 | Media | **La purga no borra tickets vencidos** (el plan lo pide: § 5 «Retención» y E5). `realtime_tickets` crece con cada conexión. | `importadoraRealtime/src/features/events/services/purge_service.go` + `tickets/repositories/ticket_repo.go` | Agregar `PurgeExpired`: `DELETE FROM realtime_tickets WHERE expires_at < now() - interval '1 hour'` (el rol ya tiene `DELETE`), llamarlo en la misma pasada horaria y cubrirlo en `purge_service_test.go`. |
| 2 | Media | **Sin versión por entidad en los datos maestros del front.** `applyVersioned`/`isNewer` solo está en inventario, carrito, productos y traslados; clientes, empleados, catálogos, bodegas, ubicaciones, terceros y compañías aplican `entity.status_changed` sin comparar la versión (§ 16.5 y 16.9: un evento viejo o una carga HTTP tardía pueden pisar el dato nuevo). | `features/{customers,employees,catalogs,warehouses,locations,externals,companies}/slices` y sus `*.realtime.ts` | Aplicar con `applyVersioned` usando `entity.version` frente al `updatedAt` de la fila, también en las cargas de lista (16.9). Prueba: un evento con versión vieja no cambia el estado. |
| 3 | Baja | **Pruebas que dependen de una base limpia.** `TestNotificationsReachOnlyTheirRecipient` cuenta toda la tabla y falla tras correr los e2e (hay notificaciones legítimas de otras compañías). `TestReplayExact` falló 1 de 7 veces porque otros paquetes insertan eventos de la compañía 1 a la vez. | `importadoraApi/src/features/notification_integration_test.go:96`, `importadoraRealtime/src/features/connection/services/replay_service_test.go:133` | Notificaciones: filtrar por las filas que crea la prueba (por ejemplo `entity_id` o `title` únicos). Replay: usar una compañía propia de la prueba (o `company_id` inexistente + scope a medida) para no mezclarse con otros paquetes. |
| 4 | Baja | `go test -race` nunca se corrió (no hay gcc en este equipo). | — | Correrlo en Linux (CI o build de Railway) antes de producción. No instalar compiladores sin permiso. |
| 5 | Info | El resumen de E8 dice «19 kinds» con `entity.status_changed`; en realidad lo emiten los **14** que tienen estado. Los 5 restantes (`doc_series`, `customer_document`, `product_code`, `product_supplier`, `screensaver_settings`) no tienen activo/inactivo. Es correcto; solo ajustar el texto del resultado de E8. | `PLAN-WEBSOCKET.md` / `CONTINUAR.md` | Corregir la redacción. |
| 6 | Info | Ningún e2e usa el carrito, así que `cart.updated` no se ve en los eventos reales (solo en `pilot_test.go`). | `importadoraApi/scripts/e2e` | Opcional: agregar un flujo de carrito que verifique el evento. |

## Para el agente

> Lee `importadoraRealtime/SUPERVISION-E4-E8.md` y corrige los hallazgos 1, 2, 3 y 5 antes de empezar E9. No hagas commits. Usa solo `importadoraRealtime`, `importadoraApi` e `importadoraInterfaz` y la base `importadora_test`. Al terminar, corre la verificación completa de los tres directorios y actualiza `CONTINUAR.md`.

## Corrección de hallazgos (11-nov-2026)

| # | Estado | Cambio |
|---|---|---|
| 1 | Corregido | `EventRepository.PurgeExpiredTickets` (`DELETE … expires_at < now() - interval '1 hour'`) en la misma pasada horaria de `PurgeService.RunOnce`; prueba `TestPurgeRemovesOnlyExpiredTickets`. |
| 2 | Corregido | `applyVersionedStatus` y `mergeVersionedList` en `global/helpers/realtime/applyVersioned.ts`; los 9 reducers `*StatusFromEvent` (clientes, empleados, roles, catálogos, bodegas, ubicaciones, terceros, compañías, administradores) comparan `entity.version` y la anotan en la fila; las cargas de lista usan `mergeVersionedList`. Prueba `customers.realtime.test.ts`. **Límite:** esas listas HTTP no traen `updatedAt`, así que la protección 16.9 es completa solo frente a eventos; si se quiere total, la API debe devolver `updatedAt` en esas listas (E9.7). |
| 3 | Corregido | Notificaciones filtra por un título único; `TestReplayExact` usa una compañía propia (se borra en cascada). |
| 4 | Pendiente | `-race` en Linux antes de producción. |
| 5 | Corregido | Redacción de E8 en `CONTINUAR.md` (14 kinds con estado). |

Verificación completa tras los cambios: realtime 10/10 + contrato 48/48; API 12/12; front 125 archivos / 790 pruebas, lint, check:api, check:type y build OK.

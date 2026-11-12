# Cómo continuar el websocket (traspaso · 11-nov-2026)

> Para el agente que siga este trabajo. Leer primero esto y luego `PLAN-WEBSOCKET.md` (el plan manda; este archivo solo dice **dónde quedamos**).
> **No hay commits**: todo está en el árbol de trabajo. El dueño pidió no hacer commits hasta que lo indique.

## 1. Dónde quedamos

| Etapa | Estado | Evidencia |
|---|---|---|
| Plan principal (`../PLAN-AJUSTES-UI-PERMISOS.md`) Fases 0–9 | Hecho en código | ver «Pendientes heredados» abajo |
| P · verificación del punto de partida | Hecha | `PLAN-WEBSOCKET.md` § 9.1.1 |
| Decisiones 1–10 | Cerradas | `PLAN-WEBSOCKET.md` § 11 |
| E0 · contrato v1 | Hecha | `contract/` · `go run ./contract/scripts/validate.go` → 48/48 |
| E1 · base de datos | Hecha y aplicada en local | `importadoraApi/src/core/db/migrations/20261129_realtime.sql` (+ `_down`, + `20261130_doc-series-prefix-per-warehouse.sql`) |
| E2 · productor en la API | Hecha | `importadoraApi/src/core/events/`, `features/realtime/` (POST /realtime/ticket) · § «Resultado de E2» |
| E3 · esqueleto del servicio | Hecha | `/health`, config, logs, apagado ordenado · § «Resultado de E3» |
| **E4 · conexión, ticket, acceso y hub** | **Hecha** | `channels_test`, `filter_test`, `queue_test`, `hub_test`, `ticket_service_test`, `connection_service_test` + handshake en vivo · § «Resultado de E4» |
| **E5 · listener, recuperación, eventos de control y purga** | **Hecha** | `listen_conn.go`, `event_repo.go`, `listener_service.go`, `control_events.go`, `replay_service.go`, `purge_service.go` + pruebas sobre `importadora_test` · § «Resultado de E5» |
| **E6 · transacciones y escritores de stock (API)** | **Hecha** | 21 transacciones manuales migradas a `db.WithTx` (0 `.Begin(` en `src/features`), `TestNoManualBeginInFeatures`, traslados devuelven `*dtos.TransferResponse` + 8 flujos e2e en verde · § «Resultado de E6» |
| **E7 · front base** | **Hecha** | `realtime.contract.ts`, `realtime.service.ts` (máquina 16.1), `realtime.ticket.ts`, `realtime.adapter.ts`, `realtime.sequencer.ts`, `realtime.router.ts`, `RealtimeStatus.tsx` en `AppHeader`, `realtimeRegistry.ts`, `applyVersioned.ts`, `useRecentlyChanged.ts` + 6 suites Vitest en verde · § «Resultado de E7» |
| **E8 · piloto (stock, traslados y activo ⇄ inactivo)** | **Hecha** | API eventos stock en 11 servicios, transfer.created/status_changed, entity.status_changed en los 14 kinds con estado (los 5 restantes no tienen activo/inactivo), session.revoked, cart.updated; Front handlers shop/transfers/inventory/warehouses/locations/catalogs/customers/employees/externals/companies/superadmin/navigation, 0 GETs en cart/transfers, tests unitarios y pilot_test.go en verde |
| Supervisión E4–E8 | Hallazgos 1, 2, 3 y 5 corregidos; 4 (`-race`) pendiente en Linux | `SUPERVISION-E4-E8.md` § «Corrección de hallazgos» |
| **E9 · resto de dominios** | **Siguiente paso** | `PLAN-WEBSOCKET.md` § E9 (E9.1 a E9.11) |
| E10 a E11 | Pendientes tras E9 | `PLAN-WEBSOCKET.md` § 9 |

## 2. E9: qué toca a continuación

Seguir los 11 bloques de **E9 · Resto de dominios** de `PLAN-WEBSOCKET.md` (línea 1832):
- **E9.1 Ventas**: `sale.created`, `sale.stage_changed`, `sale.payment_changed`, `invoice.issued`, `invoice.annulled`. Front: `orders`, `cashRegister`, `billing`; quitar `loadOrdersThunk` y `loadOrderCountsThunk` de `orders.thunks.ts:63-97`.
- **E9.2 Pagos, cartera y conciliación**: `payment.*`, `credit.balance_changed`, `bank_statement.imported`, `bank_record.status_changed`. Front: `wallet`, `bank`, `customers`, `checkout`; quitar recargas de `wallet.payments.thunks.ts:61-110` y `bank.thunks.ts`.
- **E9.3 Caja**: `cash_session.*`, `cash.expense_recorded`. Front: `cashRegister`, `cashExpenses`.
- **E9.4 Compras**: `purchase.*`, `supplier_catalog.imported`. Front: `purchases`.
- **E9.5 Devoluciones**: `return.*`. Front: `returns`; quitar `loadReturnsThunk` de `returns.thunks.ts`.
- **E9.6 Cotizaciones y conteos**: `quotation.*`, `count.*`. Front: `quotations`, `inventory` (conteos).
- **E9.7 Precios y datos maestros restantes**: `product.prices_changed`, `entity.created/updated/archived/restored/deleted` de los 19 kinds. Front: catálogos, `recyclebin`; quitar `loadAdminsThunk`, `loadEmployeesThunk` y `loadRolesThunk`.
- **E9.8 Sesión y cuenta**: `permissions.changed`, `account.updated`, `session.revoked` (logout, password). Front: `auth`, `navigation`, `employees`, `settings`.
- **E9.9 Notificaciones**: `notification.created`, `notification.read`. Front: `notifications`; quitar `setInterval` de `useNotifications.ts:54`.
- **E9.10 Auditoría y respaldos**: `audit.logged`, `backup.created`, `backup.restored`. Front: `audit`, `backups`; quitar `window.location.reload()` de `useBackups.ts:73`.
- **E9.11 Reportes**: Marcar reportes como desactualizados ante eventos de venta/pago/stock.

## 3. Cómo probar (entorno local ya preparado)

- PostgreSQL 18 local. Bases: `Importadora` (la de trabajo) e **`importadora_test`** (para pruebas). **Nunca** correr pruebas que escriban sobre `Importadora`.
- `psql`/`pg_dump`: `C:\Program Files\PostgreSQL\18\bin\` (no están en el PATH). Contraseña de `postgres`: `importadoraApi/.env` (`DB_PASSWORD`); no imprimirla.
- `TEST_DATABASE_URL=postgres://postgres:<clave>@localhost:5432/importadora_test?sslmode=disable` activa las pruebas con base de la API y del servicio.
- Verificación completa:
  - `importadoraRealtime`: `go build ./... && go vet ./... && go test ./...` y `go run ./contract/scripts/validate.go`.
  - `importadoraApi`: `go build ./... && go vet ./... && go test ./...` (con `TEST_DATABASE_URL`) y los e2e: `cd scripts/e2e && E2E_BASE=http://localhost:3091 python flow_*.py`.
  - `importadoraInterfaz`: `pnpm exec tsc -b && pnpm lint && pnpm test && pnpm check:api && pnpm check:type`.

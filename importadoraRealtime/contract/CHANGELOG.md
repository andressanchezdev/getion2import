# Cambios del contrato del websocket

## v1 — 2026-11-11 — versión inicial (48 tipos) · **congelado**

- Sobre (`v`, `seq`, `id`, `type`, `occurredAt`, `companyId`, `warehouseIds`, `actor`, `correlationId`, `data`) y mensajes del cliente (`hello`, `pong`).
- 48 tipos en 11 grupos: sistema (4), sesión y acceso (3), datos maestros `entity.*` (6, con 19 `kind`), precios (1), inventario (6), ventas (9), pagos y cartera (5), caja (3), compras (4), devoluciones (2), notificaciones, auditoría y respaldos (5).
- `session.revoked` lleva `exceptSessionId`: con `PUT /auth/me/password` la sesión que cambió la clave sigue viva.
- Canales según las decisiones del 11-nov-2026: el superadmin solo recibe `platform` y su canal personal.
- Estados revisados contra los CHECK de `startdb.pgsql` (E1): `entity.status_changed` incluye `blocked` (empleado bloqueado por intentos fallidos).
- 10 códigos de cierre (1000, 1001, 1011, 4001, 4003, 4400, 4401, 4403, 4408, 4429).

## v1 — 2026-11-12 — cambio aditivo (compatible)

- `cash_session.totals_changed` suma dos campos opcionales: `abonosIn` (pagos de ventas a crédito recibidos en el turno) y `paymentsCount` (pagos del turno sin los anulados). La pantalla de caja los muestra y antes había que pedirlos por HTTP. Un cliente viejo los ignora.
- `quotation.*` va por `company:{id}` (antes `warehouse:{id}`): la tabla de cotizaciones no guarda bodega, así que no había a qué canal de bodega enviarlas. El permiso sigue siendo `quotations:view`.
- `count.*`: cada renglón (`items[]`) suma `stockId` y `productName` opcionales, y `count.created` suma `warehouseName` opcional. La pantalla de conteos se guía por la fila de stock.

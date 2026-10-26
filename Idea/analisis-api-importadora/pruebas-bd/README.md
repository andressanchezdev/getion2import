# Pruebas de la base de datos

Ejecutan [`../V3-esquema-borrador.sql`](../V3-esquema-borrador.sql) en un **PostgreSQL real** y corren **101 escenarios** contra él. Se usa PGlite (PostgreSQL 18 compilado a WebAssembly), así que no hay que instalar ni configurar nada más que Node.js.

## Cómo repetirlas

```bash
cd pruebas-bd
npm install
npm test
```

El resultado esperado termina con `ESCENARIOS: 101 bien, 0 mal`. Para correr uno solo (o un grupo), pasa el número como tercer argumento:

```bash
node run_sql.mjs ../V3-esquema-borrador.sql escenarios.sql 42
```

## Cómo están escritos

- Lo que va antes del primer `-- TEST:` en `escenarios.sql` se carga antes de cada escenario (ayudas para crear un empleado, un cliente, un pedido, avanzar una etapa…).
- Cada escenario corre dentro de una transacción que se deshace al terminar, así que no se contaminan entre sí.
- `-- EXPECT-ERROR: texto` significa que la base **debe rechazar** la operación con ese texto. `-- EXPECT-ROWS: [...]` compara el último `SELECT`.

## Qué cubren

| Escenarios | Qué comprueban |
|---|---|
| 00–05, 98 | Cantidad de tablas y nombres cortos; semillas (10 roles, 20 usuarios, 44 permisos); superadmin con todo, admin sin nada, auditoría solo del superadmin |
| 06–10 | Inicio de sesión: usuario activo entra; bloqueado, inactivo o sin ficha no; al desactivar se cierran las sesiones |
| 11–19 | Compañías: lo que recibe una compañía nueva, una sola anfitriona, roles globales, acceso del superadmin, aislamiento entre compañías, marcas conectadas |
| 20–26, 89–92 | Carrito: aparta stock, no aparta más de lo que hay, vence solo, se libera al abandonarlo; compite con los pedidos por la misma unidad |
| 27–30 | Pedido: reserva stock, la base calcula el total, no pide más de lo disponible, no admite productos ni clientes inactivos |
| 31–38 | Etapas del pedido: orden, permiso por etapa, ocupación, verificación, pausa, devolver una etapa con motivo |
| 39–50 | Pago y venta: transferencia con comprobante, venta de contado, venta a crédito, crédito habilitado y cupo, abonos |
| 51–57 | Picking inmediato, unidades sacadas y empacadas, productos fijos cuando ya es venta, flujo completo con kardex, pedido completado no se reabre |
| 58–61 | Cancelaciones: libera stock, deja crédito a favor, anula la deuda, exige motivo, no en envío |
| 62–68 | Devoluciones y crédito a favor: nunca devuelven dinero, producto vuelve al inventario, el saldo no baja de cero, el libro no se edita |
| 69–71 | Cotizaciones y empleado inactivo |
| 72–77, 96–97 | Stock prestado entre compañías: venta con stock de otra, cupo, cancelación, cierre del préstamo |
| 78–82 | Tiempo real: evento por cada cambio, traslado avisa a las dos bodegas, entrada de un solo uso al WebSocket |
| 83–88, 99–100 | Auditoría: motivo obligatorio, quién/dónde/por qué, no se modifica ni se borra, nunca guarda contraseñas, particiones por mes, sin ruido |
| 93–95 | Ubicaciones de otra compañía, traslado de 4 etapas, picking inmediato solo en ventas |

## Qué no cubren

Concurrencia real (varias conexiones a la vez), rendimiento con millones de filas y aislamiento por compañía con seguridad a nivel de fila (RLS). Eso se mide en la Fase 2, ya con la API en Go y un PostgreSQL de verdad.

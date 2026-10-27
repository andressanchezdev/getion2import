# Pruebas de la base de datos

Ejecutan [`../V3-esquema-borrador.sql`](../V3-esquema-borrador.sql) (46 tablas) en un **PostgreSQL real** y corren **111 escenarios** contra él. Se usa PGlite (PostgreSQL 18 compilado a WebAssembly), así que no hay que instalar ni configurar nada más que Node.js.

## Cómo repetirlas

```bash
cd pruebas-bd
npm install
npm test
```

El resultado esperado termina con `ESCENARIOS: 111 bien, 0 mal`. Para correr uno solo (o un grupo), pasa el número como tercer argumento:

```bash
node run_sql.mjs ../V3-esquema-borrador.sql escenarios.sql 042
```

## Cómo están escritos

- Lo que va antes del primer `-- TEST:` en `escenarios.sql` se carga antes de cada escenario (ayudas para crear un usuario, un cliente, un pedido, avanzar una etapa…).
- Cada escenario corre dentro de una transacción que se deshace al terminar, así que no se contaminan entre sí.
- `-- EXPECT-ERROR: texto` significa que la base **debe rechazar** la operación con ese texto. `-- EXPECT-ROWS: [...]` compara el último `SELECT`.

## Qué cubren

| Escenarios | Qué comprueban |
|---|---|
| 000–005, 009, 016, 108 | Cantidad de tablas (46) y nombres cortos; semillas (10 roles, 20 usuarios, 44 permisos); superadmin con todo, admin sin nada y que el superadmin se los puede dar; auditoría solo del superadmin; el empleado trae cédula, área y bodega dentro del usuario; cambiar el rol cambia lo que puede hacer |
| 006–008, 010, 082 | Inicio de sesión: el activo entra; el bloqueado y el cliente inactivo no; al desactivar se cierran las sesiones; un empleado inactivo no toma etapas |
| 011–015, 017–020, 103 | Compañías: lo que recibe una compañía nueva, una sola anfitriona, rol global, acceso del superadmin, aislamiento entre compañías (usuarios, pedidos, categorías, existencias) y marcas conectadas con su QR |
| 021–025 | Terceros y ficha del cliente: direcciones y contactos, NIT único, un producto solo con proveedores, un pedido solo con transportadoras y su guía |
| 026–032, 100, 102 | Carrito: aparta stock, no aparta más de lo que hay, vence solo, se libera al abandonarlo o al pasar al pedido; compite con los pedidos por la misma unidad |
| 033–037 | **Stock físico, compartido y virtual:** una existencia no se repite, el compartido suma todas las bodegas, el virtual de cada tienda suma sus bodegas y se mueve con el físico, lo prestado suma al compartido, las ubicaciones salen del stock |
| 038–041, 099, 101 | Pedido: reserva stock, la base calcula el total, no pide más de lo disponible, cambiar o borrar un renglón ajusta lo reservado |
| 042–049 | Etapas del pedido: orden, permiso por etapa, ocupación, verificación, pausa, devolver una etapa con motivo |
| 050–061 | Pago y venta: transferencia con comprobante, venta de contado, venta a crédito, crédito habilitado y cupo, abonos |
| 062–068 | Picking inmediato, unidades sacadas y empacadas, productos fijos cuando ya es venta, flujo completo con kardex, pedido completado no se reabre |
| 069–072 | Cancelaciones: libera stock, deja crédito a favor, anula la deuda, exige motivo, no en envío |
| 073–079 | Devoluciones y crédito a favor: nunca devuelven dinero, el producto vuelve al inventario, el saldo no baja de cero, el libro no se edita |
| 080–081 | Cotizaciones: no saltan etapas y la aceptada se convierte en pedido |
| 083–088, 106–107 | Stock prestado entre compañías: venta con stock de otra, cupo, cancelación, cierre del préstamo |
| 089–092 | Tiempo real: un evento por cada cambio, el traslado avisa a las dos bodegas, reanudar desde el último evento, limpiar los viejos |
| 090, 104–105 | Traslados: solo las 4 etapas físicas, sale el stock como traslado, el picking inmediato es solo de ventas |
| 093–098, 109–110 | Auditoría: motivo obligatorio, quién/dónde/por qué, no se modifica ni se borra, nunca guarda contraseñas, particiones por mes, sin ruido |

## Qué no cubren

Concurrencia real (varias conexiones a la vez), rendimiento con millones de filas y aislamiento por compañía con seguridad a nivel de fila (RLS). Eso se mide en la Fase 2, ya con la API en Go y un PostgreSQL de verdad.

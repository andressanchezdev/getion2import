# Migraciones

Cambios incrementales sobre una base **existente**. Una base nueva se crea con `../startdb.pgsql`, que ya trae todo lo de esta carpeta.
Nunca ejecutar `startdb.pgsql` sobre una base con datos: es destructivo.

| Archivo | Qué hace |
|---|---|
| `20261126_close-plan-gaps.sql` | Cierres del plan anterior (permisos de facturas, compras sin empleado, motivo de rechazo de devoluciones…). |
| `20261127_cart-item-price-tier.sql` | `cart_items.price_tier`: el nivel de precio de cada línea del carrito (Fase 6). |
| `20261128_permission-catalog.sql` | Catálogo final de permisos: acciones especiales con herencia, `view_detail` a quien tiene `view`, y retiro de `change_status`, `update_prices` y `settings` (Fase 8.3). |
| `20261129_realtime.sql` | Tiempo real (websocket, E1): `fn_set_updated_at()` con `clock_timestamp()`, `updated_at` + trigger en 15 tablas que no lo tenían y trigger en `product_prices`, tablas `realtime_events` y `realtime_tickets`, y el usuario `importadora_realtime` con mínimo privilegio. Requiere PostgreSQL 13+. Se deshace con `20261129_realtime_down.sql`. |
| `20261130_doc-series-prefix-per-warehouse.sql` | Cada bodega con su prefijo en las series de pedidos, traslados, cotizaciones, compras y pagos (`PED-01-`…): esos números son únicos por compañía y las tres bodegas compartían prefijo y contador. Solo afecta números futuros. |

Todas son idempotentes: se pueden correr más de una vez.

## Cómo aplicarlas

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/core/db/migrations/20261127_cart-item-price-tier.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/core/db/migrations/20261128_permission-catalog.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/core/db/migrations/20261129_realtime.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/core/db/migrations/20261130_doc-series-prefix-per-warehouse.sql
# luego, con la contraseña del despliegue (nunca en el repo):
psql "$DATABASE_URL" -c "ALTER ROLE importadora_realtime PASSWORD '<la del despliegue>'"
```

## Evidencia de aplicación

Anotar aquí cada vez que se apliquen a una base (fecha, base, comando y resultado).

| Fecha | Base | Migración | Resultado |
|---|---|---|---|
| 2026-11-11 | Local PostgreSQL 18.6, bases temporales | `20261127` a `20261130` sobre el `startdb.pgsql` anterior | Aplican sin error y una segunda vez también (idempotentes). `pg_dump --schema-only` de la base migrada y de la creada con el `startdb.pgsql` nuevo: **idénticos**. Permisos sembrados idénticos (126 permisos y las mismas asignaciones por empleado). |
| 2026-11-11 | Local, `importadora_test` | Rol `importadora_realtime` | Con `SET ROLE`: `INSERT customers` y `INSERT realtime_events` negados; `SELECT realtime_events`, `UPDATE realtime_tickets(used_at)` y purga permitidos; `UPDATE realtime_tickets(actor_id)` negado. Dos `UPDATE` en la misma transacción → `updated_at` distintos. |
| 2026-11-11 | Local, `importadora_test` | Semilla de `startdb.pgsql` | `scripts/seed/seed_checks.py`: 66/66 reglas de negocio sin hallazgos. Pruebas de integración de la API (`TEST_DATABASE_URL`) en verde. |
| 2026-11-11 | `Importadora` (local) | `20261127` a `20261130` | Aplicadas y registradas en `schema_migrations` (respaldo previo en `backups/Importadora-antes-de-migraciones-20261127-20261130.dump`). Esquema, permisos del rol, catálogo (126) y series idénticos a los de `startdb.pgsql`. |
| 2026-11-11 | `Importadora` (local) | Recreada desde `startdb.pgsql` | Para limpiar los datos de demostración viejos (respaldo previo en `backups/Importadora-migrada-antes-de-recrear.dump`). `seed_checks.py` 66/66, esquema igual al del script y pruebas de integración de la API contra ella en verde. |
| — | Producción (Railway) | `20261127` a `20261130` | **Pendiente.** Solo migraciones: nunca recrear ni correr `startdb.pgsql` sobre producción. |

### Comprobar que `startdb.pgsql` equivale a la base migrada (Fase 9.1)

```bash
pg_dump --schema-only "$BASE_MIGRADA" > migrada.sql
pg_dump --schema-only "$BASE_NUEVA_DESDE_STARTDB" > nueva.sql
diff migrada.sql nueva.sql   # no debe haber diferencias
```

`core/bootstrap/routes_guard_test.go` ya revisa, sin base, que esta migración y `startdb.pgsql` siembren cada módulo y acción especial del catálogo.

### Pruebas con base de la migración del tiempo real (E1)

Pendientes de correr con `psql` (anotar el resultado en la tabla de evidencia):

1. Base A creada con el `startdb.pgsql` anterior + las migraciones; base B creada con el `startdb.pgsql` nuevo; `pg_dump --schema-only` de las dos → `diff` vacío.
2. Conectado como `importadora_realtime`: `INSERT INTO customers …` → `permission denied`; `SELECT * FROM realtime_events` → OK; `UPDATE realtime_tickets SET used_at = now()` → OK; `UPDATE realtime_tickets SET actor_id = 1` → `permission denied`.
3. `BEGIN; UPDATE brands SET name = name WHERE id = 1 RETURNING updated_at; UPDATE brands SET name = name WHERE id = 1 RETURNING updated_at; COMMIT;` → dos `updated_at` distintos.

Sin base, `core/db/realtime_schema_test.go` ya revisa que toda tabla con `updated_at` tenga trigger, que la función use `clock_timestamp()`, que las tablas nuevas sean iguales en la migración y en `startdb.pgsql`, y los permisos exactos del rol.

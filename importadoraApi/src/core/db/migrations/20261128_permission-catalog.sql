-- 20261128_permission-catalog.sql
-- Catálogo final de permisos (PLAN-AJUSTES-UI-PERMISOS, Fase 8.3). Fuente de verdad de los nombres: src/core/types/permission_types.go
-- Por qué:
--   1. Las acciones especiales (avanzar etapa, facturar, anular factura, verificar abonos, conciliar, abrir/cerrar caja, reubicar,
--      conteo físico, recibir compra o traslado, aprobar devoluciones, exportar) tenían que compartir edit/create/delete con el resto
--      del módulo. Ahora cada una tiene su llave y su casilla en el panel de permisos.
--   2. Las rutas GET /:id ahora exigen view_detail (antes nadie lo pedía).
--   3. change_status y update_prices se retiran: el estado viaja en PUT/DELETE (edit/delete) y los precios con edit_prices.
-- Nadie pierde acceso: cada llave nueva se entrega a quien hoy tiene la llave que protegía esa ruta, y view_detail a quien tiene view.
-- Idempotente: se puede correr más de una vez. Nunca correr startdb.pgsql sobre una base existente; esta migración es la que se aplica.

BEGIN;

-- 1. módulos operativos con sus acciones base (ver, ver detalle, crear, editar, borrar)
INSERT INTO permissions (module, action, description)
SELECT m.module, a.action, m.label || ' · ' || a.label
FROM (VALUES
    ('catalog', 'Catálogo de la tienda'), ('quotations', 'Cotizaciones'), ('orders', 'Pedidos y facturas'), ('cash', 'Caja'),
    ('returns', 'Devoluciones y garantías'), ('purchases', 'Compras'), ('suppliers', 'Proveedores y transportadoras'), ('products', 'Productos'),
    ('transfers', 'Traslados entre bodegas'), ('brands', 'Marcas'), ('categories', 'Categorías'), ('models', 'Modelos'),
    ('stock', 'Inventario, conteos y ubicaciones'), ('credits', 'Créditos y cartera'), ('payments', 'Pagos y conciliación bancaria'),
    ('customers', 'Clientes'), ('employees', 'Empleados'), ('roles', 'Roles y permisos'), ('reports', 'Reportes'),
    ('audit', 'Auditoría y papelera'), ('warehouses', 'Sedes y series de documentos'), ('invoices', 'Facturas de las cajas')
) AS m(module, label)
CROSS JOIN (VALUES
    ('view', 'ver'), ('view_detail', 'ver detalle'), ('create', 'crear'), ('edit', 'editar'), ('delete', 'borrar')
) AS a(action, label)
ON CONFLICT (module, action) DO NOTHING;

-- 2. acciones especiales
INSERT INTO permissions (module, action, description)
VALUES
    ('products', 'edit_prices', 'Productos · editar precios'),
    ('catalog', 'edit_prices', 'Catálogo de la tienda · editar precios'),
    ('orders', 'verify_payment', 'Pedidos · verificar el pago'),
    ('orders', 'advance_stage', 'Pedidos · avanzar etapa (alistar, empacar, despachar, entregar)'),
    ('orders', 'invoice', 'Pedidos · facturar'),
    ('invoices', 'annul', 'Facturas · anular'),
    ('payments', 'verify', 'Pagos · verificar, rechazar o reabrir abonos'),
    ('payments', 'reconcile', 'Pagos · conciliar extractos bancarios'),
    ('cash', 'open_close', 'Caja · abrir y cerrar turno'),
    ('stock', 'relocate', 'Inventario · reubicar productos'),
    ('stock', 'count', 'Inventario · registrar conteo físico'),
    ('stock', 'count_verify', 'Inventario · verificar y corroborar conteos'),
    ('purchases', 'receive', 'Compras · recibir mercancía'),
    ('transfers', 'receive', 'Traslados · recibir'),
    ('returns', 'approve', 'Devoluciones · aprobar o rechazar'),
    ('reports', 'export', 'Reportes · exportar a Excel')
ON CONFLICT (module, action) DO UPDATE SET description = EXCLUDED.description;

-- 3. herencia: quien hoy pasa la ruta con la llave vieja recibe la llave nueva (no se pierde ningún acceso)
INSERT INTO employee_permissions (employee_id, permission_id)
SELECT DISTINCT ep.employee_id, target.id
FROM (VALUES
    ('products', 'edit_prices', 'products', 'update_prices'),
    ('catalog', 'edit_prices', 'catalog', 'update_prices'),
    ('orders', 'verify_payment', 'orders', 'edit'),
    ('orders', 'advance_stage', 'orders', 'edit'),
    ('orders', 'invoice', 'orders', 'edit'),
    ('invoices', 'annul', 'orders', 'delete'),
    ('payments', 'verify', 'payments', 'edit'),
    ('payments', 'reconcile', 'payments', 'edit'),
    ('cash', 'open_close', 'cash', 'create'),
    ('cash', 'open_close', 'cash', 'edit'),
    ('stock', 'relocate', 'stock', 'edit'),
    ('stock', 'count', 'stock', 'create'),
    ('stock', 'count', 'stock', 'edit'),
    ('stock', 'count_verify', 'stock', 'edit'),
    ('purchases', 'receive', 'purchases', 'edit'),
    ('transfers', 'receive', 'transfers', 'edit'),
    ('returns', 'approve', 'returns', 'edit'),
    ('reports', 'export', 'reports', 'view')
) AS h(module, action, from_module, from_action)
JOIN permissions source ON source.module = h.from_module AND source.action = h.from_action
JOIN employee_permissions ep ON ep.permission_id = source.id
JOIN permissions target ON target.module = h.module AND target.action = h.action
ON CONFLICT (employee_id, permission_id) DO NOTHING;

-- 4. GET /:id exige ahora view_detail: se entrega a quien ya tenía view del mismo módulo
INSERT INTO employee_permissions (employee_id, permission_id)
SELECT DISTINCT ep.employee_id, detail.id
FROM employee_permissions ep
JOIN permissions viewp ON viewp.id = ep.permission_id AND viewp.action = 'view'
JOIN permissions detail ON detail.module = viewp.module AND detail.action = 'view_detail'
ON CONFLICT (employee_id, permission_id) DO NOTHING;

-- 5. se retiran las llaves que ninguna ruta exige (sus asignaciones caen por ON DELETE CASCADE)
DELETE FROM permissions WHERE action IN ('change_status', 'update_prices');
-- 'settings' nunca existió en la semilla; la ruta del protector usa screensaver:edit (solo admin de la compañía y superadmin)
DELETE FROM permissions WHERE module = 'settings';

COMMIT;

# Qué es de la compañía y qué es de cada bodega

**Regla:** casi todo es de la **compañía**; la bodega solo guarda lo físico y lo operativo de su sede.

## De la compañía (cualquier bodega lo ve y lo usa)
- **Empleados**: son de la compañía; cada uno pertenece a una bodega (su sede), pero se listan y se consultan por compañía.
- **Clientes** y su cartera.
- **Productos** y su catálogo (precios, categorías, marcas, modelos).
- **Cotizaciones**: son un registro de la compañía. Una cotización creada en la bodega 1 se consulta y se puede continuar en la bodega 2. Crear o editar una cotización **no mueve ni reserva unidades**: el stock solo cambia cuando se continúa a pedido (venta).
- Roles y permisos, compañía, auditoría.

## De cada bodega
- **Unidades físicas** de cada producto (stock) y sus **ubicaciones**.
- **Empleados asignados** a la sede.
- **Datos de la bodega**: fiscales, de facturación y consecutivos.
- **Turno y cierre de caja** (efectivo, transferencias y abonos del turno).
- **Traslados**: salen de una bodega y llegan a otra; un empleado solo pide traslados hacia su propia sede, el administrador entre dos bodegas cualquiera.

## Cómo se garantiza
- Ninguna consulta de cotizaciones, clientes, productos ni empleados filtra por bodega (solo por `company_id`; la bodega es un filtro opcional de la pantalla).
- La tabla `quotations` no tiene `warehouse_id`.
- `scripts/e2e/flow_payments_transfers.py` comprueba que una cotización no altera el stock y que la ve un empleado de otra bodega.

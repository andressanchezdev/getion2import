"""seed_checks · revisa que la semilla de startdb.pgsql sea coherente con el flujo de la API (66 reglas de negocio por flujo)
conecta con: src/core/db/startdb.pgsql (la base se crea con él) y las reglas de los servicios (sale_service, sale_invoice_service,
cart_item_service, NextSerialCode…); las llaves foráneas ya las garantiza PostgreSQL, esto revisa lo que ellas no ven
uso: crear una base vacía, cargarle startdb.pgsql y correr
     python -I scripts/seed/seed_checks.py "C:/Program Files/PostgreSQL/18/bin/psql.exe" importadora_test
     (con PGHOST, PGUSER y PGPASSWORD en el entorno). Termina con código 1 si alguna regla tiene hallazgos.
ojo: si cambia una regla del flujo en la API, se cambia aquí también"""
import os, subprocess, sys

PSQL, DB = sys.argv[1], sys.argv[2]

C = []  # (flujo, regla, consulta que devuelve las filas que la incumplen)


def c(flow, rule, sql):
    C.append((flow, rule, sql))


# ── Ventas ──
c('ventas', 'total del pedido = suma de sus líneas', """
select s.serial_code, s.total, sum(i.line_total) from sales s join sale_items i on i.sale_id=s.id group by s.id having abs(s.total - sum(i.line_total)) > 0.01""")
c('ventas', 'subtotal/iva/descuento del pedido = suma de sus líneas', """
select s.serial_code, s.subtotal, sum(i.subtotal), s.iva_total, sum(i.iva_amount) from sales s join sale_items i on i.sale_id=s.id group by s.id
having abs(s.subtotal - sum(i.subtotal)) > 0.01 or abs(s.iva_total - sum(i.iva_amount)) > 0.01 or abs(s.discount_total - sum(i.discount)) > 0.01""")
c('ventas', 'línea (como sale_service): subtotal = cant × precio; IVA = (subtotal − desc) × %IVA; total = subtotal − desc + IVA', """
select s.serial_code, i.product_code, i.quantity, i.unit_price, i.discount, i.iva_percent, i.subtotal, i.iva_amount, i.line_total from sale_items i join sales s on s.id=i.sale_id
where abs(i.subtotal - i.quantity*i.unit_price) > 0.01 or abs(i.iva_amount - round((i.subtotal - i.discount) * coalesce(i.iva_percent,0) / 100, 2)) > 0.01
   or abs(i.line_total - (i.subtotal - i.discount + i.iva_amount)) > 0.01""")
c('ventas', 'IVA de la línea = IVA del producto', """
select s.serial_code, i.product_code, i.iva_percent, p.iva from sale_items i join sales s on s.id=i.sale_id join products p on p.id=i.product_id where i.iva_percent is distinct from p.iva""")
c('ventas', 'pedido sin líneas', "select s.serial_code from sales s where not exists (select 1 from sale_items i where i.sale_id=s.id)")
c('ventas', 'línea: stock del mismo producto, bodega del pedido y compañía', """
select s.serial_code, i.product_code, st.warehouse_id, s.warehouse_id from sale_items i join sales s on s.id=i.sale_id join stock st on st.id=i.stock_id
where st.product_id <> i.product_id or st.warehouse_id <> s.warehouse_id or st.company_id <> s.company_id""")
c('ventas', 'línea: código y nombre iguales al producto', """
select s.serial_code, i.product_code, p.code, i.product_name, p.name from sale_items i join sales s on s.id=i.sale_id join products p on p.id=i.product_id
where i.product_code <> p.code or i.product_name <> p.name""")
c('ventas', 'línea: precio = tarifa vigente del producto en su nivel (Fase 6)', """
select s.serial_code, i.product_code, i.price_tier, i.unit_price, pp.price from sale_items i join sales s on s.id=i.sale_id
left join product_prices pp on pp.product_id=i.product_id and pp.price_tier=i.price_tier where pp.price is null or abs(pp.price - i.unit_price) > 0.01""")
c('ventas', 'cliente, vendedor y bodega de la misma compañía del pedido', """
select s.serial_code from sales s join customers cu on cu.id=s.customer_id join warehouses w on w.id=s.warehouse_id left join employees e on e.id=s.employee_id
where cu.company_id<>s.company_id or w.company_id<>s.company_id or (e.id is not null and e.company_id<>s.company_id)""")
c('ventas', 'estado coherente con la etapa (cancelado ↔ cancelled, completado ↔ sent)', """
select serial_code, status, current_stage from sales where (status='cancelled') <> (current_stage='cancelled') or (status='completed') <> (current_stage='sent')""")
c('ventas', 'historial: la última etapa abierta es la etapa actual', """
select s.serial_code, s.current_stage, h.stage from sales s left join lateral (select stage from sale_stage_history h where h.sale_id=s.id and h.left_at is null order by entered_at desc limit 1) h on true
where h.stage is distinct from s.current_stage""")
c('ventas', 'historial: una sola etapa abierta por pedido', "select sale_id, count(*) from sale_stage_history where left_at is null group by sale_id having count(*) > 1")
c('ventas', 'historial: cada etapa cierra al entrar la siguiente', """
select h.sale_id, h.stage, h.left_at, n.entered_at from sale_stage_history h join lateral (select entered_at from sale_stage_history n where n.sale_id=h.sale_id and n.entered_at > h.entered_at order by n.entered_at limit 1) n on true
where h.left_at is null or abs(extract(epoch from (h.left_at - n.entered_at))) > 1""")
c('ventas', 'pagado del pedido = suma de sus pagos verificados', """
select s.serial_code, s.paid_total, coalesce(sum(p.amount) filter (where p.status='verified'),0) from sales s left join payments p on p.sale_id=s.id
group by s.id having abs(s.paid_total - coalesce(sum(p.amount) filter (where p.status='verified'),0)) > 0.01""")
c('ventas', 'pagado + crédito no supera el total (salvo cancelados)', """
select serial_code, total, paid_total, credit_amount from sales where status<>'cancelled' and paid_total + credit_amount > total + 0.01""")
c('cartera', 'crédito facturado: cargo = total y deuda neta del pedido = parte a crédito (como sale_invoice_service)', """
select s.serial_code, s.total, s.credit_amount, -sum(ce.amount) filter (where ce.entry_type='charge'), -coalesce(sum(ce.amount),0) from sales s left join credit_entries ce on ce.sale_id=s.id
where s.payment_method='credit' and s.current_stage in ('invoicing','invoicing_ok','dispatch','sent') group by s.id
having abs(coalesce(-sum(ce.amount) filter (where ce.entry_type='charge'),0) - s.total) > 0.01 or abs(-coalesce(sum(ce.amount),0) - s.credit_amount) > 0.01""")
c('cartera', 'crédito sin facturar no tiene cargo todavía', """
select s.serial_code from sales s join credit_entries ce on ce.sale_id=s.id and ce.entry_type='charge' where s.current_stage not in ('invoicing','invoicing_ok','dispatch','sent')""")
c('ventas', 'cotización convertida ↔ pedido ligado', """
select q.serial_code, q.status, q.sale_id from quotations q where (q.status='converted') <> (q.sale_id is not null)""")

# ── Facturas ──
c('facturas', 'factura de un pedido que ya pasó por facturación', """
select i.number, s.serial_code, s.current_stage from invoices i join sales s on s.id=i.sale_id
where s.current_stage not in ('invoicing','invoicing_ok','dispatch','sent') and i.status='issued'""")
c('facturas', 'pedido facturado tiene fecha de venta', "select serial_code from sales where current_stage in ('invoicing','invoicing_ok','dispatch','sent') and sale_at is null")
c('facturas', 'número de factura único y consecutivo por bodega; la serie sigue al último', """
select w.code, d.next_number, count(i.id) from warehouses w join doc_series d on d.warehouse_id=w.id and d.doc_type='invoice' left join invoices i on i.warehouse_id=w.id and i.kind='invoice' group by w.id, d.next_number having d.next_number <> count(i.id)+1""")
c('facturas', 'factura en la bodega del pedido y con la facturación de esa bodega', """
select i.number from invoices i join sales s on s.id=i.sale_id join warehouse_facturation wf on wf.id=i.warehouse_facturation_id
where i.warehouse_id<>s.warehouse_id or wf.warehouse_id<>i.warehouse_id or i.company_id<>s.company_id""")
c('facturas', 'pedido en etapa ≥ facturado tiene factura', """
select s.serial_code, s.current_stage from sales s where s.current_stage in ('invoicing','invoicing_ok','dispatch','sent') and not exists (select 1 from invoices i where i.sale_id=s.id and i.status='issued')""")

# ── Stock ──
c('stock', 'reservado = unidades de pedidos abiertos (se liberan al enviar o cancelar)', """
with r as (select i.stock_id, sum(i.quantity) q from sale_items i join sales s on s.id=i.sale_id
           where s.status='open' and s.current_stage <> 'cancelled' group by i.stock_id)
select st.id, p.code, st.warehouse_id, st.reserved, coalesce(r.q,0) from stock st join products p on p.id=st.product_id left join r on r.stock_id=st.id
where st.reserved <> coalesce(r.q,0)""")
c('stock', 'reservado no supera lo disponible y nada negativo', "select id, available, reserved from stock where reserved > available or available < 0 or reserved < 0")
c('stock', 'la ubicación existe en las ubicaciones de esa bodega', """
select st.id, st.warehouse_id, st.location from stock st where st.location <> '' and not exists (select 1 from warehouse_locations l where l.warehouse_id=st.warehouse_id and l.code=st.location)""")
c('stock', 'producto y bodega de la misma compañía del stock', """
select st.id from stock st join products p on p.id=st.product_id join warehouses w on w.id=st.warehouse_id where p.company_id<>st.company_id or w.company_id<>st.company_id""")
c('stock', 'kardex: nuevo = anterior ± cantidad', """
select id, movement_type, quantity, previous_qty, new_qty from audit_movements where new_qty <> previous_qty + quantity and new_qty <> previous_qty - quantity""")

# ── Productos ──
c('productos', 'cada producto activo tiene las 4 tarifas', """
select p.code, count(pp.id) from products p left join product_prices pp on pp.product_id=p.id where p.status='active' group by p.id having count(distinct pp.price_tier) < 4""")
c('productos', 'tarifas sin precio o en cero', "select p.code, pp.price_tier, pp.price from product_prices pp join products p on p.id=pp.product_id where pp.price is null or pp.price <= 0")
c('productos', 'proveedor del producto es un proveedor de la misma compañía', """
select p.code, x.name, x.kind from product_suppliers ps join products p on p.id=ps.product_id join externals x on x.id=ps.supplier_id where x.kind<>'supplier' or x.company_id<>p.company_id""")
c('productos', 'categoría, marca y modelo de la misma compañía', """
select p.code from products p left join categories c on c.id=p.category_id left join brands b on b.id=p.brand_id
where (c.id is not null and c.company_id<>p.company_id) or (b.id is not null and b.company_id<>p.company_id)""")

# ── Traslados ──
c('traslados', 'origen distinto del destino y bodegas de la compañía', """
select t.serial_code from transfers t join warehouses o on o.id=t.origin_warehouse_id join warehouses d on d.id=t.destination_warehouse_id
where t.origin_warehouse_id=t.destination_warehouse_id or o.company_id<>t.company_id or d.company_id<>t.company_id""")
c('traslados', 'línea: stock de origen en la bodega de origen y del mismo producto', """
select t.serial_code, dt.product_code from details_transfer dt join transfers t on t.id=dt.transfer_id join stock o on o.id=dt.origin_stock_id
where o.warehouse_id<>t.origin_warehouse_id or o.product_id<>dt.product_id""")
c('traslados', 'línea: stock de destino (si hay) en la bodega de destino y del mismo producto', """
select t.serial_code, dt.product_code from details_transfer dt join transfers t on t.id=dt.transfer_id join stock d on d.id=dt.destination_stock_id
where d.warehouse_id<>t.destination_warehouse_id or d.product_id<>dt.product_id""")
c('traslados', 'estado coherente con fechas y responsables', """
select serial_code, status from transfers where
 (status='pending' and (dispatched_at is not null or received_at is not null)) or
 (status='in_transit' and (dispatched_at is null or dispatched_by_employee_id is null or received_at is not null)) or
 (status in ('received','with_novelty') and (dispatched_at is null or received_at is null or received_by_employee_id is null)) or
 (status='cancelled' and cancel_reason is null) or (status='with_novelty' and novelty_notes is null)""")
c('traslados', 'recibido: cantidad recibida registrada y no mayor a la enviada', """
select t.serial_code, dt.product_code, dt.quantity, dt.received_qty from details_transfer dt join transfers t on t.id=dt.transfer_id
where (t.status in ('received','with_novelty') and dt.received_qty is null) or dt.received_qty > dt.quantity or (t.status='received' and dt.received_qty <> dt.quantity)""")

# ── Compras ──
c('compras', 'línea: subtotal = cantidad × costo', "select purchase_id, product_id, quantity, unit_cost, subtotal from purchase_items where abs(subtotal - quantity*unit_cost) > 0.01")
c('compras', 'orden: subtotal = suma de líneas y total = subtotal + IVA', """
select pu.serial_code, pu.subtotal, sum(pi.subtotal), pu.iva_total, pu.total from purchases pu join purchase_items pi on pi.purchase_id=pu.id group by pu.id
having abs(pu.subtotal - sum(pi.subtotal)) > 0.01 or abs(pu.total - (pu.subtotal + pu.iva_total)) > 0.01""")
c('compras', 'estado coherente con lo recibido', """
select pu.serial_code, pu.status, sum(pi.quantity), sum(pi.received_qty) from purchases pu join purchase_items pi on pi.purchase_id=pu.id group by pu.id
having (pu.status='received' and sum(pi.received_qty) <> sum(pi.quantity)) or (pu.status='partial' and (sum(pi.received_qty)=0 or sum(pi.received_qty)>=sum(pi.quantity)))
 or (pu.status in ('draft','ordered') and sum(pi.received_qty) > 0) or bool_or(pi.received_qty > pi.quantity)""")
c('compras', 'proveedor de la compañía y pagado ≤ total', """
select pu.serial_code from purchases pu join externals x on x.id=pu.supplier_id where x.kind<>'supplier' or x.company_id<>pu.company_id or pu.paid_total > pu.total + 0.01""")

# ── Pagos y cartera ──
c('pagos', 'el pago es del mismo cliente y compañía que su pedido', """
select p.serial_code, s.serial_code from payments p join sales s on s.id=p.sale_id where p.customer_id<>s.customer_id or p.company_id<>s.company_id""")
c('pagos', 'verificado ↔ fecha y quién verificó; anulado ↔ motivo', """
select serial_code, status from payments where (status='verified' and (verified_at is null or verified_by_employee_id is null)) or (status='voided' and void_reason is null) or (status='issue' and issue_note is null)""")
c('pagos', 'pago en caja: la caja es de la bodega del pedido', """
select p.serial_code from payments p join cash_sessions cs on cs.id=p.cash_session_id left join sales s on s.id=p.sale_id where cs.company_id<>p.company_id or (s.id is not null and cs.warehouse_id<>s.warehouse_id)""")
c('cartera', 'cliente con movimientos de crédito tiene crédito habilitado', """
select distinct cu.name from credit_entries ce join customers cu on cu.id=ce.customer_id where ce.entry_type='charge' and not cu.credit_enabled""")
c('cartera', 'deuda del cliente no supera su cupo', """
select cu.name, cu.credit_limit, -sum(ce.amount) from credit_entries ce join customers cu on cu.id=ce.customer_id group by cu.id having -sum(ce.amount) > cu.credit_limit + 0.01""")
c('cartera', 'abono del libro ligado a un pago verificado del mismo cliente', """
select ce.id from credit_entries ce join payments p on p.id=ce.payment_id where p.customer_id<>ce.customer_id or p.status<>'verified'""")
c('conciliación', 'movimiento confirmado ↔ quién y cuándo', "select id, status from bank_statement_records where (status='confirmed') <> (confirmed_at is not null and confirmed_by_id is not null)")

# ── Caja ──
c('caja', 'una sola caja abierta por bodega', "select warehouse_id, count(*) from cash_sessions where status='open' group by warehouse_id having count(*) > 1")
c('caja', 'caja cerrada con cierre completo; abierta sin cierre', """
select id, status from cash_sessions where (status='closed' and (closed_at is null or counted_cash is null or closed_by_name is null)) or (status='open' and closed_at is not null)""")
c('caja', 'cierre: diferencia = contado − esperado', "select id, expected_cash, counted_cash, difference from cash_sessions where status='closed' and abs(difference - (counted_cash - expected_cash)) > 0.01")

# ── Devoluciones ──
c('devoluciones', 'la línea devuelta es del pedido de la devolución y no excede lo vendido', """
select r.id, si.sale_id, r.sale_id, ri.quantity, si.quantity from return_items ri join returns r on r.id=ri.return_id join sale_items si on si.id=ri.sale_item_id
where si.sale_id<>r.sale_id or ri.quantity > si.quantity""")
c('devoluciones', 'cliente de la devolución = cliente del pedido; aprobada ↔ quién y cuándo', """
select r.id from returns r join sales s on s.id=r.sale_id where r.customer_id<>s.customer_id or (r.status='approved') <> (r.approved_at is not null and r.approved_by_employee_id is not null) or (r.status='rejected' and r.reject_reason is null)""")
c('devoluciones', 'solo se devuelve lo de pedidos entregados', "select r.id, s.current_stage from returns r join sales s on s.id=r.sale_id where s.current_stage <> 'sent'")

# ── Carrito, cotizaciones y conteos ──
c('carrito', 'línea: stock de la bodega del carrito, del producto y precio de su nivel', """
select ca.id, ci.product_id, ci.price_tier, ci.unit_price, pp.price from cart_items ci join carts ca on ca.id=ci.cart_id join stock st on st.id=ci.stock_id
left join product_prices pp on pp.product_id=ci.product_id and pp.price_tier=ci.price_tier
where st.warehouse_id<>ca.warehouse_id or st.product_id<>ci.product_id or pp.price is null or abs(pp.price-ci.unit_price) > 0.01""")
c('carrito', 'dueño del carrito: empleado de la compañía', "select ca.id from carts ca left join employees e on e.id=ca.employee_id where e.id is null or e.company_id<>ca.company_id")
c('cotizaciones', 'total = suma de líneas', """
select q.serial_code, q.total, sum(qi.line_total) from quotations q join quotation_items qi on qi.quotation_id=q.id group by q.id having abs(q.total - sum(qi.line_total)) > 0.01""")
c('conteos', 'línea: stock de la bodega del conteo; corroborado ↔ cerrado', """
select co.id from count_items ci join counts co on co.id=ci.count_id join stock st on st.id=ci.stock_id where st.warehouse_id<>co.warehouse_id
union all select id from counts where (status='corroborated') <> (closed_at is not null)""")

# ── Personas, accesos y series ──
c('personas', 'admin ligado a un empleado de su misma compañía y correo', """
select a.email, e.email from admins a left join employees e on e.id=a.employee_id where e.id is null or e.company_id<>a.company_id or e.email<>a.email""")
c('personas', 'empleado en una bodega de su compañía', "select e.email from employees e join warehouses w on w.id=e.warehouse_id where w.company_id<>e.company_id")
c('personas', 'empleado de prueba sin ningún permiso', """
select e.email, r.code from employees e join roles r on r.id=e.role_id where e.status='active' and not exists (select 1 from employee_permissions ep where ep.employee_id=e.id)""")
c('personas', 'notificación con un solo destinatario', "select id from notifications where (employee_id is null) = (admin_id is null)")
c('series', 'documentos únicos por compañía: cada bodega con un prefijo distinto', """
select d.doc_type, d.prefix, count(*) from doc_series d where d.doc_type <> 'invoice' group by d.company_id, d.doc_type, d.prefix having count(*) > 1""")
c('series', 'cada bodega tiene su serie por tipo de documento', """
select w.code, t.doc_type from warehouses w cross join (select distinct doc_type from doc_series) t where not exists (select 1 from doc_series d where d.warehouse_id=w.id and d.doc_type=t.doc_type)""")
c('series', 'facturación activa por bodega', "select w.code from warehouses w where not exists (select 1 from warehouse_facturation f where f.warehouse_id=w.id and f.is_active)")
c('clientes', 'documento del cliente guardado en su carpeta', "select cd.id, cd.customer_id, cd.file_url from customer_documents cd where cd.file_url not like '/uploads/customers/' || cd.customer_id || '/%'")

env = dict(os.environ)
fails = 0
for flow, rule, sql in C:
    q = 'select count(*) from (%s) x' % sql.strip()
    r = subprocess.run([PSQL, '-d', DB, '-At', '-c', q], capture_output=True, text=True, env=env, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        print('ERROR  [%s] %s :: %s' % (flow, rule, (r.stderr or '').strip().splitlines()[-1:]))
        fails += 1
        continue
    n = int(r.stdout.strip() or 0)
    if n == 0:
        print('ok     [%s] %s' % (flow, rule))
        continue
    fails += 1
    sample = subprocess.run([PSQL, '-d', DB, '-At', '-F', ' | ', '-c', sql.strip() + ' limit 4'], capture_output=True, text=True, env=env, encoding='utf-8', errors='replace').stdout.strip()
    print('FALLA  [%s] %s → %d filas\n         %s' % (flow, rule, n, sample.replace('\n', '\n         ')))
print('\n%d reglas, %d con hallazgos' % (len(C), fails))

-- Utilidades que se cargan antes de cada escenario (viven solo en la sesión de prueba)
CREATE FUNCTION pg_temp.emp(p_email text) RETURNS bigint LANGUAGE sql AS $$ SELECT id FROM users WHERE email = p_email $$;   -- el empleado es un usuario
CREATE FUNCTION pg_temp.usr(p_email text) RETURNS bigint LANGUAGE sql AS $$ SELECT id FROM users WHERE email = p_email $$;
CREATE FUNCTION pg_temp.cust(p_email text) RETURNS bigint LANGUAGE sql AS $$ SELECT id FROM customers WHERE email = p_email $$;
CREATE FUNCTION pg_temp.new_sale(p_serial text, p_customer text, p_method text, p_immediate boolean DEFAULT false) RETURNS bigint LANGUAGE sql AS $$
  INSERT INTO sales (company_id, serial_code, customer_id, seller_id, warehouse_id, payment_method, immediate_picking)
  VALUES (1, p_serial, pg_temp.cust(p_customer), pg_temp.emp('vendedor1@demo.local'), 1, p_method, p_immediate) RETURNING id $$;
CREATE FUNCTION pg_temp.add_item(p_sale bigint, p_product bigint, p_loc bigint, p_qty int, p_price numeric) RETURNS void LANGUAGE sql AS $$
  INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price) VALUES (p_sale, p_product, p_loc, p_qty, p_price) $$;
CREATE FUNCTION pg_temp.st_take(p_sale bigint, p_stage text, p_email text) RETURNS void LANGUAGE sql AS $$
  UPDATE sale_stages SET status = 'occupied', assigned_to = pg_temp.emp(p_email) WHERE sale_id = p_sale AND stage = p_stage $$;
CREATE FUNCTION pg_temp.st_done(p_sale bigint, p_stage text) RETURNS void LANGUAGE sql AS $$
  UPDATE sale_stages SET status = 'completed' WHERE sale_id = p_sale AND stage = p_stage $$;
CREATE FUNCTION pg_temp.st_verify(p_sale bigint, p_stage text, p_email text) RETURNS void LANGUAGE sql AS $$
  UPDATE sale_stages SET status = 'verified', verified_by = pg_temp.emp(p_email) WHERE sale_id = p_sale AND stage = p_stage $$;
-- Lleva un pedido por el flujo hasta la etapa pedida (p_stop). Para efectivo y transferencia registra y verifica el pago.
CREATE FUNCTION pg_temp.flow(p_serial text, p_cust text, p_method text, p_product bigint, p_loc bigint, p_qty int, p_price numeric, p_stop text DEFAULT 'delivery') RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_sale bigint; v_total numeric;
BEGIN
  v_sale := pg_temp.new_sale(p_serial, p_cust, p_method);
  PERFORM pg_temp.add_item(v_sale, p_product, p_loc, p_qty, p_price);
  SELECT total INTO v_total FROM sales WHERE id = v_sale;
  PERFORM pg_temp.st_take(v_sale, 'verification', 'vendedor1@demo.local'); PERFORM pg_temp.st_done(v_sale, 'verification'); PERFORM pg_temp.st_verify(v_sale, 'verification', 'vendedor1@demo.local');
  IF p_stop = 'verification' THEN RETURN v_sale; END IF;
  IF p_method <> 'credit' THEN
    INSERT INTO payments (company_id, sale_id, method, amount, proof_url)
    VALUES (1, v_sale, p_method, v_total, CASE WHEN p_method = 'transfer' THEN 'comprobante.png' END);
    UPDATE payments SET status = 'verified', verified_by = pg_temp.emp('facturador1@demo.local') WHERE sale_id = v_sale;
  END IF;
  PERFORM pg_temp.st_take(v_sale, 'invoicing', 'facturador1@demo.local'); PERFORM pg_temp.st_done(v_sale, 'invoicing'); PERFORM pg_temp.st_verify(v_sale, 'invoicing', 'facturador1@demo.local');
  IF p_stop = 'invoicing' THEN RETURN v_sale; END IF;
  UPDATE sale_items SET picked_qty = quantity WHERE sale_id = v_sale;
  PERFORM pg_temp.st_take(v_sale, 'picking', 'bodeguero1@demo.local'); PERFORM pg_temp.st_done(v_sale, 'picking'); PERFORM pg_temp.st_verify(v_sale, 'picking', 'bodeguero1@demo.local');
  IF p_stop = 'picking' THEN RETURN v_sale; END IF;
  UPDATE sale_items SET packed_qty = quantity WHERE sale_id = v_sale;
  PERFORM pg_temp.st_take(v_sale, 'packing', 'bodeguero1@demo.local'); PERFORM pg_temp.st_done(v_sale, 'packing'); PERFORM pg_temp.st_verify(v_sale, 'packing', 'bodeguero1@demo.local');
  IF p_stop = 'packing' THEN RETURN v_sale; END IF;
  PERFORM pg_temp.st_take(v_sale, 'shipping', 'despachador1@demo.local'); PERFORM pg_temp.st_done(v_sale, 'shipping'); PERFORM pg_temp.st_verify(v_sale, 'shipping', 'despachador1@demo.local');
  IF p_stop = 'shipping' THEN RETURN v_sale; END IF;
  PERFORM pg_temp.st_take(v_sale, 'delivery', 'despachador1@demo.local'); PERFORM pg_temp.st_done(v_sale, 'delivery'); PERFORM pg_temp.st_verify(v_sale, 'delivery', 'despachador1@demo.local');
  RETURN v_sale;
END $$;
-- Id de la segunda compañía (los identificadores no vuelven atrás al deshacer, por eso se busca por NIT)
CREATE FUNCTION pg_temp.c2() RETURNS bigint LANGUAGE sql AS $$ SELECT id FROM companies WHERE nit = '900000009-9' $$;
-- Una segunda compañía con una marca conectada, un producto, una bodega y un cliente
CREATE FUNCTION pg_temp.company2() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO companies (name, nit) VALUES ('Moto Aliada', '900000009-9');
  INSERT INTO company_brands (company_id, brand_id) VALUES (pg_temp.c2(), (SELECT id FROM brands WHERE name = 'Kixx'));
  INSERT INTO categories (company_id, name) VALUES (pg_temp.c2(), 'ACEITE');
  INSERT INTO models (company_id, name) VALUES (pg_temp.c2(), '15W40');
  INSERT INTO products (company_id, brand_id, category_id, model_id, code)
  VALUES (pg_temp.c2(), (SELECT id FROM brands WHERE name = 'Kixx'), (SELECT id FROM categories WHERE company_id = pg_temp.c2()), (SELECT id FROM models WHERE company_id = pg_temp.c2()), 'ALI-15W40');
  INSERT INTO warehouses (company_id, code, name) VALUES (pg_temp.c2(), 'B1', 'Bodega aliada');
  INSERT INTO customers (company_id, document, name, price_level_id) VALUES (pg_temp.c2(), 'CC9', 'Cliente aliado', (SELECT id FROM price_levels WHERE company_id = pg_temp.c2() AND code = 'P0'));
END $$;

-- TEST: 00 · cuántas tablas hay y que ningún nombre sea demasiado largo
-- EXPECT-ROWS: [{"tablas":48,"tablas_largas":0,"campos_largos":0}]
SELECT (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relispartition)::int AS tablas,
       (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND length(table_name) > 20)::int AS tablas_largas,
       (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND length(column_name) > 20)::int AS campos_largos;

-- TEST: 01 · semillas: 10 roles, 20 usuarios y 44 permisos
-- EXPECT-ROWS: [{"roles":10,"usuarios":20,"permisos":44,"empleados":18,"clientes":2}]
SELECT (SELECT count(*) FROM roles WHERE company_id = 1)::int AS roles, (SELECT count(*) FROM users)::int AS usuarios,
       (SELECT count(*) FROM permissions)::int AS permisos, (SELECT count(*) FROM users WHERE user_type = 'employee')::int AS empleados, (SELECT count(*) FROM customers)::int AS clientes;

-- TEST: 02 · dos usuarios por rol
-- EXPECT-ROWS: [{"roles_con_dos":10}]
SELECT count(*)::int AS roles_con_dos FROM (SELECT r.code FROM roles r JOIN users u ON u.role_id = r.id GROUP BY r.code HAVING count(*) = 2) x;

-- TEST: 03 · el superadmin tiene todos los permisos y el admin ninguno
-- EXPECT-ROWS: [{"superadmin":44,"admin":0}]
SELECT (SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.code = 'superadmin')::int AS superadmin,
       (SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.code = 'admin')::int AS admin;

-- TEST: 04 · la auditoría solo la ve el superadmin
-- EXPECT-ROWS: [{"roles":"superadmin"}]
SELECT string_agg(DISTINCT r.code, ',' ORDER BY r.code) AS roles FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id WHERE p.module = 'audit';

-- TEST: 05 · los demás roles solo tienen permisos de su área (ejemplos)
-- EXPECT-ROWS: [{"bodeguero_picking":true,"bodeguero_facturar":false,"vendedor_picking":false,"despachador_envio":true,"cartera_verificar":true,"compras_ordenes":true}]
SELECT user_can(pg_temp.emp('bodeguero1@demo.local'), 'orders', 'take_picking') AS bodeguero_picking,
       user_can(pg_temp.emp('bodeguero1@demo.local'), 'orders', 'take_invoicing') AS bodeguero_facturar,
       user_can(pg_temp.emp('vendedor1@demo.local'), 'orders', 'take_picking') AS vendedor_picking,
       user_can(pg_temp.emp('despachador1@demo.local'), 'orders', 'take_shipping') AS despachador_envio,
       user_can(pg_temp.emp('cartera1@demo.local'), 'wallet', 'verify') AS cartera_verificar,
       user_can(pg_temp.emp('compras1@demo.local'), 'purchase_orders', 'manage') AS compras_ordenes;

-- TEST: 06 · un usuario activo inicia sesión
-- EXPECT-ROWS: [{"n":1}]
INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (pg_temp.usr('vendedor1@demo.local'), 'abc', now() + interval '1 day');
SELECT count(*)::int AS n FROM refresh_tokens;

-- TEST: 07 · un usuario bloqueado NO puede iniciar sesión
-- EXPECT-ERROR: no puede iniciar sesión
UPDATE users SET status = 'blocked' WHERE email = 'vendedor1@demo.local';
INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (pg_temp.usr('vendedor1@demo.local'), 'abc', now() + interval '1 day');

-- TEST: 08 · un cliente inactivo no puede iniciar sesión y su usuario queda inactivo
-- EXPECT-ROWS: [{"permitido":false,"estado":"inactive"}]
UPDATE customers SET status = 'inactive' WHERE email = 'cliente1@demo.local';
SELECT auth_login_allowed(pg_temp.usr('cliente1@demo.local')) AS permitido, (SELECT status FROM users WHERE email = 'cliente1@demo.local') AS estado;

-- TEST: 09 · los empleados traen su cédula y su bodega principal (user_warehouses); el área sale del rol; los clientes no
-- EXPECT-ROWS: [{"empleados_completos":18,"clientes_sin_datos":2}]
SELECT (SELECT count(*) FROM users u JOIN roles r ON r.id = u.role_id JOIN user_warehouses w ON w.user_id = u.id AND w.is_primary
         WHERE u.user_type = 'employee' AND u.document IS NOT NULL AND r.area IS NOT NULL)::int AS empleados_completos,
       (SELECT count(*) FROM users u WHERE u.user_type = 'customer' AND u.document IS NULL AND NOT EXISTS (SELECT 1 FROM user_warehouses w WHERE w.user_id = u.id))::int AS clientes_sin_datos;

-- TEST: 10 · al desactivar un usuario se cierran sus sesiones
-- EXPECT-ROWS: [{"abiertas":0}]
INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (pg_temp.usr('vendedor1@demo.local'), 'abc', now() + interval '1 day');
UPDATE users SET status = 'inactive' WHERE email = 'vendedor1@demo.local';
SELECT count(*)::int AS abiertas FROM refresh_tokens WHERE revoked_at IS NULL;

-- TEST: 11 · una compañía nueva recibe roles (con permisos) y niveles de precio; sin superadmin
-- EXPECT-ROWS: [{"roles":9,"globales":0,"mismos_permisos":true,"niveles":4}]
INSERT INTO companies (name, nit) VALUES ('Moto Aliada', '900000009-9');
SELECT (SELECT count(*) FROM roles WHERE company_id = pg_temp.c2())::int AS roles, (SELECT count(*) FROM roles WHERE company_id = pg_temp.c2() AND is_global)::int AS globales,
       (SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.company_id = pg_temp.c2()) = (SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.company_id = 1 AND NOT r.is_global) AS mismos_permisos,
       (SELECT count(*) FROM price_levels WHERE company_id = pg_temp.c2())::int AS niveles;

-- TEST: 12 · solo puede haber una compañía anfitriona
-- EXPECT-ERROR: uq_companies_host
INSERT INTO companies (name, nit, is_host) VALUES ('Otra anfitriona', '1-1', TRUE);

-- TEST: 13 · un rol global solo existe en la anfitriona
-- EXPECT-ERROR: rol global
INSERT INTO companies (name, nit) VALUES ('Moto Aliada', '900000009-9');
INSERT INTO roles (company_id, code, name, is_global) VALUES (pg_temp.c2(), 'sa2', 'Otro superadmin', TRUE);

-- TEST: 14 · el superadmin accede a todas las compañías; los demás solo a la suya
-- EXPECT-ROWS: [{"superadmin_c2":true,"vendedor_c2":false,"vendedor_c1":true}]
INSERT INTO companies (name, nit) VALUES ('Moto Aliada', '900000009-9');
SELECT user_can_access_company(pg_temp.usr('superadmin1@demo.local'), pg_temp.c2()) AS superadmin_c2, user_can_access_company(pg_temp.usr('vendedor1@demo.local'), pg_temp.c2()) AS vendedor_c2, user_can_access_company(pg_temp.usr('vendedor1@demo.local'), 1) AS vendedor_c1;

-- TEST: 15 · un usuario de una compañía no puede tener el rol de otra
-- EXPECT-ERROR: pertenece a otra compañía
INSERT INTO companies (name, nit) VALUES ('Moto Aliada', '900000009-9');
INSERT INTO users (company_id, role_id, email, password_hash, full_name, user_type)
VALUES (1, (SELECT id FROM roles WHERE company_id = pg_temp.c2() AND code = 'vendedor'), 'x@demo.local', 'h', 'X', 'employee');

-- TEST: 16 · cambiar el rol de un usuario cambia lo que puede hacer (un usuario, un rol)
-- EXPECT-ROWS: [{"antes_picking":false,"despues_picking":true,"despues_verificacion":false}]
CREATE TEMP TABLE tn6 AS SELECT user_can(pg_temp.usr('vendedor1@demo.local'), 'orders', 'take_picking') AS antes;
UPDATE users SET role_id = (SELECT id FROM roles WHERE company_id = 1 AND code = 'bodeguero') WHERE email = 'vendedor1@demo.local';
SELECT (SELECT antes FROM tn6) AS antes_picking, user_can(pg_temp.usr('vendedor1@demo.local'), 'orders', 'take_picking') AS despues_picking,
       user_can(pg_temp.usr('vendedor1@demo.local'), 'orders', 'take_verification') AS despues_verificacion;

-- TEST: 17 · un pedido no puede usar el cliente de otra compañía
-- EXPECT-ERROR: pertenece a otra compañía
SELECT pg_temp.company2();
INSERT INTO sales (company_id, serial_code, customer_id, warehouse_id, payment_method)
VALUES (1, 'PD-X', (SELECT id FROM customers WHERE company_id = pg_temp.c2()), 1, 'cash');

-- TEST: 18 · un producto solo puede tener una marca con la que su compañía esté conectada
-- EXPECT-ERROR: no está conectada con la marca
INSERT INTO companies (name, nit) VALUES ('Moto Aliada', '900000009-9');
INSERT INTO products (company_id, brand_id, code, name) VALUES (pg_temp.c2(), (SELECT id FROM brands WHERE name = 'Yamaha'), 'C-1', 'Producto');

-- TEST: 19 · con la marca conectada el producto se crea y la base arma su texto de búsqueda y su QR
-- EXPECT-ROWS: [{"ok":true}]
SELECT pg_temp.company2();
SELECT position('kixx' in search_text) > 0 AND position('15w40' in search_text) > 0 AND qr_payload = 'IMP:' || uuid AS ok FROM products WHERE company_id = pg_temp.c2();

-- TEST: 20 · una categoría de otra compañía no sirve para un producto
-- EXPECT-ERROR: pertenece a otra compañía
INSERT INTO products (company_id, brand_id, category_id, code, name) VALUES (1, (SELECT id FROM brands WHERE name = 'Kixx'), 1, 'PX', 'X');
INSERT INTO companies (name, nit) VALUES ('Moto Aliada', '900000009-9');
INSERT INTO categories (company_id, name) VALUES (pg_temp.c2(), 'ACEITE');
INSERT INTO products (company_id, brand_id, category_id, code, name) VALUES (1, (SELECT id FROM brands WHERE name = 'Kixx'), (SELECT id FROM categories WHERE company_id = pg_temp.c2()), 'PY', 'Y');

-- TEST: 21 · un cliente guarda sus direcciones y contactos dentro de su ficha
-- EXPECT-ROWS: [{"direcciones":2,"contactos":1}]
UPDATE customers SET addresses = '[{"label":"Taller","address":"Cra 7 # 10-20","city":"Bogotá","is_default":true},{"label":"Bodega","address":"Calle 80 # 20-5","city":"Bogotá","is_default":false}]'::jsonb,
       contacts = '[{"name":"Marta Gómez","phone":"3001112233"}]'::jsonb WHERE email = 'cliente1@demo.local';
SELECT jsonb_array_length(addresses)::int AS direcciones, jsonb_array_length(contacts)::int AS contactos FROM customers WHERE email = 'cliente1@demo.local';

-- TEST: 22 · el mismo NIT no se repite entre los proveedores de una compañía
-- EXPECT-ERROR: uq_third_parties_nit
INSERT INTO third_parties (company_id, kind, nit, name) VALUES (1, 'supplier', '800100001-1', 'Otro proveedor');

-- TEST: 23 · un producto solo se anexa a terceros de tipo proveedor
-- EXPECT-ERROR: no es un tercero de tipo supplier
INSERT INTO product_suppliers (product_id, supplier_id, cost) VALUES (1, (SELECT id FROM third_parties WHERE kind = 'carrier' LIMIT 1), 1000);

-- TEST: 24 · el envío de un pedido solo lleva transportadoras
-- EXPECT-ERROR: no es un tercero de tipo carrier
INSERT INTO sales (company_id, serial_code, customer_id, warehouse_id, payment_method, carrier_id)
VALUES (1, 'PD-X', pg_temp.cust('cliente1@demo.local'), 1, 'cash', (SELECT id FROM third_parties WHERE kind = 'supplier' LIMIT 1));

-- TEST: 25 · un pedido guarda su envío: transportadora y número de guía
-- EXPECT-ROWS: [{"transportadora":"Servientrega","guia":"G-123"}]
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente1@demo.local', 'cash'), 1, 1, 1, 10000);
UPDATE sales SET carrier_id = (SELECT id FROM third_parties WHERE kind = 'carrier' AND name = 'Servientrega'), tracking_no = 'G-123' WHERE serial_code = 'PD-1';
SELECT t.name AS transportadora, s.tracking_no AS guia FROM sales s JOIN third_parties t ON t.id = s.carrier_id WHERE s.serial_code = 'PD-1';

-- TEST: 26 · el carrito aparta stock
-- EXPECT-ROWS: [{"in_cart":5,"sellable":12}]
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 5);
SELECT in_cart, available - in_cart - reserved AS sellable FROM stock WHERE id = 1;

-- TEST: 27 · no se puede apartar más de lo que hay
-- EXPECT-ERROR: Stock insuficiente
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 99);

-- TEST: 28 · un producto sin existencias no se agrega al carrito
-- EXPECT-ERROR: Stock insuficiente
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 2, 2, 1);

-- TEST: 29 · abandonar el carrito libera lo apartado
-- EXPECT-ROWS: [{"in_cart":0}]
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 5);
UPDATE carts SET status = 'abandoned' WHERE id = (SELECT max(id) FROM carts);
SELECT in_cart FROM stock WHERE id = 1;

-- TEST: 30 · un carrito vencido se libera solo
-- EXPECT-ROWS: [{"in_cart":0}]
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 5);
UPDATE carts SET expires_at = now() - interval '1 minute' WHERE id = (SELECT max(id) FROM carts);
SELECT release_expired_carts();
SELECT in_cart FROM stock WHERE id = 1;

-- TEST: 31 · un producto inactivo no se agrega al carrito
-- EXPECT-ERROR: no está activo
UPDATE products SET status = 'inactive' WHERE id = 1;
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 1);

-- TEST: 32 · un cliente inactivo no puede tener carrito
-- EXPECT-ERROR: está inactivo
UPDATE customers SET status = 'inactive' WHERE email = 'cliente2@demo.local';
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);

-- TEST: 33 · no se repite la misma existencia: un producto, en una bodega y una ubicación
-- EXPECT-ERROR: stock_product_id_warehouse_id_location_key
INSERT INTO stock (product_id, warehouse_id, location, available) VALUES (1, 1, '04-F01', 5);

-- TEST: 34 · stock compartido: la compañía ve la suma de todas sus bodegas
-- EXPECT-ROWS: [{"disponible":34,"vendible":34,"prestado":0}]
SELECT available AS disponible, sellable AS vendible, borrowed AS prestado FROM v_stock_company WHERE company_id = 1 AND product_id = 1;

-- TEST: 35 · stock virtual: cada tienda suma lo vendible de las bodegas que la surten y se mueve con el físico
-- EXPECT-ROWS: [{"en_linea":29,"fisica":12}]
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 5);
SELECT (SELECT v.sellable FROM v_virtual_stock v JOIN stores s ON s.id = v.store_id WHERE s.code = 'ONLINE' AND v.product_id = 1) AS en_linea,
       (SELECT v.sellable FROM v_virtual_stock v JOIN stores s ON s.id = v.store_id WHERE s.code = 'TIENDA1' AND v.product_id = 1) AS fisica;

-- TEST: 36 · el stock prestado suma al stock compartido de quien lo recibe
-- EXPECT-ROWS: [{"prestado":10,"puede_vender":10}]
SELECT pg_temp.company2();
INSERT INTO stock_shares (owner_company_id, borrower_company_id, stock_id, borrower_product_id, qty_authorized) VALUES (1, pg_temp.c2(), 1, (SELECT id FROM products WHERE company_id = pg_temp.c2()), 10);
SELECT borrowed AS prestado, can_sell AS puede_vender FROM v_stock_company WHERE company_id = pg_temp.c2();

-- TEST: 37 · las ubicaciones salen del stock: la vista cuenta los productos y las unidades de cada una
-- EXPECT-ROWS: [{"productos":4,"unidades":128}]
SELECT products AS productos, items AS unidades FROM v_locations WHERE warehouse_id = 1 AND location = '04-F01';

-- TEST: 38 · un pedido reserva stock y la base calcula el total
-- EXPECT-ROWS: [{"reservado":3,"total_ok":true,"etapas":6,"etapa":"verification","estado":"available"}]
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 3, 10000);
SELECT (SELECT reserved FROM stock WHERE id = 1) AS reservado, s.total = 30000 AS total_ok,
       (SELECT count(*) FROM sale_stages WHERE sale_id = s.id)::int AS etapas, s.current_stage AS etapa, s.stage_state AS estado FROM sales s WHERE serial_code = 'PD-1';

-- TEST: 39 · no se puede pedir más de lo disponible
-- EXPECT-ERROR: Stock insuficiente
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 999, 10000);

-- TEST: 40 · un producto inactivo no se agrega al pedido
-- EXPECT-ERROR: no está activo
UPDATE products SET status = 'inactive' WHERE id = 1;
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);

-- TEST: 41 · un cliente inactivo no puede hacer pedidos
-- EXPECT-ERROR: está inactivo
UPDATE customers SET status = 'inactive' WHERE email = 'cliente2@demo.local';
SELECT pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash');

-- TEST: 42 · un pedido no puede pasar a picking sin haber pasado por las etapas anteriores
-- EXPECT-ERROR: la etapa anterior del pedido
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'picking', 'bodeguero1@demo.local');

-- TEST: 43 · un empleado sin permiso para la etapa no puede tomarla
-- EXPECT-ERROR: no tiene permiso para la etapa
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'bodeguero1@demo.local');

-- TEST: 44 · si un empleado tomó la etapa, otro no puede tomarla
-- EXPECT-ERROR: ya la tiene tomada otro empleado
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor1@demo.local');
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor2@demo.local');

-- TEST: 45 · una etapa no se verifica sin haberse completado
-- EXPECT-ERROR: no puede pasar de occupied a verified
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor1@demo.local');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor1@demo.local');

-- TEST: 46 · quien verifica debe tener el permiso de esa etapa
-- EXPECT-ERROR: no tiene permiso para verificar la etapa
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'despachador1@demo.local');

-- TEST: 47 · una etapa se puede pausar y reanudar
-- EXPECT-ROWS: [{"estado":"occupied"}]
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor1@demo.local');
UPDATE sale_stages SET status = 'paused' WHERE stage = 'verification';
UPDATE sale_stages SET status = 'occupied' WHERE stage = 'verification';
SELECT status AS estado FROM sale_stages WHERE stage = 'verification';

-- TEST: 48 · devolver una etapa completada exige motivo
-- EXPECT-ERROR: exige un motivo
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification');
UPDATE sale_stages SET status = 'occupied' WHERE stage = 'verification';

-- TEST: 49 · con motivo la etapa se devuelve
-- EXPECT-ROWS: [{"estado":"occupied"}]
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification');
SELECT set_config('app.reason', 'Faltó confirmar la dirección', true);
UPDATE sale_stages SET status = 'occupied' WHERE stage = 'verification';
SELECT status AS estado FROM sale_stages WHERE stage = 'verification';

-- TEST: 50 · verificar la facturación sin pago verificado se rechaza
-- EXPECT-ERROR: no cubre el total del pedido
SELECT pg_temp.flow('PD-1', 'cliente2@demo.local', 'cash', 1, 1, 2, 10000, 'verification');
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'invoicing', 'facturador1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'invoicing');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'invoicing', 'facturador1@demo.local');

-- TEST: 51 · una transferencia no se verifica sin comprobante
-- EXPECT-ERROR: necesita su comprobante
SELECT pg_temp.flow('PD-1', 'cliente2@demo.local', 'transfer', 1, 1, 2, 10000, 'verification');
INSERT INTO payments (company_id, sale_id, method, amount) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), 'transfer', 20000);
UPDATE payments SET status = 'verified', verified_by = pg_temp.emp('facturador1@demo.local');

-- TEST: 52 · quien verifica un pago debe tener permiso
-- EXPECT-ERROR: no tiene permiso para verificar pagos
SELECT pg_temp.flow('PD-1', 'cliente2@demo.local', 'cash', 1, 1, 2, 10000, 'verification');
INSERT INTO payments (company_id, sale_id, method, amount) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), 'cash', 20000);
UPDATE payments SET status = 'verified', verified_by = pg_temp.emp('despachador1@demo.local');

-- TEST: 53 · pedido en efectivo: al verificar el pago pasa a ser venta (de contado) y entra como ingreso
-- EXPECT-ROWS: [{"es_venta":true,"condicion":"cash","pagado_ok":true,"debe":0}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000, 'invoicing');
SELECT s.sale_at IS NOT NULL AS es_venta, s.payment_condition AS condicion, s.paid_total = 48000 AS pagado_ok,
       (SELECT pending_credit FROM v_customer_credit WHERE customer_id = s.customer_id)::int AS debe FROM sales s WHERE serial_code = 'PD-1';

-- TEST: 54 · pedido por transferencia con comprobante verificado también pasa a ser venta de contado
-- EXPECT-ROWS: [{"es_venta":true,"condicion":"cash"}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'transfer', 3, 3, 2, 24000, 'invoicing');
SELECT sale_at IS NOT NULL AS es_venta, payment_condition AS condicion FROM sales WHERE serial_code = 'PD-1';

-- TEST: 55 · pedido a crédito: pasa a ser venta a crédito (nos deben, no es ingreso)
-- EXPECT-ROWS: [{"condicion":"credit","pagado":0,"pendiente_ok":true,"disponible_ok":true}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'credit', 3, 3, 4, 25000, 'invoicing');
SELECT s.payment_condition AS condicion, s.paid_total::int AS pagado, v.pending_credit = 100000 AS pendiente_ok, v.available_credit = 1900000 AS disponible_ok
FROM sales s JOIN v_customer_credit v ON v.customer_id = s.customer_id WHERE s.serial_code = 'PD-1';

-- TEST: 56 · el crédito se rechaza si el cliente no lo tiene habilitado
-- EXPECT-ERROR: no tiene el crédito habilitado
SELECT pg_temp.flow('PD-1', 'cliente2@demo.local', 'credit', 3, 3, 1, 24000, 'invoicing');

-- TEST: 57 · el crédito se rechaza si supera el cupo
-- EXPECT-ERROR: supera el cupo de crédito
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'credit', 7, 7, 20, 200000, 'invoicing');

-- TEST: 58 · un abono verificado baja la deuda
-- EXPECT-ROWS: [{"pendiente_ok":true,"pagado_ok":true}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'credit', 3, 3, 4, 25000, 'invoicing');
INSERT INTO payments (company_id, sale_id, method, amount) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), 'cash', 40000);
UPDATE payments SET status = 'verified', verified_by = pg_temp.emp('cartera1@demo.local');
SELECT v.pending_credit = 60000 AS pendiente_ok, s.paid_total = 40000 AS pagado_ok FROM sales s JOIN v_customer_credit v ON v.customer_id = s.customer_id WHERE s.serial_code = 'PD-1';

-- TEST: 59 · un abono no puede superar lo que se debe
-- EXPECT-ERROR: supera lo pendiente del pedido
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'credit', 3, 3, 4, 25000, 'invoicing');
INSERT INTO payments (company_id, sale_id, method, amount) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), 'cash', 40000);
INSERT INTO payments (company_id, sale_id, method, amount) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), 'cash', 70000);

-- TEST: 60 · un abono anulado devuelve la deuda
-- EXPECT-ROWS: [{"pendiente_ok":true}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'credit', 3, 3, 4, 25000, 'invoicing');
INSERT INTO payments (company_id, sale_id, method, amount) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), 'cash', 40000);
UPDATE payments SET status = 'verified', verified_by = pg_temp.emp('cartera1@demo.local');
UPDATE payments SET status = 'voided', void_reason = 'Consignación devuelta por el banco';
SELECT pending_credit = 100000 AS pendiente_ok FROM v_customer_credit WHERE customer_id = pg_temp.cust('cliente1@demo.local');

-- TEST: 61 · un abono con novedad se describe y no cuenta como pagado
-- EXPECT-ROWS: [{"estado":"issue","pagado":0}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'credit', 3, 3, 4, 25000, 'invoicing');
INSERT INTO payments (company_id, sale_id, method, amount) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), 'transfer', 40000);
UPDATE payments SET status = 'issue', issue_note = 'El valor no coincide con el comprobante';
SELECT (SELECT status FROM payments LIMIT 1) AS estado, (SELECT paid_total::int FROM sales WHERE serial_code = 'PD-1') AS pagado;

-- TEST: 62 · picking inmediato: se completa y verifica en un solo paso
-- EXPECT-ROWS: [{"picking":"verified","sacadas":true,"empaque_disponible":true}]
SELECT pg_temp.new_sale('PD-1', 'cliente1@demo.local', 'cash', TRUE);
SELECT pg_temp.add_item((SELECT id FROM sales WHERE serial_code = 'PD-1'), 3, 3, 2, 24000);
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor1@demo.local');
INSERT INTO payments (company_id, sale_id, method, amount) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), 'cash', 48000);
UPDATE payments SET status = 'verified', verified_by = pg_temp.emp('facturador1@demo.local');
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'invoicing', 'facturador1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'invoicing');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'invoicing', 'facturador1@demo.local');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'picking', 'bodeguero1@demo.local');
SELECT (SELECT status FROM sale_stages WHERE stage = 'picking') AS picking, (SELECT bool_and(picked_qty = quantity) FROM sale_items) AS sacadas,
       (SELECT current_stage = 'packing' AND stage_state = 'available' FROM sales WHERE serial_code = 'PD-1') AS empaque_disponible;

-- TEST: 63 · sin la marca de picking inmediato, el picking no se verifica directo
-- EXPECT-ERROR: no puede pasar de available a verified
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000, 'invoicing');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'picking', 'bodeguero1@demo.local');

-- TEST: 64 · el picking solo se completa cuando todos los ítems salieron de la estantería
-- EXPECT-ERROR: Faltan ítems por sacar
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000, 'invoicing');
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'picking', 'bodeguero1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'picking');

-- TEST: 65 · no se empaca lo que no se sacó
-- EXPECT-ERROR: check constraint
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000, 'invoicing');
UPDATE sale_items SET packed_qty = quantity;

-- TEST: 66 · cuando el pedido ya es venta no se le cambian los productos
-- EXPECT-ERROR: ya es venta
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000, 'invoicing');
SELECT pg_temp.add_item((SELECT id FROM sales WHERE serial_code = 'PD-1'), 5, 5, 1, 1000);

-- TEST: 67 · flujo completo: al verificar el envío el stock sale y queda en el kardex; al verificar la entrega el pedido se completa
-- EXPECT-ROWS: [{"estado":"completed","condicion":"cash","disponible":25,"reservado":0,"movimientos":1}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000);
SELECT s.status AS estado, s.payment_condition AS condicion, (SELECT available FROM stock WHERE id = 3) AS disponible,
       (SELECT reserved FROM stock WHERE id = 3) AS reservado,
       (SELECT count(*) FROM stock_movements WHERE document_type = 'sale' AND document_id = s.id AND movement_type = 'sale_out')::int AS movimientos FROM sales s WHERE serial_code = 'PD-1';

-- TEST: 68 · un pedido completado no se reabre
-- EXPECT-ERROR: no se puede reabrir
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000);
UPDATE sales SET status = 'open' WHERE serial_code = 'PD-1';

-- TEST: 69 · cancelar libera el stock; lo ya pagado queda como crédito a favor
-- EXPECT-ROWS: [{"reservado":0,"a_favor_ok":true,"estado":"cancelled"}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000, 'invoicing');
UPDATE sales SET status = 'cancelled', cancel_reason = 'El cliente desistió', cancelled_by = pg_temp.usr('vendedor1@demo.local') WHERE serial_code = 'PD-1';
SELECT (SELECT reserved FROM stock WHERE id = 3) AS reservado,
       (SELECT credit_in_favor = 48000 FROM v_customer_credit WHERE customer_id = pg_temp.cust('cliente1@demo.local')) AS a_favor_ok, status AS estado FROM sales WHERE serial_code = 'PD-1';

-- TEST: 70 · cancelar un pedido a crédito anula la deuda
-- EXPECT-ROWS: [{"deuda":0}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'credit', 3, 3, 4, 25000, 'invoicing');
UPDATE sales SET status = 'cancelled', cancel_reason = 'Error de digitación', cancelled_by = pg_temp.usr('vendedor1@demo.local') WHERE serial_code = 'PD-1';
SELECT pending_credit::int AS deuda FROM v_customer_credit WHERE customer_id = pg_temp.cust('cliente1@demo.local');

-- TEST: 71 · cancelar exige motivo
-- EXPECT-ERROR: check constraint
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
UPDATE sales SET status = 'cancelled' WHERE serial_code = 'PD-1';

-- TEST: 72 · un pedido que ya está en envío no se puede cancelar
-- EXPECT-ERROR: ya está en envío
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000, 'packing');
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'shipping', 'despachador1@demo.local');
UPDATE sales SET status = 'cancelled', cancel_reason = 'Tarde' WHERE serial_code = 'PD-1';

-- TEST: 73 · una devolución solo se hace sobre una venta
-- EXPECT-ERROR: Solo se pueden devolver productos de una venta
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente1@demo.local', 'cash'), 1, 1, 1, 10000);
INSERT INTO returns (company_id, sale_id, customer_id, reason, total) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), pg_temp.cust('cliente1@demo.local'), 'No sirvió', 10000);

-- TEST: 74 · la devolución NO devuelve dinero: genera crédito a favor y el producto vuelve al inventario
-- EXPECT-ROWS: [{"a_favor_ok":true,"disponible":26}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000);
INSERT INTO returns (company_id, sale_id, customer_id, reason, total) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), pg_temp.cust('cliente1@demo.local'), 'El repuesto no le sirvió', 24000);
INSERT INTO return_items (return_id, sale_item_id, quantity, restock) VALUES ((SELECT max(id) FROM returns), (SELECT max(id) FROM sale_items), 1, TRUE);
UPDATE returns SET status = 'approved', approved_by = pg_temp.emp('cartera1@demo.local'), approved_at = now();
SELECT (SELECT credit_in_favor = 24000 FROM v_customer_credit WHERE customer_id = pg_temp.cust('cliente1@demo.local')) AS a_favor_ok,
       (SELECT available FROM stock WHERE id = 3) AS disponible;

-- TEST: 75 · la devolución nunca es un reembolso en dinero
-- EXPECT-ERROR: check constraint
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000);
INSERT INTO returns (company_id, sale_id, customer_id, reason, total, resolution) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), pg_temp.cust('cliente1@demo.local'), 'x', 24000, 'cash_refund');

-- TEST: 76 · solo quien tiene el permiso aprueba devoluciones
-- EXPECT-ERROR: no tiene permiso para aprobar devoluciones
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000);
INSERT INTO returns (company_id, sale_id, customer_id, reason, total) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), pg_temp.cust('cliente1@demo.local'), 'x', 24000);
UPDATE returns SET status = 'approved', approved_by = pg_temp.emp('vendedor1@demo.local'), approved_at = now();

-- TEST: 77 · el crédito a favor se usa como método de pago
-- EXPECT-ROWS: [{"a_favor_ok":true}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000);
INSERT INTO returns (company_id, sale_id, customer_id, reason, total) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-1'), pg_temp.cust('cliente1@demo.local'), 'x', 24000);
UPDATE returns SET status = 'approved', approved_by = pg_temp.emp('cartera1@demo.local'), approved_at = now();
SELECT pg_temp.add_item(pg_temp.new_sale('PD-2', 'cliente1@demo.local', 'favor'), 1, 1, 1, 10000);
INSERT INTO payments (company_id, sale_id, method, amount) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-2'), 'favor', 10000);
UPDATE payments SET status = 'verified', verified_by = pg_temp.emp('cartera1@demo.local') WHERE sale_id = (SELECT id FROM sales WHERE serial_code = 'PD-2');
SELECT (SELECT credit_in_favor = 14000 FROM v_customer_credit WHERE customer_id = pg_temp.cust('cliente1@demo.local')) AS a_favor_ok;

-- TEST: 78 · el crédito a favor no puede quedar negativo
-- EXPECT-ERROR: no puede quedar negativo
SELECT pg_temp.add_item(pg_temp.new_sale('PD-2', 'cliente1@demo.local', 'favor'), 1, 1, 1, 10000);
INSERT INTO payments (company_id, sale_id, method, amount) VALUES (1, (SELECT id FROM sales WHERE serial_code = 'PD-2'), 'favor', 10000);
UPDATE payments SET status = 'verified', verified_by = pg_temp.emp('cartera1@demo.local');

-- TEST: 79 · el libro de créditos no se modifica
-- EXPECT-ERROR: no se modifica ni se borra
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'credit', 3, 3, 4, 25000, 'invoicing');
UPDATE credit_entries SET amount = 1;

-- TEST: 80 · una cotización no salta de borrador a aceptada
-- EXPECT-ERROR: no puede pasar de draft a accepted
INSERT INTO quotations (company_id, serial_code, customer_id) VALUES (1, 'CT-1', pg_temp.cust('cliente1@demo.local'));
UPDATE quotations SET status = 'accepted';

-- TEST: 81 · una cotización aceptada se convierte en pedido
-- EXPECT-ROWS: [{"estado":"converted"}]
INSERT INTO quotations (company_id, serial_code, customer_id) VALUES (1, 'CT-1', pg_temp.cust('cliente1@demo.local'));
UPDATE quotations SET status = 'sent';
UPDATE quotations SET status = 'accepted';
SELECT pg_temp.new_sale('PD-1', 'cliente1@demo.local', 'cash');
UPDATE quotations SET status = 'converted', sale_id = (SELECT id FROM sales WHERE serial_code = 'PD-1');
SELECT status AS estado FROM quotations;

-- TEST: 82 · un empleado inactivo no puede tomar una etapa
-- EXPECT-ERROR: no tiene permiso para la etapa
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
UPDATE users SET status = 'inactive' WHERE id = pg_temp.emp('vendedor1@demo.local');
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'PD-1'), 'verification', 'vendedor1@demo.local');

-- TEST: 83 · stock prestado: la otra compañía vende con stock de la dueña y se descuenta de su cupo
-- EXPECT-ROWS: [{"stock_de":1,"cupo_usado":4,"reservado":4}]
SELECT pg_temp.company2();
INSERT INTO stock_shares (owner_company_id, borrower_company_id, stock_id, borrower_product_id, qty_authorized)
VALUES (1, pg_temp.c2(), 1, (SELECT id FROM products WHERE company_id = pg_temp.c2()), 10);
INSERT INTO sales (company_id, serial_code, customer_id, warehouse_id, payment_method)
VALUES (pg_temp.c2(), 'AL-1', (SELECT id FROM customers WHERE company_id = pg_temp.c2()), (SELECT id FROM warehouses WHERE company_id = pg_temp.c2()), 'cash');
INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price)
VALUES ((SELECT id FROM sales WHERE serial_code = 'AL-1'), (SELECT id FROM products WHERE company_id = pg_temp.c2()), 1, 4, 20000);
SELECT (SELECT stock_company_id FROM sale_items LIMIT 1) AS stock_de, (SELECT qty_used FROM stock_shares LIMIT 1) AS cupo_usado, (SELECT reserved FROM stock WHERE id = 1) AS reservado;

-- TEST: 84 · no se puede vender más de lo prestado
-- EXPECT-ERROR: no tiene stock prestado suficiente
SELECT pg_temp.company2();
INSERT INTO stock_shares (owner_company_id, borrower_company_id, stock_id, borrower_product_id, qty_authorized) VALUES (1, pg_temp.c2(), 1, (SELECT id FROM products WHERE company_id = pg_temp.c2()), 10);
INSERT INTO sales (company_id, serial_code, customer_id, warehouse_id, payment_method)
VALUES (pg_temp.c2(), 'AL-1', (SELECT id FROM customers WHERE company_id = pg_temp.c2()), (SELECT id FROM warehouses WHERE company_id = pg_temp.c2()), 'cash');
INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price) VALUES ((SELECT id FROM sales WHERE serial_code = 'AL-1'), (SELECT id FROM products WHERE company_id = pg_temp.c2()), 1, 11, 20000);

-- TEST: 85 · sin préstamo, una compañía no puede usar el stock de otra
-- EXPECT-ERROR: no tiene stock prestado suficiente
SELECT pg_temp.company2();
INSERT INTO sales (company_id, serial_code, customer_id, warehouse_id, payment_method)
VALUES (pg_temp.c2(), 'AL-1', (SELECT id FROM customers WHERE company_id = pg_temp.c2()), (SELECT id FROM warehouses WHERE company_id = pg_temp.c2()), 'cash');
INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price) VALUES ((SELECT id FROM sales WHERE serial_code = 'AL-1'), (SELECT id FROM products WHERE company_id = pg_temp.c2()), 1, 1, 20000);

-- TEST: 86 · no se puede prestar más de lo que hay libre
-- EXPECT-ERROR: No hay stock libre suficiente para prestar
SELECT pg_temp.company2();
INSERT INTO stock_shares (owner_company_id, borrower_company_id, stock_id, borrower_product_id, qty_authorized) VALUES (1, pg_temp.c2(), 1, (SELECT id FROM products WHERE company_id = pg_temp.c2()), 999);

-- TEST: 87 · cancelar el pedido devuelve el cupo prestado y libera el stock
-- EXPECT-ROWS: [{"cupo_usado":0,"reservado":0}]
SELECT pg_temp.company2();
INSERT INTO stock_shares (owner_company_id, borrower_company_id, stock_id, borrower_product_id, qty_authorized) VALUES (1, pg_temp.c2(), 1, (SELECT id FROM products WHERE company_id = pg_temp.c2()), 10);
INSERT INTO sales (company_id, serial_code, customer_id, warehouse_id, payment_method)
VALUES (pg_temp.c2(), 'AL-1', (SELECT id FROM customers WHERE company_id = pg_temp.c2()), (SELECT id FROM warehouses WHERE company_id = pg_temp.c2()), 'cash');
INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price) VALUES ((SELECT id FROM sales WHERE serial_code = 'AL-1'), (SELECT id FROM products WHERE company_id = pg_temp.c2()), 1, 4, 20000);
UPDATE sales SET status = 'cancelled', cancel_reason = 'Prueba' WHERE serial_code = 'AL-1';
SELECT (SELECT qty_used FROM stock_shares LIMIT 1) AS cupo_usado, (SELECT reserved FROM stock WHERE id = 1) AS reservado;

-- TEST: 88 · el stock prestado avisa también a la compañía que lo recibe
-- EXPECT-ROWS: [{"avisos_c1":1,"avisos_c2":1}]
SELECT pg_temp.company2();
INSERT INTO stock_shares (owner_company_id, borrower_company_id, stock_id, borrower_product_id, qty_authorized) VALUES (1, pg_temp.c2(), 1, (SELECT id FROM products WHERE company_id = pg_temp.c2()), 10);
DELETE FROM rt_events;
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 2);
SELECT count(*) FILTER (WHERE company_id = 1)::int AS avisos_c1, count(*) FILTER (WHERE company_id = pg_temp.c2())::int AS avisos_c2 FROM rt_events WHERE event_type = 'stock.updated';

-- TEST: 89 · tiempo real: cada cambio de etapa y de stock deja un evento
-- EXPECT-ROWS: [{"creados":1,"etapas":true,"stock":true,"venta":true}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000);
SELECT count(*) FILTER (WHERE event_type = 'order.created')::int AS creados, count(*) FILTER (WHERE event_type = 'order.stage_changed') > 10 AS etapas,
       count(*) FILTER (WHERE event_type = 'stock.updated') > 0 AS stock, count(*) FILTER (WHERE event_type = 'order.became_sale') = 1 AS venta FROM rt_events;

-- TEST: 90 · un traslado avisa a las dos bodegas y solo tiene las 4 etapas físicas
-- EXPECT-ROWS: [{"avisos":2,"bodegas":2,"etapas":4,"canal":"transfers"}]
INSERT INTO sales (company_id, serial_code, sale_type, warehouse_id, aux_warehouse_id) VALUES (1, 'TR-1', 'traslade', 1, 2);
SELECT count(*)::int AS avisos, count(DISTINCT warehouse_id)::int AS bodegas, (SELECT count(*) FROM sale_stages)::int AS etapas, min(channel) AS canal FROM rt_events WHERE event_type = 'order.created';

-- TEST: 91 · reanudar: quien se desconecta pide los eventos posteriores al último que recibió
-- EXPECT-ROWS: [{"faltantes":2,"son_nuevos":true}]
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 2);
CREATE TEMP TABLE tr1 AS SELECT max(id) AS ultimo FROM rt_events;
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 3, 3, 1);
UPDATE cart_items SET quantity = 4 WHERE stock_id = 1;
SELECT count(*)::int AS faltantes, min(id) > (SELECT ultimo FROM tr1) AS son_nuevos FROM rt_events WHERE company_id = 1 AND id > (SELECT ultimo FROM tr1);

-- TEST: 92 · se limpian los eventos viejos y quedan los recientes
-- EXPECT-ROWS: [{"borrados":1,"quedan":1}]
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 2);
UPDATE rt_events SET created_at = now() - interval '3 days';
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 3, 3, 1);
CREATE TEMP TABLE tr2 AS SELECT rt_purge(48) AS n;
SELECT (SELECT n FROM tr2)::int AS borrados, (SELECT count(*) FROM rt_events)::int AS quedan;

-- TEST: 93 · auditoría: una acción que exige motivo se rechaza sin motivo
-- EXPECT-ERROR: exige un motivo
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
SELECT set_config('app.action', 'sale.cancel', true);
UPDATE sales SET status = 'cancelled', cancel_reason = 'Prueba' WHERE serial_code = 'PD-1';

-- TEST: 94 · auditoría: con motivo queda registrado quién, dónde y por qué
-- EXPECT-ROWS: [{"usuario":"Superadministrador 1","modulo":"tienda/pedidos","bodega":1,"ip":"10.0.0.7","motivo":"Cliente desistió","campos_ok":true}]
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);
SELECT set_config('app.user_id', pg_temp.usr('superadmin1@demo.local')::text, true), set_config('app.company_id', '1', true), set_config('app.module', 'tienda/pedidos', true),
       set_config('app.warehouse_id', '1', true), set_config('app.ip', '10.0.0.7', true), set_config('app.action', 'sale.cancel', true), set_config('app.reason', 'Cliente desistió', true);
UPDATE sales SET status = 'cancelled', cancel_reason = 'Cliente desistió', cancelled_by = pg_temp.usr('superadmin1@demo.local') WHERE serial_code = 'PD-1';
SELECT user_name AS usuario, module AS modulo, warehouse_id AS bodega, host(ip_address) AS ip, reason AS motivo, changed_fields @> ARRAY['status','cancel_reason'] AS campos_ok
FROM audit_events WHERE entity = 'sales' AND action_code = 'sale.cancel' ORDER BY id DESC LIMIT 1;

-- TEST: 95 · auditoría: el registro no se puede modificar ni borrar
-- EXPECT-ERROR: no se puede modificar ni borrar
UPDATE products SET is_promotion = TRUE WHERE id = 1;
UPDATE audit_events SET reason = 'x';

-- TEST: 96 · auditoría: nunca guarda contraseñas
-- EXPECT-ROWS: [{"filtradas":false,"registrado":true}]
UPDATE users SET phone = '3000000000' WHERE email = 'vendedor1@demo.local';
SELECT coalesce(bool_or(after_data ? 'password_hash' OR before_data ? 'password_hash'), FALSE) AS filtradas, count(*) > 0 AS registrado FROM audit_events WHERE entity = 'users';

-- TEST: 97 · auditoría: crear una compañía queda registrado con su compañía
-- EXPECT-ROWS: [{"n":1}]
INSERT INTO companies (name, nit) VALUES ('Moto Aliada', '900000009-9');
SELECT count(*)::int AS n FROM audit_events WHERE entity = 'companies' AND company_id = pg_temp.c2() AND action_code = 'companies.insert';

-- TEST: 98 · las semillas no dejan ruido en la auditoría
-- EXPECT-ROWS: [{"n":0}]
SELECT count(*)::int AS n FROM audit_events;

-- TEST: 99 · cambiar la cantidad de un renglón ajusta lo reservado y borrarlo lo libera
-- EXPECT-ROWS: [{"tras_subir":5,"tras_borrar":0}]
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 3, 10000);
UPDATE sale_items SET quantity = 5;
CREATE TEMP TABLE t89 AS SELECT reserved AS r FROM stock WHERE id = 1;
DELETE FROM sale_items;
SELECT (SELECT r FROM t89) AS tras_subir, (SELECT reserved FROM stock WHERE id = 1) AS tras_borrar;

-- TEST: 100 · del carrito al pedido: el carrito suelta lo apartado y el pedido lo reserva
-- EXPECT-ROWS: [{"in_cart":0,"reserved":5}]
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 5);
UPDATE carts SET status = 'converted' WHERE id = (SELECT max(id) FROM carts);
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 5, 10000);
SELECT in_cart, reserved FROM stock WHERE id = 1;

-- TEST: 101 · dos pedidos no pueden quedarse con la misma última unidad
-- EXPECT-ERROR: Stock insuficiente
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 17, 10000);
SELECT pg_temp.add_item(pg_temp.new_sale('PD-2', 'cliente2@demo.local', 'cash'), 1, 1, 1, 10000);

-- TEST: 102 · un carrito y un pedido también compiten por el mismo stock
-- EXPECT-ERROR: Stock insuficiente
INSERT INTO carts (company_id, customer_id, warehouse_id) VALUES (1, pg_temp.cust('cliente2@demo.local'), 1);
INSERT INTO cart_items (cart_id, product_id, stock_id, quantity) VALUES ((SELECT max(id) FROM carts), 1, 1, 10);
SELECT pg_temp.add_item(pg_temp.new_sale('PD-1', 'cliente2@demo.local', 'cash'), 1, 1, 8, 10000);

-- TEST: 103 · una existencia en la bodega de otra compañía no sirve para un producto
-- EXPECT-ERROR: pertenece a otra compañía
SELECT pg_temp.company2();
INSERT INTO stock (product_id, warehouse_id) VALUES (1, (SELECT id FROM warehouses WHERE company_id = pg_temp.c2()));

-- TEST: 104 · un traslado recorre sus 4 etapas físicas; al verificar el envío sale el stock como traslado
-- EXPECT-ROWS: [{"estado":"completed","movimiento":"transfer_out"}]
INSERT INTO sales (company_id, serial_code, sale_type, warehouse_id, aux_warehouse_id) VALUES (1, 'TR-1', 'traslade', 1, 2);
INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price) VALUES ((SELECT id FROM sales WHERE serial_code = 'TR-1'), 1, 1, 2, 0);
UPDATE sale_items SET picked_qty = quantity;
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'picking', 'bodeguero1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'picking');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'picking', 'bodeguero1@demo.local');
UPDATE sale_items SET packed_qty = quantity;
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'packing', 'bodeguero1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'packing');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'packing', 'bodeguero1@demo.local');
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'shipping', 'despachador1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'shipping');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'shipping', 'despachador1@demo.local');
SELECT pg_temp.st_take((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'delivery', 'despachador1@demo.local');
SELECT pg_temp.st_done((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'delivery');
SELECT pg_temp.st_verify((SELECT id FROM sales WHERE serial_code = 'TR-1'), 'delivery', 'despachador1@demo.local');
SELECT (SELECT status FROM sales WHERE serial_code = 'TR-1') AS estado, (SELECT movement_type FROM stock_movements WHERE document_type = 'sale' LIMIT 1) AS movimiento;

-- TEST: 105 · el picking inmediato es solo para ventas, no para traslados
-- EXPECT-ERROR: picking inmediato es solo para ventas
INSERT INTO sales (company_id, serial_code, sale_type, warehouse_id, aux_warehouse_id, immediate_picking) VALUES (1, 'TR-1', 'traslade', 1, 2, TRUE);

-- TEST: 106 · cerrar un préstamo no impide liberar lo que ya estaba reservado
-- EXPECT-ROWS: [{"cupo_usado":0,"cerrado":true}]
SELECT pg_temp.company2();
INSERT INTO stock_shares (owner_company_id, borrower_company_id, stock_id, borrower_product_id, qty_authorized) VALUES (1, pg_temp.c2(), 1, (SELECT id FROM products WHERE company_id = pg_temp.c2()), 10);
INSERT INTO sales (company_id, serial_code, customer_id, warehouse_id, payment_method)
VALUES (pg_temp.c2(), 'AL-1', (SELECT id FROM customers WHERE company_id = pg_temp.c2()), (SELECT id FROM warehouses WHERE company_id = pg_temp.c2()), 'cash');
INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price) VALUES ((SELECT id FROM sales WHERE serial_code = 'AL-1'), (SELECT id FROM products WHERE company_id = pg_temp.c2()), 1, 4, 20000);
UPDATE stock_shares SET status = 'closed';
UPDATE sales SET status = 'cancelled', cancel_reason = 'Prueba' WHERE serial_code = 'AL-1';
SELECT qty_used AS cupo_usado, closed_at IS NOT NULL AS cerrado FROM stock_shares;

-- TEST: 107 · un préstamo cerrado no admite ventas nuevas
-- EXPECT-ERROR: no tiene stock prestado suficiente
SELECT pg_temp.company2();
INSERT INTO stock_shares (owner_company_id, borrower_company_id, stock_id, borrower_product_id, qty_authorized, status) VALUES (1, pg_temp.c2(), 1, (SELECT id FROM products WHERE company_id = pg_temp.c2()), 10, 'closed');
INSERT INTO sales (company_id, serial_code, customer_id, warehouse_id, payment_method)
VALUES (pg_temp.c2(), 'AL-1', (SELECT id FROM customers WHERE company_id = pg_temp.c2()), (SELECT id FROM warehouses WHERE company_id = pg_temp.c2()), 'cash');
INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price) VALUES ((SELECT id FROM sales WHERE serial_code = 'AL-1'), (SELECT id FROM products WHERE company_id = pg_temp.c2()), 1, 1, 20000);

-- TEST: 108 · el admin nace sin permisos y el superadmin se los puede dar
-- EXPECT-ROWS: [{"antes":false,"despues":true}]
CREATE TEMP TABLE t98 AS SELECT user_can(pg_temp.emp('admin1@demo.local'), 'orders', 'view') AS antes;
INSERT INTO role_permissions (role_id, permission_id) VALUES ((SELECT id FROM roles WHERE code = 'admin' AND company_id = 1), (SELECT id FROM permissions WHERE module = 'orders' AND action = 'view'));
SELECT (SELECT antes FROM t98) AS antes, user_can(pg_temp.emp('admin1@demo.local'), 'orders', 'view') AS despues;

-- TEST: 109 · las particiones mensuales de la auditoría existen (mes actual, dos siguientes y la general)
-- EXPECT-ROWS: [{"particiones":4}]
SELECT count(*)::int AS particiones FROM pg_inherits WHERE inhparent = 'audit_events'::regclass;

-- TEST: 110 · los cambios que la base mantiene sola (etapa visible) no llenan la auditoría de ruido
-- EXPECT-ROWS: [{"con_etapa_visible":0}]
SELECT pg_temp.flow('PD-1', 'cliente1@demo.local', 'cash', 3, 3, 2, 24000);
SELECT count(*)::int AS con_etapa_visible FROM audit_events WHERE entity = 'sales' AND changed_fields IS NOT NULL AND (changed_fields = ARRAY['current_stage'] OR changed_fields = ARRAY['stage_state'] OR changed_fields = ARRAY['current_stage','stage_state']);

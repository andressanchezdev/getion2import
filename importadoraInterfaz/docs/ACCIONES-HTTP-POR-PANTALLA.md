# Acciones CRUD HTTP por Pantalla · Importadora IP

> [!NOTE]
> Este documento cataloga con precisión de ingeniería todas las acciones que un usuario puede ejecutar en cada pantalla y panel de la interfaz, el método y ruta HTTP exactos que dispara en el backend Go (Echo v4), el permiso requerido y los posibles códigos de respuesta HTTP con su causa operativa.

---

## 1. MÓDULO: TIENDA (`shop`)

### 1.1 Catálogo de Productos (`ShopCatalogScreen`)
*Ruta en interfaz:* `Tienda > Catálogo`  
*Archivo:* `src/features/shop/screens/ShopCatalogScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Cargar catálogo** | `GET` | `/products` | Autenticado | Query: `page`, `page_size`, `query`, `category_id`, `brand_id`, `model_id` | **200 OK**: Lista paginada `{ success: true, data: Product[], meta: Pagination }`<br>**401**: Token expirado<br>**500**: Error de base de datos |
| **Cargar existencias** | `GET` | `/stock` | Autenticado | Query: `warehouse_id` (bodega activa) | **200 OK**: Existencias por producto y estante<br>**401**: No autenticado |
| **Recuperar carrito activo** | `GET` | `/carts/active` | Autenticado | — | **200 OK**: Carrito abierto del vendedor con sus líneas<br>**404**: No hay carrito abierto (crea uno nuevo local) |
| **Añadir ítem al carrito** | `POST` | `/carts/:id/items` | Autenticado | `{ product_id: number, stock_id: number, quantity: number, unit_price: number }` | **201 Created**: Ítem agregado al carrito<br>**400**: Cantidad <= 0 o precio inválido<br>**404**: Carrito o stock no encontrado<br>**409**: Stock insuficiente en ese estante |
| **Editar cantidad en carrito** | `PUT` | `/carts/:id/items/:itemId` | Autenticado | `{ quantity: number }` | **200 OK**: Ítem actualizado con nuevo subtotal<br>**400**: Cantidad excede el disponible físico |
| **Eliminar ítem del carrito** | `DELETE` | `/carts/:id/items/:itemId` | Autenticado | — | **200 OK**: Renglón eliminado del carrito |
| **Vaciar carrito completo** | `DELETE` | `/carts/:id` | Autenticado | — | **200 OK**: Carrito vaciado y reseteado |
| **Buscar cliente para venta** | `GET` | `/customers/selector` | Autenticado | Query: `query` (documento o nombre) | **200 OK**: Lista rápida de clientes coincidentes |
| **Finalizar venta (Checkout)** | `POST` | `/sales` | `orders:create` | `{ customer_id, warehouse_id, price_tier, payment_method, immediate_picking, items: [{ stock_id, product_id, quantity, unit_price, discount }] }` | **201 Created**: Pedido registrado con serial (ej. `PED-0001`) y stock reservado<br>**400**: Datos incompletos o cliente inactivo<br>**403**: Sin permiso `orders:create`<br>**409**: Cupo de crédito insuficiente o stock ya no disponible en estante |
| **Guardar como cotización** | `POST` | `/quotations` | Autenticado | `{ customer_id, warehouse_id, items: [{ product_id, quantity, unit_price }] }` | **201 Created**: Cotización registrada (ej. `COT-0001`)<br>**400**: Validación de ítems fallida |

---

### 1.2 Cotizaciones (`QuotationsScreen`)
*Ruta en interfaz:* `Tienda > Cotizaciones`  
*Archivo:* `src/features/quotations/screens/QuotationsScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Listar cotizaciones** | `GET` | `/quotations` | Autenticado | Query: `page`, `page_size`, `from`, `to`, `search` | **200 OK**: Lista con código, cliente, total y estado<br>**401**: No autenticado |
| **Crear cotización** | `POST` | `/quotations` | Autenticado | `{ customer_id, items: [...], notes }` | **201 Created**: Cotización creada<br>**400**: Faltan productos requeridos |
| **Ver detalle cotización** | `GET` | `/quotations/:id` | Autenticado | Parámetro URL: `id` | **200 OK**: Encabezado y renglones de cotización<br>**404**: Cotización no encontrada |
| **Marcar como enviada** | `PUT` | `/quotations/:id` | Autenticado | `{ status: "sent" }` | **200 OK**: Estado actualizado a "sent"<br>**400**: Transición de estado inválida |
| **Pasar a compra** | `POST` | `/sales` | `orders:create` | Carga líneas al checkout y ejecuta venta | **201 Created**: Genera pedido desde cotización |

---

### 1.3 Bandeja de Pedidos (`OrdersScreen`)
*Ruta en interfaz:* `Tienda > Pedidos` ó `Caja > Historial de Facturación`  
*Archivo:* `src/features/orders/screens/OrdersScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Conteos por etapa (Chips)** | `GET` | `/sales/counts` | `orders:view` | Query: `warehouse_id` (opcional) | **200 OK**: `{ verification, picking, packing, invoicing, dispatch, sent }` |
| **Listar pedidos filtrados** | `GET` | `/sales` | `orders:view` | Query: `stage`, `warehouse_id`, `channel`, `query`, `page` | **200 OK**: Pedidos con cliente, canal, total y estado<br>**403**: Falta permiso `orders:view` |
| **Ver detalle del pedido** | `GET` | `/sales/:id` | `orders:view` | Parámetro URL: `id` | **200 OK**: Datos completos, ítems, pagos y vouchers |
| **Ver tiempos por etapa** | `GET` | `/sales/:id/history` | `orders:view` | Parámetro URL: `id` | **200 OK**: Historial cronológico de etapas con timestamps y usuario |
| **Verificar comprobante pago** | `POST` | `/sales/:id/verify-payment` | `orders:edit` | `{ payment_id, notes }` | **200 OK**: Pago aprobado, pedido avanza a alistamiento<br>**404**: Pedido o pago no existe<br>**409**: El pedido no está en etapa de verificación |
| **Avanzar a Picking (Alisto)** | `POST` | `/sales/:id/pick` | `orders:edit` | `{ employee_id, notes }` | **200 OK**: Pasa a etapa `picking` |
| **Avanzar a Packing (Empaque)**| `POST` | `/sales/:id/pack` | `orders:edit` | `{ employee_id, packages_count }` | **200 OK**: Pasa a etapa `packing` |
| **Emitir factura oficial** | `POST` | `/sales/:id/invoice` | `orders:edit` | `{ resolution_id, notes }` | **200 OK**: Factura generada con consecutivo y CUFE<br>**409**: La resolución no tiene numeración disponible |
| **Despachar pedido** | `POST` | `/sales/:id/dispatch` | `orders:edit` | `{ carrier_id, tracking_number }` | **200 OK**: Pedido en camino con transportadora |
| **Confirmar entrega / envío** | `POST` | `/sales/:id/send` | `orders:edit` | `{ delivery_notes }` | **200 OK**: Pedido completado. Descuenta existencias físicas `available` y libera reserva `reserved` |
| **Cancelar pedido** | `POST` | `/sales/:id/cancel` | `orders:delete` | `{ reason: string }` | **200 OK**: Pedido cancelado y reservas de stock liberadas inmediatamente<br>**409**: No se puede cancelar un pedido ya despachado o facturado |

---

## 2. MÓDULO: CAJA Y RECAUDOS (`cashRegister`)

### 2.1 Turno de Caja (`CashRegisterScreen`)
*Ruta en interfaz:* `Caja > Turno de Caja`  
*Archivo:* `src/features/cashRegister/screens/CashRegisterScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Consultar turno activo** | `GET` | `/cash/sessions/active` | `cash:view` | Query: `warehouse_id` | **200 OK**: Turno abierto con fondo inicial y totales acumulados<br>**404**: No hay turno abierto en la bodega |
| **Abrir turno de caja** | `POST` | `/cash/sessions/open` | `cash:create` | `{ warehouse_id, opening_amount, notes }` | **201 Created**: Turno de caja abierto<br>**400**: Monto inicial negativo<br>**409**: Ya existe un turno abierto en esta bodega |
| **Registrar gasto menor** | `POST` | `/cash/sessions/expenses`| `cash:edit` | `{ cash_session_id, receipt_number, concept, cash_amount, transfer_amount }` | **201 Created**: Comprobante de gasto registrado<br>**400**: Monto total <= 0 o sin concepto |
| **Cerrar turno de caja** | `POST` | `/cash/sessions/close` | `cash:edit` | `{ cash_session_id, counted_cash, notes }` | **200 OK**: Turno cerrado con cálculo de descuadre / diferencia<br>**404**: Sesión no encontrada |

---

### 2.2 Devoluciones y Garantías (`ReturnsScreen`)
*Ruta en interfaz:* `Caja > Devoluciones`  
*Archivo:* `src/features/returns/screens/ReturnsScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Listar devoluciones** | `GET` | `/returns` | Autenticado | Query: `page`, `page_size`, `query` | **200 OK**: Lista de devoluciones con estado |
| **Crear devolución** | `POST` | `/returns` | Autenticado | `{ sale_id, reason, refund_type, items: [{ sale_item_id, quantity, restock_condition }] }` | **201 Created**: Devolución radicada<br>**400**: Cantidad devuelta supera la facturada |
| **Ver detalle devolución** | `GET` | `/returns/:id` | Autenticado | Parámetro URL: `id` | **200 OK**: Detalle e ítems devueltos |
| **Resolver devolución** | `POST` | `/returns/:id/resolve` | Autenticado | `{ resolution: "restock" \| "credit_note", warehouse_id, location_id }` | **200 OK**: Stock reingresado a la estantería o saldo a favor generado en cartera |

---

### 2.3 Conciliación Bancaria (`BankReconciliationScreen`)
*Ruta en interfaz:* `Caja > Conciliación Bancaria`  
*Archivo:* `src/features/bank/screens/BankReconciliationScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Subir extracto en PDF** | `POST` | `/bank-statements/upload-pdf` | `payments:create` | `FormData: { file: File, bank_name, account_number }` | **201 Created**: Movimientos extraídos del extracto bancario<br>**400**: Formato de PDF no reconocido o archivo corrupto |
| **Listar movimientos** | `GET` | `/bank-statements/records` | `payments:view` | Query: `status` (pending/confirmed/ignored), `from`, `to` | **200 OK**: Lista de transacciones bancarias |
| **Confirmar movimiento** | `PATCH` | `/bank-statements/records/:id/confirm` | `payments:edit` | `{ payment_id: number }` | **200 OK**: Movimiento conciliado con pago registrado |
| **Ignorar movimiento** | `PATCH` | `/bank-statements/records/:id/ignore` | `payments:edit` | `{ reason: string }` | **200 OK**: Movimiento marcado como no operativo |

---

## 3. MÓDULO: CARTERA Y CRÉDITOS (`wallet`)

### 3.1 Clientes con Crédito y Cobranza (`WalletScreen`)
*Ruta en interfaz:* `Cartera > Créditos`  
*Archivo:* `src/features/wallet/screens/WalletScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **KPIs de Cartera** | `POST` | `/wallet/summary` | `credits:view` | `{ warehouse_id: number \| null }` | **200 OK**: `{ totalOutstandingDebt, customersOverdue, totalCreditExtended, totalCustomersWithCredit }` |
| **Listar clientes crédito** | `GET` | `/wallet/customers` | `credits:view` | Query: `searchQuery`, `statusFilter`, `page` | **200 OK**: Clientes con cupo asignado, saldo utilizado y días de mora |
| **Facturas del cliente** | `GET` | `/wallet/customers/:id/invoices` | `credits:view` | Parámetro URL: `id` | **200 OK**: Facturas con saldo pendiente de pago |
| **Habilitar / Modificar cupo**| `PUT` | `/customers/:id` | `customers:edit` | `{ credit_enabled, credit_limit, credit_days, credit_warning_pct }` | **200 OK**: Condiciones de crédito actualizadas |
| **Registrar abono de cartera** | `POST` | `/wallet/abonos` | `payments:create` | `{ customer_id, amount, payment_method, reference, invoices: [{ invoice_id, amount }] }` | **201 Created**: Abono registrado, asienta `credit_entries` y actualiza saldo del cliente<br>**400**: El abono supera la deuda |
| **Historial de abonos** | `GET` | `/wallet/history` | `credits:view` | Query: `customer_id`, `from`, `to` | **200 OK**: Libro de pagos y recibos aplicados |

---

## 4. MÓDULO: INVENTARIO (`inventory`)

### 4.1 Maestro de Productos (`ProductsScreen`)
*Ruta en interfaz:* `Inventario > Productos`  
*Archivo:* `src/features/inventory/screens/ProductsScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Listar productos** | `GET` | `/products` | Autenticado | Query: `query`, `category_id`, `brand_id`, `model_id`, `page` | **200 OK**: Productos con SKU, nombre, IVA y tarifas P1-P4 |
| **Crear producto** | `POST` | `/products` | `products:create` | `{ code, name, description, category_id, brand_id, model_id, iva, prices: { p1, p2, p3, p4 }, initial_warehouse_id, initial_location_id, initial_stock }` | **201 Created**: Producto creado con sus tarifas y stock inicial<br>**409**: Código de producto (SKU) ya existe |
| **Ver detalle producto** | `GET` | `/products/:id` | Autenticado | Parámetro URL: `id` | **200 OK**: Ficha técnica completa |
| **Stock por estantería** | `GET` | `/products/:id/locations`| Autenticado | Parámetro URL: `id` | **200 OK**: Existencias distribuidas por bodega y estante |
| **Editar producto** | `PUT` | `/products/:id` | `products:edit` | `{ name, description, category_id, brand_id, model_id, iva }` | **200 OK**: Datos actualizados y `easysearch` regenerado |
| **Actualizar tarifas P1-P4**| `PUT` | `/products/:id/prices` | `products:edit` | `{ p1, p2, p3, p4 }` | **200 OK**: Precios actualizados |
| **Generar código QR** | `GET` | `/products/:id/qr` | Autenticado | Parámetro URL: `id` | **200 OK**: Vector o imagen de código QR para rotulación |
| **Eliminar producto** | `DELETE` | `/products/:id` | `products:delete` | Parámetro URL: `id` | **200 OK**: Producto desactivado<br>**409**: No se puede eliminar producto con existencias o historial de ventas |

---

### 4.2 Ubicaciones Físicas de Bodega (`LocationsScreen`)
*Ruta en interfaz:* `Inventario > Ubicaciones`  
*Archivo:* `src/features/locations/screens/LocationsScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Listar ubicaciones** | `GET` | `/locations` | Autenticado | Query: `warehouse_id` | **200 OK**: Lista de estantes con código, descripción, `qr_code`, unidades físicas y estado (`libre` / `ocupada`) |
| **Crear ubicación** | `POST` | `/locations` | `stock:create` | `{ warehouse_id, code, description }` | **201 Created**: Ubicación creada con QR inmutable autogenerado<br>**409**: Ya existe un estante con ese código en la bodega |
| **Renombrar ubicación** | `PUT` | `/locations/:id` | `stock:edit` | `{ code, description }` | **200 OK**: Código renombrado; el QR se mantiene inmutable |
| **Eliminar ubicación** | `DELETE` | `/locations/:id` | `stock:delete` | Parámetro URL: `id` | **200 OK**: Ubicación eliminada<br>**409**: Prohibido eliminar una ubicación que tenga productos asignados |

---

### 4.3 Traslados entre Bodegas (`TransfersScreen`)
*Ruta en interfaz:* `Inventario > Traslados` ó `Tienda > Traslados`  
*Archivo:* `src/features/transfers/screens/TransfersScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Listar traslados** | `GET` | `/transfers` | Autenticado | Query: `status`, `origin_warehouse_id`, `destination_warehouse_id` | **200 OK**: Órdenes de traslado con serial (ej. `TR-0001`) |
| **Crear solicitud traslado** | `POST` | `/transfers` | `transfers:create`| `{ origin_warehouse_id, destination_warehouse_id, items: [{ product_id, origin_stock_id, quantity, destination_location }] }` | **201 Created**: Traslado creado en estado `pending` |
| **Ver detalle traslado** | `GET` | `/transfers/:id` | Autenticado | Parámetro URL: `id` | **200 OK**: Detalle de líneas, despacho y recepción |
| **Despachar traslado** | `POST` | `/transfers/:id/dispatch` | `transfers:edit`| `{ dispatched_by_employee_id, notes }` | **200 OK**: Estado `in_transit`; descuenta disponible del origen y asienta `transfer_out` en kardex |
| **Recibir traslado** | `POST` | `/transfers/:id/receive` | `transfers:edit`| `{ received_by_employee_id, items: [{ details_transfer_id, received_qty, destination_location }] }` | **200 OK**: Ingresa a bodega destino en las ubicaciones elegidas (`transfer_in`). Si hay faltante queda `with_novelty` |
| **Cancelar traslado** | `POST` | `/transfers/:id/cancel` | `transfers:delete`| `{ cancel_reason }` | **200 OK**: Traslado cancelado; revierte reservas |

---

## 5. MÓDULO: TERCEROS Y PERSONAL (`thirdParties`)

### 5.1 Clientes (`CustomersScreen`)
*Ruta en interfaz:* `Terceros > Clientes`  
*Archivo:* `src/features/customers/screens/CustomersScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Listar clientes** | `GET` | `/customers` | Autenticado | Query: `page`, `page_size`, `query` | **200 OK**: Directorio de clientes |
| **Buscar clientes** | `GET` | `/customers/search` | Autenticado | Query: `query` | **200 OK**: Coincidencias por documento o nombre |
| **Crear cliente** | `POST` | `/customers` | `customers:create`| `{ document_type, document, person_type, name, last_name, trade_name, email, phone, mobile, address, city, addresses, price_tier, discount_percent }` | **201 Created**: Cliente creado<br>**409**: Documento o NIT ya registrado en la empresa |
| **Editar cliente** | `PUT` | `/customers/:id` | `customers:edit` | Datos actualizados de contacto o comerciales | **200 OK**: Cliente actualizado |
| **Subir documento soporte** | `POST` | `/customers/:id/documents`| `customers:edit` | `FormData: { doc_type, file: File, notes }` | **201 Created**: RUT o certificado adjunto |
| **Renovar documento** | `POST` | `/customers/:id/documents/:docId/renew` | `customers:edit` | `FormData: { file: File }` | **200 OK**: Nuevo documento vigente registrado |
| **Desactivar cliente** | `DELETE` | `/customers/:id` | `customers:delete`| Parámetro URL: `id` | **200 OK**: Cliente marcado como inactivo |

---

### 5.2 Empleados y Permisos (`EmployeesScreen`, `RolesPermissionsScreen`)
*Ruta en interfaz:* `Terceros > Empleados` / `Configuración > Roles y Permisos`  
*Archivos:* `src/features/employees/screens/EmployeesScreen.tsx`, `RolesPermissionsScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Listar empleados** | `GET` | `/employees` | Autenticado | Query: `warehouse_id`, `role_id` | **200 OK**: Empleados activos con cargo y sede |
| **Crear empleado** | `POST` | `/employees` | `employees:create` | `{ warehouse_id, role_id, document, first_name, last_name, email, pin }` | **201 Created**: Empleado registrado |
| **Editar empleado** | `PUT` | `/employees/:id` | `employees:edit` | `{ warehouse_id, role_id, first_name, last_name, email, pin }` | **200 OK**: Empleado actualizado |
| **Consultar permisos RBAC**| `GET` | `/employees/:id/permissions` | `employees:view` | Parámetro URL: `id` | **200 OK**: Matriz de permisos concedidos y revocados |
| **Guardar permisos RBAC** | `PUT` | `/employees/:id/permissions` | `employees:edit` | `{ permissions: [{ permission_id, is_granted }] }` | **200 OK**: Permisos actualizados en caliente |
| **Listar catálogo de roles**| `GET` | `/roles` | Autenticado | — | **200 OK**: Roles del sistema (`admin`, `vendedor`, etc.) |
| **Listar catálogo permisos**| `GET` | `/permissions` | Autenticado | — | **200 OK**: Módulos y acciones atómicas |

---

### 5.3 Proveedores y Transportadoras (`SuppliersScreen`, `CarriersScreen`)
*Ruta en interfaz:* `Terceros > Proveedores` / `Terceros > Transportadoras`  
*Archivos:* `src/features/externals/screens/SuppliersScreen.tsx`, `CarriersScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Listar proveedores** | `GET` | `/externals` | Autenticado | Query: `type=supplier` | **200 OK**: Lista de proveedores |
| **Listar transportadoras** | `GET` | `/externals` | Autenticado | Query: `type=carrier` | **200 OK**: Lista de transportadoras |
| **Crear tercero** | `POST` | `/externals` | Autenticado | `{ external_type, nit, name, contact_name, email, phone, city }` | **201 Created**: Tercero registrado |
| **Editar tercero** | `PUT` | `/externals/:id` | Autenticado | Datos de tercero | **200 OK**: Tercero modificado |
| **Eliminar tercero** | `DELETE` | `/externals/:id` | Autenticado | Parámetro URL: `id` | **200 OK**: Tercero eliminado |

---

## 6. MÓDULO: COMPRAS (`purchases`)

### 6.1 Órdenes de Compra y Recepción (`PurchaseOrdersScreen`, `ReceivingScreen`)
*Ruta en interfaz:* `Compras > Órdenes` / `Compras > Recepción`  
*Archivos:* `src/features/purchases/screens/PurchaseOrdersScreen.tsx`, `ReceivingScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Listar órdenes de compra** | `GET` | `/purchases` | Autenticado | Query: `status`, `warehouse_id` | **200 OK**: Órdenes con serial (ej. `OC-0001`), proveedor y total |
| **Crear orden de compra** | `POST` | `/purchases` | `purchases:create`| `{ external_id, warehouse_id, items: [{ product_id, quantity, unit_cost }] }` | **201 Created**: Orden generada en estado `ordered` |
| **Ver detalle compra** | `GET` | `/purchases/:id` | Autenticado | Parámetro URL: `id` | **200 OK**: Ítems ordenados y cantidades recibidas |
| **Recibir mercancía en estante**| `POST`| `/purchases/:id/receive` | `purchases:edit`| `{ items: [{ purchase_item_id, received_qty, location }] }` | **200 OK**: Mercancía ingresa a `available` en las ubicaciones físicas elegidas y se asienta `purchase_in` en `audit_movements` |
| **Cancelar orden de compra** | `POST` | `/purchases/:id/cancel` | `purchases:delete`| `{ reason }` | **200 OK**: Orden cancelada |

---

## 7. MÓDULO: CONFIGURACIÓN Y AUDITORÍA (`settings`, `reports`, `audit`, `superadmin`)

### 7.1 Sedes y Facturación de Bodega (`SitesScreen`, `BillingSettingsScreen`)
*Archivos:* `src/features/warehouses/screens/WarehousesScreen.tsx`, `src/features/billing/screens/BillingSettingsScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Listar bodegas** | `GET` | `/warehouses` | Autenticado | — | **200 OK**: Bodegas de la empresa con encargado |
| **Crear bodega** | `POST` | `/warehouses` | `warehouses:create`| `{ code, name, city, address, phone, manager_employee_id }` | **201 Created**: Bodega creada |
| **Editar bodega** | `PUT` | `/warehouses/:id` | `warehouses:edit` | Datos actualizados | **200 OK**: Bodega modificada |
| **Configuración DIAN bodega** | `GET` | `/warehouses/:id/facturation` | Autenticado | Parámetro URL: `id` | **200 OK**: Régimen, resolución DIAN, prefijo y logo |
| **Guardar config DIAN** | `PUT` | `/warehouses/:id/facturation` | `warehouses:edit` | Datos fiscales de la sede | **200 OK**: Configuración fiscal guardada |
| **Listar series (FAC, PD...)**| `GET` | `/doc-series` | Autenticado | Query: `warehouse_id` | **200 OK**: Consecutivos vigentes |
| **Crear serie numeración** | `POST` | `/doc-series` | Autenticado | `{ warehouse_id, doc_type, prefix, current_val, max_val }` | **201 Created**: Serie registrada |

---

### 7.2 Empresa, Protector de Pantalla e Informes (`SettingsScreen`, `AuditScreen`, `DashboardScreen`)
*Archivos:* `src/features/settings/screens/SettingsScreen.tsx`, `src/features/audit/screens/AuditScreen.tsx`, `src/features/reports/screens/DashboardScreen.tsx`

| Acción del Usuario | Método | Ruta Backend | Permiso | Parámetros / Cuerpo | Códigos de Respuesta Posibles |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Datos de empresa** | `GET` | `/companies/:id` | Autenticado | Parámetro URL: `id` | **200 OK**: Razón social, NIT, email, logo |
| **Actualizar empresa** | `PUT` | `/companies/:id` | Autenticado | Datos corporativos | **200 OK**: Empresa actualizada |
| **Obtener protector de pantalla**| `GET` | `/screensaver/settings`| Autenticado | — | **200 OK**: `{ image_url, is_active }` |
| **Guardar protector pantalla** | `PUT` | `/screensaver/settings`| Autenticado | `{ image_url, is_active }` | **200 OK**: Protector actualizado |
| **Dashboard general** | `GET` | `/reports/dashboard` | Autenticado | Query: `warehouse_id`, `period` | **200 OK**: Total vendido, ticket promedio, ventas por canal |
| **Ventas diarias** | `GET` | `/reports/daily-sales` | Autenticado | Query: `warehouse_id`, `month` | **200 OK**: Gráfica de ingresos día a día |
| **Consultar auditoría inmutable**| `GET`| `/audit-logs` | `audit:view` | Query: `entity`, `employee_id`, `from`, `to`, `page` | **200 OK**: Log de acciones con IP, cambios JSON y motivo |

---

## 8. CATÁLOGO CONSOLIDADO DE TIPOS DE RESPUESTA HTTP

| Código | Significado en el Sistema | Cuándo Ocurre | Tratamiento en la Interfaz (Frontend) |
| :---: | :--- | :--- | :--- |
| **200** | Operación Exitosa | Petición `GET`, `PUT` o `PATCH` completada correctamente con datos actualizados. | Despacha acción Redux, actualiza estado local y muestra datos o toast informativo. |
| **201** | Recurso Creado | Creación exitosa (`POST`) de venta, cliente, producto, orden o movimiento. | Cierra el panel drawer lateral, refresca la tabla y emite toast de éxito verde (`toast.success`). |
| **204** | Sin Contenido | Eliminación exitosa (`DELETE`) de un registro. | Remueve el ítem de la tabla sin requerir re-renderizar todo el estado. |
| **400** | Petición Inválida | Datos obligatorios faltantes, cantidades negativas, o tipos de dato inconsistentes. | Muestra mensaje de validación inline bajo el campo o toast de advertencia. |
| **401** | No Autenticado | Token JWT expirado o cabecera `Authorization` ausente. | Axios interceptor intenta `/auth/refresh`. Si falla, redirige al Login y guarda la ruta previa. |
| **403** | Permiso Insuficiente | El rol del empleado no cuenta con el permiso requerido en `RequirePermission`. | Muestra alerta "No tienes autorización para ejecutar esta acción". El botón suele estar oculto por `usePermissions`. |
| **404** | No Encontrado | El ID de producto, pedido, cliente o estantería no existe en la base de datos. | Muestra pantalla o fila de "Registro no encontrado". |
| **409** | Conflicto de Negocio | - Código o SKU duplicado.<br>- Stock insuficiente en la estantería.<br>- Cupo de crédito superado por el cliente.<br>- Intento de eliminar una ubicación que tiene stock físico. | Muestra modal de alerta o banner amarillo explicando la regla de negocio violada. |
| **422** | Entidad no Procesable | Errores semánticos de validación de negocio profunda. | Resalta los campos rechazados en el formulario. |
| **500** | Error Interno de Servidor | Fallo no capturado o error de conexión con PostgreSQL. | Toast de error crítico rojo (`toast.error`) pidiendo reintentar o contactar a soporte. |


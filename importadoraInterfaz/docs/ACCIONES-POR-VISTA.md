# Acciones por vista → permiso (Fase 8.1)

Inventario de cada acción de la interfaz con el permiso que exige la API y el control que la oculta en el front.
Fuente de verdad de los nombres: `importadoraApi/src/core/types/permission_types.go`. La ruta exacta y su permiso están en `MATRIZ-ENDPOINTS.md`.

**Reglas comunes**
- **Admin** de la compañía: pasa todo dentro de su compañía. **Superadmin**: lee todo (`view`, `view_detail`) y solo muta gobernanza (`companies`, `admins`, `superadmin`, `screensaver`, `recyclebin`, `audit`).
- **Empleado**: necesita la llave exacta. Sin matriz cargada no ve nada (falla cerrada).
- En el front: pantallas con `hasScreenAccess` (menú y `MainContent`), acciones con `usePermissions().can('modulo:accion')`, drawers con `FormEntry.permission` (si no cumple, `FormDrawerBody` muestra «Sin acceso»).
- Columna de la matriz → llaves: **Ver** = `view` + `view_detail`; **Crear** = `create`; **Editar** = `edit`; **Anular** = `delete`; **Precios** = `edit_prices`. Las **acciones especiales** tienen su propia casilla en el panel de permisos.

## Tienda

| Subgestión | Acción | Componente | Permiso |
|---|---|---|---|
| Catálogo | Ver catálogo y existencias | ShopCatalogScreen | `catalog:view` (productos y stock aceptan también otros lectores) |
| Catálogo | Elegir tarifa en la tarjeta | ProductCardTierMenu | `orders:create` o `quotations:create` |
| Catálogo | Carrito (agregar, cambiar, vaciar) | ShopCart* | sesión; el carrito debe ser del actor |
| Catálogo | Finalizar venta | ShopCartFooter → checkout | `orders:create` |
| Cotizar | Guardar cotización | QuotationCartDrawer | `quotations:create` |
| Historial cotizaciones | Ver detalle | quotationDetail | `quotations:view_detail` |
| Historial cotizaciones | Pasar a venta | QuotationsTable | `orders:create` |
| Pedidos activos | Ver detalle | OrderDrawer | `orders:view_detail` |
| Pedidos activos | Verificar pago | OrderDrawer | `orders:verify_payment` ⭐ |
| Pedidos activos | Alistar, empacar, despachar, entregar | OrderRowActions | `orders:advance_stage` ⭐ |
| Pedidos activos | Facturar | OrderRowActions | `orders:invoice` ⭐ |
| Pedidos activos | Anular pedido | OrdersTable / OrderDrawer | `orders:delete` |
| Traslados | Nuevo traslado | TransfersScreen, WarehouseStockRow | `transfers:create` |
| Traslados | Despachar | TransferItemsTable | `transfers:edit` |
| Traslados | Recibir / gestionar novedad | TransferItemsTable, receiveTransfer | `transfers:receive` ⭐ |
| Traslados | Reubicar dentro de la bodega | WarehouseStockRow, relocateStock | `stock:relocate` ⭐ |
| Recepción de compra | Recibir mercancía | PurchasesTable, purchaseReceive | `purchases:receive` ⭐ |
| Recepción de compra | Pagar desde la caja | PurchasesTable, purchasePay | `cash:edit` |
| Caja | Abrir / cerrar turno, registrar gasto | CashRegisterScreen, cashOpen, cashClose | `cash:open_close` ⭐ |
| Caja | Registrar abono | CashRegisterScreen, createAbono | `payments:create` |
| Caja | Cobrar pedido | CashOrdersPanel | `payments:create` (POST /payments/batch) |
| Reporte general | Ver | GeneralReportScreen | `reports:view` |

## Gestión Ventas (Caja)

| Subgestión | Acción | Componente | Permiso |
|---|---|---|---|
| Historial de ventas | Lista, detalle y acciones | OrdersTable | igual que Pedidos activos |
| Facturas | Ver gastos de cajas cerradas | CashExpensesScreen | `invoices:view` |
| Facturas | Anular factura | (endpoint `POST /invoices/:id/annul`, sin botón hoy) | `invoices:annul` ⭐ |
| Órdenes de compra | Nueva orden, catálogo del proveedor | PurchasesTable, purchaseForm, supplierCatalog | `purchases:create` |
| Órdenes de compra | Ver detalle, bajar Excel | PurchaseDetailPanel | `purchases:view_detail` / `purchases:view` |
| Órdenes de compra | Anular | PurchasesTable, PurchaseDetailPanel | `purchases:edit` |
| Devolución & garantía | Crear | ReturnsScreen, createReturn | `returns:create` |
| Devolución & garantía | Aprobar / rechazar | ReturnRow | `returns:approve` ⭐ |

## Gestión Inventario

| Subgestión | Acción | Componente | Permiso |
|---|---|---|---|
| Bodegas | Crear / editar bodega | WarehousesTable, warehouseForm | `warehouses:create` / `warehouses:edit` |
| Bodegas | Ubicaciones (crear, editar, borrar) | WarehouseLocationsManagement, locationForm | `stock:edit` |
| Bodegas | Ubicación: reubicar producto | LocationDetailPanel | `stock:relocate` ⭐ |
| Productos | Crear | ProductsScreen, createProduct | `products:create` |
| Productos | Editar | ProductsTable, editProduct | `products:edit` |
| Productos | Cambiar precios | editProduct (la API lo revisa en PUT) | `products:edit_prices` o `catalog:edit_prices` |
| Productos | Asignar stock | assignStock | `stock:edit` |
| Conteos físicos | Nuevo conteo y guardar cantidades | InventoryCountsScreen, CountDetailPanel | `stock:count` ⭐ |
| Conteos físicos | Verificar y corroborar | CountDetailPanel | `stock:count_verify` ⭐ |
| Marcas / Categorías / Modelos | Crear, editar, borrar | catalogItem | `brands:*`, `categories:*`, `models:*` |

## Cartera

| Subgestión | Acción | Componente | Permiso |
|---|---|---|---|
| Créditos | Habilitar crédito | CreditClientsToolbar, enableCredit | `credits:edit` |
| Abonos | Crear abono | AbonosTable | `payments:create` |
| Abonos | Verificar, rechazar, reabrir | AbonosTable, AbonoDetailPanel | `payments:verify` ⭐ |
| Abonos | Anular abono | AbonoDetailPanel | `payments:edit` |
| Conciliación | Confirmar / ignorar movimiento | BankRecordsTable, bankConfirm | `payments:reconcile` ⭐ |
| Conciliación | Subir extracto PDF | BankRecordsTable | `payments:create` |

## Terceros & Roles

| Subgestión | Acción | Componente | Permiso |
|---|---|---|---|
| Clientes | Crear | CustomersScreen | `customers:create` |
| Clientes | Editar y cambiar estado | CustomersTable (StatusSelect), editCustomer | `customers:edit` |
| Clientes | Eliminar, borrar documento | CustomersTable | `customers:delete` |
| Clientes | Ver y renovar documentos | CustomerDocumentsSection | `customers:view_detail` / `customers:edit` |
| Empleados | Crear, editar, desactivar | EmployeesTable, createEmployee | `employees:create` / `edit` / `delete` |
| Empleados | Ver / editar permisos | EmployeeDetailPanel, employeePermissions | `roles:view` / `roles:edit` |
| Proveedores / Transportadoras | Crear, editar, borrar | externalForm | `suppliers:*` |

## Reportes & Auditoría

| Subgestión | Acción | Componente | Permiso |
|---|---|---|---|
| Dashboard / Reporte general | Ver | DashboardScreen, GeneralReportScreen | `reports:view` |
| Reportes | Exportar a Excel | (llave sembrada; se usa al agregar exportes de reportes) | `reports:export` ⭐ |
| Papelera | Ver | RecycleBinScreen | `audit:view` |
| Papelera | Restaurar | RecycleBinScreen | solo superadmin |
| Auditoría | Ver y detalle | AuditScreen, auditDetail | `audit:view` |

## Configuración

| Pestaña | Acción | Permiso |
|---|---|---|
| (pantalla) | Entrar a Configuración | todo el personal (`OPEN_STAFF_SCREENS`: aloja la cuenta propia) |
| Empresa | Ver datos | `warehouses:view`; editar: solo admin y superadmin |
| Protector | Cambiar imagen | `screensaver:edit` (no se siembra para empleados: admin y superadmin) |
| Credenciales y acceso | Editar datos y clave propios | sesión (`PUT /auth/me`, `PUT /auth/me/password`) |
| Respaldos | Crear, bajar, restaurar | solo superadmin |
| Facturación | Datos fiscales y series | `warehouses:view` / `warehouses:edit` |
| Roles y permisos | Roles y matriz | `roles:*` |

⭐ = acción especial: su casilla está en «Acciones especiales» del panel de permisos. La migración `20261128_permission-catalog.sql` la entrega a quien tenía la llave que antes protegía esa ruta.

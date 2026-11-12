# Matriz de endpoints: ruta del API → pantalla de la interfaz

Generada leyendo las rutas de `importadoraApi/src/features/*/routes` y cruzándolas con lo que llaman los módulos de `importadoraInterfaz/src`
(constantes de `api/endpoints` y rutas escritas en services, thunks y hooks). Es una foto del código: la columna *Permiso* se reconstruyó desde las rutas Go tras la Fase 8 (catálogo final; «a o b» = basta uno, `RequireAnyPermission`).

**Resumen:** 194 rutas. Usadas por una pantalla: **133**. Declaradas pero nadie las llama: **8**. Sin pantalla: **40**.

La columna *Permiso* es el que el API exige a la ruta (módulo:acción); vacía = basta con tener sesión.

## audit

| Método | Ruta | Permiso | Estado | Quién la usa |
| POST | `/audit-logs/context-change` | solo superadmin | Usada | audit |
|---|---|---|---|---|
| GET | `/audit-logs` | audit:view | Usada | audit |

## auth

| Método | Ruta | Permiso | Estado | Quién la usa |
| PUT | `/auth/me` | — | Usada | auth |
| PUT | `/auth/me/password` | — | Usada | auth |
|---|---|---|---|---|
| POST | `/auth/login` | — | Usada | auth |
| POST | `/auth/refresh` | — | Usada | auth |
| POST | `/auth/logout` | — | Usada | auth |
| GET | `/auth/me` | — | Sin pantalla | — |

## bank_statements

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| POST | `/bank-statements/upload-pdf` | payments:create | Usada | bank |
| GET | `/bank-statements/records` | payments:view | Usada | bank |
| PATCH | `/bank-statements/records/:id/confirm` | payments:reconcile | Usada | bank |
| PATCH | `/bank-statements/records/:id/ignore` | payments:reconcile | Usada | bank |

## carts

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/carts/active` | — | Usada | shop |
| POST | `/carts` | — | Declarada, nadie la llama | CARTS.GET |
| GET | `/carts/:id` | — | Usada | shop |
| DELETE | `/carts/:id` | — | Usada | shop |
| POST | `/carts/:id/items` | — | Usada | shop |
| PUT | `/carts/:id/items/:itemId` | — | Usada | shop |
| DELETE | `/carts/:id/items/:itemId` | — | Usada | shop |

## cash_sessions

| Método | Ruta | Permiso | Estado | Quién la usa |
| GET | `/cash/expenses` | invoices:view | Usada | cash_sessions |
|---|---|---|---|---|
| GET | `/cash/sessions/active` | cash:view | Usada | cashRegister |
| POST | `/cash/sessions/open` | cash:open_close | Usada | cashRegister |
| POST | `/cash/sessions/close` | cash:open_close | Usada | cashRegister |

## catalog

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/brands` | brands:view o models:view o categories:view o products:view o catalog:view o purchases:view o stock:view o transfers:view o quotations:view | Usada | catalogs |
| GET | `/brands/:id` | brands:view_detail | Usada | catalogs |
| POST | `/brands` | brands:create | Usada | catalogs |
| PUT | `/brands/:id` | brands:edit | Usada | catalogs |
| DELETE | `/brands/:id` | brands:delete | Usada | catalogs |
| GET | `/models` | brands:view o models:view o categories:view o products:view o catalog:view o purchases:view o stock:view o transfers:view o quotations:view | Usada | catalogs |
| GET | `/models/:id` | models:view_detail | Usada | catalogs |
| POST | `/models` | models:create | Usada | catalogs |
| PUT | `/models/:id` | models:edit | Usada | catalogs |
| DELETE | `/models/:id` | models:delete | Usada | catalogs |
| GET | `/categories` | brands:view o models:view o categories:view o products:view o catalog:view o purchases:view o stock:view o transfers:view o quotations:view | Usada | catalogs |
| GET | `/categories/:id` | categories:view_detail | Usada | catalogs |
| POST | `/categories` | categories:create | Usada | catalogs |
| PUT | `/categories/:id` | categories:edit | Usada | catalogs |
| DELETE | `/categories/:id` | categories:delete | Usada | catalogs |

## companies

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| POST | `/companies` | solo superadmin | Usada | companies |
| GET | `/companies` | solo superadmin, admin | Usada | companies |
| GET | `/companies/search` | solo superadmin, admin | Sin pantalla | — |
| GET | `/companies/:id` | warehouses:view | Usada | settings |
| PUT | `/companies/:id` | solo superadmin, admin | Usada | settings |
| DELETE | `/companies/:id` | solo superadmin | Usada | settings |

## customers

| Método | Ruta | Permiso | Estado | Quién la usa |
| GET | `/customers/:id/documents/:docId/file` | customers:view_detail | Usada | customers |
|---|---|---|---|---|
| GET | `/customers` | customers:view o quotations:view o credits:view | Usada | customers, quotations, wallet |
| GET | `/customers/selector` | customers:view o orders:create o quotations:create o credits:view o payments:create | Usada | checkout, wallet |
| GET | `/customers/search` | customers:view o orders:create o quotations:create o credits:view | Usada | checkout, customers, wallet |
| GET | `/customers/documents/alerts` | customers:view | Usada | customers |
| GET | `/customers/:id` | customers:view_detail o orders:create o credits:view o payments:view | Usada | checkout, customers, wallet |
| GET | `/customers/:id/credit-status` | credits:view o orders:create o customers:view_detail | Sin pantalla | — |
| POST | `/customers` | customers:create | Usada | customers, quotations, wallet |
| PUT | `/customers/:id` | customers:edit | Usada | checkout, customers, wallet |
| DELETE | `/customers/:id` | customers:delete | Usada | checkout, customers, wallet |
| GET | `/customers/:id/documents` | customers:view_detail | Usada | customers |
| POST | `/customers/:id/documents` | customers:edit | Usada | customers |
| POST | `/customers/:id/documents/:docId/renew` | customers:edit | Usada | customers |
| DELETE | `/customers/:id/documents/:docId` | customers:delete | Sin pantalla | — |

## externals

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/externals` | suppliers:view o purchases:view o purchases:create o orders:advance_stage o transfers:create o transfers:edit | Usada | externals |
| GET | `/externals/search` | suppliers:view o purchases:view o purchases:create o orders:advance_stage o transfers:create o transfers:edit | Sin pantalla | — |
| GET | `/externals/:id` | suppliers:view_detail o purchases:view | Usada | externals |
| POST | `/externals` | suppliers:create | Usada | externals |
| PUT | `/externals/:id` | suppliers:edit | Usada | externals |
| DELETE | `/externals/:id` | suppliers:delete | Usada | externals |

## health

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/health` | — | Usada | app |
| GET | `/readiness` | — | Declarada, nadie la llama | HEALTH.READINESS |

## inventory

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/stock` | stock:view o catalog:view o products:view o transfers:view o transfers:create o orders:advance_stage | Usada | inventory, locations, shop, transfers |
| GET | `/stock/company` | stock:view o catalog:view o products:view o transfers:create | Sin pantalla | — |
| POST | `/stock/adjust` | stock:edit | Sin pantalla | — |
| POST | `/stock/assign` | stock:edit | Usada | inventory |
| POST | `/stock/relocate` | stock:relocate | Usada | inventory |
| GET | `/transfers` | transfers:view | Usada | transfers |
| GET | `/transfers/:id` | transfers:view_detail | Sin pantalla | — |
| POST | `/transfers` | transfers:create | Usada | transfers |
| POST | `/transfers/:id/dispatch` | transfers:edit | Usada | transfers |
| POST | `/transfers/:id/receive` | transfers:receive | Usada | transfers |
| POST | `/transfers/:id/cancel` | transfers:edit | Usada | transfers |
| GET | `/counts` | stock:view | Sin pantalla | — |
| GET | `/counts/:id` | stock:view_detail | Sin pantalla | — |
| POST | `/counts` | stock:count | Sin pantalla | — |
| PUT | `/counts/:id/items` | stock:count | Sin pantalla | — |
| POST | `/counts/:id/verify` | stock:count_verify | Sin pantalla | — |
| POST | `/counts/:id/corroborate` | stock:count_verify | Sin pantalla | — |
| GET | `/audit-movements` | stock:view | Sin pantalla | — |

## notifications

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/notifications` | — | Sin pantalla | — |
| POST | `/notifications/:id/read` | — | Sin pantalla | — |
| POST | `/notifications/read-all` | — | Sin pantalla | — |

## payments

| Método | Ruta | Permiso | Estado | Quién la usa |
| POST | `/payments/:id/reject` | payments:verify | Usada | payments |
| POST | `/payments/:id/reopen` | payments:verify | Usada | payments |
|---|---|---|---|---|
| POST | `/payments` | payments:create | Usada | bank, orders, wallet |
| POST | `/payments/batch` | payments:create | Usada | cashRegister |
| GET | `/payments` | payments:view | Usada | bank, orders, wallet |
| GET | `/payments/:id` | payments:view_detail | Sin pantalla | — |
| POST | `/payments/:id/verify` | payments:verify | Usada | orders, wallet |
| POST | `/payments/:id/void` | payments:edit | Declarada, nadie la llama | PAYMENTS.VOID |

## products

| Método | Ruta | Permiso | Estado | Quién la usa |
| GET | `/products/thumbnails` | products:view o catalog:view o quotations:create o transfers:view o transfers:create o stock:view o purchases:create | Usada | products |
|---|---|---|---|---|
| GET | `/products` | products:view o catalog:view o quotations:create o transfers:view o transfers:create o stock:view o purchases:create | Usada | shop, transfers |
| GET | `/products/search` | products:view o catalog:view o quotations:create o transfers:view o transfers:create o stock:view o purchases:create | Usada | shop, transfers |
| GET | `/products/:id` | products:view_detail o catalog:view | Usada | shop |
| POST | `/products` | products:create | Usada | shop, transfers |
| PUT | `/products/:id` | products:edit | Usada | shop |
| DELETE | `/products/:id` | products:delete | Usada | shop |
| GET | `/products/:id/codes` | products:view_detail | Sin pantalla | — |
| POST | `/products/:id/codes` | products:edit | Sin pantalla | — |
| DELETE | `/products/:id/codes/:codeId` | products:edit | Sin pantalla | — |
| GET | `/products/:id/suppliers` | products:view_detail | Sin pantalla | — |
| POST | `/products/:id/suppliers` | products:edit | Sin pantalla | — |
| DELETE | `/products/:id/suppliers/:supplierId` | products:edit | Sin pantalla | — |

## purchases

| Método | Ruta | Permiso | Estado | Quién la usa |
| DELETE | `/purchases/suppliers/:supplierId/products/:productId` | purchases:create | Usada | purchases |
| POST | `/purchases/:id/pay` | cash:edit | Usada | purchases |
| PUT | `/purchases/suppliers/:supplierId/products` | purchases:create | Usada | purchases |
|---|---|---|---|---|
| POST | `/purchases` | purchases:create | Usada | purchases |
| GET | `/purchases` | purchases:view | Usada | purchases |
| GET | `/purchases/:id` | purchases:view_detail | Usada | purchases |
| GET | `/purchases/:id/export/excel` | purchases:view | Usada | purchases |
| POST | `/purchases/:id/receive` | purchases:receive | Usada | purchases |
| POST | `/purchases/:id/void` | purchases:edit | Usada | purchases |
| POST | `/purchases/suppliers/:supplierId/catalog/upload` | purchases:create | Declarada, nadie la llama | PURCHASES.SUPPLIER_CATALOG_UPLOAD |
| GET | `/purchases/suppliers/:supplierId/products` | purchases:view | Declarada, nadie la llama | PURCHASES.SUPPLIER_PRODUCTS |

## quotations

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/quotations` | quotations:view | Usada | quotations |
| GET | `/quotations/:id` | quotations:view_detail | Usada | quotations |
| POST | `/quotations` | quotations:create | Usada | quotations |
| PUT | `/quotations/:id` | quotations:edit | Usada | quotations |

## recyclebin

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/recycle-bin` | audit:view | Sin pantalla | — |
| POST | `/recycle-bin/:id/restore` | solo superadmin | Sin pantalla | — |

## reports

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/reports/general` | reports:view | Usada | reports |
| GET | `/reports/sales` | reports:view | Declarada, nadie la llama | REPORTS.SALES |
| GET | `/reports/inventory` | reports:view | Declarada, nadie la llama | REPORTS.INVENTORY |
| GET | `/reports/wallet` | reports:view | Usada | wallet |

## returns

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| POST | `/returns` | returns:create | Usada | returns |
| GET | `/returns` | returns:view | Usada | returns |
| GET | `/returns/:id` | returns:view_detail | Usada | returns (plantilla en el service) |
| POST | `/returns/:id/approve` | returns:approve | Usada | returns |
| POST | `/returns/:id/reject` | returns:approve | Usada | returns |

## sales

| Método | Ruta | Permiso | Estado | Quién la usa |
| POST | `/invoices/:id/annul` | invoices:annul | Usada | sales |
|---|---|---|---|---|
| POST | `/sales` | orders:create | Usada | orders, shop, wallet |
| GET | `/sales` | orders:view | Usada | orders, shop, wallet |
| GET | `/sales/:id` | orders:view_detail | Usada | orders, cashRegister, returns |
| GET | `/sales/:id/history` | orders:view_detail | Usada | orders |
| POST | `/sales/:id/verify` | orders:verify_payment | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/verify-payment` | orders:verify_payment | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/pick` | orders:advance_stage | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/pack` | orders:advance_stage | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/invoice` | orders:invoice | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/dispatch` | orders:advance_stage | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/send` | orders:advance_stage | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/cancel` | orders:delete | Usada | orders, shop (SALES.ACTION) |
| GET | `/invoices` | orders:view | Usada | billing |
| GET | `/invoices/:id` | orders:view_detail | Declarada, nadie la llama | INVOICES.BY_ID |

## screensaver

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/settings/screensaver` | — | Usada | settings |
| POST | `/settings/screensaver` | screensaver:edit | Usada | settings |
| PUT | `/settings/screensaver` | screensaver:edit | Usada | settings |

## staff

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/admins` | solo superadmin, admin | Sin pantalla | — |
| GET | `/admins/:id` | solo superadmin, admin | Sin pantalla | — |
| POST | `/admins` | solo superadmin | Sin pantalla | — |
| PUT | `/admins/:id` | solo superadmin | Sin pantalla | — |
| DELETE | `/admins/:id` | solo superadmin | Sin pantalla | — |
| GET | `/roles` | roles:view o employees:view | Usada | employees |
| GET | `/roles/:id` | roles:view_detail o employees:view | Usada | employees |
| POST | `/roles` | roles:create | Usada | employees |
| PUT | `/roles/:id` | roles:edit | Usada | employees |
| DELETE | `/roles/:id` | roles:delete | Usada | employees |
| GET | `/permissions` | roles:view o employees:view | Usada | employees |
| GET | `/employees` | employees:view | Usada | employees |
| GET | `/employees/salespersons` | employees:view o orders:view o quotations:view o reports:view | Sin pantalla | — |
| GET | `/employees/:id` | employees:view_detail | Usada | employees |
| POST | `/employees` | employees:create | Usada | employees |
| PUT | `/employees/:id` | employees:edit | Usada | employees |
| DELETE | `/employees/:id` | employees:delete | Usada | employees |
| PUT | `/employees/:id/credentials` | employees:edit | Usada | employees |
| GET | `/employees/:id/permissions` | employees:view_detail o roles:view | Usada | employees |
| PUT | `/employees/:id/permissions` | roles:edit | Usada | employees |

## wallet

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/wallet/summary/:customerId` | credits:view | Sin pantalla | — |
| GET | `/wallet/entries` | credits:view | Sin pantalla | — |
| POST | `/wallet/adjust` | credits:edit | Sin pantalla | — |

## warehouses

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| POST | `/warehouses` | warehouses:create | Usada | warehouses |
| GET | `/warehouses` | — | Usada | warehouses |
| GET | `/warehouses/search` | warehouses:view | Sin pantalla | — |
| GET | `/warehouses/:id` | warehouses:view_detail | Usada | warehouses (plantilla en el service) |
| PUT | `/warehouses/:id` | warehouses:edit | Usada | warehouses (plantilla en el service) |
| DELETE | `/warehouses/:id` | warehouses:delete | Usada | warehouses (plantilla en el service) |
| GET | `/warehouses/:id/facturation` | warehouses:view o orders:invoice | Usada | billing |
| PUT | `/warehouses/:id/facturation` | warehouses:edit | Usada | billing |
| GET | `/warehouses/:id/locations` | stock:view o products:view o transfers:view o transfers:create o stock:relocate | Usada | locations |
| POST | `/warehouses/:id/locations` | stock:edit | Usada | locations |
| PUT | `/warehouses/:id/locations/:locId` | stock:edit | Usada | locations |
| DELETE | `/warehouses/:id/locations/:locId` | stock:edit | Usada | locations |
| GET | `/doc-series` | warehouses:view o orders:invoice | Usada | billing |
| PUT | `/doc-series/:id` | warehouses:edit | Usada | billing |



## backups

| Método | Ruta | Permiso | Estado | Quién la usa |
| GET | `/backups/:id/download` | solo superadmin | Usada | backups |
| POST | `/backups` | solo superadmin | Usada | backups |
| POST | `/backups/:id/restore` | solo superadmin | Usada | backups |
|---|---|---|---|---|
| GET | `/backups` | solo superadmin | Usada | backups |

## realtime

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| POST | `/realtime/ticket` | — | Usada | realtime |
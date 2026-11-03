# Matriz de endpoints: ruta del API → pantalla de la interfaz

Generada leyendo las rutas de `importadoraApi/src/features/*/routes` y cruzándolas con lo que llaman los módulos de `importadoraInterfaz/src`
(constantes de `api/endpoints` y rutas escritas en services, thunks y hooks). Es una foto del código en esta fecha: se regenera con el script del repo.

**Resumen:** 181 rutas. Usadas por una pantalla: **133**. Declaradas pero nadie las llama: **8**. Sin pantalla: **40**.

La columna *Permiso* es el que el API exige a la ruta (módulo:acción); vacía = basta con tener sesión.

## audit

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/audit-logs` | audit:view | Usada | audit |

## auth

| Método | Ruta | Permiso | Estado | Quién la usa |
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
| PATCH | `/bank-statements/records/:id/confirm` | payments:edit | Usada | bank |
| PATCH | `/bank-statements/records/:id/ignore` | payments:edit | Usada | bank |

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
|---|---|---|---|---|
| GET | `/cash/sessions/active` | cash:view | Usada | cashRegister |
| POST | `/cash/sessions/open` | cash:create | Usada | cashRegister |
| POST | `/cash/sessions/close` | cash:edit | Usada | cashRegister |

## catalog

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/brands` | — | Usada | catalogs |
| GET | `/brands/:id` | — | Usada | catalogs |
| POST | `/brands` | brands:create | Usada | catalogs |
| PUT | `/brands/:id` | brands:edit | Usada | catalogs |
| DELETE | `/brands/:id` | brands:delete | Usada | catalogs |
| GET | `/models` | — | Usada | catalogs |
| GET | `/models/:id` | — | Usada | catalogs |
| POST | `/models` | models:create | Usada | catalogs |
| PUT | `/models/:id` | models:edit | Usada | catalogs |
| DELETE | `/models/:id` | models:delete | Usada | catalogs |
| GET | `/categories` | — | Usada | catalogs |
| GET | `/categories/:id` | — | Usada | catalogs |
| POST | `/categories` | categories:create | Usada | catalogs |
| PUT | `/categories/:id` | categories:edit | Usada | catalogs |
| DELETE | `/categories/:id` | categories:delete | Usada | catalogs |

## companies

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| POST | `/companies` | — | Usada | companies |
| GET | `/companies` | — | Usada | companies |
| GET | `/companies/search` | — | Sin pantalla | — |
| GET | `/companies/:id` | — | Usada | settings |
| PUT | `/companies/:id` | — | Usada | settings |
| DELETE | `/companies/:id` | — | Usada | settings |

## customers

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/customers` | — | Usada | customers, quotations, wallet |
| GET | `/customers/selector` | — | Usada | checkout, wallet |
| GET | `/customers/search` | — | Usada | checkout, customers, wallet |
| GET | `/customers/documents/alerts` | — | Usada | customers |
| GET | `/customers/:id` | — | Usada | checkout, customers, wallet |
| GET | `/customers/:id/credit-status` | — | Sin pantalla | — |
| POST | `/customers` | customers:create | Usada | customers, quotations, wallet |
| PUT | `/customers/:id` | customers:edit | Usada | checkout, customers, wallet |
| DELETE | `/customers/:id` | customers:delete | Usada | checkout, customers, wallet |
| GET | `/customers/:id/documents` | — | Usada | customers |
| POST | `/customers/:id/documents` | customers:edit | Usada | customers |
| POST | `/customers/:id/documents/:docId/renew` | customers:edit | Usada | customers |
| DELETE | `/customers/:id/documents/:docId` | customers:delete | Sin pantalla | — |

## externals

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/externals` | — | Usada | externals |
| GET | `/externals/search` | — | Sin pantalla | — |
| GET | `/externals/:id` | — | Usada | externals |
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
| GET | `/stock` | — | Usada | inventory, locations, shop, transfers |
| GET | `/stock/company` | — | Sin pantalla | — |
| POST | `/stock/adjust` | stock:edit | Sin pantalla | — |
| POST | `/stock/assign` | stock:edit | Usada | inventory |
| POST | `/stock/relocate` | stock:edit | Usada | inventory |
| GET | `/transfers` | — | Usada | transfers |
| GET | `/transfers/:id` | — | Sin pantalla | — |
| POST | `/transfers` | transfers:create | Usada | transfers |
| POST | `/transfers/:id/dispatch` | transfers:edit | Usada | transfers |
| POST | `/transfers/:id/receive` | transfers:edit | Usada | transfers |
| POST | `/transfers/:id/cancel` | transfers:edit | Usada | transfers |
| GET | `/counts` | — | Sin pantalla | — |
| GET | `/counts/:id` | — | Sin pantalla | — |
| POST | `/counts` | stock:create | Sin pantalla | — |
| PUT | `/counts/:id/items` | stock:edit | Sin pantalla | — |
| POST | `/counts/:id/verify` | stock:edit | Sin pantalla | — |
| POST | `/counts/:id/corroborate` | stock:edit | Sin pantalla | — |
| GET | `/audit-movements` | stock:view | Sin pantalla | — |

## notifications

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/notifications` | — | Sin pantalla | — |
| POST | `/notifications/:id/read` | — | Sin pantalla | — |
| POST | `/notifications/read-all` | — | Sin pantalla | — |

## payments

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| POST | `/payments` | payments:create | Usada | bank, orders, wallet |
| POST | `/payments/batch` | payments:create | Usada | cashRegister |
| GET | `/payments` | payments:view | Usada | bank, orders, wallet |
| GET | `/payments/:id` | payments:view | Sin pantalla | — |
| POST | `/payments/:id/verify` | payments:edit | Usada | orders, wallet |
| POST | `/payments/:id/void` | payments:edit | Declarada, nadie la llama | PAYMENTS.VOID |

## products

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/products` | — | Usada | shop, transfers |
| GET | `/products/search` | — | Usada | shop, transfers |
| GET | `/products/:id` | — | Usada | shop |
| POST | `/products` | products:create | Usada | shop, transfers |
| PUT | `/products/:id` | products:edit | Usada | shop |
| DELETE | `/products/:id` | products:delete | Usada | shop |
| GET | `/products/:id/codes` | — | Sin pantalla | — |
| POST | `/products/:id/codes` | products:edit | Sin pantalla | — |
| DELETE | `/products/:id/codes/:codeId` | products:edit | Sin pantalla | — |
| GET | `/products/:id/suppliers` | — | Sin pantalla | — |
| POST | `/products/:id/suppliers` | products:edit | Sin pantalla | — |
| DELETE | `/products/:id/suppliers/:supplierId` | products:edit | Sin pantalla | — |

## purchases

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| POST | `/purchases` | purchases:create | Usada | purchases |
| GET | `/purchases` | purchases:view | Usada | purchases |
| GET | `/purchases/:id` | purchases:view | Usada | purchases |
| GET | `/purchases/:id/export/excel` | purchases:view | Usada | purchases |
| POST | `/purchases/:id/receive` | purchases:edit | Usada | purchases |
| POST | `/purchases/:id/void` | purchases:edit | Usada | purchases |
| POST | `/purchases/suppliers/:supplierId/catalog/upload` | purchases:create | Declarada, nadie la llama | PURCHASES.SUPPLIER_CATALOG_UPLOAD |
| GET | `/purchases/suppliers/:supplierId/products` | purchases:view | Declarada, nadie la llama | PURCHASES.SUPPLIER_PRODUCTS |

## quotations

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/quotations` | quotations:view | Usada | quotations |
| GET | `/quotations/:id` | quotations:view | Usada | quotations |
| POST | `/quotations` | quotations:create | Usada | quotations |
| PUT | `/quotations/:id` | quotations:edit | Usada | quotations |

## recyclebin

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/recycle-bin` | audit:view | Sin pantalla | — |
| POST | `/recycle-bin/:id/restore` | audit:edit | Sin pantalla | — |

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
| GET | `/returns/:id` | returns:view | Usada | returns (plantilla en el service) |
| POST | `/returns/:id/approve` | returns:edit | Usada | returns |
| POST | `/returns/:id/reject` | returns:edit | Usada | returns |

## sales

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| POST | `/sales` | orders:create | Usada | orders, shop, wallet |
| GET | `/sales` | orders:view | Usada | orders, shop, wallet |
| GET | `/sales/:id` | orders:view | Usada | orders, cashRegister, returns |
| GET | `/sales/:id/history` | orders:view | Usada | orders |
| POST | `/sales/:id/verify` | orders:edit | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/verify-payment` | orders:edit | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/pick` | orders:edit | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/pack` | orders:edit | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/invoice` | orders:edit | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/dispatch` | orders:edit | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/send` | orders:edit | Usada | shop (SALES.ACTION) |
| POST | `/sales/:id/cancel` | orders:delete | Usada | orders, shop (SALES.ACTION) |
| GET | `/invoices` | orders:view | Usada | billing |
| GET | `/invoices/:id` | orders:view | Declarada, nadie la llama | INVOICES.BY_ID |

## screensaver

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/settings/screensaver` | — | Usada | settings |
| POST | `/settings/screensaver` | settings:edit | Usada | settings |
| PUT | `/settings/screensaver` | settings:edit | Usada | settings |

## staff

| Método | Ruta | Permiso | Estado | Quién la usa |
|---|---|---|---|---|
| GET | `/admins` | — | Sin pantalla | — |
| GET | `/admins/:id` | — | Sin pantalla | — |
| POST | `/admins` | — | Sin pantalla | — |
| PUT | `/admins/:id` | — | Sin pantalla | — |
| DELETE | `/admins/:id` | — | Sin pantalla | — |
| GET | `/roles` | — | Usada | employees |
| GET | `/roles/:id` | — | Usada | employees |
| POST | `/roles` | roles:create | Usada | employees |
| PUT | `/roles/:id` | roles:edit | Usada | employees |
| DELETE | `/roles/:id` | roles:delete | Usada | employees |
| GET | `/permissions` | — | Usada | employees |
| GET | `/employees` | employees:view | Usada | employees |
| GET | `/employees/salespersons` | — | Sin pantalla | — |
| GET | `/employees/:id` | employees:view | Usada | employees |
| POST | `/employees` | employees:create | Usada | employees |
| PUT | `/employees/:id` | employees:edit | Usada | employees |
| DELETE | `/employees/:id` | employees:delete | Usada | employees |
| PUT | `/employees/:id/credentials` | employees:edit | Usada | employees |
| GET | `/employees/:id/permissions` | employees:view | Usada | employees |
| PUT | `/employees/:id/permissions` | roles:edit | Usada | employees |
| POST | `/employees/:id/unlock` | employees:edit | Sin pantalla | — |
| GET | `/staff` | — | Usada | settings (SecurityTab) |
| GET | `/staff/:id` | — | Sin pantalla | — |
| PUT | `/staff/:id` | employees:edit | Sin pantalla | — |

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
| GET | `/warehouses/search` | — | Sin pantalla | — |
| GET | `/warehouses/:id` | — | Usada | warehouses (plantilla en el service) |
| PUT | `/warehouses/:id` | warehouses:edit | Usada | warehouses (plantilla en el service) |
| DELETE | `/warehouses/:id` | warehouses:delete | Usada | warehouses (plantilla en el service) |
| GET | `/warehouses/:id/facturation` | — | Usada | billing |
| PUT | `/warehouses/:id/facturation` | warehouses:edit | Usada | billing |
| GET | `/warehouses/:id/locations` | — | Usada | locations |
| POST | `/warehouses/:id/locations` | stock:edit | Usada | locations |
| PUT | `/warehouses/:id/locations/:locId` | stock:edit | Usada | locations |
| DELETE | `/warehouses/:id/locations/:locId` | stock:edit | Usada | locations |
| GET | `/doc-series` | — | Usada | billing |
| PUT | `/doc-series/:id` | warehouses:edit | Usada | billing |


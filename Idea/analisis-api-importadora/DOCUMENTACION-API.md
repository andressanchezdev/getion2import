# Documentación de la API de Gestión Importadora (backend real)

Base: `https://importadora-back-production.up.railway.app` · Swagger: `https://importadora-back-production.up.railway.app/swagger/doc.json` · 189 operaciones en 27 grupos.

Esta documentación sale de **respuestas reales** del backend (empresa de prueba `companyId: 1`, base `testpremium`) y del Swagger. Ninguna ruta está inventada: cada una aparece en el Swagger y se comprobó automáticamente (ver el final del documento).

## Cómo leerla

Cada endpoint trae: URL completa, qué body se envió, qué respuesta se recibió, si el endpoint está **completo**, qué tipos de datos devuelve, qué inconsistencias tiene y cómo se relaciona con la operación. Las respuestas están **enmascaradas** (los datos personales aparecen como `«string:N»`) y recortadas a 2 filas.

| Marca | Significado |
|---|---|
| 🟢 Completo | Responde 200 con datos y los campos esperados |
| 🟡 Incompleto | Responde, pero faltan campos o los desgloses llegan en `null` |
| 🟠 Plantilla de propiedades | Responde con la **estructura** correcta pero con todos los valores vacíos (ceros, `null`, cadenas vacías) o solo con un texto fijo |
| ⚪ Vacío | 200 sin filas con los datos de prueba: no se puede saber si el endpoint está bien o solo no hay datos |
| 🔴 Roto / error | El backend responde 4xx o 5xx |
| ⚫ Sin probar | Nunca se llamó (escrituras, sesión, SIIGO que escribe) o faltaba un valor para llamarlo |

Formas de respuesta: casi todo responde `{ "success": bool, "message": texto, "data": ..., "meta": {...} }`; `meta` (paginación) solo existe en listas. Los listados casi siempre son `POST` con `{ companyId, page, pageSize, ... }`: el `POST` hace de `GET`.

## Resumen por grupo

| Grupo | Operaciones | 🟢 | 🟡 | 🟠 | ⚪ | 🔴 | ⚫ | Usa la app |
|---|---|---|---|---|---|---|---|---|
| [Auth](#grupo-auth) | 3 | 0 | 0 | 0 | 0 | 0 | 3 | 3 |
| [health](#grupo-health) | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 1 |
| [Companies](#grupo-companies) | 5 | 1 | 0 | 0 | 0 | 1 | 3 | 0 |
| [Warehouses](#grupo-warehouses) | 3 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| [Employees](#grupo-employees) | 12 | 4 | 1 | 0 | 0 | 1 | 6 | 8 |
| [Users](#grupo-users) | 11 | 2 | 0 | 0 | 0 | 0 | 9 | 5 |
| [Customers](#grupo-customers) | 9 | 0 | 0 | 0 | 0 | 1 | 8 | 1 |
| [Directions](#grupo-directions) | 4 | 1 | 0 | 0 | 0 | 0 | 3 | 3 |
| [Discounts](#grupo-discounts) | 6 | 0 | 0 | 0 | 1 | 0 | 5 | 2 |
| [Brands](#grupo-brands) | 3 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| [Categories](#grupo-categories) | 3 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| [Models](#grupo-models) | 3 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| [Products](#grupo-products) | 2 | 0 | 1 | 0 | 0 | 0 | 1 | 1 |
| [Inventory](#grupo-inventory) | 15 | 6 | 0 | 0 | 0 | 0 | 9 | 2 |
| [Search](#grupo-search) | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| [Carts](#grupo-carts) | 6 | 0 | 0 | 0 | 0 | 0 | 6 | 6 |
| [Sales](#grupo-sales) | 12 | 1 | 0 | 1 | 4 | 1 | 5 | 9 |
| [Orders](#grupo-orders) | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| [Management](#grupo-management) | 9 | 3 | 0 | 0 | 0 | 0 | 6 | 1 |
| [Payments](#grupo-payments) | 11 | 0 | 0 | 1 | 2 | 0 | 8 | 1 |
| [Wallet](#grupo-wallet) | 4 | 0 | 2 | 0 | 1 | 1 | 0 | 3 |
| [Quotations](#grupo-quotations) | 13 | 1 | 0 | 5 | 0 | 0 | 7 | 0 |
| [Purchase Orders](#grupo-purchase-orders) | 8 | 0 | 0 | 1 | 1 | 0 | 6 | 0 |
| [Suppliers](#grupo-suppliers) | 10 | 2 | 1 | 0 | 1 | 0 | 6 | 2 |
| [Reports](#grupo-reports) | 4 | 0 | 1 | 3 | 0 | 0 | 0 | 3 |
| [SIIGO](#grupo-siigo) | 16 | 0 | 0 | 0 | 0 | 10 | 6 | 0 |
| [Sync](#grupo-sync) | 13 | 2 | 0 | 3 | 0 | 0 | 8 | 0 |
| **Total** | **189** | **30** | **6** | **14** | **11** | **15** | **113** | **56** |

> "Usa la app" cuenta por ruta; unas 3 operaciones se cuentan de más (`PUT` y `DELETE /employees`, `POST /employees/access-credentials`) porque comparten ruta con otra que sí se llama.

## Mensajes que se repiten (respuestas "de plantilla")

Cuando varios endpoints devuelven **exactamente el mismo texto**, no hay un mensaje por operación: el backend usa una plantilla. Si además `data` viene vacía, el endpoint "responde" pero no entrega información.

| Texto repetido | Veces | Dónde |
|---|---|---|
| message: `Error interno del servidor` | 13 | `POST /customers/favorites`, `POST /sales/history`, `POST /siigo/account-groups`, `POST /siigo/cost-centers`, `POST /siigo/customers`, `POST /siigo/document-types`, `POST /siigo/invoices`, `POST /siigo/payment-types` … |
| message: `Products successfully obtained` | 5 | `POST /inventory`, `POST /inventory/control`, `POST /inventory/filter`, `POST /inventory/search`, `POST /products` |
| message: `Summary retrieved successfully` | 2 | `GET /purchases/summary`, `GET /suppliers/summary` |
| message: `Users successfully obtained` | 2 | `POST /users`, `POST /wallet` |

**Mensajes de otro recurso:** `POST /wallet` responde `Users successfully obtained` (el mismo texto que `POST /users`) y `POST /wallet/internal` responde `Wallet by ID obtained successfully`. El texto no sirve para saber qué endpoint respondió.

**Familia "Redirect":** `POST /quotations/brands`, `/categories` y `/models` responden `Redirect to brands endpoint`, `Redirect to categories endpoint` y `Redirect to models endpoint`: la misma plantilla con una sola palabra cambiada, y `data` sin información. **Responden, pero el endpoint no está completo.**

Otros textos con **errores de escritura** que el backend repite en su familia de mensajes: `successfully obteined` (en pendientes y traslados), `Orders Successfully obtained` (mayúscula distinta al resto), `Histories could not recovered`.

## Inconsistencias globales

### 1. Precios: el nivel no está en el dato

- `prices[].type` llega como **`"sale"` en todas las filas** de `/products`, `/search` y de las líneas de pedido. No hay `P0`..`P3`. El nivel solo se puede deducir por **orden de `productPriceId`** (el mayor valor es el primero: 27.000 > 23.900 > 21.500). Es una suposición, no un contrato.
- `/inventory/control`, `/inventory/filter` y `/inventory/search` devuelven `prices[]` **sin `type`** (solo `productPriceId` y `price`).
- **Precios mayoristas:** el `priceType` del cliente no son niveles sino palabras: `majority`, `immediate`, `corporate`, `minority` y `direct` (las mismas cinco que el canal de venta `saleChannel`). El Swagger no dice a qué nivel corresponde cada una. Con 60 ventas reales y 170 líneas, solo 28 líneas pudieron votar y el resultado no es consistente: `corporate` pagó la posición 0 en 6 de 6, `minority` en 1 de 1, pero **`majority` pagó la posición 1 en 13 de 21 líneas, la 0 en 6 y las 2 y 3 en una cada una**.
- **El 62% de las líneas vendidas (105 de 170) se cobró a un precio que ya no está en la lista actual del producto**: los precios cambiaron o se aplicaron descuentos o precios manuales, y el pedido guarda el precio cobrado sin referencia al nivel.
- **El canal de venta no sigue al tipo de cliente:** de las 60 ventas revisadas, en el canal `immediate` hay 43 de clientes `majority`, 2 `minority` y 2 `corporate`; en el canal `corporate` hay clientes `majority` (6), `corporate` (6) y `minority` (1).
- La respuesta de usuarios trae `priceType: "corporate"` para los tres clientes de la muestra y el vendedor 315 (admin) aparece como `majority`: el campo mezcla "tipo de cliente" y "tipo de precio".

### 2. Fechas

- **Fecha vacía** representada como `0001-01-01T00:00:00Z` (pagos sin pagos, facturas sin fecha, `paymentInformation`). Es una fecha válida para JSON pero inválida para el negocio: hay que tratarla como "sin fecha".
- **Formatos mezclados:** ISO con `Z` (`2026-03-10T10:18:06Z`) en casi todo, pero `"2026-03-10 09:47:29"` (sin `T` ni zona) en `createdAt` de proveedores.
- **Nombres distintos para lo mismo:** `created_at` (productos, cartera, usuarios), `createdAt` (pedidos de management, empleados, proveedores, cotizaciones), `updateAt` y `update_at` y `updated_at` (empresas y pedidos).

### 3. Tipos que cambian de un endpoint a otro

- `phone` y `cellPhone`: **número** en `companyInformation` de usuarios y **texto** en empleados, proveedores y empresas.
- `isActive`: booleano en casi todo y **número** en algunos endpoints; `discount`: booleano en `productInformation` y número en las líneas de pedido.
- `isPause`, `isCancelled`, `verifiedTransaction` y `verifiedLocation` son **0 o 1** (enteros), no booleanos, mientras que `isActive` sí es booleano.
- `warehouseId`: `null` en usuarios (la persona no pertenece a una bodega), `0` en cartera y empleados, número en el resto. **Un id en `0` significa "no aplica"** en descuentos, direcciones y empleados.
- `identification`, `nit`, `dni` son texto aunque sean numéricos; `serialCode` es número.

### 4. Paginación sin una forma única

- **Estándar** (la mayoría): `meta` con `currentPage`, `pageSize`, `totalRecords`, `totalPages`, `hasNextPage`, `hasPrevPage`.
- `POST /employees/list`: **sin `meta`**; la paginación va dentro de `data` como `totalCount`, `page`, `limit`, `totalPages` y la lista en `data.employees`.
- `POST /quotations` y `/quotations/history`: la paginación va **dentro de `data`** como `page`, `pageSize`, `totalRows`, `totalPages` y la lista en `data.data` (doble `data`).
- `POST /employees` y `POST /employees/by-role`: **sin paginación**: ignoran `pageSize` y devuelven todos (26 y 37).
- `/inventory/search` y `/search`: devuelven hasta `limit` filas **sin `meta`** ni total.
- Algunos listados con `meta` mienten sobre `totalRecords`: `/categories` y `/models` devuelven 500 filas con `pageSize` 500 pero tienen 529 y 552.

### 5. Campos duplicados y nombres con errores

- `typeIdentification` duplica `identificationType`; `corporateName` duplica `businessName`; `dni` duplica `identification`.
- Errores de escritura que el contrato ya fijó: `ubicationInformation` (debería ser *location*), `comissionRate` (*commission*), `ordersDirectDisptach` (*Dispatch*), `updateAt`.
- Endpoints que devuelven **lo mismo**: `/inventory/control` y `/inventory/filter` (misma forma y 8.205 productos); `/quotations/brands`, `/categories` y `/models` solo redirigen.
- Parámetros declarados que no existen en la ruta: `GET /companies/id` declara un parámetro `id` pero la ruta no lo trae entre llaves.
- Valores aceptados sin validar: `POST /management` responde 200 con **cualquier texto en `state`** (`pending`, `cancelled`, `delivered`...), aunque los totales de las etapas no cambian; `POST /management/saleOrders` con un canal inventado responde 200 y lista vacía (no 400).

### 6. Mensajes y códigos de error

- Los errores internos devuelven siempre `message: "Error interno del servidor"` y detallan la causa en `error`, incluso filtrando datos internos: `Error 1146 (42S02): Table 'testpremium.userfavorites' doesn't exist` expone el **nombre de la base** (`testpremium`) y una **tabla que falta**.
- `SIIGO configuration not found for this company` en las 10 consultas de SIIGO: la empresa no tiene la integración configurada, y el backend lo trata como 500 en vez de 4xx.
- `Solicitud inválida` (400) mezcla español en el mensaje con inglés en `error` (`companyId is required`).
- `GET /health` y `GET /readiness` **no usan el envoltorio** `{ success, message, data }`.
- Algunos mensajes de éxito tienen errores de escritura: `obteined`.

### 7. Filtros que se combinan sin avisar

- `POST /quotations` con `sellerId` **y** `userId` juntos filtra por ambos (vendedor Y cliente): devolvió 0 filas aunque hay 10 cotizaciones. Sin filtros de persona devuelve las 10.
- `POST /sales/traslades` filtra `warehouseId` como bodega de **destino**; para ver los traslados que **salen** de una bodega hay que consultar las demás. Con `userId` solo trae los creados por ese usuario (devolvía 0 con el 948 y 20 sin él).
- `POST /sales/pendings` no devuelve ventas sino **carritos guardados** (`uuid`, `count`, `quantities`) de un vendedor y una bodega; los 26 empleados dieron 0.
- `GET /suppliers/summary` exige `companyId` en la query y lo declara el Swagger, pero `GET /quotations/stats` no declara parámetros y la empresa sale del token.

### 8. Swagger contra la respuesta real

- `POST /wallet`: el Swagger documenta `creditAmount`, `creditDays`, `reservedCredit`, `pendingPayments`, `verifiedPayments` y `saleId`, que **nunca llegan**; llegan en cambio 5 objetos que el Swagger no documenta: `ubicationInformation`, `paymentInformation`, `companyInformation`, `creditInformation` (`quota`, `subtract`, `days`) y `saleInformation[]`.
- `POST /wallet/history` trae 5 campos no documentados. `POST /products` no trae `models` ni `promotions`. `POST /employees` no trae `hireDate`.
- `PUT /sales/status` documenta estos estados: `verification`, `picking`, `dispatch`, `facturar`, `completed`, `cancelled`; la app usaba `picking_verified` y `packing_verified`, que no existen.
- `POST /sales/register` documenta `201` con respuesta `{}`: **no se sabe qué devuelve** (ni siquiera si trae `saleId` o `serialCode`).
- `/management` tiene etapas (`Verification`, `Picking`, `Packing`, `Invoicing`, `Dispatch`, `Sent`) con **mayúscula inicial**, mientras todo el resto del backend usa camelCase.

### 9. Datos de prueba mezclados con datos reales

- Bodegas llamadas **"Updated Warehouse"** y empleados, vendedores y cotizaciones **"Test Updated"** (resultado de pruebas de actualización sobre la base).
- Once dispositivos de sincronización `test-device-...` ("Test Device") sin ninguna sincronización (`lastSyncAt: null`).
- Diez cotizaciones de $1.000 + 19% de IVA, sin líneas, creadas en diciembre de 2025 y con la vigencia vencida.
- 17.657 pedidos en etapa de despacho (casi todos del canal `immediate`) frente a 13 en verificación y 1 en alistamiento: la base mezcla historial con operación viva.
- Un producto con `description: ""` en 2 de 5 filas (`productInformation.description`): el nombre real hay que armarlo con categoría + modelo.

## Grupo: Auth

Sesión del usuario: iniciar, renovar y cerrar. **No se probó ningún endpoint de este grupo** porque exigiría credenciales; su contrato sale del Swagger y del código de la app. `POST /auth/login` devuelve `access_token`, `refresh_token` y el usuario; el refresh puede rotar el token.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /auth/login` | ⚫ No probado | sí |
| `POST /auth/logout` | ⚫ No probado | sí |
| `POST /auth/refresh` | ⚫ No probado | sí |

### `POST /auth/login`

**Log in a user** — Authenticate user and return JWT access and refresh tokens

- **URL completa:** `POST https://importadora-back-production.up.railway.app/auth/login`
- **Token Bearer:** no (el Swagger no exige seguridad) · **Clase:** sesión · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (AUTH.LOGIN)
- **Body según el Swagger** (`models.LoginRequest`): `email`: string *, `password`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (sesión: requeriría credenciales). Contrato según el Swagger: modelo de respuesta `models.LoginResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /auth/logout`

**Logout user** — Revoke all refresh tokens for the authenticated user

- **URL completa:** `POST https://importadora-back-production.up.railway.app/auth/logout`
- **Token Bearer:** sí · **Clase:** sesión · **Códigos documentados:** 204, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (AUTH.LOGOUT)

**Respuesta:** no se llamó (sesión: requeriría credenciales). Contrato según el Swagger: modelo de respuesta `No Content`.

**¿Está completo?** ⚫ No probado.

### `POST /auth/refresh`

**Refresh access token** — Use a refresh token to get a new access token and refresh token

- **URL completa:** `POST https://importadora-back-production.up.railway.app/auth/refresh`
- **Token Bearer:** no (el Swagger no exige seguridad) · **Clase:** sesión · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (AUTH.REFRESH)
- **Body según el Swagger** (`models.RefreshTokenRequest`): `refresh_token`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (sesión: requeriría credenciales). Contrato según el Swagger: modelo de respuesta `models.LoginResponse`.

**¿Está completo?** ⚫ No probado.

## Grupo: health

Estado del servicio. Responden sin el envoltorio estándar y sin token. La app usa `GET /health` para mostrar la latencia en el pie del menú.

| Operación | Estado | La usa la app |
|---|---|---|
| `GET /health` | 🟢 Completo (solo informa estado) | sí |
| `GET /readiness` | 🟢 Completo (solo informa estado) | no |

### `GET /health`

**Health Check** — Verifica el estado del servicio, base de datos y cache

- **URL completa:** `GET https://importadora-back-production.up.railway.app/health`
- **Token Bearer:** no (el Swagger no exige seguridad) · **Clase:** lectura · **Códigos documentados:** 200, 503
- **Estado:** 🟢 Completo (solo informa estado)
- **La usa la app:** sí (HEALTH.CHECK)

**Respuesta recibida:** HTTP **200** · 142 ms · envoltorio: 
- `data` es **undefined**

**¿Está completo?** 🟢 Completo (solo informa estado).

### `GET /readiness`

**Readiness Check** — Verifica si el servicio está listo para recibir requests

- **URL completa:** `GET https://importadora-back-production.up.railway.app/readiness`
- **Token Bearer:** no (el Swagger no exige seguridad) · **Clase:** lectura · **Códigos documentados:** 200, 503
- **Estado:** 🟢 Completo (solo informa estado)
- **La usa la app:** no

**Respuesta recibida:** HTTP **200** · 145 ms · envoltorio: 
- `data` es **undefined**

**¿Está completo?** 🟢 Completo (solo informa estado).

## Grupo: Companies

Empresas (tenant). Todo en el sistema se filtra por `companyId`. **`GET /companies` devuelve todas las empresas (3), no solo la del usuario**, e incluye datos de facturación DIAN.

| Operación | Estado | La usa la app |
|---|---|---|
| `GET /companies` | 🟢 Completo | no |
| `GET /companies/id` | 🔴 Error 400 en la prueba (ver notas) | no |
| `POST /companies` | ⚫ No probado | no |
| `DELETE /companies/delete` | ⚫ No probado | no |
| `PUT /companies/update` | ⚫ No probado | no |

### `GET /companies`

**Get all companies** — Retrieve a list of all companies

- **URL completa:** `GET https://importadora-back-production.up.railway.app/companies`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no

**Respuesta recibida:** HTTP **200** · 142 ms · envoltorio: `success`, `message`, `data` · mensaje: «Getting all companies successfully»
- `data` es **una lista** con 3 fila(s)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `companyId` | number | 0/3 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `name` | string | 0/3 | Nombre |
| `businessName` | string | 0/2 | Razón social |
| `nit` | string | 0/3 | NIT de la empresa/cliente |
| `address` | string | 0/2 | Dirección |
| `phone` | string | 0/2 | Teléfono (llega como texto o número según el endpoint) |
| `email` | string | 0/2 | Correo |
| `logo` | string | 0/3 | Ruta del logo de la empresa |
| `isActive` | boolean | 0/3 | Registro activo (llega como bool o número según el endpoint) |
| `paymentSerial` | string | 0/1 | Consecutivo de pagos |
| `purchaseSerial` | string | 0/1 | Consecutivo de compras |
| `electronicCancellationSerial` | string | 0/1 | Consecutivo de anulación electrónica |
| `isElectronicBiller` | boolean | 0/3 | Factura electrónica activa |
| `dianResolutionDate` | string | 0/1 | Fecha de resolución DIAN |
| `prefix` | string | 0/1 | Prefijo de facturación |
| `initialInvoiceNumber` | string | 0/1 | Inicio del rango de facturación DIAN |
| `finalInvoiceNumber` | string | 0/1 | Fin del rango de facturación DIAN |
| `created_at` | string | 0/3 | Fecha de creación |
| `updated_at` | string | 0/3 | Fecha de modificación |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "companyId": 1,
    "name": "Importadora Premium Online S.A.S",
    "businessName": "Importadora Premium Online S.A.S",
    "nit": "«string:9»",
    "address": "«string:21»",
    "phone": "«string:10»",
    "email": "«string:30»",
    "logo": "dependencias/img/usuarios/defecto.png",
    "isActive": true,
    "paymentSerial": "50",
    "purchaseSerial": "0",
    "electronicCancellationSerial": "0",
    "isElectronicBiller": true,
    "dianResolutionDate": "2024-10-10T00:00:00Z",
    "prefix": "ELE",
    "initialInvoiceNumber": "25000",
    "finalInvoiceNumber": "50000",
    "created_at": "2025-07-25T13:58:50Z",
    "updated_at": "2025-07-25T13:58:50Z"
  },
  {
    "companyId": 2,
    "name": "Test Company API",
    "nit": "«string:7»",
    "logo": "dependencias/img/usuarios/defecto.png",
    "isActive": true,
    "isElectronicBiller": false,
    "created_at": "2025-12-29T14:23:20Z",
    "updated_at": "2025-12-29T14:23:20Z"
  },
  "…"
]
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Devuelve todas las empresas (3), no solo la del usuario.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `companyId` → Empresa

### `GET /companies/id`

**Get company by ID** — Retrieve a single company by its ID

- **URL completa:** `GET https://importadora-back-production.up.railway.app/companies/id`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** 🔴 Error 400 en la prueba (ver notas)
- **La usa la app:** no
- **Parámetros de ruta/query:** `id` (path, integer, obligatorio)

**Respuesta recibida:** HTTP **400** · 83 ms · envoltorio: `success`, `message` · mensaje: «Solicitud inválida» · error: «Invalid company ID»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Solicitud inválida",
  "error": "Invalid company ID"
}
```

**¿Está completo?** 🔴 Error 400 en la prueba (ver notas).

**Inconsistencias y notas:**
- Responde 400 `Invalid company ID` aunque se envíe `?id=1`: el Swagger declara el parámetro pero la ruta no lo usa. **No utilizable.**

### `POST /companies`

**Create a new company** — Create a new company record

- **URL completa:** `POST https://importadora-back-production.up.railway.app/companies`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.CompanyCreateRequest`): `address`: string, `businessName`: string, `email`: string, `name`: string *, `nit`: string *, `phone`: string  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Created`.

**¿Está completo?** ⚫ No probado.

### `DELETE /companies/delete`

**Delete a company** — Delete a company record by ID

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/companies/delete`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 204, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `id` (path, integer, obligatorio)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `No Content`.

**¿Está completo?** ⚫ No probado.

### `PUT /companies/update`

**Update an existing company** — Update an existing company record by ID

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/companies/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `id` (path, integer, obligatorio)
- **Body según el Swagger** (`models.CompanyUpdateRequest`): `address`: string, `businessName`: string, `dianResolutionDate`: string, `dianResolutionNumber`: string, `economicActivities`: string, `electronicCancellationSerial`: string, `email`: string, `finalInvoiceNumber`: string, `initialInvoiceNumber`: string, `isActive`: boolean, `isElectronicBiller`: boolean, `logo`: string, `name`: string, `nit`: string, `paymentSerial`: string, `phone`: string, `prefix`: string, `purchaseSerial`: string, `supplierNit`: string, `technicalKey`: string

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `OK`.

**¿Está completo?** ⚫ No probado.

## Grupo: Warehouses

Bodegas o sedes. De aquí sale la bodega activa del selector del encabezado; el stock, los pedidos, la cartera y los reportes se filtran por `warehouseId`. Cada bodega lleva sus propios consecutivos (venta, traslado, remisión, factura electrónica).

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /warehouses` | 🟢 Completo | sí |
| `POST /warehouses/register` | ⚫ No probado | no |
| `PUT /warehouses/update` | ⚫ No probado | no |

### `POST /warehouses`

**Get all warehouses with pagination** — Retrieves a list of warehouses, supporting pagination and filtering by company ID.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/warehouses`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (CATALOGS.WAREHOUSES)
- **Body según el Swagger** (`models.GetWarehouseRequest`): `companyId`: integer *, `page`: integer, `pageSize`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Lo que envía la app** (`warehouses.fetchWarehouses`): `{"companyId": 1, "page": 1, "pageSize": 100}` → HTTP 200, correcto, 6 fila(s)

**Respuesta recibida:** HTTP **200** · 310 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Warehouses successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **6** (2 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `warehouseId` | number | 0/5 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `name` | string | 0/5 | Nombre |
| `address` | string | 0/5 | Dirección |
| `electronicBillingSerial` | number | 0/5 | Consecutivo de factura electrónica de la bodega |
| `transferSerial` | number | 0/5 | Consecutivo de traslados |
| `remissionSerial` | number | 0/5 | Consecutivo de remisiones |
| `saleSerial` | number | 0/5 | Consecutivo de ventas de la bodega |
| `isMain` | boolean | 0/5 | Es la bodega principal / imagen principal |
| `isActive` | boolean | 0/5 | Registro activo (llega como bool o número según el endpoint) |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "warehouseId": 1,
    "name": "Updated Warehouse",
    "address": "«string:15»",
    "electronicBillingSerial": 0,
    "transferSerial": 0,
    "remissionSerial": 0,
    "saleSerial": 13,
    "isMain": false,
    "isActive": true
  },
  {
    "warehouseId": 4,
    "name": "NLR",
    "address": "«string:6»",
    "electronicBillingSerial": 0,
    "transferSerial": 0,
    "remissionSerial": 0,
    "saleSerial": 0,
    "isMain": false,
    "isActive": true
  },
  "…"
]
```

**¿Está completo?** 🟢 Completo.

**Cómo se relaciona con la operación:**
- Define la bodega activa; `warehouseId` se envía en los cuerpos de stock, pedidos, cartera, reportes y traslados.
- Identificadores que devuelve: `warehouseId` → Bodega

### `POST /warehouses/register`

**Register a new warehouse** — Creates and registers a new warehouse record in the system.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/warehouses/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetWarehouseInsertRequest`): `address`: string, `companyId`: integer *, `electronicBillingSerial`: integer, `name`: string *, `remissionSerial`: integer, `saleSerial`: integer, `transferSerial`: integer  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.WarehouseResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /warehouses/update`

**Update an existing warehouse** — Updates the details of an existing warehouse record based on its ID.

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/warehouses/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetWarehouseUpdateRequest`): `address`: string, `electronicBillingSerial`: integer, `name`: string, `remissionSerial`: integer, `saleSerial`: integer, `transferSerial`: integer, `warehouseId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.WarehouseResponse`.

**¿Está completo?** ⚫ No probado.

## Grupo: Employees

Personal interno: ficha laboral (`employeeId`) ligada a una persona (`userId`), con sedes (`branches`) y roles. Los roles viven en **áreas**. Los permisos por módulo y pantalla (`/employees/permissions`) hoy llegan **vacíos**, así que la matriz de permisos no se puede construir con datos reales.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /employees` | 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados | sí |
| `POST /employees/by-role` | 🟢 Completo | no |
| `POST /employees/list` | 🟢 Completo | no |
| `POST /employees/permissions` | 🟢 Completo | sí |
| `GET /employees/roles` | 🟢 Completo | sí |
| `GET /employees/{id}` | 🔴 Error 404 en la prueba (ver notas) | no |
| `DELETE /employees` | ⚫ No probado | sí |
| `PUT /employees` | ⚫ No probado | sí |
| `POST /employees/access-credentials` | ⚫ No probado | sí |
| `PUT /employees/access-credentials` | ⚫ No probado | sí |
| `POST /employees/permissions/modules` | ⚫ No probado | sí |
| `POST /employees/register` | ⚫ No probado | no |

### `POST /employees`

**Get all employees with filters** — Get all employees for a company with optional filters by employment status and warehouse

- **URL completa:** `POST https://importadora-back-production.up.railway.app/employees`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados
- **La usa la app:** sí (EMPLOYEES.BASE)
- **Body según el Swagger** (`models.GetEmployeeRequest`): `companyId`: integer *, `employmentStatus`: string, `warehouseId`: integer  _(* = obligatorio)_
  - `employmentStatus`: activo, inactivo, suspendido
  - `warehouseId`: Filtrar por sucursal

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1
}
```

**Lo que envía la app** (`employees.fetchEmployeesList`): `{"companyId": 1}` → HTTP 200, correcto, 26 fila(s)

**Respuesta recibida:** HTTP **200** · 549 ms · envoltorio: `success`, `message`, `data` · mensaje: «Employees retrieved successfully»
- `data` es **una lista** con 26 fila(s)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `userId` | number | 0/26 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `employeeId` | number | 0/26 | Empleado (ficha laboral ligada a un userId) |
| `branches` | array/null | 2/26 | Bodegas/sucursales del empleado |
| `branches[].branchId` | number | 0/37 | Sucursal/bodega asignada al empleado |
| `branches[].branchName` | string | 0/37 | Nombre de la sucursal |
| `roles` | array/null | 2/26 | Roles del área |
| `roles[].roleId` | number | 0/37 | Rol |
| `roles[].roleName` | string | 0/37 | Nombre del rol |
| `workModality` | string | 0/26 | Modalidad de trabajo |
| `inmediateSupervisor` | object | 0/26 | Jefe inmediato |
| `inmediateSupervisor.name` | string | 26/26 ⚠ siempre vacío | Nombre |
| `employmentStatus` | string | 0/26 | Estado laboral: activo, licencia, retirado, pendiente |
| `companyId` | number | 0/26 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `warehouseId` | number | 0/26 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `photo` | string | 10/26 | Ruta de la foto |
| `companyDetails` | object | 0/26 | Datos de la empresa |
| `companyDetails.businessName` | string | 26/26 ⚠ siempre vacío | Razón social |
| `companyDetails.nit` | string | 26/26 ⚠ siempre vacío | NIT de la empresa/cliente |
| `companyDetails.phone` | string | 26/26 ⚠ siempre vacío | Teléfono (llega como texto o número según el endpoint) |
| `companyDetails.cellPhone` | string | 26/26 ⚠ siempre vacío | Celular (texto o número según el endpoint) |
| `name` | string | 0/26 | Nombre |
| `lastName` | string | 0/26 | Apellido |
| `identification` | string | 0/26 | Documento de identidad o NIT |
| `country` | string | 0/26 | País |
| `department` | string | 0/26 | Departamento |
| `city` | string | 0/26 | Ciudad |
| `neighborhood` | string | 26/26 ⚠ siempre vacío | Barrio |
| `address` | string | 0/26 | Dirección |
| `additionalInfo` | string | 26/26 ⚠ siempre vacío | Indicaciones adicionales de la dirección |
| `dni` | string | 0/26 | Documento |
| `email` | string | 0/26 | Correo |
| `phone` | string | 0/26 | Teléfono (llega como texto o número según el endpoint) |
| `isActive` | boolean | 0/26 | Registro activo (llega como bool o número según el endpoint) |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "userId": 948,
    "employeeId": 1,
    "branches": [
      {
        "branchId": 1,
        "branchName": "Updated Warehouse"
      }
    ],
    "roles": [
      {
        "roleId": 1,
        "roleName": "Vendedor interno"
      }
    ],
    "workModality": "Presencial",
    "inmediateSupervisor": {
      "name": ""
    },
    "employmentStatus": "activo",
    "companyId": 1,
    "warehouseId": 0,
    "photo": "«string:89»",
    "companyDetails": {
      "businessName": "",
      "nit": "«string:0»",
      "phone": "«string:0»",
      "cellPhone": "«string:0»"
    },
    "name": "«string:4»",
    "lastName": "«string:6»",
    "identification": "«string:6»",
    "country": "Colombia",
    "department": "Antioquia",
    "city": "Medellín",
    "neighborhood": "",
    "address": "«string:8»",
    "additionalInfo": "",
    "dni": "«string:6»",
    "email": "«string:28»",
    "phone": "«string:6»",
    "isActive": true
  },
  {
    "userId": 949,
    "employeeId": 2,
    "branches": [
      {
        "branchId": 1,
        "branchName": "Updated Warehouse"
      }
    ],
    "roles": [
      {
        "roleId": 1,
        "roleName": "Vendedor interno"
      }
    ],
    "workModality": "Presencial",
    "inmediateSupervisor": {
      "name": ""
    },
    "employmentStatus": "activo",
    "companyId": 1,
    "warehouseId": 0,
    "photo": "«string:89»",
    "companyDetails": {
      "businessName": "",
      "nit": "«string:0»",
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados.

**Inconsistencias y notas:**
- Campos que el Swagger documenta y **no llegaron**: `hireDate`
- Campos **siempre vacíos** en la prueba: `neighborhood`, `additionalInfo`
- Devuelve **todos** los empleados (26) e ignora `pageSize`. Trae `branches` y `roles` (pueden ser `null`).
- El Swagger documenta `hireDate`, que nunca llega.

**Cómo se relaciona con la operación:**
- Empleado (`employeeId`) → persona (`userId`), sedes (`branches[].branchId` = `warehouseId`) y roles (`roles[].roleId`).
- Identificadores que devuelve: `userId` → Persona (cliente, vendedor, agente...), `employeeId` → Empleado, `branchId` → Sucursal/bodega del empleado, `roleId` → Rol, `companyId` → Empresa, `warehouseId` → Bodega

### `POST /employees/by-role`

**Get employees by role** — Get a list of employees filtered by their role. Returns employees with active status. Examples of roleName: "inmediateSupervisor", "Vendedor interno", "Administrador"

- **URL completa:** `POST https://importadora-back-production.up.railway.app/employees/by-role`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no
- **Body según el Swagger** (`models.GetEmployeesByRoleRequest`): `companyId`: integer *, `roleName`: string  _(* = obligatorio)_
  - `roleName`: Ejemplo: "inmediateSupervisor", "Vendedor interno"

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1
}
```

**Respuesta recibida:** HTTP **200** · 229 ms · envoltorio: `success`, `message`, `data` · mensaje: «Employees successfully obtained»
- `data` es **una lista** con 37 fila(s)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `id` | number | 0/30 | Identificador interno de la fila |
| `name` | string | 0/30 | Nombre |
| `businessName` | string | 30/30 ⚠ siempre vacío | Razón social |
| `identification` | string | 0/30 | Documento de identidad o NIT |
| `photo` | string | 4/30 | Ruta de la foto |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "id": 948,
    "name": "cadq ascasc",
    "businessName": "",
    "identification": "«string:6»",
    "photo": "«string:89»"
  },
  {
    "id": 949,
    "name": "Juan Andres Gonzales",
    "businessName": "",
    "identification": "«string:9»",
    "photo": "«string:89»"
  },
  "…"
]
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `businessName`

### `POST /employees/list`

**Get paginated list of employees** — Get a paginated list of employees with filters by company, warehouse, and status

- **URL completa:** `POST https://importadora-back-production.up.railway.app/employees/list`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no
- **Body según el Swagger** (`models.GetEmployeeListRequest`): `companyId`: integer *, `limit`: integer *, `page`: integer *, `status`: string ∈ {activo, licencia, retirado}, `warehouseId`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "limit": 5,
  "page": 1,
  "status": "activo"
}
```

**Respuesta recibida:** HTTP **200** · 309 ms · envoltorio: `success`, `message`, `data` · mensaje: «Employee list retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `employees` | array | 0/1 | Lista de empleados |
| `employees[].employeeId` | number | 0/5 | Empleado (ficha laboral ligada a un userId) |
| `employees[].userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `employees[].name` | string | 0/5 | Nombre |
| `employees[].lastName` | string | 0/5 | Apellido |
| `employees[].businessName` | string | 0/5 | Razón social |
| `employees[].accessStatus` | boolean | 0/5 | El empleado tiene acceso al sistema |
| `employees[].connectionStatus` | object | 0/5 | Última conexión y duración |
| `employees[].connectionStatus.lastConnectedAt` | string | 5/5 ⚠ siempre vacío | Última conexión |
| `employees[].connectionStatus.connectedDurationSeconds` | number | 0/5 | Segundos conectado |
| `employees[].identification` | string | 0/5 | Documento de identidad o NIT |
| `employees[].identificationType` | string | 0/5 | Tipo de documento (CC, NIT...) |
| `employees[].email` | string | 0/5 | Correo |
| `employees[].phone` | string | 0/5 | Teléfono (llega como texto o número según el endpoint) |
| `employees[].photo` | string | 4/5 | Ruta de la foto |
| `employees[].employmentStatus` | string | 0/5 | Estado laboral: activo, licencia, retirado, pendiente |
| `employees[].workModality` | string | 0/5 | Modalidad de trabajo |
| `totalCount` | number | 0/1 | Total de registros |
| `page` | number | 0/1 | Página actual |
| `limit` | number | 0/1 | Tamaño de página |
| `totalPages` | number | 0/1 | Total de páginas |

**Respuesta real (muestra enmascarada):**

```json
{
  "employees": [
    {
      "employeeId": 57,
      "userId": 1025,
      "name": "«string:6»",
      "lastName": "«string:5»",
      "businessName": "Importadora Premium Online S.A.S",
      "accessStatus": true,
      "connectionStatus": {
        "lastConnectedAt": "",
        "connectedDurationSeconds": 0
      },
      "identification": "«string:9»",
      "identificationType": "CC",
      "email": "«string:29»",
      "phone": "«string:10»",
      "photo": "«string:0»",
      "employmentStatus": "activo",
      "workModality": "Presencial"
    },
    {
      "employeeId": 56,
      "userId": 1024,
      "name": "«string:9»",
      "lastName": "«string:7»",
      "businessName": "Importadora Premium Online S.A.S",
      "accessStatus": true,
      "connectionStatus": {
        "lastConnectedAt": "",
        "connectedDurationSeconds": 0
      },
      "identification": "«string:10»",
      "identificationType": "CC",
      "email": "«string:34»",
      "phone": "«string:6»",
      "photo": "«string:0»",
      "employmentStatus": "activo",
      "workModality": "Presencial"
    },
    "…"
  ],
  "totalCount": 26,
  "page": 1,
  "limit": 5,
  "totalPages": 6
}
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Es el único listado con otra forma de paginación (`totalCount`, `page`, `limit`) y `data` es un **objeto**, no una lista.
- No trae roles ni sedes.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `employeeId` → Empleado, `userId` → Persona (cliente, vendedor, agente...)

### `POST /employees/permissions`

**Get employee permissions** — Get detailed permissions for an employee including branches, modules, and screens

- **URL completa:** `POST https://importadora-back-production.up.railway.app/employees/permissions`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 403, 404, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (EMPLOYEES.PERMISSIONS)
- **Body según el Swagger** (`models.GetEmployeePermissionsRequest`): `employeeId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "employeeId": 1
}
```

**Lo que envía la app** (`employees.fetchEmployeePermissions`): `{"employeeId": 1}` → HTTP 200, correcto, 1 fila(s)

**Respuesta recibida:** HTTP **200** · 654 ms · envoltorio: `success`, `message`, `data` · mensaje: «Employee permissions retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `employeeId` | number | 0/1 | Empleado (ficha laboral ligada a un userId) |
| `name` | string | 0/1 | Nombre |
| `lastName` | string | 0/1 | Apellido |
| `branches` | array | 0/1 | Bodegas/sucursales del empleado |
| `branches[].branchId` | number | 0/1 | Sucursal/bodega asignada al empleado |
| `branches[].branchName` | string | 0/1 | Nombre de la sucursal |
| `branches[].isPrimary` | boolean | 0/1 | Sucursal principal del empleado |
| `modules` | array | 1/1 ⚠ siempre vacío | Permisos por módulo y pantalla (llega vacío) |

**Respuesta real (muestra enmascarada):**

```json
{
  "employeeId": 1,
  "name": "«string:4»",
  "lastName": "«string:6»",
  "branches": [
    {
      "branchId": 1,
      "branchName": "Updated Warehouse",
      "isPrimary": false
    }
  ],
  "modules": []
}
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `modules`
- Responde 200 con ficha y sucursales, pero **`modules` llega siempre vacío**: no hay permisos reales por módulo y pantalla.
- El "Access denied" que se había visto con otros empleados no se reprodujo.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `employeeId` → Empleado, `branchId` → Sucursal/bodega del empleado

### `GET /employees/roles`

**Get areas with roles** — Get all areas with their associated roles for a company. Returns areas with role details including permissions and user counts.

- **URL completa:** `GET https://importadora-back-production.up.railway.app/employees/roles`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (EMPLOYEES.ROLES, EMPLOYEES.ROLE)
- **Parámetros de ruta/query:** `companyId` (query, integer, obligatorio)

**Lo que envía la app** (`employees.fetchEmployeeRoles`): `{"companyId": 1}` → HTTP 200, correcto, 5 fila(s)

**Respuesta recibida:** HTTP **200** · 1118 ms · envoltorio: `success`, `message`, `data` · mensaje: «Areas with roles»
- `data` es **una lista** con 5 fila(s)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `areaId` | number | 0/5 | Área de la empresa (agrupa roles) |
| `areaName` | string | 0/5 | Nombre del área |
| `areaIcon` | string | 3/5 | Ícono del área |
| `roles` | array/null | 3/5 | Roles del área |
| `roles[].roleId` | number | 0/3 | Rol |
| `roles[].roleName` | string | 0/3 | Nombre del rol |
| `roles[].description` | string | 0/3 | Descripción |
| `roles[].permissions` | array | 3/3 ⚠ siempre vacío | Permisos del rol |
| `roles[].assignable` | boolean | 0/3 | El rol se puede asignar |
| `roles[].usersCount` | number | 0/3 | Personas con ese rol |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "areaId": 3,
    "areaName": "Administración",
    "areaIcon": "briefcase",
    "roles": [
      {
        "roleId": 3,
        "roleName": "Administrador",
        "description": "Administra operaciones generales",
        "permissions": [],
        "assignable": true,
        "usersCount": 6
      }
    ]
  },
  {
    "areaId": 4,
    "areaName": "Logística",
    "areaIcon": "",
    "roles": null
  },
  "…"
]
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Devuelve **áreas con sus roles**, no empleados (el comentario en `config.ts` estaba desactualizado). Las áreas sin roles llegan con `roles: null`.
- Exige `companyId` en la query.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `areaId` → Área, `roleId` → Rol

### `GET /employees/{id}`

**Get employee by ID** — Get detailed information about a specific employee

- **URL completa:** `GET https://importadora-back-production.up.railway.app/employees/{id}`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** 🔴 Error 404 en la prueba (ver notas)
- **La usa la app:** no
- **Parámetros de ruta/query:** `id` (path, integer, obligatorio)

**Respuesta recibida:** HTTP **404** · 87 ms · envoltorio: `success`, `message` · mensaje: «Employee not found»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Employee not found",
  "error": null
}
```

**¿Está completo?** 🔴 Error 404 en la prueba (ver notas).

### `DELETE /employees`

**Delete an employee** — Soft delete (deactivate) an employee by setting isActive to false

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/employees`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (EMPLOYEES.BASE)
- **Body según el Swagger** (`models.DeleteEmployeeRequest`): `employeeId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `OK`.

**¿Está completo?** ⚫ No probado.

### `PUT /employees`

**Update an employee** — Update employee information. All fields except employeeId are optional. Include only fields you want to update.

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/employees`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (EMPLOYEES.BASE)
- **Body según el Swagger** (`models.UpdateEmployeeRequest`): `additionalInfo`: string, `address`: string, `city`: string, `country`: string, `department`: string, `email`: string, `employeeId`: integer *, `employmentStatus`: string, `identification`: string, `isActive`: boolean, `lastName`: string, `name`: string, `neighborhood`: string, `notes`: string, `phone`: string, `photo`: string, `primaryWarehouseId`: integer, `roleIds`: array[], `supervisorUserId`: integer, `warehouseIds`: array[], `workModality`: string  _(* = obligatorio)_
  - `country`: Datos de dirección
  - `name`: Datos básicos del usuario (opcionales para actualización)
  - `roleIds`: Asignaciones (si se envían, se reemplazan completamente)
  - `workModality`: Datos específicos de empleado

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `OK`.

**¿Está completo?** ⚫ No probado.

### `POST /employees/access-credentials`

**Get employee access credentials** — Get employee's email and masked password. Password is always returned as "********" for security. Only employees from your company can be accessed.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/employees/access-credentials`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 403, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (EMPLOYEES.CREDENTIALS)
- **Body según el Swagger** (`models.GetAccessCredentialsRequest`): `employeeId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (sin motivo registrado). Contrato según el Swagger: modelo de respuesta `models.AccessCredentialsResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /employees/access-credentials`

**Update employee access credentials** — Update employee's email and/or password. IMPORTANT: When updating your own password, currentPassword is required. Admin users can update other employee credentials without currentPassword. Email must be unique. Only employees from your company can be updated.

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/employees/access-credentials`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 403, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (EMPLOYEES.CREDENTIALS)
- **Body según el Swagger** (`models.UpdateAccessCredentialsRequest`): `currentPassword`: string, `email`: string *, `employeeId`: integer *, `password`: string  _(* = obligatorio)_
  - `currentPassword`: Requerido si el usuario actualiza su propia contraseña

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Credentials updated successfully`.

**¿Está completo?** ⚫ No probado.

### `POST /employees/permissions/modules`

**Save or update module permissions** — Save or update permissions for an employee at module and screen level with validation

- **URL completa:** `POST https://importadora-back-production.up.railway.app/employees/permissions/modules`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 403, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (EMPLOYEES.SAVE_PERMISSIONS)
- **Body según el Swagger** (`models.SaveModulePermissionsRequest`): `employeeId`: integer *, `modules`: array[] *  _(* = obligatorio)_

**Lo que envía la app** (`employees.saveEmployeePermissions`): `{"employeeId": 1, "modules": []}` (no se repitió contra la API real)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `OK`.

**¿Está completo?** ⚫ No probado.

### `POST /employees/register`

**Create a new employee** — Register a new employee with personal info, contract details, roles, branches, and areas. Accepts multipart/form-data with photo upload.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/employees/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `name` (formData, string, obligatorio), `lastName` (formData, string, obligatorio), `identificationType` (formData, string, obligatorio), `identification` (formData, string, obligatorio), `country` (formData, string, obligatorio), `department` (formData, string, obligatorio), `city` (formData, string, obligatorio), `address` (formData, string, obligatorio), `employmentStatus` (formData, string, obligatorio), `workModality` (formData, string, obligatorio), `branches` (formData, string, obligatorio), `roles` (formData, string, obligatorio), `phone` (formData, string), `neighborhood` (formData, string), `additionalInfo` (formData, string), `nacionality` (formData, string), `gender` (formData, string), `maritalStatus` (formData, string), `birthday` (formData, string), `contractType` (formData, string), `startDate` (formData, string), `endDate` (formData, string), `areas` (formData, string), `inmediateSupervisor` (formData, string), `companyDetails` (formData, string), `photo` (formData, file)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `object`.

**¿Está completo?** ⚫ No probado.

## Grupo: Users

**Tabla central de personas**: clientes, vendedores, proveedores y agentes son filas de `users`, distinguidas por `userType` (customer, seller, admin...). Casi todo lo demás (carritos, cartera, pedidos, direcciones, descuentos) cuelga de `userId`.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /users` | 🟢 Completo | sí |
| `GET /users/{id}` | 🟢 Completo | sí |
| `POST /users/balance` | ⚫ No probado | no |
| `PUT /users/credit` | ⚫ No probado | sí |
| `PUT /users/credit/days` | ⚫ No probado | no |
| `PUT /users/credit/limit` | ⚫ No probado | no |
| `POST /users/quick-register` | ⚫ No probado | sí |
| `POST /users/register` | ⚫ No probado | no |
| `PUT /users/state` | ⚫ No probado | no |
| `PUT /users/update` | ⚫ No probado | no |
| `POST /users/validate-document` | ⚫ Sin probar (faltaba un valor de dominio) | sí |

### `POST /users`

**Get all users with pagination** — Retrieves a list of registered users, with support for pagination and potential filters.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/users`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (USERS.LIST)
- **Body según el Swagger** (`models.GetUserRequest`): `companyId`: integer *, `page`: integer, `pageSize`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Lo que envía la app** (`customers.fetchCustomersPage`): `{"companyId": 1, "page": 1, "pageSize": 5}` → HTTP 200, correcto, 5 fila(s)

**Respuesta recibida:** HTTP **200** · 424 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Users successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **563** (113 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `companyId` | number | 0/5 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `warehouseId` | null | 5/5 ⚠ siempre vacío | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `userType` | string | 0/5 | Tipo de actor: customer, seller, supplier, agent... |
| `priceType` | string | 0/5 | Lista de precios del cliente (corporate, wholesale...) |
| `identification` | string | 0/5 | Documento de identidad o NIT |
| `email` | string | 0/5 | Correo |
| `name` | string | 0/5 | Nombre |
| `lastName` | string | 4/5 | Apellido |
| `photo` | string | 0/5 | Ruta de la foto |
| `comissionRate` | number | 0/5 | Porcentaje de comisión del vendedor (el campo se escribe "comission") |
| `companyInformation` | object | 0/5 | Ficha de la empresa del cliente (datos fiscales) |
| `companyInformation.userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `companyInformation.businessName` | string | 1/5 | Razón social |
| `companyInformation.typeIdentification` | string | 5/5 ⚠ siempre vacío | Tipo de documento (duplica identificationType) |
| `companyInformation.nit` | string | 1/5 | NIT de la empresa/cliente |
| `companyInformation.email` | string | 5/5 ⚠ siempre vacío | Correo |
| `companyInformation.phone` | number | 0/5 | Teléfono (llega como texto o número según el endpoint) |
| `companyInformation.cellPhone` | number | 0/5 | Celular (texto o número según el endpoint) |
| `companyInformation.legalRepresentative` | string | 5/5 ⚠ siempre vacío | Representante legal |
| `companyInformation.customerType` | string | 1/5 | Tipo de cliente |
| `companyInformation.personType` | string | 5/5 ⚠ siempre vacío | Persona natural o jurídica |
| `companyInformation.regimeType` | string | 5/5 ⚠ siempre vacío | Régimen tributario |
| `companyInformation.fiscalResponsability` | string | 5/5 ⚠ siempre vacío | Responsabilidad fiscal (DIAN) |
| `companyInformation.mailInvoicing` | string | 5/5 ⚠ siempre vacío | Correo para facturación electrónica |
| `companyInformation.corporateName` | string | 5/5 ⚠ siempre vacío | Razón social corporativa (duplica businessName) |
| `companyInformation.tradeName` | string | 5/5 ⚠ siempre vacío | Nombre comercial |
| `companyInformation.birthMonth` | string | 5/5 ⚠ siempre vacío | Mes de cumpleaños |
| `companyInformation.birthDay` | string | 5/5 ⚠ siempre vacío | Día de cumpleaños |
| `companyInformation.birthYear` | string | 5/5 ⚠ siempre vacío | Año de nacimiento |
| `companyInformation.cityAndDepartment` | string | 5/5 ⚠ siempre vacío | Ciudad y departamento en un texto |
| `companyInformation.address` | string | 1/5 | Dirección |
| `companyInformation.zipCode` | string | 5/5 ⚠ siempre vacío | Código postal |
| `companyInformation.identityCardFiles` | null | 5/5 ⚠ siempre vacío | Archivos de cédula |
| `companyInformation.chamberCommerceFiles` | null | 5/5 ⚠ siempre vacío | Archivos de cámara de comercio |
| `companyInformation.rutFiles` | null | 5/5 ⚠ siempre vacío | Archivos del RUT |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "userId": 215,
    "companyId": 1,
    "warehouseId": null,
    "userType": "customer",
    "priceType": "corporate",
    "identification": "«string:7»",
    "email": "«string:22»",
    "name": "«string:18»",
    "lastName": "«string:20»",
    "photo": "«string:65»",
    "comissionRate": 0,
    "companyInformation": {
      "userId": 0,
      "businessName": "",
      "typeIdentification": "",
      "nit": "«string:0»",
      "email": "«string:0»",
      "phone": "«number:1»",
      "cellPhone": "«number:1»",
      "legalRepresentative": "",
      "customerType": "",
      "personType": "",
      "regimeType": "",
      "fiscalResponsability": "",
      "mailInvoicing": "«string:0»",
      "corporateName": "",
      "tradeName": "",
      "birthMonth": "",
      "birthDay": "",
      "birthYear": "",
      "cityAndDepartment": "",
      "address": "«string:0»",
      "zipCode": "",
      "identityCardFiles": null,
      "chamberCommerceFiles": null,
      "rutFiles": null
    }
  },
  {
    "userId": 217,
    "companyId": 1,
    "warehouseId": null,
    "userType": "customer",
    "priceType": "corporate",
    "identification": "«string:10»",
    "email": "«string:21»",
    "name": "«string:29»",
    "lastName": "«string:0»",
    "photo": "«string:37»",
    "comissionRate": 0,
    "companyInformation": {
      "userId": 217,
      "businessName": "kioto import",
      "typeIdentification": "",
      "nit": "«string:10»",
      "email": "«string:0»",
      "phone": "«number:10»",
      "cellPhone": "«number:10»",
      "legalRepresentative": "",
      "customerType": "Corporativo",
      "personType": "",
      "regimeType": "",
      "fiscalResponsability": "",
      "mailInvoicing": "«string:0»",
      "corporateName": "",
      "tradeName": "",
      "birthMonth": "",
      "birthDay": "",
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `warehouseId`
- El mensaje «Users successfully obtained» **se repite en 2 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- `companyInformation` anidado llega casi todo vacío (`typeIdentification`, `legalRepresentative`, fechas de cumpleaños...).
- `priceType` son palabras, no niveles (ver inconsistencia 1).
- Se distingue el tipo de persona con `userType`.

**Cómo se relaciona con la operación:**
- Persona → carritos, direcciones (`userId`), descuentos, cartera, pedidos (como cliente y como vendedor) y cotizaciones.
- Identificadores que devuelve: `userId` → Persona (cliente, vendedor, agente...), `companyId` → Empresa, `warehouseId` → Bodega

### `GET /users/{id}`

**Get a user by ID with complete information** — Retrieve detailed user information including personal data, company details, files, and fiscal responsabilities
The response includes:
- Basic user information (name, lastName, identification, photo, email, comissionRate)
- Company information (businessName, t

- **URL completa:** `GET https://importadora-back-production.up.railway.app/users/{id}`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (USERS.BY_ID)
- **Parámetros de ruta/query:** `id` (path, integer, obligatorio)

**Lo que envía la app** (`customers.fetchCustomerDetail`): `null` → HTTP 200, correcto, 1 fila(s)

**Respuesta recibida:** HTTP **200** · 417 ms · envoltorio: `success`, `message`, `data` · mensaje: «User retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `userId` | number | 0/1 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `companyId` | number | 0/1 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `warehouseId` | null | 1/1 ⚠ siempre vacío | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `userType` | string | 0/1 | Tipo de actor: customer, seller, supplier, agent... |
| `priceType` | string | 1/1 ⚠ siempre vacío | Lista de precios del cliente (corporate, wholesale...) |
| `identification` | string | 0/1 | Documento de identidad o NIT |
| `email` | string | 0/1 | Correo |
| `name` | string | 0/1 | Nombre |
| `lastName` | string | 0/1 | Apellido |
| `photo` | string | 0/1 | Ruta de la foto |
| `comissionRate` | number | 0/1 | Porcentaje de comisión del vendedor (el campo se escribe "comission") |
| `companyInformation` | object | 0/1 | Ficha de la empresa del cliente (datos fiscales) |
| `companyInformation.userId` | number | 0/1 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `companyInformation.businessName` | string | 1/1 ⚠ siempre vacío | Razón social |
| `companyInformation.typeIdentification` | string | 1/1 ⚠ siempre vacío | Tipo de documento (duplica identificationType) |
| `companyInformation.nit` | string | 1/1 ⚠ siempre vacío | NIT de la empresa/cliente |
| `companyInformation.email` | string | 1/1 ⚠ siempre vacío | Correo |
| `companyInformation.phone` | number | 0/1 | Teléfono (llega como texto o número según el endpoint) |
| `companyInformation.cellPhone` | number | 0/1 | Celular (texto o número según el endpoint) |
| `companyInformation.legalRepresentative` | string | 1/1 ⚠ siempre vacío | Representante legal |
| `companyInformation.customerType` | string | 1/1 ⚠ siempre vacío | Tipo de cliente |
| `companyInformation.personType` | string | 1/1 ⚠ siempre vacío | Persona natural o jurídica |
| `companyInformation.regimeType` | string | 1/1 ⚠ siempre vacío | Régimen tributario |
| `companyInformation.fiscalResponsability` | string | 1/1 ⚠ siempre vacío | Responsabilidad fiscal (DIAN) |
| `companyInformation.mailInvoicing` | string | 1/1 ⚠ siempre vacío | Correo para facturación electrónica |
| `companyInformation.corporateName` | string | 1/1 ⚠ siempre vacío | Razón social corporativa (duplica businessName) |
| `companyInformation.tradeName` | string | 1/1 ⚠ siempre vacío | Nombre comercial |
| `companyInformation.birthMonth` | string | 1/1 ⚠ siempre vacío | Mes de cumpleaños |
| `companyInformation.birthDay` | string | 1/1 ⚠ siempre vacío | Día de cumpleaños |
| `companyInformation.birthYear` | string | 1/1 ⚠ siempre vacío | Año de nacimiento |
| `companyInformation.cityAndDepartment` | string | 1/1 ⚠ siempre vacío | Ciudad y departamento en un texto |
| `companyInformation.address` | string | 1/1 ⚠ siempre vacío | Dirección |
| `companyInformation.zipCode` | string | 1/1 ⚠ siempre vacío | Código postal |
| `companyInformation.identityCardFiles` | null | 1/1 ⚠ siempre vacío | Archivos de cédula |
| `companyInformation.chamberCommerceFiles` | null | 1/1 ⚠ siempre vacío | Archivos de cámara de comercio |
| `companyInformation.rutFiles` | null | 1/1 ⚠ siempre vacío | Archivos del RUT |

**Respuesta real (muestra enmascarada):**

```json
{
  "userId": 948,
  "companyId": 1,
  "warehouseId": null,
  "userType": "support",
  "priceType": "",
  "identification": "«string:6»",
  "email": "«string:28»",
  "name": "«string:4»",
  "lastName": "«string:6»",
  "photo": "«string:89»",
  "comissionRate": 0,
  "companyInformation": {
    "userId": 0,
    "businessName": "",
    "typeIdentification": "",
    "nit": "«string:0»",
    "email": "«string:0»",
    "phone": "«number:1»",
    "cellPhone": "«number:1»",
    "legalRepresentative": "",
    "customerType": "",
    "personType": "",
    "regimeType": "",
    "fiscalResponsability": "",
    "mailInvoicing": "«string:0»",
    "corporateName": "",
    "tradeName": "",
    "birthMonth": "",
    "birthDay": "",
    "birthYear": "",
    "cityAndDepartment": "",
    "address": "«string:0»",
    "zipCode": "",
    "identityCardFiles": null,
    "chamberCommerceFiles": null,
    "rutFiles": null
  }
}
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `warehouseId`, `priceType`

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `userId` → Persona (cliente, vendedor, agente...), `companyId` → Empresa, `warehouseId` → Bodega

### `POST /users/balance`

**Register a balance in favor of a user** — Registers a new balance in favor of a user with the provided details.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/users/balance`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetBalanceInFavorRequest`): `price`: number, `type`: string, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.BalanceInFavors`.

**¿Está completo?** ⚫ No probado.

### `PUT /users/credit`

**Update a user's credit balance** — Updates the credit balance for a specific user.
A user ID and the new credit value are required.

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/users/credit`
- **Token Bearer:** no (el Swagger no exige seguridad) · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (USERS.CREDIT)
- **Body según el Swagger** (`models.GetUpdateCreditUserRequest`): `days`: integer, `isCredit`: boolean, `quota`: number, `userId`: integer *  _(* = obligatorio)_

**Lo que envía la app** (`wallet.updateCredit`): `{"userId": 217, "quota": 1000, "days": 30, "isCredit": true}` (no se repitió contra la API real)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `User credit updated successfully`.

**¿Está completo?** ⚫ No probado.

**Inconsistencias y notas:**
- El Swagger no exige token para este endpoint (conviene confirmar). Es una escritura: no se probó.

### `PUT /users/credit/days`

**Update user credit days** — Updates only the credit days for a specific user

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/users/credit/days`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateCreditDaysRequest`): `days`: integer *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.UserResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /users/credit/limit`

**Update user credit limit** — Updates only the credit limit for a specific user

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/users/credit/limit`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateCreditLimitRequest`): `limit`: number *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.UserResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /users/quick-register`

**Quick user registration** — Creates a user with minimal information (name, email, phone)

- **URL completa:** `POST https://importadora-back-production.up.railway.app/users/quick-register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (USERS.QUICK_REGISTER)
- **Body según el Swagger** (`models.QuickRegisterRequest`): `companyId`: integer *, `email`: string *, `identification`: string, `name`: string *, `phone`: string, `userType`: string  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.UserResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /users/register`

**Register a new user with optional file uploads** — Register a new user with personal and company information, plus optional document uploads.

**Request Format:** multipart/form-data

**Required Fields (in 'data' JSON):**
- companyId: Company ID (number)
- name: User's first name (string)
- email: User's email

- **URL completa:** `POST https://importadora-back-production.up.railway.app/users/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `data` (formData, string, obligatorio), `photo` (formData, file), `identityCardFiles` (formData, file), `chamberCommerceFiles` (formData, file), `rutFiles` (formData, file)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.UserResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /users/state`

**Change user active/inactive state** — Activates or deactivates a user account

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/users/state`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.ChangeUserStateRequest`): `isActive`: boolean, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.UserResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /users/update`

**Update user information (supports JSON and multipart/form-data)** — Update user information with optional file uploads. Supports both JSON and multipart/form-data requests.

**JSON Mode (Content-Type: application/json):**
Send user fields to update. Only provided fields will be updated.

**Multipart Mode (Content-Type: multipa

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/users/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `data` (formData, string), `photo` (formData, file), `identityCardFiles` (formData, file), `chamberCommerceFiles` (formData, file), `rutFiles` (formData, file)
- **Body según el Swagger** (`models.GetUserUpdateRequest`): `birthday`: string, `cellPhoneCorporate`: string, `comissionRate`: number, `commercialName`: string, `email`: string, `emailCorporate`: string, `identification`: string, `identificationCorporate`: string, `identificationType`: string, `isActive`: boolean, `isClient`: boolean, `isCredit`: boolean, `isProvider`: boolean, `isUser`: boolean, `lastName`: string, `legalRepresentative`: string, `name`: string, `password`: string, `phone`: string, `phoneCorporate`: string, `priceType`: string, `profileType`: string, `socialReason`: string, `userId`: integer *, `userType`: string  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.UserResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /users/validate-document`

**Validate Colombian document** — Validates Colombian documents (CC, NIT, RUT) with proper format and verification digit

- **URL completa:** `POST https://importadora-back-production.up.railway.app/users/validate-document`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ Sin probar (faltaba un valor de dominio)
- **La usa la app:** sí (USERS.VALIDATE_DOCUMENT)
- **Body según el Swagger** (`models.ValidateDocumentRequest`): `documentNumber`: string *, `documentType`: string ∈ {CC, NIT, RUT} *  _(* = obligatorio)_

**Respuesta:** no se obtuvo. Motivo: falta documentNumber (no apareció en ninguna otra respuesta; se puede dar con EXTRA)

**¿Está completo?** ⚫ Sin probar (faltaba un valor de dominio).

## Grupo: Customers

Operaciones específicas de clientes (correo, favoritos, documentos). Gran parte son escrituras. **`POST /customers/favorites` está roto en el backend** (falta la tabla `userfavorites`).

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /customers/favorites` | 🔴 Roto: el backend responde 500 | no |
| `POST /customers/check-email` | ⚫ Sin probar (faltaba un valor de dominio) | sí |
| `DELETE /customers/delete-document` | ⚫ No probado | no |
| `POST /customers/register` | ⚫ No probado | no |
| `PUT /customers/update-companies` | ⚫ No probado | no |
| `PUT /customers/update-details` | ⚫ No probado | no |
| `POST /customers/update-document` | ⚫ No probado | no |
| `PUT /customers/update-favorite` | ⚫ No probado | no |
| `POST /customers/update-photo` | ⚫ No probado | no |

### `POST /customers/favorites`

**Get customer favorite products** — Get list of product IDs favorited by a customer

- **URL completa:** `POST https://importadora-back-production.up.railway.app/customers/favorites`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetCustomerFavoritesRequest`): `companyId`: integer *, `userId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "userId": 948
}
```

**Respuesta recibida:** HTTP **500** · 252 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Error getting favorites: Error 1146 (42S02): Table 'testpremium.userfavorites' doesn't exist»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Error getting favorites: Error 1146 (42S02): Table 'testpremium.userfavorites' doesn't exist"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- **Roto en el backend:** `Error 1146: Table 'testpremium.userfavorites' doesn't exist`. Filtra el nombre de la base y una tabla faltante.

### `POST /customers/check-email`

**Check if email exists for company** — Checks if an email address is already registered for a specific company

- **URL completa:** `POST https://importadora-back-production.up.railway.app/customers/check-email`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ Sin probar (faltaba un valor de dominio)
- **La usa la app:** sí (CUSTOMERS.CHECK_EMAIL)
- **Body según el Swagger** (`models.CheckEmailRequest`): `companyId`: integer *, `email`: string *  _(* = obligatorio)_

**Respuesta:** no se obtuvo. Motivo: falta email (no apareció en ninguna otra respuesta; se puede dar con EXTRA)

**¿Está completo?** ⚫ Sin probar (faltaba un valor de dominio).

### `DELETE /customers/delete-document`

**Delete a customer document** — Delete a specific document by its ID

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/customers/delete-document`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.DeleteDocumentRequest`): `companyId`: integer *, `userFileId`: integer *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Document deleted successfully`.

**¿Está completo?** ⚫ No probado.

### `POST /customers/register`

**Register a new customer with optional file uploads** — Register a new customer with personal information, company details (if juridica), and document uploads

**Request Format:** multipart/form-data

**Required Fields (in 'data' JSON):**
- companyId: Company ID (number)
- name: Customer's first name (string)
- ema

- **URL completa:** `POST https://importadora-back-production.up.railway.app/customers/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `data` (formData, string, obligatorio), `photo` (formData, file), `identityCardFiles` (formData, file), `chamberCommerceFiles` (formData, file), `rutFiles` (formData, file)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.CustomerResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /customers/update-companies`

**Update customer company information** — Update or create customer company information (upsert pattern)

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/customers/update-companies`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateCompaniesRequest`): `additionalInfo`: string, `address`: string, `cellPhone`: string, `city`: string, `companyId`: integer *, `country`: string, `department`: string, `identification`: string, `legalRepresentative`: string, `name`: string, `neighborhood`: string, `phone`: string, `typeIdentification`: string, `typeRegime`: string, `userId`: integer *  _(* = obligatorio)_
  - `identification`: NIT
  - `name`: Company name

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Company information updated successfully`.

**¿Está completo?** ⚫ No probado.

### `PUT /customers/update-details`

**Update customer details** — Update or create customer personal details (upsert pattern)

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/customers/update-details`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateDetailsRequest`): `additionalInfo`: string, `address`: string, `city`: string, `companyId`: integer *, `country`: string, `date`: string, `department`: string, `gender`: string, `neighborhood`: string, `typeIdentification`: string, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Details updated successfully`.

**¿Está completo?** ⚫ No probado.

### `POST /customers/update-document`

**Upload/update customer documents** — Upload or replace documents of a specific type for a customer

**Request Format:** multipart/form-data

**Required Fields:**
- userId: User ID (in 'data' JSON)
- companyId: Company ID (in 'data' JSON)
- type: Document type - 'identification', 'commerce', 'rut'

- **URL completa:** `POST https://importadora-back-production.up.railway.app/customers/update-document`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `data` (formData, string, obligatorio), `files` (formData, file, obligatorio)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Documents updated successfully`.

**¿Está completo?** ⚫ No probado.

### `PUT /customers/update-favorite`

**Toggle product favorite** — Add or remove a product from customer's favorites

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/customers/update-favorite`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateFavoriteRequest`): `companyId`: integer *, `productId`: integer *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.UpdateFavoriteResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /customers/update-photo`

**Update customer photo** — Update a customer's profile photo

**Request Format:** multipart/form-data

**Required Fields:**
- userId: User ID (in 'data' JSON)
- companyId: Company ID (in 'data' JSON)
- photo: New photo file

- **URL completa:** `POST https://importadora-back-production.up.railway.app/customers/update-photo`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `data` (formData, string, obligatorio), `photo` (formData, file, obligatorio)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Photo updated successfully`.

**¿Está completo?** ⚫ No probado.

## Grupo: Directions

Direcciones de entrega de un usuario (`userId`). Una persona puede tener varias.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /directions` | 🟢 Completo | sí |
| `DELETE /directions/delete` | ⚫ No probado | sí |
| `POST /directions/register` | ⚫ No probado | sí |
| `PUT /directions/update` | ⚫ No probado | no |

### `POST /directions`

**Get all directions for a user with pagination** — Retrieves a list of directions for a specific user, with support for pagination and filtering.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/directions`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (DIRECTIONS.LIST)
- **Body según el Swagger** (`models.GetDirectionRequest`): `page`: integer, `pageSize`: integer, `userId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "page": 1,
  "pageSize": 5,
  "userId": 948
}
```

**Lo que envía la app** (`customers.fetchDirections`): `{"userId": 948, "page": 1, "pageSize": 50}` → HTTP 200, correcto, 1 fila(s)

**Respuesta recibida:** HTTP **200** · 313 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Directions successfully obtained»
- `data` es **una lista** con 1 fila(s); total en la base: **1** (1 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `directionId` | number | 0/1 | Dirección del cliente |
| `userId` | number | 0/1 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `country` | string | 0/1 | País |
| `department` | string | 0/1 | Departamento |
| `city` | string | 0/1 | Ciudad |
| `neighborhood` | string | 1/1 ⚠ siempre vacío | Barrio |
| `address` | string | 0/1 | Dirección |
| `additionalInfo` | string | 1/1 ⚠ siempre vacío | Indicaciones adicionales de la dirección |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "directionId": 1046,
    "userId": 948,
    "country": "Colombia",
    "department": "Antioquia",
    "city": "Medellín",
    "neighborhood": "",
    "address": "«string:8»",
    "additionalInfo": ""
  }
]
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `neighborhood`, `additionalInfo`

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `directionId` → Dirección, `userId` → Persona (cliente, vendedor, agente...)

### `DELETE /directions/delete`

**Delete a direction by ID** — Deletes a specific direction record from the database using its unique ID.

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/directions/delete`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (DIRECTIONS.DELETE)
- **Body según el Swagger** (`models.GetDirectionDeleteRequest`): `directionId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Direction deleted successfully.`.

**¿Está completo?** ⚫ No probado.

### `POST /directions/register`

**Register a new direction** — Creates and registers a new direction for a user.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/directions/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (DIRECTIONS.REGISTER)
- **Body según el Swagger** (`models.GetDirectionInsertRequest`): `additionalInfo`: string, `address`: string, `city`: string, `country`: string, `department`: string, `neighborhood`: string, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.DirectionResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /directions/update`

**Update an existing direction** — Updates the details of an existing direction record based on its ID.

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/directions/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetDirectionUpdateRequest`): `additionalInfo`: string, `address`: string, `city`: string, `country`: string, `department`: string, `directionId`: integer *, `neighborhood`: string  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.Directions`.

**¿Está completo?** ⚫ No probado.

## Grupo: Discounts

Descuentos por usuario, con alcance por marca, categoría, modelo o producto (el id en `0` significa "no aplica"). **Con los datos de prueba llega vacío.**

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /discounts` | ⚪ Vacío: 200 sin filas con los datos de prueba | sí |
| `DELETE /discounts/delete` | ⚫ No probado | sí |
| `DELETE /discounts/deleteall` | ⚫ No probado | no |
| `PUT /discounts/disabledall` | ⚫ No probado | no |
| `POST /discounts/register` | ⚫ No probado | no |
| `PUT /discounts/update` | ⚫ No probado | no |

### `POST /discounts`

**Get all discounts** — Retrieves all discounts associated with a user, with pagination.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/discounts`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** sí (DISCOUNTS.LIST)
- **Body según el Swagger** (`models.GetDiscountRequest`): `page`: integer, `pageSize`: integer, `userId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "page": 1,
  "pageSize": 5,
  "userId": 948
}
```

**Lo que envía la app** (`customers.fetchDiscounts`): `{"userId": 948, "page": 1, "pageSize": 50}` → HTTP 200, correcto, 0 fila(s)

**Respuesta recibida:** HTTP **200** · 311 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Discounts successfully obtained»
- `data` es **una lista** con 0 fila(s); total en la base: **0** (0 páginas)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

**Inconsistencias y notas:**
- Con los datos de prueba llega vacío: no se conoce su respuesta real.

### `DELETE /discounts/delete`

**Delete a discount** — Deletes a discount by its ID.

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/discounts/delete`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (DISCOUNTS.DELETE)
- **Body según el Swagger** (`models.GetDiscountDeleteRequest`): `discountId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `object`.

**¿Está completo?** ⚫ No probado.

### `DELETE /discounts/deleteall`

**Delete all discounts for a user** — Deletes all discounts associated with a user ID.

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/discounts/deleteall`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetDiscountDeleteAllRequest`): `userId`: integer

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `object`.

**¿Está completo?** ⚫ No probado.

### `PUT /discounts/disabledall`

**Disable all discounts for a user** — Disables all discounts associated with a user ID by setting their active status to false.

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/discounts/disabledall`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetDiscountDisabledAllRequest`): `userId`: integer

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `object`.

**¿Está completo?** ⚫ No probado.

### `POST /discounts/register`

**Register a new discount** — Registers a new discount with the provided information.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/discounts/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetDiscountInsertRequest`): `brandId`: integer, `categoryId`: integer, `isActive`: boolean, `modelId`: integer, `price`: number, `productId`: integer, `quantity`: integer, `rate`: integer *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.Discounts`.

**¿Está completo?** ⚫ No probado.

### `PUT /discounts/update`

**Update an existing discount** — Updates the information for an existing discount.

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/discounts/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetDiscountUpdateRequest`): `brandId`: integer, `categoryId`: integer, `discountId`: integer *, `isActive`: boolean, `modelId`: integer, `price`: number, `productId`: integer, `quantity`: integer, `rate`: integer  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.Discounts`.

**¿Está completo?** ⚫ No probado.

## Grupo: Brands

Catálogo de marcas (130 en la empresa de prueba). La imagen llega como ruta relativa `dependencias/img/marcas/...` **sin servidor**: no se puede mostrar sin conocer el dominio de archivos.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /brands` | 🟢 Completo | sí |
| `POST /brands/register` | ⚫ No probado | no |
| `PUT /brands/update` | ⚫ No probado | no |

### `POST /brands`

**Get all brands** — Get paginated list of brands for a company

- **URL completa:** `POST https://importadora-back-production.up.railway.app/brands`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 403, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (CATALOGS.BRANDS)
- **Body según el Swagger** (`models.GetBrandsRequest`): `companyId`: integer *, `page`: integer *, `pageSize`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Lo que envía la app** (`catalogs.fetchBrands`): `{"companyId": 1, "page": 1, "pageSize": 500}` → HTTP 200, correcto, 130 fila(s)

**Respuesta recibida:** HTTP **200** · 584 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Brands successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **130** (26 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `brandId` | number | 0/5 | Marca |
| `name` | string | 0/5 | Nombre |
| `image` | string | 0/5 | Ruta de imagen |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "brandId": 30,
    "name": "SUZUKI ORIGINAL",
    "image": "dependencias/img/marcas/53118437_marcas-04.png"
  },
  {
    "brandId": 31,
    "name": "PREMIUM GENUINE",
    "image": "dependencias/img/marcas/DISEÑO DE MARCAS DE MOTOPJ-01.webp"
  },
  "…"
]
```

**¿Está completo?** 🟢 Completo.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `brandId` → Marca

### `POST /brands/register`

**Create a new brand** — Register a new brand for a company

- **URL completa:** `POST https://importadora-back-production.up.railway.app/brands/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 403, 409, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.CreateBrandRequest`): `companyId`: integer *, `name`: string *, `resource`: string  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.BrandResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /brands/update`

**Update a brand** — Update an existing brand

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/brands/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 409, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateBrandRequest`): `brandId`: integer *, `name`: string, `resource`: string  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.BrandResponse`.

**¿Está completo?** ⚫ No probado.

## Grupo: Categories

Catálogo de categorías (529). Solo `categoryId` y `name`.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /categories` | 🟢 Completo | sí |
| `POST /categories/register` | ⚫ No probado | no |
| `PUT /categories/update` | ⚫ No probado | no |

### `POST /categories`

**Get all categories** — Retrieve a list of all registered categories

- **URL completa:** `POST https://importadora-back-production.up.railway.app/categories`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (CATALOGS.CATEGORIES)
- **Body según el Swagger** (`models.GetCategoryRequest`): `companyId`: integer *, `page`: integer, `pageSize`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Lo que envía la app** (`catalogs.fetchCategories`): `{"companyId": 1, "page": 1, "pageSize": 500}` → HTTP 200, correcto, 500 fila(s)

**Respuesta recibida:** HTTP **200** · 314 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Categories successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **529** (106 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `categoryId` | number | 0/5 | Categoría |
| `name` | string | 0/5 | Nombre |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "categoryId": 63,
    "name": "BANDA DE FRENO"
  },
  {
    "categoryId": 64,
    "name": "PASTILLA DE FRENO"
  },
  "…"
]
```

**¿Está completo?** 🟢 Completo.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `categoryId` → Categoría

### `POST /categories/register`

**Register a new category** — Register a new category with basic data

- **URL completa:** `POST https://importadora-back-production.up.railway.app/categories/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetCategoryInsertRequest`): `companyId`: integer *, `name`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.CategoryResponse`, devuelve una lista.

**¿Está completo?** ⚫ No probado.

### `PUT /categories/update`

**Update category** — Update the information of category

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/categories/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `CategoryId` (path, integer, obligatorio)
- **Body según el Swagger** (`models.GetCategoryUpdateRequest`): `categoryId`: integer *, `name`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.CategoryResponse`.

**¿Está completo?** ⚫ No probado.

## Grupo: Models

Catálogo de modelos de moto (552). Solo `modelId` y `name`.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /models` | 🟢 Completo | sí |
| `POST /models/register` | ⚫ No probado | no |
| `PUT /models/update` | ⚫ No probado | no |

### `POST /models`

**Get all models** — Retrieve a list of all registered models

- **URL completa:** `POST https://importadora-back-production.up.railway.app/models`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (CATALOGS.MODELS)
- **Body según el Swagger** (`models.GetModelRequest`): `companyId`: integer *, `page`: integer, `pageSize`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Lo que envía la app** (`catalogs.fetchMotoModels`): `{"companyId": 1, "page": 1, "pageSize": 500}` → HTTP 200, correcto, 500 fila(s)

**Respuesta recibida:** HTTP **200** · 314 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Models successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **552** (111 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `modelId` | number | 0/5 | Modelo |
| `name` | string | 0/5 | Nombre |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "modelId": 1,
    "name": "Updated Model Prueba 1"
  },
  {
    "modelId": 2,
    "name": "155"
  },
  "…"
]
```

**¿Está completo?** 🟢 Completo.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `modelId` → Modelo de moto

### `POST /models/register`

**Register a new model** — Register a new models with basic data

- **URL completa:** `POST https://importadora-back-production.up.railway.app/models/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetModelInsertRequest`): `companyId`: integer *, `name`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.ModelResponse`, devuelve una lista.

**¿Está completo?** ⚫ No probado.

### `PUT /models/update`

**Update model** — Update the information of model

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/models/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `ModelId` (path, integer, obligatorio)
- **Body según el Swagger** (`models.GetModelUpdateRequest`): `modelId`: integer *, `name`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.ModelResponse`.

**¿Está completo?** ⚫ No probado.

## Grupo: Products

Ficha del producto con sus precios, imágenes y stock por ubicación y bodega. Es el catálogo base del POS. Total: 8.148 productos. **Los precios llegan con `type: "sale"` y no con el nivel (P0..P3)**.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /products` | 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados | sí |
| `POST /products/register` | ⚫ No probado | no |

### `POST /products`

**Get all products with pagination and filters** — Retrieve a list of all registered products with optional filters and pagination
Available filters:
- brandId: Filter by specific brand ID
- categoryId: Filter by specific category ID
- modelId: Filter by specific model ID
- isActive: Filter by active/inactive 

- **URL completa:** `POST https://importadora-back-production.up.railway.app/products`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados
- **La usa la app:** sí (PRODUCTS.LIST)
- **Body según el Swagger** (`models.GetProductRequest`): `brandIds`: array[], `categoryIds`: array[], `companyId`: integer *, `familyIds`: array[], `hasStock`: boolean, `isActive`: boolean, `isPromotion`: boolean, `modelIds`: array[], `page`: integer, `pageSize`: integer, `warehouseId`: integer  _(* = obligatorio)_
  - `brandIds`: Filtrar por múltiples marcas específicas (opcional)
  - `categoryIds`: Filtrar por múltiples categorías (opcional)
  - `companyId`: ID de la compañía (requerido)
  - `familyIds`: Filtros opcionales
  - `hasStock`: Filtrar locations por stock: true = mostrar solo locations con stock > 0, false = mostrar solo locations con stock = 0 (opcional)
  - `isActive`: Filtrar por estado activo/inactivo - default: true (opcional)
  - `isPromotion`: Filtrar por productos en promoción (opcional)
  - `modelIds`: Filtrar por múltiples modelos (opcional)
  - `warehouseId`: Filtrar locations por bodega específica. Si se envía, solo muestra locations de esa bodega. Si no se envía, muestra todas las locations (opcional)

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Lo que envía la app** (`shop.fetchProductsPage`): `{"companyId": 1, "page": 1, "pageSize": 5, "isActive": true, "warehouseId": 1, "hasStock": true}` → HTTP 200, correcto, 5 fila(s)

**Respuesta recibida:** HTTP **200** · 433 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Products successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **8148** (1630 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `productId` | number | 0/5 | Producto |
| `companyId` | number | 0/5 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `code` | string | 0/5 | Código del producto o ubicación (código de barras) |
| `description` | string | 3/5 | Descripción |
| `categoryName` | string | 0/5 | Nombre de la categoría |
| `modelName` | string | 0/5 | Nombre del modelo/aplicación |
| `brandName` | string | 0/5 | Nombre de la marca |
| `brandImage` | string | 0/5 | Ruta de la imagen de la marca |
| `created_at` | string | 0/5 | Fecha de creación |
| `isActive` | boolean | 0/5 | Registro activo (llega como bool o número según el endpoint) |
| `isPromotion` | boolean | 0/5 | Está en promoción |
| `locations` | array | 0/5 | Dónde hay stock del producto: bodega, ubicación y cantidades |
| `locations[].productLocationId` | number | 0/23 | Fila producto-ubicación-bodega (donde está el stock físico) |
| `locations[].productId` | number | 0/23 | Producto |
| `locations[].warehouseId` | number | 0/23 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `locations[].locationCode` | string | 0/23 | Código de la ubicación física (04-F01, ZR...) |
| `locations[].stock` | number | 0/23 | Existencias en la ubicación |
| `locations[].reservedStock` | number | 0/23 | Existencias reservadas por pedidos |
| `prices` | array | 0/5 | Precios del producto por tipo |
| `prices[].productPriceId` | number | 0/20 | Fila de precio de un producto |
| `prices[].productId` | number | 0/20 | Producto |
| `prices[].price` | number | 0/20 | Precio |
| `prices[].type` | string | 0/20 | Tipo (de precio o de búsqueda) |
| `images` | array | 0/5 | Imágenes del producto |
| `images[].productImageId` | number | 0/12 | Imagen de un producto |
| `images[].productId` | number | 0/12 | Producto |
| `images[].url` | string | 0/12 | Ruta de imagen del producto |
| `images[].isMain` | boolean | 0/12 | Es la bodega principal / imagen principal |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "productId": 1,
    "companyId": 1,
    "code": "8801470510011",
    "description": "",
    "categoryName": "ACEITE",
    "modelName": "15W40",
    "brandName": "KIXX",
    "brandImage": "dependencias/img/marcas/68311880_aceites-06.png",
    "created_at": "2022-05-24T21:04:02Z",
    "isActive": true,
    "isPromotion": false,
    "locations": [
      {
        "productLocationId": 1,
        "productId": 1,
        "warehouseId": 4,
        "locationCode": "ZR",
        "stock": 200,
        "reservedStock": 200
      },
      {
        "productLocationId": 2,
        "productId": 1,
        "warehouseId": 1,
        "locationCode": "04-F01",
        "stock": 13,
        "reservedStock": 0
      },
      "…"
    ],
    "prices": [
      {
        "productPriceId": 1,
        "productId": 1,
        "price": 27000,
        "type": "sale"
      },
      {
        "productPriceId": 2,
        "productId": 1,
        "price": 23900,
        "type": "sale"
      },
      "…"
    ],
    "images": [
      {
        "productImageId": 1,
        "productId": 1,
        "url": "dependencias/img/productos/8801470510011/3.jpg",
        "isMain": true
      },
      {
        "productImageId": 2,
        "productId": 1,
        "url": "dependencias/img/general/imagen_base_productos.png",
        "isMain": false
      }
    ]
  },
  {
    "productId": 2,
    "companyId": 1,
    "code": "5011987033207",
    "description": "",
    "categoryName": "ACEITE",
    "modelName": "20W50",
    "brandName": "SHELL",
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados.

**Inconsistencias y notas:**
- Campos que el Swagger documenta y **no llegaron**: `models`, `promotions`
- El mensaje «Products successfully obtained» **se repite en 5 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- `prices[].type` llega como `"sale"` en todas las filas (ver inconsistencia 1): el nivel solo se deduce por el orden de `productPriceId`.
- `description` llega vacío en varios productos: el nombre se arma con categoría + modelo.
- El Swagger documenta `models` y `promotions`, que nunca llegan.
- `brandImage` e `images[].url` son rutas relativas sin servidor.

**Cómo se relaciona con la operación:**
- Producto → `locations[]` (stock por bodega y ubicación), `prices[]` (precios), `images[]`. Un producto se agrega a un carrito con `POST /carts/register` (`productId`, `price`, `quantity`).
- Identificadores que devuelve: `productId` → Producto, `companyId` → Empresa, `productLocationId` → Producto en una ubicación, `warehouseId` → Bodega, `productPriceId` → Precio de un producto, `productImageId` → Imagen de producto

### `POST /products/register`

**Register a new product** — Register a new product with basic data

- **URL completa:** `POST https://importadora-back-production.up.railway.app/products/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetProductInsertRequest`): `brandId`: integer *, `categoryId`: integer *, `code`: string, `companyId`: integer *, `description`: string, `isActive`: boolean, `lastCost`: number, `maxStock`: integer, `minStock`: integer, `modelId`: integer *, `purchasePrice`: number, `taxId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.ProductResponse`, devuelve una lista.

**¿Está completo?** ⚫ No probado.

## Grupo: Inventory

Existencias por ubicación y bodega. `/inventory/control` y `/inventory/filter` devuelven **lo mismo** (54 campos, 8.205 productos) incluyendo reservas por etapa (carrito, verificación, alistamiento, por facturar). `/inventory/search` busca por texto y exige `type`.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /inventory` | 🟢 Completo | no |
| `POST /inventory/control` | 🟢 Completo | no |
| `POST /inventory/countLocations` | 🟢 Completo | no |
| `POST /inventory/filter` | 🟢 Completo | sí |
| `POST /inventory/locations` | 🟢 Completo | no |
| `POST /inventory/search` | 🟢 Completo | sí |
| `POST /inventory/createProduct` | ⚫ No probado | no |
| `DELETE /inventory/deleteLocationProduct` | ⚫ No probado | no |
| `POST /inventory/registerLocation` | ⚫ No probado | no |
| `POST /inventory/registerLocationProduct` | ⚫ No probado | no |
| `POST /inventory/searchLocation` | ⚫ Sin probar (faltaba un valor de dominio) | no |
| `PUT /inventory/transferLocationProduct` | ⚫ No probado | no |
| `POST /inventory/turn360degree` | ⚫ Sin probar (faltaba un valor de dominio) | no |
| `POST /inventory/updateLocation` | ⚫ No probado | no |
| `PUT /inventory/updateLocationProduct` | ⚫ No probado | no |

### `POST /inventory`

**Get all inventory products with pagination** — Retrieve a complete list of inventory products with categories, models, brands, locations, prices and images

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryRequest`): `companyId`: integer *, `page`: integer, `pageSize`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Respuesta recibida:** HTTP **200** · 444 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Products successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **8148** (1630 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `productId` | number | 0/5 | Producto |
| `productImage` | string | 0/5 | Imagen principal del producto |
| `brandName` | string | 0/5 | Nombre de la marca |
| `brandImage` | string | 0/5 | Ruta de la imagen de la marca |
| `description` | string | 2/5 | Descripción |
| `modelName` | string | 5/5 ⚠ siempre vacío | Nombre del modelo/aplicación |
| `categoryName` | string | 5/5 ⚠ siempre vacío | Nombre de la categoría |
| `code` | string | 0/5 | Código del producto o ubicación (código de barras) |
| `created_at` | string | 0/5 | Fecha de creación |
| `minStock` | number | 0/5 | Existencia mínima para alerta |
| `maxStock` | number | 0/5 | Existencia máxima |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "productId": 13482,
    "productImage": "dependencias/img/general/imagen_base_productos.png",
    "brandName": "IMPORTADO",
    "brandImage": "dependencias/img/marcas/IMPORTADOOoK-72-72.png",
    "description": "",
    "modelName": "",
    "categoryName": "",
    "code": "17020420",
    "created_at": "0001-01-01T00:00:00Z",
    "minStock": 0,
    "maxStock": 0
  },
  {
    "productId": 13481,
    "productImage": "dependencias/img/general/imagen_base_productos.png",
    "brandName": "KEYMAN",
    "brandImage": "dependencias/img/marcas/99835183_marcas-23.png",
    "description": "X 1 ",
    "modelName": "",
    "categoryName": "",
    "code": "17030752",
    "created_at": "0001-01-01T00:00:00Z",
    "minStock": 0,
    "maxStock": 0
  },
  "…"
]
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `modelName`, `categoryName`
- El mensaje «Products successfully obtained» **se repite en 5 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Es una ficha más corta (11 campos) de los mismos 8.148 productos: es **menos completa** que `/products`.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `productId` → Producto

### `POST /inventory/control`

**Get paginated inventory control products** — Retrieve a complete list of inventory products with all control data including locations, prices, stock totals, and status flags

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/control`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no
- **Body según el Swagger** (`models.InventoryControlRequest`): `companyId`: integer *, `page`: integer, `pageSize`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Respuesta recibida:** HTTP **200** · 428 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Products successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **8205** (1641 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `productId` | number | 0/5 | Producto |
| `code` | string | 0/5 | Código del producto o ubicación (código de barras) |
| `productInformation` | object | 0/5 | Ficha del producto dentro de otro objeto |
| `productInformation.brandName` | string | 0/5 | Nombre de la marca |
| `productInformation.brandImage` | string | 0/5 | Ruta de la imagen de la marca |
| `productInformation.categoryName` | string | 0/5 | Nombre de la categoría |
| `productInformation.description` | string | 2/5 | Descripción |
| `productInformation.modelName` | string | 0/5 | Nombre del modelo/aplicación |
| `productInformation.productImage` | string | 0/5 | Imagen principal del producto |
| `productInformation.date` | string | 0/5 | Fecha |
| `productInformation.privacyState` | boolean | 0/5 | Visibilidad privada/pública |
| `productInformation.discount` | boolean | 0/5 | Tiene descuento (bool o valor según el endpoint) |
| `productInformation.isActive` | boolean | 0/5 | Registro activo (llega como bool o número según el endpoint) |
| `productInformation.isNew` | boolean | 0/5 | Producto nuevo |
| `productInformation.isPending` | boolean | 0/5 | Pendiente de aprobación |
| `prices` | array | 0/5 | Precios del producto por tipo |
| `prices[].productPriceId` | number | 0/20 | Fila de precio de un producto |
| `prices[].price` | number | 0/20 | Precio |
| `locations` | array | 0/5 | Dónde hay stock del producto: bodega, ubicación y cantidades |
| `locations[].locationCode` | string | 0/5 | Código de la ubicación física (04-F01, ZR...) |
| `locations[].warehouseId` | number | 0/5 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `locations[].productLocationId` | number | 0/5 | Fila producto-ubicación-bodega (donde está el stock físico) |
| `locations[].physicalStock` | number | 0/5 | Existencia física contada en la ubicación |
| `locations[].stockMax` | number | 0/5 | Capacidad máxima de la ubicación |
| `inventory` | object | 0/5 | Resumen de stock: físico, reservado, en carrito, verificación, picking... |
| `inventory.physicalByLocation` | object | 0/5 | Stock físico por código de ubicación (las llaves cambian: ZR, 04-F01...) |
| `inventory.physicalByLocation.ZR` | number | 0/5 | Stock en la ubicación ZR; llave dinámica, no es un campo fijo |
| `inventory.physicalTotal` | number | 0/5 | Stock físico total |
| `inventory.inCart` | number | 0/5 | Unidades en carritos |
| `inventory.verification` | number | 0/5 | Unidades en verificación |
| `inventory.picking` | number | 0/5 | Unidades en alistamiento |
| `inventory.picked` | number | 0/5 | Unidades ya alistadas |
| `inventory.invoicingPending` | number | 0/5 | Unidades por facturar |
| `inventory.reservedTotal` | number | 0/5 | Total reservado |
| `inventory.availableInStore` | number | 0/5 | Disponible para vender |
| `inventory.systemTotal` | number | 0/5 | Stock que el sistema cree tener |
| `inventory.maxCapacity` | number | 0/5 | Capacidad máxima de la ubicación |
| `statusIds` | array | 0/5 | Estados aplicados al producto |
| `statusFlags` | object | 0/5 | Banderas de estado agrupadas |
| `statusFlags.isPublic` | boolean | 0/5 | Producto público |
| `statusFlags.isPrivate` | boolean | 0/5 | Producto privado |
| `statusFlags.isActive` | boolean | 0/5 | Registro activo (llega como bool o número según el endpoint) |
| `statusFlags.isInactive` | boolean | 0/5 | Producto inactivo |
| `statusFlags.isPromotion` | boolean | 0/5 | Está en promoción |
| `statusFlags.isNew` | boolean | 0/5 | Producto nuevo |
| `statusFlags.hasImages` | boolean | 0/5 | Tiene imágenes |
| `statusFlags.noImages` | boolean | 0/5 | No tiene imágenes |
| `statusFlags.isPending` | boolean | 0/5 | Pendiente de aprobación |
| `stock` | object | 0/5 | Existencias en la ubicación |
| `stock.minStock` | number | 0/5 | Existencia mínima para alerta |
| `stock.maxStock` | number | 0/5 | Existencia máxima |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "productId": 13482,
    "code": "17020420",
    "productInformation": {
      "brandName": "IMPORTADO",
      "brandImage": "dependencias/img/marcas/IMPORTADOOoK-72-72.png",
      "categoryName": "SEGURO DIRECCION",
      "description": "",
      "modelName": "AKT 125 NKD",
      "productImage": "dependencias/img/general/imagen_base_productos.png",
      "date": "2025-06-16T19:39:10Z",
      "privacyState": false,
      "discount": false,
      "isActive": true,
      "isNew": false,
      "isPending": false
    },
    "prices": [
      {
        "productPriceId": 32807,
        "price": 12000
      },
      {
        "productPriceId": 32808,
        "price": 9000
      },
      "…"
    ],
    "locations": [
      {
        "locationCode": "ZR",
        "warehouseId": 5,
        "productLocationId": 33561,
        "physicalStock": 10,
        "stockMax": 100
      }
    ],
    "inventory": {
      "physicalByLocation": {
        "ZR": 10
      },
      "physicalTotal": 10,
      "inCart": 0,
      "verification": 0,
      "picking": 0,
      "picked": 0,
      "invoicingPending": 0,
      "reservedTotal": 0,
      "availableInStore": 10,
      "systemTotal": 10,
      "maxCapacity": 100
    },
    "statusIds": [
      2,
      3,
      "…"
    ],
    "statusFlags": {
      "isPublic": false,
      "isPrivate": true,
      "isActive": true,
      "isInactive": false,
      "isPromotion": false,
      "isNew": false,
      "hasImages": true,
      "noImages": false,
      "isPending": false
    },
    "stock": {
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- El mensaje «Products successfully obtained» **se repite en 5 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Devuelve lo mismo que `/inventory/filter` (misma forma y mismo total 8.205), pero no acepta filtros de bodega.
- `inventory.physicalByLocation` tiene **llaves dinámicas** (el código de cada ubicación: `ZR`, `04-F01`...): no es un campo fijo.
- Los totales de `inventory.*` parecen sumar todas las bodegas del producto; la existencia por bodega sale de `locations[].physicalStock`.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `productId` → Producto, `productPriceId` → Precio de un producto, `warehouseId` → Bodega, `productLocationId` → Producto en una ubicación

### `POST /inventory/countLocations`

**Get inventory location statistics** — Retrieve counts of locations by status (pending, corroborate, verified, without movement)

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/countLocations`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryCountLocationsRequest`): `companyId`: integer *, `warehouseId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "warehouseId": 1
}
```

**Respuesta recibida:** HTTP **200** · 542 ms · envoltorio: `success`, `message`, `data` · mensaje: «Count Locations Inventory successfully obtained»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `countLocation` | number | 0/1 | Ubicaciones contadas |
| `pending` | number | 0/1 | Pendientes |
| `corroborate` | number | 0/1 | Ubicaciones por corroborar |
| `verified` | number | 0/1 | Ubicaciones verificadas |
| `withoutMovement` | number | 0/1 | Ubicaciones sin movimiento |

**Respuesta real (muestra enmascarada):**

```json
{
  "countLocation": 5691,
  "pending": 0,
  "corroborate": 0,
  "verified": 0,
  "withoutMovement": 5691
}
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- 5.691 ubicaciones, **todas** "sin movimiento" (`withoutMovement: 5691`) y `pending`, `corroborate` y `verified` en `0`: la lista de conteo está sin iniciar.

### `POST /inventory/filter`

**Filter inventory control products with advanced filters** — Filter inventory products by warehouse, brand, category, model, family, stock availability and multiple status flags

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/filter`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (PRODUCTS.FILTER)
- **Body según el Swagger** (`models.InventoryFilterRequest`): `brandIds`: array[], `categoryIds`: array[], `companyId`: integer *, `familyIds`: array[], `hasStock`: boolean, `modelIds`: array[], `page`: integer, `pageSize`: integer, `statusId`: array[], `warehouseId`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Lo que envía la app** (`inventory.fetchInventoryPage`): `{"companyId": 1, "page": 1, "pageSize": 5, "warehouseId": 1, "hasStock": true}` → HTTP 200, correcto, 5 fila(s)

**Respuesta recibida:** HTTP **200** · 425 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Products successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **8205** (1641 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `productId` | number | 0/5 | Producto |
| `code` | string | 0/5 | Código del producto o ubicación (código de barras) |
| `productInformation` | object | 0/5 | Ficha del producto dentro de otro objeto |
| `productInformation.brandName` | string | 0/5 | Nombre de la marca |
| `productInformation.brandImage` | string | 0/5 | Ruta de la imagen de la marca |
| `productInformation.categoryName` | string | 0/5 | Nombre de la categoría |
| `productInformation.description` | string | 2/5 | Descripción |
| `productInformation.modelName` | string | 0/5 | Nombre del modelo/aplicación |
| `productInformation.productImage` | string | 0/5 | Imagen principal del producto |
| `productInformation.date` | string | 0/5 | Fecha |
| `productInformation.privacyState` | boolean | 0/5 | Visibilidad privada/pública |
| `productInformation.discount` | boolean | 0/5 | Tiene descuento (bool o valor según el endpoint) |
| `productInformation.isActive` | boolean | 0/5 | Registro activo (llega como bool o número según el endpoint) |
| `productInformation.isNew` | boolean | 0/5 | Producto nuevo |
| `productInformation.isPending` | boolean | 0/5 | Pendiente de aprobación |
| `prices` | array | 0/5 | Precios del producto por tipo |
| `prices[].productPriceId` | number | 0/20 | Fila de precio de un producto |
| `prices[].price` | number | 0/20 | Precio |
| `locations` | array | 0/5 | Dónde hay stock del producto: bodega, ubicación y cantidades |
| `locations[].locationCode` | string | 0/5 | Código de la ubicación física (04-F01, ZR...) |
| `locations[].warehouseId` | number | 0/5 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `locations[].productLocationId` | number | 0/5 | Fila producto-ubicación-bodega (donde está el stock físico) |
| `locations[].physicalStock` | number | 0/5 | Existencia física contada en la ubicación |
| `locations[].stockMax` | number | 0/5 | Capacidad máxima de la ubicación |
| `inventory` | object | 0/5 | Resumen de stock: físico, reservado, en carrito, verificación, picking... |
| `inventory.physicalByLocation` | object | 0/5 | Stock físico por código de ubicación (las llaves cambian: ZR, 04-F01...) |
| `inventory.physicalByLocation.ZR` | number | 0/5 | Stock en la ubicación ZR; llave dinámica, no es un campo fijo |
| `inventory.physicalTotal` | number | 0/5 | Stock físico total |
| `inventory.inCart` | number | 0/5 | Unidades en carritos |
| `inventory.verification` | number | 0/5 | Unidades en verificación |
| `inventory.picking` | number | 0/5 | Unidades en alistamiento |
| `inventory.picked` | number | 0/5 | Unidades ya alistadas |
| `inventory.invoicingPending` | number | 0/5 | Unidades por facturar |
| `inventory.reservedTotal` | number | 0/5 | Total reservado |
| `inventory.availableInStore` | number | 0/5 | Disponible para vender |
| `inventory.systemTotal` | number | 0/5 | Stock que el sistema cree tener |
| `inventory.maxCapacity` | number | 0/5 | Capacidad máxima de la ubicación |
| `statusIds` | array | 0/5 | Estados aplicados al producto |
| `statusFlags` | object | 0/5 | Banderas de estado agrupadas |
| `statusFlags.isPublic` | boolean | 0/5 | Producto público |
| `statusFlags.isPrivate` | boolean | 0/5 | Producto privado |
| `statusFlags.isActive` | boolean | 0/5 | Registro activo (llega como bool o número según el endpoint) |
| `statusFlags.isInactive` | boolean | 0/5 | Producto inactivo |
| `statusFlags.isPromotion` | boolean | 0/5 | Está en promoción |
| `statusFlags.isNew` | boolean | 0/5 | Producto nuevo |
| `statusFlags.hasImages` | boolean | 0/5 | Tiene imágenes |
| `statusFlags.noImages` | boolean | 0/5 | No tiene imágenes |
| `statusFlags.isPending` | boolean | 0/5 | Pendiente de aprobación |
| `stock` | object | 0/5 | Existencias en la ubicación |
| `stock.minStock` | number | 0/5 | Existencia mínima para alerta |
| `stock.maxStock` | number | 0/5 | Existencia máxima |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "productId": 13482,
    "code": "17020420",
    "productInformation": {
      "brandName": "IMPORTADO",
      "brandImage": "dependencias/img/marcas/IMPORTADOOoK-72-72.png",
      "categoryName": "SEGURO DIRECCION",
      "description": "",
      "modelName": "AKT 125 NKD",
      "productImage": "dependencias/img/general/imagen_base_productos.png",
      "date": "2025-06-16T19:39:10Z",
      "privacyState": false,
      "discount": false,
      "isActive": true,
      "isNew": false,
      "isPending": false
    },
    "prices": [
      {
        "productPriceId": 32807,
        "price": 12000
      },
      {
        "productPriceId": 32808,
        "price": 9000
      },
      "…"
    ],
    "locations": [
      {
        "locationCode": "ZR",
        "warehouseId": 5,
        "productLocationId": 33561,
        "physicalStock": 10,
        "stockMax": 100
      }
    ],
    "inventory": {
      "physicalByLocation": {
        "ZR": 10
      },
      "physicalTotal": 10,
      "inCart": 0,
      "verification": 0,
      "picking": 0,
      "picked": 0,
      "invoicingPending": 0,
      "reservedTotal": 0,
      "availableInStore": 10,
      "systemTotal": 10,
      "maxCapacity": 100
    },
    "statusIds": [
      2,
      3,
      "…"
    ],
    "statusFlags": {
      "isPublic": false,
      "isPrivate": true,
      "isActive": true,
      "isInactive": false,
      "isPromotion": false,
      "isNew": false,
      "hasImages": true,
      "noImages": false,
      "isPending": false
    },
    "stock": {
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- El mensaje «Products successfully obtained» **se repite en 5 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Es el único de los tres que acepta `warehouseId`, `hasStock`, `brandIds`, `categoryIds`, `modelIds`, `familyIds` y `statusId`.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `productId` → Producto, `productPriceId` → Precio de un producto, `warehouseId` → Bodega, `productLocationId` → Producto en una ubicación

### `POST /inventory/locations`

**Get all inventory locations with product counts** — Retrieve all warehouse locations with product count and item count per location

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/locations`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryLocationsRequest`): `companyId`: integer *, `list`: string, `page`: integer, `pageSize`: integer, `warehouseId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5,
  "warehouseId": 1
}
```

**Respuesta recibida:** HTTP **200** · 547 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Locations Products successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **1135** (227 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `locationId` | number | 0/5 | Ubicación física |
| `warehouseId` | number | 0/5 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `companyId` | number | 0/5 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `location` | string | 0/5 | Ubicación |
| `isActive` | number | 0/5 | Registro activo (llega como bool o número según el endpoint) |
| `created_at` | string | 0/5 | Fecha de creación |
| `update_at` | string | 0/5 | Fecha de modificación (escrito distinto) |
| `countProducts` | number | 0/5 | Productos |
| `countItems` | number | 0/5 | Líneas |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "locationId": 8,
    "warehouseId": 1,
    "companyId": 1,
    "location": "01-A700",
    "isActive": 1,
    "created_at": "2025-07-25T14:06:55Z",
    "update_at": "2026-03-10T10:09:18Z",
    "countProducts": 6,
    "countItems": 20
  },
  {
    "locationId": 9,
    "warehouseId": 1,
    "companyId": 1,
    "location": "01-B00",
    "isActive": 1,
    "created_at": "2025-07-25T14:06:55Z",
    "update_at": "2025-11-06T14:18:35Z",
    "countProducts": 3,
    "countItems": 1
  },
  "…"
]
```

**¿Está completo?** 🟢 Completo.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `warehouseId` → Bodega, `companyId` → Empresa

### `POST /inventory/search`

**Search inventory control products** — Search inventory products by query string in code, description, brand, model, or category

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/search`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (PRODUCTS.SEARCH)
- **Body según el Swagger** (`models.InventorySearchRequest`): `companyId`: integer *, `limit`: integer, `query`: string *, `type`: string *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "limit": 5,
  "query": "a",
  "type": "product"
}
```

**Lo que envía la app** (`shop.searchProducts`): `{"companyId": 1, "limit": 20, "query": "filtro", "type": "product"}` → HTTP 200, correcto, 20 fila(s)

**Lo que envía la app** (`inventory.searchInventory`): `{"companyId": 1, "limit": 20, "query": "filtro", "type": "product"}` → HTTP 200, correcto, 20 fila(s)

**Respuesta recibida:** HTTP **200** · 318 ms · envoltorio: `success`, `message`, `data` · mensaje: «Products successfully obtained»
- `data` es **una lista** con 5 fila(s)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `productId` | number | 0/5 | Producto |
| `code` | string | 0/5 | Código del producto o ubicación (código de barras) |
| `productInformation` | object | 0/5 | Ficha del producto dentro de otro objeto |
| `productInformation.brandName` | string | 0/5 | Nombre de la marca |
| `productInformation.brandImage` | string | 0/5 | Ruta de la imagen de la marca |
| `productInformation.categoryName` | string | 0/5 | Nombre de la categoría |
| `productInformation.description` | string | 2/5 | Descripción |
| `productInformation.modelName` | string | 0/5 | Nombre del modelo/aplicación |
| `productInformation.productImage` | string | 0/5 | Imagen principal del producto |
| `productInformation.date` | string | 0/5 | Fecha |
| `productInformation.privacyState` | boolean | 0/5 | Visibilidad privada/pública |
| `productInformation.discount` | boolean | 0/5 | Tiene descuento (bool o valor según el endpoint) |
| `productInformation.isActive` | boolean | 0/5 | Registro activo (llega como bool o número según el endpoint) |
| `productInformation.isNew` | boolean | 0/5 | Producto nuevo |
| `productInformation.isPending` | boolean | 0/5 | Pendiente de aprobación |
| `prices` | array | 0/5 | Precios del producto por tipo |
| `prices[].productPriceId` | number | 0/20 | Fila de precio de un producto |
| `prices[].price` | number | 0/20 | Precio |
| `locations` | array | 0/5 | Dónde hay stock del producto: bodega, ubicación y cantidades |
| `locations[].locationCode` | string | 0/5 | Código de la ubicación física (04-F01, ZR...) |
| `locations[].warehouseId` | number | 0/5 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `locations[].productLocationId` | number | 0/5 | Fila producto-ubicación-bodega (donde está el stock físico) |
| `locations[].physicalStock` | number | 0/5 | Existencia física contada en la ubicación |
| `locations[].stockMax` | number | 0/5 | Capacidad máxima de la ubicación |
| `inventory` | object | 0/5 | Resumen de stock: físico, reservado, en carrito, verificación, picking... |
| `inventory.physicalByLocation` | object | 0/5 | Stock físico por código de ubicación (las llaves cambian: ZR, 04-F01...) |
| `inventory.physicalByLocation.ZR` | number | 0/5 | Stock en la ubicación ZR; llave dinámica, no es un campo fijo |
| `inventory.physicalTotal` | number | 0/5 | Stock físico total |
| `inventory.inCart` | number | 0/5 | Unidades en carritos |
| `inventory.verification` | number | 0/5 | Unidades en verificación |
| `inventory.picking` | number | 0/5 | Unidades en alistamiento |
| `inventory.picked` | number | 0/5 | Unidades ya alistadas |
| `inventory.invoicingPending` | number | 0/5 | Unidades por facturar |
| `inventory.reservedTotal` | number | 0/5 | Total reservado |
| `inventory.availableInStore` | number | 0/5 | Disponible para vender |
| `inventory.systemTotal` | number | 0/5 | Stock que el sistema cree tener |
| `inventory.maxCapacity` | number | 0/5 | Capacidad máxima de la ubicación |
| `statusIds` | array | 0/5 | Estados aplicados al producto |
| `statusFlags` | object | 0/5 | Banderas de estado agrupadas |
| `statusFlags.isPublic` | boolean | 0/5 | Producto público |
| `statusFlags.isPrivate` | boolean | 0/5 | Producto privado |
| `statusFlags.isActive` | boolean | 0/5 | Registro activo (llega como bool o número según el endpoint) |
| `statusFlags.isInactive` | boolean | 0/5 | Producto inactivo |
| `statusFlags.isPromotion` | boolean | 0/5 | Está en promoción |
| `statusFlags.isNew` | boolean | 0/5 | Producto nuevo |
| `statusFlags.hasImages` | boolean | 0/5 | Tiene imágenes |
| `statusFlags.noImages` | boolean | 0/5 | No tiene imágenes |
| `statusFlags.isPending` | boolean | 0/5 | Pendiente de aprobación |
| `stock` | object | 0/5 | Existencias en la ubicación |
| `stock.minStock` | number | 0/5 | Existencia mínima para alerta |
| `stock.maxStock` | number | 0/5 | Existencia máxima |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "productId": 13482,
    "code": "17020420",
    "productInformation": {
      "brandName": "IMPORTADO",
      "brandImage": "dependencias/img/marcas/IMPORTADOOoK-72-72.png",
      "categoryName": "SEGURO DIRECCION",
      "description": "",
      "modelName": "AKT 125 NKD",
      "productImage": "dependencias/img/general/imagen_base_productos.png",
      "date": "2025-06-16T19:39:10Z",
      "privacyState": false,
      "discount": false,
      "isActive": true,
      "isNew": false,
      "isPending": false
    },
    "prices": [
      {
        "productPriceId": 32807,
        "price": 12000
      },
      {
        "productPriceId": 32808,
        "price": 9000
      },
      "…"
    ],
    "locations": [
      {
        "locationCode": "ZR",
        "warehouseId": 5,
        "productLocationId": 33561,
        "physicalStock": 10,
        "stockMax": 100
      }
    ],
    "inventory": {
      "physicalByLocation": {
        "ZR": 10
      },
      "physicalTotal": 10,
      "inCart": 0,
      "verification": 0,
      "picking": 0,
      "picked": 0,
      "invoicingPending": 0,
      "reservedTotal": 0,
      "availableInStore": 10,
      "systemTotal": 10,
      "maxCapacity": 100
    },
    "statusIds": [
      2,
      3,
      "…"
    ],
    "statusFlags": {
      "isPublic": false,
      "isPrivate": true,
      "isActive": true,
      "isInactive": false,
      "isPromotion": false,
      "isNew": false,
      "hasImages": true,
      "noImages": false,
      "isPending": false
    },
    "stock": {
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- El mensaje «Products successfully obtained» **se repite en 5 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Exige `type: "product"`; sin él el Swagger lo marca obligatorio. Sin `meta` ni total. Los precios no traen `type`.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `productId` → Producto, `productPriceId` → Precio de un producto, `warehouseId` → Bodega, `productLocationId` → Producto en una ubicación

### `POST /inventory/createProduct`

**Create a new product** — Register a new product in the inventory system with category, model, brand and tax information

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/createProduct`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryCreateProductRequest`): `brandId`: integer *, `categoryId`: integer *, `code`: string, `companyId`: integer *, `description`: string, `isActive`: boolean, `lastCost`: number, `maxStock`: integer, `minStock`: integer, `modelId`: integer *, `purchasePrice`: number, `taxId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.InventoryProducts`.

**¿Está completo?** ⚫ No probado.

### `DELETE /inventory/deleteLocationProduct`

**Delete product from a location** — Remove a product completely from a specific warehouse location and create deletion movement history

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/inventory/deleteLocationProduct`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryDeleteLocationRequest`): `companyId`: integer *, `productLocationId`: integer *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.InventoryGeneralResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /inventory/registerLocation`

**Create a new warehouse location** — Register a new physical location in a warehouse for storing products

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/registerLocation`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryRegisterLocationProductRequest`): `companyId`: integer *, `location`: string *, `quantity`: integer *, `warehouseId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.Locations`.

**¿Está completo?** ⚫ No probado.

### `POST /inventory/registerLocationProduct`

**Register a new product in a specific location** — Add product stock to a specific warehouse location and create movement history

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/registerLocationProduct`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryRegisterLocationRequest`): `companyId`: integer *, `location`: string *, `productId`: integer *, `quantity`: integer *, `userId`: integer *, `warehouseId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.InventoryGeneralResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /inventory/searchLocation`

**Search locations by name** — Search warehouse locations by partial name match with product counts

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/searchLocation`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ Sin probar (faltaba un valor de dominio)
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventorySearchLocationsRequest`): `companyId`: integer *, `location`: string *, `warehouseId`: integer *  _(* = obligatorio)_

**Respuesta:** no se obtuvo. Motivo: falta location (no apareció en ninguna otra respuesta; se puede dar con EXTRA)

**¿Está completo?** ⚫ Sin probar (faltaba un valor de dominio).

### `PUT /inventory/transferLocationProduct`

**Transfer product between locations** — Move product stock from one warehouse location to another within the same warehouse

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/inventory/transferLocationProduct`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryTransferLocationRequest`): `companyId`: integer *, `destinationLocation`: string *, `eliminate`: string, `originLocation`: string *, `productId`: integer *, `quantity`: integer *, `userId`: integer *, `warehouseId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.InventoryGeneralResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /inventory/turn360degree`

**Get products in a location with navigation** — Navigate through warehouse locations to view products, with optional sequential navigation (next/previous location)

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/turn360degree`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ Sin probar (faltaba un valor de dominio)
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryTurn360degreeRequest`): `companyId`: integer *, `following`: string *, `location`: string *, `productId`: string *, `warehouseId`: integer *  _(* = obligatorio)_

**Respuesta:** no se obtuvo. Motivo: falta following, location (no apareció en ninguna otra respuesta; se puede dar con EXTRA)

**¿Está completo?** ⚫ Sin probar (faltaba un valor de dominio).

### `POST /inventory/updateLocation`

**Update location name** — Update the name of an existing warehouse location and all associated product locations

- **URL completa:** `POST https://importadora-back-production.up.railway.app/inventory/updateLocation`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryUpdateLocationRequest`): `companyId`: integer *, `location`: string *, `locationId`: integer *, `warehouseId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.Locations`.

**¿Está completo?** ⚫ No probado.

### `PUT /inventory/updateLocationProduct`

**Update product quantity in a location** — Adjust the stock quantity of a product in a specific location (add or deduct)

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/inventory/updateLocationProduct`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetInventoryUpdateLocationProductRequest`): `companyId`: integer *, `productLocationId`: integer *, `quantity`: integer *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.InventoryGeneralResponse`.

**¿Está completo?** ⚫ No probado.

## Grupo: Search

Búsqueda universal por texto sobre varias entidades (`type`: product, user, category, brand, model, warehouse, cart). Devuelve hasta `limit` filas sin paginación.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /search` | 🟢 Completo | sí |

### `POST /search`

**Universal search across different entities** — Search for products, users, categories, brands, models, warehouses, or carts based on type parameter

**Product/User/Category/Brand/Model/Warehouse Search:** Requires companyId (must be > 0)

**Cart Search:** Use type="cart" to search shopping carts grouped by

- **URL completa:** `POST https://importadora-back-production.up.railway.app/search`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (SEARCH.UNIVERSAL)
- **Body según el Swagger** (`models.UniversalSearchRequest`): `companyId`: integer *, `limit`: integer, `query`: string, `status`: string, `type`: string *  _(* = obligatorio)_
  - `limit`: Número máximo de resultados (default: 10)
  - `query`: Texto a buscar (si está vacío, devuelve todos los resultados limitados)
  - `status`: For cart searches: typeCart value ("sale", "traslade", etc.)
  - `type`: "product", "user", "category", "brand", "model", "warehouse", "cart"

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "limit": 5,
  "query": "a",
  "type": "product"
}
```

**Lo que envía la app** (`transfers.searchProductsMultibodega(texto)`): `{"companyId": 1, "limit": 40, "query": "filtro", "type": "product"}` → HTTP 200, correcto, 40 fila(s)

**Respuesta recibida:** HTTP **200** · 776 ms · envoltorio: `success`, `message`, `data` · mensaje: «Search completed successfully»
- `data` es **una lista** con 5 fila(s)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `productId` | number | 0/5 | Producto |
| `companyId` | number | 0/5 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `code` | string | 0/5 | Código del producto o ubicación (código de barras) |
| `description` | string | 3/5 | Descripción |
| `categoryName` | string | 0/5 | Nombre de la categoría |
| `modelName` | string | 0/5 | Nombre del modelo/aplicación |
| `brandName` | string | 0/5 | Nombre de la marca |
| `brandImage` | string | 0/5 | Ruta de la imagen de la marca |
| `created_at` | string | 0/5 | Fecha de creación |
| `isActive` | boolean | 0/5 | Registro activo (llega como bool o número según el endpoint) |
| `isPromotion` | boolean | 0/5 | Está en promoción |
| `locations` | array | 0/5 | Dónde hay stock del producto: bodega, ubicación y cantidades |
| `locations[].productLocationId` | number | 0/23 | Fila producto-ubicación-bodega (donde está el stock físico) |
| `locations[].productId` | number | 0/23 | Producto |
| `locations[].warehouseId` | number | 0/23 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `locations[].locationCode` | string | 0/23 | Código de la ubicación física (04-F01, ZR...) |
| `locations[].stock` | number | 0/23 | Existencias en la ubicación |
| `locations[].reservedStock` | number | 0/23 | Existencias reservadas por pedidos |
| `prices` | array | 0/5 | Precios del producto por tipo |
| `prices[].productPriceId` | number | 0/20 | Fila de precio de un producto |
| `prices[].productId` | number | 0/20 | Producto |
| `prices[].price` | number | 0/20 | Precio |
| `prices[].type` | string | 0/20 | Tipo (de precio o de búsqueda) |
| `images` | array | 0/5 | Imágenes del producto |
| `images[].productImageId` | number | 0/12 | Imagen de un producto |
| `images[].productId` | number | 0/12 | Producto |
| `images[].url` | string | 0/12 | Ruta de imagen del producto |
| `images[].isMain` | boolean | 0/12 | Es la bodega principal / imagen principal |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "productId": 1,
    "companyId": 1,
    "code": "8801470510011",
    "description": "",
    "categoryName": "ACEITE",
    "modelName": "15W40",
    "brandName": "KIXX",
    "brandImage": "dependencias/img/marcas/68311880_aceites-06.png",
    "created_at": "2022-05-24T21:04:02Z",
    "isActive": true,
    "isPromotion": false,
    "locations": [
      {
        "productLocationId": 1,
        "productId": 1,
        "warehouseId": 4,
        "locationCode": "ZR",
        "stock": 200,
        "reservedStock": 200
      },
      {
        "productLocationId": 2,
        "productId": 1,
        "warehouseId": 1,
        "locationCode": "04-F01",
        "stock": 13,
        "reservedStock": 0
      },
      "…"
    ],
    "prices": [
      {
        "productPriceId": 1,
        "productId": 1,
        "price": 27000,
        "type": "sale"
      },
      {
        "productPriceId": 2,
        "productId": 1,
        "price": 23900,
        "type": "sale"
      },
      "…"
    ],
    "images": [
      {
        "productImageId": 1,
        "productId": 1,
        "url": "dependencias/img/productos/8801470510011/3.jpg",
        "isMain": true
      },
      {
        "productImageId": 2,
        "productId": 1,
        "url": "dependencias/img/general/imagen_base_productos.png",
        "isMain": false
      }
    ]
  },
  {
    "productId": 2,
    "companyId": 1,
    "code": "5011987033207",
    "description": "",
    "categoryName": "ACEITE",
    "modelName": "20W50",
    "brandName": "SHELL",
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Misma ficha que `/products`. No trae `meta`: no sirve para paginar, solo para buscar.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `productId` → Producto, `companyId` → Empresa, `productLocationId` → Producto en una ubicación, `warehouseId` → Bodega, `productPriceId` → Precio de un producto, `productImageId` → Imagen de producto

## Grupo: Carts

Carrito de venta guardado **en el backend** y agrupado por `uuid` (que crea el cliente). Cada línea descuenta stock al agregarse. Una venta se registra después con `POST /sales/register` y ese `uuid`. **Ningún endpoint de este grupo se pudo probar** (escrituras o necesitan un `uuid` real).

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /carts` | ⚫ Sin probar (faltaba un valor de dominio) | sí |
| `DELETE /carts/delete` | ⚫ No probado | sí |
| `DELETE /carts/deleteall` | ⚫ No probado | sí |
| `PUT /carts/reassignuser` | ⚫ No probado | sí |
| `POST /carts/register` | ⚫ No probado | sí |
| `PUT /carts/update` | ⚫ No probado | sí |

### `POST /carts`

**Get all carts** — Retrieve a list of all registered carts

- **URL completa:** `POST https://importadora-back-production.up.railway.app/carts`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 401, 500
- **Estado:** ⚫ Sin probar (faltaba un valor de dominio)
- **La usa la app:** sí (CARTS.GET)
- **Body según el Swagger** (`models.GetCartRequest`): `companyId`: integer *, `sellerId`: integer, `userId`: integer *, `uuid`: string *, `warehouseId`: integer *  _(* = obligatorio)_

**Lo que envía la app** (`shop.fetchCartItems`): `{"companyId": 1, "userId": 948, "sellerId": 948, "uuid": "uuid-de-prueba", "warehouseId": 1}` (no se repitió contra la API real)

**Respuesta:** no se obtuvo. Motivo: falta uuid (no apareció en ninguna otra respuesta; se puede dar con EXTRA)

**¿Está completo?** ⚫ Sin probar (faltaba un valor de dominio).

### `DELETE /carts/delete`

**Delete a cart and return product stock** — Deletes a cart by its ID and returns the quantity of the associated product to available stock.

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/carts/delete`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 204, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (CARTS.DELETE)
- **Body según el Swagger** (`models.GetCartDeleteRequest`): `cartId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Cart deleted successfully, no content`.

**¿Está completo?** ⚫ No probado.

### `DELETE /carts/deleteall`

**Delete Carts** — Allows for the deletion of one or more shopping carts based on provided.

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/carts/deleteall`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (CARTS.DELETE_ALL)
- **Body según el Swagger** (`models.GetCartDeleteAllRequest`): `userId`: integer *, `uuid`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Carts deleted successfully, including the count of deleted items.`.

**¿Está completo?** ⚫ No probado.

### `PUT /carts/reassignuser`

**Reassign user for carts by UUID** — Reassigns one or more shopping carts associated with a specific UUID to a new user ID.

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/carts/reassignuser`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (CARTS.REASSIGN_USER)
- **Body según el Swagger** (`models.GetCartReassingUser`): `newUserId`: integer *, `oldUserId`: integer *, `uuid`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.CartResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /carts/register`

**Register a new cart** — Register a new cart with basic data

- **URL completa:** `POST https://importadora-back-production.up.railway.app/carts/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (CARTS.REGISTER_ITEM)
- **Body según el Swagger** (`models.GetCartInsertRequest`): `auxWarehouseId`: integer, `companyId`: integer *, `discount`: integer, `price`: number *, `productId`: integer *, `quantity`: integer *, `sellerId`: integer, `typeCart`: string *, `userId`: integer *, `uuid`: string *, `warehouseId`: integer *  _(* = obligatorio)_

**Lo que envía la app** (`shop.addCartItem`): `{"companyId": 1, "userId": 948, "sellerId": 948, "typeCart": "sale", "discount": 0, "uuid": "u", "warehouseId": 1, "productId": 5, "quantity": 1, "price": 100}` (no se repitió contra la API real)

**Lo que envía la app** (`transfers.createTransfer`): `{"companyId": 1, "userId": 948, "warehouseId": 1, "auxWarehouseId": 4, "uuid": "b918ea85-1a77-4596-859f-2708cd19410e", "productId": 5, "price": 0, "quantity": 1, "typeCart": "traslade"}` (no se repitió contra la API real)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.CartResponse`, devuelve una lista.

**¿Está completo?** ⚫ No probado.

### `PUT /carts/update`

**Update cart quantity** — Update the quantity of an item in the cart and adjust product stock

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/carts/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (CARTS.UPDATE)
- **Parámetros de ruta/query:** `cartId` (path, integer, obligatorio)
- **Body según el Swagger** (`models.GetCartUpdateRequest`): `cartId`: integer *, `quantity`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.CartResponse`.

**¿Está completo?** ⚫ No probado.

## Grupo: Sales

Ventas y traslados: un traslado entre bodegas es una **venta con `saleType: "traslade"`**. Estados reales: verification → picking → dispatch → facturar → completed / cancelled. `/sales/pendings` devuelve carritos guardados, no ventas.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /sales/detail` | 🟢 Completo | no |
| `POST /sales/history` | 🔴 Roto: el backend responde 500 | sí |
| `POST /sales/pendings` | ⚪ Vacío: 200 sin filas con los datos de prueba | sí |
| `GET /sales/report/general` | ⚪ Vacío: 200 sin filas con los datos de prueba | no |
| `GET /sales/report/internal` | ⚪ Vacío: 200 sin filas con los datos de prueba | no |
| `POST /sales/summary` | 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos | sí |
| `POST /sales/traslades` | ⚪ Vacío: 200 sin filas con los datos de prueba | sí |
| `POST /sales/approved` | ⚫ No probado | sí |
| `POST /sales/cancel` | ⚫ No probado | sí |
| `POST /sales/register` | ⚫ No probado | sí |
| `PUT /sales/status` | ⚫ No probado | sí |
| `POST /sales/traslades/reject` | ⚫ No probado | sí |

### `POST /sales/detail`

**Get sale by ID** — Retrieves detailed information about a specific sale by its ID

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sales/detail`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSaleByIdRequest`): `saleId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "saleId": 91486
}
```

**Respuesta recibida:** HTTP **200** · 201 ms · envoltorio: `success`, `message`, `data` · mensaje: «Sale retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `saleId` | number | 0/1 | Pedido/venta (el PD-xxxx de la pantalla) |
| `userId` | number | 0/1 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `companyId` | number | 0/1 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `sellerId` | number | 0/1 | Vendedor (userId del vendedor) |
| `warehouseId` | number | 0/1 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `auxWarehouseId` | null | 1/1 ⚠ siempre vacío | Bodega auxiliar/destino en traslados |
| `paymentMethod` | string | 0/1 | Medio de pago |
| `totalAmount` | number | 0/1 | Valor total |
| `saleType` | string | 0/1 | Tipo de venta |
| `saleChannel` | string | 0/1 | Canal de venta |
| `serialCode` | number | 0/1 | Consecutivo del pedido (PD-xxxx) |
| `invoiceStatus` | string | 0/1 | Estado del pedido: Pendiente, Verification, Picking, Invoicing... |
| `status` | string | 0/1 | Estado |

**Respuesta real (muestra enmascarada):**

```json
{
  "saleId": 91486,
  "userId": 694,
  "companyId": 1,
  "sellerId": 315,
  "warehouseId": 1,
  "auxWarehouseId": null,
  "paymentMethod": "cash",
  "totalAmount": 380000,
  "saleType": "sale",
  "saleChannel": "corporate",
  "serialCode": 13,
  "invoiceStatus": "verification",
  "status": "pending"
}
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `auxWarehouseId`
- Cabecera del pedido con sus pagos; menos completo que `POST /management/saleId`.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `saleId` → Pedido/venta, `userId` → Persona (cliente, vendedor, agente...), `companyId` → Empresa, `sellerId` → Persona que vende, `warehouseId` → Bodega, `auxWarehouseId` → Bodega destino

### `POST /sales/history`

**Get all sales history with pagination** — Retrieves a list of all sales history records with support for pagination.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sales/history`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** sí (SALES.HISTORY)
- **Body según el Swagger** (`models.GetAllHistorySaleRequest`): `companyId`: integer *, `page`: integer, `pageSize`: integer, `warehouseId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5,
  "warehouseId": 1
}
```

**Lo que envía la app** (`sales.fetchSalesHistory`): `{"companyId": 1, "warehouseId": 1, "page": 1, "pageSize": 5}` → HTTP 500, incorrecto, 0 fila(s)

**Respuesta recibida:** HTTP **500** · 139 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Histories could not recovered: failed to retrieve histories»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Histories could not recovered: failed to retrieve histories"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- **Roto en el backend**: responde 500 con `failed to retrieve histories`. No se conoce su respuesta real; su forma sale solo del Swagger (`HistorySaleResponse`).

### `POST /sales/pendings`

**Get all pending sales with pagination** — Retrieves a list of all pending sale records with support for pagination and filtering.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sales/pendings`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** sí (SALES.PENDINGS)
- **Body según el Swagger** (`models.GetPendingsRequest`): `page`: integer, `pageSize`: integer, `userId`: integer *, `warehouseId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "page": 1,
  "pageSize": 5,
  "userId": 948,
  "warehouseId": 1
}
```

**Lo que envía la app** (`sales.fetchPendingCarts`): `{"userId": 948, "warehouseId": 1, "page": 1, "pageSize": 5}` → HTTP 200, correcto, 0 fila(s)

**Respuesta recibida:** HTTP **200** · 316 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Pendings successfully obteined»
- `data` es **una lista** con 0 fila(s); total en la base: **0** (0 páginas)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

**Inconsistencias y notas:**
- No devuelve ventas sino **carritos guardados** de un vendedor y bodega. Con los 26 empleados de la empresa de prueba dio 0 filas: no se pudo ver su respuesta real.

### `GET /sales/report/general`

**Get general sales report** — Retrieves a comprehensive sales report with client, document, and financial information

- **URL completa:** `GET https://importadora-back-production.up.railway.app/sales/report/general`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** no
- **Parámetros de ruta/query:** `companyId` (query, integer, obligatorio), `warehouseId` (query, integer), `status` (query, string), `startDate` (query, string), `endDate` (query, string), `page` (query, integer), `pageSize` (query, integer)

**Respuesta recibida:** HTTP **200** · 330 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «General sales report retrieved successfully»
- `data` es **una lista** con 0 fila(s); total en la base: **0** (0 páginas)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

**Inconsistencias y notas:**
- Responde 200 con una lista vacía.

### `GET /sales/report/internal`

**Get internal sales report by client** — Retrieves a detailed sales report with product information for a specific client

- **URL completa:** `GET https://importadora-back-production.up.railway.app/sales/report/internal`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** no
- **Parámetros de ruta/query:** `clientId` (query, integer, obligatorio), `companyId` (query, integer, obligatorio), `startDate` (query, string), `endDate` (query, string), `page` (query, integer), `pageSize` (query, integer)

**Respuesta recibida:** HTTP **200** · 310 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Internal sales report retrieved successfully»
- `data` es **una lista** con 0 fila(s); total en la base: **0** (0 páginas)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

**Inconsistencias y notas:**
- Responde 200 con una lista vacía.

### `POST /sales/summary`

**Get sales summary statistics** — Retrieves comprehensive sales statistics including totals, revenue, and breakdowns by channel and payment method

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sales/summary`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos
- **La usa la app:** sí (SALES.SUMMARY)
- **Body según el Swagger** (`models.GetSalesSummaryRequest`): `companyId`: integer *, `endDate`: string, `startDate`: string, `warehouseId`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "endDate": "2026-10-24",
  "startDate": "2026-09-24",
  "warehouseId": 1
}
```

**Lo que envía la app** (`reports.fetchSalesSummary`): `{"companyId": 1, "startDate": "2026-10-01", "endDate": "2026-10-24", "warehouseId": 1}` → HTTP 200, correcto, 1 fila(s)

**Respuesta recibida:** HTTP **200** · 539 ms · envoltorio: `success`, `message`, `data` · mensaje: «Sales summary retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `totalSales` | number | 0/1 | Ventas del periodo |
| `totalCompletedSales` | number | 0/1 | Ventas completadas |
| `totalPendingSales` | number | 0/1 | Ventas pendientes |
| `totalCancelledSales` | number | 0/1 | Ventas anuladas |
| `totalRevenue` | number | 0/1 | Ingresos del periodo |
| `totalRevenueCompleted` | number | 0/1 | Ingresos de ventas completadas |
| `averageOrderValue` | number | 0/1 | Valor promedio del pedido |
| `salesByChannel` | null | 1/1 ⚠ siempre vacío | Ventas por canal (null) |
| `salesByPaymentMethod` | null | 1/1 ⚠ siempre vacío | Ventas por medio de pago (null) |
| `salesByInvoiceStatus` | null | 1/1 ⚠ siempre vacío | Ventas por estado (null) |

**Respuesta real (muestra enmascarada):**

```json
{
  "totalSales": 0,
  "totalCompletedSales": 0,
  "totalPendingSales": 0,
  "totalCancelledSales": 0,
  "totalRevenue": 0,
  "totalRevenueCompleted": 0,
  "averageOrderValue": 0,
  "salesByChannel": null,
  "salesByPaymentMethod": null,
  "salesByInvoiceStatus": null
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `salesByChannel`, `salesByPaymentMethod`, `salesByInvoiceStatus`
- **Plantilla de propiedades:** para el rango y bodega probados todos los totales llegan en `0` y los desgloses en `null`. Hay 17.657 pedidos en despacho en esa bodega, pero ninguno cae en el rango de fechas, así que no se pudo verificar el cálculo.

### `POST /sales/traslades`

**Get all transfers with pagination** — Retrieves a list of all warehouse transfers, with support for pagination and filtering by warehouse ID.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sales/traslades`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** sí (SALES.TRASLADES)
- **Body según el Swagger** (`models.GetTrasladeRequest`): `page`: integer, `pageSize`: integer, `userId`: integer, `warehouseId`: integer *  _(* = obligatorio)_
  - `userId`: Opcional - filtra por usuario creador
  - `warehouseId`: Bodega de DESTINO (auxWarehouseId)

**Body / parámetros enviados en la prueba:**

```json
{
  "page": 1,
  "pageSize": 5,
  "userId": 948,
  "warehouseId": 1
}
```

**Lo que envía la app** (`transfers.fetchTraslades`): `{"warehouseId": 1, "page": 1, "pageSize": 20}` → HTTP 200, correcto, 20 fila(s)

**Respuesta recibida:** HTTP **200** · 313 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Traslades successfully obteined»
- `data` es **una lista** con 0 fila(s); total en la base: **0** (0 páginas)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

**Inconsistencias y notas:**
- `warehouseId` es la bodega de **destino**. Con la bodega 1 y sin `userId` devolvió 20 filas; con `userId` 948 devolvió 0.
- Las líneas de un traslado llegan como `productCode` y `productName`, no `code` ni `description`.

**Cómo se relaciona con la operación:**
- Un traslado es una venta con origen (`warehouseId`) y destino (`auxWarehouseId`); recibirlo se hace con `POST /sales/approved` y el serial.

### `POST /sales/approved`

**Approve a traslade and update stock quantities** — Approves a sale traslade by validating a user-provided code against the sale ID,
then updates product quantities and the sale status within a database transaction.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sales/approved`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (SALES.APPROVED)
- **Body según el Swagger** (`models.GetApprovedTrasladeRequest`): `code`: integer *, `saleId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Sale updated successfully`.

**¿Está completo?** ⚫ No probado.

### `POST /sales/cancel`

**Cancel a sale** — Cancels a sale with a reason, restores inventory if applicable

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sales/cancel`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (SALES.CANCEL)
- **Body según el Swagger** (`models.CancelSaleRequest`): `reason`: string *, `saleId`: integer *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.SaleResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /sales/register`

**Register a new sale from a cart** — Creates a new sale record, typically by processing items from a shopping cart.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sales/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (SALES.REGISTER)
- **Parámetros de ruta/query:** `resource` (formData, file)
- **Body según el Swagger** (`models.GetCartCreateSale`): `address`: string, `auxWarehouseId`: integer, `companyId`: integer *, `directionId`: integer, `discount`: integer, `invoiceStatus`: string, `paymentMethod`: string, `reference`: string, `saleChannel`: string, `saleType`: string, `sellerId`: integer, `totalAmount`: number, `userId`: integer *, `uuid`: string *, `warehouseId`: integer *  _(* = obligatorio)_

**Lo que envía la app** (`shop.registerSale`): `{"companyId": 1, "userId": 948, "sellerId": 948, "warehouseId": 1, "uuid": "u", "saleType": "sale", "paymentMethod": "cash", "totalAmount": 100}` (no se repitió contra la API real)

**Lo que envía la app** (`transfers.createTransfer`): `{"companyId": 1, "userId": 948, "warehouseId": 1, "auxWarehouseId": 4, "uuid": "b918ea85-1a77-4596-859f-2708cd19410e", "saleType": "traslade", "invoiceStatus": "pendiente"}` (no se repitió contra la API real)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.SaleResponse`.

**¿Está completo?** ⚫ No probado.

**Inconsistencias y notas:**
- El Swagger documenta `201` con `{}`: no se sabe qué devuelve. Solo exige `companyId`, `userId`, `uuid` y `warehouseId`.
- Un traslado también se crea aquí con `saleType: "traslade"` y `auxWarehouseId`.

### `PUT /sales/status`

**Update sale status** — Updates the invoice status of a sale (verification, picking, dispatch, facturar, completed, cancelled)

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/sales/status`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (SALES.STATUS)
- **Body según el Swagger** (`models.UpdateSaleStatusRequest`): `invoiceStatus`: string ∈ {verification, picking, dispatch, facturar, completed, cancelled} *, `saleId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.SaleResponse`.

**¿Está completo?** ⚫ No probado.

**Inconsistencias y notas:**
- El enum documentado es `verification`, `picking`, `dispatch`, `facturar`, `completed`, `cancelled`. La app usaba valores inexistentes.

### `POST /sales/traslades/reject`

**Reject a warehouse transfer** — Rejects a pending traslade and marks it as cancelled. The products will not be transferred.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sales/traslades/reject`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (SALES.TRASLADES_REJECT)
- **Body según el Swagger** (`models.RejectTrasladeRequest`): `reason`: string, `saleId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.TrasladeSales`.

**¿Está completo?** ⚫ No probado.

## Grupo: Orders

Un único endpoint de pedidos que **devuelve personas** (usuarios con su serial), no pedidos; con los datos de prueba llega vacío.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /orders` | ⚪ Vacío: 200 sin filas con los datos de prueba | no |

### `POST /orders`

**Get all orders** — Retrieve a list of all registered Orders

- **URL completa:** `POST https://importadora-back-production.up.railway.app/orders`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** no
- **Body según el Swagger** (`models.GetOrdersRequest`): `companyId`: integer *, `sellerId`: integer *, `warehouseId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "sellerId": 948,
  "warehouseId": 1
}
```

**Respuesta recibida:** HTTP **200** · 197 ms · envoltorio: `success`, `message`, `data` · mensaje: «Orders Successfully obtained»
- `data` es **una lista** con 0 fila(s)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

**Inconsistencias y notas:**
- Devuelve usuarios con su serial (no pedidos) y llegó vacío.

## Grupo: Management

Seguimiento operativo de pedidos por etapa (verificación, alistamiento, empaque, facturación, despacho). `POST /management` da los **contadores**; `POST /management/saleOrders` da la **lista** de una etapa y un canal; `POST /management/saleId` da el detalle completo con pagos. El resto son escrituras de cada paso.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /management/saleId` | 🟢 Completo | no |
| `POST /management` | 🟢 Completo (verificado con barrido de valores) | sí |
| `PUT /management/cancellationTransactionSale` | ⚫ No probado | no |
| `POST /management/changeId` | ⚫ No probado | no |
| `POST /management/finalizeOrderVerification` | ⚫ No probado | no |
| `POST /management/saleLocationsPicking` | ⚫ No probado | no |
| `POST /management/saleOrders` | 🟢 Completo (verificado con barrido de valores) | no |
| `PUT /management/verifyLocation` | ⚫ No probado | no |
| `PUT /management/verifyTransaction` | ⚫ No probado | no |

### `POST /management/saleId`

**Get sale details for management** — Retrieves detailed information about a specific sale including payments

- **URL completa:** `POST https://importadora-back-production.up.railway.app/management/saleId`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no
- **Body según el Swagger** (`models.GetManagementSaleIdRequest`): `companyId`: integer *, `saleId`: integer *, `warehouseId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "saleId": 91486,
  "warehouseId": 1
}
```

**Respuesta recibida:** HTTP **200** · 877 ms · envoltorio: `success`, `message`, `data` · mensaje: «Management Sale Id successfully obtained»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `sale` | object | 0/1 | Cabecera del pedido |
| `sale.saleId` | number | 0/1 | Pedido/venta (el PD-xxxx de la pantalla) |
| `sale.companyId` | number | 0/1 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `sale.userId` | number | 0/1 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `sale.sellerId` | number | 0/1 | Vendedor (userId del vendedor) |
| `sale.warehouseId` | number | 0/1 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `sale.auxWarehouseId` | number | 0/1 | Bodega auxiliar/destino en traslados |
| `sale.transferId` | number | 0/1 | Traslado entre bodegas |
| `sale.discount` | number | 0/1 | Tiene descuento (bool o valor según el endpoint) |
| `sale.paymentMethod` | string | 0/1 | Medio de pago |
| `sale.totalAmount` | number | 0/1 | Valor total |
| `sale.status` | string | 0/1 | Estado |
| `sale.saleType` | string | 0/1 | Tipo de venta |
| `sale.saleChannel` | string | 0/1 | Canal de venta |
| `sale.serialCode` | number | 0/1 | Consecutivo del pedido (PD-xxxx) |
| `sale.invoiceStatus` | string | 0/1 | Estado del pedido: Pendiente, Verification, Picking, Invoicing... |
| `sale.isPause` | number | 0/1 | Operario en pausa |
| `sale.isCancelled` | number | 0/1 | Anulado |
| `sale.createdAt` | string | 0/1 | Fecha de creación |
| `sale.updateAt` | string | 0/1 | Fecha de modificación (escrito distinto) |
| `sale.verifiedTransaction` | number | 0/1 | Transacciones verificadas |
| `sale.verifiedLocation` | number | 0/1 | Ubicaciones verificadas |
| `sale.shippingCost` | number | 0/1 | Costo de envío |
| `sale.customerInformation` | object | 0/1 | Cliente del pedido |
| `sale.customerInformation.userId` | number | 0/1 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `sale.customerInformation.companyId` | number | 0/1 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `sale.customerInformation.warehouseId` | number | 0/1 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `sale.customerInformation.userType` | string | 0/1 | Tipo de actor: customer, seller, supplier, agent... |
| `sale.customerInformation.priceType` | string | 0/1 | Lista de precios del cliente (corporate, wholesale...) |
| `sale.customerInformation.identification` | string | 0/1 | Documento de identidad o NIT |
| `sale.customerInformation.email` | string | 0/1 | Correo |
| `sale.customerInformation.name` | string | 0/1 | Nombre |
| `sale.customerInformation.lastName` | string | 1/1 ⚠ siempre vacío | Apellido |
| `sale.customerInformation.photo` | string | 0/1 | Ruta de la foto |
| `sale.customerInformation.comissionRate` | number | 0/1 | Porcentaje de comisión del vendedor (el campo se escribe "comission") |
| `sale.customerInformation.companyInformation` | object | 0/1 | Ficha de la empresa del cliente (datos fiscales) |
| `sale.customerInformation.companyInformation.userId` | number | 0/1 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `sale.customerInformation.companyInformation.businessName` | string | 1/1 ⚠ siempre vacío | Razón social |
| `sale.customerInformation.companyInformation.typeIdentification` | string | 1/1 ⚠ siempre vacío | Tipo de documento (duplica identificationType) |
| `sale.customerInformation.companyInformation.nit` | string | 1/1 ⚠ siempre vacío | NIT de la empresa/cliente |
| `sale.customerInformation.companyInformation.email` | string | 1/1 ⚠ siempre vacío | Correo |
| `sale.customerInformation.companyInformation.phone` | number | 0/1 | Teléfono (llega como texto o número según el endpoint) |
| `sale.customerInformation.companyInformation.cellPhone` | number | 0/1 | Celular (texto o número según el endpoint) |
| `sale.customerInformation.companyInformation.legalRepresentative` | string | 1/1 ⚠ siempre vacío | Representante legal |
| `sale.customerInformation.companyInformation.customerType` | string | 1/1 ⚠ siempre vacío | Tipo de cliente |
| `sale.customerInformation.companyInformation.personType` | string | 1/1 ⚠ siempre vacío | Persona natural o jurídica |
| `sale.customerInformation.companyInformation.regimeType` | string | 1/1 ⚠ siempre vacío | Régimen tributario |
| `sale.customerInformation.companyInformation.fiscalResponsability` | string | 1/1 ⚠ siempre vacío | Responsabilidad fiscal (DIAN) |
| `sale.customerInformation.companyInformation.mailInvoicing` | string | 1/1 ⚠ siempre vacío | Correo para facturación electrónica |
| `sale.customerInformation.companyInformation.corporateName` | string | 1/1 ⚠ siempre vacío | Razón social corporativa (duplica businessName) |
| `sale.customerInformation.companyInformation.tradeName` | string | 1/1 ⚠ siempre vacío | Nombre comercial |
| `sale.customerInformation.companyInformation.birthMonth` | string | 1/1 ⚠ siempre vacío | Mes de cumpleaños |
| `sale.customerInformation.companyInformation.birthDay` | string | 1/1 ⚠ siempre vacío | Día de cumpleaños |
| `sale.customerInformation.companyInformation.birthYear` | string | 1/1 ⚠ siempre vacío | Año de nacimiento |
| `sale.customerInformation.companyInformation.cityAndDepartment` | string | 1/1 ⚠ siempre vacío | Ciudad y departamento en un texto |
| `sale.customerInformation.companyInformation.address` | string | 1/1 ⚠ siempre vacío | Dirección |
| `sale.customerInformation.companyInformation.zipCode` | string | 1/1 ⚠ siempre vacío | Código postal |
| `sale.customerInformation.companyInformation.identityCardFiles` | null | 1/1 ⚠ siempre vacío | Archivos de cédula |
| `sale.customerInformation.companyInformation.chamberCommerceFiles` | null | 1/1 ⚠ siempre vacío | Archivos de cámara de comercio |
| `sale.customerInformation.companyInformation.rutFiles` | null | 1/1 ⚠ siempre vacío | Archivos del RUT |
| `sale.sellerInformation` | object | 0/1 | Vendedor del pedido |
| `sale.sellerInformation.userId` | number | 0/1 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `sale.sellerInformation.companyId` | number | 0/1 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `sale.sellerInformation.warehouseId` | number | 0/1 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `sale.sellerInformation.userType` | string | 0/1 | Tipo de actor: customer, seller, supplier, agent... |
| `sale.sellerInformation.priceType` | string | 0/1 | Lista de precios del cliente (corporate, wholesale...) |
| `sale.sellerInformation.identification` | string | 0/1 | Documento de identidad o NIT |
| `sale.sellerInformation.email` | string | 0/1 | Correo |
| `sale.sellerInformation.name` | string | 0/1 | Nombre |
| `sale.sellerInformation.lastName` | string | 1/1 ⚠ siempre vacío | Apellido |
| `sale.sellerInformation.photo` | string | 0/1 | Ruta de la foto |
| `sale.sellerInformation.comissionRate` | number | 0/1 | Porcentaje de comisión del vendedor (el campo se escribe "comission") |
| `sale.sellerInformation.companyInformation` | object | 0/1 | Ficha de la empresa del cliente (datos fiscales) |
| `sale.sellerInformation.companyInformation.userId` | number | 0/1 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `sale.sellerInformation.companyInformation.businessName` | string | 1/1 ⚠ siempre vacío | Razón social |
| `sale.sellerInformation.companyInformation.typeIdentification` | string | 1/1 ⚠ siempre vacío | Tipo de documento (duplica identificationType) |
| `sale.sellerInformation.companyInformation.nit` | string | 1/1 ⚠ siempre vacío | NIT de la empresa/cliente |
| `sale.sellerInformation.companyInformation.email` | string | 1/1 ⚠ siempre vacío | Correo |
| `sale.sellerInformation.companyInformation.phone` | number | 0/1 | Teléfono (llega como texto o número según el endpoint) |
| `sale.sellerInformation.companyInformation.cellPhone` | number | 0/1 | Celular (texto o número según el endpoint) |
| … | | | _(más campos; ver la hoja Campos de `endpoints.xlsx`)_ |

**Respuesta real (muestra enmascarada):**

```json
{
  "sale": {
    "saleId": 91486,
    "companyId": 1,
    "userId": 694,
    "sellerId": 315,
    "warehouseId": 1,
    "auxWarehouseId": 0,
    "transferId": 0,
    "discount": 0,
    "paymentMethod": "cash",
    "totalAmount": 380000,
    "status": "pending",
    "saleType": "sale",
    "saleChannel": "corporate",
    "serialCode": 13,
    "invoiceStatus": "verification",
    "isPause": 0,
    "isCancelled": 0,
    "createdAt": "2026-03-10T10:18:06Z",
    "updateAt": "2026-03-10T10:18:06Z",
    "verifiedTransaction": 0,
    "verifiedLocation": 0,
    "shippingCost": 0,
    "customerInformation": {
      "userId": 694,
      "companyId": 1,
      "warehouseId": 6,
      "userType": "customer",
      "priceType": "majority",
      "identification": "«string:9»",
      "email": "«string:28»",
      "name": "«string:16»",
      "lastName": "«string:0»",
      "photo": "«string:37»",
      "comissionRate": 0,
      "companyInformation": {
        "userId": 0,
        "businessName": "",
        "typeIdentification": "",
        "nit": "«string:0»",
        "email": "«string:0»",
        "phone": "«number:1»",
        "cellPhone": "«number:1»",
        "legalRepresentative": "",
        "customerType": "",
        "personType": "",
        "regimeType": "",
        "fiscalResponsability": "",
        "mailInvoicing": "«string:0»",
        "corporateName": "",
        "tradeName": "",
        "birthMonth": "",
        "birthDay": "",
        "birthYear": "",
        "cityAndDepartment": "",
        "address": "«string:0»",
        "zipCode": "",
        "identityCardFiles": null,
        "chamberCommerceFiles": null,
        "rutFiles": null
      }
    },
    "sellerInformation": {
      "userId": 315,
      "companyId": 1,
      "warehouseId": 1,
      "userType": "admin",
      "priceType": "majority",
      "identification": "«string:10»",
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `payments`
- Es el mejor detalle de un pedido: 109 campos con cabecera, cliente, vendedor, bodega, líneas y pagos.
- El precio de cada línea (`saleItems[].price`) no siempre existe en la lista de precios actual del producto (ver inconsistencia 1).

**Cómo se relaciona con la operación:**
- Pedido (`saleId`) → cliente (`customerInformation`), vendedor (`sellerInformation`), bodega, líneas (`saleItems[]` → `productId`) y pagos.
- Identificadores que devuelve: `saleId` → Pedido/venta, `companyId` → Empresa, `userId` → Persona (cliente, vendedor, agente...), `sellerId` → Persona que vende, `warehouseId` → Bodega, `auxWarehouseId` → Bodega destino, `transferId` → Traslado, `itemId` → Línea de pedido, `productId` → Producto

### `POST /management`

**Get management count statistics** — Retrieves count of orders by status for a warehouse (verification, picking, packing, invoicing, dispatch, etc)

- **URL completa:** `POST https://importadora-back-production.up.railway.app/management`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo (verificado con barrido de valores)
- **La usa la app:** sí (MANAGEMENT.COUNTS)
- **Body según el Swagger** (`models.GetManagementRequest`): `companyId`: integer *, `state`: string *, `warehouseId`: integer *  _(* = obligatorio)_

**Bodies enviados (barrido):** se probaron varias combinaciones; ejemplos:

```json
{"companyId": 1, "warehouseId": 1, "state": "verification"}
{"companyId": 1, "warehouseId": 1, "state": "picking"}
{"companyId": 1, "warehouseId": 1, "state": "packing"}
```

**Lo que envía la app** (`management.fetchPipeline`): `{"companyId": 1, "warehouseId": 1, "state": "verification"}` → HTTP 200, correcto, 1 fila(s)

**Respuestas del barrido:** 5 combinaciones, todas HTTP 200; 5 devolvieron datos.

Ejemplo con datos: body `{"companyId": 1, "warehouseId": 1, "state": "verification"}` → 1 fila(s), total —.

```json
{
  "Verification": 13,
  "Picking": 1,
  "Packing": 0,
  "Invoicing": 41,
  "Dispatch": 17657,
  "Sent": 198,
  "withoutTaking": 0,
  "ordersMajority": 0,
  "ordersImmediate": 0,
  "ordersCorporate": 13,
  "ordersMinority": 0,
  "ordersTrasladeWithoutTaking": 0,
  "ordersFinalAssignment": 10878,
  "ordersFinalFinished": 0,
  "ordersDirect": 0,
  "ordersDirectDisptach": 2
}
```

Ejemplo con datos: body `{"companyId": 1, "warehouseId": 1, "state": "picking"}` → 1 fila(s), total —.

```json
{
  "Verification": 13,
  "Picking": 1,
  "Packing": 0,
  "Invoicing": 41,
  "Dispatch": 17657,
  "Sent": 198,
  "withoutTaking": 0,
  "ordersMajority": 0,
  "ordersImmediate": 1,
  "ordersCorporate": 0,
  "ordersMinority": 0,
  "ordersTrasladeWithoutTaking": 0,
  "ordersFinalAssignment": 10878,
  "ordersFinalFinished": 0,
  "ordersDirect": 0,
  "ordersDirectDisptach": 2
}
```

**¿Está completo?** 🟢 Completo (verificado con barrido de valores).

**Inconsistencias y notas:**
- Los totales de las etapas (`Verification`, `Picking`, `Packing`, `Invoicing`, `Dispatch`, `Sent`) **no cambian con `state`**; solo cambian los contadores `orders*` (desglose por canal de esa etapa).
- Acepta cualquier texto en `state` con HTTP 200: `pending`, `cancelled`, `delivered`... responden igual.
- Los nombres de las etapas empiezan con **mayúscula**, a diferencia del resto del backend.
- `ordersDirectDisptach` está mal escrito en el backend.

**Cómo se relaciona con la operación:**
- Cuenta cuántos pedidos están en cada etapa de una bodega; cada etapa se corresponde con un `invoiceStatus` de `PUT /sales/status`.

### `PUT /management/cancellationTransactionSale`

**Cancel a sale transaction** — Cancels a sale with reason and restores inventory

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/management/cancellationTransactionSale`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 204, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetManagementCancellationSaleRequest`): `cancellationId`: integer *, `reason`: string *, `saleId`: integer *, `warehouseId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Sale cancelled successfully`.

**¿Está completo?** ⚫ No probado.

### `POST /management/changeId`

**Assign or change order ownership** — Assigns an order to a user for processing (verification, picking, etc)

- **URL completa:** `POST https://importadora-back-production.up.railway.app/management/changeId`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetManagementChangeIdRequest`): `infoType`: string *, `saleId`: integer *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Order assignment successful`.

**¿Está completo?** ⚫ No probado.

### `POST /management/finalizeOrderVerification`

**Finalize order verification** — Moves an order from one status to another (e.g., verification to picking)

- **URL completa:** `POST https://importadora-back-production.up.railway.app/management/finalizeOrderVerification`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 204, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetManagamentFinalizeOrderVerificationRequest`): `invoiceStatus`: string *, `newInvoiceStatus`: string *, `saleId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Order verification finalized successfully`.

**¿Está completo?** ⚫ No probado.

### `POST /management/saleLocationsPicking`

**Update sale locations for picking** — Updates the picking locations for products in a sale

- **URL completa:** `POST https://importadora-back-production.up.railway.app/management/saleLocationsPicking`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 204, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetManagementSaleLocationPickingRequest`): `saleId`: integer *, `saleLocationPicking`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Locations updated successfully`.

**¿Está completo?** ⚫ No probado.

### `POST /management/saleOrders`

**Get sale orders for management** — Retrieves paginated list of sale orders filtered by channel, status and type

- **URL completa:** `POST https://importadora-back-production.up.railway.app/management/saleOrders`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo (verificado con barrido de valores)
- **La usa la app:** no
- **Body según el Swagger** (`models.GetManagementSaleOrdersRequest`): `companyId`: integer *, `invoiceStatus`: string *, `page`: integer, `pageSize`: integer, `saleChannel`: string *, `saleType`: string *, `warehouseId`: integer *  _(* = obligatorio)_

**Bodies enviados (barrido):** se probaron varias combinaciones; ejemplos:

```json
{"companyId": 1, "warehouseId": 1, "invoiceStatus": "verification", "saleChannel": "majority", "saleType": "sale", "page": 1, "pageSize": 3}
{"companyId": 1, "warehouseId": 1, "invoiceStatus": "verification", "saleChannel": "immediate", "saleType": "sale", "page": 1, "pageSize": 3}
{"companyId": 1, "warehouseId": 1, "invoiceStatus": "verification", "saleChannel": "corporate", "saleType": "sale", "page": 1, "pageSize": 3}
```

**Respuestas del barrido:** 30 combinaciones, todas HTTP 200; 5 devolvieron datos.

Ejemplo con datos: body `{"companyId": 1, "warehouseId": 1, "invoiceStatus": "verification", "saleChannel": "corporate", "saleType": "sale", "page": 1, "pageSize": 3}` → 3 fila(s), total 13.

```json
[
  {
    "saleId": 91453,
    "companyId": 1,
    "userId": 224,
    "sellerId": 315,
    "warehouseId": 1,
    "auxWarehouseId": 0,
    "transferId": 0,
    "discount": 0,
    "paymentMethod": "cash",
    "totalAmount": 26000,
    "status": "pending",
    "saleType": "sale",
    "saleChannel": "corporate",
    "serialCode": 1,
    "invoiceStatus": "verification",
    "isPause": 0,
    "isCancelled": 0,
    "createdAt": "2025-10-07T20:07:00Z",
    "updateAt": "2025-10-07T20:07:00Z",
    "verifiedTransaction": 0,
    "verifiedLocation": 0,
    "shippingCost": 0,
    "customerInformation": {
      "userId": 224,
      "companyId": 1,
      "warehouseId": null,
      "userType": "customer",
      "priceType": "corporate",
      "identification": "«string:10»",
      "email": "«string:22»",
      "name": "«string:13»",
      "lastName": "«string:0»",
      "photo": "«string:37»",
      "comissionRate": 0,
      "companyInformation": {
        "userId": 0,
        "businessName": "",
        "typeIdentification": "",
        "nit": "«string:0»",
        "email": "«string:0»",
        "phone": "«number:1»",
        "cellPhone": "«number:1»",
        "legalRepresentative": "",
  … (recortado: respuesta más larga)
```

Ejemplo con datos: body `{"companyId": 1, "warehouseId": 1, "invoiceStatus": "picking", "saleChannel": "immediate", "saleType": "sale", "page": 1, "pageSize": 3}` → 1 fila(s), total 1.

```json
[
  {
    "saleId": 91429,
    "companyId": 1,
    "userId": 694,
    "sellerId": 218,
    "warehouseId": 1,
    "auxWarehouseId": 0,
    "transferId": 0,
    "discount": 0,
    "paymentMethod": "cashier",
    "totalAmount": 499000,
    "status": "completed",
    "saleType": "sale",
    "saleChannel": "immediate",
    "serialCode": 15449,
    "invoiceStatus": "picking",
    "isPause": 1,
    "isCancelled": 0,
    "createdAt": "2025-06-17T08:27:48Z",
    "updateAt": "2025-07-25T14:00:11Z",
    "verifiedTransaction": 0,
    "verifiedLocation": 0,
    "shippingCost": 0,
    "customerInformation": {
      "userId": 694,
      "companyId": 1,
      "warehouseId": 6,
      "userType": "customer",
      "priceType": "majority",
      "identification": "«string:9»",
      "email": "«string:28»",
      "name": "«string:16»",
      "lastName": "«string:0»",
      "photo": "«string:37»",
      "comissionRate": 0,
      "companyInformation": {
        "userId": 0,
        "businessName": "",
        "typeIdentification": "",
        "nit": "«string:0»",
        "email": "«string:0»",
        "phone": "«number:1»",
        "cellPhone": "«number:1»",
        "legalRepresentative": "",
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟢 Completo (verificado con barrido de valores).

**Inconsistencias y notas:**
- Solo devuelve filas con un canal real (`majority`, `immediate`, `corporate`, `minority`, `direct`); con un canal inventado responde 200 y lista vacía sin avisar. Los totales coinciden con los contadores de `POST /management`.
- El tipo `traslade` no aparece aquí.

### `PUT /management/verifyLocation`

**Verify location for a sale** — Marks the location verification step as complete for a sale

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/management/verifyLocation`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 204, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetManagementVerifyLocationRequest`): `saleId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Location verified successfully`.

**¿Está completo?** ⚫ No probado.

### `PUT /management/verifyTransaction`

**Verify transaction for a sale** — Marks the transaction verification step as complete for a sale

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/management/verifyTransaction`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 204, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetManagementVerifyTransactionRequest`): `saleId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Transaction verified successfully`.

**¿Está completo?** ⚫ No probado.

## Grupo: Payments

Abonos y pagos de ventas. Cartera usa `POST /payments/register` (abonos); `by-sale`, `detail` y `summary` son consultas sin uso en la app. **`POST /payments/register` y `PUT /users/credit` no exigen token según el Swagger**, lo que conviene confirmar.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /payments` | ⚪ Vacío: 200 sin filas con los datos de prueba | no |
| `POST /payments/by-sale` | ⚪ Vacío: 200 sin filas con los datos de prueba | no |
| `POST /payments/summary` | 🟠 Plantilla de propiedades: todos los totales en 0 y una fila fantasma en `paymentsByMethod` | no |
| `POST /payments/advance` | ⚫ No probado | no |
| `POST /payments/bulk` | ⚫ No probado | no |
| `POST /payments/bulk-insert` | ⚫ No probado | no |
| `PUT /payments/cancelled` | ⚫ No probado | no |
| `PUT /payments/changestatus` | ⚫ No probado | no |
| `POST /payments/detail` | ⚫ Sin probar (faltaba un valor de dominio) | no |
| `POST /payments/early` | ⚫ No probado | no |
| `POST /payments/register` | ⚫ No probado | sí |

### `POST /payments`

**Get all payments** — Retrieve a list of all registered payments

- **URL completa:** `POST https://importadora-back-production.up.railway.app/payments`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** no
- **Body según el Swagger** (`models.GetPaymentRequest`): `page`: integer, `pageSize`: integer, `userId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "page": 1,
  "pageSize": 5,
  "userId": 948
}
```

**Respuesta recibida:** HTTP **200** · 314 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Payments successfully obtained»
- `data` es **una lista** con 0 fila(s); total en la base: **0** (0 páginas)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

### `POST /payments/by-sale`

**Get payments by sale** — Retrieve all payments for a specific sale with pagination

- **URL completa:** `POST https://importadora-back-production.up.railway.app/payments/by-sale`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** no
- **Body según el Swagger** (`models.GetPaymentsBySaleRequest`): `page`: integer, `pageSize`: integer, `saleId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "page": 1,
  "pageSize": 5,
  "saleId": 91486
}
```

**Respuesta recibida:** HTTP **200** · 315 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Payments retrieved successfully»
- `data` es **una lista** con 0 fila(s); total en la base: **0** (0 páginas)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

### `POST /payments/summary`

**Get payment summary statistics** — Retrieve payment summary statistics for a company including totals by status and payment method

- **URL completa:** `POST https://importadora-back-production.up.railway.app/payments/summary`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟠 Plantilla de propiedades: todos los totales en 0 y una fila fantasma en `paymentsByMethod`
- **La usa la app:** no
- **Body según el Swagger** (`models.GetPaymentSummaryRequest`): `companyId`: integer *, `endDate`: string, `startDate`: string, `warehouseId`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "endDate": "2026-10-24",
  "startDate": "2026-09-24",
  "warehouseId": 1
}
```

**Respuesta recibida:** HTTP **200** · 311 ms · envoltorio: `success`, `message`, `data` · mensaje: «Payment summary retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `totalPayments` | number | 0/1 | Total de pagos |
| `totalVerifiedPayments` | number | 0/1 | Pagos verificados |
| `totalPendingPayments` | number | 0/1 | Pagos pendientes |
| `totalCancelledPayments` | number | 0/1 | Pagos anulados |
| `totalAmountVerified` | number | 0/1 | Valor verificado |
| `totalAmountPending` | number | 0/1 | Valor pendiente |
| `totalAmount` | number | 0/1 | Valor total |
| `paymentsByMethod` | array | 0/1 | Pagos agrupados por medio |
| `paymentsByMethod[].paymentMethod` | string | 1/1 ⚠ siempre vacío | Medio de pago |
| `paymentsByMethod[].count` | number | 0/1 | Cantidad |
| `paymentsByMethod[].totalAmount` | number | 0/1 | Valor total |

**Respuesta real (muestra enmascarada):**

```json
{
  "totalPayments": 0,
  "totalVerifiedPayments": 0,
  "totalPendingPayments": 0,
  "totalCancelledPayments": 0,
  "totalAmountVerified": 0,
  "totalAmountPending": 0,
  "totalAmount": 0,
  "paymentsByMethod": [
    {
      "paymentMethod": "",
      "count": 1,
      "totalAmount": 0
    }
  ]
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: todos los totales en 0 y una fila fantasma en `paymentsByMethod`.

**Inconsistencias y notas:**
- **Plantilla de propiedades:** todos los totales en `0`, pero `paymentsByMethod` trae **una fila fantasma** `{ "paymentMethod": "", "count": 1, "totalAmount": 0 }`: un medio de pago vacío con una operación.

### `POST /payments/advance`

**Register an advance payment** — Registers a new advance payment with the provided information and optional proof of payment image.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/payments/advance`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `resource` (formData, file)
- **Body según el Swagger** (`models.GetAdvancePaymentInsertRequest`): `paymentMethod`: string, `price`: number, `remainingPrice`: number, `type`: string, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.Advances`.

**¿Está completo?** ⚫ No probado.

### `POST /payments/bulk`

**Bulk insert payments** — Allows bulk insertion of payments, optionally with one or more proof images for 'transfer' method.
Allows the bulk insertion of payment records. For each 'transfer' payment method in PaymentData,
an image receipt linked by filename is required.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/payments/bulk`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `request` (formData, string, obligatorio), `resource` (formData, file), `request` (formData, string, obligatorio), `resource` (formData, file)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `object`.

**¿Está completo?** ⚫ No probado.

### `POST /payments/bulk-insert`

**Bulk insert payments** — Allows bulk insertion of payments, optionally with one or more proof images for 'transfer' method.
Allows the bulk insertion of payment records. For each 'transfer' payment method in PaymentData,
an image receipt linked by filename is required.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/payments/bulk-insert`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `request` (formData, string, obligatorio), `resource` (formData, file), `request` (formData, string, obligatorio), `resource` (formData, file)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `object`.

**¿Está completo?** ⚫ No probado.

### `PUT /payments/cancelled`

**Update payment cancelled** — Update cancelled payment

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/payments/cancelled`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetPaymentCancelledRequest`): `electronicCancellationReference`: string, `isElectronicCancellation`: boolean, `paymentId`: integer *, `reason`: string *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.PaymentsResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /payments/changestatus`

**Update payment status** — Update status payment

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/payments/changestatus`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Parámetros de ruta/query:** `paymentId` (path, integer, obligatorio)
- **Body según el Swagger** (`models.GetPaymentChangeStatusRequest`): `paymentId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.PaymentsResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /payments/detail`

**Get payment by ID** — Retrieve a specific payment by its ID

- **URL completa:** `POST https://importadora-back-production.up.railway.app/payments/detail`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ Sin probar (faltaba un valor de dominio)
- **La usa la app:** no
- **Body según el Swagger** (`models.GetPaymentByIdRequest`): `paymentId`: integer *  _(* = obligatorio)_

**Respuesta:** no se obtuvo. Motivo: falta paymentId (no apareció en ninguna otra respuesta; se puede dar con EXTRA)

**¿Está completo?** ⚫ Sin probar (faltaba un valor de dominio).

### `POST /payments/early`

**Register an early payment** — Registers a new early payment with the provided information.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/payments/early`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.GetEarlyPaymentInsertRequest`): `days`: integer *, `rate`: integer *, `userId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.EarlyPayments`.

**¿Está completo?** ⚫ No probado.

### `POST /payments/register`

**Register a new payment** — Register a new payment. For 'transfer' method, one or more image proofs ('resource' field) are required.

- **URL completa:** `POST https://importadora-back-production.up.railway.app/payments/register`
- **Token Bearer:** no (el Swagger no exige seguridad) · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** sí (PAYMENTS.REGISTER)
- **Parámetros de ruta/query:** `resource` (formData, file)
- **Body según el Swagger** (`models.GetPaymentInsertRequest`): `amount`: number *, `companyId`: integer *, `paymentMethod`: string *, `reference`: string, `remainingAmount`: number, `saleId`: integer *, `status`: string, `userId`: integer *, `userVerifyId`: integer *, `warehouseId`: integer *  _(* = obligatorio)_

**Lo que envía la app** (`wallet.registerPayment`): `{"companyId": 1, "userId": 217, "userVerifyId": 948, "paymentMethod": "cash", "reference": "", "saleId": 1, "amount": 10, "remainingAmount": 5, "warehouseId": 1}` (no se repitió contra la API real)

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.PaymentsResponse`.

**¿Está completo?** ⚫ No probado.

**Inconsistencias y notas:**
- El Swagger no exige token para este endpoint (conviene confirmar). Es una escritura: no se probó.

## Grupo: Wallet

Cartera y crédito de clientes. `POST /wallet` trae el cupo anidado en `creditInformation`; **`POST /wallet/summary` responde 500**.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /wallet` | 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados | sí |
| `POST /wallet/history` | 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados | no |
| `POST /wallet/internal` | ⚪ Vacío: 200 sin filas con los datos de prueba | sí |
| `POST /wallet/summary` | 🔴 Roto: el backend responde 500 | sí |

### `POST /wallet`

**Get all users with pagination and filters** — Retrieve a list of all registered users with filters and pagination

- **URL completa:** `POST https://importadora-back-production.up.railway.app/wallet`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados
- **La usa la app:** sí (WALLET.BASE)
- **Body según el Swagger** (`models.GetWalletRequest`): `companyId`: integer *, `page`: integer, `pageSize`: integer, `warehouseId`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Lo que envía la app** (`wallet.fetchWalletPage`): `{"companyId": 1, "page": 1, "pageSize": 5, "warehouseId": 1}` → HTTP 200, correcto, 5 fila(s)

**Respuesta recibida:** HTTP **200** · 446 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Users successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **564** (113 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `companyId` | number | 0/5 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `warehouseId` | number | 0/5 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `photo` | string | 0/5 | Ruta de la foto |
| `name` | string | 0/5 | Nombre |
| `lastName` | string | 4/5 | Apellido |
| `identification` | string | 0/5 | Documento de identidad o NIT |
| `sumAmount` | number | 0/5 | Saldo/monto acumulado del cliente en cartera |
| `isCredit` | boolean | 0/5 | El cliente compra a crédito |
| `ubicationInformation` | object | 0/5 | Dirección principal del cliente ("ubication", sic) |
| `ubicationInformation.directionId` | number | 0/5 | Dirección del cliente |
| `ubicationInformation.userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `ubicationInformation.country` | string | 1/5 | País |
| `ubicationInformation.department` | string | 0/5 | Departamento |
| `ubicationInformation.city` | string | 0/5 | Ciudad |
| `ubicationInformation.neighborhood` | string | 1/5 | Barrio |
| `ubicationInformation.address` | string | 0/5 | Dirección |
| `ubicationInformation.additionalInfo` | string | 2/5 | Indicaciones adicionales de la dirección |
| `paymentInformation` | object | 0/5 | Último pago del cliente |
| `paymentInformation.paymentId` | number | 0/5 | Pago |
| `paymentInformation.userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `paymentInformation.amount` | number | 0/5 | Monto |
| `paymentInformation.created_at` | string | 0/5 | Fecha de creación |
| `companyInformation` | object | 0/5 | Ficha de la empresa del cliente (datos fiscales) |
| `companyInformation.userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `companyInformation.businessName` | string | 1/5 | Razón social |
| `companyInformation.typeIdentification` | string | 5/5 ⚠ siempre vacío | Tipo de documento (duplica identificationType) |
| `companyInformation.nit` | string | 1/5 | NIT de la empresa/cliente |
| `companyInformation.email` | string | 5/5 ⚠ siempre vacío | Correo |
| `companyInformation.phone` | number | 0/5 | Teléfono (llega como texto o número según el endpoint) |
| `companyInformation.cellPhone` | number | 0/5 | Celular (texto o número según el endpoint) |
| `companyInformation.legalRepresentative` | string | 5/5 ⚠ siempre vacío | Representante legal |
| `companyInformation.customerType` | string | 1/5 | Tipo de cliente |
| `companyInformation.personType` | string | 5/5 ⚠ siempre vacío | Persona natural o jurídica |
| `companyInformation.regimeType` | string | 5/5 ⚠ siempre vacío | Régimen tributario |
| `companyInformation.fiscalResponsability` | string | 5/5 ⚠ siempre vacío | Responsabilidad fiscal (DIAN) |
| `companyInformation.mailInvoicing` | string | 5/5 ⚠ siempre vacío | Correo para facturación electrónica |
| `companyInformation.corporateName` | string | 5/5 ⚠ siempre vacío | Razón social corporativa (duplica businessName) |
| `companyInformation.tradeName` | string | 5/5 ⚠ siempre vacío | Nombre comercial |
| `companyInformation.birthMonth` | string | 5/5 ⚠ siempre vacío | Mes de cumpleaños |
| `companyInformation.birthDay` | string | 5/5 ⚠ siempre vacío | Día de cumpleaños |
| `companyInformation.birthYear` | string | 5/5 ⚠ siempre vacío | Año de nacimiento |
| `companyInformation.cityAndDepartment` | string | 5/5 ⚠ siempre vacío | Ciudad y departamento en un texto |
| `companyInformation.address` | string | 1/5 | Dirección |
| `companyInformation.zipCode` | string | 5/5 ⚠ siempre vacío | Código postal |
| `companyInformation.identityCardFiles` | null | 5/5 ⚠ siempre vacío | Archivos de cédula |
| `companyInformation.chamberCommerceFiles` | null | 5/5 ⚠ siempre vacío | Archivos de cámara de comercio |
| `companyInformation.rutFiles` | null | 5/5 ⚠ siempre vacío | Archivos del RUT |
| `creditInformation` | object | 0/5 | Cupo de crédito: cupo, usado y días |
| `creditInformation.quota` | number | 0/5 | Cupo de crédito aprobado |
| `creditInformation.subtract` | number | 0/5 | Cupo ya utilizado |
| `creditInformation.days` | number | 0/5 | Días de plazo del crédito |
| `saleInformation` | array | 0/1 | Facturas del cliente con pagos |
| `saleInformation[].saleId` | number | 0/5 | Pedido/venta (el PD-xxxx de la pantalla) |
| `saleInformation[].userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `saleInformation[].totalAmount` | number | 0/5 | Valor total |
| `saleInformation[].invoiceStatus` | string | 0/5 | Estado del pedido: Pendiente, Verification, Picking, Invoicing... |
| `saleInformation[].verifiedPayments` | number | 0/5 | Valor de pagos verificados |
| `saleInformation[].pendingPayments` | number | 0/5 | Valor de pagos pendientes |
| `saleInformation[].created_at` | string | 0/5 | Fecha de creación |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "userId": 215,
    "companyId": 1,
    "warehouseId": 0,
    "photo": "«string:65»",
    "name": "«string:18»",
    "lastName": "«string:20»",
    "identification": "«string:7»",
    "sumAmount": 0,
    "isCredit": false,
    "ubicationInformation": {
      "directionId": 6,
      "userId": 215,
      "country": "Colombia",
      "department": "Antioquia",
      "city": "Medellu00edn",
      "neighborhood": "",
      "address": "«string:12»",
      "additionalInfo": ""
    },
    "paymentInformation": {
      "paymentId": 0,
      "userId": 0,
      "amount": 0,
      "created_at": "0001-01-01T00:00:00Z"
    },
    "companyInformation": {
      "userId": 0,
      "businessName": "",
      "typeIdentification": "",
      "nit": "«string:0»",
      "email": "«string:0»",
      "phone": "«number:1»",
      "cellPhone": "«number:1»",
      "legalRepresentative": "",
      "customerType": "",
      "personType": "",
      "regimeType": "",
      "fiscalResponsability": "",
      "mailInvoicing": "«string:0»",
      "corporateName": "",
      "tradeName": "",
      "birthMonth": "",
      "birthDay": "",
      "birthYear": "",
      "cityAndDepartment": "",
      "address": "«string:0»",
      "zipCode": "",
      "identityCardFiles": null,
      "chamberCommerceFiles": null,
      "rutFiles": null
    },
    "creditInformation": {
      "quota": 0,
      "subtract": 0,
      "days": 0
    }
  },
  {
    "userId": 217,
    "companyId": 1,
    "warehouseId": 0,
    "photo": "«string:37»",
    "name": "«string:29»",
    "lastName": "«string:0»",
    "identification": "«string:10»",
    "sumAmount": 18706600,
    "isCredit": true,
    "ubicationInformation": {
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados.

**Inconsistencias y notas:**
- Campos que el Swagger documenta y **no llegaron**: `creditAmount`, `creditDays`, `pendingPayments`, `reservedCredit`, `saleId`, `verifiedPayments`
- Campos que llegan y el Swagger **no documenta**: `ubicationInformation`, `paymentInformation`, `companyInformation`, `creditInformation`, `saleInformation`
- El mensaje «Users successfully obtained» **se repite en 2 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- **Contrato real distinto del Swagger** (ver inconsistencia 8): el cupo viene en `creditInformation { quota, subtract, days }`.
- No se sabe si `creditInformation.subtract` o `sumAmount` es el cupo usado: para el cliente 217 `quota` es 20.000.000, `subtract` 20.025.000 (más que el cupo) y `sumAmount` 18.706.600.
- `paymentInformation` llega con `0001-01-01T00:00:00Z` y ceros en clientes sin pagos (plantilla de objeto vacío).

**Cómo se relaciona con la operación:**
- Cliente → crédito (`quota`, `days`) y facturas pendientes (`saleInformation[]` → `saleId`). Un abono (`POST /payments/register`) se aplica a un `saleId`.
- Identificadores que devuelve: `userId` → Persona (cliente, vendedor, agente...), `companyId` → Empresa, `warehouseId` → Bodega, `directionId` → Dirección, `paymentId` → Pago, `saleId` → Pedido/venta

### `POST /wallet/history`

**Get all bills with pagination** — Retrieve a list of all bills with pagination

- **URL completa:** `POST https://importadora-back-production.up.railway.app/wallet/history`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados
- **La usa la app:** no
- **Body según el Swagger** (`models.GetWalletRequest`): `companyId`: integer *, `page`: integer, `pageSize`: integer, `warehouseId`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5,
  "warehouseId": 1
}
```

**Respuesta recibida:** HTTP **200** · 896 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Bills successfully obtained»
- `data` es **una lista** con 5 fila(s); total en la base: **17910** (3582 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `saleId` | number | 0/5 | Pedido/venta (el PD-xxxx de la pantalla) |
| `userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `warehouseId` | number | 0/5 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `sellerId` | number | 0/5 | Vendedor (userId del vendedor) |
| `discount` | number | 0/5 | Tiene descuento (bool o valor según el endpoint) |
| `paymentMethod` | string | 0/5 | Medio de pago |
| `totalAmount` | number | 0/5 | Valor total |
| `invoiceStatus` | string | 0/5 | Estado del pedido: Pendiente, Verification, Picking, Invoicing... |
| `verifiedPayments` | number | 0/5 | Valor de pagos verificados |
| `pendingPayments` | number | 0/5 | Valor de pagos pendientes |
| `created_at` | string | 0/5 | Fecha de creación |
| `invoiceInformation` | object | 0/5 | Datos de facturación |
| `invoiceInformation.saleId` | number | 0/5 | Pedido/venta (el PD-xxxx de la pantalla) |
| `invoiceInformation.prefix` | string | 5/5 ⚠ siempre vacío | Prefijo de facturación |
| `invoiceInformation.number` | number | 0/5 | Número |
| `invoiceInformation.finalAmount` | number | 0/5 | Valor final tras descuentos |
| `invoiceInformation.creditDays` | number | 0/5 | Días de crédito (documentado, no llega) |
| `invoiceInformation.creditDate` | string | 0/5 | Fecha del crédito |
| `invoiceInformation.created_at` | string | 0/5 | Fecha de creación |
| `userInformation` | object | 0/5 | Persona dentro de otro objeto |
| `userInformation.userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `userInformation.name` | string | 0/5 | Nombre |
| `userInformation.email` | string | 0/5 | Correo |
| `userInformation.photo` | string | 0/5 | Ruta de la foto |
| `warehouseInformation` | object | 0/5 | Bodega del pedido |
| `warehouseInformation.warehouseId` | number | 0/5 | Bodega o sede; null en users porque la persona no pertenece a una bodega |
| `warehouseInformation.name` | string | 0/5 | Nombre |
| `sellerInformation` | object | 0/5 | Vendedor del pedido |
| `sellerInformation.userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `sellerInformation.name` | string | 0/5 | Nombre |
| `ubicationInformation` | object | 0/5 | Dirección principal del cliente ("ubication", sic) |
| `ubicationInformation.directionId` | number | 0/5 | Dirección del cliente |
| `ubicationInformation.userId` | number | 0/5 | Persona (cliente, vendedor, proveedor o agente) de la tabla central users |
| `ubicationInformation.country` | string | 0/5 | País |
| `ubicationInformation.department` | string | 0/5 | Departamento |
| `ubicationInformation.city` | string | 0/5 | Ciudad |
| `ubicationInformation.neighborhood` | string | 3/5 | Barrio |
| `ubicationInformation.address` | string | 0/5 | Dirección |
| `ubicationInformation.additionalInfo` | string | 3/5 | Indicaciones adicionales de la dirección |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "saleId": 91486,
    "userId": 694,
    "warehouseId": 1,
    "sellerId": 315,
    "discount": 0,
    "paymentMethod": "cash",
    "totalAmount": 380000,
    "invoiceStatus": "verification",
    "verifiedPayments": 0,
    "pendingPayments": 0,
    "created_at": "0001-01-01T00:00:00Z",
    "invoiceInformation": {
      "saleId": 0,
      "prefix": "",
      "number": 0,
      "finalAmount": 0,
      "creditDays": 0,
      "creditDate": "0001-01-01T00:00:00Z",
      "created_at": "0001-01-01T00:00:00Z"
    },
    "userInformation": {
      "userId": 694,
      "name": "ventas mostrador",
      "email": "«string:28»",
      "photo": "«string:37»"
    },
    "warehouseInformation": {
      "warehouseId": 1,
      "name": "Updated Warehouse"
    },
    "sellerInformation": {
      "userId": 315,
      "name": "Test Updated"
    },
    "ubicationInformation": {
      "directionId": 720,
      "userId": 694,
      "country": "colombia",
      "department": "antioquia",
      "city": "medellin",
      "neighborhood": "colon",
      "address": "«string:16»",
      "additionalInfo": "bodega"
    }
  },
  {
    "saleId": 91485,
    "userId": 694,
    "warehouseId": 1,
    "sellerId": 315,
    "discount": 0,
    "paymentMethod": "cash",
    "totalAmount": 79000,
    "invoiceStatus": "verification",
    "verifiedPayments": 0,
    "pendingPayments": 0,
    "created_at": "0001-01-01T00:00:00Z",
    "invoiceInformation": {
      "saleId": 0,
      "prefix": "",
      "number": 0,
      "finalAmount": 0,
      "creditDays": 0,
      "creditDate": "0001-01-01T00:00:00Z",
      "created_at": "0001-01-01T00:00:00Z"
    },
    "userInformation": {
      "userId": 694,
  … (recortado: respuesta más larga)
```

**¿Está completo?** 🟡 Incompleto frente al Swagger: faltan campos documentados o sobran no documentados.

**Inconsistencias y notas:**
- Campos que llegan y el Swagger **no documenta**: `invoiceInformation`, `userInformation`, `warehouseInformation`, `sellerInformation`, `ubicationInformation`
- `created_at` de cada factura llega como `0001-01-01T00:00:00Z` en la muestra: la fecha real hay que sacarla de `invoiceInformation` o del pedido.
- Trae 5 campos que el Swagger no documenta.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `saleId` → Pedido/venta, `userId` → Persona (cliente, vendedor, agente...), `warehouseId` → Bodega, `sellerId` → Persona que vende, `directionId` → Dirección

### `POST /wallet/internal`

**Get all users for ID with pagination** — Retrieve a list of all registered users for ID with pagination

- **URL completa:** `POST https://importadora-back-production.up.railway.app/wallet/internal`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** sí (WALLET.INTERNAL)
- **Body según el Swagger** (`models.GetWalletRequestInternal`): `companyId`: integer *, `page`: integer, `pageSize`: integer, `userId`: integer, `warehouseId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5,
  "userId": 948,
  "warehouseId": 1
}
```

**Lo que envía la app** (`wallet.fetchCustomerInvoices`): `{"companyId": 1, "userId": 217, "page": 1, "pageSize": 50, "warehouseId": 1}` → HTTP 200, correcto, 0 fila(s)

**Respuesta recibida:** HTTP **200** · 314 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Wallet by ID obtained successfully»
- `data` es **una lista** con 0 fila(s); total en la base: **0** (0 páginas)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

**Inconsistencias y notas:**
- Para el cliente 217 (con crédito) devuelve 0 facturas aunque `/wallet` indica un saldo: las facturas vienen duplicadas en `saleInformation[]` de `/wallet`, y esa lista también llegó vacía en la muestra.

### `POST /wallet/summary`

**Get wallet/credit summary statistics** — Retrieve summary statistics for credit customers including total credit, payments, and overdue counts

- **URL completa:** `POST https://importadora-back-production.up.railway.app/wallet/summary`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** sí (WALLET.SUMMARY)
- **Body según el Swagger** (`models.GetWalletSummaryRequest`): `companyId`: integer *, `warehouseId`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "warehouseId": 1
}
```

**Lo que envía la app** (`wallet.fetchWalletSummary`): `{"companyId": 1, "warehouseId": 1}` → HTTP 500, incorrecto, 0 fila(s)

**Respuesta recibida:** HTTP **500** · 448 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Wallet summary could not be retrieved: failed to retrieve wallet summary»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Wallet summary could not be retrieved: failed to retrieve wallet summary"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- **Roto en el backend**: responde 500 con `failed to retrieve wallet summary` para `companyId` 1 y `warehouseId` 1. La app muestra "No disponible".

## Grupo: Quotations

Cotizaciones. La lista funciona **sin filtros de persona** (10 de prueba). `/quotations/brands`, `/categories` y `/models` solo redirigen.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /quotations` | 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos | no |
| `POST /quotations/brands` | 🟠 Sin utilidad: solo responde "Redirect to ... endpoint" | no |
| `POST /quotations/categories` | 🟠 Sin utilidad: solo responde "Redirect to ... endpoint" | no |
| `POST /quotations/history` | 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos | no |
| `POST /quotations/models` | 🟠 Sin utilidad: solo responde "Redirect to ... endpoint" | no |
| `GET /quotations/stats` | 🟢 Completo | no |
| `POST /quotations/cart/add` | ⚫ No probado | no |
| `DELETE /quotations/cart/delete` | ⚫ No probado | no |
| `DELETE /quotations/delete` | ⚫ No probado | no |
| `POST /quotations/register` | ⚫ No probado | no |
| `PUT /quotations/status` | ⚫ No probado | no |
| `PUT /quotations/update` | ⚫ No probado | no |
| `GET /quotations/{id}` | ⚫ Sin probar (faltaba un valor de dominio) | no |

### `POST /quotations`

**Get all quotations** — Get quotations list with filters and pagination

- **URL completa:** `POST https://importadora-back-production.up.railway.app/quotations`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos
- **La usa la app:** no
- **Body según el Swagger** (`models.GetQuotationsRequest`): `companyId`: integer, `page`: integer, `pageSize`: integer, `sellerId`: integer, `status`: string, `userId`: integer

**Bodies enviados (barrido):** se probaron varias combinaciones; ejemplos:

```json
{"companyId": 1, "page": 1, "pageSize": 10}
{"companyId": 1, "page": 1, "pageSize": 10, "status": "draft"}
{"companyId": 1, "page": 1, "pageSize": 10, "status": "sent"}
```

**Respuesta recibida:** HTTP **200** · 310 ms · envoltorio: `success`, `message`, `data` · mensaje: «Quotations retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `data` | array | 1/1 ⚠ siempre vacío | Lista dentro del objeto (anidada, además del envoltorio) |
| `page` | number | 0/1 | Página actual |
| `pageSize` | number | 0/1 | Tamaño de página |
| `totalRows` | number | 0/1 | Total de filas |
| `totalPages` | number | 0/1 | Total de páginas |

**Respuesta real (muestra enmascarada):**

```json
{
  "data": [],
  "page": 1,
  "pageSize": 5,
  "totalRows": 0,
  "totalPages": 0
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `data`
- Con `sellerId` y `userId` juntos filtra por ambos y devolvió 0; sin ellos devuelve las 10 cotizaciones. La paginación va dentro de `data`.
- Las 10 cotizaciones son de prueba: de $1.000 + IVA, sin líneas y vencidas.

### `POST /quotations/brands`

**Get brands for quotation** — Get available brands for creating quotations

- **URL completa:** `POST https://importadora-back-production.up.railway.app/quotations/brands`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 401, 500
- **Estado:** 🟠 Sin utilidad: solo responde "Redirect to ... endpoint"
- **La usa la app:** no

**Respuesta recibida:** HTTP **200** · 81 ms · envoltorio: `success`, `message`, `data` · mensaje: «Redirect to brands endpoint»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `endpoint` | string | 0/1 | Ruta consultada o redirigida |
| `message` | string | 0/1 | Mensaje |

**Respuesta real (muestra enmascarada):**

```json
{
  "endpoint": "/brands",
  "message": "Use /brands endpoint for brand list"
}
```

**¿Está completo?** 🟠 Sin utilidad: solo responde "Redirect to ... endpoint".

**Inconsistencias y notas:**
- Solo responde "Redirect to brands endpoint": no entrega datos.

### `POST /quotations/categories`

**Get categories for quotation** — Get available categories for creating quotations

- **URL completa:** `POST https://importadora-back-production.up.railway.app/quotations/categories`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 401, 500
- **Estado:** 🟠 Sin utilidad: solo responde "Redirect to ... endpoint"
- **La usa la app:** no

**Respuesta recibida:** HTTP **200** · 76 ms · envoltorio: `success`, `message`, `data` · mensaje: «Redirect to categories endpoint»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `endpoint` | string | 0/1 | Ruta consultada o redirigida |
| `message` | string | 0/1 | Mensaje |

**Respuesta real (muestra enmascarada):**

```json
{
  "endpoint": "/categories",
  "message": "Use /categories endpoint for categories list"
}
```

**¿Está completo?** 🟠 Sin utilidad: solo responde "Redirect to ... endpoint".

**Inconsistencias y notas:**
- Solo responde "Redirect to categories endpoint": no entrega datos.

### `POST /quotations/history`

**Get quotation history** — Get quotation history with date filters

- **URL completa:** `POST https://importadora-back-production.up.railway.app/quotations/history`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos
- **La usa la app:** no
- **Body según el Swagger** (`models.GetQuotationHistoryRequest`): `companyId`: integer, `endDate`: string, `page`: integer, `pageSize`: integer, `startDate`: string, `userId`: integer

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "endDate": "2026-10-24",
  "page": 1,
  "pageSize": 5,
  "startDate": "2026-09-24",
  "userId": 948
}
```

**Respuesta recibida:** HTTP **200** · 309 ms · envoltorio: `success`, `message`, `data` · mensaje: «Quotation history retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `data` | array | 1/1 ⚠ siempre vacío | Lista dentro del objeto (anidada, además del envoltorio) |
| `page` | number | 0/1 | Página actual |
| `pageSize` | number | 0/1 | Tamaño de página |
| `totalRows` | number | 0/1 | Total de filas |
| `totalPages` | number | 0/1 | Total de páginas |

**Respuesta real (muestra enmascarada):**

```json
{
  "data": [],
  "page": 1,
  "pageSize": 5,
  "totalRows": 0,
  "totalPages": 0
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `data`

### `POST /quotations/models`

**Get models for quotation** — Get available models for creating quotations

- **URL completa:** `POST https://importadora-back-production.up.railway.app/quotations/models`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 401, 500
- **Estado:** 🟠 Sin utilidad: solo responde "Redirect to ... endpoint"
- **La usa la app:** no

**Respuesta recibida:** HTTP **200** · 81 ms · envoltorio: `success`, `message`, `data` · mensaje: «Redirect to models endpoint»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `endpoint` | string | 0/1 | Ruta consultada o redirigida |
| `message` | string | 0/1 | Mensaje |

**Respuesta real (muestra enmascarada):**

```json
{
  "endpoint": "/models",
  "message": "Use /models endpoint for models list"
}
```

**¿Está completo?** 🟠 Sin utilidad: solo responde "Redirect to ... endpoint".

**Inconsistencias y notas:**
- Solo responde "Redirect to models endpoint": no entrega datos.

### `GET /quotations/stats`

**Get quotation statistics** — Get quotation statistics for the company

- **URL completa:** `GET https://importadora-back-production.up.railway.app/quotations/stats`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no

**Respuesta recibida:** HTTP **200** · 236 ms · envoltorio: `success`, `message`, `data` · mensaje: «Quotation statistics retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `totalQuotations` | number | 0/1 | Cotizaciones |
| `draftCount` | number | 0/1 | Borradores |
| `sentCount` | number | 0/1 | Enviadas |
| `acceptedCount` | number | 0/1 | Cotizaciones aceptadas |
| `rejectedCount` | number | 0/1 | Rechazadas |
| `expiredCount` | number | 0/1 | Vencidas |
| `convertedCount` | number | 0/1 | Cotizaciones convertidas en pedido |
| `totalValue` | number | 0/1 | Valor del inventario |
| `acceptedValue` | number | 0/1 | Valor aceptado |
| `conversionRate` | number | 0/1 | Tasa de conversión |

**Respuesta real (muestra enmascarada):**

```json
{
  "totalQuotations": 10,
  "draftCount": 9,
  "sentCount": 1,
  "acceptedCount": 0,
  "rejectedCount": 0,
  "expiredCount": 0,
  "convertedCount": 0,
  "totalValue": 11900,
  "acceptedValue": 0,
  "conversionRate": 0
}
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- No declara parámetros; la empresa sale del token. Dice 10 cotizaciones (9 draft y 1 sent, valor $11.900).

### `POST /quotations/cart/add`

**Add item to quotation** — Add a new item to an existing quotation

- **URL completa:** `POST https://importadora-back-production.up.railway.app/quotations/cart/add`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.AddItemToQuotationRequest`): `discount`: number, `productId`: integer *, `quantity`: integer *, `quotationId`: integer *, `unitPrice`: number *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.QuotationResponse`.

**¿Está completo?** ⚫ No probado.

### `DELETE /quotations/cart/delete`

**Delete item from quotation** — Delete an item from a quotation (must have at least one item remaining)

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/quotations/cart/delete`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.DeleteItemRequest`): `itemId`: integer *, `quotationId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.QuotationResponse`.

**¿Está completo?** ⚫ No probado.

### `DELETE /quotations/delete`

**Delete quotation** — Delete a quotation (only draft or rejected status)

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/quotations/delete`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.DeleteQuotationRequest`): `quotationId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `OK`.

**¿Está completo?** ⚫ No probado.

### `POST /quotations/register`

**Create quotation** — Create a new quotation with items

- **URL completa:** `POST https://importadora-back-production.up.railway.app/quotations/register`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.CreateQuotationRequest`): `companyId`: integer, `items`: array[] *, `notes`: string, `sellerId`: integer, `userId`: integer *, `validUntil`: string  _(* = obligatorio)_
  - `validUntil`: format: 2006-01-02

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.QuotationResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /quotations/status`

**Change quotation status** — Change the status of a quotation (draft -> sent -> accepted/rejected)

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/quotations/status`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.ChangeStatusRequest`): `quotationId`: integer *, `status`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.QuotationResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /quotations/update`

**Update quotation** — Update an existing quotation (only draft status)

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/quotations/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateQuotationRequest`): `items`: array[], `notes`: string, `quotationId`: integer *, `validUntil`: string  _(* = obligatorio)_
  - `validUntil`: format: 2006-01-02

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.QuotationResponse`.

**¿Está completo?** ⚫ No probado.

### `GET /quotations/{id}`

**Get quotation by ID** — Get a single quotation with all items and details

- **URL completa:** `GET https://importadora-back-production.up.railway.app/quotations/{id}`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 404, 500
- **Estado:** ⚫ Sin probar (faltaba un valor de dominio)
- **La usa la app:** no
- **Parámetros de ruta/query:** `id` (path, integer, obligatorio)

**Respuesta:** no se obtuvo. Motivo: falta id(ruta) (no apareció en ninguna otra respuesta; se puede dar con EXTRA)

**¿Está completo?** ⚫ Sin probar (faltaba un valor de dominio).

## Grupo: Purchase Orders

Órdenes de compra a proveedores. Con los datos de prueba no hay compras (`data: null`).

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /purchases` | ⚪ Vacío: 200 sin filas con los datos de prueba | no |
| `GET /purchases/summary` | 🟠 Plantilla de propiedades: todos los totales en 0 y una fila fantasma en `topSuppliers` | no |
| `POST /purchases/cancel` | ⚫ No probado | no |
| `POST /purchases/create` | ⚫ No probado | no |
| `POST /purchases/detail` | ⚫ Sin probar (faltaba un valor de dominio) | no |
| `POST /purchases/receive` | ⚫ No probado | no |
| `PUT /purchases/status` | ⚫ No probado | no |
| `PUT /purchases/update` | ⚫ No probado | no |

### `POST /purchases`

**Get purchase orders with pagination** — Retrieves a paginated list of purchase orders for a company with optional filters

- **URL completa:** `POST https://importadora-back-production.up.railway.app/purchases`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** no
- **Body según el Swagger** (`models.GetPurchaseOrdersRequest`): `companyId`: integer *, `endDate`: string, `page`: integer, `pageSize`: integer, `search`: string, `startDate`: string, `status`: models.PurchaseOrderStatus, `supplierId`: integer, `warehouseId`: integer  _(* = obligatorio)_
  - `endDate`: Format: YYYY-MM-DD
  - `search`: Buscar por número de orden
  - `startDate`: Format: YYYY-MM-DD

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "endDate": "2026-10-24",
  "page": 1,
  "pageSize": 5,
  "startDate": "2026-09-24"
}
```

**Respuesta recibida:** HTTP **200** · 308 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Purchase orders retrieved successfully»
- `data` es **null**; total en la base: **0** (0 páginas)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

**Inconsistencias y notas:**
- `data` llega en `null`: no hay compras con los datos de prueba.

### `GET /purchases/summary`

**Get purchase orders summary** — Retrieves summary statistics of purchase orders for a company

- **URL completa:** `GET https://importadora-back-production.up.railway.app/purchases/summary`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟠 Plantilla de propiedades: todos los totales en 0 y una fila fantasma en `topSuppliers`
- **La usa la app:** no
- **Parámetros de ruta/query:** `companyId` (query, integer, obligatorio)

**Respuesta recibida:** HTTP **200** · 308 ms · envoltorio: `success`, `message`, `data` · mensaje: «Summary retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `totalOrders` | number | 0/1 | Pedidos del periodo |
| `draftOrders` | number | 0/1 | Órdenes en borrador |
| `pendingOrders` | number | 0/1 | Órdenes pendientes |
| `approvedOrders` | number | 0/1 | Órdenes aprobadas |
| `orderedCount` | number | 0/1 | Pedidas |
| `partialReceived` | number | 0/1 | Recibidas parcialmente |
| `receivedCount` | number | 0/1 | Recibidas |
| `cancelledCount` | number | 0/1 | Anuladas |
| `totalAmount` | number | 0/1 | Valor total |
| `pendingAmount` | number | 0/1 | Valor pendiente |
| `receivedAmount` | number | 0/1 | Valor recibido |
| `topSuppliers` | array | 0/1 | Mejores proveedores |
| `topSuppliers[].supplierId` | number | 0/1 | Proveedor |
| `topSuppliers[].supplierName` | string | 1/1 ⚠ siempre vacío | Nombre del proveedor |
| `topSuppliers[].orderCount` | number | 0/1 | Número de órdenes |
| `topSuppliers[].totalAmount` | number | 0/1 | Valor total |

**Respuesta real (muestra enmascarada):**

```json
{
  "totalOrders": 0,
  "draftOrders": 0,
  "pendingOrders": 0,
  "approvedOrders": 0,
  "orderedCount": 0,
  "partialReceived": 0,
  "receivedCount": 0,
  "cancelledCount": 0,
  "totalAmount": 0,
  "pendingAmount": 0,
  "receivedAmount": 0,
  "topSuppliers": [
    {
      "supplierId": 0,
      "supplierName": "",
      "orderCount": 0,
      "totalAmount": 0
    }
  ]
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: todos los totales en 0 y una fila fantasma en `topSuppliers`.

**Inconsistencias y notas:**
- El mensaje «Summary retrieved successfully» **se repite en 2 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- **Plantilla de propiedades:** todos los totales en `0`, y `topSuppliers` trae **una fila fantasma** `{ supplierId: 0, supplierName: "", orderCount: 0, totalAmount: 0 }`.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `supplierId` → Proveedor

### `POST /purchases/cancel`

**Cancel a purchase order** — Cancels a purchase order (not allowed if already received)

- **URL completa:** `POST https://importadora-back-production.up.railway.app/purchases/cancel`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.CancelPurchaseOrderRequest`): `cancelledBy`: integer *, `companyId`: integer *, `purchaseOrderId`: integer *, `reason`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Purchase order cancelled successfully`.

**¿Está completo?** ⚫ No probado.

### `POST /purchases/create`

**Create a new purchase order** — Creates a new purchase order with items for a supplier

- **URL completa:** `POST https://importadora-back-production.up.railway.app/purchases/create`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.CreatePurchaseOrderRequest`): `companyId`: integer *, `createdBy`: integer *, `expectedDate`: string, `items`: array[] *, `notes`: string, `supplierId`: integer *, `warehouseId`: integer *  _(* = obligatorio)_
  - `expectedDate`: Format: YYYY-MM-DD

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.PurchaseOrderResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /purchases/detail`

**Get purchase order by ID** — Retrieves detailed information about a specific purchase order including its items

- **URL completa:** `POST https://importadora-back-production.up.railway.app/purchases/detail`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ Sin probar (faltaba un valor de dominio)
- **La usa la app:** no
- **Body según el Swagger** (`models.GetPurchaseOrderByIdRequest`): `companyId`: integer *, `purchaseOrderId`: integer *  _(* = obligatorio)_

**Respuesta:** no se obtuvo. Motivo: falta purchaseOrderId (no apareció en ninguna otra respuesta; se puede dar con EXTRA)

**¿Está completo?** ⚫ Sin probar (faltaba un valor de dominio).

### `POST /purchases/receive`

**Receive items from purchase order** — Records receipt of items from a purchase order and updates inventory

- **URL completa:** `POST https://importadora-back-production.up.railway.app/purchases/receive`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.ReceivePurchaseOrderRequest`): `companyId`: integer *, `items`: array[] *, `notes`: string, `purchaseOrderId`: integer *, `receivedBy`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Items received successfully`.

**¿Está completo?** ⚫ No probado.

### `PUT /purchases/status`

**Update purchase order status** — Updates the status of a purchase order (with validation of allowed transitions)

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/purchases/status`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdatePurchaseOrderStatusRequest`): `approvedBy`: integer, `companyId`: integer *, `notes`: string, `purchaseOrderId`: integer *, `status`: models.PurchaseOrderStatus *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Status updated successfully`.

**¿Está completo?** ⚫ No probado.

### `PUT /purchases/update`

**Update a purchase order** — Updates an existing purchase order (only draft or pending status)

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/purchases/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdatePurchaseOrderRequest`): `companyId`: integer *, `expectedDate`: string, `items`: array[], `notes`: string, `purchaseOrderId`: integer *, `supplierId`: integer, `warehouseId`: integer  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.PurchaseOrderResponse`.

**¿Está completo?** ⚫ No probado.

## Grupo: Suppliers

Proveedores (externos: no inician sesión). 26 registros. El nombre del proveedor llega vacío en varios casos y hay que usar el del contacto.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /suppliers/detail` | 🟢 Completo | no |
| `POST /suppliers/list` | 🟢 Completo | sí |
| `POST /suppliers/products` | ⚪ Vacío: 200 sin filas con los datos de prueba | no |
| `GET /suppliers/summary` | 🟡 Incompleto: cuenta bien los 26 proveedores, pero `totalProducts` y `totalCreditLimit` no son creíbles | sí |
| `POST /suppliers/create` | ⚫ No probado | no |
| `DELETE /suppliers/delete` | ⚫ No probado | no |
| `POST /suppliers/products/add` | ⚫ No probado | no |
| `DELETE /suppliers/products/remove` | ⚫ No probado | no |
| `PUT /suppliers/products/update` | ⚫ No probado | no |
| `PUT /suppliers/update` | ⚫ No probado | no |

### `POST /suppliers/detail`

**Get supplier by ID** — Retrieves detailed information about a specific supplier

- **URL completa:** `POST https://importadora-back-production.up.railway.app/suppliers/detail`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSupplierByIdRequest`): `supplierId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "supplierId": 19
}
```

**Respuesta recibida:** HTTP **200** · 197 ms · envoltorio: `success`, `message`, `data` · mensaje: «Supplier retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `supplierId` | number | 0/1 | Proveedor |
| `companyId` | number | 0/1 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `name` | string | 1/1 ⚠ siempre vacío | Nombre |
| `documentType` | string | 0/1 | Tipo de documento del proveedor |
| `documentId` | string | 0/1 | Documento del proveedor |
| `email` | string | 1/1 ⚠ siempre vacío | Correo |
| `phone` | string | 1/1 ⚠ siempre vacío | Teléfono (llega como texto o número según el endpoint) |
| `address` | string | 0/1 | Dirección |
| `city` | string | 0/1 | Ciudad |
| `country` | string | 0/1 | País |
| `contactName` | string | 0/1 | Contacto del proveedor |
| `contactPhone` | string | 0/1 | Teléfono del contacto |
| `contactEmail` | string | 0/1 | Correo del contacto |
| `paymentTerms` | number | 0/1 | Días de plazo de pago |
| `creditLimit` | number | 0/1 | Límite de crédito del proveedor |
| `notes` | string | 1/1 ⚠ siempre vacío | Notas |
| `isActive` | boolean | 0/1 | Registro activo (llega como bool o número según el endpoint) |
| `createdAt` | string | 0/1 | Fecha de creación |

**Respuesta real (muestra enmascarada):**

```json
{
  "supplierId": 19,
  "companyId": 1,
  "name": "",
  "documentType": "Cédula de Ciudadanía",
  "documentId": "888888888",
  "email": "«string:0»",
  "phone": "«string:0»",
  "address": "«string:21»",
  "city": "Medellín Antioquia",
  "country": "Colombia",
  "contactName": "H MOTOS",
  "contactPhone": "334459988877777",
  "contactEmail": "grisalesa1@hotmail.com",
  "paymentTerms": 30,
  "creditLimit": 0,
  "notes": "",
  "isActive": true,
  "createdAt": "2026-03-10 09:47:29"
}
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `name`, `email`, `phone`

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `supplierId` → Proveedor, `companyId` → Empresa

### `POST /suppliers/list`

**Get suppliers with pagination** — Retrieves a list of suppliers for a company with pagination and optional filters

- **URL completa:** `POST https://importadora-back-production.up.railway.app/suppliers/list`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟢 Completo
- **La usa la app:** sí (SUPPLIERS.LIST)
- **Body según el Swagger** (`models.GetSuppliersRequest`): `companyId`: integer *, `isActive`: boolean, `page`: integer, `pageSize`: integer, `search`: string  _(* = obligatorio)_
  - `search`: Buscar por nombre, documento, email

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Lo que envía la app** (`suppliers.fetchSuppliersPage`): `{"companyId": 1, "page": 1, "pageSize": 5}` → HTTP 200, correcto, 5 fila(s)

**Respuesta recibida:** HTTP **200** · 308 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Suppliers retrieved successfully»
- `data` es **una lista** con 5 fila(s); total en la base: **26** (6 páginas)

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `supplierId` | number | 0/5 | Proveedor |
| `companyId` | number | 0/5 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `name` | string | 1/5 | Nombre |
| `documentType` | string | 0/5 | Tipo de documento del proveedor |
| `documentId` | string | 0/5 | Documento del proveedor |
| `email` | string | 4/5 | Correo |
| `phone` | string | 1/5 | Teléfono (llega como texto o número según el endpoint) |
| `address` | string | 0/5 | Dirección |
| `city` | string | 0/5 | Ciudad |
| `country` | string | 0/5 | País |
| `contactName` | string | 0/5 | Contacto del proveedor |
| `contactPhone` | string | 0/5 | Teléfono del contacto |
| `contactEmail` | string | 1/5 | Correo del contacto |
| `paymentTerms` | number | 0/5 | Días de plazo de pago |
| `creditLimit` | number | 0/5 | Límite de crédito del proveedor |
| `notes` | string | 5/5 ⚠ siempre vacío | Notas |
| `isActive` | boolean | 0/5 | Registro activo (llega como bool o número según el endpoint) |
| `createdAt` | string | 0/5 | Fecha de creación |

**Respuesta real (muestra enmascarada):**

```json
[
  {
    "supplierId": 19,
    "companyId": 1,
    "name": "",
    "documentType": "Cédula de Ciudadanía",
    "documentId": "888888888",
    "email": "«string:0»",
    "phone": "«string:0»",
    "address": "«string:21»",
    "city": "Medellín Antioquia",
    "country": "Colombia",
    "contactName": "H MOTOS",
    "contactPhone": "334459988877777",
    "contactEmail": "grisalesa1@hotmail.com",
    "paymentTerms": 30,
    "creditLimit": 0,
    "notes": "",
    "isActive": true,
    "createdAt": "2026-03-10 09:47:29"
  },
  {
    "supplierId": 17,
    "companyId": 1,
    "name": "Juan sebastian Grisales López",
    "documentType": "Cédula de Ciudadanía",
    "documentId": "89786877",
    "email": "«string:0»",
    "phone": "«string:13»",
    "address": "«string:26»",
    "city": "Medellín Antioquia",
    "country": "Colombia",
    "contactName": "PP MOTOS",
    "contactPhone": "33445",
    "contactEmail": "grisalesa1@hotmail.com",
    "paymentTerms": 30,
    "creditLimit": 0,
    "notes": "",
    "isActive": true,
    "createdAt": "2026-03-10 09:44:15"
  },
  "…"
]
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- `name` llega vacío en varios proveedores y hay que usar `contactName`; `notes` llega siempre vacío; `createdAt` usa otro formato de fecha.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `supplierId` → Proveedor, `companyId` → Empresa

### `POST /suppliers/products`

**Get products of a supplier** — Retrieves a list of products associated with a supplier

- **URL completa:** `POST https://importadora-back-production.up.railway.app/suppliers/products`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚪ Vacío: 200 sin filas con los datos de prueba
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSupplierProductsRequest`): `page`: integer, `pageSize`: integer, `supplierId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "page": 1,
  "pageSize": 5,
  "supplierId": 19
}
```

**Respuesta recibida:** HTTP **200** · 328 ms · envoltorio: `success`, `message`, `data`, `meta` · mensaje: «Products retrieved successfully»
- `data` es **null**; total en la base: **0** (0 páginas)

**¿Está completo?** ⚪ Vacío: 200 sin filas con los datos de prueba.

### `GET /suppliers/summary`

**Get supplier summary** — Retrieves summary statistics for suppliers in a company

- **URL completa:** `GET https://importadora-back-production.up.railway.app/suppliers/summary`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟡 Incompleto: cuenta bien los 26 proveedores, pero `totalProducts` y `totalCreditLimit` no son creíbles
- **La usa la app:** sí (SUPPLIERS.SUMMARY)
- **Parámetros de ruta/query:** `companyId` (query, integer, obligatorio)

**Lo que envía la app** (`suppliers.fetchSuppliersSummary`): `{"companyId": 1}` (no se repitió contra la API real)

**Respuesta recibida:** HTTP **200** · 420 ms · envoltorio: `success`, `message`, `data` · mensaje: «Summary retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `totalSuppliers` | number | 0/1 | Proveedores |
| `activeSuppliers` | number | 0/1 | Proveedores activos |
| `totalProducts` | number | 0/1 | Total de productos |
| `totalCreditLimit` | number | 0/1 | Cupo total otorgado |

**Respuesta real (muestra enmascarada):**

```json
{
  "totalSuppliers": 26,
  "activeSuppliers": 26,
  "totalProducts": 1,
  "totalCreditLimit": 0
}
```

**¿Está completo?** 🟡 Incompleto: cuenta bien los 26 proveedores, pero `totalProducts` y `totalCreditLimit` no son creíbles.

**Inconsistencias y notas:**
- El mensaje «Summary retrieved successfully» **se repite en 2 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Exige `companyId` en la query (sin él, 400 `companyId is required`).
- `totalProducts` llega en `1` y `totalCreditLimit` en `0` aunque hay 26 proveedores: valores poco creíbles frente a los datos de `POST /suppliers/list`.

### `POST /suppliers/create`

**Create a new supplier** — Creates a new supplier with the provided information

- **URL completa:** `POST https://importadora-back-production.up.railway.app/suppliers/create`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.CreateSupplierRequest`): `address`: string, `city`: string, `companyId`: integer *, `contactEmail`: string, `contactName`: string, `contactPhone`: string, `country`: string, `creditLimit`: number, `documentId`: string, `documentType`: string, `email`: string, `name`: string *, `notes`: string, `paymentTerms`: integer, `phone`: string  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.SupplierResponse`.

**¿Está completo?** ⚫ No probado.

### `DELETE /suppliers/delete`

**Delete a supplier** — Soft deletes a supplier by ID

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/suppliers/delete`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.DeleteSupplierRequest`): `supplierId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Supplier deleted successfully`.

**¿Está completo?** ⚫ No probado.

### `POST /suppliers/products/add`

**Add product to supplier** — Associates a product with a supplier

- **URL completa:** `POST https://importadora-back-production.up.railway.app/suppliers/products/add`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 201, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.AddSupplierProductRequest`): `cost`: number, `isPrimarySupply`: boolean, `leadTimeDays`: integer, `minOrderQty`: integer, `productId`: integer *, `supplierCode`: string, `supplierId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.SupplierProduct`.

**¿Está completo?** ⚫ No probado.

### `DELETE /suppliers/products/remove`

**Remove product from supplier** — Removes the association between a supplier and a product

- **URL completa:** `DELETE https://importadora-back-production.up.railway.app/suppliers/products/remove`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.RemoveSupplierProductRequest`): `id`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `Product removed successfully`.

**¿Está completo?** ⚫ No probado.

### `PUT /suppliers/products/update`

**Update supplier product** — Updates the association details between a supplier and a product

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/suppliers/products/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateSupplierProductRequest`): `cost`: number, `id`: integer *, `isActive`: boolean, `isPrimarySupply`: boolean, `leadTimeDays`: integer, `minOrderQty`: integer, `supplierCode`: string  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.SupplierProduct`.

**¿Está completo?** ⚫ No probado.

### `PUT /suppliers/update`

**Update a supplier** — Updates an existing supplier with the provided information

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/suppliers/update`
- **Token Bearer:** sí · **Clase:** escritura · **Códigos documentados:** 200, 400, 401, 404, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateSupplierRequest`): `address`: string, `city`: string, `contactEmail`: string, `contactName`: string, `contactPhone`: string, `country`: string, `creditLimit`: number, `documentId`: string, `documentType`: string, `email`: string, `isActive`: boolean, `name`: string, `notes`: string, `paymentTerms`: integer, `phone`: string, `supplierId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (escribe datos en producción). Contrato según el Swagger: modelo de respuesta `models.SupplierResponse`.

**¿Está completo?** ⚫ No probado.

## Grupo: Reports

Reportes agregados. **Los totales llegan pero todos los desgloses (por día, por producto, por canal, por mes...) llegan en `null`.**

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /reports/customers` | 🟡 Incompleto: los totales llegan, pero los desgloses vienen en null (topCustomers) | sí |
| `POST /reports/financial` | 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos | sí |
| `POST /reports/inventory` | 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos | sí |
| `POST /reports/sales` | 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos | no |

### `POST /reports/customers`

**Generate customer report** — Generates a customer report with statistics, top customers, and customer type breakdown

- **URL completa:** `POST https://importadora-back-production.up.railway.app/reports/customers`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟡 Incompleto: los totales llegan, pero los desgloses vienen en null (topCustomers)
- **La usa la app:** sí (REPORTS.CUSTOMERS)
- **Body según el Swagger** (`models.CustomerReportRequest`): `companyId`: integer *, `endDate`: string, `format`: string, `startDate`: string  _(* = obligatorio)_
  - `format`: json, excel, pdf

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "endDate": "2026-10-24",
  "startDate": "2026-09-24"
}
```

**Lo que envía la app** (`reports.fetchCustomerReport`): `{"companyId": 1, "startDate": "2026-10-01", "endDate": "2026-10-24"}` → HTTP 200, correcto, 1 fila(s)

**Respuesta recibida:** HTTP **200** · 662 ms · envoltorio: `success`, `message`, `data` · mensaje: «Customer report generated successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `companyId` | number | 0/1 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `totalCustomers` | number | 0/1 | Total de clientes |
| `activeCustomers` | number | 0/1 | Clientes activos |
| `newCustomers` | number | 0/1 | Clientes nuevos |
| `totalRevenue` | number | 0/1 | Ingresos del periodo |
| `averageOrderValue` | number | 0/1 | Valor promedio del pedido |
| `topCustomers` | null | 1/1 ⚠ siempre vacío | Mejores clientes (null) |
| `customersByType` | array | 0/1 | Clientes por tipo |
| `customersByType[].customerType` | string | 1/5 | Tipo de cliente |
| `customersByType[].customerCount` | number | 0/5 | Clientes |
| `customersByType[].totalRevenue` | number | 0/5 | Ingresos del periodo |
| `customersByType[].percentage` | number | 0/5 | Porcentaje |
| `generatedAt` | string | 0/1 | Momento en que se generó el reporte |

**Respuesta real (muestra enmascarada):**

```json
{
  "companyId": 1,
  "totalCustomers": 564,
  "activeCustomers": 0,
  "newCustomers": 0,
  "totalRevenue": 0,
  "averageOrderValue": 0,
  "topCustomers": null,
  "customersByType": [
    {
      "customerType": "",
      "customerCount": 1,
      "totalRevenue": 0,
      "percentage": 0.1773049645390071
    },
    {
      "customerType": "corporate",
      "customerCount": 94,
      "totalRevenue": 0,
      "percentage": 16.666666666666664
    },
    "…"
  ],
  "generatedAt": "2026-10-24T21:22:17.956895989Z"
}
```

**¿Está completo?** 🟡 Incompleto: los totales llegan, pero los desgloses vienen en null (topCustomers).

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `topCustomers`
- **Parcial:** `totalCustomers: 564` y `customersByType` traen datos reales (por ejemplo `corporate` 94 clientes), pero `activeCustomers`, `newCustomers`, `totalRevenue` y `averageOrderValue` llegan en `0` y `topCustomers` en `null`.
- Una fila de `customersByType` llega con `customerType: ""` (clientes sin tipo).

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `companyId` → Empresa

### `POST /reports/financial`

**Generate financial report** — Generates a financial report with revenue, costs, profit margins, and monthly breakdown

- **URL completa:** `POST https://importadora-back-production.up.railway.app/reports/financial`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos
- **La usa la app:** sí (REPORTS.FINANCIAL)
- **Body según el Swagger** (`models.FinancialReportRequest`): `companyId`: integer *, `endDate`: string *, `format`: string, `startDate`: string *  _(* = obligatorio)_
  - `format`: json, excel, pdf

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "endDate": "2026-10-24",
  "startDate": "2026-09-24"
}
```

**Lo que envía la app** (`reports.fetchFinancialReport`): `{"companyId": 1, "startDate": "2026-10-01", "endDate": "2026-10-24"}` → HTTP 200, correcto, 1 fila(s)

**Respuesta recibida:** HTTP **200** · 308 ms · envoltorio: `success`, `message`, `data` · mensaje: «Financial report generated successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `companyId` | number | 0/1 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `startDate` | string | 0/1 | Inicio del rango consultado |
| `endDate` | string | 0/1 | Fin del rango consultado |
| `totalRevenue` | number | 0/1 | Ingresos del periodo |
| `totalCost` | number | 0/1 | Costo total |
| `grossProfit` | number | 0/1 | Utilidad bruta |
| `grossMargin` | number | 0/1 | Margen bruto |
| `totalDiscounts` | number | 0/1 | Descuentos |
| `totalTaxes` | number | 0/1 | Impuestos |
| `netRevenue` | number | 0/1 | Ingreso neto |
| `accountsReceivable` | number | 0/1 | Cuentas por cobrar |
| `revenueByMonth` | null | 1/1 ⚠ siempre vacío | Ingresos por mes (null) |
| `generatedAt` | string | 0/1 | Momento en que se generó el reporte |

**Respuesta real (muestra enmascarada):**

```json
{
  "companyId": 1,
  "startDate": "2026-09-24",
  "endDate": "2026-10-24",
  "totalRevenue": 0,
  "totalCost": 0,
  "grossProfit": 0,
  "grossMargin": 0,
  "totalDiscounts": 0,
  "totalTaxes": 0,
  "netRevenue": 0,
  "accountsReceivable": 0,
  "revenueByMonth": null,
  "generatedAt": "2026-10-24T21:22:19.024951535Z"
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `revenueByMonth`
- **Plantilla de propiedades:** todos los valores llegan en `0` y `revenueByMonth` en `null` para el rango 2026-09-24 a 2026-10-24. No se sabe si `grossMargin` es un porcentaje (33,3) o una fracción (0,333) porque nunca llegó un valor distinto de cero.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `companyId` → Empresa

### `POST /reports/inventory`

**Generate inventory report** — Generates an inventory report with stock levels, low stock alerts, and stock breakdown by category/brand

- **URL completa:** `POST https://importadora-back-production.up.railway.app/reports/inventory`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos
- **La usa la app:** sí (REPORTS.INVENTORY)
- **Body según el Swagger** (`models.InventoryReportRequest`): `brandId`: integer, `categoryId`: integer, `companyId`: integer *, `format`: string, `lowStockOnly`: boolean, `warehouseId`: integer  _(* = obligatorio)_
  - `format`: json, excel, pdf

**Body / parámetros enviados en la prueba:**

```json
{
  "brandId": 30,
  "categoryId": 63,
  "companyId": 1
}
```

**Lo que envía la app** (`reports.fetchInventoryReport`): `{"companyId": 1, "warehouseId": 1}` → HTTP 200, correcto, 1 fila(s)

**Respuesta recibida:** HTTP **200** · 426 ms · envoltorio: `success`, `message`, `data` · mensaje: «Inventory report generated successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `companyId` | number | 0/1 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `totalProducts` | number | 0/1 | Total de productos |
| `totalStock` | number | 0/1 | Existencias totales |
| `totalValue` | number | 0/1 | Valor del inventario |
| `lowStockCount` | number | 0/1 | Productos con poco stock |
| `outOfStockCount` | number | 0/1 | Productos agotados |
| `stockByCategory` | null | 1/1 ⚠ siempre vacío | Stock por categoría (llega null) |
| `stockByBrand` | null | 1/1 ⚠ siempre vacío | Stock por marca (llega null) |
| `lowStockProducts` | null | 1/1 ⚠ siempre vacío | Detalle de poco stock (llega null) |
| `generatedAt` | string | 0/1 | Momento en que se generó el reporte |

**Respuesta real (muestra enmascarada):**

```json
{
  "companyId": 1,
  "totalProducts": 0,
  "totalStock": 0,
  "totalValue": 0,
  "lowStockCount": 0,
  "outOfStockCount": 0,
  "stockByCategory": null,
  "stockByBrand": null,
  "lowStockProducts": null,
  "generatedAt": "2026-10-24T21:22:19.750093846Z"
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos.

**Inconsistencias y notas:**
- Campos que el Swagger documenta y **no llegaron**: `warehouseId`
- Campos **siempre vacíos** en la prueba: `stockByCategory`, `stockByBrand`, `lowStockProducts`
- **Plantilla de propiedades:** todo llega en `0` y los desgloses en `null`. Ojo: la prueba se envió con `brandId: 30` y `categoryId: 63`, así que el 0 puede ser solo "esa marca y categoría no tienen productos" y **no** contradice los 8.148 productos del catálogo.
- No se probó sin filtros.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `companyId` → Empresa

### `POST /reports/sales`

**Generate sales report** — Generates a comprehensive sales report with totals, daily breakdown, top products, and payment methods

- **URL completa:** `POST https://importadora-back-production.up.railway.app/reports/sales`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos
- **La usa la app:** no
- **Body según el Swagger** (`models.SalesReportRequest`): `companyId`: integer *, `endDate`: string *, `format`: string, `sellerId`: integer, `startDate`: string *, `warehouseId`: integer  _(* = obligatorio)_
  - `format`: json, excel, pdf

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "endDate": "2026-10-24",
  "sellerId": 948,
  "startDate": "2026-09-24"
}
```

**Respuesta recibida:** HTTP **200** · 551 ms · envoltorio: `success`, `message`, `data` · mensaje: «Sales report generated successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `companyId` | number | 0/1 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `startDate` | string | 0/1 | Inicio del rango consultado |
| `endDate` | string | 0/1 | Fin del rango consultado |
| `totalSales` | number | 0/1 | Ventas del periodo |
| `totalOrders` | number | 0/1 | Pedidos del periodo |
| `averageTicket` | number | 0/1 | Ticket promedio |
| `totalProducts` | number | 0/1 | Total de productos |
| `totalCustomers` | number | 0/1 | Total de clientes |
| `salesByDay` | null | 1/1 ⚠ siempre vacío | Ventas por día (null) |
| `topProducts` | null | 1/1 ⚠ siempre vacío | Productos más vendidos (null) |
| `paymentMethods` | null | 1/1 ⚠ siempre vacío | Pagos por medio (viene null) |
| `generatedAt` | string | 0/1 | Momento en que se generó el reporte |

**Respuesta real (muestra enmascarada):**

```json
{
  "companyId": 1,
  "startDate": "2026-09-24",
  "endDate": "2026-10-24",
  "totalSales": 0,
  "totalOrders": 0,
  "averageTicket": 0,
  "totalProducts": 0,
  "totalCustomers": 0,
  "salesByDay": null,
  "topProducts": null,
  "paymentMethods": null,
  "generatedAt": "2026-10-24T21:22:20.602187971Z"
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos.

**Inconsistencias y notas:**
- Campos que el Swagger documenta y **no llegaron**: `topSellers`
- Campos **siempre vacíos** en la prueba: `salesByDay`, `topProducts`, `paymentMethods`
- **Plantilla de propiedades:** para el rango 2026-09-24 a 2026-10-24 TODOS los totales llegan en `0` y los tres desgloses (`salesByDay`, `topProducts`, `paymentMethods`) en `null`. El endpoint responde con la estructura correcta, pero no confirma que sepa calcular: nunca se probó con un rango que tenga ventas (la base tiene pedidos de 2024 y 2025).
- El Swagger documenta `topSellers`, que no llega. `format` acepta `json`, `excel` o `pdf`; solo se probó sin `format`.

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `companyId` → Empresa

## Grupo: SIIGO

Integración con el sistema contable externo SIIGO. Las **10 consultas de lectura responden 500** porque la empresa no tiene la configuración (`SIIGO configuration not found for this company`); el resto escribe en SIIGO y no se probó. Ver el plan de integración con la documentación de SIIGO.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /siigo/account-groups` | 🔴 Roto: el backend responde 500 | no |
| `POST /siigo/cost-centers` | 🔴 Roto: el backend responde 500 | no |
| `POST /siigo/customers` | 🔴 Roto: el backend responde 500 | no |
| `POST /siigo/document-types` | 🔴 Roto: el backend responde 500 | no |
| `POST /siigo/invoices` | 🔴 Roto: el backend responde 500 | no |
| `POST /siigo/payment-types` | 🔴 Roto: el backend responde 500 | no |
| `POST /siigo/products` | 🔴 Roto: el backend responde 500 | no |
| `POST /siigo/taxes` | 🔴 Roto: el backend responde 500 | no |
| `POST /siigo/users` | 🔴 Roto: el backend responde 500 | no |
| `POST /siigo/warehouses` | 🔴 Roto: el backend responde 500 | no |
| `POST /siigo/credit-note` | ⚫ No probado | no |
| `POST /siigo/sync/customers` | ⚫ No probado | no |
| `POST /siigo/sync/invoice` | ⚫ No probado | no |
| `POST /siigo/sync/invoices` | ⚫ No probado | no |
| `POST /siigo/sync/products` | ⚫ No probado | no |
| `POST /siigo/test-connection` | ⚫ No probado | no |

### `POST /siigo/account-groups`

**Get account groups from SIIGO** — Retrieves available account groups from SIIGO

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/account-groups`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSiigoAccountGroupsRequest`): `companyId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1
}
```

**Respuesta recibida:** HTTP **500** · 198 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Failed to get account groups: SIIGO configuration not found for this company»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Failed to get account groups: SIIGO configuration not found for this company"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Responde 500 `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, **no es un fallo de este endpoint**. No se conoce su respuesta real.

### `POST /siigo/cost-centers`

**Get cost centers from SIIGO** — Retrieves available cost centers from SIIGO

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/cost-centers`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSiigoCostCentersRequest`): `companyId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1
}
```

**Respuesta recibida:** HTTP **500** · 199 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Failed to get cost centers: SIIGO configuration not found for this company»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Failed to get cost centers: SIIGO configuration not found for this company"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Responde 500 `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, **no es un fallo de este endpoint**. No se conoce su respuesta real.

### `POST /siigo/customers`

**Get customers from SIIGO** — Retrieves customers from SIIGO accounting system

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/customers`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSiigoCustomersRequest`): `companyId`: integer *, `identification`: string, `page`: integer, `pageSize`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Respuesta recibida:** HTTP **500** · 195 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Failed to get customers: SIIGO configuration not found for this company»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Failed to get customers: SIIGO configuration not found for this company"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Responde 500 `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, **no es un fallo de este endpoint**. No se conoce su respuesta real.

### `POST /siigo/document-types`

**Get document types from SIIGO** — Retrieves available document types from SIIGO

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/document-types`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSiigoDocumentTypesRequest`): `companyId`: integer *, `type`: string  _(* = obligatorio)_
  - `type`: "FV", "NC", "RC", etc.

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1
}
```

**Respuesta recibida:** HTTP **500** · 199 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Failed to get document types: SIIGO configuration not found for this company»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Failed to get document types: SIIGO configuration not found for this company"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Responde 500 `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, **no es un fallo de este endpoint**. No se conoce su respuesta real.

### `POST /siigo/invoices`

**Get invoices from SIIGO** — Retrieves invoices from SIIGO accounting system

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/invoices`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSiigoInvoicesRequest`): `companyId`: integer *, `dateEnd`: string, `dateStart`: string, `identification`: string, `page`: integer, `pageSize`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "dateEnd": "2026-10-24",
  "dateStart": "2026-09-24",
  "page": 1,
  "pageSize": 5
}
```

**Respuesta recibida:** HTTP **500** · 192 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Failed to get invoices: SIIGO configuration not found for this company»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Failed to get invoices: SIIGO configuration not found for this company"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Responde 500 `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, **no es un fallo de este endpoint**. No se conoce su respuesta real.

### `POST /siigo/payment-types`

**Get payment types from SIIGO** — Retrieves available payment types from SIIGO

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/payment-types`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSiigoPaymentTypesRequest`): `companyId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1
}
```

**Respuesta recibida:** HTTP **500** · 196 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Failed to get payment types: SIIGO configuration not found for this company»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Failed to get payment types: SIIGO configuration not found for this company"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Responde 500 `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, **no es un fallo de este endpoint**. No se conoce su respuesta real.

### `POST /siigo/products`

**Get products from SIIGO** — Retrieves products from SIIGO accounting system

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/products`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSiigoProductsRequest`): `code`: string, `companyId`: integer *, `page`: integer, `pageSize`: integer  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "page": 1,
  "pageSize": 5
}
```

**Respuesta recibida:** HTTP **500** · 193 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Failed to get products: SIIGO configuration not found for this company»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Failed to get products: SIIGO configuration not found for this company"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Responde 500 `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, **no es un fallo de este endpoint**. No se conoce su respuesta real.

### `POST /siigo/taxes`

**Get tax types from SIIGO** — Retrieves available tax types from SIIGO

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/taxes`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSiigoTaxesRequest`): `companyId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1
}
```

**Respuesta recibida:** HTTP **500** · 204 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Failed to get taxes: SIIGO configuration not found for this company»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Failed to get taxes: SIIGO configuration not found for this company"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Responde 500 `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, **no es un fallo de este endpoint**. No se conoce su respuesta real.

### `POST /siigo/users`

**Get users from SIIGO** — Retrieves available users from SIIGO

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/users`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSiigoUsersRequest`): `companyId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1
}
```

**Respuesta recibida:** HTTP **500** · 199 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Failed to get users: SIIGO configuration not found for this company»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Failed to get users: SIIGO configuration not found for this company"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Responde 500 `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, **no es un fallo de este endpoint**. No se conoce su respuesta real.

### `POST /siigo/warehouses`

**Get warehouses from SIIGO** — Retrieves available warehouses from SIIGO

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/warehouses`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** 🔴 Roto: el backend responde 500
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSiigoWarehousesRequest`): `companyId`: integer *  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1
}
```

**Respuesta recibida:** HTTP **500** · 201 ms · envoltorio: `success`, `message` · mensaje: «Error interno del servidor» · error: «Failed to get warehouses: SIIGO configuration not found for this company»
- `data` es **undefined**

**Cuerpo del error:**

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Failed to get warehouses: SIIGO configuration not found for this company"
}
```

**¿Está completo?** 🔴 Roto: el backend responde 500.

**Inconsistencias y notas:**
- El mensaje «Error interno del servidor» **se repite en 13 endpoints**: es una plantilla del backend, no un mensaje propio de esta operación
- Responde 500 `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, **no es un fallo de este endpoint**. No se conoce su respuesta real.

### `POST /siigo/credit-note`

**Create a credit note in SIIGO** — Creates a credit note for a synced invoice in SIIGO

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/credit-note`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.CreateCreditNoteRequest`): `amount`: number, `companyId`: integer *, `observations`: string, `reason`: string *, `saleId`: integer *  _(* = obligatorio)_
  - `amount`: If 0, full refund

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.CreditNoteResult`.

**¿Está completo?** ⚫ No probado.

### `POST /siigo/sync/customers`

**Sync customers to SIIGO** — Synchronizes local customers to SIIGO accounting system

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/sync/customers`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.SyncCustomersRequest`): `companyId`: integer *, `customerIds`: array[]  _(* = obligatorio)_
  - `customerIds`: If empty, sync all

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.SyncResult`.

**¿Está completo?** ⚫ No probado.

### `POST /siigo/sync/invoice`

**Sync a single invoice to SIIGO** — Synchronizes a single sale as invoice to SIIGO

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/sync/invoice`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.SyncInvoiceRequest`): `companyId`: integer *, `saleId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.InvoiceSyncResult`.

**¿Está completo?** ⚫ No probado.

### `POST /siigo/sync/invoices`

**Sync multiple invoices to SIIGO** — Synchronizes multiple sales as invoices to SIIGO

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/sync/invoices`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.SyncInvoicesRequest`): `companyId`: integer *, `saleIds`: array[] *  _(* = obligatorio)_

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.SyncResult`.

**¿Está completo?** ⚫ No probado.

### `POST /siigo/sync/products`

**Sync products to SIIGO** — Synchronizes local products to SIIGO accounting system

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/sync/products`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.SyncProductsRequest`): `companyId`: integer *, `productIds`: array[]  _(* = obligatorio)_
  - `productIds`: If empty, sync all

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.SyncResult`.

**¿Está completo?** ⚫ No probado.

### `POST /siigo/test-connection`

**Test SIIGO connection** — Tests the connection to SIIGO API for a company

- **URL completa:** `POST https://importadora-back-production.up.railway.app/siigo/test-connection`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 401, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.TestConnectionRequest`): `companyId`: integer *  _(* = obligatorio)_

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.ConnectionTestResult`.

**¿Está completo?** ⚫ No probado.

## Grupo: Sync

Sincronización de dispositivos (modo sin conexión). Solo hay 11 dispositivos de prueba sin sincronizaciones. Las escrituras (push, pull, full, resolver conflictos) no se probaron.

| Operación | Estado | La usa la app |
|---|---|---|
| `POST /sync/conflicts` | 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos | no |
| `POST /sync/devices` | 🟢 Completo | no |
| `POST /sync/logs` | 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos | no |
| `POST /sync/queue` | 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos | no |
| `POST /sync/conflicts/resolve` | ⚫ No probado | no |
| `POST /sync/devices/register` | ⚫ No probado | no |
| `PUT /sync/devices/update` | ⚫ No probado | no |
| `POST /sync/full` | ⚫ No probado | no |
| `POST /sync/pull` | ⚫ No probado | no |
| `POST /sync/push` | ⚫ No probado | no |
| `POST /sync/queue/add` | ⚫ No probado | no |
| `PUT /sync/queue/update` | ⚫ No probado | no |
| `POST /sync/status` | 🟢 Completo (verificado con barrido de valores) | no |

### `POST /sync/conflicts`

**Get sync conflicts** — Retrieves unresolved sync conflicts

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/conflicts`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos
- **La usa la app:** no
- **Body según el Swagger** (`models.GetConflictsRequest`): `companyId`: integer *, `deviceId`: string, `entityType`: string, `status`: string  _(* = obligatorio)_
  - `status`: "pending", "resolved"

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1
}
```

**Respuesta recibida:** HTTP **200** · 253 ms · envoltorio: `success`, `message`, `data` · mensaje: «Conflicts retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `conflicts` | array | 1/1 ⚠ siempre vacío | Conflictos de sincronización |
| `total` | number | 0/1 | Total |
| `pending` | number | 0/1 | Pendientes |
| `resolved` | number | 0/1 | Conflictos resueltos |

**Respuesta real (muestra enmascarada):**

```json
{
  "conflicts": [],
  "total": 0,
  "pending": 0,
  "resolved": 0
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `conflicts`
- `conflicts: []`, `total`, `pending` y `resolved` en 0: plantilla sin conflictos.

### `POST /sync/devices`

**Get registered devices** — Retrieves all registered sync devices for a company

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/devices`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🟢 Completo
- **La usa la app:** no
- **Body según el Swagger** (`models.GetDevicesRequest`): `companyId`: integer *, `warehouseId`: integer  _(* = obligatorio)_

**Bodies enviados (barrido):** se probaron varias combinaciones; ejemplos:

```json
{"companyId": 1, "warehouseId": 1}
```

**Respuesta recibida:** HTTP **200** · 207 ms · envoltorio: `success`, `message`, `data` · mensaje: «Devices retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `devices` | array | 0/1 | Dispositivos sincronizados |
| `devices[].id` | number | 0/11 | Identificador interno de la fila |
| `devices[].companyId` | number | 0/11 | Empresa dueña del dato (tenant); va en casi todos los cuerpos |
| `devices[].deviceId` | string | 0/11 | Identificador del dispositivo que sincroniza |
| `devices[].deviceName` | string | 0/11 | Nombre del dispositivo |
| `devices[].deviceType` | string | 0/11 | Tipo de dispositivo |
| `devices[].lastSyncAt` | null | 11/11 ⚠ siempre vacío | Última sincronización |
| `devices[].isActive` | boolean | 0/11 | Registro activo (llega como bool o número según el endpoint) |
| `total` | number | 0/1 | Total |

**Respuesta real (muestra enmascarada):**

```json
{
  "devices": [
    {
      "id": 3,
      "companyId": 1,
      "deviceId": "test-device-29950",
      "deviceName": "Test Device",
      "deviceType": "mobile",
      "lastSyncAt": null,
      "isActive": true
    },
    {
      "id": 2,
      "companyId": 1,
      "deviceId": "test-device-11209",
      "deviceName": "Test Device",
      "deviceType": "mobile",
      "lastSyncAt": null,
      "isActive": true
    },
    "…"
  ],
  "total": 11
}
```

**¿Está completo?** 🟢 Completo.

**Inconsistencias y notas:**
- Hay **11 dispositivos de prueba** (`test-device-...`, todos "Test Device" de tipo mobile) y ninguno ha sincronizado (`lastSyncAt: null`).

**Cómo se relaciona con la operación:**
- Identificadores que devuelve: `companyId` → Empresa

### `POST /sync/logs`

**Get sync logs** — Retrieves sync operation logs

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/logs`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSyncLogsRequest`): `companyId`: integer *, `deviceId`: string, `endDate`: string, `entityType`: string, `page`: integer, `pageSize`: integer, `startDate`: string  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "endDate": "2026-10-24",
  "page": 1,
  "pageSize": 5,
  "startDate": "2026-09-24"
}
```

**Respuesta recibida:** HTTP **200** · 311 ms · envoltorio: `success`, `message`, `data` · mensaje: «Sync logs retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `logs` | array | 1/1 ⚠ siempre vacío | Bitácora de sincronización |
| `total` | number | 0/1 | Total |

**Respuesta real (muestra enmascarada):**

```json
{
  "logs": [],
  "total": 0
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `logs`

### `POST /sync/queue`

**Get sync queue** — Retrieves pending items in the sync queue

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/queue`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos
- **La usa la app:** no
- **Body según el Swagger** (`models.GetQueueRequest`): `companyId`: integer *, `deviceId`: string, `entityType`: string, `limit`: integer, `status`: string  _(* = obligatorio)_

**Body / parámetros enviados en la prueba:**

```json
{
  "companyId": 1,
  "limit": 5
}
```

**Respuesta recibida:** HTTP **200** · 482 ms · envoltorio: `success`, `message`, `data` · mensaje: «Queue retrieved successfully»
- `data` es **un objeto**

**Campos devueltos y su tipo:**

| Campo | Tipo | Vacíos / vistos | Qué es |
|---|---|---|---|
| `items` | array | 1/1 ⚠ siempre vacío | Elementos de la cola |
| `total` | number | 0/1 | Total |
| `pending` | number | 0/1 | Pendientes |
| `failed` | number | 0/1 | Elementos fallidos |

**Respuesta real (muestra enmascarada):**

```json
{
  "items": [],
  "total": 0,
  "pending": 0,
  "failed": 0
}
```

**¿Está completo?** 🟠 Plantilla de propiedades: estructura correcta pero todos los valores vacíos.

**Inconsistencias y notas:**
- Campos **siempre vacíos** en la prueba: `items`
- `items: []` y todos los contadores en 0: cola vacía.

### `POST /sync/conflicts/resolve`

**Resolve a sync conflict** — Resolves a sync conflict with specified resolution

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/conflicts/resolve`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 204, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.ResolveConflictRequest`): `id`: integer *, `resolution`: string *, `resolvedBy`: integer *, `resolvedData`: string  _(* = obligatorio)_
  - `resolution`: "local", "server", "merged"
  - `resolvedData`: For merged resolution

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `Conflict resolved`.

**¿Está completo?** ⚫ No probado.

### `POST /sync/devices/register`

**Register a sync device** — Registers a new sync device for offline synchronization

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/devices/register`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.RegisterDeviceRequest`): `appVersion`: string, `companyId`: integer *, `deviceId`: string *, `deviceName`: string *, `deviceType`: string *, `warehouseId`: integer  _(* = obligatorio)_
  - `deviceType`: "pos", "mobile", "tablet"

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.DeviceResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /sync/devices/update`

**Update a device** — Updates a registered sync device

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/sync/devices/update`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateDeviceRequest`): `appVersion`: string, `deviceId`: string *, `deviceName`: string, `isActive`: boolean  _(* = obligatorio)_

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.DeviceResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /sync/full`

**Perform full sync** — Performs a full data sync for a device

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/full`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.FullSyncRequest`): `companyId`: integer *, `deviceId`: string *, `warehouseId`: integer  _(* = obligatorio)_

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.FullSyncResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /sync/pull`

**Pull updates from server** — Pulls updated data from the server for a device

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/pull`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.PullSyncRequest`): `companyId`: integer *, `deviceId`: string *, `entityType`: string, `limit`: integer, `offset`: integer, `since`: string, `warehouseId`: integer  _(* = obligatorio)_
  - `entityType`: If empty, sync all entities
  - `limit`: Max items per page (default 100, max 1000)
  - `offset`: Offset for pagination
  - `since`: ISO timestamp for incremental sync

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.PullSyncResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /sync/push`

**Push changes to server** — Pushes local changes from a device to the server

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/push`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.PushSyncRequest`): `changes`: array[] *, `companyId`: integer *, `deviceId`: string *  _(* = obligatorio)_

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.PushSyncResponse`.

**¿Está completo?** ⚫ No probado.

### `POST /sync/queue/add`

**Queue a sync operation** — Adds an item to the sync queue for later processing

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/queue/add`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 200, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.QueueSyncRequest`): `companyId`: integer *, `deviceId`: string *, `direction`: string, `entityId`: integer *, `entityType`: string *, `operation`: string *, `payload`: string, `priority`: integer, `warehouseId`: integer  _(* = obligatorio)_
  - `direction`: "up" or "down"
  - `operation`: "create", "update", "delete"
  - `priority`: 1-10, default 5

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `models.QueueItemResponse`.

**¿Está completo?** ⚫ No probado.

### `PUT /sync/queue/update`

**Update queue item status** — Updates the status of a sync queue item

- **URL completa:** `PUT https://importadora-back-production.up.railway.app/sync/queue/update`
- **Token Bearer:** sí · **Clase:** crítico · **Códigos documentados:** 204, 400, 500
- **Estado:** ⚫ No probado
- **La usa la app:** no
- **Body según el Swagger** (`models.UpdateQueueItemRequest`): `errorMessage`: string, `id`: integer *, `status`: string *  _(* = obligatorio)_
  - `status`: "synced", "failed"

**Respuesta:** no se llamó (sincroniza o escribe en un sistema externo). Contrato según el Swagger: modelo de respuesta `Queue item updated`.

**¿Está completo?** ⚫ No probado.

### `POST /sync/status`

**Get sync status** — Retrieves the current sync status for a device

- **URL completa:** `POST https://importadora-back-production.up.railway.app/sync/status`
- **Token Bearer:** sí · **Clase:** lectura · **Códigos documentados:** 200, 400, 500
- **Estado:** 🟢 Completo (verificado con barrido de valores)
- **La usa la app:** no
- **Body según el Swagger** (`models.GetSyncStatusRequest`): `companyId`: integer *, `deviceId`: string *  _(* = obligatorio)_

**Bodies enviados (barrido):** se probaron varias combinaciones; ejemplos:

```json
{"companyId": 1, "deviceId": "test-device-29950"}
```

**Respuestas del barrido:** 1 combinaciones, todas HTTP 200; 1 devolvieron datos.

Ejemplo con datos: body `{"companyId": 1, "deviceId": "test-device-29950"}` → 1 fila(s), total —.

```json
{
  "deviceId": "test-device-29950",
  "lastSyncAt": null,
  "pendingUp": 0,
  "pendingDown": 0,
  "conflicts": 0,
  "queueSize": 0,
  "isOnline": true,
  "serverTimestamp": "2026-10-24T23:47:00.650466567Z"
}
```

**¿Está completo?** 🟢 Completo (verificado con barrido de valores).

**Inconsistencias y notas:**
- Exige un `deviceId` real: se armó con el que devolvió `/sync/devices`. Todos sus contadores están en 0.

## Validación de que no hay endpoints inventados

- Operaciones documentadas arriba: **189**; operaciones del Swagger: **189**.
- Documentadas que **no existen** en el Swagger: **0**.
- Del Swagger que **faltan** en esta documentación: **0**.
- Duplicadas en esta documentación: **0**.

_Generado desde `datos/respuestas.json`, `datos/swagger.json` y `datos/cuerpos-app.json`._

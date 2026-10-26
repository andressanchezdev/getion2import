# IP Online — Documentación completa del software

> **Software:** "IP Online" · Frontend `https://importadora-online-ruby.vercel.app` (Vercel) ·
> Backend `https://importadora-back-production.up.railway.app` (Railway) · Archivos en Cloudflare R2.
> **Fecha del análisis:** 2026-10-12 · **Fuente:** recorrido de la interfaz (usuario tester
> autorizado) + captura del tráfico de red (31 endpoints).
> **Alcance:** este documento describe el **estado actual** del aplicativo (una **maqueta/MVP
> incompleto**): qué idea persigue, cómo modela cada proceso del negocio, qué se ve en la interfaz
> (funcione o no), su lógica, endpoints y modelos de datos, y las mejoras para un refactor drástico.
> **Nota:** solo valores de ejemplo; sin datos personales reales ni credenciales.

---

# PARTE A — LO ESENCIAL (en simple)

## A.1 ¿Qué es IP Online?
Es un **ERP / sistema de gestión para una importadora-distribuidora de repuestos de moto**
(razón social en los datos: "Importadora Premium Online S.A.S"). En una frase: **un back-office para
vender repuestos (mostrador y en línea), controlar el inventario en varias bodegas, surtir y
despachar los pedidos, cobrar, llevar la cartera de crédito de los clientes y administrar el
personal.**

## A.2 ¿Para quién?
- **Vendedores / mostrador:** arman pedidos y venden.
- **Bodega:** alistan (picking), hacen traslados entre bodegas y reciben mercancía.
- **Caja / facturación:** cobran y facturan.
- **Cartera:** controlan crédito, recaudo y pagos online.
- **Administración / RRHH:** gestionan productos, catálogos, proveedores y empleados con permisos.

## A.3 ¿Qué hace (idea del software)?
1. **Vender** desde un POS (Tienda) a un cliente, con precios por nivel y a crédito o de contado.
2. **Surtir** el pedido por etapas: verificación → picking (alistamiento) → facturación → despacho.
3. **Controlar inventario** multi-bodega, con ubicación física por estante y niveles de precio.
4. **Mover stock** entre bodegas (traslados) y **recibir** esos traslados.
5. **Cobrar y facturar** en Caja (factura carta / ticket / electrónica).
6. **Gestionar cartera**: cupo de crédito por cliente, saldos, recaudo y conciliación de pagos online.
7. **Administrar personal**: empleados, cargos, sucursales, roles y permisos por módulo.

## A.4 Estado actual (importante)
Es una **maqueta funcional incompleta**. La interfaz está bastante construida y las lecturas
(listados) traen datos, pero **muchas acciones no operan** y hay **vistas rotas, duplicadas, datos de
prueba en producción y textos sin traducir**. Ver **Parte F — Qué funciona y qué no**.

---

# PARTE B — ARQUITECTURA Y CÓMO CONECTAN LOS MODELOS

## B.1 Arquitectura técnica
- **Frontend:** SPA en Vercel. Rutas tipo `/home/<modulo>` (ej. `/home/tienda`, `/home/cartera`).
- **Backend / API:** Railway, base `https://importadora-back-production.up.railway.app`.
- **Archivos:** Cloudflare R2 (imágenes de productos/marcas/empleados, URLs públicas).
- **Multi-tenant:** casi todo recibe `companyId` (empresa/tenant); casi todo opera por `warehouseId`
  (bodega) y `userId`.
- **Autenticación:** `POST /auth/login` → `access_token` + `refresh_token` (JWT). Las demás llamadas
  usan `Authorization: Bearer <access_token>`. El JWT lleva `userId`, `companyId` y expiración (~24 h).
- **Convenciones:** respuestas `{ success, message, data }`; paginación `{ page, pageSize }` ↔
  `meta { currentPage, pageSize, totalRecords, totalPages, hasNextPage, hasPrevPage }`. API casi
  toda por **POST** (incluso lecturas), con pocas excepciones (`PUT /brands/update`,
  `DELETE /carts/deleteall`, algunos `GET`).

## B.2 Mapa de modelos (entidades) y cómo se conectan

```
                         ┌───────────────────────────┐
                         │   EMPRESA (companyId)      │  tenant raíz
                         └───────────────┬───────────┘
        ┌──────────────┬────────────────┼───────────────┬───────────────┐
        ▼              ▼                 ▼               ▼               ▼
   BODEGAS       CATÁLOGOS          PRODUCTOS        CLIENTES        EMPLEADOS
 (warehouses)  marcas/categorías/  (inventario)     (terceros)      (personal)
   │ ubicaciones  modelos/familias     │                │               │
   │ (estantes)                        │                │               │
   ▼                                   ▼                ▼               ▼
 stock por        clasifican →   prices[P0..P3]      CARRITO         ROLES (por área)
 ubicación                       locations[]         (uuid)            │
 (physicalStock)                 inventory{}           │               ▼
                                 UbicaciónIA            ▼           PERMISOS por módulo
                                                     PEDIDO/VENTA    (canCreate/Read/
                                                     (PD-xxxx)        Update/Delete)
                                                        │
                        ┌───────────────────────────────┼───────────────────────────┐
                        ▼                                ▼                            ▼
                   PIPELINE SURTIDO                  FACTURACIÓN                  PAGO
                Verification → Picking →             (Factura /                 crédito → CARTERA (cupo,
                Invoicing → Dispatch                 N° Factura, Caja)          saldo, pagos) │
                (movimientos con tiempos)                                        contado → CAJA │
                                                                                               ▼
                                                                                   PAGOS ONLINE (verificar/
                                                                                   rechazar) → HISTORIAL PAGOS

   PROVEEDORES (suppliers) ── abastecen inventario (términos de pago / cupo de crédito)
   TRASLADOS (warehouse → warehouse) ── mueven stock ── INGRESO TRASLADO (recepción en destino)
```

**En palabras:** la **Empresa** tiene **bodegas** (con ubicaciones/estantes), **catálogos**
(marca/categoría/modelo/familia) que clasifican los **productos**; cada producto tiene **precios por
nivel**, **stock por ubicación** e inventario. Un **cliente** arma un **carrito** (`uuid`) que se
convierte en **pedido/venta** (PD-xxxx). El pedido recorre el **pipeline de surtido**
(Verificación→Picking→Facturación→Despacho) y termina en **facturación/Caja**. Si la venta es a
**crédito**, genera saldo en **Cartera** (contra el **cupo** del cliente); el recaudo entra por
**Pagos online** (se verifica/rechaza) y queda en **Historial de pagos**. Los **empleados** tienen
**roles por área** y **permisos CRUD por módulo**. Los **proveedores** abastecen y los **traslados**
mueven stock entre bodegas, que se **reciben** en Ingreso traslado.

---

# PARTE C — MÓDULOS DE LA INTERFAZ (todo lo que existe, funcione o no)

Menú lateral "Panel de administrador":

| # | Módulo | Submódulos / subgestiones |
|---|---|---|
| 1 | **Cartera** | Cartera · Pagos online · Historial de pagos · Historial de pedidos |
| 2 | **Tienda (POS)** | Tienda · Pendientes · Traslados general · Picking inmediato · Ingreso traslado · Historial de pedidos |
| 3 | **Caja** | Verificación de caja (flujo de 2 pasos) |
| 4 | **Empleados** (superior) | Listado (sucursal/cargo/modalidad) · Crear empleado (3 pasos) · Registro masivo |
| 5 | **Control de inventario** | Productos · Marcas · Categorías · Grupos · Modelos · Ubicaciones · Movimientos · Reportes |
| 6 | **Reportes de ventas** | *(no recorrido en detalle; endpoints `/sales/report/general` e `/internal`)* |
| 7 | **Terceros** | Clientes · Por verificar · Proveedores · Transportadora · Empleados · Usuarios |

Usuario de la sesión de prueba: "Test Updated".

---

# PARTE D — PROCESOS Y SUBPROCESOS (mapa de flujos)

## D.1 VENTA (POS / Tienda)
**Idea:** armar un pedido para un cliente desde el catálogo.

```
[Login] → [Tienda/POS]
   1. Seleccionar CLIENTE (define priceType / nivel de precio)
   2. Buscar / Filtrar catálogo (Marca, Categoría, Modelo, Familia, con/sin stock)
   3. Por producto: fijar CANTIDAD y PRECIO (P1 editable) → "+ Ordenar"
      → línea entra al CARRITO (uuid, userId, warehouseId)  [POST /carts/register]
   4. Revisar CARRITO (stepper cantidad, quitar línea, total en vivo)  [POST /carts]
   5. "Finalizar carrito" → convierte carrito en PEDIDO/VENTA
```
- Precio **editable** en POS (override sobre nivel P1). Estados de tarjeta: **Ordenado** (en carrito)
  / **Agotado** (sin stock). Vaciar carrito: `DELETE /carts/deleteall`.

## D.2 SURTIDO (ciclo de vida del pedido)
**Idea:** llevar el pedido desde que se confirma hasta que se despacha, midiendo tiempos.

```
PEDIDO creado
   → VERIFICATION  (verificación)
   → PICKING       (alistamiento físico en bodega)   [Picking inmediato]
   → INVOICING     (facturación)
   → DISPATCH      (despacho)
```
- **Pendientes:** pedidos por procesar (`/sales/pendings`). Opciones por pedido: Compartir, Imprimir,
  Descargar, Subir productos, **Eliminar carrito**.
- **Picking inmediato:** cola de alistamiento; estado **Disponible / Ocupado / Pausa**. El **drawer de
  picking** muestra productos, avance por color (rojo/amarillo/verde) y acciones: **Liberar pedido,
  Autocompletar Picking, Reestablecer cantidades, Verificar picking con faltantes**.
- **Historial y movimientos** (en el detalle del pedido): registra cada etapa con **Entrada/Salida**,
  **agente responsable** y **Tiempo (min)** → trazabilidad y eficiencia por etapa.

## D.3 TRASLADOS ENTRE BODEGAS
**Idea:** mover stock de una bodega a otra y recibirlo en destino.

```
[Traslados general]  (origen → destino)
   - Arma un "carrito" de productos a trasladar (cantidades editables)
   - "Finalizar carrito" confirma el movimiento        [/sales/traslades]
        ▼
[Ingreso traslado]  (bodega destino)
   - Recibe/verifica (verification) o rechaza (rejected)
   - "Ingresar traslado": digitar CÓDIGO DE ENTREGA → Aceptar  → entra el stock
   - Apoyo con escáner de código de barras
```

## D.4 CAJA (cobro y facturación)
**Idea:** verificar y cobrar el pedido, emitir la factura.

```
[Caja] → clic en pedido → Panel "Verificación"
   Paso 1: VERIFICAR  → Dirección de entrega ✔ · Medio de pago ✔ · Tipo de facturación ✔
   Paso 2: FINALIZAR  → Formato: Carta / Post(ticket) / Ninguna / Descargar factura → Aceptar
```
- Opciones del pedido en caja: **Liberar pedido, Modificar carrito, Eliminar pedido**.
- Estados en la tabla de caja: **Facturar / Picking / Pausa / Ocupado**.

## D.5 CARTERA (crédito y recaudo)
**Idea:** controlar cuánto debe cada cliente y registrar los pagos.

```
Venta a CRÉDITO → saldo en CARTERA (baja el "cupo disponible" del cliente)
[Cartera] listado de clientes: Cupo · Adeudado · Último pago · Estado de contacto · "Registrar" pago
   → clic en cliente → ESTADO DE CUENTA (aging):
        pedidos con Valor, Pagos verificados, Por verificar, Pendiente, Fecha límite, Estado
        acciones: "Distribuir a más antiguos" / "Total a pagar"
[Pagos online] conciliación de pagos digitales:
   cada pago (PG-xxx) → VERIFICAR (banco, fecha, valor, comprobante → Aceptar)  o  RECHAZAR (notifica al cliente)
[Historial de pagos] bitácora: agente verificador + estado (Verificado / Anulado / Ocupado), filtrable por fecha, exportable
```
- Filtros/resumen de cartera: **Total pendiente**, **Total a pagar**, **En proceso** (con conteos).

## D.6 INVENTARIO (catálogo y stock)
**Idea:** mantener el catálogo maestro, el stock por ubicación y los maestros de clasificación.

```
[Control de inventario → Productos]  (8.205 productos)
   columnas: Producto · Marca · Precios[P0..P3] · Ubicaciones · Estados(visibilidad) ·
             Estados cantidad · Cantidad (actual/objetivo + "Faltan X")
   menú ☰: Crear nuevo producto · Registro inmediato · Registro masivo ·
           Clonación de productos · Configuración globales
   Crear/Editar producto (drawer): imagen, códigos, categoría/modelo/marca/familia,
           costos(costo|precio), tope(min|max), cantidad, Ubicación general, UbicaciónIA,
           dimensiones(W|L|H), peso, flags(Prioridad/Reposición automática/Vista/Estado)
   Submaestros: Marcas · Categorías · Grupos · Modelos · Ubicaciones · Movimientos · Reportes
```
- **Configuración globales:** valores por defecto (IVA 19%, Peso Kg, Tope cantidad, flags).
- **Ubicación IA:** el sistema sugiere/asigna un estante (ej. "Bodega A - Estante 1").

## D.7 EMPLEADOS / RRHH
**Idea:** administrar personal, sucursales, cargos y permisos.

```
[Empleados]  columnas: Usuario · Sucursales · Cargos · Modalidad de trabajo
   ☰: Crear nuevo empleado · Registro masivo
   Crear empleado (asistente 3 pasos):
     1/3 Datos personales (nombre, apellido, identificación, residencia, nacionalidad, contacto, sexo, estado civil, fecha nac.)
     2/3 Información contractual (tipo contrato, ingreso/finalización, sucursales, cargos, áreas, jefe inmediato, estado laboral)
     3/3 Foto (cargar imagen o elegir avatar) → "Guardar empleado"
Roles por ÁREA → cada rol tiene PERMISOS por módulo (canCreate / canRead / canUpdate / canDelete)
```
- **Terceros → Empleados** es un **directorio** distinto (nacionalidad, contacto, residencia, estado
  laboral): Activo / Licencia / Retirado / Pendiente.

## D.8 TERCEROS
Clientes · Por verificar (registros pendientes de validación) · Proveedores (con términos de pago y
cupo de crédito) · Transportadora (transportadoras/envíos) · Empleados (directorio) · Usuarios
(cuentas de acceso).

---

# PARTE E — FLUJO COMPLETO END-TO-END (resumen)

```
LOGIN
  → TIENDA/POS: elegir cliente → armar carrito → finalizar
     → PEDIDO (PD) entra al PIPELINE: Verification → Picking → Invoicing → Dispatch
        → CAJA: verificar (entrega/pago/facturación) → finalizar (factura carta/ticket/electrónica)
           → si CONTADO: cobro en caja
           → si CRÉDITO: saldo en CARTERA → recaudo por PAGOS ONLINE (verificar/rechazar)
                          → HISTORIAL DE PAGOS (agente + estado)
  Soporte transversal:
     INVENTARIO (catálogo, precios, stock, UbicaciónIA) alimenta la Tienda
     TRASLADOS mueven stock entre bodegas → INGRESO TRASLADO lo recibe
     PROVEEDORES abastecen el inventario
     EMPLEADOS + ROLES/PERMISOS controlan quién puede hacer qué en cada módulo
     REPORTES DE VENTAS consolidan utilidad/IVA por documento y por línea
```

---

# PARTE F — QUÉ FUNCIONA Y QUÉ NO (estado real)

> El aplicativo es una **maqueta**: las **lecturas/listados** mayormente cargan, pero **muchas
> acciones no responden** y hay inconsistencias. Resumen de hallazgos:

| Área | Hallazgo | Tipo |
|---|---|---|
| Traslados general (drawer detalle) | **Ninguna acción funciona** (botones/menú no responden) | 🔴 Roto |
| Ingreso traslado | **Ninguna acción funciona** en la vista | 🔴 Roto |
| Historial de pedidos (Tienda) | Vista **vacía / sin datos**; además **duplica** la de Cartera (rutas `/home/historialdepedidos` vs `/home/historial-pedidos`) | 🔴 Duplicado/roto |
| Historial de pedidos (Tienda) | El **filtro** es el del catálogo (Marca/Categoría/Modelo/Familia), no filtros de pedidos | 🟠 Componente mal reutilizado |
| Empleados (menú superior) | Arranca con "Información no disponible" y **carga con retraso** (falta estado de carga) | 🟠 UX |
| Pagos online (Verificar) | Referencia de pago muestra **`RFP-undefined`** | 🟠 Bug de datos |
| Pagos online (Rechazar) | La notificación al cliente muestra el **número de cuenta bancaria en claro** | 🟠 Privacidad |
| Inventario → Config. globales | Etiqueta **"Visla"** (typo de "Vista") | 🟡 Texto |
| Crear/Editar producto | Títulos **en inglés** ("Create New Product" / "Edit Product") | 🟡 i18n |
| Endpoint `/families` | Responde **404** (catálogo "familias/grupos" no implementado) | 🔴 Backend |
| Endpoint `/sales/history` | Responde **500** | 🔴 Backend |
| Endpoint `/inventory/createProduct` | Responde **400** con el payload capturado (contrato incompleto) | 🔴 Backend |
| Datos | **Datos de prueba mezclados en producción** (empleados "qw", "sadasdsda"; productos Samsung/Electrónica) | 🟠 Higiene |
| Inventario (productos) | Se observan **stocks negativos** por ubicación | 🟠 Datos |
| API (diseño) | Casi todo por **POST** (lecturas incluidas); REST inconsistente | 🟡 Diseño |
| Multi-tenant | `companyId` viaja en el **body del cliente** → validar que el backend lo tome del token | 🟠 Seguridad |

Leyenda: 🔴 crítico · 🟠 importante · 🟡 menor.

---

# PARTE G — ENDPOINTS ACTUALES (31)

Base API: `https://importadora-back-production.up.railway.app` · Header `Authorization: Bearer <token>`.

| Módulo | Método · Ruta | Para qué |
|---|---|---|
| Auth | `POST /auth/login` | Login → access/refresh token + user |
| POS | `POST /carts` | Leer carrito por uuid/usuario/bodega |
| POS | `POST /carts/register` | Agregar línea al carrito (venta) |
| POS | `DELETE /carts/deleteall` | Vaciar carrito |
| Inventario | `POST /products` | Listado paginado de productos |
| Inventario | `POST /inventory/control` | Control de inventario (stock) |
| Inventario | `POST /inventory/search` | Búsqueda incremental de productos |
| Inventario | `POST /inventory/filter` | Filtrar catálogo (categoryIds, etc.) |
| Inventario | `POST /inventory/createProduct` | Alta de producto (⚠️ 400) |
| Catálogos | `POST /categories` | Categorías + meta |
| Catálogos | `POST /brands` · `PUT /brands/update` | Marcas (listar / actualizar) |
| Catálogos | `POST /models` | Modelos |
| Catálogos | `POST /families` | Familias/grupos (⚠️ 404) |
| Bodegas | `POST /warehouses` | Bodegas (seriales de facturación, isMain/isActive) |
| Ventas | `POST /sales/pendings` | Pedidos pendientes |
| Ventas | `POST /sales/traslades` | Traslados entre bodegas |
| Ventas | `POST /sales/history` | Histórico (⚠️ 500) |
| Reportes | `GET /sales/report/general` | Ventas por documento (utilidad/IVA) |
| Reportes | `GET /sales/report/internal` | Detalle por línea/cliente |
| Cartera | `POST /wallet` · `POST /wallet/internal` · `POST /wallet/history` | Cartera / crédito / movimientos |
| Proveedores | `POST /suppliers/list` | Proveedores (términos, cupo) |
| Empleados | `POST /employees` | Ficha extendida de empleados |
| Empleados | `POST /employees/list` | Listado paginado |
| Empleados | `POST /employees/register` | Alta (multipart, con foto) |
| Empleados | `GET /employees/roles` | Roles por área |
| Empleados | `POST /employees/permissions` | Permisos por módulo (CRUD) |
| Empleados | `POST /employees/by-role` | Lista para asignaciones |
| Media | `GET /avatars/<archivo>` | Imágenes/avatares |

*(El detalle de request/response de cada endpoint está en `documentacion_ip_online.md`.)*

---

# PARTE H — MODELOS DE DATOS (campos establecidos por modelo)

> Campos reales observados en la API (nombres tal cual los usa el sistema; valores de ejemplo).

### Usuario / sesión (login)
`userId, companyId, warehouseId, userType, priceType, identification, email, name, lastName, photo,
comissionRate, companyInformation{ businessName, nit, typeIdentification, email, phone, cellPhone,
legalRepresentative, customerType, personType, regimeType, fiscalResponsability, mailInvoicing,
corporateName, tradeName, cityAndDepartment, address, zipCode, … }`

### Producto
`productId, code, productInformation{ brandName, categoryName, modelName, description, productImage,
date, isActive, isNew, isPending, privacyState, discount }, prices[ { productPriceId, price } ]
(niveles P0–P3), locations[ { locationCode, warehouseId, productLocationId, physicalStock, stockMax } ],
inventory{ physicalTotal, inCart, verification, picking, picked, invoicingPending, reservedTotal,
availableInStore, systemTotal, maxCapacity }, statusFlags{ isPublic, isPrivate, isActive, isInactive,
isPromotion, isNew, hasImages, noImages, isPending }, stock{ minStock, maxStock } }`
**Alta/edición (UI):** `código, códigoFabricanteSKU, códigoProveedor, códigoPaquete, códigoFamiliar,
categoría, descripción, palabrasClaves, modelos, marca, familia, costos(costo|precio),
topeCantidad(min|max), cantidad, ubicaciónGeneral, ubicaciónIA, dimensiones(W|L|H), peso,
flags(Prioridad, ReposiciónAutomática, Vista, Estado)`

### Carrito / línea de venta
`cartId, userId, companyId, productId, sellerId, warehouseId, auxWarehouseId, quantity, discount,
price, uuid, typeCart, saleType, paymentMethod, productInformation{ code, description, categoryName,
modelName, brandName, brandImage, url }`

### Pedido / venta (pipeline)
`N° Pedido (PD-xxxx), N° Factura, tipoPedido, fecha, estado(Pendiente/Verification/Picking/Invoicing/
Dispatch), métodoPago(credit/cashier), valor, pagos, embalaje{ productos }, direcciónEntrega,
tipoFacturación(Electrónica/…), historialYMovimientos[ { etapa(Picking/Facturación/Despacho),
entrada, salida, agente, tiempoMin } ]`

### Reporte de ventas (general)
`id, clientId, warehouseId, companyId, clientName, businessName, branch, seller, documentType,
documentNumber, documentCode, saleDate, saleTime, dateISO, baseValue, ivaAmount, ivaPercentage,
totalCost, profit, profitPercentage, status`
### Reporte de ventas (interno / por línea)
`saleId, quantity, unitPrice, basePrice, discount, discountPercentage, ivaAmount, ivaPercentage,
totalAmount, cost, profit, profitPercentage, productInformation{ … }`

### Cartera
- **Cliente:** `cliente, ubicación, estadoContacto, últimoPago, cupo, cupoDisponible, adeudado, pendiente`
- **Estado de cuenta (por pedido):** `N° Pedido, valor, pagosVerificados, porVerificar, pendiente,
  fechaLímitePago, estado`
- **Pago online:** `cliente, canal(TiendaOnline), fecha, N° Pago(PG-xxx), N° Pedido(PD-xxxx),
  medioPago(Transferencia/Anticipo), totalPagos, estado(Verificado/Pendiente/Rechazado),
  banco, fechaPago, valor, N° Comprobante, referencia(RFP-…)`
- **Historial de pagos:** `cliente, canal, fecha, N° Pago, valor, N° Pedido, agenteVerificación,
  estado(Verificado/Anulado/Ocupado)`

### Bodega (warehouse)
`warehouseId, name, address, electronicBillingSerial, transferSerial, remissionSerial, saleSerial,
isMain, isActive`

### Catálogos
`Categoría{ categoryId, name }` · `Marca{ brandId, name, image }` · `Modelo{ modelId, name }`
### Proveedor
`supplierId, companyId, name, documentType, documentId, email, phone, address, city, country,
contactName, contactPhone, contactEmail, paymentTerms, creditLimit, notes, isActive, createdAt`

### Empleado
`employeeId, userId, name, lastName, identification, identificationType, email, phone, photo,
workModality, employmentStatus(activo/licencia/retirado/pendiente), branches[ { branchId, branchName,
isPrimary } ], roles[ { roleId, roleName } ], inmediateSupervisor, country, department, city,
neighborhood, address, cargos, áreas`
- **Rol:** `area{ areaId, areaName, areaIcon } → roles[ { roleId, roleName, description, permissions,
  assignable, usersCount } ]`
- **Permisos:** `modules[ { moduleId, moduleKey, canCreate, canRead, canUpdate, canDelete } ]`

### Traslado
`usuario, fecha, tipo(General), origen(bodega), destino(bodega), productos(líneas|unidades), estado`
· **Ingreso:** `tipos(verification/rejected), origen, destino, códigoDeEntrega`

---

# PARTE I — RECOMENDACIONES PARA EL REFACTOR

**Prioridad 1 — Que funcione (corregir lo roto):**
1. Reparar los drawers/acciones muertas (Traslados general, Ingreso traslado) y los endpoints
   `/families` (404), `/sales/history` (500) y `/inventory/createProduct` (400).
2. Unificar los **dos "Historial de pedidos"** en una sola vista con filtros propios (fecha, estado,
   cliente), no el filtro de catálogo.
3. Añadir **estados de carga** (spinners) para evitar el "Información no disponible" momentáneo.

**Prioridad 2 — Datos y seguridad:**
4. Separar **producción de datos de prueba**; limpiar registros basura.
5. Derivar `companyId` del **token** en el backend (no confiar en el body).
6. **Enmascarar** números de cuenta bancaria en notificaciones; revisar PII expuesta en listados.
7. Corregir stocks negativos (validaciones de inventario).

**Prioridad 3 — Consistencia y arquitectura:**
8. **i18n**: traducir "Create New Product"/"Edit Product"; corregir typo "Visla"→"Vista";
   "RFP-undefined".
9. Normalizar la **API a REST** (GET para lecturas; PUT/PATCH/DELETE donde corresponda) y estandarizar
   el envelope/paginación.
10. Consolidar componentes duplicados (tablas, drawers, filtros) en componentes reutilizables.

**Prioridad 4 — Producto / negocio:**
11. Potenciar la **Ubicación IA** (ya existe) y el **control de tiempos por etapa** del pipeline como
    diferenciadores (eficiencia de surtido).
12. Tablero/KPIs operativos: tasa de entrega, tiempos de picking, cartera vencida, rotación por bodega.

---

*Documento consolidado del estado actual de "IP Online" para el refactor. Estructura, lógica,
procesos, endpoints y modelos; sin datos personales reales ni credenciales. Documentos de apoyo:
`documentacion_ip_online.md` (endpoints detallados), `recorrido_vistas_ip_online.md` (walkthrough
vista por vista), `reporte_reconocimiento_ip_online.md` (reconocimiento funcional).*

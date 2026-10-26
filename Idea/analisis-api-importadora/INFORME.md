# Informe del análisis de la API de Gestión Importadora

Estado: **fases 1 a 6 entregadas** (la matriz está en `endpoints.xlsx`). Fecha: 2026-10-24.

## 1. Resumen
- El Swagger define **185 rutas, 189 operaciones y 27 grupos** (362 modelos).
- `config.ts` declara **99 entradas**; la app usa **43 operaciones** del backend.
- Clasificación de las 189 operaciones: **85 lectura** (incluye los POST que consultan, también 15 de SIIGO/Sync), **87 escritura**, **14 críticas** (sincronizar y escribir en SIIGO/Sync) y **3 de sesión**.
- Solo **22 de las 70 lecturas** las usa hoy la app.

## 2. Validación de `config.ts`
Se comparó cada entrada con el Swagger (ruta y método) y con el método que la app llama de verdad (`node sonda.mjs config`).

**Resultado: 0 errores.** Las 99 rutas existen en el Swagger y ningún método usado por la app contradice al Swagger.

| # | Hallazgo | Detalle | Qué hacer |
|---|---|---|---|
| 1 | Comentario de `EMPLOYEES.BASE` dice "GET" | El Swagger define `/employees` como PUT, POST y DELETE (el POST es "Get all employees with filters") | Corregir el comentario a POST, o confirmarlo con la respuesta real |
| 2 | Comentario de `EMPLOYEES.LIST` dice "GET" | El Swagger define POST y la app ya llama POST | Corregir el comentario (el código está bien) |
| 3 | `EMPLOYEES.ROLES` y `EMPLOYEES.ROLE` apuntan a la misma ruta `/employees/roles` | El Swagger la define como GET; la app llama GET sin cuerpo; tu comentario habla de un cuerpo `{companyId, roleName}` | Dejar una sola clave; confirmar en la fase 3 qué devuelve |
| 4 | 57 de 99 claves no las usa ninguna parte de la app | Son rutas declaradas para fases futuras (reportes, SIIGO, pagos extra, etc.) | Informativo |
| 5 | 89 de 189 operaciones del Swagger no están en `config.ts` | SIIGO 16, Quotations 13, Sync 13, Inventory 11, Suppliers 10, Management 9, Purchase Orders 8, Companies 5, Employees 2, Payments 2 | Se agregan cuando se integre cada grupo |

### Observaciones tuyas que se verifican con la respuesta real (fase 3)
| Endpoint | Tu observación | Qué se comprueba |
|---|---|---|
| `/employees/roles` | No devuelve roles: devuelve empleados (id, nombre, razón social, identificación, foto) | Forma real de la respuesta; si cambia con el cuerpo `{companyId, roleName}` |
| `/employees/permissions` | Responde "Access denied" aun con un `employeeId` válido; cuando responde, `modules` viene vacío | Qué condición hace que niegue el acceso y si `modules` llega alguna vez con datos |
| `/employees` y `/employees/list` | Ficha completa de empleados con ramas, roles y estado | Campos reales, tipos y paginación |
| `/users` | Tabla central de actores (clientes, vendedores, proveedores, agentes) | Qué campo distingue el tipo de actor |

## 3. Hallazgos preliminares solo del Swagger
- **Sin token según el Swagger:** `POST /payments/register` y `PUT /users/credit` aparecen sin seguridad (`security` vacío). Son escrituras sensibles (abonos y cupos); conviene confirmar si el backend de verdad no exige token.
- **Lecturas con lista y sin paginación documentada:** 14 de las lecturas devuelven lista sin `meta`; la app asume `{data, meta}` en los listados.
- **Operaciones mal nombradas para su método:** `POST /companies` es "Create a new company" y `POST /management/saleLocationsPicking` es "Update sale locations": son POST pero escriben (por eso se tratan como escritura, no como lectura).

## 4. Inventario por grupo (lectura / escritura / crítico / sesión)
| Grupo | Lectura | Escritura | Crítico | Sesión |
|---|---|---|---|---|
| Auth | 0 | 0 | 0 | 3 |
| Brands, Categories, Models, Warehouses | 1 c/u | 2 c/u | 0 | 0 |
| Carts | 1 | 5 | 0 | 0 |
| Companies | 2 | 3 | 0 | 0 |
| Customers | 2 | 7 | 0 | 0 |
| Directions | 1 | 3 | 0 | 0 |
| Discounts | 1 | 5 | 0 | 0 |
| Employees | 7 | 5 | 0 | 0 |
| health | 2 | 0 | 0 | 0 |
| Inventory | 8 | 7 | 0 | 0 |
| Management | 3 | 6 | 0 | 0 |
| Orders | 1 | 0 | 0 | 0 |
| Payments | 4 | 7 | 0 | 0 |
| Products | 1 | 1 | 0 | 0 |
| Purchase Orders | 3 | 5 | 0 | 0 |
| Quotations | 7 | 6 | 0 | 0 |
| Reports | 4 | 0 | 0 | 0 |
| Sales | 7 | 5 | 0 | 0 |
| Search | 1 | 0 | 0 | 0 |
| SIIGO | 0 | 0 | 16 | 0 |
| Suppliers | 4 | 6 | 0 | 0 |
| Sync | 0 | 0 | 13 | 0 |
| Users | 3 | 8 | 0 | 0 |
| Wallet | 4 | 0 | 0 | 0 |

El detalle por operación (cuerpo, respuesta documentada, si la usa la app) está en `datos/respuestas.json`.

## 5. Resultado de la sonda (fases 3 y 4)
Se llamó a **84 operaciones de lectura** con `companyId` 1 (base `testpremium`, según un mensaje de error del backend). El detalle de cada una está en `endpoints.xlsx`, hoja **Endpoints**; los campos, en la hoja **Campos** (842 filas con tipo, vacíos, ejemplo enmascarado, significado y valor para la operación).

| Estado | Operaciones | Cuáles |
|---|---|---|
| Completo | 34 | marcas, categorías, modelos, bodegas, empresas, productos, inventario (6), búsqueda, usuarios, direcciones, pedido por id, proveedores, resúmenes de pagos y compras, `sync/*` |
| Incompleto (difiere del Swagger o desgloses en null) | 10 | `/wallet`, `/wallet/history`, `/employees`, `/employees/permissions` (`modules` vacío), `/reports/*`, `/sales/summary` |
| Vacío (sin datos con la prueba) | 11 | descuentos, pagos, pedidos pendientes, traslados, órdenes, `/wallet/internal`, `/purchases`, `/suppliers/products`, `/sales/report/*` |
| Roto (500) | 13 | `/sales/history`, `/wallet/summary`, `/customers/favorites` (falta la tabla `userfavorites`) y 10 de `/siigo/*` (empresa sin configuración SIIGO) |
| Sin utilidad | 3 | `/quotations/brands`, `/categories`, `/models` solo responden "Redirect" |
| Error de uso | 2 | `GET /companies/id` (400 aunque se envíe `?id=`) y `GET /employees/{id}` (404 con un id inexistente) |
| Sin probar | 11 | faltan datos de dominio: `carts`, `check-email`, `searchLocation`, `turn360degree`, `management`, `saleOrders`, `payments/detail`, `purchases/detail`, `quotations/{id}`, `sync/status`, `validate-document` |

### Tus observaciones de `config.ts`, verificadas
| Endpoint | Tu observación | Real |
|---|---|---|
| `/employees/roles` | Devuelve empleados | **No**: devuelve áreas (`areaId`, `areaName`) con sus roles (`roleId`, `roleName`, `usersCount`). El comentario está desactualizado. Las áreas sin roles llegan con `roles: null` |
| `/employees/permissions` | "Access denied" y `modules` vacío | Con un `employeeId` válido responde **200** con ficha y sucursales, pero **`modules` llega vacío**: la matriz de permisos aún no se puede armar. El "Access denied" no se reprodujo (falta probar otro empleado o rol) |
| `/employees` y `/employees/list` | Ficha completa | Ciertas: `/employees` trae 35 campos pero **no pagina** (ignora `pageSize`); `/employees/list` pagina con otro formato (`totalCount`, `page`, `limit`) |
| `/users` | Tabla central de actores | Cierta: el campo `userType` distingue el actor; `companyInformation` llega casi vacía |

## 6. Cómo se manejan y relacionan los datos
La hoja **Relaciones** de `endpoints.xlsx` lo detalla. En resumen: todo cuelga de `companyId`; las personas (clientes, vendedores, proveedores, agentes) son filas de `users` (`userId`) y un empleado es un `userId` con ficha laboral (`employeeId`); el stock vive en `productLocationId` (producto + bodega + ubicación); el pedido (`saleId`, `serialCode` PD-xxxx) apunta a cliente, vendedor y bodega, y sus pagos y su cartera cuelgan de `saleId`.

Inconsistencias de contrato que la v3 debe absorber con adaptadores:
- `phone` y `cellPhone` llegan como texto en unos endpoints y como número en otros; `isActive` y `discount` llegan como booleano o número.
- Nombres escritos distinto: `created_at`, `createdAt`, `update_at`, `updateAt`, `updated_at`; `comissionRate`, `ubicationInformation`.
- `typeIdentification` duplica `identificationType`; `corporateName` duplica `businessName`.
- Paginación sin una forma única: `meta.totalRecords` (la mayoría), `totalCount/limit` (`/employees/list`), `totalRows` con `data` anidado (`/quotations`) o ninguna (`/employees`, `/employees/by-role`).
- `/inventory/control` y `/inventory/filter` devuelven lo mismo (8.205 productos); `/quotations/brands|categories|models` solo redirigen.
- Las fechas vacías llegan como `0001-01-01T00:00:00Z` y los objetos anidados vacíos llegan con ceros en vez de `null` (por ejemplo `paymentInformation`).

## 7. Prioridad para consumir en la versión 3
Ordenada por lo que desbloquea. Con P0 y P1 se puede vender de punta a punta.

| Prioridad | Qué desbloquea | Endpoints | Estado real |
|---|---|---|---|
| **P0 · Base** | Entrar, saber quién eres y en qué bodega | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/health`, `/warehouses`, `/employees/permissions`, `/employees/roles`, `/companies`, `/users/{id}` | Funcionan; falta `modules` real en permisos |
| **P1 · Tienda y venta** | Catálogo, carrito, cliente y pedido | `/brands`, `/categories`, `/models`, `/products`, `/inventory/search`, `/search`, `/inventory/control`, `/carts*`, `/users`, `/directions`, `/discounts`, `/users/validate-document`, `/customers/check-email`, `/sales/register`, `/sales/detail`, `/sales/pendings`, `/management/saleId`, `/orders`, `/payments/register`, `/sales/cancel`, `/sales/approved`, `PUT /sales/status` | Las lecturas funcionan; **carritos, validaciones y todas las escrituras están sin probar** |
| **P2 · Caja, cartera y bodega** | Cobrar, controlar crédito y mover mercancía | `/wallet`, `/wallet/history`, `/wallet/internal`, `/payments*`, `/sales/traslades*`, `/management/*`, `/inventory/locations`, `/inventory/countLocations`, `/employees`, `/employees/list`, `/customers/*` | `/wallet` difiere del Swagger; `/wallet/summary` y `/sales/history` están rotos |
| **P3 · Gestión** | Reportes, cotizaciones, proveedores y compras | `/reports/*`, `/sales/summary`, `/quotations*`, `/suppliers*`, `/purchases*` | Reportes con desgloses en null |
| **P4 · Después** | Contabilidad y sincronización | `/siigo/*`, `/sync/*` | SIIGO sin configurar (500) |

Lo que debe arreglar el backend antes de que la v3 lo consuma: la tabla `userfavorites`, `/wallet/summary`, `/sales/history`, `modules` en permisos, el 400 de `/companies/id`, los desgloses en null de los reportes y la paginación de empleados.

## 8. Estado del repositorio de la app y plan detenido
- Rama `main`, árbol limpio, `tsc -b` sin errores. Último commit: "ajustes sobre los endpoints".
- El **plan detenido** es el del ciclo de sesión (README de la raíz). Ya están en el código: `LOGOUT` en `config.ts`, `updateTokens`, `auth.session.constants.ts`, `auth.token.ts` (con prueba), `logoutRequest`, `refreshSessionThunk`, `LogoutReason`, `ConfirmDialog` y `useSessionActivity` montado en `ErpLayout`.
- Falta o está sin verificar: el reintento tras 401 con `setRefreshHandler` (opcional, no existe), el texto `LOGOUT_CONFIRM_TEXTS` con ese nombre, el paso 12 (reabrir el socket con el token nuevo), la actualización de `CONVENTIONS.md` y `ESTRUCTURA.md`, y las pruebas con red simulada.
- Con la API real, la app consume hoy sesión, `/health` y `/warehouses`; tienda, cartera, traslados y clientes siguen en parte con datos de ejemplo.

## 9. Pendiente
- Probar los 11 sin probar y los 11 vacíos con valores en `EXTRA` (estado de pedido, `uuid` de carrito, correo de prueba).
- Acordar con el backend los puntos de la sección 7.
- Corregir en `config.ts` (desde el repo de la app, no desde aquí): los comentarios de `EMPLOYEES.BASE` y `EMPLOYEES.LIST` (son POST), las claves duplicadas `EMPLOYEES.ROLES` y `EMPLOYEES.ROLE`, y la descripción de `/employees/roles`.

## 10. Revisión de E1 a E5 y avance de E6 en la app
Se contrastó lo construido con las respuestas reales. Respaldo previo de `src` en la carpeta temporal de la sesión; sin commits.

**Errores encontrados en E1 a E5 (corregidos)**
| Fase | Qué asumía la app | Qué manda la API real | Arreglo |
|---|---|---|---|
| E2 productos | `prices[].type` = P0 a P3 | `type` = `sale` en todas las filas: la tarjeta mostraba precio 0 | Si no hay niveles válidos, P0 a P3 salen por orden de `productPriceId` (el mayor es P0) |
| E5 cartera | `creditAmount`, `creditDays`, `verifiedPayments` planos | El crédito va en `creditInformation { quota, subtract, days }` | El adaptador lee la forma real; los planos quedan de respaldo |
| E5 cartera | Facturas con `creditDays` propio y fechas válidas | Las facturas no traen días y las fechas vacías llegan como `0001-01-01` | Se usan los días del cliente y esas fechas cuentan como "sin fecha" |
| E5 cartera | `/wallet/summary` siempre responde | Responde 500 | Las tarjetas muestran "No disponible" en vez de `$ 0` |

**E6 aplicado**
- **Finalizar pedido:** antes el botón solo mostraba un aviso. Ahora pide confirmación, deja elegir el medio de pago y llama a `POST /sales/register` con el uuid del carrito; al terminar olvida el carrito y recarga el stock. Verificado contra un servidor falso con las formas reales.
- **Tienda > Bandeja de Pedidos:** `POST /sales/pendings` devuelve carritos guardados (uuid, líneas, unidades), no ventas. La pantalla los lista y "Retomar" vuelve a abrir ese carrito.
- **Tienda > Historial de Ventas:** conectado a `POST /sales/history`. El backend hoy responde 500: la pantalla muestra el error con "Reintentar".
- **Traslados:** las líneas se leen con `productCode` y `productName` (antes `code` y `description`, que no existen). Ya no se inventa un serial al azar si el backend no lo devuelve. La búsqueda de repuestos usa `POST /search` en el servidor en vez de filtrar 40 productos en el navegador. Los errores ya no se tragan en silencio.

**Pendiente de confirmar con datos reales**
- Medios de pago aceptados por `/sales/register`: solo `cash` está confirmado.
- Qué devuelve `/sales/register` (el Swagger no lo documenta) y si `serialCode` viene en la respuesta.
- Qué significa `creditInformation.subtract` frente a `sumAmount` (cupo usado o saldo).
- `/sales/pendings` y `/sales/traslades` llegaron vacíos con `userId` 948 y bodega 1: probar con el vendedor 315 y la bodega 1, donde existe la venta 91486.
- Si `/sales/traslades` con `warehouseId` trae entrantes y salientes o solo uno de los dos.

## 11. E7 · Reportes aplicado en la app
Tres pantallas nuevas en el menú Reportes, con la feature `reports`:
| Pantalla | Endpoints | Rango | Qué muestra |
|---|---|---|---|
| Ventas Diarias | `POST /sales/summary` | hoy por defecto | 7 totales: ventas, completadas, pendientes, anuladas, ingresos, ingresos completados y valor promedio |
| Reporte General | `POST /reports/financial` y `POST /reports/customers` | últimos 30 días | 8 totales financieros y 5 de clientes; cada sección falla y se reintenta por separado |
| Valoración Inventario | `POST /reports/inventory` | sin fechas | productos, unidades, valor, poco stock y agotados |

Decisiones tomadas por los hallazgos:
- **Sin gráficas:** los desgloses (`salesByDay`, `topProducts`, `salesByChannel`, `revenueByMonth`, `topCustomers`, `stockByBrand`, `stockByCategory`, `lowStockProducts`) llegan `null`. Se muestran solo totales; cuando el backend los entregue se agregan.
- **No se usan** `GET /sales/report/general` ni `/internal`: devuelven lista vacía.
- **Fechas locales:** "hoy" usa la fecha del navegador, no UTC, para que no cambie de día a las 7 p. m.
- **Rango inválido:** no se llama al backend y se avisa.

Pendiente de confirmar con datos reales: si `grossMargin` llega como porcentaje (33,3) o como fracción (0,333), y qué valores acepta el campo `format` que el Swagger lista como obligatorio en los reportes (la sonda respondió 200 sin enviarlo).

## 12. E8 · Administración aplicado en la app
Antes de construir se contrastó lo que ya existía con las respuestas reales y aparecieron errores que estaban dejando pantallas vacías o con datos recortados.

**Errores encontrados y corregidos**
| Dónde | Qué pasaba | Arreglo |
|---|---|---|
| Empleados | Pedía `POST /employees/list`, que devuelve un objeto `{employees, totalCount...}` y no una lista: el directorio quedaba **siempre vacío** | Usa `POST /employees` (ficha completa con `roles` y `branches`, sin paginar) y filtra en pantalla por texto y por sede |
| Roles | `GET /employees/roles` iba sin `companyId` y se leía como lista de roles; devuelve **áreas con roles** | Envía `companyId` y aplana las áreas |
| Roles y Permisos | Con `modules` vacío (siempre, hoy) la matriz mostraba "crear y editar" en todo y al guardar lo enviaba | Lo que falta se muestra como **solo lectura** y hay un aviso de que no son los permisos reales |
| Catálogos | Pedía 500 filas por catálogo; hay 529 categorías y 552 modelos: faltaban 29 y 52 | Recorre todas las páginas |
| Búsqueda de productos | `POST /inventory/search` iba sin `type`, obligatorio en el Swagger | Envía `type: "product"` |
| Traslados | La búsqueda de repuestos traía 40 productos de más de 8.000 y filtraba en el navegador | Usa `POST /search` en el servidor |

**Pantallas nuevas**
| Pantalla | Endpoints | Notas |
|---|---|---|
| Gestión Roles > Proveedores | `POST /suppliers/list`, `GET /suppliers/summary` | Búsqueda en el servidor; si el nombre llega vacío usa el del contacto |
| Gestión Inventario > Control de Productos | `POST /inventory/filter`, `POST /inventory/search` | Existencia por bodega activa, total físico, reservado, disponible y alerta de poco stock. `/inventory/control` y `/inventory/filter` devuelven lo mismo |
| Gestión Inventario > Marcas y Categorías | `POST /brands`, `/categories`, `/models` | Solo consulta; no se muestran logos porque llegan como rutas relativas sin servidor |

**Sin pantalla (a propósito)**
- Auditoría: ningún endpoint la respalda.
- Transportadoras y Órdenes de Compra: no hay menú; `/purchases` devuelve `data: null`.
- Crear y editar marcas, categorías, modelos y proveedores: están declarados pero sin probar contra el backend.
- Empresas (`GET /companies`): devuelve todas las empresas; no se usa en pantalla.

**Pendiente de confirmar con datos reales**
- Si los totales de `inventory.*` suman todas las bodegas (la app los rotula "Total físico" y calcula la bodega activa aparte).
- Si `hasStock` en `/inventory/filter` se comporta igual que en `/products`.
- El "Access denied" de `/employees/permissions` no se reprodujo; la pantalla muestra el mensaje del servidor si ocurre.

## 13. E9 · Management y Sync (con el resultado del barrido)
**Qué reveló el barrido** (`node sonda.mjs barrido`, 64 consultas de lectura, todas respondieron 200):

| Endpoint | Resultado |
|---|---|
| `POST /management` | Devuelve **contadores por etapa**: Verification 13, Picking 1, Packing 0, Invoicing 41, Dispatch 17.657, Sent 198. Estos totales **no dependen de `state`**; lo que cambia con `state` son los contadores `orders*` (desglose por canal de esa etapa). Cualquier texto como `state` responde 200, incluso `pending` o `cancelled`, que no son etapas |
| `POST /management/saleOrders` | Las 54 combinaciones probadas devolvieron 200 **sin filas**, aunque hay 17.657 pedidos en despacho: los valores de canal que probé (`store`, `online`, `whatsapp`, `pos`, `web`) no existen |
| `POST /sync/devices` | 3 dispositivos de prueba (`test-device-...`), sin ninguna sincronización (`lastSyncAt` null) |
| `POST /sync/status` | Funciona con un `deviceId` real: `pendingUp`, `pendingDown`, `conflicts`, `queueSize` (todos 0), `isOnline` |

**Valores de dominio descubiertos**
- **Canal de venta** (`saleChannel`): `majority`, `immediate`, `corporate`, `minority`, `direct` (salen de los contadores `orders*` y el pedido 91486 trae `corporate`).
- **Tipo de venta** (`saleType`): `sale` y `traslade`.
- **Estado del pedido** (`invoiceStatus`): `verification`, `picking`, `packing`, `invoicing`, `dispatch` (las etapas); el pedido 91486 además trae `status: "pending"`.
- **Nivel de precio de un cliente** (`priceType`): también son palabras (`corporate`, `majority`...), **no** P0 a P3. Por eso la app nunca aplica el nivel de precio del cliente al elegirlo. Falta saber qué nivel (P0 a P3) corresponde a cada palabra: hay 5 palabras y 4 niveles.

**Aplicado en la app**
- Feature `management` y pantalla **Gestión Caja > Facturación Caja**: seis etapas con su conteo y, al elegir una, el desglose por canal y los contadores aparte. Es lo que hoy se puede mostrar con datos verificados.
- `config.ts` ahora declara `MANAGEMENT` (conteos, lista de pedidos y detalle).

**Sigue pendiente**
- La **lista** de pedidos por etapa (`/management/saleOrders`): repetir el barrido con los canales reales (comando en el README, con `CANALES=majority,immediate,corporate,minority,direct` y `ESTADOS=verification,picking,packing,invoicing,dispatch`).
- Historial de Facturación y Cierre de Turno: ningún endpoint de lectura los respalda todavía.
- Sync: no hay pantalla; los 3 dispositivos son de prueba. Solo tendría sentido un diagnóstico dentro de Configuración si el cliente lo pide.
- Escrituras de Management (`changeId`, `finalizeOrderVerification`, `verifyLocation`, `verifyTransaction`, `saleLocationsPicking`, `cancellationTransactionSale`): no se llaman en producción.

## 14. Qué consume hoy la app, por jerarquía
Cruce de `config.ts` y el código de la app con la prioridad de la sección 7. Detalle por operación: hoja **Endpoints** (columnas "La usa la app", "Archivos que la consumen" y "Campos obligatorios sin ver en el consumo"). Como la comparación se hace por ruta, **56 operaciones figuran como usadas, pero 3 se cuentan de más** (`PUT` y `DELETE /employees` y `POST /employees/access-credentials` comparten ruta con otra que sí se llama): las reales son unas 53.

| Prioridad | Operaciones | Usa la app | Verificadas con respuesta real | Sin verificar |
|---|---|---|---|---|
| **P0 Base** | 11 | 8 | 5 (roles, permisos, `users/{id}`, bodegas, health) | 3 de sesión (login, refresh, logout: no se prueban) |
| **P1 Tienda y venta** | 42 | 29 | 9 lecturas (marcas, categorías, modelos, productos, búsquedas, inventario, usuarios, direcciones) | 5 lecturas sin datos (carritos, descuentos, pendientes, validar correo y documento) y **15 escrituras** |
| **P2 Caja, cartera, bodega** | 55 | 14 | 4 (empleados, cartera, resumen de ventas, pedidos por etapa) | 2 rotas en el backend (`/sales/history`, `/wallet/summary`), 2 vacías (traslados, `/wallet/internal`) y 5 escrituras |
| **P3 Gestión** | 52 | 5 | 5 (reportes con totales, proveedores) | Los desgloses de los reportes llegan `null` |
| **P4 Integraciones** | 29 | 0 | | SIIGO sin configurar; Sync sin uso |

**Validación del consumo (estática, sin red).** Para cada operación usada se buscó el archivo que la llama y se comprobó que aparecen todos los campos obligatorios del cuerpo según el Swagger: **0 faltantes** en las 56. (Esta revisión habría detectado el `type` que faltaba en la búsqueda de productos.)

**Validación del consumo (con la API real).** Se generó `datos/cuerpos-app.json` con las **peticiones exactas que arman los services de la app** (30 de lectura y 7 de escritura, obtenidas con una prueba temporal sin red). Las de escritura solo se revisan; las de lectura se repiten contra la API real con:

```powershell
$env:API_TOKEN = "tu_token"
$env:COMPANY_ID = "1"; $env:WAREHOUSE_ID = "1"; $env:USER_ID = "948"
node sonda.mjs reproducir           # plan: muestra cada petición tal como la arma la app
node sonda.mjs reproducir --enviar  # las envía (29, una por una) y guarda el resultado en el mismo archivo
```
Cada una debe responder 200 con `success: true`. Es la prueba de que **la app consume bien**, no solo de que el endpoint existe.

**Sospechas ya visibles en las escrituras** (se revisan con `cuerpos-app.json`, sin llamarlas):
- Los traslados se crean con `invoiceStatus: "pendiente"`, pero los estados reales son `verification`, `picking`, `packing`, `invoicing` y `dispatch`. Probable valor inválido.
- `POST /carts/register` para traslados envía `price: 0` y `typeCart: "traslade"`; falta confirmar que el backend lo acepta.
- El medio de pago `cash` está confirmado; `transfer` y `credit` no.

## 15. Resultado de `reproducir` (29 lecturas tal como las arma la app)
**26 de 29 respondieron bien.** Las 3 que fallaron:

| Petición | Resultado | Causa | Estado |
|---|---|---|---|
| `POST /sales/history` | 500 | Falla del backend (`failed to retrieve histories`) | Sin solución en la app; la pantalla muestra el error con "Reintentar" |
| `POST /wallet/summary` | 500 | Falla del backend (`failed to retrieve wallet summary`) | Las tarjetas de cartera muestran "No disponible" |
| `GET /suppliers/summary` | 400 `companyId is required` | **Error de la app**: el endpoint exige `companyId` en la query y no se enviaba | **Corregido**; el resultado anterior quedó guardado como `resultado_anterior` y la petición ya lleva `params: { companyId }` |

La revisión estática de campos obligatorios no podía detectarlo porque solo mira el cuerpo, no la query de los GET. La reproducción real sí.

**Otros datos que salieron de la reproducción**
- `POST /sales/traslades` **con la bodega 1 y sin `userId` devolvió 20 filas**; con `userId` 948 devolvía 0. Confirma que el filtro por usuario ocultaba los traslados de otros y que quitarlo (como hace ahora la pantalla) era lo correcto.
- `POST /categories` y `POST /models` devolvieron **500 filas** cada uno con `pageSize` 500, pero hay 529 y 552: confirma que sin recorrer páginas se perdían registros (ya corregido).
- `POST /wallet/internal` para el cliente 217 (con crédito) devuelve 0 facturas y `POST /sales/pendings` del usuario 948 devuelve 0: siguen sin poder verificarse con datos.
- Tiempos: 300 a 850 ms por petición en promedio; `GET /employees/roles` tardó 1.108 ms.

## 16. E6 cerrado, y por qué E10 y E11 no tienen pantalla todavía
**E6 · Ventas y pedidos: cerrado**
| Parte | Estado |
|---|---|
| Finalizar pedido desde el carrito (`/sales/register`) | Hecho; el crédito exige cliente |
| Bandeja de Pedidos (`/sales/pendings`) y retomar un carrito | Hecho; sin datos reales con el usuario 948 |
| Historial de Ventas (`/sales/history`) | Hecho; el backend responde 500 |
| **Anular venta** (`/sales/cancel`) | **Hecho**: botón "Anular" en el historial, con motivo obligatorio (mínimo 5 letras), confirmación y permiso de borrado; si el backend la rechaza el diálogo queda abierto |
| **Estados de traslado** | **Corregidos**: la app enviaba `picking_verified` y `packing_verified`, que no existen. Los reales de `PUT /sales/status` son `verification`, `picking`, `dispatch`, `facturar`, `completed` y `cancelled`. Un traslado avanza verification → picking → dispatch y termina en completed (recibido) o cancelled (rechazado). Al crearlo ya no se manda `invoiceStatus: "pendiente"` |
| **Traslados entrantes y salientes** | **Corregido**: `POST /sales/traslades` filtra por la bodega de **destino**, así que la pestaña "Salientes" nunca mostraba nada. Ahora los entrantes salen de pedir la propia bodega y los salientes de las demás, filtrando por origen |
| Verificación de pedidos (Gestión Caja) | Contadores por etapa hechos; la lista queda a la espera del segundo barrido |

**E10 · SIIGO: sin pantalla.** Las 10 consultas de lectura respondieron 500 con `SIIGO configuration not found for this company`: la empresa no tiene SIIGO configurado, así que no hay ninguna respuesta que sirva de contrato. Las otras 6 operaciones escriben en el sistema contable externo. Se retoma cuando exista una configuración de prueba.

**E11 · Quotations: sin pantalla.** `GET /quotations/stats` dice que hay **10 cotizaciones** (9 borradores, 1 enviada, por $11.900), pero `POST /quotations` y `/history` devuelven 0 filas para el vendedor 948: el filtro por usuario las oculta, igual que pasó con los traslados. Además el menú no tiene un lugar para cotizaciones. Falta: el `userId` o `sellerId` de quien las creó (o probar sin esos filtros) y decidir en qué parte del menú viven.

**Pendientes que dependen del backend o de datos**
- Arreglar `/sales/history` y `/wallet/summary` (500).
- Configurar SIIGO para una empresa de prueba.
- Un vendedor con pedidos pendientes y cotizaciones para verificar `/sales/pendings`, `/quotations` y la lista de `/management/saleOrders`.
- Equivalencia de `priceType` (majority, immediate, corporate, minority, direct) con los niveles P0 a P3.

## 17. Lista de pedidos por etapa (resultado del segundo barrido)
El barrido con los valores reales confirmó cómo se consulta `POST /management/saleOrders`:

| Dato | Resultado |
|---|---|
| Canales válidos (`saleChannel`) | `majority`, `immediate`, `corporate`, `minority`, `direct`. Con un canal inventado responde 200 y lista vacía, sin error |
| Etapas válidas (`invoiceStatus`) | `verification`, `picking`, `packing`, `invoicing`, `dispatch` |
| Tipo de venta | `sale` (los traslados no aparecen aquí) |
| Coherencia con `/management` | El `totalRecords` de cada combinación coincide con el contador: verification/corporate 13, picking/immediate 1, invoicing/immediate 41, dispatch/immediate 17.655 y dispatch/corporate 2 |
| Cada fila | Pedido completo: cabecera, cliente, vendedor, líneas, `isPause`, `verifiedTransaction` y `verifiedLocation` |

**Aplicado en la app.** En Gestión Caja > Facturación Caja, al elegir una etapa, los canales con pedidos se vuelven botones ("Corporativo · ver pedidos"); al pulsar uno aparece la tabla con pedido, fecha, cliente, vendedor, indicadores de control y total, con paginador de 20 en 20. Cambiar de etapa limpia la lista. "Enviados" no tiene lista porque no es una etapa que acepte el backend. Es solo consulta: verificar, asignar o cancelar un pedido (`/management/verify*`, `changeId`) son escrituras y no se llaman.

**Sigue pendiente:** el resultado de `niveles` (equivalencia de `priceType` con P0 a P3) y de `vendedores` (quién tiene pedidos pendientes y cotizaciones); el archivo todavía no los trae.

## 18. Resultado de `niveles` y `vendedores`
**`niveles` (nivel de precio de cada `priceType`): no concluyente.** Se revisaron 60 ventas y 170 líneas, pero **105 líneas (62%) se vendieron a un precio que ya no está en la lista actual del producto** (precios que cambiaron o descuentos), así que solo 28 líneas pudieron votar:

| `priceType` | Posición de la lista de precios | Líneas |
|---|---|---|
| `corporate` | 0 (P0) en 6 de 6 | 6 |
| `minority` | 0 (P0) en 1 de 1 | 1 |
| `majority` | 1 (P1) en 13 de 21; también 6 veces en P0 y 2 en P2/P3 | 21 |

Ninguna equivalencia es firme, y `majority` ni siquiera es consistente. Además el **canal de la venta no sigue al tipo de cliente**: en el canal `immediate` hay 43 clientes `majority`. **No se aplica el nivel automático** hasta que el negocio confirme la tabla; el vendedor sigue eligiendo el nivel a mano en la tarjeta, como hoy.

**`vendedores`: ninguno de los 26 empleados tiene pedidos pendientes ni cotizaciones** (en ninguna de sus bodegas). En esta base no hay carritos guardados, así que Bandeja de Pedidos no se puede verificar con datos reales. Sobre las cotizaciones: `GET /quotations/stats` dice que hay 10, pero las pruebas enviaban `sellerId` y `userId` a la vez y se aplican juntos. Se agregó `node sonda.mjs cotizaciones --enviar`, que consulta la lista sin filtros de persona y con cada estado.

## 19. Cotizaciones: resultado de `cotizaciones`
`POST /quotations` **sí funciona sin filtros de persona**: 10 cotizaciones (9 en `draft`, 1 en `sent`, ninguna aceptada, rechazada, vencida ni convertida). Antes salía vacío porque las pruebas mandaban `sellerId` y `userId` a la vez.

| Dato | Valor |
|---|---|
| Campos de cada fila | `quotationId`, `quotationNumber` (QT-1-81958), `userId`, `sellerId`, `sellerName`, `subtotal`, `taxAmount` (19%), `discountAmount`, `totalAmount`, `status`, `validUntil`, `createdAt`, `updatedAt`, `itemCount`, `notes` |
| Estados vistos | `draft`, `sent` (el Swagger menciona además accepted, rejected, expired y converted) |
| Autor de todas | Un solo vendedor (315), nombre "Test Updated" |
| Contenido | Todas de $1.000 + $190 de IVA, con 0 líneas, creadas en diciembre de 2025 y con `validUntil` ya vencido |

**Conclusión:** son registros de prueba sin líneas. El contrato de la lista sirve, pero no hay datos reales para validar el detalle (`GET /quotations/{id}`) ni la conversión a pedido. Si se construye la pantalla, el sitio natural es Tienda (junto a Catálogo POS, Bandeja de Pedidos e Historial de Ventas) y debería ser de solo consulta: lista con estado, vencimiento y total, más los totales de `GET /quotations/stats` (que además el endpoint ya devuelve: 10 cotizaciones, $11.900, conversión 0%).

## 20. Cotizaciones aplicado en la app
Tienda > **Cotizaciones**, de solo consulta: tres totales (`GET /quotations/stats`), filtro por estado (Todas, Borrador, Enviada, Aceptada, Rechazada, Vencida, Convertida), tabla con número, líneas, creada, cliente, vendedor, estado, vigencia y total, y paginador de 20 en 20.
- La lista se pide **sin `sellerId` ni `userId`** (juntos filtraban por vendedor y cliente a la vez y la dejaban vacía).
- La paginación llega dentro de `data` (`totalRows`, `totalPages`) y el servicio la convierte al formato estándar.
- Una cotización en borrador o enviada con la vigencia pasada se marca **"Vencida"** aunque el backend no cambie su estado.
- No crea, envía ni convierte: esas son escrituras sin probar.

# Plan de ajustes: UI, edición, estado y permisos

> Alcance: **solo** `importadoraApi/` (Go + PostgreSQL) e `importadoraInterfaz/` (React + Redux).
> Este plan se basa en una revisión del código actual (11-nov-2026). Cada punto trae: **estado actual (evidencia)**, **problema**, **ruta de ajuste**, **archivos** y **criterio de aceptación**.
> Los requerimientos que comparten un mismo eje (drawer, tablas, edición, estado, permisos) se agrupan en fases. Al cerrar cada fase hay un **punto de control** para confirmar que lo anterior no se rompió.

### Validación del plan contra el código (11-nov-2026)

Se revisó cada afirmación del plan contra el repositorio. Las correcciones ya están aplicadas en las fases y quedan registradas aquí:

| Punto | Lo que dice el código | Ajuste hecho en el plan |
|---|---|---|
| Regla 4 | `docs/ESTRUCTURA.md` **no** se genera con ningún script: es un documento escrito a mano. | Se actualiza a mano con cada archivo tocado. |
| Regla 5 / 8.3 | La migración existente se llama `20261126_close-plan-gaps.sql`, con fecha posterior a hoy. | Las nuevas usan `20261127_…`, `20261128_…`, para que queden **después** en el orden. |
| Regla 7 | Hay dos lockfiles (`package-lock.json` y `pnpm-lock.yaml`) y `pnpm-workspace.yaml`. | Se usa pnpm y se borra `package-lock.json` en la Fase 0 (confirmar). |
| 2.1 | `CashOrdersPanel` no tiene tabla propia: pasa sus acciones a `OrdersTable`. | Basta corregir el `<th aria-label="Acciones" />` de `OrdersTable.tsx:72`. |
| 2.5 | El estado del empleado se cambia con `PUT /employees/:id` `{status, reason}` y exige `employees:edit`. | Se usa esa misma ruta. El permiso se decide en 8.2-8. |
| 4.3 | `UpdateCategoryRequest` **ya** acepta `parentId`. | «Categoría padre» es un cambio **solo del front**. |
| 5.1 | `LocationDetailPanel.tsx:72` (`content.reload()`) no es un botón: se ejecuta tras reubicar. | Se reemplaza por la actualización del slice, sin botón que quitar. |
| Fase 6 | `sale_items` **tiene** `price_tier`; `cart_items` **no** (solo `unit_price`). `carts.price_tier` es uno por carrito. | Se agrega `price_tier` a `cart_items` (migración + `startdb.pgsql`). |
| Fase 6 (nuevo) | `carts/services/cart_service.go:65,74` usa `actor.ActorID` como `employee_id` también para **admins** (es id de `admins`). `sale_actor_service.go` ya advierte que no se pueden mezclar. | Se agrega el punto 6.4. |
| 8.2-5 | `MainContent.tsx:23-24` **ya** bloquea la pantalla con `hasScreenAccess`. | Se cambia a «verificar», más la validación al rehidratar y la guardia del drawer. |
| 8.2-6 | Los carritos están exentos **a propósito** en `core/bootstrap/routes_guard_test.go` («espacio de trabajo personal»), pero sus servicios solo comprueban la **compañía**, no el dueño (`cart_item_service.go:28-31`). | No se les pone permiso: se exige que el carrito sea **del actor**. |
| 8.2-7 | El front **no** usa `/staff`. | Se elimina el alias sin más. |
| 8.2-9 | `settings:edit` lo exige la ruta del **protector de pantalla** (`screensaver_routes.go:17-18`). El middleware deja mutar al superadmin solo en `screensaver` (no en `settings`), así que hoy el superadmin recibe 403 al guardarlo, aunque el front sí se lo permite. | La ruta pasa a `screensaver:edit` (o a `RequireActors`), alineada con el front. |
| `routes_guard_test.go` | Solo revisa rutas que **escriben**; las 64 lecturas sin permiso pasan la prueba. | 8.3 extiende la prueba a las lecturas. |

---

## 0. Reglas obligatorias para TODO ajuste

1. **Antes de tocar código**, en cada punto:
   - Valida el estado actual: abre los archivos citados, reproduce el caso en la app (`pnpm dev` + API en `:3001`) y confirma la evidencia.
   - Escribe en el commit o PR el **error/requerimiento detectado** y la **ruta de ajuste** elegida.
   - Si la evidencia ya no coincide con este plan, actualiza el diagnóstico antes de seguir.
2. **Línea de diseño**: solo tokens de `src/styles/tokens.css` y las clases comunes ya existentes (`drawer-form*` de `global/components/UI/molecules/form/DrawerFormShell.css`, `data-table*`, `btn-primary`/`btn-secondary`, `Pill`, `RowActions`). No se inventan colores, sombras ni tamaños.
3. **Capas y responsabilidades** (ver `importadoraInterfaz/docs/CONVENTIONS.md`):
   - Frontend: `app → features → global → api`. Dentro de una feature: `screens → components → slices/thunks → services → types/constants`. Una feature usa a otra solo por su `index.ts`. **No se crean componentes nuevos en `app/`.**
   - Backend: `routes → controllers → services → repositories`. La regla de negocio va en `services`, el SQL en `repositories`, el permiso en `routes`.
4. **Comentarios**: cada archivo tocado actualiza su **cabecera** (`// Nombre · qué hace` + `// conecta con:` + `// ojo:`) y los comentarios de las líneas cambiadas. Se borra cualquier comentario que describa un comportamiento retirado. Luego se actualiza **a mano** la entrada de ese archivo en `importadoraInterfaz/docs/ESTRUCTURA.md` (no hay script que lo genere).
5. **Base de datos**: todo cambio de esquema o semilla:
   - Va en una migración nueva e incremental `importadoraApi/src/core/db/migrations/<fecha>_<tema>.sql`. La fecha debe ser **posterior** a `20261126` (la última que existe): `20261127_…`, `20261128_…`. Debe ser idempotente (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), con un comentario de cabecera que explica el porqué. Esta es la **evidencia** de la migración.
   - Se replica **también** en `importadoraApi/src/core/db/startdb.pgsql`, para que el script de creación levante la base completa con su semilla correcta.
   - `Idea/startdb.pgsql` hoy es una copia idéntica. Hay que dejar **una sola fuente**: o se sincroniza en cada cambio, o se reemplaza por una nota que apunte a `src/core/db/startdb.pgsql`. Recomiendo lo segundo.
   - **Nunca** ejecutar `startdb.pgsql` sobre una base existente: es destructivo. Las bases existentes solo reciben la migración.
6. **Endpoints**: todo endpoint nuevo, cambiado o retirado actualiza `importadoraApi/docs/swagger.json`, `importadoraInterfaz/docs/MATRIZ-ENDPOINTS.md`, `importadoraInterfaz/docs/ACCIONES-HTTP-POR-PANTALLA.md`, las constantes de endpoints del front (`src/api/endpoints`) y los flujos e2e de `importadoraApi/scripts/e2e`.
7. **Verificación al cerrar cada punto**:
   - API: `go build ./... && go vet ./... && go test ./...`
   - Front: `pnpm exec tsc -b && pnpm lint && pnpm test && pnpm check:api && pnpm check:type`
   - Hoy todo pasa salvo **2 errores de lint**, que se corrigen en la Fase 0.

---

## Fase 0 · Línea base

| # | Tarea | Detalle |
|---|---|---|
| 0.1 | Rama de trabajo | `feat/ajustes-ui-permisos` desde `main`. |
| 0.2 | Corregir lint | `react-hooks/set-state-in-effect` en `src/features/settings/screens/BackupTab.tsx:27` y en `src/features/transfers/hooks/useTransferRequest.ts:59`. Hay que derivar el valor en el render o inicializarlo con `key`/`useState(() => …)`, sin `setState` dentro de `useEffect`. |
| 0.2b | Un solo gestor de paquetes | Hay `package-lock.json` y `pnpm-lock.yaml`. Se usa pnpm (existe `pnpm-workspace.yaml`): se borra `package-lock.json` y se ajusta el README. Confirmar con el dueño. |
| 0.3 | Captura de referencia | Toma capturas de cada pantalla y drawer actuales (sirven para comparar la línea de diseño al final). |

**Punto de control 0:** la API y el front pasan todas las verificaciones de la regla 7.

---

## Fase 1 · Drawer derecho: responsabilidad, scroll, selección y diseño

> Eje central: `src/app/componentApp/drawerRight/`. El drawer es **uno solo**. Decide qué pintar con `selectDrawerMode` (`drawerRegistry.ts`) y, para acciones, con `formRegistry.ts` + `entries/*.entries.ts`. **Todos** los puntos de esta fase dependen de esto. Por eso va primero.

### 1.1 Analizar y fijar la responsabilidad del drawer (requerimiento «analicemos cómo funciona la responsabilidad del drawer»)

> El texto original de este requerimiento quedó cortado («…validar que a nivel»). Se interpreta como: *cada acción abre en el drawer el contenido correcto, por una sola vía y con el mismo armazón*. **Confírmalo con el dueño antes de cerrar el punto.**

- **Estado actual:**
  - Prioridad de modos en `drawerRegistry.ts:41-55`: `form` (acción abierta) > `cart`/`quotationCart` > `order` > `object` (cartera) > `customer`.
  - Hay drawers **por fuera** de este sistema, con su propio fondo y su propio cierre:
    - `features/returns/components/CreateReturnDrawer.tsx` (usa `cr-drawer-backdrop` y se cierra con clic fuera).
    - `features/employees/components/drawer/CreateEmployeeDrawer.tsx`.
    - `features/auth/components/UserProfileModal.tsx` (es un modal; puede quedarse como modal si así se decide).
  - Esto contradice `CONVENTIONS.md` («DrawerRight… se cierra únicamente con la ✕»).
- **Ruta:**
  1. Documenta en la cabecera de `drawerRegistry.ts` la tabla «modo → quién lo abre → quién lo cierra».
  2. Toda acción que abra un panel lateral se convierte en un `DrawerFormKind` nuevo en `features/navigation/types/navigation.types.ts`, con su entrada en `entries/` (`people`, `inventory` u `operations`). Se borran los fondos y cierres propios.
  3. Regla: abrir una acción (`openDrawerForm`) **reemplaza** lo que hubiera. Cerrar con la ✕ (`closeDrawerForm`) devuelve el modo automático de la pantalla.
- **Criterio:** `grep -rn "backdrop" src/features` no devuelve ningún drawer lateral. Cada acción de cada vista abre su panel con el título y subtítulo correctos de su `FormEntry`.

### 1.2 Scroll vertical general del contenido

- **Estado actual:** `.drawer-right-body` tiene `overflow: hidden` (`DrawerRight.css:39-45`). Solo hacen scroll los formularios que usan `.drawer-form-body` (`DrawerFormShell.css:10-18`) o que tienen su propio scroll (`order-drawer-body`). Estos **20 paneles no usan el armazón común**:
  - `CatalogItemDetailPanel`, `CatalogItemFormPanel`, `CheckoutPanel`
  - `CreateCustomerForm`, `EditCustomerForm`
  - `EmployeeDetailPanel`, `EmployeePermissionsPanel`, `RoleForm`, `RolesView`
  - `EditProductPanel`, `ProductDetailPanel`, `ProductLocationsPanel`
  - `QuotationDetailPanel`, `ReasonFormPanel`
  - `TransferDetailPanel`, `CreateTransferForm`, `ReceiveTransferForm`, `RelocateStockPanel`
  - `EnableCreditPanel`, `CompanyWarehousesPanel`
- **Ruta:** todos los paneles de formulario o detalle usan la estructura `<div|form className="drawer-form"> <div className="drawer-form-body">…</div> <div className="drawer-form-footer">…</div> </div>`. Sus CSS propios se quedan solo con lo específico de cada uno (sin `overflow`, `height` ni `padding` del armazón).
- **Criterio:** con la ventana a 700 px de alto, cada panel hace scroll en su cuerpo y el pie con botones siempre queda a la vista.

### 1.3 Texto seleccionable en drawer y contenido principal

- **Estado actual:** `user-select: none` en `app/layout/ErpLayout.css:10` (todo el layout) y en `app/componentApp/drawerRight/DrawerRight.css:10`. Nada se puede seleccionar.
- **Ruta:**
  1. Quita `user-select: none` de `.store-app-layout` y de `.drawer-right`.
  2. Déjalo **solo** en elementos de control: `SideMenu.css`, `DrawerTab.css`, `WarehouseSelector.css`, `.col-resizer` (`data-table.css:169`), botones e íconos.
  3. Revisa que arrastrar las pestañas del drawer (`useVerticalDrag`) no seleccione texto. Si lo hace, aplica `user-select: none` en el `body` solo mientras dura el arrastre.
- **Criterio:** se puede seleccionar y copiar con el mouse cualquier dato de tablas, detalles y formularios. El menú lateral, las pestañas y los tiradores siguen sin seleccionarse.

### 1.4 Drawer de devoluciones sin línea de diseño

- **Estado actual / causa:** `CreateReturnDrawer.tsx` es un panel propio con fondo oscuro, encabezado propio (`cr-drawer-header`) y estilos `cr-*`. No pasa por `DrawerRight`, `DrawerHeader` ni `drawer-form`. Lo abre `ReturnsScreen.tsx:42` con un estado local `drawerOpen`.
- **Ruta:**
  1. Crea `DrawerFormKind` `'createReturn'` con su entrada en `operations.entries.ts` (ícono, título «Nueva devolución / garantía» y subtítulo).
  2. `ReturnsScreen` despacha `openDrawerForm({ kind: 'createReturn' })`; se elimina el estado local.
  3. El cuerpo (`ReturnSalePicker`, `ReturnItemsPicker`, `ReturnChoiceCards`) se monta dentro de `drawer-form-body` y los botones en `drawer-form-footer`. Se borran `cr-drawer-backdrop`, `cr-drawer-container`, `cr-drawer-header` y `cr-close-btn`. `CreateReturnDrawer.css` se queda solo con las tarjetas de opción, usando tokens.
  4. Al crear, el thunk actualiza la lista (ver Fase 5) y cierra con `closeDrawerForm`.
- **Criterio:** el drawer de devoluciones se ve igual que el de nuevo cliente: mismo encabezado, mismo ancho, mismo pie y se cierra solo con la ✕.

### 1.5 Drawer «Nuevo traslado» sin el diseño correcto

- **Estado actual:** `features/transfers/components/form/CreateTransferForm.tsx` (253 líneas) usa más de 20 clases propias `transfer-*` y no usa `drawer-form`. Además, `DrawerRight.tsx` trata `createTransfer` como caso especial (pestaña lateral y borrador).
- **Ruta:**
  1. Reestructura con `drawer-form` / `drawer-form-section` / `drawer-form-grid` / `drawer-form-field` / `drawer-form-label`, con estas secciones: Origen y destino → Productos (líneas del borrador) → Observación → pie con «Cancelar / Solicitar traslado».
  2. Extrae los bloques visuales (destino, producto enfocado y líneas) a componentes dentro de `transfers/components/form/`. La lógica sigue en `useTransferRequest`.
  3. Haz lo mismo con `ReceiveTransferForm`, `TransferDetailPanel` y `RelocateStockPanel`.
  4. Verifica que **cada acción** de traslados (nuevo, ver detalle, recibir, reubicar) abra su propio `FormEntry`, y que no aparezca el formulario de creación en una acción de detalle.
- **Criterio:** los cuatro paneles de traslados siguen la línea del drawer y cada acción muestra su contenido.

### 1.6 Drawer de permisos del empleado: diseño más simple

- **Estado actual:** `EmployeePermissionsPanel.tsx` → `PermissionsSelector` → `PermissionModuleCard` → `PermissionToggleCard`. Hay tarjetas anidadas por módulo y por pantalla, 153 líneas de CSS en `PermissionsSelector.css`, y no usa `drawer-form`. El hub de permisos se abre «ancho» (`wide: true`, 720 px).
- **Ruta (diseño simple):**
  1. Armazón `drawer-form`. Arriba, un resumen fijo del empleado (nombre, cargo, sede) con una sola línea.
  2. Una **lista por módulo** en acordeón (un módulo abierto a la vez). Cada pantalla es **una fila**: nombre a la izquierda y, a la derecha, casillas compactas para Ver · Crear · Editar · Anular (y Precios donde aplique). Sin tarjetas dentro de tarjetas.
  3. Encabezado de cada módulo con «marcar todo / ninguno» y un contador «3 de 5».
  4. Modo «ver»: las mismas filas en solo lectura, sin pie. Modo «editar»: pie con Cancelar / Guardar.
  5. Las acciones especiales que saldrán de la Fase 6 (por ejemplo «tomar etapa» o «verificar pago») van como filas de casilla dentro de su pantalla.
- **Criterio:** el panel cabe en 400 px sin scroll horizontal, se lee en una columna y guarda exactamente lo marcado.

### 1.7 «Ver detalle» en Gestión de pedidos no abre bien el drawer

- **Estado actual:** `OrdersTable.handleAction('detail')` despacha `openOrder(id)` (`orders.slice.ts:29`). El modo `order` solo se activa si `ui.drawerForm` es `null` (`drawerRegistry.ts:45`) y la pantalla es `shop/orders` o `cashRegister/billingHistory`. `OrderDrawer` pide el detalle con `useOpenOrderDetail`.
- **Causas probables (confirmar reproduciendo):**
  1. Si hay un `drawerForm` abierto (por ejemplo un traslado o una acción previa), el modo `form` gana y el pedido **no se ve**. `openOrder` no cierra el formulario.
  2. `openOrder` sale sin hacer nada si `openId` ya es el mismo (`orders.slice.ts:30`). Si el panel se cerró por otra vía sin `closeOrder`, el clic no hace nada.
  3. Mientras carga, el encabezado muestra la fila; si el detalle falla, solo queda «Reintentar».
- **Ruta:**
  1. `OrdersTable` (y la tabla de Historial de ventas) despachan `closeDrawerForm()` antes de `openOrder`. Mejor aún: un thunk `openOrderDetailThunk` en `orders/thunks` que cierre el formulario, abra el pedido y fije `setRightDrawerOpen(true)`.
  2. Cuando el pedido ya está abierto, `openOrder` vuelve a pedir el detalle si `detail.status` es `failed` o `idle`.
  3. Revisa en la consola de red que `GET /sales/:id` responde 200 y que el adaptador cubre todos los campos (sin `undefined` que rompan `OrderSummarySection`, `OrderPeopleSection`, `OrderLinesSection`, `OrderPaymentsSection` y `OrderHistorySection`).
- **Criterio:** desde cualquier estado previo del drawer, «Ver detalle» abre el pedido correcto con toda su información. Abrir otro pedido lo reemplaza.

**Punto de control 1:** recorre **todas** las vistas del menú (`features/navigation/constants/menuItems.constants.ts`) abriendo cada acción de drawer. Todas deben tener el mismo encabezado, scroll en el cuerpo, pie fijo, texto seleccionable y cierre solo con la ✕. Corre la verificación de la regla 7.

---

## Fase 2 · Tablas: columna Acciones, copiar con clic, estado y empleados

> Eje central: `global/components/UI/molecules/table/DataTable.tsx` y `RowActions.tsx`, y las tablas de cada feature.

### 2.1 Encabezado «Acciones» en todas las columnas con botones

- **Estado actual:** la mayoría ya lo tiene. Faltan:
  - `features/orders/components/table/OrdersTable.tsx:72`: `<th aria-label="Acciones" />` sin texto visible.
  - `features/cashRegister/components/orders/CashOrdersPanel.tsx` no tiene tabla propia: pasa sus acciones (cobrar, cotejar) a `OrdersTable`, así que queda resuelto con el arreglo anterior.
- **Ruta:**
  1. Crea en `global/components/UI/molecules/table/` un `ActionsHeader` (`<th className="table-th-actions">Acciones</th>`, centrado según `data-table-align.css`) y úsalo en **todas** las tablas.
  2. Busca y corrige con: `grep -rnE "<th[^>]*/>|<th[^>]*>\s*</th>" src/features` y cada tabla que importe `RowActions`.
- **Criterio:** ninguna tabla tiene una columna de botones sin el título «Acciones».

### 2.2 Copiar código con clic en la celda, no como acción

- **Estado actual:**
  - Pedidos: acción `copy` en `orders/helpers/orders.actions.ts:36`, ícono en `OrderRowActions.tsx:19` y manejo en `OrdersTable.tsx:56`. Hay pruebas que lo esperan en `orders.actions.test.ts` y `orders.adapter.test.ts`.
  - En el detalle hay un botón «Copiar número» (`OrderDrawer.tsx:71`).
  - Helper: `orders/helpers/orders.clipboard.ts`.
- **Ruta:**
  1. Mueve el helper a `global/helpers/clipboard/copyToClipboard.ts`: `navigator.clipboard.writeText` con respaldo `execCommand` y un `toast.success('Código copiado: X')` con `sonner`.
  2. Crea el componente `global/components/UI/molecules/table/CopyableCell.tsx`. Es un botón con apariencia de texto, `title="Clic para copiar"`, cursor `copy`, `stopPropagation` para no abrir la fila y teclado (Enter/Espacio).
  3. Úsalo en las columnas **ID / Código / Serie / Número** de todas las tablas: pedidos, cotizaciones, facturas, compras, traslados, devoluciones, productos (código y referencia), ubicaciones, bodegas, abonos, conciliación, auditoría y papelera.
  4. Quita la acción `copy` de `OrderActionKey`, `orders.actions.ts`, `OrderRowActions.tsx` y `OrdersTable.tsx`, y actualiza sus pruebas. En el detalle, el número del encabezado o resumen también se vuelve `CopyableCell`, y se borra el botón «Copiar número».
- **Criterio:** ninguna columna de acciones tiene «copiar». Al hacer clic en un código se copia y aparece el toast. Las pruebas están actualizadas.

### 2.3 Componente único de estado (dropdown que no rompe la línea)

- **Estado actual:** el patrón `<select className="inv-status-select is-active|is-inactive">` se repite a mano en unas 10 tablas (clientes, externos, catálogo, productos, ubicaciones, bodegas, abonos y roles). Su CSS vive en `features/inventory/components/InventoryTables.css:73-95`, es decir, otra feature lo importa: estilo cruzado. Además, en clientes el select **no revisa permisos** (`CustomersTable.tsx:173-180`).
- **Ruta:**
  1. Crea `global/components/UI/molecules/table/StatusSelect.tsx` + `.css`. Props: `value`, `options` (por defecto Activo/Inactivo), `disabled`, `onChange`. Estilo `white-space: nowrap`, ancho fijo y mismos tokens. Mueve el CSS de `inv-status-select` a este componente.
  2. Reemplaza los selects manuales en todas las tablas. `disabled` sale de `canPerformAction(..., 'update')`.
  3. Pasar a inactivo **siempre** pide motivo con `ReasonPrompt` (regla vigente del proyecto).
- **Criterio:** un solo componente de estado en todo el front y nunca se parte en dos líneas.

### 2.4 Empleados: quitar «Desbloquear cuenta» por completo

- **Estado actual:**
  - Front: acción `unlock` en `features/employees/components/table/EmployeesTable.tsx:102` (con `refreshIcon`), `unlockEmployeeThunk` en `employees.thunks.ts:103-115`, `unlockEmployee` en `employees.service.ts:79-82` y la constante `EMPLOYEES.UNLOCK` en `src/api/endpoints`.
  - API: `POST /employees/:id/unlock` en `staff/routes/staff_routes.go:56` → `ctrl.UnlockEmployee` → servicio y repositorio de staff.
- **Ruta:**
  1. Front: borra la acción, el thunk, el servicio, la constante del endpoint, sus pruebas y cualquier texto relacionado.
  2. API: borra la ruta, el handler, el método del servicio y el del repositorio, si solo los usa esta ruta.
  3. **No** toques el bloqueo automático por intentos fallidos del login (`LOGIN_MAX_ATTEMPTS` y `LOGIN_BLOCK_MINUTES` en `auth_service.go`): es seguridad del login, no la acción retirada. Ese bloqueo vence solo por tiempo. **Confírmalo con el dueño** y déjalo escrito en la cabecera del servicio de auth.
  4. Actualiza swagger, `MATRIZ-ENDPOINTS.md`, `ACCIONES-HTTP-POR-PANTALLA.md` y e2e.
- **Criterio:** `grep -rni "unlock" importadoraApi/src importadoraInterfaz/src` solo devuelve el bloqueo del login, si se conserva.

### 2.5 Empleados: columna Estado con el dropdown común

- **Estado actual:** la columna «Estado» ya existe (`EmployeesTable.tsx:61`), pero es un **botón que alterna** (`handleToggleEmployeeStatus`), no el dropdown de las demás tablas.
- **Ruta:** reemplázalo por `StatusSelect` (2.3). Activo → Inactivo abre `ReasonPrompt` («Se cerrarán sus sesiones»). Inactivo → Activo cambia directo. La API usa la ruta existente: `setEmployeeStatusThunk` → `PUT /employees/:id` con `{ status, reason }` (`employees.service.ts:75-77`), que hoy exige `employees:edit`. Si en 8.2-8 se decide exigir `change_status`, se ajusta esa ruta. La fila se actualiza en el slice sin recargar (Fase 5).
- **Criterio:** el estado del empleado se cambia igual que en clientes, con motivo al desactivar, y la columna no rompe la línea.

### 2.6 Ícono de «Reubicar productos» en Gestión de ubicaciones

- **Estado actual:** `features/warehouses/components/locations/LocationRow.tsx:66` usa `refreshIcon` (que se ve como «recargar»).
- **Ruta:** usa `src/assets/icons/swap.svg?raw`, que ya existe y tiene dos flechas en sentidos opuestos. Revisa también `features/locations/` (hay **dos** implementaciones de ubicaciones: `features/locations` y `features/warehouses/components/locations`). Decide cuál queda y unifícalas si son la misma vista.
- **Criterio:** reubicar muestra las flechas opuestas y ninguna acción de fila usa el ícono de recarga.

**Punto de control 2:** recorre todas las tablas. Revisa el encabezado «Acciones», que la celda copiable no abra la fila, el estado con `StatusSelect`, que empleados no tenga desbloquear y que reubicar tenga las flechas. Corre la regla 7.

---

## Fase 3 · Filtros combinados con «Todos» por defecto

- **Estado actual / causa:** `global/components/UI/molecules/filters/FilterSelect.tsx` solo ofrece «Todos» si la lista de opciones lo trae. Si no, pinta un `<option disabled hidden>` con el label, que **no se puede volver a elegir**. En Abonos, `AbonosTable.tsx:54` arma `warehouseOptions` sin «Todas» (método y estado sí lo traen desde `wallet.constants.ts:49-59`). Hay 11 pantallas que usan `FilterSelect` y otras con `<select>` manual en su barra (por ejemplo `OrdersToolbar`, `ReturnsToolbar`, `PurchasesTable`, `AuditScreen`, `RecycleBinScreen`, `GeneralReportScreen`, `InventoryCountsScreen`, `LocationsTable`, `CustomersTable` y `ProductsTable`). `ChipSelect` (tienda) tiene la misma regla.
- **Ruta:**
  1. `FilterSelect` y `ChipSelect` reciben la prop `allLabel` (por ejemplo «Todas las bodegas») y **siempre** pintan como primera opción `{ value: emptyValue, label: allLabel }`, **seleccionable**. Se elimina el placeholder oculto. Las constantes que ya traen `'all'` lo quitan de su lista, para no duplicarlo.
  2. El valor inicial de cada filtro es `emptyValue` («Todos»). Revisa cada `INITIAL_*_FILTERS`.
  3. Pasa los `<select>` manuales de las barras de filtros a `FilterSelect`. Los `<select>` **de formularios** (drawers) no se tocan.
  4. Revisa los helpers de filtrado (`filterAbonos`, etc.) y los parámetros enviados a la API: `'all'` no se manda como filtro.
  5. Prueba unitaria de `FilterSelect`: «Todos» existe, se puede elegir y es el valor por defecto.
- **Criterio:** todo filtro combinado del aplicativo arranca en «Todos» y se puede volver a «Todos» desde la lista. En Abonos, la bodega tiene «Todas las bodegas».

**Punto de control 3:** en cada pantalla con filtros, combina varios filtros, vuelve a «Todos» y confirma que el listado coincide con el de la API (sin filtros fantasma). Corre la regla 7.

---

## Fase 4 · Edición completa y correcta en todas las entidades

> Eje central: **los formularios de edición, su DTO de API y la tabla en BD deben tener los mismos campos editables.**

### 4.1 Método común de verificación (aplícalo a CADA acción «Editar»)

Para cada entidad, llena esta tabla en `importadoraInterfaz/docs/EDICION-POR-ENTIDAD.md` (archivo nuevo):

| Entidad | Columnas en BD (`startdb.pgsql`) | Campos en `Update*Request` (Go) | Campos en el formulario de edición | ¿Precarga? | ¿Permite vaciar? | Faltantes |
|---|---|---|---|---|---|---|

Entidades: clientes, empleados, roles, proveedores, transportadoras, productos, marcas, categorías, modelos, bodegas, ubicaciones, compañía, administradores (superadmin), configuración de facturación, cotizaciones (si se editan) y cuenta propia (Fase 7).

Reglas:
- Todo campo editable en BD y en el DTO aparece en el formulario. Si un campo **no** debe editarse (por ejemplo, el documento de identidad), se documenta el porqué en el comentario del formulario **y** el DTO no lo acepta.
- El formulario **precarga** el objeto completo desde `GET /:id`, no desde la fila de la tabla, que suele traer menos campos.
- **Vaciar un campo opcional tiene que funcionar.** Hoy el patrón `campo.trim() || undefined` (por ejemplo `catalogs/hooks/useCatalogItemForm.ts:39`) **no envía** el campo vacío, y el valor viejo queda en BD. Hay que enviar `null` o `""`, y el servicio Go debe guardar `NULL` cuando llega una cadena vacía en campos opcionales. Revisa cada `Update*` en los servicios.
- Al guardar, el slice se actualiza con la respuesta del `PUT`, sin recargar (Fase 5).

### 4.2 Clientes

- **Estado actual:** `features/customers/components/form/EditCustomerForm.tsx` solo edita **nombre, teléfono y correo** (y muestra el documento bloqueado). La API (`customers/dtos` → `UpdateCustomerRequest`) y la tabla `customers` (`startdb.pgsql:414-445`) admiten además: `documentType`, `personType` (**tipo de cliente: natural / jurídica**), `lastName`, `tradeName`, `legalRepresentative`, `mobile`, `address`, `city`, `vatResponsible`, `fiscalRespCodes`, `addresses`, `contacts`, `priceTier`, `discountPercent`, `docsValidityMonths` y `status`. La tabla muestra `customer.userType || 'Natural'` (`CustomersTable.tsx:169`); confirma de dónde sale `userType` en el adaptador.
- **Ruta:**
  1. Reutiliza los campos de `CreateCustomerForm` en un componente común `CustomerFormFields` (dentro de `customers/components/form/`), usado por crear y editar.
  2. Edición con secciones: **Tipo de cliente** (natural/jurídica, que muestra u oculta apellido, razón comercial y representante legal) · Identificación (tipo de documento y documento: decide si se pueden editar; hoy la API sí lo acepta) · Contacto · Ubicación · Fiscal (responsable de IVA y códigos) · Comercial (nivel de precio, descuento y vigencia de documentos).
  3. Crédito (`creditEnabled`, `creditLimit`, `creditDays`, `creditWarningPct`) se queda en Cartera (`EnableCreditPanel`). Documéntalo en el formulario.
  4. Cambia el subtítulo de la entrada `editCustomer` en `people.entries.ts` («Nombre, teléfono y correo»).
- **Criterio:** editar un cliente permite cambiar su tipo y todos sus datos. Al reabrirlo, los valores guardados aparecen precargados.

### 4.3 Modelos, marcas y categorías (Gestión de modelos)

- **Estado actual:** un solo formulario, `features/catalogs/components/drawer/CatalogItemFormPanel.tsx`, con nombre + logo (marcas) o nombre + descripción (categorías y modelos).
  - Modelos en BD: `name`, `description`, `is_active` (`startdb.pgsql:519-527`). El DTO `UpdateModelRequest` acepta `name`, `description`, `isActive` y `reason`.
  - **Categorías tienen `parent_id`** (jerarquía) y el formulario **no** lo ofrece.
  - El estado se cambia desde la tabla.
  - Descripción: no se puede vaciar (regla 4.1).
  - La precarga sale de `payload.item`, que viene de la fila: confirma que la lista trae `description`.
- **Ruta:**
  1. Modelos: nombre y descripción precargados desde el detalle, y estado mostrado en el formulario (o explícito en la tabla con `StatusSelect`; documenta cuál).
  2. Categorías: agrega «Categoría padre» (select de categorías activas, sin poder elegirse a sí misma ni a sus hijas). `UpdateCategoryRequest` ya acepta `parentId`, así que es un cambio solo del front. Revisa en el servicio Go que impida ciclos (A hija de B y B hija de A).
  3. Marcas: nombre y logo.
  4. Arregla el vaciado de campos opcionales.
- **Criterio:** el drawer de editar modelo muestra todos los campos editables, precargados, y guarda bien incluso si se vacía la descripción.

### 4.4 Resto de entidades

Aplica 4.1 a: productos (`EditProductPanel`: precios por nivel, IVA, costo, marca, modelo y categoría), empleados (`EmployeeFormFields`), proveedores y transportadoras (`ExternalFormPanel`), bodegas (`WarehouseFormPanel`), ubicaciones, roles (`RoleForm`), administradores (`AdminFormDrawer`) y facturación (`BillingConfigPanel`). Corrige cada faltante con la misma ruta que en clientes.

**Punto de control 4:** por cada entidad, crea → edita **todos** los campos → vacía uno opcional → reabre. Debe coincidir campo por campo con la fila en PostgreSQL (`SELECT * FROM <tabla> WHERE id = …`). Agrega o ajusta un flujo e2e de edición en `importadoraApi/scripts/e2e`. Corre la regla 7.

---

## Fase 5 · Retirar «recargar/actualizar» y garantizar estado reactivo

### 5.1 Inventario de lo que hay hoy

| Ubicación | Qué es | Acción |
|---|---|---|
| `features/reports/screens/GeneralReportScreen.tsx:88-94` | Botón «Actualizar» del reporte general | **Retirar** botón, handler y CSS `gen-report-refresh-btn`. El reporte se recalcula al cambiar filtros o bodega y cuando cambian ventas, pagos o stock (5.2). |
| `features/auth/components/UserProfileModal.tsx` (`isRefreshing` y `fetchCurrentUserThunk`) | Refrescar perfil a mano | **Retirar** botón y estado. El perfil se actualiza al guardar la cuenta (Fase 7). |
| `features/locations/components/drawer/LocationDetailPanel.tsx:72` (`content.reload()`) | Recarga interna tras reubicar (no es un botón) | Cambiarla por la actualización del slice con la respuesta de la reubicación (5.2). |
| `features/employees/.../EmployeesTable.tsx:102` | «Desbloquear» con ícono de recarga | Se retira en 2.4. |
| `global/components/UI/molecules/table/DataTable.tsx:26-30` | Botón que **restablece el ancho de columnas** (no recarga datos) | Se conserva la función, pero se **cambia el ícono** (por ejemplo `list.svg`) y el texto, para que no parezca «recargar». **Confírmalo con el dueño.** |
| `BackupsScreen.tsx:89` y `RecycleBinScreen.tsx:174` | Restaurar respaldo o registro con ícono de recarga | Cambia el ícono por `history.svg` (no es recargar). |
| Botones «Reintentar» en estados de error (`OrdersTable`, `ProductsTable`, `CustomersTable`, `QuotationsTable`, `RecycleBinScreen`, `BackupsScreen`, `InventoryCountsTable`, `PurchaseDetailPanel`, `OrderDrawer`, `ShopCatalogStatus`) | Recuperarse de una carga fallida | **Decisión del dueño.** Recomendación: conservarlos **solo** en el estado de error, porque no son «recargar» sino recuperarse de un fallo. Alternativa: reintento automático con espera creciente (reusar `realtime/helpers/realtime.backoff.ts`). |

Al terminar se borran los íconos y textos que ya no se usen, y se revisa con `grep -rniE "refresh|recargar|actualizar" src`, excluyendo `refresh_token`.

### 5.2 Estado reactivo sin recargar (regla de operación)

- **Estado actual:**
  - El backend **no tiene websocket**. `features/realtime` está preparado, pero su contrato es «PROVISIONAL» (`realtime.constants.ts`) y solo conoce `stock.updated`.
  - Las notificaciones se consultan cada cierto tiempo (`notifications/hooks/useNotifications.ts:54`).
  - Cada thunk decide por su cuenta si actualiza el slice o vuelve a pedir la lista. Por ejemplo, `CreateReturnDrawer` dice «al crear, el thunk recarga la lista».
- **Ruta (regla única, documentada en `CONVENTIONS.md`):**
  1. **Toda mutación** (crear, editar, cambiar estado, anular, borrar o restaurar) actualiza el slice **con la respuesta del endpoint** en `extraReducers` (`fulfilled`): inserta, reemplaza o quita la fila por id, ajusta contadores y KPIs, y actualiza el detalle abierto en el drawer. Si el endpoint no devuelve el objeto completo, se ajusta el **endpoint** para que lo devuelva (y se actualiza swagger).
  2. **Efectos cruzados** entre módulos se tratan con acciones explícitas, no con recarga manual. Por ejemplo: venta creada → stock, cartera, caja y reporte; abono verificado → cartera y conciliación; devolución → stock y saldo a favor; traslado recibido → stock de ambas bodegas; recepción de compra → stock. Se hace con un `listenerMiddleware` de RTK en `app/store` que, ante `X/fulfilled`, invalida (marca `stale`) los slices afectados; la pantalla visible vuelve a pedir sus datos sola al ver `stale`.
  3. **Cambios hechos por otros usuarios:** decisión del dueño entre (a) websocket o SSE real en la API (endpoint `/events` autenticado con eventos por compañía y bodega, conectado a `features/realtime`) o (b) revalidación al volver a la pestaña o ventana (`visibilitychange` / `focus`) más el sondeo actual de notificaciones. **Recomendación: (b) ahora y (a) como fase posterior.** En ninguno de los dos casos aparece un botón «Actualizar».
  4. Optimismo solo donde el riesgo es bajo (estado activo/inactivo), revirtiendo si falla.
- **Recorrido obligatorio:** haz una tabla «entidad → transiciones de estado → slices que deben cambiar». Fuentes: `sale_stage_rules.go`, los estados de compras, traslados, devoluciones, abonos, cotizaciones, facturas y caja. Verifica cada transición en la interfaz **sin recargar**.
- **Criterio:** ningún flujo necesita F5 ni un botón para ver su resultado. En la misma pestaña, toda mutación se refleja de inmediato en tabla, KPIs y drawer.

**Punto de control 5:** recorre el flujo completo (cotizar → pedido → etapas → factura → pago → abono → devolución → traslado → recepción de compra) sin recargar ni una vez, con dos pestañas abiertas para validar la revalidación al volver a la pestaña. Corre la regla 7.

---

## Fase 6 · Precio con que se creó el pedido

- **Estado actual:**
  - El nivel de precio se elige en el catálogo, por tarjeta (`shop/components/productCard/ProductCard.tsx`), y cada línea del carrito lo guarda y lo muestra (`ShopCartItem.tsx:46`). Esto ocurre **antes** de crear el pedido, así que es correcto.
  - Tras crear el pedido, el detalle muestra «Nivel de precio» (`orders/components/detail/sections/OrderPeopleSection.tsx:14`, que es el nivel del cliente).
  - En BD hay `price_tier` en `carts` (`startdb.pgsql:756`) y en `sales` (`:788`).
  - **Riesgo de seguridad e integridad:** `sales/services/sale_service.go:130-146` **acepta `UnitPrice` enviado por el cliente** cuando llega mayor a 0. Si no llega, usa el nivel del pedido, o P1, o costo × 1,30. Un usuario podría crear pedidos con el precio que quiera modificando la petición.
- **Ruta:**
  1. **API:** el precio unitario lo calcula **siempre** el servidor a partir del nivel elegido en la línea. `sale_items` ya tiene `price_tier`. `cart_items` **no lo tiene** (solo `unit_price`) y `carts.price_tier` es uno por carrito, aunque la tarjeta permite elegir nivel por producto. Agrega `price_tier` a `cart_items` (migración `20261127_cart-item-price-tier.sql` + `startdb.pgsql`, con `p1` por defecto y el `CHECK` igual al de `sale_items`). `AddCartItemRequest` recibe el nivel y `cart_item_service.go` calcula el precio de la línea con ese nivel. Al convertir el carrito en venta, cada `sale_items.price_tier` sale de su línea. `UnitPrice` del request se **ignora**, o solo se acepta con el permiso `products:edit_prices` / `catalog:edit_prices` y queda en auditoría. Quita el respaldo silencioso «costo × 1,30»: si el producto no tiene precio para ese nivel, se responde error claro.
  2. El pedido queda creado con el precio del nivel elegido. Prueba en `sale_rules_test.go`.
  3. **Front:** después de crear el pedido no se muestra el nivel en ningún punto. Quita la fila «Nivel de precio» de `OrderPeopleSection` y búscalo en factura, caja, historial de ventas, devoluciones, cartera e impresión: `grep -rniE "priceTier|priceLevel|priceType|nivel de precio" src/features/{orders,cashRegister,billing,returns,wallet,checkout}`. En la ficha del **cliente** (`CustomerInfoSection.tsx:26`) sí se conserva, porque es un dato del cliente y no del pedido.
  4. **Carrito de un admin (error encontrado):** `carts/services/cart_service.go:65` y `:74` usan `actor.ActorID` como `employee_id` sin mirar el tipo de actor. Para un admin ese id es de la tabla `admins`: el carrito queda a nombre de **otro empleado** o falla la llave foránea. Hay que resolverlo igual que `sales/services/sale_actor_service.go` (`ActorEmployeeID`: el empleado ligado al admin). Si el admin no tiene empleado ligado, se responde el mismo error claro `ACTOR_WITHOUT_EMPLOYEE`. Aplica también a `Create` (`:150-152`), que ya distingue el tipo de actor pero deja `employee_id` vacío para el admin.
- **Criterio:** el pedido se crea con el precio del nivel elegido, aunque se manipule la petición. Tras crearlo, ninguna vista muestra el indicativo del nivel. El carrito de un admin queda a nombre de su empleado ligado.

**Punto de control 6:** crea pedidos con P1, P2, P3 y P4, y luego con un `unitPrice` falso por la API: el total debe coincidir siempre con el nivel elegido. Corre la regla 7.

---

## Fase 7 · Configuración: datos del usuario y edición de la cuenta

- **Estado actual (errores encontrados):**
  1. `settings/hooks/useSecurityForm.ts:14-15` inicializa `name` y `email` con `useState(user?.name ?? '')` **una sola vez**. Si el usuario llega después (rehidratación o `/auth/me`), los campos quedan vacíos.
  2. `settings/thunks/settings.thunks.ts` (`saveAccountThunk`) guarda **cualquier** actor con `PUT /employees/:userId` y `PUT /employees/:userId/credentials` (`settings.service.ts:19-25`).
     - Para un **admin** o **superadmin**, `userId` es el id de la tabla `admins`, no de `employees`. Así se puede **modificar a otro empleado con el mismo id** o fallar.
     - Un empleado sin `employees:edit` recibe 403 al editar **su propio** perfil.
  3. No pide la contraseña actual para cambiarla.
  4. Tras guardar, `auth.user` no se actualiza (el encabezado y el perfil siguen mostrando los datos viejos).
- **Ruta:**
  1. **API (módulo auth):** `PUT /auth/me` (nombre, apellido, teléfono y correo, solo los permitidos) y `PUT /auth/me/password` (`currentPassword` + `newPassword` con la política vigente). Ambos operan sobre el actor del token (`ActorType` + `ActorID`), para las tablas `employees` o `admins` según el tipo, **sin** recibir id por URL. Responden el usuario actualizado. Se auditan. Al cambiar la contraseña se revocan las demás sesiones.
  2. **Front:**
     - `settings.service.ts` usa los endpoints nuevos.
     - `saveAccountThunk` guarda el usuario devuelto en `auth` (acción `setCurrentUser`).
     - `useSecurityForm` toma los valores iniciales de `GET /auth/me` al montar, o se re-inicializa con `key={user.userId}` en `SecurityTab`.
     - Agrega el campo «Contraseña actual».
  3. Revisa igual `CompanyTab` / `useCompanyForm` (ya carga con `loadCompanyThunk`): precarga, validación y guardado de todos los campos de compañía según 4.1.
- **Criterio:** admin, superadmin y empleado ven sus datos al entrar a Configuración, los editan sin afectar a nadie más, y el encabezado se actualiza sin recargar.

**Punto de control 7:** prueba con un admin y un empleado que tengan el **mismo id numérico** en sus tablas. Editar uno no cambia al otro. Corre la regla 7.

---

## Fase 8 · Inventario de acciones por vista → catálogo de permisos → control en interfaz y API

> Eje central de seguridad. Esta fase **depende** de las Fases 1–7, porque las acciones finales ya quedan definidas ahí (sin `copy` y sin `unlock`).

### 8.1 Inventario completo de acciones por vista

Crea `importadoraInterfaz/docs/ACCIONES-POR-VISTA.md`. Por **cada módulo y subgestión** de `menuItems.constants.ts` (Tienda, Gestión Ventas, Gestión Inventario, Cartera, Terceros & Roles, Reportes & Auditoría, Configuración y Gestión Superadmin), anota:

| Módulo · Subgestión | Acción (botón, ícono, select o drawer) | Componente | Endpoint | Permiso API exigido | Flag de la matriz |
|---|---|---|---|---|---|

Incluye las acciones «no CRUD»: avanzar etapa de pedido, facturar, anular factura, verificar o rechazar o reabrir abono, conciliar, abrir o cerrar caja, registrar gasto, recibir compra, recibir traslado, reubicar, conteo físico, restaurar de papelera, respaldo y restaurar, exportar Excel, editar precios, cambiar estado y ver detalle.

Fuentes: cada `RowActions`, cada `openDrawerForm`, `docs/ACCIONES-HTTP-POR-PANTALLA.md` y las rutas Go (`src/features/*/routes`).

### 8.2 Problemas de permisos ya detectados (corregir sí o sí)

**Frontend**

1. **Falla abierta.** `global/hooks/access/usePermissions.ts`: si `permissions.modules` está vacío, `hasModuleAccess`, `hasScreenAccess` y `canPerformAction` devuelven **`true`**. Un empleado sin permisos (o con carga fallida) ve todo. → Para empleados debe devolver **`false`** (falla cerrada). Ajusta `usePermissions.test.ts`.
2. **Mapa pantalla → módulo desactualizado.** En `employees/constants/employees.permissions.constants.ts`, varias claves no coinciden con el menú actual, así que esas pantallas **no se pueden configurar** (quedan `null`):
   - `shop.receiving` (el mapa dice `purchases.receiving`)
   - `cashRegister.purchaseOrders` (el mapa dice `purchases.purchaseOrders`)
   - `inventory.counts`
   - `reports.dashboard`
   - `reports.general`
   - `settings.billing` y `settings.company` apuntan a `warehouses` (revisar)
   - sobran claves sin pantalla (`inventory.stock`, `inventory.movements`, `inventory.locations`, `settings.warehouses`, `reports.dailySales` y `reports.inventoryReport`).
   → Hazlo **derivado y validado**: una prueba que recorra `MENU_ITEMS` y falle si una subgestión asignable no tiene módulo.
3. **Acciones fuera de la matriz.** La matriz solo maneja ver, crear, editar, anular y precios (`MATRIX_ACTIONS`). Las acciones especiales de 8.1 deben tener su permiso propio y su casilla en el panel (1.6).
4. **Controles sin chequeo.** Por ejemplo, el estado de clientes (`CustomersTable.tsx:173`) no revisa `canPerformAction`. Recorre 8.1 y pon `visible`/`disabled` en cada control.
5. **Guardia de pantalla.** `MainContent.tsx:23-24` **ya** bloquea con `hasScreenAccess`. Hay que verificar que siga bloqueando después del arreglo de falla cerrada (punto 1). Lo que falta:
   - Al rehidratar `redux-persist` (`ui` está en la whitelist de `store.ts`), si `activeModule`/`activeSubitem` no están permitidos, se lleva al usuario a la primera pantalla permitida.
   - Una guardia equivalente en el drawer (ver 8.4).

**Backend (lo que realmente protege)**

6. **Rutas sin permiso.** De 198 rutas, 64 solo exigen estar autenticado. Lecturas sin `RequirePermission`:
   - `customers` (7: lista, selector, búsqueda, alertas, detalle, estado de crédito y documentos)
   - `warehouses` (6), `staff` (6), `products` (6), `inventory` (6), `catalog` (6), `externals` (3), `companies` (3)
   - Carritos: sus mutaciones solo exigen sesión **por decisión del proyecto** (excepción en `routes_guard_test.go`: «espacio de trabajo personal»). Se respeta, **pero** `cart_service.go` y `cart_item_service.go` solo comprueban la compañía (`cart_item_service.go:28-31`): cualquier empleado de la compañía puede ver, modificar o vaciar el carrito de otro cambiando el `:id`. → Se exige que `cart.employee_id` sea el empleado del actor (ver 6.4) en `GetByID`, `AddItem`, `UpdateItem`, `DeleteItem` y `ClearCart`.
   → Cada ruta exige su `view`/`view_detail`/etc. según 8.1. Los selectores que usan otros flujos (por ejemplo `/customers/selector` en el checkout) exigen el permiso del flujo que los usa (por ejemplo `orders:create` **o** `customers:view`). Para eso se agrega `RequireAnyPermission(...)` en `core/middlewares/auth_middleware.go`.
7. **Atajo por alias.** El grupo `/staff` (`staff_routes.go:61-66`) expone `GET /staff` y `GET /staff/:id` **sin** `employees:view`, mientras `/employees` sí lo exige. Basta cambiar la URL para saltarse el permiso. → El front **no** usa `/staff` (verificado en `src/api`), así que se elimina el grupo completo, junto con swagger y la matriz de endpoints.
8. **Permisos sembrados que nunca se exigen.** `view_detail` y `change_status` existen en la semilla y nadie los pide. Haz que `GET /:id` exija `view_detail` y que los endpoints de estado exijan `change_status`, o elimínalos del catálogo. **Decide uno y sé consistente.**
9. **Permiso exigido que no existe.** `RequirePermission("settings", "edit")` se usa en las 2 rutas del **protector de pantalla** (`screensaver/routes/screensaver_routes.go:17-18`), pero `settings` **no** está en la semilla (`startdb.pgsql:1674-1694`). Además, el middleware deja mutar al superadmin solo en `screensaver` (`auth_middleware.go:168`), así que el superadmin recibe 403 al guardar, aunque el front (`usePermissions`, módulo de gobernanza `screensaver`) le muestra el botón. → Cambia las dos rutas a `RequirePermission("screensaver", "edit")`. Decide si el protector lo maneja solo el superadmin (`RequireActors`) o también el admin y los empleados (entonces `screensaver` entra al catálogo de 8.3).
10. **Alcance por compañía y bodega.** El permiso no basta: cada servicio debe filtrar por `actor.CompanyID` (y bodega, cuando aplica) en lecturas **y** escrituras. Así se evita acceder a otro registro cambiando el `:id` de la URL (IDOR). Ya hay pruebas en `src/features/tenant_integration_test.go`; extiéndelas a todas las rutas `/:id`.
11. **Documentos públicos.** `core/server/server.go:56-57` sirve `/uploads` sin autenticación, incluidos los documentos de clientes (`/uploads/customers/{id}/{timestamp}_{nombre}`). Además usa `./uploads` fijo y no `cfg.UploadsDir`. → Sirve los archivos por un endpoint autenticado (`GET /customers/:id/documents/:docId/file`) con `customers:view_detail` y alcance de compañía. Quita el `e.Static`, y el front pide el archivo con el token (blob).
12. **Permisos en memoria.** El middleware carga los permisos en cada petición (3 consultas). Si un permiso no carga, el error se ignora (`auth_middleware.go`, en `LoadPermissionsForActor`). Hoy eso equivale a negar, que es correcto: déjalo explícito con un comentario y regístralo en log.

### 8.3 Catálogo de permisos final (BD)

- A partir de 8.1, define la lista definitiva `module:action`, incluidas las acciones especiales (ejemplos: `orders:advance_stage`, `invoices:annul`, `payments:verify`, `cash:open_close`, `stock:relocate`, `stock:count`, `recyclebin:restore`, `reports:export`).
- **Migración** `migrations/20261128_permission-catalog.sql` (o la fecha siguiente libre): inserta los permisos nuevos (`ON CONFLICT DO NOTHING`), elimina o renombra los obsoletos migrando `employee_permissions` sin perder asignaciones, y actualiza las asignaciones semilla de los roles de prueba.
- **`startdb.pgsql`:** el mismo catálogo y la misma semilla (bloque «CATÁLOGO DE PERMISOS» y «PERMISOS INICIALES DE LOS EMPLEADOS DE PRUEBA»).
- **Una sola fuente de verdad para los nombres:** constantes Go (`core/types/permission_types.go`) usadas en las rutas en lugar de cadenas sueltas, y en el front `employees.permissions.constants.ts`. Extiende `core/bootstrap/routes_guard_test.go`, que hoy solo revisa rutas que **escriben** (regex `POST|PUT|PATCH|DELETE`):
- que también revise los `GET` de negocio (con su propia lista de excepciones justificadas: `health`, `swagger`, `auth/me`, notificaciones propias, carrito activo);
- que falle si una ruta usa un `module:action` que no está en el catálogo sembrado.

### 8.4 Interfaz controlada por permisos

- Cada acción del inventario 8.1 lee su permiso con `usePermissions().canPerformAction(...)` (extiéndelo a las acciones especiales) y se **oculta** si no lo tiene (`RowAction.visible`, `StatusSelect.disabled` o botones del pie del drawer).
- El menú lateral solo muestra módulos y subgestiones con `hasScreenAccess`.
- Abrir un `openDrawerForm` de una acción sin permiso se bloquea también en el registro: `FormEntry` lleva un campo `permission` y `FormDrawerBody` muestra «Sin acceso» si no lo cumple.
- Prueba unitaria: con un empleado que solo tiene `orders:view`, la tabla de pedidos no muestra anular ni avanzar etapa.

**Punto de control 8 (seguridad):**
1. Crea un empleado con un solo permiso por módulo. Inicia sesión y comprueba que solo ve esa pantalla y esa acción.
2. Con su token, llama por `curl` o e2e **todos** los endpoints de 8.1: deben responder 403 los no permitidos y 404/403 los de otra compañía (cambiando `:id`).
3. Prueba `/staff`, `/uploads` y `unitPrice` (Fase 6).
4. Agrega `flow_permissions_matrix.py` en `scripts/e2e` que automatice todo lo anterior.
5. Corre la regla 7.

---

## Fase 9 · Cierre: base de datos, documentación y regresión total

1. **BD:**
   - La migración o migraciones nuevas se aplican sobre una copia de la base actual (staging o local) y se guarda la salida como evidencia (`migrations/README.md` con fecha, comando y resultado).
   - `startdb.pgsql` crea desde cero una base equivalente. Para comprobarlo, compara `pg_dump --schema-only` de (base migrada) contra (base nueva desde `startdb.pgsql`): no debe haber diferencias.
   - La semilla deja usuarios de prueba por rol con permisos coherentes con el nuevo catálogo.
   - Resuelve la copia `Idea/startdb.pgsql` (regla 5).
2. **Endpoints:** `swagger.json`, `MATRIZ-ENDPOINTS.md` y `ACCIONES-HTTP-POR-PANTALLA.md` al día. `pnpm check:api` y `pnpm smoke:api` en verde.
3. **Documentación del front:**
   - `CONVENTIONS.md`: drawer único, armazón `drawer-form`, `StatusSelect`, `CopyableCell`, `FilterSelect` con «Todos», regla de estado reactivo y regla de permisos.
   - `ESTRUCTURA.md` regenerado.
   - Nuevos `EDICION-POR-ENTIDAD.md` y `ACCIONES-POR-VISTA.md`.
4. **Comentarios:** revisa que cada archivo tocado tenga su cabecera y sus comentarios al día y que no queden comentarios de comportamientos retirados (`unlock`, `copy` como acción, botones de actualizar, `cr-drawer-backdrop`, etc.).
5. **Regresión total:** repite los puntos de control 1 a 8 completos, con un admin, un empleado limitado y el superadmin (que solo lee en módulos operativos), y compara contra las capturas de la Fase 0.
6. **Verificación final:** regla 7 completa + e2e (`python importadoraApi/scripts/e2e/e2e.py` contra una base de prueba).

---

## Decisiones que debe confirmar el dueño antes o durante la ejecución

1. Texto cortado del requerimiento sobre la «responsabilidad del drawer» (1.1): ¿la interpretación es correcta?
2. ¿Se conservan los botones «Reintentar» **solo** en estados de error, o se reemplazan por reintento automático (5.1)?
3. ¿El botón de «restablecer columnas» de `DataTable` se queda, con otro ícono (5.1)?
4. ¿Cambios de otros usuarios con revalidación al volver a la pestaña ahora y websocket/SSE después, o websocket desde ya (5.2-3)?
5. Clientes: ¿el tipo y número de documento son editables (4.2)?
6. ¿Se conserva el bloqueo automático del login por intentos fallidos, que vence solo, aunque se quite «Desbloquear» (2.4)?
7. `view_detail` y `change_status`: ¿se exigen en la API o se retiran del catálogo (8.2-8)?
8. ¿`UnitPrice` manual se elimina del todo, o se permite solo con `edit_prices` y auditoría (Fase 6)?
9. ¿Se usa pnpm y se borra `package-lock.json` (0.2b)?
10. Protector de pantalla: ¿lo gestiona solo el superadmin o también la compañía (8.2-9)?

## Orden de ejecución resumido

Fase 0 → 1 (drawer) → 2 (tablas) → 3 (filtros) → 4 (edición) → 5 (estado reactivo) → 6 (precio) → 7 (configuración) → 8 (permisos, al final porque depende de las acciones ya definidas) → 9 (cierre y regresión). Cada fase termina con su punto de control **antes** de abrir la siguiente.

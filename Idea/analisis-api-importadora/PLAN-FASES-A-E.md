# Reanálisis de ambos repositorios y plan reconstruido

No toqué ningún archivo. Todo salió de leer el código de los dos repos, medirlo y cruzar sus endpoints con el Swagger. Los números de línea son los actuales; si un paso cambia un archivo, las líneas siguientes se corren.

## 1. Reanálisis de los repositorios

### Importadora Online (la referencia)
- **Tamaño:** 1.498 archivos TS/TSX y 96.239 líneas.
- **Organización:** cerca de 60 features, muchas con prefijo `modal*` que mezclan pantalla, modal y lógica. `modalInventoryControl` solo tiene 121 archivos y 9.675 líneas.
- **Archivos gigantes:** `Icons.tsx` con 5.677 líneas, `pdfGeneratorService.ts` con 666, `OrderRecordScreen.tsx` con 618 y `NavConfig.tsx` con 496.
- **Capa de API:**
  - `globalApiRequest.ts` **se traga los errores**: devuelve `{success:false}` y escribe en consola.
  - `onUnauthorized` solo devuelve el texto "No autorizado" y no cierra la sesión.
  - La URL base está fija en `axiosInstance.ts:15`. Los comentarios de ese archivo todavía apuntan a otros servidores (`japaniracer.com`) y a una IP local.
- **Websocket:** se monta en `main.tsx:18` con una URL fija (`wss://api.japaniracer.com/wss2/`). Nada lo consume.
- **Endpoints:** hay 62 escritos como texto suelto dentro de servicios, sin un archivo de configuración. De esos, **9 no existen en el Swagger actual**: `/carts/remove`, `/carts/update-quantity`, `/families`, `/products/`, `/products/create`, `/products/update/`, `/sales/traslades/create`, `/suppliers/` y `/users/`.
- **Estado:**
  - Hay 42 slices.
  - Hay 362 usos de `localStorage` y `sessionStorage` repartidos por todo el código.
  - 77 archivos tienen datos de prueba mezclados con el código real.
  - Varias features importan tipos de otra por una ruta profunda: `brandsTable`, `categoriesTable` e `incomeTransfer` importan `@/features/wallet/types/generalTable`.
- **Lo que sí tiene y conviene copiar:**
  - **Pruebas:** hay tests de slices y selectors en `shop/tests`.
  - **Separación en shop:** `shop` está en capas (`api`, `services`, `thunks`, `slices`, `selectors`, `hooks`, `helpers`, `types`).
  - **Contratos de negocio:** cuerpos de petición con `companyId`, paginación `page/pageSize` y niveles de precio P0–P3.

### Gestión Importadora (el proyecto actual)
- **Tamaño:** 184 archivos y unas 8.200 líneas, con 0 violaciones de capas y 0 ciclos.
- **Lo que ya cumple:**
  - La capa `api` y el cliente axios están centralizados.
  - `config.ts` concentra los endpoints.
  - Cada feature tiene sus capas.
  - Todo el estilo sale de tokens.
- **Lo que falta, en cifras:**
  - 2 de 7 subgestiones visibles tienen pantalla.
  - Solo se consumen `/auth/login` y `/health`.
  - No hay pruebas (no existe Vitest).
  - 27 valores tipográficos sueltos.
  - Un CSS duplicado.
  - Una confirmación de logout embebida en `SideMenuUser`.
- **Errores de configuración de `api/config.ts`:** el campo `HEALTH.READINESS: '/readiness'` (línea 64) no existe en el Swagger, que solo define `/health`.

### Qué se evita al cruzar los dos
| Error de Online | Cómo se evita aquí |
|---|---|
| Errores tragados en `globalApiRequest` | El cliente axios rechaza con `AppApiError`, y los thunks lo muestran |
| Endpoints sueltos y obsoletos | Todos en `config.ts`, validados contra el Swagger con un script |
| `companyId` leído del `localStorage` dentro del servicio | Sale del estado de sesión y se pasa por parámetro |
| Archivos de 500 a 5.000 líneas | Tope de ~150 líneas, partido por responsabilidad |
| Features que importan rutas profundas de otra | Solo por `index.ts` |
| Mocks mezclados con código real | Se borran al integrar cada módulo |
| Sin pruebas en la mayoría de features | Vitest para helpers, selectors y adapters |

### Datos clave del Swagger
- Todos los listados son `POST` con cuerpo `{companyId, page, pageSize, ...filtros}`.
- La respuesta trae `data` y `meta`, con `currentPage`, `hasNextPage`, `hasPrevPage`, `pageSize`, `totalPages` y `totalRecords`.
- El login ya entrega `companyId`, `userId`, `warehouseId` y `priceType` del usuario.
- `/products` devuelve `ProductResponse`: `productId`, `code`, `description`, `brandName`, `categoryName`, `modelName`, `images[]`, `locations[]` (con `stock`, `reservedStock` y `locationCode`), `prices[]` (con `type`), `promotions[]`, `isActive` e `isPromotion`.

## 2. Plan paso a paso

**Reglas en todos los pasos:** sin git, sin carpetas nuevas en la raíz de `src`, `global2/` y `features2/` intactos, código comentado se conserva, código en inglés y comentarios en español, cabecera de 2 líneas en cada archivo nuevo (qué es y con qué conecta), archivos de menos de ~150 líneas, y estilos solo con tokens. Al terminar cada fase se corre `tsc`, `eslint`, `build` y la revisión de capas.

### FASE A — Higiene y tipografía

**A1. Quitar el CSS duplicado de los selectores**
- `ShopCatalogToolbar.css:26-30` y `ShopCatalogFilters.css:14-18` definen igual `.shop-catalog-filter-select-wrapper`.
- Antes de mover nada, confirmar con `grep` que `.shop-catalog-filter-group-label` (`Filters.css:20-25`) y `.shop-catalog-select` (`Toolbar.css:32` en adelante) también se usan en los dos componentes.
- Mover esas 3 reglas a `screens/ShopCatalogScreen.css`, que es el padre que monta ambos, y borrar las copias.
- Dejar una nota `ojo:` explicando que son compartidas.

**A2. Tokens de interlineado y espaciado de letras en `styles/tokens.css`**

Se añaden después de los tokens de peso (cerca de la línea 224):

| Token | Valor | Reemplaza |
|---|---|---|
| `--leading-none` | 1 | 1 |
| `--leading-tight` | 1.1 | 1.1 y 1.15 |
| `--leading-snug` | 1.2 | 1.2, 1.25 y los 16px / 13.8px |
| `--leading-normal` | 1.4 | 1.3, 1.4 y 18.2px |
| `--leading-relaxed` | 1.5 | 1.5 |
| `--tracking-tight` | -0.02em | -0.02em, -0.025em, -0.01em y -0.5px |
| `--tracking-wide` | 0.05em | 0.05em, 0.5px y 0.3px |

Algunos valores se alinean a la escala y cambian como máximo 1 px; se revisa visualmente en el navegador.

**A3. Reemplazar los 27 valores sueltos por tokens**

| Archivo | Línea | Cambio |
|---|---|---|
| `MainContent.css` | 39 | `letter-spacing: var(--tracking-tight)` |
| `MainContentPlaceholder.css` | 63 | `line-height: var(--leading-relaxed)` |
| `DrawerHeader.css` | 53 | `var(--leading-snug)` |
| `DrawerHeader.css` | 69 | `font-size: var(--text-11px)` |
| `AppHeader.css` | 35, 42, 53 | tracking-tight, leading-snug, tracking-wide |
| `WarehouseMenu.css` | 35 | `var(--tracking-wide)` |
| `WarehouseSelector.css` | 15 | `var(--tracking-wide)` |
| `SideMenuUser.css` | 34, 113 | leading-snug, leading-normal |
| `LoginBrand.css` | 18 | leading-snug |
| `ShopCartEmpty.css` | 30 | leading-normal |
| `ShopCartFooter.css` | 29 | tracking-tight |
| `ShopCartItem.css` | 29 | leading-normal |
| `ProductCardInfo.css` | 18, 32, 45 | leading-normal, leading-normal, leading-snug |
| `ProductCardTierMenu.css` | 50 | leading-snug |
| `ProductCardActions.css` | 97, 98, 105 | leading-tight, tracking-wide, leading-snug |
| `ProductCardPricing.css` | 22 | leading-tight |
| `CreditAccountEmpty.css` | 32 | leading-normal |
| `CreditStatusBadge.css` | 25, 36 | leading-tight, `font-size: var(--text-2xs)` |
| `StatCard.css` | 83 | tracking-tight |

**A4. Quitar fallbacks redundantes.** En `SideMenuUser.css` (líneas 93, 104, 105, 111, 125, 126, 130, 141, 142 y 146) dejar `var(--text-sm)` sin el valor de respaldo.

**A5. Peso 900 sin cargar.** `AppHeader.css:32` usa `--font-weight-black` (900), pero `index.html:14` solo pide hasta 800. Se añade `;900` a Montserrat en esa URL, para que la marca se vea como hoy y no sintetizada.

**A6. Estilos base de elementos en `App.css`**
- Después de la regla de `button, input, select, textarea` (cerca de la línea 33) se añaden `h1`–`h6`, `p`, `small`, `label` y `th`.
- Mapa: h1 → `--text-2xl`, bold; h2 → `--text-lg`, semibold; h3 → `--text-md`, semibold; p → `--text-md`; label y th → `--text-sm`, semibold; small → `--text-xs`.
- Lo que ya tiene clase no cambia, porque la clase gana por especificidad.

**A7. Etiqueta huérfana.** `CreditClientsTable.tsx:53` (`<p>No se encontraron clientes…`) recibe `className="credit-table-empty-text"` y su regla en `CreditClientsTable.css`. Verificar si `th` y `td` de esa tabla ya tienen estilo propio.

**A8. Chequeo automático.** Un script de revisión en la raíz del proyecto (`scripts/check-typography.mjs`, fuera de `src`) avisa de cualquier `font-size`, `font-weight`, `line-height` o `letter-spacing` literal fuera de `tokens.css`. Se añade como comando de `package.json`.

**A9. Extraer la confirmación de logout**
- Mover `SideMenuUser.tsx:46-80` (overlay, card, botones) y `SideMenuUser.css:76-163` a `global/components/UI/molecules/ConfirmDialog.tsx` y `.css`, que quedarían junto a `SearchBar` y `StatCard`.
- `SideMenuUser.tsx` conserva `showConfirm` (línea 14) y el `dispatch(logoutThunk())` (línea 22), y usa `<ConfirmDialog …/>`.
- `SideMenuUser.css` baja a ~75 líneas.
- Se conserva el comportamiento actual y se añade lo que falte: foco inicial en "Cancelar", Esc para cerrar (con `useEscapeKey`) y foco atrapado dentro.

### FASE B — Card, contador y filtros

**B1. Distribución de la card.** No se cambian medidas ni diseño, solo dónde va cada cosa.
- **`ProductCardInfo.tsx`:** sacar la ubicación de la línea de la referencia y ponerla en su propia fila debajo, para que no rompa el wrap. Se elimina el separador `·`. Se corrige también la cabecera del archivo.
- **`ProductCardInfo.css`:** `.product-card-ref` (≈ líneas 38-47) deja de ser `flex-wrap`, y `.product-card-location` pasa a ocupar su propia línea. Se conservan `min-height: 35px` y `margin-top: 10px` (líneas 27-28).
- **`ProductCardPricing.css:11`:** `justify-content: flex-end` pasa a `space-between`, con el precio a la izquierda y el menú de tarifas a la derecha.
- **Verificación:** capturas en 3 anchos del grid, antes y después.

**B2. Contador editable**
1. **`shop.helpers.ts`:** añadir `clampQuantity(value: number, max: number): number` entre `getStockStatus` (línea 12) y `getPriceByLevel` (línea 19).
2. **Nuevo hook `features/shop/hooks/useQuantityInput.ts`** (la carpeta `hooks` se crea dentro de la feature, no en la raíz de `src`). Recibe `max` y devuelve el texto del campo, el número, `increment`, `decrement` y los manejadores. Mueve el estado de `ProductCard.tsx:24` y `handleIncrement/Decrement` (líneas 32-42).
3. **`ProductCard.tsx`:** usar el hook; `useState` (línea 4) queda solo para el nivel de precio; actualizar la llamada a `<ProductCardActions …/>` (líneas 63-70).
4. **`shop.card.types.ts:25-31`:** ampliar `ProductCardActionsProps` con el valor de texto y los manejadores de `onChange`, `onKeyDown`, `onFocus` y `onBlur`.
5. **`ProductCardActions.tsx:31-37`:** reemplazar el `<span>` por `<input type="text" inputMode="numeric">` con `aria-label` y `title`. Comportamiento:
   - Clic o foco seleccionan todo el número.
   - Flecha arriba o abajo suben o bajan en 1.
   - Enter llama a `onAdd`.
   - Solo admite dígitos, y puede quedar vacío mientras se escribe.
   - Al salir del campo se ajusta entre 1 y el stock.
   - Si está agotado, queda deshabilitado en 0.
   - Actualizar el comentario de la línea 2 ("no guarda estado").
6. **`ProductCardActions.css:45-52`:** `.product-card-stepper-count` conserva tamaño y peso, y suma borde y fondo transparentes, `text-align: center`, `font-family: inherit` y anillo de foco con `--focus-outline`.
7. **Pruebas:** manuales en el navegador (clic, flechas, escribir, salir, Enter, agotado). Con Vitest en la Fase D se añaden tests de `clampQuantity` y del hook.

**B3. Selector de marca al nivel del grupo de controles**
- `ShopCatalogToolbar.tsx:27-43` es el `<div className="shop-catalog-filter-select-wrapper">` de Marca. Hoy está dentro de `.shop-catalog-controls-group` (línea 26).
- Se saca y se coloca antes de la línea 26, como hermano directo dentro de `.shop-catalog-search-row`.
- `controls-group` se queda con el checkbox "Con stock" (45-54) y el botón "Limpiar filtros" (56-65).
- El `gap` de `.shop-catalog-search-row` (`Toolbar.css:6`) mantiene el espaciado. El orden queda: buscador, marca, controles.
- Se actualiza el comentario de `ShopCatalogFilters.tsx:17`, que habla de "diseño igual a controls-group".
- El selector de Categoría (en `ShopCatalogFilters.tsx:18`) no se mueve; si querías ambos al mismo nivel, dímelo.

### FASE C — Ciclo de sesión
Se aplica el plan ya entregado (inactividad de 3 minutos, renovación silenciosa y logout con revocación). Archivos y líneas:
- `api/config.ts:17-20`: añadir `LOGOUT: '/auth/logout'`.
- `global/helpers/session.storage.ts`: añadir `updateTokens`.
- `auth/services/auth.service.ts`: añadir `refreshRequest` y `logoutRequest` tras `loginRequest`.
- `auth/thunks/auth.thunks.ts:25-27`: `logoutThunk` llama primero al servidor (sin bloquear si falla) y luego limpia.
- `api/client.ts`: el 401 ignora `/auth/refresh` y `/auth/logout` junto a `/auth/login`.
- `app/store/store.ts`: el handler usa `logoutThunk('expired')` y quita su toast propio.
- Nuevos: `auth/helpers/auth.token.ts`, `auth/constants/auth.session.constants.ts` y `auth/hooks/useSessionActivity.ts`.
- `app/layout/ErpLayout.tsx`: montar el hook junto a `useRealtime()`.
- La confirmación ya sale de A9.

Hay que decidir quién aplica esta fase (Antigravity, como pediste, o yo) y revisar primero qué aplicó ya Antigravity.

### FASE D — Cimientos para consumir la API

**D1. Corregir `api/config.ts` contra el Swagger.** Se valida con un script. Hallazgos ya conocidos:
- Quitar `HEALTH.READINESS` (línea 64).
- `/employees/*` sí existe en el Swagger.
- Completar con las rutas reales de cada grupo a medida que se integran.

**D2. Tipos de paginación.** En `api/types/api.types.ts`, añadir `PaginatorMeta` (los 6 campos del Swagger), `Paginated<T>` y `PageRequest`.

**D3. Contexto de petición.** En `auth/selectors/auth.selectors.ts` añadir `selectRequestContext` con `companyId`, `userId`, `warehouseId` y `priceType`. Los thunks lo leen con `getState` y lo pasan al servicio. Los servicios no leen almacenamiento.
- **Cambio de tipo:** `AuthUser` (`auth.types.ts`) hoy no incluye `priceType` ni `companyInformation`. Añadirlos.
- **Persistencia:** `auth` no se persiste, así que el contexto se reconstruye al iniciar sesión.

**D4. Vitest.** Añadir Vitest y Testing Library como dependencias de desarrollo (requiere tu autorización), con pruebas para helpers, selectors, adapters y el hook del contador. Solo la lógica, no cada componente.

**D5. Componentes globales.** Se crean en `global/components/UI/` solo cuando el primer módulo los pide:
- Paginador y tabla paginada (E2).
- Modal (E4).
- Campos de formulario (E4).
- Skeleton y estado vacío (E2).

### FASE E — Integración de endpoints (SIIGO y Quotations al final)

**Receta por grupo**
1. Leer el modelo en el Swagger y escribir los tipos.
2. Un `service` por recurso, puro, sin estado.
3. Un `thunks` con carga, éxito y error.
4. Slice con `data`, `meta`, `status` y `error`, más selectors.
5. Un adapter (respuesta del backend → forma que usa la UI) en `helpers`.
6. Conectar la pantalla y registrarla en `screenRegistry.ts` o `drawerRegistry.ts`.
7. Borrar el mock de ese módulo.
8. Tests, red simulada y chequeo de capas.

**E1 · Catálogos base** (Warehouses, Brands, Categories, Models)
- `POST /warehouses` con `{companyId, page, pageSize}` devuelve `warehouseId`, `name`, `address`, `isMain` e `isActive`.
- Reemplaza el dato fijo `WH-01` en `warehouses.constants.ts`. El selector (`WarehouseSelector`) y el slice `ui` (`activeWarehouseId`) usan la bodega real.
- Brands, Categories y Models reemplazan `CATALOG_BRANDS` y `CATALOG_CATEGORIES` de `shop.constants.ts`. Los filtros pasan de texto a identificadores, porque `/products` filtra por `brandIds` y `categoryIds`.
- El Swagger no muestra campos del cuerpo de `POST /brands`; se verifica al integrar.

**E2 · Productos** (Products, Inventory de lectura, Search)
- `POST /products` con `{brandIds, categoryIds, companyId, familyIds, hasStock, isActive, isPromotion, modelIds, page, pageSize, warehouseId}`.
- Adapter `ProductResponse` → `Product`:
  - `id` = `String(productId)`.
  - `name` = descripción.
  - `imageUrl` = primera imagen.
  - `prices` = `p0..p3` según `prices[].type`.
  - `stockByWarehouse` = de `locations[]` (`stock` menos `reservedStock`).
- Conservar la forma de `Product` evita romper el realtime.
- La búsqueda de texto usa `/search` o `/inventory/search`.
- Los filtros viajan al servidor; los selectors locales se simplifican.
- Paginación con el paginador global.
- Se borra `shop.mocks.ts`.

**E3 · Carrito** (Carts)
- Rutas exactas: `POST /carts`, `POST /carts/register`, `PUT /carts/update`, `DELETE /carts/delete` y `DELETE /carts/deleteall`.
- Cuerpos: registrar usa `{auxWarehouseId, companyId, discount, price, productId, quantity, sellerId, typeCart, userId, uuid, warehouseId}`; actualizar `{cartId, quantity}`; borrar `{cartId}`.
- El carrito pasa de estar solo en `shop.slice` a sincronizarse con el servidor.
- **Qué no se repite de Online:** las rutas obsoletas `/carts/update-quantity` y `/carts/remove`.
- Hay que acordar cómo se genera y guarda el `uuid` del carrito.

**E4 · Terceros** (Users, Customers, Directions, Discounts)
- Pantalla `thirdParties → customers`: listado con `POST /users`, detalle `GET /users/{id}`, alta con `/users/register`, estado con `/users/state`.
- Direcciones con `/directions` y descuentos con `/discounts`.
- Feature nueva `customers`, registrada en `screenRegistry.ts` y `drawerRegistry.ts`.

**E5 · Cartera y pagos** (Wallet, Payments, crédito de Users)
- `POST /wallet` devuelve `creditAmount`, `creditDays`, `isCredit`, `pendingPayments`, `reservedCredit` y `verifiedPayments`.
- `POST /wallet/summary` alimenta las tarjetas de resumen.
- `/wallet/internal` y `/wallet/history` alimentan cuenta y facturación.
- `/payments/*` y `PUT /users/credit`, `/credit/days` y `/credit/limit` cubren abonos y cupos.
- Se reemplaza `wallet.mocks.ts`.

**E6 · Ventas y pedidos** (Sales, Orders)
- `/sales/register` para el pago desde el carrito.
- Traslados: `/sales/traslades`, `/sales/traslades/reject` y `/sales/approved`.
- Pendientes: `/sales/pendings`, `/sales/history`, `/sales/cancel` y `/sales/status`.
- Pantallas: Tienda → Traslados y Gestión Caja → Verificación.

**E7 · Reportes.** `GET /sales/report/general`, `GET /sales/report/internal`, `POST /reports` y `/sales/summary` para Ventas Diarias.

**E8 · Administración** (Inventory de gestión, Suppliers, Employees, Companies, Purchase Orders)
- Ubicaciones, traslados entre ubicaciones y registro de productos de `/inventory/*`.
- Proveedores, empleados (roles, permisos), empresas y órdenes de compra.

**E9 · Sync y Management.** No tienen pantalla en el menú actual. Se analiza su documentación primero:
- Sync: 13 rutas para dispositivos, cola, conflictos y estado.
- Management: 9 rutas de verificación de ventas y picking.
- Solo se integran si el cliente los pide.

**E10 · SIIGO (al final).** Son 16 `POST`, todos con `companyId`, y modelos propios de metadatos y paginación (`SiigoPagination`).
1. Primero `test-connection` y los catálogos de lectura: `taxes`, `payment-types`, `document-types`, `cost-centers`, `account-groups`, `users` y `warehouses`.
2. Luego listados externos paginados: `customers`, `products` e `invoices`.
3. Después la sincronización: `sync/customers`, `sync/products`, `sync/invoice` y `sync/invoices`.
4. Por último `credit-note` (`saleId`, `amount`, `reason`, `observations`).
- **Por qué va al final:** depende de clientes, productos y ventas ya integrados, y escribe en un sistema externo. Requiere confirmaciones y registro de resultados.
- **Pendiente de definir:** en qué pantalla vive, porque no hay una subgestión de SIIGO en el menú actual.

**E11 · Quotations (último).** Son 13 operaciones:
- `POST /quotations` y `/quotations/history` listan con `{companyId, page, pageSize, sellerId, status, userId}`.
- `POST /quotations/register` crea con `items`, `notes`, `sellerId`, `userId` y `validUntil`.
- `PUT /quotations/update` y `PUT /quotations/status` modifican.
- `POST /quotations/cart/add` y `DELETE /quotations/cart/delete` manejan los ítems.
- `GET /quotations/{id}` y `GET /quotations/stats` consultan.
- `DELETE /quotations/delete` borra.
- `/quotations/brands`, `/categories` y `/models` son catálogos propios.
- **Por qué al final:** reutiliza productos, catálogos y el patrón de carrito, y su estado depende de ventas. Tampoco tiene subgestión en el menú.

Gracias al orden anterior, cuando lleguen SIIGO y Quotations ya estarán probados los patrones de paginación, adapters y thunks.

## 3. Qué necesito de ti
Cada fase la aplico solo con tu autorización. Propongo arrancar por **A y B** y verificar la card en el navegador. Tres decisiones tuyas:
1. **Fase C:** quién la aplica, Antigravity o yo.
2. **D4:** autorizar Vitest como dependencia nueva de desarrollo.
3. **B3:** confirmar que el selector que subes de nivel es el de **Marca**.
# Convenciones de Gestión Importadora

Guía corta para saber dónde va cada cosa y cómo se escribe. Si algo no está aquí, se decide siguiendo estas mismas reglas.

## 1. La app es el shell (no se agregan más componentes app)

Toda la app vive dentro de los componentes de `src/app/componentApp`:

| Componente | Qué hace |
|---|---|
| `SideMenu` | Elige el módulo y la subgestión (estado `ui`) |
| `MainContent` | Muestra la pantalla de la feature según el módulo y subgestión activos |
| `DrawerRight` | Auxiliar de lo que se hace en `MainContent`: carrito en el catálogo, o detalle/ajustes del objeto seleccionado |
| `AppHeader` | Barra superior (logo y selector de bodega) |

- No se crean más componentes en `app/`. Todo lo nuevo se desarrolla **dentro de una feature** y se conecta a estos componentes.
- Excepciones permitidas (cosas que se olvidaron): notificaciones (alertas flotantes), login y confirmaciones de acciones.

## 2. Estructura de una feature

```
features/<name>/
├── types/        contratos TypeScript            (obligatoria)
├── constants/    textos, claves, datos fijos
├── mocks/        datos de ejemplo
├── services/     llamadas a la API (usan api/client)
├── helpers/      funciones puras
├── selectors/    lecturas derivadas del estado
├── slices/       estado Redux
├── thunks/       acciones asíncronas
├── hooks/        hooks de la feature
├── components/   piezas de UI (cada una con su .css)
├── screens/      pantallas completas
└── index.ts      API pública                      (obligatoria)
```

- Solo se crean las carpetas que la feature necesita. No se crean carpetas vacías.
- **Orden dentro de una carpeta:** si pasa de ~8 archivos, se agrupa en subcarpetas con nombre lógico por función (camelCase). Ejemplos: shop/components/{productCard, catalog, cart}, wallet/components/{kpis, clientsTable, clientRow, account, billing}, auth/components/{branding, form}, app/componentApp/sideMenu/{item, footer}.
- En el shell (app/componentApp) pasa igual: header/warehouse, sideMenu/item y sideMenu/footer, drawerRight/parts.
- El detalle de qué hace cada archivo está en docs/ESTRUCTURA.md (se genera a partir de la cabecera de cada archivo).
- Dirección de dependencias: `app → features → global → api`.
- Dentro de una feature: `screens → components → slices/thunks → services → types/constants`.
- Una feature usa a otra solo por su `index.ts`.

## 3. Nombres

- **El código va en inglés** (archivos, funciones, variables, tipos, ids, estados).
- **Lo que ve el cliente va en español** (labels, textos, mensajes).
- Nombres simples: `getX`, `formatX`, `selectX`, `applyX`, `setX`.
- Archivos por capa: `wallet.slice.ts`, `wallet.types.ts`, `wallet.constants.ts`, `wallet.helpers.ts`.
- Los ids nunca son texto visible. Ejemplo: subgestión `{ id: 'catalog', label: 'Catálogo' }`.

Equivalencias ya aplicadas (código → texto del cliente):

| Módulo | Texto |
|---|---|
| `shop` | Tienda |
| `cashRegister` | Gestión Caja |
| `wallet` | Gestión Cartera |
| `inventory` | Gestión Inventario |
| `thirdParties` | Gestión Terceros |
| `reports` | Reportes de Ventas |

| Estado de crédito | Texto |
|---|---|
| `upToDate` | Al día |
| `warning30` | Alerta (30d) |
| `overdue60` | En mora (>60d) |
| `blocked` | Bloqueado |

## 4. Comentarios

- Todos los comentarios van en español, cortos y directos.
- Cada archivo lleva una cabecera: qué es y con qué conecta.
- Cada función lleva una línea: cómo funciona y dónde conecta.
- Los cambios se dejan como nota corta: `// ojo: ...`.
- **El código comentado no se borra**: sirve de referencia.

## 5. Estilos

- Todo valor visual (color, tamaño, radio, sombra, movimiento) vive en `src/styles/tokens.css`.
- Cada componente tiene su `.css` y solo usa `var(--token)`.
- Las clases llevan el prefijo del componente (ej. credit-table-row, product-card-btn-add-to-cart).
- No se usa !important: se gana por especificidad (ej. .a.a-active).
- Estilos en línea solo para valores que cambian en ejecución (ej. el ancho de una barra de progreso); lo estático va al CSS.

## 5b. Tamaño de los archivos

- Un archivo hace una sola cosa. Meta: menos de 150 líneas (TSX y CSS). Los datos de ejemplo (mocks) y tokens.css son la excepción.
- Si un componente crece, se parte en partes con su propio .css (ej. ProductCard → ProductCardStock, ProductCardPricing, ProductCardActions).
- La lógica con estado va en un hook de la feature (ej. useCreditPayment) y los cálculos en helpers o selectors; el componente solo compone.

## 5c. Escalas de diseño (en tokens.css)

- Texto: 12 · 13 · 14 · 16 · 18 · 20 · 24 (más íconos 36 y 42). Mínimo 12px. Base de la app: 14px con interlineado 1,45 (`--leading-body`), puesta en `.store-app-layout`.
- Radios: sm 6 · md 8 · base 10 (cajas, cards y tablas de la maqueta) · lg 12 · pill · circle.
- Piezas globales de la maqueta: `Button` (btn-primary, secondary, danger, accent), `Pill` (amber, blue, green, red, gray), `FilterChip` y `ChipSelect`. Se reutilizan; no se vuelven a escribir en cada feature.
- Sombras: rest · card · card-hover; foco con --focus-outline y --ring-focus.
- Espaciado: --space-1..6 (4 · 8 · 12 · 16 · 24 · 32).
- Contraste mínimo 4.5:1 para texto; el foco con teclado siempre es visible.

## 6. Lo que viene (tenerlo en cuenta al escribir código)

- **Tiempo real (feature realtime, hecha con contrato provisional):** el Swagger del backend (185 rutas) NO documenta websocket ni webhooks. Se activa con VITE_WS_URL (vacío = desactivado, no se conecta a nada). Un evento nuevo es una línea en realtime.handlers; el formato del mensaje vive solo en realtime.adapter; el stock llega como valor absoluto (applyStockUpdate).
- **Facturas, PDF, imprimir, descargar y cargar archivos:** cada uno con su service y su respaldo. Irán como features nuevas (por ejemplo `invoices`) apoyadas en helpers de archivos en `global/`.
- **Sesión (hecho):** feature auth (login copiado de importadora-online). Token con la clave access_token; recordarme decide localStorage o sessionStorage; auth no va en redux-persist; un 401 cierra la sesión (api/client avisa y el store la cierra).
- **Ciclo de la sesión (hecho):** `useSessionActivity` (feature auth, montado en ErpLayout) cierra la sesión tras 3 minutos sin actividad (aviso 30 s antes) y renueva el token en silencio con `POST /auth/refresh` cuando faltan 60 s para su `exp` (se lee del JWT, no se asume una duración). Cerrar sesión llama primero a `POST /auth/logout` (revoca los refresh tokens) y siempre limpia lo local, aunque el servidor falle; si el token ya venció o la sesión se cerró en otra pestaña no se llama al servidor. Los tiempos están en `auth.session.constants`. `/auth/login`, `/auth/refresh` y `/auth/logout` no disparan el cierre por 401 (evita bucles). La alerta de cada motivo la muestra `logoutThunk`, en un solo lugar.
- **Pruebas y revisiones (hecho):** `npm test` corre Vitest (solo lógica: helpers, selectors, hooks y adapters; el archivo de prueba vive junto al que prueba, `nombre.test.ts`). `npm run check:type` avisa de tamaños, pesos o interlineados escritos a mano fuera de tokens.css. `npm run check:api` revisa que cada ruta de `api/config.ts` exista en el Swagger. Los listados del backend son POST con `{ companyId, page, pageSize }`; `api/pagination` convierte `{ data, meta }` en `{ items, meta }` y los thunks leen `companyId`, `userId`, bodega y nivel de precio de `selectRequestContext` (auth) para pasarlos al service; un service nunca lee el almacenamiento.
- **Catálogos y bodegas (E1, hecho):** `features/catalogs` (marcas, categorías y modelos de moto: POST /brands, /categories, /models) y `features/warehouses` (POST /warehouses) siguen la receta: tipos (app y backend por separado) → adapter/helpers → service (puro, recibe el contexto de petición) → thunks (leen `selectRequestContext`; `condition` evita doble carga) → slice (items, status, error) → selectors → hook que pide una sola vez (`useLoadCatalogs`, `useWarehouses`). Nada se persiste: se piden una vez por sesión. La bodega ACTIVA sigue en `ui` y `WarehouseSelector` la corrige al llegar la lista (`pickActiveWarehouse`: la guardada, la del usuario, la principal o la primera). Los filtros del catálogo usan los NOMBRES del backend hasta que los productos reales (E2) permitan filtrar por id.
- **Productos (E2, hecho):** el catálogo sale de `POST /products` (filtros por id: `brandIds`, `categoryIds`, `warehouseId`, `hasStock` solo cuando es true, página de 30 con `meta`) y la búsqueda por texto de `POST /inventory/search` (sin paginación, máximo 50; ahí marca, categoría y stock se aplican en pantalla). La lista vive en `shop.products.slice` (clave `products`, NO se guarda en el navegador); `shop.slice` (que sí se guarda) solo tiene filtros por id, carrito y selección. `shop.adapter` es el único lugar que conoce los campos del backend en productos. `useProductsLoader` pide al cambiar filtros, página, bodega o texto (con espera de 350 ms); una respuesta de una petición anterior se descarta (requestId). Supuestos a confirmar con datos reales: `prices[].type` = 'P0'..'P3'; stock disponible = stock - reservedStock; en la búsqueda los precios van por orden.
- **Carrito (E3, hecho):** el carrito vive en el backend (`shop.cart.slice`, clave `cart`, NO se guarda en el navegador). `shop.slice` (que sí se guarda) solo conserva `cartUuid` (se crea con el primer producto y agrupa las líneas en el backend) y `cartLevels` (nivel de precio con que se agregó cada producto, porque el backend solo guarda el precio). Rutas: POST /carts (leer), POST /carts/register (agregar), PUT /carts/update (cantidad), DELETE /carts/delete y /carts/deleteall (con el cuerpo `{cartId}` / `{userId, uuid}`). Después de cada cambio se vuelve a leer el carrito (el backend manda) y se recarga el catálogo (el backend descuenta o devuelve stock). Un solo cambio a la vez (`mutating` + `condition`); los errores se avisan con toast. Agregar un producto que ya está suma a su línea (PUT) en vez de crear otra. `useCartSync` (montado en ErpLayout) lee el carrito al entrar y al cambiar de bodega y lo olvida al salir; cerrar sesión borra el uuid. Supuestos a confirmar: vendedor y cliente son el usuario de la sesión y `typeCart` es 'sale' hasta que exista la selección de cliente (Terceros); `discount` va en 0 y no se aplica al subtotal.
- **Terceros: clientes, direcciones y descuentos (E4, hecho):** `features/customers` (no se guarda en el navegador). Lista de `POST /users` paginada (30 por página) con el paginador global `Pagination`; la búsqueda por texto se aplica sobre la página cargada (el backend solo filtra por empresa y página). Al abrir un cliente el panel derecho (modo `customer` de `drawerRegistry`) pide `GET /users/{id}`, `POST /directions` y `POST /discounts`; se puede agregar y borrar direcciones y borrar descuentos (con `ConfirmDialog`); crear o editar descuentos y editar direcciones quedan pendientes. "Usar en la venta" guarda el cliente en `shop.slice` (`cartCustomer`) con `setCartCustomerThunk`: si ya hay carrito lo reasigna con `PUT /carts/reassignuser`, y el nivel de precio del cliente (P0..P3) pasa a ser el del catálogo; las líneas se registran con `userId` = cliente y `sellerId` = usuario de la sesión. Cerrar sesión borra clientes, uuid y cliente de la venta.
- **Cartera y pagos (E5, hecho):** `features/wallet` ya no tiene datos de ejemplo ni se guarda en el navegador (la clave de persistencia sube a v6). Lista paginada de `POST /wallet` (por bodega activa), totales de `POST /wallet/summary` (KPIs), facturas del cliente abierto de `POST /wallet/internal`, abonos con `POST /payments/register` (efectivo, el mismo cuerpo que usaba importadora-online) y cupo/plazo con `PUT /users/credit`. Un abono sobre una factura va a esa venta; un abono general se reparte entre las facturas más antiguas, un pago por factura (`splitPayment`). Después de abonar o cambiar el cupo se vuelven a leer facturas, lista y totales (el backend calcula los saldos). Estados de crédito: Al día, Con saldo y Sin crédito (el listado no trae fechas; la mora por factura se ve en el estado de cuenta). Supuestos a confirmar: saldo adeudado = `sumAmount - verifiedPayments`; cupo disponible = cupo - saldo - reservado; vencimiento = fecha de la venta + `creditDays`; con transferencia el backend exige comprobante, por eso la pantalla solo abona en efectivo.
- **Alertas flotantes:** `sonner` con la misma configuración de Grandma's Liquors (`position="top-center"`, `richColors`, `closeButton`).

## 7. Carpetas reservadas

`src/global2/` y `src/features2/` se conservan tal cual. No se tocan ni se eliminan.

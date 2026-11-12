# Estructura Completa del Proyecto (`importadoraInterfaz` + `importadoraApi`)

Documento maestro generado mediante el estudio integral de **todos los archivos** que conforman tanto la interfaz de usuario (**Frontend React/TypeScript**) como el servidor (**Backend Go/Echo + PostgreSQL**).

---

## 1. Arquitectura General y Principios de Diseño

### Frontend (`importadoraInterfaz`)
- **Sentido de las dependencias:** `app → features → global → api`. Una feature se comunica con otra únicamente a través de su `index.ts`.
- **Capas internas de cada feature (de abajo hacia arriba):** `types → constants → helpers (adapters) → services / selectors → slices → thunks → hooks → components → screens`.
- **Pareja de componentes:** Cada componente visual `.tsx` mantiene a su lado su hoja de estilos `.css` o módulos agrupados por responsabilidad.
- **Total de archivos en `src/`:** 962 archivos.

### Backend (`importadoraApi`)
- **Arquitectura en capas limpias:** `routes → controllers → services → repositories → core/db (PostgreSQL pgxpool + GORM)`.
- **Inyección de dependencias centralizada:** Armado modular en `src/core/bootstrap/container.go` y registro unificado en `router.go`.
- **Base de datos y Esquema Maestro:** `src/core/db/startdb.pgsql` (55 tablas/vistas, 20 triggers automáticos, funciones e índices GIN Trigram).
- **Total de archivos en `src/`:** 234 archivos (+ `main.go`).

---

## 2. Resumen de Carpetas de Primer Nivel

### En `importadoraInterfaz` (Frontend)
| Carpeta | Propósito Principal |
|---|---|
| `src/api/` | Cliente HTTP Axios, interceptores JWT, configuración de endpoints, paginación y salud del servidor. |
| `src/app/` | Shell del ERP: Layout general, cabecera, menú lateral, lienzo dinámico (`MainContent`), `DrawerRight` y Redux Store. |
| `src/features/` | **29 módulos de negocio** (auth, shop, inventory, sales/orders, purchases, transfers, wallet, billing, cashRegister, etc.). |
| `src/global/` | Átomos y moléculas UI reutilizables, hooks transversales, formateadores, almacenamiento y sistema de notificaciones toast. |
| `src/styles/` | Tokens de diseño visual (colores, tipografía, espaciados, sombras y animaciones). |
| `src/assets/` | Íconos SVG, ilustraciones y logotipos institucionales. |
| `scripts/` | Scripts de verificación de contrato OpenAPI/Swagger (`check-endpoints.mjs`), tipografía y pruebas humo. |

### En `importadoraApi` (Backend)
| Carpeta | Propósito Principal |
|---|---|
| `src/core/` | Configuración de entorno, conexión PostgreSQL (`pgxpool` + `GORM`), script maestro `startdb.pgsql`, middlewares JWT/CORS/Permisos, servidor Echo y utilidades HTTP. |
| `src/features/` | **22 módulos de dominio** (audit, auth, bank_statements, carts, cash_sessions, catalog, companies, customers, externals, health, inventory, notifications, payments, products, purchases, quotations, recyclebin, reports, returns, sales, screensaver, staff, swagger, wallet, warehouses). |

---

## 3. Estudio Detallado de `importadoraInterfaz` (Frontend)

### `importadoraInterfaz/src/api/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `config.ts` | URL base, timeout y endpoints del backend | api/client, api/health; scripts/check-endpoints.mjs revisa que cada ruta exista en el Swagger (npm run check:api) |
| `index.ts` | api/index · API pública de la capa api | features y app (importan desde aquí) |

### `importadoraInterfaz/src/api/endpoints/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `admin.endpoints.ts` | rutas del backend de administración: compañías, pantallas de reposo, auditoría, reportes, papelera y administradores | api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger) |
| `auth.endpoints.ts` | rutas del backend de sesión y utilidades: ingreso, refresh, logout, me, salud y documentación | api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger) |
| `catalog.endpoints.ts` | rutas del backend de productos, búsqueda y catálogos (marcas, categorías y modelos) | api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger) |
| `customers.endpoints.ts` | rutas del backend de clientes y su documentación legal | api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger) |
| `employees.endpoints.ts` | rutas del backend de empleados, roles, permisos y credenciales | api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger) |
| `sales.endpoints.ts` | rutas del backend de ventas: carrito, pedidos, facturas, cotizaciones, pagos, caja, banco y cartera | api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger) |
| `stock.endpoints.ts` | rutas del backend de bodegas, inventario, traslados y conteos físicos | api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger) |
| `suppliers.endpoints.ts` | rutas del backend de compras, proveedores y terceros externos | api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger) |

### `importadoraInterfaz/src/api/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `pagination.test.ts` | pruebas de la conversión de la respuesta de un listado a { items, meta } | api/pagination; se corre con npm test |
| `pagination.ts` | valores por defecto de página y conversión de la respuesta de un listado a una página lista para la UI | api/types (PageRequest, Paginated); lo usarán los services de cada feature que liste datos (productos, clientes, cartera...) |
| `params.test.ts` | pruebas de los parámetros de consulta de los listados | api/params; se corre con npm test |
| `params.ts` | arma los parámetros de consulta (query string) de los listados de la API en Go | api/index (se exporta) y los services de cada feature (los pasan a apiClient.get como { params }) |

### `importadoraInterfaz/src/api/http/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `client.ts` | instancia de axios con token Bearer y manejo de errores | api/config, api/types; lo usarán los services de cada feature |
| `errors.ts` | traduce cualquier error de axios (red, timeout o HTTP) a un AppApiError legible para el cliente | api/client (interceptores) y features/auth (mensaje de login); ojo: antes vivía dentro de client.ts |
| `health.ts` | prueba de conexión con el backend y latencia en ms | api/client y api/config (HEALTH.CHECK); lo usa global/hooks/useApiHealth para mostrar la latencia en el footer del menú |

### `importadoraInterfaz/src/api/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `api.types.ts` | contratos de respuesta, paginación y error de la API | api/client, api/health |

### `importadoraInterfaz/src/app/componentApp/contentMain/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `MainContent.css` | MainContent.css · estilos del lienzo central · solo usa tokens de styles/tokens.css | MainContent.tsx |
| `MainContent.tsx` | lienzo central: muestra la pantalla según el módulo y subitem activos con guardia de permisos | navigation (estado ui y títulos), usePermissions (hasScreenAccess), screenRegistry y MainContentPlaceholder |
| `MainContentPlaceholder.css` | MainContentPlaceholder.css · estilos del aviso de módulo aún sin pantalla (Próxima Fase) · solo usa tokens de styles/tokens.css | MainContentPlaceholder.tsx |
| `MainContentPlaceholder.tsx` | aviso de módulo o subgestión que todavía no tiene pantalla ("Próxima Fase") | MainContent (cuando screenRegistry no devuelve pantalla); título e ícono de navigation |
| `NotFoundScreen.css` | NotFoundScreen.css | NotFoundScreen.tsx |
| `NotFoundScreen.tsx` | pantalla 404 interactiva con partículas formando la imagen 404.jpg | react, @/assets/images/404.jpg, @/features/screensaver, @/global/hooks/store/useRedux |
| `screenRegistry.ts` | qué componente de pantalla se muestra para cada combinación de módulo y subgestión | react, @/features/navigation, @/features/shop, ./NotFoundScreen |

### `importadoraInterfaz/src/app/componentApp/drawerRight/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `drawerRegistry.ts` | define cuándo se abre el panel derecho y qué muestra en cada caso | react, @reduxjs/toolkit, @/app/store/store, @/features/navigation |
| `DrawerRight.css` | DrawerRight.css · estilos del contenedor del panel derecho (ancho animado y cuerpo con scroll) · solo usa tokens de styles/tokens.css | DrawerRight.tsx |
| `DrawerRight.tsx` | panel derecho contextual: carrito en el catálogo, detalle del objeto seleccionado o formulario de la acción abierta; se cierra con un clic fuera de él o con Esc | react, @/global/hooks/store/useRedux, @/global/hooks/ui/useEscapeKey, @/global/hooks/ui/useClickOutside |
| `formRegistry.test.ts` | todas las acciones que se abren en el panel derecho tienen su formulario, su título y su ícono | formRegistry; se corre con npm test |
| `formRegistry.ts` | qué formulario o detalle se abre en el panel derecho para cada acción | drawerRegistry (modo «form»), FormDrawerBody (lo pinta) y navigation (DrawerFormKind, openDrawerForm); las entradas viven en entries/ agrupadas por área (personas, inventario y operación) |
| `useDrawerPresence.ts` | deja el panel montado mientras se cierra, para que se pueda ver la animación de salida | DrawerRight; recibe el modo actual (o null) y devuelve qué modo mostrar, si está montado y si está abierto |

### `importadoraInterfaz/src/app/componentApp/drawerRight/entries/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `formEntry.types.ts` | forma de cada entrada del registro de formularios del panel derecho: ícono, título, subtítulo y qué se pinta | las entradas de entries/ y formRegistry (las junta) |
| `inventory.entries.ts` | entradas del registro de formularios del panel derecho de inventario: productos, catálogos, ubicaciones y etiquetas QR | formRegistry (las junta), los paneles de cada feature y los íconos de assets |
| `operations.entries.ts` | entradas del registro de formularios del panel derecho de operación: cotizaciones, traslados, caja, cartera, sedes y auditoría | formRegistry (las junta), los paneles de cada feature y los íconos de assets |
| `people.entries.ts` | entradas del registro de formularios del panel derecho de personas: clientes, empleados, roles, permisos y administradores superadmin | react, @/features/customers, @/features/externals, @/features/employees |

### `importadoraInterfaz/src/app/componentApp/drawerRight/parts/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `DrawerHeader.css` | DrawerHeader.css · estilos del encabezado único del panel derecho (ícono en caja amarilla, título y botón cerrar) · solo usa tokens de styles/tokens.css | DrawerHeader.tsx |
| `DrawerHeader.tsx` | encabezado único del panel derecho: botón cerrar a la izquierda (al límite con contentMain), ícono, título, detalle y menú opcional | DrawerRight (le pasa el ícono, los textos de la feature, la acción de cerrar y, si el panel tiene opciones, el menú) |
| `DrawerTab.css` | DrawerTab.css · estilos de la pestaña lateral del carrito o traslados contraídos (arrastrable en vertical) · solo usa tokens de styles/tokens.css | DrawerTab.tsx |
| `DrawerTab.test.tsx` | pruebas de la pestaña del carrito y traslados: renderizado de ícono, contador, clic y arrastre vertical | DrawerTab (suite de pruebas) |
| `DrawerTab.tsx` | pestaña lateral con contador para paneles contraídos (carrito, traslados en borrador); arrastrable en vertical | DrawerRight; global useVerticalDrag (arrastre y posición guardada) |
| `FormDrawerBody.tsx` | cuerpo del panel derecho cuando hay una acción abierta: pinta el formulario o detalle que dice formRegistry | drawerRegistry (modo «form»), formRegistry y navigation (drawerForm) |

### `importadoraInterfaz/src/app/componentApp/header/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AppHeader.css` | AppHeader.css · estilos de los controles junto al título (compañía y bodega) · solo usa tokens de styles/tokens.css | AppHeader.tsx |
| `AppHeader.tsx` | controles a la derecha del título: selector de compañía (superadmin), selector de bodega (solo en Tienda), pastilla de estado de caja (solo en Caja) y notificaciones | react, @/global/hooks/store/useRedux, @/global/components/UI/atoms/Pill, ./company/CompanySelector |

### `importadoraInterfaz/src/app/componentApp/header/company/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CompanySelector.tsx` | botón del header que muestra la compañía activa y abre el menú para saltar a otra (solo el superadmin lo ve) | features/companies (lista del backend), navigation (setActiveCompany, compañía activa), auth (tipo de usuario) y global useClickOutside |

### `importadoraInterfaz/src/app/componentApp/header/warehouse/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `WarehouseMenu.css` | WarehouseMenu.css · estilos del menú desplegable de bodegas (menú flotante de la maqueta) · solo usa tokens de styles/tokens.css | WarehouseMenu.tsx |
| `WarehouseMenu.tsx` | lista desplegable de bodegas disponibles con la activa marcada | WarehouseSelector (le pasa la lista de bodegas del backend y la activa, y recibe la elegida); tipo Warehouse de features/warehouses |
| `WarehouseSelector.css` | WarehouseSelector.css · estilos del botón selector de bodega del encabezado (botón gris con ícono y flecha) · solo usa tokens de styles/tokens.css | WarehouseSelector.tsx |
| `WarehouseSelector.tsx` | botón que muestra la bodega activa y abre el menú para cambiarla | navigation (bodega activa), features/warehouses (lista del backend y elección de la activa), auth (bodega del usuario), global useClickOutside (cierra con clic fuera o Escape) |

### `importadoraInterfaz/src/app/componentApp/sideMenu/brand/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `SideMenuBrand.css` | SideMenuBrand.css · estilos de la cabecera del menú lateral (logo amarillo, nombre y botón de contraer) · solo usa tokens de styles/tokens.css | SideMenuBrand.tsx |
| `SideMenuBrand.tsx` | cabecera del menú lateral: logo con las iniciales, nombre y el botón para contraer o expandir el menú (con el menú contraído solo se ve el botón) | SideMenu (le pasa si el menú está contraído y la acción de alternarlo) |

### `importadoraInterfaz/src/app/componentApp/sideMenu/footer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ApiStatus.css` | ApiStatus.css · estilos del estado de la API en el footer del menú (línea de texto con punto de color) · solo usa tokens de styles/tokens.css | ApiStatus.tsx |
| `ApiStatus.tsx` | estado de la conexión con la API en el footer del menú (conectando, en línea con ms, o sin conexión) | global useApiHealth (consulta), SideMenu (le pasa si el menú está contraído); ojo: antes este indicador estaba en el header |
| `SideMenuUser.css` | SideMenuUser.css · estilos de la tarjeta de usuario del menú lateral (avatar azul, nombre y rol) · solo usa tokens de styles/tokens.css | SideMenuUser.tsx |
| `SideMenuUser.tsx` | tarjeta del usuario en el footer del menú (avatar con iniciales, nombre, rol, perfil en el panel derecho y botón de cerrar sesión) | features/auth (usuario de la sesión, logoutThunk), navigation (openDrawerForm «userProfile»); las iniciales salen de global/helpers/format; la confirmación es global/.../ConfirmDialog; SideMenu le pasa si el menú está contraído |

### `importadoraInterfaz/src/app/componentApp/sideMenu/item/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `SideMenuItem.css` | SideMenuItem.css · estilos de cada módulo del menú (ícono, nombre, insignia y flecha) · solo usa tokens de styles/tokens.css | SideMenuItem.tsx |
| `SideMenuItem.tsx` | un módulo del menú (ícono, nombre, insignia y flecha) con sus subgestiones debajo | SideMenu (le pasa el módulo y recibe los clics), SideMenuSubitems (la lista que se despliega) |
| `SideMenuSubitems.css` | SideMenuSubitems.css · estilos de las subgestiones del menú (se despliegan animando la altura) · solo usa tokens de styles/tokens.css | SideMenuSubitems.tsx |
| `SideMenuSubitems.tsx` | lista de subgestiones de un módulo; se despliega animando su altura cuando el módulo está activo | SideMenuItem (subitems, si está abierta y cuál está activo); el id de cada subgestión sale de navigation |

### `importadoraInterfaz/src/app/componentApp/sideMenu/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `SideMenu.css` | SideMenu.css · estilos del contenedor del menú lateral (lista y footer) · solo usa tokens de styles/tokens.css | SideMenu.tsx |
| `SideMenu.tsx` | menú lateral: marca, lista de módulos con sus subgestiones y, abajo, el estado de la API y el usuario | navigation (MENU_ITEMS y acciones del estado ui, incluido sidebarOpen); partes: SideMenuBrand, SideMenuItem, ApiStatus y SideMenuUser |
| `useSideMenuHover.ts` | abre y cierra el menú lateral como el de Grandma's: con mouse queda contraído (solo íconos) y se abre al pasar el cursor; en pantallas táctiles se usa el botón ☰ | SideMenu (lo usa) y SideMenuBrand (oculta el botón ☰ cuando el menú se maneja con el cursor) |

### `importadoraInterfaz/src/app/layout/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AuthGate.tsx` | puerta de entrada: sin sesión muestra el login, con sesión muestra el ERP | features/auth (selector y pantalla de login) y ErpLayout |
| `ErpLayout.css` | ErpLayout.css · estilos del layout del ERP (menú, columna central con cabecera y contenido, y drawer) · solo usa tokens de styles/tokens.css | ErpLayout.tsx |
| `ErpLayout.tsx` | layout del ERP: menú lateral, columna central (cabecera y contenido) y drawer derecho | componentApp/* (header, sideMenu, contentMain, drawerRight) y features/realtime (useRealtime) y features/auth (useSessionActivity) y features/shop (useCartSync) y features/screensaver (protector de pantalla); lo muestra AuthGate cuando hay sesión |
| `StoreApp.tsx` | raíz de la app con el store de redux: pone el Provider y la puerta de entrada (login o ERP) | app/store (store) y AuthGate |

### `importadoraInterfaz/src/app/store/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `rootReducer.ts` | junta los reducers de cada feature (ui, shop, products, cart, wallet, customers, catalogs, warehouses, orders, returns, settings, superadmin, locations, auth, realtime) | features/*/index, app/store/store |
| `store.ts` | configura redux + persistencia y exporta los tipos RootState y AppDispatch | rootReducer, global/helpers/storage; ojo: antes se llamaba store.tsx (no tenía JSX) |

### `importadoraInterfaz/src/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `App.css` | App.css · reset y estilos base de la app; importa los tokens · solo usa tokens de styles/tokens.css | App.tsx |
| `App.tsx` | raíz de la app, solo monta StoreApp | app/layout/StoreApp y global AppToaster (alertas flotantes) |
| `main.tsx` | punto de entrada: monta la app en el #root del index.html | index.html (el script apunta aquí), App.tsx y App.css |

### `importadoraInterfaz/src/assets/icons/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ban.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `building.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `cart.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `check.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `copy.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `database.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `edit.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `eye.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `file-text.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `history.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `list.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `logout.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `map-pin.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `package-alt-2-svgrepo-com.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `qr-code.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `receipt.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `refresh.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `settings.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `shipping.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `shopping-bag.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `store.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `trash.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `user.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `wallet.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |

### `importadoraInterfaz/src/assets/images/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `404.jpg` | Recurso gráfico (JPG) | Componentes visuales de la interfaz |
| `login-fondo.webp` | Recurso gráfico (WEBP) | Componentes visuales de la interfaz |
| `login-ilustracion.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |
| `screensaver-logo.jpg` | Recurso gráfico (JPG) | Componentes visuales de la interfaz |

### `importadoraInterfaz/src/assets/logos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ip-logo.svg` | Recurso gráfico (SVG) | Componentes visuales de la interfaz |

### `importadoraInterfaz/src/features/audit/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AuditDetailPanel.tsx` | detalle completo (solo lectura) de un movimiento, en el panel derecho: quién, cuándo, desde dónde, qué cambió y el JSON original | formRegistry (lo muestra), audit.types y AuditScreen.css (clases audit-*) |
| `AuditTable.tsx` | tabla de movimientos de auditoría (fecha, gestión, acción, quién y registro); cada fila abre su detalle | AuditScreen (la usa), audit.types, RowActions (ícono «Ver detalle») y AuditScreen.css (clases audit-*) |

### `importadoraInterfaz/src/features/audit/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit.constants.ts` | gestiones y tipos de actor con su texto en español, y tamaño de página de la auditoría | audit.adapter (etiquetas) y AuditFilters (opciones del filtro de gestión) |

### `importadoraInterfaz/src/features/audit/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit.adapter.test.ts` | pruebas de la conversión de movimientos de auditoría y de las distintas formas de «changes» | audit.adapter; se corre con npm test |
| `audit.adapter.ts` | convierte los movimientos de auditoría de la API a lo que usa la app; es el único lugar que conoce los nombres del backend | audit.service (lo usa), audit.api.types, audit.types y audit.constants |
| `audit.format.ts` | cómo se escribe la fecha de un movimiento en pantalla | AuditTable y AuditDetailModal |

### `importadoraInterfaz/src/features/audit/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useAuditLog.ts` | pide la página de auditoría al backend cuando cambia la compañía, la página o los filtros y devuelve la lista y su estado | AuditScreen (el único que lo usa), audit.thunks y audit.slice (filtros y página), audit.selectors y auth (selectRequestContext: compañía activa del superadmin o la del admin) |
| `useOpenHistory.ts` | devuelve la función que abre la auditoría ya filtrada por la gestión y el registro que se está mirando | los botones «Ver historial» de otras pantallas (traslados, clientes); navigation.openHistory cambia de pantalla y AuditScreen aplica el filtro |

### `importadoraInterfaz/src/features/audit/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | audit/index · API pública de la feature auditoría (movimientos de solo lectura para admin y superadmin) | screenRegistry (AuditScreen) |

### `importadoraInterfaz/src/features/audit/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AuditScreen.css` | AuditScreen.css · pantalla de auditoría: tarjeta única, toolbar con filtros homogéneos y tabla responsive | AuditScreen.tsx |
| `AuditScreen.tsx` | auditoría de movimientos: filtros rápidos por rol, tipo de acción, gestión y rango de fechas (Desde / Hasta) | useAuditLog (datos), AuditTable, audit.constants (gestiones, acciones y roles), AuditDetailPanel (vía formRegistry) y global Pagination; la monta MainContent (screenRegistry) |

### `importadoraInterfaz/src/features/audit/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit.selectors.ts` | lecturas del estado de la auditoría | audit.slice (estado) y useAuditLog; los movimientos se filtran por registro porque la API no lo filtra |

### `importadoraInterfaz/src/features/audit/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit.service.test.ts` | pruebas de GET /audit-logs: filtros, compañía del superadmin y conversión | audit.service; el cliente HTTP está simulado (no hay red) |
| `audit.service.ts` | llamada al backend de auditoría: GET /audit-logs (movimientos con quién, cuándo y qué cambió); solo lectura | api/client, api/config, api/params y api/pagination, audit.adapter (convierte); la usa useAuditLog |

### `importadoraInterfaz/src/features/audit/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit.slice.test.ts` | pruebas del estado de la auditoría: filtros y página, carga con requestId y descarte de respuestas viejas | audit.slice y audit.thunks (solo sus tipos de acción) y audit.selectors; se corre con npm test |
| `audit.slice.ts` | estado de la auditoría: filtros, página y la lista que llegó del backend | audit.thunks (lo llenan), audit.selectors (lecturas), useAuditLog (cambia filtros y página) y rootReducer (clave 'audit'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/audit/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit.thunks.ts` | pide al backend la página de auditoría que indican los filtros y la página del slice | audit.service (llamada), auth (selectRequestContext: compañía activa del superadmin o la del admin) y audit.slice (reacciona); la despacha useAuditLog |

### `importadoraInterfaz/src/features/audit/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit.api.types.ts` | lo que responde la API en Go en GET /audit-logs (AuditLogResponse), con los nombres del backend | audit.adapter (convierte a AuditEntry) y audit.service |
| `audit.types.ts` | modelos que usa la app en la auditoría: movimiento, filas de cambios y filtros | audit.adapter (los arma), audit.service, audit.slice (estado), useAuditLog, AuditScreen y sus componentes |

### `importadoraInterfaz/src/features/auth/components/branding/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `LoginBrand.css` | LoginBrand.css · estilos de la marca del login (copia del diseño de importadora-online) · solo usa tokens de styles/tokens.css | LoginBrand.tsx |
| `LoginBrand.tsx` | marca del login: logo "IP" sobre cuadro oscuro y la palabra "Online" | LoginForm (va arriba del formulario); el texto sale de auth.constants |
| `LoginHero.css` | LoginHero.css · estilos de la ilustración del login (copia del diseño de importadora-online) · solo usa tokens de styles/tokens.css | LoginHero.tsx |
| `LoginHero.tsx` | ilustración grande del lado izquierdo del login | LoginScreen (la coloca sobre el fondo); la imagen es assets/images/login-ilustracion.svg |
| `LoginWelcome.css` | LoginWelcome.css · estilos del saludo del login (copia del diseño de importadora-online) · solo usa tokens de styles/tokens.css | LoginWelcome.tsx |
| `LoginWelcome.tsx` | título "Bienvenido" y frase de bienvenida del login | LoginForm (va entre la marca y los campos); los textos salen de auth.constants |

### `importadoraInterfaz/src/features/auth/components/form/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `LoginActions.css` | LoginActions.css · estilos de los botones del login (copia del diseño de importadora-online) · solo usa tokens de styles/tokens.css | LoginActions.tsx |
| `LoginActions.tsx` | botones del login: "Iniciar sesión" (envía el formulario) y "Registrarse" | LoginForm (le dice si está ingresando); el envío lo maneja el <form> con useLoginForm |
| `LoginForm.css` | LoginForm.css · estilos del formulario del login (copia del diseño de importadora-online) · solo usa tokens de styles/tokens.css | LoginForm.tsx |
| `LoginForm.tsx` | formulario del login: marca, saludo, campos, opciones y botones | useLoginForm (estado y envío) y las partes LoginBrand, LoginWelcome, LoginInput, LoginOptions y LoginActions |
| `LoginInput.css` | LoginInput.css · estilos del campo del login (copia del diseño de importadora-online) · solo usa tokens de styles/tokens.css | LoginInput.tsx |
| `LoginInput.tsx` | campo de texto del login (correo o contraseña) con borde izquierdo amarillo | LoginForm (le pasa valor y cambio); props en types/auth.login.types |
| `LoginOptions.css` | LoginOptions.css · estilos de la fila recordarme / olvidé mi contraseña (copia del diseño de importadora-online) · solo usa tokens de styles/tokens.css | LoginOptions.tsx |
| `LoginOptions.tsx` | fila bajo los campos: "Recordarme" y "¿Has olvidado tu contraseña?" | LoginForm (recordarme y su cambio); useLoginForm decide dónde se guarda la sesión |

### `importadoraInterfaz/src/features/auth/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `profile/UserProfilePanel.tsx` | perfil del usuario en sesión en el panel derecho (reemplaza al modal flotante): datos de la cuenta, empresa, sede y permisos | formRegistry («userProfile»), SideMenuUser, auth/selectors, navigation (closeDrawerForm) |
| `profile/UserProfilePanel.css` | estilos del perfil en el panel derecho, solo tokens | UserProfilePanel.tsx |

### `importadoraInterfaz/src/features/auth/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.constants.ts` | textos del login (lo que ve el cliente, en español) | los componentes del login y useLoginForm (mensajes) |
| `auth.session.constants.ts` | tiempos y eventos que usa el control de sesión (inactividad y renovación) | useSessionActivity; los textos de las alertas están en auth.constants (LOGIN_MESSAGES) |

### `importadoraInterfaz/src/features/auth/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.adapter.test.ts` | prueba que la respuesta de la API se convierta al usuario de la app | auth.adapter |
| `auth.adapter.ts` | convierte la respuesta de la API (actor + permisos) al usuario y los tokens que usa la app | auth.service (lo aplica al login y a la renovación); no lo importa nadie más |
| `auth.helpers.ts` | funciones puras del login: validar campos, armar el nombre y traducir errores | useLoginForm (validación), auth.thunks (mensaje de error), SideMenuUser (nombre) |
| `auth.permissions.test.ts` | Pruebas unitarias de auth.permissions | auth.permissions (suite de pruebas) |
| `auth.permissions.ts` | convierte los permisos del empleado que trae el login (claves «módulo:acción») en la matriz por módulo y pantalla del menú | auth.session (estado inicial), auth.slice (al iniciar sesión) y usePermissions (la lee); usa el adaptador de empleados y el menú |
| `auth.session.ts` | puente entre la sesión guardada en el navegador y el estado de auth | global/helpers/session.storage (guarda y lee), auth.slice (estado inicial) y auth.thunks (guardar y borrar) |
| `auth.token.test.ts` | pruebas de la lectura del vencimiento (exp) de un JWT y de cuándo toca renovarlo | auth.token; se corre con npm test |
| `auth.token.ts` | lee la fecha de vencimiento (exp) de un JWT y dice cuánto falta o si ya toca renovarlo | useSessionActivity (decide cuándo renovar); no valida la firma, solo lee el tiempo del propio token |

### `importadoraInterfaz/src/features/auth/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useLoginForm.ts` | estado y envío del formulario de login (correo, contraseña, recordarme) con alertas flotantes | auth.helpers (validación), auth.thunks (login), auth.selectors (¿ingresando?), global toast; lo usa LoginForm |
| `useSessionActivity.ts` | vigila la sesión mientras el usuario está dentro: cierra por inactividad y renueva el token en silencio | auth.thunks (logoutThunk y refreshSessionThunk), auth.token (vencimiento del JWT), auth.session (token guardado) y auth.session.constants (tiempos); lo monta ErpLayout |

### `importadoraInterfaz/src/features/auth/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | auth/index · API pública de la feature auth (autenticación y sesión de usuario) | AuthGate (pantalla y selector), SideMenuUser (usuario y logout), rootReducer (reducer), store (logout por 401), ErpLayout (useSessionActivity) |

### `importadoraInterfaz/src/features/auth/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `LoginScreen.css` | LoginScreen.css · estilos de la pantalla de login (copia del diseño de importadora-online) · solo usa tokens de styles/tokens.css | LoginScreen.tsx |
| `LoginScreen.tsx` | pantalla completa de login: fondo, ilustración a la izquierda y panel blanco con el formulario | LoginHero y LoginForm; la muestra AuthGate cuando no hay sesión |

### `importadoraInterfaz/src/features/auth/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.selectors.test.ts` | pruebas del contexto de petición (companyId, userId, bodega y nivel de precio) | auth.selectors; se corre con npm test |
| `auth.selectors.ts` | lecturas simples del estado de la sesión y el contexto de petición | AuthGate (¿hay sesión?), SideMenuUser (usuario), LoginForm (¿está ingresando?) y los thunks de las demás features (selectRequestContext) |

### `importadoraInterfaz/src/features/auth/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.service.ts` | llamadas al backend de la sesión: iniciar (POST /auth/login), renovar (POST /auth/refresh), perfil (GET /auth/me) y cerrar (POST /auth/logout) | api/client (axios con interceptores) y api/config (endpoint), auth.adapter (convierte la respuesta); la usa auth.thunks |

### `importadoraInterfaz/src/features/auth/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.slice.ts` | estado de la sesión: usuario, estado (anónimo, ingresando, autenticado) y último error | auth.thunks (login/logout/fetchMe), auth.selectors (lecturas) y AuthGate (decide login o ERP) |

### `importadoraInterfaz/src/features/auth/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.thunks.ts` | acciones asíncronas de la sesión: iniciar, renovar, consultar perfil y cerrar sesión | auth.service (login, refresh, me, logout), auth.session (guardar/borrar) y auth.slice (reacciona a los resultados); useSessionActivity y SideMenuUser los despachan |

### `importadoraInterfaz/src/features/auth/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.api.types.ts` | lo que responde la API en Go en el login, la renovación y GET /auth/me (nombres del backend tal cual) | auth.adapter (los convierte a AuthResponse) y auth.service (los pide) |
| `auth.login.types.ts` | props de las partes del formulario de login | LoginInput, LoginOptions y LoginActions (las compone LoginForm) |
| `auth.types.ts` | contratos de la sesión: usuario, credenciales, respuesta del login y estado del slice | auth.service, auth.slice, auth.thunks, auth.selectors y los componentes del login |

### `importadoraInterfaz/src/features/bank/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `BankConfirmPanel.css` | BankConfirmPanel.css · panel de confirmar un movimiento del banco: resumen del movimiento y lista de pagos candidatos · solo usa tokens de styles/tokens.css | BankConfirmPanel.tsx |
| `BankConfirmPanel.tsx` | panel lateral para confirmar un movimiento del banco: elige el pago por transferencia que respalda (o ninguno) y confirma; al ligar un pago, la API lo verifica | usePendingPayments (pagos en revisión), bank.adapter (candidatos), useBankActions (confirmar), DrawerFormShell.css (armazón) y navigation (cerrar); lo abre formRegistry («bankConfirm») |

### `importadoraInterfaz/src/features/bank/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `BankRecordsTable.tsx` | tabla de los movimientos leídos del PDF del banco: fecha, descripción, canal, referencia, valor, estado y acciones (confirmar contra un pago o ignorar) | BankReconciliationScreen (la usa), RowActions (acciones con íconos de línea), Pill (estado), ConfirmDialog (ignorar), useBankActions y navigation (abre el panel de confirmar) |

### `importadoraInterfaz/src/features/bank/components/upload/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `BankKpis.tsx` | resumen de las entradas de la página cargada: cuántas, cuánto falta por confirmar y cuánto ya está confirmado | BankReconciliationScreen (lo pinta), bank.selectors (selectBankSummary) y global format (pesos) |
| `BankUploadButton.tsx` | botón de la barra de la conciliación para subir el PDF que entrega el banco: de ahí sale todo lo que se concilia | BankReconciliationScreen (lo pinta a la derecha de la búsqueda) y useBankUpload (subir; los avisos de lo leído o del error salen como alertas) |

### `importadoraInterfaz/src/features/bank/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank.constants.ts` | estado inicial, tamaño de página y opciones de filtro de la conciliación bancaria | bank.slice (initialState), bank.service (página) y BankFiltersBar (opciones) |

### `importadoraInterfaz/src/features/bank/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank.adapter.test.ts` | Pruebas unitarias de bank.adapter | bank.adapter (suite de pruebas) |
| `bank.adapter.ts` | convierte lo que responde la API (movimientos del banco y pagos por verificar) a lo que usa la app, resume la lista y propone a qué pago corresponde cada movimiento | bank.service (convierte cada respuesta), BankKpis (resumen) y BankConfirmPanel (candidatos); es el único lugar que conoce los nombres del backend en este módulo |

### `importadoraInterfaz/src/features/bank/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useBankActions.ts` | confirmar o ignorar un movimiento del banco con su aviso de éxito o error | BankConfirmPanel y BankRecordsTable (lo usan), bank.thunks y toast |
| `useBankRecords.ts` | pide los movimientos del banco cuando cambia la página o un filtro, y maneja los filtros de la pantalla (la búsqueda por texto con espera) | BankReconciliationScreen (lo usa), bank.thunks, bank.slice (filtros y página), bank.selectors y auth (hay sesión) |
| `useBankUpload.ts` | subir el PDF del banco y avisar qué se leyó | BankUploadCard (lo usa), bank.thunks (subir), bank.selectors (estado de la subida) y toast |
| `usePendingPayments.ts` | pide los pagos por transferencia que siguen en revisión (los que un movimiento del banco puede respaldar) | BankConfirmPanel (lo usa al abrirse), bank.thunks y bank.selectors |

### `importadoraInterfaz/src/features/bank/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | bank/index · API pública de la feature bank (conciliación bancaria a partir del PDF del banco) | rootReducer (reducer), WalletScreen (pantalla) y formRegistry (panel de confirmar) |

### `importadoraInterfaz/src/features/bank/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `BankReconciliationScreen.css` | BankReconciliationScreen.css · conciliación bancaria: subida del PDF, resumen, filtros y tabla de movimientos · solo usa tokens de styles/tokens.css | BankReconciliationScreen.tsx |
| `BankReconciliationScreen.tsx` | Cartera > Conciliación Entradas: se sube el PDF del banco, se leen sus movimientos y cartera confirma que cada entrada llegó, ligándola a un pago por transferencia | useBankRecords (lista y filtros), BankUploadButton, BankKpis, BankRecordsTable, global SearchBar (con su botón de limpiar integrado), FilterSelect y Pagination; la monta WalletScreen |

### `importadoraInterfaz/src/features/bank/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank.selectors.ts` | lecturas de la conciliación bancaria: lista con filtros, resumen, subida del PDF y pagos por verificar | BankReconciliationScreen y sus partes, y los hooks de bank; leen state.bank |

### `importadoraInterfaz/src/features/bank/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank.service.test.ts` | pruebas de las llamadas de la conciliación bancaria: subir el PDF, listar con filtros, confirmar, ignorar y pagos por verificar | bank.service; el cliente HTTP está simulado (no hay red) |
| `bank.service.ts` | llamadas al backend de la conciliación bancaria: subir el PDF del banco, listar sus movimientos, confirmarlos o ignorarlos y traer los pagos por verificar | api/client y api/config (rutas), bank.adapter (convierte); las usa bank.thunks |

### `importadoraInterfaz/src/features/bank/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank.slice.test.ts` | pruebas del estado de la conciliación bancaria: arranca vacío, los filtros vuelven a la página 1 y una respuesta vieja no pisa a la nueva | bank.slice, bank.thunks y bank.constants; no usa red (las acciones se simulan) |
| `bank.slice.ts` | estado de la conciliación bancaria: movimientos del PDF (con filtros y página), subida del PDF y pagos por verificar | bank.thunks (lo llenan), bank.selectors (lecturas) y rootReducer (clave 'bank'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/bank/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank.thunks.ts` | cargas y acciones de la conciliación bancaria: listar movimientos, subir el PDF, traer pagos por verificar, confirmar e ignorar | bank.service (llamadas) y bank.slice (reacciona); las despachan useBankRecords, useBankUpload, usePendingPayments y useBankActions |

### `importadoraInterfaz/src/features/bank/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank.types.ts` | contratos de la conciliación bancaria: movimientos leídos del PDF del banco, pagos por verificar, filtros y estado del slice | bank.adapter (convierte lo del backend), bank.service, bank.slice, bank.selectors y los componentes |

### `importadoraInterfaz/src/features/billing/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `BillingConfigPanel.tsx` | formulario en el panel derecho de los datos fiscales de la bodega: quién factura, resolución de la DIAN, rango autorizado y retenciones | useBillingConfigForm (estado, validación y guardado) y DrawerFormShell.css (armazón); lo abre formRegistry («billingConfig») |
| `DocSeriesPanel.tsx` | formulario en el panel derecho de una serie de consecutivos: prefijo y próximo número, con la vista de cómo saldrá el siguiente | useDocSeriesForm (estado, validación y guardado), billing.constants (nombre de la serie) y DrawerFormShell.css (armazón); lo abre formRegistry («docSeriesForm») |

### `importadoraInterfaz/src/features/billing/components/modal/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `InvoiceDetailModal.css` | Estilos del componente o módulo InvoiceDetailModal | InvoiceDetailModal.tsx |
| `InvoiceDetailModal.tsx` | visualizador de detalle de una factura emitida | billing.service (fetchInvoiceById para GET /invoices/:id) |

### `importadoraInterfaz/src/features/billing/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `InvoicesTable.css` | InvoicesTable.css · facturas: una sola tarjeta con la barra de herramientas pegada a la tabla · solo usa tokens de styles/tokens.css | InvoicesTable.tsx |
| `InvoicesTable.tsx` | tarjeta de facturas con buscador, filtros, tabla global y modal de detalle | InvoicesScreen (la usa), useInvoices, Pill, Pagination, InvoiceDetailModal y billing.constants |

### `importadoraInterfaz/src/features/billing/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `billing.constants.ts` | textos de estados y tipos, y el estado inicial de facturación | billing.slice (initialState) y los componentes de facturación |

### `importadoraInterfaz/src/features/billing/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `billing.adapter.ts` | convierte lo que responde la API en Go (facturas, datos fiscales y series) a lo que usa la app, y filtra la tabla de facturas | billing.service (convierte cada respuesta) y useInvoices (filtra); es el único lugar que conoce los nombres del backend en facturación |
| `billing.rules.test.ts` | pruebas de las reglas de facturación y del adaptador de la API | billing.rules y billing.adapter; se corre con npm test |
| `billing.rules.ts` | reglas puras de facturación: cómo se ve el próximo número de una serie, qué falta en los datos fiscales y cuánto del rango autorizado queda | useBillingConfigForm, useDocSeriesForm y BillingSettingsScreen; no toca el store |

### `importadoraInterfaz/src/features/billing/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useBillingConfigForm.ts` | formulario de los datos fiscales de la bodega activa: quién factura, resolución, rango y retenciones | BillingConfigPanel (lo usa), billing.rules (validación), billing.thunks (saveBillingConfigThunk), billing.selectors y navigation (cierra el panel) |
| `useBillingSettings.ts` | pide los datos fiscales y las series de la bodega activa y abre sus paneles de edición | BillingSettingsScreen (lo usa), billing.thunks (loadBillingSettingsThunk), billing.selectors, navigation (abre «billingConfig» y «docSeriesForm») y auth (hay sesión) |
| `useDocSeriesForm.ts` | formulario de una serie de consecutivos: el prefijo y el próximo número | DocSeriesPanel (lo usa), billing.rules (validación y vista del número), billing.thunks (saveDocSeriesThunk), billing.selectors y navigation (cierra el panel) |
| `useInvoices.ts` | pide las facturas generales o por bodega seleccionada y maneja la búsqueda y el filtro de estado | InvoicesTable (lo usa), billing.thunks (loadInvoicesThunk), billing.selectors, billing.adapter (filtrar) y auth (hay sesión) |

### `importadoraInterfaz/src/features/billing/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | billing/index · API pública de la feature facturación (facturas emitidas, datos fiscales por bodega y series de consecutivos) | rootReducer (reducer), screenRegistry (pantallas) y formRegistry (paneles laterales) |

### `importadoraInterfaz/src/features/billing/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `BillingSettingsScreen.css` | BillingSettingsScreen.css · Configuración > Facturación: tarjeta de datos fiscales y tarjeta de series · solo usa tokens de styles/tokens.css | BillingSettingsScreen.tsx |
| `BillingSettingsScreen.tsx` | Configuración > Facturación: los datos fiscales de la bodega activa (con lo que queda del rango autorizado) y la tabla de series de consecutivos | useBillingSettings (datos y paneles), billing.rules (próximo número y rango restante), billing.constants (nombres), RowActions y Pill; la monta MainContent (screenRegistry) |
| `InvoicesScreen.tsx` | Gestión Ventas > Facturas: las facturas emitidas de la bodega activa, con búsqueda y estado | InvoicesTable (la tarjeta con la barra y la tabla); la monta MainContent (screenRegistry) |

### `importadoraInterfaz/src/features/billing/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `billing.selectors.ts` | lecturas del estado de facturación | useInvoices, useBillingSettings y los formularios; leen state.billing |

### `importadoraInterfaz/src/features/billing/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `billing.service.ts` | llamadas al backend de facturación: facturas de la bodega (listado y detalle), datos fiscales (GET y PUT) y series de consecutivos (GET y PUT) | api/client y api/config (INVOICES, WAREHOUSES.FACTURATION y DOC_SERIES) y billing.adapter (convierte); las usa billing.thunks |

### `importadoraInterfaz/src/features/billing/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `billing.slice.test.ts` | el estado de facturación: facturas, datos fiscales y series por bodega, y guardar una serie | billing.slice y billing.thunks; se corre con npm test |
| `billing.slice.ts` | facturas de la bodega, datos fiscales y series de consecutivos | billing.thunks (lo llenan) y billing.selectors (lo leen); clave 'billing' en rootReducer (NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/billing/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `billing.thunks.ts` | cargas y cambios de facturación: facturas de la bodega, datos fiscales con sus series, guardar los datos fiscales y cambiar una serie | billing.service (llamadas) y billing.slice (reacciona); las despachan useInvoices, useBillingSettings y los formularios |

### `importadoraInterfaz/src/features/billing/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `billing.types.ts` | contratos de facturación: facturas emitidas, datos fiscales de la bodega, series de consecutivos y el estado del slice | billing.adapter, billing.rules, billing.service, billing.slice, los hooks y los componentes de facturación |

### `importadoraInterfaz/src/features/cashRegister/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CashClosePanel.css` | CashClosePanel.css · arqueo y cierre del turno: contexto, totales, filas de gastos y resultado del arqueo · solo usa tokens de styles/tokens.css | CashClosePanel.tsx |
| `CashClosePanel.tsx` | panel lateral del arqueo y cierre del turno: ingresos del turno, gastos de caja, efectivo contado y la diferencia en vivo | useCashClose (estado, cálculo y guardado), MoneyInput, Pill, global format y DrawerFormShell.css (armazón); lo abre formRegistry («cashClose») |
| `CashCollectPanel.css` | CashCollectPanel.css · cobro mixto de un pedido: totales, líneas de pago y avisos · solo usa tokens de styles/tokens.css | CashCollectPanel.tsx |
| `CashCollectPanel.tsx` | panel lateral para cobrar un pedido con pagos mezclados: efectivo, transferencia (con referencia y foto) y crédito | useCashCollect (líneas, validación y envío), cash.collect (nombres de método), MoneyInput, CashClosedBanner y DrawerFormShell.css; lo abre formRegistry («cashCollect») |
| `CashOpenPanel.tsx` | panel lateral para abrir el turno de caja de la bodega activa con su fondo inicial de cambio | useCashOpen (estado y guardado), MoneyInput y DrawerFormShell.css (armazón); lo abre formRegistry («cashOpen») |

### `importadoraInterfaz/src/features/cashRegister/components/orders/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CashOrdersPanel.tsx` | los pedidos en Caja: la misma barra y tabla de Pedidos, en una tarjeta, con las acciones de caja (cobrar y cotejar la salida) | CashRegisterScreen (lo pinta), orders (OrdersToolbar, OrdersTable, OrderCancelDialog, useOrdersLoader), cash.collect (cuándo se ofrece cobrar), navigation (abre «cashCollect») y VerifyInvoiceGoodsModal |

### `importadoraInterfaz/src/features/cashRegister/components/shift/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CashClosedBanner.css` | CashClosedBanner.css · aviso de caja cerrada · solo usa tokens de styles/tokens.css | CashClosedBanner.tsx |
| `CashClosedBanner.tsx` | aviso fijo de «caja cerrada»: hay que abrir el turno antes de recibir pagos en efectivo | CashRegisterScreen (y luego el cobro de ventas) lo pinta; recibe de useCashSession si está cerrada y qué hacer para abrirla |
| `CashShiftSlider.css` | CashShiftSlider.css · interruptor del turno de caja: Abierta a la izquierda, Cerrada a la derecha · solo usa tokens de styles/tokens.css | CashShiftSlider.tsx |
| `CashShiftSlider.tsx` | interruptor del turno de caja: izquierda = Abierta, derecha = Cerrada; se arrastra con mouse o dedo y se opera con el teclado | CashRegisterScreen (lo pinta) y useCashSession (pide abrir o cerrar); CashShiftSlider.css para el aspecto |

### `importadoraInterfaz/src/features/cashRegister/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `VerifyInvoiceGoodsModal.css` | VerifyInvoiceGoodsModal.css · Drawer lateral derecho para cotejo físico de salida | VerifyInvoiceGoodsModal.tsx |
| `VerifyInvoiceGoodsModal.tsx` | cotejo físico de mercancía: valida que los ítems que salen de bodega coincidan con la factura emitida | CashOrdersPanel (lo abre), useSaleLines (renglones del pedido) y VerifyLinesTable (tabla con casillas) |
| `VerifyLinesTable.tsx` | tabla del cotejo de mercancía: cada renglón de la factura con su casilla de verificación | VerifyInvoiceGoodsModal (la usa); los renglones llegan de useSaleLines y el marcado vive en el modal |

### `importadoraInterfaz/src/features/cashRegister/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash.collect.test.ts` | pruebas de las reglas del cobro mixto: lo que falta, cuándo se ofrece cobrar, validación de líneas y lo que se envía | cash.collect; se corre con npm test |
| `cash.collect.ts` | reglas puras del cobro mixto de un pedido en Caja: cuánto falta por cubrir, cuándo una línea de pago es válida y cómo se arma lo que se envía | useCashCollect (valida y envía), CashCollectPanel y CashOrdersPanel (cuándo se ofrece «Cobrar»); no toca el store |
| `cash.helpers.test.ts` | pruebas del arqueo (esperado y diferencia), de la limpieza de gastos y de la conversión del turno | cash.helpers; se corre con npm test |
| `cash.helpers.ts` | funciones puras de caja: convertir el turno del backend, calcular el arqueo en vivo y limpiar los gastos antes de enviarlos | cash.service (toCashSession), useCashClose (computeClosing y cleanExpenses) y CashClosePanel; no toca el store |

### `importadoraInterfaz/src/features/cashRegister/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCashClose.ts` | estado y guardado del arqueo y cierre del turno: efectivo contado, gastos de caja, notas y el cálculo en vivo de lo esperado y la diferencia | CashClosePanel (lo usa), cash.helpers (computeClosing y cleanExpenses), cash.thunks (closeCashSessionThunk), cash.selectors y navigation (cierra el panel) |
| `useCashCollect.ts` | formulario del cobro mixto de un pedido en Caja: líneas de pago (efectivo, transferencia, crédito), lo que falta por cubrir, validación y envío | CashCollectPanel (lo usa), cash.collect (reglas), cash.thunks (collectPaymentsThunk y loadCashSessionThunk), useCashSession (turno abierto), orders (refresca la tabla), navigation (cierra el panel) y toast |
| `useCashOpen.ts` | estado y guardado de la apertura del turno: el fondo inicial de cambio (obligatorio) | CashOpenPanel (lo usa), cash.thunks (openCashSessionThunk), navigation (bodega activa y cierra el panel) y toast |
| `useCashSession.ts` | pide el turno de caja de la bodega activa y entrega si está abierto, con acciones para abrir o cerrar (abren su panel lateral) | CashRegisterScreen, CashShiftSlider, CashClosedBanner (lo usan), cash.thunks (loadCashSessionThunk), cash.selectors, navigation (bodega activa y paneles) y auth (hay sesión) |
| `useSaleLines.ts` | pide los renglones de un pedido para el cotejo de mercancía y dice si siguen cargando | VerifyInvoiceGoodsModal; despacha cash.thunks (loadSaleLinesThunk) |

### `importadoraInterfaz/src/features/cashRegister/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | cashRegister/index · API pública de la feature caja | screenRegistry (CashRegisterScreen) |

### `importadoraInterfaz/src/features/cashRegister/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CashRegisterScreen.css` | CashRegisterScreen.css · Tienda > Caja: contenedor de la pantalla · solo usa tokens de styles/tokens.css | CashRegisterScreen.tsx |
| `CashRegisterScreen.tsx` | Tienda > Caja: el turno de caja de la bodega (aviso de apertura) y, en la barra de pedidos, las acciones de caja | useCashSession (turno), CashShiftSlider, CashClosedBanner, CashOrdersPanel (pedidos, toolbar y cobro) y navigation (abrir el abono a cartera o registrar gasto) |

### `importadoraInterfaz/src/features/cashRegister/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash.selectors.ts` | lecturas del turno de caja: el turno, su estado de carga y si hay un cambio en curso | useCashSession y los hooks de caja; leen state.cash |

### `importadoraInterfaz/src/features/cashRegister/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash.service.ts` | llamadas a la API de turnos de caja: ver el turno abierto, abrirlo con un fondo y cerrarlo con el arqueo y los gastos | api/client y api/config (CASH_SESSIONS), cash.helpers (convierte); las usa cash.thunks |

### `importadoraInterfaz/src/features/cashRegister/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash.slice.ts` | estado del turno de caja de la bodega activa: el turno abierto (o ninguno), si está cargando y si hay un cambio en curso | cash.thunks (lo llenan), cash.selectors (lecturas), auth (al cerrar sesión se vacía) y rootReducer (clave 'cash'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/cashRegister/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash.thunks.ts` | cargas y cambios del turno de caja: leer el de la bodega, abrirlo y cerrarlo | cash.service (llamadas) y cash.slice (reacciona); las despachan useCashSession, useCashOpen y useCashClose |

### `importadoraInterfaz/src/features/cashRegister/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash.types.ts` | contratos de la caja: el turno (lo que usa la app y lo que responde el backend), los gastos del cierre y el estado del slice | cash.service, cash.helpers, cash.slice, cash.selectors, los hooks y los componentes de caja |

### `importadoraInterfaz/src/features/catalogs/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CatalogItemDetailPanel.css` | CatalogItemDetailPanel.css · estilos de la vista de detalles de marcas, categorías y modelos | CatalogItemDetailPanel.tsx |
| `CatalogItemDetailPanel.tsx` | panel lateral para ver detalles de una marca, categoría o modelo | react, @/global/hooks/store/useRedux, @/features/navigation, ../../types/catalogs.types |
| `CatalogItemFormPanel.css` | CatalogItemFormPanel.css · estilos del formulario de marcas, categorías y modelos | CatalogItemFormPanel.tsx |
| `CatalogItemFormPanel.tsx` | formulario en panel lateral para crear o editar marcas, categorías o modelos | useCatalogItemForm (estado y guardado), catalogs.labels (textos) y navigation (cerrar el panel) |

### `importadoraInterfaz/src/features/catalogs/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.constants.ts` | estado inicial de los catálogos | catalogs.slice (initialState) |

### `importadoraInterfaz/src/features/catalogs/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.adapter.test.ts` | pruebas de la conversión de marcas, categorías y modelos de la API a los de la app | catalogs.adapter; se corre con npm test |
| `catalogs.adapter.ts` | convierte lo que responde la API en Go (id, name, imageUrl) a la forma que usa la app (id, name, image) | catalogs.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend |
| `catalogs.labels.ts` | textos en español de los catálogos (nombre en singular y ejemplo del campo nombre) | CatalogTable, CatalogItemFormPanel y useCatalogItemForm (los usan) |

### `importadoraInterfaz/src/features/catalogs/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCatalogItemForm.ts` | estado del formulario para crear o editar una marca, categoría o modelo: campos, validación y guardado | CatalogItemFormPanel (lo usa), catalogs.items.thunks (guardar), navigation (cerrar el panel) y toast |
| `useLoadCatalogs.ts` | pide las marcas, categorías y modelos al backend la primera vez que una pantalla los necesita | ShopCatalogScreen (la usa al montarse); despacha catalogs.thunks y lee el estado de catalogs.selectors |

### `importadoraInterfaz/src/features/catalogs/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | catalogs/index · API pública de la feature catalogs (marcas, categorías y modelos de moto) | rootReducer (reducer), ShopCatalogScreen (useLoadCatalogs), ShopCatalogToolbar y ShopCatalogFilters (nombres para los filtros) |

### `importadoraInterfaz/src/features/catalogs/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.selectors.test.ts` | pruebas de los nombres de marcas y categorías que alimentan los filtros | catalogs.selectors; se corre con npm test |
| `catalogs.selectors.ts` | lecturas de los catálogos: listas completas y solo los nombres (para los selectores de filtro) | ShopCatalogToolbar (marcas) y ShopCatalogFilters (categorías); leen state.catalogs |

### `importadoraInterfaz/src/features/catalogs/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.service.test.ts` | pruebas de las llamadas de catálogos: la ruta, los parámetros que se envían y la conversión de la respuesta | catalogs.service; el cliente HTTP está simulado (no hay red) |
| `catalogs.service.ts` | llamadas al backend de los catálogos: GET, POST, PUT, DELETE /brands, /categories y /models | api/client, api/config (rutas) y api/params (companyId), catalogs.adapter (convierte la respuesta); las usa catalogs.thunks y DrawerRight |

### `importadoraInterfaz/src/features/catalogs/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.slice.ts` | estado de los catálogos (marcas, categorías y modelos): lista, estado de carga y último error de cada uno | catalogs.thunks (los llenan), catalogs.selectors (las lecturas) y rootReducer (clave 'catalogs'; no se persiste: se pide una vez por sesión) |

### `importadoraInterfaz/src/features/catalogs/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.items.thunks.ts` | acciones que crean, editan y eliminan un registro de marcas, categorías o modelos y recargan ese catálogo | catalogs.service (llamadas), auth (selectRequestContext) y catalogs.thunks (recarga); las despachan useCatalogItemForm y CatalogTable |
| `catalogs.thunks.test.ts` | pruebas de la carga de catálogos: éxito, error, sin sesión y estado del slice | catalogs.thunks y catalogs.slice; el service y la sesión están simulados (no hay red ni store real de la app) |
| `catalogs.thunks.ts` | acciones que cargan cada catálogo (marcas, categorías y modelos) con el contexto de la sesión | catalogs.service (llamadas), auth (selectRequestContext) y catalogs.slice (reacciona a pending, fulfilled y rejected); las despacha useLoadCatalogs |

### `importadoraInterfaz/src/features/catalogs/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.types.ts` | contratos de los catálogos base (marcas, categorías y modelos de moto) y de su estado | catalogs.adapter (convierte lo del backend), catalogs.service, catalogs.slice y catalogs.selectors |

### `importadoraInterfaz/src/features/checkout/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CheckoutPanel.css` | CheckoutPanel.css · finalizar compra en el panel derecho: cliente, entrega, resumen y forma de pago | CheckoutPanel.tsx |
| `CheckoutPanel.tsx` | finalizar compra (o cotizar) en el panel derecho: primero el cliente y los datos de entrega (y el empleado si lo hace un administrador), después el pago | formRegistry (lo muestra), useCheckoutFlow (estado y confirmación), CustomerStep, PaymentStep, navigation (closeDrawerForm) y CheckoutPanel.css |
| `CustomerStep.tsx` | primer paso: elegir el cliente (búsqueda), confirmar o editar los datos de entrega que se cargan de la base y, si lo hace un administrador, elegir el empleado al que se le entrega la venta | CheckoutPanel (lo usa), useCheckoutFlow (estado), useEmployeesDirectory (empleados), ValidatedInput y CheckoutPanel.css |
| `PaymentStep.tsx` | segundo paso: resumen fiscal del pedido, forma de pago con selector interactivo y picking inmediato | react, @/features/cashRegister, @/global/helpers/formatting/format, ../hooks/useCheckoutFlow |
| `TransferPaymentSection.tsx` | bloque de la forma de pago por transferencia: aviso, comprobante (foto o PDF) y referencia | PaymentStep (lo pinta cuando se elige transferencia), useCheckoutFlow (comprobante y referencia) y CheckoutPanel.css |

### `importadoraInterfaz/src/features/checkout/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `checkout.adapter.test.ts` | pruebas del cliente para finalizar compra: direcciones cargadas, descuento general, crédito y validación de la entrega | checkout.adapter; se corre con npm test |
| `checkout.adapter.ts` | convierte el cliente de la API a lo que usa el flujo de finalizar compra y calcula descuento, crédito y total; el único lugar que conoce los nombres del backend | checkout.service (convierte), CheckoutPanel y sus pasos (cálculos), checkout.api.types y checkout.types |
| `checkout.blockers.test.ts` | motivos de bloqueo del checkout y normalización del teléfono | checkout.blockers (suite de pruebas) |
| `checkout.blockers.ts` | por qué el panel de finalizar compra no deja continuar, en frases que el usuario entiende | useCheckoutFlow (calcula la lista) y CheckoutPanel (la muestra junto al botón); con pruebas en checkout.blockers.test.ts |
| `checkout.totals.test.ts` | neto, descuento, IVA y total del checkout, con la misma regla que el backend (descuento primero, IVA sobre lo que queda) | checkout.totals (suite de pruebas) |

### `importadoraInterfaz/src/features/checkout/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCheckoutFlow.ts` | estado del flujo de finalizar compra o cotizar: renglones, cliente elegido, datos de entrega, empleado (si lo confirma un administrador), picking inmediato, forma de pago y confirmación | CheckoutPanel (lo usa), checkout.thunks (buscar, cargar, confirmar), checkout.adapter (cálculos), navigation (cerrar y abrir el detalle), usePermissions (nivel) y global toast |

### `importadoraInterfaz/src/features/checkout/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | checkout/index · API pública de la feature finalizar compra (panel de venta o cotización) | formRegistry (CheckoutPanel) y sus tipos (CheckoutPayload) |

### `importadoraInterfaz/src/features/checkout/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `checkout.service.ts` | llamadas al backend para finalizar una compra: buscar clientes (GET /customers/search), traer uno con su cupo (GET /customers/:id y /customers/selector), y crear la venta (POST /sales) | api/client, api/config, api/params, checkout.adapter (convierte) y shop.sales.service (createSale); las usa checkout.thunks |

### `importadoraInterfaz/src/features/checkout/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `checkout.thunks.ts` | buscar cliente, cargarlo con su cupo, armar los renglones (carrito o cotización) y confirmar la venta o la cotización | checkout.service (clientes), shop (renglones del carrito, createSale, stockId y vaciar el carrito), quotations (detalle y crear cotización) y auth (sesión); las despacha CheckoutPanel |

### `importadoraInterfaz/src/features/checkout/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `checkout.api.types.ts` | lo que responde la API en Go al buscar clientes (GET /customers/search, GET /customers/:id, GET /customers/selector) para armar la venta | checkout.adapter (convierte a CheckoutCustomer) y checkout.service; nombres del backend tal cual |
| `checkout.types.ts` | modelos del flujo de finalizar compra: cliente, datos de entrega, forma de pago y de dónde salen los renglones | checkout.adapter (los arma), checkout.service, checkout.thunks y los pasos de CheckoutPanel |

### `importadoraInterfaz/src/features/companies/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `companies.constants.ts` | estado inicial de las compañías | companies.slice (initialState) |

### `importadoraInterfaz/src/features/companies/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `companies.adapter.ts` | convierte la compañía de la API a lo que usa la app; es el único lugar que conoce los nombres del backend | companies.service (lo usa), companies.api.types y companies.types |

### `importadoraInterfaz/src/features/companies/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCompanies.ts` | pide las compañías al backend una vez (si está activado) y devuelve la lista, el estado de carga y el error | CompanySelector y CompaniesScreen (lo usan), companies.thunks (loadCompaniesThunk) y companies.selectors |

### `importadoraInterfaz/src/features/companies/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | companies/index · API pública de la feature compañías (lista del superadmin para el selector del header y la pantalla de compañías) | CompanySelector (header), rootReducer (reducer) y SitesScreen (configuración) |

### `importadoraInterfaz/src/features/companies/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CompaniesScreen.css` | CompaniesScreen.css · lista de compañías del superadmin: tarjeta con la búsqueda y la tabla · solo usa tokens de styles/tokens.css | CompaniesScreen.tsx |
| `CompaniesScreen.tsx` | Configuración > Compañías (solo superadmin): las compañías registradas con la acción «Ver sedes» de cada una | useCompanies (lista), global SearchBar y RowActions, navigation (openDrawerForm: las sedes de la compañía se ven en el panel derecho) y CompaniesScreen.css |

### `importadoraInterfaz/src/features/companies/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `companies.selectors.ts` | lecturas del estado de compañías | companies.slice (estado) y useCompanies |

### `importadoraInterfaz/src/features/companies/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `companies.service.test.ts` | pruebas de GET /companies: junta páginas y deja solo las compañías activas | companies.service; el cliente HTTP está simulado (no hay red) |
| `companies.service.ts` | llamada al backend de compañías: GET /companies (las que el superadmin puede elegir en el header) | api/client, api/config y api/pagination, companies.adapter (convierte); la usa useCompanies |

### `importadoraInterfaz/src/features/companies/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `companies.slice.ts` | estado de las compañías registradas: lista, estado de carga y error | companies.thunks (lo llena), companies.selectors (lecturas) y rootReducer (clave 'companies'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/companies/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `companies.thunks.ts` | carga las compañías registradas (GET /companies) para el selector del header y la pantalla de compañías del superadmin | companies.service (llamada) y companies.slice (reacciona); las despacha useCompanies |

### `importadoraInterfaz/src/features/companies/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `companies.api.types.ts` | lo que responde la API en Go en GET /companies (CompanyResponse), con los nombres del backend | companies.adapter (convierte a Company) y companies.service |
| `companies.types.ts` | modelo de compañía que usa la app (lo que muestra el selector del superadmin) | companies.adapter (lo arma), companies.service, useCompanies y CompanySelector |

### `importadoraInterfaz/src/features/customers/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CustomerDirectionsSection.tsx` | direcciones del cliente: lista, botón de borrar y formulario para agregar una nueva | customers.selectors (direcciones y estado), customers.details.thunks (agregar), customers.constants (formulario vacío); el borrado lo confirma CustomerDrawer |
| `CustomerDiscountsSection.tsx` | descuentos del cliente: a qué aplican (producto, marca, categoría o modelo), porcentaje y botón de borrar | customers.selectors (descuentos), features/catalogs (nombres de marca, categoría y modelo); el borrado lo confirma CustomerDrawer |
| `CustomerDocumentsSection.test.tsx` | pruebas del bloque de documentos del cliente: estados de vigencia, botones de renovar solo en vencidos o por vencer y renovación con y sin archivo | CustomerDocumentsSection; el hook de documentos está simulado (no hay red); se corre con npm test |
| `CustomerDocumentsSection.tsx` | documentos del cliente en su panel: tipo, vencimiento con su estado y botones para renovar | useCustomerDocuments (lista y renovar), customers.documents.adapter (textos) y global Pill; la pinta CustomerDrawer |
| `CustomerDrawer.css` | CustomerDrawer.css · estilos del panel del cliente (datos, direcciones, descuentos y formulario) · solo usa tokens de styles/tokens.css | CustomerDrawer.tsx |
| `CustomerDrawer.tsx` | contenido del panel derecho al abrir un cliente: sus datos, "usar en la venta", direcciones, documentos y descuentos | useSelectedCustomerData (pide detalle, direcciones y descuentos), customers.selectors y customers.details.thunks, features/shop (cliente de la venta) y global ConfirmDialog (confirmar borrados); lo muestra DrawerRight (drawerRegistry, modo "customer") |
| `CustomerInfoSection.tsx` | datos del cliente en el panel: documento, correo, nivel de precio, comisión y datos de la empresa | CustomerDrawer (le pasa el estado del detalle); los datos vienen de GET /users/{id} (customers.selectors → selectCustomerDetail) |

### `importadoraInterfaz/src/features/customers/components/form/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreateCustomerForm.css` | CreateCustomerForm.css · formulario de registro de cliente dentro del panel derecho · solo usa tokens de styles/tokens.css | CreateCustomerForm.tsx |
| `CreateCustomerForm.tsx` | formulario de registro de clientes con validación asíncrona; se abre en el panel derecho (Nuevo Cliente) | drawerRegistry/formRegistry (lo muestra), navigation (closeDrawerForm), ValidatedInput, validation.helpers, useAsyncValidation, useCustomerExists y customers.thunks (createCustomerThunk: POST /customers) |
| `EditCustomerForm.tsx` | edición de un cliente (nombre, teléfono y correo) en el panel derecho; el documento se muestra pero no se cambia | formRegistry (lo muestra), customers.thunks (cargar el detalle y guardar: PUT /customers/:id), useCustomerExists (correo repetido), navigation (closeDrawerForm) y ValidatedInput |

### `importadoraInterfaz/src/features/customers/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CustomersTable.css` | CustomersTable.css · estilos de la tabla de clientes · solo usa tokens de styles/tokens.css | CustomersTable.tsx |
| `CustomersTable.tsx` | tabla de clientes: listado integral con badges de background, avatar con iniciales, dropdown de estado y acciones CRUD | react, @/global/helpers/formatting/format, @/global/hooks/store/useRedux, ../../types/customers.types |

### `importadoraInterfaz/src/features/customers/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.constants.ts` | tamaños de página, textos y estado inicial de clientes | customers.service (cuántos pide), customers.slice (initialState) y los componentes (textos) |

### `importadoraInterfaz/src/features/customers/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.adapter.test.ts` | pruebas de la conversión de clientes y direcciones de la API y del filtro por texto | customers.adapter; se corre con npm test |
| `customers.adapter.ts` | convierte lo que responde la API en Go (clientes y sus direcciones) a lo que usa la app, y filtra la lista por texto | customers.service y customers.details.service (lo aplican a cada respuesta); customers.selectors (filterCustomers); es el único lugar que conoce los nombres del backend |
| `customers.documents.adapter.test.ts` | Pruebas unitarias de customers.documents.adapter | customers.documents.adapter (suite de pruebas) |
| `customers.documents.adapter.ts` | convierte los documentos del cliente de la API y cuenta los vencidos y por vencer por cliente | customers.documents.service (lo aplica a cada respuesta), customers.documents.selectors y los componentes de documentos |

### `importadoraInterfaz/src/features/customers/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCustomerDocuments.ts` | documentos de un cliente: los pide al abrir el cliente y deja renovar uno | CustomerDocumentsSection (lo usa); despacha customers.documents.thunks y lee customers.documents.selectors |
| `useCustomerExists.ts` | devuelve la función que pregunta si ya existe un cliente con ese documento o correo, lista para useAsyncValidation | CreateCustomerForm y EditCustomerForm (lo usan), customers.thunks (customerExistsThunk) y global useAsyncValidation (recibe la función) |
| `useCustomersLoader.ts` | pide la lista de clientes al backend la primera vez y cada vez que cambia la página | CustomersScreen (lo usa al montarse); despacha customers.thunks y lee customers.selectors y la sesión de auth |
| `useDocumentAlerts.ts` | pide las alertas de documentos vencidos o por vencer y devuelve el peor estado por cliente | CustomersTable (lo usa para marcar las filas); despacha customers.documents.thunks y lee customers.documents.selectors y la sesión de auth |
| `useSelectedCustomerData.ts` | cuando se abre un cliente pide su detalle, sus direcciones y sus descuentos | CustomerDrawer (lo usa al montarse); despacha customers.thunks y customers.details.thunks |

### `importadoraInterfaz/src/features/customers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | customers/index · API pública de la feature customers (clientes, direcciones y descuentos) | rootReducer (reducer), screenRegistry (CustomersScreen), drawerRegistry (CustomerDrawer y su encabezado) |

### `importadoraInterfaz/src/features/customers/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CustomersScreen.css` | CustomersScreen.css · estilos de la pantalla de clientes (tarjeta con barra y tabla) · solo usa tokens de styles/tokens.css | CustomersScreen.tsx |
| `CustomersScreen.tsx` | pantalla de Terceros > Clientes: búsqueda, tabla de clientes del backend y paginador | customers.slice/selectors (lista y búsqueda), useCustomersLoader (la pide), CustomersTable y global SearchBar y Pagination; la monta MainContent (screenRegistry); al elegir un cliente se abre CustomerDrawer en el panel derecho |

### `importadoraInterfaz/src/features/customers/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.documents.selectors.ts` | lecturas de los documentos del cliente abierto y de las alertas de vencimiento de la compañía | CustomerDocumentsSection y CustomersTable (los leen); leen state.customers |
| `customers.selectors.test.ts` | pruebas de la lista visible (búsqueda) y del encabezado del panel del cliente | customers.selectors; no usa red ni store real |
| `customers.selectors.ts` | lecturas de clientes: lista visible (con búsqueda), paginación, cliente abierto, detalle, direcciones, descuentos y datos del encabezado del panel | CustomersScreen y sus partes, CustomerDrawer y drawerRegistry (selectCustomerDrawerMeta, selectHasOpenCustomer); leen state.customers |

### `importadoraInterfaz/src/features/customers/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.details.service.ts` | lo que cuelga de un cliente: direcciones (listar, agregar, borrar) y descuentos | api/client y api/config, customers.adapter (convierte); las usa customers.details.thunks |
| `customers.documents.service.ts` | llamadas al backend de los documentos del cliente: listar, renovar y alertas de vencimiento | api/client y api/config (rutas), customers.documents.adapter (convierte); las usa customers.documents.thunks |
| `customers.manage.service.test.ts` | pruebas de editar (PUT /customers/:id) y eliminar (DELETE /customers/:id) un cliente | customers.service y customers.thunks (deleteCustomerThunk); el cliente HTTP está simulado (no hay red) |
| `customers.service.test.ts` | pruebas de las llamadas de clientes (GET /customers, GET /customers/:id, POST /customers), de las direcciones y de los descuentos | customers.service y customers.details.service; el cliente HTTP está simulado (no hay red) |
| `customers.service.ts` | llamadas al backend de clientes: GET /customers (listado paginado), GET /customers/:id (detalle), POST /customers, PUT /customers/:id y DELETE /customers/:id | api/client, api/config, api/params y api/pagination (toPaginated), customers.adapter (convierte); las usa customers.thunks |

### `importadoraInterfaz/src/features/customers/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.documents.reducers.ts` | cómo reacciona el estado de clientes a la carga y renovación de documentos y a las alertas de vencimiento | customers.slice (los agrega al builder) y customers.documents.thunks (las acciones que escuchan) |
| `customers.slice.ts` | estado de clientes: lista paginada, cliente abierto, su detalle, sus direcciones y sus descuentos | customers.thunks y customers.details.thunks (lo llenan), customers.selectors (lecturas) y rootReducer (clave 'customers'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/customers/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.details.thunks.ts` | direcciones y descuentos de un cliente: cargar, agregar dirección y borrar (dirección o descuento) | customers.details.service (llamadas) y customers.slice (reacciona); los despachan useSelectedCustomerData y el panel del cliente |
| `customers.documents.thunks.ts` | documentos del cliente: cargar los de un cliente, cargar las alertas de vencimiento y renovar un documento | customers.documents.service (llamadas) y customers.documents.reducers (reaccionan); los despachan useCustomerDocuments y useDocumentAlerts |
| `customers.manage.thunks.test.ts` | pruebas de crear, editar y revisar duplicados de clientes con thunks (los formularios ya no llaman al service) | customers.thunks; el service y la sesión están simulados (no hay red) |
| `customers.thunks.test.ts` | pruebas de la carga de clientes, su detalle, direcciones y descuentos (con el slice real) | customers.thunks, customers.details.thunks y customers.slice; los services, la sesión y las alertas están simulados (no hay red) |
| `customers.thunks.ts` | carga la lista paginada de clientes y el detalle de uno; revisa si un documento o correo ya existe; crea, edita y elimina | customers.service (llamadas), auth (selectRequestContext) y customers.slice (reacciona); las despachan useCustomersLoader y useSelectedCustomerData |

### `importadoraInterfaz/src/features/customers/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.api.types.ts` | lo que responde la API en Go en clientes (GET /customers y GET /customers/:id) y su lista de direcciones | customers.adapter (los convierte a los tipos de la app), customers.service y customers.details.service (los piden) |
| `customers.types.ts` | contratos de clientes (usuarios), direcciones y descuentos: lo que usa la app y el estado del slice (lo que responde el backend está en customers.api.types) | customers.adapter, customers.slice, customers.selectors, los thunks y los componentes |

### `importadoraInterfaz/src/features/employees/components/detail/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `EmployeeDetailPanel.css` | EmployeeDetailPanel.css · detalle de un empleado y su lista de permisos dentro del panel derecho · solo usa tokens de styles/tokens.css | EmployeeDetailPanel.tsx |
| `EmployeeDetailPanel.tsx` | detalle de un empleado en el panel derecho (ícono del ojo): sus datos, cuándo se creó y, abajo, la LISTA de sus permisos; «Editar permisos» abre la edición | formRegistry (lo muestra), useEmployeePermissions (permisos cargados), permissions.selection (resumen en lista), usePermissions (puede editar) y navigation (abrir la edición o cerrar) |

### `importadoraInterfaz/src/features/employees/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreateEmployeeDrawer.css` | CreateEmployeeDrawer.css | CreateEmployeeDrawer.tsx |
| `CreateEmployeeDrawer.tsx` | formulario lateral para registrar un empleado nuevo (datos, credenciales, sede y rol) | EmployeesScreen (lo abre), useCreateEmployeeForm (estado y envío) y EmployeeFormFields (las secciones) |
| `EmployeeFormFields.tsx` | las tres secciones del formulario de empleado: datos personales, credenciales y sede con rol | CreateEmployeeDrawer; los valores y cambios vienen de useCreateEmployeeForm |

### `importadoraInterfaz/src/features/employees/components/hub/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `PermissionsHub.css` | PermissionsHub.css · las cuatro opciones de Roles y permisos (cuadrícula de 2 por 2) y el marco de cada vista · solo usa tokens de styles/tokens.css | PermissionsHub.tsx |
| `PermissionsHub.tsx` | entrada organizada a Roles y permisos: cuatro opciones (ver permisos de un empleado, editar permisos de un empleado, ver roles, crear o editar roles) | RolesPermissionsScreen (lo usa), EmployeePicker (elegir empleado), RolesView (roles) y PermissionsHub.css |

### `importadoraInterfaz/src/features/employees/components/permissions/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `EmployeePermissionsPanel.css` | EmployeePermissionsPanel.css · permisos de un empleado dentro del panel derecho · solo usa tokens de styles/tokens.css | EmployeePermissionsPanel.tsx |
| `EmployeePermissionsPanel.tsx` | permisos de un empleado en el panel derecho: «ver» (solo lectura) o «editar» (con botón Guardar) | formRegistry (lo muestra), useEmployeePermissions (carga y guarda), PermissionsSelector, navigation (closeDrawerForm) y employees.types |
| `PermissionModuleCard.tsx` | un módulo con su tarjeta «módulo completo» y las tarjetas de sus pantallas en dos columnas; las activas muestran opciones de ver, crear, editar, anular (y editar precios si aplica) | PermissionsSelector (la usa), PermissionToggleCard, permissions.selection (reglas) y employees.types |
| `PermissionsSelector.css` | PermissionsSelector.css · selector visual de permisos: barra de conteo, tarjetas de módulo y de pantalla con casilla cuadrada y chips · solo usa tokens de styles/tokens.css | PermissionsSelector.tsx |
| `PermissionsSelector.tsx` | selector visual de permisos: barra «pantallas seleccionadas N de M» con Todas y Ninguna, y la lista de módulos con scroll | RolesPermissionsScreen (lo usa), PermissionModuleCard, permissions.selection (conteo y todas/ninguna) y MENU_ITEMS |
| `PermissionToggleCard.tsx` | tarjeta seleccionable con casilla cuadrada (como las gestiones de Grandma's): borde de color y ✓ cuando está activa | PermissionModuleCard (la usa para el módulo completo y para cada pantalla) y PermissionsSelector.css (clases permission-card-*) |

### `importadoraInterfaz/src/features/employees/components/picker/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `EmployeePicker.css` | EmployeePicker.css · lista de empleados para elegir de quién ver o editar los permisos · solo usa tokens de styles/tokens.css | EmployeePicker.tsx |
| `EmployeePicker.tsx` | lista de empleados con búsqueda para elegir de quién ver o editar los permisos; cada fila abre el panel derecho | PermissionsHub (lo usa), useEmployeesDirectory (empleados), global SearchBar y RowActions, y navigation (openDrawerForm) |

### `importadoraInterfaz/src/features/employees/components/roles/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `RoleForm.tsx` | crear o editar un rol en el panel derecho: código (solo al crear), nombre, descripción y, al editar, si está activo | formRegistry (lo muestra), employees.thunks (saveRoleThunk: POST /roles o PUT /roles/:id), navigation (closeDrawerForm) y ValidatedInput |
| `RolesView.css` | RolesView.css · tabla de roles de la compañía y su barra con «Nuevo rol» · solo usa tokens de styles/tokens.css | RolesView.tsx |
| `RolesView.tsx` | tabla de roles de la compañía: código, nombre, descripción y estado; en modo «manage» permite crear un rol y editar los existentes (panel derecho) | PermissionsHub (lo usa), useRoles (lista), navigation (openDrawerForm y closeDrawerForm al guardar) y global RowActions |

### `importadoraInterfaz/src/features/employees/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `EmployeesTable.css` | EmployeesTable.css · estilos de la tabla de empleados y sedes · solo usa tokens de styles/tokens.css | EmployeesTable.tsx |
| `EmployeesTable.tsx` | tabla de empleados: avatar con iniciales, nombre y contacto, cargo, sede, modalidad, estado y acciones con ícono | EmployeesScreen (la usa), employees.types, global format (iniciales) y RowActions (acciones «Ver detalle» (datos y lista de permisos) y «Editar permisos»); estilos en EmployeesTable.css |

### `importadoraInterfaz/src/features/employees/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `employees.assignable.constants.ts` | módulos y pantallas del menú que se pueden asignar a un empleado en la matriz de permisos | useEmployeePermissions, EmployeePermissionsPanel (listas de la matriz) y navigation (MENU_ITEMS); global accessLevels (niveles) |
| `employees.constants.ts` | estado inicial de empleados y roles | employees.slice (initialState) |
| `employees.permissions.constants.ts` | a qué módulo de permisos de la API corresponde cada pantalla del menú, y qué acciones son «ver, crear, editar y anular» | employees.adapter (convierte en los dos sentidos); no lo usa nadie más |

### `importadoraInterfaz/src/features/employees/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `employees.adapter.test.ts` | pruebas de la conversión de empleados, roles y permisos de la API, y de la matriz del menú en los dos sentidos | employees.adapter; se corre con npm test |
| `employees.adapter.ts` | convierte lo que responde la API en Go (empleados, roles y permisos planos) a lo que usa la app, y la matriz del menú a permisos de la API | employees.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en empleados y permisos |
| `permissions.selection.test.ts` | pruebas de la selección visual de permisos: pantallas, módulos, todas/ninguna y permisos finos | permissions.selection; se corre con npm test |
| `permissions.selection.ts` | reglas de la selección visual de permisos: pantalla activada, módulo completo, todas y ninguna, y los permisos finos (ver, crear, editar, anular, editar precios) | PermissionsSelector, PermissionModuleCard y PermissionToggleCard (los usan); tipos de employees.types y NavItem |

### `importadoraInterfaz/src/features/employees/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCreateEmployeeForm.ts` | estado y envío del formulario «Registrar empleado»: valores, validación mínima y creación | CreateEmployeeDrawer y EmployeeFormFields; despacha employees.thunks (createEmployeeThunk) y pide los roles con useRoles |
| `useEmployeePermissions.ts` | carga los permisos de un empleado como borrador (mapa módulo -> permisos) y los guarda; lo usa el panel de permisos de un empleado | employees.thunks (cargar y guardar), permissions.selection (emptyModule) y employees.assignable.constants (módulos asignables) |
| `useEmployeesDirectory.ts` | pide los empleados de la compañía (opcionalmente de una sola bodega) al backend y devuelve la lista y si está cargando | EmployeesScreen y EmployeePicker (lo usan), employees.thunks (loadEmployeesThunk), employees.selectors y auth (hay sesión) |
| `useRoles.ts` | pide los roles de la compañía (también los inactivos) al backend y devuelve la lista, si está cargando y el error | RolesView (lo usa), employees.thunks (loadRolesThunk) y employees.selectors |

### `importadoraInterfaz/src/features/employees/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | employees/index · API pública de la feature employees | screenRegistry, usePermissions, auth.types y UI |

### `importadoraInterfaz/src/features/employees/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `EmployeesScreen.css` | EmployeesScreen.css · estilos del directorio de personal: tarjeta con la barra de filtros arriba y la tabla (EmployeesTable.css) debajo | EmployeesScreen.tsx |
| `EmployeesScreen.tsx` | directorio de empleados (la gestión de sedes es otra pantalla, solo para el administrador); el ojo abre el detalle (datos y lista de permisos) y editar permisos abre la matriz; ambos en el panel derecho | employees.service, EmployeesTable, global SearchBar (con su botón de limpiar integrado) y FilterSelect, Redux (user, warehouses, navigation) y tokens.css |
| `RolesPermissionsScreen.css` | RolesPermissionsScreen.css · marco de la pantalla de Roles y permisos (las opciones están en PermissionsHub.css) | RolesPermissionsScreen.tsx |
| `RolesPermissionsScreen.tsx` | Configuración > Roles y permisos: entrada con cuatro opciones (ver y editar permisos de un empleado, ver y crear o editar roles) | PermissionsHub (las opciones y sus vistas), EmployeePermissionsPanel (permisos de un empleado, en el panel derecho) y screenRegistry |

### `importadoraInterfaz/src/features/employees/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `employees.selectors.ts` | lecturas del estado de empleados y roles | employees.slice (estado), useEmployeesDirectory y useRoles |

### `importadoraInterfaz/src/features/employees/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `employees.service.test.ts` | pruebas de las llamadas de empleados, roles, credenciales y permisos | employees.service y apiClient; el cliente HTTP está simulado (no hay red) |
| `employees.service.ts` | llamadas al backend de empleados, roles, credenciales y permisos | api/client, api/config, api/params y api/pagination, employees.adapter (convierte) y navigation (MENU_ITEMS, para armar la matriz); las usan las pantallas de empleados y roles |

### `importadoraInterfaz/src/features/employees/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `employees.slice.ts` | estado de empleados y roles: la lista de empleados (con la bodega por la que se pidió) y la lista de roles | employees.thunks (lo llenan), employees.selectors (lecturas) y rootReducer (clave 'employees'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/employees/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `employees.manage.thunks.test.ts` | registrar un empleado y cambiar su estado contra un service simulado | employees.manage.thunks (suite de pruebas) |
| `employees.thunks.ts` | carga la lista de empleados y de roles, registra un empleado, cambia su estado, guarda un rol, y carga y guarda los permisos de un empleado | employees.service (llamadas) y auth (selectRequestContext); las despachan useEmployeesDirectory, useRoles, useEmployeePermissions, useCreateEmployeeForm, EmployeesTable y RoleForm |

### `importadoraInterfaz/src/features/employees/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `employees.api.types.ts` | lo que responde la API en Go en empleados, roles y permisos (GET /employees, /roles, /permissions y /employees/:id/permissions) | employees.adapter (los convierte a los tipos de la app) y employees.service (los pide) |
| `employees.types.ts` | contratos de empleados, roles y permisos jerárquicos (Swagger) | employees.service, RolesPermissionsScreen, EmployeesScreen y usePermissions |

### `importadoraInterfaz/src/features/externals/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ExternalFormPanel.tsx` | formulario en el panel derecho para registrar o editar un proveedor o una transportadora | useExternalForm (estado y guardado), DrawerFormShell.css (armazón) y externals.constants; lo abre formRegistry («externalForm») |

### `importadoraInterfaz/src/features/externals/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ExternalsTable.css` | ExternalsTable.css · proveedores y transportadoras: una sola tarjeta con barra de herramientas pegada a la tabla · solo usa tokens de styles/tokens.css | ExternalsTable.tsx |
| `ExternalsTable.tsx` | una sola tarjeta con búsqueda, filtro de estado, botón de registrar y la tabla de proveedores o transportadoras | SuppliersScreen y CarriersScreen (la usan), useExternals y useExternalActions, RowActions (editar y borrar con íconos), ConfirmDialog (borrar), Pagination y navigation (abre el panel «externalForm») |

### `importadoraInterfaz/src/features/externals/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `externals.constants.ts` | estado inicial, tamaño de carga, textos por tipo y opciones de filtro de proveedores y transportadoras | externals.slice (initialState), externals.service (tamaño de carga), los hooks y los componentes (textos) |

### `importadoraInterfaz/src/features/externals/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `externals.filters.test.ts` | Pruebas unitarias de externals.filters | externals.filters (suite de pruebas) |
| `externals.filters.ts` | filtra la tabla de proveedores y transportadoras por texto y por estado | useExternals (lo aplica) y externals.types |

### `importadoraInterfaz/src/features/externals/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useExternalActions.ts` | cambiar el estado y borrar un proveedor o transportadora con su aviso de éxito o error | ExternalsTable (lo usa), externals.thunks, externals.constants (textos) y toast |
| `useExternalForm.ts` | estado y guardado del formulario de un proveedor o transportadora (crear o editar) | ExternalFormPanel (lo usa), externals.thunks (saveExternalThunk), externals.constants (textos) y navigation (cierra el panel) |
| `useExternals.ts` | pide los proveedores o transportadoras y maneja la búsqueda y el filtro de estado de la tabla | ExternalsTable (lo usa), externals.thunks, externals.selectors, externals.filters (filtrar) y auth (hay sesión) |

### `importadoraInterfaz/src/features/externals/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | externals · proveedores y transportadoras (terceros): tabla, panel de registro, estado y servicio | screenRegistry (pantallas), rootReducer (externalsReducer), formRegistry (ExternalFormPanel) y employees (DocumentType) |

### `importadoraInterfaz/src/features/externals/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CarriersScreen.tsx` | pantalla de transportadoras: la tabla de externos filtrada por tipo «carrier» | screenRegistry (la monta) y ExternalsTable (tabla, alta y baja) |
| `SuppliersScreen.tsx` | pantalla de proveedores: la tabla de externos filtrada por tipo «supplier» | screenRegistry (la monta) y ExternalsTable (tabla, alta y baja) |

### `importadoraInterfaz/src/features/externals/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `externals.selectors.ts` | lecturas de proveedores y transportadoras: lista, estado de carga y si hay un cambio en curso | useExternals y los hooks de externals; leen state.externals |

### `importadoraInterfaz/src/features/externals/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `externals.service.ts` | llamadas al backend de proveedores y transportadoras: listar, crear, editar (también el estado) y borrar | api/client y api/config (rutas); las usa externals.thunks |

### `importadoraInterfaz/src/features/externals/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `externals.slice.ts` | estado de proveedores y transportadoras: la lista del tipo abierto y si hay un cambio en curso | externals.thunks (lo llenan), externals.selectors (lecturas) y rootReducer (clave 'externals'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/externals/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `externals.thunks.ts` | cargas y acciones de proveedores y transportadoras: listar, guardar (crear o editar), cambiar el estado y borrar | externals.service (llamadas) y externals.slice (reacciona); las despachan useExternals, useExternalActions y useExternalForm |

### `importadoraInterfaz/src/features/externals/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `externals.types.ts` | contratos de proveedores y transportadoras (tabla externals de la API): lo que usa la app, lo que se envía y el estado del slice | externals.service, externals.slice, externals.selectors, los hooks y los componentes; employees importa DocumentType |

### `importadoraInterfaz/src/features/inventory/components/counts/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CountDetailModal.css` | CountDetailModal.css | CountDetailModal.tsx |
| `CountDetailModal.tsx` | modal para ver y actualizar items de un conteo físico | react, @/global/components/UI/atoms/Pill, @/global/helpers/formatting/format, ../../types/inventory.counts.types |
| `CreateCountModal.tsx` | modal para iniciar un nuevo conteo físico | react, ../../types/inventory.counts.types |
| `InventoryCountsTable.css` | InventoryCountsTable.css | InventoryCountsTable.tsx |
| `InventoryCountsTable.tsx` | tabla de auditoría y conteos físicos | react, @/global/components/UI/atoms/Pill, @/global/helpers/formatting/format, @/assets/icons/eye.svg?raw |

### `importadoraInterfaz/src/features/inventory/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AssignStockPanel.css` | AssignStockPanel.css · asignar un producto a una ubicación: lista de resultados de la búsqueda · solo usa tokens de styles/tokens.css | AssignStockPanel.tsx |
| `AssignStockPanel.tsx` | formulario en el panel derecho para asignar un producto del catálogo a una ubicación de la bodega activa, con sus unidades | useAssignStockForm (búsqueda, estado y guardado) y DrawerFormShell.css (armazón); lo abre formRegistry («assignStock») |
| `CreateProductForm.tsx` | formulario de nuevo producto en el panel derecho: datos, clasificación (categoría, marca y modelo), tarifas y ubicación inicial en una bodega | useCreateProductForm (estado, validación y guardado), MoneyInput (dinero con puntos de miles), DrawerFormShell.css (armazón) y navigation (cerrar el panel) |
| `EditProductPanel.css` | EditProductPanel.css · estilos del formulario de edición de producto | EditProductPanel.tsx |
| `EditProductPanel.tsx` | panel lateral para editar los datos básicos, categoría, nuevo y estado de un producto | useEditProductForm (estado y guardado) y navigation (cerrar el panel) |
| `ProductDetailPanel.css` | ProductDetailPanel.css · estilos del panel lateral de detalle de producto | ProductDetailPanel.tsx |
| `ProductDetailPanel.tsx` | panel lateral de detalle de un producto: información, QR visible, existencias y ubicación por bodega, lista de tarifas (P0..P3) y edición de precios | detail/ (las secciones), useProductStock (existencias), useProductPriceEditor (tarifas), usePermissions, warehouses (bodegas) y navigation (abrir otros paneles) |
| `ProductLocationsPanel.css` | ProductLocationsPanel.css · estilos del panel de ubicaciones y existencias por bodega | ProductLocationsPanel.tsx |
| `ProductLocationsPanel.tsx` | panel lateral para ver las ubicaciones físicas y existencias por bodega de un producto | ProductsTable (lo abre con openDrawerForm kind: 'productLocations'), useProductStock (existencias) y formRegistry |

### `importadoraInterfaz/src/features/inventory/components/drawer/detail/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductDetailHero.tsx` | encabezado del detalle de un producto: imagen, estado, nombre y código | ProductDetailPanel (lo pinta) |
| `ProductFactsSection.tsx` | sección «Información General» del detalle de un producto: marca, categoría, modelo, ubicación y descripción | ProductDetailPanel (la pinta) |
| `ProductPricesSection.tsx` | sección «Lista de Precios» del detalle de un producto: tarifas P0..P3 y su edición | ProductDetailPanel (la pinta), useProductPriceEditor (estado), MoneyInput y format (pesos) |
| `ProductWarehousesSection.test.tsx` | el detalle del producto muestra TODAS las ubicaciones donde está guardado dentro de cada bodega | ProductWarehousesSection; los datos son de ejemplo (no hay red); se corre con npm test |
| `ProductWarehousesSection.tsx` | sección «Ubicaciones y Existencias por Sede» del detalle de un producto: vendibles, físico y reservado por bodega | ProductDetailPanel (la pinta); recibe las existencias de useProductStock y las bodegas de warehouses |

### `importadoraInterfaz/src/features/inventory/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `InventoryTables.css` | InventoryTables.css · tarjeta, barra de búsqueda y tabla de las pantallas de inventario (productos, marcas, categorías, modelos y stock) · solo usa tokens de styles/tokens.css | InventoryTables.tsx |

### `importadoraInterfaz/src/features/inventory/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CatalogTable.tsx` | tabla de un catálogo base (marcas, categorías o modelos): buscador, botón crear y una fila por registro | CatalogTableRow (las filas), catalogs.labels (textos) y navigation (abrir el panel de crear, ver y editar) |
| `CatalogTableRow.tsx` | una fila de la tabla de catálogos: logo opcional, id, nombre, estado como dropdown y acciones heredadas de RowActions | CatalogTable (la pinta), RowActions (acciones en fila) y los iconos de acciones de assets |
| `ProductsTable.tsx` | tabla de productos: imagen, código, nombre, marca, categoría, ubicación, precio (P0), vendible, estado y acciones (detalle, editar, ubicaciones y QR); el estado se cambia desde un desplegable en su columna | ProductsScreen (la usa), inventory.selectors (productos y estado), useProductStatus (activar o desactivar), shop.helpers, RowActions y DrawerRight (productDetail, editProduct, productLocations y qrLabels) |
| `StockTable.tsx` | tabla de existencias de la bodega activa: una fila por producto y ubicación con físico, reservado, vendible y nivel | StockScreen (la usa), Pill (nivel y distintivo de varias ubicaciones) e inventory.constants (textos del nivel); recibe filas, mensajes y conteos ya calculados por useStockTable |

### `importadoraInterfaz/src/features/inventory/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.constants.ts` | tamaño de página, estado inicial y textos de las tablas de inventario | inventory.slice (initialState), inventory.thunks (tamaño de página) y las tablas |

### `importadoraInterfaz/src/features/inventory/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.adapter.test.ts` | pruebas de las filas de stock de la tabla: conversión y nivel (agotado, bajo o disponible) | inventory.adapter; se corre con npm test |
| `inventory.adapter.ts` | convierte las filas de stock de la API a las de la tabla y decide si están agotadas, bajas o bien; el único lugar que conoce los nombres del backend en esta feature | inventory.service (convierte), inventory.api.types e inventory.types |
| `inventory.stock.test.ts` | pruebas del filtro, los conteos por ubicación y los totales de la tabla de existencias | inventory.stock; se corre con npm test |
| `inventory.stock.ts` | funciones puras de la tabla de existencias: filtrar por categoría y marca, contar en cuántas ubicaciones está cada producto y sumar totales | useStockTable (filtra y suma) y StockTable (el distintivo «Presente en N ubicaciones»); no toca el store |

### `importadoraInterfaz/src/features/inventory/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useAssignStockForm.ts` | estado y guardado del formulario «Asignar producto a una ubicación»: buscar un producto del catálogo, elegir ubicación y unidades | AssignStockPanel (lo usa), inventory.thunks (searchCatalogThunk y assignStockThunk), locations (useLocations: las ubicaciones activas de la bodega) y navigation (cierra el panel) |
| `useCreateProductForm.ts` | estado del formulario de nuevo producto: datos, categoría, marca, modelo, tarifas y ubicación inicial, con validación y guardado | CreateProductForm (lo usa), catalogs (marcas, categorías y modelos), locations (ubicaciones de la bodega elegida), inventory.thunks (crear y recargar la tabla) y navigation (cerrar el panel o abrir el QR) |
| `useEditProductForm.ts` | estado del formulario de edición de un producto: campos, validación y guardado | EditProductPanel (lo usa), inventory.thunks (saveProductDetailsThunk), inventory.slice (actualiza la fila local), catalogs (categorías), navigation y toast |
| `useInventoryCounts.ts` | hook para la gestión del flujo de conteos físicos de inventario | inventory.counts.service, useAppSelector (bodega activa) |
| `useInventoryTables.ts` | pide al backend la tabla de productos cuando cambia la página, la búsqueda (con espera) o la bodega activa | ProductsScreen (lo usa), inventory.thunks, inventory.selectors y la bodega activa; auth (hay sesión) |
| `useProductPriceEditor.ts` | estado de la edición de la lista de precios (P0..P3) de un producto: formulario, guardado y mensajes | ProductDetailPanel (lo usa) y inventory.thunks (saveProductPricesThunk) |
| `useProductStatus.ts` | activar o desactivar un producto desde la tabla, con su aviso y la fila actualizada al instante | ProductsTable (lo usa), inventory.thunks (saveProductDetailsThunk), inventory.slice (updateProductStatusLocally) y toast |
| `useProductStock.ts` | pide las existencias de un producto en todas las bodegas al abrir su detalle o sus ubicaciones | ProductDetailPanel y ProductLocationsPanel (lo usan), inventory.thunks y inventory.selectors; auth (hay sesión) |
| `useStockTable.ts` | pide las existencias de la bodega activa (una fila por producto y ubicación) y maneja la búsqueda, la ubicación, la categoría y la marca | StockScreen y StockTable (lo usan), inventory.thunks (loadStockTableThunk), inventory.selectors, inventory.stock (filtros y totales), locations (useLocations: las ubicaciones activas) y auth (hay sesión) |

### `importadoraInterfaz/src/features/inventory/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | inventory/index · API pública de la feature inventario (tablas de productos, marcas, categorías y modelos) | rootReducer (reducer), screenRegistry (pantallas) y formRegistry (paneles laterales) |

### `importadoraInterfaz/src/features/inventory/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CatalogScreens.tsx` | Inventario > Marcas, Categorías y Modelos: cada una es la tabla de su catálogo | catalogs (listas, estados y useLoadCatalogs) y CatalogTable; las monta MainContent (screenRegistry) |
| `InventoryCountsScreen.tsx` | pantalla de Conteos Físicos y Auditoría de Inventario | react, @/global/components/UI/molecules/table/Pagination, @/global/hooks/access/usePermissions, ../hooks/useInventoryCounts |
| `ProductsScreen.tsx` | Inventario > Productos: tabla de productos con búsqueda, botón de nuevo producto, el stock de la bodega activa y paginador | useProductsTable (los pide), ProductsTable, inventory.slice (búsqueda y página), global SearchBar y Pagination; la monta MainContent (screenRegistry) |
| `StockScreen.tsx` | Inventario > Existencias: lo que hay en la bodega activa por producto y ubicación, con búsqueda, filtros y la acción de asignar un producto a una ubicación | useStockTable (datos y filtros), StockTable, global SearchBar y FilterSelect, Pagination, usePermissions y navigation (abre el panel «assignStock»); la monta MainContent (screenRegistry) |

### `importadoraInterfaz/src/features/inventory/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.selectors.ts` | lecturas de las tablas de inventario | inventory.slice (estado), useProductsTable y useStockTable |

### `importadoraInterfaz/src/features/inventory/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.counts.service.ts` | capa de servicio HTTP para auditoría y conteos físicos de inventario | api/client, API_CONFIG (rutas stock.counts), inventory.counts.types |
| `inventory.service.test.ts` | pruebas de GET /stock para la tabla: parámetros (bodega, búsqueda, página) y conversión de las filas | inventory.service; el cliente HTTP está simulado (no hay red) |
| `inventory.service.ts` | llamadas al backend de stock: GET /stock y POST /stock/relocate | api/client, api/config, api/params y api/pagination, inventory.adapter (convierte); la usa inventory.thunks y RelocateStockPanel |

### `importadoraInterfaz/src/features/inventory/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.productStock.test.ts` | pruebas de las existencias de un producto y del guardado de tarifas en el estado de inventario | inventory.slice y inventory.thunks (solo sus tipos de acción); se corre con npm test |
| `inventory.slice.test.ts` | pruebas del estado de las tablas de inventario: carga, descarte de respuestas viejas y vaciado al cambiar de bodega | inventory.slice y navigation (setActiveWarehouse); se corre con npm test |
| `inventory.slice.ts` | estado de las tablas de inventario: productos y stock (items, página, búsqueda, estado de carga y error) | inventory.thunks (lo llenan), inventory.selectors (lecturas), navigation (al cambiar de bodega se vacía) y rootReducer (clave 'inventory'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/inventory/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.thunks.ts` | carga la tabla de productos y la tabla de stock de la bodega activa | inventory.service (stock), shop (productos y búsqueda), auth (selectRequestContext) y la bodega activa; las despachan useProductsTable y useStockTable |

### `importadoraInterfaz/src/features/inventory/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.api.types.ts` | lo que responde la API en Go en GET /stock (una fila por producto, bodega y ubicación) con los datos del producto, con los nombres del backend | inventory.adapter (convierte a InventoryStockRow) e inventory.service |
| `inventory.counts.types.ts` | tipos para el módulo de conteos físicos de inventario | inventory.counts.service, useInventoryCounts y componentes de conteos físicos |
| `inventory.types.ts` | modelos de las tablas de inventario: existencia por bodega y estado del slice (productos y stock) | inventory.adapter (arma las filas), inventory.slice, inventory.selectors y las pantallas de inventario |

### `importadoraInterfaz/src/features/locations/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `LocationDetailPanel.css` | LocationDetailPanel.css · detalle de una ubicación: encabezado y lista de productos con acciones · solo usa tokens de styles/tokens.css | LocationDetailPanel.tsx |
| `LocationDetailPanel.tsx` | detalle de una ubicación en el panel derecho: lo que guarda, y acciones para imprimir su QR, el de cada producto o reubicar un producto | useLocationContent (productos de la ubicación), locations.adapter (etiquetas QR), navigation (abrir QR y reubicar) y DrawerFormShell.css; lo abre formRegistry («locationDetail») |
| `LocationFormPanel.css` | LocationFormPanel.css · estilos para el generador de combinaciones alfanuméricas de ubicaciones | LocationFormPanel.tsx |
| `LocationFormPanel.tsx` | formulario en el panel derecho para crear o editar una ubicación (estante) de la bodega | useLocationForm (estado y guardado), DrawerFormShell.css (armazón) y navigation (cerrar el panel); lo abre formRegistry («locationForm») |

### `importadoraInterfaz/src/features/locations/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `LocationsTable.tsx` | tabla de ubicaciones de la bodega: código, descripción, productos, unidades, estado y acciones (ver, QR, editar, eliminar); el estado se cambia desde un desplegable en su columna | LocationsScreen (la usa), RowActions (acciones con íconos de línea), usePagedList + Pagination (20 por página), useLocationActions (activar y eliminar), ConfirmDialog y navigation (abrir panel de detalle, formulario y QR) |

### `importadoraInterfaz/src/features/locations/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `locations.constants.ts` | estado inicial de ubicaciones | locations.slice (initialState) |

### `importadoraInterfaz/src/features/locations/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `locations.adapter.test.ts` | Pruebas unitarias de locations.adapter | locations.adapter (suite de pruebas) |
| `locations.adapter.ts` | convierte lo que responde la API (ubicaciones y su contenido) a lo que usa la app, filtra la lista y arma el texto de los QR | locations.service (convierte cada respuesta), LocationsScreen (filtro) y las etiquetas QR de ubicaciones y productos |

### `importadoraInterfaz/src/features/locations/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useLocationActions.ts` | crear, editar, activar o desactivar y borrar ubicaciones con su aviso de éxito o error | LocationFormPanel y LocationsTable (lo usan), locations.thunks (las acciones) y toast |
| `useLocationContent.ts` | pide los productos guardados en una ubicación y deja recargarlos | LocationDetailPanel (lo usa), locations.thunks y locations.selectors |
| `useLocationForm.ts` | estado del formulario para crear o editar una ubicación: código, descripción, validación y guardado | LocationFormPanel (lo usa), useLocationActions (guardar) y navigation (cerrar el panel) |
| `useLocations.ts` | pide las ubicaciones de la bodega activa y las entrega con su estado de carga, junto con el nombre de la bodega | LocationsScreen y CreateProductForm (lo usan), locations.thunks, locations.selectors, ui (bodega activa) y auth (hay sesión) |

### `importadoraInterfaz/src/features/locations/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | locations/index · API pública de la feature locations (ubicaciones o estantes de cada bodega y sus códigos QR) | rootReducer (reducer), screenRegistry (LocationsScreen), formRegistry (paneles de formulario y detalle) y CreateProductForm (ubicaciones de una bodega) |

### `importadoraInterfaz/src/features/locations/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `LocationsScreen.css` | LocationsScreen.css · Inventario > Ubicaciones: ruta de navegación sobre la tarjeta · solo usa tokens de styles/tokens.css | LocationsScreen.tsx |
| `LocationsScreen.tsx` | Inventario > Ubicaciones: los estantes de la bodega activa con lo que guarda cada uno; crear, editar, ver contenido e imprimir QR | useLocations (las pide), filterLocations (búsqueda), LocationsTable, global SearchBar y navigation (abrir el formulario y las etiquetas); la monta MainContent (screenRegistry) |

### `importadoraInterfaz/src/features/locations/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `locations.selectors.ts` | lecturas de ubicaciones: la lista de la bodega abierta y el contenido de la ubicación seleccionada | LocationsScreen, LocationDetailPanel y los hooks de ubicaciones; leen state.locations |

### `importadoraInterfaz/src/features/locations/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `locations.service.ts` | llamadas al backend de ubicaciones: listar (con lo que guarda cada una), ver su contenido, crear, editar, activar/desactivar y borrar | api/client y api/config (rutas), locations.adapter (convierte); las usa locations.thunks |

### `importadoraInterfaz/src/features/locations/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `locations.slice.ts` | estado de ubicaciones: la lista de la bodega abierta y el contenido de la ubicación seleccionada | locations.thunks (lo llenan), locations.selectors (lecturas) y rootReducer (clave 'locations'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/locations/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `locations.thunks.ts` | cargas y acciones de ubicaciones: listar las de una bodega, ver el contenido de una, crear, editar, activar o desactivar y borrar | locations.service (llamadas), auth (selectRequestContext) y locations.slice (reacciona); las despachan useLocations, useLocationContent y los paneles |

### `importadoraInterfaz/src/features/locations/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `locations.types.ts` | contratos de las ubicaciones (estantes) de una bodega, lo que guarda cada una y el estado del slice | locations.adapter (convierte lo del backend), locations.service, locations.slice, locations.selectors y los componentes |

### `importadoraInterfaz/src/features/navigation/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `menuItems.constants.ts` | menuItems · lista fija del menú lateral (módulos y subgestiones) | SideMenu (lo pinta), navigation.slice (elige el primer subitem), MainContent (decide la pantalla) |
| `navigation.constants.ts` | estado inicial de la navegación (módulo, subgestión, bodega y caja de arranque) | navigation.slice (initialState) |

### `importadoraInterfaz/src/features/navigation/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `navigation.helpers.ts` | funciones simples para leer el menú sin repetir lógica | MainContent (título), menuItems.constants (fuente de datos) |
| `navigation.route.test.ts` | pruebas de la ruta del navegador por pantalla: se arma desde módulo y subgestión y se lee de vuelta | navigation.helpers (toRoutePath, parseRoutePath); se corre con npm test |

### `importadoraInterfaz/src/features/navigation/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useRouteSync.ts` | mantiene la ruta del navegador igual a la pantalla activa (módulo y subgestión), en los dos sentidos | ErpLayout (lo monta), navigation.slice (módulo y subgestión activos) y navigation.helpers (toRoutePath, parseRoutePath) |

### `importadoraInterfaz/src/features/navigation/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | navigation/index · API pública de la feature (lo único que deben importar otras features y app) | ./types/navigation.types, ./constants/menuItems.constants, ./constants/navigation.constants, ./helpers/navigation.helpers |

### `importadoraInterfaz/src/features/navigation/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `navigation.slice.ts` | estado de navegación (clave 'ui'): módulo, subitem, bodega y usuario activos | SideMenu, MainContent, DrawerRight, AppHeader (leen/disparan estas acciones) |

### `importadoraInterfaz/src/features/navigation/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `navigation.types.ts` | contratos del menú y del estado de navegación (ui) | menuItems.constants, navigation.slice, SideMenu, MainContent, DrawerRight |

### `importadoraInterfaz/src/features/notifications/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `NotificationsPopover.css` | NotificationsPopover.css | NotificationsPopover.tsx |
| `NotificationsPopover.tsx` | campanita desplegable de notificaciones para el AppHeader | react, @/global/helpers/formatting/format, ../hooks/useNotifications |

### `importadoraInterfaz/src/features/notifications/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useNotifications.ts` | hook de estado para listar y marcar notificaciones como leídas | react, @/global/hooks/store/useRedux, @/features/auth, ../types/notifications.types |

### `importadoraInterfaz/src/features/notifications/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature | ./types/notifications.types, ./services/notifications.service, ./hooks/useNotifications, ./components/NotificationsPopover |

### `importadoraInterfaz/src/features/notifications/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `notifications.service.ts` | llamadas HTTP para notificaciones | @/api, ../types/notifications.types |

### `importadoraInterfaz/src/features/notifications/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `notifications.types.ts` | tipos para el sistema de notificaciones del empleado | Módulos internos de la capa |

### `importadoraInterfaz/src/features/orders/components/cancel/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `OrderCancelDialog.css` | OrderCancelDialog.css · estilos del campo del motivo dentro del diálogo de anulación · solo usa tokens de styles/tokens.css | OrderCancelDialog.tsx |
| `OrderCancelDialog.tsx` | diálogo para anular un pedido: pide el motivo (mínimo 5 letras) y confirma | global ConfirmDialog (el diálogo), orders.thunks (cancelOrderThunk); lo usan OrdersScreen (desde la fila) y OrderDetail (desde el panel) |

### `importadoraInterfaz/src/features/orders/components/detail/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `OrderDrawer.css` | OrderDrawer.css · estilos del panel de un pedido: cuerpo con scroll y pie fijo con las acciones (el .dbody y el .dfoot de la maqueta) · solo usa tokens de styles/tokens.css | OrderDrawer.tsx |
| `OrderDrawer.tsx` | contenido del panel derecho al abrir un pedido: resumen, cliente y vendedor, líneas, pagos y, abajo, las acciones del pedido | useOpenOrderDetail (pide el detalle), orders.selectors (pedido abierto y detalle), orders.thunks (aprobar el comprobante), las cajas de sections/ (resumen, personas, líneas y pagos), OrderCancelDialog, orders.clipboard y usePermissions; lo muestra DrawerRight (drawerRegistry, modo «order») |

### `importadoraInterfaz/src/features/orders/components/detail/sections/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `OrderHistorySection.tsx` | caja «Historial de etapas» del detalle de un pedido: por cada etapa, quién lo movió, cuándo entró y cuánto estuvo | OrderDrawer (la pinta), OrderSectionParts (caja y fila), orders.constants (nombres de etapa) y global format (fecha y hora) |
| `OrderLinesSection.tsx` | caja «Líneas» del detalle de un pedido: cada producto con su cantidad, precio, descuento y total | OrderDrawer (la pinta), OrderSectionParts (caja) y global format (pesos) |
| `OrderPaymentsSection.tsx` | caja «Pagos y abonos» del detalle de un pedido: cada pago con su método, fecha, monto y estado | OrderDrawer (la pinta), OrderSectionParts (fila y caja), orders.labels (método de pago) y global Pill y format (pesos y fecha) |
| `OrderPeopleSection.tsx` | cajas «Cliente» y «Vendedor» del detalle de un pedido | OrderDrawer (la pinta) y OrderSectionParts (fila y caja) |
| `OrderSectionParts.tsx` | piezas compartidas por las cajas del detalle de un pedido: fila, caja con título y etiqueta de sí o no | OrderSummarySection, OrderPeopleSection, OrderLinesSection, OrderPaymentsSection y OrderTransferProof; global Pill; sus estilos están en OrderSections.css |
| `OrderSections.css` | OrderSections.css · estilos de las cajas del detalle de un pedido (.sec, .kv y .line de la maqueta) · solo usa tokens de styles/tokens.css | OrderSections.tsx |
| `OrderSummarySection.tsx` | caja «Resumen» del detalle de un pedido: etapa, canal, pago, ubicación, totales y fechas; si pagó por transferencia, el comprobante | OrderDrawer (la pinta), OrderSectionParts (fila, caja y etiqueta), OrderTransferProof (comprobante), orders.labels (método de pago) y global Pill y format (pesos y fecha) |
| `OrderTransferProof.css` | OrderTransferProof.css · comprobante de transferencia del detalle del pedido: caja, miniatura y ventana para verlo completo · solo usa tokens de styles/tokens.css | OrderTransferProof.tsx |
| `OrderTransferProof.tsx` | comprobante de una transferencia dentro del detalle del pedido: estado, referencia, miniatura y ventana para verlo completo | OrderSummarySection (la usa solo si el pago es por transferencia), OrderSectionParts (etiqueta de estado) y global useEscapeKey (cerrar la ventana con Escape) |

### `importadoraInterfaz/src/features/orders/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `OrderRowActions.css` | OrderRowActions.css · contenedor de las acciones de una fila heredando de RowActions | OrderRowActions.tsx |
| `OrderRowActions.tsx` | acciones en línea con íconos para una fila de la tabla de pedidos, delegando en el componente padre RowActions | OrdersTable (le pasa el pedido y recibe la acción elegida), RowActions y orders.actions |
| `OrdersTable.css` | OrdersTable.css · estilos de la tabla de pedidos (la .dt de la maqueta: caja con borde y radio 10, encabezado gris, filas con hover) · solo usa tokens de styles/tokens.css | OrdersTable.tsx |
| `OrdersTable.tsx` | tabla de pedidos (la .dt de la maqueta): una columna por cada dato importante y, al final, las acciones; el resto de datos va en el detalle del panel derecho | orders.selectors (tabla filtrada y estado), orders.slice (abrir un pedido), orders.thunks (reintentar), orders.clipboard (copiar), OrderRowActions, global Pill y usePermissions |

### `importadoraInterfaz/src/features/orders/components/toolbar/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `OrdersToolbar.css` | OrdersToolbar.css · barra de búsqueda (38%), filtros centrales y acciones · idéntico al diseño canónico | OrdersToolbar.tsx |
| `OrdersToolbar.tsx` | barra de la tabla de pedidos: búsqueda (38%), filtros centrales (bodega, etapa, canal) y acciones | orders.slice (filtros), orders.selectors, global SearchBar |

### `importadoraInterfaz/src/features/orders/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `orders.constants.ts` | etapas y canales de los pedidos, textos y estado inicial | orders.adapter (etiquetas), orders.slice (initialState), OrdersToolbar y OrdersTable |

### `importadoraInterfaz/src/features/orders/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `orders.actions.test.ts` | qué acción de etapa ofrece cada pedido según su etapa real, igual que las reglas de Go | orders.actions (suite de pruebas) |
| `orders.actions.ts` | acciones que ofrece cada fila de la tabla de pedidos: la siguiente etapa, ver el detalle, copiar el número y anular | OrderRowActions (arma el menú), OrdersTable (ejecuta cada acción) y orders.thunks (advanceOrderThunk) |
| `orders.adapter.test.ts` | pruebas de la conversión de lo que responde la API en pedidos (filas, detalle y contadores), la búsqueda de la tabla y las acciones por fila | orders.adapter y orders.actions; se corre con npm test |
| `orders.adapter.ts` | convierte lo que responde la API en Go en pedidos (filas de la tabla y detalle) a lo que usa la app, y filtra la tabla por texto | orders.service (lo aplica a cada respuesta), orders.selectors (filterOrders); es el único lugar que conoce los nombres del backend en pedidos |
| `orders.clipboard.ts` | copia el número de un pedido al portapapeles y avisa si salió bien o no | OrdersTable (acción «copiar» de la fila) y OrderDrawer (botón «Copiar número»); usa global toast |
| `orders.labels.ts` | textos cortos de pedidos que se repiten en la tabla y en el detalle: método de pago y fecha | OrdersTable y las cajas del detalle del pedido (OrderSummarySection, OrderPaymentsSection); orders.constants (PAYMENT_METHOD_LABELS) |

### `importadoraInterfaz/src/features/orders/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useOpenOrderDetail.ts` | pide el detalle del pedido abierto en el panel derecho cuando cambia el pedido elegido | OrderDetail (lo usa al montarse); despacha orders.thunks y lee orders.slice (pedido abierto) |
| `useOrdersLoader.ts` | pide al backend los conteos por etapa y la tabla de pedidos, y los vuelve a pedir al cambiar de etapa, de canal o de bodega | OrdersScreen (lo usa al montarse); despacha orders.thunks y lee la sesión (auth), la bodega (navigation), warehouses (estado de carga) y orders.slice |

### `importadoraInterfaz/src/features/orders/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | orders/index · API pública de la feature orders (Tienda > Bandeja de Pedidos) | rootReducer (reducer), screenRegistry (OrdersScreen), drawerRegistry (OrderDrawer y su encabezado) |

### `importadoraInterfaz/src/features/orders/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `OrdersScreen.css` | OrdersScreen.css · estilos de la pantalla de pedidos (la barra y la tabla una debajo de la otra) · solo usa tokens de styles/tokens.css | OrdersScreen.tsx |
| `OrdersScreen.tsx` | pantalla de Tienda > Bandeja de Pedidos: barra con etapas, buscador y canal, y la tabla de pedidos | useOrdersLoader (pide conteos y tabla), OrdersToolbar, OrdersTable y OrderCancelDialog; la monta MainContent (screenRegistry); al elegir un pedido se abre OrderDrawer en el panel derecho (drawerRegistry, modo «order») |

### `importadoraInterfaz/src/features/orders/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `orders.selectors.ts` | lecturas derivadas del estado de pedidos (tabla filtrada, chips de etapa y datos del encabezado del panel) | OrdersScreen y sus componentes, drawerRegistry (modo «order»); leen state.orders |

### `importadoraInterfaz/src/features/orders/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `orders.service.ts` | llamadas al backend de pedidos: GET /sales (lista de una etapa y total por etapa), GET /sales/:id (detalle) y GET /payments (pagos de un pedido) | api/client, api/config, api/params y api/pagination, orders.adapter (convierte); las usan orders.thunks |
| `orders.verify.test.ts` | pruebas de aprobar el comprobante de una transferencia: verifica el pago en revisión o crea uno con el comprobante y lo verifica | orders.service (verifyTransferPayment); el cliente HTTP está simulado (no hay red); se corre con npm test |

### `importadoraInterfaz/src/features/orders/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `orders.slice.ts` | estado de la vista de pedidos (clave 'orders'): etapa, canal, bodega y búsqueda elegidos, conteos, tabla y pedido abierto con su detalle | orders.thunks (la llenan), orders.selectors (lecturas), navigation (al cambiar de bodega se limpia) y rootReducer (clave 'orders'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/orders/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `orders.thunks.ts` | carga los conteos por etapa, la tabla de pedidos y el detalle de uno; anula un pedido y verifica el comprobante de una transferencia | orders.service (llamadas), auth (selectRequestContext), features/shop (cancelSale) y orders.slice (reacciona); las despachan useOrdersLoader, useOpenOrderDetail y las pantallas |

### `importadoraInterfaz/src/features/orders/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `orders.api.types.ts` | lo que responde la API en Go en pedidos: la lista (GET /sales), el detalle (GET /sales/:id) y los pagos de un pedido (GET /payments?saleId=) | orders.adapter (los convierte a los tipos de la app) y orders.service (los pide) |
| `orders.types.ts` | tipos de la app para pedidos: etapas, canales, fila de la tabla, detalle y estado de la pantalla | orders.adapter (los arma), orders.slice (los guarda), orders.selectors y los componentes de la pantalla de pedidos |

### `importadoraInterfaz/src/features/purchases/components/panels/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `PurchaseDetailPanel.tsx` | detalle de una orden de compra en el panel derecho: datos de la orden, renglones con lo pedido y lo recibido, y las acciones (recibir, Excel, anular) | usePurchaseDetail (la orden con sus renglones), usePurchaseActions (Excel y anular), purchases.rules (qué acciones caben), Pill, ConfirmDialog, global format y navigation (abre la recepción); lo abre formRegistry («purchaseDetail») |
| `PurchaseFormPanel.tsx` | formulario en el panel derecho para crear una orden de compra: proveedor, referencia, fecha esperada, notas y los productos con cantidad, costo e IVA | usePurchaseForm (estado, búsqueda de productos y envío), purchases.rules (totales) y DrawerFormShell.css (armazón); lo abre formRegistry («purchaseForm») |
| `PurchasePanels.css` | PurchasePanels.css · paneles de compras (detalle, recepción y orden nueva): datos, renglones y resultados de búsqueda · solo usa tokens de styles/tokens.css | PurchasePanels.tsx |
| `PurchaseReceivePanel.tsx` | recepción en bodega: por cada producto pendiente, cuánto llega y en qué ubicación de la bodega queda | usePurchaseReceive (renglones, validación y envío), purchases.rules (pendiente), DrawerFormShell.css (armazón); lo abre formRegistry («purchaseReceive») |

### `importadoraInterfaz/src/features/purchases/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `PurchasesTable.css` | PurchasesTable.css · órdenes de compra: una sola tarjeta con la barra de herramientas pegada a la tabla · solo usa tokens de styles/tokens.css | PurchasesTable.tsx |
| `PurchasesTable.tsx` | tarjeta de órdenes de compra con buscador, filtros de bodega y estado, y tabla global | PurchaseOrdersScreen y ReceivingScreen (la usan), usePurchases y usePurchaseActions, RowActions, Pill, ConfirmDialog, Pagination y navigation |

### `importadoraInterfaz/src/features/purchases/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchases.constants.ts` | estados de la orden con su texto y color, tamaño de carga y estado inicial | purchases.slice (initialState), purchases.service (cuántas pide) y los componentes de compras |

### `importadoraInterfaz/src/features/purchases/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchases.adapter.ts` | convierte lo que responde la API en Go (órdenes de compra y sus renglones) a lo que usa la app, y filtra la tabla por texto y estado | purchases.service (convierte cada respuesta) y usePurchases (filtra); es el único lugar que conoce los nombres del backend en compras |
| `purchases.rules.test.ts` | pruebas de las reglas de compras: pendiente, recibir, anular, validación y totales; y del adaptador de la API | purchases.rules y purchases.adapter; se corre con npm test |
| `purchases.rules.ts` | reglas puras de compras: qué falta recibir, cuándo se puede recibir o anular, validar lo que se recibe y calcular los totales de una orden nueva | usePurchaseReceive, usePurchaseForm, PurchasesTable y PurchaseDetailPanel; no toca el store |

### `importadoraInterfaz/src/features/purchases/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `usePurchaseActions.ts` | anular una orden de compra y bajar su Excel, con su aviso de éxito o error | PurchasesTable y PurchaseDetailPanel (lo usan), purchases.thunks (voidPurchaseThunk y exportPurchaseExcelThunk) y toast |
| `usePurchaseDetail.ts` | pide el detalle de una orden de compra (con sus renglones) al abrir el panel | PurchaseDetailPanel y PurchaseReceivePanel (lo usan), purchases.thunks (loadPurchaseDetailThunk), purchases.slice (openPurchase) y purchases.selectors |
| `usePurchaseForm.ts` | formulario de una orden de compra nueva: proveedor, referencia, fecha esperada, notas y los productos con su cantidad, costo e IVA | PurchaseFormPanel (lo usa), purchases.rules (totales y validación), purchases.thunks (proveedores y crear), inventory (searchCatalogThunk: buscar productos del catálogo) y navigation (bodega activa y cierra el panel) |
| `usePurchaseReceive.ts` | formulario de la recepción en bodega: cuánto entra de cada renglón y en qué ubicación queda | PurchaseReceivePanel (lo usa), usePurchaseDetail (la orden), purchases.rules (validación), purchases.thunks (receivePurchaseThunk), locations (ubicaciones activas de la bodega de la orden) y navigation (cierra el panel) |
| `usePurchases.ts` | pide las órdenes de compra (globales o por bodega) y maneja la búsqueda y filtros | PurchasesTable (lo usa), purchases.thunks (loadPurchasesThunk), purchases.selectors, purchases.adapter (filtrar), purchases.rules (recepción) y auth (hay sesión) |

### `importadoraInterfaz/src/features/purchases/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | purchases/index · API pública de la feature compras (órdenes de compra y recepción en bodega) | rootReducer (reducer), screenRegistry (pantallas) y formRegistry (paneles laterales) |

### `importadoraInterfaz/src/features/purchases/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `PurchaseOrdersScreen.tsx` | Gestión Compras > Órdenes de Compra: todas las órdenes de la bodega activa, con búsqueda, estado, crear, ver, recibir, bajar el Excel y anular | PurchasesTable (la tarjeta con la barra y la tabla); la monta MainContent (screenRegistry) |
| `ReceivingScreen.tsx` | Gestión Compras > Recepción en Bodega: solo las órdenes que esperan mercancía, con la acción de recibir por producto y ubicación | PurchasesTable en modo «recepción»; la monta MainContent (screenRegistry) |

### `importadoraInterfaz/src/features/purchases/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchases.selectors.ts` | lecturas del estado de compras | usePurchases, usePurchaseDetail, usePurchaseForm y las acciones; leen state.purchases |

### `importadoraInterfaz/src/features/purchases/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchases.service.ts` | llamadas al backend de compras: lista, detalle, crear, recibir, anular y el Excel de la orden | api/client y api/config (PURCHASES), purchases.adapter (convierte), externals (proveedores) y global saveBlob; las usa purchases.thunks |

### `importadoraInterfaz/src/features/purchases/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchases.slice.test.ts` | el estado de compras: carga de la lista, descarte de respuestas viejas y cambios que actualizan la lista y el detalle | purchases.slice y purchases.thunks; se corre con npm test |
| `purchases.slice.ts` | órdenes de compra: lista de la bodega o global, detalle y guardados | purchases.thunks (lo llenan) y purchases.selectors (lo leen); clave 'purchases' en rootReducer (NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/purchases/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchases.thunks.ts` | cargas y cambios de compras: lista de la bodega, detalle, proveedores, crear, recibir, anular y bajar el Excel | purchases.service (llamadas) y purchases.slice (reacciona); las despachan usePurchases, usePurchaseDetail, usePurchaseForm, usePurchaseReceive y usePurchaseActions |

### `importadoraInterfaz/src/features/purchases/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchases.types.ts` | contratos de compras: la orden y sus renglones (lo que usa la app y lo que responde el backend), lo que se envía y el estado del slice | purchases.adapter, purchases.rules, purchases.service, purchases.slice, los hooks y los componentes de compras |

### `importadoraInterfaz/src/features/quotations/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreateQuotationDrawer.css` | CreateQuotationDrawer.css · drawer lateral derecho para crear cotizaciones | CreateQuotationDrawer.tsx |
| `CreateQuotationDrawer.tsx` | panel lateral «Nueva cotización»: cliente, productos con su cantidad y precio, notas y total | QuotationsScreen (lo abre), useQuotationForm (todo el estado y el envío) y las piezas de components/form |

### `importadoraInterfaz/src/features/quotations/components/detail/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `QuotationDetailPanel.css` | QuotationDetailPanel.css · detalle de una cotización dentro del panel derecho · solo usa tokens de styles/tokens.css | QuotationDetailPanel.tsx |
| `QuotationDetailPanel.tsx` | detalle de una cotización en el panel derecho: código, quién la hizo, cliente, WhatsApp, renglones y total, con el botón «Enviar por WhatsApp» | formRegistry (lo muestra), quotations.thunks (detalle y marcar como enviada), quotations.selectors, quotations.adapter (enlace de WhatsApp) y navigation (closeDrawerForm) |

### `importadoraInterfaz/src/features/quotations/components/form/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `QuotationCustomerPicker.tsx` | paso 1 de la cotización: buscar un cliente y elegirlo, o ver el elegido con opción de cambiarlo | CreateQuotationDrawer; datos y acciones de useQuotationForm |
| `QuotationItemsEditor.tsx` | paso 2 de la cotización: buscar productos, agregarlos y ajustar cantidad y precio de cada renglón | CreateQuotationDrawer; datos y acciones de useQuotationForm |

### `importadoraInterfaz/src/features/quotations/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `QuotationsTable.css` | QuotationsTable.css · estilos de la tabla de cotizaciones · solo usa tokens de styles/tokens.css | QuotationsTable.tsx |
| `QuotationsTable.tsx` | tabla de cotizaciones: código único, fecha, quién la hizo, cliente, WhatsApp, total, estado y la acción «Ver detalle» | QuotationsScreen (la usa), quotations.selectors (página visible y estado), navigation (openDrawerForm: el detalle se abre en el panel derecho) y RowActions |

### `importadoraInterfaz/src/features/quotations/components/toolbar/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `QuotationsToolbar.css` | QuotationsToolbar.css · barra de búsqueda (40%) y fechas de la tabla de cotizaciones · alineada al diseño de ProductsScreen | QuotationsToolbar.tsx |
| `QuotationsToolbar.tsx` | barra de la tabla de cotizaciones: búsqueda (40%), rango de fechas en línea y Nueva Cotización | quotations.slice (filtros), quotations.selectors, global SearchBar |

### `importadoraInterfaz/src/features/quotations/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.constants.ts` | estado inicial, tamaño de página y textos de los estados de una cotización | quotations.slice (initialState), quotations.selectors (página) y la tabla de cotizaciones |

### `importadoraInterfaz/src/features/quotations/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.adapter.test.ts` | pruebas de la conversión de cotizaciones, el filtro por texto y fechas y el enlace de WhatsApp | quotations.adapter; se corre con npm test |
| `quotations.adapter.ts` | convierte la cotización de la API a lo que usa la app, filtra por texto y fechas y arma el enlace de WhatsApp; es el único lugar que conoce los nombres del backend | quotations.service (convierte), quotations.selectors (filtra), QuotationDetailPanel (enlace de WhatsApp), quotations.api.types y quotations.types |
| `quotations.draft.test.ts` | opciones de cliente y producto, renglones y total del formulario de cotización | quotations.draft (suite de pruebas) |
| `quotations.draft.ts` | funciones puras del formulario de nueva cotización: opciones de cliente y producto, renglones y total | quotations.thunks (arma las opciones), useQuotationForm (renglones y total); con pruebas en quotations.draft.test.ts |

### `importadoraInterfaz/src/features/quotations/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useQuotationForm.ts` | estado y acciones del formulario «Nueva cotización»: elegir cliente, agregar productos, ajustar cantidades y precios, y crear | CreateQuotationDrawer y sus piezas; despacha quotations.thunks (nada de HTTP aquí) y usa quotations.draft |
| `useQuotationsLoader.ts` | pide las cotizaciones al backend al abrir la pantalla (y otra vez si se reinició el estado, por ejemplo al saltar de compañía) | QuotationsScreen (lo usa), quotations.thunks y quotations.selectors (estado de carga); auth (hay sesión) |

### `importadoraInterfaz/src/features/quotations/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | quotations/index · API pública de la feature cotizaciones (tabla, detalle en el panel y creación desde el carrito) | rootReducer (reducer), screenRegistry (QuotationsScreen), formRegistry (QuotationDetailPanel) y shop (createQuotation) |

### `importadoraInterfaz/src/features/quotations/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `QuotationsScreen.css` | QuotationsScreen.css · pantalla de cotizaciones: tarjeta con la barra de filtros y la tabla · solo usa tokens de styles/tokens.css | QuotationsScreen.tsx |
| `QuotationsScreen.tsx` | Tienda > Cotizaciones: búsqueda (40%), filtro por fechas, botón + Crear cotización con drawer lateral derecho | useQuotationsLoader (las pide), QuotationsToolbar, QuotationsTable, CreateQuotationDrawer y global Pagination; la monta MainContent (screenRegistry) |

### `importadoraInterfaz/src/features/quotations/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.selectors.ts` | lecturas del estado de cotizaciones: filtradas por texto y fechas y paginadas en pantalla | quotations.slice (estado), quotations.adapter (filtra), api/pagination (paginateList), QuotationsScreen y sus componentes |

### `importadoraInterfaz/src/features/quotations/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.service.test.ts` | pruebas de las llamadas de cotizaciones: lista con el WhatsApp del cliente, creación y envío | quotations.service; el cliente HTTP está simulado (no hay red) |
| `quotations.service.ts` | llamadas al backend de cotizaciones: GET /quotations (lista), GET /quotations/:id (con renglones), POST /quotations y PUT /quotations/:id, y GET /customers (para el WhatsApp de cada cliente) | api/client, api/config, api/params y api/pagination, quotations.adapter (convierte); las usan quotations.thunks y shop.quotation.thunks |

### `importadoraInterfaz/src/features/quotations/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.slice.ts` | estado de cotizaciones: lista, página, filtros (texto y fechas) y la cotización abierta en el panel | quotations.thunks (lo llenan), quotations.selectors (lecturas) y rootReducer (clave 'quotations'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/quotations/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.thunks.ts` | carga la lista de cotizaciones, el detalle de una, la marca como enviada, la crea y busca los clientes y productos del formulario | quotations.service (llamadas), shop (searchProducts) y auth (selectRequestContext); las despachan useQuotationsLoader, useQuotationForm y QuotationDetailPanel |

### `importadoraInterfaz/src/features/quotations/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.api.types.ts` | lo que responde y recibe la API en Go en cotizaciones (QuotationResponse) y los datos de contacto del cliente, con los nombres del backend | quotations.adapter (convierte a Quotation) y quotations.service |
| `quotations.types.ts` | modelos que usa la app en cotizaciones: cotización, renglones, filtros y estado del slice | quotations.adapter (los arma), quotations.service, el slice, los selectors y la pantalla de cotizaciones |

### `importadoraInterfaz/src/features/realtime/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.constants.ts` | tipos de evento conocidos y tiempos de reconexión | realtime.handlers (qué hacer con cada evento) y realtime.backoff (esperas) |

### `importadoraInterfaz/src/features/realtime/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.adapter.ts` | convierte el mensaje crudo del websocket en un RealtimeEvent (en inglés) | realtime.service (lo llama por cada mensaje); es el ÚNICO lugar que conoce la forma del mensaje del servidor |
| `realtime.backoff.ts` | cuánto esperar antes de reconectar (crece al doble hasta un tope) | realtime.service (lo usa en cada reintento) |
| `realtime.handlers.ts` | registro de qué hacer con cada tipo de evento (evento → acción de una feature) | realtime.thunks (lo llama por cada evento) y features/shop (applyStockUpdate); para un evento nuevo se agrega una línea |
| `realtime.url.ts` | arma la URL del websocket con el token de la sesión | realtime.thunks (al iniciar la conexión) |

### `importadoraInterfaz/src/features/realtime/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useRealtime.ts` | abre el tiempo real cuando hay sesión y lo cierra al cerrar sesión o salir | features/auth (¿hay sesión?), realtime.thunks; lo llama ErpLayout una sola vez |

### `importadoraInterfaz/src/features/realtime/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | realtime/index · API pública de la feature realtime (tiempo real por websocket) | ErpLayout (useRealtime), rootReducer (reducer); pendiente: contrato real de eventos del backend (ver realtime.constants) |

### `importadoraInterfaz/src/features/realtime/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.selectors.ts` | lectura del estado del tiempo real | cualquier componente que quiera mostrar si la conexión está abierta |

### `importadoraInterfaz/src/features/realtime/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.service.ts` | conexión websocket con reconexión automática (espera creciente) y cierre limpio | realtime.adapter (mensajes), realtime.backoff (esperas); la crea realtime.thunks al iniciar sesión |

### `importadoraInterfaz/src/features/realtime/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.slice.ts` | estado de la conexión en tiempo real: estado y hora del último evento | realtime.thunks (lo actualiza), realtime.selectors (lectura) |

### `importadoraInterfaz/src/features/realtime/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.thunks.ts` | acciones para abrir y cerrar la conexión en tiempo real | api/config (WS_URL), global/session.storage (token), realtime.service, realtime.handlers y realtime.slice; las llama useRealtime |

### `importadoraInterfaz/src/features/realtime/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.types.ts` | contratos del tiempo real: estado de la conexión, evento recibido y conexión | realtime.service, realtime.adapter, realtime.handlers, realtime.slice y realtime.thunks |

### `importadoraInterfaz/src/features/recyclebin/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useRecycleBin.ts` | hook de estado para gestionar elementos en la papelera y restaurarlos | react, @/api, @/global/helpers/feedback/toast, ../types/recyclebin.types |

### `importadoraInterfaz/src/features/recyclebin/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | exportación pública de la feature | ./types/recyclebin.types, ./services/recyclebin.service, ./hooks/useRecycleBin, ./screens/RecycleBinScreen |

### `importadoraInterfaz/src/features/recyclebin/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `RecycleBinScreen.css` | RecycleBinScreen.css | RecycleBinScreen.tsx |
| `RecycleBinScreen.tsx` | pantalla de Papelera de Reciclaje y Restauración de Registros | react, @/global/components/UI/atoms/Pill, @/global/helpers/formatting/format, @/global/components/UI/molecules/filters/SearchBar |

### `importadoraInterfaz/src/features/recyclebin/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `recyclebin.service.ts` | llamadas HTTP para la papelera de reciclaje y restauración | @/api, ../types/recyclebin.types |

### `importadoraInterfaz/src/features/recyclebin/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `recyclebin.types.ts` | tipos para el módulo de papelera de reciclaje y restauración | Módulos internos de la capa |

### `importadoraInterfaz/src/features/reports/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useGeneralReport.ts` | pide el reporte general al abrir la pantalla y entrega los datos, si está cargando y cómo volver a pedirlo | GeneralReportScreen (lo usa), reports.thunks, reports.selectors y auth (hay sesión) |

### `importadoraInterfaz/src/features/reports/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | reports/index · API pública de la feature reportes (tipos, service y la pantalla del reporte general) | screenRegistry (GeneralReportScreen) |

### `importadoraInterfaz/src/features/reports/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `DashboardScreen.css` | DashboardScreen.css · estructura limpia y sobria para el dashboard | DashboardScreen.tsx |
| `DashboardScreen.tsx` | pantalla principal de Dashboard / resumen ejecutivo de métricas clave (limpia, preparada para próximas integraciones) | react |
| `GeneralReportScreen.css` | GeneralReportScreen.css · reporte general con línea de diseño canónica, tokens e íconos monocromáticos de línea | GeneralReportScreen.tsx |
| `GeneralReportScreen.tsx` | reporte integral de operaciones de la tienda: toolbar canónico de búsqueda y filtro, KPIs estructurados y tablas de stock crítico y rotación | react, @/global/helpers/formatting/format, @/global/components/UI/atoms/Pill, @/global/components/UI/molecules/filters/SearchBar |

### `importadoraInterfaz/src/features/reports/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.selectors.ts` | lecturas del reporte general | useGeneralReport; leen state.reports |

### `importadoraInterfaz/src/features/reports/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.service.ts` | llamadas a los endpoints de reportes del backend: el reporte general (GET /reports/general) | api/client y api/config (REPORTS.GENERAL); la usa reports.thunks |

### `importadoraInterfaz/src/features/reports/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.slice.test.ts` | el reporte general: carga, error y descarte de respuestas viejas | reports.slice y reports.thunks; se corre con npm test |
| `reports.slice.ts` | estado del reporte general: los datos, si está cargando y el último error | reports.thunks (lo llenan), reports.selectors (lecturas), auth (al cerrar sesión se vacía) y rootReducer (clave 'reports'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/reports/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.thunks.ts` | carga del reporte general | reports.service (llamada) y reports.slice (reacciona); la despacha useGeneralReport |

### `importadoraInterfaz/src/features/reports/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.types.ts` | tipos de datos para reportes generales, ventas del día, traslados y rotación | Módulos internos de la capa |

### `importadoraInterfaz/src/features/returns/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreateReturnDrawer.css` | CreateReturnDrawer.css · panel lateral de nueva devolución: fondo, cabecera, pasos del formulario, tarjetas de opción y pie | CreateReturnDrawer.tsx |
| `CreateReturnDrawer.tsx` | panel lateral «Nueva devolución / garantía»: venta, renglones, causal, resolución y motivo | ReturnsScreen (lo abre) y useCreateReturnForm (todo el estado y el envío); las piezas de cada paso viven en este mismo folder |
| `ReturnChoiceCards.tsx` | grupo de tarjetas con radio para elegir una opción (se usa para la causal y para la resolución de la devolución) | CreateReturnDrawer; las opciones y el valor vienen de useCreateReturnForm |
| `ReturnItemsPicker.tsx` | paso 2 del formulario de devolución: marcar los renglones de la venta que se devuelven y su cantidad (de 1 a lo vendido) | CreateReturnDrawer; estado de useCreateReturnForm y tipos de returns.helpers |
| `ReturnRow.tsx` | una fila de la tabla de devoluciones, con la insignia de resolución, el estado y las acciones aprobar o rechazar heredadas de RowActions | ReturnsTable, RowActions; formatea con global/helpers/formatting/format y etiquetas de returns.constants |
| `ReturnSalePicker.tsx` | paso 1 del formulario de devolución: buscar una venta y elegirla, o ver la elegida con opción de cambiarla | CreateReturnDrawer; los datos y acciones vienen de useCreateReturnForm |
| `ReturnsKpis.tsx` | las cuatro tarjetas de arriba de devoluciones (casos, cambios, saldos a favor y pendientes) | ReturnsScreen; recibe los conteos de returns.selectors |
| `ReturnsTable.tsx` | tabla paginada de devoluciones con sus estados de carga y vacío | ReturnsScreen; usa ReturnRow, Pagination y usePagedList (global) |
| `ReturnsToolbar.tsx` | barra de la tabla de devoluciones: búsqueda, filtro de bodega, filtro de estado y botón para crear | ReturnsScreen; los valores y cambios vienen de useReturnsList |

### `importadoraInterfaz/src/features/returns/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `returns.constants.ts` | estado inicial de la vista de devoluciones y textos de las etiquetas | returns.slice (estado inicial) y ReturnRow (etiquetas de resolución y estado) |

### `importadoraInterfaz/src/features/returns/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `returns.helpers.test.ts` | filtros, conteos y armado de renglones a devolver | returns.helpers (suite de pruebas) |
| `returns.helpers.ts` | funciones puras de devoluciones: filtro de la tabla, conteos para los KPIs y armado del pedido de creación | returns.selectors (filtra y cuenta) y useCreateReturnForm (arma los renglones a devolver); con pruebas en returns.helpers.test.ts |

### `importadoraInterfaz/src/features/returns/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCreateReturnForm.ts` | estado y acciones del formulario «Nueva devolución»: buscar la venta, elegir renglones y cantidades, causal, resolución y enviar | CreateReturnDrawer y sus piezas; despacha returns.thunks (nada de HTTP aquí) y usa returns.helpers |
| `useReturnsList.ts` | pide las devoluciones al montarse y al cambiar la bodega, y expone lo que la pantalla necesita (lista, KPIs, filtros y acciones) | ReturnsScreen; despacha returns.thunks y lee returns.selectors y returns.slice |

### `importadoraInterfaz/src/features/returns/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | returns · devoluciones y garantías: lo que otras partes de la app pueden usar (la pantalla, el reducer, los selectors y los tipos) | ./types/returns.types, ./slices/returns.slice, ./selectors/returns.selectors, ./screens/ReturnsScreen |

### `importadoraInterfaz/src/features/returns/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ReturnsScreen.css` | ReturnsScreen.css — Devoluciones y Garantías con diseño unificado alineado a las demás tablas | ReturnsScreen.tsx |
| `ReturnsScreen.tsx` | historial de devoluciones y garantías: KPIs, una tarjeta con barra de filtros y tabla, y el drawer para crear | useReturnsList (datos y filtros) y los componentes de la feature; no habla con el API |

### `importadoraInterfaz/src/features/returns/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `returns.selectors.ts` | lecturas derivadas del estado de devoluciones (tabla filtrada y conteos de los KPIs) | ReturnsScreen y sus componentes; leen state.returns |

### `importadoraInterfaz/src/features/returns/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `returns.service.ts` | llamadas al backend de devoluciones (/returns) y búsqueda de la venta a la que se asocian (/sales) | api/client y api/config (rutas en SALES_ENDPOINTS.RETURNS y SALES); las usan returns.thunks |

### `importadoraInterfaz/src/features/returns/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `returns.slice.ts` | estado de la vista de devoluciones (clave 'returns'): lista, carga, error y filtros de bodega, estado y búsqueda | returns.thunks (la llenan), returns.selectors (lecturas) y rootReducer (clave 'returns'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/returns/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `returns.thunks.test.ts` | carga, aprobación y creación de devoluciones contra un service simulado | returns.thunks (suite de pruebas) |
| `returns.thunks.ts` | carga la lista de devoluciones, las crea, las aprueba o rechaza, y busca la venta a la que se asocian | returns.service (llamadas) y returns.slice (reacciona); las despachan useReturnsList y useCreateReturnForm |

### `importadoraInterfaz/src/features/returns/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `returns.types.ts` | contratos de devoluciones y garantías: lo que manda el backend, lo que se envía y el estado de la vista (clave 'returns') | returns.service (HTTP), returns.slice (estado), returns.helpers (filtros y conteos) y los componentes de la pantalla |

### `importadoraInterfaz/src/features/screensaver/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `IdleScreensaver.css` | IdleScreensaver.css · protector de pantalla: capa a pantalla completa sobre todo, con el lienzo estirado y un aviso discreto abajo · solo usa tokens de styles/tokens.css | IdleScreensaver.tsx |
| `IdleScreensaver.test.tsx` | pruebas de la pantalla completa: aparece tras el tiempo de espera y solo se cierra al soltar el clic; ni el teclado, ni mover el mouse, ni mantener el clic apretado la cierran | IdleScreensaver (y useIdle por dentro); usa un reloj falso; se corre con npm test |
| `IdleScreensaver.tsx` | pantalla completa con la arena que forma el logo; aparece tras un rato sin actividad (SCREENSAVER_TIMING.IDLE_MS) y la arena reacciona al mouse y solo se va con un clic o una tecla | useIdle (cuándo mostrarla), useParticleAnimation (dibujo) y screensaver.constants (textos); la monta ErpLayout |

### `importadoraInterfaz/src/features/screensaver/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `screensaver.constants.ts` | tiempos, tamaños y textos del protector de pantalla (arena que forma el logo de Importadora Premium) | useIdle (espera), screensaver.sampling y screensaver.physics (puntos y movimiento), IdleScreensaver (textos) |

### `importadoraInterfaz/src/features/screensaver/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `screensaver.helpers.test.ts` | pruebas de la lógica del protector de pantalla: elegir puntos de la imagen, fases del ciclo y movimiento de la arena | screensaver.sampling y screensaver.physics; se corre con npm test |
| `screensaver.image.ts` | carga la imagen del logo y la convierte en puntos objetivo (con soporte dinámico de cambio de logo) | ../constants/screensaver.constants, ../types/screensaver.types, ./screensaver.sampling |
| `screensaver.input.test.ts` | Pruebas unitarias de screensaver.input | screensaver.input (suite de pruebas) |
| `screensaver.input.ts` | entrada del usuario sobre el protector: el cursor que remueve la arena y el clic (o dedo) sostenido que gira la imagen | useParticleAnimation (crea el seguimiento al empezar y lo suelta al terminar), screensaver.view (giro) y screensaver.constants (velocidad del cursor y del giro) |
| `screensaver.physics.ts` | movimiento de la arena: se reparte por la pantalla, se junta en el logo, tiembla un poco y se aparta del cursor | useParticleAnimation (llama a stepField en cada fotograma), screensaver.constants (fuerzas y tiempos) y screensaver.types |
| `screensaver.sampling.ts` | convierte los píxeles de la imagen del logo en puntos objetivo (solo lo claro cuenta como tinta) | useParticleAnimation (le pasa los píxeles leídos del canvas), screensaver.constants (umbral y tope) y screensaver.types |
| `screensaver.view.test.ts` | pruebas del giro 3D de la arena (sin giro queda igual, el giro de 360° vuelve al inicio) | screensaver.view; se corre con npm test |
| `screensaver.view.ts` | giro de la arena en 3D (horizontal y vertical) y su proyección al lienzo; matemática pura para poder probarla | useParticleAnimation (gira cada punto al dibujar) y screensaver.constants (SCREENSAVER_VIEW) |

### `importadoraInterfaz/src/features/screensaver/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useIdle.test.ts` | pruebas de la espera de inactividad del protector de pantalla y de cómo se despierta (solo al soltar el clic; el teclado no la despierta) | useIdle; usa un reloj falso para no esperar de verdad; se corre con npm test |
| `useIdle.ts` | avisa cuando el usuario lleva un tiempo sin tocar nada y cuándo vuelve | IdleScreensaver (lo usa), screensaver.constants (tiempos y eventos); el cierre de sesión por inactividad es aparte (auth/useSessionActivity) |
| `useParticleAnimation.ts` | dibuja en un canvas la arena que forma el logo mientras el protector está activo | IdleScreensaver (le pasa el canvas), screensaver.image (puntos del logo), screensaver.physics (movimiento) y screensaver.constants (dibujo) |

### `importadoraInterfaz/src/features/screensaver/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | screensaver/index · API pública de la feature screensaver (protector de pantalla tras un rato sin actividad) | ErpLayout (monta IdleScreensaver) |

### `importadoraInterfaz/src/features/screensaver/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `screensaver.types.ts` | formas de datos del protector de pantalla (puntos objetivo y estado de la arena) | screensaver.sampling (crea los objetivos), screensaver.physics (crea y mueve la arena), useParticleAnimation (los usa) |

### `importadoraInterfaz/src/features/settings/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `settings.constants.ts` | estado inicial de la configuración, campos de la ficha de la empresa y reglas de la clave y la imagen | settings.slice (estado inicial), CompanyTab (campos) y settings.helpers (límites) |

### `importadoraInterfaz/src/features/settings/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `settings.helpers.test.ts` | validación de la clave nueva y del archivo del protector | settings.helpers (suite de pruebas) |
| `settings.helpers.ts` | validaciones puras de la cuenta y de la imagen del protector | useSecurityForm y useScreensaverSettings; con pruebas en settings.helpers.test.ts |

### `importadoraInterfaz/src/features/settings/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCompanyForm.ts` | carga la ficha de la empresa y maneja el modo edición (borrador, cancelar y guardar) | CompanyTab; despacha settings.thunks y lee settings.slice |
| `useScreensaverSettings.ts` | imagen del protector de pantalla: carga la guardada, optimiza una nueva elegida y la guarda o restaura la original | ScreensaverTab; despacha settings.thunks, valida con settings.helpers y optimiza con global/helpers/images/imageOptimizer |
| `useSecurityForm.ts` | formulario de la cuenta del usuario en sesión: nombre, correo y cambio de clave opcional | SecurityTab; despacha saveAccountThunk, valida con settings.helpers y lee la sesión (auth) |

### `importadoraInterfaz/src/features/settings/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | settings/index · API pública del módulo de configuración (pantalla, reducer y tipos) | app/componentApp/contentMain/screenRegistry y rootReducer |

### `importadoraInterfaz/src/features/settings/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CompanyTab.css` | CompanyTab.css | CompanyTab.tsx |
| `CompanyTab.tsx` | ficha de la empresa (datos que usan facturas, cotizaciones y pedidos): se ve y se edita | SettingsScreen (pestaña «empresa») y useCompanyForm (datos, edición y guardado); no habla con el API |
| `ScreensaverTab.css` | ScreensaverTab.css · pestaña del protector de pantalla: dos tarjetas (imagen activa y carga de una nueva), zona de arrastre y botones | ScreensaverTab.tsx |
| `ScreensaverTab.tsx` | imagen central del protector de pantalla: vista de la activa y carga de una nueva (se comprime en el navegador) | SettingsScreen (pestaña «protector») y useScreensaverSettings (estado, validación y guardado); no habla con el API |
| `SecurityTab.css` | SecurityTab.css | SecurityTab.tsx |
| `SecurityTab.tsx` | perfil del usuario en sesión y edición de su nombre, correo y clave de acceso | SettingsScreen (pestaña «seguridad») y useSecurityForm (estado y guardado); no habla con el API |
| `SettingsScreen.css` | SettingsScreen.css · estilos de la pantalla de configuración · tokens de styles/tokens.css | SettingsScreen.tsx |
| `SettingsScreen.tsx` | pantalla principal de administración y configuración del ERP | react, @/global/hooks/store/useRedux, ./ScreensaverTab, ./CompanyTab |
| `SitesScreen.tsx` | Configuración > Sedes: el administrador ve las sedes de su compañía; el superadmin ve la lista de compañías y, de cada una, sus sedes | usePermissions (nivel del usuario), features/warehouses (WarehousesScreen) y features/companies (CompaniesScreen); la monta MainContent (screenRegistry) |

### `importadoraInterfaz/src/features/settings/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `settings.selectors.ts` | lecturas simples del estado de configuración | los hooks useCompanyForm y useScreensaverSettings; leen state.settings |

### `importadoraInterfaz/src/features/settings/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `settings.service.ts` | llamadas al backend de configuración: la empresa (/companies/:id), la cuenta del usuario (/employees/:id) y el protector (/settings/screensaver) | api/client y api/config; las usan settings.thunks |

### `importadoraInterfaz/src/features/settings/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `settings.slice.ts` | estado de la configuración (clave 'settings'): ficha de la empresa e imagen del protector con sus banderas de carga y guardado | settings.thunks (la llenan), settings.selectors (lecturas) y rootReducer (clave 'settings'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/settings/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `settings.thunks.ts` | carga y guarda la ficha de la empresa, la cuenta del usuario en sesión y la imagen del protector de pantalla | settings.service (llamadas), auth (selectRequestContext y selectCurrentUser) y settings.slice (reacciona); las despachan useCompanyForm, useSecurityForm y useScreensaverSettings |

### `importadoraInterfaz/src/features/settings/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `settings.types.ts` | contratos de la configuración: ficha de la empresa, cuenta del usuario, protector de pantalla y el estado de la vista (clave 'settings') | settings.service (HTTP), settings.slice (estado), settings.helpers (validaciones) y las pestañas de ajustes |

### `importadoraInterfaz/src/features/shop/components/brand/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductBrand.css` | ProductBrand.css · estilos de la marca del producto (logo o nombre) en la card y en el carrito · solo usa tokens de styles/tokens.css | ProductBrand.tsx |
| `ProductBrand.tsx` | marca del producto: su logo (si llegó la imagen y carga) o, si no, el nombre en cursiva y negrita | ProductCardPricing (card del catálogo) y ShopCartItem (línea del carrito); la imagen sale de Product.brandImage |

### `importadoraInterfaz/src/features/shop/components/cart/customer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCartCustomer.css` | ShopCartCustomer.css · estilos de la franja del cliente de la venta en el carrito · solo usa tokens de styles/tokens.css | ShopCartCustomer.tsx |
| `ShopCartCustomer.tsx` | franja del carrito que muestra a qué cliente se le hace la venta y permite quitarlo | shop.selectors (cliente de la venta y si hay un cambio en curso) y shop.cart.customer.thunks (quitar); la pinta ShopCartDrawer |

### `importadoraInterfaz/src/features/shop/components/cart/search/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCartSearch.css` | ShopCartSearch.css · estilos del buscador del carrito (caja blanca con lupa de la maqueta) · solo usa tokens de styles/tokens.css | ShopCartSearch.tsx |
| `ShopCartSearch.tsx` | buscador del carrito: filtra las líneas por código, marca, modelo, descripción o categoría | ShopCartDrawer (le pasa el texto y recibe lo que se escribe); la lupa es de components/icons/ShopIcons |

### `importadoraInterfaz/src/features/shop/components/cart/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCartDrawer.css` | ShopCartDrawer.css · estilos del contenedor y la lista del carrito (el encabezado está en DrawerHeader.css) · solo usa tokens de styles/tokens.css | ShopCartDrawer.tsx |
| `ShopCartDrawer.tsx` | carrito POS (diseño de la maqueta): cliente de la venta, buscador, lista de cards (o vacío) y pie con subtotal, IVA y total | shop.cart.slice (vía shop.selectors); las partes son ShopCartCustomer, ShopCartSearch, ShopCartItem, ShopCartEmpty y ShopCartFooter; lo muestra DrawerRight en la tienda |
| `ShopCartEmpty.css` | ShopCartEmpty.css · estilos del carrito vacío · solo usa tokens de styles/tokens.css | ShopCartEmpty.tsx |
| `ShopCartEmpty.tsx` | mensaje del carrito vacío | ShopCartDrawer (se muestra cuando no hay items) |
| `ShopCartFooter.css` | ShopCartFooter.css · estilos del pie del carrito (totales de la maqueta y botón amarillo) · solo usa tokens de styles/tokens.css | ShopCartFooter.tsx |
| `ShopCartFooter.tsx` | pie del carrito (como los totales de la maqueta): subtotal, IVA, total, finalizar compra y crear cotización (vaciar y compartir están en el menú ☰ del encabezado del carrito) | navigation (abre el panel de finalizar compra), usePermissions (permiso de ventas), shop.selectors (total) y shop.helpers (separa el IVA) |
| `ShopCartItem.css` | ShopCartItem.css · estilos de cada línea del carrito (card de la maqueta: imagen, título, marca, cantidad, precios y quitar) · solo usa tokens de styles/tokens.css | ShopCartItem.tsx |
| `ShopCartItem.tsx` | una línea del carrito (card de la maqueta): imagen, categoría y título, marca, referencia, cantidad, precios y quitar | shop.cart.thunks (cambiar cantidad y quitar en el backend), shop.helpers (título y «marca - modelo»), brand/ProductBrand (marca), useCartQuantity (cantidad editable); la pinta ShopCartDrawer por cada item |

### `importadoraInterfaz/src/features/shop/components/catalog/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCatalogEmpty.css` | ShopCatalogEmpty.css · estilos del estado vacío del catálogo · solo usa tokens de styles/tokens.css | ShopCatalogEmpty.tsx |
| `ShopCatalogEmpty.tsx` | estado vacío cuando ningún repuesto coincide con los filtros | ShopCatalogScreen (le pasa la bodega, si hay filtros y la acción de restablecer) |
| `ShopCatalogFilters.css` | ShopCatalogFilters.css · estilos del resumen de resultados del catálogo · solo usa tokens de styles/tokens.css | ShopCatalogFilters.tsx |
| `ShopCatalogFilters.tsx` | resumen de resultados ("Mostrando X de Y repuestos") | los conteos que llegan por props desde ShopCatalogScreen |
| `ShopCatalogToolbar.css` | ShopCatalogToolbar.css · estilos de la fila de herramientas del catálogo (buscador, chips de filtro, checkbox de stock y limpiar) · solo usa tokens de styles/tokens.css | ShopCatalogToolbar.tsx |
| `ShopCatalogToolbar.tsx` | fila de herramientas: búsqueda, filtros de categoría y marca como chips, checkbox «con stock» y limpiar filtros | react, @/global/hooks/store/useRedux, @/global/components/UI/molecules/filters/SearchBar, @/global/components/UI/molecules/chips/ChipSelect |

### `importadoraInterfaz/src/features/shop/components/expense/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `RegisterExpenseDrawer.css` | RegisterExpenseDrawer.css | RegisterExpenseDrawer.tsx |
| `RegisterExpenseDrawer.tsx` | panel derecho para registrar gastos operativos desde la Tienda / Caja | react, @/global/hooks/store/useRedux, @/features/navigation, @/global/helpers/feedback/toast |

### `importadoraInterfaz/src/features/shop/components/icons/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopIcons.tsx` | íconos de la tienda sin color propio (lupa del buscador del carrito y papelera de quitar una línea) | ShopCartSearch (lupa) y ShopCartItem (papelera); los íconos de la card (etiqueta y ubicación) siguen en productCard/parts/ProductCardIcons |

### `importadoraInterfaz/src/features/shop/components/productCard/actions/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductCardActions.css` | ProductCardActions.css · estilos del campo de cantidad y del botón de ordenar de la tarjeta · solo usa tokens de styles/tokens.css | ProductCardActions.tsx |
| `ProductCardActions.test.tsx` | pruebas de la fila de acciones de la carta: el ícono de bajo stock va junto al contador y el agotado solo cambia el botón | ProductCardActions (y ProductCardStock por dentro); se corre con npm test |
| `ProductCardActions.tsx` | cantidad y botón de ordenar de la tarjeta (Ordenar, Ordenado o Agotado) | ProductCard (cantidad y acciones, que salen del hook useQuantityInput) y ProductCardStock (ícono de bajo stock junto al contador); no guarda estado, todo llega por props |

### `importadoraInterfaz/src/features/shop/components/productCard/icons/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductCardIcons.tsx` | iconos de la tarjeta (favoritos, vista rápida, tarifas y ubicación), sin color propio | ProductCardMedia (favoritos y vista rápida), ProductCardTierMenu (tarifas), ProductCardInfo (ubicación) |

### `importadoraInterfaz/src/features/shop/components/productCard/info/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductCardInfo.css` | ProductCardInfo.css · estilos del título con su detalle, la línea de marca y modelo y la referencia de la tarjeta · solo usa tokens de styles/tokens.css | ProductCardInfo.tsx |
| `ProductCardInfo.tsx` | tres filas del repuesto: título con su detalle, línea «MARCA · MODELO» (con la ubicación en estantería a la derecha) y la referencia | ProductCard (le pasa los datos ya armados con shop.helpers); global toast (aviso al copiar la referencia) |

### `importadoraInterfaz/src/features/shop/components/productCard/media/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductCardMedia.css` | ProductCardMedia.css · estilos de la imagen y de los iconos flotantes de la tarjeta · solo usa tokens de styles/tokens.css | ProductCardMedia.tsx |
| `ProductCardMedia.tsx` | imagen del producto con el menú de tarifas flotante en la esquina superior derecha e indicadores de stock por bodega | ProductCard (le pasa los datos); ProductCardTierMenu (menú de tarifas); ProductCardWarehouseStock; getCategoryEmoji de shop.helpers |

### `importadoraInterfaz/src/features/shop/components/productCard/pricing/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductCardPricing.css` | ProductCardPricing.css · estilos de la fila del precio y la marca de la tarjeta · solo usa tokens de styles/tokens.css | ProductCardPricing.tsx |
| `ProductCardPricing.tsx` | fila del precio del nivel activo (izquierda) y la marca del producto (derecha) | ProductCard (nivel del producto); formato de pesos de global/helpers/format; ProductBrand (logo o nombre de la marca) |

### `importadoraInterfaz/src/features/shop/components/productCard/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductCard.css` | ProductCard.css · contenedor de la tarjeta de producto (diseño de la maqueta) · solo usa tokens de styles/tokens.css | ProductCard.tsx |
| `ProductCard.tsx` | tarjeta de producto con el diseño de la maqueta (IP): imagen con tarifas, precio y marca, categoría y título, referencia y cantidad | ShopCatalogScreen (le pasa los datos y recibe el agregar al carrito); usa shop.helpers y las partes ProductCard* (parts/ Media, Info, TierMenu) y brand/ProductBrand |

### `importadoraInterfaz/src/features/shop/components/productCard/stock/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductCardStock.css` | ProductCardStock.css · estilos de la ícono de advertencia de bajo stock de la tarjeta · solo usa tokens de styles/tokens.css | ProductCardStock.tsx |
| `ProductCardStock.test.tsx` | pruebas del ícono de advertencia de bajo stock: dice cuánto queda en su nombre accesible y en el tooltip | ProductCardStock; se corre con npm test |
| `ProductCardStock.tsx` | ícono de advertencia de bajo stock de la tarjeta (triángulo amarillo); lo que queda se lee al pasar el cursor y en su nombre accesible | ProductCardActions (lo pinta junto al contador de cantidad, a la altura del botón de ordenar, solo cuando el estado es «bajo»; el estado sale de shop.helpers, getStockStatus) |
| `ProductCardWarehouseStock.css` | ProductCardWarehouseStock.css · indicador consolidado único de stock sobre la tarjeta de producto · solo usa tokens de styles/tokens.css | ProductCardWarehouseStock.tsx |
| `ProductCardWarehouseStock.tsx` | indicador consolidado de stock total en red sobre la tarjeta de producto | ProductCardMedia; lee bodegas de warehouses.selectors; al hacer clic abre el drawer de traslados con el desglose por bodega |

### `importadoraInterfaz/src/features/shop/components/productCard/tier/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductCardTierMenu.css` | ProductCardTierMenu.css · estilos del icono de tarifas, su insignia de nivel y el menú desplegable · solo usa tokens de styles/tokens.css | ProductCardTierMenu.tsx |
| `ProductCardTierMenu.test.tsx` | pruebas del menú de tarifas de la carta: abre aunque el producto tenga una sola tarifa y solo deja elegir las que tienen precio | ProductCardTierMenu; simula usePermissions para no montar el store; se corre con npm test |
| `ProductCardTierMenu.tsx` | icono de etiqueta junto al precio; abre el menú de las 4 tarifas (P0 · P3) con su precio y muestra el nivel activo | ProductCardPricing (nivel y cambio de nivel); global useClickOutside (cierra con clic fuera o Escape); PRICE_LEVEL_OPTIONS de shop.constants |

### `importadoraInterfaz/src/features/shop/components/results/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCatalogStatus.css` | ShopCatalogStatus.css · estilos del aviso de carga y de error del catálogo · solo usa tokens de styles/tokens.css | ShopCatalogStatus.tsx |
| `ShopCatalogStatus.tsx` | aviso del catálogo mientras carga por primera vez o cuando el backend falla (con botón para reintentar) | ShopCatalogScreen (le pasa el estado y la acción de reintentar); el mensaje de error viene de shop.products.slice |

### `importadoraInterfaz/src/features/shop/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `legacyProductImages.ts` | imagen principal de cada producto en el bucket del sistema anterior (código -> ruta dentro del bucket) | shop.adapter (si el producto no trae imagen de la API usa esta) y getStorageUrl (le pone la dirección del bucket) |
| `shop.constants.ts` | niveles de precio, filtros y estado inicial | shop.slice (initialState), ShopCatalogScreen |
| `shop.expense.constants.ts` | tipos de gasto operativo que se pueden registrar desde la tienda o la caja | RegisterExpenseDrawer (opciones del selector) |

### `importadoraInterfaz/src/features/shop/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.adapter.test.ts` | pruebas de la conversión de productos de la API en Go (GET /products y /products/search + GET /stock) al Product de la app | shop.adapter; se corre con npm test |
| `shop.adapter.ts` | convierte los productos de la API en Go (ProductDto + filas de stock) al Product que usa la app | shop.products.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres de campos del backend en productos |
| `shop.helpers.test.ts` | pruebas de clampQuantity (la cantidad siempre queda entre 1 y el stock) | shop.helpers; se corre con npm test |
| `shop.helpers.ts` | funciones puras de la tienda (stock, precio por nivel y emoji de categoría) | ProductCard (los usa para pintar) y shop.selectors |

### `importadoraInterfaz/src/features/shop/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCartMenuActions.ts` | opciones del menú hamburguesa del carrito (en el encabezado del panel derecho): vaciar el carrito y compartirlo | DrawerRight (las muestra en DrawerHeader), shop.cart.update.thunks (vaciar), shop.selectors (renglones y total), shop.helpers (texto para compartir) y global toast |
| `useCartQuantity.ts` | cantidad editable de una línea del carrito: se escribe a mano o flechas y se confirma SOLO al presionar Enter o al salir del campo | ShopCartItem (la usa); updateCartQuantityThunk (shop.cart.update.thunks) cambia la cantidad en el backend |
| `useCartSync.ts` | lee el carrito del backend al entrar (y al cambiar de bodega) y lo limpia de la memoria al salir de la sesión | ErpLayout (lo monta mientras haya sesión), shop.cart.thunks (fetchCartThunk), shop.cart.slice (resetCart), navigation (bodega activa) y warehouses (estado de carga) |
| `useProductsLoader.ts` | pide los productos al backend cuando cambia algo que los afecta: filtros, texto (con espera), página o bodega | ShopCatalogScreen (lo usa al montarse); despacha shop.products.thunks y lee shop.products.selectors, shop.slice (filtros), navigation (bodega) y warehouses (estado de carga) |
| `useQuantityInput.test.ts` | pruebas del contador de cantidad: botones, texto escrito, flechas del teclado y límite de stock | useQuantityInput; se corre con npm test |
| `useQuantityInput.ts` | estado del contador de cantidad de la tarjeta: botones · y +, número escrito a mano y flechas del teclado | ProductCard (lo usa y pasa los valores a ProductCardActions); clampQuantity de shop.helpers pone el límite (1 hasta el stock) |

### `importadoraInterfaz/src/features/shop/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | shop/index · API pública de la feature shop | MainContent, DrawerRight, rootReducer |

### `importadoraInterfaz/src/features/shop/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCatalogScreen.css` | ShopCatalogScreen.css · estilos del catálogo · solo usa tokens de styles/tokens.css | ShopCatalogScreen.tsx |
| `ShopCatalogScreen.tsx` | catálogo de repuestos: arma la barra, los filtros, el grid de tarjetas, el paginador o el aviso de carga, error o estado vacío | shop.slice (filtros y carrito), shop.products.slice/selectors (productos del backend), catalogs (useLoadCatalogs), useProductsLoader y las partes ShopCatalog*; la monta MainContent |

### `importadoraInterfaz/src/features/shop/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.products.selectors.test.ts` | pruebas de los productos visibles (filtros en pantalla solo en modo búsqueda) y del resumen "X de Y" | shop.products.selectors; la sesión está simulada para no cargar toda la feature auth |
| `shop.products.selectors.ts` | lecturas de la lista de productos: estado de carga, paginación, productos visibles y resumen de resultados | ShopCatalogScreen, ShopCatalogPagination y useProductsLoader; leen state.products, los filtros de state.shop, la bodega de state.ui y los catálogos (marcas y categorías) |
| `shop.selectors.test.ts` | pruebas de las lecturas del carrito (líneas con nivel, cantidades por producto, totales) y de "hay filtros activos" | shop.selectors; no usa red ni store real |
| `shop.selectors.ts` | lecturas derivadas del estado de la tienda (filtrado, cantidades y totales del carrito) | ShopCatalogScreen y ShopCartDrawer; leen state.shop (filtros, niveles) y state.cart (líneas del carrito del backend); la lista de productos se lee en shop.products.selectors |

### `importadoraInterfaz/src/features/shop/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.cart.service.test.ts` | pruebas de las llamadas del carrito: ruta, método y cuerpo de cada una | shop.cart.service; el cliente HTTP está simulado (no hay red) |
| `shop.cart.service.ts` | llamadas al backend del carrito: GET /carts/active (leer), POST /carts (crear/alterno), POST /carts/:id/items (agregar), PUT y DELETE de un renglón y DELETE /carts/:id (vaciar) | api/client y api/config, shop.adapter (toCartSnapshot); las usa shop.cart.thunks |
| `shop.products.service.test.ts` | pruebas de las llamadas de productos: ruta, parámetros (solo con los filtros aplicados), unión con el stock y conversión | shop.products.service y shop.stock.service; el cliente HTTP está simulado (no hay red) |
| `shop.products.service.ts` | llamadas al backend de productos: GET /products (catálogo con filtros y páginas) y GET /products/search (texto) | api/client, api/config, api/params y api/pagination, shop.stock.service (stock de la bodega) y shop.adapter (convierte a Product); las usa shop.products.thunks |
| `shop.sales.service.test.ts` | pruebas unitarias de la creación y la anulación de pedidos | shop.sales.service; el cliente HTTP está simulado (no hay red) |
| `shop.sales.service.ts` | llamadas al backend para crear un pedido (POST /sales) y anularlo (POST /sales/:id/cancel) | api/client y api/config (SALES), RequestContext; los usan shop (crear) y orders.thunks (anular) |
| `shop.stock.service.ts` | llamada al backend del stock: GET /stock (filas por producto, bodega y ubicación) | api/client, api/config y api/params, shop.products.service (une el stock a los productos) |

### `importadoraInterfaz/src/features/shop/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.cart.slice.test.ts` | pruebas del estado del carrito: lectura, bandera de cambio en curso y reinicio al cerrar sesión | shop.cart.slice; se simulan las acciones de los thunks (no hay red) |
| `shop.cart.slice.ts` | carrito que viene del backend: líneas, estado de lectura y bandera de "hay un cambio en curso" | shop.cart.thunks (lo llenan), shop.selectors (lecturas: líneas, cantidades, totales) y rootReducer (clave 'cart'; NO se guarda en el navegador) |
| `shop.products.slice.test.ts` | pruebas de la lista de productos: carga, respuestas viejas descartadas, vuelta a la página 1 y stock en tiempo real | shop.products.slice; se simulan las acciones de la carga (no hay red) |
| `shop.products.slice.ts` | lista de productos del catálogo que llega del backend: items, estado de carga, paginación y modo (lista o búsqueda) | shop.products.thunks (la llenan), shop.products.selectors (lecturas), shop.slice (al cambiar un filtro vuelve a la página 1) y rootReducer (clave 'products'; NO se guarda en el navegador) |
| `shop.slice.test.ts` | pruebas del estado guardado de la tienda: filtros por id, uuid y niveles del carrito, y limpieza al cerrar sesión | shop.slice; se simulan las acciones (no hay red) |
| `shop.slice.ts` | estado de tienda que se guarda en el navegador: filtros, uuid, niveles y cliente del carrito, y selección de producto | ShopCatalogScreen, ProductCard, ShopCartDrawer |

### `importadoraInterfaz/src/features/shop/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.cart.customer.thunks.test.ts` | pruebas de elegir o quitar el cliente de la venta: se guarda en la app, toma su nivel de precio y no toca el carrito del servidor | shop.cart.customer.thunks, shop.slice y shop.cart.slice; la sesión y los services están simulados (no hay red) |
| `shop.cart.customer.thunks.ts` | elegir (o quitar) el cliente de la venta | shop.cart.thunks (avisos, tipos y regla de un cambio a la vez), shop.slice (guarda el cliente) y shop.cart.slice (lo trata como un cambio más) |
| `shop.cart.thunks.test.ts` | pruebas del carrito contra el backend: leer, agregar (renglón nuevo o existente), cambiar cantidad, quitar, vaciar y errores | shop.cart.thunks, shop.cart.slice y shop.slice; los services, la sesión y las alertas están simulados (no hay red) |
| `shop.cart.thunks.ts` | acciones del carrito contra el backend: leer y agregar (cambiar cantidad, quitar y vaciar están en shop.cart.update.thunks) | shop.cart.service y shop.stock.service (llamadas), auth (selectRequestContext), shop.slice (niveles y uuid), navigation (bodega activa), shop.products.thunks (recargar stock) y shop.cart.slice |
| `shop.cart.update.thunks.ts` | cambios sobre lo que ya está en el carrito: cambiar cantidad, quitar un renglón y vaciar todo | shop.cart.service (llamadas), shop.cart.thunks (avisos, tipos, productos conocidos y la regla de un cambio a la vez), shop.products.thunks (recargar stock) y shop.cart.slice (reacciona) |
| `shop.products.thunks.test.ts` | pruebas de la carga de productos: modo lista con filtros y página, modo búsqueda, errores y sin sesión | shop.products.thunks, shop.slice y shop.products.slice; el service y la sesión están simulados (no hay red) |
| `shop.products.thunks.ts` | carga los productos del catálogo: con filtros y página (modo "list") o por texto (modo "search") | shop.products.service (llamadas), auth (selectRequestContext), shop.slice (filtros), navigation (bodega activa) y shop.products.slice (reacciona); la despacha useProductsLoader |

### `importadoraInterfaz/src/features/shop/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.api.types.ts` | lo que responde la API en Go en productos y stock (GET /products, GET /products/search y GET /stock) y los filtros que se le envían | shop.adapter (convierte estos tipos a Product), shop.products.service y shop.stock.service (los usan) y shop.products.slice |
| `shop.card.types.ts` | props de la tarjeta de producto y de sus partes (stock, precios y acciones) | ProductCard, ProductCardStock, ProductCardPricing, ProductCardActions y las partes (Media, Info, TierMenu) |
| `shop.cart.api.types.ts` | lo que responde la API en Go en carritos (GET /carts/active y los cambios de renglones) y el estado del slice del carrito | shop.adapter (convierte CartDto a CartItem), shop.cart.service, shop.cart.thunks, shop.cart.slice y shop.selectors |
| `shop.cart.types.ts` | props de las partes del carrito | ShopCartItem (la pinta ShopCartDrawer) |
| `shop.catalog.types.ts` | props de las partes del catálogo (filtros, estado vacío, y aviso de carga) | ShopCatalogFilters, ShopCatalogEmpty, y ShopCatalogStatus (las usa ShopCatalogScreen) |
| `shop.types.ts` | contratos de producto, precios, filtros y carrito | shop.constants, shop.slice y los componentes de shop |

### `importadoraInterfaz/src/features/superadmin/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AdminCompanyFields.tsx` | sección «Empresa asociada» del formulario de administrador: elegir una empresa existente o registrar una nueva | AdminFormDrawer; valores y cambios vienen de useAdminForm |
| `AdminFormDrawer.css` | AdminFormDrawer.css | AdminFormDrawer.tsx |
| `AdminFormDrawer.tsx` | formulario de creación / edición de administradores en el panel derecho (solo superadmin) | formRegistry (adminForm), useAdminForm (estado y guardado) y las secciones AdminCompanyFields y AdminPersonFields |
| `AdminPersonFields.tsx` | sección «Datos personales y acceso» del formulario de administrador: nombre, correo, clave, documento, teléfono y estado | AdminFormDrawer; valores y cambios vienen de useAdminForm |
| `AdminsTable.tsx` | tabla de administradores con sus estados de carga y vacío y las acciones editar y activar / desactivar | SuperadminAdminsScreen; usa RowActions (global) y formatDate; las acciones llegan por props desde la pantalla |
| `AdminsToolbar.tsx` | barra de la tabla de administradores: búsqueda, filtro de empresa, filtro de estado y botón para crear | SuperadminAdminsScreen; valores y cambios vienen de useSuperadminAdmins |

### `importadoraInterfaz/src/features/superadmin/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `superadmin.constants.ts` | estado inicial de la gestión de administradores, tamaño de página y opciones de los filtros | superadmin.slice (estado inicial), AdminsToolbar (opciones) y AdminPersonFields (tipos de documento) |

### `importadoraInterfaz/src/features/superadmin/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `superadmin.helpers.test.ts` | borrador, validación y cuerpo de envío del formulario de administrador | superadmin.helpers (suite de pruebas) |
| `superadmin.helpers.ts` | funciones puras del formulario de administrador: borrador inicial, validación y cuerpo que se envía | useAdminForm (borrador, validación y envío); con pruebas en superadmin.helpers.test.ts |

### `importadoraInterfaz/src/features/superadmin/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useAdminForm.ts` | estado y envío del formulario de administrador (crear o editar): borrador, validación y guardado | AdminFormDrawer y sus secciones; despacha superadmin.thunks (saveAdminThunk), cierra el panel con navigation y lee las compañías (companies) |
| `useSuperadminAdmins.ts` | pide los administradores con los filtros del estado y expone lo que la pantalla necesita (lista, filtros, empresas y acciones) | SuperadminAdminsScreen; despacha superadmin.thunks y lee superadmin.slice, superadmin.selectors y la lista de compañías (companies) |

### `importadoraInterfaz/src/features/superadmin/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | superadmin/index · API pública de la gestión superadmin de administradores (pantalla, drawer, reducer y tipos) | screenRegistry (SuperadminAdminsScreen), formRegistry (AdminFormDrawer) y rootReducer |

### `importadoraInterfaz/src/features/superadmin/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `SuperadminAdminsScreen.css` | SuperadminAdminsScreen.css | SuperadminAdminsScreen.tsx |
| `SuperadminAdminsScreen.tsx` | gestión superadmin: lista y administra las cuentas de administradores de las compañías | useSuperadminAdmins (datos y filtros), AdminsToolbar, AdminsTable, Pagination (global) y el drawer adminForm (navigation) |

### `importadoraInterfaz/src/features/superadmin/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `superadmin.selectors.ts` | lecturas simples del estado de la gestión de administradores | useSuperadminAdmins; leen state.superadmin |

### `importadoraInterfaz/src/features/superadmin/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `superadmin.service.ts` | llamadas del superadmin para listar, crear y editar administradores de compañías y para registrar una compañía | api/client, api/config (STAFF_ADMINS y COMPANIES) y api/pagination; las usan superadmin.thunks |

### `importadoraInterfaz/src/features/superadmin/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `superadmin.slice.ts` | estado de la gestión de administradores (clave 'superadmin'): lista, carga, paginación y filtros | superadmin.thunks (la llenan), superadmin.selectors (lecturas) y rootReducer (clave 'superadmin'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/superadmin/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `superadmin.thunks.ts` | carga la lista de administradores con los filtros del estado, los activa o desactiva y guarda (crear o editar, con empresa nueva si hace falta) | superadmin.service (llamadas) y superadmin.slice (reacciona); las despachan useSuperadminAdmins y useAdminForm |

### `importadoraInterfaz/src/features/superadmin/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `superadmin.types.ts` | contratos de la gestión de administradores de compañías (solo superadmin) y el estado de la vista (clave 'superadmin') | superadmin.service (HTTP), superadmin.slice (estado), superadmin.helpers (cuerpos de envío) y los componentes de la pantalla |

### `importadoraInterfaz/src/features/transfers/components/detail/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `TransferDetailPanel.css` | TransferDetailPanel.css · detalle de un traslado dentro del panel derecho · solo usa tokens de styles/tokens.css | TransferDetailPanel.tsx |
| `TransferDetailPanel.tsx` | detalle de un traslado en el panel derecho: datos y trazabilidad de empleados, ruta, repuestos y notas; mismo diseño que el detalle de cotizaciones y de empleados | formRegistry (lo muestra), transfers.constants (texto del estado), format (fecha), useTransferDetail (trae el detalle si falta) y navigation (cerrar el panel) |

### `importadoraInterfaz/src/features/transfers/components/form/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreateTransferForm.tsx` | pedido de traslado en el panel derecho: cabecera con sede destino y stock local, desglose de bodegas activas y control de cantidades | useTransferRequest, TransferWarehouseStockList, TransferProductPicker, TransferRequestResults y navigation (closeDrawerForm) |
| `ReceiveTransferForm.css` | ReceiveTransferForm.css · piezas propias del formulario de recibir un traslado (lo común está en CreateTransferForm.css) · solo usa tokens de styles/tokens.css | ReceiveTransferForm.tsx |
| `ReceiveTransferForm.tsx` | confirmación de aceptación del traslado (OK completo o con novedad) en el panel derecho | formRegistry (lo muestra), transfers.thunks (acepta el traslado), CreateTransferForm.css (estilos compartidos del formulario) y ReceiveTransferForm.css |
| `TransferFormShell.css` | TransferFormShell.css · armazón compartido de los formularios de traslado (pedir y recibir) en el panel derecho: cuerpo con scroll y pie fijo · solo usa tokens de styles/tokens.css | TransferFormShell.tsx |
| `TransferProductPicker.tsx` | buscador de repuestos del pedido de traslado: cada resultado muestra sus bodegas con existencias para agregarlo con un clic | CreateTransferForm (lo pinta), useTransferRequest (búsqueda y agregar) y transfers.types |
| `TransferRequest.css` | TransferRequest.css · pedido de traslado: cabecera destino/stock, producto enfocado, desglose de bodegas activas y control de cantidades | TransferRequest.tsx |
| `TransferRequestLines.tsx` | el pedido de traslado: repuestos en borrador con selector de bodega origen, control de cantidades y visualización del movimiento | CreateTransferForm (la pinta) y useTransferRequest (cambiar origen, cantidad y quitar líneas) |
| `TransferRequestResults.tsx` | lo que pasó al enviar el pedido: un renglón por bodega de origen con el serial del traslado creado o el motivo del fallo | CreateTransferForm (la pinta) y transfers.types (TransferRequestResult) |
| `TransferWarehouseStockList.tsx` | desglose de bodegas activas con stock físico disponible y selector de cantidades a pedir | CreateTransferForm y useTransferRequest |

### `importadoraInterfaz/src/features/transfers/components/relocate/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `RelocateStockPanel.css` | RelocateStockPanel.css · estilos del formulario de reubicación de producto | RelocateStockPanel.tsx |
| `RelocateStockPanel.tsx` | panel lateral para reubicar un producto dentro de su bodega | inventory (relocateStockThunk), formRegistry, WarehouseProductsTable y ProductsTable |

### `importadoraInterfaz/src/features/transfers/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `TransferItemsTable.css` | TransferItemsTable.css · tabla de traslados con el mismo diseño de las tablas de cotizaciones y pedidos · solo usa tokens de styles/tokens.css | TransferItemsTable.tsx |
| `TransferItemsTable.tsx` | tabla de traslados con trazabilidad de empleados, tipo y novedades; mismo diseño que las tablas de cotizaciones y pedidos | TransfersScreen (la usa), transfers.constants (estado), RowActions (acciones con íconos de línea), audit (ver historial) y usePermissions |
| `WarehouseProductsTable.css` | WarehouseProductsTable.css · estilos de la tabla de productos de la bodega en traslados | WarehouseProductsTable.tsx |
| `WarehouseProductsTable.tsx` | tabla de existencias de la bodega activa dentro del módulo de Traslados | useWarehouseStock (las pide) y WarehouseStockRow (cada fila con sus acciones) |
| `WarehouseStockRow.tsx` | una fila de la tabla de existencias de la bodega: datos del repuesto y sus acciones (ver, reubicar, solicitar traslado) | WarehouseProductsTable (la pinta), RowActions, usePermissions y navigation (abre producto, reubicar y nuevo traslado en el panel derecho) |

### `importadoraInterfaz/src/features/transfers/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `transfers.constants.ts` | textos y estilos de los estados de un traslado y tamaños de página | TransferItemsTable (insignia del estado) y transfers.service |

### `importadoraInterfaz/src/features/transfers/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `transfers.adapter.ts` | convierte lo que responde la API a lo que usa la app | ../types/transfers.api.types, ../types/transfers.types |
| `transfers.filters.test.ts` | pruebas de los filtros de la tabla de traslados: texto, tipo, ruta de la bodega activa y estado (incluida la novedad prioritaria) | transfers.filters; se corre con npm test |
| `transfers.filters.ts` | filtra la tabla de traslados por texto, tipo, ruta (entrantes o salientes de la bodega activa) y estado | TransfersScreen (la usa) y transfers.types (TransferFilters) |
| `transfers.request.test.ts` | Pruebas unitarias de transfers.request | transfers.request (suite de pruebas) |
| `transfers.request.ts` | reglas del pedido de traslado con varias bodegas de origen: agregar, cambiar y quitar líneas, agrupar por origen y validar | useTransferRequest (las usa), createTransferRequestThunk (agrupa y valida) y transfers.types (TransferRequestLine) |

### `importadoraInterfaz/src/features/transfers/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useTransferDetail.ts` | devuelve el traslado listo para el panel de detalle; si la fila vino sin productos pide el detalle completo | TransferDetailPanel; despacha transfers.thunks (loadTransferDetailThunk) |
| `useTransferProductSearch.ts` | busca productos con sus existencias por bodega mientras se escribe (con espera) para el formulario de nuevo traslado | CreateTransferForm (lo usa), transfers.thunks, transfers.selectors y auth (hay sesión) |
| `useTransferRequest.ts` | estado del pedido de traslado: bodega que recibe, líneas de varias bodegas de origen, búsqueda de repuestos y envío | CreateTransferForm (lo usa), useTransferProductSearch (buscar), transfers.request (reglas), createTransferRequestThunk (enviar) y warehouses y auth |
| `useTransfersLoader.ts` | pide los traslados de la bodega activa cuando la pestaña está visible y otra vez al cerrarse un panel (crear, recibir o ver detalle) | TransfersScreen (lo usa), transfers.thunks y auth (hay sesión); lee el panel abierto de ui.drawerForm |
| `useWarehouseStock.ts` | pide las existencias de la bodega cuando cambia la bodega o el texto buscado (con espera) y devuelve cómo va la carga | WarehouseProductsTable (lo usa), transfers.thunks, transfers.selectors y auth (hay sesión) |

### `importadoraInterfaz/src/features/transfers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | exportaciones públicas del feature traslados multibodega | TransfersScreen, transfers.service, transfers.types y screenRegistry |

### `importadoraInterfaz/src/features/transfers/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `TransfersScreen.css` | TransfersScreen.css · pantalla de traslados: tarjeta con barra de filtros integrada y tabla · solo usa tokens de styles/tokens.css | TransfersScreen.tsx |
| `TransfersScreen.tsx` | Tienda > Traslados: pestañas «Repuestos en sede» y «Traslados» con barra de búsqueda y filtros al mismo nivel integrado | useTransfersLoader (los pide), transfers.selectors y transfers.thunks (despachar), transfers.filters (filtros), TransferItemsTable, WarehouseProductsTable y navigation (openDrawerForm) |

### `importadoraInterfaz/src/features/transfers/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `transfers.selectors.ts` | lecturas del estado de traslados | transfers.slice (estado), TransfersScreen, WarehouseProductsTable y los hooks de la feature |

### `importadoraInterfaz/src/features/transfers/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `transfers.service.test.ts` | pruebas de las llamadas de traslados: lista, crear, despachar, recibir, anular y búsqueda con existencias | transfers.service; el cliente HTTP está simulado (no hay red) |
| `transfers.service.ts` | llamadas al backend de traslados entre bodegas | @/api, @/features/auth, @/features/inventory, ../constants/transfers.constants |

### `importadoraInterfaz/src/features/transfers/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `transfers.slice.test.ts` | pruebas del estado de traslados: cargas con requestId, filas que cambian al despachar o recibir, y vaciado al cerrar sesión | transfers.slice y transfers.thunks (solo se usan sus tipos de acción); se corre con npm test |
| `transfers.slice.ts` | estado de traslados: lista de la bodega activa, existencias de la bodega, resultados del buscador y borrador de solicitud | transfers.thunks (lo llenan), transfers.selectors (lecturas) y rootReducer (clave 'transfers'; NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/transfers/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `transfers.thunks.ts` | cargas y acciones de traslados: lista, existencias de la bodega, buscador de productos, crear, despachar y recibir | transfers.service (llamadas) y auth (selectRequestContext); las despachan useTransfersLoader, useWarehouseStock, useTransferProductSearch y los formularios |

### `importadoraInterfaz/src/features/transfers/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `transfers.api.types.ts` | lo que responde la API en Go en traslados y stock | Módulos internos de la capa |
| `transfers.types.ts` | modelos que usa la app en traslados y reubicación multibodega | transfers.adapter (los arma desde la API), transfers.service, transfers.slice (estado), TransfersScreen, CreateTransferForm y ReceiveTransferForm |

### `importadoraInterfaz/src/features/wallet/components/account/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreditAccountDetail.css` | CreditAccountDetail.css · estilos del cuerpo del estado de cuenta (el encabezado está en DrawerHeader.css) · solo usa tokens de styles/tokens.css | CreditAccountDetail.tsx |
| `CreditAccountDetail.tsx` | estado de cuenta de un cliente: métricas, estado de cuenta, abono y facturas | CreditAccountDrawer (le pasa el cliente), useAccountData (facturas), useCreditPayment (abonos) y CreditLimitForm (cupo y plazo) |
| `CreditAccountDrawer.tsx` | contenido del panel derecho en cartera: estado de cuenta del cliente seleccionado | wallet.selectors (cliente seleccionado); muestra CreditAccountEmpty o CreditAccountDetail; lo muestra DrawerRight |
| `CreditAccountEmpty.css` | CreditAccountEmpty.css · estilos del mensaje cuando no hay cliente seleccionado · solo usa tokens de styles/tokens.css | CreditAccountEmpty.tsx |
| `CreditAccountEmpty.tsx` | mensaje del panel cuando no hay ningún cliente seleccionado | CreditAccountDrawer (se muestra mientras selectedCustomerId es null) |
| `CreditAccountMetrics.css` | CreditAccountMetrics.css · estilos del saldo adeudado, cupo disponible y uso de cupo · solo usa tokens de styles/tokens.css | CreditAccountMetrics.tsx |
| `CreditAccountMetrics.tsx` | cifras del crédito de un cliente (cupo, usado y disponible) con su porcentaje de uso y el color según el nivel | CreditAccountDetail (la pinta), wallet.helpers (getUsagePercentage y getUsageLevel) y format (pesos) |

### `importadoraInterfaz/src/features/wallet/components/billing/enable/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreditCustomerPicker.tsx` | buscador y lista de clientes para elegir a quién habilitar crédito | EnableCreditPanel (lo pinta, solo cuando el cliente aún no está elegido) |
| `EnableCreditPanel.css` | EnableCreditPanel.css | EnableCreditPanel.tsx |
| `EnableCreditPanel.test.tsx` | pruebas del panel de habilitar crédito: con cliente ya elegido (desde la tabla de clientes) no hay buscador y trae su cupo y plazo; sin cliente muestra el buscador | EnableCreditPanel; la búsqueda de clientes y el guardado están simulados (no hay red); se corre con npm test |
| `EnableCreditPanel.tsx` | formulario lateral para habilitar cupo y plazo de crédito a un cliente | useEnableCreditForm (estado y guardado), CreditCustomerPicker (buscador) y navigation (cerrar el panel); lo abren el botón «Habilitar crédito» de Cartera (con buscador) y el ícono de dinero de la tabla de clientes (con el cliente ya elegido) |

### `importadoraInterfaz/src/features/wallet/components/billing/forms/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreditLimitForm.css` | CreditLimitForm.css · estilos del formulario plegable de cupo y plazo · solo usa tokens de styles/tokens.css | CreditLimitForm.tsx |
| `CreditLimitForm.tsx` | formulario plegable para cambiar el cupo, el plazo y si el cliente tiene crédito (PUT /users/credit) | CreditAccountDetail (le pasa el cliente); wallet.payments.thunks (updateCreditThunk); al guardar se vuelve a leer la lista y los totales |
| `CreditPaymentForm.css` | CreditPaymentForm.css · estilos del formulario de abono y su aviso de éxito · solo usa tokens de styles/tokens.css | CreditPaymentForm.tsx |
| `CreditPaymentForm.tsx` | formulario de abono rápido (monto + botón Abonar) | CreditAccountDetail (monto y acción llegan por props desde useCreditPayment) |

### `importadoraInterfaz/src/features/wallet/components/billing/invoices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreditInvoiceCard.css` | CreditInvoiceCard.css · estilos de la tarjeta de cada factura pendiente · solo usa tokens de styles/tokens.css | CreditInvoiceCard.tsx |
| `CreditInvoiceCard.tsx` | tarjeta de una factura: número, estado, fechas, saldos y botón de pagar | CreditInvoiceList (por cada factura); el pago lo ejecuta useCreditPayment vía onPay |
| `CreditInvoiceList.css` | CreditInvoiceList.css · estilos de la sección de facturas pendientes · solo usa tokens de styles/tokens.css | CreditInvoiceList.tsx |
| `CreditInvoiceList.tsx` | sección de facturas pendientes del cliente (lista o mensaje de "al día") | CreditAccountDetail (facturas y acción de pagar); pinta una CreditInvoiceCard por factura |

### `importadoraInterfaz/src/features/wallet/components/clientRow/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreditClientRow.css` | CreditClientRow.css · estilos de cada fila de cliente (datos, uso de cupo, estado y botón) · solo usa tokens de styles/tokens.css | CreditClientRow.tsx |
| `CreditClientRow.tsx` | fila de un cliente: nombre, documento, plazo, cupo, saldo, disponible y la acción «Ver estado» (ícono sin borde, RowActions) | wallet.slice (seleccionar cliente); la pinta CreditClientsTable |
| `CreditStatusBadge.css` | CreditStatusBadge.css · estilos de la etiqueta de estado de crédito · solo usa tokens de styles/tokens.css | CreditStatusBadge.tsx |
| `CreditStatusBadge.tsx` | etiqueta del estado de crédito del cliente (al día, alerta, mora o bloqueado) | CreditClientRow (le pasa el estado); el texto y la variante salen de wallet.constants (CREDIT_STATUS_BADGES) |

### `importadoraInterfaz/src/features/wallet/components/clientsTable/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreditClientsTable.css` | CreditClientsTable.css · estilos de la tabla de clientes · solo usa tokens de styles/tokens.css | CreditClientsTable.tsx |
| `CreditClientsTable.tsx` | tabla de clientes: barra de filtros, encabezado y una fila por cliente | wallet.slice, wallet.selectors, wallet.thunks (reintentar), global Pagination; las partes son CreditClientsToolbar y CreditClientRow; al hacer clic abre CreditAccountDrawer |
| `CreditClientsToolbar.css` | CreditClientsToolbar.css · estilos de la barra de búsqueda y filtros de la tabla de clientes | CreditClientsToolbar.tsx |
| `CreditClientsToolbar.tsx` | barra de la tabla de clientes: búsqueda, un solo desplegable de estado de crédito y Habilitar crédito (el limpiar va dentro de la búsqueda) | wallet.slice (filtros), wallet.constants (opciones de estado), global SearchBar, FilterSelect, openDrawerForm; la pinta CreditClientsTable |

### `importadoraInterfaz/src/features/wallet/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AbonoDetailPanel.css` | AbonoDetailPanel.css · detalle de un abono: lista de datos y comprobante · solo usa tokens de styles/tokens.css | AbonoDetailPanel.tsx |
| `AbonoDetailPanel.tsx` | detalle de un abono o recaudo en el panel derecho: recibo, cliente, bodega, venta, método, quién lo registró y verificó, comprobante y acciones de verificación/anulación | AbonosTable (lo abre con «abonoDetail»), formRegistry, wallet.payments.thunks (verifyPaymentThunk, voidPaymentThunk) |
| `CreateAbonoPanel.css` | CreateAbonoPanel.css · registrar un abono a cartera: cliente elegido, lista de resultados y vista del comprobante · solo usa tokens de styles/tokens.css | CreateAbonoPanel.tsx |
| `CreateAbonoPanel.tsx` | formulario en el panel derecho para registrar un abono a cartera: cliente con crédito, factura, monto, método y comprobante | useCreateAbono (búsqueda, estado y guardado), MoneyInput, DrawerFormShell.css (armazón) y global format; lo abre formRegistry («createAbono») |

### `importadoraInterfaz/src/features/wallet/components/kpis/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `WalletKpiHeader.css` | WalletKpiHeader.css · estilos idénticos a los KPIs de conciliación bancaria | WalletKpiHeader.tsx |
| `WalletKpiHeader.tsx` | tarjetas de totales de cartera (por cobrar, clientes en mora, cupo y clientes con crédito) | wallet.selectors (selectWalletKpis, que sale de POST /wallet/summary) |

### `importadoraInterfaz/src/features/wallet/components/paymentsTable/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AbonosTable.css` | AbonosTable.css · abonos y recaudos: una sola tarjeta con la barra de herramientas pegada a la tabla · solo usa tokens de styles/tokens.css | AbonosTable.tsx |
| `AbonosTable.tsx` | una sola tarjeta con búsqueda, filtros (bodega, método y estado), total recaudado, botón de crear y la tabla de abonos y recaudos | WalletScreen (la usa), usePaymentsHistory (datos), wallet.abonos (filtrar y sumar), RowActions (ver detalle), Pill (método y estado), Pagination y navigation (abre «createAbono» y «abonoDetail») |

### `importadoraInterfaz/src/features/wallet/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.constants.ts` | filtros iniciales, estado inicial, tamaños de página y textos de estados de crédito | wallet.slice (initialState), wallet.service (cuántos pide), wallet.payments.service (método de pago) y los componentes (etiquetas) |

### `importadoraInterfaz/src/features/wallet/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.abonos.pending.test.ts` | pruebas de las facturas con saldo y de lo que debe un cliente (lo que usa el formulario de abono) | wallet.abonos (pendingInvoices, debtOf); se corre con npm test |
| `wallet.abonos.test.ts` | pruebas del historial de abonos: cómo se arma cada abono desde la API, los filtros y el total, y el cliente de la búsqueda de crédito | wallet.abonos y wallet.adapter (toAbonoRecord, toCreditCustomerOption); se corre con npm test |
| `wallet.abonos.ts` | filtra el historial de abonos por texto, método y estado, y suma lo recaudado | AbonosTable (la usa), wallet.types (AbonoRecord, AbonoFilters) |
| `wallet.adapter.test.ts` | pruebas de la conversión de clientes con crédito, ventas a crédito y reporte de la API a lo que usa la app | wallet.adapter; se corre con npm test |
| `wallet.adapter.ts` | convierte lo que responde la API en Go en cartera (clientes, ventas a crédito y reporte) a lo que usa la app | wallet.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en cartera |
| `wallet.helpers.test.ts` | pruebas del uso de cupo, el monto digitado y el reparto de un abono entre facturas | wallet.helpers; se corre con npm test |
| `wallet.helpers.ts` | funciones puras de cartera (uso de cupo, monto del abono y reparto del abono entre facturas) | CreditClientsTable, CreditAccountMetrics y useCreditPayment / wallet.payments.thunks (splitPayment) |

### `importadoraInterfaz/src/features/wallet/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useAccountData.ts` | cuando se abre el estado de cuenta de un cliente pide sus facturas al backend | CreditAccountDetail (lo usa al montarse); despacha wallet.thunks (loadInvoicesThunk) |
| `useCreateAbono.ts` | estado y guardado del abono a cartera: buscar un cliente CON crédito, ver sus facturas pendientes, monto, método y comprobante | CreateAbonoPanel (lo usa), useCreditCustomerSearch (búsqueda), wallet.thunks (loadInvoicesThunk), wallet.payments.thunks (payThunk), wallet.selectors y navigation (cierra el panel y la bodega activa) |
| `useCreditCustomerSearch.ts` | busca clientes mientras se escribe (con espera) para elegir a quién habilitar crédito | EnableCreditPanel (lo usa), wallet.history.thunks y wallet.selectors; auth (hay sesión) |
| `useCreditPayment.ts` | maneja el abono de un cliente: monto digitado, validación, registro en el backend y mensaje de éxito | CreditAccountDetail (lo usa); wallet.payments.thunks (payThunk), wallet.helpers (parsePaymentAmount), global toast |
| `useEnableCreditForm.ts` | estado del formulario para habilitar crédito: cliente elegido, cupo, plazo y guardado | EnableCreditPanel (lo usa), useCreditCustomerSearch (busca clientes), wallet.payments.thunks (guarda el cupo), navigation (cerrar el panel) y toast |
| `usePaymentsHistory.ts` | pide el historial de abonos al abrir la pestaña (y otra vez si se reinició el estado, por ejemplo al saltar de compañía) | AbonosTable (lo usa), wallet.history.thunks y wallet.selectors; auth (hay sesión) |
| `useWalletLoader.ts` | pide al backend la lista de clientes con crédito y los totales cuando cambia la página o la bodega | WalletScreen (lo usa al montarse); despacha wallet.thunks y lee wallet.selectors, la sesión de auth y la bodega activa (navigation) y su estado (warehouses) |

### `importadoraInterfaz/src/features/wallet/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | wallet/index · API pública de la feature wallet | MainContent, DrawerRight, rootReducer |

### `importadoraInterfaz/src/features/wallet/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `WalletScreen.css` | WalletScreen.css · estilos de la pantalla de cartera · solo usa tokens de styles/tokens.css | WalletScreen.tsx |
| `WalletScreen.tsx` | pantalla del módulo Cartera: Créditos, Abonos y Conciliación Entradas (esta última vive en la feature bank) | CreditClientsTable, AbonosTable, BankReconciliationScreen y useWalletLoader; la monta MainContent |

### `importadoraInterfaz/src/features/wallet/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.selectors.test.ts` | pruebas de los totales (KPIs), el filtro de clientes y el encabezado del panel | wallet.selectors; no usa red ni store real |
| `wallet.selectors.ts` | lecturas del estado de cartera: totales (KPIs), clientes filtrados, estado de la lista, facturas y encabezado del panel | WalletKpiHeader, CreditClientsTable, CreditAccountDetail y drawerRegistry (selectAccountDrawerMeta, selectHasSelectedCustomer); leen state.wallet |

### `importadoraInterfaz/src/features/wallet/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.payments.service.ts` | llamadas al backend que cambian cartera: abonar, verificar transferencia, anular pago, ajustes manuales y crédito | api/client y api/config (PAYMENTS, WALLET, CUSTOMERS); las usa wallet.payments.thunks |
| `wallet.service.test.ts` | pruebas de las llamadas de cartera: clientes con crédito, totales, ventas a crédito, abonos y cambio de cupo | wallet.service y wallet.payments.service; el cliente HTTP está simulado (no hay red) |
| `wallet.service.ts` | llamadas al backend de cartera: GET /customers?creditEnabled=true (clientes con crédito), GET /customers/selector (cupo disponible), | api/client, api/config, api/params y api/pagination (toPaginated), wallet.adapter (convierte); las usa wallet.thunks |

### `importadoraInterfaz/src/features/wallet/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.slice.ts` | estado de cartera que viene del backend: lista paginada, totales, filtros, cliente abierto y sus facturas | wallet.thunks y wallet.payments.thunks (lo llenan), wallet.selectors (lecturas), WalletScreen, CreditClientsTable, CreditAccountDrawer y rootReducer (clave 'wallet'; ya NO se guarda en el navegador) |

### `importadoraInterfaz/src/features/wallet/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.history.thunks.ts` | carga el historial de abonos y busca clientes para habilitarles crédito | wallet.service (llamadas), auth (selectRequestContext) y wallet.slice (reacciona); las despachan usePaymentsHistory y useCreditCustomerSearch |
| `wallet.payments.thunks.ts` | cambios de cartera: abonar, verificar transferencia, anular pago, ajustes y cupo/plazo | wallet.payments.service, wallet.service (releer facturas), wallet.thunks (recargar lista y totales) y wallet.slice (reacciona) |
| `wallet.thunks.test.ts` | pruebas de cartera con el slice real: lista, totales, facturas, abonos y cambio de cupo (con red, sesión y alertas simuladas) | wallet.thunks, wallet.payments.thunks y wallet.slice |
| `wallet.thunks.ts` | carga la lista de clientes con crédito, los totales (KPIs) y las facturas de un cliente | wallet.service (llamadas), auth (selectRequestContext), navigation (bodega activa) y wallet.slice (reacciona); las despachan useWalletLoader y useAccountData |

### `importadoraInterfaz/src/features/wallet/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.account.types.ts` | props de las partes del estado de cuenta (detalle, abono, cupo y facturas) | CreditAccountDetail, CreditAccountMetrics, CreditPaymentForm, CreditLimitForm, CreditInvoiceList, CreditInvoiceCard |
| `wallet.api.types.ts` | lo que responde la API en Go en cartera (clientes con crédito, ventas a crédito y reporte) y los datos que se envían al pagar o cambiar el cupo | wallet.adapter (convierte a los tipos de la app), wallet.service y wallet.payments.service (los piden y envían) |
| `wallet.table.types.ts` | props de las partes de la tabla de clientes | CreditClientRow (la pinta CreditClientsTable) y CreditStatusBadge (la pinta CreditClientRow) |
| `wallet.types.ts` | contratos de cartera que usa la app: clientes con crédito, facturas, resumen, filtros y estado del slice | wallet.adapter (convierte lo del backend), wallet.constants, wallet.slice, wallet.selectors y los componentes de wallet (lo que responde el backend está en wallet.api.types) |

### `importadoraInterfaz/src/features/warehouses/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CompanyWarehousesPanel.css` | CompanyWarehousesPanel.css · sedes de una compañía dentro del panel derecho · solo usa tokens de styles/tokens.css | CompanyWarehousesPanel.tsx |
| `CompanyWarehousesPanel.tsx` | lista de sedes de una compañía en el panel derecho (solo lectura): nombre, código, dirección y estado | formRegistry (lo muestra), warehouses.thunks (loadCompanyWarehousesThunk) y navigation (closeDrawerForm) |
| `WarehouseLocationsManagement.tsx` | gestión de las ubicaciones de una bodega: búsqueda, ocupación, estado y acciones (ver, editar, reubicar, clonar, eliminar) | WarehousesScreen (la monta), useWarehouseLocations (carga), useLocationsManagement (acciones) y las piezas de components/locations |
| `WarehousesTable.css` | WarehousesTable.css · bodegas: una sola tarjeta con la barra de herramientas pegada a la tabla · solo usa tokens de styles/tokens.css | WarehousesTable.tsx |
| `WarehousesTable.tsx` | una sola tarjeta con búsqueda, filtro de estado, contador, botón de crear y la tabla de bodegas (sedes) | WarehousesScreen (la usa), useManagedWarehouses y useWarehouseActions, RowActions (ver detalles, editar y gestionar ubicaciones), Pill (marca y avisos), Pagination, usePermissions y navigation (abre el panel 'warehouseForm' o 'warehouseDetail') |

### `importadoraInterfaz/src/features/warehouses/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `WarehouseDetailPanel.tsx` | panel derecho para ver información detallada de una bodega (sede) | openDrawerForm, closeDrawerForm, Pill, Warehouse |
| `WarehouseFormPanel.tsx` | formulario en el panel derecho para crear o editar una bodega (sede): datos, ubicación y contacto, y administrador | useWarehouseForm (estado, empleados y guardado) y DrawerFormShell.css (armazón); lo abre formRegistry ('warehouseForm') |

### `importadoraInterfaz/src/features/warehouses/components/locations/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `LocationDialogs.tsx` | las dos confirmaciones de la gestión de ubicaciones: desactivar una con existencias y eliminar (con motivo) | WarehouseLocationsManagement; el estado viene de useLocationsManagement; usa ConfirmDialog (global) |
| `LocationRow.tsx` | una fila de la gestión de ubicaciones: código, items, ocupación, estado editable y acciones (ver, QR, editar, reubicar, clonar, eliminar) | WarehouseLocationsManagement; las acciones vienen de useLocationsManagement y los permisos de usePermissions |
| `LocationsToolbar.tsx` | barra de la gestión de ubicaciones: búsqueda, selector de bodega, conteo, imprimir QR y nueva ubicación | WarehouseLocationsManagement; abre los drawers qrLabels y locationForm con navigation (openDrawerForm) |

### `importadoraInterfaz/src/features/warehouses/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.constants.ts` | tamaño de página y estado inicial de las bodegas | warehouses.service (cuántas pide) y warehouses.slice (initialState) |

### `importadoraInterfaz/src/features/warehouses/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.helpers.test.ts` | pruebas de la conversión de bodegas del backend y de la elección de la bodega activa | warehouses.helpers; se corre con npm test |
| `warehouses.helpers.ts` | convierte las bodegas del backend a las de la app y elige cuál queda activa | warehouses.service (toWarehouses) y WarehouseSelector (pickActiveWarehouse); funciones puras |
| `warehouses.manage.test.ts` | pruebas del filtro de la tabla de bodegas y del código sugerido | warehouses.manage; se corre con npm test |
| `warehouses.manage.ts` | funciones puras de la pantalla de gestión de bodegas: filtrar la tabla y sugerir el código de una bodega nueva | useManagedWarehouses (filtra) y useWarehouseForm (sugiere el código); no toca el store |

### `importadoraInterfaz/src/features/warehouses/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useLocationsManagement.ts` | acciones de la gestión de ubicaciones de una bodega: clonar, reubicar, activar o desactivar y eliminar con confirmación | WarehouseLocationsManagement; usa useLocationActions y locations.thunks (crear) y abre drawers con navigation (openDrawerForm) |
| `useManagedWarehouses.ts` | pide todas las bodegas (con inactivas y totales) y maneja la búsqueda, el filtro de estado y la marca de la bodega recién tocada | WarehousesScreen y WarehousesTable (lo usan), warehouses.thunks, warehouses.selectors, warehouses.manage (filtrar) y auth (hay sesión) |
| `useWarehouseActions.ts` | activar o desactivar una bodega y abrir sus ubicaciones, con su aviso de éxito o error | WarehousesTable (lo usa), warehouses.thunks, navigation (bodega activa y pantalla de ubicaciones) y toast |
| `useWarehouseForm.ts` | estado y guardado del formulario de una bodega (crear o editar) y la lista de empleados para elegir administrador | WarehouseFormPanel (lo usa), warehouses.thunks (saveWarehouseThunk), warehouses.manage (código sugerido), employees (useEmployeesDirectory) y navigation (cierra el panel) |
| `useWarehouseLocations.ts` | pide las ubicaciones de una bodega y las vuelve a pedir al cambiar de bodega o al llamar reload | WarehouseLocationsManagement; despacha locations.thunks (loadLocationsThunk) |
| `useWarehouses.ts` | pide las bodegas la primera vez y devuelve la lista y su estado de carga | WarehouseSelector y WarehouseMenu (los usan); despacha warehouses.thunks y lee warehouses.selectors |

### `importadoraInterfaz/src/features/warehouses/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | warehouses/index — API pública de la feature warehouses | rootReducer (reducer), AppHeader (WarehouseSelector y WarehouseMenu usan useWarehouses y pickActiveWarehouse) |

### `importadoraInterfaz/src/features/warehouses/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `WarehousesScreen.css` | WarehousesScreen.css — bodegas: resumen de arriba y contenedor de la pantalla — solo usa tokens de styles/tokens.css | WarehousesScreen.tsx |
| `WarehousesScreen.tsx` | Configuración > Sedes: resumen de bodegas, tabla general y gestión centralizada de ubicaciones por sede | WarehousesTable, WarehouseLocationsManagement y useManagedWarehouses |

### `importadoraInterfaz/src/features/warehouses/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.selectors.ts` | lecturas de las bodegas: la lista activa, la de gestión y el estado de los cambios | useWarehouses (y con ella WarehouseSelector y WarehouseMenu) y los hooks de gestión; leen state.warehouses |

### `importadoraInterfaz/src/features/warehouses/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.service.test.ts` | pruebas de GET /warehouses: la ruta, los parámetros que se envían y la conversión de la respuesta | warehouses.service; el cliente HTTP está simulado (no hay red) |
| `warehouses.service.ts` | llamadas al backend de bodegas: GET, POST, PUT, DELETE /warehouses | api/client, api/config y api/pagination (toPaginated), warehouses.helpers (convierte); la usan warehouses.thunks |

### `importadoraInterfaz/src/features/warehouses/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.slice.ts` | estado de las bodegas del backend: la lista activa (selector), la lista de gestión con inactivas y totales, y el último cambio | warehouses.thunks (la llenan), warehouses.selectors (lecturas) y rootReducer (clave 'warehouses'; no se persiste, la bodega ACTIVA sí vive en ui) |

### `importadoraInterfaz/src/features/warehouses/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.thunks.test.ts` | pruebas de la carga de bodegas: éxito, error y sin sesión | warehouses.thunks y warehouses.slice; el service y la sesión están simulados (no hay red) |
| `warehouses.thunks.ts` | cargas y cambios de bodegas del backend: la lista del selector, la de gestión, guardar y cambiar el estado | warehouses.service (llamadas), auth (selectRequestContext) y warehouses.slice (reacciona); las despachan useWarehouses y los hooks de gestión |

### `importadoraInterfaz/src/features/warehouses/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouse.types.ts` | contratos de bodega (lo que usa la app, lo que responde el backend y el estado del slice) | warehouses.helpers (convierte), warehouses.service, warehouses.slice, WarehouseSelector y WarehouseMenu |

### `importadoraInterfaz/src/global/components/UI/atoms/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AppToaster.tsx` | contenedor de las alertas flotantes (notificaciones arriba al centro) | App.tsx (se monta una sola vez) y global/helpers/toast (desde ahí se disparan) |
| `Button.css` | Button.css · estilos de los botones del ERP (variantes de la maqueta: .btn, .btn.p y .btn.y) · solo usa tokens de styles/tokens.css | Button.tsx |
| `Button.tsx` | botón del ERP con las variantes de la maqueta: principal (azul), secundario (gris), peligro (rojo) y destacado (amarillo) | Button.css (estilos de las clases btn-*), App.tsx (carga el css para toda la app); lo usan las pantallas nuevas (ej. pedidos) |
| `Pill.css` | Pill.css · estilos de la pastilla de estado (las .pill de la maqueta: v, pk, d, c y g) · solo usa tokens de styles/tokens.css | Pill.tsx |
| `Pill.tsx` | pastilla de estado del ERP (la .pill de la maqueta): texto corto con borde y fondo suave en ámbar, azul, verde, rojo o gris | Pill.css; la usan la tabla de pedidos y su detalle (etapa, pago, pausa); sirve para cualquier estado de otra pantalla |

### `importadoraInterfaz/src/global/components/UI/molecules/chips/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ChipSelect.css` | ChipSelect.css · estilos de la lista desplegable con aspecto de chip (píldora .fchip de la maqueta) · solo usa tokens de styles/tokens.css | ChipSelect.tsx |
| `ChipSelect.tsx` | lista desplegable con aspecto de chip de filtro: solo opciones por defecto y permitidas, sin placeholder seleccionable | react |

### `importadoraInterfaz/src/global/components/UI/molecules/dialogs/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ConfirmDialog.css` | ConfirmDialog.css · estilos del diálogo de confirmación (fondo oscuro, tarjeta y botones) · solo usa tokens de styles/tokens.css | ConfirmDialog.tsx |
| `ConfirmDialog.tsx` | diálogo de confirmación reutilizable (título, mensaje y botones Cancelar / Confirmar) | SideMenuUser (confirmar el cierre de sesión); usa useEscapeKey de global/hooks; no sabe qué acción confirma |

### `importadoraInterfaz/src/global/components/UI/molecules/filters/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `FilterSelect.css` | FilterSelect.css · lista desplegable de filtro de las barras de tablas y botón «Limpiar» · solo usa tokens de styles/tokens.css | FilterSelect.tsx |
| `FilterSelect.tsx` | lista desplegable de filtro de la barra de una tabla: solo muestra estados permitidos y opciones por defecto, sin placeholder seleccionable | react |
| `SearchBar.css` | SearchBar.css · estilos de la barra de búsqueda · solo usa tokens de styles/tokens.css | SearchBar.tsx |
| `SearchBar.tsx` | barra de búsqueda reutilizable con botón de limpiar | ShopCatalogScreen, CreditClientsTable |

### `importadoraInterfaz/src/global/components/UI/molecules/form/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `DrawerFormShell.css` | DrawerFormShell.css · armazón común de los formularios del panel derecho: cuerpo con scroll, pie con botones siempre a la vista, campos y secciones · solo usa tokens de styles/tokens.css | DrawerFormShell.tsx |
| `FormInputs.css` | FormInputs.css · estilos de inputs blindados de formulario · tokens de styles/tokens.css | FormInputs.tsx |
| `index.ts` | exportación de componentes moleculares de formulario | ValidatedInput, ValidatedNumberInput, MoneyInput |
| `MoneyInput.test.tsx` | pruebas del campo de dinero: puntos de miles al escribir, solo dígitos, ceros a la izquierda, tope y posición del cursor | MoneyInput y format (formatThousands, onlyDigits); se corre con npm test |
| `MoneyInput.tsx` | campo de dinero en pesos: muestra los puntos de miles mientras se escribe (1.250.000) y entrega solo los dígitos | format (formatThousands, onlyDigits); lo usan el cupo de crédito, el abono y las tarifas de un producto; hereda las clases del campo donde se use (className) |
| `ValidatedInput.tsx` | input de texto blindado con sanitización y límite de caracteres | validation.helpers, formularios de clientes, productos y traslados |
| `ValidatedNumberInput.tsx` | input numérico blindado contra teclas inválidas ('e', 'E', '-', '+') | validation.helpers, cobros de caja, cantidades de stock y formularios de precios |

### `importadoraInterfaz/src/global/components/UI/molecules/qr/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `QrLabelSheet.css` | QrLabelSheet.css · hoja de etiquetas QR en el panel derecho y su versión para impresión · solo usa tokens de styles/tokens.css | QrLabelSheet.tsx |
| `QrLabelSheet.tsx` | hoja de etiquetas con código QR para pegar en estantes y productos, con botón de imprimir | DrawerRight (formRegistry, panel «qrLabels»), useQrImages (imágenes) y QrLabelSheet.css (pantalla e impresión) |

### `importadoraInterfaz/src/global/components/UI/molecules/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `Pagination.css` | Pagination.css · estilos del paginador reutilizable · solo usa tokens de styles/tokens.css | Pagination.tsx |
| `Pagination.test.tsx` | pruebas del paginador: texto, botones habilitados según el meta, avisar la página pedida y ocultarse con una sola página | Pagination; se corre con npm test (usa un navegador simulado, jsdom) |
| `Pagination.tsx` | paginador reutilizable: Anterior, "Página X de Y" y Siguiente, a partir de los metadatos de paginación del backend | ShopCatalogScreen (catálogo) y CustomersScreen (clientes); recibe el meta de api (PaginatorMetadata) y avisa la página pedida |
| `RowActions.css` | RowActions.css · íconos de acción de una fila de tabla, sin borde y en fila (como la columna Acciones de Grandma's) · solo usa tokens de styles/tokens.css | RowActions.tsx |
| `RowActions.tsx` | columna «Acciones» de las tablas: íconos sin borde en fila (ver, editar, borrar...) con nombre accesible y texto al pasar el cursor | RowActions.css; la usan las tablas de clientes, empleados, cartera, traslados y auditoría |

### `importadoraInterfaz/src/global/helpers/access/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `accessLevels.test.ts` | pruebas del nivel de cada usuario y de qué niveles ven cada componente | accessLevels; se corre con npm test |
| `accessLevels.ts` | nivel de cada usuario (superadmin, admin, empleado o cliente) y qué niveles pueden ver cada módulo o pantalla | usePermissions (aplica las reglas al menú, a la pantalla y a los botones), CompanySelector y AppHeader (qué controles se muestran) |

### `importadoraInterfaz/src/global/helpers/feedback/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `toast.ts` | punto único para lanzar alertas flotantes desde cualquier feature | AppToaster (las pinta); uso: toast.success('Título', { description: 'detalle' }) o toast.error(...) |

### `importadoraInterfaz/src/global/helpers/files/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `saveBlob.test.ts` | el nombre del archivo que manda el backend | saveBlob (filenameFromDisposition); se corre con npm test |
| `saveBlob.ts` | guarda en el equipo del usuario un archivo que llegó del backend (por ejemplo, el Excel de una orden de compra) | los thunks que descargan archivos; usa el navegador (un enlace temporal), así que no corre en el servidor ni en pruebas sin DOM |

### `importadoraInterfaz/src/global/helpers/formatting/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `format.ts` | formatos compartidos: moneda (pesos colombianos), puntos de miles al escribir e iniciales de un nombre | WalletKpiHeader, CreditClientsTable, CreditAccountDrawer, ProductCard, ShopCartDrawer |

### `importadoraInterfaz/src/global/helpers/images/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `imageOptimizer.test.ts` | Pruebas unitarias de imageOptimizer | imageOptimizer (suite de pruebas) |
| `imageOptimizer.ts` | compresión y reescalado dinámico de imágenes en el cliente (canvas WebP / JPEG) | Módulos internos de la capa |

### `importadoraInterfaz/src/global/helpers/pricing/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `priceTier.test.ts` | pruebas de la conversión entre los niveles de precio de la app (P0..P3) y los de la API (p1..p4) | priceTier; se corre con npm test |
| `priceTier.ts` | el nivel de precio como lo escribe la app (P0..P3) y como lo escribe la API (p1..p4) | shop.helpers (nivel del catálogo y de la venta) y customers.adapter (nivel del cliente); funciones puras |

### `importadoraInterfaz/src/global/helpers/qr/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `qr.test.ts` | Pruebas unitarias de qr | qr (suite de pruebas) |
| `qr.ts` | convierte un texto en la imagen de un código QR (data URL PNG) legible por la cámara de un celular y por lectores de código | useQrImages (lo pide para cada etiqueta) y la librería qrcode; no sabe qué significa el texto (eso lo define cada feature, por ejemplo locations.qr) |

### `importadoraInterfaz/src/global/helpers/storage/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `session.storage.ts` | guarda, lee y borra la sesión (tokens y usuario) en el navegador | features/auth (helpers/auth.session); api/client lee el mismo 'access_token' para el header Authorization |
| `storage.ts` | almacenamiento seguro (localStorage) para redux-persist | app/store/store |
| `storageUrl.ts` | resolución de rutas relativas de Google Cloud Storage a URLs públicas completas | API_CONFIG (STORAGE_BASE_URL), shop.adapter, catalogs.adapter y cualquier consumidor de imágenes del bucket |

### `importadoraInterfaz/src/global/helpers/validation/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `validation.helpers.ts` | utilitarios puros de sanitización y validación estricta | ValidatedInput, ValidatedNumberInput y formularios de clientes, productos y traslados |

### `importadoraInterfaz/src/global/helpers/warehouse/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouse.ts` | convierte el id de bodega que guarda la app (texto) al número que espera el backend | shop.helpers (lo re-exporta), shop.*.thunks y wallet.thunks (las bodegas viajan como número en las peticiones) |

### `importadoraInterfaz/src/global/hooks/access/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `usePermissions.test.ts` | pruebas unitarias del motor de permisos jerárquicos | usePermissions, useFilteredMenuItems y vitest |
| `usePermissions.ts` | hook de validación jerárquica de permisos (admin bypass, módulos y pantallas) | auth slice (user, permissions), SideMenu (filtrado dinámico) y MainContent (guardia) |

### `importadoraInterfaz/src/global/hooks/data/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useApiHealth.ts` | consulta una vez la salud del backend y devuelve el estado (conectando, en línea o fuera de línea) con la latencia | api/health (checkApiHealth); lo usa ApiStatus en el footer del menú |
| `useAsyncValidation.test.ts` | pruebas del hook de validación asíncrona en tiempo real | useAsyncValidation y vitest; la consulta de "ya existe" está simulada (no hay red) |
| `useAsyncValidation.ts` | hook de validación asíncrona en tiempo real (debounce 500ms): ¿ya existe este correo o este documento? | los formularios que lo usan (CreateCustomerModal); quien lo usa le pasa la función que consulta (así global no importa de las features) |
| `useDebouncedValue.test.ts` | pruebas de la espera antes de usar un valor que cambia seguido (por ejemplo lo que se escribe) | useDebouncedValue; usa un reloj falso para no esperar de verdad; se corre con npm test |
| `useDebouncedValue.ts` | devuelve el valor recién después de que dejó de cambiar durante `delayMs` (para no pedir al backend en cada tecla) | useProductsLoader (búsqueda por texto); sirve para cualquier campo que dispare una petición |
| `usePagedList.test.ts` | Pruebas unitarias de usePagedList | usePagedList (suite de pruebas) |
| `usePagedList.ts` | pagina en pantalla una lista que ya está completa en memoria (20 filas por página) y entrega los metadatos para el paginador | las tablas que cargan todo de una vez (traslados, pedidos, empleados, abonos...) y global Pagination; usa paginateList de api |
| `useQrImages.ts` | genera las imágenes QR de una lista de textos y las entrega por texto (mientras se generan quedan sin imagen) | QrLabelSheet (lo usa) y global qr (qrDataUrl) |

### `importadoraInterfaz/src/global/hooks/store/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useRedux.ts` | hooks de redux ya tipados (dispatch y selector), para no repetir el tipado en cada componente | app/store/store (solo tipos); los usan app/componentApp y todas las features |

### `importadoraInterfaz/src/global/hooks/ui/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useClickOutside.ts` | ejecuta una función cuando se hace clic fuera del elemento o se presiona Escape | dropdowns y menús flotantes (hoy AppHeader tiene su propia copia, se migra después) |
| `useEscapeKey.ts` | ejecuta una función cuando se presiona Escape (solo mientras isActive sea true) | DrawerRight (cerrar el panel); para menús con clic fuera se usa useClickOutside |
| `useVerticalDrag.ts` | deja arrastrar un elemento fijo solo hacia arriba y abajo (con el mouse, el dedo o las flechas del teclado) y recuerda dónde quedó | DrawerTab (pestaña del carrito contraído); devuelve la posición (px desde arriba), la referencia del elemento y los manejadores de eventos |

### `importadoraInterfaz/src/global/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `drawerMenu.types.ts` | una opción del menú hamburguesa del encabezado del panel derecho | DrawerHeader (la pinta), DrawerRight y las features que arman sus opciones (hoy el carrito: useCartMenuActions) |

### `importadoraInterfaz/src/styles/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `table-scroll.css` | table-scroll.css · alto limitado y scroll interno de todas las tablas, con el encabezado fijo · solo usa tokens de styles/tokens.css | table-scroll.tsx |
| `tokens.css` | ---- 1. PALETA PRIMITIVA (hex) ---- | tokens.tsx |

### `importadoraInterfaz/scripts/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `check-endpoints.mjs` | revisa que cada ruta de src/api/config.ts y de src/api/endpoints/* exista en el Swagger del backend | node:fs, node:path |
| `check-typography.mjs` | avisa de tipografía suelta: tamaños, pesos, interlineados o fuentes escritos a mano fuera de tokens.css | node:fs, node:path |
| `smoke-api.mjs` | recorre el ciclo completo de un pedido contra el API Go real: entrar, crear el pedido en efectivo, cobrarlo, alistar, empacar, facturar, despachar y enviar, y comprueba que repetir una etapa se rechaza | Módulos internos de la capa |
| `sync-product-images.mjs` | busca en el bucket público del sistema anterior la primera imagen de cada producto y arma el mapa código -> ruta | node:fs |

---

## 4. Estudio Detallado de `importadoraApi` (Backend en Go)

### `importadoraApi/ (raíz)`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `main.go` | Punto de entrada del servidor API: carga configuración, conecta PostgreSQL (pgxpool + GORM), monta Echo y registra todas las rutas | `core/config`, `core/db`, `core/server`, `core/bootstrap` |

### `importadoraApi/src/core/bootstrap/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `container.go` | armado de dependencias de la API: crea los repositorios, servicios y controladores y los conecta entre sí | core/db, core/config y los repositories, services y controllers de cada módulo; lo usa router.go |
| `router.go` | enrutador: registra el middleware general y las rutas de cada módulo | container.go (los controladores ya armados), core/middlewares y los routes de cada módulo |
| `routes_guard_test.go` | guardia contra rutas sin permiso: toda ruta que cambia datos debe exigir un permiso (o un tipo de actor), salvo la lista de excepciones | features/*/routes (lee sus archivos de texto); si se agrega una ruta nueva sin protegerla, esta prueba falla |

### `importadoraApi/src/core/config/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `config.go` | Config centraliza la configuración de entorno del servidor Go y PostgreSQL (solo datos). | Módulos internos de la capa |
| `dsn.go` | arma la cadena de conexión (DSN) a la base de datos desde la configuración | core/db (la usa para conectar) |
| `env.go` | lectura de variables de entorno: texto, números, duraciones y listas, con su valor por defecto | loader.go (las usa para llenar la configuración) |
| `loader.go` | carga la configuración de la API desde el entorno al arrancar | env.go (lee las variables) y validators.go (revisa que estén completas); lo llama main.go |
| `validators.go` | revisa que la configuración esté completa y sea válida antes de arrancar | loader.go (los llama después de leer el entorno) |

### `importadoraApi/src/core/db/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `executor.go` | DBExecutor: interfaz común del pool y de las transacciones, para que un repositorio acepte cualquiera de los dos | todos los repositories de cada módulo |
| `gorm.go` | conexión a la base: abre el pool, mide su latencia y lo cierra al apagar | core/config (DSN) y core/bootstrap (la entrega a los repositorios) |
| `postgres.go` | conexión directa a PostgreSQL con pgx y ayuda para correr una función dentro de una transacción | core/config (DSN); los services usan WithTx para sus transacciones |
| `startdb.pgsql` | Módulo startdb.pgsql | Módulos internos de la capa |

### `importadoraApi/src/core/middlewares/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth_middleware.go` | autenticación y autorización: valida el token y exige tipo de actor o permiso por ruta | core/utils (JWT y errores), repositories de autenticación y los routes de cada módulo |
| `context.go` | ActorContext: quién hace la petición (tipo, id y compañía), guardado en el contexto de Echo, y la compañía efectiva para consultar | auth_middleware.go (lo llena) y los controllers y services (lo leen) |
| `permission_test.go` | pruebas de RequirePermission y RequireActors: el empleado necesita el permiso exacto, administradores y superadministradores pasan siempre | auth_middleware.go (RequirePermission y RequireActors) |

### `importadoraApi/src/core/server/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `server.go` | servidor HTTP: configuración de Echo, arranque y apagado ordenado | core/config y core/bootstrap (el enrutador); lo llama main.go |

### `importadoraApi/src/core/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `actor_types.go` | ActorType identifica el nivel jerárquico del usuario autenticado (superadmins, admins, employees). | Módulos internos de la capa |
| `catalog_types.go` | ProductStatus coincide con products.status ('draft' · 'active' · 'inactive' · 'discontinued'). | Módulos internos de la capa |
| `company_types.go` | TypeFacturation coincide con warehouse_facturation.type_facturation ('natural' · 'juridica'). | Módulos internos de la capa |
| `customer_types.go` | PersonType coincide con customers.person_type ('natural' · 'legal'). | Módulos internos de la capa |
| `inventory_types.go` | TransferStatus coincide con transfers.status ('pending' · 'in_transit' · 'received' · 'cancelled'). | Módulos internos de la capa |
| `payment_types.go` | PaymentMethod coincide con sales.payment_method ('cash' · 'transfer' · 'credit') | Módulos internos de la capa |
| `purchase_types.go` | PurchaseStatus coincide con purchases.status ('draft' · 'ordered' · 'partial' · 'received' · 'voided'). | Módulos internos de la capa |
| `sale_types.go` | CartStatus coincide con carts.status ('open' · 'converted' · 'abandoned'). | Módulos internos de la capa |

### `importadoraApi/src/core/utils/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `crypto.go` | contraseñas y tokens: hash y verificación de contraseñas, tokens opacos y huella SHA-256 | auth (login y sesiones) y staff (credenciales de empleados) |
| `doc_series.go` | numeración de documentos: calcula el siguiente consecutivo de una serie (pedidos, facturas, recibos) | sales, payments, purchases y otros módulos que numeran documentos |
| `errors_db_test.go` | NormalizeDBError: duplicados con mensaje legible, llaves foráneas, CHECK, nulos y registros inexistentes | errors.go (NormalizeDBError y duplicateMessage) |
| `errors.go` | AppError: errores con código HTTP y mensaje listo para el cliente | todos los services (los crean) y controllers (los devuelven) |
| `jwt.go` | creación y lectura de tokens JWT de acceso | auth (emite el token) y core/middlewares (lo valida) |
| `request.go` | lectura de la petición: cuerpo JSON, parámetros de la ruta e IP del cliente | todos los controllers |
| `response.go` | respuestas JSON estándar de la API y paginación | todos los controllers |

### `importadoraApi/src/features/audit/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit_controller.go` | controlador HTTP de auditoría: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de auditoría y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/audit/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit_dto.go` | formas de lo que entra y sale por la API en auditoría (peticiones y respuestas) | los controllers y services de auditoría |

### `importadoraApi/src/features/audit/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit_repo.go` | acceso a la base de auditoría: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de auditoría; los usan los services de auditoría |

### `importadoraApi/src/features/audit/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit_routes.go` | rutas HTTP de auditoría y los roles o permisos que exige cada una | los controllers de auditoría y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/audit/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit_service.go` | reglas de negocio de auditoría: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de auditoría; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/auth/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth_controller.go` | controlador HTTP de autenticación y sesiones: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de autenticación y sesiones y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/auth/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth_dto.go` | formas de lo que entra y sale por la API en autenticación y sesiones (peticiones y respuestas) | los controllers y services de autenticación y sesiones |

### `importadoraApi/src/features/auth/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `audit_repo.go` | acceso a la base de autenticación y sesiones: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de autenticación y sesiones; los usan los services de autenticación y sesiones |
| `auth_employee_repo.go` | búsqueda de empleados para el ingreso | AuthRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en auth_repo.go) |
| `auth_login_attempt_repo.go` | intentos fallidos de ingreso de empleados y bloqueo | AuthRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en auth_repo.go) |
| `auth_repo.go` | acceso a la base de autenticación y sesiones: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de autenticación y sesiones; los usan los services de autenticación y sesiones |
| `auth_session_repo.go` | sesiones: tokens de renovación y revocación | AuthRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en auth_repo.go) |

### `importadoraApi/src/features/auth/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth_routes.go` | rutas HTTP de autenticación y sesiones y los roles o permisos que exige cada una | los controllers de autenticación y sesiones y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/auth/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth_service.go` | reglas de negocio de autenticación y sesiones: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de autenticación y sesiones; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/bank_statements/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank_statement_controller.go` | controlador HTTP de extractos bancarios: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de extractos bancarios y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/bank_statements/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank_statement_dto.go` | formas de lo que entra y sale por la API en extractos bancarios (peticiones y respuestas) | los controllers y services de extractos bancarios |

### `importadoraApi/src/features/bank_statements/entities/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank_statement_entity.go` | forma de los registros de extractos bancarios en la base | los repositories y services de extractos bancarios |

### `importadoraApi/src/features/bank_statements/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank_statement_repo.go` | acceso a la base de extractos bancarios: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de extractos bancarios; los usan los services de extractos bancarios |

### `importadoraApi/src/features/bank_statements/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank_statement_routes.go` | rutas HTTP de extractos bancarios y los roles o permisos que exige cada una | los controllers de extractos bancarios y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/bank_statements/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `bank_statement_service.go` | reglas de negocio de extractos bancarios: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de extractos bancarios; los llama el controller y la conexión llega del contenedor |
| `bank_statement_upload_service.go` | carga del extracto en PDF y lectura de sus movimientos | BankStatementService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en bank_statement_service.go) |

### `importadoraApi/src/features/carts/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cart_controller.go` | controlador HTTP de carritos: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de carritos y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/carts/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cart_dto.go` | formas de lo que entra y sale por la API en carritos (peticiones y respuestas) | los controllers y services de carritos |

### `importadoraApi/src/features/carts/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cart_item_repo.go` | acceso a la base de carritos: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de carritos; los usan los services de carritos |
| `cart_repo.go` | acceso a la base de carritos: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de carritos; los usan los services de carritos |

### `importadoraApi/src/features/carts/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cart_routes.go` | rutas HTTP de carritos y los roles o permisos que exige cada una | los controllers de carritos y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/carts/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cart_item_service.go` | reglas de negocio de carritos: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de carritos; los llama el controller y la conexión llega del contenedor |
| `cart_service.go` | reglas de negocio de carritos: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de carritos; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/cash_sessions/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash_session_controller.go` | recibe las peticiones de /cash/sessions (consultar la abierta, abrir y cerrar con sus gastos) y responde | cash_session_service (reglas) y cash_session_dto (formas de entrada y salida) |

### `importadoraApi/src/features/cash_sessions/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash_session_dto.go` | lo que entra y sale por la API de turnos de caja (/cash/sessions) | cash_session_controller (recibe y responde) y cash_session_service (arma las respuestas) |

### `importadoraApi/src/features/cash_sessions/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash_session_repo.go` | todo el SQL de turnos de caja, gastos y totales cobrados | cash_session_service; ojo: los pagos anulados (voided) no suman al total |

### `importadoraApi/src/features/cash_sessions/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash_session_routes.go` | rutas de /cash/sessions con su permiso por acción (RequirePermission) | cash_session_controller y el arranque en core/bootstrap |

### `importadoraApi/src/features/cash_sessions/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `cash_session_service.go` | reglas del turno de caja: una sola caja abierta por bodega, cierre con descuadre | cash_session_repo y cash_session_controller |

### `importadoraApi/src/features/catalog/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `brand_controller.go` | controlador HTTP de catálogo (marcas, categorías y modelos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de catálogo (marcas, categorías y modelos) y core/utils (respuestas y errores); los registra routes |
| `catalog_controller.go` | controlador HTTP de catálogo (marcas, categorías y modelos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de catálogo (marcas, categorías y modelos) y core/utils (respuestas y errores); los registra routes |
| `category_controller.go` | controlador HTTP de catálogo (marcas, categorías y modelos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de catálogo (marcas, categorías y modelos) y core/utils (respuestas y errores); los registra routes |
| `model_controller.go` | controlador HTTP de catálogo (marcas, categorías y modelos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de catálogo (marcas, categorías y modelos) y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/catalog/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalog_dto.go` | DTOs PARA MARCAS (BRANDS) | Módulos internos de la capa |

### `importadoraApi/src/features/catalog/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `brand_repo.go` | acceso a la base de catálogo (marcas, categorías y modelos): aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de catálogo (marcas, categorías y modelos); los usan los services de catálogo (marcas, categorías y modelos) |
| `category_repo.go` | acceso a la base de catálogo (marcas, categorías y modelos): aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de catálogo (marcas, categorías y modelos); los usan los services de catálogo (marcas, categorías y modelos) |
| `model_repo.go` | acceso a la base de catálogo (marcas, categorías y modelos): aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de catálogo (marcas, categorías y modelos); los usan los services de catálogo (marcas, categorías y modelos) |

### `importadoraApi/src/features/catalog/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalog_routes.go` | rutas HTTP de catálogo (marcas, categorías y modelos) y los roles o permisos que exige cada una | los controllers de catálogo (marcas, categorías y modelos) y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/catalog/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalog_category_service.go` | categorías del catálogo | CatalogService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en catalog_service.go) |
| `catalog_model_service.go` | modelos de moto del catálogo | CatalogService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en catalog_service.go) |
| `catalog_service.go` | reglas de negocio de catálogo (marcas, categorías y modelos): valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de catálogo (marcas, categorías y modelos); los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/companies/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `company_controller.go` | controlador HTTP de compañías: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de compañías y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/companies/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `company_dto.go` | CompanyResponse representa los datos públicos de una compañía. | Módulos internos de la capa |

### `importadoraApi/src/features/companies/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `company_repo.go` | acceso a la base de compañías: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de compañías; los usan los services de compañías |

### `importadoraApi/src/features/companies/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `company_routes.go` | rutas HTTP de compañías y los roles o permisos que exige cada una | los controllers de compañías y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/companies/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `company_service.go` | reglas de negocio de compañías: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de compañías; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/customers/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customer_controller.go` | controlador HTTP de clientes: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de clientes y core/utils (respuestas y errores); los registra routes |
| `customer_document_controller.go` | controlador HTTP de clientes: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de clientes y core/utils (respuestas y errores); los registra routes |
| `customer_document_renew_controller.go` | controlador HTTP de la renovación de documentos del cliente y de sus alertas de vencimiento | los services y dtos de clientes y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/customers/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customer_dto.go` | formas de lo que entra y sale por la API en clientes (peticiones y respuestas) | los controllers y services de clientes |

### `importadoraApi/src/features/customers/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customer_document_renew_repo.go` | renovación de documentos del cliente y consulta de los vencidos o por vencer | CustomerRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_repo.go) |
| `customer_document_repo.go` | documentos del cliente | CustomerRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_repo.go) |
| `customer_lookup_repo.go` | listas cortas del cliente: selector y resumen de crédito | CustomerRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_repo.go) |
| `customer_repo.go` | acceso a la base de clientes: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de clientes; los usan los services de clientes |

### `importadoraApi/src/features/customers/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customer_routes.go` | rutas HTTP de clientes y los roles o permisos que exige cada una | los controllers de clientes y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/customers/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customer_document_expiry_test.go` | pruebas de la vigencia de los documentos del cliente | customer_document_expiry (documentExpiry) |
| `customer_document_expiry.go` | vigencia de los documentos del cliente: cuándo vencen y en qué estado están | CustomerService (listar, subir, renovar y alertas); la vigencia en meses sale del cliente (docs_validity_months) |
| `customer_document_renew_service.go` | renovación de documentos del cliente y alertas de los vencidos o por vencer | CustomerService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_service.go); customer_document_expiry (estados) y el repositorio de documentos |
| `customer_document_service.go` | documentos del cliente: listar, subir y eliminar | CustomerService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_service.go) |
| `customer_service.go` | reglas de negocio de clientes: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de clientes; los llama el controller y la conexión llega del contenedor |
| `customer_write_service.go` | altas, cambios y retiro de clientes y su respuesta | CustomerService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en customer_service.go) |

### `importadoraApi/src/features/externals/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `external_controller.go` | controlador HTTP de terceros (proveedores y transportadoras): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de terceros (proveedores y transportadoras) y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/externals/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `external_dto.go` | formas de lo que entra y sale por la API en terceros (proveedores y transportadoras) (peticiones y respuestas) | los controllers y services de terceros (proveedores y transportadoras) |

### `importadoraApi/src/features/externals/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `external_repo.go` | acceso a la base de terceros (proveedores y transportadoras): aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de terceros (proveedores y transportadoras); los usan los services de terceros (proveedores y transportadoras) |

### `importadoraApi/src/features/externals/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `external_routes.go` | rutas HTTP de terceros (proveedores y transportadoras) y los roles o permisos que exige cada una | los controllers de terceros (proveedores y transportadoras) y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/externals/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `external_service.go` | reglas de negocio de terceros (proveedores y transportadoras): valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de terceros (proveedores y transportadoras); los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/health/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `health_controller.go` | controlador HTTP de salud del servicio: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de salud del servicio y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/health/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `health_dto.go` | formas de lo que entra y sale por la API en salud del servicio (peticiones y respuestas) | los controllers y services de salud del servicio |

### `importadoraApi/src/features/health/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `health_routes.go` | rutas HTTP de salud del servicio y los roles o permisos que exige cada una | los controllers de salud del servicio y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/health/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `health_service.go` | reglas de negocio de salud del servicio: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de salud del servicio; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/inventory/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `count_controller.go` | controlador HTTP de inventario: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de inventario y core/utils (respuestas y errores); los registra routes |
| `inventory_controller.go` | controlador HTTP de inventario: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de inventario y core/utils (respuestas y errores); los registra routes |
| `movement_controller.go` | controlador HTTP de inventario: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de inventario y core/utils (respuestas y errores); los registra routes |
| `stock_controller.go` | controlador HTTP de inventario: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de inventario y core/utils (respuestas y errores); los registra routes |
| `transfer_controller.go` | controlador HTTP de inventario: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de inventario y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/inventory/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory_dto.go` | formas de lo que entra y sale por la API en inventario (peticiones y respuestas) | los controllers y services de inventario |

### `importadoraApi/src/features/inventory/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory_count_repo.go` | conteos físicos de inventario: cabecera, renglones, verificación y corroboración | InventoryRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_repo.go) |
| `inventory_movement_repo.go` | movimientos de inventario: registrar y listar | InventoryRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_repo.go) |
| `inventory_repo.go` | acceso a la base de inventario: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de inventario; los usan los services de inventario |
| `inventory_transfer_repo.go` | traslados entre bodegas: cabecera, renglones y cambios de estado | InventoryRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_repo.go) |

### `importadoraApi/src/features/inventory/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory_routes.go` | rutas HTTP de inventario y los roles o permisos que exige cada una | los controllers de inventario y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/inventory/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory_assign_service.go` | asignar un producto del catálogo a una ubicación de una bodega, con unidades iniciales | inventory_repo (UpsertStockDelta y kardex), warehouse_repo (bodega y ubicación) y product_repo (el producto); lo llama stock_controller |
| `inventory_count_service.go` | conteos físicos de inventario: crear, actualizar, verificar y corroborar | InventoryService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_service.go) |
| `inventory_service.go` | reglas de negocio de inventario: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de inventario; los llama el controller y la conexión llega del contenedor |
| `inventory_transfer_flow_service.go` | avance del traslado: despachar, recibir y anular | InventoryService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_transfer_service.go) |
| `inventory_transfer_service.go` | traslados entre bodegas: listar, crear, despachar, recibir y anular | InventoryService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_service.go) |

### `importadoraApi/src/features/notifications/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `notification_controller.go` | controlador HTTP de notificaciones: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de notificaciones y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/notifications/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `notification_dto.go` | formas de lo que entra y sale por la API en notificaciones (peticiones y respuestas) | los controllers y services de notificaciones |

### `importadoraApi/src/features/notifications/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `notification_repo.go` | acceso a la base de notificaciones: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de notificaciones; los usan los services de notificaciones |

### `importadoraApi/src/features/notifications/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `notification_routes.go` | rutas HTTP de notificaciones y los roles o permisos que exige cada una | los controllers de notificaciones y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/notifications/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `notification_service.go` | reglas de negocio de notificaciones: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de notificaciones; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/payments/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `payment_controller.go` | controlador HTTP de pagos: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de pagos y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/payments/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `payment_dto.go` | formas de lo que entra y sale por la API en pagos (peticiones y respuestas) | los controllers y services de pagos |

### `importadoraApi/src/features/payments/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `payment_flow_repo.go` | lecturas del flujo de pago de un pedido: cuánto falta por cubrir, si hay pagos en revisión y si la bodega tiene turno de caja abierto | core/db (DBExecutor); lo usa payment_flow_service (pagos mixtos y paso automático de verificación) |
| `payment_repo.go` | acceso a la base de pagos: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de pagos; los usan los services de pagos |

### `importadoraApi/src/features/payments/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `payment_routes.go` | rutas HTTP de pagos y los roles o permisos que exige cada una | los controllers de pagos y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/payments/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `payment_flow_service.go` | cobro mixto de un pedido (efectivo, transferencia y crédito en una operación) y paso automático de «verificación» a «verificación confirmada» | payment_service (Verify, Void), payment_flow_repo (cobertura del pedido), sale_repo (etapa e historial, crédito del cliente) y el controller de pagos |
| `payment_service.go` | reglas de negocio de pagos: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de pagos; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/products/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `product_code_controller.go` | controlador HTTP de productos: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de productos y core/utils (respuestas y errores); los registra routes |
| `product_controller.go` | controlador HTTP de productos: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de productos y core/utils (respuestas y errores); los registra routes |
| `product_supplier_controller.go` | controlador HTTP de productos: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de productos y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/products/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `product_dto.go` | formas de lo que entra y sale por la API en productos (peticiones y respuestas) | los controllers y services de productos |

### `importadoraApi/src/features/products/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `product_code_repo.go` | códigos del producto | ProductRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_repo.go) |
| `product_repo.go` | acceso a la base de productos: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de productos; los usan los services de productos |
| `product_supplier_repo.go` | proveedores del producto y su costo | ProductRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_repo.go) |

### `importadoraApi/src/features/products/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `product_routes.go` | rutas HTTP de productos y los roles o permisos que exige cada una | los controllers de productos y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/products/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `product_code_service.go` | códigos del producto (barras, OEM y otros) | ProductService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_service.go) |
| `product_initial_stock_service.go` | dónde queda guardado un producto recién creado: valida las bodegas y ubicaciones elegidas y crea sus existencias iniciales | ProductService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_service.go); lo usa product_write_service (Create) |
| `product_mapper.go` | arma la respuesta del producto y su texto de búsqueda (easysearch) | ProductService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_service.go) |
| `product_service.go` | reglas de negocio de productos: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de productos; los llama el controller y la conexión llega del contenedor |
| `product_supplier_service.go` | proveedores del producto y su costo | ProductService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_service.go) |
| `product_write_service.go` | altas, cambios y retiro de productos | ProductService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_service.go) |

### `importadoraApi/src/features/purchases/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchase_controller.go` | controlador HTTP de compras: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de compras y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/purchases/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchase_dto.go` | formas de lo que entra y sale por la API en compras (peticiones y respuestas) | los controllers y services de compras |

### `importadoraApi/src/features/purchases/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchase_repo.go` | acceso a la base de compras: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de compras; los usan los services de compras |

### `importadoraApi/src/features/purchases/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchase_routes.go` | rutas HTTP de compras y los roles o permisos que exige cada una | los controllers de compras y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/purchases/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `purchase_excel_service.go` | Excel de compras: exportar, cargar el catálogo del proveedor y listar sus productos | PurchaseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en purchase_service.go) |
| `purchase_receive_service.go` | recepción y anulación de compras y su respuesta | PurchaseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en purchase_service.go) |
| `purchase_service.go` | reglas de negocio de compras: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de compras; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/quotations/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotation_controller.go` | controlador HTTP de cotizaciones: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de cotizaciones y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/quotations/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotation_dto.go` | formas de lo que entra y sale por la API en cotizaciones (peticiones y respuestas) | los controllers y services de cotizaciones |

### `importadoraApi/src/features/quotations/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotation_repo.go` | acceso a la base de cotizaciones: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de cotizaciones; los usan los services de cotizaciones |

### `importadoraApi/src/features/quotations/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotation_routes.go` | rutas HTTP de cotizaciones y los roles o permisos que exige cada una | los controllers de cotizaciones y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/quotations/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotation_service.go` | reglas de negocio de cotizaciones: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de cotizaciones; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/recyclebin/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `recycle_bin_controller.go` | controlador HTTP de papelera de reciclaje: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de papelera de reciclaje y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/recyclebin/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `recycle_bin_dto.go` | formas de lo que entra y sale por la API en papelera de reciclaje (peticiones y respuestas) | los controllers y services de papelera de reciclaje |

### `importadoraApi/src/features/recyclebin/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `recycle_bin_repo.go` | acceso a la base de papelera de reciclaje: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de papelera de reciclaje; los usan los services de papelera de reciclaje |

### `importadoraApi/src/features/recyclebin/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `recycle_bin_routes.go` | rutas HTTP de papelera de reciclaje y los roles o permisos que exige cada una | los controllers de papelera de reciclaje y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/recyclebin/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `recycle_bin_service.go` | reglas de negocio de papelera de reciclaje: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de papelera de reciclaje; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/reports/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `report_controller.go` | controlador HTTP de reportes: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de reportes y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/reports/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `report_dto.go` | formas de lo que entra y sale por la API en reportes (peticiones y respuestas) | los controllers y services de reportes |

### `importadoraApi/src/features/reports/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `report_repo.go` | acceso a la base de reportes: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de reportes; los usan los services de reportes |

### `importadoraApi/src/features/reports/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `report_routes.go` | rutas HTTP de reportes y los roles o permisos que exige cada una | los controllers de reportes y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/reports/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `report_service.go` | reglas de negocio de reportes: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de reportes; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/returns/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `return_controller.go` | controlador HTTP de devoluciones: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de devoluciones y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/returns/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `return_dto.go` | formas de lo que entra y sale por la API en devoluciones (peticiones y respuestas) | los controllers y services de devoluciones |

### `importadoraApi/src/features/returns/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `return_repo.go` | acceso a la base de devoluciones: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de devoluciones; los usan los services de devoluciones |

### `importadoraApi/src/features/returns/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `return_routes.go` | rutas HTTP de devoluciones y los roles o permisos que exige cada una | los controllers de devoluciones y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/returns/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `return_service.go` | reglas de negocio de devoluciones: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de devoluciones; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/sales/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `invoice_controller.go` | controlador HTTP de ventas: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de ventas y core/utils (respuestas y errores); los registra routes |
| `sale_controller.go` | controlador HTTP de ventas: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de ventas y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/sales/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sale_dto.go` | formas de lo que entra y sale por la API en ventas (peticiones y respuestas) | los controllers y services de ventas |

### `importadoraApi/src/features/sales/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sale_invoice_repo.go` | facturas de los pedidos y la facturación de la bodega | SaleRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_repo.go) |
| `sale_item_repo.go` | renglones del pedido, su avance de etapa y el crédito del cliente | SaleRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_repo.go) |
| `sale_repo.go` | acceso a la base de ventas: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de ventas; los usan los services de ventas |
| `sale_stage_history_repo.go` | historial de etapas del pedido, cobertura de pago y asiento del crédito al facturar | core/db (DBExecutor) y core/types; los usan los services de ventas y de pagos |
| `sale_stock_repo.go` | lo que un pedido toca de otras tablas: stock bloqueado, vendedor, pago por transferencia y transportadora | SaleRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_repo.go) |

### `importadoraApi/src/features/sales/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sale_routes.go` | rutas HTTP de ventas y los roles o permisos que exige cada una | los controllers de ventas y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/sales/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sale_actor_service.go` | saber qué empleado hace una acción sobre un pedido: el empleado mismo, o el empleado ligado al administrador | sale_controller (lo llama en cada acción) y el repositorio de ventas (consulta admins.employee_id) |
| `sale_history_service.go` | historial de etapas de un pedido (quién lo movió, cuándo entró y salió de cada etapa) | SaleService (mismo servicio) y sale_stage_history_repo; lo llama SaleController.StageHistory |
| `sale_invoice_service.go` | facturas de los pedidos: emitir y consultar | SaleService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_service.go) |
| `sale_query_service.go` | consulta de pedidos: detalle y listado | SaleService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_service.go) |
| `sale_rules_test.go` | pruebas de las reglas puras del pedido: validación de la petición de crear y orden de las etapas | sale_validation.go y sale_stage_rules.go |
| `sale_service.go` | reglas de negocio de ventas: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de ventas; los llama el controller y la conexión llega del contenedor |
| `sale_stage_rules.go` | reglas del orden de las etapas del pedido: desde qué etapas se permite cada acción | sale_stage_service y sale_invoice_service (las llaman antes de mover el pedido) |
| `sale_stage_service.go` | etapas del pedido: verificación, alistamiento, empaque, despacho, envío y cancelación | SaleService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_service.go) |
| `sale_validation.go` | revisa la petición de crear un pedido antes de tocar la base: método de pago, condición, cliente, cantidades y descuentos | sale_service.Create; devuelve errores 400 con código para que el frontend muestre el motivo exacto |

### `importadoraApi/src/features/screensaver/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `screensaver_controller.go` | lee y guarda la imagen del protector (GET y POST/PUT de /settings/screensaver) | screensaver_service y screensaver_dto |

### `importadoraApi/src/features/screensaver/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `screensaver_dto.go` | formas de entrada y salida de /settings/screensaver (la imagen del protector y si está activo) | screensaver_controller y screensaver_service |

### `importadoraApi/src/features/screensaver/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `screensaver_repo.go` | SQL de la tabla screensaver_settings (una fila por compañía) | screensaver_service |

### `importadoraApi/src/features/screensaver/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `screensaver_routes.go` | rutas de /settings/screensaver: GET público (el protector lo lee antes de iniciar sesión); POST y PUT exigen settings.edit | screensaver_controller y core/bootstrap |

### `importadoraApi/src/features/screensaver/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `screensaver_service.go` | lee y guarda la imagen del protector de pantalla de la compañía | screensaver_repo y screensaver_controller |

### `importadoraApi/src/features/staff/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `admin_controller.go` | controlador HTTP de personal (administradores, empleados, roles y permisos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de personal (administradores, empleados, roles y permisos) y core/utils (respuestas y errores); los registra routes |
| `employee_controller.go` | controlador HTTP de personal (administradores, empleados, roles y permisos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de personal (administradores, empleados, roles y permisos) y core/utils (respuestas y errores); los registra routes |
| `permission_controller.go` | controlador HTTP de personal (administradores, empleados, roles y permisos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de personal (administradores, empleados, roles y permisos) y core/utils (respuestas y errores); los registra routes |
| `role_controller.go` | controlador HTTP de personal (administradores, empleados, roles y permisos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de personal (administradores, empleados, roles y permisos) y core/utils (respuestas y errores); los registra routes |
| `staff_controller.go` | controlador HTTP de personal (administradores, empleados, roles y permisos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de personal (administradores, empleados, roles y permisos) y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/staff/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `staff_dto.go` | formas de lo que entra y sale por la API en personal (administradores, empleados, roles y permisos) (peticiones y respuestas) | los controllers y services de personal (administradores, empleados, roles y permisos) |

### `importadoraApi/src/features/staff/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `admin_repo.go` | acceso a la base de personal (administradores, empleados, roles y permisos): aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de personal (administradores, empleados, roles y permisos); los usan los services de personal (administradores, empleados, roles y permisos) |
| `employee_access_repo.go` | credenciales, permisos, desbloqueo y vendedores | EmployeeRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en employee_repo.go) |
| `employee_repo.go` | acceso a la base de personal (administradores, empleados, roles y permisos): aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de personal (administradores, empleados, roles y permisos); los usan los services de personal (administradores, empleados, roles y permisos) |
| `permission_repo.go` | acceso a la base de personal (administradores, empleados, roles y permisos): aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de personal (administradores, empleados, roles y permisos); los usan los services de personal (administradores, empleados, roles y permisos) |
| `role_repo.go` | acceso a la base de personal (administradores, empleados, roles y permisos): aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de personal (administradores, empleados, roles y permisos); los usan los services de personal (administradores, empleados, roles y permisos) |

### `importadoraApi/src/features/staff/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `staff_routes.go` | rutas HTTP de personal (administradores, empleados, roles y permisos) y los roles o permisos que exige cada una | los controllers de personal (administradores, empleados, roles y permisos) y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/staff/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `staff_employee_access_service.go` | credenciales, permisos y desbloqueo de empleados | StaffService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en staff_employee_service.go) |
| `staff_employee_service.go` | empleados: datos, credenciales, permisos asignados y desbloqueo | StaffService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en staff_service.go) |
| `staff_role_service.go` | roles y permisos: listar, crear, actualizar y desactivar roles | StaffService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en staff_service.go) |
| `staff_service.go` | reglas de negocio de personal (administradores, empleados, roles y permisos): valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de personal (administradores, empleados, roles y permisos); los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/swagger/controllers/assets/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.html` | Módulo index.html | Módulos internos de la capa |
| `swagger.json` | Módulo swagger.json | Módulos internos de la capa |

### `importadoraApi/src/features/swagger/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `swagger_controller.go` | controlador para servir la especificación OpenAPI y la interfaz Swagger UI | swagger_routes.go y los assets embebidos swagger.json e index.html |

### `importadoraApi/src/features/swagger/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `swagger_routes.go` | rutas públicas para la documentación técnica interactiva Swagger | controllers.SwaggerController y bootstrap/router.go |

### `importadoraApi/src/features/swagger/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `swagger_test.go` | Pruebas unitarias de swagger | swagger (suite de pruebas) |

### `importadoraApi/src/features/wallet/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet_controller.go` | controlador HTTP de cartera: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de cartera y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/wallet/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet_dto.go` | formas de lo que entra y sale por la API en cartera (peticiones y respuestas) | los controllers y services de cartera |

### `importadoraApi/src/features/wallet/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet_repo.go` | acceso a la base de cartera: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de cartera; los usan los services de cartera |

### `importadoraApi/src/features/wallet/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet_routes.go` | rutas HTTP de cartera y los roles o permisos que exige cada una | los controllers de cartera y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/wallet/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet_service.go` | reglas de negocio de cartera: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de cartera; los llama el controller y la conexión llega del contenedor |

### `importadoraApi/src/features/warehouses/controllers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouse_controller.go` | controlador HTTP de bodegas: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de bodegas y core/utils (respuestas y errores); los registra routes |
| `warehouse_location_controller.go` | controlador HTTP de bodegas: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio | los services y dtos de bodegas y core/utils (respuestas y errores); los registra routes |

### `importadoraApi/src/features/warehouses/dtos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouse_dto.go` | formas de lo que entra y sale por la API en bodegas (peticiones y respuestas) | los controllers y services de bodegas |

### `importadoraApi/src/features/warehouses/repositories/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouse_facturation_repo.go` | facturación de la bodega y sus series de documentos | WarehouseRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en warehouse_repo.go) |
| `warehouse_location_repo.go` | ubicaciones (estantes y pasillos) de la bodega | WarehouseRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en warehouse_repo.go) |
| `warehouse_repo.go` | acceso a la base de bodegas: aquí vive el SQL; cada método recibe la conexión o la transacción | core/db (DBExecutor) y los dtos de bodegas; los usan los services de bodegas |

### `importadoraApi/src/features/warehouses/routes/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouse_routes.go` | rutas HTTP de bodegas y los roles o permisos que exige cada una | los controllers de bodegas y core/middlewares (autenticación y permisos); los arma core/bootstrap |

### `importadoraApi/src/features/warehouses/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouse_facturation_service.go` | facturación de la bodega y sus series de documentos | WarehouseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en warehouse_service.go) |
| `warehouse_location_service.go` | ubicaciones (estantes y pasillos) de la bodega | WarehouseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en warehouse_service.go) |
| `warehouse_service.go` | reglas de negocio de bodegas: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas | los repositories y dtos de bodegas; los llama el controller y la conexión llega del contenedor |
| `warehouse_write_service.go` | altas, cambios y baja de bodegas y su respuesta | WarehouseService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en warehouse_service.go) |

---

## 5. Archivos de Configuración de Raíz (`importadoraInterfaz` e `importadoraApi`)

| Proyecto | Archivo | Qué hace |
|---|---|---|
| `importadoraInterfaz` | `index.html` | Documento base HTML5 que monta `/src/main.tsx`. |
| `importadoraInterfaz` | `package.json` | Manifiesto de dependencias y scripts (`dev`, `build`, `lint`, `test`, `check:api`). |
| `importadoraInterfaz` | `vite.config.ts` | Configuración de empaquetado Vite, alias `@` y división de chunks (`vendor-react`, `vendor-redux`). |
| `importadoraInterfaz` | `tsconfig*.json` · `eslint.config.js` | Reglas estrictas de TypeScript y linter ESLint sin errores ni advertencias. |
| `importadoraApi` | `go.mod` · `go.sum` | Definición del módulo Go (`importadoraApi`) y dependencias (`echo/v4`, `pgx/v5`, `gorm`, `jwt/v5`). |
| `importadoraApi` | `src/core/db/startdb.pgsql` | Script SQL maestro transaccional con las 55 tablas/vistas, 20 triggers, índices GIN y semillas iniciales. |

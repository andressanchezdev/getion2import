# Estructura y archivos de `appImportadoraIp`

Generado a partir de la cabecera de comentario de cada archivo: **qué hace** y **con qué conecta**. Las carpetas reservadas `global2/` y `features2/` no se tocan.

## Cómo leer la estructura

- **Sentido de las dependencias:** `app → features → global → api`. Una feature usa a otra solo por su `index.ts`.
- **Dentro de una feature (de abajo hacia arriba):** `types → constants/mocks → helpers → services/selectors → slices → thunks → hooks → components → screens`.
- **Regla de orden:** una carpeta no pasa de ~8 archivos; si crece, se agrupa en subcarpetas con nombre lógico por función (`productCard/`, `catalog/`, `cart/`, `billing/`…).
- **Pareja de archivos:** cada componente `.tsx` lleva al lado su `.css` con el mismo nombre.

## Resumen por carpeta de primer nivel

| Carpeta | Qué contiene |
|---|---|
| `src/api/` | Capa de acceso al backend REST (axios, endpoints, errores y salud). |
| `src/app/` | El shell de la aplicación: layout, store y los cuatro componentes fijos. |
| `src/features/` | Toda la lógica de negocio, una carpeta por módulo. |
| `src/global/` | Piezas compartidas por todas las features. |
| `src/styles/` | Única fuente de valores visuales (colores, texto, radios, sombras, espaciado y movimiento). |
| `src/assets/` | Íconos, imágenes del login y logos. |

### `src/ (raíz)`

Raíz de `src`: arranque de la app y estilos base.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `App.css` | reset y estilos base de la app; importa los tokens | estilos de App |
| `App.tsx` | raíz de la app, solo monta StoreApp | app/layout/StoreApp y global AppToaster (alertas flotantes) |
| `main.tsx` | punto de entrada: monta la app en el #root del index.html | index.html (el script apunta aquí), App.tsx y App.css |

### `src/api/`

Capa de acceso al backend REST (axios, endpoints, errores y salud).

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `client.ts` | instancia de axios con token Bearer y manejo de errores | api/config, api/types; lo usarán los services de cada feature |
| `config.ts` | URL base, timeout y endpoints del backend | api/client, api/health; scripts/check-endpoints.mjs revisa que cada ruta exista en el Swagger (npm run check:api) |
| `errors.ts` | traduce cualquier error de axios (red, timeout o HTTP) a un AppApiError legible para el cliente | api/client (interceptores) y features/auth (mensaje de login); ojo: antes vivía dentro de client.ts |
| `health.ts` | prueba de conexión con el backend y latencia en ms | api/client y api/config (HEALTH.CHECK); lo usa global/hooks/useApiHealth para mostrar la latencia en el footer del menú |
| `index.ts` | API pública de la capa api | features y app (importan desde aquí) |
| `pagination.test.ts` | pruebas de la conversión de la respuesta de un listado a { items, meta } | api/pagination; se corre con npm test |
| `pagination.ts` | valores por defecto de página y conversión de la respuesta de un listado a una página lista para la UI | api/types (PageRequest, Paginated); lo usarán los services de cada feature que liste datos (productos, clientes, cartera...) |

### `src/api/types/`

Tipos de las respuestas de la API.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `api.types.ts` | contratos de respuesta, paginación y error de la API | api/client, api/health |

### `src/app/componentApp/contentMain/`

Contenido central: elige la pantalla según el módulo y la subgestión.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `MainContent.css` | estilos del lienzo central | estilos de MainContent |
| `MainContent.tsx` | lienzo central: muestra la pantalla según el módulo y subitem activos con guardia de permisos | navigation (estado ui), usePermissions (hasScreenAccess), screenRegistry y MainContentPlaceholder |
| `MainContentPlaceholder.css` | estilos del aviso de módulo aún sin pantalla (Próxima Fase) | estilos de MainContentPlaceholder |
| `MainContentPlaceholder.tsx` | aviso de módulo o subgestión que todavía no tiene pantalla ("Próxima Fase") | MainContent (cuando screenRegistry no devuelve pantalla); título e ícono de navigation |
| `screenRegistry.ts` | mapa de qué pantalla de feature se muestra por módulo y subgestión | MainContent (pide la pantalla); las pantallas vienen de features/shop, wallet, customers, sales, reports, suppliers, inventory, management, quotations, transfers y employees |

### `src/app/componentApp/drawerRight/`

Panel derecho contextual: carrito u objeto seleccionado.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `DrawerRight.css` | estilos del contenedor del panel derecho (ancho animado y cuerpo con scroll) | estilos de DrawerRight |
| `DrawerRight.tsx` | panel derecho contextual: carrito en el catálogo, o detalle del objeto seleccionado; en cualquier otro caso no se muestra | drawerRegistry (modo y contenido), DrawerHeader, DrawerTab (carrito contraído), useDrawerPresence (animación de salida), global useEscapeKey |
| `drawerRegistry.ts` | define cuándo se abre el panel derecho y qué muestra en cada caso | DrawerRight (lo consulta); contenido de features/shop (carrito), features/wallet (estado de cuenta) y features/customers (cliente abierto) |
| `useDrawerPresence.ts` | deja el panel montado mientras se cierra, para que se pueda ver la animación de salida | DrawerRight; recibe el modo actual (o null) y devuelve qué modo mostrar, si está montado y si está abierto |

### `src/app/componentApp/drawerRight/parts/`

Piezas del panel: encabezado único y pestaña del carrito contraído.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `DrawerHeader.css` | estilos del encabezado único del panel derecho | estilos de DrawerHeader |
| `DrawerHeader.tsx` | encabezado único del panel derecho: ícono, título, detalle y botón cerrar | DrawerRight (le pasa el ícono, los textos de la feature y la acción de cerrar) |
| `DrawerTab.css` | estilos de la pestaña lateral del carrito contraído | estilos de DrawerTab |
| `DrawerTab.tsx` | pestaña lateral con el contador del carrito cuando el panel está contraído | DrawerRight (le pasa el ícono, el conteo y la acción de volver a abrir) |

### `src/app/componentApp/header/`

Barra superior con el nombre del sistema.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AppHeader.css` | estilos de la barra superior | estilos de AppHeader |
| `AppHeader.tsx` | barra superior: logo con el nombre del sistema y el selector de bodega | WarehouseSelector (bodega activa); ojo: el estado de la API (latencia) ahora se muestra en el footer del menú (ApiStatus) |

### `src/app/componentApp/header/warehouse/`

Selector de bodega y su menú desplegable.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `WarehouseMenu.css` | estilos del menú desplegable de bodegas | estilos de WarehouseMenu |
| `WarehouseMenu.tsx` | lista desplegable de bodegas disponibles con la activa marcada | WarehouseSelector (le pasa la lista de bodegas del backend y la activa, y recibe la elegida); tipo Warehouse de features/warehouses |
| `WarehouseSelector.css` | estilos del botón selector de bodega del encabezado | estilos de WarehouseSelector |
| `WarehouseSelector.tsx` | botón que muestra la bodega activa y abre el menú para cambiarla | navigation (bodega activa), features/warehouses (lista del backend y elección de la activa), auth (bodega del usuario), global useClickOutside (cierra con clic fuera o Escape) |

### `src/app/componentApp/sideMenu/`

Menú lateral: contenedor.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `SideMenu.css` | estilos del contenedor del menú lateral (lista y footer) | estilos de SideMenu |
| `SideMenu.tsx` | menú lateral: lista de módulos con sus subgestiones y, abajo, el estado de la API y el usuario | navigation (MENU_ITEMS y acciones del estado ui); partes: SideMenuItem, ApiStatus y SideMenuUser |

### `src/app/componentApp/sideMenu/footer/`

Pie del menú: estado de la API y usuario con cerrar sesión.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ApiStatus.css` | estilos del estado de la API en el footer del menú | estilos de ApiStatus |
| `ApiStatus.tsx` | estado de la conexión con la API en el footer del menú (conectando, en línea con ms, o sin conexión) | global useApiHealth (consulta); ojo: antes este indicador estaba en el header |
| `SideMenuUser.css` | estilos de la tarjeta de usuario del menú lateral | estilos de SideMenuUser |
| `SideMenuUser.tsx` | tarjeta del usuario en el footer del menú (avatar con iniciales, nombre, rol y botón de cerrar sesión) | features/auth (usuario de la sesión y logoutThunk); las iniciales salen de global/helpers/format; la confirmación es global/.../ConfirmDialog |

### `src/app/componentApp/sideMenu/item/`

Cada módulo del menú y sus subgestiones.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `SideMenuItem.css` | estilos de cada módulo del menú y de su animación de selección | estilos de SideMenuItem |
| `SideMenuItem.tsx` | un módulo del menú (ícono, nombre, insignia y flecha) con sus subgestiones debajo | SideMenu (le pasa el módulo y recibe los clics), SideMenuSubitems (la lista que se despliega) |
| `SideMenuSubitems.css` | estilos de las subgestiones del menú (se despliegan animando la altura) | estilos de SideMenuSubitems |
| `SideMenuSubitems.tsx` | lista de subgestiones de un módulo; se despliega animando su altura cuando el módulo está activo | SideMenuItem (subitems, si está abierta y cuál está activo); el id de cada subgestión sale de navigation |

### `src/app/layout/`

Provider de redux, puerta de entrada (login o ERP) y layout del ERP.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AuthGate.tsx` | puerta de entrada: sin sesión muestra el login, con sesión muestra el ERP | features/auth (selector y pantalla de login) y ErpLayout |
| `ErpLayout.css` | estilos del layout del ERP (header, cuerpo con menú, contenido y drawer) | estilos de ErpLayout |
| `ErpLayout.tsx` | layout del ERP: header, menú lateral, contenido central y drawer derecho | componentApp/* (header, sideMenu, contentMain, drawerRight) y features/realtime (useRealtime) y features/auth (useSessionActivity) y features/shop (useCartSync); lo muestra AuthGate cuando hay sesión |
| `StoreApp.tsx` | raíz de la app con el store de redux: pone el Provider y la puerta de entrada (login o ERP) | app/store (store) y AuthGate |

### `src/app/store/`

Configuración de redux, persistencia y reducers raíz.

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `rootReducer.ts` | junta los reducers de cada feature (ui, shop, products, cart, wallet, customers, sales, reports, suppliers, inventory, management, quotations, catalogs, warehouses, auth, realtime) | features/*/index, app/store/store |
| `store.ts` | configura redux + persistencia y exporta los tipos RootState y AppDispatch | rootReducer, global/helpers/storage; ojo: antes se llamaba store.tsx (no tenía JSX) |

### `src/assets/icons/`

36 íconos SVG. Los usados hoy: store, wallet, cart, database, package, user, file-text, building y logout; el resto queda como biblioteca de reserva.

### `src/assets/images/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `login-fondo.webp` | Fondo de la pantalla de login (copiado de importadora-online) | LoginScreen.css |
| `login-ilustracion.svg` | Ilustración del login (23,5 MB → 0,7 MB, mismas formas) | LoginHero |

### `src/assets/logos/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `icon.ico` | Ícono de la marca | reserva |

### `src/features/auth/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature auth (autenticación y sesión de usuario) | AuthGate (pantalla y selector), SideMenuUser (usuario y logout), rootReducer (reducer), store (logout por 401), ErpLayout (useSessionActivity) |

### `src/features/auth/components/branding/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `LoginBrand.css` | estilos de la marca del login (copia del diseño de importadora-online) | estilos de LoginBrand |
| `LoginBrand.tsx` | marca del login: logo "IP" sobre cuadro oscuro y la palabra "Online" | LoginForm (va arriba del formulario); el texto sale de auth.constants |
| `LoginHero.css` | estilos de la ilustración del login (copia del diseño de importadora-online) | estilos de LoginHero |
| `LoginHero.tsx` | ilustración grande del lado izquierdo del login | LoginScreen (la coloca sobre el fondo); la imagen es assets/images/login-ilustracion.svg |
| `LoginWelcome.css` | estilos del saludo del login (copia del diseño de importadora-online) | estilos de LoginWelcome |
| `LoginWelcome.tsx` | título "Bienvenido" y frase de bienvenida del login | LoginForm (va entre la marca y los campos); los textos salen de auth.constants |

### `src/features/auth/components/form/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `LoginActions.css` | estilos de los botones del login (copia del diseño de importadora-online) | estilos de LoginActions |
| `LoginActions.tsx` | botones del login: "Iniciar sesión" (envía el formulario) y "Registrarse" | LoginForm (le dice si está ingresando); el envío lo maneja el <form> con useLoginForm |
| `LoginForm.css` | estilos del formulario del login (copia del diseño de importadora-online) | estilos de LoginForm |
| `LoginForm.tsx` | formulario del login: marca, saludo, campos, opciones y botones | useLoginForm (estado y envío) y las partes LoginBrand, LoginWelcome, LoginInput, LoginOptions y LoginActions |
| `LoginInput.css` | estilos del campo del login (copia del diseño de importadora-online) | estilos de LoginInput |
| `LoginInput.tsx` | campo de texto del login (correo o contraseña) con borde izquierdo amarillo | LoginForm (le pasa valor y cambio); props en types/auth.login.types |
| `LoginOptions.css` | estilos de la fila recordarme / olvidé mi contraseña (copia del diseño de importadora-online) | estilos de LoginOptions |
| `LoginOptions.tsx` | fila bajo los campos: "Recordarme" y "¿Has olvidado tu contraseña?" | LoginForm (recordarme y su cambio); useLoginForm decide dónde se guarda la sesión |

### `src/features/auth/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.constants.ts` | textos del login (lo que ve el cliente, en español) | los componentes del login y useLoginForm (mensajes) |
| `auth.session.constants.ts` | tiempos y eventos que usa el control de sesión (inactividad y renovación) | useSessionActivity; los textos de las alertas están en auth.constants (LOGIN_MESSAGES) |

### `src/features/auth/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.helpers.ts` | funciones puras del login: validar campos, armar el nombre y traducir errores | useLoginForm (validación), auth.thunks (mensaje de error), SideMenuUser (nombre) |
| `auth.session.ts` | puente entre la sesión guardada en el navegador y el estado de auth | global/helpers/session.storage (guarda y lee), auth.slice (estado inicial) y auth.thunks (guardar y borrar) |
| `auth.token.test.ts` | pruebas de la lectura del vencimiento (exp) de un JWT y de cuándo toca renovarlo | auth.token; se corre con npm test |
| `auth.token.ts` | lee la fecha de vencimiento (exp) de un JWT y dice cuánto falta o si ya toca renovarlo | useSessionActivity (decide cuándo renovar); no valida la firma, solo lee el tiempo del propio token |

### `src/features/auth/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useLoginForm.ts` | estado y envío del formulario de login (correo, contraseña, recordarme) con alertas flotantes | auth.helpers (validación), auth.thunks (login), auth.selectors (¿ingresando?), global toast; lo usa LoginForm |
| `useSessionActivity.ts` | vigila la sesión mientras el usuario está dentro: cierra por inactividad y renueva el token en silencio | auth.thunks (logoutThunk y refreshSessionThunk), auth.token (vencimiento del JWT), auth.session (token guardado) y auth.session.constants (tiempos); lo monta ErpLayout |

### `src/features/auth/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `LoginScreen.css` | estilos de la pantalla de login (copia del diseño de importadora-online) | estilos de LoginScreen |
| `LoginScreen.tsx` | pantalla completa de login: fondo, ilustración a la izquierda y panel blanco con el formulario | LoginHero y LoginForm; la muestra AuthGate cuando no hay sesión |
| `ModulePermissionRow.tsx` | fila de módulo y sus pantallas hijas en la matriz de permisos | permissions.types, navigation.types, RolesPermissionsScreen y tokens.css |
| `RolesPermissionsScreen.css` | estilos de la matriz de roles y permisos jerárquicos | estilos de RolesPermissionsScreen |
| `RolesPermissionsScreen.tsx` | (DEPRECADO: Migrado a @/features/employees/screens/RolesPermissionsScreen.tsx) |  |

### `src/features/auth/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.selectors.test.ts` | pruebas del contexto de petición (companyId, userId, bodega y nivel de precio) | auth.selectors; se corre con npm test |
| `auth.selectors.ts` | lecturas simples del estado de la sesión y el contexto de petición | AuthGate (¿hay sesión?), SideMenuUser (usuario), LoginForm (¿está ingresando?) y los thunks de las demás features (selectRequestContext) |

### `src/features/auth/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.service.ts` | llamadas al backend de la sesión: iniciar (POST /auth/login), renovar (POST /auth/refresh) y cerrar (POST /auth/logout) | api/client (axios con interceptores) y api/config (endpoint); la usa auth.thunks |
| `permissions.service.test.ts` | pruebas unitarias de los endpoints de permisos de empleados | permissions.service, apiClient y vitest |
| `permissions.service.ts` | (DEPRECADO: Migrado a @/features/employees/services/employees.service.ts) |  |

### `src/features/auth/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.slice.ts` | estado de la sesión: usuario, estado (anónimo, ingresando, autenticado) y último error | auth.thunks (login/logout), auth.selectors (lecturas) y AuthGate (decide login o ERP) |

### `src/features/auth/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.thunks.ts` | acciones asíncronas de la sesión: iniciar, renovar y cerrar sesión | auth.service (login, refresh, logout), auth.session (guardar/borrar) y auth.slice (reacciona a los resultados); useSessionActivity y SideMenuUser los despachan |

### `src/features/auth/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `auth.login.types.ts` | props de las partes del formulario de login | LoginInput, LoginOptions y LoginActions (las compone LoginForm) |
| `auth.types.ts` | contratos de la sesión: usuario, credenciales, respuesta del login y estado del slice | auth.service, auth.slice, auth.thunks, auth.selectors y los componentes del login |
| `permissions.types.ts` | (DEPRECADO: Migrado a @/features/employees/types/employees.types.ts) |  |

### `src/features/catalogs/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature catalogs (marcas, categorías y modelos de moto) | rootReducer (reducer), screenRegistry (CatalogsScreen), ShopCatalogScreen (useLoadCatalogs), ShopCatalogToolbar y ShopCatalogFilters (nombres para los filtros) |

### `src/features/catalogs/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.constants.ts` | tamaño de página y estado inicial de los catálogos | catalogs.service (cuántos registros pide) y catalogs.slice (initialState) |

### `src/features/catalogs/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.adapter.test.ts` | pruebas de la conversión de marcas, categorías y modelos del backend a los de la app | catalogs.adapter; se corre con npm test |
| `catalogs.adapter.ts` | convierte lo que responde el backend (brandId, categoryId, modelId) a la forma que usa la app (id, name) | catalogs.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend |

### `src/features/catalogs/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useLoadCatalogs.ts` | pide las marcas, categorías y modelos al backend la primera vez que una pantalla los necesita | ShopCatalogScreen (la usa al montarse); despacha catalogs.thunks y lee el estado de catalogs.selectors |

### `src/features/catalogs/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CatalogsScreen.css` | estilos de la pantalla de marcas, categorías y modelos (pestañas, búsqueda y lista) | estilos de CatalogsScreen |
| `CatalogsScreen.tsx` | pantalla de Gestión Inventario > Marcas y Categorías: consulta de marcas, categorías y modelos de moto con búsqueda y conteo | catalogs.selectors (listas y estados), useLoadCatalogs (las pide), global SearchBar; la monta MainContent (screenRegistry) |

### `src/features/catalogs/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.selectors.test.ts` | pruebas de los nombres de marcas y categorías que alimentan los filtros | catalogs.selectors; se corre con npm test |
| `catalogs.selectors.ts` | lecturas de los catálogos: listas completas y solo los nombres (para los selectores de filtro) | ShopCatalogToolbar (marcas) y ShopCatalogFilters (categorías); leen state.catalogs |

### `src/features/catalogs/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.service.test.ts` | pruebas de las llamadas de catálogos: la ruta, el cuerpo que se envía y la conversión de la respuesta | catalogs.service; el cliente HTTP está simulado (no hay red) |
| `catalogs.service.ts` | llamadas al backend de los catálogos: POST /brands, POST /categories y POST /models | api/client y api/config (rutas), catalogs.adapter (convierte la respuesta); las usa catalogs.thunks |

### `src/features/catalogs/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.slice.ts` | estado de los catálogos (marcas, categorías y modelos): lista, estado de carga y último error de cada uno | catalogs.thunks (los llenan), catalogs.selectors (las lecturas) y rootReducer (clave 'catalogs'; no se persiste: se pide una vez por sesión) |

### `src/features/catalogs/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.thunks.test.ts` | pruebas de la carga de catálogos: éxito, error, sin sesión y estado del slice | catalogs.thunks y catalogs.slice; el service y la sesión están simulados (no hay red ni store real de la app) |
| `catalogs.thunks.ts` | acciones que cargan cada catálogo (marcas, categorías y modelos) con el contexto de la sesión | catalogs.service (llamadas), auth (selectRequestContext) y catalogs.slice (reacciona a pending, fulfilled y rejected); las despacha useLoadCatalogs |

### `src/features/catalogs/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `catalogs.types.ts` | contratos de los catálogos base (marcas, categorías y modelos de moto) y de su estado | catalogs.adapter (convierte lo del backend), catalogs.service, catalogs.slice y catalogs.selectors |

### `src/features/customers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature customers (clientes, direcciones y descuentos) | rootReducer (reducer), screenRegistry (CustomersScreen), drawerRegistry (CustomerDrawer y su encabezado) |

### `src/features/customers/components/drawer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CustomerDirectionsSection.tsx` | direcciones del cliente: lista, botón de borrar y formulario para agregar una nueva | customers.selectors (direcciones y estado), customers.details.thunks (agregar), customers.constants (formulario vacío); el borrado lo confirma CustomerDrawer |
| `CustomerDiscountsSection.tsx` | descuentos del cliente: a qué aplican (producto, marca, categoría o modelo), porcentaje y botón de borrar | customers.selectors (descuentos), features/catalogs (nombres de marca, categoría y modelo); el borrado lo confirma CustomerDrawer |
| `CustomerDrawer.css` | estilos del panel del cliente (datos, direcciones, descuentos y formulario) | estilos de CustomerDrawer |
| `CustomerDrawer.tsx` | contenido del panel derecho al abrir un cliente: sus datos, "usar en la venta", direcciones y descuentos | useSelectedCustomerData (pide detalle, direcciones y descuentos), customers.selectors y customers.details.thunks, features/shop (cliente de la venta) y global ConfirmDialog (confirmar borrados); lo muestra DrawerRight (drawerRegistry, modo "customer") |
| `CustomerInfoSection.tsx` | datos del cliente en el panel: documento, correo, nivel de precio, comisión y datos de la empresa | CustomerDrawer (le pasa el estado del detalle); los datos vienen de GET /users/{id} (customers.selectors → selectCustomerDetail) |

### `src/features/customers/components/modal/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreateCustomerModal.css` | estilos del modal de registro rápido de cliente | estilos de CreateCustomerModal |
| `CreateCustomerModal.tsx` | modal blindado de registro de clientes con validación asíncrona | ValidatedInput, validation.helpers, useAsyncValidation y POST /users/quick-register |

### `src/features/customers/components/table/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CustomersTable.css` | estilos de la tabla de clientes | estilos de CustomersTable |
| `CustomersTable.tsx` | tabla de clientes: una fila por cliente (avatar con iniciales, nombre, documento, contacto y tipo); al hacer clic abre su panel | customers.selectors (lista visible, estado y cliente abierto), customers.slice (selectCustomer) y global format (iniciales); la pinta CustomersScreen |

### `src/features/customers/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.constants.ts` | tamaños de página, textos y estado inicial de clientes | customers.service (cuántos pide), customers.slice (initialState) y los componentes (textos) |

### `src/features/customers/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.adapter.test.ts` | pruebas de la conversión de usuarios, direcciones y descuentos del backend y del filtro por texto | customers.adapter; se corre con npm test |
| `customers.adapter.ts` | convierte lo que responde el backend (usuarios, direcciones y descuentos) a lo que usa la app, y filtra la lista por texto | customers.service y customers.details.service (lo aplican a cada respuesta); customers.selectors (filterCustomers); es el único lugar que conoce los nombres del backend |

### `src/features/customers/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCustomersLoader.ts` | pide la lista de clientes al backend la primera vez y cada vez que cambia la página | CustomersScreen (lo usa al montarse); despacha customers.thunks y lee customers.selectors y la sesión de auth |
| `useSelectedCustomerData.ts` | cuando se abre un cliente pide su detalle, sus direcciones y sus descuentos | CustomerDrawer (lo usa al montarse); despacha customers.thunks y customers.details.thunks |

### `src/features/customers/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CustomersScreen.css` | estilos de la pantalla de clientes (tarjeta con barra y tabla) | estilos de CustomersScreen |
| `CustomersScreen.tsx` | pantalla de Terceros > Clientes: búsqueda, tabla de clientes del backend y paginador | customers.slice/selectors (lista y búsqueda), useCustomersLoader (la pide), CustomersTable y global SearchBar y Pagination; la monta MainContent (screenRegistry); al elegir un cliente se abre CustomerDrawer en el panel derecho |

### `src/features/customers/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.selectors.test.ts` | pruebas de la lista visible (búsqueda) y del encabezado del panel del cliente | customers.selectors; no usa red ni store real |
| `customers.selectors.ts` | lecturas de clientes: lista visible (con búsqueda), paginación, cliente abierto, detalle, direcciones, descuentos y datos del encabezado del panel | CustomersScreen y sus partes, CustomerDrawer y drawerRegistry (selectCustomerDrawerMeta, selectHasOpenCustomer); leen state.customers |

### `src/features/customers/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.details.service.ts` | llamadas al backend de lo que cuelga de un cliente: direcciones (listar, agregar, borrar) y descuentos (listar, borrar) | api/client y api/config, customers.adapter (convierte); las usa customers.details.thunks |
| `customers.service.test.ts` | pruebas de las llamadas de usuarios (POST /users y GET /users/{id}) y de direcciones y descuentos | customers.service y customers.details.service; el cliente HTTP está simulado (no hay red) |
| `customers.service.ts` | llamadas al backend de usuarios: POST /users (listado paginado) y GET /users/{id} (detalle) | api/client, api/config y api/pagination (toPaginated), customers.adapter (convierte); las usa customers.thunks |

### `src/features/customers/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.slice.ts` | estado de clientes: lista paginada, cliente abierto, su detalle, sus direcciones y sus descuentos | customers.thunks y customers.details.thunks (lo llenan), customers.selectors (lecturas) y rootReducer (clave 'customers'; NO se guarda en el navegador) |

### `src/features/customers/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.details.thunks.ts` | direcciones y descuentos de un cliente: cargar, agregar dirección y borrar (dirección o descuento) | customers.details.service (llamadas) y customers.slice (reacciona); los despachan useSelectedCustomerData y el panel del cliente |
| `customers.thunks.test.ts` | pruebas de la carga de clientes, su detalle, direcciones y descuentos (con el slice real) | customers.thunks, customers.details.thunks y customers.slice; los services, la sesión y las alertas están simulados (no hay red) |
| `customers.thunks.ts` | carga la lista paginada de clientes y el detalle de uno | customers.service (llamadas), auth (selectRequestContext) y customers.slice (reacciona); las despachan useCustomersLoader y useSelectedCustomerData |

### `src/features/customers/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `customers.api.types.ts` | lo que responde el backend en usuarios, direcciones y descuentos (nombres tal cual del Swagger) | customers.adapter (los convierte a los tipos de la app), customers.service y customers.details.service (los piden) |
| `customers.types.ts` | contratos de clientes (usuarios), direcciones y descuentos: lo que usa la app y el estado del slice (lo que responde el backend está en customers.api.types) | customers.adapter, customers.slice, customers.selectors, los thunks y los componentes |

### `src/features/employees/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature employees | screenRegistry, usePermissions, auth.types y UI |

### `src/features/employees/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `employees.adapter.ts` | convierte lo que responde el backend en empleados y roles a lo que usa la app | employees.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en empleados |
| `employees.permissions.test.ts` | pruebas de la matriz de permisos: lo que el servidor no trae queda en solo lectura | employees.permissions y MENU_ITEMS (navigation); se corre con npm test |
| `employees.permissions.ts` | arma la matriz de permisos por módulo y pantalla a partir de lo que devuelve el servidor | RolesPermissionsScreen y MENU_ITEMS (navigation); lo que el servidor no trae se completa como SOLO LECTURA (nunca crear, editar ni anular) |

### `src/features/employees/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `EmployeesScreen.css` | estilos del directorio de personal interno | estilos de EmployeesScreen |
| `EmployeesScreen.tsx` | directorio de personal interno, sedes asignadas y cargos laborales | employees.service (POST /employees), Redux (user, warehouses, navigation) y tokens.css |
| `ModulePermissionRow.tsx` | fila de módulo y sus pantallas hijas en la matriz de permisos | employees.types, navigation.types, RolesPermissionsScreen y tokens.css |
| `RolesPermissionsScreen.css` | estilos de la matriz de roles y permisos jerárquicos | estilos de RolesPermissionsScreen |
| `RolesPermissionsScreen.tsx` | matriz interactiva de asignación de roles y permisos por empleado | employees.service, ModulePermissionRow, MENU_ITEMS y usePermissions |

### `src/features/employees/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `employees.service.test.ts` | pruebas de los endpoints de empleados, roles y permisos con las formas reales del backend | employees.service; el cliente HTTP está simulado (no hay red) |
| `employees.service.ts` | llamadas al backend de empleados: POST /employees (directorio), GET /employees/roles, POST /employees/permissions, guardar permisos y credenciales | api/client y api/config, employees.adapter (convierte), employees.api.types y las pantallas de empleados y roles |

### `src/features/employees/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `employees.api.types.ts` | lo que responde el backend en empleados, roles y permisos (nombres tal cual del Swagger y de las respuestas reales) | employees.adapter (los convierte a los tipos de la app) y employees.service (los pide) |
| `employees.types.ts` | contratos de empleados, roles y permisos jerárquicos (Swagger) | employees.service, RolesPermissionsScreen, EmployeesScreen y usePermissions |

### `src/features/inventory/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature inventory (control de productos: existencias, reservado y disponible) | rootReducer (reducer) y screenRegistry (ProductControlScreen) |

### `src/features/inventory/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.constants.ts` | tamaños de página y estado inicial del control de inventario | inventory.thunks (cuántos pide) y inventory.slice (initialState) |

### `src/features/inventory/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.adapter.test.ts` | pruebas de la conversión de productos del control de inventario (forma real de /inventory/filter) | inventory.adapter; se corre con npm test |
| `inventory.adapter.ts` | convierte los productos de control de inventario del backend a lo que usa la app | inventory.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en control de inventario |

### `src/features/inventory/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useInventoryLoader.ts` | pide al backend el control de inventario al abrir la pantalla y al cambiar de página, búsqueda, filtro o bodega | ProductControlScreen; despacha inventory.thunks y lee la sesión (auth), la bodega (navigation) y el estado de inventario |

### `src/features/inventory/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductControlScreen.css` | estilos de la pantalla de control de productos (tarjeta con barra y tabla) | estilos de ProductControlScreen |
| `ProductControlScreen.tsx` | pantalla de Gestión Inventario > Control de Productos: existencias por producto y bodega, reservado, disponible y alerta de poco stock | inventory.selectors/slice (lista, búsqueda y filtro), useInventoryLoader (la pide), global SearchBar y Pagination; la monta MainContent (screenRegistry) |

### `src/features/inventory/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.selectors.ts` | lecturas del estado del control de inventario | ProductControlScreen y useInventoryLoader; leen state.inventory |

### `src/features/inventory/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.service.test.ts` | pruebas de las llamadas del control de inventario: cuerpo enviado y conversión | inventory.service; el cliente HTTP está simulado (no hay red) |
| `inventory.service.ts` | llamadas al backend del control de inventario: POST /inventory/filter (paginado, por bodega) y POST /inventory/search (texto, hasta un máximo) | api/client, api/config y api/pagination (toPaginated), inventory.adapter (convierte); las usa inventory.thunks |

### `src/features/inventory/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.slice.ts` | estado del control de inventario: lista, página, búsqueda y filtro "solo con stock" | inventory.thunks (lo llena), inventory.selectors (lecturas) y rootReducer (clave 'inventory'; NO se guarda en el navegador) |

### `src/features/inventory/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.thunks.test.ts` | pruebas de la carga del control de inventario: lista, búsqueda, filtro, error y respuestas viejas | inventory.thunks y inventory.slice; el service y la sesión están simulados (no hay red) |
| `inventory.thunks.ts` | carga el control de inventario: la página filtrada por bodega o, si hay texto, la búsqueda del backend | inventory.service (llamadas), auth (selectRequestContext), navigation (bodega activa) y inventory.slice (reacciona); lo despacha useInventoryLoader |

### `src/features/inventory/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `inventory.api.types.ts` | lo que responde el backend en el control de inventario (POST /inventory/filter y POST /inventory/search: misma forma de 54 campos) | inventory.adapter (los convierte a los tipos de la app) y inventory.service (los pide) |
| `inventory.types.ts` | tipos de la app para el control de inventario: una fila de producto con su existencia y el estado de la pantalla | inventory.adapter (los arma), inventory.slice (los guarda), inventory.selectors y ProductControlScreen |

### `src/features/management/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature management (pedidos por etapa de Gestión Caja) | rootReducer (reducer) y screenRegistry (PipelineScreen) |

### `src/features/management/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `StageOrders.css` | estilos de la lista de pedidos de una etapa (indicadores de control) | estilos de StageOrders |
| `StageOrders.tsx` | tabla con los pedidos de la etapa y el canal elegidos, con paginador | management.selectors/slice (lista y página), useStageOrdersLoader (la pide), global TableMessageRow, Pagination y DataTable.css; la monta PipelineScreen |

### `src/features/management/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `management.constants.ts` | etapas del pedido, nombres de canales y estado inicial | management.adapter (etiquetas), management.slice (initialState) y PipelineScreen |

### `src/features/management/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `management.adapter.test.ts` | pruebas de la conversión de POST /management (forma real observada) a etapas, canales y contadores | management.adapter; se corre con npm test |
| `management.adapter.ts` | convierte la respuesta de POST /management en etapas, canales y contadores de la app | management.service (lo aplica a la respuesta); es el único lugar que conoce los nombres del backend en gestión de pedidos |

### `src/features/management/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useManagementLoader.ts` | pide al backend los pedidos por etapa al abrir la pantalla y al cambiar de etapa o de bodega | PipelineScreen; despacha management.thunks y lee la sesión (auth), la bodega (navigation) y la etapa elegida |
| `useStageOrdersLoader.ts` | pide la lista de pedidos de la etapa y el canal elegidos, y la vuelve a pedir al cambiar de página, de etapa, de canal o de bodega | StageOrders; despacha management.thunks y lee la sesión (auth), la bodega (navigation) y el estado de management |

### `src/features/management/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `PipelineScreen.css` | estilos de la pantalla de pedidos por etapa (etapas en fila y tarjetas de desglose) | estilos de PipelineScreen |
| `PipelineScreen.tsx` | pantalla de Gestión Caja > Facturación Caja: cuántos pedidos hay en cada etapa y, para la etapa elegida, cómo se reparten por canal | management.selectors/slice (datos y etapa), useManagementLoader (los pide), global StatCard; la monta MainContent (screenRegistry) |

### `src/features/management/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `management.selectors.ts` | lecturas del estado de pedidos por etapa | PipelineScreen y useManagementLoader; leen state.management |

### `src/features/management/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `management.service.ts` | llamadas al backend de gestión de pedidos: POST /management (conteo por etapa y desglose por canal) y POST /management/saleOrders (lista de una etapa y un canal) | api/client y api/config, management.adapter (convierte); las usa management.thunks |

### `src/features/management/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `management.slice.ts` | estado de pedidos por etapa: etapa elegida, datos, estado y error | management.thunks (lo llena), management.selectors (lecturas) y rootReducer (clave 'management'; NO se guarda en el navegador) |

### `src/features/management/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `management.thunks.test.ts` | pruebas de la carga de pedidos por etapa: cuerpo enviado, etapa elegida, error, sin bodega y respuestas viejas | management.service/thunks/slice; el service y la sesión están simulados (no hay red) |
| `management.thunks.ts` | carga los pedidos por etapa de la bodega activa (con el desglose por canal) y la lista de pedidos de una etapa y un canal | management.service (llamada), auth (selectRequestContext), navigation (bodega activa) y management.slice (reacciona); la despacha useManagementLoader |

### `src/features/management/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `management.api.types.ts` | lo que responde POST /management (nombres tal cual de la respuesta real, incluidos los errores de escritura del backend) | management.adapter (lo convierte a las etapas y canales de la app) y management.service (lo pide) |
| `management.types.ts` | tipos de la app para pedidos por etapa: etapas, desglose por canal y estado de la pantalla | management.adapter (los arma), management.slice (los guarda), management.selectors y PipelineScreen |

### `src/features/navigation/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature (lo único que deben importar otras features y app) |  |

### `src/features/navigation/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `menuItems.constants.ts` | lista fija del menú lateral (módulos y subgestiones) | SideMenu (lo pinta), navigation.slice (elige el primer subitem), MainContent (decide la pantalla) |
| `navigation.constants.ts` | estado inicial de la navegación (módulo, subgestión, bodega y caja de arranque) | navigation.slice (initialState) |

### `src/features/navigation/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `navigation.helpers.ts` | funciones simples para leer el menú sin repetir lógica | MainContent (título), menuItems.constants (fuente de datos) |

### `src/features/navigation/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `navigation.slice.ts` | estado de navegación (clave 'ui'): módulo, subitem, bodega y usuario activos | SideMenu, MainContent, DrawerRight, AppHeader (leen/disparan estas acciones) |

### `src/features/navigation/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `navigation.types.ts` | contratos del menú y del estado de navegación (ui) | menuItems.constants, navigation.slice, SideMenu, MainContent, DrawerRight |

### `src/features/quotations/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature quotations (cotizaciones de solo consulta) | rootReducer (reducer) y screenRegistry (QuotationsScreen) |

### `src/features/quotations/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.constants.ts` | tamaño de página, estados con su texto y estado inicial de cotizaciones | quotations.adapter y QuotationsScreen (textos), quotations.thunks (cuántas pide) y quotations.slice (initialState) |

### `src/features/quotations/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.adapter.test.ts` | pruebas de la conversión de cotizaciones del backend (forma real de POST /quotations y GET /quotations/stats) | quotations.adapter; se corre con npm test |
| `quotations.adapter.ts` | convierte lo que responde el backend en cotizaciones (lista y totales) a lo que usa la app | quotations.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en cotizaciones |

### `src/features/quotations/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useQuotationsLoader.ts` | pide al backend los totales al abrir la pantalla y la lista al abrirla y al cambiar de página o de filtro de estado | QuotationsScreen; despacha quotations.thunks y lee la sesión (auth) y el estado de cotizaciones |

### `src/features/quotations/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `QuotationsScreen.css` | estilos de la pantalla de cotizaciones (totales, filtro de estado e indicador de vencida) | estilos de QuotationsScreen |
| `QuotationsScreen.tsx` | pantalla de Tienda > Cotizaciones (solo consulta): totales, filtro de estado, tabla con vigencia y total, y paginador | quotations.selectors/slice (lista, filtro y totales), useQuotationsLoader (los pide), global StatCard, Pagination y TableMessageRow; la monta MainContent (screenRegistry) |

### `src/features/quotations/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.selectors.ts` | lecturas del estado de cotizaciones | QuotationsScreen y useQuotationsLoader; leen state.quotations |

### `src/features/quotations/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.service.ts` | llamadas al backend de cotizaciones: POST /quotations (lista paginada, con filtro de estado) y GET /quotations/stats (totales) | api/client y api/config, quotations.adapter (convierte); las usa quotations.thunks |

### `src/features/quotations/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.slice.ts` | estado de cotizaciones: lista paginada con filtro de estado, y totales | quotations.thunks (lo llenan), quotations.selectors (lecturas) y rootReducer (clave 'quotations'; NO se guarda en el navegador) |

### `src/features/quotations/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.thunks.test.ts` | pruebas del servicio y la carga de cotizaciones: cuerpo enviado, paginación convertida, filtro, error y respuestas viejas | quotations.service/thunks/slice; el cliente HTTP y la sesión están simulados (no hay red) |
| `quotations.thunks.ts` | carga la lista de cotizaciones (con su filtro de estado y página) y los totales | quotations.service (llamadas), auth (selectRequestContext) y quotations.slice (reacciona); los despacha useQuotationsLoader |

### `src/features/quotations/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `quotations.api.types.ts` | lo que responde el backend en cotizaciones (nombres tal cual de las respuestas reales) | quotations.adapter (los convierte a los tipos de la app) y quotations.service (los pide) |
| `quotations.types.ts` | tipos de la app para cotizaciones: una fila de la lista, los totales y el estado de la pantalla | quotations.adapter (los arma), quotations.slice (los guarda), quotations.selectors y QuotationsScreen |

### `src/features/realtime/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature realtime (tiempo real por websocket) | ErpLayout (useRealtime), rootReducer (reducer); pendiente: contrato real de eventos del backend (ver realtime.constants) |

### `src/features/realtime/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.constants.ts` | tipos de evento conocidos y tiempos de reconexión | realtime.handlers (qué hacer con cada evento) y realtime.backoff (esperas) |

### `src/features/realtime/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.adapter.ts` | convierte el mensaje crudo del websocket en un RealtimeEvent (en inglés) | realtime.service (lo llama por cada mensaje); es el ÚNICO lugar que conoce la forma del mensaje del servidor |
| `realtime.backoff.ts` | cuánto esperar antes de reconectar (crece al doble hasta un tope) | realtime.service (lo usa en cada reintento) |
| `realtime.handlers.ts` | registro de qué hacer con cada tipo de evento (evento → acción de una feature) | realtime.thunks (lo llama por cada evento) y features/shop (applyStockUpdate); para un evento nuevo se agrega una línea |
| `realtime.url.ts` | arma la URL del websocket con el token de la sesión | realtime.thunks (al iniciar la conexión) |

### `src/features/realtime/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useRealtime.ts` | abre el tiempo real cuando hay sesión y lo cierra al cerrar sesión o salir | features/auth (¿hay sesión?), realtime.thunks; lo llama ErpLayout una sola vez |

### `src/features/realtime/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.selectors.ts` | lectura del estado del tiempo real | cualquier componente que quiera mostrar si la conexión está abierta |

### `src/features/realtime/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.service.ts` | conexión websocket con reconexión automática (espera creciente) y cierre limpio | realtime.adapter (mensajes), realtime.backoff (esperas); la crea realtime.thunks al iniciar sesión |

### `src/features/realtime/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.slice.ts` | estado de la conexión en tiempo real: estado y hora del último evento | realtime.thunks (lo actualiza), realtime.selectors (lectura) |

### `src/features/realtime/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.thunks.ts` | acciones para abrir y cerrar la conexión en tiempo real | api/config (WS_URL), global/session.storage (token), realtime.service, realtime.handlers y realtime.slice; las llama useRealtime |

### `src/features/realtime/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `realtime.types.ts` | contratos del tiempo real: estado de la conexión, evento recibido y conexión | realtime.service, realtime.adapter, realtime.handlers, realtime.slice y realtime.thunks |

### `src/features/reports/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature reports (ventas diarias, reporte general y valoración de inventario) | rootReducer (reducer) y screenRegistry (DailySalesScreen, GeneralReportScreen, InventoryReportScreen) |

### `src/features/reports/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ReportMetricGrid.css` | estilos de la sección de tarjetas de un reporte | estilos de ReportMetricGrid |
| `ReportMetricGrid.tsx` | muestra el resultado de un reporte como tarjetas: cargando, error con reintento o las métricas | reports.types (ReportBlock), global StatCard y formatCOP; la usan las tres pantallas de reportes |
| `ReportRangeBar.css` | estilos de la barra de fechas de un reporte | estilos de ReportRangeBar |
| `ReportRangeBar.tsx` | barra con las fechas "Desde" y "Hasta" de un reporte | reports.dates (isValidRange); la usan DailySalesScreen y GeneralReportScreen, que guardan el rango en reports.slice |

### `src/features/reports/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.constants.ts` | estado inicial y textos de reportes | reports.slice (initialState), reports.thunks (mensajes) y las pantallas |

### `src/features/reports/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.adapter.test.ts` | pruebas de la conversión de reportes del backend a tarjetas de métricas, y de las fechas | reports.adapter y reports.dates; se corre con npm test |
| `reports.adapter.ts` | convierte lo que responde el backend en reportes a tarjetas de métricas (etiqueta, valor y formato) | reports.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en reportes |
| `reports.dates.ts` | fechas AAAA-MM-DD para los rangos de los reportes | reports.constants (rangos iniciales) y ReportRangeBar (límites de los campos de fecha) |

### `src/features/reports/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useReportLoader.ts` | pide al backend los reportes indicados al abrir la pantalla y cada vez que cambia su rango de fechas o la bodega activa | DailySalesScreen, GeneralReportScreen y InventoryReportScreen; despacha reports.thunks y lee la sesión (auth), la bodega (navigation) y los rangos |

### `src/features/reports/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `DailySalesScreen.tsx` | pantalla de Reportes > Ventas Diarias: resumen de ventas de la bodega activa en el rango elegido (hoy por defecto) | reports.selectors/slice (rango y resultado), useReportLoader (lo pide), ReportRangeBar y ReportMetricGrid; la monta MainContent (screenRegistry) |
| `GeneralReportScreen.tsx` | pantalla de Reportes > Reporte General: resultados financieros y de clientes de la empresa en el rango elegido (últimos 30 días por defecto) | reports.selectors/slice (rango y resultados), useReportLoader (los pide), ReportRangeBar y ReportMetricGrid; la monta MainContent (screenRegistry) |
| `InventoryReportScreen.tsx` | pantalla de Reportes > Valoración Inventario: productos, existencias y valor del inventario de la bodega activa | reports.selectors (resultado), useReportLoader (lo pide) y ReportMetricGrid; la monta MainContent (screenRegistry) |
| `ReportScreen.css` | estilos de las pantallas de reportes (columna con barra de fechas y secciones) | estilos de ReportScreen |

### `src/features/reports/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.selectors.test.ts` | pruebas de los rangos por defecto: se calculan al leer, con la fecha de hoy | reports.selectors; se corre con npm test |
| `reports.selectors.ts` | lecturas del estado de reportes | las pantallas de reportes, useReportLoader y reports.thunks; leen state.reports |

### `src/features/reports/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.service.test.ts` | pruebas de las llamadas de reportes: cuerpo enviado y conversión | reports.service; el cliente HTTP está simulado (no hay red) |
| `reports.service.ts` | llamadas al backend de reportes: POST /sales/summary, /reports/financial, /reports/customers y /reports/inventory | api/client y api/config, reports.adapter (convierte); las usa reports.thunks |

### `src/features/reports/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.slice.ts` | estado de reportes: rangos de fechas y el resultado (tarjetas, estado y error) de cada reporte | reports.thunks (lo llenan), reports.selectors (lecturas) y rootReducer (clave 'reports'; NO se guarda en el navegador) |

### `src/features/reports/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.thunks.test.ts` | pruebas de la carga de reportes: éxito, error, rango inválido, sin bodega y respuestas viejas | reports.thunks y reports.slice; el service y la sesión están simulados (no hay red) |
| `reports.thunks.ts` | carga cada reporte (ventas del periodo, financiero, clientes e inventario) con su rango de fechas y la bodega activa | reports.service (llamadas), auth (selectRequestContext), navigation (bodega activa) y reports.slice (reacciona); las despacha useReport |

### `src/features/reports/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `reports.api.types.ts` | lo que responde el backend en reportes (nombres tal cual del Swagger) y lo que se envía | reports.adapter (los convierte a tarjetas) y reports.service (los pide) |
| `reports.types.ts` | tipos de la app para reportes: tarjetas de métricas, rango de fechas y estado de cada reporte | reports.adapter (arma las tarjetas), reports.slice (las guarda), reports.selectors y las pantallas |

### `src/features/sales/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature sales (historial de ventas y carritos pendientes) | rootReducer (reducer) y screenRegistry (SalesHistoryScreen, PendingCartsScreen) |

### `src/features/sales/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sales.constants.ts` | tamaño de página, textos y estado inicial de ventas | sales.thunks (cuántos pide), sales.slice (initialState) y las pantallas (textos) |

### `src/features/sales/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sales.adapter.test.ts` | pruebas de la conversión del historial de ventas y de los carritos pendientes del backend | sales.adapter; se corre con npm test |
| `sales.adapter.ts` | convierte lo que responde el backend en ventas (historial y carritos pendientes) a lo que usa la app | sales.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en ventas |
| `sales.cancel.test.ts` | pruebas de cuándo se ofrece anular una venta | sales.cancel; se corre con npm test |
| `sales.cancel.ts` | reglas para anular una venta desde el historial | SalesHistoryScreen (botón y motivo); el estado viene de invoiceStatus (PUT /sales/status: verification, picking, dispatch, facturar, completed, cancelled) |

### `src/features/sales/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useSalesList.ts` | pide al backend el historial o los carritos pendientes al abrir la pantalla, al cambiar de página y al cambiar de bodega | SalesHistoryScreen y PendingCartsScreen; despacha sales.thunks y lee la sesión (auth) y la bodega activa (navigation) |

### `src/features/sales/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `PendingCartsScreen.tsx` | pantalla de Tienda > Bandeja de Pedidos: carritos guardados del vendedor, que se pueden retomar en el carrito | sales.selectors/slice, useSalesList (la pide), shop (resumeCartThunk, setCartDrawerOpen) y global Pagination; la monta MainContent (screenRegistry) |
| `SalesHistoryScreen.tsx` | pantalla de Tienda > Historial de Ventas: tabla de ventas de la bodega activa con paginador | sales.selectors/slice (lista y página), useSalesList (la pide), sales.thunks (anular), usePermissions, global Pagination y ConfirmDialog; la monta MainContent (screenRegistry) |
| `SalesScreen.css` | estilos de las pantallas de historial de ventas y pedidos pendientes (tarjeta con tabla) | estilos de SalesScreen |

### `src/features/sales/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sales.selectors.ts` | lecturas del estado de ventas (historial y carritos pendientes) | SalesHistoryScreen, PendingCartsScreen y useSalesList; leen state.sales |

### `src/features/sales/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sales.service.test.ts` | pruebas de las llamadas de historial y pendientes: cuerpo enviado y conversión | sales.service; el cliente HTTP está simulado (no hay red) |
| `sales.service.ts` | llamadas al backend de ventas: POST /sales/history (historial) y POST /sales/pendings (carritos guardados del vendedor) | api/client, api/config y api/pagination (toPaginated), sales.adapter (convierte); las usa sales.thunks |

### `src/features/sales/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sales.slice.ts` | estado de ventas: historial y carritos pendientes, cada uno con su página, estado y error | sales.thunks (lo llenan), sales.selectors (lecturas) y rootReducer (clave 'sales'; NO se guarda en el navegador) |

### `src/features/sales/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sales.thunks.test.ts` | pruebas de la carga del historial y los pendientes: éxito, error, sin bodega y respuestas viejas | sales.thunks y sales.slice; el service y la sesión están simulados (no hay red) |
| `sales.thunks.ts` | carga el historial de ventas y los carritos pendientes de la bodega activa, y anula una venta | sales.service (llamadas), auth (selectRequestContext), navigation (bodega activa) y sales.slice (reacciona); las despachan useSalesList y las pantallas |

### `src/features/sales/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `sales.api.types.ts` | lo que responde el backend en ventas (nombres tal cual del Swagger) para el historial y los pedidos pendientes | sales.adapter (los convierte a los tipos de la app) y sales.service (los pide) |
| `sales.types.ts` | tipos de la app para ventas: una fila del historial, un carrito pendiente y el estado de ambas listas | sales.adapter (los arma), sales.slice (los guarda), sales.selectors y las pantallas de historial y pendientes |

### `src/features/settings/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | barril público del módulo de configuración | app/componentApp/contentMain/screenRegistry |

### `src/features/settings/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `SettingsScreen.css` | estilos de la pantalla de configuración · tokens de styles/tokens.css | estilos de SettingsScreen |
| `SettingsScreen.tsx` | pantalla principal de administración y configuración del ERP | AppHeader (engranaje), screenRegistry, endpoints de compañías, bodegas, descuentos y salud |

### `src/features/shop/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature shop | MainContent, DrawerRight, rootReducer |

### `src/features/shop/components/cart/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCartDrawer.css` | estilos del contenedor y la lista del carrito (el encabezado está en DrawerHeader.css) | estilos de ShopCartDrawer |
| `ShopCartDrawer.tsx` | carrito POS: lista de items (o vacío) y pie con total | shop.cart.slice (vía shop.selectors); las partes son ShopCartItem, ShopCartEmpty y ShopCartFooter; lo muestra DrawerRight en la tienda |
| `ShopCartEmpty.css` | estilos del carrito vacío | estilos de ShopCartEmpty |
| `ShopCartEmpty.tsx` | mensaje del carrito vacío | ShopCartDrawer (se muestra cuando no hay items) |
| `ShopCartFooter.css` | estilos del pie del carrito (total y acciones) | estilos de ShopCartFooter |
| `ShopCartFooter.tsx` | pie del carrito: total a facturar, medio de pago, vaciar y finalizar pedido (con confirmación) | shop.checkout.thunks (registra la venta), shop.cart.thunks (vaciar en el backend), shop.selectors (total y cliente), global ConfirmDialog y toast |
| `ShopCartItem.css` | estilos de cada línea del carrito (datos, cantidad y precios) | estilos de ShopCartItem |
| `ShopCartItem.tsx` | una línea del carrito: datos del repuesto, cantidad y precios | shop.cart.thunks (cambiar cantidad y quitar en el backend); la pinta ShopCartDrawer por cada item |

### `src/features/shop/components/cart/customer/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCartCustomer.css` | estilos de la franja del cliente de la venta en el carrito | estilos de ShopCartCustomer |
| `ShopCartCustomer.tsx` | franja del carrito que muestra a qué cliente se le hace la venta y permite quitarlo | shop.selectors (cliente de la venta y si hay un cambio en curso) y shop.cart.customer.thunks (quitar); la pinta ShopCartDrawer |

### `src/features/shop/components/catalog/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCatalogEmpty.css` | estilos del estado vacío del catálogo | estilos de ShopCatalogEmpty |
| `ShopCatalogEmpty.tsx` | estado vacío cuando ningún repuesto coincide con los filtros | ShopCatalogScreen (le pasa la bodega, si hay filtros y la acción de restablecer) |
| `ShopCatalogFilters.css` | estilos de las categorías en pills y el resumen de resultados | estilos de ShopCatalogFilters |
| `ShopCatalogFilters.tsx` | resumen de resultados ("Mostrando X de Y repuestos") | los conteos que llegan por props desde ShopCatalogScreen |
| `ShopCatalogToolbar.css` | estilos de la fila de búsqueda, marca, stock y limpiar filtros | estilos de ShopCatalogToolbar |
| `ShopCatalogToolbar.tsx` | fila de búsqueda: texto, categoría, marca, y el grupo de controles ("con stock" y limpiar filtros) | shop.slice (filtros), shop.selectors (hay filtros activos), catalogs (marcas y categorías del backend), global SearchBar |

### `src/features/shop/components/productCard/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductCard.css` | contenedor de la tarjeta de producto (diseño Yamaha) | estilos de ProductCard |
| `ProductCard.tsx` | tarjeta de producto con el diseño de Yamaha: imagen con iconos, nombre, referencia, precio con tarifas y cantidad | ShopCatalogScreen (le pasa los datos y recibe el agregar al carrito); usa shop.helpers y las partes ProductCard* (parts/ Media, Info, TierMenu) |
| `ProductCardActions.css` | estilos del contador y del botón de ordenar de la tarjeta | estilos de ProductCardActions |
| `ProductCardActions.tsx` | contador de cantidad y botón de ordenar de la tarjeta | ProductCard (cantidad y acciones, que salen del hook useQuantityInput); no guarda estado, todo llega por props |
| `ProductCardPricing.css` | estilos de la fila del precio de la tarjeta | estilos de ProductCardPricing |
| `ProductCardPricing.tsx` | precio del nivel activo alineado a la derecha | ProductCard (nivel del producto); formato COP de global/helpers/format |
| `ProductCardStock.css` | estilos de la disponibilidad de stock de la tarjeta | estilos de ProductCardStock |
| `ProductCardStock.tsx` | disponibilidad de stock de la tarjeta (agotado, bajo o disponible) | ProductCard (le pasa el estado y la cantidad); el estado sale de shop.helpers (getStockStatus) |

### `src/features/shop/components/productCard/parts/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ProductCardIcons.tsx` | iconos de la tarjeta (favoritos, vista rápida, tarifas y ubicación), sin color propio | ProductCardMedia (favoritos y vista rápida), ProductCardTierMenu (tarifas), ProductCardInfo (ubicación) |
| `ProductCardInfo.css` | estilos del nombre, la referencia y la ubicación de la tarjeta | estilos de ProductCardInfo |
| `ProductCardInfo.tsx` | nombre del repuesto, referencia (código) y, en otra línea, la ubicación en estantería | ProductCard (le pasa los datos) |
| `ProductCardMedia.css` | estilos de la imagen y de los iconos flotantes de la tarjeta | estilos de ProductCardMedia |
| `ProductCardMedia.tsx` | imagen del producto con el menú de tarifas flotante en la esquina superior derecha | ProductCard (le pasa los datos); ProductCardTierMenu (menú de tarifas); getCategoryEmoji de shop.helpers |
| `ProductCardTierMenu.css` | estilos del icono de tarifas, su insignia de nivel y el menú desplegable | estilos de ProductCardTierMenu |
| `ProductCardTierMenu.tsx` | icono de etiqueta junto al precio; abre el menú de tarifas P0 - P3 y muestra el nivel activo | ProductCardPricing (nivel y cambio de nivel); global useClickOutside (cierra con clic fuera o Escape); PRICE_LEVEL_OPTIONS de shop.constants |

### `src/features/shop/components/results/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCatalogStatus.css` | estilos del aviso de carga y de error del catálogo | estilos de ShopCatalogStatus |
| `ShopCatalogStatus.tsx` | aviso del catálogo mientras carga por primera vez o cuando el backend falla (con botón para reintentar) | ShopCatalogScreen (le pasa el estado y la acción de reintentar); el mensaje de error viene de shop.products.slice |

### `src/features/shop/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.checkout.constants.ts` | medios de pago que se ofrecen al finalizar el pedido | ShopCartFooter (las opciones) y shop.sales.types (PaymentMethod) |
| `shop.constants.ts` | niveles de precio, filtros y estado inicial | shop.slice (initialState), ShopCatalogScreen |

### `src/features/shop/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.adapter.test.ts` | pruebas de la conversión de productos del backend (POST /products y /inventory/search) al Product de la app | shop.adapter; se corre con npm test |
| `shop.adapter.ts` | convierte los productos del backend (ProductDto y ControlProductDto) al Product que usa la app | shop.products.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres de campos del backend en productos |
| `shop.helpers.test.ts` | pruebas de clampQuantity (la cantidad siempre queda entre 1 y el stock) | shop.helpers; se corre con npm test |
| `shop.helpers.ts` | funciones puras de la tienda (stock, precio por nivel y emoji de categoría) | ProductCard (los usa para pintar) y shop.selectors |

### `src/features/shop/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useCartSync.ts` | lee el carrito del backend al entrar (y al cambiar de bodega) y lo limpia de la memoria al salir de la sesión | ErpLayout (lo monta mientras haya sesión), shop.cart.thunks (fetchCartThunk), shop.cart.slice (resetCart), navigation (bodega activa) y warehouses (estado de carga) |
| `useProductsLoader.ts` | pide los productos al backend cuando cambia algo que los afecta: filtros, texto (con espera), página o bodega | ShopCatalogScreen (lo usa al montarse); despacha shop.products.thunks y lee shop.products.selectors, shop.slice (filtros), navigation (bodega) y warehouses (estado de carga) |
| `useQuantityInput.test.ts` | pruebas del contador de cantidad: botones, texto escrito, flechas del teclado y límite de stock | useQuantityInput; se corre con npm test |
| `useQuantityInput.ts` | estado del contador de cantidad de la tarjeta: botones - y +, número escrito a mano y flechas del teclado | ProductCard (lo usa y pasa los valores a ProductCardActions); clampQuantity de shop.helpers pone el límite (1 hasta el stock) |

### `src/features/shop/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ShopCatalogScreen.css` | estilos del catálogo | estilos de ShopCatalogScreen |
| `ShopCatalogScreen.tsx` | catálogo de repuestos: arma la barra, los filtros, el grid de tarjetas, el paginador o el aviso de carga, error o estado vacío | shop.slice (filtros y carrito), shop.products.slice/selectors (productos del backend), catalogs (useLoadCatalogs), useProductsLoader y las partes ShopCatalog*; la monta MainContent |

### `src/features/shop/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.products.selectors.test.ts` | pruebas de los productos visibles (filtros en pantalla solo en modo búsqueda) y del resumen "X de Y" | shop.products.selectors; la sesión está simulada para no cargar toda la feature auth |
| `shop.products.selectors.ts` | lecturas de la lista de productos: estado de carga, paginación, productos visibles y resumen de resultados | ShopCatalogScreen, ShopCatalogPagination y useProductsLoader; leen state.products, los filtros de state.shop, la bodega de state.ui y los catálogos (marcas y categorías) |
| `shop.selectors.test.ts` | pruebas de las lecturas del carrito (líneas con nivel, cantidades por producto, totales) y de "hay filtros activos" | shop.selectors; no usa red ni store real |
| `shop.selectors.ts` | lecturas derivadas del estado de la tienda (filtrado, cantidades y totales del carrito) | ShopCatalogScreen y ShopCartDrawer; leen state.shop (filtros, niveles) y state.cart (líneas del carrito del backend); la lista de productos se lee en shop.products.selectors |

### `src/features/shop/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.cart.service.test.ts` | pruebas de las llamadas del carrito: ruta, método y cuerpo de cada una | shop.cart.service; el cliente HTTP está simulado (no hay red) |
| `shop.cart.service.ts` | llamadas al backend del carrito: POST /carts (leer), POST /carts/register (agregar), PUT /carts/update (cantidad), DELETE /carts/delete (quitar) y DELETE /carts/deleteall (vaciar) y PUT /carts/reassignuser (cambiar de cliente) | api/client y api/config, shop.adapter (toCartItem); las usa shop.cart.thunks |
| `shop.products.service.test.ts` | pruebas de las llamadas de productos: ruta, cuerpo (solo con los filtros aplicados) y conversión de la respuesta | shop.products.service; el cliente HTTP está simulado (no hay red) |
| `shop.products.service.ts` | llamadas al backend de productos: POST /products (catálogo con filtros y páginas) y POST /inventory/search (búsqueda por texto) | api/client, api/config y api/pagination, shop.adapter (convierte la respuesta a Product); las usa shop.products.thunks |
| `shop.sales.service.test.ts` | pruebas de registrar la venta desde el carrito y de anularla | shop.sales.service; el cliente HTTP está simulado (no hay red) |
| `shop.sales.service.ts` | llamadas al backend que cierran o anulan una venta: POST /sales/register (desde el carrito) y POST /sales/cancel | api/client y api/config, shop.sales.types; las usan shop.checkout.thunks y los thunks de ventas |

### `src/features/shop/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.cart.slice.test.ts` | pruebas del estado del carrito: lectura, bandera de cambio en curso y reinicio al cerrar sesión | shop.cart.slice; se simulan las acciones de los thunks (no hay red) |
| `shop.cart.slice.ts` | carrito que viene del backend: líneas, estado de lectura y bandera de "hay un cambio en curso" | shop.cart.thunks (lo llenan), shop.selectors (lecturas: líneas, cantidades, totales) y rootReducer (clave 'cart'; NO se guarda en el navegador) |
| `shop.products.slice.test.ts` | pruebas de la lista de productos: carga, respuestas viejas descartadas, vuelta a la página 1 y stock en tiempo real | shop.products.slice; se simulan las acciones de la carga (no hay red) |
| `shop.products.slice.ts` | lista de productos del catálogo que llega del backend: items, estado de carga, paginación y modo (lista o búsqueda) | shop.products.thunks (la llenan), shop.products.selectors (lecturas), shop.slice (al cambiar un filtro vuelve a la página 1) y rootReducer (clave 'products'; NO se guarda en el navegador) |
| `shop.slice.test.ts` | pruebas del estado guardado de la tienda: filtros por id, uuid y niveles del carrito, y limpieza al cerrar sesión | shop.slice; se simulan las acciones (no hay red) |
| `shop.slice.ts` | estado de tienda que se guarda en el navegador: filtros, uuid, niveles y cliente del carrito, y selección de producto | ShopCatalogScreen, ProductCard, ShopCartDrawer |

### `src/features/shop/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.cart.customer.thunks.test.ts` | pruebas de elegir o quitar el cliente de la venta: reasignar el carrito, nivel de precio y casos sin carrito | shop.cart.customer.thunks, shop.slice y shop.cart.slice; los services, la sesión y las alertas están simulados (no hay red) |
| `shop.cart.customer.thunks.ts` | elegir (o quitar) el cliente de la venta y pasarle el carrito que ya existía | shop.cart.service (reassignCart y lectura), shop.cart.thunks (avisos, tipos y regla de un cambio a la vez), shop.slice (guarda el cliente) y shop.cart.slice (reacciona); la despacha el panel del cliente (features/customers) y el carrito |
| `shop.cart.resume.thunks.test.ts` | pruebas de retomar un carrito guardado: se adopta solo si sus líneas se leen bien | shop.cart.resume.thunks, shop.slice y shop.cart.slice; los services, la sesión y las alertas están simulados (no hay red) |
| `shop.cart.resume.thunks.ts` | retomar un carrito guardado (pedidos pendientes): lee sus líneas del backend y SOLO entonces cambia el uuid y el cliente de la venta | shop.cart.service (lectura), shop.cart.thunks (avisos y regla de un cambio a la vez), shop.slice (uuid y cliente) y shop.cart.slice (líneas); la despacha PendingCartsScreen |
| `shop.cart.thunks.test.ts` | pruebas del carrito contra el backend: leer, agregar (línea nueva o existente), cambiar cantidad, quitar, vaciar y errores | shop.cart.thunks, shop.cart.slice y shop.slice; los services, la sesión y las alertas están simulados (no hay red) |
| `shop.cart.thunks.ts` | acciones del carrito contra el backend: leer y agregar (cambiar cantidad, quitar y vaciar están en shop.cart.update.thunks) | shop.cart.service (llamadas), auth (selectRequestContext), shop.slice (uuid y niveles), navigation (bodega activa), shop.products.thunks (recargar stock) y shop.cart.slice (reacciona) |
| `shop.cart.update.thunks.ts` | cambios sobre lo que ya está en el carrito: cambiar cantidad, quitar una línea y vaciar todo | shop.cart.service (llamadas), shop.cart.thunks (avisos, tipos y la regla de un cambio a la vez), shop.products.thunks (recargar stock) y shop.cart.slice (reacciona) |
| `shop.checkout.thunks.test.ts` | pruebas de finalizar el pedido: venta registrada, carrito olvidado, errores y casos sin carrito o bodega | shop.checkout.thunks, shop.slice y shop.cart.slice; los services, la sesión y las alertas están simulados (no hay red) |
| `shop.checkout.thunks.ts` | cierra la venta: convierte el carrito del backend en un pedido (POST /sales/register) | shop.sales.service (llamada), shop.cart.thunks (avisos y regla de un cambio a la vez), shop.products.thunks (recargar stock), shop.slice y shop.cart.slice (olvidan el carrito al terminar) |
| `shop.products.thunks.test.ts` | pruebas de la carga de productos: modo lista con filtros y página, modo búsqueda, errores y sin sesión | shop.products.thunks, shop.slice y shop.products.slice; el service y la sesión están simulados (no hay red) |
| `shop.products.thunks.ts` | carga los productos del catálogo: con filtros y página (modo "list") o por texto (modo "search") | shop.products.service (llamadas), auth (selectRequestContext), shop.slice (filtros), navigation (bodega activa) y shop.products.slice (reacciona); la despacha useProductsLoader |

### `src/features/shop/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `shop.api.types.ts` | lo que responde el backend en productos (POST /products y POST /inventory/search) y los filtros que se le envían | shop.adapter (convierte estos tipos a Product), shop.products.service (los usa) y shop.products.slice |
| `shop.card.types.ts` | props de la tarjeta de producto y de sus partes (stock, precios y acciones) | ProductCard, ProductCardStock, ProductCardPricing, ProductCardActions y las partes (Media, Info, TierMenu) |
| `shop.cart.api.types.ts` | lo que responde el backend en carritos (POST /carts) y el estado del slice del carrito | shop.adapter (convierte CartDto a CartItem), shop.cart.service, shop.cart.thunks, shop.cart.slice y shop.selectors |
| `shop.cart.types.ts` | props de las partes del carrito | ShopCartItem (la pinta ShopCartDrawer) |
| `shop.catalog.types.ts` | props de las partes del catálogo (filtros, estado vacío, y aviso de carga) | ShopCatalogFilters, ShopCatalogEmpty, y ShopCatalogStatus (las usa ShopCatalogScreen) |
| `shop.sales.types.ts` | cierre de la venta: medios de pago y lo que se envía y devuelve POST /sales/register | shop.sales.service (los usa), shop.checkout.thunks y ShopCartFooter (medio de pago elegido) |
| `shop.types.ts` | contratos de producto, precios, filtros y carrito | shop.constants, shop.slice y los componentes de shop |

### `src/features/suppliers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature suppliers (lista y totales de proveedores) | rootReducer (reducer) y screenRegistry (SuppliersScreen) |

### `src/features/suppliers/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `suppliers.constants.ts` | tamaño de página y estado inicial de proveedores | suppliers.thunks (cuántos pide) y suppliers.slice (initialState) |

### `src/features/suppliers/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `suppliers.adapter.test.ts` | pruebas de la conversión de proveedores y totales del backend | suppliers.adapter; se corre con npm test |
| `suppliers.adapter.ts` | convierte lo que responde el backend en proveedores a lo que usa la app | suppliers.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en proveedores |

### `src/features/suppliers/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useSuppliersLoader.ts` | pide al backend los totales al abrir la pantalla y la lista al abrirla y al cambiar de página o de búsqueda | SuppliersScreen; despacha suppliers.thunks y lee la sesión (auth) y el estado de proveedores |

### `src/features/suppliers/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `SuppliersScreen.css` | estilos de la pantalla de proveedores (totales, tarjeta con barra y tabla) | estilos de SuppliersScreen |
| `SuppliersScreen.tsx` | pantalla de Gestión Roles > Proveedores: totales, búsqueda en el servidor, tabla y paginador | suppliers.selectors/slice (lista, búsqueda y totales), useSuppliersLoader (los pide), global SearchBar, StatCard y Pagination; la monta MainContent (screenRegistry) |

### `src/features/suppliers/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `suppliers.selectors.ts` | lecturas del estado de proveedores | SuppliersScreen y useSuppliersLoader; leen state.suppliers |

### `src/features/suppliers/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `suppliers.service.test.ts` | pruebas de las llamadas de proveedores: cuerpo enviado y conversión | suppliers.service; el cliente HTTP está simulado (no hay red) |
| `suppliers.service.ts` | llamadas al backend de proveedores: POST /suppliers/list (listado paginado con búsqueda) y GET /suppliers/summary (totales) | api/client, api/config y api/pagination (toPaginated), suppliers.adapter (convierte); las usa suppliers.thunks |

### `src/features/suppliers/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `suppliers.slice.ts` | estado de proveedores: lista paginada con búsqueda, y totales | suppliers.thunks (lo llenan), suppliers.selectors (lecturas) y rootReducer (clave 'suppliers'; NO se guarda en el navegador) |

### `src/features/suppliers/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `suppliers.thunks.test.ts` | pruebas de la carga de proveedores: éxito, búsqueda, error, totales y respuestas viejas | suppliers.thunks y suppliers.slice; el service y la sesión están simulados (no hay red) |
| `suppliers.thunks.ts` | carga la lista paginada de proveedores y sus totales | suppliers.service (llamadas), auth (selectRequestContext) y suppliers.slice (reacciona); los despacha useSuppliersLoader |

### `src/features/suppliers/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `suppliers.api.types.ts` | lo que responde el backend en proveedores (nombres tal cual del Swagger y de las respuestas reales) | suppliers.adapter (los convierte a los tipos de la app) y suppliers.service (los pide) |
| `suppliers.types.ts` | tipos de la app para proveedores: una fila de la lista, los totales y el estado | suppliers.adapter (los arma), suppliers.slice (los guarda), suppliers.selectors y SuppliersScreen |

### `src/features/transfers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | exportaciones públicas del feature traslados multibodega | TransfersScreen, transfers.service, transfers.types y screenRegistry |

### `src/features/transfers/components/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreateTransferModal.css` | estilos de creación y reubicación multibodega | estilos de CreateTransferModal |
| `CreateTransferModal.tsx` | modal de solicitud de traslado y reubicación multibodega | transfers.service, useTransferProductSearch (búsqueda de repuestos), TransferFormFields y Redux |
| `ReceiveTransferModal.tsx` | modal de recepción de traslado en destino o reporte de novedades | transfers.service (approveTransfer, rejectTransfer) y ValidatedInput |
| `TransferFormFields.tsx` | campos de selección de bodega origen, destino y cantidad a trasladar | CreateTransferModal, TransferStockMatrix, ValidatedNumberInput |
| `TransferItemsTable.tsx` | tabla interactiva de traslados con avance de estado y recepcion | TransfersScreen, TrasladeItem, tokens.css |
| `TransferStockMatrix.tsx` | tabla visual de existencias físicas por bodega (models.ProductLocation) | CreateTransferModal, transfers.types y tokens.css |

### `src/features/transfers/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `transfers.adapter.test.ts` | pruebas de la conversión de traslados del backend (líneas con productCode y productName) | transfers.adapter; se corre con npm test |
| `transfers.adapter.ts` | adaptadores de datos para traslados y matriz de existencias multibodega | transfers.service, transfers.types, transfers.api.types y el ProductDto de shop |

### `src/features/transfers/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useTransferProductSearch.ts` | busca repuestos con su existencia en cada bodega mientras el modal de traslado está abierto | CreateTransferModal; usa transfers.service (searchProductsMultibodega), useDebouncedValue y la sesión y las bodegas de Redux |

### `src/features/transfers/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `TransfersScreen.css` | pantalla de traslados y reubicación multibodega | estilos de TransfersScreen |
| `TransfersScreen.tsx` | control de traslados entre bodegas con existencias visibles y novedades | transfers.service, CreateTransferModal, ReceiveTransferModal y usePermissions |

### `src/features/transfers/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `transfers.service.test.ts` | pruebas unitarias de los endpoints de traslados multibodega | transfers.service, apiClient y vitest |
| `transfers.service.ts` | llamadas al backend para traslados multibodega y existencias | apiClient, API_CONFIG, transfers.types, transfers.adapter y Swagger (/sales/traslades, etc.) |

### `src/features/transfers/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `transfers.api.types.ts` | lo que responde el backend en traslados (nombres tal cual del Swagger: models.TrasladeResponse y models.SaleItemResponse) | transfers.adapter (los convierte a los tipos de la app) y transfers.service (los pide) |
| `transfers.types.ts` | contratos y modelos para traslados y reubicación multibodega | transfers.service, TransfersScreen, CreateTransferModal y Swagger |

### `src/features/wallet/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature wallet | MainContent, DrawerRight, rootReducer |

### `src/features/wallet/components/account/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreditAccountDetail.css` | estilos del cuerpo del estado de cuenta (el encabezado está en DrawerHeader.css) | estilos de CreditAccountDetail |
| `CreditAccountDetail.tsx` | estado de cuenta de un cliente: métricas, abono y facturas | CreditAccountDrawer (le pasa el cliente), useAccountData (facturas), useCreditPayment (abonos) y CreditLimitForm (cupo y plazo) |
| `CreditAccountDrawer.tsx` | contenido del panel derecho en cartera: estado de cuenta del cliente seleccionado | wallet.selectors (cliente seleccionado); muestra CreditAccountEmpty o CreditAccountDetail; lo muestra DrawerRight |
| `CreditAccountEmpty.css` | estilos del mensaje cuando no hay cliente seleccionado | estilos de CreditAccountEmpty |
| `CreditAccountEmpty.tsx` | mensaje del panel cuando no hay ningún cliente seleccionado | CreditAccountDrawer (se muestra mientras selectedCustomerId es null) |
| `CreditAccountMetrics.css` | estilos del saldo adeudado, cupo disponible y uso de cupo | estilos de CreditAccountMetrics |
| `CreditAccountMetrics.tsx` | tarjetas del estado de cuenta de un cliente: saldo adeudado, cupo disponible y porcentaje de uso del cupo | CreditAccountDetail (la muestra), wallet.helpers (getUsagePercentage y getUsageLevel) y wallet.account.types (props) |

### `src/features/wallet/components/billing/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreditInvoiceCard.css` | estilos de la tarjeta de cada factura pendiente | estilos de CreditInvoiceCard |
| `CreditInvoiceCard.tsx` | tarjeta de una factura: número, estado, fechas, saldos y botón de pagar | CreditInvoiceList (por cada factura); el pago lo ejecuta useCreditPayment vía onPay |
| `CreditInvoiceList.css` | estilos de la sección de facturas pendientes | estilos de CreditInvoiceList |
| `CreditInvoiceList.tsx` | sección de facturas pendientes del cliente (lista o mensaje de "al día") | CreditAccountDetail (facturas y acción de pagar); pinta una CreditInvoiceCard por factura |
| `CreditLimitForm.css` | estilos del formulario plegable de cupo y plazo | estilos de CreditLimitForm |
| `CreditLimitForm.tsx` | formulario plegable para cambiar el cupo, el plazo y si el cliente tiene crédito (PUT /users/credit) | CreditAccountDetail (le pasa el cliente); wallet.payments.thunks (updateCreditThunk); al guardar se vuelve a leer la lista y los totales |
| `CreditPaymentForm.css` | estilos del formulario de abono y su aviso de éxito | estilos de CreditPaymentForm |
| `CreditPaymentForm.tsx` | formulario de abono rápido (monto + botón Abonar) | CreditAccountDetail (monto y acción llegan por props desde useCreditPayment) |

### `src/features/wallet/components/clientRow/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreditClientRow.css` | estilos de cada fila de cliente (datos, uso de cupo, estado y botón) | estilos de CreditClientRow |
| `CreditClientRow.tsx` | fila de un cliente: nombre, documento, plazo, cupo, saldo, disponible, estado y botón con ícono "Ver Estado" | wallet.slice (seleccionar cliente); partes: CreditStatusBadge; la pinta CreditClientsTable |
| `CreditStatusBadge.css` | estilos de la etiqueta de estado de crédito | estilos de CreditStatusBadge |
| `CreditStatusBadge.tsx` | etiqueta del estado de crédito del cliente (al día, alerta, mora o bloqueado) | CreditClientRow (le pasa el estado); el texto y la variante salen de wallet.constants (CREDIT_STATUS_BADGES) |
| `CreditUsageBar.css` | estilos de la barra de uso del cupo | estilos de CreditUsageBar |
| `CreditUsageBar.tsx` | barra con el porcentaje de cupo usado (verde, ámbar o roja según el nivel) | CreditClientRow (le pasa el porcentaje); el nivel sale de wallet.helpers (getUsageLevel) |

### `src/features/wallet/components/clientsTable/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `CreditClientsTable.css` | estilos de la tabla de clientes | estilos de CreditClientsTable |
| `CreditClientsTable.tsx` | tabla de clientes: barra de filtros, encabezado y una fila por cliente | wallet.slice, wallet.selectors, wallet.thunks (reintentar), global Pagination; las partes son CreditClientsToolbar y CreditClientRow; al hacer clic abre CreditAccountDrawer |
| `CreditClientsToolbar.css` | estilos de la búsqueda y las pestañas de estado de la tabla de clientes | estilos de CreditClientsToolbar |
| `CreditClientsToolbar.tsx` | barra de la tabla de clientes: búsqueda y pestañas de estado de crédito | wallet.slice (filtros), wallet.constants (pestañas), global SearchBar; la pinta CreditClientsTable |

### `src/features/wallet/components/kpis/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `WalletKpiHeader.css` | estilos de la fila de tarjetas de cartera | estilos de WalletKpiHeader |
| `WalletKpiHeader.tsx` | tarjetas de totales de cartera (por cobrar, clientes en mora, cupo y clientes con crédito) | wallet.selectors (selectWalletKpis, que sale de POST /wallet/summary), global StatCard |

### `src/features/wallet/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.constants.ts` | filtros iniciales, estado inicial, tamaños de página y textos de estados de crédito | wallet.slice (initialState), wallet.service (cuántos pide), wallet.payments.service (método de pago) y los componentes (etiquetas) |

### `src/features/wallet/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.adapter.test.ts` | pruebas de la conversión de clientes con crédito, facturas y resumen del backend | wallet.adapter; se corre con npm test |
| `wallet.adapter.ts` | convierte lo que responde el backend en cartera (clientes, facturas y resumen) a lo que usa la app | wallet.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en cartera |
| `wallet.helpers.test.ts` | pruebas del uso de cupo, el monto digitado y el reparto de un abono entre facturas | wallet.helpers; se corre con npm test |
| `wallet.helpers.ts` | funciones puras de cartera (uso de cupo, monto del abono y reparto del abono entre facturas) | CreditClientsTable, CreditAccountMetrics y useCreditPayment / wallet.payments.thunks (splitPayment) |

### `src/features/wallet/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useAccountData.ts` | cuando se abre el estado de cuenta de un cliente pide sus facturas al backend | CreditAccountDetail (lo usa al montarse); despacha wallet.thunks (loadInvoicesThunk) |
| `useCreditPayment.ts` | maneja el abono de un cliente: monto digitado, validación, registro en el backend y mensaje de éxito | CreditAccountDetail (lo usa); wallet.payments.thunks (payThunk), wallet.helpers (parsePaymentAmount), global toast |
| `useWalletLoader.ts` | pide al backend la lista de clientes con crédito y los totales cuando cambia la página o la bodega | WalletScreen (lo usa al montarse); despacha wallet.thunks y lee wallet.selectors, la sesión de auth y la bodega activa (navigation) y su estado (warehouses) |

### `src/features/wallet/screens/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `WalletScreen.css` | estilos de la pantalla de cartera | estilos de WalletScreen |
| `WalletScreen.tsx` | pantalla de cartera: módulo único integrado con KPIs y tabla de clientes | CreditClientsTable, useWalletLoader (pide la cartera); la monta MainContent |

### `src/features/wallet/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.selectors.test.ts` | pruebas de los totales (KPIs), el filtro de clientes y el encabezado del panel | wallet.selectors; no usa red ni store real |
| `wallet.selectors.ts` | lecturas del estado de cartera: totales (KPIs), clientes filtrados, estado de la lista, facturas y encabezado del panel | WalletKpiHeader, CreditClientsTable, CreditAccountDetail y drawerRegistry (selectAccountDrawerMeta, selectHasSelectedCustomer); leen state.wallet |

### `src/features/wallet/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.payments.service.ts` | llamadas al backend que cambian cartera: POST /payments/register (abono a una factura) y PUT /users/credit (cupo y plazo de un cliente) | api/client y api/config; las usa wallet.payments.thunks |
| `wallet.service.test.ts` | pruebas de las llamadas de cartera: lista, totales, facturas, abono y cambio de cupo (ruta y cuerpo de cada una) | wallet.service y wallet.payments.service; el cliente HTTP está simulado (no hay red) |
| `wallet.service.ts` | llamadas al backend de cartera: POST /wallet (clientes con crédito), POST /wallet/summary (totales) y POST /wallet/internal (facturas de un cliente) | api/client, api/config y api/pagination (toPaginated), wallet.adapter (convierte); las usa wallet.thunks |

### `src/features/wallet/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.slice.ts` | estado de cartera que viene del backend: lista paginada, totales, filtros, cliente abierto y sus facturas | wallet.thunks y wallet.payments.thunks (lo llenan), wallet.selectors (lecturas), WalletScreen, CreditClientsTable, CreditAccountDrawer y rootReducer (clave 'wallet'; ya NO se guarda en el navegador) |

### `src/features/wallet/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.payments.thunks.ts` | cambios de cartera: abonar a una factura (o repartir un abono entre las más antiguas) y cambiar el cupo y el plazo de un cliente | wallet.payments.service (POST /payments/register y PUT /users/credit), wallet.service (releer facturas), wallet.thunks (recargar lista y totales) y wallet.slice (reacciona) |
| `wallet.thunks.test.ts` | pruebas de cartera con el slice real: lista, totales, facturas, abonos y cambio de cupo (con red, sesión y alertas simuladas) | wallet.thunks, wallet.payments.thunks y wallet.slice |
| `wallet.thunks.ts` | carga la lista de clientes con crédito, los totales (KPIs) y las facturas de un cliente | wallet.service (llamadas), auth (selectRequestContext), navigation (bodega activa) y wallet.slice (reacciona); las despachan useWalletLoader y useAccountData |

### `src/features/wallet/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `wallet.account.types.ts` | props de las partes del estado de cuenta (detalle, abono, cupo y facturas) | CreditAccountDetail, CreditAccountMetrics, CreditPaymentForm, CreditLimitForm, CreditInvoiceList, CreditInvoiceCard |
| `wallet.api.types.ts` | lo que responde el backend en cartera (nombres tal cual del Swagger) y los datos que se envían al pagar o cambiar el cupo | wallet.adapter (convierte a los tipos de la app), wallet.service y wallet.payments.service (los piden y envían) |
| `wallet.table.types.ts` | props de las partes de la tabla de clientes | CreditClientRow (la pinta CreditClientsTable), CreditUsageBar y CreditStatusBadge (las pinta CreditClientRow) |
| `wallet.types.ts` | contratos de cartera que usa la app: clientes con crédito, facturas, resumen, filtros y estado del slice | wallet.adapter (convierte lo del backend), wallet.constants, wallet.slice, wallet.selectors y los componentes de wallet (lo que responde el backend está en wallet.api.types) |

### `src/features/warehouses/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `index.ts` | API pública de la feature warehouses | rootReducer (reducer), AppHeader (WarehouseSelector y WarehouseMenu usan useWarehouses y pickActiveWarehouse) |

### `src/features/warehouses/constants/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.constants.ts` | tamaño de página y estado inicial de las bodegas | warehouses.service (cuántas pide) y warehouses.slice (initialState) |

### `src/features/warehouses/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.helpers.test.ts` | pruebas de la conversión de bodegas del backend y de la elección de la bodega activa | warehouses.helpers; se corre con npm test |
| `warehouses.helpers.ts` | convierte las bodegas del backend a las de la app y elige cuál queda activa | warehouses.service (toWarehouses) y WarehouseSelector (pickActiveWarehouse); funciones puras |

### `src/features/warehouses/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useWarehouses.ts` | pide las bodegas la primera vez y devuelve la lista y su estado de carga | WarehouseSelector y WarehouseMenu (los usan); despacha warehouses.thunks y lee warehouses.selectors |

### `src/features/warehouses/selectors/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.selectors.ts` | lecturas de las bodegas (lista y estado de carga) | useWarehouses (y con ella WarehouseSelector y WarehouseMenu); leen state.warehouses |

### `src/features/warehouses/services/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.service.test.ts` | pruebas de POST /warehouses: la ruta, el cuerpo que se envía y la conversión de la respuesta | warehouses.service; el cliente HTTP está simulado (no hay red) |
| `warehouses.service.ts` | llamada al backend de bodegas: POST /warehouses (listado paginado) | api/client, api/config y api/pagination (toPaginated), warehouses.helpers (convierte); la usa warehouses.thunks |

### `src/features/warehouses/slices/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.slice.ts` | estado de las bodegas del backend: lista, estado de carga y último error | warehouses.thunks (la llenan), warehouses.selectors (lecturas) y rootReducer (clave 'warehouses'; no se persiste, la bodega ACTIVA sí vive en ui) |

### `src/features/warehouses/thunks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouses.thunks.test.ts` | pruebas de la carga de bodegas: éxito, error y sin sesión | warehouses.thunks y warehouses.slice; el service y la sesión están simulados (no hay red) |
| `warehouses.thunks.ts` | carga las bodegas del backend con el contexto de la sesión | warehouses.service (llamada), auth (selectRequestContext) y warehouses.slice (reacciona); la despacha useWarehouses |

### `src/features/warehouses/types/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `warehouse.types.ts` | contratos de bodega (lo que usa la app, lo que responde el backend y el estado del slice) | warehouses.helpers (convierte), warehouses.service, warehouses.slice, WarehouseSelector y WarehouseMenu |

### `src/global/components/UI/atoms/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `AppToaster.tsx` | contenedor de las alertas flotantes (notificaciones arriba al centro) | App.tsx (se monta una sola vez) y global/helpers/toast (desde ahí se disparan) |

### `src/global/components/UI/molecules/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `ConfirmDialog.css` | estilos del diálogo de confirmación (fondo oscuro, tarjeta y botones) | estilos de ConfirmDialog |
| `ConfirmDialog.tsx` | diálogo de confirmación reutilizable (título, mensaje y botones Cancelar / Confirmar) | SideMenuUser (confirmar el cierre de sesión); usa useEscapeKey de global/hooks; no sabe qué acción confirma |
| `Pagination.css` | estilos del paginador reutilizable | estilos de Pagination |
| `Pagination.test.tsx` | pruebas del paginador: texto, botones habilitados según el meta, avisar la página pedida y ocultarse con una sola página | Pagination; se corre con npm test (usa un navegador simulado, jsdom) |
| `Pagination.tsx` | paginador reutilizable: Anterior, "Página X de Y" y Siguiente, a partir de los metadatos de paginación del backend | ShopCatalogScreen (catálogo) y CustomersScreen (clientes); recibe el meta de api (PaginatorMetadata) y avisa la página pedida |
| `SearchBar.css` | estilos de la barra de búsqueda | estilos de SearchBar |
| `SearchBar.tsx` | barra de búsqueda reutilizable con botón de limpiar | ShopCatalogScreen, CreditClientsTable |
| `StatCard.css` | estilos de la tarjeta de métrica | estilos de StatCard |
| `StatCard.tsx` | tarjeta de métrica (título, valor, subtítulo) | WalletKpiHeader |

### `src/global/components/UI/molecules/DataTable/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `DataTable.css` | estilos compartidos de las tablas de datos (tarjeta, tabla, celdas, mensajes y reintento) | estilos de DataTable |
| `TableMessageRow.tsx` | fila única de una tabla para mostrar "cargando", "sin resultados" o un error con botón "Reintentar" | DataTable.css (estilos compartidos de tablas); la usan SalesHistoryScreen, PendingCartsScreen, SuppliersScreen y ProductControlScreen |

### `src/global/components/UI/molecules/form/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `FormInputs.css` | estilos de inputs blindados de formulario · tokens de styles/tokens.css | estilos de FormInputs |
| `ValidatedInput.tsx` | input de texto blindado con sanitización y límite de caracteres | validation.helpers, formularios de clientes, productos y traslados |
| `ValidatedNumberInput.tsx` | input numérico blindado contra teclas inválidas ('e', 'E', '-', '+') | validation.helpers, cobros de caja, cantidades de stock y formularios de precios |
| `index.ts` | exportación de componentes moleculares de formulario | ValidatedInput, ValidatedNumberInput |

### `src/global/helpers/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `format.ts` | formatos compartidos: moneda (pesos colombianos) e iniciales de un nombre | WalletKpiHeader, CreditClientsTable, CreditAccountDrawer, ProductCard, ShopCartDrawer |
| `session.storage.ts` | guarda, lee y borra la sesión (tokens y usuario) en el navegador | features/auth (helpers/auth.session); api/client lee el mismo 'access_token' para el header Authorization |
| `storage.ts` | almacenamiento seguro (localStorage) para redux-persist | app/store/store |
| `toast.ts` | punto único para lanzar alertas flotantes desde cualquier feature | AppToaster (las pinta); uso: toast.success('Título', { description: 'detalle' }) o toast.error(...) |
| `validation.helpers.ts` | utilitarios puros de sanitización y validación estricta | ValidatedInput, ValidatedNumberInput y formularios de clientes, productos y traslados |
| `warehouse.ts` | convierte el id de bodega que guarda la app (texto) al número que espera el backend | shop.helpers (lo re-exporta), shop.*.thunks y wallet.thunks (las bodegas viajan como número en las peticiones) |

### `src/global/hooks/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `useApiHealth.ts` | consulta una vez la salud del backend y devuelve el estado (conectando, en línea o fuera de línea) con la latencia | api/health (checkApiHealth); lo usa ApiStatus en el footer del menú |
| `useAsyncValidation.test.ts` | pruebas del hook de validación asíncrona en tiempo real | useAsyncValidation, apiClient y vitest |
| `useAsyncValidation.ts` | hook de validación asíncrona en tiempo real (debounce 500ms) | apiClient, API_CONFIG (check-email, validate-document) y formularios |
| `useClickOutside.ts` | ejecuta una función cuando se hace clic fuera del elemento o se presiona Escape | dropdowns y menús flotantes (hoy AppHeader tiene su propia copia, se migra después) |
| `useDebouncedValue.test.ts` | pruebas de la espera antes de usar un valor que cambia seguido (por ejemplo lo que se escribe) | useDebouncedValue; usa un reloj falso para no esperar de verdad; se corre con npm test |
| `useDebouncedValue.ts` | devuelve el valor recién después de que dejó de cambiar durante `delayMs` (para no pedir al backend en cada tecla) | useProductsLoader (búsqueda por texto); sirve para cualquier campo que dispare una petición |
| `useEscapeKey.ts` | ejecuta una función cuando se presiona Escape (solo mientras isActive sea true) | DrawerRight (cerrar el panel); para menús con clic fuera se usa useClickOutside |
| `usePermissions.test.ts` | pruebas unitarias del motor de permisos jerárquicos | usePermissions, useFilteredMenuItems y vitest |
| `usePermissions.ts` | hook de validación jerárquica de permisos (admin bypass, módulos y pantallas) | auth slice (user, permissions), SideMenu (filtrado dinámico) y MainContent (guardia) |
| `useRedux.ts` | hooks de redux ya tipados (dispatch y selector), para no repetir el tipado en cada componente | app/store/store (solo tipos); los usan app/componentApp y todas las features |

### `src/styles/`

| Archivo | Qué hace | Conecta con |
|---|---|---|
| `tokens.css` | variables de diseño: colores, texto, radios, sombras, espaciado y movimiento | estilos de tokens |

## Reservadas (intactas)

- `src/features2/featuresdoclist.txt`
- `src/features2/featuresstoreBase.txt`
- `src/global2/components/UI/atoms/Badge.tsx`
- `src/global2/components/UI/atoms/Button.tsx`
- `src/global2/components/UI/atoms/Input.tsx`
- `src/global2/components/UI/molecules/QuantityStepper.tsx`
- `src/global2/components/UI/molecules/SearchBar.tsx`
- `src/global2/components/UI/molecules/StatCard.css`
- `src/global2/components/UI/molecules/StatCard.tsx`

## Raíz del proyecto

| Archivo | Qué hace |
|---|---|
| `index.html` | Página base; carga `/src/main.tsx`. |
| `package.json` · `package-lock.json` | Dependencias y comandos (`dev`, `build`, `lint`). |
| `vite.config.ts` | Configuración de Vite (alias `@` → `src`, Tailwind y React). |
| `tsconfig*.json` · `eslint.config.js` | Reglas de TypeScript y de lint. |
| `.env.example` | Variables de entorno de ejemplo: `VITE_API_BASE_URL` y `VITE_WS_URL`. |
| `docs/CONVENTIONS.md` | Reglas de estructura, nombres, comentarios y estilos. |
| `docs/INFORME-ESTRUCTURA.md` | Informe de la validación final. |
| `docs/ESTRUCTURA.md` | Este documento. |

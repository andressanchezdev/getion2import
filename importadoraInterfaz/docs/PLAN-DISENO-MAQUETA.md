# Plan: llevar el diseño de la maqueta a Gestión Importadora

Fecha: 2026-10-27 · Repo de trabajo: `GestionImportadora` (v2.3) · Respaldo: `GestionImportadoraidea` (no se modifica)

La maqueta es `Idea/analisis-api-importadora/MAQUETA-V3.html` (repo de respaldo). Aquí solo se traslada **diseño y estructura visual**; la lógica, los endpoints y las opciones del menú no cambian.

## 1. Qué se pidió

1. Las **cards** (producto, productos del carrito y cards del contenido central) quedan con el mismo diseño exacto de la maqueta.
2. **Menú lateral** (ítems y subítems), **contenido central** y **panel derecho** (y la cabecera que los acompaña) toman el diseño de la maqueta. Las **opciones del menú no cambian**: siguen siendo las de `MENU_ITEMS`.
3. **Sin detalle de producto.** El producto solo se ve en su card, en el carrito o como fila de una tabla. No se replica el modo «Ficha de producto» de la maqueta.
4. **Vista de pedidos como tabla** (no la card del cliente): una columna por cada dato importante, los datos de segundo nivel en una vista de detalle y las acciones integradas.
5. Respetar el encarpetado y las reglas del repo (`docs/CONVENTIONS.md`, `src/plan.txt`): tokens en `styles/tokens.css`, un `.css` junto a cada `.tsx`, archivos de menos de 150 líneas, código en inglés y textos en español, sin `!important`, nada de archivos borrados (lo obsoleto se anota en `plan.txt` sección 13).

## 2. Estado de los dos repositorios

| | `GestionImportadora` (principal) | `GestionImportadoraidea` (respaldo) |
|---|---|---|
| Rama / último commit | `main` · `7b4f890` (27 oct) · árbol limpio | `main` · `26eee25` (27 oct) |
| Archivos en `appImportadoraIp` | 410 | 540 |
| Features | auth, catalogs, customers, employees, navigation, realtime, settings, shop, transfers, wallet, warehouses | las mismas + sales, management, quotations, reports, suppliers, inventory y la molécula `DataTable` |
| Carpeta `Idea` | no tiene | maqueta, plan V3, script SQL (48 tablas) y pruebas |

- Lo único del principal que no está en el respaldo: nada. El principal es un subconjunto; 230 archivos con el mismo nombre difieren en contenido.
- La vista de pedidos (`shop > orders`) y el historial (`shop > history`) hoy muestran el aviso «Próxima Fase» en el principal; el respaldo tiene una versión anterior (`PendingCartsScreen`, `SalesHistoryScreen`, `StageOrders`) que sirve de referencia, no se copia tal cual.

## 3. Auditoría del sistema de diseño (repo principal)

| Hallazgo | Detalle | Acción |
|---|---|---|
| Tokens usados y **no definidos** | 35 nombres (`--color-bg-muted`, `--color-bg-elevated`, `--shadow-sm`, `--color-primary`, `--color-danger`, `--duration-fast`, `--ease-default`, `--radius-full`, `--color-success*`, …) en RolesPermissions, Settings, Transfers, modales, FormInputs, MainContent y AppHeader: esos estilos hoy no se aplican | definirlos como alias de la paleta nueva o apuntarlos a un token existente |
| Valores sueltos | 23 colores escritos a mano (Transfers, CreateTransferModal, CreateCustomerModal, TierMenu, ShopCartFooter) y 4 `!important` | pasar a tokens y quitar los `!important` |
| Tipografía | `check:type` hoy pasa; escala 12 · 13 · 14 · 16 · 18 · 20 · 24 | se mantiene: la maqueta usa 10 a 12,5 px en algunas etiquetas y se llevan a 12 px (mínimo legible) |
| Radios | escala sm 6 · md 8 · lg 12; la maqueta usa mucho **10 px** (paneles, campos, cards del carrito) | agregar `--radius-base: 10px` |
| Archivos de más de 150 líneas | `App.css` 153, `CustomerDrawer.css` 185, `CreateTransferModal.css` 158, `CreateCustomerModal.tsx` 151 | se parten solo si se tocan |
| Tokens sin uso | `--drawer-width-collapsed`, `--leading-none`, `--radius-rem-12`, `--text-icon-lg`, `--text-rem-12`, `--text-rem-24` | se dejan (alias heredados) |
| Paleta | la app usa grises de «clienteIP» y la tarjeta tipo Yamaha; la maqueta usa dos familias: **chrome** (`#f5f6f9`, línea `#dfe3ea`, azul `#1f64e0`) y **cards de IP** (`#e5e5e5`, `#757575`, amarillo `#ffc629`) | tokens para las dos familias; el login conserva sus tokens |

## 4. Qué se traslada (maqueta → app)

| Maqueta | App | Archivos principales |
|---|---|---|
| `.app` (menú · columna central con cabecera · panel) | `ErpLayout`: la cabecera pasa dentro de la columna central | `ErpLayout.tsx/.css` |
| `.side`, `.brand`, `.mi`, `.sub`, `.api`, `.ufoot`, modo `mini` | `SideMenu` + `item/` + `footer/`; la marca pasa de la cabecera al menú; botón ☰ usa `ui.sidebarOpen` | `sideMenu/**` |
| `.hdr`, `.sel`, `.burger` | `AppHeader` + selector de bodega + engranaje | `header/**` |
| `.scr`, `.ttl`, `.tools`, `.search`, `.fchip`, `.btn` | `MainContent` y la barra del catálogo | `contentMain/**`, `shop/components/catalog/**` |
| `.pcard` (tarjeta de IP) | `ProductCard` y sus partes; se agrega el logo de la marca | `shop/components/productCard/**`, `shop.adapter` |
| `.cart-search`, `.ccard`, `.ctotals`, `.cbtn` | `ShopCartDrawer`, `ShopCartItem`, `ShopCartFooter` | `shop/components/cart/**` |
| `.dh`, `.dbody`, `.dfoot`, `.sec`, `.kv` | `DrawerRight` y `DrawerHeader` (400 px) | `drawerRight/**` |
| `.dt`, `.pill`, `.toast` | tablas y estados de cartera, clientes, traslados | `wallet`, `customers`, `transfers` |

**No se traslada:** las opciones del menú de la maqueta (la app conserva las suyas), la ficha de producto, la card de pedido de cliente (`.ecard`), el selector de compañía, el indicador «En vivo» y la campana (no existen en la v2.3).

## 5. Vista de pedidos (tabla)

- Pantalla `shop > orders` («Bandeja de Pedidos») como **tabla**: Pedido (serie + copiar), Cliente, Etapa actual y su estado, Situación (pedido, venta de contado, venta a crédito, cancelado), Método de pago, Total, Pagado o saldo, Fecha, Responsable y Acciones.
- Lo de segundo nivel va en el **panel derecho** (modo nuevo `order` en `drawerRegistry`, sin crear componentes nuevos en `app/`): tienda, picking inmediato, líneas, recorrido de etapas con quién y cuándo, pagos, envío, factura.
- Acciones: tomar, pausar, soltar, completar, devolver con motivo, verificar, registrar abono y cancelar con motivo; según el estado del pedido y los permisos.
- Fuente de datos: los endpoints ya documentados en `api/config.ts` (sin sondear Railway); cuando exista la API en Go solo cambia el service.

## 6. Orden de trabajo

1. Vista previa local con red simulada (fuera del repo).
2. Tokens (paleta, radios, sombras, medidas del layout) y los 35 tokens que faltaban.
3. Shell: layout, menú, cabecera, contenido y panel derecho.
4. Cards del catálogo y carrito.
5. Vista de pedidos.
6. Resto de pantallas y modales con los tokens nuevos.
7. Validación: `npm run build`, `npm run lint`, `npm test`, `npm run check:type`, revisión visual contra la maqueta y accesibilidad.

## 7. Desviaciones aceptadas y preguntas abiertas

- Texto mínimo 12 px (regla del repo) en lugar de los 10 a 11,5 px de la maqueta.
- El subtotal y el IVA (19 %) del carrito se calculan como en la maqueta (precios con IVA incluido) hasta que el backend envíe los impuestos.
- La ubicación en estantería de cada producto (dato de la v2.3) se muestra en la fila de la marca y el modelo, sin agregar una línea nueva a la card.
- Pendiente de confirmar: si la ficha de producto también debe salir de la maqueta del respaldo (hoy no se toca ese repo).
- Pedidos: tabla (Pedido, Cliente, Etapa, Pago, Total, Fecha, Acciones) con detalle en el panel derecho; datos de `/management/*`. Acciones hechas: ver detalle, copiar número y anular con motivo. Las del flujo por etapas (tomar, completar, verificar, pausar, devolver, abono) quedan para la API en Go.
- Se añadió `GET_SALE_BY_ID` a `api/config.ts` para el detalle del pedido.

## 7b. Ajustes de menú, cabeceras y carrito

- Las dos cabeceras (menú y columna central) miden `--header-height` (60 px).
- El botón de contraer el menú vive en la cabecera del menú (`SideMenuBrand`); contraído solo se ve el botón. El nombre de la marca pasa a dos líneas para caber junto al botón.
- Nombres cortos en las subgestiones; «Gestión Caja» pasó a «Gestión Ventas»; `catalogs` se separó en `brands`, `categories` y `models` (sin pantalla todavía: muestran «Próxima Fase»).
- La card de producto tiene `--product-card-max-width` (380 px); el tope va en la card y no en la columna del grid, porque con tope en la columna el navegador cuenta menos columnas.
- La pestaña del carrito contraído se arrastra solo en vertical (`useVerticalDrag`): también con flechas, queda pegada al borde derecho, se detiene a 8 px de los bordes y recuerda su posición en `localStorage` (`ip_cart_tab_top`).

## 8. Resultado de la validación

- `npm run check:type` OK; `npx vitest run`: 292 pasan y 2 fallan por `CATALOGS.MODELS` y `PRODUCTS.SEARCH`, que ya no están en `config.ts` desde antes de este trabajo.
- `npx tsc -b`: solo esos 2 mismos errores. `npm run lint`: errores de `any` en archivos que no se tocaron.

# PLAN V3 — Gestión Importadora

**Versión 5 (completa)** · 26 de octubre de 2026

Reúne todo lo acordado: compañías, roles, flujo del pedido, créditos, auditoría, tiempo real, el principio de que el frontend no depende de la API, el diseño de IP para tarjeta, carrito y cards de pedido, y la limpieza de archivos. Esta versión suma la **revisión de las 70 tablas (quedan 46)**, el **stock físico, compartido y virtual**, el **diagrama horizontal** y el **fondo claro** de la maqueta.

Todo el contenido vive en `C:\Users\User\repos\GestionImportadora\Idea\` y los archivos **deben coincidir entre sí**, porque salen de las mismas fuentes:

| Archivo | Qué es |
|---|---|
| [`analisis-api-importadora/V3-esquema-borrador.sql`](analisis-api-importadora/V3-esquema-borrador.sql) | El script completo de la base de datos (se copia y pega en PostgreSQL) |
| [`analisis-api-importadora/MAQUETA-V3.html`](analisis-api-importadora/MAQUETA-V3.html) | Cuatro pestañas, todas en fondo claro: 1 la aplicación · 2 la base de datos (diagrama) · 3 el script SQL · 4 la estructura del frontend |
| [`diagrama_ER_V3_horizontal_claro.pdf`](diagrama_ER_V3_horizontal_claro.pdf) | El diagrama de la base de datos en PDF: un mapa de grupos, una página por grupo, el stock y las tablas que se quitaron |
| [`analisis-api-importadora/pruebas-bd/`](analisis-api-importadora/pruebas-bd/README.md) | Los 111 escenarios con los que se probó el script y cómo repetirlos |
| [`analisis-api-importadora/DOCUMENTACION-API.md`](analisis-api-importadora/DOCUMENTACION-API.md) | La API actual (189 endpoints validados, ninguno inventado) |

> `diagrama_ER_horizontal_claro.pdf` (61 tablas) es una versión anterior del diagrama; se conserva como referencia de estilo y ya no coincide con el script.

**Cómo se corresponden las pestañas de la maqueta con este plan**

| Pestaña de la maqueta | Sección del plan |
|---|---|
| 1 · La aplicación (menú, catálogo, carrito, pedidos, compañías, auditorías) | 3.4 a 3.10 |
| 2 · Base de datos (grupos, diagrama de cada grupo, stock, de 70 a 46 tablas, campos) | 1.3 a 1.6 |
| 3 · Script SQL | Fase 1 completa |
| 4 · Estructura del frontend (árbol, capas, archivos que se retiran) | 3.2, 3.11 y 3.12 |

## Resumen: qué hay hecho y qué falta

| Pieza | Estado |
|---|---|
| Documentación de la API actual | ✅ Hecha |
| Base de datos: **46 tablas**, 431 campos, 113 llaves foráneas, 49 funciones, 80 disparadores, 5 vistas, 30 índices | ✅ Escrita y **probada en PostgreSQL 18.6**: corre completa y pasa 111 escenarios |
| Maqueta de las cuatro pestañas, en fondo claro | ✅ Hecha y revisada en el navegador |
| Diagrama de la base de datos en PDF | ✅ Hecho |
| API en Go | ⏳ Fase 2 (diseñada aquí) |
| Frontend nuevo (diseño de IP, API local, tiempo real) | ⏳ Fase 3 (diseñada aquí) |
| Integración con SIIGO | ⏳ Diseñada; falta una cuenta de pruebas de SIIGO |

## Qué cambió frente a la versión anterior del plan

1. **Fondo claro.** Toda la maqueta (las cuatro pestañas, incluidos el menú, el panel derecho y el script) pasa a fondo blanco o gris muy claro. El gris oscuro y el negro quedan para el texto; el azul y el amarillo de Importadora, como acento (3.4).
2. **De 70 a 46 tablas.** Se revisó cada tabla una por una: 26 se quitan o se fusionan y 2 son nuevas (`stock` y `third_parties`). No se perdió ninguna función (1.4).
3. **Stock en una sola tabla.** El stock físico vive en `stock` (una fila por producto, bodega y ubicación). El stock compartido entre todas las bodegas y el stock virtual de cada tienda se **calculan** con vistas; no se guardan (1.5).
4. **Diagrama horizontal.** Cada grupo se dibuja de izquierda a derecha, con una flecha por cada par de tablas y en una sola dirección, sin cajas encimadas. Está en la maqueta y en un PDF (1.6).
5. **Modelo más simple de personas y terceros:** un empleado es un usuario, un usuario tiene un solo rol, y proveedores, transportadoras y otros terceros son una sola tabla. La **tienda** reemplaza al canal de venta y el método de pago son cuatro valores fijos.
6. **WebSocket sin tabla de entradas:** se autentica con el token en su primer mensaje (1.12).
7. **Pruebas:** 111 escenarios (eran 101).
8. **Todo el contenido está en la carpeta `Idea`** del repositorio de Gestión Importadora.

---

## 0. Punto de partida: reglas, directorios y el sistema

### 0.1 Reglas de trabajo (aprobadas)

| # | Regla | Qué significa |
|---|---|---|
| R1 | **Todo es local** | Base de datos, API y frontend corren en tu computador. Nada va a Railway ni a la nube. |
| R2 | **No se crea ningún repositorio nuevo** | Ni `git init` ni `backend importadora` como repo aparte. |
| R3 | **No se hace ningún commit** | Los commits los haces tú. |
| R4 | **Todo se aplica sobre Gestión Importadora** | Carpeta `C:\Users\User\repos\GestionImportadora`. |
| R5 | **No más pruebas contra la API real de Railway** | La API actual solo se consulta por la documentación ya hecha. |
| R6 | **El frontend conserva su estructura actual** | Mismas capas, mismos tokens, misma modularidad. |
| R7 | **Lo que se entrega se prueba** | El script SQL se ejecuta de verdad (no solo se lee) y la maqueta se abre en el navegador. |
| R8 | **Nada se mueve ni se borra de tu código hasta que lo apruebes** | El árbol de la pestaña 4 es una propuesta; no se tocó ningún archivo real de `appImportadoraIp`. |

### 0.2 Mapa de directorios

| Directorio | Papel | ¿Se modifica? |
|---|---|---|
| `C:\Users\User\repos\GestionImportadora` | **Proyecto destino**: el único que se modifica | **Sí** |
| `…\GestionImportadora\Idea` | **Todo lo analizado y diseñado**: este plan, la maqueta, el script, las pruebas y el diagrama en PDF | Solo documentos |
| `…\GestionImportadora\appImportadoraIp` | Frontend (React): recibe el rediseño y la conexión a la API local | Sí (Fase 3) |
| `…\GestionImportadora\backend` *(carpeta nueva, sin repo)* | API en Go | Se crea (Fase 2) |
| `…\GestionImportadora\PGSQL` *(carpeta nueva, sin repo)* | Scripts de PostgreSQL | Se crea (Fase 1) |
| `C:\Users\User\repos\importadora-online` | **Versión inicial (v1)**: solo para entender la lógica original (incluido su WebSocket) | No |
| `C:\Users\User\repos\IP` | **Origen del diseño** de la tarjeta de producto, el carrito y las cards de pedido («cards de espera») | No |
| `C:\Users\User\repos\grandmas_liquors` | **Referencia visual y de agrupación del menú**; su estructura de código no se copia | No |

### 0.3 Resultado final

1. Una **base PostgreSQL** con todos los modelos, compañías, roles con permisos, flujo de pedido con estados que la propia base hace respetar, tiempo real, auditoría y datos de prueba (2 usuarios por rol).
2. Una **API en Go** local que reemplaza a la de Railway: rápida, con búsquedas por modelo padre, WebSocket y preparada para mucha concurrencia.
3. El **frontend de Gestión Importadora** con su estructura de hoy, el aspecto de Grandma's adaptado a los colores de Importadora (fondos claros), tarjetas, carrito y cards de pedido de IP, y conectado a la API local, **sin depender de ella** (3.2).
4. La **integración con SIIGO** diseñada y lista para activarse.

### 0.4 Negocio

Importadora de repuestos y accesorios para moto: mucho personal, unos 8.000 productos, ventas en línea en crecimiento, varias bodegas y la necesidad de crecer sin rehacer nada.

### 0.5 Compañías (multiempresa real)

> **Una compañía es una empresa que se registra en la plataforma y gestiona lo suyo.** No es una marca.

| Concepto | Qué es |
|---|---|
| **Compañía** (`companies`) | Una empresa con **sus** empleados, clientes, productos, bodegas, tiendas, stock, roles y permisos. «Este empleado es de esta compañía», «este producto es de esta compañía». |
| **Compañía anfitriona** (`is_host`) | La que opera la plataforma: **Gestión Importadora**. Solo hay una. Su **superadministrador** puede ver y gestionar todas las compañías. |
| **Marca** (`brands`) | Yamaha, Suzuki, Kawasaki, Kixx, Shell… Son **comunes a todas las compañías** y llevan su logo. |
| **Tercero** (`third_parties`) | Proveedores, transportadoras y otros terceros de **cada compañía**, en una sola tabla con su tipo (ej. «Yamaha Motor Colombia», «Servientrega»). No entran a la aplicación. |
| **Conexión con una marca** (`company_brands`) | Las marcas con las que cada compañía puede vender. La base rechaza un producto cuya marca no esté conectada a su compañía. |
| **Producto** (`products`) | Los repuestos y accesorios. Lo **posee** una compañía (`company_id`), lleva marca, categoría, modelo, códigos y QR, y se anexa a sus proveedores (`product_suppliers`). |
| **Stock prestado** (`stock_shares`) | Una compañía autoriza a otra a vender unidades suyas. La que vende lo hace con **su** producto; el stock sale de la bodega de la dueña. |

**Cómo se comporta**

- Todo lo relacionado **pertenece a la misma compañía**: un pedido no puede usar un cliente, un vendedor, una bodega, una categoría o una existencia de otra compañía (la base lo rechaza). La única excepción es el stock prestado, que se valida contra el préstamo.
- Un **correo = un usuario = una compañía**.
- Al **registrar una compañía nueva** recibe automáticamente sus roles (con los mismos permisos que los de la anfitriona, **sin** superadmin) y los niveles de precio P0–P3.
- **Hoy solo se necesita poder agregar otra compañía** (pantalla *Compañías*, solo superadmin). Traer en bloque los datos de otra compañía (productos, stock, usuarios, clientes, empleados) es un proceso aparte que se diseña después.
- **Stock prestado, ejemplo:** la compañía A presta 10 unidades de una existencia a B. B las vende con su producto: `sale_items.stock_company_id` queda en A, el cupo del préstamo (`qty_used`) sube, y A y B reciben en vivo el cambio de stock. Si B cancela el pedido, el cupo y el stock se liberan. Un préstamo no puede superar el stock libre ni usarse si está cerrado.
- *Supuesto:* las «secciones» de una compañía son sus **áreas, bodegas y tiendas**.

### 0.6 Flujo principal

1. **Catálogo:** producto = marca + categoría + modelo (ej. `15W40`) + código de barras + QR + imágenes + precios por nivel.
2. **Inventario:** el stock físico vive en una **existencia**: un producto en una ubicación de una bodega.
3. **Carrito:** **aparta** stock mientras está abierto y vence solo (1 hora).
4. **Pedido:** nace con un método de pago (**efectivo, transferencia o crédito**) y recorre seis etapas con verificación (1.10).
5. **Venta:** el pedido pasa a ser venta cuando se **verifica el pago**. De contado = ingreso; a crédito = plata que nos deben.
6. **Devoluciones:** no devuelven dinero, dejan **crédito a favor**.
7. **Compras** a proveedores, **traslados** entre bodegas, **conteos**.
8. **Facturación electrónica** vía SIIGO.

### 0.7 Quién entra a la aplicación

| Tipo | ¿Tiene usuario y contraseña? |
|---|---|
| Superadministrador, empleados | **Sí** (con un rol y sus permisos) |
| Clientes | **Sí** (tienda en línea) |
| Proveedores, transportadoras, otros terceros | **No**: son datos que ingresan los empleados |
| Productos | No aplica |

---

# FASE 1: BASE DE DATOS (PostgreSQL, local)

**Ubicación al construirla:** `GestionImportadora\PGSQL` · **Hoy:** [`V3-esquema-borrador.sql`](analisis-api-importadora/V3-esquema-borrador.sql) (1.767 líneas).

## 1.1 Entorno local

- PostgreSQL 16 o superior (se probó con **18.6**), con las extensiones `pgcrypto`, `pg_trgm` y `citext` (el script las crea).
- Una base `gestion_importadora` y un usuario de la API **que no sea dueño de las tablas**, para que no pueda saltarse las reglas.
- Ejecutar: `psql -U <usuario> -d gestion_importadora -f V3-esquema-borrador.sql`, o pegarlo en pgAdmin/DBeaver. Corre entre `BEGIN` y `COMMIT`: queda todo o nada.

## 1.2 Reglas de diseño

- **Claves:** número autoincremental + `uuid` público donde se expone (carrito, pedido, producto, usuario, cliente).
- **Multiempresa:** toda tabla de negocio lleva `company_id`; los únicos lo incluyen.
- **Dinero:** `NUMERIC(14,2)`.
- **Estados:** `CHECK` en cada tabla: un estado inválido es imposible.
- **Borrado lógico** en maestros (`deleted_at`); los documentos no se borran.
- **Búsqueda:** índices `trigram` y un `search_text` que **arma la base** al guardar el producto.
- **Nombres cortos:** ningún nombre de tabla o campo pasa de 20 caracteres (1.13).
- **Una tabla se queda si tiene vida propia** (su propio ciclo, se consulta por separado o protege una regla). Lo repetido, lo derivado y lo de 1 a 1 no merece tabla (1.4).

## 1.3 Las 46 tablas

Siete grupos. La auditoría usa además una partición por mes (la base las crea).

| Grupo | # | Tablas |
|---|---|---|
| **Compañías y seguridad** | 8 | `companies`, `roles`, `permissions`, `role_permissions`, `users`, `refresh_tokens`, `audit_actions`, `audit_events` |
| **Personas y terceros** | 3 | `price_levels`, `customers`, `third_parties` |
| **Catálogo** | 9 | `brands`, `company_brands`, `models`, `categories`, `products`, `product_codes`, `product_prices`, `product_suppliers`, `customer_discounts` |
| **Inventario** | 8 | `warehouses`, `stock`, `stores`, `store_warehouses`, `stock_shares`, `stock_movements`, `counts`, `count_items` |
| **Ventas** | 9 | `sales`, `sale_items`, `sale_stages`, `carts`, `cart_items`, `quotations`, `quotation_items`, `returns`, `return_items` |
| **Dinero y compras** | 5 | `payments`, `credit_entries`, `purchases`, `purchase_items`, `invoices` |
| **Tiempo real e integración** | 4 | `rt_events`, `notifications`, `siigo_credentials`, `siigo_outbox` |

Además hay cinco **vistas** (no son tablas, se calculan al consultar): `v_customer_credit` (lo que debe y lo que tiene a favor cada cliente), `v_stock` (cada existencia con lo vendible), `v_stock_company` (stock compartido entre todas las bodegas), `v_virtual_stock` (stock virtual de cada tienda) y `v_locations` (productos y unidades de cada ubicación).

**Tablas clave y qué guardan**

| Tabla | Para qué sirve |
|---|---|
| `users` | Quien entra a la aplicación, con **un solo rol**. Un empleado es un usuario con su cédula, área y bodega; un cliente es un usuario ligado a su ficha en `customers` |
| `customers` | El cliente, su nivel de precio, su cupo de crédito y su estado. Sus direcciones y contactos son listas dentro de la misma ficha |
| `third_parties` | Proveedores, transportadoras y otros terceros, con su tipo |
| `products` | Código de barras, marca, categoría, modelo, promoción, estado (borrador · activo · inactivo · descontinuado), la compañía dueña, sus imágenes y el contenido de su **código QR** (`IMP:` + su uuid) |
| `stock` | Stock físico de un producto en una ubicación de una bodega: `available` (físico), `in_cart` (apartado en carritos) y `reserved` (reservado por pedidos). **Vendible = available − in_cart − reserved** |
| `sales` | Pedido o traslado: tienda, método de pago, picking inmediato, estado (abierto · completado · cancelado), etapa actual, `sale_at` (desde cuándo es venta), si es de contado o a crédito, y su envío (transportadora y guía) |
| `sale_stages` | Las **seis etapas** de cada pedido con su estado, quién la tomó y quién la verificó |
| `sale_items` | Renglones con **precio congelado**, unidades sacadas (`picked_qty`) y empacadas (`packed_qty`), de qué existencia salen y de qué compañía salió el stock |
| `payments` | Pagos y abonos: en revisión · verificado · novedad · anulado, con comprobante |
| `credit_entries` | **Libro de créditos del cliente** (solo se agregan filas): lo que **debe** y lo que tiene **a favor** |
| `returns` | Devoluciones: nunca devuelven dinero, generan crédito a favor |
| `rt_events` | Cada cambio importante, listo para repartirse por WebSocket |
| `audit_events` | Registro de auditoría de solo agregar |

## 1.4 ¿Hacían falta las 70 tablas? Auditoría de tablas

**No.** Se revisó cada tabla del borrador con una pregunta: **¿tiene vida propia?** Una tabla se queda si tiene su propio ciclo de vida, se consulta por separado o protege una regla que no se puede proteger de otra forma. Se quitó lo que era repetido, derivado de otra tabla, de 1 a 1 con otra, o que hoy no usa nadie. **70 − 26 que se quitan + 2 nuevas (`stock` y `third_parties`) = 46.**

| Ya no existe | Ahora | Por qué |
|---|---|---|
| `warehouse_locations`, `product_locations`, `stock_levels` | `stock` | Eran tres tablas para decir cuántas unidades hay de un producto en una ubicación de una bodega. Ahora es una sola fila por producto, bodega y ubicación (la ubicación es un texto como `04-F01`). El maestro de ubicaciones de hoy tampoco lo usa ninguna pantalla |
| `virtual_stock` | vista `v_virtual_stock` | El stock virtual no se guarda: se calcula sumando el físico de las bodegas que surten cada tienda, así nunca se desajusta |
| `suppliers`, `carriers`, `other_parties` | `third_parties` (con el tipo) | Guardaban los mismos datos. Las tres pantallas de *Gestión Terceros* siguen igual; solo cambia el filtro |
| `employees` | `users` | Un empleado es un usuario con su cédula, área y bodega. Eran dos tablas que siempre iban de 1 a 1 |
| `user_roles` | `users.role_id` | Un usuario tiene un solo rol |
| `devices` | `refresh_tokens` (las sesiones) | Cada sesión ya guarda su dispositivo y su dirección IP |
| `customer_addresses`, `customer_contacts` | `customers.addresses` y `customers.contacts` | Son listas cortas que solo se ven en la ficha del cliente y no se relacionan con nada más |
| `product_qr` | `products.qr_payload` | Era 1 a 1 con el producto; la base arma el contenido del QR |
| `product_images` | `products.images` | Lista de direcciones sin vida propia; la primera es la principal |
| `price_history` | `audit_events` | Todo cambio de precio ya queda auditado con el valor anterior, el nuevo, quién lo hizo y el motivo |
| `supplier_brands` | `product_suppliers` | Qué marcas surte un proveedor ya lo dicen los productos que se le anexan |
| `sales_channels` | `stores.store_type` | Un canal y una tienda eran lo mismo: mostrador = tienda física, en línea y corporativo |
| `payment_methods` | `sales.payment_method` y `payments.method` | Cuatro valores fijos (efectivo, transferencia, crédito, saldo a favor) que las reglas del pedido ya conocen; no cambian por compañía |
| `sale_dispatches` | columnas del pedido (`carrier_id`, `tracking_no`…) | Era 1 a 1 con el pedido |
| `customer_favorites` | se retira | Sin uso: en producción el endpoint de favoritos está roto y ninguna pantalla lo usa |
| `rt_tickets` | se retira | El WebSocket se autentica con el token en su primer mensaje (1.12) |
| `api_rate_limit_log` | se retira | El límite de peticiones se controla en memoria dentro de la API; escribirlo en la base solo la sobrecargaría |
| `sync_queue`, `sync_conflicts` | se retiran | Cola y conflictos de dispositivos sin conexión: ninguna pantalla usa esos endpoints hoy. Se diseñan cuando exista el caso de uso |
| `siigo_entity_map` | columnas `siigo_id` y `siigo_credentials.settings` | Los códigos de SIIGO ya tienen su columna en cada tabla; los demás van en `settings` |
| `schema_migrations` | la herramienta de migraciones | El control de versiones lo crea esa herramienta; no es parte del modelo |

**Lo que se revisó y se queda a propósito**

| Tabla | Por qué se queda |
|---|---|
| `permissions` y `role_permissions` | Son el control de acceso. Sin ellas la lista de permisos viviría repetida en la base, en la API y en la pantalla *Roles y Permisos* |
| `company_brands` | Es la regla «una compañía solo vende las marcas a las que se conecta» |
| `product_codes` | Un producto tiene varios códigos (barras, referencia, proveedor…) y cada uno debe ser único por compañía |
| `quotations` y `carts` | Se parecen, pero el carrito aparta stock y vence solo; la cotización no aparta nada y tiene vigencia |
| `counts` y `count_items`, `purchases` y `purchase_items`, `returns` y `return_items` | Son documentos con encabezado y renglones |
| `invoices` | Tiene su propio ciclo con la DIAN (pendiente, aceptada, rechazada, anulada) |
| `siigo_credentials` | La llave va cifrada y aparte de los datos de la compañía |
| `audit_actions` | Es la lista de acciones que exigen motivo; sin ella esa regla se repartiría en el código |
| `customer_discounts` | La app lo usa (descuentos por cliente, marca, categoría o producto) |

## 1.5 Stock físico, compartido y virtual

> Las compañías tienen **bodegas**; las bodegas tienen su **stock físico**; y a partir del físico se representan el compartido y el virtual.

```
companies ──< warehouses ──< stock  (una fila por producto, bodega y ubicación)        ← lo único que se guarda
                                │
                                ├──▶ v_stock_company   stock COMPARTIDO entre todas las bodegas de la compañía
                                │                       (suma de todas, más lo prestado por otras compañías)
                                └──▶ v_virtual_stock   stock VIRTUAL de cada tienda
                                                        (suma de las bodegas que la surten: store_warehouses)
```

- **Físico (`stock`):** disponible, apartado en carritos y reservado por pedidos. La ubicación es un texto dentro de la fila; `v_locations` cuenta los productos y las unidades de cada ubicación.
- **Compartido (`v_stock_company`):** lo que tiene la compañía sumando todas sus bodegas y, en `borrowed`, lo que otras compañías le prestaron y aún puede usar. `can_sell` es lo propio vendible más lo prestado.
- **Virtual (`v_virtual_stock`):** lo que ve cada tienda. Una tienda se surte de una o varias bodegas (con prioridad) y su stock virtual se mueve solo cuando se mueve el físico.
- **Reglas:** el carrito aparta y el pedido reserva **sobre la existencia física** (de forma atómica); al verificar el envío sale del físico. Nada se copia, así que los tres números nunca se desajustan.
- **Entre compañías:** `stock_shares` autoriza a otra compañía a vender unidades de una existencia (1.10).

## 1.6 Relaciones principales

```
companies ──< (todas las tablas de negocio)                  brands (comunes) >──< companies  (company_brands)
roles 1──< users (un usuario, un rol)   users 1──0..1 customers   roles >──< permissions (role_permissions)
users 1──< refresh_tokens (sesiones)
brands 1──< products >── 1 categories   products >── 1 models     products >──< third_parties[proveedor] (product_suppliers)
products 1──< product_prices >── 1 price_levels                    customers 1──< customer_discounts
warehouses 1──< stock >── 1 products     stock 1──< stock_movements (kardex)
stores >──< warehouses (store_warehouses)
stock_shares: stock (de la dueña) ── préstamo ──> products (de quien vende)
carts 1──< cart_items >── 1 stock      carts 1──0..1 quotations ──0..1 sales
customers 1──< sales 1──< sale_items >── 1 stock       sales >── third_parties[transportadora]
sales 1──< sale_stages (6 etapas)    sales 1──< payments     sales 1──0..1 invoices
customers 1──< credit_entries >── sales / payments / returns
sales (traslado) >── bodega origen y >── bodega destino (aux_warehouse_id)
```

**El diagrama visual** está en la pestaña 2 de la maqueta y, página por página, en `diagrama_ER_V3_horizontal_claro.pdf`:

- Cada grupo se dibuja **de izquierda a derecha**: a la izquierda las tablas de las que dependen las demás y a la derecha las que dependen de ellas.
- **Cada flecha une dos tablas y va en una sola dirección:** sale de la tabla referenciada y llega a la que guarda la llave foránea. Si hay varias llaves entre las mismas dos tablas, se muestran en una sola flecha.
- **Nada se encima:** las cajas no se tocan y ninguna flecha pasa por encima de otra caja (se comprobó con un cálculo, grupo por grupo).
- Las llaves hacia **otros grupos** no se dibujan: están dentro de cada caja, marcadas con ↗.
- Al hacer clic en una tabla se resaltan sus relaciones y se ven de qué depende y quién la usa. Se genera desde el script, así que siempre coincide.

## 1.7 Correcciones a lo que hoy está mal relacionado

| # | Problema en la API actual | Corrección |
|---|---|---|
| 1 | Los precios llegan todos con `type:"sale"`; el nivel se adivina por el orden | `price_levels` con nombre y orden; `product_prices` único por producto y nivel |
| 2 | *majority, immediate, corporate…* se usan para canal, tipo de cliente y precio a la vez | Tres conceptos: nivel del cliente, **tienda** (por dónde se vende) y nivel aplicado al pedido |
| 3 | El canal no sigue al tipo de cliente | La tienda **no** fuerza el precio |
| 4 | Un precio cambiado altera pedidos viejos | Precio **congelado** en cada renglón |
| 5 | El stock se descuadra | Una sola tabla de stock con tres columnas, kardex de movimientos y todo lo reserva la base |
| 6 | Banderas que a veces son booleano y a veces número | `BOOLEAN` y `NUMERIC` siempre |
| 7 | Reportes que devuelven plantillas en cero | Vistas y consultas reales |
| 8 | Filas fantasma (medio de pago vacío) | `NOT NULL` y `CHECK` |
| 9 | Clientes sin tipo | Nivel de precio obligatorio |
| 10 | Códigos del producto dispersos | `product_codes` con tipo y unicidad por compañía |
| 11 | La cartera y la billetera eran dos cosas | `credit_entries` + vista `v_customer_credit` |
| 12 | El historial de estados era una tabla aparte sin reglas | `sale_stages`: el estado **y** su orden los hace respetar la base |
| 13 | El pipeline actual factura después del packing | Ahora la **facturación va antes del picking** (1.10) |

## 1.8 Roles, permisos y datos de prueba

**10 roles × 2 usuarios = 20 usuarios.** Los correos son `<rol><1|2>@demo.local` (por ejemplo `vendedor1@demo.local`) y la contraseña de desarrollo es `Dev#2026`, guardada con **bcrypt** (`pgcrypto`). Es solo para desarrollo: se cambia antes de cualquier despliegue. `PGSQL/SEED_USERS.md` listará los 20. Los **empleados** traen en su usuario su cédula, su área (el rol) y su bodega. Solo los empleados y los clientes tienen usuario.

| Rol | Alcance | Permisos que trae el script |
|---|---|---|
| **superadmin** | **Global**: todas las compañías | **Todos (44)** |
| **admin** | Su compañía | **Ninguno**: el superadmin se los da después desde *Roles y Permisos* |
| gerente | Su compañía | Reportes (ventas, general, inventario), ver pedidos e historial, cancelar pedidos, historial de recaudo, ver stock, devoluciones |
| vendedor | Su compañía | Catálogo, pedidos (ver, historial, crear, editar, cancelar), etapa de verificación, cotizaciones, ver stock |
| bodeguero | Su compañía | Ver pedidos, etapas de picking y packing, ver stock, conteos, traslados, devoluciones |
| facturador | Su compañía | Ver pedidos, etapa de facturación, caja (operar, facturar, cierre) |
| despachador | Su compañía | Ver pedidos, etapas de envío y entrega |
| cartera | Su compañía | Ver pedidos e historial, créditos, abonos, verificar abonos, historial de recaudo, devoluciones |
| compras | Su compañía | Órdenes de compra, entradas de compra, proveedores, ver stock |
| cliente | Su compañía (la API le muestra solo lo suyo) | Catálogo, crear y ver sus pedidos e historial |

**Los 44 permisos** (módulo.acción): `catalog.view` · `orders.` view, history, create, edit, cancel y una por etapa (**take_verification, take_invoicing, take_picking, take_packing, take_shipping, take_delivery**) · `quotations.manage` · `cash.` operate, billing, close · `wallet.` credits, payments, verify, history · `products.manage`, `catalogs.manage`, `purchase_orders.manage`, `receipts.manage`, `stock.view`, `transfers.manage`, `returns.manage`, `counts.manage`, `stores.manage` · `customers.manage`, `employees.manage`, `roles.manage` · `suppliers.manage`, `carriers.manage`, `other_parties.manage` · `reports.` sales, general, inventory · `siigo.manage` · `audit.` view, view_changes, view_sensitive, export · `companies.manage`.

**Cómo los usa la base** (no solo la aplicación)

- Para **tomar o verificar** una etapa del pedido se exige el permiso de esa etapa (`take_picking`, `take_shipping`…): un vendedor no puede tomar el picking. La función `user_can()` además exige que el usuario esté activo.
- Para **verificar un pago**: `wallet.verify` o `orders.take_invoicing`. Para **aprobar una devolución**: `returns.manage`.
- La **auditoría** solo la tiene el superadmin (ningún otro rol trae sus cuatro permisos).
- Una compañía nueva recibe los mismos roles y permisos que la anfitriona, sin el superadmin.
- Cambiar el rol de un usuario cambia al instante lo que puede hacer.

**Semillas incluidas:** la compañía anfitriona; niveles de precio P0 Mostrador · P1 Taller · P2 Distribuidor · P3 Mayorista; 2 bodegas (Bodega principal y Bodega norte) con tres ubicaciones; 3 tiendas (principal, en línea y corporativa) y qué bodegas surten a cada una; 9 marcas conectadas (Yamaha, Suzuki, Kawasaki, Honda, Kixx, Shell, Castrol, Global Oil, Mobil); 4 proveedores (Yamaha Motor Colombia, Suzuki Colombia, Kawasaki Colombia y Lubricantes del Pacífico) y 2 transportadoras (Servientrega y Envía), todos como terceros; y **8 productos de ejemplo** (los de las tarjetas del catálogo) con precios por nivel, QR, stock y su proveedor. Cada usuario «cliente» trae su ficha (`cliente1` con crédito habilitado y cupo de 2.000.000). La versión final del script sumará los ~50 productos y pedidos de ejemplo en cada etapa.

## 1.9 Acciones y estados por modelo

| Modelo | Acciones | Estados |
|---|---|---|
| Producto | ver, crear, editar, activar/desactivar, **eliminar solo sin movimientos**, surtir por compra, marcar promoción, cambiar precio (con motivo), generar QR | borrador · activo · inactivo · descontinuado |
| Usuario / Empleado | crear, editar, asignar rol, activar/desactivar, bloquear (con motivo) | activo · inactivo · bloqueado |
| Cliente | crear, editar, nivel de precio, habilitar crédito y fijar cupo, ver crédito pendiente y a favor | activo · inactivo · en mora |
| Compañía | registrar, editar, desactivar (con motivo), trabajar en ella (superadmin) | activa · inactiva |
| Carrito | agregar, quitar, cambiar cantidad, convertir en cotización o pedido | abierto · convertido · abandonado |
| Cotización | crear, editar, enviar, convertir en pedido | borrador · enviada · aceptada · vencida · convertida |
| Pedido | crear, editar productos (solo antes de ser venta), tomar/soltar/pausar una etapa, completar, verificar, devolver una etapa (con motivo), cancelar (con motivo) | abierto · completado · cancelado; cada etapa: disponible · ocupada · en pausa · completada · verificada |
| Pago / abono | registrar, adjuntar comprobante, verificar, marcar novedad, anular (con motivo) | en revisión · verificado · novedad encontrada · anulado |
| Devolución | registrar, aprobar, rechazar | pendiente · aprobada · rechazada |
| Traslado | crear, enviar, recibir | usa las 4 etapas físicas |
| Compra | crear, recibir en bodega, anular | borrador · ordenada · recibida · anulada |
| Inventario | ajustar (con motivo), contar, prestar stock a otra compañía | conteo: pendiente · verificado · corroborado; préstamo: activo · cerrado |
| Proveedor, transportadora, otros terceros | crear, editar, desactivar (sin acceso al sistema) | activo · inactivo |
| Auditoría (solo superadmin) | consultar, ver antes/después, ver accesos, exportar | solo lectura |

Estas acciones son las que aparecen como botones en el menú ⋯ de cada fila (Fase 3).

## 1.10 Cómo se maneja el estado: todo lo hace respetar la base

Cada regla es un disparador o una restricción; la API no puede saltárselas.

### Flujo del pedido

```
Verificación ▶ Facturación ▶ Picking ▶ Packing ▶ Envío ▶ Entrega
   cada etapa:  disponible ▶ ocupada ▶ completada ▶ verificada        (ocupada ⇄ en pausa)
```

- Una etapa **no empieza** si la anterior no está **verificada**. Un pedido no pasa a Packing sin Picking.
- **Picking inmediato** (`sales.immediate_picking`): los ítems se sacan en el momento, así que el picking se completa y verifica **en un solo paso**, quedando registrado quién fue. Solo existe para ventas, no para traslados. *Supuesto mío; confírmalo.*
- **Ocupación** (disponible · ocupada · pausa, como en IP): si un empleado tiene la etapa, **otro no puede tomarla**. Una etapa ocupada siempre tiene dueño.
- **Permisos por etapa:** quien toma o verifica debe tener el permiso de esa etapa, y estar activo.
- Una etapa completada solo se **verifica** o se **devuelve** para rehacerla (la devolución exige motivo y queda auditada).
- **Picking** solo se completa cuando **todas** las unidades salieron de las estanterías (`picked_qty`); **Packing** solo cuando todas se empacaron (`packed_qty`), y no se empaca lo que no se sacó.
- **Entrega verificada = pedido completado.** Un pedido completado o cancelado no se reabre. Un pedido que ya está en **envío** no se cancela.
- Los **traslados** usan solo Picking, Packing, Envío y Entrega, y empiezan en el picking. Un traslado avisa a las dos bodegas (origen y destino).

> **Diferencia con la API actual:** hoy el pipeline es Verificación → Picking → Packing → Facturación → Despacho → Enviado. Aquí se sigue el orden que definiste: **la facturación va antes del picking**, para no sacar ni empacar productos de un pedido sin pago verificado. El frontend actual espera el otro orden y se alinea en la Fase 3.

### Cuándo un pedido pasa a ser venta

- El pedido **nace con un método de pago** (`sales.payment_method`): efectivo, transferencia o crédito.
- En la etapa **Facturación** se define y se **verifica el pago**:
  - **Efectivo o transferencia:** se registra el pago (la transferencia necesita su **comprobante**) y un empleado lo **verifica**. Cuando lo verificado cubre el total, el pedido pasa a ser una **venta válida de contado** (`payment_condition = cash`) y es ingreso.
  - **Crédito:** solo si el cliente tiene el crédito **habilitado**, no está en mora ni inactivo y la venta **cabe en su cupo**. Pasa a ser una **venta a crédito**: **no es ingreso, es plata que nos deben** y queda como crédito pendiente del cliente.
  - El **saldo a favor** también sirve como método de pago.
- Solo cuando la **Facturación queda verificada** se marca `sale_at` y se puede pasar al picking. Si el pago no cubre el total, la base rechaza la verificación.
- Desde que es venta (o desde que el picking empezó) **no se cambian sus productos**.

### Pagos y abonos

En revisión → **verificado**, o **novedad encontrada** (con nota), o **anulado** (con motivo). Un pago no puede superar lo pendiente; una transferencia no se verifica sin comprobante; al verificar un abono de una venta a crédito **baja la deuda** y, si luego se anula, vuelve a subir. `sales.paid_total` lo calcula la base.

### Crédito del cliente (`credit_entries` + `v_customer_credit`)

- **Crédito pendiente:** lo que el cliente **nos debe** (ventas a crédito menos abonos verificados). Con el cupo se obtiene el **crédito disponible**.
- **Crédito a favor:** el saldo que **le debemos** (devoluciones, cancelaciones de pedidos pagados), que puede usar como pago.
- El libro **solo se agrega** (nada se edita ni se borra; se corrige con un ajuste) y **ningún saldo puede quedar negativo**.

### Devoluciones: no se devuelve dinero

Solo de una **venta** y del mismo cliente. Con motivo. Al **aprobarla**, el valor queda como **crédito a favor** y las unidades que sirven **vuelven al inventario**. Un pedido **cancelado** después de pagado también deja crédito a favor, y uno cancelado a crédito anula la deuda.

### Activación y desactivación

| Objeto | Regla |
|---|---|
| Usuario inactivo, bloqueado o borrado | **No inicia sesión**; al desactivarlo se **cierran sus sesiones** |
| Compañía inactiva | Sus usuarios no inician sesión |
| Cliente inactivo | Su usuario pasa a inactivo; no tiene carritos, cotizaciones ni pedidos |
| Empleado inactivo | Es un usuario inactivo: pierde el acceso, no puede ser vendedor ni tomar etapas |
| Producto inactivo o descontinuado | No se agrega a carrito, cotización ni pedido |
| Bodega inactiva | No admite pedidos nuevos |
| Cliente en mora o inactivo | No compra a crédito |
| Cupo agotado | La venta a crédito que lo supere se rechaza |

### Carrito y stock (`stock`)

1. **Carrito abierto = stock apartado** (`in_cart`): los demás ven bajar la disponibilidad en vivo. Vence solo a la hora (`release_expired_carts()`), y al convertirlo o abandonarlo se libera.
2. **Cotización:** no aparta stock.
3. **Pedido:** al agregar un producto se **reserva** (`reserved`) de forma atómica; si no alcanza, la base rechaza, y un carrito y un pedido compiten por la misma unidad. Los productos solo se editan antes de ser venta.
4. **Cancelar** libera lo reservado.
5. **Verificar el envío:** lo reservado **sale** del inventario y queda en el kardex (`sale_out`, o `transfer_out` en un traslado).
6. **Aprobar una devolución:** las unidades que sirven vuelven (`return_in`).
7. *Pendiente de definir:* en qué existencia **entra** un traslado en la bodega destino (el kardex ya tiene `transfer_in`).

> **Corrección:** una versión anterior de este plan decía que el carrito no reserva stock. En IP y en la API real el carrito sí aparta stock (`inCart`) y lo difunde por WebSocket; V3 lo conserva y lo lleva más lejos (vencimiento y préstamo entre compañías).

### Cotizaciones

Borrador → enviada → aceptada → **convertida** (solo una aceptada se convierte, y debe apuntar al pedido creado) o vencida.

## 1.11 Auditoría (todo en la base)

- **`audit_events`** guarda **quién** (usuario, nombre y rol en ese momento), **qué** (acción, modelo y registro, con etiqueta legible como `PD-18423`), **dónde** (pantalla, bodega, tienda, dispositivo, IP), **por qué** (motivo) y **qué cambió** (antes y después y los campos). Nunca guarda contraseñas ni claves.
- **Solo se agrega:** un disparador impide editar, borrar o vaciar. Está **particionado por mes** (`audit_ensure_partitions`).
- **`audit_actions`** define qué acciones exigen motivo (cancelar pedido, anular pago, ajustar stock, cambiar precio, cerrar un préstamo, desactivar compañía, bloquear usuario…): **sin motivo, la base rechaza la operación.**
- **Automática** en 22 tablas (compañías, marcas conectadas, usuarios, roles y permisos, clientes y sus descuentos, terceros, productos, precios, proveedores del producto, niveles de precio, bodegas, tiendas, stock prestado, pedidos, **etapas**, pagos, compras, devoluciones, facturas y credenciales de SIIGO). Los cambios que la base mantiene sola (etapa visible, `updated_at`) no generan ruido. **El historial de precios es esta misma auditoría.**
- **Contexto:** al abrir cada transacción la API informa quién actúa y desde dónde (`set_config('app.user_id', …)`, `app.company_id`, `app.module`, `app.warehouse_id`, `app.device`, `app.ip`, `app.reason`…).
- Lo que no cambia una fila (inicio de sesión, consultar o exportar la auditoría) se registra con `audit_record()`. **Consultar la auditoría también queda auditado.**
- **Solo el superadmin** tiene los permisos de auditoría. En el menú, **Auditorías** solo aparece para él.

## 1.12 Tiempo real en la base de datos

Lo que hacía el WebSocket de la versión 1 (avisar a todos en una bodega cuando alguien aparta o libera stock, y mover pedidos entre sucursales), llevado más lejos:

- Cada cambio importante deja una fila en **`rt_events`** (compañía, bodega, usuario, canal, tipo, entidad y un `payload` pequeño con solo ids y estados) y **avisa con `NOTIFY rt_events`**. La API en Go escucha ese aviso y lo reparte.
- **Canales y eventos:**

| Canal | Eventos |
|---|---|
| `stock` | `stock.updated` (disponible, apartado, reservado y vendible de una existencia; también se envía a las compañías con stock prestado) |
| `orders` y `transfers` | `order.created`, `order.stage_changed` (quién tomó la etapa), `order.became_sale`, `order.completed`, `order.cancelled` |
| `payments` | `payment.created`, `payment.verified`, `payment.issue`, `payment.voided` |
| `credit` | `credit.changed` |
| `returns` | `return.created`, `return.approved`, `return.rejected` |
| `notifications` | `notification.created` |

- **Entre bodegas:** un **traslado avisa a las dos bodegas** (origen y destino).
- **Reanudar:** cada evento tiene un id creciente; quien se desconecta pide lo que le faltó (`id > último`). `rt_purge()` limpia los viejos.
- **Entrada segura, sin tabla:** el WebSocket se autentica con el **token de acceso en su primer mensaje** (no va en la dirección). La API lo valida y comprueba con `auth_login_allowed()` que el usuario siga activo.

## 1.13 Nombres cortos

Se acortó lo que pasaba de 20 caracteres: `customer_credit_entries` → **`credit_entries`**, `inventory_counts` → **`counts`**, `inventory_count_items` → **`count_items`**, `siigo_account_group_id` → **`siigo_group_id`**, `payment_terms_days` → **`terms_days`**. Las tablas `moto_brands` y `moto_models` **ya no existen**: lo que hay es `brands` (marcas, comunes) y `models` (modelo del producto, ej. 15W40). El escenario 000 verifica que ninguna tabla ni campo pase de 20 caracteres.

## 1.14 Cómo se probó

- El script se **ejecutó completo en un PostgreSQL real (18.6)** y pasó **111 escenarios**. Están en [`pruebas-bd/`](analisis-api-importadora/pruebas-bd/README.md) y se repiten con `npm install` y `npm test`.
- Cubren: semillas, roles y permisos, inicio de sesión, compañías, aislamiento entre compañías, marcas conectadas, terceros, carrito, reserva de stock, **stock físico, compartido y virtual**, cada regla del flujo del pedido (orden de etapas, ocupación, permisos por etapa, picking inmediato, pago y comprobante, venta de contado y a crédito, cupo), abonos, devoluciones, crédito a favor, cancelaciones, traslados, stock prestado, tiempo real (incluido reanudar y limpiar eventos), auditoría (motivo, quién y dónde, inmutabilidad) y los nombres cortos. La tabla por número de escenario está en el README de esa carpeta.
- **Lo que no cubre:** concurrencia real (varias conexiones a la vez), rendimiento con millones de filas y las pruebas de carga (Fase 2); y el **aislamiento por compañía con seguridad a nivel de fila (RLS)**, que se propone como refuerzo en la Fase 2.

## 1.15 Entregables y cierre

```
GestionImportadora/PGSQL/
  README.md       cómo instalar y ejecutar        ERD.md           diagrama del modelo por grupos
  db.sql          TODO junto, para copiar y pegar SEED_USERS.md     usuarios de prueba (2 por rol)
```
El script único es la fuente; no se parte en archivos numerados para no duplicarlo.

**La Fase 1 termina cuando:** ✔ el script corre completo en una base vacía · ✔ existen los 20 usuarios · ✔ el admin no tiene permisos y el superadmin todos · ✔ los 111 escenarios pasan · ✔ el diagrama coincide con el script · ✔ tú apruebas el modelo.

---

# FASE 2: API EN GO (local)

**Ubicación:** `GestionImportadora\backend`.

## 2.1 Herramientas

| Pieza | Elección | Motivo |
|---|---|---|
| Lenguaje | **Go 1.23+** | Concurrencia ligera, un solo ejecutable |
| Enrutador | **chi** | Mínimo y estándar |
| Base de datos | **pgx v5 + pgxpool** | Controlador nativo de PostgreSQL; además escucha los avisos (`LISTEN`) |
| Consultas | **sqlc** | SQL tipado, sin ORM |
| WebSocket | **coder/websocket** | Pequeño y moderno; con **SSE** como respaldo |
| Autenticación | **JWT** (acceso 15 min + refresco rotativo) + **bcrypt** | Seguro y sin estado; bcrypt es el mismo hash que ya traen las semillas |
| Validación | **go-playground/validator** | Reglas en cada petición |
| Registros y métricas | **slog**, **Prometheus**, **OpenTelemetry** | Observabilidad |
| Documentación | **OpenAPI 3** | Sustituye al Swagger |
| Pruebas | `testing` + **testcontainers-go**; carga con **k6** | PostgreSQL real |
| Tareas | **river** o worker propio | SIIGO, carritos vencidos, limpieza de eventos |

Versiones exactas: se fijan en `go.mod` al iniciar.

## 2.2 Arquitectura

Monolito modular; cada módulo con **handler → service → repository** (las mismas capas del frontend).

```
backend/
  cmd/api/main.go
  internal/
    platform/  config · db · auth (JWT, contexto de auditoría) · httpx · realtime (hub, salas, WebSocket/SSE)
    companies/ products/ inventory/ stores/ sales/ customers/ employees/ thirdparties/
    purchases/ payments/ reports/ audit/ siigo/
  sql/queries/    docs/openapi.yaml    tests/load/
```

## 2.3 Convenciones

- Verbos correctos (`GET /products`, `PATCH /products/{id}`); respuesta única **`{ data, meta, error }`** con **códigos HTTP reales**.
- **La compañía y el usuario salen del token, no del cuerpo.** El superadmin elige la compañía con la que trabaja (cabecera `X-Company-Id`) y la API verifica `user_can_access_company()`.
- Cada transacción empieza con `set_config('app.user_id' …)` para que la base audite y haga respetar los permisos.
- Mensajes distintos por endpoint; `Idempotency-Key` en pedido, pago y factura.
- Tabla de equivalencias «endpoint viejo → endpoint nuevo» para los 189 documentados.
- Los errores de la base (motivo faltante, etapa ocupada, stock insuficiente) se traducen a **422 con un código estable** que el frontend muestra tal cual.

## 2.4 Búsqueda y filtros (principio rector)

> **Cada pantalla consulta únicamente su modelo padre.** Buscar «Carlos» en *Usuarios* llama `GET /users?q=carlos` y solo toca usuarios.

Contrato común de lista (`q`, `filters`, `sort`, `limit`, `cursor`, `fields`), `pg_trgm`, selectores livianos `…/options?q=`, lista distinta del detalle y **paginación por cursor**. El catálogo de una tienda lee `v_virtual_stock`.

## 2.5 Tiempo real (WebSocket)

1. El cliente abre `wss://…/ws` y manda como **primer mensaje** su token de acceso; la API lo valida y llama `auth_login_allowed()` (si no llega en 5 s, cierra la conexión).
2. La API lo **suscribe a salas** según quién es: `company:{id}`, `warehouse:{id}` (las bodegas a las que tiene acceso) y `user:{id}`. Un cliente solo recibe stock y lo suyo.
3. Una conexión dedicada hace **`LISTEN rt_events`**; por cada aviso reparte el evento a las salas locales. Con **varias copias** de la API cada una escucha y reparte a los suyos: no hace falta Redis.
4. Al reconectar el cliente manda el **último id** y recibe lo que falta; si se perdió demasiado, recibe `resync` y recarga sus listas.
5. Latido cada 25 s, cola limitada por cliente (si se llena, se le pide `resync`), tope de conexiones por usuario.
6. Formato al cliente: `{ id, type, channel, entity, entityId, companyId, warehouseId, at, payload }`.
7. *SSE* (`GET /realtime/stream`, con `fetch` y la cabecera `Authorization`) como respaldo para redes que bloquean WebSocket.

## 2.6 Seguridad y escalabilidad

- **Seguridad:** el usuario de base de datos de la API **no es dueño de las tablas**; JWT corto con refresco rotativo; límites por IP y usuario **en memoria dentro de la API**; todo con tiempo máximo y apagado ordenado. **Propuesta:** activar **RLS** (seguridad a nivel de fila) por `company_id` como segunda barrera.
- **Escalabilidad:** servicio sin estado, varias copias; `pgxpool` dimensionado y **PgBouncer** si crecen; réplica de lectura para reportes y catálogo; caché del catálogo público; **reservas atómicas** (ya resueltas en la base); `SKIP LOCKED` para repartir picking.
- **Metas de carga** (a acordar): p95 < 200 ms en listas y 500 pedidos por minuto.

## 2.7 Orden de construcción

1. Plataforma (config, base, autenticación, contexto, auditoría, errores, paginación, **tiempo real**).
2. Compañías, catálogo y marcas.
3. Inventario (bodegas, stock, kardex, conteos, traslados, **stock prestado**) y tiendas.
4. Usuarios, empleados, clientes y terceros.
5. Carrito → cotización → pedido y etapas → pagos y créditos → devoluciones.
6. Compras y reportes.
7. SIIGO.
8. OpenAPI final y pruebas de carga.

## 2.8 SIIGO

- Base `https://api.siigo.com` (`/v1/…`); `POST /auth` con `username` y `access_key` → `access_token` de **24 h**; cabecera **`Partner-Id`** obligatoria; **100 peticiones/min** en producción y 10 en pruebas; bloqueo si más del 80 % fallan durante 7 días.
- Recursos: productos, clientes, facturas (PDF, XML, correo, errores DIAN, anulación), cotizaciones, notas crédito, compras, recibos de caja, comprobantes, reportes y webhooks; catálogos para mapear (impuestos, listas de precio, bodegas, usuarios, tipos de comprobante, formas de pago, centros de costo, grupos).
- **Diseño:** módulo `siigo` aislado; cliente que renueva el token antes de las 24 h y respeta el límite con una cola; **buzón de salida** (`siigo_outbox`) escrito en la misma transacción que la factura, con `Idempotency-Key`; los códigos de SIIGO viven en la columna `siigo_id` de cada tabla y los demás (tipos de pago, tipo de comprobante, vendedor, centro de costo) en `siigo_credentials.settings`; credenciales cifradas por compañía, prueba y producción separadas; las **notas crédito** salen de las devoluciones; los **errores de la DIAN** se muestran en el panel de factura.
- **Pendiente:** una cuenta de pruebas de SIIGO (se pide con el NIT) para validar impuestos, numeración y redondeos.

**La Fase 2 termina cuando:** ✔ la API arranca y los 20 usuarios inician sesión con lo que su rol permite · ✔ cada endpoint documentado tiene su equivalente · ✔ el WebSocket reparte y reanuda · ✔ prueba de carga medida · ✔ OpenAPI completo.

---

# FASE 3: AJUSTES EN EL FRONTEND

**Ubicación:** `GestionImportadora\appImportadoraIp`.

## 3.1 Qué se conserva

Capas por feature (`types → helpers → services → slices → thunks → hooks → components → screens`), tokens en `src/styles/tokens.css`, archivos pequeños con una responsabilidad, comentarios de cabecera («qué hace · conecta con · ojo») y las pruebas existentes.

## 3.2 El frontend no depende de la API (principio de diseño)

> Si cambias la URL base, la API o la base de datos, el frontend y sus modelos **siguen funcionando**; un cambio leve de un campo se absorbe en **un solo lugar**.

Esto ya existe en parte (rutas en `api/config.ts`, `*.api.types.ts` separados de los modelos, `*.adapter.ts`) y V3 lo refuerza. La pestaña 4 de la maqueta lo muestra con un diagrama y una tabla.

**Capas, de arriba abajo:** Pantallas y componentes → Estado y lógica (hooks, selectors, slices, thunks) → **Servicios** (`*.service.ts`) → **Adaptadores** (`*.adapter.ts` + `api/core/fieldMap.ts`) → Cliente HTTP / WebSocket / assets → API.

| Si cambia… | Se toca solo… |
|---|---|
| La URL base de la API | `.env` → `VITE_API_BASE_URL` |
| La URL del WebSocket | `.env` → `VITE_WS_URL` |
| La URL de logos e imágenes | `.env` → `VITE_ASSETS_BASE_URL` (`assetUrl()`) |
| Una ruta o un verbo | `api/config.ts` |
| Un campo se renombra | El adaptador de esa feature (una línea de alias) y su `*.api.types.ts` |
| El backend agrega un campo | Nada |
| Al backend le falta un campo | Nada: valor por defecto y aviso en desarrollo |
| Cambia el envoltorio `{data, meta, error}` | `api/core/envelope.ts` |
| Cambian los eventos del WebSocket | `realtime.adapter.ts` y `realtime.constants.ts` |
| La base de datos | Nada en el frontend |
| Se cambia de API completa | Los `*.service.ts` y `*.adapter.ts`; el resto no cambia |
| Un color, tamaño o espacio | `src/styles/tokens.css` |

**Cómo se hace cumplir:** (1) una regla de ESLint impide que pantallas y componentes importen un `*.api.types`; (2) solo los `*.service.ts` importan `api/client`; (3) cada adaptador tiene su prueba con una respuesta de ejemplo: si el backend cambia, **falla la prueba antes que la pantalla**; (4) `npm run check:api` compara las rutas de `config.ts` con el `openapi.yaml` de la API en Go.

Además, `api/config.ts` se **limpia**: hoy tiene unas 150 líneas de JSON de ejemplo pegado como comentario; ese material pasa a la documentación.

## 3.3 Conexión a la API local

`.env.example` (se versiona) y `.env.local` (solo en tu equipo) con las tres direcciones; cliente HTTP único que pone el token, lo renueva y entrega `{data, meta, error}`; buscadores y modales reutilizables con `?q=` y `/options` (espera de 300 ms y cancelación de la petición anterior); se eliminan los parches por endpoints rotos.

## 3.4 Rediseño visual (Grandma's Liquors como referencia, estructura de Gestión Importadora)

Menú lateral colapsable con módulos y subgestiones por permiso; páginas con título, acción principal, búsqueda, filtros y tabla con **menú ⋯ de acciones por fila** (solo las que el rol y el estado permiten); estados vacíos y de error que explican qué hacer; accesibilidad (contraste, foco visible, botones táctiles).

**Fondo claro, sin componentes oscuros.** El menú lateral, el contenido, el panel derecho, las tablas, las ventanas flotantes y los avisos usan **fondo blanco o gris muy claro**. Del Importadora se conservan: el gris oscuro y el negro **como color de texto**, el **azul** para lo seleccionado y lo principal, y el **amarillo** como acento (botones de acción, logo, etiqueta de tarifa). Todo sale de `src/styles/tokens.css`, así que un cambio de color se hace en un solo lugar. La maqueta ya está así en sus cuatro pestañas.

## 3.5 Tarjeta de producto: la de IP

Estructura y valores **tomados del CSS de IP** (`ProductCardBase.css` y `variables.css`), no inventados:

| Elemento | Valor |
|---|---|
| Tarjeta | fondo blanco, borde 1 px `#e5e5e5`, radio 12 px, sombra `0 2px 8px rgba(0,0,0,.06)`; al pasar el mouse sube 3 px y la sombra pasa a `0 6px 20px rgba(0,0,0,.1)` |
| Imagen | proporción 1,15, fondo `#f7f7f7`, `object-fit: cover`, y una línea de 1,5 px al 90 % de ancho debajo |
| Cuerpo | 15 px de relleno; tipografía Inter, 14 px, interlineado 1,5 |
| Fila de precio | **precio** 24 px / 800 a la izquierda y **logo de la marca** (90 px de ancho máximo) a la derecha |
| Título | `CATEGORÍA` + espacio + `DESCRIPCIÓN` (o el modelo si no hay), 14 px / 700, mayúsculas |
| Meta y código | `MARCA - MODELO` y código de barras: 12 px, gris `#757575`; clic en el código lo copia |
| Pie | campo de cantidad (36 px de alto, radio 10, ancho `clamp(56px, 20%, 80px)`) a la izquierda y botón **amarillo `#ffc629`** (36 px, radio 8, 800, máximo 130 px) a la derecha |
| Estados | **Ordenar** · **Ordenado** (verde, cuando ya está en el carrito) · **Agotado** (gris, sin cantidad) |
| Cuadrícula | `repeat(auto-fill, minmax(min(100%, 300px), 1fr))` con 24 px de separación |

- **Se conserva la etiqueta de tarifas** (`ProductCardTierMenu`): icono de etiqueta con la insignia P0–P3 en la **misma posición** (esquina superior derecha de la imagen); el precio de la tarjeta cambia al elegir **P0 Mostrador · P1 Taller · P2 Distribuidor · P3 Mayorista**.
- Reglas de IP que se conservan: la cantidad no pasa del disponible (aviso «Cantidad máxima alcanzada»), flechas del teclado, clic en la imagen para ver el detalle.
- Lo **disponible** de la tarjeta sale del stock virtual de la tienda (`v_virtual_stock`).
- Los campos que no caben en la tarjeta **no se pierden**: promoción, descripción, fecha de creación, estado, ubicaciones con stock y reservado, **en carritos**, imágenes y QR están en la **ficha del panel derecho** (modo `product`).
- La maqueta usa las **imágenes y logos reales de tus capturas** para las ocho primeras tarjetas.
- Archivos: se ajustan `productCard/*.css` y `ProductCard.tsx`; `ProductCardTierMenu.*` queda igual; `ProductCardStock.*` se retira.

## 3.6 Carrito: el de IP

Panel derecho con **buscador** («Buscar en el carrito»), una **mini-tarjeta por producto** (miniatura de 52 px, `CATEGORÍA | DESCRIPCIÓN`, logo de la marca de 22 px, `MARCA - MODELO`, código en tipografía monoespaciada, y al pie cantidad editable · precio unitario y total · botón rojo de quitar) y abajo **Subtotal · IVA · Total** con el botón **Finalizar compra** (en el amarillo de Importadora). Lo que se agrega **aparta stock** y los demás lo ven en vivo. Finalizar crea el pedido con clave de idempotencia.

## 3.7 Cards de pedido: las «cards de espera» de IP

En *Gestión Pedidos*: cada pedido es una card blanca con el **ID y botón de copiar**, un distintivo (Pedido · Venta de contado · Venta a crédito · Cancelado), fecha y «hace X», **total** y botón **+** para abrir el detalle. A la izquierda, la caja **«Estado del pedido»** con los seis pasos (verde con «… exitosa» el que ya se verificó, naranja el actual, gris los pendientes, con su línea conectora); a la derecha, cliente, tienda y método de pago, lo que se debe si es a crédito, el aviso de la etapa («Picking · Ocupada por Bodeguero 1») y los botones del empleado: **Tomar · Pausar · Reanudar · Soltar · Completar · Verificar · Devolver** (y **Picking inmediato** cuando el pedido lo tiene). Arriba, el recorrido **Carrito › Cotización › Pedido › Pago verificado › Venta de contado o Venta a crédito → Cartera** y un contador por etapa que filtra la lista. Un pedido que tiene otro empleado se ve ocupado en vivo.

## 3.8 Los tres componentes de `componentApp` y el panel derecho

La pantalla se arma **solo** con los componentes que ya existen: **menú lateral**, **contenido central** (`screenRegistry.ts`) y **panel derecho** (`drawerRegistry.ts`). Nunca se agrega un cuarto. La cabecera suma dos piezas pequeñas: el **selector de compañía** (solo superadmin) y el indicador **«En vivo»**.

Hoy `drawerRegistry.ts` tiene tres modos (`cart`, `object`, `customer`). Todo lo nuevo es un **modo** más del registro:

| Modo | Muestra | Se abre desde | |
|---|---|---|---|
| `cart` | Carrito de IP | Tienda › Catálogo | existe |
| `object` | Estado de cuenta del cliente | Gestión Cartera | existe |
| `customer` | Ficha de cliente | Gestión Usuarios › Clientes (hoy abre desde Terceros) | existe, cambia el módulo desde el que se abre |
| `product` | Ficha completa del producto | Tarjeta o fila de producto | nuevo |
| `sale` | Detalle del pedido: etapas, pagos, líneas | Card o fila de pedido | nuevo |
| `form` | Crear o editar cualquier registro; motivo al cancelar o anular | Botón principal o acción «Editar» | nuevo |
| `employee` | Roles, permisos y actividad | Gestión Usuarios › Empleados | nuevo |
| `transfer` | Origen, destino y recepción | Gestión Traslados | nuevo |
| `invoice` | Estado DIAN y errores de SIIGO | Facturar / Ver factura | nuevo |
| `company` | Ver, registrar o editar una compañía (con lo que recibe al nacer) | Compañías | nuevo |
| `audit` | Quién, dónde, motivo y antes → después | Auditorías › Movimientos | nuevo |

Una fila = una acción = un modo; un solo panel a la vez; `Esc` lo cierra. La búsqueda y los filtros viven en el contenido central. Cada modo nuevo se registra en `drawerRegistry.ts` y cada pantalla en `screenRegistry.ts`; no se toca la estructura de `DrawerRight.tsx`.

## 3.9 Menú lateral

Cada gestión reúne **un proceso**; las subgestiones van en el orden del proceso. Si una subgestión **administra registros** lleva «Gestión»; si solo consulta o ejecuta, el nombre es simple.

| Gestión | Subgestiones |
|---|---|
| **Tienda** | Catálogo · Gestión Pedidos · Historial de Pedidos · Gestión Cotizaciones |
| **Gestión Caja** | Caja · Facturación · Cierre |
| **Gestión Cartera** | Créditos · Abonos · Verificación Abonos · Historial de Recaudo |
| **Gestión Inventario** | Gestión Productos · Gestión Marcas, Categorías y Modelos · Gestión Órdenes de Compra · Gestión Entradas de Compra · Existencias · Gestión Traslados · Gestión Devoluciones · Gestión Conteos · Gestión Tiendas y Stock Virtual |
| **Gestión Usuarios** | Clientes · Empleados · Roles y Permisos |
| **Gestión Terceros** | Proveedores · Transportadoras · Otros Terceros (tres pantallas sobre una sola tabla, `third_parties`) |
| **Reportes** | Ventas Diarias · Reporte General · Valoración Inventario |
| **SIIGO** | Una pantalla con pestañas |
| **Compañías** *(solo superadmin)* | Una pantalla: registrar y gestionar compañías |
| **Auditorías** *(solo superadmin)* | Movimientos · Cambios por Modelo · Accesos y Sesiones |

**Del carrito a la venta:** Carrito (aparta stock) → Cotización (oferta con vigencia, no reserva) → Pedido (reserva y recorre las seis etapas) → pago verificado → **Venta de contado** (ingreso) o **Venta a crédito** (nos deben → *Gestión Cartera*). Las devoluciones dejan crédito a favor, visible en *Cartera › Créditos*.

**Cómo se mueve un producto por *Gestión Inventario*:** se crea, edita, activa o desactiva (se elimina solo si nunca tuvo movimientos); se compra (*Órdenes de Compra*) y al recibirlo (*Entradas de Compra*) el stock **sube**; se mueve entre bodegas, se devuelve, se cuenta y se ajusta (con motivo); y se reparte entre tiendas (stock virtual) o se presta a otra compañía.

**Cambio en el código:** el módulo `thirdParties` de hoy (clientes, proveedores, transportadoras, empleados, roles) se parte en `users` y `thirdParties`, y se suman `companies` y `audit`. Se ajustan `menuItems.constants.ts`, `navigation.types.ts`, `selectDrawerMode` y `screenRegistry`. Las features `customers`, `employees` y `suppliers` no cambian de carpeta; solo cambia dónde se muestran.

## 3.10 Manejo de estado y tiempo real en el frontend

El estado sigue siendo **Redux** (slices, thunks y selectors por feature), con un lugar para cada cosa:

| Qué | Dónde vive |
|---|---|
| Datos del servidor (listas, detalles, cursores) | Slices de cada feature, llenados por sus thunks |
| Pantalla y panel abiertos | El slice `ui` (`activeModule`, `activeSubitem`) que ya consultan `selectDrawerMode` y `screenRegistry` |
| Sesión, rol y permisos | El slice de `auth`; `usePermissions` decide qué se ve |
| Compañía activa del superadmin | Slice de `companies`; el cliente HTTP la envía en `X-Company-Id` |
| Formularios | Estado local del formulario; al guardar, un thunk |
| Lo que llega en vivo | La feature `realtime` recibe los eventos y los entrega a los slices |

La feature `realtime` ya existe (provisional); V3 la completa: conexión que **manda el token en su primer mensaje**, **reanudación** con el último id (`realtime.cursor.ts`) y un manejador por tipo de evento: `stock.updated` actualiza tarjetas y carrito; `order.stage_changed` actualiza las cards y la ocupación; `payment.*` y `credit.changed` refrescan cartera; `notification.created` suma a la campana. Si el WebSocket se corta, los datos siguen y al volver se piden los eventos faltantes (o se recargan las listas con `resync`). El indicador **«En vivo»** de la cabecera muestra el estado y el contador de eventos. La maqueta lo simula con el botón *Simular eventos en vivo*.

## 3.11 Reorganización de carpetas

Se proponen **42 archivos reubicados** (≈96 imports por ajustar, todos mecánicos): `api/core`, `api/lists` y `api/system`; `global/components/UI/molecules/` (dialogs, search, table, cards); `global/hooks/` (ui, data); `features/shop/thunks/` (cart, checkout, products) y las tarjetas y el carrito de `shop/components` (partes a `parts/`). `useRedux`, `usePermissions`, `client`, `config` y `errors` **no se mueven** porque los importan decenas de archivos. Los archivos nuevos nacen directamente en su carpeta final (**80 archivos nuevos** en el frontend). Resumen del árbol: 372 se quedan igual, 111 se modifican y 80 son nuevos. Nada se mueve hasta que lo apruebes.

## 3.12 Archivos que se retiran (limpieza)

Se recorrió el árbol de importaciones desde `main.tsx` y se encontraron **35 archivos (1.593 líneas) que no quedan en la versión final**:

| Por qué se retiran | Archivos |
|---|---|
| Plan antiguo y papeles sueltos | `src/plan.txt` (1.034 líneas), `readme2.md`, `docs/INFORME-ESTRUCTURA.md` |
| Restos de la plantilla de Vite o repetidos | `public/icons.svg`, `src/assets/logos/icon.ico`, y el `.env` actual (se sustituye por `.env.example` y `.env.local`) |
| 21 íconos que ninguna pantalla importa | `check-green`, `clear-filter`, `cloud-download`, `cloud-upload`, `credit-card`, `edit`, `eye-off`, `filter`, `help`, `history`, `key`, `list`, `login`, `map-pin`, `new`, `percent`, `promo`, `receipt`, `search`, `shopping-bag`, `wait` |
| Pantalla de permisos duplicada, la vigente está en `employees/screens` | `auth/screens/ModulePermissionRow.tsx`, `RolesPermissionsScreen.tsx` y `.css` |
| Servicio y tipos marcados *DEPRECADO* (migrados a `employees`) | `auth/services/permissions.service.ts` y su prueba, `auth/types/permissions.types.ts` |
| El stock salió del diseño de la tarjeta | `shop/productCard/ProductCardStock.tsx` y `.css` |

**Las pruebas unitarias no se tocan** (son parte de la calidad), salvo la del servicio que se retira. `docs/features2` y `docs/global2` son carpetas reservadas y no se tocan. `docs/ESTRUCTURA.md` se regenera al final con la estructura real. El detalle, con las líneas de cada archivo, está en la pestaña 4.

## 3.13 Orden de trabajo y cierre

1. `.env`, cliente HTTP y autenticación. 2. Distribución: menú, cabecera, tokens (fondo claro). 3. Tabla y buscador reutilizables. 4. Pantallas por módulo (en el orden del backend). 5. Tarjeta, carrito y cards de pedido. 6. Tiempo real. 7. Limpieza y reorganización. 8. Pruebas y accesibilidad.

**La Fase 3 termina cuando:** ✔ inicias sesión y el menú muestra solo lo permitido · ✔ todas las pantallas leen y escriben en la API local · ✔ tarjetas, carrito y cards de pedido son los de IP · ✔ se completa una venta de punta a punta (carrito → pedido → etapas → pago) · ✔ cambiar la URL base en `.env` basta para apuntar a otra API · ✔ las pruebas pasan.

---

# 4. Verificación contra tu requerimiento

| # | Lo que pediste | Estado | Dónde |
|---|---|---|---|
| 1 | Documentar la API por grupo (URL, body, respuesta, completitud, sin inventar endpoints) | ✅ | `DOCUMENTACION-API.md` (189, 0 inventados) |
| 2 | Tener muy en cuenta SIIGO | ✅ | 2.8 |
| 3 | Entender la lógica de v1 y v3 (incluido el WebSocket) | ✅ | 1.12, 2.5, 3.10 |
| 4 | Reemplazar la API de Railway por una local en Go | ✅ | Fase 2 |
| 5 | Identificar todos los modelos | ✅ | 1.3 (46 tablas) |
| 6 | Modelo visual con relaciones, campos y tipos | ✅ | Pestaña 2 y PDF |
| 7 | Corregir lo mal relacionado | ✅ | 1.7 |
| 8 | Script PostgreSQL copiable, **2 usuarios por rol** | ✅ | Pestaña 3; 1.8; escenarios 001–002 |
| 9 | Proveedores, transportadoras y productos externos, sin credenciales | ✅ | 0.5, 0.7 |
| 10 | QR del producto | ✅ | `products.qr_payload`; escenario 019 |
| 11 | Marcas, modelos, categorías, referencias, códigos | ✅ | 1.3 |
| 12 | **Compañías** (empleados, clientes, productos, stock propios; stock prestado; el superadmin las agrega) | ✅ | 0.5, pantalla *Compañías*; escenarios 011–020, 083–088, 103, 106–107 |
| 13 | **Marcas comunes** y proveedores ligados a ellas | ✅ | `brands`, `company_brands`, `product_suppliers`; escenarios 018–019 |
| 14 | **Roles: admin sin permisos, superadmin con todos, los demás por área** | ✅ | 1.8; escenarios 003–005, 016, 108 |
| 15 | Estados de activación y que un inactivo no inicie sesión | ✅ | 1.10; escenarios 006–008, 010, 031–032, 040–041, 082 |
| 16 | Flujo del pedido con verificación por etapa, ocupación, picking inmediato | ✅ | 1.10; escenarios 042–049, 062–065 |
| 17 | Pedido pasa a venta al verificar el pago; a crédito es plata que nos deben | ✅ | 1.10; escenarios 050–061 |
| 18 | Devoluciones sin dinero: crédito a favor y crédito pendiente | ✅ | 1.10; escenarios 073–079 |
| 19 | Auditoría con usuario, lugar y motivo; acceso del superadmin | ✅ | 1.11; escenarios 004, 093–098, 109–110 |
| 20 | **WebSocket entre bodegas, manejo de estado** | ✅ | 1.12, 2.5, 3.10; escenarios 088–092, 104 |
| 21 | API toda en Go, escalable | ✅ | Fase 2 |
| 22 | Búsqueda por modelo padre, sin saturar endpoints | ✅ | 2.4 |
| 23 | **El frontend no depende de la API / URL base / base de datos** | ✅ | 3.2, pestaña 4 |
| 24 | Diseño de Grandma's sin copiar su estructura; solo los tres componentes | ✅ | 3.4, 3.8 |
| 25 | Colores de Importadora | ✅ | 3.4 |
| 26 | **Tarjeta de producto idéntica a la de IP** (con tus imágenes) | ✅ | 3.5, pestaña 1 |
| 27 | Carrito como el de IP | ✅ | 3.6 |
| 28 | Cards de pedido como las «cards de espera» de IP | ✅ | 3.7 |
| 29 | Menú por procesos con los nombres acordados | ✅ | 3.9 |
| 30 | **Quitar de la estructura los archivos que no quedan** | ✅ | 3.12, pestaña 4 |
| 31 | **Nombres largos acortados** | ✅ | 1.13 |
| 32 | Cuatro pestañas coherentes entre sí | ✅ | Mismas fuentes: el diagrama y los conteos salen del script |
| 33 | **Conteo de tablas** | ✅ | **46** (eran 70) |
| 34 | **Maqueta con fondo claro, sin colores oscuros en los componentes** | ✅ | 3.4; las cuatro pestañas |
| 35 | **Validar si las 70 tablas eran necesarias y reducir** | ✅ | 1.4: no lo eran; quedan 46 y no se perdió ninguna función |
| 36 | **Stock físico por bodega; el compartido y el virtual salen del físico** | ✅ | 1.5; escenarios 033–037 |
| 37 | **Diagrama horizontal, una flecha por par de tablas en una sola dirección, sin encimarse** | ✅ | 1.6; pestaña 2 y PDF |
| 38 | **Todo el contenido actualizado en la carpeta `Idea`** | ✅ | Tabla de archivos al inicio |

---

# 5. Hitos, riesgos y supuestos

| Hito | Entregable | Aprobación |
|---|---|---|
| H1 | Modelo (diagrama) y script: **listos para revisar** | Tú |
| H2 | API: plataforma, tiempo real, compañías, catálogo e inventario | Tú |
| H3 | API: pedidos, pagos y créditos; frontend conectado | Tú |
| H4 | SIIGO en modo prueba | Requiere credenciales |
| H5 | Rediseño completo, limpieza y pruebas de carga | Tú |

**Riesgos:** migrar los **datos reales** de producción exige un script aparte y acceso de lectura a la base actual (con la fusión de tablas, ese script junta varias tablas viejas en una nueva); parte del comportamiento de la API actual se dedujo sin ver su código; SIIGO impone límites y la DIAN valida cada factura; la concurrencia real y el rendimiento solo se miden en la Fase 2.

**Supuestos que tomé (corrígeme si alguno no es así):**

1. «Los demás dos roles» = los demás roles llevan **dos usuarios cada uno**.
2. **Picking inmediato** = se completa y verifica en un solo paso.
3. Las **«secciones»** de una compañía son sus áreas, bodegas y tiendas.
4. **«SOC»** lo entendí como **sockets / tiempo real** (WebSocket, con SSE de respaldo).
5. Un **correo** pertenece a **un solo usuario y una sola compañía**, y un usuario tiene **un solo rol**.
6. El carrito vence a la **hora** (configurable).
7. **Otros terceros** son los que no son proveedores ni transportadoras (bancos, contratistas…).
8. **Abonos** es una subgestión aparte de *Créditos* y de *Verificación Abonos*.
9. Las **ubicaciones** de una bodega son un texto dentro del stock (no hay un catálogo de ubicaciones): una ubicación existe mientras tenga productos.
10. Los **métodos de pago** son cuatro valores fijos y **la tienda** dice por dónde se vendió; si algún día una compañía necesita métodos propios, se agrega esa tabla.
11. **Favoritos** del cliente y **sincronización de dispositivos sin conexión** quedan fuera del modelo hasta que existan en una pantalla.
12. «**Fondo claro**» = blanco y gris muy claro para todo; el gris oscuro y el negro solo como texto.

**Pendiente de definir:**

1. En qué existencia **entra** un traslado en la bodega destino.
2. Qué pasa con una **devolución de una venta hecha con stock prestado**: si la unidad vuelve a la dueña y si libera cupo.
3. Activar **RLS** por compañía como segunda barrera (propuesto en la Fase 2).
4. Si los 80 archivos nuevos del frontend se pueden agrupar más (revisión de «keep it simple», opcional).

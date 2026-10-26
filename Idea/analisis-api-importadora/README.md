# Análisis de la API de Gestión Importadora

Análisis **externo** de la API del backend (`https://importadora-back-production.up.railway.app`)

## Objetivo
1. Validar que lo que hay en `config.ts` (rutas, métodos y comentarios) es correcto.
2. Ver la respuesta real de cada endpoint y clasificarlo: **completo**, **incompleto**, **roto**, **no sirve para la app** o **sin probar**.
3. Documentar qué tipo de dato es cada campo y cómo se relacionan las entidades.

## Estructura
```
analisis-api-importadora/
├─ README.md          este archivo: reglas, uso y estado de las fases
├─ INFORME.md         resultados: validación de config.ts, inventario, hallazgos y relaciones
├─ sonda.mjs          único script (Node, sin dependencias)
├─ endpoints.xlsx     matriz final de endpoints (se genera en la fase 6)
└─ datos/
   ├─ swagger.json    copia del Swagger del backend (185 rutas, 189 operaciones, 362 modelos)
   └─ respuestas.json una entrada por operación: lo documentado, si la usa la app, su clase y (fase 3) la respuesta real
```

## Comandos
```bash
node sonda.mjs config      # valida config.ts contra el Swagger y contra lo que la app llama (solo lectura)
node sonda.mjs inventario  # regenera datos/respuestas.json sin llamar a la API
```
Variable opcional: `APP_DIR` si el repo de la app no está en `../GestionImportadora/appImportadoraIp`.

### Fase 3: sonda de lectura (`sondear`)
Sin `--enviar` **solo muestra el plan** (qué llamaría y con qué cuerpo). Con `--enviar` llama a la API.

PowerShell (en esta carpeta):
```powershell
$env:API_TOKEN = "tu_token"      # el access_token de tu sesión; no se guarda en ningún archivo
$env:COMPANY_ID = "5"            # el companyId de tu empresa
node sonda.mjs sondear           # 1) mira el plan
node sonda.mjs sondear --enviar  # 2) llama a la API y guarda las respuestas en datos/respuestas.json
```
Variables opcionales:

| Variable | Para qué |
|---|---|
| `WAREHOUSE_ID`, `USER_ID` | Fijar la bodega o el usuario; si no, se toman de las primeras respuestas (`/warehouses`, `/users`) |
| `SOLO=Products,Users` | Probar solo esos grupos del Swagger |
| `OMITIR=/reports/sales` | Saltar rutas concretas |
| `EXTRA='{"state":"pending","saleType":"sale"}'` | Dar valores de campos obligatorios que el Swagger no documenta (estados, tipos de venta, `uuid`...) |
| `PAGE_SIZE` (5), `DELAY_MS` (400), `SEARCH_TEXT` ("a") | Tamaño de página, pausa entre llamadas y texto de búsqueda |
| `API_BASE` | Otra URL del backend |

### Fase 3b: barrido de valores de dominio (`barrido`)
Para las consultas que piden un valor que el Swagger no documenta: **estado** (`POST /management`), **estado, canal y tipo de venta** (`POST /management/saleOrders`) y el **dispositivo** de `POST /sync/status`. Prueba varios valores de uno en uno (solo lectura) y guarda qué respondió cada combinación en `respuestaReal.barrido`.

```powershell
$env:API_TOKEN = "tu_token"
$env:COMPANY_ID = "1"; $env:WAREHOUSE_ID = "1"
node sonda.mjs barrido            # plan: cuántas consultas y con qué cuerpos
node sonda.mjs barrido --enviar   # las hace (unas 64, con pausa de 400 ms)
```
Variables opcionales: `ESTADOS`, `CANALES` y `DELAY_MS`. Los valores por defecto eran suposiciones; el primer barrido mostró que los canales reales son `majority,immediate,corporate,minority,direct` y las etapas `verification,picking,packing,invoicing,dispatch`. Para repetirlo con esos valores:

```powershell
$env:CANALES = "majority,immediate,corporate,minority,direct"
$env:ESTADOS = "verification,picking,packing,invoicing,dispatch"
node sonda.mjs barrido --enviar
```

Para ver los pedidos pendientes y los traslados con otro vendedor (en la prueba salieron vacíos con el usuario 948):
```powershell
$env:USER_ID = "315"; $env:SOLO = "Sales"
node sonda.mjs sondear --enviar
```

### Fase 3c: reproducir lo que hace la app (`reproducir`)
Repite contra la API real las peticiones de **lectura** que arman los services de la app (`datos/cuerpos-app.json`) y comprueba que respondan 200 con `success: true`. No repite escrituras ni carritos. Con `COMPANY_ID`, `WAREHOUSE_ID` y `USER_ID` se cambian los ids de la prueba por los tuyos.

```powershell
node sonda.mjs reproducir           # plan
node sonda.mjs reproducir --enviar  # envía y guarda el resultado en datos/cuerpos-app.json
```

### Fase 3d: nivel de precio de cada `priceType` (`niveles`)
Deduce con **ventas reales** qué nivel de la lista de precios (P0, P1, P2...) paga cada tipo de cliente (`majority`, `corporate`, `immediate`...): toma el `priceType` del cliente de cada venta y busca en qué posición de la lista de precios del producto (ordenada por `productPriceId`) cae el precio cobrado. Solo lectura; guarda únicamente conteos.

```powershell
$env:API_TOKEN = "tu_token"; $env:COMPANY_ID = "1"; $env:WAREHOUSE_ID = "1"
node sonda.mjs niveles            # plan
node sonda.mjs niveles --enviar   # unas 62 consultas; MAX_VENTAS cambia cuántas ventas revisa (60 por defecto)
```
Supuesto: la posición 0 de la lista (por `productPriceId`) es P0, la 1 es P1, y así. Una línea con precio que no está en la lista (descuento o precio manual) no vota, ni una con dos niveles de igual valor.

### Fase 3e: quién tiene datos para probar (`vendedores`)
Recorre los empleados (`POST /employees`) y por cada uno cuenta sus **pedidos pendientes** en cada una de sus bodegas y sus **cotizaciones**. Dice con qué `USER_ID` conviene correr `sondear`.

```powershell
node sonda.mjs vendedores            # plan
node sonda.mjs vendedores --enviar   # ~2 consultas por empleado
```

### Fase 3f: cotizaciones sin filtros de persona (`cotizaciones`)
```powershell
node sonda.mjs cotizaciones            # plan (7 consultas)
node sonda.mjs cotizaciones --enviar   # solo COMPANY_ID y API_TOKEN; ESTADOS_COT cambia los estados probados
```

Qué hace y qué no:
- Solo llama a la clase `lectura`; nunca a `POST /employees/access-credentials`.
- Va de una en una, con pausa; se detiene con tres `401` seguidos o con un `429`.
- Las operaciones de detalle (`/sales/detail`, `/users/{id}`...) esperan a que otra respuesta entregue un id válido; si no aparece, quedan **omitidas** con el motivo.
- Guarda por endpoint: código, tiempo, forma del envoltorio (`success`, `message`, `data`, `meta`), el tipo de cada campo (con cuántos vienen vacíos o nulos), campos documentados que nunca llegaron, campos que llegan sin estar documentados y una **muestra de 3 filas** con textos personales (correo, teléfono, documento, nombres, fotos) reemplazados por su tipo y largo.
- No guarda el token ni lo muestra en pantalla. `node sonda.mjs inventario` puede repetirse sin perder lo sondeado.

## Reglas de seguridad
- La API es de **producción**: solo se llama a endpoints de **lectura** (clase `lectura`).
- En esta API muchos **POST son consultas** (por ejemplo `POST /carts` lista carritos; `POST /carts/register` es el que crea). Cuentan como `lectura` los POST cuyo resumen del Swagger empieza por Get, Search, Filter, Check, Validate, Generate, List o Retrieve; también los de `SIIGO` y `Sync` que dicen "Get ..." (15 consultas de solo lectura).
- **No se llaman** los POST/PUT/DELETE que crean o modifican (`escritura`: `/register`, `/create`, `/cancel`, `/approved`...), los de `SIIGO` y `Sync` que sincronizan o escriben (`crítico`) ni la sesión (`login`, `refresh`, `logout`).
- `POST /employees/access-credentials` devuelve credenciales: no se prueba ni se guarda su respuesta.
- El token **lo pone el usuario** en su terminal (`API_TOKEN`); nunca se escribe en un archivo ni se pega en el chat.
- Las respuestas se guardan recortadas (pocas filas por endpoint) y sin datos sensibles.

## Estado de las fases
| Fase | Qué es | Estado |
|---|---|---|
| 1 | Inventario base (Swagger + config + uso en la app) | Hecha |
| 1b | Validación de `config.ts` | Hecha (ver INFORME.md §2) |
| 2 | Clasificar operaciones: lectura / escritura / crítico / sesión | Hecha (se revisa a mano antes de la fase 3) |
| 3 | Sonda de lectura con token del usuario (`sondear`) | Script listo y probado con un servidor falso; corrido por el usuario: 84 operaciones |
| 4 | Clasificar cada respuesta (completo, incompleto, roto...) | Hecha (INFORME.md §5 y endpoints.xlsx) |
| 5 | Tipos de datos y relaciones entre entidades | Hecha (hojas Campos y Relaciones) |
| 6 | `endpoints.xlsx` e informe final | Hecha; prioridades en INFORME.md §7 |


## Documentos principales

- [DOCUMENTACION-API.md](DOCUMENTACION-API.md): referencia validada de los 189 endpoints.
- [PLAN-V3.md](PLAN-V3.md): plan en tres fases (base de datos, API en Go, frontend) con integración SIIGO.
- [V3-esquema-borrador.sql](V3-esquema-borrador.sql): script completo de la base de datos de la V3 (70 tablas), ejecutado en PostgreSQL 18.6.
- [pruebas-bd/](pruebas-bd/README.md): los 101 escenarios con los que se probó el script y cómo repetirlos (`npm install` y `npm test`).
- [MAQUETA-V3.html](MAQUETA-V3.html): maqueta de cuatro pestañas (la aplicación, la base de datos, el script SQL y la estructura del frontend).

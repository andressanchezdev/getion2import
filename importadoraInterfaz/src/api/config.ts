// config · URL base, timeout y endpoints del backend
// conecta con: api/client, api/health; scripts/check-endpoints.mjs revisa que cada ruta exista en el Swagger (npm run check:api)
// ojo: aquí viven TODAS las rutas (ninguna escrita suelta en un service). Todos los listados del backend son POST con { companyId, page, pageSize, ... } y responden { data, meta }
// src/api/config.ts

/**
 * Configuración maestra de la API (Backend en Railway)
 */
export const API_CONFIG = {
  BASE_URL:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    'https://importadora-back-production.up.railway.app',
  STORAGE_BASE_URL:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORAGE_BASE_URL) ||
    'https://storage.googleapis.com/importadorapremiumonline/',
  TIMEOUT: 15000, // 15 segundos
  // URL del websocket de tiempo real; vacía = tiempo real desactivado (no se conecta a ningún servidor por defecto)
  WS_URL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) || '',
  ENDPOINTS: {
    // Autenticación
    AUTH: {
      LOGIN: '/auth/login', //funciona

      REFRESH: '/auth/refresh', //funciona
      LOGOUT: '/auth/logout',//funciona, debemos validar que el token se revoque completametne y que la logica detras lo deje invalido al aplicar el logout

    },
    // Productos, búsqueda e inventario de lectura
    PRODUCTS: {
      LIST: '/products', // FUNCIONA, 200 "Products successfully obtained" con {companyId, page, pageSize}; devuelve productId, code, description, categoryName, modelName, brandName, brandImage, isActive, isPromotion, locations, prices e images
      REGISTER: '/products/register', // ERROR 404 "The route you are looking for does not exist" con {companyId, brandId, categoryId, modelId, taxId, code, description, isActive, lastCost, purchasePrice, maxStock, minStock}; el Swagger la lista pero el backend no la tiene publicada; el producto no se crea (no sale en /products ni en /search)
      //SEARCH: '/inventory/search', // FUNCIONA, búsqueda por texto en código, descripción, marca, modelo o categoría
    },
    // Búsqueda universal (varias entidades a la vez)
    SEARCH: {
      UNIVERSAL: '/search', // FUNCIONA con {companyId, query, type:"product", limit}, 200 "Search completed successfully" y la misma forma de fila que /products
    },
    // POS / Carrito de Ventas
    CARTS: {

      GET: '/carts', //se le envia POST CON BODY VACIO Y SE OBTIENE UNA RESPUESTA 200 PERO SIN DATA
      //VALIDAR QUE DATA SI ESTE ENVIANDOSE EN LA RESPUESTA DESDE EL BACKEND
      //COMO NO DEVUELVE DATA, NO E ACCEDIDO A LOS uuid de los demas carritos
      REGISTER_ITEM: '/carts/register', //DEVUELVE RESPUETSA 200 OK,"CREA" EL CARRITO, ENVIANDO
      UPDATE: '/carts/update', // cambia la cantidad de un ítem { cartId, quantity }
      DELETE: '/carts/delete', // borra un ítem y devuelve su stock { cartId }
      DELETE_ALL: '/carts/deleteall', //DELETE MASIVO envia user id e identificador unico de el carrito "uuid"
      REASSIGN_USER: '/carts/reassignuser', //responde correctametne, se envia  con {"newUserId","oldUserId", "uuid"
    },
    // Catálogos grupo base de el endpoint
    CATALOGS: {
      CATEGORIES: '/categories', //FUNCIONA-DEBE LLEVAR companyID, page, pagezise, y devuelve un 200 con todas las categorias
      CATEGORIES_REGISTER: '/categories/register', //funciona devuelve el categorieId junto con el mensaje de success 200 OK
      // PRUEBA DE HOY (ANDRES): responde 201 "Category registered successfully" pero con categoryId = 0 y NO crea nada: el total de /categories sigue igual (529) y el nombre no aparece en ninguna pagina
      CATEGORIES_UPDATE: '/categories/update',// ENVIA UN ERROR DE EL SERVIDOR AL ENVIAR LA PETICION, NO ACTUALIZA, SE ENVIAN
      // SIiN PRoOBAR HOY: no se pudo crear una categoria propia para actualizarla (el registro no crea nada) y se evito tocar las categorias reales
      //"categoryId","name"
      BRANDS: '/brands', // FUNCIONA, 200 "Brands successfully obtained" con {companyId, page, pageSize}; devuelve brandId, name, image
      BRANDS_REGISTER: '/brands/register', // FUNCIONA con {companyId, name}, 201 "Brand created successfully" y devuelve {brandId, name, image}; la marca aparece de inmediato en /brands
      BRANDS_UPDATE: '/brands/update', // FUNCIONA, es PUT con {brandId, name}, 200 "Brand updated successfully"; el nombre cambia en /brands
      //      MODELS: '/models',
      //      MODELS_REGISTER: '/models/register',
      //      MODELS_UPDATE: '/models/update',
    },

    WAREHOUSES: {
      BASE: '/warehouses', // FUNCIONA, 200 "Warehouses successfully obtained"; devuelve warehouseId, name, address, las series (electronicBillingSerial, transferSerial, remissionSerial, saleSerial), isMain, isActive
      REGISTER: '/warehouses/register', // FUNCIONA con {companyId, name, address}, 201 "Warehouse registered successfully" pero la respuesta trae warehouseId = 0 (el id real hay que buscarlo en /warehouses) y las 4 series quedan en 0
      UPDATE: '/warehouses/update', // FUNCIONA, es PUT con {warehouseId, name, address}, 200 "Warehouse updated successfully"; INCONSISTENTE: la respuesta dice isActive:false pero en /warehouses la bodega sigue isActive:true
    },
    MODELS: {
      BASE: '/models', //FUNCIOAN CORRECTAMENTE DEVUELVE OBJETOS DENTRO DE MODEL, MODELID, NAME
      REGISTER: '/models/register', //FUNCIONA CORRECTAMENTE, SE CREA EL MODELO CON LOS MISMOS CAMPOS MODELID, NAME
      // PRUEBA ANDRES: responde 201 "Model registered successfully" pero con modelId = 0 y NO crea nada: el total de /models sigue igual (552) y el nombre no aparece en ninguna pagina
      UPDATE: '/models/update', //FUNCIONA, SE RECIBE RESPUESTA 200, PERO NO PUDE VER EL PRODUCTO CREADO CON LOS DATOSW E PRUENA
      // SiN PROBA HOY: no se pudo crear un modelo propio para actualizarlo (el registro no crea nada) y se evito tocar los modelos reales
    },
    CUSTOMERS: {
      REGISTER: '/customers/register',//    envia en el body elegimos from data, e ingresamos dentro data:
      // datos de el cliente, y ingresamos los demas archivos enviandolos en null, la tabla no esta creada,
      // falta migrar para que se cree o no esta completa
      CHECK_EMAIL: '/customers/check-email', //SE ENVIA EN EL BODY EL companyid e email de el usario, se obtiene:  (200) SI FUNCIONA
      FAVORITES: '/customers/favorites', // TABLA user.favorites no existe, no esta en la db o falta la migracion para ingresarla, validar
      UPDATE_FAVORITE: '/customers/update-favorite',//no existe la tabla en la db "error": "Error updating favorite: Error 1146 (42S02): Table 'testpremium.userfavorites' doesn't exist"
      UPDATE_DETAILS: '/customers/update-details', //error": "Error updating details: Error 1146 (42S02): Table 'testpremium.userdetails' doesn't exist
      UPDATE_COMPANIES: '/customers/update-companies', // falta la integracion de la colunma de tipod de documento dentro de la db, por eso no pasa a 200 la peticion
      UPDATE_PHOTO: '/customers/update-photo',//validar que la tabla este alineada con lo que actualmetne requiere el form, indica "{
      // 	"success": false,
      // 	"message": "Solicitud inválida",
      // 	"error": "Photo file is required" aun enviando imagen falsa con libreia faker
      // }"
      UPDATE_DOCUMENT: '/customers/update-document',//runtime error: invalid memory address or nil pointer dereference, en el form se envia claves: photo, photos y no funciona, se envia la calve "files" e indica  "runtime error: invalid memory address or nil pointer dereference"
      DELETE_DOCUMENT: '/customers/delete-document', // SE  envia companyId con userId y responde con un 500:
      // 	"success": false,
      // 	"message": "Error interno del servidor",
      // 	"error": "Error deleting document: file not found"
      // }, validar si dentro de el ususario no cuenta con documetos cargados
    },
    DIRECTIONS: {
      LIST: '/directions',//FUNCIOAN SIN ERROR ENVIANDO BODY CON userid page, pagesize  pagezise es la cantidad de objeton que va a traer
      //page es el indicador de a que page ir a buiscar el dato que estamos enviando, pagesize indica la cantidad dentro que se van a msotrar que consinidan con el id
      REGISTER: '/directions/register', //funciona sin errroes agregando la direccion a el ususario, se envia
      //{
      //   "additionalInfo": "CASA DE PRUEBA SEGUNDO PISO",
      //   "address": "CALLE DE PRUEBA ANDRES",
      //   "city": "CARRERA DE PRUEBA",
      //   "country": "pOLOMBIA",
      //   "department": "SEGUNDO PISO",
      //   "neighborhood": "SANTO DOMINGO",
      //   "userId   315
      // }
      UPDATE: '/directions/update',//FUNCIONA CORRECTAMENTE ACTUALIZA,
      // SE LE ENVIA EL BODY CON DIRECTIONID PARA DAR CON LA DIRECCION REGISTRADA
      // QUE SE VA A ACTUALIZAR CON EL MISMO BODY
      DELETE: '/directions/delete', //FUNCIOAN CORRECTAMETE, PRUEBA APLICADA CONTRA EL DIRECTIONID "1120" SE ELIMINO CORRECTAMETNE LA DIRECCION "//
      // "message": "Direction deleted successfull"
    },
    DISCOUNTS: {
      LIST: '/discounts',  //SI FUNCIONA, DA UNA RESPUESTA, VALIDAR SI LOS DATOS QUE SE DEBEN ENVIAR DE LOS DESCUENTOS SI ESTEN DENTRO DE EL CAMPO AL LLAMARLOS
      REGISTER: '/discounts/register', //Funciona, crea el modelo correctamente con body modelId, name (name como string,pero contiene datos numericos)
      UPDATE: '/discounts/update', // ERROR 404 "discount not found" (PUT con {discountId, rate, isActive}) para el discountId que devolvio /discounts/register; no se pudo comprobar que actualice
      DELETE: '/discounts/delete', // ERROR 404 "Discount not found" (DELETE con {discountId}) para el mismo id que devolvio /discounts/register; no se pudo comprobar que borre
      DELETE_ALL: '/discounts/deleteall', // SP A PROPOSITO: borra todos los descuentos del userId (DELETE con {userId})
      DISABLE_ALL: '/discounts/disabledall', // SP A PROPOSITO: desactiva todos los descuentos del userId (PUT con {userId})
      // OJO REGISTER, probado con un usuario de prueba y {userId, brandId, rate:5, quantity:1, isActive:true}: responde 201 "Discount registered successfully" pero devuelve rate:0, isActive:false y un discountId que despues no existe (404 en update y delete); /discounts con ese userId sigue en data = []; al repetirlo con categoryId responde 500 "Error registering discount: discount already exists", asi que algo si se guardo pero no se puede ver ni editar desde la API
    },
    // Cartera y Crédito
    WALLET: {
      BASE: '/wallet', // FUNCIONA, 200 "Users successfully obtained"; trae sumAmount, isCredit, ubicationInformation, paymentInformation, companyInformation y creditInformation
      SUMMARY: '/wallet/summary', // ERROR 500 "Wallet summary could not be retrieved: failed to retrieve wallet summary" tanto con {companyId, warehouseId:1} como solo con {companyId}; la app lo usa para los KPI de cartera, validar el controlador del backend
      INTERNAL: '/wallet/internal', // RESPONDE 200 "Wallet by ID obtained successfully" con {companyId, userId:315} pero data = [] (sin facturas para ese usuario, no se sabe si esta completo)
      HISTORY: '/wallet/history', // RESPONDE 200 "Bills successfully obtained" con {companyId, userId:315, page, pageSize} pero data = [] (vacio, no se sabe si esta completo)
    },
    PAYMENTS: {
      LIST: '/payments', // RESPONDE 200 "Payments successfully obtained" ENVIO BODY
      // {
      //   "page": 1,
      //   "pageSize": 30,
      //   "userId": 315
      // } OBTENEMOS COMO RESPUESTA

      // paymentId": 8659,
      // "userId": 315,
      // "saleId": 1029,
      // "companyId": 0,
      // "userVerifyId": 315,
      // "amount": 1,
      // "remainingAmount": 389999,
      // "paymentMethod": "cash",
      // "created_at": "0001-01-01T00:00:00Z",
      // "serialPayment": 51,
      // "warehouseInformation": {
      // 	"warehouseId": 0,
      // 	"companyId": 0,
      // 	"name": "",
      // 	"address": "",
      // 	"electronicBillingSerial": 0,
      // 	"transferSerial": 0,
      // 	"remissionSerial": 0,
      // 	"saleSerial": 0,
      // 	"isActive": false,
      // 	"isMain": false
      //
      // pero data =[](vacio)
      REGISTER: '/payments/register',
      ADVANCE: '/payments/advance',
      EARLY: '/payments/early',
      BY_SALE: '/payments/by-sale', // RESPONDE 200 "Payments retrieved successfully" con {companyId, saleId:1029} pero data = [] (esa venta no tiene pagos)
      DETAIL: '/payments/detail', // FUNCIONA con {companyId, paymentId:1}, 200 "Payment retrieved successfully"; devuelve paymentId, userId, saleId, amount, remainingAmount, paymentMethod, serialPayment y warehouseInformation
      SUMMARY: '/payments/summary', // FUNCIONA con {companyId, warehouseId:1}, 200; devuelve totales de pagos (verificados, pendientes, cancelados), montos y paymentsByMethod
      CHANGE_STATUS: '/payments/changestatus',
      CANCELLED: '/payments/cancelled', // SP: el Swagger la tiene como PUT (no POST) con {paymentId, reason, userId}; cancela un pago real
      BULK: '/payments/bulk', // SP: inserta pagos en lote
      BULK_INSERT: '/payments/bulk-insert', // SP: inserta pagos en lote (el Swagger lo describe igual que /payments/bulk)
    },
    // Ventas y Pipeline de Surtido
    SALES: {
      REGISTER: '/sales/register',
      PENDINGS: '/sales/pendings', // RESPONDE 200 "Pendings successfully obteined" con {companyId, page, pageSize, warehouseId:1} pero data = [] (vacio)
      HISTORY: '/sales/history', // ERROR 500 "Histories could not recovered: failed to retrieve histories" con {companyId, page, pageSize, warehouseId:1}, validar el controlador del backend
      DETAIL: '/sales/detail', // FUNCIONA con {companyId, saleId:1029, warehouseId:1}, 200 "Sale retrieved successfully"; trae la venta (serialCode, invoiceStatus, saleChannel, totalAmount) pero NO trae items ni cliente (eso lo da /management/saleId)
      SUMMARY: '/sales/summary', // FUNCIONA con {companyId, warehouseId:1}, 200; devuelve totales y desgloses salesByChannel, salesByPaymentMethod y salesByInvoiceStatus
      STATUS: '/sales/status',
      CANCEL: '/sales/cancel',
      APPROVED: '/sales/approved', // ERROR 500 "Error updating sale data: the code does not match the reference number" con {saleId:1029, code:0}; probado por error con un codigo falso: el backend lo rechazo y no cambio nada; exige un code igual a la referencia de la venta
      TRASLADES: '/sales/traslades', // FUNCIONA con {page, pageSize, userId, warehouseId}, 200 "Traslades successfully obteined"; devuelve saleId, serialCode, invoiceStatus, userInformation, warehouseInformation y auxWarehouseInformation
      TRASLADES_REJECT: '/sales/traslades/reject',
      REPORT_GENERAL: '/sales/report/general', // ERROR 404 "The route you are looking for does not exist": la ruta esta en config pero no existe en el backend
      REPORT_INTERNAL: '/sales/report/internal', // ERROR 404 "The route you are looking for does not exist": la ruta esta en config pero no existe en el backend
    },
    ORDERS: {
      LIST: '/orders', // solo deja saleid 315 exige sellerId (400 "GetOrdersRequest.SellerId required"); con sellerId:315 
      // responde 200 "Orders Successfully obtained" pero devuelve USUARIOS (userId, name, email, identification, phone, priceType, profileType, serialResponse), no pedidos, y con pageSize:5 devolvio 20 filas (ignora pageSize). Los pedidos reales salen de /management/saleOrders
      //envia todas lar ordenes creadas inicaindo en id 215
    },
    COMPANIES: {
      LIST: '/companies', //GET COMPANIES
      CREATE: '/companies',
      UPDATE: '/companies/update', //PUT  data to update have to send
      //   "address": "string",
      //   "businessName": "string",
      //   "dianResolutionDate": "string",
      //   "dianResolutionNumber": "string",
      //   "economicActivities": "string",
      //   "electronicCancellationSerial": "string",
      //   "email": "string",
      //   "finalInvoiceNumber": "string",
      //   "initialInvoiceNumber": "string",
      //   "isActive": true,
      //   "isElectronicBiller": true,
      //   "logo": "string",
      //   "name": "string",
      //   "nit": "string",
      //   "paymentSerial": "string",
      //   "phone": "string",
      //   "prefix": "string",
      //   "purchaseSerial": "string",
      //   "supplierNit": "string",
      //   "technicalKey": "string"
      // }
      DELETE: '/cpompanies/delete', //delete by Cományid devuelve la respuesta: {
      // "success": false,
      // "message": "Solicitud inválida",
      // "error": "Invalid company ID"
      // } ni con id ni con companyid
      // BY_ID: (id: number | string) => `/companies/${id}`, {
      // "success": false,
      // "message": "Solicitud inválida",
      // "error": "Invalid company ID"
      // }
      DELETE_DELETE: '/companies/delete', // SP A PROPOSITO: borra una empresa
      ID: '/companies/id', // ERROR 400 "Invalid company ID" con ?id=1 y con ?companyId=1 (igual que la nota de arriba)
    },
    INVENTORY: {
      GET: '/inventory', // FUNCIONA, 200 "Products successfully obtained" con {companyId, page, pageSize, warehouseId}; devuelve productImage, brandName, description, modelName, categoryName, code, minStock y maxStock (sin stock por ubicacion)
      //FUNCIONA devuelve  el inventario de la empresa, MENSAJE SUCCES 200  "Products successfully obtained"
      CONTROL: '/inventory/control', //FUNCIONA OBTENEMOS RESPUESTA 200 DEVUELVE DATOS DE EL PRODUCTO IDPRODUCTO CODDIGO Y DATA CON LA INF DE EL PRODUCT
      COUNT_LOCATIONS: '/inventory/countLocations', // fUNCIONA DEVUELVE UNA RESPUESTA SIMPLE

      CREATE_PRODUCT_INVENTORY: '/inventory/createProduct', // DEVUELVE la respuesta sencilla  el body enviado en complejo:
      // PRUEBA DE HOY (ANDRES): ERROR 500 "Error registering product: failed to add product" con {companyId, brandId, categoryId, modelId, taxId, code, description, isActive, lastCost, purchasePrice, maxStock, minStock}; el producto no se crea (igual que /products/register, que da 404)
      //       {
      //   "brandId": 30,
      //   "categoryId": 63,
      //   "code": "P0001",
      //   "companyId": 1,
      //   "description": "prueba de andres description",
      //   "isActive": true,
      //   "lastCost": 18000,
      //   "maxStock": 50,
      //   "minStock": 5,
      //   "modelId": 1,
      //   "purchasePrice": 18000,
      //   "taxId": 1
      //      pero el producto no se crea, no se sabe error sobre la tabla,
      //  o sobre la documentacion que indica enviar datos incompletos o desobra
      DELETE: '/inventory/deleteLocationProduct', //FUNCIONA enviamos udserId, prodiuctoLocationId, y companyId
      //SE OBTIENE RESPUESTA 200 CON  Y ARREGLOS COMO:  MOVEMENT, CONTROL Y PRODUCTLOCATION
      //
      FILTER: '/inventory/filter', //funciona enviandole un body con miltiples arrays
      //       {
      //   "brandIds": [
      //     30
      //   ],
      //   "categoryIds": [
      //     63
      //   ],
      //   "companyId": 1,
      //   "familyIds": [],
      //   "hasStock": true,
      //   "modelIds": [
      //     1
      //   ],
      //   "page": 1,
      //   "pageSize": 30,
      //   "statusId": [
      //     2,
      //     3,
      //     7
      //   ],
      //   "warehouseId": 1
      // } devuelve la respuesta sin data, validar si el backend si envia la data correctamente en la respuesta
      LOCATIONS: '/inventory/locations', // FUNCIONA SE ENVIA Y OBTENEMOS RESP 200 CON MENSAJE Y DATA, DENTRO DE DATA ENCONTRAMOS OJETOS:
      //"locationId": 8,
      // 	"warehouseId": 1,
      // 	"companyId": 1,
      // 	"location": "01-A700",
      // 	"isActive": 1,
      // 	"created_at": "2025-07-25T14:06:55Z",
      // 	"update_at": "2026-03-10T10:09:18Z",
      // 	"countProducts": 6,
      // 	"countItems": 20
      // },
      // {
      // 	"locationId": 9,
      // 	"warehouseId": 1,
      // 	"companyId": 1,
      // 	"location": "01-B00",
      // 	"isActive": 1,
      // 	"created_at": "2025-07-25T14:06:55Z",
      // 	"update_at": "2025-11-06T14:18:35Z",
      // 	"countProducts": 3,
      // 	"countItems": 1
      // }
      // Reportes
      REGISTER_LOCATION: '/inventory/registerLocation', // FUNCIONA devuelve una respuetsa
      // PRUEBA DE HOY (ANDRES): con quantity:0 responde 400 (Quantity required: el validador trata 0 como vacio y el error nombra GetInventoryRegisterLocationProductRequest, otra estructura); con quantity:1 responde 500 "Error: failed to add model" (mensaje que no corresponde) y la ubicacion no se crea
      // "Error interno del servidor" pero la accion no registra la nueva ubicacion, validar el controlador de el backend esta completo en su logica
      REGITER_PRODUCT_LOCATION: '/inventory/registerProductLocation', //se envia en body:
      //  "companyId": 1,
      //  "location": "01-b1000",
      //  "productId": 13482,
      //  "quantity": 10,
      //  "userId": 315,
      //  "warehouseId": 1
      //pero la respuetsa indica un error de el backend en la peticion

      SEARCH: '/inventory/search', //FUNCIONA, se envian {
      //   "companyId": 1,
      //   "limit": 5,
      //   "query": "17020420",
      //   "type": "product"
      // } pero el campo limit no influye en nada, el campo importante es "query"
      SEARCH_LOCATION: '/inventory/searchLocation', //   ENVIAMOS {
      //   "companyId": 1,
      //   "location": "A1-700",
      //   "warehouseId": 1
      // } obtendremos   {    PERO DEVUELVE LA RESPUESTA CON DATA TIPO NULL
      TRANSFER_LOCATION: '/inventory/transferLocationProduct', //
      //       {
      //   "companyId": 1,
      //   "destinationLocation": "01-A7001",
      //   "eliminate": "false",
      //   "originLocation": "01-A700",
      //   "productId": 13482,
      //   "quantity": 2,
      //   "userId": 1023,
      //   "warehouseId": 1
      // } pero en respueta indica error en el servidor "{
      //   "success": false,
      //   "message": "Error interno del servidor",
      //   "error": "Error: failed detected ProductLocationId in Location Origin"
      // }
      NAVIGATE_BY_LOCATIONS: "/inventory/turn360degree", //se envia companyId ubicacion nueva, ubicacion actual productId
      //se envia  y la respesta obtenida es un error interno "no get de locations de el producto"
      UPDATE_LOCATION: '/inventory/updateLocation', // se envian
      //   "companyId": 1,
      //   "location": "06-D06",
      //   "locationId": 13,
      //   "warehouseId": 1
      // pero la respuesta indica un error interno de el servidor
      // Error: failed to location exist

      UPDATE_LOCATION_PRODUCT: '/inventory/updateLocationProduct', // se envia en body PUT
      //   {
      //   "companyId": 1,
      //   "location": "01-B00",
      //   "locationId": 13,
      //   "warehouseId": 1
      //    pero COMO RESPUESTA OBTENEMOS ERROR SOBRE LA FNUCION
      //    GetInventoryUpdateLocationProductRequest.ProductLocationId 
      // https://importadora-back-production.up.railway.app/inventory/updateLocationProduct

      REGISTER_LOCATION_PRODUCT: '/inventory/registerLocationProduct', // SP A PROPOSITO: registra stock de un producto en una ubicacion y no se pudo crear un producto propio (createProduct da 500); body {companyId, warehouseId, userId, productId, location, quantity}
      TURN360DEGREE: '/inventory/turn360degree', // ERROR 500 "Error: error getting locations product" con {companyId, warehouseId:1, productId:"1", location:"01-A700", following:"next"|"prev"|"1"}; productId y following son string y los valores validos de following no estan documentados
    },
    MANAGEMENT: {
      GET_COMPANIES: '/management', //FUNCIOAN ENVIA COMPALYID, ESTADO DE EL PEDIDO, Y UBICACION , DEVELVE CANTIDADES DE PEDIDOS EN ESTE ESTADO ENVIADO
      CHANGEID: '/management/changeId', //FUNCIONA, ENVIAMOS INFOTYPE, userId, saleId el userId debe existir
      FINANCIAL: '/management/finaliceOrderVerification',  //se envia estado actual e nuevo estado siguiente, junto con el saleId pero al enviarlo indica error
      //de servidor Management finalize orders verification could not be recovered: Error update status sale
      MANAGEMENT: '/management/saleLocationsPicking', //NO FUNCIONA, se envia BODY CON "{
      //   "saleId": 1029,
      //   "saleLocationPicking": "1600"
      // }" 
      UPDATE_LOCATIONS_SALES: '/management/saleLocationPicking', //No funciona, enviando saleId, saleLocationId
      //Respuesta obtenida: ""Management sale location picking could not be recovered: json: cannot unmarshal number into Go value of type []models.ManagementSaleLocationPicking"" 
      //el arror esta sobre el dato enviado en el saleLocationId
      GET_SALE_BY_ID: '/management/saleId', // detalle completo del pedido (cabecera, cliente, vendedor, líneas y pagos); lo usa la vista de pedidos; verificado en la versión anterior
      GET_SALE_ORDERS: '/management/saleOrders',  //
      //       {
      //   "companyId": 1,
      //   "invoiceStatus": "invoicing",
      //   "page": 1,
      //   "pageSize": 30,
      //   "saleChannel": "corporate",
      //   "saleType": "sale",
      //   "warehouseId": 5
      // }devuellve una respuesta 200 que integra "data" 
      CANCELLATION: '/managment/cancellationTransactionSale', //enviamos el body:
      //   {
      //     "cancellationId": 1,
      //     "reason": "Cancelación solicitada por el cliente",
      //     "saleId": 1029,
      //     "warehouseId": 1
      //   } y obtenemos respuesta: Management sale cancellation could not be recovered: Error create cancellation sale details 
      VERIFICATION_LOCATION: '/management/verifyLocation', //NO FUNCIONA, DEVUELVE REPUESTA 204 VACIA ENVIANDO SALEID "1029"
      CANCELLATION_TRANSACTION_SALE: '/management/cancellationTransactionSale', // SP: cancela una venta; OJO la clave CANCELLATION de arriba escribe la ruta con la errata "/managment/..." y esta es la ruta del Swagger
      FINALIZE_ORDER_VERIFICATION: '/management/finalizeOrderVerification', // SP: cambia la etapa de un pedido real
      VERIFY_TRANSACTION: '/management/verifyTransaction', // SP: verifica el pago de una venta real
    },
    REPORTS: {
      SALES: '/reports/sales', // EXIGE startDate y endDate (400 "SalesReportRequest.StartDate required"); con "2026-01-01" y "2026-10-28" FUNCIONA, 200; devuelve totalSales, totalOrders, averageTicket, salesByDay, topProducts y paymentMethods
      CUSTOMERS: '/reports/customers', // FUNCIONA sin fechas, 200 "Customer report generated successfully"; devuelve totalCustomers, activeCustomers, newCustomers, totalRevenue, topCustomers y customersByType
      FINANCIAL: '/reports/financial', // EXIGE startDate y endDate (400 "FinancialReportRequest.StartDate required"); con "2026-01-01" y "2026-10-28" FUNCIONA, 200; devuelve totalRevenue, totalCost, grossProfit, grossMargin, accountsReceivable y revenueByMonth
      INVENTORY: '/reports/inventory', // FUNCIONA con {companyId, warehouseId:1}, 200; devuelve totalProducts, totalStock, totalValue, lowStockCount, outOfStockCount, stockByCategory, stockByBrand y lowStockProducts
    },
    // Empleados y Permisos
    EMPLOYEES: {
      BASE: '/employees', //GET GENERAL DE LOS DATOS OBTIENE   "success": true,"message": "Employees retrieved successfully","data" [ARRAY DE LA DATA QUE CONTEIEN  DENTRO DE ESTA RESPUESTA OTIENE ]
      //   "userId": 1009,
      // 	"employeeId": 43,
      // 	"branches": [
      // 		{
      // 			"branchId": 1,
      // 			"branchName": "Updated Warehouse"
      // 		},
      // 		{
      // 			"branchId": 6,
      // 			"branchName": "Tienda Online"
      // 		}
      // 	],
      // 	"roles": [
      // 		{
      // 			"roleId": 1,
      // 			"roleName": "Vendedor interno"
      // 		},
      // 		{
      // 			"roleId": 4,
      // 			"roleName": "Bodeguero"
      // 		}
      // 	],
      // 	"workModality": "Presencial",
      // 	"inmediateSupervisor": {
      // 		"name": ""
      // 	},
      // 	"employmentStatus": "activo",
      // 	"companyId": 1,
      // 	"warehouseId": 0,
      // 	"photo": "https://pub-85f7794f845a4ff6bd279426e93ab5ef.r2.dev/empleados/fotos/images-1762743280.png",
      // 	"companyDetails": {
      // 		"businessName": "",
      // 		"nit": "",
      // 		"phone": "",
      // 		"cellPhone": ""
      // 	},
      // 	"name": "rfwefwe",
      // 	"lastName": "fwefwf",
      // 	"identification": "313231323121",
      // 	"country": "Colombia",
      // 	"department": "Antioquia",
      // 	"city": "Medellín",
      // 	"neighborhood": "",
      // 	"address": "dqdw, Medellín Antioquia",
      // 	"additionalInfo": "",
      // 	"dni": "313231323121",
      // 	"email": "updated+43@example.com",
      // 	"phone": "123123231",
      // 	"isActive": true
      // },
      LIST: '/employees/list', //GET QUE OBTIENE LA LISTA DE LOS EMPLEADO COMPLETA: {
      // "success": true,
      // "message": "Employee list retrieved successfully",
      // // "data": { DENTRO DE DATA OBTENEOMOS EL ARRAY DE LAS FILAS DE EL EMPLADOC CON  "employees": [
      // {
      // 	"employeeId": 55,
      // 	"userId": 1023,
      // 	"name": "Juan Sebastian",
      // 	"lastName": "Grisales",
      // 	"businessName": "Importadora Premium Online S.A.S",
      // 	"accessStatus": true,
      // 	"connectionStatus": {
      // 		"lastConnectedAt": "",
      // 		"connectedDurationSeconds": 0
      // 	},
      // 	"identification": "334343",
      // 	"identificationType": "CC",
      // 	"email": "juansebastian.grisales@premiummotos.com",
      // 	"phone": "34343434",
      // 	"photo": "",
      // 	"employmentStatus": "activo",
      // 	"workModality": "Presencial"
      // },

      ROLES: '/employees/roles', //funciona, enviando en companyId como parametro e id de le empresa "1" y devuelve
      //devuelve mensaje data y succes y muestra la respuesta: con las areasid de estas y roles de el area
      // "areaId": 3,
      // "areaName": "Administración",
      // "areaIcon": "briefcase",
      // "roles": [
      // 	{
      // 		"roleId": 3,
      // 		"roleName": "Administrador",
      // 		"description": "Administra operaciones generales",
      // 		"permissions": [],
      // 		"assignable": true,
      // 		"usersCount": 6
      // 	}
      // ]
      PERMISSIONS: '/employees/permissions',//requiero envio de el campo de  {"employeeId": 46} y devuelve una respuesta de no acceso o acceso denegado
      //{
      // 	"success": false,
      // 	"message": "Access denied",
      // 	"error": "employee not found or access denied"
      // }  aun cuando el id de empleado no coincide
      // envia :
      // {
      // 	"success": true,
      // 	"message": "Employee permissions retrieved successfully",
      // 	"data": {
      // 		"employeeId": 46,
      // 		"name": "werfwefwe",
      // 		"lastName": "ewfwf",
      // 		"branches": [
      // 			{
      // 				"branchId": 1,
      // 				"branchName": "Updated Warehouse",
      // 				"isPrimary": false
      // 			},
      // 			{
      // 				"branchId": 4,
      // 				"branchName": "NLR",
      // 				"isPrimary": false
      // 			},
      // 			{
      // 				"branchId": 6,
      // 				"branchName": "Tienda Online",
      // 				"isPrimary": false
      // 			},
      // 			{
      // 				"branchId": 7,
      // 				"branchName": "Premiun Jac",
      // 				"isPrimary": false
      // 			}
      // 		],
      // 		"modules": []
      // 	}
      // }
      DELETE: '/employees/', //no funciona lña respuesta obtenida es "record not found"  y el empleado no se elimina exitosamente
      SAVE_PERMISSIONS: '/employees/permissions/modules', //envia el mismo employeeId obligarotio para identifiacr a que empleado se le actualizadron, dieron permisos de el endpoint anterior, y debe enviar en su body:
      //       {
      //   "employeeId": 0,
      //   "modules": [
      //     {
      //       "canCreate": true,
      //       "canDelete": true,
      //       "canRead": true,
      //       "canUpdate": true,
      //       "moduleId": 11,
      //       "moduleKey": "string",
      //       "screens": [
      //         {
      //           "canCreate": true,
      //           "canDelete": true,
      //           "canRead": true,
      //           "canUpdate": true,
      //           "screenId": 0
      //         }
      //       ]
      //     }
      //   ]
      // }

      CREDENTIALS: '/employees/access-credentials', // EXIGE employeeId, no userId (400 "GetAccessCredentialsRequest.EmployeeId required"); con employeeId:55 responde 200 y DEVUELVE email y password del empleado: contrasena expuesta por el backend, riesgo de seguridad
      BY_ROLE: '/employees/by-role', // FUNCIONA con {companyId, roleId:1}, 200 "Employees successfully obtained"; devuelve id, name, businessName, identification y photo
      ROLE: '/employees/roles', //{
      // "companyId": 5
      // }

      REGISTER: '/employees/register', // SP: crea un empleado real
      BY_ID: (id: number | string) => `/employees/${id}`, // ERROR 404 "Employee not found" (GET) tanto con el employeeId (52) como con el userId (1019) de un empleado que si sale en /employees/list
    },
    // Purchases (agregado desde el Swagger)
    PURCHASES: {
      LIST: '/purchases', // FUNCIONA con {companyId, page, pageSize, warehouseId:1}, 200 "Purchase orders retrieved successfully"; trae purchaseOrderId, supplierName, warehouseName, orderNumber, status, statusLabel, orderDate
      CANCEL: '/purchases/cancel', // SP: cancela una orden de compra
      CREATE: '/purchases/create', // SP: crea una orden de compra
      DETAIL: '/purchases/detail', // FUNCIONA con {companyId, purchaseOrderId:15}, 200; con purchaseOrderId:0 responde 404 "Purchase order not found"
      RECEIVE: '/purchases/receive', // SP: recibe items de una orden de compra (mueve inventario)
      STATUS: '/purchases/status', // SP: cambia el estado de una orden de compra
      SUMMARY: '/purchases/summary', // FUNCIONA, GET, 200; devuelve totalOrders, conteos por estado, totalAmount, pendingAmount, receivedAmount y topSuppliers
      UPDATE: '/purchases/update', // SP: modifica una orden de compra
    },
    // Quotations (agregado desde el Swagger)
    QUOTATIONS: {
      LIST: '/quotations', // FUNCIONA con {companyId, page, pageSize, userId}, 200; devuelve {data, page, pageSize, totalRows, totalPages}
      BRANDS: '/quotations/brands', // RESPONDE 200 "Redirect to brands endpoint" y solo devuelve {endpoint, message}, no datos: hay que llamar /brands
      CART_ADD: '/quotations/cart/add', // SP: agrega un item a una cotizacion
      CART_DELETE: '/quotations/cart/delete', // SP: quita un item de una cotizacion
      CATEGORIES: '/quotations/categories', // RESPONDE 200 "Redirect to categories endpoint" y solo devuelve {endpoint, message}, no datos: hay que llamar /categories
      DELETE: '/quotations/delete', // SP: borra una cotizacion
      HISTORY: '/quotations/history', // FUNCIONA con {companyId, page, pageSize, userId}, 200; misma forma que /quotations
      MODELS: '/quotations/models', // RESPONDE 200 "Redirect to models endpoint" y solo devuelve {endpoint, message}, no datos: hay que llamar /models
      REGISTER: '/quotations/register', // SP: crea una cotizacion
      STATS: '/quotations/stats', // FUNCIONA, GET, 200; devuelve totalQuotations, conteos por estado, totalValue, acceptedValue y conversionRate
      STATUS: '/quotations/status', // SP: cambia el estado de una cotizacion
      UPDATE: '/quotations/update', // SP: modifica una cotizacion
      BY_ID: (id: number | string) => `/quotations/${id}`, // FUNCIONA, GET /quotations/2, 200; devuelve quotationId, sellerName, quotationNumber, subtotal, taxAmount, totalAmount, status, validUntil
    },
    // Siigo (agregado desde el Swagger)
    SIIGO: {
      ACCOUNT_GROUPS: '/siigo/account-groups', // SP
      COST_CENTERS: '/siigo/cost-centers', // 
      CREDIT_NOTE: '/siigo/credit-note', //
      CUSTOMERS: '/siigo/customers', // 
      DOCUMENT_TYPES: '/siigo/document-types', //
      INVOICES: '/siigo/invoices', //
      PAYMENT_TYPES: '/siigo/payment-types', //
      PRODUCTS: '/siigo/products', //   
      SYNC_CUSTOMERS: '/siigo/sync/customers', // 
      SYNC_INVOICE: '/siigo/sync/invoice', // 
      SYNC_INVOICES: '/siigo/sync/invoices', //
      SYNC_PRODUCTS: '/siigo/sync/products', // 
      TAXES: '/siigo/taxes', //
      TEST_CONNECTION: '/siigo/test-connection', // 
      USERS: '/siigo/users', // 
      WAREHOUSES: '/siigo/warehouses', //
    },
    // Suppliers (agregado desde el Swagger)
    SUPPLIERS: {
      CREATE: '/suppliers/create', // SP: crea un proveedor
      DELETE: '/suppliers/delete', // SP: borra un proveedor
      DETAIL: '/suppliers/detail', // FUNCIONA con {supplierId:19}, 200; con supplierId:0 responde 404 "Supplier not found"
      LIST: '/suppliers/list', // FUNCIONA con {companyId, page, pageSize}, 200; devuelve supplierId, name, documentType, documentId, email, phone, address, city, country
      PRODUCTS: '/suppliers/products', // RESPONDE 200 "Products retrieved successfully" con {supplierId:19, page, pageSize} pero data = null (no se sabe si el proveedor no tiene productos o si falla)
      PRODUCTS_ADD: '/suppliers/products/add', // SP: agrega un producto a un proveedor
      PRODUCTS_REMOVE: '/suppliers/products/remove', // SP: quita un producto de un proveedor
      PRODUCTS_UPDATE: '/suppliers/products/update', // SP: modifica un producto de un proveedor
      SUMMARY: '/suppliers/summary', // FUNCIONA, GET, 200; devuelve totalSuppliers, activeSuppliers, totalProducts y totalCreditLimit
      UPDATE: '/suppliers/update', // SP: modifica un proveedor
    },
    // Sync (agregado desde el Swagger)
    SYNC: {
      CONFLICTS: '/sync/conflicts', // SIiN PROBAAR: toca dispositivos y la cola de sincronizacion); metodo POST, "Get sync conflicts"
      CONFLICTS_RESOLVE: '/sync/conflicts/resolve', // SP:  ('''); metodo POST, "Resolve a sync conflict"
      DEVICES: '/sync/devices', // SP:  (''''); metodo POST, "Get registered devices"
      DEVICES_REGISTER: '/sync/devices/register', // SP:  (''''); metodo POST, "Register a sync device"
      DEVICES_UPDATE: '/sync/devices/update', // SP:  (''''); metodo PUT, "Update a device"
      FULL: '/sync/full', // SP:  (tosca dispsositivos y la cola de sincronizacion); metodo POST, "Perform full sync"
      LOGS: '/sync/logs', // SP:  (''''); metodo POST, "Get sync logs"
      PULL: '/sync/pull', // SP:  ('''''); metodo POST, "Pull updates from server"
      PUSH: '/sync/push', // SP:  ('''''); metodo POST, "Push changes to server"
      QUEUE: '/sync/queue', // SP:  (''''); metodo POST, "Get sync queue"
      QUEUE_ADD: '/sync/queue/add', // SP:  ('''''); metodo POST, "Queue a sync operation"
      QUEUE_UPDATE: '/sync/queue/update', // SP:  (''''); metodo PUT, "Update queue item status"
      STATUS: '/sync/status', // SP:  ('''''); metodo POST, "Get sync status"
    },
    // Terceros: usuarios (clientes y vendedores, proveedores, TODOS los Agentes activos son ), centralizada de la imfo de cada actor
    USERS: {
      LIST: '/users', // FUNCIONA con {companyId, page, pageSize, userType:"customer"}, 200 "Users successfully obtained"; cada fila trae companyInformation
      BY_ID: (id: number | string) => `/users/${id}`, // FUNCIONA, GET /users/315 responde 200 "User retrieved successfully" con el usuario y su companyInformation
      REGISTER: '/users/register', // SP: segun el Swagger es multipart/form-data (campo data con el JSON + photo, identityCardFiles, chamberCommerceFiles y rutFiles); para el alta sin archivos el backend ofrece /users/quick-register
      QUICK_REGISTER: '/users/quick-register', // FUNCIONA con {companyId, email, name, identification, phone, userType:"customer"}, 201 "User registered successfully"; devuelve el usuario con userId, warehouseId null y priceType vacio
      UPDATE: '/users/update', // FUNCIONA, es PUT con {userId + SOLO los campos a cambiar}, 200 "User updated successfully"; actualiza parcial (lastName y priceType cambian sin tocar el nombre); la respuesta devuelve el usuario completo
      STATE: '/users/state', // FUNCIONA, es PUT con {userId, isActive:false}, 200 "User state updated successfully"; el usuario desaparece de la lista POST /users pero GET /users/:id lo sigue devolviendo (no hay forma de ver desde la API que esta inactivo)
      VALIDATE_DOCUMENT: '/users/validate-document', // FUNCIONA con {companyId, identification}, 200 "Document validation completed"; devuelve {isValid, documentType, message}
      BALANCE: '/users/balance', // FUNCIONA con {userId, price, type}, 201 "Balance registered successfully" y devuelve {balanceId, userId, price, type, created_at}; acepta cualquier type e incluso sin type (quedo ""); el saldo NO se refleja en /wallet (sumAmount sigue en 0), no se sabe donde se consulta
      CREDIT: '/users/credit', // FUNCIONA, es PUT con {userId, quota, days}, 200 "User updated successfully"; guarda quota y days (visibles en /wallet > creditInformation) pero IGNORA isCredit: con isCredit:true sigue en false; ese flag solo cambia con PUT /users/update {isCredit}. Enviar solo quota no borra days. Probado con un usuario de prueba ANDRES
      CREDIT_DAYS: '/users/credit/days', // FUNCIONA, es PUT con {userId, days}, 200 "Credit days updated successfully"; cambia creditInformation.days en /wallet; acepta days:0 sin validar
      CREDIT_LIMIT: '/users/credit/limit', // FUNCIONA, es PUT con {userId, limit}, 200 "Credit limit updated successfully"; cambia creditInformation.quota en /wallet (es el mismo campo que quota de /users/credit); acepta limit negativo (-5) sin validar
    },

    // Salud del backend (GET, sin sesión y muy liviano: unos 220 bytes)
    HEALTH: {
      CHECK: '/health', //se envia con GET sin body ni headers, se obtiene una respuesta que no indica mucho, "redis no esta confugurado
      READINESS: '/readiness',  //funciona, devuelve un tiempo de respuetsa
    },
    // Documentación Swagger (es el archivo del Swagger, no una ruta de la API; no lo consume la app)
    DOCS: {
      SWAGGER_DOC: '/swagger/doc.json', // FUNCIONA, GET responde 200 con el JSON de Swagger (schemes, info, paths y definitions)
    },

  },
} as const

export default API_CONFIG

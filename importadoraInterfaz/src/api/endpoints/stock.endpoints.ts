// stock.endpoints · rutas del backend de bodegas, inventario y traslados
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS, que sigue siendo el único lugar que usan los services) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const STOCK_ENDPOINTS = {
  WAREHOUSES: {
    BASE: '/warehouses', // FUNCIONA, 200 "Warehouses successfully obtained"; devuelve warehouseId, name, address, las series (electronicBillingSerial, transferSerial, remissionSerial, saleSerial), isMain, isActive
    // API en Go: GET /warehouses/:id/locations (?activeOnly=true) lista los estantes con cuántos productos y unidades guarda cada uno; POST la crea ({ code, description }); PUT /:locId la cambia ({ code, description, isActive }; si cambia el código se mueve también su stock); DELETE solo si está vacía
    LOCATIONS: (warehouseId: number) => `/warehouses/${warehouseId}/locations`,
    LOCATION_BY_ID: (warehouseId: number, locationId: number) => `/warehouses/${warehouseId}/locations/${locationId}`,
    FACTURATION: (warehouseId: number) => `/warehouses/${warehouseId}/facturation`, // API en Go: GET los datos fiscales de la bodega; PUT los cambia (NIT, razón social, resolución, rango de facturación...)
    REGISTER: '/warehouses/register', // FUNCIONA con {companyId, name, address}, 201 "Warehouse registered successfully" pero la respuesta trae warehouseId = 0 (el id real hay que buscarlo en /warehouses) y las 4 series quedan en 0
    UPDATE: '/warehouses/update', // FUNCIONA, es PUT con {warehouseId, name, address}, 200 "Warehouse updated successfully"; INCONSISTENTE: la respuesta dice isActive:false pero en /warehouses la bodega sigue isActive:true
  },
  INVENTORY: {
    // API en Go: GET /stock con ?warehouseId&productId&location&q&page&pageSize (una fila por producto, bodega y ubicación: available, reserved, sellable)
    STOCK: '/stock',
    RELOCATE: '/stock/relocate',
    ASSIGN: '/stock/assign', // API en Go: POST { productId, warehouseId, location, quantity, reason }: pone un producto del catálogo en una ubicación activa de la bodega
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
  // API en Go (series de consecutivos): GET /doc-series (?warehouseId&docType) lista las series; PUT /:id cambia el prefijo y el próximo número
  DOC_SERIES: {
    LIST: '/doc-series',
    BY_ID: (seriesId: number) => `/doc-series/${seriesId}`,
  },
  TRANSFERS: {
    // API en Go: GET /transfers (?originWarehouseId&destinationWarehouseId&status&companyId&page&pageSize), POST /transfers { originWarehouseId, destinationWarehouseId, notes, items:[{ productId, originStockId, destinationLocation, quantity }] }
    // estados: pending (creado) -> in_transit (despachado) -> received | cancelled
    LIST: '/transfers',
    DETAIL: (transferId: number) => `/transfers/${transferId}`, // GET detalle con renglones // GET lista y POST crea
    DISPATCH: (transferId: number) => `/transfers/${transferId}/dispatch`, // POST: sale de la bodega origen
    RECEIVE: (transferId: number) => `/transfers/${transferId}/receive`, // POST { items:[{ itemId, receivedQty, destinationLocation }] }
    CANCEL: (transferId: number) => `/transfers/${transferId}/cancel`, // POST { reason }
  },
}

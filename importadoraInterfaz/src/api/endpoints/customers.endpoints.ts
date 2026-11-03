// customers.endpoints · rutas del backend de clientes, sus direcciones y sus descuentos
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS, que sigue siendo el único lugar que usan los services) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const CUSTOMERS_ENDPOINTS = {
  CUSTOMERS: {
    // API en Go: GET /customers (?companyId&status&q&page&pageSize), GET /customers/:id, GET /customers/search?q=, GET /customers/selector, POST /customers y PUT /customers/:id
    LIST: '/customers', // GET lista y POST crea
    BY_ID: (customerId: number) => `/customers/${customerId}`, // GET detalle y PUT cambia (también guarda su lista de direcciones)
    SEARCH: '/customers/search', // GET ?q=: busca por nombre, documento o correo
    SELECTOR: '/customers/selector', // GET ?q=: lista corta con nivel de precio, crédito habilitado y cupo disponible de cada cliente
    DOCUMENTS: (customerId: number) => `/customers/${customerId}/documents`, // GET lista los documentos del cliente con su vencimiento (subida + meses de vigencia) y estado: valid, expiring o expired
    DOCUMENT_RENEW: (customerId: number, documentId: number) => `/customers/${customerId}/documents/${documentId}/renew`, // POST multipart (file y notes opcionales): reinicia la vigencia del documento
    DOCUMENT_ALERTS: '/customers/documents/alerts', // GET documentos vencidos o que vencen en 30 días de los clientes activos de la compañía
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
}

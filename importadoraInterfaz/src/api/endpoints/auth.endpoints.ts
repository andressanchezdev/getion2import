// auth.endpoints · rutas del backend de sesión y utilidades del backend: ingreso, usuarios, salud, documentación y sincronización
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS, que sigue siendo el único lugar que usan los services) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const AUTH_ENDPOINTS = {
  // Autenticación
  AUTH: {
    LOGIN: '/auth/login', //funciona

    REFRESH: '/auth/refresh', //funciona
    LOGOUT: '/auth/logout',//funciona, debemos validar que el token se revoque completametne y que la logica detras lo deje invalido al aplicar el logout

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
}

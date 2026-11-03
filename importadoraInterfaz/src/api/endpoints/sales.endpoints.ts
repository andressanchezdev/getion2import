// sales.endpoints · rutas del backend de ventas: carrito, pedidos, cotizaciones, pagos y cartera
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS, que sigue siendo el único lugar que usan los services) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const SALES_ENDPOINTS = {
  // POS / Carrito de Ventas
  CARTS: {
    // API en Go: un carrito por empleado, creado solo en GET /carts/active; los renglones se piden con el id del carrito
    ACTIVE: '/carts/active', // GET: el carrito activo del empleado (lo crea si no existe) con sus renglones y totales
    BY_ID: (cartId: number) => `/carts/${cartId}`, // DELETE: vacía el carrito
    ITEMS: (cartId: number) => `/carts/${cartId}/items`, // POST { stockId, quantity, unitPrice? }: agrega un renglón
    ITEM: (cartId: number, itemId: number) => `/carts/${cartId}/items/${itemId}`, // PUT { quantity }: cambia la cantidad; DELETE: quita el renglón

    GET: '/carts', //se le envia POST CON BODY VACIO Y SE OBTIENE UNA RESPUESTA 200 PERO SIN DATA
    //VALIDAR QUE DATA SI ESTE ENVIANDOSE EN LA RESPUESTA DESDE EL BACKEND
    //COMO NO DEVUELVE DATA, NO E ACCEDIDO A LOS uuid de los demas carritos
    REGISTER_ITEM: '/carts/register', //DEVUELVE RESPUETSA 200 OK,"CREA" EL CARRITO, ENVIANDO
    UPDATE: '/carts/update', // cambia la cantidad de un ítem { cartId, quantity }
    DELETE: '/carts/delete', // borra un ítem y devuelve su stock { cartId }
    DELETE_ALL: '/carts/deleteall', //DELETE MASIVO envia user id e identificador unico de el carrito "uuid"
    REASSIGN_USER: '/carts/reassignuser', //responde correctametne, se envia  con {"newUserId","oldUserId", "uuid"
  },
  // Ventas y Pipeline de Surtido
  SALES: {
    // API en Go: GET /sales con ?warehouseId&stage&status&customerId&employeeId&paymentMethod&search&page&pageSize; POST /sales crea el pedido con sus items (stockId, quantity, unitPrice)
    LIST: '/sales', // GET lista y POST crea
    BY_ID: (saleId: number) => `/sales/${saleId}`, // GET: el pedido con sus renglones
    STAGE_HISTORY: (saleId: number) => `/sales/${saleId}/history`, // GET: las etapas por las que pasó (quién, cuándo entró, cuándo salió y minutos)
    ACTION: (saleId: number, action: 'verify' | 'pick' | 'pack' | 'invoice' | 'dispatch' | 'send' | 'cancel') => `/sales/${saleId}/${action}`, // POST: pasa de etapa o anula (cancel pide { reason })
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
  // Quotations (agregado desde el Swagger)
  QUOTATIONS: {
    // API en Go: GET /quotations (?customerId&employeeId&status&q&companyId&page&pageSize), GET /quotations/:id (con renglones), POST /quotations { customerId, items:[{ productId, quantity, unitPrice }] }, PUT /quotations/:id { status, notes }
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
  // API en Go (extractos bancarios): el PDF que entrega el banco se sube, se lee y cada movimiento queda como registro pendiente que cartera confirma (y liga a un pago) o ignora
  BANK_STATEMENTS: {
    UPLOAD_PDF: '/bank-statements/upload-pdf', // POST multipart (campo file): lee el PDF y guarda los movimientos nuevos; responde { totalProcessed, totalInserted, accountInfo, records }
    RECORDS: '/bank-statements/records', // GET ?status&description&channel&from&to&page&pageSize: movimientos leídos, paginados
    CONFIRM: (recordId: number) => `/bank-statements/records/${recordId}/confirm`, // PATCH { paymentId?, notes? }: confirma que entró (y verifica el pago ligado)
    IGNORE: (recordId: number) => `/bank-statements/records/${recordId}/ignore`, // PATCH { notes? }: lo marca como ignorado
  },
  // API en Go (caja): un turno por bodega; se abre con un fondo y se cierra contando el efectivo y declarando los gastos
  CASH_SESSIONS: {
    ACTIVE: '/cash/sessions/active', // GET ?warehouseId: el turno abierto con sus totales en vivo (data null si no hay)
    OPEN: '/cash/sessions/open', // POST { warehouseId, openingAmount }
    CLOSE: '/cash/sessions/close', // POST { warehouseId, countedCash, notes?, expenses:[{ receiptNumber, concept, cashAmount, transferAmount }] }
  },
  // API en Go (facturas): GET /invoices (?warehouseId&saleId&status&kind&page&pageSize) lista las emitidas; GET /invoices/:id trae una; se emiten desde SALES.ACTION con 'invoice'
  INVOICES: {
    LIST: '/invoices',
    BY_ID: (invoiceId: number) => `/invoices/${invoiceId}`,
  },
  RETURNS: {
    // API en Go: GET /returns (?warehouseId&page&pageSize) lista; POST /returns { saleId, reason, reasonType, resolutionType, items } crea la devolución en estado pending
    LIST: '/returns', // GET lista y POST crea
    APPROVE: (returnId: number) => `/returns/${returnId}/approve`, // POST: aprueba (repone stock o abona saldo a favor según la resolución)
    REJECT: (returnId: number) => `/returns/${returnId}/reject`, // POST: rechaza sin mover stock ni saldo
  },
  PAYMENTS: {
    // API en Go: POST /payments { saleId, method, amount, proofUrl?, reference? } crea el pago EN REVISIÓN; después se verifica o se anula
    BATCH: '/payments/batch', // POST { saleId, payments:[{ method: cash|transfer|credit, amount, reference?, proofUrl?, bank? }] }: el cobro mixto de un pedido en una sola operación
    VERIFY: (paymentId: number) => `/payments/${paymentId}/verify`, // POST: verifica el pago (suma a lo pagado de la venta)
    VOID: (paymentId: number) => `/payments/${paymentId}/void`, // POST { voidReason }: anula el pago
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
  // Cartera y Crédito
  WALLET: {
    BASE: '/wallet', // FUNCIONA, 200 "Users successfully obtained"; trae sumAmount, isCredit, ubicationInformation, paymentInformation, companyInformation y creditInformation
    SUMMARY: '/wallet/summary', // ERROR 500 "Wallet summary could not be retrieved: failed to retrieve wallet summary" tanto con {companyId, warehouseId:1} como solo con {companyId}; la app lo usa para los KPI de cartera, validar el controlador del backend
    INTERNAL: '/wallet/internal', // RESPONDE 200 "Wallet by ID obtained successfully" con {companyId, userId:315} pero data = [] (sin facturas para ese usuario, no se sabe si esta completo)
    HISTORY: '/wallet/history', // RESPONDE 200 "Bills successfully obtained" con {companyId, userId:315, page, pageSize} pero data = [] (vacio, no se sabe si esta completo)
  },
}

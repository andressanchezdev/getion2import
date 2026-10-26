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
  TIMEOUT: 15000, // 15 segundos
  // URL del websocket de tiempo real; vacía = tiempo real desactivado (no se conecta a ningún servidor por defecto)
  WS_URL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) || '',
  ENDPOINTS: {
    // Autenticación
    AUTH: {
      LOGIN: '/auth/login',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout',
    },
    // Productos, búsqueda e inventario de lectura
    PRODUCTS: {
      LIST: '/products',
      REGISTER: '/products/register',
      SEARCH: '/inventory/search',
      FILTER: '/inventory/filter',
      CONTROL: '/inventory/control',
      CREATE: '/inventory/createProduct',
    },
    // Búsqueda universal (varias entidades a la vez)
    SEARCH: {
      UNIVERSAL: '/search',
    },
    // POS / Carrito de Ventas
    CARTS: {
      GET: '/carts',
      REGISTER_ITEM: '/carts/register',
      UPDATE: '/carts/update', // cambia la cantidad de un ítem { cartId, quantity }
      DELETE: '/carts/delete', // borra un ítem y devuelve su stock { cartId }
      DELETE_ALL: '/carts/deleteall',
      REASSIGN_USER: '/carts/reassignuser',
    },
    // Catálogos grupo base de el endpoint
    CATALOGS: {
      CATEGORIES: '/categories',
      CATEGORIES_REGISTER: '/categories/register',
      CATEGORIES_UPDATE: '/categories/update',
      BRANDS: '/brands',
      BRANDS_REGISTER: '/brands/register',
      BRANDS_UPDATE: '/brands/update',
      MODELS: '/models',
      MODELS_REGISTER: '/models/register',
      MODELS_UPDATE: '/models/update',
      WAREHOUSES: '/warehouses',
      WAREHOUSES_REGISTER: '/warehouses/register',
      WAREHOUSES_UPDATE: '/warehouses/update',
    },
    // Terceros: usuarios (clientes y vendedores, proveedores, TODOS los Agentes activos son ), centralizada de la imfo de cada actor
    USERS: {
      LIST: '/users',
      BY_ID: (id: number | string) => `/users/${id}`,
      REGISTER: '/users/register',
      QUICK_REGISTER: '/users/quick-register',
      UPDATE: '/users/update',
      STATE: '/users/state',
      VALIDATE_DOCUMENT: '/users/validate-document',
      BALANCE: '/users/balance',
      CREDIT: '/users/credit',
      CREDIT_DAYS: '/users/credit/days',
      CREDIT_LIMIT: '/users/credit/limit',
    },
    CUSTOMERS: {
      REGISTER: '/customers/register',
      CHECK_EMAIL: '/customers/check-email',
      FAVORITES: '/customers/favorites',
      UPDATE_FAVORITE: '/customers/update-favorite',
      UPDATE_DETAILS: '/customers/update-details',
      UPDATE_COMPANIES: '/customers/update-companies',
      UPDATE_PHOTO: '/customers/update-photo',
      UPDATE_DOCUMENT: '/customers/update-document',
      DELETE_DOCUMENT: '/customers/delete-document',
    },
    DIRECTIONS: {
      LIST: '/directions',
      REGISTER: '/directions/register',
      UPDATE: '/directions/update',
      DELETE: '/directions/delete',
    },
    DISCOUNTS: {
      LIST: '/discounts',
      REGISTER: '/discounts/register',
      UPDATE: '/discounts/update',
      DELETE: '/discounts/delete',
      DELETE_ALL: '/discounts/deleteall',
      DISABLE_ALL: '/discounts/disabledall',
    },
    // Cartera y Crédito
    WALLET: {
      BASE: '/wallet',
      SUMMARY: '/wallet/summary',
      INTERNAL: '/wallet/internal',
      HISTORY: '/wallet/history',
    },
    PAYMENTS: {
      LIST: '/payments',
      REGISTER: '/payments/register',
      ADVANCE: '/payments/advance',
      EARLY: '/payments/early',
      BY_SALE: '/payments/by-sale',
      DETAIL: '/payments/detail',
      SUMMARY: '/payments/summary',
      CHANGE_STATUS: '/payments/changestatus',
      CANCELLED: '/payments/cancelled',
    },
    // Ventas y Pipeline de Surtido
    SALES: {
      REGISTER: '/sales/register',
      PENDINGS: '/sales/pendings',
      HISTORY: '/sales/history',
      DETAIL: '/sales/detail',
      SUMMARY: '/sales/summary',
      STATUS: '/sales/status',
      CANCEL: '/sales/cancel',
      APPROVED: '/sales/approved',
      TRASLADES: '/sales/traslades',
      TRASLADES_REJECT: '/sales/traslades/reject',
      REPORT_GENERAL: '/sales/report/general',
      REPORT_INTERNAL: '/sales/report/internal',
    },
    ORDERS: {
      LIST: '/orders',
    },
    // Gestión de pedidos por etapa (verificación, alistamiento, empaque, facturación, despacho)
    MANAGEMENT: {
      COUNTS: '/management', // POST: conteo de pedidos por etapa; "state" solo cambia el desglose por canal
      SALE_ORDERS: '/management/saleOrders', // POST: lista paginada por invoiceStatus, saleChannel y saleType
      SALE_DETAIL: '/management/saleId', // POST: detalle de un pedido con sus pagos
    },
    // Cotizaciones (solo consulta: la lista y los totales)
    QUOTATIONS: {
      LIST: '/quotations', // POST: lista paginada; sin sellerId ni userId trae las de toda la empresa
      STATS: '/quotations/stats', // GET: totales (la empresa sale del token)
    },
    // Proveedores (el listado y el resumen se piden; el detalle por supplierId)
    SUPPLIERS: {
      LIST: '/suppliers/list',
      DETAIL: '/suppliers/detail',
      SUMMARY: '/suppliers/summary', // GET
    },
    // Reportes
    REPORTS: {
      SALES: '/reports/sales',
      CUSTOMERS: '/reports/customers',
      FINANCIAL: '/reports/financial',
      INVENTORY: '/reports/inventory',
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

      ROLES: '/employees/roles', //no devuelve datos como role, devuelve, respuesta a "{
      //   "companyId": 1,
      //   "roleName": ""
      // }" no devuelve campo role, devuelve lista con ID, name, namebussines identification y photo
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

      CREDENTIALS: '/employees/access-credentials',
      BY_ROLE: '/employees/by-role',
      ROLE: '/employees/roles', //{
      // "companyId": 5
      // }

    },
    // Salud del backend (GET, sin sesión y muy liviano: unos 220 bytes)
    HEALTH: {
      CHECK: '/health',
      READINESS: '/readiness',
    },
    // Documentación Swagger (es el archivo del Swagger, no una ruta de la API; no lo consume la app)
    DOCS: {
      SWAGGER_DOC: '/swagger/doc.json',
    },
  },
} as const

export default API_CONFIG

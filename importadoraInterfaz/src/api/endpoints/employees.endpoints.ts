// employees.endpoints · rutas del backend de empleados, roles y permisos
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS, que sigue siendo el único lugar que usan los services) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const EMPLOYEES_ENDPOINTS = {
  // Empleados y Permisos
  EMPLOYEES: {
    // API en Go: GET /employees (?companyId&roleId&warehouseId&status&q&page&pageSize), GET /roles, GET /permissions (catálogo módulo + acción),
    // GET y PUT /employees/:id/permissions (PUT { permissionIds }) y PUT /employees/:id/credentials (PUT { password })
    PERMISSIONS_OF: (employeeId: number) => `/employees/${employeeId}/permissions`,
    CREDENTIALS_OF: (employeeId: number) => `/employees/${employeeId}/credentials`,
    ROLES_LIST: '/roles', // GET: los roles de la compañía; POST { code, name, description } crea
    ROLE_BY_ID: (roleId: number) => `/roles/${roleId}`, // PUT { name, description, isActive }
    PERMISSIONS_CATALOG: '/permissions', // GET: todos los permisos (id, módulo y acción)
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
}

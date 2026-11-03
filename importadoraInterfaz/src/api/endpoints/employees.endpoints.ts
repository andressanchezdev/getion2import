// employees.endpoints · rutas del backend de empleados, roles, permisos y credenciales
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const EMPLOYEES_ENDPOINTS = {
  EMPLOYEES: {
    BASE: '/employees',
    SALESPERSONS: '/employees/salespersons',
    BY_ID: (id: number | string) => `/employees/${id}`,
    PERMISSIONS_OF: (id: number | string) => `/employees/${id}/permissions`,
    CREDENTIALS_OF: (id: number | string) => `/employees/${id}/credentials`,
    UNLOCK: (id: number | string) => `/employees/${id}/unlock`,
    ROLES_LIST: '/roles',
    ROLE_BY_ID: (id: number | string) => `/roles/${id}`,
    PERMISSIONS_CATALOG: '/permissions',
  },
} as const

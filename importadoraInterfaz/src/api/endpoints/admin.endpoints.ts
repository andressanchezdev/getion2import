// admin.endpoints · rutas del backend de administración: compañías, gestión, auditoría, reportes y administradores de personal
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS, que sigue siendo el único lugar que usan los services) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const ADMIN_ENDPOINTS = {
  COMPANIES: {
    BY_ID: (companyId: number) => `/companies/${companyId}`, // API en Go: GET trae la compañía; PUT { name, email, phone, address, city, logoUrl, isActive } la actualiza
    LIST: '/companies', //GET COMPANIES
    CREATE: '/companies',
    UPDATE: '/companies/update', //PUT data to update have to send
    DELETE: '/cpompanies/delete',
    DELETE_DELETE: '/companies/delete', // SP A PROPOSITO: borra una empresa
    ID: '/companies/id',
  },
  SETTINGS: {
    SCREENSAVER: '/settings/screensaver', // API en Go: GET (público) trae { imageUrl, isActive }; POST o PUT { imageUrl, isActive } la guarda (permiso settings:edit)
  },
  MANAGEMENT: {
    GET_COMPANIES: '/management',
    CHANGEID: '/management/changeId',
    FINANCIAL: '/management/finaliceOrderVerification',
    MANAGEMENT: '/management/saleLocationsPicking',
    FINALIZE_ORDER_VERIFICATION: '/management/finalizeOrderVerification',
    VERIFY_TRANSACTION: '/management/verifyTransaction',
  },
  AUDIT: {
    LIST: '/audit-logs',
  },
  STAFF_ADMINS: {
    LIST: '/admins',
    BY_ID: (id: number | string) => `/admins/${id}`,
    CREATE: '/admins',
    UPDATE: (id: number | string) => `/admins/${id}`,
    DELETE: (id: number | string) => `/admins/${id}`,
  },
  REPORTS: {
    GENERAL: '/reports/general',
    SALES: '/reports/sales',
    CUSTOMERS: '/reports/customers',
    FINANCIAL: '/reports/financial',
    WALLET: '/reports/wallet',
    INVENTORY: '/reports/inventory',
  },
}

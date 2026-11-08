// admin.endpoints · rutas del backend de administración: compañías, pantallas de reposo, auditoría, reportes, papelera y administradores
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const ADMIN_ENDPOINTS = {
  COMPANIES: {
    LIST: '/companies',
    CREATE: '/companies',
    SEARCH: '/companies/search',
    BY_ID: (id: number | string) => `/companies/${id}`,
  },
  SETTINGS: {
    SCREENSAVER: '/settings/screensaver',
  },
  AUDIT: {
    LIST: '/audit-logs',
    CONTEXT_CHANGE: '/audit-logs/context-change',
  },
  STAFF_ADMINS: {
    LIST: '/admins',
    CREATE: '/admins',
    BY_ID: (id: number | string) => `/admins/${id}`,
    UPDATE: (id: number | string) => `/admins/${id}`,
  },
  REPORTS: {
    GENERAL: '/reports/general',
    SALES: '/reports/sales',
    WALLET: '/reports/wallet',
    INVENTORY: '/reports/inventory',
  },
  RECYCLE_BIN: {
    LIST: '/recycle-bin',
    RESTORE: (id: number | string) => `/recycle-bin/${id}/restore`,
  },
  BACKUPS: {
    LIST: '/backups',
    CREATE: '/backups',
    DOWNLOAD: (id: string) => `/backups/${id}/download`,
    RESTORE: (id: string) => `/backups/${id}/restore`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: number | string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },
} as const

// stock.endpoints · rutas del backend de bodegas, inventario, traslados y conteos físicos
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const STOCK_ENDPOINTS = {
  WAREHOUSES: {
    BASE: '/warehouses',
    SEARCH: '/warehouses/search',
    BY_ID: (id: number | string) => `/warehouses/${id}`,
    LOCATIONS: (id: number | string) => `/warehouses/${id}/locations`,
    LOCATION_BY_ID: (id: number | string, locId: number | string) => `/warehouses/${id}/locations/${locId}`,
    FACTURATION: (id: number | string) => `/warehouses/${id}/facturation`,
  },
  INVENTORY: {
    STOCK: '/stock',
    COMPANY_STOCK: '/stock/company',
    ADJUST: '/stock/adjust',
    RELOCATE: '/stock/relocate',
    ASSIGN: '/stock/assign',
    AUDIT_MOVEMENTS: '/audit-movements',
  },
  DOC_SERIES: {
    LIST: '/doc-series',
    BY_ID: (id: number | string) => `/doc-series/${id}`,
  },
  TRANSFERS: {
    LIST: '/transfers',
    DETAIL: (id: number | string) => `/transfers/${id}`,
    DISPATCH: (id: number | string) => `/transfers/${id}/dispatch`,
    RECEIVE: (id: number | string) => `/transfers/${id}/receive`,
    CANCEL: (id: number | string) => `/transfers/${id}/cancel`,
  },
  COUNTS: {
    LIST: '/counts',
    BY_ID: (id: number | string) => `/counts/${id}`,
    ITEMS: (id: number | string) => `/counts/${id}/items`,
    VERIFY: (id: number | string) => `/counts/${id}/verify`,
    CORROBORATE: (id: number | string) => `/counts/${id}/corroborate`,
  },
} as const

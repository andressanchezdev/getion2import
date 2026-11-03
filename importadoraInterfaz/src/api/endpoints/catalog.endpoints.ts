// catalog.endpoints · rutas del backend de productos, búsqueda y catálogos (marcas, categorías y modelos)
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const CATALOG_ENDPOINTS = {
  // Productos y búsqueda
  PRODUCTS: {
    LIST: '/products',
    SEARCH: '/products/search',
    BY_ID: (id: number | string) => `/products/${id}`,
    CODES: (id: number | string) => `/products/${id}/codes`,
    CODE_BY_ID: (id: number | string, codeId: number | string) => `/products/${id}/codes/${codeId}`,
    SUPPLIERS: (id: number | string) => `/products/${id}/suppliers`,
    SUPPLIER_BY_ID: (id: number | string, supplierId: number | string) => `/products/${id}/suppliers/${supplierId}`,
  },
  // Catálogos base
  CATALOGS: {
    BRANDS: '/brands',
    CATEGORIES: '/categories',
  },
  BRANDS: {
    LIST: '/brands',
    BY_ID: (id: number | string) => `/brands/${id}`,
  },
  CATEGORIES: {
    LIST: '/categories',
    BY_ID: (id: number | string) => `/categories/${id}`,
  },
  MODELS: {
    BASE: '/models',
    LIST: '/models',
    BY_ID: (id: number | string) => `/models/${id}`,
  },
} as const

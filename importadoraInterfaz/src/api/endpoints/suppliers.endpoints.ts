// suppliers.endpoints · rutas del backend de compras, proveedores y terceros externos
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const SUPPLIERS_ENDPOINTS = {
  // Proveedores, transportadoras y terceros (tabla externals)
  EXTERNALS: {
    LIST: '/externals',
    SEARCH: '/externals/search',
    BY_ID: (id: number | string) => `/externals/${id}`,
  },
  // Órdenes de compra e ingreso de mercancía
  PURCHASES: {
    LIST: '/purchases',
    BY_ID: (id: number | string) => `/purchases/${id}`,
    EXPORT_EXCEL: (id: number | string) => `/purchases/${id}/export/excel`,
    RECEIVE: (id: number | string) => `/purchases/${id}/receive`,
    VOID: (id: number | string) => `/purchases/${id}/void`,
    SUPPLIER_PRODUCTS: (supplierId: number | string) => `/purchases/suppliers/${supplierId}/products`,
    SUPPLIER_CATALOG_UPLOAD: (supplierId: number | string) => `/purchases/suppliers/${supplierId}/catalog/upload`,
  },
} as const

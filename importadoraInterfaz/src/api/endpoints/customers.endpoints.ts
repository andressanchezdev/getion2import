// customers.endpoints · rutas del backend de clientes y su documentación legal
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const CUSTOMERS_ENDPOINTS = {
  CUSTOMERS: {
    LIST: '/customers',
    SEARCH: '/customers/search',
    SELECTOR: '/customers/selector',
    DOCUMENT_ALERTS: '/customers/documents/alerts',
    BY_ID: (id: number | string) => `/customers/${id}`,
    CREDIT_STATUS: (id: number | string) => `/customers/${id}/credit-status`,
    DOCUMENTS: (id: number | string) => `/customers/${id}/documents`,
    DOCUMENT_RENEW: (id: number | string, docId: number | string) => `/customers/${id}/documents/${docId}/renew`,
    DOCUMENT_BY_ID: (id: number | string, docId: number | string) => `/customers/${id}/documents/${docId}`,
    DOCUMENT_FILE: (id: number | string, docId: number | string) => `/customers/${id}/documents/${docId}/file`, // el archivo, con sesión (ya no hay /uploads público)
  },
} as const

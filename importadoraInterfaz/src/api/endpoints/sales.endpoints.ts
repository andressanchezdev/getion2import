// sales.endpoints · rutas del backend de ventas: carrito, pedidos, facturas, cotizaciones, pagos, caja, banco y cartera
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const SALES_ENDPOINTS = {
  // POS / Carrito de Ventas
  CARTS: {
    ACTIVE: '/carts/active',
    BASE: '/carts',
    BY_ID: (id: number | string) => `/carts/${id}`,
    ITEMS: (id: number | string) => `/carts/${id}/items`,
    ITEM: (id: number | string, itemId: number | string) => `/carts/${id}/items/${itemId}`,
  },
  // Ventas y Pipeline de Surtido
  SALES: {
    LIST: '/sales',
    BY_ID: (id: number | string) => `/sales/${id}`,
    STAGE_HISTORY: (id: number | string) => `/sales/${id}/history`,
    ACTION: (id: number | string, action: 'verify' | 'verify-payment' | 'pick' | 'pack' | 'invoice' | 'dispatch' | 'send' | 'cancel') =>
      `/sales/${id}/${action}`,
  },
  // Cotizaciones
  QUOTATIONS: {
    LIST: '/quotations',
    BY_ID: (id: number | string) => `/quotations/${id}`,
  },
  // Extractos bancarios y conciliación
  BANK_STATEMENTS: {
    UPLOAD_PDF: '/bank-statements/upload-pdf',
    RECORDS: '/bank-statements/records',
    CONFIRM: (id: number | string) => `/bank-statements/records/${id}/confirm`,
    IGNORE: (id: number | string) => `/bank-statements/records/${id}/ignore`,
  },
  // Turnos de caja y arqueos
  CASH_SESSIONS: {
    ACTIVE: '/cash/sessions/active',
    OPEN: '/cash/sessions/open',
    CLOSE: '/cash/sessions/close',
  },
  // Facturación fiscal
  INVOICES: {
    LIST: '/invoices',
    BY_ID: (id: number | string) => `/invoices/${id}`,
  },
  // Devoluciones y garantías
  RETURNS: {
    LIST: '/returns',
    BY_ID: (id: number | string) => `/returns/${id}`,
    APPROVE: (id: number | string) => `/returns/${id}/approve`,
    REJECT: (id: number | string) => `/returns/${id}/reject`,
  },
  // Pagos y recaudos
  PAYMENTS: {
    LIST: '/payments',
    BATCH: '/payments/batch',
    BY_ID: (id: number | string) => `/payments/${id}`,
    VERIFY: (id: number | string) => `/payments/${id}/verify`,
    VOID: (id: number | string) => `/payments/${id}/void`,
  },
  // Cartera y crédito
  WALLET: {
    SUMMARY: (customerId: number | string) => `/wallet/summary/${customerId}`,
    ENTRIES: '/wallet/entries',
    ADJUST: '/wallet/adjust',
  },
} as const

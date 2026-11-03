// config · URL base, timeout y endpoints del backend
// conecta con: api/client, api/health; scripts/check-endpoints.mjs revisa que cada ruta exista en el Swagger (npm run check:api)
// ojo: las rutas viven en api/endpoints/* (una por gestión) y aquí se juntan en ENDPOINTS; ninguna se escribe suelta en un service. Todos los listados del backend son POST con { companyId, page, pageSize, ... } y responden { data, meta }
// src/api/config.ts
import { AUTH_ENDPOINTS } from './endpoints/auth.endpoints'
import { CATALOG_ENDPOINTS } from './endpoints/catalog.endpoints'
import { SALES_ENDPOINTS } from './endpoints/sales.endpoints'
import { CUSTOMERS_ENDPOINTS } from './endpoints/customers.endpoints'
import { STOCK_ENDPOINTS } from './endpoints/stock.endpoints'
import { EMPLOYEES_ENDPOINTS } from './endpoints/employees.endpoints'
import { ADMIN_ENDPOINTS } from './endpoints/admin.endpoints'
import { SUPPLIERS_ENDPOINTS } from './endpoints/suppliers.endpoints'

/**
 * Configuración maestra de la API (backend en Go; su URL sale de VITE_API_BASE_URL)
 */
export const API_CONFIG = {
  BASE_URL:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    'http://localhost:3001', // ojo: antes caía al backend viejo de Railway; ahora el valor por defecto es el API Go local y en producción se define VITE_API_BASE_URL
  STORAGE_BASE_URL:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORAGE_BASE_URL) ||
    'https://storage.googleapis.com/importadorapremiumonline/',
  TIMEOUT: 15000, // 15 segundos
  // URL del websocket de tiempo real; vacía = tiempo real desactivado (no se conecta a ningún servidor por defecto)
  WS_URL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) || '',
  ENDPOINTS: {
    ...AUTH_ENDPOINTS,
    ...CATALOG_ENDPOINTS,
    ...SALES_ENDPOINTS,
    ...CUSTOMERS_ENDPOINTS,
    ...STOCK_ENDPOINTS,
    ...EMPLOYEES_ENDPOINTS,
    ...ADMIN_ENDPOINTS,
    ...SUPPLIERS_ENDPOINTS,
  },
} as const

export default API_CONFIG

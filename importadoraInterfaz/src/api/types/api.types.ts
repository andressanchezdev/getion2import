// api.types · contratos de respuesta, paginación y error de la API
// conecta con: api/client, api/health
// src/api/types/api.types.ts

/**
 * Envoltorio estándar de respuesta del Backend (Swagger: response.APIResponse)
 */
export interface APIResponse<T = unknown> {
  success: boolean
  message: string
  data: T
  meta?: PaginatorMetadata
  error?: string
}

/**
 * Metadatos de paginación oficial del Backend (Swagger: response.PaginatorMetadata)
 */
export interface PaginatorMetadata {
  currentPage: number
  pageSize: number
  totalRecords: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Estado de carga de cualquier recurso pedido a la API (lo usan los slices de las features)
 */
export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

/**
 * Datos de paginación que viajan en el cuerpo de todo listado (POST con { companyId, page, pageSize, ...filtros })
 */
export interface PageRequest {
  page: number
  pageSize: number
}

/**
 * Una página de resultados ya lista para la UI: los registros y los metadatos de paginación
 */
export interface Paginated<T> {
  items: T[]
  meta: PaginatorMetadata
}

/**
 * Error estandarizado de la aplicación para captura en UI y servicios
 */
export interface AppApiError {
  status: number
  message: string
  userFriendlyMessage: string
  details?: unknown
  timestamp: string
}

/**
 * Resultado de diagnóstico de conexión y salud del backend
 */
export interface HealthCheckResult {
  isConnected: boolean
  latencyMs: number
  message: string
  timestamp: string
  statusCode?: number
  errorDetails?: string
}

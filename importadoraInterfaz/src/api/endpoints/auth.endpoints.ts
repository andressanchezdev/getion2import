// auth.endpoints · rutas del backend de sesión y utilidades: ingreso, refresh, logout, me, salud y documentación
// conecta con: api/config (las junta en API_CONFIG.ENDPOINTS) y scripts/check-endpoints.mjs (revisa estas rutas contra el Swagger)
// ojo: aquí viven las rutas; ninguna se escribe suelta en un service
export const AUTH_ENDPOINTS = {
  // Autenticación y sesión activa
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  // Salud del backend (GET, sin sesión)
  HEALTH: {
    CHECK: '/health',
    READINESS: '/readiness',
  },
  // Documentación Swagger
  DOCS: {
    SWAGGER_DOC: '/swagger/doc.json',
  },
} as const

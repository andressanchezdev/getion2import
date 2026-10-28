// auth.session.constants · tiempos y eventos que usa el control de sesión (inactividad y renovación)
// conecta con: useSessionActivity; los textos de las alertas están en auth.constants (LOGIN_MESSAGES)
// ojo: los tiempos de abajo son los únicos que se cambian si el cliente pide otro límite
export const SESSION_TIMING = {
  INACTIVITY_LIMIT_MS: 60 * 60 * 1000, // sin actividad durante 1 hora → se cierra la sesión
  WARNING_BEFORE_MS: 2 * 60 * 1000, // aviso 2 minutos antes de cerrar
  REFRESH_MARGIN_MS: 60 * 1000, // se renueva el token cuando falta 1 minuto o menos para que venza
  REFRESH_RETRY_MS: 30 * 1000, // si la renovación falla por red, espera 30 segundos para reintentar
  ACTIVITY_THROTTLE_MS: 1000, // la actividad se registra como máximo 1 vez por segundo
  TICK_MS: 5000, // cada cuánto se revisa el estado de la sesión
} as const


//ajustarlas medidas de carga aumentar el valor para mejor control de el tocken


// qué cuenta como "actividad del usuario"
export const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const

// id fijo del aviso de cierre, para que nunca salga duplicado y se pueda quitar al volver la actividad
export const SESSION_WARNING_TOAST_ID = 'session-warning'

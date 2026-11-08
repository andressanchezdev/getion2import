// reasonRequests · libreta de peticiones de motivo pendientes: quién espera la respuesta del panel derecho
// conecta con: useReasonPrompt (crea la petición) y ReasonFormPanel (la resuelve); vive fuera de redux porque guarda funciones, que no son serializables
// ojo: cada petición se resuelve una sola vez; resolver otra vez (o una que ya no existe) no hace nada
const pending = new Map<string, (reason: string | null) => void>()
let counter = 0

// registra una petición nueva y devuelve su id
export const createReasonRequest = (resolve: (reason: string | null) => void): string => {
  counter += 1
  const id = `reason-${counter}`
  pending.set(id, resolve)
  return id
}

// entrega la respuesta (texto, o null si se canceló) a quien la esperaba
export const settleReasonRequest = (id: string, reason: string | null): void => {
  const resolve = pending.get(id)
  if (!resolve) return
  pending.delete(id)
  resolve(reason)
}

export const hasPendingReasonRequest = (id: string): boolean => pending.has(id)

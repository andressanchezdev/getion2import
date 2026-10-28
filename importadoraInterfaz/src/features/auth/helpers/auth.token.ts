// auth.token · lee la fecha de vencimiento (exp) de un JWT y dice cuánto falta o si ya toca renovarlo
// conecta con: useSessionActivity (decide cuándo renovar); no valida la firma, solo lee el tiempo del propio token
// ojo: el backend no documenta cuánto dura el token, por eso nada está fijo: se lee del campo exp. Si el token no trae exp o no se puede leer, todo devuelve null/false

// devuelve el contenido (payload) del token como objeto, o null si el token no tiene el formato esperado
const readPayload = (token: string): Record<string, unknown> | null => {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    // base64url → base64 (cambia - y _ y completa con =)
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

// momento (en milisegundos) en que vence el token, o null si no se puede saber
export const getTokenExpiry = (token: string): number | null => {
  const exp = readPayload(token)?.exp
  return typeof exp === 'number' ? exp * 1000 : null
}

// milisegundos que le quedan al token (negativo si ya venció); null si no se puede saber
export const msUntilExpiry = (token: string, now: number = Date.now()): number | null => {
  const expiry = getTokenExpiry(token)
  return expiry === null ? null : expiry - now
}

// true cuando falta marginMs o menos para que venza (o ya venció); con un token ilegible es false
export const shouldRefreshToken = (token: string, marginMs: number, now: number = Date.now()): boolean => {
  const left = msUntilExpiry(token, now)
  return left !== null && left <= marginMs
}

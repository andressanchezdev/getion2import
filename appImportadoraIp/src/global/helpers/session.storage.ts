// session.storage · guarda, lee y borra la sesión (tokens y usuario) en el navegador
// conecta con: features/auth (helpers/auth.session); api/client lee el mismo 'access_token' para el header Authorization
// ojo: "recordarme" marcado guarda en localStorage (dura) y desmarcado en sessionStorage (se borra al cerrar la pestaña)
const KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  user: 'ip_session_user',
} as const

export interface StoredSession {
  accessToken: string
  refreshToken: string | null
  user: unknown
}

// el almacenamiento puede fallar (modo privado, datos bloqueados): todo va en try/catch
const safe = <T>(action: () => T, fallback: T): T => {
  try {
    return action()
  } catch {
    return fallback
  }
}

// guarda la sesión en un solo almacén (según remember) y limpia el otro
export const saveSession = (session: StoredSession, remember: boolean): void => {
  clearSession()
  const store = remember ? localStorage : sessionStorage
  safe(() => {
    store.setItem(KEYS.accessToken, session.accessToken)
    if (session.refreshToken) store.setItem(KEYS.refreshToken, session.refreshToken)
    store.setItem(KEYS.user, JSON.stringify(session.user))
  }, undefined)
}

// cambia solo los tokens de la sesión, en el MISMO almacén donde ya está (así "recordarme" se respeta y la sesión nunca cambia de lugar)
// ojo: si el servidor rota el refresh token hay que guardar el nuevo; si no viene, se deja el que había
export const updateTokens = (accessToken: string, refreshToken: string | null): void => {
  safe(() => {
    const store = [localStorage, sessionStorage].find((s) => s.getItem(KEYS.accessToken))
    if (!store) return
    store.setItem(KEYS.accessToken, accessToken)
    if (refreshToken) store.setItem(KEYS.refreshToken, refreshToken)
  }, undefined)
}

// lee la sesión guardada (primero localStorage, luego sessionStorage); null si no hay o está dañada
export const readSession = (): StoredSession | null => {
  return safe(() => {
    for (const store of [localStorage, sessionStorage]) {
      const accessToken = store.getItem(KEYS.accessToken)
      const rawUser = store.getItem(KEYS.user)
      if (accessToken && rawUser) {
        return { accessToken, refreshToken: store.getItem(KEYS.refreshToken), user: JSON.parse(rawUser) as unknown }
      }
    }
    return null
  }, null)
}

// borra la sesión de ambos almacenes
export const clearSession = (): void => {
  safe(() => {
    for (const store of [localStorage, sessionStorage]) {
      Object.values(KEYS).forEach((key) => store.removeItem(key))
    }
  }, undefined)
}

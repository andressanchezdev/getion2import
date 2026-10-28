// auth.thunks · acciones asíncronas de la sesión: iniciar, renovar y cerrar sesión
// conecta con: auth.service (login, refresh, logout), auth.session (guardar/borrar) y auth.slice (reacciona a los resultados); useSessionActivity y SideMenuUser los despachan
import { createAsyncThunk } from '@reduxjs/toolkit'
import { toast } from '@/global/helpers/toast'
import { loginRequest, logoutRequest, refreshRequest } from '../services/auth.service'
import { getLoginErrorMessage } from '../helpers/auth.helpers'
import {
  clearAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  persistAuthSession,
  persistRefreshedTokens,
} from '../helpers/auth.session'
import { setActiveWarehouse } from '@/features/navigation'
import { LOGIN_MESSAGES } from '../constants/auth.constants'
import type { AuthUser, LoginCredentials, LogoutReason } from '../types/auth.types'

// inicia sesión: pide el login, guarda la sesión y devuelve el usuario; si falla devuelve el mensaje
export const loginThunk = createAsyncThunk<AuthUser, LoginCredentials, { rejectValue: string }>(
  'auth/login',
  async (credentials, { rejectWithValue, dispatch }) => {
    try {
      const response = await loginRequest(credentials)
      persistAuthSession(response, credentials.remember)
      if (response.user?.warehouseId) {
        dispatch(setActiveWarehouse({ id: String(response.user.warehouseId), name: 'Sede Asignada' }))
      }
      return response.user
    } catch (error) {
      return rejectWithValue(getLoginErrorMessage(error))
    }
  }
)

// alerta que se muestra según por qué se cerró la sesión (una sola vez, aquí)
const showLogoutToast = (reason: LogoutReason): void => {
  if (reason === 'inactivity') toast.warning(LOGIN_MESSAGES.inactiveTitle, { description: LOGIN_MESSAGES.inactiveDescription })
  else if (reason === 'expired') toast.error(LOGIN_MESSAGES.expiredTitle, { description: LOGIN_MESSAGES.expiredDescription })
  else if (reason === 'remote') toast.info(LOGIN_MESSAGES.remoteLogoutTitle)
  else toast.success(LOGIN_MESSAGES.logoutTitle)
}

// cierra sesión: primero avisa al servidor para revocar los tokens y SIEMPRE después borra lo local (el slice vuelve a "anonymous")
// ojo: el orden importa: con la sesión ya borrada la petición saldría sin token y el servidor no revocaría nada
// ojo: si el servidor falla (sin red, 500) igual se cierra la sesión local; si el token ya venció ('expired') o la sesión se cerró en otra pestaña ('remote') no se llama al servidor
export const logoutThunk = createAsyncThunk<void, LogoutReason | void>('auth/logout', async (reason) => {
  const why: LogoutReason = typeof reason === 'string' ? reason : 'manual'
  if (why !== 'expired' && why !== 'remote' && getStoredAccessToken()) {
    try {
      await logoutRequest()
    } catch {
      // sin respuesta del servidor: se continúa con el cierre local
    }
  }
  clearAuthSession()
  showLogoutToast(why)
})

// renueva los tokens en silencio con el refresh token guardado; devuelve true si se renovó
// ojo: si el servidor dice que el refresh token no sirve (400/401/403) se cierra la sesión; si fue un fallo de red NO, para reintentar después
export const refreshSessionThunk = createAsyncThunk<boolean, void>('auth/refresh', async (_, { dispatch }) => {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) {
    await dispatch(logoutThunk('expired'))
    return false
  }
  try {
    persistRefreshedTokens(await refreshRequest(refreshToken))
    return true
  } catch (error) {
    const status = (error as { status?: number } | null)?.status
    if (status === 400 || status === 401 || status === 403) await dispatch(logoutThunk('expired'))
    return false
  }
})

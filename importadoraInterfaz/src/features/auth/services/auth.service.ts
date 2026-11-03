// auth.service · llamadas al backend de la sesión: iniciar (POST /auth/login), renovar (POST /auth/refresh), perfil (GET /auth/me) y cerrar (POST /auth/logout)
// conecta con: api/client (axios con interceptores) y api/config (endpoint), auth.adapter (convierte la respuesta); la usa auth.thunks
// ojo: la API en Go responde con "actor" y "permissions"; aquí se convierte una sola vez a { access_token, refresh_token, user }
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import { toAuthResponse, toAuthUser } from '../helpers/auth.adapter'
import type { AuthApiResponse, AuthMeApiResponse } from '../types/auth.api.types'
import type { AuthResponse, AuthUser, LoginCredentials } from '../types/auth.types'

export const loginRequest = async ({ email, password }: LoginCredentials): Promise<AuthResponse> => {
  const { data } = await apiClient.post<APIResponse<AuthApiResponse>>(API_CONFIG.ENDPOINTS.AUTH.LOGIN, { email, password })
  return toAuthResponse(data.data)
}

// renueva los tokens: POST /auth/refresh con { refresh_token }; devuelve el par nuevo (y el usuario)
export const refreshRequest = async (refreshToken: string): Promise<AuthResponse> => {
  const { data } = await apiClient.post<APIResponse<AuthApiResponse>>(API_CONFIG.ENDPOINTS.AUTH.REFRESH, {
    refresh_token: refreshToken,
  })
  return toAuthResponse(data.data)
}

// consulta el perfil y permisos actualizados del actor en sesión (GET /auth/me)
export const getMeRequest = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get<APIResponse<AuthMeApiResponse>>(API_CONFIG.ENDPOINTS.AUTH.ME)
  return toAuthUser(data.data)
}

// cierra la sesión en el servidor: POST /auth/logout (sin cuerpo) y revoca los refresh tokens del usuario
// ojo: necesita el access token puesto (lo agrega el interceptor), por eso se llama ANTES de borrar la sesión local
export const logoutRequest = async (): Promise<void> => {
  await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT)
}

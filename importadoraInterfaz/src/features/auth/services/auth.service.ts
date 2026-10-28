// auth.service · llamadas al backend de la sesión: iniciar (POST /auth/login), renovar (POST /auth/refresh) y cerrar (POST /auth/logout)
// conecta con: api/client (axios con interceptores) y api/config (endpoint); la usa auth.thunks
// ojo: igual que importadora-online (mismo endpoint y mismo cuerpo { email, password })
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { AuthResponse, LoginCredentials } from '../types/auth.types'

export const loginRequest = async ({ email, password }: LoginCredentials): Promise<AuthResponse> => {
  const { data } = await apiClient.post<APIResponse<AuthResponse>>(API_CONFIG.ENDPOINTS.AUTH.LOGIN, { email, password })
  return data.data
}

// renueva los tokens: POST /auth/refresh con { refresh_token }; devuelve el par nuevo (y el usuario)
export const refreshRequest = async (refreshToken: string): Promise<AuthResponse> => {
  const { data } = await apiClient.post<APIResponse<AuthResponse>>(API_CONFIG.ENDPOINTS.AUTH.REFRESH, {
    refresh_token: refreshToken,
  })
  return data.data
}

// cierra la sesión en el servidor: POST /auth/logout (sin cuerpo, responde 204) y revoca TODOS los refresh tokens del usuario
// ojo: necesita el access token puesto (lo agrega el interceptor), por eso se llama ANTES de borrar la sesión local
export const logoutRequest = async (): Promise<void> => {
  await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT)
}

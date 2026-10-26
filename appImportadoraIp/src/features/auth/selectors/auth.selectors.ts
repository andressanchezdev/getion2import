// auth.selectors · lecturas simples del estado de la sesión y el contexto de petición
// conecta con: AuthGate (¿hay sesión?), SideMenuUser (usuario), LoginForm (¿está ingresando?) y los thunks de las demás features (selectRequestContext)
import { createSelector } from '@reduxjs/toolkit'
import type { AuthState, RequestContext } from '../types/auth.types'

// forma mínima del state (así la feature no importa el store de app)
type AuthRootState = { auth: AuthState }

export const selectIsAuthenticated = (state: AuthRootState) => state.auth.status === 'authenticated'
export const selectIsAuthenticating = (state: AuthRootState) => state.auth.status === 'authenticating'
export const selectCurrentUser = (state: AuthRootState) => state.auth.user

// contexto de petición: lo que los thunks de las demás features leen con getState y le pasan al service (companyId, userId, bodega y nivel de precio)
// ojo: así los services no leen localStorage ni el store (en importadora-online cada service leía el companyId del localStorage); sin sesión devuelve null
export const selectRequestContext = createSelector(
  [selectCurrentUser],
  (user): RequestContext | null =>
    user ? { companyId: user.companyId, userId: user.userId, warehouseId: user.warehouseId, priceType: user.priceType } : null
)
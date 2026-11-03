// auth.selectors · lecturas simples del estado de la sesión y el contexto de petición
// conecta con: AuthGate (¿hay sesión?), SideMenuUser (usuario), LoginForm (¿está ingresando?) y los thunks de las demás features (selectRequestContext)
import { createSelector } from '@reduxjs/toolkit'
import type { AuthState, RequestContext } from '../types/auth.types'

// forma mínima del state (así la feature no importa el store de app)
type AuthRootState = { auth: AuthState; ui?: { activeCompanyId?: number } }

export const selectIsAuthenticated = (state: AuthRootState) => state.auth.status === 'authenticated'
// dice si se está iniciando sesión en este momento
export const selectIsAuthenticating = (state: AuthRootState) => state.auth.status === 'authenticating'
// lee al usuario con sesión iniciada (null si no hay)
export const selectCurrentUser = (state: AuthRootState) => state.auth.user

// contexto de petición: lo que los thunks de las demás features leen con getState y le pasan al service (companyId, userId, bodega y nivel de precio)
// ojo: así los services no leen localStorage ni el store (en importadora-online cada service leía el companyId del localStorage); sin sesión devuelve null
// ojo: el superadmin no tiene compañía propia; la que eligió en el header (0 = todas) viaja como su companyId
const selectActiveCompanyId = (state: AuthRootState) => state.ui?.activeCompanyId ?? 0

export const selectRequestContext = createSelector(
  [selectCurrentUser, selectActiveCompanyId],
  (user, activeCompanyId): RequestContext | null =>
    user
      ? {
          companyId: user.userType === 'superadmin' ? activeCompanyId : user.companyId,
          userId: user.userId,
          warehouseId: user.warehouseId,
          priceType: user.priceType,
        }
      : null
)
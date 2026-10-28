// auth/index · API pública de la feature auth (autenticación y sesión de usuario)
// conecta con: AuthGate (pantalla y selector), SideMenuUser (usuario y logout), rootReducer (reducer), store (logout por 401), ErpLayout (useSessionActivity)
export * from './types/auth.types'
export * from './types/auth.login.types'
export * from './constants/auth.constants'
export * from './constants/auth.session.constants'
export * from './helpers/auth.helpers'
export * from './helpers/auth.token'
export * from './hooks/useSessionActivity'
export * from './selectors/auth.selectors'
export * from './slices/auth.slice'
export * from './thunks/auth.thunks'
export * from './screens/LoginScreen'

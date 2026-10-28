// AuthGate · puerta de entrada: sin sesión muestra el login, con sesión muestra el ERP
// conecta con: features/auth (selector y pantalla de login) y ErpLayout
import { useAppSelector } from '@/global/hooks/useRedux'
import { LoginScreen, selectIsAuthenticated } from '@/features/auth'
import { ErpLayout } from './ErpLayout'

export function AuthGate() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  return isAuthenticated ? <ErpLayout /> : <LoginScreen />
}

export default AuthGate

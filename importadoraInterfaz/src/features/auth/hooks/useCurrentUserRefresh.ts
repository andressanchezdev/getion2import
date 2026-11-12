// useCurrentUserRefresh · al entrar al ERP vuelve a pedir el perfil y los permisos (GET /auth/me) una vez por montaje
// conecta con: ErpLayout (lo monta), fetchCurrentUserThunk y auth.slice (reemplaza user y la matriz de permisos)
// ojo: la sesión rehidratada por redux-persist puede traer permisos viejos o ninguno; con la falla cerrada de usePermissions
// un empleado no vería nada hasta este refresco. Si falla, se queda con lo guardado (la API igual exige el permiso en cada ruta)
import { useEffect } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { fetchCurrentUserThunk } from '../thunks/auth.thunks'

export const useCurrentUserRefresh = (): void => {
  const dispatch = useAppDispatch()
  useEffect(() => {
    void dispatch(fetchCurrentUserThunk())
  }, [dispatch])
}

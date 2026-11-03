// useRouteSync · mantiene la ruta del navegador igual a la pantalla activa (módulo y subgestión), en los dos sentidos
// conecta con: ErpLayout (lo monta), navigation.slice (módulo y subgestión activos) y navigation.helpers (toRoutePath, parseRoutePath)
// ojo: no cambia cómo se decide la pantalla (screenRegistry sigue mandando); solo escribe y lee la URL con el history del navegador
// ojo: al entrar con una ruta válida (recargar o enlace directo) esa ruta manda sobre la pantalla guardada; atrás y adelante también cambian de pantalla
import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { parseRoutePath, toRoutePath } from '../helpers/navigation.helpers'
import { setActiveModule, setActiveSubitem } from '../slices/navigation.slice'

export const useRouteSync = (): void => {
  const dispatch = useAppDispatch()
  const { activeModule, activeSubitem } = useAppSelector((state) => state.ui)
  // la ruta con la que se entró: hasta que el store la alcance no se escribe la URL (si no, se pisaría con la pantalla guardada)
  const entry = useRef(parseRoutePath(window.location.pathname))

  const openRoute = (pathname: string) => {
    const target = parseRoutePath(pathname)
    if (!target) return
    dispatch(setActiveModule(target.module))
    dispatch(setActiveSubitem(target.subitem))
  }

  useEffect(() => {
    if (entry.current) openRoute(window.location.pathname)
    const onPopState = () => openRoute(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (entry.current) {
      if (entry.current.module !== activeModule || entry.current.subitem !== activeSubitem) return
      entry.current = null
    }
    const path = toRoutePath(activeModule, activeSubitem)
    if (window.location.pathname !== path) window.history.pushState(null, '', path)
  }, [activeModule, activeSubitem])
}

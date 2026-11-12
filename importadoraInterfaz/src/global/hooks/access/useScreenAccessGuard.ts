// useScreenAccessGuard · si la pantalla activa no está permitida (la dejó guardada redux-persist o llegó por URL), lleva a la primera permitida
// conecta con: ErpLayout (lo monta), usePermissions (useFilteredMenuItems) y navigation.slice (setActiveModule / setActiveSubitem)
// ojo: MainContent sigue mostrando «sin acceso» como respaldo; este hook evita que el usuario aterrice en una pantalla bloqueada (8.2-5)
// ojo: no hace nada mientras la matriz del empleado no haya cargado (menú vacío), para no saltar de pantalla antes de tiempo
import { useEffect } from 'react'
import { setActiveModule, setActiveSubitem } from '@/features/navigation'
import { useAppDispatch, useAppSelector } from '../store/useRedux'
import { useFilteredMenuItems } from './usePermissions'

export const useScreenAccessGuard = (): void => {
  const dispatch = useAppDispatch()
  const { activeModule, activeSubitem } = useAppSelector((state) => state.ui)
  const menu = useFilteredMenuItems()

  useEffect(() => {
    if (menu.length === 0) return
    const current = menu.find((item) => item.id === activeModule)
    const allowed = current && (current.subitems.length === 0 || current.subitems.some((sub) => sub.id === activeSubitem))
    if (allowed) return
    const first = menu[0]
    dispatch(setActiveModule(first.id))
    if (first.subitems.length > 0) dispatch(setActiveSubitem(first.subitems[0].id))
  }, [menu, activeModule, activeSubitem, dispatch])
}

// useEmployeesDirectory · pide los empleados de la compañía (opcionalmente de una sola bodega) al backend y devuelve la lista y si está cargando
// conecta con: EmployeesScreen y EmployeePicker (lo usan), employees.thunks (loadEmployeesThunk), employees.selectors y auth (hay sesión)
// ojo: vuelve a pedir cuando el estado se reinició (idle, por ejemplo al saltar de compañía) o cuando cambia la bodega; no reintenta solo si falla
import { useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectEmployeesDirectory } from '../selectors/employees.selectors'
import { loadEmployeesThunk } from '../thunks/employees.thunks'

export const useEmployeesDirectory = (warehouseId?: number) => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const { items, status, warehouseId: loadedFor } = useAppSelector(selectEmployeesDirectory)
  const needsLoad = status === 'idle' || (status !== 'loading' && loadedFor !== warehouseId)

  useEffect(() => {
    if (hasSession && needsLoad) dispatch(loadEmployeesThunk(warehouseId))
  }, [dispatch, hasSession, needsLoad, warehouseId])

  return { employees: items, loading: status === 'idle' || status === 'loading' }
}

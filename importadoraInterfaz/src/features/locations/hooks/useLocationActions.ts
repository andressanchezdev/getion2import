// useLocationActions · crear, editar, activar o desactivar y borrar ubicaciones con su aviso de éxito o error
// conecta con: LocationFormPanel y LocationsTable (lo usan), locations.thunks (las acciones) y toast
// ojo: cada acción devuelve true si salió bien (para que el panel se cierre) y false si falló (el error ya se avisó)
import { useCallback } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import { createLocationThunk, deleteLocationThunk, toggleLocationThunk, updateLocationThunk } from '../thunks/locations.thunks'
import type { LocationInput } from '../types/locations.types'

export const useLocationActions = (warehouseId: number) => {
  const dispatch = useAppDispatch()

  // corre una acción, avisa el resultado y devuelve si salió bien
  const run = useCallback(async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    try {
      await action()
      toast.success(success)
      return true
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'No se pudo completar la acción.')
      return false
    }
  }, [])

  const create = useCallback((input: LocationInput) => run(() => dispatch(createLocationThunk({ warehouseId, input })).unwrap(), 'Ubicación creada'), [dispatch, run, warehouseId])
  const update = useCallback((locationId: number, input: LocationInput) => run(() => dispatch(updateLocationThunk({ warehouseId, locationId, input })).unwrap(), 'Ubicación guardada'), [dispatch, run, warehouseId])
  const toggle = useCallback(
    (locationId: number, isActive: boolean) => run(() => dispatch(toggleLocationThunk({ warehouseId, locationId, isActive })).unwrap(), isActive ? 'Ubicación activada' : 'Ubicación desactivada'),
    [dispatch, run, warehouseId]
  )
  const remove = useCallback((locationId: number) => run(() => dispatch(deleteLocationThunk({ warehouseId, locationId })).unwrap(), 'Ubicación eliminada'), [dispatch, run, warehouseId])

  return { create, update, toggle, remove }
}

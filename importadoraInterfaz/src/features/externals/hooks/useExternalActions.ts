// useExternalActions · cambiar el estado y borrar un proveedor o transportadora con su aviso de éxito o error
// conecta con: ExternalsTable (lo usa), externals.thunks, externals.constants (textos) y toast
// ojo: cada acción devuelve true si salió bien y false si falló (el error ya se avisó)
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import { labelsOf } from '../constants/externals.constants'
import { selectExternalsSaving } from '../selectors/externals.selectors'
import { deleteExternalThunk, setExternalActiveThunk } from '../thunks/externals.thunks'
import type { ExternalEntity } from '../types/externals.types'

export const useExternalActions = () => {
  const dispatch = useAppDispatch()
  const saving = useAppSelector(selectExternalsSaving)

  // corre una acción, avisa el resultado y devuelve si salió bien
  const run = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    try {
      await action()
      toast.success(success)
      return true
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'No se pudo completar la acción.')
      return false
    }
  }

  const setActive = (item: ExternalEntity, isActive: boolean) =>
    run(() => dispatch(setExternalActiveThunk({ id: item.id, kind: item.kind, isActive })).unwrap(), `${labelsOf(item.kind).singular} ${isActive ? 'activado' : 'desactivado'}`)
  const remove = (item: ExternalEntity, reason: string) => run(() => dispatch(deleteExternalThunk({ id: item.id, kind: item.kind, reason })).unwrap(), `${labelsOf(item.kind).singular} eliminado`)

  return { saving, setActive, remove }
}

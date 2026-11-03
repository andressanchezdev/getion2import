// useLocationContent · pide los productos guardados en una ubicación y deja recargarlos
// conecta con: LocationDetailPanel (lo usa), locations.thunks y locations.selectors
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectLocationContent } from '../selectors/locations.selectors'
import { loadLocationContentThunk } from '../thunks/locations.thunks'

export const useLocationContent = (warehouseId: number, code: string) => {
  const dispatch = useAppDispatch()
  const content = useAppSelector(selectLocationContent)

  const reload = useCallback(() => {
    dispatch(loadLocationContentThunk({ warehouseId, code }))
  }, [dispatch, warehouseId, code])

  useEffect(reload, [reload])

  // ojo: mientras llega el contenido de otra ubicación no se muestra el de la anterior
  const isCurrent = content.key === `${warehouseId}|${code}`
  return { items: isCurrent ? content.items : [], status: isCurrent ? content.status : ('loading' as const), error: isCurrent ? content.error : null, reload }
}

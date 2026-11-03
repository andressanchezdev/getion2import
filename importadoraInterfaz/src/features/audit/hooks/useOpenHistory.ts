// useOpenHistory · devuelve la función que abre la auditoría ya filtrada por la gestión y el registro que se está mirando
// conecta con: los botones «Ver historial» de otras pantallas (traslados, clientes); navigation.openHistory cambia de pantalla y AuditScreen aplica el filtro
import { useCallback } from 'react'
import { openHistory } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'

export const useOpenHistory = () => {
  const dispatch = useAppDispatch()
  return useCallback((entity: string, entityId?: number) => dispatch(openHistory({ entity, entityId })), [dispatch])
}

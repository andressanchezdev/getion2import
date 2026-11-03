// useAuditLog · pide la página de auditoría al backend cuando cambia la compañía, la página o los filtros y devuelve la lista y su estado
// conecta con: AuditScreen (el único que lo usa), audit.thunks y audit.slice (filtros y página), audit.selectors y auth (selectRequestContext: compañía activa del superadmin o la del admin)
// ojo: el estado vive en el slice (el hook ya no llama al servicio); una respuesta de una petición anterior la descarta el slice
import { useCallback, useEffect } from 'react'
import { selectRequestContext } from '@/features/auth'
import { clearHistoryTarget } from '@/features/navigation'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectAudit, selectAuditEntries } from '../selectors/audit.selectors'
import { setAuditFilters, setAuditPage } from '../slices/audit.slice'
import { loadAuditThunk } from '../thunks/audit.thunks'
import { EMPTY_AUDIT_FILTERS } from '../constants/audit.constants'
import type { AuditFilters } from '../types/audit.types'

export const useAuditLog = () => {
  const dispatch = useAppDispatch()
  const ctx = useAppSelector(selectRequestContext)
  const historyTarget = useAppSelector((state) => state.ui.historyTarget)
  const { filters, list } = useAppSelector(selectAudit)
  const entries = useAppSelector(selectAuditEntries)
  const page = useAppSelector((state) => state.audit.page)
  const companyId = ctx?.companyId
  const userId = ctx?.userId

  // si se llegó con «Ver historial» el filtro apunta a ese registro; el pedido ya se aplicó y se borra para que el próximo ingreso a la pantalla no lo repita
  useEffect(() => {
    if (!historyTarget) return
    dispatch(
      setAuditFilters({
        ...EMPTY_AUDIT_FILTERS,
        entity: historyTarget.entity,
        ...(historyTarget.entityId !== undefined ? { entityId: historyTarget.entityId } : {}),
      })
    )
    dispatch(clearHistoryTarget())
  }, [dispatch, historyTarget])

  // ojo: con un historial por aplicar no se pide todavía: se pediría dos veces (primero sin el filtro y otra vez con él)
  useEffect(() => {
    if (companyId === undefined || userId === undefined || historyTarget) return
    dispatch(loadAuditThunk())
  }, [dispatch, companyId, userId, page, filters, historyTarget])

  const changeFilters = useCallback((next: AuditFilters) => dispatch(setAuditFilters(next)), [dispatch])
  const setPage = useCallback((next: number) => dispatch(setAuditPage(next)), [dispatch])
  const reload = useCallback(() => dispatch(loadAuditThunk()), [dispatch])

  return { entries, meta: list.meta, loading: list.status === 'loading', error: list.error, filters, changeFilters, setPage, reload }
}

// useQuotationsLoader · pide al backend los totales al abrir la pantalla y la lista al abrirla y al cambiar de página o de filtro de estado
// conecta con: QuotationsScreen; despacha quotations.thunks y lee la sesión (auth) y el estado de cotizaciones
// ojo: solo corre con sesión; el filtro y la página piden de inmediato (no hay texto que esperar)
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { selectQuotations } from '../selectors/quotations.selectors'
import { loadQuotationsThunk, loadQuotationStatsThunk } from '../thunks/quotations.thunks'

export const useQuotationsLoader = (): void => {
  const dispatch = useAppDispatch()
  const companyId = useAppSelector(selectCurrentUser)?.companyId
  const { page, statusFilter } = useAppSelector(selectQuotations)

  useEffect(() => {
    if (companyId) dispatch(loadQuotationStatsThunk())
  }, [dispatch, companyId])

  useEffect(() => {
    if (companyId) dispatch(loadQuotationsThunk())
  }, [dispatch, companyId, page, statusFilter])
}

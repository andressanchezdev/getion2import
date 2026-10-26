// useSuppliersLoader · pide al backend los totales al abrir la pantalla y la lista al abrirla y al cambiar de página o de búsqueda
// conecta con: SuppliersScreen; despacha suppliers.thunks y lee la sesión (auth) y el estado de proveedores
// ojo: solo el TEXTO de la búsqueda espera 300 ms tras la última letra (useDebouncedValue); cambiar de página pide de inmediato. Solo corre con sesión
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { useDebouncedValue } from '@/global/hooks/useDebouncedValue'
import { selectCurrentUser } from '@/features/auth'
import { selectSuppliers } from '../selectors/suppliers.selectors'
import { loadSuppliersSummaryThunk, loadSuppliersThunk } from '../thunks/suppliers.thunks'

const SEARCH_DELAY_MS = 300

export const useSuppliersLoader = (): void => {
  const dispatch = useAppDispatch()
  const companyId = useAppSelector(selectCurrentUser)?.companyId
  const { page, query } = useAppSelector(selectSuppliers)
  const debouncedQuery = useDebouncedValue(query, SEARCH_DELAY_MS)

  useEffect(() => {
    if (companyId) dispatch(loadSuppliersSummaryThunk())
  }, [dispatch, companyId])

  useEffect(() => {
    if (companyId) dispatch(loadSuppliersThunk())
  }, [dispatch, companyId, page, debouncedQuery])
}

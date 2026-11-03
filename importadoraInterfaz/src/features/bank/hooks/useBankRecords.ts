// useBankRecords · pide los movimientos del banco cuando cambia la página o un filtro, y maneja los filtros de la pantalla (la búsqueda por texto con espera)
// conecta con: BankReconciliationScreen (lo usa), bank.thunks, bank.slice (filtros y página), bank.selectors y auth (hay sesión)
import { useEffect, useState } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { selectBankList } from '../selectors/bank.selectors'
import { clearBankFilters, setBankFilters, setBankPage } from '../slices/bank.slice'
import { loadBankRecordsThunk } from '../thunks/bank.thunks'
import type { BankFilters } from '../types/bank.types'

const SEARCH_DELAY_MS = 350

export const useBankRecords = () => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const list = useAppSelector(selectBankList)
  const [text, setText] = useState(list.filters.query)
  const debounced = useDebouncedValue(text, SEARCH_DELAY_MS)

  // la búsqueda escrita pasa a los filtros solo cuando se deja de teclear
  useEffect(() => {
    dispatch(setBankFilters({ query: debounced }))
  }, [dispatch, debounced])

  // pide la lista al entrar y cada vez que cambia un filtro o la página
  useEffect(() => {
    if (hasSession) dispatch(loadBankRecordsThunk())
  }, [dispatch, hasSession, list.page, list.filters])

  const setFilter = (change: Partial<BankFilters>) => dispatch(setBankFilters(change))
  const clearFilters = () => {
    setText('')
    dispatch(clearBankFilters())
  }

  return { ...list, text, setText, setFilter, clearFilters, setPage: (page: number) => dispatch(setBankPage(page)) }
}

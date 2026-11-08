// useCreditCustomerSearch · busca clientes mientras se escribe (con espera) para elegir a quién habilitar crédito
// conecta con: EnableCreditPanel (lo usa), wallet.history.thunks y wallet.selectors; auth (hay sesión)
import { useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { CREDIT_SEARCH_DELAY_MS } from '../constants/wallet.constants'
import { selectCreditSearch } from '../selectors/wallet.selectors'
import { searchCreditCustomersThunk } from '../thunks/wallet.history.thunks'

// onlyCredit: solo clientes que ya tienen crédito (abonos); sin él trae a todos (habilitar crédito)
export const useCreditCustomerSearch = (query: string, onlyCredit = false) => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const search = useAppSelector(selectCreditSearch)
  const debounced = useDebouncedValue(query, CREDIT_SEARCH_DELAY_MS)

  useEffect(() => {
    if (hasSession) dispatch(searchCreditCustomersThunk({ query: debounced, onlyCredit }))
  }, [dispatch, hasSession, debounced, onlyCredit])

  return search
}

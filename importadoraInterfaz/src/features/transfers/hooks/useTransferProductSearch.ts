// useTransferProductSearch · busca productos con sus existencias por bodega mientras se escribe (con espera) para el formulario de nuevo traslado
// conecta con: CreateTransferForm (lo usa), transfers.thunks, transfers.selectors y auth (hay sesión)
import { useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { TRANSFERS_SEARCH_DELAY_MS } from '../constants/transfers.constants'
import { selectTransferProductSearch } from '../selectors/transfers.selectors'
import { searchTransferProductsThunk } from '../thunks/transfers.thunks'

export const useTransferProductSearch = (text: string) => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const search = useAppSelector(selectTransferProductSearch)
  const debounced = useDebouncedValue(text, TRANSFERS_SEARCH_DELAY_MS)

  useEffect(() => {
    if (hasSession) dispatch(searchTransferProductsThunk(debounced))
  }, [dispatch, hasSession, debounced])

  return search
}

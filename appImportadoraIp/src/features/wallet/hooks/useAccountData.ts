// useAccountData · cuando se abre el estado de cuenta de un cliente pide sus facturas al backend
// conecta con: CreditAccountDetail (lo usa al montarse); despacha wallet.thunks (loadInvoicesThunk)
import { useEffect } from 'react'
import { useAppDispatch } from '@/global/hooks/useRedux'
import { loadInvoicesThunk } from '../thunks/wallet.thunks'

export const useAccountData = (customerId: number): void => {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(loadInvoicesThunk(customerId))
  }, [dispatch, customerId])
}

// usePendingPayments · pide los pagos por transferencia que siguen en revisión (los que un movimiento del banco puede respaldar)
// conecta con: BankConfirmPanel (lo usa al abrirse), bank.thunks y bank.selectors
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectPendingPayments } from '../selectors/bank.selectors'
import { loadPendingPaymentsThunk } from '../thunks/bank.thunks'

export const usePendingPayments = () => {
  const dispatch = useAppDispatch()
  const pending = useAppSelector(selectPendingPayments)

  useEffect(() => {
    dispatch(loadPendingPaymentsThunk())
  }, [dispatch])

  return pending
}

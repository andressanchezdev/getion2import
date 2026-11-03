// usePaymentsHistory · pide el historial de abonos al abrir la pestaña (y otra vez si se reinició el estado, por ejemplo al saltar de compañía)
// conecta con: AbonosTable (lo usa), wallet.history.thunks y wallet.selectors; auth (hay sesión)
// ojo: solo pide cuando el estado está «idle»; si falla no reintenta solo
import { useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectPaymentsHistory } from '../selectors/wallet.selectors'
import { loadPaymentsHistoryThunk } from '../thunks/wallet.history.thunks'

export const usePaymentsHistory = () => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const history = useAppSelector(selectPaymentsHistory)

  useEffect(() => {
    if (hasSession && history.status === 'idle') dispatch(loadPaymentsHistoryThunk())
  }, [dispatch, hasSession, history.status])

  const reload = () => {
    if (hasSession) dispatch(loadPaymentsHistoryThunk())
  }

  return { ...history, reload }
}

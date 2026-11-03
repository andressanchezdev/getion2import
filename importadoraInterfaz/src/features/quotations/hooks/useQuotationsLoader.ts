// useQuotationsLoader · pide las cotizaciones al backend al abrir la pantalla (y otra vez si se reinició el estado, por ejemplo al saltar de compañía)
// conecta con: QuotationsScreen (lo usa), quotations.thunks y quotations.selectors (estado de carga); auth (hay sesión)
// ojo: solo pide cuando el estado está «idle»; si falla no reintenta solo (el botón Actualizar de la pantalla lo vuelve a pedir)
import { useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectQuotationsStatus } from '../selectors/quotations.selectors'
import { loadQuotationsThunk } from '../thunks/quotations.thunks'

export const useQuotationsLoader = (): void => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const status = useAppSelector(selectQuotationsStatus)

  useEffect(() => {
    if (hasSession && status === 'idle') dispatch(loadQuotationsThunk())
  }, [dispatch, hasSession, status])
}

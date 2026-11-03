// useGeneralReport · pide el reporte general al abrir la pantalla y entrega los datos, si está cargando y cómo volver a pedirlo
// conecta con: GeneralReportScreen (lo usa), reports.thunks, reports.selectors y auth (hay sesión)
// ojo: solo pide solo la primera vez (estado «idle»); si falla se avisa y no reintenta solo; reload vuelve a pedir
import { useCallback, useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectGeneralReport } from '../selectors/reports.selectors'
import { loadGeneralReportThunk } from '../thunks/reports.thunks'

export const useGeneralReport = () => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const { general, status, error } = useAppSelector(selectGeneralReport)

  const reload = useCallback(async () => {
    if (!hasSession) return
    const result = await dispatch(loadGeneralReportThunk())
    if (loadGeneralReportThunk.rejected.match(result) && result.payload) toast.error(result.payload)
  }, [dispatch, hasSession])

  useEffect(() => {
    if (hasSession && status === 'idle') dispatch(loadGeneralReportThunk())
  }, [dispatch, hasSession, status])

  return { report: general, loading: status === 'idle' || status === 'loading', failed: status === 'failed', error, reload }
}

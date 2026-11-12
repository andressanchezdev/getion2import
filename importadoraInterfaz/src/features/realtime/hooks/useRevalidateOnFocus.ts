// useRevalidateOnFocus · respaldo cuando el websocket no está en 'live': recarga la pantalla visible al volver a la pestaña (sección 9.1.1 #7 y 16.11)
// conecta con: realtime.slice (status) y realtime.thunks (resyncVisibleScreen, startRealtime)
import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectIsAuthenticated } from '@/features/auth'
import { resyncVisibleScreen, startRealtime } from '../thunks/realtime.thunks'

const HIDDEN_RECONNECT_THRESHOLD_MS = 60_000

export const useRevalidateOnFocus = (): void => {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const status = useAppSelector((state) => state.realtime.status)
  const hiddenAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isAuthenticated || typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
        return
      }

      const hiddenForMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0
      hiddenAtRef.current = null

      if (status !== 'live') {
        void dispatch(resyncVisibleScreen())
        if (hiddenForMs >= HIDDEN_RECONNECT_THRESHOLD_MS && status !== 'offline') {
          void dispatch(startRealtime())
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [dispatch, isAuthenticated, status])
}


// useRealtime · abre el tiempo real cuando hay sesión, mantiene la revalidación al volver a la pestaña como respaldo y cierra al salir
// conecta con: features/auth (selectIsAuthenticated), realtime.thunks y useRevalidateOnFocus; lo llama ErpLayout una sola vez
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectIsAuthenticated } from '@/features/auth'
import { startRealtime, stopRealtime } from '../thunks/realtime.thunks'
import { useRevalidateOnFocus } from './useRevalidateOnFocus'

export const useRealtime = (): void => {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  useRevalidateOnFocus()

  useEffect(() => {
    if (!isAuthenticated) return
    void dispatch(startRealtime())
    return () => {
      void dispatch(stopRealtime())
    }
  }, [dispatch, isAuthenticated])
}

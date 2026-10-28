// useRealtime · abre el tiempo real cuando hay sesión y lo cierra al cerrar sesión o salir
// conecta con: features/auth (¿hay sesión?), realtime.thunks; lo llama ErpLayout una sola vez
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectIsAuthenticated } from '@/features/auth'
import { startRealtime, stopRealtime } from '../thunks/realtime.thunks'

export const useRealtime = () => {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return
    dispatch(startRealtime())
    return () => {
      dispatch(stopRealtime())
    }
  }, [dispatch, isAuthenticated])
}

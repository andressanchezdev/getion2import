// useTransfersLoader · pide los traslados de la bodega activa cuando la pestaña está visible y otra vez al cerrarse un panel (crear, recibir o ver detalle)
// conecta con: TransfersScreen (lo usa), transfers.thunks y auth (hay sesión); lee el panel abierto de ui.drawerForm
import { useCallback, useEffect, useRef } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { loadTransfersThunk } from '../thunks/transfers.thunks'

export const useTransfersLoader = (warehouseId: number, active: boolean): (() => void) => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const drawerForm = useAppSelector((state) => state.ui.drawerForm)
  const hadForm = useRef(false)
  const ready = hasSession && active && warehouseId > 0

  const reload = useCallback(() => {
    if (ready) dispatch(loadTransfersThunk(warehouseId))
  }, [dispatch, ready, warehouseId])

  useEffect(reload, [reload])

  // ojo: al cerrarse un panel se refresca la lista porque pudo haber cambiado (traslado creado, recibido o despachado)
  useEffect(() => {
    if (drawerForm) hadForm.current = true
    else if (hadForm.current) {
      hadForm.current = false
      reload()
    }
  }, [drawerForm, reload])

  return reload
}

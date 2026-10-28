// useWalletLoader · pide al backend la lista de clientes con crédito y los totales cuando cambia la página o la bodega
// conecta con: WalletScreen (lo usa al montarse); despacha wallet.thunks y lee wallet.selectors, la sesión de auth y la bodega activa (navigation) y su estado (warehouses)
// ojo: igual que el catálogo, espera a que haya bodega activa (la cartera se lee por bodega), salvo que las bodegas hayan fallado; los totales no dependen de la página
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { selectWarehousesStatus } from '@/features/warehouses'
import { selectWalletPage } from '../selectors/wallet.selectors'
import { loadWalletSummaryThunk, loadWalletThunk } from '../thunks/wallet.thunks'

export const useWalletLoader = (): void => {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const companyId = user?.companyId
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const warehousesStatus = useAppSelector(selectWarehousesStatus)
  const page = useAppSelector(selectWalletPage)

  const ready = Boolean(companyId) && (activeWarehouseId !== '' || warehousesStatus === 'failed')

  useEffect(() => {
    if (ready) dispatch(loadWalletThunk())
  }, [dispatch, ready, activeWarehouseId, page])

  useEffect(() => {
    if (ready) dispatch(loadWalletSummaryThunk())
  }, [dispatch, ready, activeWarehouseId])
}

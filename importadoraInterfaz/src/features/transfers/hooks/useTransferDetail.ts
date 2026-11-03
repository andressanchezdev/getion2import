// useTransferDetail · devuelve el traslado listo para el panel de detalle; si la fila vino sin productos pide el detalle completo
// conecta con: TransferDetailPanel; despacha transfers.thunks (loadTransferDetailThunk)
// ojo: «cargando» se deduce de que lo traído sea de otro traslado (sin setState síncrono en el efecto); si falla se muestra lo que ya había
import { useEffect, useState } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { loadTransferDetailThunk } from '../thunks/transfers.thunks'
import type { TrasladeItem } from '../types/transfers.types'

export const useTransferDetail = (rawTransfer: TrasladeItem | null | undefined) => {
  const dispatch = useAppDispatch()
  const transfer = (rawTransfer && typeof rawTransfer === 'object' && 'transfer' in rawTransfer
    ? (rawTransfer as { transfer: TrasladeItem }).transfer
    : rawTransfer) as TrasladeItem | null | undefined

  const [fetched, setFetched] = useState<TrasladeItem | null>(null)
  const transferId = transfer?.id ?? 0
  const needsFetch = transfer ? (!transfer.products || transfer.products.length === 0) : false

  useEffect(() => {
    if (!needsFetch || !transferId) return
    let cancelled = false
    dispatch(loadTransferDetailThunk(transferId)).then((result) => {
      if (!cancelled && loadTransferDetailThunk.fulfilled.match(result)) setFetched(result.payload)
    })
    return () => {
      cancelled = true
    }
  }, [dispatch, transferId, needsFetch])

  const detail = fetched?.id === transferId ? fetched : (transfer ?? null)
  return { detail, loading: needsFetch && fetched?.id !== transferId }
}

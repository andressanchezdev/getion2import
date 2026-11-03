// useSaleLines · pide los renglones de un pedido para el cotejo de mercancía y dice si siguen cargando
// conecta con: VerifyInvoiceGoodsModal; despacha cash.thunks (loadSaleLinesThunk)
// ojo: «cargando» se deduce de que lo traído sea de otro pedido (sin setState síncrono en el efecto); si falla queda la lista vacía
import { useEffect, useState } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { loadSaleLinesThunk } from '../thunks/cash.thunks'
import type { InvoiceLineItem } from '../types/cash.types'

export const useSaleLines = (orderId: number) => {
  const dispatch = useAppDispatch()
  const [loaded, setLoaded] = useState<{ orderId: number; lines: InvoiceLineItem[] } | null>(null)

  useEffect(() => {
    let cancelled = false
    dispatch(loadSaleLinesThunk(orderId)).then((result) => {
      if (!cancelled) setLoaded({ orderId, lines: loadSaleLinesThunk.fulfilled.match(result) ? result.payload : [] })
    })
    return () => {
      cancelled = true
    }
  }, [dispatch, orderId])

  const ready = loaded?.orderId === orderId
  return { lines: ready ? loaded.lines : [], loading: !ready }
}

// useProductStockByWarehouse · lo vendible del repuesto en cada bodega de la compañía, consultado al abrir la solicitud de traslado
// conecta con: useTransferRequest (lo usa), transfers.service (fetchProductStockByWarehouse) y auth (contexto de la petición)
// ojo: el catálogo solo conoce el stock de la bodega activa, por eso el panel no puede fiarse del mapa que trae la tarjeta: aquí se consulta el real de toda la compañía; mientras carga o si falla, se usa el que llegó como respaldo y se avisa que está consultando
import { useEffect, useState } from 'react'
import { selectRequestContext } from '@/features/auth'
import { getErrorMessage } from '@/api'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { fetchProductStockByWarehouse } from '../services/transfers.service'

interface ProductStockState {
  productId: number
  stockByWarehouse: Record<string, number> | null
  error: string | null
}

export const useProductStockByWarehouse = (productId: number | undefined, fallback?: Record<string, number>) => {
  const ctx = useAppSelector(selectRequestContext)
  const [state, setState] = useState<ProductStockState | null>(null)

  useEffect(() => {
    if (!productId || !ctx) return
    let cancelled = false
    fetchProductStockByWarehouse(ctx, productId)
      .then((stockByWarehouse) => !cancelled && setState({ productId, stockByWarehouse, error: null }))
      .catch((error) => !cancelled && setState({ productId, stockByWarehouse: null, error: getErrorMessage(error, 'No se pudieron consultar las existencias por bodega.') }))
    return () => {
      cancelled = true
    }
    // ctx cambia de identidad solo con la sesión; el producto es lo que dispara la consulta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const current = state && state.productId === productId ? state : null
  return {
    stockByWarehouse: current?.stockByWarehouse ?? fallback ?? {},
    loading: Boolean(productId) && current === null,
    error: current?.error ?? null,
  }
}

// useProductStock · pide las existencias de un producto en todas las bodegas al abrir su detalle o sus ubicaciones
// conecta con: ProductDetailPanel y ProductLocationsPanel (lo usan), inventory.thunks y inventory.selectors; auth (hay sesión)
// ojo: si el estado guarda las filas de OTRO producto, se devuelve «cargando» y sin filas, así nunca se ven existencias ajenas
import { useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectProductStock } from '../selectors/inventory.selectors'
import { loadProductStockThunk } from '../thunks/inventory.thunks'

export const useProductStock = (productId: number) => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const stock = useAppSelector(selectProductStock)

  useEffect(() => {
    if (hasSession && productId > 0) dispatch(loadProductStockThunk(productId))
  }, [dispatch, hasSession, productId])

  const isCurrent = stock.productId === productId
  return { items: isCurrent ? stock.items : [], status: isCurrent ? stock.status : ('loading' as const), error: isCurrent ? stock.error : null }
}

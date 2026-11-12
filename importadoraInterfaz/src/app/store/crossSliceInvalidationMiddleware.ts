// crossSliceInvalidationMiddleware · middleware de RTK para invalidación reactiva cruzada entre módulos
import { createListenerMiddleware, type UnknownAction } from '@reduxjs/toolkit'
import { loadProductsTableThunk } from '@/features/inventory/thunks/inventory.thunks'
import { loadOrdersThunk, loadOrderCountsThunk } from '@/features/orders/thunks/orders.thunks'

export const crossSliceMiddleware = createListenerMiddleware()

// 1. Al crear venta o cambiar etapa: reactualizar pedidos y stock
// ojo: con el tiempo real activo ('live') los eventos ya actualizan esas pantallas; las recargas HTTP quedan solo como respaldo cuando el socket no está conectado
crossSliceMiddleware.startListening({
  predicate: (action: UnknownAction) =>
    typeof action.type === 'string' &&
    (action.type.startsWith('checkout/') || action.type.startsWith('orders/advanceStage') || action.type.startsWith('transfers/receive')) &&
    action.type.endsWith('/fulfilled'),
  effect: async (_action, listenerApi) => {
    const realtime = (listenerApi.getState() as { realtime?: { status?: string } }).realtime
    if (realtime?.status === 'live') return
    listenerApi.dispatch(loadOrdersThunk() as never)
    listenerApi.dispatch(loadOrderCountsThunk() as never)
    listenerApi.dispatch(loadProductsTableThunk({ page: 1, query: '' }) as never)
  },
})

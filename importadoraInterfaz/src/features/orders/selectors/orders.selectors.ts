// orders.selectors · lecturas derivadas del estado de pedidos (tabla filtrada, chips de etapa y datos del encabezado del panel)
// conecta con: OrdersScreen y sus componentes, drawerRegistry (modo «order»); leen state.orders
import { createSelector } from '@reduxjs/toolkit'
import { ORDER_STAGES } from '../constants/orders.constants'
import { filterOrders } from '../helpers/orders.adapter'
import type { OrdersState } from '../types/orders.types'

// forma mínima del state que necesitan estos selectors (así la feature no importa el store de app)
type OrdersRoot = { orders: OrdersState }

export const selectOrders = (state: OrdersRoot) => state.orders
// lee la tabla de pedidos (filas, estado de carga y error)
export const selectOrdersList = (state: OrdersRoot) => state.orders.list
// lee el id del pedido abierto en el panel (null si no hay)
export const selectOpenOrderId = (state: OrdersRoot) => state.orders.openId
// dice si hay un pedido abierto en el panel
export const selectHasOpenOrder = (state: OrdersRoot) => state.orders.openId !== null
// lee el detalle del pedido abierto
export const selectOrderDetail = (state: OrdersRoot) => state.orders.detail

// la tabla con la búsqueda aplicada (la búsqueda es sobre lo ya cargado)
export const selectVisibleOrders = createSelector(
  [(state: OrdersRoot) => state.orders.list.items, (state: OrdersRoot) => state.orders.query],
  filterOrders
)

// las etapas con su conteo (null mientras no llegan los conteos)
export const selectOrderStageChips = createSelector([(state: OrdersRoot) => state.orders.counts], (counts) =>
  ORDER_STAGES.map((stage) => ({ key: stage.key, label: stage.label, count: counts ? counts[stage.key] : null }))
)

// la fila del pedido abierto (sirve para el encabezado del panel mientras llega el detalle)
export const selectOpenOrderRow = createSelector(
  [(state: OrdersRoot) => state.orders.list.items, selectOpenOrderId],
  (items, id) => items.find((order) => order.id === id) ?? null
)

// encabezado del panel derecho al abrir un pedido: su serie y su cliente
export const selectOrderDrawerMeta = createSelector([selectOrderDetail, selectOpenOrderRow], (detail, row) => ({
  title: detail.data?.serial ?? row?.serial ?? 'Pedido',
  subtitle: detail.data?.customer.name ?? row?.customerName ?? '',
}))

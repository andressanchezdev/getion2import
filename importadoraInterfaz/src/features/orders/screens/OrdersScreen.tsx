// OrdersScreen · pantalla de Tienda > Bandeja de Pedidos: barra con etapas, buscador y canal, y la tabla de pedidos
// conecta con: useOrdersLoader (pide conteos y tabla), OrdersToolbar, OrdersTable y OrderCancelDialog; la monta MainContent (screenRegistry); al elegir un pedido se abre OrderDrawer en el panel derecho (drawerRegistry, modo «order»)
// ojo: el backend pagina por canal; si hay más pedidos de los que se muestran, se avisa debajo de la tabla
import React, { useState } from 'react'
import { useAppSelector } from '@/global/hooks/useRedux'
import { OrderCancelDialog } from '../components/cancel/OrderCancelDialog'
import { OrdersTable } from '../components/table/OrdersTable'
import { OrdersToolbar } from '../components/toolbar/OrdersToolbar'
import { ORDERS_PAGE_SIZE } from '../constants/orders.constants'
import { useOrdersLoader } from '../hooks/useOrdersLoader'
import { selectOrdersList } from '../selectors/orders.selectors'
import type { OrderRow } from '../types/orders.types'
import './OrdersScreen.css'

export const OrdersScreen: React.FC = () => {
  useOrdersLoader()
  const { capped } = useAppSelector(selectOrdersList)
  const [orderToCancel, setOrderToCancel] = useState<OrderRow | null>(null)

  return (
    <div className="orders-screen">
      <OrdersToolbar />
      <OrdersTable onCancel={setOrderToCancel} />
      {capped && <p className="orders-screen-note">Hay más pedidos de los que se muestran: se ven los {ORDERS_PAGE_SIZE} más recientes de cada canal.</p>}
      <OrderCancelDialog order={orderToCancel} onClose={() => setOrderToCancel(null)} />
    </div>
  )
}

export default OrdersScreen

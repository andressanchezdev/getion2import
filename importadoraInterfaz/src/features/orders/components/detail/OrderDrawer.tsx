// OrderDrawer · contenido del panel derecho al abrir un pedido: resumen, cliente y vendedor, líneas, pagos y, abajo, las acciones del pedido
// conecta con: useOpenOrderDetail (pide el detalle), orders.selectors (pedido abierto y detalle), OrderDetailSections (las cajas), OrderCancelDialog, orders.clipboard y usePermissions; lo muestra DrawerRight (drawerRegistry, modo «order»)
// ojo: el encabezado del panel (serie y cliente) lo pinta DrawerHeader con selectOrderDrawerMeta; al anular bien, el slice cierra el panel
import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { usePermissions } from '@/global/hooks/usePermissions'
import { Button } from '@/global/components/UI/atoms/Button'
import { copyOrderSerial } from '../../helpers/orders.clipboard'
import { useOpenOrderDetail } from '../../hooks/useOpenOrderDetail'
import { selectOpenOrderId, selectOrderDetail } from '../../selectors/orders.selectors'
import { loadOrderDetailThunk } from '../../thunks/orders.thunks'
import { OrderCancelDialog } from '../cancel/OrderCancelDialog'
import { OrderLinesSection, OrderPaymentsSection, OrderPeopleSection, OrderSummarySection } from './OrderDetailSections'
import './OrderDrawer.css'

export const OrderDrawer: React.FC = () => {
  const dispatch = useAppDispatch()
  useOpenOrderDetail()
  const openId = useAppSelector(selectOpenOrderId)
  const { data: order, status, error } = useAppSelector(selectOrderDetail)
  const canCancel = usePermissions().canPerformAction('shop', 'orders', 'delete')
  const [isCancelOpen, setIsCancelOpen] = useState(false)

  if (openId === null) return null
  const failed = status === 'failed'

  return (
    <div className="order-drawer">
      <div className="order-drawer-body">
        {order ? (
          <>
            <OrderSummarySection order={order} />
            <OrderPeopleSection order={order} />
            <OrderLinesSection order={order} />
            <OrderPaymentsSection order={order} />
          </>
        ) : (
          <div className="order-drawer-state">
            <p className={failed ? 'order-drawer-note order-drawer-note-error' : 'order-drawer-note'} role={failed ? 'alert' : undefined}>
              {failed ? error : 'Cargando detalle…'}
            </p>
            {failed && <Button onClick={() => dispatch(loadOrderDetailThunk(openId))}>Reintentar</Button>}
          </div>
        )}
      </div>

      {order && (
        <div className="order-drawer-foot">
          <Button onClick={() => copyOrderSerial(order.serial)}>Copiar número</Button>
          {canCancel && !order.cancelled && (
            <Button variant="danger" onClick={() => setIsCancelOpen(true)}>
              Anular pedido
            </Button>
          )}
        </div>
      )}

      <OrderCancelDialog order={isCancelOpen && order ? { id: order.id, serial: order.serial } : null} onClose={() => setIsCancelOpen(false)} />
    </div>
  )
}

export default OrderDrawer

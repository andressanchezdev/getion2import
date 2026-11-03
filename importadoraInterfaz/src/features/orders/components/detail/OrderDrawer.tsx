// OrderDrawer · contenido del panel derecho al abrir un pedido: resumen, cliente y vendedor, líneas, pagos y, abajo, las acciones del pedido
// conecta con: useOpenOrderDetail (pide el detalle), orders.selectors (pedido abierto y detalle), orders.thunks (aprobar el comprobante), las cajas de sections/ (resumen, personas, líneas y pagos), OrderCancelDialog, orders.clipboard y usePermissions; lo muestra DrawerRight (drawerRegistry, modo «order»)
// ojo: el encabezado del panel (serie y cliente) lo pinta DrawerHeader con selectOrderDrawerMeta; al anular bien, el slice cierra el panel
import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { Button } from '@/global/components/UI/atoms/Button'
import { copyOrderSerial } from '../../helpers/orders.clipboard'
import { useOpenOrderDetail } from '../../hooks/useOpenOrderDetail'
import { selectOpenOrderId, selectOrderDetail } from '../../selectors/orders.selectors'
import { loadOrderDetailThunk, verifyTransferPaymentThunk } from '../../thunks/orders.thunks'
import { OrderCancelDialog } from '../cancel/OrderCancelDialog'
import { OrderHistorySection } from './sections/OrderHistorySection'
import { OrderLinesSection } from './sections/OrderLinesSection'
import { OrderPaymentsSection } from './sections/OrderPaymentsSection'
import { OrderPeopleSection } from './sections/OrderPeopleSection'
import { OrderSummarySection } from './sections/OrderSummarySection'
import './OrderDrawer.css'

export const OrderDrawer: React.FC = () => {
  const dispatch = useAppDispatch()
  useOpenOrderDetail()
  const openId = useAppSelector(selectOpenOrderId)
  const { data: order, status, error } = useAppSelector(selectOrderDetail)
  const { level, canPerformAction } = usePermissions()
  const canCancel = canPerformAction('shop', 'orders', 'delete')
  const canVerifyPayment = level === 'admin' || level === 'superadmin' || canPerformAction('shop', 'orders', 'update')
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [verifying, setVerifying] = useState(false)

  if (openId === null) return null
  const failed = status === 'failed'

  const handleVerifyTransfer = async () => {
    if (!order) return
    setVerifying(true)
    try {
      await dispatch(verifyTransferPaymentThunk(order)).unwrap()
    } catch {
      // el aviso de error ya lo muestra el thunk
    } finally {
      setVerifying(false)
    }
  }

  const isTransferPending = order && order.paymentMethod.toLowerCase() === 'transfer' && !order.paymentVerified

  return (
    <div className="order-drawer">
      <div className="order-drawer-body">
        {order ? (
          <>
            <OrderSummarySection order={order} />
            <OrderPeopleSection order={order} />
            <OrderLinesSection order={order} />
            <OrderPaymentsSection order={order} />
            <OrderHistorySection order={order} />
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
          {isTransferPending && canVerifyPayment && (
            <Button
              variant="primary"
              disabled={verifying}
              onClick={handleVerifyTransfer}
            >
              {verifying ? 'Verificando...' : '✓ Aprobar comprobante'}
            </Button>
          )}
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

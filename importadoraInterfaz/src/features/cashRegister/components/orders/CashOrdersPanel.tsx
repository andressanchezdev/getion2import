// CashOrdersPanel · los pedidos en Caja: la misma barra y tabla de Pedidos, en una tarjeta, con las acciones de caja (cobrar y cotejar la salida)
// conecta con: CashRegisterScreen (lo pinta), orders (OrdersToolbar, OrdersTable, OrderCancelDialog, useOrdersLoader), cash.collect (cuándo se ofrece cobrar), navigation (abre «cashCollect») y VerifyInvoiceGoodsModal
// ojo: «Cobrar» abre el panel del cobro mixto (efectivo, transferencia y crédito); el efectivo exige turno abierto y el panel lo avisa; las transferencias de un pedido se aprueban en su detalle (botón «Aprobar comprobante»)
import React, { useState } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { OrderCancelDialog, OrdersTable, OrdersToolbar, loadOrdersThunk, useOrdersLoader, type OrderRow } from '@/features/orders'
import { canCollect } from '../../helpers/cash.collect'
import { VerifyInvoiceGoodsModal } from '../VerifyInvoiceGoodsModal'

interface CashOrdersPanelProps {
  shiftActions?: React.ReactNode
}

export const CashOrdersPanel: React.FC<CashOrdersPanelProps> = ({ shiftActions }) => {
  const dispatch = useAppDispatch()
  useOrdersLoader()
  const [toCancel, setToCancel] = useState<OrderRow | null>(null)
  const [toCheck, setToCheck] = useState<OrderRow | null>(null)

  const extraActions = (order: OrderRow) => (
    <>
      {canCollect(order) && (
        <button type="button" className="btn-primary" title="Cobrar el pedido: efectivo, transferencia o crédito" onClick={() => dispatch(openDrawerForm({ kind: 'cashCollect', payload: { order } }))}>
          Cobrar
        </button>
      )}
      {(order.stage === 'invoicing' || order.stage === 'dispatch') && (
        <button type="button" className="btn-secondary" title="Verifica que lo que sale coincida con la factura" onClick={() => setToCheck(order)}>
          Cotejar salida
        </button>
      )}
    </>
  )

  return (
    <div className="orders-card">
      <OrdersToolbar hideWarehouseFilter extraActions={shiftActions} />
      <OrdersTable onCancel={setToCancel} extraActions={extraActions} />

      <OrderCancelDialog order={toCancel} onClose={() => setToCancel(null)} />
      {toCheck && (
        <VerifyInvoiceGoodsModal
          orderId={toCheck.id}
          serial={toCheck.serial}
          customerName={toCheck.customerName}
          total={toCheck.totalAmount}
          isImmediate={toCheck.channel === 'immediate'}
          onClose={() => setToCheck(null)}
          onVerified={() => {
            setToCheck(null)
            dispatch(loadOrdersThunk())
          }}
        />
      )}
    </div>
  )
}

export default CashOrdersPanel

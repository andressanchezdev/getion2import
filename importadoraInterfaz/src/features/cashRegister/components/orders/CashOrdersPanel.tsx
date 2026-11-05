// CashOrdersPanel · los pedidos en Caja: la misma barra y tabla de Pedidos, en una tarjeta, con las acciones de caja (cobrar y cotejar la salida)
// conecta con: CashRegisterScreen (lo pinta), orders (OrdersToolbar, OrdersTable, OrderCancelDialog, useOrdersLoader), cash.collect (cuándo se ofrece cobrar), navigation (abre «cashCollect») y VerifyInvoiceGoodsModal
// ojo: «Cobrar» abre el panel del cobro mixto (efectivo, transferencia y crédito); el efectivo exige turno abierto y el panel lo avisa; las transferencias de un pedido se aprueban en su detalle (botón «Aprobar comprobante»)
import React, { useState } from 'react'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { OrderCancelDialog, OrdersTable, OrdersToolbar, loadOrdersThunk, useOrdersLoader, type OrderRow } from '@/features/orders'
import walletIcon from '@/assets/icons/wallet.svg?raw'
import checkIcon from '@/assets/icons/check.svg?raw'
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
    <RowActions
      actions={[
        {
          key: 'collect',
          label: `Cobrar el pedido ${order.serial}: efectivo, transferencia o crédito`,
          icon: walletIcon,
          tone: 'success',
          visible: canCollect(order),
          onClick: () => dispatch(openDrawerForm({ kind: 'cashCollect', payload: { order } })),
        },
        {
          key: 'check',
          label: `Cotejar salida del pedido ${order.serial}`,
          icon: checkIcon,
          visible: order.stage === 'invoicing' || order.stage === 'dispatch',
          onClick: () => setToCheck(order),
        },
      ]}
    />
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

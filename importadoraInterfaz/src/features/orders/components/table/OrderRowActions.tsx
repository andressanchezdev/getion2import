// OrderRowActions · acciones en línea con íconos para una fila de la tabla de pedidos, delegando en el componente padre RowActions
// conecta con: OrdersTable (le pasa el pedido y recibe la acción elegida), RowActions y orders.actions
import React from 'react'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import copyIcon from '@/assets/icons/copy.svg?raw'
import banIcon from '@/assets/icons/ban.svg?raw'
import listIcon from '@/assets/icons/list.svg?raw'
import bagIcon from '@/assets/icons/shopping-bag.svg?raw'
import receiptIcon from '@/assets/icons/receipt.svg?raw'
import shippingIcon from '@/assets/icons/shipping.svg?raw'
import checkIcon from '@/assets/icons/check.svg?raw'
import { getOrderActions, type OrderActionKey } from '../../helpers/orders.actions'
import type { OrderRow } from '../../types/orders.types'
import './OrderRowActions.css'

const ACTION_ICONS: Record<OrderActionKey, string> = {
  detail: eyeIcon,
  copy: copyIcon,
  cancel: banIcon,
  pick: listIcon,
  pack: bagIcon,
  invoice: receiptIcon,
  dispatch: shippingIcon,
  send: checkIcon,
}

interface OrderRowActionsProps {
  order: OrderRow
  canCancel: boolean
  canAdvance?: boolean
  onAction: (key: OrderActionKey, order: OrderRow) => void
}

export const OrderRowActions: React.FC<OrderRowActionsProps> = ({ order, canCancel, canAdvance = false, onAction }) => {
  const actions = getOrderActions(order, canCancel, canAdvance)

  return (
    <div className="order-actions" onClick={(e) => e.stopPropagation()}>
      <RowActions
        actions={actions.map((action) => {
          const isAdvance = action.key !== 'detail' && action.key !== 'copy' && action.key !== 'cancel'
          return {
            key: action.key,
            label: `${action.label} (${order.serial})`,
            icon: ACTION_ICONS[action.key],
            tone: action.danger ? 'danger' : isAdvance ? 'success' : 'default',
            onClick: () => onAction(action.key, order),
          }
        })}
      />
    </div>
  )
}

export default OrderRowActions

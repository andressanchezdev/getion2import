// OrderRowActions · acciones de una fila de la tabla de pedidos: botón «Ver detalle» y menú ⋯ con el resto (copiar el número y anular)
// conecta con: OrdersTable (le pasa el pedido y recibe la acción elegida), orders.actions (qué acciones hay), global useClickOutside (cierra el menú con clic fuera o Escape)
// ojo: el menú es el .pop de la maqueta; anular solo se ofrece a quien tiene el permiso
import React, { useRef, useState } from 'react'
import { useClickOutside } from '@/global/hooks/useClickOutside'
import { getOrderActions, type OrderActionKey } from '../../helpers/orders.actions'
import type { OrderRow } from '../../types/orders.types'
import './OrderRowActions.css'

interface OrderRowActionsProps {
  order: OrderRow
  canCancel: boolean
  onAction: (key: OrderActionKey, order: OrderRow) => void
}

export const OrderRowActions: React.FC<OrderRowActionsProps> = ({ order, canCancel, onAction }) => {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  useClickOutside(wrapperRef, () => setIsOpen(false), isOpen)

  const menu = getOrderActions(order, canCancel).filter((action) => action.key !== 'detail')

  return (
    // ojo: los clics de las acciones no abren el detalle de la fila
    <div className="order-actions" ref={wrapperRef} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="order-actions-primary" onClick={() => onAction('detail', order)}>
        Ver detalle
      </button>
      <div className="order-actions-wrap">
        <button
          type="button"
          className="order-actions-dots"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`Más acciones del pedido ${order.serial}`}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          ⋯
        </button>
        {isOpen && (
          <div className="order-actions-pop" role="menu">
            {menu.map((action) => (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                className={action.danger ? 'order-actions-item order-actions-item-danger' : 'order-actions-item'}
                onClick={() => {
                  setIsOpen(false)
                  onAction(action.key, order)
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderRowActions

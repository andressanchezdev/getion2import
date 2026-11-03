// OrdersTable · tabla de pedidos (la .dt de la maqueta): una columna por cada dato importante y, al final, las acciones; el resto de datos va en el detalle del panel derecho
// conecta con: orders.selectors (tabla filtrada y estado), orders.slice (abrir un pedido), orders.thunks (reintentar), orders.clipboard (copiar), OrderRowActions, global Pill y usePermissions
// ojo: no lleva borde propio: la tarjeta que la envuelve (OrdersScreen o Caja) junta barra y tabla en una sola; con extraActions otra pantalla suma sus acciones
// ojo: columnas: Pedido, Cliente, Etapa, Pago, Total, Fecha y Acciones; un clic en la fila abre el detalle; el canal y el vendedor van en letra pequeña debajo del pedido y del cliente
import React from 'react'
import { formatPesos } from '@/global/helpers/formatting/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { ORDER_STAGES } from '../../constants/orders.constants'
import type { OrderActionKey } from '../../helpers/orders.actions'
import { copyOrderSerial } from '../../helpers/orders.clipboard'
import { selectOpenOrderId, selectOrdersList, selectVisibleOrders } from '../../selectors/orders.selectors'
import { openOrder } from '../../slices/orders.slice'
import { advanceOrderThunk, loadOrdersThunk } from '../../thunks/orders.thunks'
import type { OrderRow } from '../../types/orders.types'
import { dateLabel, paymentLabel } from '../../helpers/orders.labels'
import { OrderRowActions } from './OrderRowActions'
import './OrdersTable.css'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'

const COLUMNS = 7

// texto en español de la etapa en que va el pedido
const stageLabel = (order: OrderRow): string => ORDER_STAGES.find((stage) => stage.key === order.stage)?.label ?? order.stage

interface OrdersTableProps {
  onCancel: (order: OrderRow) => void
  extraActions?: (order: OrderRow) => React.ReactNode // acciones propias de otra pantalla (por ejemplo, el cobro de Caja) junto a las de siempre
}

// tabla de los pedidos de la etapa activa, con sus acciones
export const OrdersTable: React.FC<OrdersTableProps> = ({ onCancel, extraActions }) => {
  const dispatch = useAppDispatch()
  const { status, error, items } = useAppSelector(selectOrdersList)
  const orders = useAppSelector(selectVisibleOrders)
  const { pageItems, meta, setPage } = usePagedList(orders, orders)
  const openId = useAppSelector(selectOpenOrderId)
  const { canPerformAction } = usePermissions()
  const canCancel = canPerformAction('shop', 'orders', 'delete')
  const canAdvance = canPerformAction('shop', 'orders', 'update')

  // lo que se dice en lugar de las filas: cargando, error, nada en la etapa o nada que coincida con la búsqueda
  const message = (() => {
    if (status === 'failed') return error
    if (items.length === 0 && (status === 'idle' || status === 'loading')) return 'Cargando pedidos…'
    if (items.length === 0) return 'No hay pedidos en esta etapa y canal.'
    if (orders.length === 0) return 'Ningún pedido coincide con la búsqueda.'
    return null
  })()

  const handleAction = (key: OrderActionKey, order: OrderRow) => {
    if (key === 'detail') dispatch(openOrder(order.id))
    else if (key === 'copy') copyOrderSerial(order.serial)
    else if (key === 'cancel') onCancel(order)
    else dispatch(advanceOrderThunk({ saleId: order.id, action: key }))
  }

  return (
    <div className="orders-table-card" aria-busy={status === 'loading'}>
      <div className="orders-table-scroll table-scroll">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Etapa</th>
              <th>Pago</th>
              <th className="orders-table-num">Total</th>
              <th>Fecha</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan={COLUMNS} className="orders-table-message">
                  <p role={status === 'failed' ? 'alert' : undefined}>{message}</p>
                  {status === 'failed' && (
                    <button type="button" className="orders-table-retry" onClick={() => dispatch(loadOrdersThunk())}>
                      Reintentar
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              pageItems.map((order) => (
                <tr
                  key={order.id}
                  className={order.id === openId ? 'orders-table-row orders-table-row-open' : 'orders-table-row'}
                  tabIndex={0}
                  onClick={() => dispatch(openOrder(order.id))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target === e.currentTarget) dispatch(openOrder(order.id))
                  }}
                >
                  <td>
                    <b className="orders-table-strong">{order.serial}</b>
                    {order.channel === 'immediate' ? (
                      <span className="orders-badge-immediate">⚡ Picking Inmediato</span>
                    ) : (
                      <small className="orders-table-sub">Normal</small>
                    )}
                  </td>
                  <td>
                    <b className="orders-table-strong">{order.customerName}</b>
                    <small className="orders-table-sub">Vendedor: {order.sellerName}</small>
                  </td>
                  <td>
                    <div className="orders-table-pills">
                      {order.confirmed ? <Pill tone="green">Verificación confirmada</Pill> : <Pill tone="blue">{stageLabel(order)}</Pill>}
                    </div>
                  </td>
                  <td>
                    {order.paymentMethod.toLowerCase() === 'transfer' ? (
                      <span className={`orders-badge-transfer ${order.paymentVerified ? 'is-verified' : 'is-pending'}`}>
                        {order.paymentVerified ? '✓ Transf. verificada' : '📸 Transf. por verificar'}
                      </span>
                    ) : (
                      paymentLabel(order.paymentMethod)
                    )}
                  </td>
                  <td className="orders-table-num table-amount">
                    <b className="orders-table-strong">{formatPesos(order.totalAmount)}</b>
                  </td>
                  <td>{dateLabel(order.createdAt)}</td>
                  <td className="orders-table-actions">
                    {extraActions && <span className="orders-table-extra" onClick={(e) => e.stopPropagation()}>{extraActions(order)}</span>}
                    <OrderRowActions order={order} canCancel={canCancel} canAdvance={canAdvance} onAction={(key) => handleAction(key, order)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} label="Paginación de pedidos" onPageChange={setPage} />
    </div>
  )
}

export default OrdersTable

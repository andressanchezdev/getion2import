// OrdersTable · tabla de pedidos (la .dt de la maqueta): una columna por cada dato importante y, al final, las acciones; el resto de datos va en el detalle del panel derecho
// conecta con: orders.selectors (tabla filtrada y estado), orders.slice (abrir un pedido), orders.thunks (reintentar), orders.clipboard (copiar), OrderRowActions, global Pill y usePermissions
// ojo: columnas: Pedido, Cliente, Etapa, Pago, Total, Fecha y Acciones; un clic en la fila abre el detalle; el canal y el vendedor van en letra pequeña debajo del pedido y del cliente
import React from 'react'
import { formatPesos } from '@/global/helpers/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { usePermissions } from '@/global/hooks/usePermissions'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { ORDER_CHANNELS, ORDER_STAGES, PAYMENT_METHOD_LABELS } from '../../constants/orders.constants'
import type { OrderActionKey } from '../../helpers/orders.actions'
import { copyOrderSerial } from '../../helpers/orders.clipboard'
import { selectOpenOrderId, selectOrdersList, selectVisibleOrders } from '../../selectors/orders.selectors'
import { openOrder } from '../../slices/orders.slice'
import { loadOrdersThunk } from '../../thunks/orders.thunks'
import type { OrderRow } from '../../types/orders.types'
import { OrderRowActions } from './OrderRowActions'
import './OrdersTable.css'

const COLUMNS = 7

const stageLabel = (order: OrderRow): string => ORDER_STAGES.find((stage) => stage.key === order.stage)?.label ?? order.stage
const channelLabel = (order: OrderRow): string => ORDER_CHANNELS.find((channel) => channel.key === order.channel)?.label ?? order.channel
const paymentLabel = (method: string): string => PAYMENT_METHOD_LABELS[method.toLowerCase()] ?? (method || '—')
const dateLabel = (day: string): string => (day ? day.split('-').reverse().join('/') : '—')

interface OrdersTableProps {
  onCancel: (order: OrderRow) => void
}

export const OrdersTable: React.FC<OrdersTableProps> = ({ onCancel }) => {
  const dispatch = useAppDispatch()
  const { status, error, items } = useAppSelector(selectOrdersList)
  const orders = useAppSelector(selectVisibleOrders)
  const openId = useAppSelector(selectOpenOrderId)
  const canCancel = usePermissions().canPerformAction('shop', 'orders', 'delete')

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
    else onCancel(order)
  }

  return (
    <div className="orders-table-card" aria-busy={status === 'loading'}>
      <div className="orders-table-scroll">
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
              orders.map((order) => (
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
                    <small className="orders-table-sub">{channelLabel(order)}</small>
                  </td>
                  <td>
                    <b className="orders-table-strong">{order.customerName}</b>
                    <small className="orders-table-sub">Vendedor: {order.sellerName}</small>
                  </td>
                  <td>
                    <div className="orders-table-pills">
                      <Pill tone="blue">{stageLabel(order)}</Pill>
                      {order.paused && <Pill tone="amber">En pausa</Pill>}
                    </div>
                  </td>
                  <td>
                    <span>{paymentLabel(order.paymentMethod)}</span>
                    <div className="orders-table-pills">
                      <Pill tone={order.paymentVerified ? 'green' : 'gray'}>{order.paymentVerified ? 'Pago verificado' : 'Sin verificar'}</Pill>
                    </div>
                  </td>
                  <td className="orders-table-num orders-table-strong">{formatPesos(order.totalAmount)}</td>
                  <td>{dateLabel(order.createdAt)}</td>
                  <td>
                    <OrderRowActions order={order} canCancel={canCancel} onAction={handleAction} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default OrdersTable

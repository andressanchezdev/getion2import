// StageOrders · tabla con los pedidos de la etapa y el canal elegidos, con paginador
// conecta con: management.selectors/slice (lista y página), useStageOrdersLoader (la pide), global TableMessageRow, Pagination y DataTable.css; la monta PipelineScreen
// ojo: "pausado", "pago verificado" y "ubicación verificada" salen de isPause, verifiedTransaction y verifiedLocation (0 o 1); aquí solo se consultan, verificar o asignar un pedido son escrituras y no se llaman
import React from 'react'
import '@/global/components/UI/molecules/DataTable/DataTable.css'
import './StageOrders.css'
import { formatCOP } from '@/global/helpers/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { Pagination } from '@/global/components/UI/molecules/Pagination'
import { TableMessageRow } from '@/global/components/UI/molecules/DataTable/TableMessageRow'
import { useStageOrdersLoader } from '../hooks/useStageOrdersLoader'
import { selectManagement } from '../selectors/management.selectors'
import { setOrdersPage } from '../slices/management.slice'
import { loadStageOrdersThunk } from '../thunks/management.thunks'

const COLUMNS = 6

export const StageOrders: React.FC = () => {
  const dispatch = useAppDispatch()
  const { orders } = useAppSelector(selectManagement)
  useStageOrdersLoader()

  const message = (() => {
    if (orders.status === 'failed') return orders.error
    if (orders.items.length === 0 && (orders.status === 'idle' || orders.status === 'loading')) return 'Cargando pedidos…'
    if (orders.items.length === 0) return 'No hay pedidos en esta etapa y canal.'
    return null
  })()

  return (
    <div className="stage-orders">
      <div className="data-table-card">
        <div className="data-table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Control</th>
                <th className="data-table-number">Total</th>
              </tr>
            </thead>
            <tbody>
              {message ? (
                <TableMessageRow colSpan={COLUMNS} message={message} isError={orders.status === 'failed'} onRetry={orders.status === 'failed' ? () => dispatch(loadStageOrdersThunk()) : undefined} />
              ) : (
                orders.items.map((order) => (
                  <tr key={order.id}>
                    <td className="data-table-strong">{order.serialCode ? `PD-${order.serialCode}` : `Venta ${order.id}`}</td>
                    <td>{order.createdAt || '—'}</td>
                    <td>{order.customerName}</td>
                    <td>{order.sellerName}</td>
                    <td>
                      <span className="stage-orders-flags">
                        {order.paused && <span className="stage-orders-flag stage-orders-flag-warn">Pausado</span>}
                        <span className={`stage-orders-flag ${order.transactionVerified ? 'stage-orders-flag-ok' : ''}`}>{order.transactionVerified ? 'Pago verificado' : 'Pago sin verificar'}</span>
                        <span className={`stage-orders-flag ${order.locationVerified ? 'stage-orders-flag-ok' : ''}`}>{order.locationVerified ? 'Ubicación verificada' : 'Ubicación sin verificar'}</span>
                      </span>
                    </td>
                    <td className="data-table-number">{formatCOP(order.totalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {orders.meta && <Pagination meta={orders.meta} disabled={orders.status === 'loading'} label="Paginación de pedidos de la etapa" onPageChange={(next) => dispatch(setOrdersPage(next))} />}
    </div>
  )
}

export default StageOrders

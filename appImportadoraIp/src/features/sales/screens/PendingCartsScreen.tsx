// PendingCartsScreen · pantalla de Tienda > Bandeja de Pedidos: carritos guardados del vendedor, que se pueden retomar en el carrito
// conecta con: sales.selectors/slice, useSalesList (la pide), shop (resumeCartThunk, setCartDrawerOpen) y global Pagination; la monta MainContent (screenRegistry)
// ojo: POST /sales/pendings devuelve carritos (uuid, líneas y unidades), no ventas. Retomar lee primero las líneas de ese carrito y solo si llegan bien cambia el uuid y el cliente de la venta activa
import React from 'react'
import './SalesScreen.css'
import { formatCOP } from '@/global/helpers/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { TableMessageRow } from '@/global/components/UI/molecules/DataTable/TableMessageRow'
import { Pagination } from '@/global/components/UI/molecules/Pagination'
import { resumeCartThunk, setCartDrawerOpen } from '@/features/shop'
import { useSalesList } from '../hooks/useSalesList'
import { selectPending } from '../selectors/sales.selectors'
import { setPendingPage } from '../slices/sales.slice'
import { loadPendingCartsThunk } from '../thunks/sales.thunks'
import type { PendingCart } from '../types/sales.types'

const COLUMNS = 6

export const PendingCartsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const { items, status, error, meta, page } = useAppSelector(selectPending)
  useSalesList('pending', page)

  // el carrito solo se abre si sus líneas se leyeron bien; si falla, el thunk avisa y el carrito actual no cambia
  const resume = async (cart: PendingCart) => {
    const customer = cart.customerId ? { id: cart.customerId, name: cart.customerName } : null
    const result = await dispatch(resumeCartThunk({ uuid: cart.uuid, customer }))
    if (resumeCartThunk.fulfilled.match(result)) dispatch(setCartDrawerOpen(true))
  }

  const message = (() => {
    if (status === 'failed') return error
    if (items.length === 0 && (status === 'idle' || status === 'loading')) return 'Cargando pedidos pendientes…'
    if (items.length === 0) return 'No hay pedidos pendientes.'
    return null
  })()

  return (
    <div className="sales-screen">
      <div className="data-table-card">
        <div className="data-table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th className="data-table-number">Líneas / unidades</th>
                <th className="data-table-number">Total</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {message ? (
                <TableMessageRow colSpan={COLUMNS} message={message} isError={status === 'failed'} onRetry={status === 'failed' ? () => dispatch(loadPendingCartsThunk()) : undefined} />
              ) : (
                items.map((cart) => (
                  <tr key={cart.uuid}>
                    <td>{cart.createdAt || '—'}</td>
                    <td className="data-table-strong">{cart.customerName}</td>
                    <td>{cart.sellerName}</td>
                    <td className="data-table-number">
                      {cart.lines} / {cart.units}
                    </td>
                    <td className="data-table-number">{formatCOP(cart.totalAmount)}</td>
                    <td className="data-table-number">
                      <button type="button" className="data-table-action" onClick={() => resume(cart)}>
                        Retomar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {meta && <Pagination meta={meta} disabled={status === 'loading'} label="Paginación de pedidos pendientes" onPageChange={(next) => dispatch(setPendingPage(next))} />}
    </div>
  )
}

export default PendingCartsScreen

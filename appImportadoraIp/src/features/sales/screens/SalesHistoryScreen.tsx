// SalesHistoryScreen · pantalla de Tienda > Historial de Ventas: tabla de ventas de la bodega activa con paginador
// conecta con: sales.selectors/slice (lista y página), useSalesList (la pide), sales.thunks (anular), usePermissions, global Pagination y ConfirmDialog; la monta MainContent (screenRegistry)
// ojo: anular pide un motivo (mínimo 5 letras), solo se ofrece si el usuario puede borrar en esta pantalla y la venta no está ya anulada ni completada. POST /sales/history responde 500 en el backend de pruebas: el error se muestra dentro de la tabla con "Reintentar" para que la pantalla no quede en blanco
import React, { useState } from 'react'
import './SalesScreen.css'
import { formatCOP } from '@/global/helpers/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { TableMessageRow } from '@/global/components/UI/molecules/DataTable/TableMessageRow'
import { ConfirmDialog } from '@/global/components/UI/molecules/ConfirmDialog'
import { Pagination } from '@/global/components/UI/molecules/Pagination'
import { usePermissions } from '@/global/hooks/usePermissions'
import { SALE_STATUS_LABELS } from '../constants/sales.constants'
import { useSalesList } from '../hooks/useSalesList'
import { selectHistory } from '../selectors/sales.selectors'
import { setHistoryPage } from '../slices/sales.slice'
import { cancelSaleThunk, loadSalesHistoryThunk } from '../thunks/sales.thunks'
import { canCancelSale, MIN_CANCEL_REASON } from '../helpers/sales.cancel'
import type { SaleRow } from '../types/sales.types'

const COLUMNS = 7

export const SalesHistoryScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const { items, status, error, meta, page } = useAppSelector(selectHistory)
  useSalesList('history', page)
  const { canPerformAction } = usePermissions()
  const mayCancel = canPerformAction('shop', 'history', 'delete')
  const [target, setTarget] = useState<SaleRow | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const closeDialog = () => {
    if (busy) return
    setTarget(null)
    setReason('')
  }
  const confirmCancel = async () => {
    if (!target) return
    setBusy(true)
    const result = await dispatch(cancelSaleThunk({ saleId: target.id, reason }))
    setBusy(false)
    if (!cancelSaleThunk.fulfilled.match(result)) return // falló: el aviso ya salió y el diálogo queda abierto para reintentar
    setTarget(null)
    setReason('')
  }

  const message = (() => {
    if (status === 'failed') return error
    if (items.length === 0 && (status === 'idle' || status === 'loading')) return 'Cargando ventas…'
    if (items.length === 0) return 'No hay ventas registradas en esta bodega.'
    return null
  })()

  return (
    <div className="sales-screen">
      <div className="data-table-card">
        <div className="data-table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th className="data-table-number">Total</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {message ? (
                <TableMessageRow colSpan={COLUMNS} message={message} isError={status === 'failed'} onRetry={status === 'failed' ? () => dispatch(loadSalesHistoryThunk()) : undefined} />
              ) : (
                items.map((sale) => (
                  <tr key={sale.id}>
                    <td className="data-table-strong">{sale.serialCode ? `PD-${sale.serialCode}` : `Venta ${sale.id}`}</td>
                    <td>{sale.createdAt || '—'}</td>
                    <td>{sale.customerName}</td>
                    <td>{sale.sellerName}</td>
                    <td>
                      <span className="sales-table-status">{SALE_STATUS_LABELS[sale.status.toLowerCase()] ?? (sale.status || '—')}</span>
                    </td>
                    <td className="data-table-number">{formatCOP(sale.totalAmount)}</td>
                    <td className="data-table-number">
                      {mayCancel && canCancelSale(sale.status) && (
                        <button type="button" className="data-table-action" onClick={() => setTarget(sale)}>
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={target !== null}
        title="¿Anular esta venta?"
        message={`Se anulará ${target?.serialCode ? `el pedido PD-${target.serialCode}` : `la venta ${target?.id}`} y el backend devolverá el stock si aplica. Esta acción no se puede deshacer.`}
        confirmLabel={busy ? 'Anulando…' : 'Anular venta'}
        confirmDisabled={busy || reason.trim().length < MIN_CANCEL_REASON}
        onConfirm={confirmCancel}
        onCancel={closeDialog}
      >
        <textarea className="confirm-dialog-field" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={`Motivo de la anulación (mínimo ${MIN_CANCEL_REASON} letras)`} aria-label="Motivo de la anulación" maxLength={200} />
      </ConfirmDialog>
      {meta && <Pagination meta={meta} disabled={status === 'loading'} label="Paginación del historial de ventas" onPageChange={(next) => dispatch(setHistoryPage(next))} />}
    </div>
  )
}

export default SalesHistoryScreen

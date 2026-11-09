// CashExpensesTable · tarjeta de Facturas: lo que pagan las cajas de todas las bodegas (recepciones de compra y gastos), con buscador, bodega y fechas, y la tabla
// conecta con: useCashExpenses (datos y filtros), warehouses (lista para el filtro), SearchBar, FilterSelect, DataTable, Pagination y global format; la monta CashExpensesScreen
// ojo: un gasto entra aquí cuando su caja cierra; el valor es lo que salió de la caja en efectivo; la lista la ve solo quien tiene permiso de ver el detalle de caja (lo exige el backend)
import React from 'react'
import './CashExpensesTable.css'
import { selectWarehouses } from '@/features/warehouses'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { formatCOP, formatDateTime } from '@/global/helpers/formatting/format'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { hasCashExpenseFilters } from '../helpers/cashExpenses.adapter'
import { useCashExpenses } from '../hooks/useCashExpenses'

export const CashExpensesTable: React.FC = () => {
  const list = useCashExpenses()
  const warehouses = useAppSelector(selectWarehouses)
  const warehouseOptions = [{ value: 'all', label: 'Todas las bodegas' }, ...warehouses.map((wh) => ({ value: String(wh.id), label: wh.name }))]
  const pageTotal = list.items.reduce((sum, item) => sum + item.total, 0)

  const message = list.error ? list.error : list.loading ? 'Cargando facturas de las cajas…' : list.items.length === 0 ? (hasCashExpenseFilters(list.filters) ? 'No hay pagos que coincidan con los filtros.' : 'Todavía no hay pagos de caja registrados: aparecen cuando una caja cierra.') : null

  return (
    <div className="data-card">
      <div className="data-toolbar cash-expenses-toolbar">
        <SearchBar
          value={list.filters.query}
          onChange={(value) => list.setFilter('query', value)}
          hasActiveFilters={hasCashExpenseFilters(list.filters)}
          onClear={list.clearFilters}
          placeholder="Buscar por proveedor, orden, recibo o concepto…"
          className="cash-expenses-search"
        />
        <FilterSelect label="Bodega" emptyValue="all" value={list.filters.warehouseId} options={warehouseOptions} onChange={(value) => list.setFilter('warehouseId', value || 'all')} />
        <label className="cash-expenses-date">
          <span>Desde</span>
          <input type="date" value={list.filters.from} max={list.filters.to || undefined} onChange={(e) => list.setFilter('from', e.target.value)} aria-label="Cierre desde" />
        </label>
        <label className="cash-expenses-date">
          <span>Hasta</span>
          <input type="date" value={list.filters.to} min={list.filters.from || undefined} onChange={(e) => list.setFilter('to', e.target.value)} aria-label="Cierre hasta" />
        </label>
        <span className="cash-expenses-total" title="Suma de lo que muestra la página">
          Total de la página: <strong>{formatCOP(pageTotal)}</strong>
        </span>
      </div>

      <DataTable tableId="cash-expenses">
        <thead>
          <tr>
            <th>Cierre de caja</th>
            <th>Bodega</th>
            <th>Tipo</th>
            <th>Concepto</th>
            <th>Proveedor / orden</th>
            <th>Recibo</th>
            <th>Caja de</th>
            <th className="cash-expenses-num">Valor</th>
          </tr>
        </thead>
        <tbody>
          {message ? (
            <tr>
              <td colSpan={8} className="cash-expenses-empty">{message}</td>
            </tr>
          ) : (
            list.items.map((item) => (
              <tr key={item.id}>
                <td>{formatDateTime(item.closedAt)}</td>
                <td>{item.warehouseName}</td>
                <td>{item.typeLabel}</td>
                <td>{item.concept}</td>
                <td>{item.isPurchase ? `${item.supplierName} · ${item.purchaseCode}` : '—'}</td>
                <td>{item.receiptNumber || '—'}</td>
                <td>{item.paidBy}</td>
                <td className="cash-expenses-num">{formatCOP(item.total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      <Pagination meta={list.meta} disabled={list.loading} label="Paginación de facturas" onPageChange={list.setPage} />
    </div>
  )
}

export default CashExpensesTable

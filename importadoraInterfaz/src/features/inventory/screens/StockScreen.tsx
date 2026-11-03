// StockScreen · Inventario > Existencias: lo que hay en la bodega activa por producto y ubicación, con búsqueda, filtros y la acción de asignar un producto a una ubicación
// conecta con: useStockTable (datos y filtros), StockTable, global SearchBar y FilterSelect, Pagination, usePermissions y navigation (abre el panel «assignStock»); la monta MainContent (screenRegistry)
// ojo: búsqueda, ubicación y página las resuelve el servidor; categoría y marca filtran las filas de la página cargada
import React from 'react'
import '../components/InventoryTables.css'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { StockTable } from '../components/table/StockTable'
import { useStockTable } from '../hooks/useStockTable'

export const StockScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const canAssign = usePermissions().canPerformAction('inventory', 'locations', 'update')
  const stock = useStockTable()

  const message =
    stock.status === 'failed'
      ? stock.error
      : stock.warehouseId <= 0
      ? 'Elige una bodega para ver sus existencias.'
      : stock.rows.length === 0
      ? stock.status === 'succeeded'
        ? stock.hasFilters
          ? 'No hay existencias con estos filtros.'
          : 'Esta bodega todavía no tiene existencias.'
        : 'Cargando existencias…'
      : null

  return (
    <div className="inv-screen">
      <div className="inv-card">
        <div className="inv-toolbar">
          <SearchBar value={stock.search} onChange={stock.setSearch} hasActiveFilters={stock.hasFilters} onClear={stock.clearFilters} placeholder="Buscar por código o nombre del producto..." className="inv-search" />
          <FilterSelect label="Ubicación" emptyValue="" value={stock.location} options={stock.locationOptions} onChange={(value) => stock.setLocation(value || '')} />
          <FilterSelect label="Categoría" emptyValue="" value={stock.filters.category} options={stock.categoryOptions} onChange={(value) => stock.setFilter({ category: value || '' })} />
          <FilterSelect label="Marca" emptyValue="" value={stock.filters.brand} options={stock.brandOptions} onChange={(value) => stock.setFilter({ brand: value || '' })} />
          <div className="inv-toolbar-actions">
            {stock.meta && <span className="inv-count">{stock.meta.totalRecords} registros</span>}
            <button
              type="button"
              className="btn-primary"
              disabled={!canAssign || stock.warehouseId <= 0}
              title={canAssign ? undefined : 'Requiere permiso para editar existencias'}
              onClick={() => dispatch(openDrawerForm({ kind: 'assignStock', payload: { onDone: stock.reload } }))}
            >
              + Asignar producto
            </button>
          </div>
        </div>
        <StockTable rows={stock.rows} message={message} locationCounts={stock.locationCounts} productSums={stock.productSums} totals={stock.totals} />
      </div>
      {stock.meta && <Pagination meta={stock.meta} disabled={stock.status === 'loading'} label="Paginación de existencias" onPageChange={stock.setPage} />}
    </div>
  )
}

export default StockScreen

// WarehouseProductsTable · tabla de existencias de la bodega activa dentro del módulo de Traslados
// acciones (RowActions con íconos de línea, según permisos): ver detalles, reubicar dentro de la bodega, y solicitar traslado desde otra bodega
// conecta con: useWarehouseStock (las pide) y WarehouseStockRow (cada fila con sus acciones)
import React, { useState } from 'react'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { useWarehouseStock } from '../../hooks/useWarehouseStock'
import { WarehouseStockRow } from './WarehouseStockRow'
import './WarehouseProductsTable.css'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

interface WarehouseProductsTableProps {
  warehouseId: number
  warehouseName?: string
  externalQuery?: string
  hideToolbar?: boolean
}

export const WarehouseProductsTable: React.FC<WarehouseProductsTableProps> = ({
  warehouseId,
  warehouseName,
  externalQuery,
  hideToolbar = false,
}) => {
  const [internalQuery, setInternalQuery] = useState('')
  const query = externalQuery !== undefined ? externalQuery : internalQuery
  const { items, status, error, reload: loadStock } = useWarehouseStock(warehouseId, query)
  const loading = status === 'idle' || status === 'loading'
  const { pageItems, meta, setPage } = usePagedList(items, items)

  return (
    <div className={hideToolbar ? 'wh-products-card wh-products-card-bare' : 'wh-products-card'}>
      {!hideToolbar && (
        <div className="wh-products-toolbar">
          <SearchBar
            value={query}
            placeholder="Buscar repuesto, código o estante en esta bodega..."
            onChange={setInternalQuery}
            className="wh-products-search"
          />
          <span className="wh-products-count">
            {warehouseName ? `${warehouseName} · ` : ''}
            {items.length} repuestos
          </span>
        </div>
      )}

      <DataTable tableId="transfers-warehouse-products" className="inv-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Marca</th>
              <th>Ubicación</th>
              <th className="inv-num">Físico</th>
              <th className="inv-num">Reservado</th>
              <th className="inv-num">Vendible</th>
              <th className="inv-actions-header">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="inv-message">
                  <p>Cargando existencias de la bodega…</p>
                </td>
              </tr>
            ) : status === 'failed' ? (
              <tr>
                <td colSpan={8} className="inv-message">
                  <p>{error}</p>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="inv-message">
                  <p>No se encontraron repuestos con existencias en esta bodega.</p>
                </td>
              </tr>
            ) : (
              pageItems.map((row) => <WarehouseStockRow key={row.stockId} row={row} warehouseId={warehouseId} onRelocated={loadStock} />)
            )}
          </tbody>
        </DataTable>
      <Pagination meta={meta} label="Paginación de existencias" onPageChange={setPage} />
    </div>
  )
}

export default WarehouseProductsTable

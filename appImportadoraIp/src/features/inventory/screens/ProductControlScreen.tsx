// ProductControlScreen · pantalla de Gestión Inventario > Control de Productos: existencias por producto y bodega, reservado, disponible y alerta de poco stock
// conecta con: inventory.selectors/slice (lista, búsqueda y filtro), useInventoryLoader (la pide), global SearchBar y Pagination; la monta MainContent (screenRegistry)
// ojo: con texto la búsqueda la hace el backend y no pagina (hasta 50 resultados); sin texto se pagina por bodega activa. "Reservado" suma carritos, verificación, alistamiento y por facturar
import React from 'react'
import './ProductControlScreen.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { TableMessageRow } from '@/global/components/UI/molecules/DataTable/TableMessageRow'
import { Pagination } from '@/global/components/UI/molecules/Pagination'
import { SearchBar } from '@/global/components/UI/molecules/SearchBar'
import { useInventoryLoader } from '../hooks/useInventoryLoader'
import { selectInventory } from '../selectors/inventory.selectors'
import { setInventoryOnlyInStock, setInventoryPage, setInventoryQuery } from '../slices/inventory.slice'
import { loadInventoryThunk } from '../thunks/inventory.thunks'

const COLUMNS = 6

export const ProductControlScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const { items, status, error, meta, query, onlyInStock } = useAppSelector(selectInventory)
  useInventoryLoader()

  const searching = query.trim() !== ''
  const message = (() => {
    if (status === 'failed') return error
    if (items.length === 0 && (status === 'idle' || status === 'loading')) return 'Cargando inventario…'
    if (items.length === 0) return searching ? 'Ningún producto coincide con la búsqueda.' : 'No hay productos para mostrar.'
    return null
  })()

  return (
    <div className="inventory-screen">
      <div className="data-table-card">
        <div className="inventory-toolbar">
          <SearchBar value={query} onChange={(value) => dispatch(setInventoryQuery(value))} placeholder="Buscar por código, descripción, marca, modelo o categoría..." className="inventory-search" />
          <label className="inventory-check">
            <input type="checkbox" checked={onlyInStock} disabled={searching} onChange={(event) => dispatch(setInventoryOnlyInStock(event.target.checked))} />
            Solo con stock
          </label>
        </div>
        <div className="data-table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Ubicaciones</th>
                <th className="data-table-number">Bodega activa</th>
                <th className="data-table-number">Total físico</th>
                <th className="data-table-number">Reservado</th>
                <th className="data-table-number">Disponible</th>
              </tr>
            </thead>
            <tbody>
              {message ? (
                <TableMessageRow colSpan={COLUMNS} message={message} isError={status === 'failed'} onRetry={status === 'failed' ? () => dispatch(loadInventoryThunk()) : undefined} />
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={item.lowStock ? 'inventory-row-low' : ''}>
                    <td>
                      <span className="data-table-strong">{item.name}</span>
                      <div className="data-table-sub">{[item.code, item.brand, item.model].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>{item.locations.length === 0 ? '—' : item.locations.map((row) => `${row.code} (${row.stock})`).join(', ')}</td>
                    <td className="data-table-number">{item.warehouseStock}</td>
                    <td className="data-table-number">
                      {item.physicalTotal}
                      {item.lowStock && <span className="inventory-low">Poco stock (mín. {item.minStock})</span>}
                    </td>
                    <td className="data-table-number">{item.reserved}</td>
                    <td className="data-table-number data-table-strong">{item.available}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {meta && <Pagination meta={meta} disabled={status === 'loading'} label="Paginación del inventario" onPageChange={(next) => dispatch(setInventoryPage(next))} />}
    </div>
  )
}

export default ProductControlScreen

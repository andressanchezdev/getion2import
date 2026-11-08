// ProductWarehousesSection · sección «Ubicaciones y Existencias por Sede» del detalle de un producto: vendibles, físico y reservado por bodega
// conecta con: ProductDetailPanel (la pinta); recibe las existencias de useProductStock y las bodegas de warehouses
import React from 'react'
import type { Product } from '@/features/shop'
import type { StockFullDto } from '../../../types/inventory.api.types'

interface Props {
  product: Product
  warehouses: Array<{ id: string | number; name: string; code?: string }>
  stockRows: StockFullDto[]
  loading: boolean
}

// suma un campo numérico de las filas de una bodega
const sum = (rows: StockFullDto[], pick: (row: StockFullDto) => number | undefined) => rows.reduce((total, row) => total + (pick(row) || 0), 0)

// tarjetas con las existencias del producto en cada sede
export const ProductWarehousesSection: React.FC<Props> = ({ product, warehouses, stockRows, loading }) => {
  return (
    <div className="product-detail-section">
      <h4 className="product-section-title">Existencias por Sede</h4>
      {loading ? (
        <p className="product-detail-muted">Cargando existencias de las sedes...</p>
      ) : (
        <div className="product-warehouses-grid">
          {warehouses.map((wh, idx) => {
            const rows = stockRows.filter((r) => String(r.warehouseId) === String(wh.id))
            const sellable = rows.length > 0 ? sum(rows, (r) => r.sellable) : (product.stockByWarehouse?.[wh.id] ?? 0)
            const code = wh.code || `B-${String(idx + 1).padStart(2, '0')}`
            // un producto puede estar en varias ubicaciones de la misma bodega: se muestran todas con sus unidades
            const places = rows.filter((r) => r.location).sort((a, b) => (b.available || 0) - (a.available || 0))

            return (
              <div key={wh.id} className="product-warehouse-card">
                <div className="pwh-card-top">
                  <span className="pwh-code-badge">{code}</span>
                  <div className="pwh-info-col">
                    <span className="pwh-name">{wh.name}</span>
                    <span className="pwh-loc">{places.length === 0 ? product.location || 'Sin estante asignado' : places.length === 1 ? places[0].location : `${places.length} ubicaciones`}</span>
                  </div>
                  <div className="pwh-qty-col">
                    <span className={`pwh-vendible-num ${sellable <= 0 ? 'is-zero' : ''}`}>{sellable}</span>
                    <span className="pwh-vendible-lbl">vendibles</span>
                  </div>
                </div>
                {places.length > 1 && (
                  <ul className="pwh-places">
                    {places.map((place) => (
                      <li key={place.stockId} className="pwh-place">
                        <span className="pwh-place-code">{place.location}</span>
                        <span className="pwh-place-qty">{place.available} uds</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="pwh-card-bottom">
                  <span className="pwh-detail-stat">Físico en bodega: <strong>{sum(rows, (r) => r.available)}</strong></span>
                  <span className="pwh-detail-stat">Reservado: <strong>{sum(rows, (r) => r.reserved)}</strong></span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProductWarehousesSection

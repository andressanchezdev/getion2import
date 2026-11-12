// ProductLocationsPanel · panel lateral para ver las ubicaciones físicas y existencias por bodega de un producto
// conecta con: ProductsTable (lo abre con openDrawerForm kind: 'productLocations'), useProductStock (existencias) y formRegistry
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './ProductLocationsPanel.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectWarehouses } from '@/features/warehouses'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import type { Product } from '@/features/shop'
import { useProductStock } from '../../hooks/useProductStock'

interface ProductLocationsPanelProps {
  product: Product
}

export const ProductLocationsPanel: React.FC<ProductLocationsPanelProps> = ({ product }) => {
  const dispatch = useAppDispatch()
  const warehouses = useAppSelector(selectWarehouses)

  const { items: stockRows, status, error: errorMsg } = useProductStock(Number(product.id))
  const loading = status === 'idle' || status === 'loading'

  // Unir los almacenes registrados con las filas de stock encontradas
  const rowsByWarehouse = warehouses.map((wh) => {
    const matching = stockRows.filter((r) => String(r.warehouseId) === String(wh.id))
    return {
      warehouse: wh,
      rows: matching,
      totalSellable: matching.reduce((sum, r) => sum + (r.sellable || 0), 0),
      totalAvailable: matching.reduce((sum, r) => sum + (r.available || 0), 0),
      totalReserved: matching.reduce((sum, r) => sum + (r.reserved || 0), 0),
    }
  })

  return (
    <div className="drawer-form product-locations-panel">
      <div className="drawer-form-body product-locations-body">
        {/* Cabecera con datos del producto */}
        <div className="product-locations-header-card">
          <div className="product-locations-code-badge">{product.code}</div>
          <h3 className="product-locations-prod-name">{product.name}</h3>
          <div className="product-locations-meta-line">
            {product.brand && <span>Marca: <b>{product.brand}</b></span>}
            {product.category && <span>Categoría: <b>{product.category}</b></span>}
          </div>
        </div>

        {errorMsg && <div className="form-field-error-msg">{errorMsg}</div>}

        <h4 className="product-locations-section-title">Ubicaciones y existencias por bodega</h4>

        {loading ? (
          <div className="product-locations-loading">Consultando bodegas y ubicaciones…</div>
        ) : (
          <div className="product-locations-list">
            {rowsByWarehouse.map(({ warehouse, rows, totalSellable, totalAvailable, totalReserved }) => (
              <div key={warehouse.id} className="product-warehouse-card">
                <div className="product-warehouse-head">
                  <div className="product-warehouse-info">
                    <span className="product-warehouse-code">{warehouse.code || `B-${warehouse.id}`}</span>
                    <span className="product-warehouse-name">{warehouse.name}</span>
                  </div>
                  <div className="product-warehouse-sellable">
                    <span className="product-warehouse-qty-label">Vendible</span>
                    <span className="product-warehouse-qty-value">{totalSellable}</span>
                  </div>
                </div>

                <div className="product-warehouse-breakdown">
                  <div className="product-breakdown-col">
                    <span className="breakdown-lbl">Físico en bodega</span>
                    <span className="breakdown-val">{totalAvailable}</span>
                  </div>
                  <div className="product-breakdown-col">
                    <span className="breakdown-lbl">Reservado</span>
                    <span className="breakdown-val">{totalReserved}</span>
                  </div>
                </div>

                {rows.length > 0 ? (
                  <div className="product-location-subrows">
                    <div className="product-location-subrow-head">
                      <span>Ubicación física</span>
                      <span>Vendible</span>
                    </div>
                    {rows.map((r) => (
                      <div key={r.stockId} className="product-location-subrow">
                        <span className="loc-tag">{r.location || 'Sin estante asignado'}</span>
                        <span className="loc-qty">{r.sellable} unid.</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="product-location-empty">Sin existencias registradas en esta bodega</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="drawer-form-footer product-locations-footer">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => dispatch(closeDrawerForm())}
        >
          Cerrar
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            dispatch(closeDrawerForm())
            dispatch(openDrawerForm({ kind: 'createTransfer', payload: { product } }))
          }}
        >
          Solicitar traslado
        </button>
      </div>
    </div>
  )
}

export default ProductLocationsPanel

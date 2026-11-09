// TransferProductPicker · buscador de repuestos del pedido de traslado: cada resultado muestra sus bodegas con existencias para agregarlo con un clic
// conecta con: CreateTransferForm (lo pinta), useTransferRequest (búsqueda y agregar) y transfers.types
// ojo: la bodega que recibe no aparece como origen (no se pide a sí misma); las bodegas sin disponible salen apagadas; si el administrador ya eligió la bodega de origen, solo se ofrece esa
import React from 'react'
import type { ProductStockMatrix } from '../../types/transfers.types'

interface Props {
  search: string
  onSearch: (value: string) => void
  products: ProductStockMatrix[]
  searching: boolean
  destWarehouseId: number
  originWarehouseId?: number // administrador: solo se ofrece esta bodega de origen
  onAdd: (product: ProductStockMatrix, warehouseId: number) => void
  onSelectProduct?: (product: { id: number; code: string; name: string }) => void
}

// buscador y lista de resultados con sus bodegas de origen posibles
export const TransferProductPicker: React.FC<Props> = ({ search, onSearch, products, searching, destWarehouseId, originWarehouseId, onAdd, onSelectProduct }) => (
  <section className="transfer-req-section">
    <div className="transfer-picker-header">
      <label className="transfer-select-label" htmlFor="transfer-search">
        Buscar repuestos para agregar
      </label>
      <span className="transfer-picker-hint">Escribe código o descripción</span>
    </div>
    <input
      id="transfer-search"
      type="text"
      className="transfer-select-control"
      placeholder="Ej: PA-1042 o Pastillas..."
      value={search}
      onChange={(event) => onSearch(event.target.value)}
      autoFocus
    />

    {search.trim() !== '' && (
      <ul className="transfer-req-results">
        {products.length === 0 && <li className="transfer-req-note">{searching ? 'Buscando repuestos…' : 'No se encontraron repuestos con ese criterio.'}</li>}
        {products.map((product) => (
          <li key={product.productId} className="transfer-req-result">
            <div
              className={`transfer-req-result-text ${onSelectProduct ? 'is-clickable' : ''}`}
              onClick={() => onSelectProduct?.({ id: product.productId, code: product.code, name: product.description })}
              title="Clic para ver desglose completo de sedes"
            >
              <strong>{product.code}</strong>
              <span>{product.description}</span>
            </div>
            <div className="transfer-req-chips">
              {product.locations
                .filter((location) => location.warehouseId !== destWarehouseId && (!originWarehouseId || location.warehouseId === originWarehouseId))
                .map((location) => (
                  <button
                    key={location.warehouseId}
                    type="button"
                    className="transfer-req-chip"
                    disabled={location.availableStock <= 0}
                    title={location.availableStock > 0 ? `Pedir 1 unidad a ${location.warehouseName}` : `${location.warehouseName} no tiene disponible`}
                    onClick={() => onAdd(product, location.warehouseId)}
                  >
                    {location.warehouseName} · {location.availableStock} uds
                  </button>
                ))}
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
)

export default TransferProductPicker

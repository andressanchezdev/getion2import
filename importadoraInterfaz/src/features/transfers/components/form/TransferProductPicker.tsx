// TransferProductPicker · buscador de repuestos del pedido de traslado: cada resultado muestra sus bodegas con existencias para agregarlo con un clic
// conecta con: CreateTransferForm (lo pinta), useTransferRequest (búsqueda y agregar) y transfers.types
// ojo: la bodega que recibe no aparece como origen (no se pide a sí misma); las bodegas sin disponible salen apagadas
import React from 'react'
import type { ProductStockMatrix } from '../../types/transfers.types'

interface Props {
  search: string
  onSearch: (value: string) => void
  products: ProductStockMatrix[]
  searching: boolean
  destWarehouseId: number
  onAdd: (product: ProductStockMatrix, warehouseId: number) => void
}

// buscador y lista de resultados con sus bodegas de origen posibles
export const TransferProductPicker: React.FC<Props> = ({ search, onSearch, products, searching, destWarehouseId, onAdd }) => (
  <section className="transfer-req-section">
    <label className="transfer-select-label" htmlFor="transfer-search">
      Agregar repuestos
    </label>
    <input
      id="transfer-search"
      type="text"
      className="transfer-select-control"
      placeholder="Código o descripción…"
      value={search}
      onChange={(event) => onSearch(event.target.value)}
    />

    {search.trim() !== '' && (
      <ul className="transfer-req-results">
        {products.length === 0 && <li className="transfer-req-note">{searching ? 'Buscando…' : 'No se encontraron repuestos.'}</li>}
        {products.map((product) => (
          <li key={product.productId} className="transfer-req-result">
            <div className="transfer-req-result-text">
              <strong>{product.code}</strong>
              <span>{product.description}</span>
            </div>
            <div className="transfer-req-chips">
              {product.locations
                .filter((location) => location.warehouseId !== destWarehouseId)
                .map((location) => (
                  <button
                    key={location.warehouseId}
                    type="button"
                    className="transfer-req-chip"
                    disabled={location.availableStock <= 0}
                    title={location.availableStock > 0 ? `Pedir a ${location.warehouseName}` : `${location.warehouseName} no tiene disponible`}
                    onClick={() => onAdd(product, location.warehouseId)}
                  >
                    {location.warehouseName} · {location.availableStock}
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

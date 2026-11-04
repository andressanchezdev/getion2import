// TransferRequestLines · el pedido de traslado: repuestos en borrador con selector de bodega origen, control de cantidades y visualización del movimiento
// conecta con: CreateTransferForm (la pinta) y useTransferRequest (cambiar origen, cantidad y quitar líneas)
import React from 'react'
import type { TransferRequestLine } from '../../types/transfers.types'

interface Props {
  lines: TransferRequestLine[]
  onChangeOrigin?: (productId: number, currentOriginWarehouseId: number, newOriginWarehouseId: number) => void
  onQuantity: (line: TransferRequestLine, quantity: number) => void
  onRemove: (line: TransferRequestLine) => void
  onClear?: () => void
}

export const TransferRequestLines: React.FC<Props> = ({
  lines,
  onChangeOrigin,
  onQuantity,
  onRemove,
  onClear,
}) => {
  if (lines.length === 0) {
    return (
      <div className="transfer-req-empty">
        <span className="transfer-empty-icon" aria-hidden="true">📦</span>
        <strong>Sin repuestos en la solicitud</strong>
        <p className="transfer-req-note">
          Haz clic en el indicador <strong>«Total red»</strong> de cualquier repuesto en el catálogo para agregarlo a esta solicitud de traslado.
        </p>
      </div>
    )
  }

  // Contar bodegas de origen distintas
  const uniqueOrigins = Array.from(new Set(lines.map((l) => l.originWarehouseId)))

  return (
    <div className="transfer-draft-container">
      <div className="transfer-draft-header">
        <div className="transfer-draft-header-title">
          <strong>Repuestos solicitados</strong>
          <span className="transfer-draft-count-pill">{lines.length} {lines.length === 1 ? 'ítem' : 'ítems'}</span>
        </div>
        {onClear && (
          <button
            type="button"
            className="transfer-draft-clear-btn"
            onClick={onClear}
            title="Vaciar todos los ítems de esta solicitud"
          >
            Vaciar lista
          </button>
        )}
      </div>

      <div className="transfer-draft-list">
        {lines.map((line) => {
          const originOptions = line.availableOrigins && line.availableOrigins.length > 0
            ? line.availableOrigins
            : [{ warehouseId: line.originWarehouseId, warehouseName: line.originWarehouseName, stock: line.max }]

          return (
            <article key={`${line.productId}-${line.originWarehouseId}`} className="transfer-draft-card">
              <div className="transfer-draft-card-head">
                <div className="transfer-draft-card-info">
                  <span className="transfer-draft-product-code">{line.code}</span>
                  <strong className="transfer-draft-product-name">{line.description}</strong>
                </div>
                <button
                  type="button"
                  className="transfer-draft-remove-btn"
                  aria-label={`Quitar ${line.code}`}
                  title="Quitar este repuesto"
                  onClick={() => onRemove(line)}
                >
                  ✕
                </button>
              </div>

              <div className="transfer-draft-card-body">
                {/* Selector de bodega origen */}
                <div className="transfer-draft-origin-field">
                  <label className="transfer-field-label" htmlFor={`origin-select-${line.productId}`}>
                    Pedir desde:
                  </label>
                  {originOptions.length > 1 && onChangeOrigin ? (
                    <select
                      id={`origin-select-${line.productId}`}
                      className="transfer-origin-select"
                      value={line.originWarehouseId}
                      onChange={(e) =>
                        onChangeOrigin(line.productId, line.originWarehouseId, Number(e.target.value))
                      }
                    >
                      {originOptions.map((opt) => (
                        <option key={opt.warehouseId} value={opt.warehouseId}>
                          {opt.warehouseName} ({opt.stock} uds disp.)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="transfer-origin-static">
                      <span className="transfer-origin-badge">🏢 {line.originWarehouseName}</span>
                      <small className="transfer-origin-stock">({line.max} uds disp.)</small>
                    </div>
                  )}
                </div>

                {/* Stepper de cantidad */}
                <div className="transfer-draft-qty-field">
                  <label className="transfer-field-label">Cantidad:</label>
                  <div className="transfer-stepper-control">
                    <button
                      type="button"
                      className="transfer-stepper-btn"
                      onClick={() => onQuantity(line, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      aria-label="Disminuir cantidad"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="transfer-stepper-input"
                      min={1}
                      max={line.max}
                      value={line.quantity}
                      aria-label={`Cantidad de ${line.code}`}
                      onChange={(e) => onQuantity(line, Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="transfer-stepper-btn"
                      onClick={() => onQuantity(line, line.quantity + 1)}
                      disabled={line.quantity >= line.max}
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                  <span className="transfer-stepper-max">de {line.max}</span>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {uniqueOrigins.length > 1 && (
        <div className="transfer-multiorigin-notice">
          <span className="transfer-notice-icon">ℹ️</span>
          <span>
            Se crearán <strong>{uniqueOrigins.length} traslados individuales</strong>, uno hacia cada bodega de origen involucrada.
          </span>
        </div>
      )}

      <div className="transfer-catalog-hint">
        <span className="transfer-hint-icon">💡</span>
        <span>Puedes seguir explorando el catálogo; haz clic en el total de otros repuestos para sumarlos aquí.</span>
      </div>
    </div>
  )
}

export default TransferRequestLines

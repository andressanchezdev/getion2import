// TransferDraftSummary · visualización de despachos agrupados por bodega de origen antes de solicitar traslados
import React from 'react'
import { Icon } from '@/global/components/UI/atoms/Icon'
import buildingIcon from '@/assets/icons/building.svg?raw'
import trashIcon from '@/assets/icons/trash.svg?raw'
import lockIcon from '@/assets/icons/lock.svg?raw'
import { totalUnits, type OriginGroup } from '../../helpers/transfers.request'
import type { TransferRequestLine } from '../../types/transfers.types'

interface Props {
  originGroups: OriginGroup[]
  destWarehouseName: string
  onClear: () => void
  onRemoveLine: (line: TransferRequestLine) => void
  onSelectProduct: (product: { id: number; code: string; name: string }) => void
}

export const TransferDraftSummary: React.FC<Props> = ({
  originGroups,
  destWarehouseName,
  onClear,
  onRemoveLine,
  onSelectProduct,
}) => {
  if (originGroups.length === 0) return null

  return (
    <section className="transfer-groups-summary" aria-label="Resumen de despachos a generar">
      <div className="transfer-groups-header">
        <div>
          <h4 className="transfer-groups-title">Despachos que se generarán</h4>
          <span className="transfer-groups-subtitle">
            {originGroups.length} {originGroups.length === 1 ? 'sede origen involucrada' : 'sedes de origen involucradas'}
          </span>
        </div>
        <button type="button" className="transfer-draft-clear-btn" onClick={onClear}>
          Vaciar todo
        </button>
      </div>

      <div className="transfer-groups-list">
        {originGroups.map((group) => {
          const groupQty = totalUnits(group.lines)
          return (
            <div key={group.originWarehouseId} className="transfer-origin-group-card">
              <div className="transfer-group-card-head">
                <div className="transfer-group-badge-title">
                  <Icon svg={buildingIcon} size="sm" className="transfer-group-icon" />
                  <strong>Desde {group.originWarehouseName}</strong>
                </div>
                <span className="transfer-group-count-tag">
                  {group.lines.length} {group.lines.length === 1 ? 'repuesto' : 'repuestos'} · {groupQty} {groupQty === 1 ? 'ud' : 'uds'}
                </span>
              </div>

              <ul className="transfer-group-lines">
                {group.lines.map((l: TransferRequestLine) => (
                  <li key={`${l.productId}-${l.originWarehouseId}`} className="transfer-group-line-row">
                    <div
                      className="transfer-group-line-content"
                      onClick={() => onSelectProduct({ id: l.productId, code: l.code, name: l.description })}
                      title="Clic para editar cantidades de este producto"
                    >
                      <span className="transfer-line-qty-pill">{l.quantity}x</span>
                      <strong className="transfer-line-code">{l.code}</strong>
                      <span className="transfer-line-desc">{l.description}</span>
                    </div>
                    <button
                      type="button"
                      className="transfer-line-del"
                      aria-label={`Quitar ${l.code}`}
                      title={`Quitar de ${group.originWarehouseName}`}
                      onClick={() => onRemoveLine(l)}
                    >
                      <Icon svg={trashIcon} size="sm" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Callout de trazabilidad y privacidad */}
      <div className="transfer-privacy-callout">
        <Icon svg={lockIcon} size="sm" className="transfer-privacy-icon" />
        <div className="transfer-privacy-text">
          <strong>Privacidad y trazabilidad independiente:</strong>
          <p>
            Se {originGroups.length === 1 ? 'creará 1 traslado individual' : `crearán ${originGroups.length} traslados independientes`} hacia <em>{destWarehouseName}</em>. Cada sede origen solo verá y despachará sus propios repuestos asignados.
          </p>
        </div>
      </div>
    </section>
  )
}

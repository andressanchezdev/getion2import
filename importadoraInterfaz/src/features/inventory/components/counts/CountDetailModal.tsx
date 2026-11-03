// CountDetailModal.tsx · modal para ver y actualizar items de un conteo físico
import React, { useState, useEffect } from 'react'
import './CountDetailModal.css'
import { Pill, type PillTone } from '@/global/components/UI/atoms/Pill'
import { formatDate } from '@/global/helpers/formatting/format'
import type { InventoryCount, UpdateCountItemInput } from '../../types/inventory.counts.types'

interface Props {
  count: InventoryCount
  onClose: () => void
  onSaveItems: (countId: number, items: UpdateCountItemInput[]) => Promise<void>
  onVerify: (countId: number) => Promise<void>
  onCorroborate: (countId: number) => Promise<void>
}

const STATUS_TONES: Record<string, PillTone> = {
  pending: 'amber',
  verified: 'blue',
  corroborated: 'green',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  verified: 'Verificado',
  corroborated: 'Corroborado',
}

export const CountDetailModal: React.FC<Props> = ({
  count,
  onClose,
  onSaveItems,
  onVerify,
  onCorroborate,
}) => {
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const isPending = count.status === 'pending'
  const isVerified = count.status === 'verified'

  useEffect(() => {
    if (count.items) {
      const initial: Record<number, number> = {}
      for (const item of count.items) {
        if (item.countedQty != null) {
          initial[item.stockId] = item.countedQty
        }
      }
      setQuantities(initial)
    }
  }, [count])

  const handleQtyChange = (stockId: number, val: string) => {
    const num = parseInt(val, 10)
    setQuantities((prev) => ({
      ...prev,
      [stockId]: isNaN(num) ? 0 : Math.max(0, num),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const itemsToUpdate: UpdateCountItemInput[] = Object.entries(quantities).map(
        ([stockId, countedQty]) => ({
          stockId: Number(stockId),
          countedQty,
        })
      )
      await onSaveItems(count.id, itemsToUpdate)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="count-modal-overlay" onClick={onClose}>
      <div className="count-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="count-modal-header">
          <div className="count-modal-title">
            <span>Conteo Físico #{count.id}</span>
            <Pill tone={STATUS_TONES[count.status] || 'gray'}>
              {STATUS_LABELS[count.status] || count.status}
            </Pill>
          </div>
          <button type="button" className="count-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="count-modal-body">
          <div className="count-modal-info">
            <div className="count-info-item">
              <span className="count-info-label">Bodega</span>
              <span className="count-info-val">{count.warehouseName}</span>
            </div>
            <div className="count-info-item">
              <span className="count-info-label">Responsable</span>
              <span className="count-info-val">{count.employeeName || 'No asignado'}</span>
            </div>
            <div className="count-info-item">
              <span className="count-info-label">Fecha Inicio</span>
              <span className="count-info-val">{formatDate(count.createdAt)}</span>
            </div>
            {count.notes && (
              <div className="count-info-item" style={{ gridColumn: '1 / -1' }}>
                <span className="count-info-label">Notas</span>
                <span className="count-info-val">{count.notes}</span>
              </div>
            )}
          </div>

          <div className="table-scroll">
            <table className="count-items-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Ubicación</th>
                  <th style={{ textAlign: 'right' }}>Stock Esperado</th>
                  <th style={{ textAlign: 'right' }}>Cantidad Contada</th>
                  <th style={{ textAlign: 'center' }}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {count.items && count.items.length > 0 ? (
                  count.items.map((item) => {
                    const counted = quantities[item.stockId] ?? item.countedQty ?? null
                    const diff = counted !== null ? counted - item.expectedQty : null

                    return (
                      <tr key={item.id}>
                        <td>
                          <code>{item.productCode}</code>
                        </td>
                        <td>
                          <strong>{item.productName}</strong>
                        </td>
                        <td>{item.location || 'Principal'}</td>
                        <td style={{ textAlign: 'right' }}>{item.expectedQty}</td>
                        <td style={{ textAlign: 'right' }}>
                          {isPending ? (
                            <input
                              type="number"
                              min={0}
                              className="count-input-qty"
                              value={counted !== null ? counted : ''}
                              onChange={(e) => handleQtyChange(item.stockId, e.target.value)}
                              placeholder="0"
                            />
                          ) : (
                            <span>{item.countedQty ?? '—'}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {diff !== null ? (
                            <span
                              className={`count-diff-badge ${
                                diff === 0
                                  ? 'diff-zero'
                                  : diff > 0
                                  ? 'diff-positive'
                                  : 'diff-negative'
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      No se encontraron artículos en este conteo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="count-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          {isPending && (
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? 'Guardando…' : 'Guardar Cantidades'}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => onVerify(count.id)}
              >
                Verificar Conteo
              </button>
            </>
          )}
          {isVerified && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onCorroborate(count.id)}
            >
              Corroborar y Ajustar Stock
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


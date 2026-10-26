// TransferItemsTable · tabla interactiva de traslados con avance de estado y recepcion
// conecta con: TransfersScreen, TrasladeItem, tokens.css
import React from 'react'
import type { TrasladeItem } from '../types/transfers.types'

// textos de los estados reales y qué estilo de insignia usan (los estilos existentes se llaman pendiente, approved y rejected)
const STATUS_LABELS: Record<string, string> = { verification: 'En verificación', picking: 'En alistamiento', dispatch: 'Despachado', facturar: 'Por facturar', completed: 'Recibido', cancelled: 'Rechazado' }
const BADGE: Record<string, string> = { completed: 'approved', cancelled: 'rejected' }
const CLOSED = ['completed', 'cancelled']
// solo se puede avanzar mientras falte alistar o despachar
const ADVANCE_LABEL: Record<string, string> = { verification: 'Aprobar alistamiento', picking: 'Aprobar despacho' }

interface TransferItemsTableProps {
  items: TrasladeItem[]
  activeTab: 'incoming' | 'outgoing'
  onAdvanceStatus: (item: TrasladeItem) => void
  onReceive: (item: TrasladeItem) => void
}

export const TransferItemsTable: React.FC<TransferItemsTableProps> = ({
  items,
  activeTab,
  onAdvanceStatus,
  onReceive,
}) => {
  if (items.length === 0) {
    return (
      <div className="transfers-empty">
        No hay traslados {activeTab === 'incoming' ? 'entrantes' : 'salientes'} registrados para esta bodega.
      </div>
    )
  }

  return (
    <table className="transfers-table">
      <thead>
        <tr>
          <th>Serial Físico</th>
          <th>Origen ➔ Destino</th>
          <th>Repuestos</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.saleId}>
            <td><span className="transfers-code-chip">#{item.serialCode}</span></td>
            <td>{item.originWarehouse.name} ➔ {item.destWarehouse.name}</td>
            <td>
              {item.products.map((p) => `${p.description} (x${p.quantity})`).join(', ')}
            </td>
            <td>
              <span className={`transfers-badge transfers-badge-${BADGE[item.invoiceStatus] ?? 'pendiente'}`}>
                {STATUS_LABELS[item.invoiceStatus] ?? item.invoiceStatus}
              </span>
              {item.reason && (
                <small style={{ display: 'block', color: 'var(--color-danger)' }}>
                  Nov: {item.reason}
                </small>
              )}
            </td>
            <td>
              {activeTab === 'outgoing' && ADVANCE_LABEL[item.invoiceStatus] && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onAdvanceStatus(item)}
                >
                  {ADVANCE_LABEL[item.invoiceStatus]}
                </button>
              )}
              {activeTab === 'incoming' && !CLOSED.includes(item.invoiceStatus) && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onReceive(item)}
                >
                  Recibir / Novedad
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

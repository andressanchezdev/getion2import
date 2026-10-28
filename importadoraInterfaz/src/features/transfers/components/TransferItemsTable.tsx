// TransferItemsTable · tabla interactiva de traslados con avance de estado y recepcion
// conecta con: TransfersScreen, TrasladeItem, tokens.css
import React from 'react'
import type { TrasladeItem } from '../types/transfers.types'

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
              <span className={`transfers-badge transfers-badge-${item.invoiceStatus}`}>
                {item.invoiceStatus.replace('_', ' ')}
              </span>
              {item.reason && (
                <small style={{ display: 'block', color: 'var(--color-danger)' }}>
                  Nov: {item.reason}
                </small>
              )}
            </td>
            <td>
              {activeTab === 'outgoing' && item.invoiceStatus !== 'approved' && item.invoiceStatus !== 'rejected' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onAdvanceStatus(item)}
                >
                  {item.invoiceStatus === 'pendiente' ? 'Aprobar Picking' : 'Aprobar Empaque'}
                </button>
              )}
              {activeTab === 'incoming' && item.invoiceStatus !== 'approved' && item.invoiceStatus !== 'rejected' && (
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

// InventoryCountsTable.tsx · tabla de auditoría y conteos físicos
import React from 'react'
import './InventoryCountsTable.css'
import { Pill, type PillTone } from '@/global/components/UI/atoms/Pill'
import { formatDate } from '@/global/helpers/formatting/format'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import { RowActions, type RowAction } from '@/global/components/UI/molecules/table/RowActions'
import type { InventoryCount } from '../../types/inventory.counts.types'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

interface Props {
  items: InventoryCount[]
  loading: boolean
  error: string | null
  onOpenDetail: (id: number) => void
  onRetry: () => void
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

export const InventoryCountsTable: React.FC<Props> = ({
  items,
  loading,
  error,
  onOpenDetail,
  onRetry,
}) => {
  const getActions = (count: InventoryCount): RowAction[] => [
    {
      key: 'view',
      label: 'Ver detalle / Contar',
      icon: eyeIcon,
      onClick: () => onOpenDetail(count.id),
    },
  ]

  if (loading && items.length === 0) {
    return (
      <div className="counts-table-empty">
        <p>Cargando conteos físicos…</p>
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="counts-table-empty">
        <p style={{ color: 'var(--c-red-600)' }}>{error}</p>
        <button type="button" className="btn-secondary" style={{ marginTop: '8px' }} onClick={onRetry}>
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <DataTable tableId="inventory-inventory-counts" className="counts-table">
        <thead>
          <tr>
            <th># Conteo</th>
            <th>Bodega</th>
            <th>Responsable</th>
            <th>Estado</th>
            <th>Fecha Inicio</th>
            <th>Fecha Cierre</th>
            <th style={{ textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="counts-table-empty">
                No hay conteos físicos registrados para este filtro.
              </td>
            </tr>
          ) : (
            items.map((count) => (
              <tr
                key={count.id}
                className="counts-table-row"
                onClick={() => onOpenDetail(count.id)}
              >
                <td>
                  <strong>#{count.id}</strong>
                </td>
                <td>{count.warehouseName}</td>
                <td>{count.employeeName || '—'}</td>
                <td>
                  <Pill tone={STATUS_TONES[count.status] || 'gray'}>
                    {STATUS_LABELS[count.status] || count.status}
                  </Pill>
                </td>
                <td>{formatDate(count.createdAt)}</td>
                <td>{count.closedAt ? formatDate(count.closedAt) : '—'}</td>
                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <RowActions actions={getActions(count)} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
  )
}


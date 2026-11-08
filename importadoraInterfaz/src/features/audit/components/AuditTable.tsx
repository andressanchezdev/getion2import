// AuditTable · tabla de movimientos de auditoría (fecha, gestión, acción, quién y registro); cada fila abre su detalle
// conecta con: AuditScreen (la usa), audit.types, RowActions (ícono «Ver detalle») y AuditScreen.css (clases audit-*)
import React from 'react'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import { formatAuditDate } from '../helpers/audit.format'
import type { AuditEntry } from '../types/audit.types'

interface AuditTableProps {
  entries: AuditEntry[]
  onOpen: (entry: AuditEntry) => void
}

export const AuditTable: React.FC<AuditTableProps> = ({ entries, onOpen }) => (
  <DataTable tableId="audit-movements">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Gestión</th>
        <th>Acción</th>
        <th>Quién</th>
        <th>Registro</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {entries.map((entry) => (
        <tr key={entry.id}>
          <td>{formatAuditDate(entry.createdAt)}</td>
          <td>{entry.entityLabel}</td>
          <td><span className="audit-action-chip">{entry.actionLabel}</span></td>
          <td>{entry.actorLabel}</td>
          <td>{entry.entityId ? `#${entry.entityId}` : '—'}</td>
          <td>
            <RowActions actions={[{ key: 'detail', label: 'Ver detalle', icon: eyeIcon, onClick: () => onOpen(entry) }]} />
          </td>
        </tr>
      ))}
    </tbody>
  </DataTable>
)

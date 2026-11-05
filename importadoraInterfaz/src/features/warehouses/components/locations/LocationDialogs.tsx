// LocationDialogs · las dos confirmaciones de la gestión de ubicaciones: desactivar una con existencias y eliminar (con motivo)
// conecta con: WarehouseLocationsManagement; el estado viene de useLocationsManagement; usa ConfirmDialog (global)
import React from 'react'
import { ConfirmDialog } from '@/global/components/UI/molecules/dialogs/ConfirmDialog'
import type { WarehouseLocation } from '@/features/locations'

interface Props {
  toDeactivate: WarehouseLocation | null
  onConfirmDeactivate: () => void
  onCancelDeactivate: () => void
  toDelete: WarehouseLocation | null
  reason: string
  onReason: (value: string) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

export const LocationDialogs: React.FC<Props> = ({ toDeactivate, onConfirmDeactivate, onCancelDeactivate, toDelete, reason, onReason, onConfirmDelete, onCancelDelete }) => (
  <>
    <ConfirmDialog
      open={toDeactivate !== null}
      title="Desactivar ubicación con productos"
      message={`${toDeactivate?.code ?? ''} guarda existencias (${toDeactivate?.units ?? 0} uds). ¿Deseas desactivarla?`}
      confirmLabel="Desactivar"
      onConfirm={onConfirmDeactivate}
      onCancel={onCancelDeactivate}
    />
    <ConfirmDialog
      open={toDelete !== null}
      title="Eliminar ubicación"
      message={`¿Eliminar definitivamente la ubicación ${toDelete?.code ?? ''}? Solo se puede si está vacía.`}
      confirmLabel="Eliminar"
      confirmDisabled={reason.trim().length < 3}
      onConfirm={onConfirmDelete}
      onCancel={onCancelDelete}
    >
      <div className="wh-reason">
        <label className="wh-reason-label" htmlFor="wh-delete-reason">Motivo de la eliminación (mínimo 3 caracteres) *</label>
        <textarea
          id="wh-delete-reason"
          className="wh-reason-input"
          rows={3}
          placeholder="Especifica el motivo por el cual eliminas esta ubicación..."
          value={reason}
          onChange={(e) => onReason(e.target.value)}
          maxLength={200}
          required
        />
      </div>
    </ConfirmDialog>
  </>
)

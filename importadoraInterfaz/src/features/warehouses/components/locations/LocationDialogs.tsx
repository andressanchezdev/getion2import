// LocationDialogs · los dos avisos de la gestión de ubicaciones: desactivar y eliminar, ambos con motivo (se piden en el panel derecho)
// conecta con: WarehouseLocationsManagement; el estado viene de useLocationsManagement; usa ReasonPrompt (features/reasonPrompt)
import React from 'react'
import { ReasonPrompt } from '@/features/reasonPrompt'
import type { WarehouseLocation } from '@/features/locations'

interface Props {
  toDeactivate: WarehouseLocation | null
  onConfirmDeactivate: (reason: string) => void
  onCancelDeactivate: () => void
  toDelete: WarehouseLocation | null
  onConfirmDelete: (reason: string) => void
  onCancelDelete: () => void
}

export const LocationDialogs: React.FC<Props> = ({ toDeactivate, onConfirmDeactivate, onCancelDeactivate, toDelete, onConfirmDelete, onCancelDelete }) => (
  <>
    <ReasonPrompt
      open={toDeactivate !== null}
      title="Desactivar ubicación"
      message={toDeactivate && toDeactivate.units > 0 ? `${toDeactivate.code} guarda existencias (${toDeactivate.units} uds). Seguirán ahí, pero no se podrá elegir para nuevos productos. ¿Desactivarla?` : `¿Desactivar la ubicación ${toDeactivate?.code ?? ''}?`}
      confirmLabel="Desactivar"
      onConfirm={onConfirmDeactivate}
      onCancel={onCancelDeactivate}
    />
    <ReasonPrompt
      open={toDelete !== null}
      title="Eliminar ubicación"
      message={`¿Eliminar la ubicación ${toDelete?.code ?? ''}? Solo se puede si está vacía.`}
      confirmLabel="Eliminar"
      onConfirm={onConfirmDelete}
      onCancel={onCancelDelete}
    />
  </>
)

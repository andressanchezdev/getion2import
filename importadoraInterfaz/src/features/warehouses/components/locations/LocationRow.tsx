// LocationRow · una fila de la gestión de ubicaciones: código, items, ocupación, estado editable y acciones (ver, QR, editar, reubicar, clonar, eliminar)
// conecta con: WarehouseLocationsManagement; las acciones vienen de useLocationsManagement y los permisos de usePermissions
import React from 'react'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { locationLabel, type WarehouseLocation } from '@/features/locations'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import editIcon from '@/assets/icons/edit.svg?raw'
import copyIcon from '@/assets/icons/copy.svg?raw'
import swapIcon from '@/assets/icons/swap.svg?raw'
import trashIcon from '@/assets/icons/trash.svg?raw'
import qrIcon from '@/assets/icons/qr-code.svg?raw'
import { CopyableCell } from '@/global/components/UI/molecules/table/CopyableCell'
import { StatusSelect } from '@/global/components/UI/molecules/table/StatusSelect'

interface Props {
  location: WarehouseLocation
  warehouseId: number
  warehouseName: string
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onDetail: (location: WarehouseLocation) => void
  onRelocate: (location: WarehouseLocation) => void
  onClone: (location: WarehouseLocation) => void
  onDelete: (location: WarehouseLocation) => void
  onStatus: (location: WarehouseLocation, active: boolean) => void
}

export const LocationRow: React.FC<Props> = ({ location, warehouseId, warehouseName, canCreate, canUpdate, canDelete, onDetail, onRelocate, onClone, onDelete, onStatus }) => {
  const dispatch = useAppDispatch()
  const occupied = location.units > 0 || location.productCount > 0
  return (
    <tr className={location.isActive ? '' : 'wh-row-inactive'}>
      <td>
        <span className="inv-code wh-code">
          <CopyableCell text={location.code} label="Ubicación" />
        </span>
      </td>
      <td>{location.description || '—'}</td>
      <td className="wh-num table-amount">
        <strong>{location.units}</strong> uds <small className="wh-skus">({location.productCount} skus)</small>
      </td>
      <td>{occupied ? <Pill tone="amber">Ocupada</Pill> : <Pill tone="green">Desocupada / Libre</Pill>}</td>
      <td>
        <StatusSelect
          value={location.isActive}
          disabled={!canUpdate}
          ariaLabel={`Estado de ${location.code}`}
          title={canUpdate ? 'Cambiar estado' : 'Requiere permiso para editar'}
          onChange={(next) => onStatus(location, next === 'active')}
        />
      </td>
      <td>
        <RowActions
          actions={[
            { key: 'detail', label: 'Ver detalles y productos', icon: eyeIcon, onClick: () => onDetail(location) },
            {
              key: 'qr', label: 'Imprimir QR de ubicación', icon: qrIcon,
              onClick: () => dispatch(openDrawerForm({ kind: 'qrLabels', payload: { heading: `Etiqueta de ${location.code}`, labels: [locationLabel(location, warehouseName)] } })),
            },
            {
              key: 'edit', label: 'Editar ubicación', icon: editIcon, visible: canUpdate,
              onClick: () => dispatch(openDrawerForm({ kind: 'locationForm', payload: { warehouseId, warehouseName, location } })),
            },
            { key: 'relocate', label: 'Reubicar productos', icon: swapIcon, visible: canUpdate, onClick: () => onRelocate(location) },
            { key: 'clone', label: 'Copiar / Clonar ubicación (vacía)', icon: copyIcon, visible: canCreate, onClick: () => onClone(location) },
            { key: 'delete', label: 'Eliminar ubicación (solo si está vacía)', icon: trashIcon, tone: 'danger', visible: canDelete, onClick: () => onDelete(location) },
          ]}
        />
      </td>
    </tr>
  )
}

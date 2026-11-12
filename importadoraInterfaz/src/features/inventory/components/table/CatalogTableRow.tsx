// CatalogTableRow — una fila de la tabla de catálogos: logo opcional, id, nombre, estado como dropdown y acciones heredadas de RowActions
// conecta con: CatalogTable (la pinta), RowActions (acciones en fila) y los iconos de acciones de assets
import React from 'react'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { CopyableCell } from '@/global/components/UI/molecules/table/CopyableCell'
import { StatusSelect } from '@/global/components/UI/molecules/table/StatusSelect'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import editIcon from '@/assets/icons/edit.svg?raw'
import copyIcon from '@/assets/icons/copy.svg?raw'
import trashIcon from '@/assets/icons/trash.svg?raw'
import type { CatalogRow } from '@/features/catalogs'

interface CatalogTableRowProps {
  row: CatalogRow
  singular: string
  withImage: boolean
  deleting: boolean
  cloning?: boolean
  toggling?: boolean
  onView: (row: CatalogRow) => void
  onEdit: (row: CatalogRow) => void
  onClone: (row: CatalogRow) => void
  onDelete: (row: CatalogRow) => void
  onToggleStatus?: (row: CatalogRow) => void
}

// fila con sus botones de acción y dropdown de estado
export const CatalogTableRow: React.FC<CatalogTableRowProps> = ({
  row,
  singular,
  withImage,
  deleting,
  cloning,
  toggling,
  onView,
  onEdit,
  onClone,
  onDelete,
  onToggleStatus,
}) => (
  <tr>
    {withImage && (
      <td>
        {row.image ? <img className="inv-thumb" src={row.image} alt="" loading="lazy" /> : <span className="inv-thumb-empty">—</span>}
      </td>
    )}
    <td>
      <CopyableCell text={row.id} />
    </td>
    <td className="inv-name">{row.name}</td>
    <td>
      <StatusSelect
        value={row.isActive !== false ? 'active' : 'inactive'}
        disabled={toggling}
        ariaLabel={`Cambiar estado de ${row.name}`}
        onChange={(val) => {
          const nextActive = val === 'active'
          if (nextActive !== (row.isActive !== false)) {
            onToggleStatus?.(row)
          }
        }}
      />
    </td>
    <td>
      <RowActions
        actions={[
          { key: 'view', label: `Ver detalles de ${row.name}`, icon: eyeIcon, onClick: () => onView(row) },
          { key: 'edit', label: `Editar ${singular.toLowerCase()}`, icon: editIcon, onClick: () => onEdit(row) },
          { key: 'clone', label: `Clonar ${singular.toLowerCase()}`, icon: copyIcon, visible: !cloning, onClick: () => onClone(row) },
          { key: 'delete', label: `Eliminar ${singular.toLowerCase()}`, icon: trashIcon, tone: 'danger', visible: !deleting, onClick: () => onDelete(row) },
        ]}
      />
    </td>
  </tr>
)

export default CatalogTableRow

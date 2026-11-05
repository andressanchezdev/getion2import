// CatalogTableRow — una fila de la tabla de catálogos: logo opcional, id, nombre, estado como dropdown y acciones heredadas de RowActions
// conecta con: CatalogTable (la pinta), RowActions (acciones en fila) y los iconos de acciones de assets
import React from 'react'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
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
      <span className="inv-code">{row.id}</span>
    </td>
    <td className="inv-name">{row.name}</td>
    <td>
      <select
        className={`inv-status-select ${row.isActive !== false ? 'is-active' : 'is-inactive'}`}
        value={row.isActive !== false ? 'active' : 'inactive'}
        disabled={toggling}
        onChange={(e) => {
          const nextActive = e.target.value === 'active'
          if (nextActive !== (row.isActive !== false)) {
            onToggleStatus?.(row)
          }
        }}
        title="Cambiar estado"
        aria-label={`Cambiar estado de ${row.name}`}
      >
        <option value="active">Activo</option>
        <option value="inactive">Inactivo</option>
      </select>
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

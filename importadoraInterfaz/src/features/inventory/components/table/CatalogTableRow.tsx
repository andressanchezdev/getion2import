// CatalogTableRow — una fila de la tabla de catálogos: logo opcional, id, nombre, estado como dropdown y acciones
// conecta con: CatalogTable (la pinta) y los iconos de acciones de assets
import React from 'react'
import eyeIcon from '@/assets/icons/eye.svg'
import editIcon from '@/assets/icons/edit.svg'
import copyIcon from '@/assets/icons/copy.svg'
import trashIcon from '@/assets/icons/trash.svg'
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
      <div className="inv-actions">
        <button type="button" className="inv-action-btn" title={`Ver detalles de ${row.name}`} onClick={() => onView(row)}>
          <img src={eyeIcon} alt="Ver detalles" />
        </button>
        <button type="button" className="inv-action-btn" title={`Editar ${singular.toLowerCase()}`} onClick={() => onEdit(row)}>
          <img src={editIcon} alt="Editar" />
        </button>
        <button type="button" className="inv-action-btn" title={`Clonar ${singular.toLowerCase()}`} disabled={cloning} onClick={() => onClone(row)}>
          <img src={copyIcon} alt="Clonar" />
        </button>
        <button type="button" className="inv-action-btn" title={`Eliminar ${singular.toLowerCase()}`} disabled={deleting} onClick={() => onDelete(row)}>
          <img src={trashIcon} alt="Eliminar" />
        </button>
      </div>
    </td>
  </tr>
)

export default CatalogTableRow

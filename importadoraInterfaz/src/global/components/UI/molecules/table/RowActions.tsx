// RowActions · columna «Acciones» de las tablas: íconos sin borde en fila (ver, editar, borrar...) con nombre accesible y texto al pasar el cursor
// conecta con: RowActions.css; la usan las tablas de clientes, empleados, cartera, traslados y auditoría
// ojo: cada acción lleva visible según los permisos del usuario (usePermissions); si no queda ninguna se muestra un guion
// ojo: el ícono llega como texto SVG (import con ?raw) y se pinta dentro del botón, así toma el color del texto (normal, peligro o éxito) y siempre se ve; el clic no se propaga a la fila
import React from 'react'
import './RowActions.css'

export interface RowAction {
  key: string
  label: string // texto accesible y del tooltip
  icon: string // contenido del svg (import de assets/icons con ?raw)
  tone?: 'default' | 'danger' | 'success'
  visible?: boolean // false: la acción no se muestra (el usuario no tiene permiso); por defecto se muestra
  onClick: () => void
}

interface RowActionsProps {
  actions: RowAction[]
}

export const RowActions: React.FC<RowActionsProps> = ({ actions }) => {
  const shown = actions.filter((action) => action.visible !== false)
  if (shown.length === 0) return <span className="row-actions-none">—</span>

  return (
  <div className="row-actions">
    {shown.map((action) => (
      <button
        key={action.key}
        type="button"
        className={`row-actions-btn row-actions-btn-${action.tone ?? 'default'}`}
        aria-label={action.label}
        title={action.label}
        onClick={(e) => {
          e.stopPropagation()
          action.onClick()
        }}
      >
        <span className="row-actions-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: action.icon }} />
      </button>
    ))}
  </div>
  )
}

export default RowActions

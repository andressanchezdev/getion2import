// PermissionToggleCard · tarjeta seleccionable con casilla cuadrada (como las gestiones de Grandma's): borde de color y ✓ cuando está activa
// conecta con: PermissionModuleCard (la usa para el módulo completo y para cada pantalla) y PermissionsSelector.css (clases permission-card-*)
import React from 'react'

interface PermissionToggleCardProps {
  label: string
  checked: boolean
  strong?: boolean // la del módulo completo va con el texto resaltado
  disabled?: boolean // solo lectura: la tarjeta se ve pero no se puede cambiar
  onToggle: () => void
  children?: React.ReactNode // permisos finos de la pantalla (siempre visibles; tocar uno activa la pantalla)
}

export const PermissionToggleCard: React.FC<PermissionToggleCardProps> = ({ label, checked, strong = false, disabled = false, onToggle, children }) => (
  <div className={`permission-card ${checked ? 'permission-card-on' : ''}`}>
    <button type="button" className="permission-card-main" role="checkbox" aria-checked={checked} disabled={disabled} onClick={onToggle}>
      <span className={`permission-card-box ${checked ? 'permission-card-box-on' : ''}`} aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      <span className={strong ? 'permission-card-label-strong' : 'permission-card-label'}>{label}</span>
    </button>
    {children}
  </div>
)

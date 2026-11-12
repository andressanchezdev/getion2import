// StatusSelect · dropdown compacto de estado para tablas (activo/inactivo o personalizado) sin romper línea
import React from 'react'
import './StatusSelect.css'

export interface StatusOption {
  value: string
  label: string
}

const DEFAULT_OPTIONS: StatusOption[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

interface StatusSelectProps {
  value: boolean | string
  options?: StatusOption[]
  disabled?: boolean
  onChange: (nextValue: string) => void
  title?: string
  className?: string
  ariaLabel?: string
}

export const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  options = DEFAULT_OPTIONS,
  disabled = false,
  onChange,
  title,
  className = '',
  ariaLabel = 'Estado',
}) => {
  const strVal = typeof value === 'boolean' ? (value ? 'active' : 'inactive') : String(value)
  const isInactive = strVal === 'inactive' || strVal === 'false' || strVal === 'cancelled'

  return (
    <select
      className={`status-select ${isInactive ? 'is-inactive' : 'is-active'} ${className}`.trim()}
      value={strVal}
      disabled={disabled}
      title={title ?? (disabled ? 'Sin permisos para cambiar estado' : 'Cambiar estado')}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export default StatusSelect


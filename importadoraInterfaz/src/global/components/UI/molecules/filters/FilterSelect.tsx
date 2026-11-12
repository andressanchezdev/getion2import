// FilterSelect · lista desplegable de filtro de la barra de una tabla: primera opción seleccionable para «Todos»
import React from 'react'
import './FilterSelect.css'

export interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  label: string // texto accesible
  value: string
  options: FilterSelectOption[]
  emptyValue?: string // valor que significa «sin filtro» (por defecto '')
  allLabel?: string // etiqueta de la opción «Todos»
  className?: string
  disabled?: boolean
  onChange: (value: string) => void
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  options,
  emptyValue = '',
  allLabel,
  className = '',
  disabled = false,
  onChange,
}) => {
  const hasEmptyInOptions = options.some((opt) => opt.value === emptyValue)
  const defaultAllLabel = allLabel || (label.toLowerCase().startsWith('tod') ? label : `Todos (${label})`)

  return (
    <select
      aria-label={label}
      className={`filter-select ${value !== emptyValue && value !== 'all' ? 'filter-select-on' : ''} ${className}`.trim()}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {!hasEmptyInOptions && (
        <option value={emptyValue}>
          {defaultAllLabel}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default FilterSelect

// FilterSelect · lista desplegable de filtro de la barra de una tabla: solo muestra estados permitidos y opciones por defecto, sin placeholder seleccionable
import React from 'react'
import './FilterSelect.css'

export interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  label: string // texto accesible y placeholder inicial cuando no hay valor
  value: string
  options: FilterSelectOption[]
  emptyValue?: string // valor que significa «sin filtro» (por defecto '')
  onChange: (value: string) => void
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  options,
  emptyValue = '',
  onChange,
}) => {
  const hasEmptyInOptions = options.some((opt) => opt.value === emptyValue)

  return (
    <select
      aria-label={label}
      className={`filter-select ${value !== emptyValue ? 'filter-select-on' : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {!hasEmptyInOptions && (
        <option value={emptyValue} disabled hidden>
          {label}
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

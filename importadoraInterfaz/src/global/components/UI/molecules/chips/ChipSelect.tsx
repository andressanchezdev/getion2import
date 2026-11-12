// ChipSelect · lista desplegable con aspecto de chip de filtro con opción seleccionable para «Todos»
import React from 'react'
import './ChipSelect.css'

export interface ChipSelectOption {
  value: string | number
  label: string
}

interface ChipSelectProps {
  label: string
  value: string | number | null
  options: ChipSelectOption[]
  allLabel?: string
  onChange: (value: string | null) => void
  allowEmpty?: boolean
}

export const ChipSelect: React.FC<ChipSelectProps> = ({
  label,
  value,
  options,
  allLabel,
  onChange,
  allowEmpty = true,
}) => {
  const isActive = value !== null && value !== '' && value !== 'all'
  const hasEmptyInOptions = options.some((opt) => opt.value === '' || opt.value === 'all')
  const defaultAllLabel = allLabel || (label.toLowerCase().startsWith('tod') ? label : `Todos (${label})`)

  return (
    <select
      aria-label={label}
      className={`chip-select ${isActive ? 'chip-select-on' : ''}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
    >
      {allowEmpty && !hasEmptyInOptions && (
        <option value="">
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

export default ChipSelect

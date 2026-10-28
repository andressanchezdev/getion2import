// ChipSelect · lista desplegable con aspecto de chip de filtro (como «Marca ▾» de la maqueta): la opción vacía lleva el nombre del filtro
// conecta con: ChipSelect.css; lo usan el catálogo (categoría y marca) y la tabla de pedidos (canal)
// ojo: el chip se pinta amarillo cuando hay una opción elegida; el nombre del filtro también es su etiqueta para lectores de pantalla
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
  onChange: (value: string | null) => void
}

export const ChipSelect: React.FC<ChipSelectProps> = ({ label, value, options, onChange }) => {
  const isActive = value !== null && value !== ''
  return (
    <select
      aria-label={label}
      className={`chip-select ${isActive ? 'chip-select-on' : ''}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default ChipSelect

// FilterChip · chip de filtro del ERP (píldora de la maqueta): botón con texto y, opcional, un contador; amarillo suave cuando está activo
// conecta con: FilterChip.css; lo usan el catálogo («con stock») y la tabla de pedidos (etapas con su conteo); ChipSelect es su versión con lista desplegable
// ojo: con role="tab" marca aria-selected (grupo de pestañas, como las etapas); sin role es un botón de dos estados (aria-pressed)
import React from 'react'
import './FilterChip.css'

interface FilterChipProps {
  label: string
  active?: boolean
  count?: number | string | null
  role?: 'tab'
  title?: string
  onClick: () => void
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, active = false, count = null, role, title, onClick }) => {
  const isTab = role === 'tab'
  return (
    <button
      type="button"
      role={role}
      aria-selected={isTab ? active : undefined}
      aria-pressed={isTab ? undefined : active}
      title={title}
      className={`filter-chip ${active ? 'filter-chip-on' : ''}`}
      onClick={onClick}
    >
      <span>{label}</span>
      {count !== null && <b className="filter-chip-count">{count}</b>}
    </button>
  )
}

export default FilterChip

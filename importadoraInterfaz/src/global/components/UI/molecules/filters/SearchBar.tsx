// SearchBar · barra de búsqueda reutilizable con botón de limpiar
// conecta con: ShopCatalogScreen, CreditClientsTable
// ojo: la búsqueda solo se ejecuta cuando se presiona Enter o al salir del campo (onBlur), evitando peticiones intermedias
import React, { useState } from 'react'
import './SearchBar.css'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  hasActiveFilters?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
  maxLength?: number // tope de caracteres escritos (por defecto 100)
  children?: React.ReactNode
}

/**
 * SearchBar
 * Molécula universal de búsqueda para el ERP.
 * Se reutiliza transversalmente en Catálogo, Cartera, Inventario, Caja, etc.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onClear,
  hasActiveFilters = false,
  placeholder = 'Buscar...',
  className = '',
  disabled = false,
  maxLength = 100,
  children,
}) => {
  const [query, setQuery] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  // ojo: si el padre cambia el valor (por ejemplo «limpiar filtros») el texto escrito se reemplaza; se hace al renderizar, sin efecto
  if (value !== lastValue) {
    setLastValue(value)
    setQuery(value)
  }

  const commit = () => {
    if (query !== value) {
      onChange(query)
    }
  }

  const handleClear = () => {
    setQuery('')
    onChange('')
    if (onClear) {
      onClear()
    }
  }

  const showClear = (query.length > 0 || hasActiveFilters) && !disabled

  return (
    <div className={`global-search-bar ${className}`}>
      <div className="global-search-input-wrapper">
        <svg
          className="global-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          className="global-search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
          onBlur={commit}
          maxLength={maxLength}
          disabled={disabled}
        />

        {showClear && (
          <button
            type="button"
            className={`global-search-clear-btn ${hasActiveFilters ? 'is-filters-active' : ''}`}
            onClick={handleClear}
            title={hasActiveFilters ? 'Limpiar filtros y búsqueda activa' : 'Limpiar búsqueda'}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {children && (
        <div className="global-search-actions-slot">
          {children}
        </div>
      )}
    </div>
  )
}

export default SearchBar

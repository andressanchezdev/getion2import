// SearchBar · barra de búsqueda reutilizable con botón de limpiar
// conecta con: ShopCatalogScreen, CreditClientsTable
import React from 'react'
import './SearchBar.css'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
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
  placeholder = 'Buscar...',
  className = '',
  disabled = false,
  children,
}) => {
  const handleClear = () => {
    onChange('')
    if (onClear) {
      onClear()
    }
  }

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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />

        {value.length > 0 && !disabled && (
          <button
            type="button"
            className="global-search-clear-btn"
            onClick={handleClear}
            title="Limpiar búsqueda"
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

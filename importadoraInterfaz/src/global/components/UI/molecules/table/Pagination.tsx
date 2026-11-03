// Pagination · paginador reutilizable: Anterior, "Página X de Y" y Siguiente, a partir de los metadatos de paginación del backend
// conecta con: ShopCatalogScreen (catálogo) y CustomersScreen (clientes); recibe el meta de api (PaginatorMetadata) y avisa la página pedida
// ojo: al cambiar de página hace scroll automático al top del contenedor para volver a la línea 1
import React from 'react'
import type { PaginatorMetadata } from '@/api'
import './Pagination.css'

export interface PaginationProps {
  meta: PaginatorMetadata
  disabled?: boolean // true mientras se carga otra página
  onPageChange: (page: number) => void
  label?: string // nombre accesible del paginador
}

export const Pagination: React.FC<PaginationProps> = ({ meta, disabled = false, onPageChange, label = 'Paginación' }) => {
  if (meta.totalPages <= 1) return null

  const handlePageChange = (page: number) => {
    onPageChange(page)
    const container = document.querySelector('.main-content')
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <nav className="global-pagination" aria-label={label}>
      <button
        type="button"
        className="global-pagination-btn"
        onClick={() => handlePageChange(meta.currentPage - 1)}
        disabled={disabled || !meta.hasPrevPage}
      >
        Anterior
      </button>
      <span className="global-pagination-info" aria-live="polite">
        Página {meta.currentPage} de {meta.totalPages}
      </span>
      <button
        type="button"
        className="global-pagination-btn"
        onClick={() => handlePageChange(meta.currentPage + 1)}
        disabled={disabled || !meta.hasNextPage}
      >
        Siguiente
      </button>
    </nav>
  )
}

export default Pagination

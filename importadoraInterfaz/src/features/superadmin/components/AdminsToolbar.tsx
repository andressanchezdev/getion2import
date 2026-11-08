// AdminsToolbar · barra de la tabla de administradores: búsqueda, filtro de empresa, filtro de estado y botón para crear
// conecta con: SuperadminAdminsScreen; valores y cambios vienen de useSuperadminAdmins
import React from 'react'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { ADMIN_STATUS_OPTIONS } from '../constants/superadmin.constants'
import type { AdminFilters, AdminStatusFilter } from '../types/superadmin.types'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

interface Props {
  filters: AdminFilters
  hasFilters: boolean
  companies: Array<{ id: number | string; name: string }>
  onQuery: (value: string) => void
  onCompany: (id: number | null) => void
  onStatus: (value: AdminStatusFilter) => void
  onClear: () => void
  onCreate: () => void
}

export const AdminsToolbar: React.FC<Props> = ({ filters, hasFilters, companies, onQuery, onCompany, onStatus, onClear, onCreate }) => {
  const companyOptions = [{ value: 'all', label: 'Todas las empresas' }, ...companies.map((c) => ({ value: String(c.id), label: c.name }))]
  return (
    <div className="data-toolbar superadmin-toolbar">
      <div className="superadmin-toolbar-left">
        <SearchBar
          value={filters.query}
          onChange={onQuery}
          placeholder="Buscar por nombre, email o documento..."
          className="superadmin-search-bar"
          hasActiveFilters={hasFilters}
          onClear={onClear}
        />
        <FilterSelect
          label="Todas las empresas"
          value={filters.companyId === null ? 'all' : String(filters.companyId)}
          options={companyOptions}
          onChange={(value) => onCompany(value === 'all' ? null : Number(value))}
        />
        <FilterSelect label="Todos los estados" value={filters.status} options={ADMIN_STATUS_OPTIONS} onChange={(value) => onStatus(value as AdminStatusFilter)} />
      </div>
      <div className="superadmin-toolbar-right">
        <button type="button" className="btn-primary" onClick={onCreate}><Icon svg={plusIcon} /> Nuevo Administrador</button>
      </div>
    </div>
  )
}

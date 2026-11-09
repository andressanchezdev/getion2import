// CompaniesScreen · Configuración > Compañías (solo superadmin): las compañías registradas con la acción «Ver sedes» de cada una
// conecta con: useCompanies (lista), global SearchBar y RowActions, navigation (openDrawerForm: las sedes de la compañía se ven en el panel derecho) y CompaniesScreen.css
// ojo: es la versión de «Sedes» para el superadmin: él primero elige compañía y después ve sus sedes
import React, { useState } from 'react'
import './CompaniesScreen.css'
import { openDrawerForm } from '@/features/navigation'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import buildingIcon from '@/assets/icons/building.svg?raw'
import { useCompanies } from '../hooks/useCompanies'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

export const CompaniesScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const { companies, status, error } = useCompanies(true)
  const [search, setSearch] = useState('')

  const needle = search.trim().toLowerCase()
  const visible = companies.filter((company) => !needle || `${company.name} ${company.city ?? ''} ${company.email ?? ''}`.toLowerCase().includes(needle))
  const { pageItems, meta, setPage } = usePagedList(visible, needle)
  const message = status === 'failed' ? error : status !== 'succeeded' ? 'Cargando compañías…' : visible.length === 0 ? 'No se encontraron compañías.' : null

  return (
    <div className="companies-screen">
      <div className="data-card">
        <div className="data-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, ciudad o correo..." className="companies-search" />
        </div>
        <DataTable tableId="companies-companies">
            <thead>
              <tr><th>Compañía</th><th>Ciudad</th><th>Correo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {message ? (
                <tr><td colSpan={4} className="companies-message">{message}</td></tr>
              ) : (
                pageItems.map((company) => (
                  <tr key={company.id}>
                    <td className="companies-name">{company.name}</td>
                    <td>{company.city || '—'}</td>
                    <td>{company.email || '—'}</td>
                    <td>
                      <RowActions
                        actions={[{ key: 'sites', label: 'Ver sedes', icon: buildingIcon, onClick: () => dispatch(openDrawerForm({ kind: 'companyWarehouses', payload: { id: company.id, name: company.name } })) }]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
      </div>
      <Pagination meta={meta} label="Paginación de compañías" onPageChange={setPage} />
    </div>
  )
}

export default CompaniesScreen

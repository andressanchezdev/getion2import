// SuperadminAdminsScreen · gestión superadmin: lista y administra las cuentas de administradores de las compañías
// conecta con: useSuperadminAdmins (datos y filtros), AdminsToolbar, AdminsTable, Pagination (global) y el drawer adminForm (navigation)
import React from 'react'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { AdminsTable } from '../components/AdminsTable'
import { AdminsToolbar } from '../components/AdminsToolbar'
import { useSuperadminAdmins } from '../hooks/useSuperadminAdmins'
import type { AdminUser } from '../types/superadmin.types'
import './SuperadminAdminsScreen.css'

export const SuperadminAdminsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const list = useSuperadminAdmins()
  const openForm = (admin?: AdminUser) => dispatch(openDrawerForm({ kind: 'adminForm', payload: admin ? { admin } : {} }))
  return (
    <div className="superadmin-screen">
      <div className="superadmin-table-card">
        <AdminsToolbar
          filters={list.filters} hasFilters={list.hasFilters} companies={list.companies}
          onQuery={list.setQuery} onCompany={list.setCompany} onStatus={list.setStatus} onClear={list.clearFilters} onCreate={() => openForm()}
        />
        <AdminsTable admins={list.admins} loading={list.loading} hasFilters={list.hasFilters} onEdit={openForm} onToggle={list.toggle} />
        <Pagination meta={list.meta} label="Paginación de administradores" onPageChange={list.setPage} />
      </div>
    </div>
  )
}

export default SuperadminAdminsScreen

// AdminsTable · tabla de administradores con sus estados de carga y vacío y las acciones editar y activar / desactivar
// conecta con: SuperadminAdminsScreen; usa RowActions (global) y formatDate; las acciones llegan por props desde la pantalla
import React, { useState } from 'react'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { formatDate } from '@/global/helpers/formatting/format'
import editIcon from '@/assets/icons/edit.svg?raw'
import powerIcon from '@/assets/icons/check.svg?raw'
import type { AdminUser } from '../types/superadmin.types'

interface Props {
  admins: AdminUser[]
  loading: boolean
  hasFilters: boolean
  onEdit: (admin: AdminUser) => void
  onToggle: (admin: AdminUser, reason?: string) => void
}

const COLUMNS = ['ID', 'Administrador', 'Empresa', 'Documento', 'Teléfono', 'Estado', 'Registro']

export const AdminsTable: React.FC<Props> = ({ admins, loading, hasFilters, onEdit, onToggle }) => {
  const [toDeactivate, setToDeactivate] = useState<AdminUser | null>(null)
  const message = loading
    ? 'Cargando administradores…'
    : admins.length === 0
    ? hasFilters ? 'No hay administradores que coincidan con la búsqueda.' : 'No hay administradores registrados aún.'
    : null
  return (
    <div className="superadmin-table-responsive table-scroll">
      <table className="superadmin-table">
        <thead>
          <tr>
            {COLUMNS.map((name) => <th key={name}>{name}</th>)}
            <th className="superadmin-actions-header">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {message ? (
            <tr><td colSpan={COLUMNS.length + 1} className="superadmin-empty">{message}</td></tr>
          ) : (
            admins.map((admin) => (
              <tr key={admin.id}>
                <td><span className="superadmin-id-badge">#{admin.id}</span></td>
                <td>
                  <div className="superadmin-user-cell">
                    <strong>{admin.fullName || `${admin.firstName} ${admin.lastName || ''}`.trim()}</strong>
                    <small>{admin.email}</small>
                  </div>
                </td>
                <td><span className="superadmin-company-tag">{admin.companyName || `Empresa #${admin.companyId}`}</span></td>
                <td>{admin.document ? <span>{admin.documentType || 'CC'} {admin.document}</span> : '—'}</td>
                <td>{admin.phone || '—'}</td>
                <td><span className={`superadmin-status-pill ${admin.isActive ? 'is-active' : 'is-inactive'}`}>{admin.isActive ? 'Activo' : 'Inactivo'}</span></td>
                <td>{admin.createdAt ? formatDate(admin.createdAt) : '—'}</td>
                <td>
                  <RowActions
                    actions={[
                      { key: 'edit', label: 'Editar administrador', icon: editIcon, onClick: () => onEdit(admin) },
                      { key: 'toggle', label: admin.isActive ? 'Desactivar cuenta' : 'Activar cuenta', icon: powerIcon, onClick: () => (admin.isActive ? setToDeactivate(admin) : onToggle(admin)) },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <ReasonPrompt
        open={toDeactivate !== null}
        title="Desactivar administrador"
        message={`¿Desactivar la cuenta de ${toDeactivate?.fullName || toDeactivate?.email || ''}? Se cerrarán sus sesiones abiertas.`}
        confirmLabel="Desactivar"
        onConfirm={(reason) => {
          const target = toDeactivate
          setToDeactivate(null)
          if (target) onToggle(target, reason)
        }}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  )
}

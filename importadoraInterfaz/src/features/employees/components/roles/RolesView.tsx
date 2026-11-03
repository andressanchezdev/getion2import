// RolesView · tabla de roles de la compañía: código, nombre, descripción y estado; en modo «manage» permite crear un rol y editar los existentes (panel derecho)
// conecta con: PermissionsHub (lo usa), useRoles (lista), navigation (openDrawerForm y closeDrawerForm al guardar) y global RowActions
// ojo: al guardar, saveRoleThunk vuelve a pedir la lista y esta tabla se actualiza sola
// ojo: la API guarda el rol (código, nombre, descripción y si está activo); los permisos se asignan a cada empleado, no al rol
import React, { useState } from 'react'
import './RolesView.css'
import { openDrawerForm } from '@/features/navigation'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import editIcon from '@/assets/icons/edit.svg?raw'
import { useRoles } from '../../hooks/useRoles'
import { saveRoleThunk } from '../../thunks/employees.thunks'
import type { EmployeeRole } from '../../types/employees.types'

interface RolesViewProps {
  manage: boolean
}

export const RolesView: React.FC<RolesViewProps> = ({ manage }) => {
  const dispatch = useAppDispatch()
  const { roles, loading, error } = useRoles()
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const handleToggleRoleStatus = async (role: EmployeeRole) => {
    if (!manage || togglingId === role.roleId) return
    setTogglingId(role.roleId)
    const nextActive = role.isActive === false
    try {
      await dispatch(
        saveRoleThunk({
          roleId: role.roleId,
          input: {
            name: role.roleName,
            description: role.description || '',
            isActive: nextActive,
          },
        })
      ).unwrap()
      toast.success(`Rol ${role.roleName} marcado como ${nextActive ? 'Activo' : 'Inactivo'}`)
    } catch {
      toast.error('No se pudo actualizar el estado del rol')
    } finally {
      setTogglingId(null)
    }
  }

  const message = loading ? 'Cargando roles…' : error ? error : roles.length === 0 ? 'Aún no hay roles creados.' : null

  return (
    <div className="roles-view">
      {manage && (
        <div className="roles-view-toolbar">
          <button type="button" className="btn-primary" onClick={() => dispatch(openDrawerForm({ kind: 'roleForm', payload: null }))}>
            + Nuevo rol
          </button>
        </div>
      )}
      <div className="table-scroll">
        <table className="roles-view-table">
          <thead>
            <tr><th>Código</th><th>Rol</th><th>Descripción</th><th>Estado</th>{manage && <th>Acciones</th>}</tr>
          </thead>
          <tbody>
            {message ? (
              <tr><td colSpan={manage ? 5 : 4} className="roles-view-message">{message}</td></tr>
            ) : (
              roles.map((role) => (
                <tr key={role.roleId}>
                  <td><span className="roles-view-code">{role.code || '—'}</span></td>
                  <td><strong>{role.roleName}</strong></td>
                  <td>{role.description || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className={`inv-status-select ${role.isActive !== false ? 'is-active' : 'is-inactive'}`}
                      onClick={() => handleToggleRoleStatus(role)}
                      disabled={!manage || togglingId === role.roleId}
                      title={manage ? 'Haz clic para cambiar estado' : undefined}
                    >
                      {role.isActive === false ? 'Inactivo' : 'Activo'}
                    </button>
                  </td>
                  {manage && (
                    <td>
                      <RowActions actions={[{ key: 'edit', label: 'Editar rol', icon: editIcon, onClick: () => dispatch(openDrawerForm({ kind: 'roleForm', payload: role })) }]} />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RolesView

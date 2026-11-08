// RolesView · tabla de roles de la compañía: código, nombre, descripción y estado; en modo «manage» permite crear un rol y editar los existentes (panel derecho)
// conecta con: PermissionsHub (lo usa), useRoles (lista), navigation (openDrawerForm y closeDrawerForm al guardar) y global RowActions
// ojo: al guardar, saveRoleThunk vuelve a pedir la lista y esta tabla se actualiza sola
// ojo: la API guarda el rol (código, nombre, descripción y si está activo); los permisos se asignan a cada empleado, no al rol
import React, { useState } from 'react'
import './RolesView.css'
import { openDrawerForm } from '@/features/navigation'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import editIcon from '@/assets/icons/edit.svg?raw'
import { useRoles } from '../../hooks/useRoles'
import { saveRoleThunk } from '../../thunks/employees.thunks'
import type { EmployeeRole } from '../../types/employees.types'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

interface RolesViewProps {
  manage: boolean
  onEdit?: (role: EmployeeRole | null) => void // si viene, crear o editar un rol se abre dentro del mismo panel
}

export const RolesView: React.FC<RolesViewProps> = ({ manage, onEdit }) => {
  const dispatch = useAppDispatch()
  const { roles, loading, error } = useRoles()
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [toDeactivate, setToDeactivate] = useState<EmployeeRole | null>(null)

  const handleToggleRoleStatus = async (role: EmployeeRole, reason?: string) => {
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
            reason,
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
          <button type="button" className="btn-primary" onClick={() => (onEdit ? onEdit(null) : dispatch(openDrawerForm({ kind: 'roleForm', payload: null })))}>
            <Icon svg={plusIcon} /> Nuevo rol
          </button>
        </div>
      )}
      <DataTable tableId="employees-roles-view" className="roles-view-table">
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
                      onClick={() => (role.isActive === false ? handleToggleRoleStatus(role) : setToDeactivate(role))}
                      disabled={!manage || togglingId === role.roleId}
                      title={manage ? 'Haz clic para cambiar estado' : undefined}
                    >
                      {role.isActive === false ? 'Inactivo' : 'Activo'}
                    </button>
                  </td>
                  {manage && (
                    <td>
                      <RowActions actions={[{ key: 'edit', label: 'Editar rol', icon: editIcon, onClick: () => (onEdit ? onEdit(role) : dispatch(openDrawerForm({ kind: 'roleForm', payload: role }))) }]} />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      <ReasonPrompt
        open={toDeactivate !== null}
        title="Desactivar rol"
        message={`¿Desactivar el rol ${toDeactivate?.roleName ?? ''}?`}
        confirmLabel="Desactivar"
        onConfirm={(reason) => {
          const target = toDeactivate
          setToDeactivate(null)
          if (target) void handleToggleRoleStatus(target, reason)
        }}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  )
}

export default RolesView

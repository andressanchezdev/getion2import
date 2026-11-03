// EmployeePermissionsPanel · permisos de un empleado en el panel derecho: «ver» (solo lectura) o «editar» (con botón Guardar)
// conecta con: formRegistry (lo muestra), useEmployeePermissions (carga y guarda), PermissionsSelector, navigation (closeDrawerForm) y employees.types
import React from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { ASSIGNABLE_MENU_ITEMS } from '../../constants/employees.assignable.constants'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useEmployeePermissions } from '../../hooks/useEmployeePermissions'
import type { SimpleEmployee } from '../../types/employees.types'
import { PermissionsSelector } from './PermissionsSelector'
import './EmployeePermissionsPanel.css'

export type EmployeePermissionsMode = 'view' | 'edit'

interface EmployeePermissionsPanelProps {
  employee: SimpleEmployee
  mode: EmployeePermissionsMode
}

export const EmployeePermissionsPanel: React.FC<EmployeePermissionsPanelProps> = ({ employee, mode }) => {
  const dispatch = useAppDispatch()
  const { map, setMap, loading, saving, feedback, save } = useEmployeePermissions(employee.employeeId)
  const readOnly = mode === 'view'

  const handleSave = async () => {
    if (await save()) dispatch(closeDrawerForm())
  }

  return (
    <div className="employee-permissions">
      <div className="employee-permissions-body">
        <p className="employee-permissions-who">
          <strong>{`${employee.name} ${employee.lastName || ''}`.trim()}</strong>
          <span>{employee.roleName || 'Empleado'} · {employee.email}</span>
        </p>

        {feedback && feedback.type === 'error' && <div className="form-field-error-msg">{feedback.msg}</div>}

        {loading ? (
          <div className="employee-permissions-empty">Cargando permisos…</div>
        ) : (
          <PermissionsSelector items={ASSIGNABLE_MENU_ITEMS} value={map} onChange={setMap} readOnly={readOnly} />
        )}
      </div>

      <div className="employee-permissions-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>
          {readOnly ? 'Cerrar' : 'Cancelar'}
        </button>
        {!readOnly && (
          <button type="button" className="btn-primary" disabled={saving || loading} onClick={handleSave}>
            {saving ? 'Guardando...' : 'Guardar permisos'}
          </button>
        )}
      </div>
    </div>
  )
}

export default EmployeePermissionsPanel

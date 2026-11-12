// EmployeePermissionsPanel · permisos de un empleado en el panel derecho: «ver» (solo lectura sin pie) o «editar» (con Cancelar / Guardar)
// conecta con: formRegistry (lo muestra), useEmployeePermissions (carga y guarda), PermissionsSelector (pantallas), SpecialActionsSelector (acciones especiales), navigation (closeDrawerForm) y DrawerFormShell.css
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { closeDrawerForm } from '@/features/navigation'
import { ASSIGNABLE_MENU_ITEMS } from '../../constants/employees.assignable.constants'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useEmployeePermissions } from '../../hooks/useEmployeePermissions'
import type { SimpleEmployee } from '../../types/employees.types'
import { PermissionsSelector } from './PermissionsSelector'
import { SpecialActionsSelector } from './SpecialActionsSelector'
import './EmployeePermissionsPanel.css'

export type EmployeePermissionsMode = 'view' | 'edit'

interface EmployeePermissionsPanelProps {
  employee: SimpleEmployee
  mode: EmployeePermissionsMode
  onClose?: () => void // si viene, se usa en vez de cerrar el panel (cuando está anidado en Roles y permisos)
}

export const EmployeePermissionsPanel: React.FC<EmployeePermissionsPanelProps> = ({ employee, mode, onClose }) => {
  const dispatch = useAppDispatch()
  const close = () => (onClose ? onClose() : dispatch(closeDrawerForm()))
  const { map, setMap, specials, setSpecials, loading, saving, feedback, save } = useEmployeePermissions(employee.employeeId)
  const readOnly = mode === 'view'

  const handleSave = async () => {
    if (await save()) close()
  }

  const fullName = `${employee.name} ${employee.lastName || ''}`.trim()
  const meta = [employee.roleName || 'Empleado', employee.warehouseName || 'Sin sede'].filter(Boolean).join(' · ')

  return (
    <div className="drawer-form employee-permissions">
      <div className="drawer-form-body employee-permissions-body">
        <div className="employee-permissions-who">
          <strong>{fullName}</strong>
          <span className="employee-permissions-meta"> · {meta}</span>
        </div>

        {feedback && feedback.type === 'error' && <div className="form-field-error-msg">{feedback.msg}</div>}

        {loading ? (
          <div className="employee-permissions-empty">Cargando permisos…</div>
        ) : (
          <>
            <PermissionsSelector items={ASSIGNABLE_MENU_ITEMS} value={map} onChange={setMap} readOnly={readOnly} />
            <SpecialActionsSelector value={specials} onChange={setSpecials} readOnly={readOnly} />
          </>
        )}
      </div>

      {!readOnly && (
        <div className="drawer-form-footer employee-permissions-footer">
          <button type="button" className="btn-secondary" onClick={close} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" disabled={saving || loading} onClick={handleSave}>
            {saving ? 'Guardando…' : 'Guardar permisos'}
          </button>
        </div>
      )}
    </div>
  )
}

export default EmployeePermissionsPanel

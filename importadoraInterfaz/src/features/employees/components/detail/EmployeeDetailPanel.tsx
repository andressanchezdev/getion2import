// EmployeeDetailPanel · detalle de un empleado en el panel derecho (ícono del ojo): sus datos, cuándo se creó y, abajo, la LISTA de sus permisos; «Editar permisos» abre la edición
// conecta con: formRegistry (lo muestra), useEmployeePermissions (permisos cargados), permissions.selection (resumen en lista), usePermissions (puede editar) y navigation (abrir la edición o cerrar)
// ojo: aquí los permisos son solo una lista (no la matriz de casillas); la matriz para elegir permisos solo aparece al presionar «Editar permisos», ya con este mismo empleado
import React from 'react'
import './EmployeeDetailPanel.css'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import { formatDateTime } from '@/global/helpers/formatting/format'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { ASSIGNABLE_MENU_ITEMS } from '../../constants/employees.assignable.constants'
import { summarizePermissions } from '../../helpers/permissions.selection'
import { useEmployeePermissions } from '../../hooks/useEmployeePermissions'
import type { SimpleEmployee } from '../../types/employees.types'

export const EmployeeDetailPanel: React.FC<{ employee: SimpleEmployee; onClose?: () => void }> = ({ employee, onClose }) => {
  const dispatch = useAppDispatch()
  const close = () => (onClose ? onClose() : dispatch(closeDrawerForm()))
  const { map, loading, feedback } = useEmployeePermissions(employee.employeeId)
  const canEdit = usePermissions().canPerformAction('settings', 'rolesPermissions', 'update')
  const summary = summarizePermissions(map, ASSIGNABLE_MENU_ITEMS)

  const facts: Array<[string, string]> = [
    ['Nombre', `${employee.name} ${employee.lastName ?? ''}`.trim()],
    ['Documento', employee.identification || '—'],
    ['Correo', employee.email || '—'],
    ['Teléfono', employee.phone || '—'],
    ['Cargo', employee.roleName || 'Empleado'],
    ['Sede', employee.warehouseName || '—'],
    ['Modalidad', employee.workModality || '—'],
    ['Estado', employee.isActive ? 'Activo' : 'Inactivo'],
    ['Creado', employee.createdAt ? formatDateTime(employee.createdAt) : '—'],
  ]

  return (
    <div className="employee-detail">
      <div className="employee-detail-body">
        <dl className="employee-detail-facts">
          {facts.map(([label, value]) => (
            <div key={label} className="employee-detail-fact">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <h4 className="employee-detail-title">Permisos</h4>
        {feedback?.type === 'error' && <div className="form-field-error-msg">{feedback.msg}</div>}
        {loading ? (
          <p className="employee-detail-muted">Cargando permisos…</p>
        ) : summary.length === 0 ? (
          <p className="employee-detail-muted">Este empleado no tiene permisos asignados.</p>
        ) : (
          <ul className="employee-detail-perms">
            {summary.map((module) => (
              <li key={module.module}>
                <strong>{module.module}</strong>
                <ul>
                  {module.screens.map((screen) => (
                    <li key={screen.screen}>
                      <span>{screen.screen}</span>
                      <small>{screen.actions.join(' · ')}</small>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="employee-detail-footer">
        <button type="button" className="btn-secondary" onClick={close}>Cerrar</button>
        {canEdit && (
          <button type="button" className="btn-primary" onClick={() => dispatch(openDrawerForm({ kind: 'employeePermissions', payload: { employee, mode: 'edit' } }))}>
            Editar permisos
          </button>
        )}
      </div>
    </div>
  )
}

export default EmployeeDetailPanel

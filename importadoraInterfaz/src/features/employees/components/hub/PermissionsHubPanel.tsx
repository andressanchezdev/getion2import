// PermissionsHubPanel · contenido de cada opción de Roles y permisos dentro del panel derecho (ancho): la lista y, al elegir algo, su detalle anidado con «Volver»
// conecta con: formRegistry (permissionsHub), EmployeePicker, RolesView, EmployeePermissionsPanel, EmployeeDetailPanel y RoleForm; las tarjetas de PermissionsHub lo abren
// ojo: lo anidado se cierra con «Volver» (o al guardar) sin cerrar el panel; el panel solo se cierra con su ✕, Esc o un clic fuera
import React, { useState } from 'react'
import './PermissionsHub.css'
import { EmployeeDetailPanel } from '../detail/EmployeeDetailPanel'
import { EmployeePicker } from '../picker/EmployeePicker'
import { EmployeePermissionsPanel } from '../permissions/EmployeePermissionsPanel'
import { RoleForm } from '../roles/RoleForm'
import { RolesView } from '../roles/RolesView'
import type { EmployeeRole, SimpleEmployee } from '../../types/employees.types'

import type { HubView } from './permissionsHub.constants'

type Nested = { kind: 'employee'; employee: SimpleEmployee } | { kind: 'role'; role: EmployeeRole | null }

export const PermissionsHubPanel: React.FC<{ view: HubView }> = ({ view }) => {
  const [nested, setNested] = useState<Nested | null>(null)
  const back = () => setNested(null)

  if (nested) {
    return (
      <div className="permissions-hub-nested">
        <div className="permissions-hub-bar">
          <button type="button" className="btn-secondary" onClick={back}>← Volver</button>
        </div>
        <div className="permissions-hub-nested-body">
          {nested.kind === 'role' && <RoleForm role={nested.role} onClose={back} />}
          {nested.kind === 'employee' && view === 'editEmployee' && <EmployeePermissionsPanel employee={nested.employee} mode="edit" onClose={back} />}
          {nested.kind === 'employee' && view !== 'editEmployee' && <EmployeeDetailPanel employee={nested.employee} onClose={back} />}
        </div>
      </div>
    )
  }

  return (
    <div className="permissions-hub-list">
      {view === 'viewEmployee' && <EmployeePicker mode="view" onPick={(employee) => setNested({ kind: 'employee', employee })} />}
      {view === 'editEmployee' && <EmployeePicker mode="edit" onPick={(employee) => setNested({ kind: 'employee', employee })} />}
      {view === 'viewRoles' && <RolesView manage={false} />}
      {view === 'manageRoles' && <RolesView manage onEdit={(role) => setNested({ kind: 'role', role })} />}
    </div>
  )
}

export default PermissionsHubPanel

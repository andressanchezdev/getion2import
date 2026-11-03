// PermissionsHub · entrada organizada a Roles y permisos: cuatro opciones (ver permisos de un empleado, editar permisos de un empleado, ver roles, crear o editar roles)
// conecta con: RolesPermissionsScreen (lo usa), EmployeePicker (elegir empleado), RolesView (roles) y PermissionsHub.css
// ojo: cada opción abre su vista dentro de la misma pantalla con un botón «Volver»; los permisos de un empleado se ven o se editan en el panel derecho
import React, { useState } from 'react'
import './PermissionsHub.css'
import { EmployeePicker } from '../picker/EmployeePicker'
import { RolesView } from '../roles/RolesView'

type HubView = 'menu' | 'viewEmployee' | 'editEmployee' | 'viewRoles' | 'manageRoles'

const OPTIONS: Array<{ view: Exclude<HubView, 'menu'>; title: string; description: string }> = [
  { view: 'viewEmployee', title: 'Ver permisos de un empleado', description: 'Consulta a qué pantallas y acciones tiene acceso, sin poder cambiarlas.' },
  { view: 'editEmployee', title: 'Editar permisos de un empleado', description: 'Activa o quita pantallas y acciones (ver, crear, editar, anular).' },
  { view: 'viewRoles', title: 'Ver roles', description: 'Lista los roles de la compañía y su estado.' },
  { view: 'manageRoles', title: 'Crear o editar roles', description: 'Crea un rol nuevo o cambia el nombre, la descripción o el estado de uno existente.' },
]

const TITLES: Record<Exclude<HubView, 'menu'>, string> = {
  viewEmployee: 'Ver permisos de un empleado',
  editEmployee: 'Editar permisos de un empleado',
  viewRoles: 'Roles de la compañía',
  manageRoles: 'Crear o editar roles',
}

export const PermissionsHub: React.FC = () => {
  const [view, setView] = useState<HubView>('menu')

  if (view === 'menu') {
    return (
      <div className="permissions-hub-grid">
        {OPTIONS.map((option) => (
          <button key={option.view} type="button" className="permissions-hub-card" onClick={() => setView(option.view)}>
            <strong>{option.title}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="permissions-hub-view">
      <div className="permissions-hub-bar">
        <button type="button" className="btn-secondary" onClick={() => setView('menu')}>← Volver</button>
        <h3>{TITLES[view]}</h3>
      </div>
      <div className="permissions-hub-card-body">
        {view === 'viewEmployee' && <EmployeePicker mode="view" />}
        {view === 'editEmployee' && <EmployeePicker mode="edit" />}
        {view === 'viewRoles' && <RolesView manage={false} />}
        {view === 'manageRoles' && <RolesView manage />}
      </div>
    </div>
  )
}

export default PermissionsHub

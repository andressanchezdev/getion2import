// PermissionsHub · entrada organizada a Roles y permisos: cuatro opciones (ver permisos de un empleado, editar permisos de un empleado, ver roles, crear o editar roles)
// conecta con: RolesPermissionsScreen (lo usa), navigation (openDrawerForm «permissionsHub») y PermissionsHub.css
// ojo: cada opción abre su contenido anidado dentro del panel derecho (más ancho) en vez de cambiar la pantalla
import React from 'react'
import './PermissionsHub.css'
import { openDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import type { HubView } from './permissionsHub.constants'

const OPTIONS: Array<{ view: HubView; title: string; description: string }> = [
  { view: 'viewEmployee', title: 'Ver permisos de un empleado', description: 'Consulta a qué pantallas y acciones tiene acceso, sin poder cambiarlas.' },
  { view: 'editEmployee', title: 'Editar permisos de un empleado', description: 'Activa o quita pantallas y acciones (ver, crear, editar, anular).' },
  { view: 'viewRoles', title: 'Ver roles', description: 'Lista los roles de la compañía y su estado.' },
  { view: 'manageRoles', title: 'Crear o editar roles', description: 'Crea un rol nuevo o cambia el nombre, la descripción o el estado de uno existente.' },
]

export const PermissionsHub: React.FC = () => {
  const dispatch = useAppDispatch()
  return (
    <div className="permissions-hub-grid">
      {OPTIONS.map((option) => (
        <button key={option.view} type="button" className="permissions-hub-card" onClick={() => dispatch(openDrawerForm({ kind: 'permissionsHub', payload: option.view }))}>
          <strong>{option.title}</strong>
          <span>{option.description}</span>
        </button>
      ))}
    </div>
  )
}

export default PermissionsHub

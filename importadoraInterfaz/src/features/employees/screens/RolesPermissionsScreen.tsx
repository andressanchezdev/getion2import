// RolesPermissionsScreen · Configuración > Roles y permisos: entrada con cuatro opciones (ver y editar permisos de un empleado, ver y crear o editar roles)
// conecta con: PermissionsHub (las opciones y sus vistas), EmployeePermissionsPanel (permisos de un empleado, en el panel derecho) y screenRegistry
// ojo: antes era una matriz con un selector de empleado; ahora cada acción es una opción aparte y la matriz solo se abre en el panel derecho; solo la ven admin y superadmin
import React from 'react'
import './RolesPermissionsScreen.css'
import { PermissionsHub } from '../components/hub/PermissionsHub'

export const RolesPermissionsScreen: React.FC = () => (
  <div className="permissions-screen">
    <PermissionsHub />
  </div>
)

export default RolesPermissionsScreen

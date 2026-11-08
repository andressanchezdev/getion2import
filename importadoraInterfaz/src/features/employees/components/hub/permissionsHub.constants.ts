// permissionsHub.constants · las cuatro opciones de Roles y permisos y el título de cada una en el panel derecho
// conecta con: PermissionsHub (tarjetas), PermissionsHubPanel (contenido) y people.entries (título del panel)
export type HubView = 'viewEmployee' | 'editEmployee' | 'viewRoles' | 'manageRoles'

export const HUB_TITLES: Record<HubView, string> = {
  viewEmployee: 'Ver permisos de un empleado',
  editEmployee: 'Editar permisos de un empleado',
  viewRoles: 'Roles de la compañía',
  manageRoles: 'Crear o editar roles',
}

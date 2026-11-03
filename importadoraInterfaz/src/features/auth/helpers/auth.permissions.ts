// auth.permissions · convierte los permisos del empleado que trae el login (claves «módulo:acción») en la matriz por módulo y pantalla del menú
// conecta con: auth.session (estado inicial), auth.slice (al iniciar sesión) y usePermissions (la lee); usa el adaptador de empleados y el menú
// ojo: solo los empleados tienen matriz; administradores y superadministradores no (null = acceso total). Una sesión guardada antes de esta versión no trae permisos: tampoco tiene matriz y no se le oculta nada (la API igual exige los permisos en cada ruta)
import { MENU_ITEMS } from '@/features/navigation'
import { toModulePermissions } from '@/features/employees/helpers/employees.adapter'
import type { EmployeePermissionsResponse } from '@/features/employees/types/employees.types'
import type { AuthUser } from '../types/auth.types'

// los permisos del usuario como matriz del menú, o null si no aplica
export const toPermissionMatrix = (user: AuthUser | null): EmployeePermissionsResponse | null => {
  if (!user || user.userType !== 'employee' || !user.permissions) return null
  const list = user.permissions.map((key, index) => {
    const [module, action] = key.split(':')
    return { id: index, module, action }
  })
  return { modules: toModulePermissions(list, MENU_ITEMS) }
}

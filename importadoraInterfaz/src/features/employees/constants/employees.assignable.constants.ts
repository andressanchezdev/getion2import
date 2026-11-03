// employees.assignable.constants · módulos y pantallas del menú que se pueden asignar a un empleado en la matriz de permisos
// conecta con: useEmployeePermissions, EmployeePermissionsPanel (listas de la matriz) y navigation (MENU_ITEMS); global accessLevels (niveles)
// ojo: todo se puede asignar a cualquier empleado, incluso lo de administración (configuración, auditoría, sedes): solo se excluye lo que no es del personal (nivel cliente)
import { MENU_ITEMS, type NavItem } from '@/features/navigation'
import { canLevelSee } from '@/global/helpers/access/accessLevels'

export const ASSIGNABLE_MENU_ITEMS: NavItem[] = MENU_ITEMS.filter((item) => canLevelSee('employee', item.id)).map((item) => ({
  ...item,
  subitems: item.subitems.filter((sub) => canLevelSee('employee', item.id, sub.id)),
}))

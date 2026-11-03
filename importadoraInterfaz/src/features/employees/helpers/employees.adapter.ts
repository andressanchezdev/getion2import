// employees.adapter · convierte lo que responde la API en Go (empleados, roles y permisos planos) a lo que usa la app, y la matriz del menú a permisos de la API
// conecta con: employees.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en empleados y permisos
// ojo: la API da permisos planos (módulo + acción); la pantalla muestra una matriz por módulo del menú y subgestión (ver, crear, editar, anular, editar precios)
// ojo: al guardar se conservan los permisos que la matriz no maneja (tomar etapas, verificar pagos, módulos que no están en el menú…)
import type { NavItem } from '@/features/navigation'
import { apiModuleOf, MATRIX_ACTIONS, MATRIX_MANAGED_ACTIONS, type MatrixFlag } from '../constants/employees.permissions.constants'
import type { EmployeeDto, PermissionDto, RoleDto } from '../types/employees.api.types'
import type { EmployeeRole, ModulePermission, ScreenPermission, SimpleEmployee } from '../types/employees.types'

const text = (value: string | null | undefined): string => (value ?? '').trim()

// convierte un empleado de la API en el que usa la app
export const toSimpleEmployee = (dto: EmployeeDto): SimpleEmployee => ({
  employeeId: dto.id,
  name: text(dto.firstName),
  lastName: text(dto.lastName) || undefined,
  email: text(dto.email),
  identification: text(dto.document),
  workModality: dto.workModality || undefined,
  primaryWarehouseId: dto.warehouseId ?? undefined,
  warehouseName: text(dto.warehouseName) || undefined,
  roleName: text(dto.roleName) || undefined,
  phone: text(dto.phone) || undefined,
  employmentStatus: dto.employmentStatus || undefined,
  isActive: dto.status === undefined || dto.status === 'active',
  createdAt: dto.createdAt || undefined,
})

// convierte un rol de la API en el que usa la app
export const toEmployeeRole = (dto: RoleDto): EmployeeRole => ({
  roleId: dto.id,
  roleName: text(dto.name),
  description: text(dto.description) || undefined,
  code: dto.code || undefined,
  isActive: dto.isActive,
})

const FLAGS = Object.keys(MATRIX_ACTIONS) as MatrixFlag[]

// ¿tiene el empleado alguna de las acciones de esa columna en ese módulo?
const hasAny = (owned: Set<string>, apiModule: string | null, flag: MatrixFlag): boolean =>
  apiModule !== null && MATRIX_ACTIONS[flag].some((action) => owned.has(`${apiModule}:${action}`))

// los permisos planos del empleado → la matriz por módulo y subgestión del menú
export const toModulePermissions = (permissions: PermissionDto[], menu: NavItem[]): ModulePermission[] => {
  const owned = new Set(permissions.map((item) => `${item.module}:${item.action}`))
  return menu.map((item) => {
    const screens: ScreenPermission[] = item.subitems.map((sub) => {
      const apiModule = apiModuleOf(item.id, sub.id)
      return {
        screenKey: sub.id,
        canRead: hasAny(owned, apiModule, 'canRead'),
        canCreate: hasAny(owned, apiModule, 'canCreate'),
        canUpdate: hasAny(owned, apiModule, 'canUpdate'),
        canDelete: hasAny(owned, apiModule, 'canDelete'),
        canEditPrices: hasAny(owned, apiModule, 'canEditPrices'),
      }
    })
    const some = (flag: MatrixFlag) => screens.some((screen) => Boolean(screen[flag]))
    return {
      moduleKey: item.id,
      canRead: some('canRead'),
      canCreate: some('canCreate'),
      canUpdate: some('canUpdate'),
      canDelete: some('canDelete'),
      canEditPrices: some('canEditPrices'),
      screens,
    }
  })
}

// los ids de permisos que se guardan: lo que marca la matriz + lo que el empleado ya tenía y la matriz no maneja
export const toPermissionIds = (modules: ModulePermission[], catalog: PermissionDto[], current: PermissionDto[]): number[] => {
  const idOf = new Map(catalog.map((item) => [`${item.module}:${item.action}`, item.id]))
  const ids = new Set<number>()
  const managedModules = new Set<string>()

  for (const module of modules) {
    for (const screen of module.screens) {
      const apiModule = apiModuleOf(module.moduleKey, screen.screenKey ?? '')
      if (apiModule === null) continue
      managedModules.add(apiModule)
      for (const flag of FLAGS) {
        if (!screen[flag]) continue
        for (const action of MATRIX_ACTIONS[flag]) {
          const id = idOf.get(`${apiModule}:${action}`)
          if (id !== undefined) ids.add(id)
        }
      }
    }
  }
  // lo que la matriz no maneja se conserva tal cual
  for (const item of current) {
    if (!managedModules.has(item.module) || !MATRIX_MANAGED_ACTIONS.has(item.action)) ids.add(item.id)
  }
  return [...ids].sort((a, b) => a - b)
}

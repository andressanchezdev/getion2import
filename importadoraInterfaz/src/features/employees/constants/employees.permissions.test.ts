// employees.permissions.test · el mapa pantalla → módulo de la API se deriva del menú y se valida contra él (8.2-2)
// conecta con: employees.permissions.constants, employees.assignable.constants y navigation (MENU_ITEMS)
// ojo: si se agrega una subgestión al menú sin su módulo de permisos, esta prueba falla y la pantalla no queda «sin configurar» en silencio
import { describe, expect, it } from 'vitest'
import { MENU_ITEMS } from '@/features/navigation'
import { ASSIGNABLE_MENU_ITEMS } from './employees.assignable.constants'
import { OPEN_STAFF_SCREENS, SCREEN_API_MODULE, SPECIAL_ACTIONS } from './employees.permissions.constants'

// módulos del catálogo de la API (importadoraApi/src/core/types/permission_types.go · PermissionModules)
const API_MODULES = new Set([
  'catalog', 'quotations', 'orders', 'cash', 'returns', 'purchases', 'suppliers', 'products', 'transfers', 'brands', 'categories',
  'models', 'stock', 'credits', 'payments', 'customers', 'employees', 'roles', 'reports', 'audit', 'warehouses', 'invoices',
])

describe('SCREEN_API_MODULE', () => {
  it('toda pantalla asignable del menú tiene módulo de permisos', () => {
    const missing = ASSIGNABLE_MENU_ITEMS.flatMap((item) => item.subitems.map((sub) => `${item.id}.${sub.id}`)).filter((key) => !SCREEN_API_MODULE[key])
    expect(missing).toEqual([])
  })

  it('no sobran claves: cada una es una pantalla real del menú', () => {
    const real = new Set(MENU_ITEMS.flatMap((item) => item.subitems.map((sub) => `${item.id}.${sub.id}`)))
    expect(Object.keys(SCREEN_API_MODULE).filter((key) => !real.has(key))).toEqual([])
    expect([...OPEN_STAFF_SCREENS].filter((key) => !real.has(key))).toEqual([])
  })

  it('cada módulo y cada acción especial existe en el catálogo de la API', () => {
    expect(Object.values(SCREEN_API_MODULE).filter((module) => !API_MODULES.has(module))).toEqual([])
    expect(SPECIAL_ACTIONS.map((action) => action.key.split(':')[0]).filter((module) => !API_MODULES.has(module))).toEqual([])
  })
})

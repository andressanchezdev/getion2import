// employees.adapter.test · pruebas de la conversión de empleados, roles y permisos de la API, y de la matriz del menú en los dos sentidos
// conecta con: employees.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import type { NavItem } from '@/features/navigation'
import { toEmployeeRole, toModulePermissions, toPermissionIds, toSimpleEmployee } from './employees.adapter'
import type { PermissionDto } from '../types/employees.api.types'

const menu = [
  { id: 'shop', label: 'Tienda', icon: '', subitems: [{ id: 'catalog', label: 'Catálogo' }, { id: 'orders', label: 'Pedidos' }] },
  { id: 'thirdParties', label: 'Terceros', icon: '', subitems: [{ id: 'customers', label: 'Clientes' }] },
] as unknown as NavItem[]

const perm = (id: number, module: string, action: string): PermissionDto => ({ id, module, action })
const catalog = [
  perm(1, 'catalog', 'view'), perm(2, 'catalog', 'view_detail'), perm(3, 'orders', 'view'), perm(4, 'orders', 'view_detail'),
  perm(5, 'orders', 'create'), perm(6, 'orders', 'edit'), perm(7, 'orders', 'change_status'), perm(8, 'orders', 'delete'),
  perm(9, 'orders', 'take_picking'), perm(10, 'customers', 'view'), perm(11, 'customers', 'create'), perm(12, 'siigo', 'sync'),
]

describe('toSimpleEmployee y toEmployeeRole', () => {
  it('convierte el empleado de la API', () => {
    expect(toSimpleEmployee({ id: 10, firstName: ' Carlos ', lastName: 'López', email: 'c@x.co', document: '987', warehouseId: 2, warehouseName: 'Norte', roleName: 'vendedor', status: 'active' })).toMatchObject({
      employeeId: 10, name: 'Carlos', lastName: 'López', email: 'c@x.co', identification: '987', primaryWarehouseId: 2, warehouseName: 'Norte', roleName: 'vendedor', isActive: true,
    })
  })

  it('un empleado que no está activo queda inactivo y sin datos opcionales no se rompe', () => {
    expect(toSimpleEmployee({ id: 1, status: 'inactive' }).isActive).toBe(false)
    expect(toSimpleEmployee({ id: 1 })).toMatchObject({ name: '', email: '', identification: '', lastName: undefined, primaryWarehouseId: undefined })
  })

  it('convierte el rol', () => {
    expect(toEmployeeRole({ id: 3, name: ' Vendedor ', description: '' })).toEqual({ roleId: 3, roleName: 'Vendedor', description: undefined })
  })
})

describe('toModulePermissions', () => {
  it('arma la matriz del menú con las acciones que el empleado tiene en el módulo de cada pantalla', () => {
    const modules = toModulePermissions([catalog[0], catalog[2], catalog[3], catalog[4], catalog[5]], menu)
    const shop = modules.find((item) => item.moduleKey === 'shop')!
    expect(shop.screens.find((s) => s.screenKey === 'catalog')).toMatchObject({ canRead: true, canCreate: false, canUpdate: false, canDelete: false })
    expect(shop.screens.find((s) => s.screenKey === 'orders')).toMatchObject({ canRead: true, canCreate: true, canUpdate: true, canDelete: false })
    expect(shop).toMatchObject({ canRead: true, canCreate: true, canUpdate: true, canDelete: false })
  })

  it('un módulo sin ninguna acción queda sin permisos', () => {
    const third = toModulePermissions([catalog[0]], menu).find((item) => item.moduleKey === 'thirdParties')!
    expect(third).toMatchObject({ canRead: false, canCreate: false, canUpdate: false, canDelete: false })
  })
})

describe('toPermissionIds', () => {
  const modules = toModulePermissions([], menu)
  const withFlags = (moduleKey: string, screenKey: string, flags: Record<string, boolean>) =>
    modules.map((m) => (m.moduleKey === moduleKey ? { ...m, screens: m.screens.map((s) => (s.screenKey === screenKey ? { ...s, ...flags } : s)) } : m))

  it('"ver" enciende ver y ver detalle; "editar" enciende editar y cambiar estado', () => {
    expect(toPermissionIds(withFlags('shop', 'orders', { canRead: true, canUpdate: true }), catalog, [])).toEqual([3, 4, 6, 7])
  })

  it('"crear" y "anular" encienden crear y eliminar', () => {
    expect(toPermissionIds(withFlags('thirdParties', 'customers', { canCreate: true }), catalog, [])).toEqual([11])
    expect(toPermissionIds(withFlags('shop', 'orders', { canDelete: true }), catalog, [])).toEqual([8])
  })

  it('al guardar conserva lo que la matriz no maneja: acciones especiales y módulos que no están en el menú', () => {
    const current = [catalog[2], catalog[8], catalog[11]] // orders.view (la matriz lo maneja), orders.take_picking y siigo.sync (no)
    const ids = toPermissionIds(withFlags('shop', 'catalog', { canRead: true }), catalog, current)
    expect(ids).toEqual([1, 2, 9, 12]) // orders.view se quitó porque la matriz lo apagó; las otras dos se conservan
  })

  it('quitar todo en la matriz deja solo lo que la matriz no maneja', () => {
    expect(toPermissionIds(modules, catalog, [catalog[2], catalog[8]])).toEqual([9])
  })
})

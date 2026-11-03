import { describe, expect, it } from 'vitest'
import { toPermissionMatrix } from './auth.permissions'
import type { AuthUser } from '../types/auth.types'

const user = (over: Partial<AuthUser>): AuthUser => ({ userId: 1, companyId: 1, name: 'Ana', lastName: 'Ruiz', email: 'a@x.co', identification: '1', photo: '', userType: 'employee', ...over })
const screen = (matrix: ReturnType<typeof toPermissionMatrix>, moduleKey: string, screenKey: string) => matrix?.modules?.find((m) => m.moduleKey === moduleKey)?.screens.find((s) => s.screenKey === screenKey)

describe('toPermissionMatrix', () => {
  it('un empleado con permisos ve solo lo que tiene', () => {
    const matrix = toPermissionMatrix(user({ permissions: ['orders:view', 'orders:create', 'customers:view'] }))
    expect(screen(matrix, 'shop', 'orders')).toMatchObject({ canRead: true, canCreate: true, canUpdate: false, canDelete: false })
    expect(screen(matrix, 'thirdParties', 'customers')).toMatchObject({ canRead: true, canCreate: false })
    expect(screen(matrix, 'wallet', 'creditClients')).toMatchObject({ canRead: false })
  })

  it('un empleado sin ningún permiso no ve nada', () => {
    const matrix = toPermissionMatrix(user({ permissions: [] }))
    expect(matrix?.modules?.every((module) => module.screens.every((s) => !s.canRead))).toBe(true)
  })

  it('cualquier permiso se puede dar a cualquier empleado: también los de administración', () => {
    const matrix = toPermissionMatrix(user({ permissions: ['roles:edit', 'audit:view', 'warehouses:edit'] }))
    expect(screen(matrix, 'settings', 'rolesPermissions')).toMatchObject({ canUpdate: true })
    expect(screen(matrix, 'reports', 'audit')).toMatchObject({ canRead: true })
    expect(screen(matrix, 'inventory', 'warehouses')).toMatchObject({ canUpdate: true })
  })

  it('los administradores y las sesiones viejas sin permisos no tienen matriz (acceso sin restricción en la app)', () => {
    expect(toPermissionMatrix(user({ userType: 'admin', permissions: [] }))).toBeNull()
    expect(toPermissionMatrix(user({ permissions: undefined }))).toBeNull()
    expect(toPermissionMatrix(null)).toBeNull()
  })
})

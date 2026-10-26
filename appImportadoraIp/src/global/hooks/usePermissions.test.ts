// usePermissions.test · pruebas unitarias del motor de permisos jerárquicos
// conecta con: usePermissions, useFilteredMenuItems y vitest
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePermissions, useFilteredMenuItems } from './usePermissions'
import type { AuthState } from '@/features/auth'

let mockAuthState: AuthState = {
  user: {
    userId: 1,
    companyId: 1,
    name: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    identification: '123',
    photo: '',
    userType: 'admin',
  },
  status: 'authenticated',
  error: null,
  permissions: null,
}

vi.mock('./useRedux', () => ({
  useAppSelector: (selector: (state: { auth: AuthState }) => unknown) =>
    selector({ auth: mockAuthState }),
}))

describe('usePermissions', () => {
  it('da acceso total si el usuario es admin', () => {
    mockAuthState = {
      user: {
        userId: 1,
        companyId: 1,
        name: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        identification: '123',
        photo: '',
        userType: 'admin',
      },
      status: 'authenticated',
      error: null,
      permissions: null,
    }

    const { result } = renderHook(() => usePermissions())
    expect(result.current.isAdmin).toBe(true)
    expect(result.current.hasModuleAccess('shop')).toBe(true)
    expect(result.current.hasScreenAccess('shop', 'catalog')).toBe(true)
    expect(result.current.canPerformAction('shop', 'catalog', 'delete')).toBe(true)
  })

  it('restringe acceso a empleado según matriz de permisos', () => {
    mockAuthState = {
      user: {
        userId: 2,
        companyId: 1,
        name: 'Vendedor',
        lastName: 'Pérez',
        email: 'vendedor@test.com',
        identification: '456',
        photo: '',
        userType: 'employee',
      },
      status: 'authenticated',
      error: null,
      permissions: {
        modules: [
          {
            moduleKey: 'shop',
            canRead: true,
            canCreate: true,
            canUpdate: false,
            canDelete: false,
            screens: [
              { screenKey: 'catalog', canRead: true, canCreate: true, canUpdate: false, canDelete: false },
              { screenKey: 'history', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
            ],
          },
        ],
      },
    }

    const { result } = renderHook(() => usePermissions())
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.hasModuleAccess('shop')).toBe(true)
    expect(result.current.hasModuleAccess('wallet')).toBe(false)
    expect(result.current.hasScreenAccess('shop', 'catalog')).toBe(true)
    expect(result.current.hasScreenAccess('shop', 'history')).toBe(false)
    expect(result.current.canPerformAction('shop', 'catalog', 'create')).toBe(true)
    expect(result.current.canPerformAction('shop', 'catalog', 'delete')).toBe(false)
  })

  it('useFilteredMenuItems filtra módulos y subítems restringidos', () => {
    const { result } = renderHook(() => useFilteredMenuItems())
    const shopModule = result.current.find((m) => m.id === 'shop')
    expect(shopModule).toBeDefined()
    expect(shopModule?.subitems.some((s) => s.id === 'catalog')).toBe(true)
    expect(shopModule?.subitems.some((s) => s.id === 'history')).toBe(false)

    const walletModule = result.current.find((m) => m.id === 'wallet')
    expect(walletModule).toBeUndefined()
  })
})
